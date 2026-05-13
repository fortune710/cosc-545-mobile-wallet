from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib import admin
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from accounts.models import AuthFlowToken, EmailVerificationToken, MfaRecoveryCode, Recipient as AccountRecipient, SessionRecord, User
from accounts.services import build_session_tokens, invalidate_session
from audit.models import AuditEvent
from config.asgi import application
from notifications.constants import (
    CONSOLE_EMAIL_REQUEST_LOG_URL,
    EMAIL_FAILURE_STATUS_CODE,
    EMAIL_SUCCESS_STATUS_CODE,
    MAILTRAP_EMAIL_REQUEST_LOG_URL,
)
from notifications.models import Email, EmailRequest, EmailRequestStatus, EmailStatus, Notification, Recipient, RequestLog
from notifications.services import EmailSendResult, create_email_request, create_notification
from notifications.utils import notify_new_device
from wallet.constants import MAX_PAYMENT_CENTS, MIN_PAYMENT_CENTS
from wallet.models import PaymentIntent, PaymentRequest, SupervisoryApproval, Transaction, TransactionReceipt, Wallet
from wallet.services import create_funding


CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}


@override_settings(CHANNEL_LAYERS=CHANNEL_LAYERS)
class EmailRequestTests(TestCase):
    def setUp(self):
        self.user = self._create_user("email-tests@example.com")

    def _create_user(self, email):
        from accounts.models import User

        return User.objects.create_user(
            email=email,
            password="SecurePassword123!",
            is_active=True,
            mfa_enabled=True,
            email_verified_at=timezone.now(),
        )

    def test_email_request_marked_success_when_provider_returns_200(self):
        from unittest.mock import patch

        def fake_send(email_request):
            self.assertEqual(email_request.email_request_set.count(), 1)
            self.assertEqual(email_request.email_request_set.first().status, EmailStatus.PENDING)
            return EmailSendResult(
                status_code=EMAIL_SUCCESS_STATUS_CODE,
                response_body="ok",
                external_id="abc123",
            )

        with patch(
            "notifications.services.send_email_via_backend",
            side_effect=fake_send,
        ):
            email_request = create_email_request(
                to_recipients=[self.user.email],
                subject="Subject",
                text_content="Body",
            )

        email_request.refresh_from_db()
        self.assertEqual(email_request.status, EmailRequestStatus.SUCCESS)
        self.assertEqual(email_request.provider, 0)
        self.assertEqual(RequestLog.objects.get().status, EMAIL_SUCCESS_STATUS_CODE)
        recipient_email = Email.objects.get(request=email_request, recipient=self.user.email)
        self.assertEqual(recipient_email.status, EmailStatus.SENT)
        self.assertEqual(recipient_email.external_id, "abc123")
        self.assertIsNotNone(recipient_email.delivery_date)

    def test_email_request_marked_failed_when_provider_does_not_return_200(self):
        from unittest.mock import patch

        with patch(
            "notifications.services.send_email_via_backend",
            return_value=EmailSendResult(status_code=EMAIL_FAILURE_STATUS_CODE, response_body="provider failure"),
        ):
            email_request = create_email_request(
                to_recipients=[self.user.email],
                subject="Subject",
                text_content="Body",
            )

        email_request.refresh_from_db()
        self.assertEqual(email_request.status, EmailRequestStatus.FAILED)
        self.assertEqual(RequestLog.objects.get().status, EMAIL_FAILURE_STATUS_CODE)
        recipient_email = Email.objects.get(request=email_request, recipient=self.user.email)
        self.assertEqual(recipient_email.status, EmailStatus.FAILED)
        self.assertIsNone(recipient_email.delivery_date)

    @override_settings(MAIL_DELIVERY_MODE="console")
    def test_console_mode_logs_local_request(self):
        email_request = create_email_request(
            to_recipients=[self.user.email],
            subject="Console",
            text_content="Body",
        )

        email_request.refresh_from_db()
        self.assertEqual(email_request.provider, 0)
        self.assertEqual(RequestLog.objects.get().url, CONSOLE_EMAIL_REQUEST_LOG_URL)

    @override_settings(MAIL_DELIVERY_MODE="mailtrap", MAILTRAP_API_KEY="test-token", DEFAULT_FROM_NAME="SecureWallet")
    def test_mailtrap_mode_logs_api_request_and_persists_failed_records(self):
        from unittest.mock import MagicMock, patch

        response = MagicMock()
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        response.status = EMAIL_FAILURE_STATUS_CODE
        response.read.return_value = b'{"error":"failed"}'

        with patch("notifications.services.urlopen", return_value=response):
            email_request = create_email_request(
                to_recipients=[self.user.email],
                subject="Mailtrap",
                text_content="Body",
            )

        email_request.refresh_from_db()
        self.assertEqual(email_request.provider, 1)
        self.assertEqual(email_request.status, EmailRequestStatus.FAILED)
        self.assertEqual(RequestLog.objects.get().url, MAILTRAP_EMAIL_REQUEST_LOG_URL)
        recipient_email = Email.objects.get(request=email_request, recipient=self.user.email)
        self.assertEqual(recipient_email.status, EmailStatus.FAILED)

    def test_security_notification_always_creates_persistent_notification(self):
        notify_new_device(self.user, "device-123")

        notification = Notification.objects.get(user=self.user)
        self.assertEqual(notification.title, "New login device")
        self.assertEqual(EmailRequest.objects.count(), 1)
        self.assertEqual(Email.objects.count(), 1)


