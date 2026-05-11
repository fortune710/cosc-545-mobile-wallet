from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model

from audit.events import WalletEvent
from audit.logger import log_event
from wallet.constants import CHECKPOINT_FILE_EXTENSION
from wallet.models import Transaction, TransactionReceipt, Wallet


User = get_user_model()


@dataclass
class ChainVerificationResult:
    wallet_id: str
    is_valid: bool
    transaction_count: int
    last_sequence_number: int
    last_record_hash: str
    failure_reason: str = ""
    failed_transaction_id: str = ""


def verify_wallet_chain(wallet: Wallet) -> ChainVerificationResult:
    wallet = Wallet.objects.select_related("user").get(pk=wallet.pk)
    transactions = list(wallet.transactions.order_by("sequence_number", "effective_at", "datetime_created"))
    if not transactions:
        return ChainVerificationResult(
            wallet_id=str(wallet.id),
            is_valid=True,
            transaction_count=0,
            last_sequence_number=0,
            last_record_hash="",
        )

    previous_hash = ""
    expected_sequence = 1
    for txn in transactions:
        if txn.sequence_number != expected_sequence:
            result = ChainVerificationResult(
                wallet_id=str(wallet.id),
                is_valid=False,
                transaction_count=len(transactions),
                last_sequence_number=txn.sequence_number,
                last_record_hash=txn.record_hash,
                failure_reason="sequence_mismatch",
                failed_transaction_id=str(txn.id),
            )
            _log_chain_failure(wallet, result, WalletEvent.TRANSACTION_CHAIN_VERIFICATION_FAILED)
            return result
        if txn.previous_hash != previous_hash:
            result = ChainVerificationResult(
                wallet_id=str(wallet.id),
                is_valid=False,
                transaction_count=len(transactions),
                last_sequence_number=txn.sequence_number,
                last_record_hash=txn.record_hash,
                failure_reason="previous_hash_mismatch",
                failed_transaction_id=str(txn.id),
            )
            _log_chain_failure(wallet, result, WalletEvent.TRANSACTION_CHAIN_VERIFICATION_FAILED)
            return result
        if txn.record_hash != txn.compute_record_hash():
            result = ChainVerificationResult(
                wallet_id=str(wallet.id),
                is_valid=False,
                transaction_count=len(transactions),
                last_sequence_number=txn.sequence_number,
                last_record_hash=txn.record_hash,
                failure_reason="record_hash_mismatch",
                failed_transaction_id=str(txn.id),
            )
            _log_chain_failure(wallet, result, WalletEvent.TRANSACTION_RECORD_MISMATCH)
            return result
        if txn.chain_signature != txn.compute_chain_signature():
            result = ChainVerificationResult(
                wallet_id=str(wallet.id),
                is_valid=False,
                transaction_count=len(transactions),
                last_sequence_number=txn.sequence_number,
                last_record_hash=txn.record_hash,
                failure_reason="chain_signature_mismatch",
                failed_transaction_id=str(txn.id),
            )
            _log_chain_failure(wallet, result, WalletEvent.TRANSACTION_CHAIN_VERIFICATION_FAILED)
            return result
        if txn.transaction_type == Transaction.Type.PAYMENT_SENT:
            receipt = TransactionReceipt.objects.filter(transaction=txn).first()
            if not receipt or receipt.transaction_hash != txn.record_hash or receipt.signature != _expected_receipt_signature(receipt, txn):
                result = ChainVerificationResult(
                    wallet_id=str(wallet.id),
                    is_valid=False,
                    transaction_count=len(transactions),
                    last_sequence_number=txn.sequence_number,
                    last_record_hash=txn.record_hash,
                    failure_reason="receipt_mismatch",
                    failed_transaction_id=str(txn.id),
                )
                _log_chain_failure(wallet, result, WalletEvent.TRANSACTION_RECEIPT_MISMATCH)
                return result
        previous_hash = txn.record_hash
        expected_sequence += 1

    last_txn = transactions[-1]
    expected_balance = sum(txn.amount for txn in transactions if txn.status == Transaction.Status.COMPLETED)
    if wallet.balance != expected_balance:
        result = ChainVerificationResult(
            wallet_id=str(wallet.id),
            is_valid=False,
            transaction_count=len(transactions),
            last_sequence_number=last_txn.sequence_number,
            last_record_hash=last_txn.record_hash,
            failure_reason="balance_mismatch",
            failed_transaction_id=str(last_txn.id),
        )
        _log_chain_failure(wallet, result, WalletEvent.TRANSACTION_BALANCE_MISMATCH)
        return result
    return ChainVerificationResult(
        wallet_id=str(wallet.id),
        is_valid=True,
        transaction_count=len(transactions),
        last_sequence_number=last_txn.sequence_number,
        last_record_hash=last_txn.record_hash,
    )


def _expected_receipt_signature(receipt: TransactionReceipt, transaction: Transaction) -> str:
    payload = "|".join(
        [
            str(transaction.id),
            str(receipt.sender_id),
            str(receipt.recipient_id),
            str(transaction.amount),
            transaction.effective_at.isoformat(),
            transaction.record_hash,
        ]
    )
    from accounts.services import receipt_signature

    return receipt_signature(payload)


def _log_chain_failure(wallet: Wallet, result: ChainVerificationResult, event_type: str) -> None:
    log_event(
        event_type,
        "FAILED",
        user=wallet.user,
        metadata={
            "wallet_id": result.wallet_id,
            "failure_reason": result.failure_reason,
            "transaction_id": result.failed_transaction_id,
            "last_sequence_number": result.last_sequence_number,
        },
    )


def verify_all_wallet_chains() -> list[ChainVerificationResult]:
    return [verify_wallet_chain(wallet) for wallet in Wallet.objects.order_by("datetime_created")]


def _checkpoint_directory() -> Path:
    directory = Path(settings.TRANSACTION_CHECKPOINT_DIR)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def checkpoint_wallet_chain(wallet: Wallet) -> Path | None:
    result = verify_wallet_chain(wallet)
    if not result.is_valid or result.transaction_count == 0:
        return None

    payload = {
        **asdict(result),
        "anchored_at": wallet.transactions.order_by("-sequence_number").first().datetime_updated.isoformat(),
    }
    filename = f"wallet-{result.wallet_id}-seq-{result.last_sequence_number}{CHECKPOINT_FILE_EXTENSION}"
    path = _checkpoint_directory() / filename
    path.write_text(json.dumps(payload, sort_keys=True, indent=2))
    return path


def checkpoint_all_wallet_chains() -> list[Path]:
    anchored_paths: list[Path] = []
    for wallet in Wallet.objects.order_by("datetime_created"):
        path = checkpoint_wallet_chain(wallet)
        if path is not None:
            anchored_paths.append(path)
    return anchored_paths
