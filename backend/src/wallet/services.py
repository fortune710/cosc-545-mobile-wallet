from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from accounts.services import receipt_signature
from notifications.constants import (
    NOTIFICATION_BODY_PAYMENT_RECEIVED,
    NOTIFICATION_BODY_PAYMENT_SENT,
    NOTIFICATION_BODY_REQUEST_CREATED,
    NOTIFICATION_BODY_REQUEST_DECLINED,
    NOTIFICATION_BODY_REQUEST_EXPIRED,
    NOTIFICATION_BODY_REQUEST_APPROVED,
    NOTIFICATION_BODY_REQUEST_RECEIVED,
    NOTIFICATION_TITLE_PAYMENT_RECEIVED,
    NOTIFICATION_TITLE_PAYMENT_SENT,
    NOTIFICATION_TITLE_REQUEST_DECLINED,
    NOTIFICATION_TITLE_REQUEST_CREATED,
    NOTIFICATION_TITLE_REQUEST_EXPIRED,
    NOTIFICATION_TITLE_REQUEST_APPROVED,
    NOTIFICATION_TITLE_REQUEST_RECEIVED,
)
from notifications.models import NotificationType
from notifications.services import create_notification
from wallet.constants import (
    MAX_FUNDING_CENTS,
    MAX_PAYMENT_CENTS,
    MIN_FUNDING_CENTS,
    MIN_PAYMENT_CENTS,
    PAYMENT_REQUEST_EXPIRY,
)
from wallet.models import PaymentIntent, PaymentRequest, Transaction, TransactionReceipt, Wallet


User = get_user_model()


def decimal_to_cents(value: Decimal) -> int:
    quantized = value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(quantized * 100)


def resolve_recipient(identifier: str) -> User:
    return User.objects.get(Q(email__iexact=identifier) | Q(display_name__iexact=identifier))


def ensure_wallet(user: User) -> Wallet:
    wallet, _ = Wallet.objects.get_or_create(user=user)
    return wallet


def _last_transaction_hash(wallet: Wallet) -> str:
    last_txn = wallet.transactions.order_by("-effective_at", "-datetime_created").first()
    return last_txn.record_hash if last_txn else ""


def _create_transaction(wallet: Wallet, tx_type: str, amount: int, status: str, counterparty=None, memo="", related_transaction=None):
    txn = Transaction.objects.create(
        wallet=wallet,
        counterparty_user=counterparty,
        transaction_type=tx_type,
        amount=amount,
        status=status,
        memo=memo,
        related_transaction=related_transaction,
        previous_hash=_last_transaction_hash(wallet),
        effective_at=timezone.now(),
    )
    txn.record_hash = txn.compute_record_hash()
    txn.save(update_fields=["record_hash"])
    return txn


def _create_receipt(transaction: Transaction, sender: User, recipient: User):
    payload = "|".join(
        [
            str(transaction.id),
            str(sender.id),
            str(recipient.id),
            str(transaction.amount),
            transaction.effective_at.isoformat(),
            transaction.record_hash,
        ]
    )
    return TransactionReceipt.objects.create(
        transaction=transaction,
        sender=sender,
        recipient=recipient,
        amount=transaction.amount,
        transaction_hash=transaction.record_hash,
        signature=receipt_signature(payload),
        issued_at=timezone.now(),
    )


def create_funding(user: User, amount: int):
    if amount < MIN_FUNDING_CENTS or amount > MAX_FUNDING_CENTS:
        raise ValueError("Funding amount must be between $1.00 and $500.00.")

    wallet = ensure_wallet(user)
    with transaction.atomic():
        wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
        wallet.balance += amount
        wallet.save(update_fields=["balance"])
        txn = _create_transaction(
            wallet=wallet,
            tx_type=Transaction.Type.FUNDING,
            amount=amount,
            status=Transaction.Status.COMPLETED,
            memo="Internal funding",
        )
    return wallet, txn