@override_settings(CHANNEL_LAYERS=CHANNEL_LAYERS)
class NotificationSocketTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = self._create_user("socket-tests@example.com")
        self.session, self.access, self.refresh = build_session_tokens(self.user, device_id="device-1", ip_address="127.0.0.1")

    def _create_user(self, email):
        from accounts.models import User

        return User.objects.create_user(
            email=email,
            password="SecurePassword123!",
            is_active=True,
            mfa_enabled=True,
            email_verified_at=timezone.now(),
        )

    def test_websocket_accepts_valid_jwt_and_active_session(self):
        async def run_test():
            communicator = WebsocketCommunicator(application, f"/ws/notifications/?token={self.access}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.disconnect()

        async_to_sync(run_test)()

    def test_websocket_rejects_invalid_session(self):
        self.session.invalidated_at = timezone.now()
        self.session.save(update_fields=["invalidated_at"])

        async def run_test():
            communicator = WebsocketCommunicator(application, f"/ws/notifications/?token={self.access}")
            connected, _ = await communicator.connect()
            self.assertFalse(connected)

        async_to_sync(run_test)()

    def test_websocket_receives_notification_payload_matching_rest_shape(self):
        async def run_test():
            communicator = WebsocketCommunicator(application, f"/ws/notifications/?token={self.access}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)

            notification = await database_sync_to_async(create_notification)(
                user=self.user,
                title="Realtime title",
                body="Realtime body",
                notification_type="system",
            )
            payload = await communicator.receive_json_from(timeout=2)
            self.assertEqual(payload["id"], str(notification.id))
            self.assertEqual(payload["title"], "Realtime title")
            self.assertEqual(payload["body"], "Realtime body")
            self.assertEqual(payload["type"], "system")
            self.assertEqual(payload["user"], str(self.user.id))
            self.assertIn("created_at", payload)
            await communicator.disconnect()

        async_to_sync(run_test)()

    def test_websocket_receives_funding_notification_after_wallet_credit(self):
        async def run_test():
            communicator = WebsocketCommunicator(application, f"/ws/notifications/?token={self.access}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)

            await database_sync_to_async(create_funding)(self.user, 2500)
            payload = await communicator.receive_json_from(timeout=2)
            self.assertEqual(payload["title"], "Funds added")
            self.assertEqual(payload["body"], "$25.00 was added to your wallet balance.")
            self.assertEqual(payload["type"], "system")
            self.assertEqual(payload["user"], str(self.user.id))
            await communicator.disconnect()

        async_to_sync(run_test)()

    def test_websocket_receives_session_update_after_session_invalidation(self):
        async def run_test():
            communicator = WebsocketCommunicator(application, f"/ws/notifications/?token={self.access}")
            connected, _ = await communicator.connect()
            self.assertTrue(connected)

            await database_sync_to_async(invalidate_session)(self.session.session_key)
            payload = await communicator.receive_json_from(timeout=2)
            self.assertEqual(payload["event_type"], "session.updated")
            self.assertEqual(payload["action"], "invalidated")
            self.assertEqual(payload["session_key"], self.session.session_key)
            await communicator.disconnect()

        async_to_sync(run_test)()


class ConstantsAndAdminTests(TestCase):
    def test_constants_backed_limits_preserve_micropayment_bounds(self):
        self.assertEqual(MIN_PAYMENT_CENTS, 1)
        self.assertEqual(MAX_PAYMENT_CENTS, 5000)

    def test_all_models_are_registered_in_admin(self):
        admin.autodiscover()

        expected_models = [
            Wallet,
            Transaction,
            TransactionReceipt,
            PaymentIntent,
            PaymentRequest,
            SupervisoryApproval,
            AuditEvent,
            Notification,
            Recipient,
            RequestLog,
            EmailRequest,
            Email,
            User,
            EmailVerificationToken,
            AuthFlowToken,
            SessionRecord,
            MfaRecoveryCode,
            AccountRecipient,
        ]

        for model in expected_models:
            self.assertIn(model, admin.site._registry)
