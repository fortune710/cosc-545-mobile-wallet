from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


User = get_user_model()


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class UserSerializer(serializers.ModelSerializer):
    email_verified = serializers.SerializerMethodField()
    mfa_required = serializers.SerializerMethodField()
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "display_name",
            "phone_number",
            "role",
            "role_label",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            "registration_ip",
            "last_login_ip",
            "email_verified",
            "mfa_enabled",
            "mfa_required",
        )
        read_only_fields = fields

    @extend_schema_field(serializers.BooleanField)
    def get_email_verified(self, obj):
        return bool(obj.email_verified_at)

    @extend_schema_field(serializers.BooleanField)
    def get_mfa_required(self, obj):
        return not obj.mfa_enabled


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(validators=[])
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = (
            "email",
            "password",
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
        )
        extra_kwargs = {
            "first_name": {"required": False, "allow_blank": True},
            "last_name": {"required": False, "allow_blank": True},
            "display_name": {"required": False, "allow_blank": True},
            "phone_number": {"required": False, "allow_blank": True},
            "address_line_1": {"required": False, "allow_blank": True},
            "address_line_2": {"required": False, "allow_blank": True},
            "city": {"required": False, "allow_blank": True},
            "state": {"required": False, "allow_blank": True},
            "postal_code": {"required": False, "allow_blank": True},
            "country": {"required": False, "allow_blank": True},
        }

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        request = self.context.get("request")
        registration_ip = get_client_ip(request) if request else None

        try:
            with transaction.atomic():
                return User.objects.create_user(
                    password=password,
                    registration_ip=registration_ip,
                    **validated_data,
                )
        except IntegrityError:
            return User.objects.filter(email__iexact=validated_data["email"]).first()


class RegisterResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class AuthTokenSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["mfa_enabled"] = user.mfa_enabled
        return token

    def validate(self, attrs):
        credentials = {
            self.username_field: attrs.get(self.username_field),
            "password": attrs.get("password"),
        }
        data = super().validate(credentials)
        request = self.context.get("request")
        last_login_ip = get_client_ip(request) if request else None
        if last_login_ip and self.user.last_login_ip != last_login_ip:
            self.user.last_login_ip = last_login_ip
            self.user.save(update_fields=["last_login_ip"])
        data["user"] = UserSerializer(self.user).data
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class BalanceIncrementSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)


class BalanceResponseSerializer(serializers.Serializer):
    balance = serializers.IntegerField(read_only=True)


class PinSetSerializer(serializers.Serializer):
    pin = serializers.CharField(min_length=4, max_length=4)

    def validate_pin(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("PIN must be exactly 4 digits.")
        return value


class PinCheckSerializer(serializers.Serializer):
    pin = serializers.CharField()
