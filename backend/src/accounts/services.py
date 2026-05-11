import hashlib
import hmac
import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.email import send_verification_email
from accounts.models import AuthFlowToken, EmailVerificationToken, MfaRecoveryCode, SessionRecord, User
from wallet.models import Wallet


EMAIL_VERIFICATION_TTL = timedelta(hours=24)
AUTH_FLOW_TTL = timedelta(minutes=10)
SESSION_TTL = timedelta(hours=8)
RECOVERY_CODE_LENGTH = 16
RECOVERY_CODE_COUNT = 8


def generate_token(length=48):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def receipt_signature(payload: str) -> str:
    secret = getattr(settings, "AUDIT_HMAC_SECRET", None) or settings.SECRET_KEY
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def send_simple_email(subject: str, message: str, recipient: str, html_message: str | None = None):
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "SENDER_EMAIL", "no-reply@securewallet.local"),
        recipient_list=[recipient],
        html_message=html_message,
        fail_silently=True,
    )


def issue_email_verification(user: User):
    token = generate_token(64)
    EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())
    verification = EmailVerificationToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + EMAIL_VERIFICATION_TTL,
    )
    send_verification_email(user, verification.token)
    return verification


def mark_email_verified(token: EmailVerificationToken):
    with transaction.atomic():
        token.used_at = timezone.now()
        token.save(update_fields=["used_at"])
        user = token.user
        user.email_verified_at = timezone.now()
        user.is_active = True
        user.save(update_fields=["email_verified_at", "is_active"])
        Wallet.objects.get_or_create(user=user)
    return user


def issue_auth_flow_token(user: User, purpose: str):
    AuthFlowToken.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(used_at=timezone.now())
    return AuthFlowToken.objects.create(
        user=user,
        token=generate_token(48),
        purpose=purpose,
        expires_at=timezone.now() + AUTH_FLOW_TTL,
    )


def issue_recovery_codes(user: User):
    alphabet = string.ascii_uppercase + string.digits
    plain_codes = []
    with transaction.atomic():
        user.mfa_recovery_codes.all().delete()
        for _ in range(RECOVERY_CODE_COUNT):
            code = "".join(secrets.choice(alphabet) for _ in range(RECOVERY_CODE_LENGTH))
            plain_codes.append(code)
            MfaRecoveryCode.objects.create(user=user, code_hash=make_password(code))
    return plain_codes


def consume_recovery_code(user: User, code: str) -> bool:
    for recovery_code in user.mfa_recovery_codes.filter(consumed_at__isnull=True):
        if check_password(code, recovery_code.code_hash):
            recovery_code.consumed_at = timezone.now()
            recovery_code.save(update_fields=["consumed_at"])
            return True
    return False


def build_session_tokens(user: User, device_id: str = "", ip_address: str | None = None, user_agent: str = ""):
    refresh = RefreshToken.for_user(user)
    session = SessionRecord.objects.create(
        user=user,
        session_key=generate_token(32),
        refresh_jti=str(refresh["jti"]),
        expires_at=timezone.now() + SESSION_TTL,
        device_id=device_id or "",
        ip_address=ip_address,
        user_agent=user_agent or "",
    )
    refresh["sid"] = session.session_key
    refresh["role"] = user.role
    refresh["mfa_verified"] = True
    access = refresh.access_token
    access["sid"] = session.session_key
    access["role"] = user.role
    access["mfa_verified"] = True
    return session, str(access), str(refresh)


def invalidate_session(session_key: str):
    SessionRecord.objects.filter(session_key=session_key, invalidated_at__isnull=True).update(
        invalidated_at=timezone.now()
    )
