from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from decimal import Decimal

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

class LogoutRequest(BaseModel):
    refresh: str

class BalanceIncrementRequest(BaseModel):
    amount: Decimal = Field(gt=0, le=50)

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
