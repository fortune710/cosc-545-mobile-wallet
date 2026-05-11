import hashlib
import json

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel


class Wallet(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet",
    )
    balance = models.BigIntegerField(default=0)

    class Meta:
        db_table = "wallets"
        ordering = ["datetime_created"]


class Transaction(BaseModel):
    class Type(models.TextChoices):
        FUNDING = "funding", "Funding"
        PAYMENT_SENT = "payment_sent", "Payment Sent"
        PAYMENT_RECEIVED = "payment_received", "Payment Received"
        REQUEST_PAYMENT = "request_payment", "Request Payment"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"
        FAILED = "failed", "Failed"

    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    counterparty_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="counterparty_transactions",
    )
    transaction_type = models.CharField(max_length=32, choices=Type.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    amount = models.BigIntegerField()
    memo = models.CharField(max_length=100, blank=True)
    related_transaction = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_transactions",
    )
    previous_hash = models.CharField(max_length=64, blank=True)
    record_hash = models.CharField(max_length=64, blank=True)
    effective_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-effective_at", "-datetime_created"]
        indexes = [
            models.Index(fields=["wallet", "effective_at"]),
            models.Index(fields=["transaction_type", "status"]),
        ]

    def canonical_payload(self):
        return json.dumps(
            {
                "id": str(self.id),
                "wallet_id": str(self.wallet_id),
                "counterparty_user_id": str(self.counterparty_user_id) if self.counterparty_user_id else None,
                "transaction_type": self.transaction_type,
                "status": self.status,
                "amount": self.amount,
                "memo": self.memo,
                "related_transaction_id": str(self.related_transaction_id) if self.related_transaction_id else None,
                "effective_at": self.effective_at.isoformat() if self.effective_at else None,
                "previous_hash": self.previous_hash,
            },
            sort_keys=True,
        )

    def compute_record_hash(self):
        return hashlib.sha256(self.canonical_payload().encode()).hexdigest()


class PaymentIntent(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        FAILED = "failed", "Failed"

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_intents",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="incoming_payment_intents",
    )
    amount = models.BigIntegerField()
    memo = models.CharField(max_length=100, blank=True)
    idempotency_key = models.UUIDField(db_index=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payment_intents"
        ordering = ["-datetime_created"]
        constraints = [
            models.UniqueConstraint(
                fields=["sender", "idempotency_key"],
                name="unique_payment_intent_per_sender_idempotency",
            )
        ]


class PaymentRequest(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="outgoing_payment_requests",
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="incoming_payment_requests",
    )
    amount = models.BigIntegerField()
    memo = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField(db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    approved_transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_requests",
    )

    class Meta:
        db_table = "payment_requests"
        ordering = ["-datetime_created"]
        indexes = [models.Index(fields=["requester", "target_user", "status"])]


class TransactionReceipt(BaseModel):
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.CASCADE,
        related_name="receipt",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_receipts",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_receipts",
    )
    amount = models.BigIntegerField()
    transaction_hash = models.CharField(max_length=64)
    signature = models.CharField(max_length=64)
    issued_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "transaction_receipts"
        ordering = ["-issued_at"]


class SupervisoryApproval(BaseModel):
    support_agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_approvals",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="granted_support_approvals",
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="supervisory_approvals",
    )
    can_view_sensitive_details = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    reason = models.CharField(max_length=255)

    class Meta:
        db_table = "supervisory_approvals"
        ordering = ["-datetime_created"]
