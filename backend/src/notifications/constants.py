from django.db.models import IntegerChoices


class EmailProviders(IntegerChoices):
    DJANGO = 0, "Django"
    MAILTRAP = 1, "Mailtrap"


class EmailRequestStatus(IntegerChoices):
    PENDING = 0, "Pending"
    FAILED = 1, "Failed"
    SUCCESS = 2, "Success"


class EmailStatus(IntegerChoices):
    PENDING = 0, "Pending"
    FAILED = 1, "Failed"
    SENT = 2, "Sent"
    OPENED = 3, "Opened"
    OTHER = 4, "Other"


SECURITY_NOTIFICATION_TYPE = "security"
EMAIL_REQUEST_LOG_URL = "https://email-backend.local/send"
EMAIL_REQUEST_LOG_METHOD = "POST"
CONSOLE_EMAIL_REQUEST_LOG_URL = "http://console.local/send"
MAILTRAP_EMAIL_REQUEST_LOG_URL = "https://send.api.mailtrap.io/api/send"
EMAIL_SUCCESS_STATUS_CODE = 200
EMAIL_FAILURE_STATUS_CODE = 500
MAILTRAP_TIMEOUT_SECONDS = 10

NOTIFICATION_SOCKET_PATH = "/ws/notifications/"

VERIFICATION_EMAIL_SUBJECT = "Confirm your SecureWallet email"
VERIFICATION_EMAIL_TEMPLATE = "notifications/emails/verify_email.html"
APP_NAME = "SecureWallet"
VERIFICATION_EXPIRY_HOURS = 24

SECURITY_TITLE_NEW_LOCATION = "New login location"
SECURITY_BODY_NEW_LOCATION = "We detected a login from a new location: {ip_address}."
SECURITY_TITLE_NEW_DEVICE = "New login device"
SECURITY_BODY_NEW_DEVICE = "We detected a login from a new device: {device_id}."
SECURITY_TITLE_FAILED_LOGINS = "Multiple failed login attempts"
SECURITY_BODY_FAILED_LOGINS = "We detected {attempts} failed login attempts on your account."
SECURITY_TITLE_FIRST_TIME_LARGE_TXN = "Large transaction to a first-time recipient"
SECURITY_BODY_FIRST_TIME_LARGE_TXN = "You sent ${amount:.2f} to {recipient}."
SECURITY_TITLE_HIGH_FREQUENCY = "High transaction activity"
SECURITY_BODY_HIGH_FREQUENCY = "We detected more than 5 transactions in a 10-minute window."

NOTIFICATION_TITLE_PAYMENT_SENT = "Payment sent"
NOTIFICATION_BODY_PAYMENT_SENT = "You sent ${amount:.2f} to {recipient}."
NOTIFICATION_TITLE_PAYMENT_RECEIVED = "Payment received"
NOTIFICATION_BODY_PAYMENT_RECEIVED = "You received ${amount:.2f} from {sender}."
NOTIFICATION_TITLE_REQUEST_RECEIVED = "Payment request received"
NOTIFICATION_BODY_REQUEST_RECEIVED = "{requester} requested ${amount:.2f}."
NOTIFICATION_TITLE_REQUEST_CREATED = "Payment request created"
NOTIFICATION_BODY_REQUEST_CREATED = "Your request to {target_user} is pending."
NOTIFICATION_TITLE_REQUEST_EXPIRED = "Payment request expired"
NOTIFICATION_BODY_REQUEST_EXPIRED = "A payment request expired without action."
NOTIFICATION_TITLE_REQUEST_APPROVED = "Payment request approved"
NOTIFICATION_BODY_REQUEST_APPROVED = "{target_user} approved your request."
NOTIFICATION_TITLE_REQUEST_DECLINED = "Payment request declined"
NOTIFICATION_BODY_REQUEST_DECLINED = "{target_user} declined your request."
