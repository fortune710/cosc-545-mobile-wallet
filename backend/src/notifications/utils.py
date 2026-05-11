from accounts.email import send_security_email


def notify_new_location(user, ip_address):
    send_security_email(
        user,
        "New login location",
        f"We detected a login from a new location: {ip_address}.",
    )


def notify_new_device(user, device_id):
    send_security_email(
        user,
        "New login device",
        f"We detected a login from a new device: {device_id}.",
    )


def notify_failed_login_attempts(user, attempts):
    send_security_email(
        user,
        "Multiple failed login attempts",
        f"We detected {attempts} failed login attempts on your account.",
    )


def notify_first_time_large_transaction(user, recipient, amount_cents):
    send_security_email(
        user,
        "Large transaction to a first-time recipient",
        f"You sent ${amount_cents / 100:.2f} to {recipient.display_name or recipient.email}.",
    )


def notify_high_frequency_transactions(user):
    send_security_email(
        user,
        "High transaction activity",
        "We detected more than 5 transactions in a 10-minute window.",
    )
