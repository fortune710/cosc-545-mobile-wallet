from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urlencode

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework.renderers import JSONRenderer

from notifications.constants import (
    APP_NAME,
    CONSOLE_EMAIL_REQUEST_LOG_URL,
    EMAIL_FAILURE_STATUS_CODE,
    EMAIL_SUCCESS_STATUS_CODE,
    EmailProviders,
    EmailRequestStatus,
    EmailStatus,
    EMAIL_REQUEST_LOG_METHOD,
    EMAIL_REQUEST_LOG_URL,
    MAILTRAP_EMAIL_REQUEST_LOG_URL,
    MAILTRAP_TIMEOUT_SECONDS,
    SECURITY_NOTIFICATION_TYPE,
    VERIFICATION_EMAIL_SUBJECT,
    VERIFICATION_EMAIL_TEMPLATE,
    VERIFICATION_EXPIRY_HOURS,
)
from notifications.models import Email, EmailRequest, Notification, RequestLog
from notifications.serializers import NotificationSerializer


def notification_group_name(user_id) -> str:
    return f"notifications_{user_id}"


def build_verification_link(token: str) -> str:
    query = urlencode({"token": token})
    return f"{settings.FRONTEND_APP_URL}/verify-email?{query}"


@dataclass
class EmailSendResult:
    status_code: int
    response_body: str
    external_id: str = ""
    provider: int = EmailProviders.DJANGO
    request_url: str = EMAIL_REQUEST_LOG_URL
    request_payload: dict | None = None

    @property
    def ok(self) -> bool:
        return self.status_code == EMAIL_SUCCESS_STATUS_CODE


def _console_payload(email_request: EmailRequest) -> dict:
    return {
        "subject": email_request.subject,
        "to_recipients": email_request.to_recipients,
        "cc_recipients": email_request.cc_recipients or [],
        "bcc_recipients": email_request.bcc_recipients or [],
        "sender_name": email_request.sender_name,
        "from_email": email_request.from_email or settings.SENDER_EMAIL,
    }


def send_email_via_console(email_request: EmailRequest) -> EmailSendResult:
    message = EmailMultiAlternatives(
        subject=email_request.subject,
        body=email_request.text_content,
        from_email=email_request.from_email or settings.SENDER_EMAIL,
        to=email_request.to_recipients,
        cc=email_request.cc_recipients or None,
        bcc=email_request.bcc_recipients or None,
    )
    if email_request.html_content:
        message.attach_alternative(email_request.html_content, "text/html")

    try:
        sent_count = message.send(fail_silently=False)
    except Exception as exc:
        return EmailSendResult(
            status_code=EMAIL_FAILURE_STATUS_CODE,
            response_body=str(exc),
            provider=EmailProviders.DJANGO,
            request_url=CONSOLE_EMAIL_REQUEST_LOG_URL,
            request_payload=_console_payload(email_request),
        )

    if sent_count:
        return EmailSendResult(
            status_code=EMAIL_SUCCESS_STATUS_CODE,
            response_body="sent",
            provider=EmailProviders.DJANGO,
            request_url=CONSOLE_EMAIL_REQUEST_LOG_URL,
            request_payload=_console_payload(email_request),
        )

    return EmailSendResult(
        status_code=EMAIL_FAILURE_STATUS_CODE,
        response_body="backend returned 0 deliveries",
        provider=EmailProviders.DJANGO,
        request_url=CONSOLE_EMAIL_REQUEST_LOG_URL,
        request_payload=_console_payload(email_request),
    )


def _mailtrap_payload(email_request: EmailRequest) -> dict:
    payload = {
        "from": {
            "email": email_request.from_email or settings.SENDER_EMAIL,
            "name": email_request.sender_name or settings.DEFAULT_FROM_NAME,
        },
        "to": [{"email": recipient} for recipient in email_request.to_recipients],
        "subject": email_request.subject,
        "text": email_request.text_content,
    }
    if email_request.html_content:
        payload["html"] = email_request.html_content
    if email_request.cc_recipients:
        payload["cc"] = [{"email": recipient} for recipient in email_request.cc_recipients]
    if email_request.bcc_recipients:
        payload["bcc"] = [{"email": recipient} for recipient in email_request.bcc_recipients]
    return payload


