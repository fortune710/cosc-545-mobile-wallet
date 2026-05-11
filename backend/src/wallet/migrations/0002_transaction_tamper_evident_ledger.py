import hashlib
import hmac
import json

from django.conf import settings
from django.db import migrations, models


def backfill_transaction_chain(apps, schema_editor):
    Transaction = apps.get_model("wallet", "Transaction")
    wallets = {}
    secret = (
        getattr(settings, "TRANSACTION_HMAC_SECRET", None)
        or getattr(settings, "AUDIT_HMAC_SECRET", None)
        or settings.SECRET_KEY
    )

    for transaction in Transaction.objects.order_by("wallet_id", "effective_at", "datetime_created", "id"):
        sequence_number = wallets.get(transaction.wallet_id, 0) + 1
        wallets[transaction.wallet_id] = sequence_number
        previous_hash = (
            Transaction.objects.filter(wallet_id=transaction.wallet_id, sequence_number=sequence_number - 1)
            .values_list("record_hash", flat=True)
            .first()
            or ""
        )
        payload = json.dumps(
            {
                "chain_version": "v1",
                "id": str(transaction.id),
                "wallet_id": str(transaction.wallet_id),
                "sequence_number": sequence_number,
                "counterparty_user_id": str(transaction.counterparty_user_id) if transaction.counterparty_user_id else None,
                "transaction_type": transaction.transaction_type,
                "status": transaction.status,
                "amount": transaction.amount,
                "memo": transaction.memo,
                "related_transaction_id": str(transaction.related_transaction_id) if transaction.related_transaction_id else None,
                "effective_at": transaction.effective_at.isoformat() if transaction.effective_at else None,
                "previous_hash": previous_hash,
            },
            sort_keys=True,
        )
        record_hash = hashlib.sha256(payload.encode()).hexdigest()
        chain_signature = hmac.new(secret.encode(), record_hash.encode(), hashlib.sha256).hexdigest()
        immutable_at = transaction.datetime_updated if transaction.status == "completed" else None
        Transaction.objects.filter(pk=transaction.pk).update(
            sequence_number=sequence_number,
            previous_hash=previous_hash,
            record_hash=record_hash,
            chain_signature=chain_signature,
            immutable_at=immutable_at,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("wallet", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="historicaltransaction",
            name="chain_signature",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="historicaltransaction",
            name="immutable_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="historicaltransaction",
            name="sequence_number",
            field=models.PositiveBigIntegerField(default=0),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="transaction",
            name="chain_signature",
            field=models.CharField(blank=True, default="", max_length=64),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="transaction",
            name="immutable_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="sequence_number",
            field=models.PositiveBigIntegerField(default=0),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_transaction_chain, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="transaction",
            constraint=models.UniqueConstraint(
                fields=("wallet", "sequence_number"),
                name="unique_transaction_sequence_per_wallet",
            ),
        ),
    ]
