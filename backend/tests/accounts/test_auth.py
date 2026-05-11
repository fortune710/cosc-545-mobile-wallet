from datetime import timedelta

import pyotp
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import EmailVerificationToken, MfaRecoveryCode, SessionRecord
from wallet.models import Wallet


User = get_user_model()


class AuthenticationTests(APITestCase):
    def test_register_returns_generic_message_and_creates_inactive_user(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "user@example.com",
                "password": "VeryStrongPassword123!",
                "first_name": "Wallet",
                "last_name": "User",
                "display_name": "Wallet User",
                "phone_number": "+15555550123",
                "address_line_1": "123 Main St",
                "address_line_2": "Unit 4",
                "city": "Buffalo",
                "state": "NY",
                "postal_code": "14201",
                "country": "US",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn("detail", response.data)
        user = User.objects.get(email="user@example.com")
        self.assertFalse(user.is_active)
        self.assertIsNone(user.email_verified_at)
        self.assertTrue(EmailVerificationToken.objects.filter(user=user).exists())
        self.assertEqual(user.phone_number, "+15555550123")
        self.assertEqual(user.address_line_1, "123 Main St")
        self.assertEqual(user.city, "Buffalo")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("http://localhost:5173/verify-email?token=", mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].subject, "Confirm your SecureWallet email")

    def test_verify_email_activates_user(self):
        user = User.objects.create_user(
            email="verify@example.com",
            password="VeryStrongPassword123!",
            is_active=False,
        )
        token = EmailVerificationToken.objects.create(
            user=user,
            token="verify-token",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        response = self.client.post(
            reverse("auth-verify-email"),
            {"token": token.token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertIsNotNone(user.email_verified_at)
        self.assertTrue(Wallet.objects.filter(user=user).exists())

    def test_login_start_requires_mfa_setup_when_email_verified_but_mfa_missing(self):
        user = User.objects.create_user(
            email="setup@example.com",
            password="VeryStrongPassword123!",
            is_active=True,
        )
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified_at"])

        response = self.client.post(
            reverse("auth-login-start"),
            {"email": user.email, "password": "VeryStrongPassword123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["mfa_setup_required"])
        self.assertIn("flow_token", response.data)

    def test_login_start_redirects_unverified_user_to_verification_flow(self):
        user = User.objects.create_user(
            email="pending@example.com",
            password="VeryStrongPassword123!",
            is_active=False,
        )

        response = self.client.post(
            reverse("auth-login-start"),
            {"email": user.email, "password": "VeryStrongPassword123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["email_verification_required"])
        self.assertEqual(response.data["email"], user.email)
        self.assertEqual(
            response.data["detail"],
            "Email verification is required before you can finish signing in.",
        )
        self.assertEqual(EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("http://localhost:5173/verify-email?token=", mail.outbox[0].body)

    def test_resend_verification_returns_generic_message_and_issues_new_token(self):
        user = User.objects.create_user(
            email="resend@example.com",
            password="VeryStrongPassword123!",
            is_active=False,
        )
        old_token = EmailVerificationToken.objects.create(
            user=user,
            token="old-token",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        response = self.client.post(
            reverse("auth-verify-email-resend"),
            {"email": user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn("detail", response.data)
        old_token.refresh_from_db()
        self.assertIsNotNone(old_token.used_at)
        self.assertEqual(EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("http://localhost:5173/verify-email?token=", mail.outbox[0].body)

    def test_mfa_setup_login_and_logout_flow(self):
        user = User.objects.create_user(
            email="auth@example.com",
            password="VeryStrongPassword123!",
            first_name="Auth",
            last_name="User",
            display_name="Auth User",
            is_active=True,
        )
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified_at"])

        login_start = self.client.post(
            reverse("auth-login-start"),
            {"email": user.email, "password": "VeryStrongPassword123!"},
            format="json",
        )
        flow_token = login_start.data["flow_token"]

        enroll_response = self.client.post(
            reverse("auth-mfa-enroll"),
            {},
            format="json",
            HTTP_X_MFA_TOKEN=flow_token,
        )
        self.assertEqual(enroll_response.status_code, status.HTTP_200_OK)
        secret = enroll_response.data["secret"]
        code = pyotp.TOTP(secret).now()

        verify_response = self.client.post(
            reverse("auth-login-verify-mfa"),
            {"flow_token": flow_token, "mfa_code": code},
            format="json",
            HTTP_X_DEVICE_ID="device-1",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", verify_response.data)
        self.assertIn("refresh", verify_response.data)
        self.assertEqual(len(verify_response.data["recovery_codes"]), 8)
        self.assertEqual(MfaRecoveryCode.objects.filter(user=user).count(), 8)
        self.assertEqual(SessionRecord.objects.filter(user=user).count(), 1)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {verify_response.data['access']}")
        me_response = self.client.get(reverse("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], user.email)
        self.assertEqual(me_response.data["phone_number"], "")
        self.assertEqual(me_response.data["address_line_1"], "")

        patch_response = self.client.patch(
            reverse("auth-me"),
            {
                "phone_number": "+15555550999",
                "address_line_1": "42 Updated St",
                "city": "Rochester",
                "state": "NY",
                "postal_code": "14604",
                "country": "US",
            },
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["phone_number"], "+15555550999")
        self.assertEqual(patch_response.data["address_line_1"], "42 Updated St")
        self.assertEqual(patch_response.data["city"], "Rochester")

        logout_response = self.client.post(
            reverse("auth-logout"),
            {"refresh": verify_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)

        refresh_response = self.client.post(
            reverse("auth-session-refresh"),
            {"refresh": verify_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_email_change_requires_reverification(self):
        user = User.objects.create_user(
            email="profile@example.com",
            password="VeryStrongPassword123!",
            is_active=True,
            mfa_enabled=True,
            mfa_totp_seed=pyotp.random_base32(),
        )
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified_at"])

        login_start = self.client.post(
            reverse("auth-login-start"),
            {"email": user.email, "password": "VeryStrongPassword123!"},
            format="json",
        )
        verify_response = self.client.post(
            reverse("auth-login-verify-mfa"),
            {"flow_token": login_start.data["flow_token"], "mfa_code": pyotp.TOTP(user.mfa_totp_seed).now()},
            format="json",
            HTTP_X_DEVICE_ID="device-email-change",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {verify_response.data['access']}")

        response = self.client.patch(
            reverse("auth-me"),
            {"email": "profile.updated@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.email, "profile.updated@example.com")
        self.assertIsNone(user.email_verified_at)
        self.assertFalse(user.is_active)
        self.assertTrue(EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).exists())
