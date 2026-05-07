from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
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
)
from django.contrib.auth.hashers import make_password, check_password
from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError, AuthenticationFailed
from django.contrib.auth import get_user_model
from audit.logger import log_event
from audit.events import AccountEvent, WalletEvent
from pydantic import ValidationError as PydanticValidationError
from accounts.schemas import (
    RegisterRequest,
    LogoutRequest,
    BalanceIncrementRequest,
    PinSetRequest,
    PinCheckRequest,
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

    def get_object(self):
        return self.request.user


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

    @extend_schema(responses={status.HTTP_200_OK: BalanceResponseSerializer})
    def get(self, request, *args, **kwargs):
        serializer = BalanceResponseSerializer({"balance": request.user.balance})
        # Always log balance views as per guidelines
        log_event(WalletEvent.BALANCE_VIEWED, "SUCCESS", user=request.user, request=request)
        return Response(serializer.data)

    @extend_schema(request=BalanceIncrementSerializer, responses={status.HTTP_200_OK: BalanceResponseSerializer})
    def post(self, request, *args, **kwargs):
        try:
            pydantic_data = BalanceIncrementRequest(**request.data)
        except PydanticValidationError as e:
            raise ValidationError(e.errors())

        amount = pydantic_data.amount
        user = request.user

        with transaction.atomic():
            # Use select_for_update to avoid race conditions
            locked_user = type(user).objects.select_for_update().get(pk=user.pk)
            locked_user.balance = F('balance') + amount
            locked_user.save(update_fields=['balance'])
            # reload since F expressions don't evaluate locally
            locked_user.refresh_from_db(fields=['balance'])

            # Log audit trail inside the transaction to ensure atomic results
            log_event(
                WalletEvent.BALANCE_CREDITED, 
                "SUCCESS", 
                user=user, 
                request=request, 
                metadata={"amount": float(amount), "new_balance": float(locked_user.balance)}
            )

        res_serializer = BalanceResponseSerializer({"balance": locked_user.balance})
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
