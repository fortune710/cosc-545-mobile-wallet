from django.urls import path

from accounts.views import (
    LoginStartView,
    LoginVerifyMfaView,
    LogoutView,
    MeView,
    MfaEnrollView,
    MfaVerifyView,
    RecipientDetailView,
    RecipientListCreateView,
    RegenerateRecoveryCodesView,
    RegisterView,
    ResendVerificationView,
    SessionRefreshView,
    UserSearchView,
    VerifyEmailView,
)

auth_urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("verify-email/resend/", ResendVerificationView.as_view(), name="auth-verify-email-resend"),
    path("login/start/", LoginStartView.as_view(), name="auth-login-start"),
    path("login/verify-mfa/", LoginVerifyMfaView.as_view(), name="auth-login-verify-mfa"),
    path("session/refresh/", SessionRefreshView.as_view(), name="auth-session-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("mfa/enroll/", MfaEnrollView.as_view(), name="auth-mfa-enroll"),
    path("mfa/verify/", MfaVerifyView.as_view(), name="auth-mfa-verify"),
    path("mfa/recovery-codes/regenerate/", RegenerateRecoveryCodesView.as_view(), name="auth-mfa-recovery-regenerate"),
]

recipient_urlpatterns = [
    path("recipients/", RecipientListCreateView.as_view(), name="recipient-list-create"),
    path("recipients/<uuid:pk>/", RecipientDetailView.as_view(), name="recipient-detail"),
    path("recipients/search-users/", UserSearchView.as_view(), name="recipient-search-users"),
]

urlpatterns = auth_urlpatterns
