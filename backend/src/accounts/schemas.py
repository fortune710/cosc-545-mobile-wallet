from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
import re
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

WEAK_PINS = {
    "0000",
    "1111",
    "2222",
    "3333",
    "4444",
    "5555",
    "6666",
    "7777",
    "8888",
    "9999",
    "1234",
}

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

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password_complexity(cls, v: str) -> str:
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
        try:
            validate_password(v)
        except DjangoValidationError as e:
            raise ValueError(" ".join(e.messages))
        return v

class BalanceIncrementRequest(BaseModel):
    amount: int = Field(ge=100, le=5000)

class PinSetRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=4)

    @field_validator("pin")
    @classmethod
    def pin_must_be_digits(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("PIN must be digits only")
        if v in WEAK_PINS:
            raise ValueError("Choose a less predictable PIN")
        return v

class PinCheckRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=4)

    @field_validator("pin")
    @classmethod
    def pin_must_be_digits(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("PIN must be digits only")
        return v

class OtpCheckRequest(BaseModel):
    otp: str = Field(min_length=4, max_length=4)

    @field_validator("otp")
    @classmethod
    def otp_must_be_digits(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("OTP must be 4 digits only")
        return v

class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, max_length=150)
    last_name: Optional[str] = Field(None, max_length=150)
    display_name: Optional[str] = Field(None, max_length=150)
    phone_number: Optional[str] = Field(None, max_length=32)
    address_line_1: Optional[str] = Field(None, max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=120)
    state: Optional[str] = Field(None, max_length=120)
    postal_code: Optional[str] = Field(None, max_length=32)
    country: Optional[str] = Field(None, max_length=2)
