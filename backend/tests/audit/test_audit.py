import pyotp

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from audit.logger import log_event
from audit.events import AccountEvent


User = get_user_model()


class AuditEndpointTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="audit-admin@example.com",
            password="VeryStrongPassword123!",
            display_name="Audit Admin",
        )
        self.admin.email_verified_at = timezone.now()
        self.admin.mfa_totp_seed = pyotp.random_base32()
        self.admin.mfa_enabled = True
        self.admin.save(update_fields=["email_verified_at", "mfa_totp_seed", "mfa_enabled"])

        log_event(AccountEvent.REGISTER, "SUCCESS", user=self.admin)

        login_start = self.client.post(
            reverse("auth-login-start"),
            {"email": self.admin.email, "password": "VeryStrongPassword123!"},
            format="json",
        )
        verify_response = self.client.post(
            reverse("auth-login-verify-mfa"),
            {"flow_token": login_start.data["flow_token"], "mfa_code": pyotp.TOTP(self.admin.mfa_totp_seed).now()},
            format="json",
            HTTP_X_DEVICE_ID="audit-admin-device",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {verify_response.data['access']}")

    def test_audit_events_list_without_filters(self):
        response = self.client.get(reverse("audit-event-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_audit_events_filter_validation(self):
        response = self.client.get(reverse("audit-event-list"), {"status": "NOT_A_STATUS"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_audit_events_filter_by_status(self):
        response = self.client.get(reverse("audit-event-list"), {"status": "SUCCESS"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