def _extract_mailtrap_external_id(body: str) -> str:
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return ""

    if isinstance(data.get("message_ids"), list) and data["message_ids"]:
        return str(data["message_ids"][0])
    if data.get("message_id"):
        return str(data["message_id"])
    if isinstance(data.get("messages"), list) and data["messages"]:
        message = data["messages"][0]
        if isinstance(message, dict) and message.get("id"):
            return str(message["id"])
    return ""


def send_email_via_mailtrap(email_request: EmailRequest) -> EmailSendResult:
    payload = _mailtrap_payload(email_request)
    body = json.dumps(payload).encode()
    request = Request(
        MAILTRAP_EMAIL_REQUEST_LOG_URL,
        data=body,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {settings.MAILTRAP_API_KEY}",
            "Content-Type": "application/json",
        },
        method=EMAIL_REQUEST_LOG_METHOD,
    )

    try:
        with urlopen(request, timeout=MAILTRAP_TIMEOUT_SECONDS) as response:
            response_body = response.read().decode()
            return EmailSendResult(
                status_code=response.status,
                response_body=response_body,
                external_id=_extract_mailtrap_external_id(response_body),
                provider=EmailProviders.MAILTRAP,
                request_url=MAILTRAP_EMAIL_REQUEST_LOG_URL,
                request_payload=payload,
            )
    except HTTPError as exc:
        error_body = exc.read().decode() if hasattr(exc, "read") else str(exc)
        return EmailSendResult(
            status_code=exc.code,
            response_body=error_body,
            provider=EmailProviders.MAILTRAP,
            request_url=MAILTRAP_EMAIL_REQUEST_LOG_URL,
            request_payload=payload,
        )
    except URLError as exc:
        return EmailSendResult(
            status_code=EMAIL_FAILURE_STATUS_CODE,
            response_body=str(exc.reason),
            provider=EmailProviders.MAILTRAP,
            request_url=MAILTRAP_EMAIL_REQUEST_LOG_URL,
            request_payload=payload,
        )
    except Exception as exc:
        return EmailSendResult(
            status_code=EMAIL_FAILURE_STATUS_CODE,
            response_body=str(exc),
            provider=EmailProviders.MAILTRAP,
            request_url=MAILTRAP_EMAIL_REQUEST_LOG_URL,
            request_payload=payload,
        )


def send_email_via_backend(email_request: EmailRequest) -> EmailSendResult:
    if settings.MAIL_DELIVERY_MODE == "mailtrap":
        return send_email_via_mailtrap(email_request)
    return send_email_via_console(email_request)


def _record_email_attempt(email_request: EmailRequest, result: EmailSendResult) -> RequestLog:
    request_log = RequestLog.objects.create(
        url=result.request_url or EMAIL_REQUEST_LOG_URL,
        method=EMAIL_REQUEST_LOG_METHOD,
        params={},
        post_data=result.request_payload or _console_payload(email_request),
        status=result.status_code,
        response=result.response_body,
        external_id=result.external_id,
    )
    email_request.api_responses.add(request_log)
    return request_log


def _upsert_recipient_statuses(email_request: EmailRequest, result: EmailSendResult) -> None:
    recipient_status = EmailStatus.SENT if result.ok else EmailStatus.FAILED
    delivery_date = timezone.now() if result.ok else None
    existing = {email.recipient: email for email in email_request.email_request_set.all()}

    for recipient in email_request.all_recipients:
        email = existing.get(recipient)
        if email:
            email.status = recipient_status
            email.external_id = result.external_id
            email.delivery_date = delivery_date
            email.save(update_fields=["status", "external_id", "delivery_date"])
            continue
        Email.objects.create(
            request=email_request,
            recipient=recipient,
            status=recipient_status,
            external_id=result.external_id,
            delivery_date=delivery_date,
        )


