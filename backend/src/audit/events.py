class AccountEvent:
    REGISTER         = "account.register"
    REGISTER_FAILED  = "account.register.failed"
    LOGIN            = "account.login"
    LOGIN_FAILED     = "account.login.failed"
    LOGOUT           = "account.logout"
    PIN_SET          = "account.pin.set"
    PIN_CHECK_OK     = "account.pin.check.success"
    PIN_CHECK_FAILED = "account.pin.check.failed"
    PASSWORD_CHANGE_OK     = "account.password.change.success"
    PASSWORD_CHANGE_FAILED = "account.password.change.failed"
    PROFILE_UPDATED        = "account.profile.updated"
    EMAIL_VERIFY_SENT      = "account.email.verify.sent"
    EMAIL_VERIFY_CONFIRMED = "account.email.verify.confirmed"
    OTP_VERIFIED           = "account.otp.verified"
    OTP_VERIFY_FAILED      = "account.otp.verify.failed"

class WalletEvent:
    BALANCE_VIEWED   = "wallet.balance.viewed"
    BALANCE_CREDITED = "wallet.balance.credited"

class RecipientEvent:
    RECIPIENT_ADDED   = "recipient.added"
    RECIPIENT_REMOVED = "recipient.removed"

class NotificationEvent:
    NOTIFICATION_READ = "notification.read"
