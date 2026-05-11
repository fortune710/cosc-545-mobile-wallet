from rest_framework.permissions import BasePermission

from accounts.models import User


class IsVerifiedMfaAuthenticated(BasePermission):
    message = "A verified account with MFA is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.email_verified_at
            and user.mfa_enabled
        )


class IsAdminOrSupport(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role in {User.Role.SUPPORT, User.Role.ADMIN}
        )


class IsAdminUserRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == User.Role.ADMIN)