def _create_recipient_records(email_request: EmailRequest) -> None:
    existing_recipients = set(email_request.email_request_set.values_list("recipient", flat=True))
    pending_emails = [
        Email(request=email_request, recipient=recipient, status=EmailStatus.PENDING)
        for recipient in email_request.all_recipients
        if recipient not in existing_recipients
    ]
    if pending_emails:
        Email.objects.bulk_create(pending_emails)


def send_email_request(email_request: EmailRequest) -> EmailRequest:
    _create_recipient_records(email_request)
    result = send_email_via_backend(email_request)
    _record_email_attempt(email_request, result)
    email_request.provider = result.provider
    email_request.status = EmailRequestStatus.SUCCESS if result.ok else EmailRequestStatus.FAILED
    email_request.save(update_fields=["provider", "status", "datetime_updated"])
    _upsert_recipient_statuses(email_request, result)
    return email_request


def create_email_request(
    *,
    to_recipients: Iterable[str],
    subject: str,
    text_content: str,
    html_content: str = "",
    cc_recipients: Iterable[str] | None = None,
    bcc_recipients: Iterable[str] | None = None,
    sender_name: str = "",
    from_email: str = "",
    template_id: str = "",
    template_unique_data: dict | None = None,
    template_global_data: dict | None = None,
) -> EmailRequest:
    email_request = EmailRequest.objects.create(
        provider=None,
        to_recipients=list(to_recipients),
        cc_recipients=list(cc_recipients or []),
        bcc_recipients=list(bcc_recipients or []),
        subject=subject,
        sender_name=sender_name or settings.DEFAULT_FROM_NAME,
        from_email=from_email or settings.SENDER_EMAIL,
        text_content=text_content,
        html_content=html_content,
        template_id=template_id,
        template_unique_data=template_unique_data,
        template_global_data=template_global_data,
    )
    _create_recipient_records(email_request)
    return send_email_request(email_request)


def emit_notification(notification: Notification) -> None:
    payload = json.loads(JSONRenderer().render(NotificationSerializer(notification).data))
    emit_realtime_payload(notification.user_id, payload)


def emit_realtime_payload(user_id, payload: dict) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        notification_group_name(user_id),
        {
            "type": "notification.message",
            "payload": payload,
        },
    )


def emit_session_update(*, user_id, session_key: str, action: str) -> None:
    emit_realtime_payload(
        user_id,
        {
            "event_type": "session.updated",
            "action": action,
            "session_key": session_key,
        },
    )


def create_notification(*, user, title: str, body: str, notification_type: str = SECURITY_NOTIFICATION_TYPE) -> Notification:
    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body,
        type=notification_type,
    )
    transaction.on_commit(lambda: emit_notification(notification))
    return notification


def send_verification_email(user, token: str) -> EmailRequest:
    verification_link = build_verification_link(token)
    context = {
        "app_name": APP_NAME,
        "user": user,
        "verification_link": verification_link,
        "verification_token": token,
        "expiry_hours": VERIFICATION_EXPIRY_HOURS,
    }
    html_message = render_to_string(VERIFICATION_EMAIL_TEMPLATE, context)
    text_message = strip_tags(html_message)
    return create_email_request(
        to_recipients=[user.email],
        subject=VERIFICATION_EMAIL_SUBJECT,
        text_content=text_message,
        html_content=html_message,
        template_id="verify_email",
        template_unique_data={"token": token},
        template_global_data={"verification_link": verification_link},
    )


def send_security_email(user, subject: str, message: str) -> EmailRequest:
    return create_email_request(
        to_recipients=[user.email],
        subject=subject,
        text_content=message,
    )
