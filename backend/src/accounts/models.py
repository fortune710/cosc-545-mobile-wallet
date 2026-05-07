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
    failed_mfa_attempts = models.PositiveSmallIntegerField(default=0)
    balance = models.BigIntegerField(default=0)
    pin = models.CharField(max_length=128, blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def is_mfa_locked(self):
        return bool(self.mfa_locked_until and self.mfa_locked_until > timezone.now())

    @property
    def role_label(self):
        return self.get_role_display()
