from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "first_name",
        "last_name",
        "display_name",
        "role_label",
        "is_staff",
        "is_active",
        "mfa_enabled",
    )
    search_fields = ("email", "display_name", "first_name", "last_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("first_name", "last_name", "display_name", "phone_number", "role")}),
        (
            "Address",
            {
                "fields": (
                    "address_line_1",
                    "address_line_2",
                    "city",
                    "state",
                    "postal_code",
                    "country",
                )
            },
        ),
        (
            "Security",
            {
                "fields": (
                    "email_verified_at",
                    "registration_ip",
                    "last_login_ip",
                    "mfa_enabled",
                    "failed_login_attempts",
                    "mfa_locked_until",
                    "locked_until",
                    "last_failed_login_at",
                    "device_fingerprint",
                    "mfa_totp_seed",
                    "mfa_enrollment_token",
                )
            },
        ),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "display_name",
                    "phone_number",
                    "password1",
                    "password2",
                    "role",
                ),
            },
        ),
    )

    @admin.display(description="Role")
    def role_label(self, obj):
        return obj.get_role_display()
