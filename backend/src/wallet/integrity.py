from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model

from wallet.constants import CHECKPOINT_FILE_EXTENSION
from wallet.models import Transaction, Wallet


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
            return ChainVerificationResult(
                wallet_id=str(wallet.id),
                is_valid=False,
                transaction_count=len(transactions),
                last_sequence_number=txn.sequence_number,
                last_record_hash=txn.record_hash,
                failure_reason="sequence_mismatch",
                failed_transaction_id=str(txn.id),
            )
        if txn.previous_hash != previous_hash:
            return ChainVerificationResult(
                wallet_id=str(wallet.id),
                is_valid=False,
                transaction_count=len(transactions),
                last_sequence_number=txn.sequence_number,
                last_record_hash=txn.record_hash,
                failure_reason="previous_hash_mismatch",
                failed_transaction_id=str(txn.id),
            )
        if txn.record_hash != txn.compute_record_hash():
            return ChainVerificationResult(
                wallet_id=str(wallet.id),
                is_valid=False,
                transaction_count=len(transactions),
                last_sequence_number=txn.sequence_number,
                last_record_hash=txn.record_hash,
                failure_reason="record_hash_mismatch",
                failed_transaction_id=str(txn.id),
            )
        if txn.chain_signature != txn.compute_chain_signature():
            return ChainVerificationResult(
                wallet_id=str(wallet.id),
                is_valid=False,
                transaction_count=len(transactions),
                last_sequence_number=txn.sequence_number,
                last_record_hash=txn.record_hash,
                failure_reason="chain_signature_mismatch",
                failed_transaction_id=str(txn.id),
            )
        previous_hash = txn.record_hash
        expected_sequence += 1

    last_txn = transactions[-1]
    return ChainVerificationResult(
        wallet_id=str(wallet.id),
        is_valid=True,
        transaction_count=len(transactions),
        last_sequence_number=last_txn.sequence_number,
        last_record_hash=last_txn.record_hash,
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
