from notifications.constants import (
    SECURITY_BODY_FAILED_LOGINS,
    SECURITY_BODY_FIRST_TIME_LARGE_TXN,
    SECURITY_BODY_HIGH_FREQUENCY,
    SECURITY_BODY_NEW_DEVICE,
    SECURITY_BODY_NEW_LOCATION,
    SECURITY_TITLE_FAILED_LOGINS,
    SECURITY_TITLE_FIRST_TIME_LARGE_TXN,
    SECURITY_TITLE_HIGH_FREQUENCY,
    SECURITY_TITLE_NEW_DEVICE,
    SECURITY_TITLE_NEW_LOCATION,
)
from notifications.models import NotificationType
from notifications.services import create_notification, send_security_email


def notify_new_location(user, ip_address):
    message = SECURITY_BODY_NEW_LOCATION.format(ip_address=ip_address)
    create_notification(
        user=user,
        title=SECURITY_TITLE_NEW_LOCATION,
        body=message,
        notification_type=NotificationType.SECURITY,
    )
    send_security_email(user, SECURITY_TITLE_NEW_LOCATION, message)


def notify_new_device(user, device_id):
    message = SECURITY_BODY_NEW_DEVICE.format(device_id=device_id)
    create_notification(
        user=user,
        title=SECURITY_TITLE_NEW_DEVICE,
        body=message,
        notification_type=NotificationType.SECURITY,
    )
    send_security_email(user, SECURITY_TITLE_NEW_DEVICE, message)


def notify_failed_login_attempts(user, attempts):
    message = SECURITY_BODY_FAILED_LOGINS.format(attempts=attempts)
    create_notification(
        user=user,
        title=SECURITY_TITLE_FAILED_LOGINS,
        body=message,
        notification_type=NotificationType.SECURITY,
    )
    send_security_email(user, SECURITY_TITLE_FAILED_LOGINS, message)


def notify_first_time_large_transaction(user, recipient, amount_cents):
    message = SECURITY_BODY_FIRST_TIME_LARGE_TXN.format(
        amount=amount_cents / 100,
        recipient=recipient.display_name or recipient.email,
    )
    create_notification(
        user=user,
        title=SECURITY_TITLE_FIRST_TIME_LARGE_TXN,
        body=message,
        notification_type=NotificationType.SECURITY,
    )
    send_security_email(user, SECURITY_TITLE_FIRST_TIME_LARGE_TXN, message)


def notify_high_frequency_transactions(user):
    create_notification(
        user=user,
        title=SECURITY_TITLE_HIGH_FREQUENCY,
        body=SECURITY_BODY_HIGH_FREQUENCY,
        notification_type=NotificationType.SECURITY,
    )
    send_security_email(user, SECURITY_TITLE_HIGH_FREQUENCY, SECURITY_BODY_HIGH_FREQUENCY)
