from django.conf import settings
from django.core.cache import cache
from config.email import EmailService
import asyncio

email_service = EmailService()

def _send_notification(user, subject, message):
    """Helper to trigger async email send."""
    # Since we are in a sync context (likely DRF view), we run this in a background task or just fire and forget
    # In a real app, this would be a Celery task.
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if loop.is_running():
        loop.create_task(email_service.send_email(user.email, subject, message))
    else:
        loop.run_until_complete(email_service.send_email(user.email, subject, message))

def notify_new_location(user, ip_address):
    subject = "New Login from New Location"
    message = f"Hello {user.email},\n\nWe detected a login to your account from a new location: {ip_address}.\nIf this wasn't you, please secure your account immediately."
    _send_notification(user, subject, message)

def notify_new_device(user, device_id):
    subject = "New Device Registered"
    message = f"Hello {user.email},\n\nWe detected a login from a new device (ID: {device_id}).\nIf this wasn't you, please secure your account immediately."
    _send_notification(user, subject, message)

def notify_failed_login_attempts(user, attempts):
    subject = "Multiple Failed Login Attempts"
    message = f"Hello {user.email},\n\nThere have been {attempts} failed login attempts on your account.\nIf this wasn't you, you may want to change your password."
    _send_notification(user, subject, message)

def notify_large_transaction_first_recipient(user, recipient_email, amount_cents):
    amount_dollars = amount_cents / 100.0
    subject = "Large Transaction to New Recipient"
    message = f"Hello {user.email},\n\nYou are sending ${amount_dollars:.2f} to a first-time recipient ({recipient_email}).\nPlease ensure this is intentional."
    _send_notification(user, subject, message)

def notify_high_frequency_transactions(user):
    subject = "High Transaction Frequency Detected"
    message = f"Hello {user.email},\n\nWe noticed more than 3 transactions in a 10-minute window.\nWe are notifying you for your security."
    _send_notification(user, subject, message)
