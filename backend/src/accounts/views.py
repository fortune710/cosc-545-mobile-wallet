from audit.schemas import AuditStatus
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.serializers import (
    AuthTokenSerializer,
    LogoutSerializer,
    RegisterResponseSerializer,
    RegisterSerializer,
    UserSerializer,
    BalanceIncrementSerializer,
    BalanceResponseSerializer,
    PinSetSerializer,
    PinCheckSerializer,
    PinHasResponseSerializer,
    ProfileUpdateSerializer,
    VerificationSendResponseSerializer,
    OtpCheckSerializer,
)
from accounts.email import send_verification_email
from django.contrib.auth.hashers import make_password, check_password
from django.db import IntegrityError, transaction
from django.core.cache import cache
from django.db.models import F
from rest_framework.exceptions import ValidationError, AuthenticationFailed
from django.contrib.auth import get_user_model
from audit.logger import log_event
from audit.events import AccountEvent, WalletEvent
from pydantic import ValidationError as PydanticValidationError
import secrets
from datetime import timedelta

from django.utils import timezone
from accounts.schemas import (
    RegisterRequest,
    LogoutRequest,
    ChangePasswordRequest,
    BalanceIncrementRequest,
    PinSetRequest,
    PinCheckRequest,
    OtpCheckRequest,
    ProfileUpdateRequest,
)

User = get_user_model()