def create_payment_intent(sender: User, recipient_identifier: str, amount: int, memo: str, idempotency_key):
    if amount < MIN_PAYMENT_CENTS or amount > MAX_PAYMENT_CENTS:
        raise ValueError("Payment amount must be between $0.01 and $50.00.")

    recipient = resolve_recipient(recipient_identifier)
    if recipient.pk == sender.pk:
        raise ValueError("You cannot send funds to yourself.")

    intent, created = PaymentIntent.objects.get_or_create(
        sender=sender,
        idempotency_key=idempotency_key,
        defaults={
            "recipient": recipient,
            "amount": amount,
            "memo": memo,
            "status": PaymentIntent.Status.PENDING,
        },
    )
    if not created and (
        intent.recipient_id != recipient.id or intent.amount != amount or intent.memo != memo
    ):
        raise ValueError("Idempotency key is already used for a different payment.")
    return intent


def confirm_payment_intent(intent: PaymentIntent):
    if intent.status != PaymentIntent.Status.PENDING:
        return intent

    sender_wallet = ensure_wallet(intent.sender)
    recipient_wallet = ensure_wallet(intent.recipient)
    with transaction.atomic():
        sender_wallet = Wallet.objects.select_for_update().get(pk=sender_wallet.pk)
        recipient_wallet = Wallet.objects.select_for_update().get(pk=recipient_wallet.pk)

        if sender_wallet.balance < intent.amount:
            intent.status = PaymentIntent.Status.FAILED
            intent.save(update_fields=["status"])
            raise ValueError("Insufficient funds.")

        sender_wallet.balance -= intent.amount
        recipient_wallet.balance += intent.amount
        sender_wallet.save(update_fields=["balance"])
        recipient_wallet.save(update_fields=["balance"])

        sender_txn = _create_transaction(
            wallet=sender_wallet,
            tx_type=Transaction.Type.PAYMENT_SENT,
            amount=-intent.amount,
            status=Transaction.Status.COMPLETED,
            counterparty=intent.recipient,
            memo=intent.memo,
        )
        recipient_txn = _create_transaction(
            wallet=recipient_wallet,
            tx_type=Transaction.Type.PAYMENT_RECEIVED,
            amount=intent.amount,
            status=Transaction.Status.COMPLETED,
            counterparty=intent.sender,
            memo=intent.memo,
            related_transaction=sender_txn,
        )
        sender_txn.related_transaction = recipient_txn
        sender_txn.save(update_fields=["related_transaction"])

        receipt = _create_receipt(sender_txn, intent.sender, intent.recipient)
        intent.status = PaymentIntent.Status.CONFIRMED
        intent.confirmed_at = timezone.now()
        intent.save(update_fields=["status", "confirmed_at"])

        create_notification(
            user=intent.sender,
            title=NOTIFICATION_TITLE_PAYMENT_SENT,
            body=NOTIFICATION_BODY_PAYMENT_SENT.format(
                amount=intent.amount / 100,
                recipient=intent.recipient.display_name or intent.recipient.email,
            ),
            notification_type=NotificationType.PAYMENT_SENT,
        )
        create_notification(
            user=intent.recipient,
            title=NOTIFICATION_TITLE_PAYMENT_RECEIVED,
            body=NOTIFICATION_BODY_PAYMENT_RECEIVED.format(
                amount=intent.amount / 100,
                sender=intent.sender.display_name or intent.sender.email,
            ),
            notification_type=NotificationType.PAYMENT_RECEIVED,
        )

    return intent, sender_txn, recipient_txn, receipt


def create_payment_request(requester: User, target_identifier: str, amount: int, memo: str):
    if amount < MIN_PAYMENT_CENTS or amount > MAX_PAYMENT_CENTS:
        raise ValueError("Request amount must be between $0.01 and $50.00.")

    target_user = resolve_recipient(target_identifier)
    if target_user.pk == requester.pk:
        raise ValueError("You cannot request funds from yourself.")

    payment_request = PaymentRequest.objects.create(
        requester=requester,
        target_user=target_user,
        amount=amount,
        memo=memo,
        expires_at=timezone.now() + PAYMENT_REQUEST_EXPIRY,
    )
    create_notification(
        user=target_user,
        title=NOTIFICATION_TITLE_REQUEST_RECEIVED,
        body=NOTIFICATION_BODY_REQUEST_RECEIVED.format(
            requester=requester.display_name or requester.email,
            amount=amount / 100,
        ),
        notification_type=NotificationType.SYSTEM,
    )
    create_notification(
        user=requester,
        title=NOTIFICATION_TITLE_REQUEST_CREATED,
        body=NOTIFICATION_BODY_REQUEST_CREATED.format(
            target_user=target_user.display_name or target_user.email,
        ),
        notification_type=NotificationType.SYSTEM,
    )
    return payment_request


