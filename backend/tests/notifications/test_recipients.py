import pyotp
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from notifications.models import Recipient


User = get_user_model()


class RecipientTests(APITestCase):
    def setUp(self):
        self.user = self._create_verified_user(
            email="owner@example.com",
            display_name="Owner",
        )
        self.alice = self._create_verified_user(
            email="alice@example.com",
            display_name="Alice API",
        )
        self.admin = self._create_verified_user(
            email="admin@admin.com",
            first_name="Admin",
            last_name="User",
        )
        self.unverified = User.objects.create_user(
            email="pending@example.com",
            password="VeryStrongPassword123!",
            display_name="Pending",
            is_active=False,
        )
        self.tokens = self._login(self.user, "recipient-device")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        Recipient.objects.create(user=self.user, recipient=self.alice)
        Recipient.objects.create(user=self.user, recipient=self.admin)

    def _create_verified_user(self, email, display_name="", first_name="", last_name=""):
        user = User.objects.create_user(
            email=email,
            password="VeryStrongPassword123!",
            display_name=display_name,
            first_name=first_name,
            last_name=last_name,
            is_active=True,
        )
        user.email_verified_at = timezone.now()
        user.mfa_totp_seed = pyotp.random_base32()
        user.mfa_enabled = True
        user.save(update_fields=["email_verified_at", "mfa_totp_seed", "mfa_enabled"])
        return user

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

    def test_list_recipients_can_be_searched(self):
        response = self.client.get(reverse("recipient-list"), {"q": "alice"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], "alice@example.com")
        self.assertEqual(response.data["results"][0]["display_name"], "Alice API")

    def test_search_users_returns_verified_mfa_users_only(self):
        response = self.client.get(reverse("recipient-search-users"), {"q": "admin"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["email"], "admin@admin.com")
        self.assertEqual(response.data[0]["display_name"], "Admin User")

    def test_add_recipient_returns_validation_error_for_unknown_email(self):
        response = self.client.post(
            reverse("recipient-list"),
            {"recipient": "missing@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("recipient", response.data)

    def test_add_recipient_returns_validation_error_for_duplicate(self):
        response = self.client.post(
            reverse("recipient-list"),
            {"recipient": "alice@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("recipient", response.data)