class RegisterView(GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    @extend_schema(
        responses={status.HTTP_202_ACCEPTED: RegisterResponseSerializer},
    )
    def post(self, request, *args, **kwargs):
        try:
            pydantic_data = RegisterRequest(**request.data)
        except PydanticValidationError as e:
            log_event(
                AccountEvent.REGISTER_FAILED, 
                "FAILED", 
                request=request, 
                metadata={"email": request.data.get("email"), "error": str(e)}
            )
            raise ValidationError(e.errors())

        serializer = self.get_serializer(data=pydantic_data.model_dump())
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_event(AccountEvent.REGISTER, "SUCCESS", user=user, request=request)

        return Response(
            {
                "detail": (
                    "If the account can be created, the next verification step will be sent "
                    "to the provided email address."
                )
            },
            status=status.HTTP_202_ACCEPTED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = AuthTokenSerializer

    def post(self, request, *args, **kwargs):
        try:
            # SimpleJWT serializer handles authentication and token generation
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Extract user from serializer to avoid redundant DB lookup
            user = serializer.user
            log_event(AccountEvent.LOGIN, "SUCCESS", user=user, request=request)
            
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
            
        except (ValidationError, AuthenticationFailed) as e:
            log_event(
                AccountEvent.LOGIN_FAILED, 
                "FAILED", 
                request=request, 
                metadata={"email": request.data.get("email"), "error": str(e)}
            )
            raise


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class MeView(RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "profile_update"

    def get_object(self):
        return self.request.user

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses={status.HTTP_200_OK: UserSerializer, status.HTTP_400_BAD_REQUEST: None},
    )
    def patch(self, request, *args, **kwargs):
        try:
            pydantic_data = ProfileUpdateRequest(**request.data)
        except PydanticValidationError as e:
            log_event(
                AccountEvent.PROFILE_UPDATED,
                AuditStatus.FAILED,
                user=request.user,
                request=request,
                metadata={"error": "validation_failed", "fields": list(request.data.keys())},
            )
            raise ValidationError(e.errors())

        update_data = pydantic_data.model_dump(exclude_unset=True)
        if not update_data:
            return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

        user = request.user
        email_changed = "email" in update_data and update_data["email"] != user.email

        with transaction.atomic():
            for field, value in update_data.items():
                setattr(user, field, value)

            update_fields = list(update_data.keys())
            if email_changed:
                user.email_verified_at = None
                update_fields.append("email_verified_at")

            try:
                user.save(update_fields=update_fields)
            except IntegrityError:
                log_event(
                    AccountEvent.PROFILE_UPDATED,
                    AuditStatus.FAILED,
                    user=user,
                    request=request,
                    metadata={"error": "integrity_error", "fields": list(update_data.keys())},
                )
                return Response(
                    {"detail": "Could not update profile due to a conflict."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            log_event(
                AccountEvent.PROFILE_UPDATED,
                "SUCCESS",
                user=user,
                request=request,
                metadata={"fields": list(update_data.keys()), "email_changed": email_changed},
            )

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=LogoutSerializer, responses={status.HTTP_205_RESET_CONTENT: None})
    def post(self, request, *args, **kwargs):
        try:
            pydantic_data = LogoutRequest(**request.data)
        except PydanticValidationError as e:
            raise ValidationError(e.errors())

        serializer = LogoutSerializer(data=pydantic_data.model_dump())
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
            log_event(AccountEvent.LOGOUT, "SUCCESS", user=request.user, request=request)
        except TokenError:
            return Response(
                {"detail": "The provided token is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_205_RESET_CONTENT)


class BalanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "transactions"

    @extend_schema(responses={status.HTTP_200_OK: BalanceResponseSerializer})
    def get(self, request, *args, **kwargs):
        serializer = BalanceResponseSerializer({"balance": request.user.balance})
        return Response(serializer.data)

    @extend_schema(request=BalanceIncrementSerializer, responses={status.HTTP_200_OK: BalanceResponseSerializer})
    def post(self, request, *args, **kwargs):
        # 1. Idempotency Check
        idempotency_key = request.headers.get("X-Idempotency-Key")
        if not idempotency_key:
            log_event(
                WalletEvent.BALANCE_CREDITED, 
                AuditStatus.FAILED, 
                user=request.user, 
                request=request, 
                metadata={"error": "X-Idempotency-Key header is required"}
            )
            raise ValidationError("X-Idempotency-Key header is required")
        
        cache_key = f"idempotency_bal_{request.user.id}_{idempotency_key}"
        cached_response = cache.get(cache_key)
        if cached_response:
            return Response(cached_response, status=status.HTTP_200_OK)

        # 2. Validation
        try:
            pydantic_data = BalanceIncrementRequest(**request.data)
        except PydanticValidationError as e:
            raise ValidationError(e.errors())

        amount = pydantic_data.amount
        user = request.user

        # 3. Execution & Logging
        with transaction.atomic():
            # Use select_for_update to avoid race conditions
            locked_user = type(user).objects.select_for_update().get(pk=user.pk)
            locked_user.balance = F('balance') + amount
            locked_user.save(update_fields=['balance'])
            # reload since F expressions don't evaluate locally
            locked_user.refresh_from_db(fields=['balance'])

            # Log audit trail inside the transaction to ensure atomic results
            # Logging happens ONLY after all verifications (auth, pydantic, idempotency)
            log_event(
                WalletEvent.BALANCE_CREDITED, 
                "SUCCESS", 
                user=user, 
                request=request, 
                metadata={"amount": int(amount), "new_balance": int(locked_user.balance)}
            )

        res_data = {"balance": locked_user.balance}
        
        # 4. Cache for Idempotency
        if idempotency_key:
            cache.set(cache_key, res_data, timeout=3600)

        res_serializer = BalanceResponseSerializer(res_data)
        return Response(res_serializer.data)


class PinSetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=PinSetSerializer, responses={status.HTTP_200_OK: None})
    def post(self, request, *args, **kwargs):
        try:
            pydantic_data = PinSetRequest(**request.data)
        except PydanticValidationError as e:
            raise ValidationError(e.errors())

        pin = pydantic_data.pin
        request.user.pin = make_password(pin)
        request.user.save(update_fields=["pin"])

        log_event(AccountEvent.PIN_SET, "SUCCESS", user=request.user, request=request)

        return Response({"detail": "PIN set successfully."}, status=status.HTTP_200_OK)


class PinCheckView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={status.HTTP_200_OK: PinHasResponseSerializer})
    def get(self, request, *args, **kwargs):
        has_pin = bool(request.user.pin)
        serializer = PinHasResponseSerializer({"has_pin": has_pin})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=PinCheckSerializer, responses={status.HTTP_200_OK: None, status.HTTP_400_BAD_REQUEST: None})
    def post(self, request, *args, **kwargs):
        try:
            pydantic_data = PinCheckRequest(**request.data)
        except PydanticValidationError as e:
            raise ValidationError(e.errors())

        pin = pydantic_data.pin
        if not request.user.pin:
            return Response({"detail": "PIN is not set."}, status=status.HTTP_400_BAD_REQUEST)

        if check_password(pin, request.user.pin):
            log_event(AccountEvent.PIN_CHECK_OK, "SUCCESS", user=request.user, request=request)
            return Response({"detail": "PIN is valid."}, status=status.HTTP_200_OK)
        else:
            log_event(AccountEvent.PIN_CHECK_FAILED, "FAILED", user=request.user, request=request)
            return Response({"detail": "Invalid PIN."}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_change"

    @extend_schema(
        request={"application/json": {"type": "object", "properties": {
            "current_password": {"type": "string"},
            "new_password": {"type": "string"},
        }, "required": ["current_password", "new_password"]}},
        responses={status.HTTP_200_OK: None, status.HTTP_400_BAD_REQUEST: None},
    )
    def post(self, request, *args, **kwargs):
        # 1. Pydantic validation (includes new_password complexity)
        try:
            pydantic_data = ChangePasswordRequest(**request.data)
        except PydanticValidationError as e:
            raise ValidationError(e.errors())

        user = request.user

        # 2. Verify current password against stored hash
        if not check_password(pydantic_data.current_password, user.password):
            log_event(
                AccountEvent.PASSWORD_CHANGE_FAILED,
                "FAILED",
                user=user,
                request=request,
                metadata={"reason": "incorrect_current_password"},
            )
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Reject if new password is the same as the current one
        if check_password(pydantic_data.new_password, user.password):
            log_event(
                AccountEvent.PASSWORD_CHANGE_FAILED,
                "FAILED",
                user=user,
                request=request,
                metadata={"reason": "new_password_same_as_old"},
            )
            return Response(
                {"detail": "New password must differ from the current password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 4. Apply the new password
        user.set_password(pydantic_data.new_password)
        user.save(update_fields=["password"])

        log_event(AccountEvent.PASSWORD_CHANGE_OK, "SUCCESS", user=user, request=request)
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


class EmailVerificationSendView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_verify_send"

    @extend_schema(
        request=None,
        responses={status.HTTP_202_ACCEPTED: VerificationSendResponseSerializer},
    )
    def post(self, request, *args, **kwargs):
        user = request.user
        otp = f"{secrets.randbelow(10000):04d}"
        with transaction.atomic():
            locked_user = type(user).objects.select_for_update().get(pk=user.pk)
            locked_user.otp_hash = make_password(otp)
            locked_user.otp_expires_at = timezone.now() + timedelta(minutes=15)
            locked_user.save(update_fields=["otp_hash", "otp_expires_at"])

        send_verification_email(user, otp)
        log_event(AccountEvent.EMAIL_VERIFY_SENT, "SUCCESS", user=user, request=request)
        return Response(
            {"detail": "If the account requires verification, an email has been dispatched."},
            status=status.HTTP_202_ACCEPTED,
        )


class OtpCheckView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_check"

    @extend_schema(
        request=OtpCheckSerializer,
        responses={status.HTTP_200_OK: None, status.HTTP_400_BAD_REQUEST: None},
    )
    def post(self, request, *args, **kwargs):
        try:
            pydantic_data = OtpCheckRequest(**request.data)
        except PydanticValidationError as e:
            raise ValidationError(e.errors())

        user = request.user

        if not user.otp_hash:
            log_event(AccountEvent.OTP_VERIFY_FAILED, "FAILED", user=user, request=request,
                      metadata={"reason": "no_otp_set"})
            return Response({"detail": "No OTP has been issued."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.otp_expires_at or timezone.now() > user.otp_expires_at:
            log_event(AccountEvent.OTP_VERIFY_FAILED, "FAILED", user=user, request=request,
                      metadata={"reason": "otp_expired"})
            return Response({"detail": "OTP has expired."}, status=status.HTTP_400_BAD_REQUEST)

        if not check_password(pydantic_data.otp, user.otp_hash):
            log_event(AccountEvent.OTP_VERIFY_FAILED, "FAILED", user=user, request=request,
                      metadata={"reason": "invalid_otp"})
            return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            locked_user = type(user).objects.select_for_update().get(pk=user.pk)
            locked_user.otp_hash = None
            locked_user.otp_expires_at = None
            locked_user.save(update_fields=["otp_hash", "otp_expires_at"])

        log_event(AccountEvent.OTP_VERIFIED, "SUCCESS", user=user, request=request)
        return Response({"detail": "OTP verified successfully."}, status=status.HTTP_200_OK)
