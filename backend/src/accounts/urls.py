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
]
