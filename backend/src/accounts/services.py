import hashlib
import hmac
import secrets
import string

import pyotp
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from rest_framework_simplejwt.tokens import RefreshToken

from accounts.constants import (
    AUTH_FLOW_TTL,
    EMAIL_VERIFICATION_TTL,
    RECOVERY_CODE_COUNT,
    RECOVERY_CODE_LENGTH,
    SESSION_TTL,
)
from accounts.models import AuthFlowToken, EmailVerificationToken, MfaRecoveryCode, SessionRecord, User
from notifications.services import emit_session_update, send_verification_email
from wallet.models import Wallet

def generate_token(length=48):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def receipt_signature(payload: str) -> str:
    secret = getattr(settings, "AUDIT_HMAC_SECRET", None) or settings.SECRET_KEY
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


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


def ensure_mfa_seed(user: User) -> str:
    if not user.mfa_totp_seed:
        user.mfa_totp_seed = pyotp.random_base32()
        user.save(update_fields=["mfa_totp_seed"])
    return user.mfa_totp_seed


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
    transaction.on_commit(
        lambda user_id=user.id, session_key=session.session_key: emit_session_update(
            user_id=user_id,
            session_key=session_key,
            action="created",
        )
    )
    return session, str(access), str(refresh)


def refresh_session_tokens(session: SessionRecord):
    refresh = RefreshToken.for_user(session.user)
    refresh["sid"] = session.session_key
    refresh["role"] = session.user.role
    refresh["mfa_verified"] = True

    access = refresh.access_token
    access["sid"] = session.session_key
    access["role"] = session.user.role
    access["mfa_verified"] = True

    session.refresh_jti = str(refresh["jti"])
    session.expires_at = timezone.now() + SESSION_TTL
    session.save(update_fields=["refresh_jti", "expires_at"])
    transaction.on_commit(
        lambda user_id=session.user_id, session_key=session.session_key: emit_session_update(
            user_id=user_id,
            session_key=session_key,
            action="refreshed",
        )
    )
    return str(access), str(refresh)


def invalidate_session(session_key: str):
    session = SessionRecord.objects.filter(session_key=session_key, invalidated_at__isnull=True).first()
    if not session:
        return
    session.invalidated_at = timezone.now()
    session.save(update_fields=["invalidated_at"])
    transaction.on_commit(
        lambda user_id=session.user_id, session_key=session.session_key: emit_session_update(
            user_id=user_id,
            session_key=session_key,
            action="invalidated",
        )
    )


def set_user_pin(user: User, pin: str):
    user.pin = make_password(pin)
    user.save(update_fields=["pin"])
    return user


def verify_user_pin(user: User, pin: str) -> bool:
    if not user.pin:
        return False
    return check_password(pin, user.pin)
