from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def build_verification_link(token: str) -> str:
    return f"{settings.FRONTEND_APP_URL}/verify-email?token={token}"


def send_verification_email(user, token: str):
    verification_link = build_verification_link(token)
    context = {
        "app_name": "SecureWallet",
        "user": user,
        "verification_link": verification_link,
        "verification_token": token,
        "expiry_hours": 24,
    }
    html_message = render_to_string("accounts/emails/verify_email.html", context)
    text_message = strip_tags(html_message)
    email = EmailMultiAlternatives(
        subject="Confirm your SecureWallet email",
        body=text_message,
        from_email=getattr(settings, "SENDER_EMAIL", "no-reply@securewallet.local"),
        to=[user.email],
    )
    email.attach_alternative(html_message, "text/html")
    email.send(fail_silently=True)


def send_security_email(user, subject: str, message: str):
    from accounts.services import send_simple_email

    send_simple_email(subject=subject, message=message, recipient=user.email)
