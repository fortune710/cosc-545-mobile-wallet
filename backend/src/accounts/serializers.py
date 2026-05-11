from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from accounts.models import Recipient

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    email_verified = serializers.SerializerMethodField()
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "phone_number",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            "role",
            "role_label",
            "email_verified",
            "mfa_enabled",
        )
        read_only_fields = fields

    def get_email_verified(self, obj):
        return bool(obj.email_verified_at)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=12, trim_whitespace=False)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=32)
    address_line_1 = serializers.CharField(required=False, allow_blank=True, max_length=255)
    address_line_2 = serializers.CharField(required=False, allow_blank=True, max_length=255)
    city = serializers.CharField(required=False, allow_blank=True, max_length=120)
    state = serializers.CharField(required=False, allow_blank=True, max_length=120)
    postal_code = serializers.CharField(required=False, allow_blank=True, max_length=32)
    country = serializers.CharField(required=False, allow_blank=True, max_length=2)

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value


class GenericDetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class LoginStartSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class LoginStartResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    flow_token = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    mfa_required = serializers.BooleanField(required=False)
    mfa_setup_required = serializers.BooleanField(required=False)
    email_verification_required = serializers.BooleanField(required=False)


class LoginVerifyMfaSerializer(serializers.Serializer):
    flow_token = serializers.CharField()
    mfa_code = serializers.CharField(required=False, allow_blank=True)
    recovery_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("mfa_code") and not attrs.get("recovery_code"):
            raise serializers.ValidationError("Either mfa_code or recovery_code is required.")
        return attrs


class AuthResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    recovery_codes = serializers.ListField(child=serializers.CharField(), required=False)
    user = UserSerializer()


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class RefreshResponseSerializer(serializers.Serializer):
    access = serializers.CharField()


class MfaEnrollResponseSerializer(serializers.Serializer):
    provisioning_url = serializers.CharField()
    secret = serializers.CharField()
    mfa_enabled = serializers.BooleanField()


class RegenerateRecoveryCodesResponseSerializer(serializers.Serializer):
    recovery_codes = serializers.ListField(child=serializers.CharField())


class RecipientSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="contact.display_name", read_only=True)
    email = serializers.CharField(source="contact.email", read_only=True)
    created_at = serializers.DateTimeField(source="datetime_created", read_only=True)

    class Meta:
        model = Recipient
        fields = ["id", "display_name", "email", "created_at"]
        read_only_fields = fields


class UserSearchSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "display_name", "email"]
        read_only_fields = fields

    def get_display_name(self, obj):
        return obj.display_name or f"{obj.first_name} {obj.last_name}".strip() or obj.email


class ProfileUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=32)
    address_line_1 = serializers.CharField(required=False, allow_blank=True, max_length=255)
    address_line_2 = serializers.CharField(required=False, allow_blank=True, max_length=255)
    city = serializers.CharField(required=False, allow_blank=True, max_length=120)
    state = serializers.CharField(required=False, allow_blank=True, max_length=120)
    postal_code = serializers.CharField(required=False, allow_blank=True, max_length=32)
    country = serializers.CharField(required=False, allow_blank=True, max_length=2)
