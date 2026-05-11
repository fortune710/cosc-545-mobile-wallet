import pyotp
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from wallet.models import PaymentRequest


User = get_user_model()


class WalletFlowTests(APITestCase):
    def setUp(self):
        self.sender = User.objects.create_user(
            email="sender@example.com",
            password="VeryStrongPassword123!",
            display_name="Sender",
            is_active=True,
        )
        self.sender.email_verified_at = timezone.now()
        self.sender.mfa_totp_seed = pyotp.random_base32()
        self.sender.mfa_enabled = True
        self.sender.save(update_fields=["email_verified_at", "mfa_totp_seed", "mfa_enabled"])

        self.recipient = User.objects.create_user(
            email="recipient@example.com",
            password="VeryStrongPassword123!",
            display_name="Recipient",
            is_active=True,
        )
        self.recipient.email_verified_at = timezone.now()
        self.recipient.mfa_totp_seed = pyotp.random_base32()
        self.recipient.mfa_enabled = True
        self.recipient.save(update_fields=["email_verified_at", "mfa_totp_seed", "mfa_enabled"])

        self.sender_tokens = self._login(self.sender, "sender-device")
        self.recipient_tokens = self._login(self.recipient, "recipient-device")

    def _login(self, user, device_id):
        start = self.client.post(
            reverse("auth-login-start"),
            {"email": user.email, "password": "VeryStrongPassword123!"},
            format="json",
        )
        flow_token = start.data["flow_token"]
        verify = self.client.post(
            reverse("auth-login-verify-mfa"),
            {"flow_token": flow_token, "mfa_code": pyotp.TOTP(user.mfa_totp_seed).now()},
            format="json",
            HTTP_X_DEVICE_ID=device_id,
        )
        return verify.data

    def test_internal_funding_send_and_history(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.sender_tokens['access']}")
        fund_response = self.client.post(
            reverse("wallet-fund"),
            {
                "amount": "25.00",
                "cardholder_name": "SecureWallet Demo",
                "card_number": "4242 4242 4242 4242",
                "expiry_month": "12",
                "expiry_year": "34",
                "cvv": "123",
            },
            format="json",
        )
        self.assertEqual(fund_response.status_code, status.HTTP_200_OK)
        self.assertEqual(fund_response.data["balance"], 2500)

        intent_response = self.client.post(
            reverse("payment-intent-create"),
            {"recipient": self.recipient.email, "amount": "5.00", "memo": "Lunch"},
            format="json",
            HTTP_X_IDEMPOTENCY_KEY="8d5672a2-7a62-4b14-a7eb-d8cb37d55980",
        )
        self.assertEqual(intent_response.status_code, status.HTTP_201_CREATED)

        confirm_response = self.client.post(
            reverse("payment-intent-confirm", kwargs={"intent_id": intent_response.data["id"]}),
            {},
            format="json",
        )
        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)

        balance_response = self.client.get(reverse("wallet-balance"))
        self.assertEqual(balance_response.data["balance"], 2000)

        history_response = self.client.get(reverse("transaction-list"))
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(history_response.data), 2)

    def test_payment_request_can_be_approved(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.sender_tokens['access']}")
        self.client.post(
            reverse("wallet-fund"),
            {
                "amount": "25.00",
                "cardholder_name": "SecureWallet Demo",
                "card_number": "4242 4242 4242 4242",
                "expiry_month": "12",
                "expiry_year": "34",
                "cvv": "123",
            },
            format="json",
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.recipient_tokens['access']}")
        self.client.post(
            reverse("wallet-fund"),
            {
                "amount": "25.00",
                "cardholder_name": "SecureWallet Demo",
                "card_number": "4242 4242 4242 4242",
                "expiry_month": "12",
                "expiry_year": "34",
                "cvv": "123",
            },
            format="json",
        )
        request_response = self.client.post(
            reverse("payment-request-list-create"),
            {"target_user": self.sender.email, "amount": "4.00", "memo": "Split"},
            format="json",
        )
        self.assertEqual(request_response.status_code, status.HTTP_201_CREATED)
        payment_request_id = request_response.data["id"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.sender_tokens['access']}")
        approve_response = self.client.post(
            reverse("payment-request-approve", kwargs={"request_id": payment_request_id}),
            {},
            format="json",
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)

        payment_request = PaymentRequest.objects.get(id=payment_request_id)
        self.assertEqual(payment_request.status, PaymentRequest.Status.APPROVED)

    def test_demo_funding_rejects_non_test_card(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.sender_tokens['access']}")

        response = self.client.post(
            reverse("wallet-fund"),
            {
                "amount": "25.00",
                "cardholder_name": "SecureWallet Demo",
                "card_number": "4000 0000 0000 0002",
                "expiry_month": "12",
                "expiry_year": "34",
                "cvv": "123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)
        balance_response = self.client.get(reverse("wallet-balance"))
        self.assertEqual(balance_response.data["balance"], 0)

    def test_demo_funding_requires_card_fields(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.sender_tokens['access']}")

        response = self.client.post(
            reverse("wallet-fund"),
            {"amount": "25.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("card_number", response.data)
        self.assertIn("cardholder_name", response.data)
