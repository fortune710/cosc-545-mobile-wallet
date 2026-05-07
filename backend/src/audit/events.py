class AccountEvent:
    REGISTER         = "account.register"
    LOGIN            = "account.login"
    LOGIN_FAILED     = "account.login.failed"
    LOGOUT           = "account.logout"
    PIN_SET          = "account.pin.set"
    PIN_CHECK_OK     = "account.pin.check.success"
    PIN_CHECK_FAILED = "account.pin.check.failed"

class WalletEvent:
    BALANCE_VIEWED   = "wallet.balance.viewed"
    BALANCE_CREDITED = "wallet.balance.credited"

class RecipientEvent:
    RECIPIENT_ADDED   = "recipient.added"
    RECIPIENT_REMOVED = "recipient.removed"

class NotificationEvent:
    NOTIFICATION_READ = "notification.read"