def expire_requests():
    now = timezone.now()
    expired = list(
        PaymentRequest.objects.filter(status=PaymentRequest.Status.PENDING, expires_at__lte=now)
    )
    for payment_request in expired:
        payment_request.status = PaymentRequest.Status.EXPIRED
        payment_request.resolved_at = now
        payment_request.save(update_fields=["status", "resolved_at"])
        create_notification(
            user=payment_request.requester,
            title=NOTIFICATION_TITLE_REQUEST_EXPIRED,
            body=NOTIFICATION_BODY_REQUEST_EXPIRED,
            notification_type=NotificationType.SYSTEM,
        )
    return expired


def approve_request(payment_request: PaymentRequest):
    if payment_request.status != PaymentRequest.Status.PENDING:
        raise ValueError("Payment request is not pending.")
    if payment_request.expires_at <= timezone.now():
        payment_request.status = PaymentRequest.Status.EXPIRED
        payment_request.resolved_at = timezone.now()
        payment_request.save(update_fields=["status", "resolved_at"])
        raise ValueError("Payment request has expired.")

    intent = PaymentIntent.objects.create(
        sender=payment_request.target_user,
        recipient=payment_request.requester,
        amount=payment_request.amount,
        memo=payment_request.memo,
        idempotency_key=uuid4(),
        status=PaymentIntent.Status.PENDING,
    )
    confirmed_intent, sender_txn, recipient_txn, _receipt = confirm_payment_intent(intent)
    payment_request.status = PaymentRequest.Status.APPROVED
    payment_request.resolved_at = timezone.now()
    payment_request.approved_transaction = sender_txn
    payment_request.save(update_fields=["status", "resolved_at", "approved_transaction"])
    create_notification(
        user=payment_request.requester,
        title=NOTIFICATION_TITLE_REQUEST_APPROVED,
        body=NOTIFICATION_BODY_REQUEST_APPROVED.format(
            target_user=payment_request.target_user.display_name or payment_request.target_user.email,
        ),
        notification_type=NotificationType.SYSTEM,
    )
    return confirmed_intent, sender_txn, recipient_txn


def decline_request(payment_request: PaymentRequest):
    if payment_request.status != PaymentRequest.Status.PENDING:
        raise ValueError("Payment request is not pending.")

    payment_request.status = PaymentRequest.Status.DECLINED
    payment_request.resolved_at = timezone.now()
    payment_request.save(update_fields=["status", "resolved_at"])
    create_notification(
        user=payment_request.requester,
        title=NOTIFICATION_TITLE_REQUEST_DECLINED,
        body=NOTIFICATION_BODY_REQUEST_DECLINED.format(
            target_user=payment_request.target_user.display_name or payment_request.target_user.email,
        ),
        notification_type=NotificationType.SYSTEM,
    )
    return payment_request


def has_prior_successful_payment(sender: User, recipient: User) -> bool:
    return Transaction.objects.filter(
        wallet__user=sender,
        counterparty_user=recipient,
        transaction_type=Transaction.Type.PAYMENT_SENT,
        status=Transaction.Status.COMPLETED,
    ).exists()


def recent_successful_payment_count(user: User, minutes: int = 10) -> int:
    window_start = timezone.now() - timedelta(minutes=minutes)
    return Transaction.objects.filter(
        wallet__user=user,
        transaction_type=Transaction.Type.PAYMENT_SENT,
        status=Transaction.Status.COMPLETED,
        effective_at__gte=window_start,
    ).count()
