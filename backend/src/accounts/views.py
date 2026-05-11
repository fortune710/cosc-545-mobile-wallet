from datetime import timedelta

import pyotp
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.db import models, transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AuthFlowToken, EmailVerificationToken, SessionRecord
from accounts.permissions import IsVerifiedMfaAuthenticated
from accounts.models import Recipient
from accounts.serializers import (
    AuthResponseSerializer,
    GenericDetailSerializer,
    LoginStartResponseSerializer,
    LoginStartSerializer,
    LoginVerifyMfaSerializer,
    LogoutSerializer,
    MfaEnrollResponseSerializer,
    ProfileUpdateSerializer,
    RecipientSerializer,
    RefreshResponseSerializer,
    RefreshSerializer,
    RegisterSerializer,
    RegenerateRecoveryCodesResponseSerializer,
    ResendVerificationSerializer,
    UserSearchSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from accounts.services import (
    build_session_tokens,
    consume_recovery_code,
    invalidate_session,
    issue_auth_flow_token,
    issue_email_verification,
    issue_recovery_codes,
    mark_email_verified,
)
from audit.events import AccountEvent
from audit.logger import log_event
from notifications.utils import notify_failed_login_attempts, notify_new_device, notify_new_location


User = get_user_model()
LOCKOUT_WINDOW = timedelta(minutes=15)
LOCKOUT_DURATION = timedelta(minutes=30)


def get_client_ip(request):
    return request.META.get("REMOTE_ADDR")


def register_failed_login(user: User):
    now = timezone.now()
    if user.last_failed_login_at and user.last_failed_login_at < (now - LOCKOUT_WINDOW):
        user.failed_login_attempts = 0
    user.failed_login_attempts += 1
    user.last_failed_login_at = now
    if user.failed_login_attempts >= 5:
        user.locked_until = now + LOCKOUT_DURATION
    user.save(update_fields=["failed_login_attempts", "last_failed_login_at", "locked_until"])
    return user.failed_login_attempts


def reset_failed_logins(user: User):
    user.failed_login_attempts = 0
    user.last_failed_login_at = None
    user.locked_until = None
    user.save(update_fields=["failed_login_attempts", "last_failed_login_at", "locked_until"])


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=RegisterSerializer, responses={status.HTTP_202_ACCEPTED: GenericDetailSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        user = User.objects.filter(email=email).first()
        if not user:
            user = User.objects.create_user(
                email=email,
                password=serializer.validated_data["password"],
                first_name=serializer.validated_data.get("first_name", ""),
                last_name=serializer.validated_data.get("last_name", ""),
                display_name=serializer.validated_data.get("display_name", ""),
                phone_number=serializer.validated_data.get("phone_number", ""),
                address_line_1=serializer.validated_data.get("address_line_1", ""),
                address_line_2=serializer.validated_data.get("address_line_2", ""),
                city=serializer.validated_data.get("city", ""),
                state=serializer.validated_data.get("state", ""),
                postal_code=serializer.validated_data.get("postal_code", ""),
                country=serializer.validated_data.get("country", ""),
                is_active=False,
            )
            issue_email_verification(user)
            log_event(AccountEvent.REGISTER, "SUCCESS", user=user, request=request)
        elif not user.email_verified_at:
            issue_email_verification(user)
        return Response(
            {"detail": "If this email can be registered, verification instructions will be sent shortly."},
            status=status.HTTP_202_ACCEPTED,
        )


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=VerifyEmailSerializer, responses={status.HTTP_200_OK: GenericDetailSerializer})
    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = EmailVerificationToken.objects.filter(token=serializer.validated_data["token"]).select_related("user").first()
        if not token or not token.is_usable:
            return Response({"detail": "Verification token is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        user = mark_email_verified(token)
        log_event(AccountEvent.EMAIL_VERIFY_CONFIRMED, "SUCCESS", user=user, request=request)
        return Response({"detail": "Email verified successfully."})


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=ResendVerificationSerializer, responses={status.HTTP_202_ACCEPTED: GenericDetailSerializer})
    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        user = User.objects.filter(email=email, email_verified_at__isnull=True).first()
        if user:
            issue_email_verification(user)
            log_event(AccountEvent.EMAIL_VERIFY_SENT, "SUCCESS", user=user, request=request)
        return Response(
            {"detail": "If this account needs verification, new instructions will be sent shortly."},
            status=status.HTTP_202_ACCEPTED,
        )


class LoginStartView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=LoginStartSerializer, responses={status.HTTP_200_OK: LoginStartResponseSerializer})
    def post(self, request):
        serializer = LoginStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        password = serializer.validated_data["password"]
        user = User.objects.filter(email=email).first()
        generic_response = Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user or not check_password(password, user.password):
            if user:
                attempts = register_failed_login(user)
                if attempts >= 3:
                    notify_failed_login_attempts(user, attempts)
            log_event(AccountEvent.LOGIN_FAILED, "FAILED", request=request, metadata={"result": "invalid_credentials"})
            return generic_response

        if user.is_locked:
            log_event(AccountEvent.LOGIN_FAILED, "FAILED", user=user, request=request, metadata={"result": "locked"})
            return Response({"detail": "Account is temporarily locked."}, status=status.HTTP_403_FORBIDDEN)

        if not user.email_verified_at:
            issue_email_verification(user)
            return Response(
                {
                    "detail": "Email verification is required before you can finish signing in.",
                    "email": user.email,
                    "email_verification_required": True,
                }
            )

        if not user.mfa_enabled:
            flow = issue_auth_flow_token(user, AuthFlowToken.Purpose.MFA_SETUP)
            return Response(
                {
                    "detail": "MFA setup is required.",
                    "flow_token": flow.token,
                    "mfa_setup_required": True,
                }
            )

        flow = issue_auth_flow_token(user, AuthFlowToken.Purpose.MFA_LOGIN)
        return Response({"detail": "MFA verification required.", "flow_token": flow.token, "mfa_required": True})


class LoginVerifyMfaView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=LoginVerifyMfaSerializer, responses={status.HTTP_200_OK: AuthResponseSerializer})
    def post(self, request):
        serializer = LoginVerifyMfaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        flow = AuthFlowToken.objects.filter(token=serializer.validated_data["flow_token"]).select_related("user").first()
        if not flow or not flow.is_usable:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        user = flow.user
        if user.is_locked:
            return Response({"detail": "Account is temporarily locked."}, status=status.HTTP_403_FORBIDDEN)

        mfa_code = serializer.validated_data.get("mfa_code", "")
        recovery_code = serializer.validated_data.get("recovery_code", "")
        verified = False
        if mfa_code and user.mfa_totp_seed:
            verified = pyotp.TOTP(user.mfa_totp_seed).verify(mfa_code, valid_window=1)
        elif recovery_code and user.mfa_enabled:
            verified = consume_recovery_code(user, recovery_code)

        if not verified:
            attempts = register_failed_login(user)
            flow.failed_attempts += 1
            flow.save(update_fields=["failed_attempts"])
            if attempts >= 3:
                notify_failed_login_attempts(user, attempts)
            log_event(AccountEvent.MFA_VERIFY_FAILED, "FAILED", user=user, request=request)
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        recovery_codes = None
        with transaction.atomic():
            flow.used_at = timezone.now()
            flow.save(update_fields=["used_at"])
            if flow.purpose == AuthFlowToken.Purpose.MFA_SETUP:
                user.mfa_enabled = True
                user.save(update_fields=["mfa_enabled"])
                recovery_codes = issue_recovery_codes(user)
                log_event(AccountEvent.MFA_VERIFIED, "SUCCESS", user=user, request=request)

        device_id = request.headers.get("X-DEVICE-ID", "")
        current_ip = get_client_ip(request)
        if user.device_fingerprint and user.device_fingerprint != device_id:
            notify_new_device(user, device_id)
        if user.last_login_ip and user.last_login_ip != current_ip:
            notify_new_location(user, current_ip)

        user.device_fingerprint = device_id
        user.last_login_ip = current_ip
        user.save(update_fields=["device_fingerprint", "last_login_ip"])
        reset_failed_logins(user)
        session, access, refresh = build_session_tokens(
            user=user,
            device_id=device_id,
            ip_address=current_ip,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        log_event(AccountEvent.LOGIN, "SUCCESS", user=user, request=request, metadata={"session_id": session.session_key})
        response = {"access": access, "refresh": refresh, "user": UserSerializer(user).data}
        if recovery_codes:
            response["recovery_codes"] = recovery_codes
        return Response(response)


class SessionRefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=RefreshSerializer, responses={status.HTTP_200_OK: RefreshResponseSerializer})
    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refresh = RefreshToken(serializer.validated_data["refresh"])
            refresh.check_blacklist()
            session_key = refresh.get("sid")
            if not session_key:
                raise TokenError("Invalid session.")
            session = SessionRecord.objects.filter(session_key=session_key).first()
            if not session or not session.is_active:
                raise TokenError("Session expired.")
            access = refresh.access_token
            access["sid"] = session_key
            access["role"] = refresh.get("role")
            access["mfa_verified"] = True
        except TokenError:
            return Response({"detail": "The provided token is invalid or expired."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({"access": str(access)})


class LogoutView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    @extend_schema(request=LogoutSerializer, responses={status.HTTP_205_RESET_CONTENT: None})
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refresh = RefreshToken(serializer.validated_data["refresh"])
            refresh.blacklist()
            session_key = refresh.get("sid") or request.auth.get("sid")
            if session_key:
                invalidate_session(session_key)
            log_event(AccountEvent.LOGOUT, "SUCCESS", user=request.user, request=request)
        except TokenError:
            return Response({"detail": "The provided token is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    @extend_schema(responses={status.HTTP_200_OK: UserSerializer})
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(request=ProfileUpdateSerializer, responses={status.HTTP_200_OK: UserSerializer})
    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if not serializer.validated_data:
            return Response(UserSerializer(request.user).data)

        user = request.user
        changed_fields = []
        for field, value in serializer.validated_data.items():
            if getattr(user, field) != value:
                setattr(user, field, value)
                changed_fields.append(field)

        if not changed_fields:
            return Response(UserSerializer(user).data)

        if "email" in changed_fields:
            user.email_verified_at = None
            user.is_active = False
            changed_fields.extend(["email_verified_at", "is_active"])

        user.save(update_fields=list(dict.fromkeys(changed_fields)))

        if "email" in serializer.validated_data:
            issue_email_verification(user)

        log_event(
            AccountEvent.PROFILE_UPDATED,
            "SUCCESS",
            user=user,
            request=request,
            metadata={"fields": changed_fields},
        )
        return Response(UserSerializer(user).data)


class MfaEnrollView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={status.HTTP_200_OK: MfaEnrollResponseSerializer})
    def post(self, request):
        flow_token = request.headers.get("X-MFA-TOKEN")
        user = None
        if flow_token:
            flow = AuthFlowToken.objects.filter(
                token=flow_token,
                purpose=AuthFlowToken.Purpose.MFA_SETUP,
            ).select_related("user").first()
            if flow and flow.is_usable:
                user = flow.user
        elif request.user.is_authenticated:
            user = request.user

        if not user:
            return Response({"detail": "Invalid setup token."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.mfa_totp_seed:
            user.mfa_totp_seed = pyotp.random_base32()
            user.save(update_fields=["mfa_totp_seed"])
            log_event(AccountEvent.MFA_ENROLLED, "SUCCESS", user=user, request=request)
        totp = pyotp.TOTP(user.mfa_totp_seed)
        return Response(
            {
                "provisioning_url": totp.provisioning_uri(name=user.email, issuer_name="SecureWallet"),
                "secret": user.mfa_totp_seed,
                "mfa_enabled": user.mfa_enabled,
            }
        )


class MfaVerifyView(LoginVerifyMfaView):
    pass


class RegenerateRecoveryCodesView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    @extend_schema(responses={status.HTTP_200_OK: RegenerateRecoveryCodesResponseSerializer})
    def post(self, request):
        codes = issue_recovery_codes(request.user)
        log_event(AccountEvent.MFA_RECOVERY_REGENERATED, "SUCCESS", user=request.user, request=request)
        return Response({"recovery_codes": codes})


class RecipientListCreateView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    def get(self, request):
        qs = Recipient.objects.filter(owner=request.user).select_related("contact")
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                models.Q(contact__email__icontains=q)
                | models.Q(contact__display_name__icontains=q)
                | models.Q(contact__first_name__icontains=q)
                | models.Q(contact__last_name__icontains=q)
            )
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        start = (page - 1) * page_size
        total = qs.count()
        results = RecipientSerializer(qs[start : start + page_size], many=True).data
        return Response({"count": total, "results": results})

    def post(self, request):
        recipient_id = request.data.get("recipient")
        if not recipient_id:
            return Response({"detail": "recipient is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            contact = User.objects.get(pk=recipient_id)
        except (User.DoesNotExist, Exception):
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        if contact == request.user:
            return Response({"detail": "You cannot add yourself as a recipient."}, status=status.HTTP_400_BAD_REQUEST)
        recipient, created = Recipient.objects.get_or_create(owner=request.user, contact=contact)
        return Response(RecipientSerializer(recipient).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class RecipientDetailView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    def delete(self, request, pk):
        deleted, _ = Recipient.objects.filter(owner=request.user, pk=pk).delete()
        if not deleted:
            return Response({"detail": "Recipient not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserSearchView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response([])
        existing_contact_ids = Recipient.objects.filter(owner=request.user).values_list("contact_id", flat=True)
        users = (
            User.objects.filter(
                models.Q(email__icontains=q)
                | models.Q(display_name__icontains=q)
                | models.Q(first_name__icontains=q)
                | models.Q(last_name__icontains=q)
            )
            .exclude(pk=request.user.pk)
            .exclude(pk__in=existing_contact_ids)
            .filter(is_active=True)[:10]
        )
        return Response(UserSearchSerializer(users, many=True).data)
