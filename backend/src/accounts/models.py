from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from accounts.managers import UserManager
from core.models import BaseModel


class User(BaseModel, AbstractUser):
    class Role(models.IntegerChoices):
        USER = 1, "User"
        SUPPORT = 2, "Support Agent"
        ADMIN = 3, "System Administrator"

    username = None
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=150, blank=True)
    role = models.PositiveSmallIntegerField(choices=Role.choices, default=Role.USER)
    phone_number = models.CharField(max_length=32, blank=True)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=32, blank=True)
    country = models.CharField(max_length=2, blank=True)
    registration_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    mfa_enabled = models.BooleanField(default=False)
    mfa_locked_until = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_failed_login_at = models.DateTimeField(null=True, blank=True)
    device_fingerprint = models.CharField(max_length=255, blank=True)
    mfa_totp_seed = models.CharField(max_length=32, null=True, blank=True)
    mfa_enrollment_token = models.UUIDField(null=True, blank=True, unique=True)
    balance = models.BigIntegerField(default=0)
    pin = models.CharField(max_length=128, blank=True, null=True)
    # Might deprecate this in favor of the code from the mfa totp seed
    otp_hash = models.CharField(max_length=128, blank=True, null=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def is_mfa_locked(self):
        return bool(self.mfa_locked_until and self.mfa_locked_until > timezone.now())

    @property
    def is_locked(self):
        return bool(self.locked_until and self.locked_until > timezone.now())

    @property
    def role_label(self):
        return self.get_role_display()

    @property
    def is_email_verified(self):
        return bool(self.email_verified_at)


class EmailVerificationToken(BaseModel):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_verification_tokens",
    )
    token = models.CharField(max_length=128, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "email_verification_tokens"
        ordering = ["-datetime_created"]

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def is_usable(self):
        return self.used_at is None and not self.is_expired


class AuthFlowToken(BaseModel):
    class Purpose(models.TextChoices):
        MFA_LOGIN = "mfa_login", "MFA Login"
        MFA_SETUP = "mfa_setup", "MFA Setup"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="auth_flow_tokens",
    )
    token = models.CharField(max_length=128, unique=True, db_index=True)
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    failed_attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "auth_flow_tokens"
        ordering = ["-datetime_created"]

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def is_usable(self):
        return self.used_at is None and not self.is_expired


class SessionRecord(BaseModel):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    session_key = models.CharField(max_length=64, unique=True, db_index=True)
    refresh_jti = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    invalidated_at = models.DateTimeField(null=True, blank=True)
    device_id = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = "session_records"
        ordering = ["-datetime_created"]

    @property
    def is_active(self):
        return self.invalidated_at is None and self.expires_at > timezone.now()


class MfaRecoveryCode(BaseModel):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="mfa_recovery_codes",
    )
    code_hash = models.CharField(max_length=128)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "mfa_recovery_codes"
        ordering = ["datetime_created"]

    @property
    def is_available(self):
        return self.consumed_at is None


class Recipient(BaseModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_recipients",
    )
    contact = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_as_recipient_by",
    )

    class Meta:
        db_table = "saved_recipients"
        unique_together = [("owner", "contact")]
        ordering = ["contact__display_name", "contact__email"]
