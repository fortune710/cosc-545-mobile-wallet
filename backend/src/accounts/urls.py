from django.urls import path

from accounts.views import (
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
    BalanceView,
    PinSetView,
    PinCheckView,
    ChangePasswordView,
    EmailVerificationSendView,
    OtpCheckView,
    MfaEnrollView,
    MfaVerifyView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("balance/", BalanceView.as_view(), name="auth-balance"),
    path("pin/", PinSetView.as_view(), name="auth-pin-set"),
    path("pin/check/", PinCheckView.as_view(), name="auth-pin-check"),
    path("password/", ChangePasswordView.as_view(), name="auth-password-change"),
    path("verify/", EmailVerificationSendView.as_view(), name="auth-verify-send"),
    path("otp/check/", OtpCheckView.as_view(), name="auth-otp-check"),
    path("mfa/enroll/", MfaEnrollView.as_view(), name="auth-mfa-enroll"),
    path("mfa/verify/", MfaVerifyView.as_view(), name="auth-mfa-verify"),
]
