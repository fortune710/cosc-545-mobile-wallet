from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from decimal import Decimal
import re
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    display_name: Optional[str] = ""
    phone_number: Optional[str] = ""
    address_line_1: Optional[str] = ""
    address_line_2: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    postal_code: Optional[str] = ""
    country: Optional[str] = ""

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        # 1. Enforce character complexity (mirroring frontend regex where possible)
        # Requirements: At least MIN_PASSWORD_LENGTH chars, one upper, one lower, one digit, one special char
        min_len = getattr(settings, "MIN_PASSWORD_LENGTH", 12)
        if len(v) < min_len:
            raise ValueError(f"Password must be at least {min_len} characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number.")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one special character.")

        # 2. Run Django's standard validators (e.g., common passwords, min length in settings)
        try:
            # We don't pass the user object here since they don't exist yet
            validate_password(v)
        except DjangoValidationError as e:
            raise ValueError(" ".join(e.messages))

        return v

class LogoutRequest(BaseModel):
    refresh: str

class BalanceIncrementRequest(BaseModel):
    amount: int = Field(ge=100, le=5000)

class PinSetRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=4)

    @field_validator("pin")
    @classmethod
    def pin_must_be_digits(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("PIN must be digits only")
        return v

class PinCheckRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=4)

    @field_validator("pin")
    @classmethod
    def pin_must_be_digits(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("PIN must be digits only")
        return v
