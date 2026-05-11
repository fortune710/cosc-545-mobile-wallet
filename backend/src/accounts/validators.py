from accounts.disposable_domains import DISPOSABLE_EMAIL_DOMAINS


def normalize_email_domain(email: str) -> str:
    return email.rsplit("@", 1)[-1].strip().lower()


def is_disposable_email(email: str) -> bool:
    return normalize_email_domain(email) in DISPOSABLE_EMAIL_DOMAINS
