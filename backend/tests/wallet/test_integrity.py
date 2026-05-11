from pathlib import Path
from tempfile import TemporaryDirectory

import pyotp
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from audit.models import AuditEvent
from wallet.integrity import checkpoint_wallet_chain, verify_wallet_chain
from wallet.services import create_funding


User = get_user_model()


class WalletIntegrityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="integrity@example.com",
            password="VeryStrongPassword123!",
            display_name="Integrity User",
            is_active=True,
        )
        self.user.email_verified_at = timezone.now()
        self.user.mfa_totp_seed = pyotp.random_base32()
        self.user.mfa_enabled = True
        self.user.save(update_fields=["email_verified_at", "mfa_totp_seed", "mfa_enabled"])

    def test_chain_verification_detects_database_tampering(self):
        create_funding(self.user, 2500)
        wallet = self.user.wallet
        txn = wallet.transactions.order_by("sequence_number").first()

        self.assertTrue(verify_wallet_chain(wallet).is_valid)

        type(txn).objects.filter(pk=txn.pk).update(amount=9999)
        result = verify_wallet_chain(wallet)

        self.assertFalse(result.is_valid)
        self.assertEqual(result.failure_reason, "record_hash_mismatch")
        self.assertTrue(
            AuditEvent.objects.filter(
                user=self.user,
                event_type="wallet.transaction.record_mismatch",
            ).exists()
        )

    def test_checkpoint_file_is_written_outside_database(self):
        create_funding(self.user, 2500)
        wallet = self.user.wallet

        with TemporaryDirectory() as tmp_dir:
            with override_settings(TRANSACTION_CHECKPOINT_DIR=Path(tmp_dir)):
                path = checkpoint_wallet_chain(wallet)

        self.assertIsNotNone(path)
        self.assertTrue(path.name.endswith(".json"))

    def test_chain_verification_detects_balance_mismatch(self):
        create_funding(self.user, 2500)
        wallet = self.user.wallet
        wallet.balance = 9999
        wallet.save(update_fields=["balance"])

        result = verify_wallet_chain(wallet)

        self.assertFalse(result.is_valid)
        self.assertEqual(result.failure_reason, "balance_mismatch")
        self.assertTrue(
            AuditEvent.objects.filter(
                user=self.user,
                event_type="wallet.transaction.balance_mismatch",
            ).exists()
        )
