import re

from accounts.disposable_domains import DISPOSABLE_EMAIL_DOMAINS


PHONE_NUMBER_PATTERN = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_email_domain(email: str) -> str:
    return email.rsplit("@", 1)[-1].strip().lower()


def is_disposable_email(email: str) -> bool:
    domain = normalize_email_domain(email)
    return any(domain == blocked or domain.endswith(f".{blocked}") for blocked in DISPOSABLE_EMAIL_DOMAINS)


def validate_phone_number(value: str) -> str:
    cleaned = " ".join(value.split())
    if not cleaned:
        return ""
    digits_only = cleaned.replace(" ", "").replace("-", "")
    if digits_only.startswith("00"):
        digits_only = f"+{digits_only[2:]}"
    if not PHONE_NUMBER_PATTERN.fullmatch(digits_only):
        raise ValueError("Phone number must be in international format, for example +15555550123.")
    return digits_only
