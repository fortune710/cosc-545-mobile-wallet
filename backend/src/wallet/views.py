from decimal import Decimal
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminUserRole, IsVerifiedMfaAuthenticated
from audit.events import WalletEvent
from audit.logger import log_event
from notifications.utils import (
    notify_first_time_large_transaction,
    notify_high_frequency_transactions,
)
from wallet.constants import (
    FIRST_TIME_LARGE_TRANSACTION_THRESHOLD_CENTS,
    HIGH_FREQUENCY_TRANSACTION_THRESHOLD,
)
from wallet.models import PaymentIntent, PaymentRequest, SupervisoryApproval, Transaction
from wallet.serializers import (
    FundingSerializer,
    PaymentIntentCreateSerializer,
    PaymentIntentSerializer,
    PaymentRequestCreateSerializer,
    PaymentRequestSerializer,
    SupervisoryApprovalSerializer,
    TransactionQuerySerializer,
    TransactionSerializer,
    WalletBalanceSerializer,
)
from wallet.services import (
    approve_request,
    create_funding,
    create_payment_intent,
    create_payment_request,
    decline_request,
    expire_requests,
    has_prior_successful_payment,
    recent_successful_payment_count,
)

User = get_user_model()


class WalletBalanceView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    @extend_schema(responses=WalletBalanceSerializer)
    def get(self, request):
        wallet = request.user.wallet if hasattr(request.user, "wallet") else None
        if wallet is None:
            from wallet.services import ensure_wallet
            wallet = ensure_wallet(request.user)
        balance = wallet.balance
        log_event(WalletEvent.BALANCE_VIEWED, "SUCCESS", user=request.user, request=request)
        return Response({"balance": balance})


class WalletFundingView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    @extend_schema(request=FundingSerializer, responses=WalletBalanceSerializer)
    def post(self, request):
        serializer = FundingSerializer(data=request.data)
        if not serializer.is_valid():
            log_event(WalletEvent.BALANCE_CREDIT_FAILED, "FAILED", user=request.user, request=request, metadata={"error": "validation_error"})
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        amount = int(serializer.validated_data["amount"] * 100)
        try:
            wallet, txn = create_funding(request.user, amount)
        except ValueError as exc:
            log_event(WalletEvent.BALANCE_CREDIT_FAILED, "FAILED", user=request.user, request=request, metadata={"error": str(exc)})
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_event(WalletEvent.BALANCE_CREDITED, "SUCCESS", user=request.user, request=request, metadata={"transaction_id": str(txn.id)})
        return Response({"balance": wallet.balance}, status=status.HTTP_200_OK)


class PaymentIntentCreateView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    @extend_schema(request=PaymentIntentCreateSerializer, responses=PaymentIntentSerializer)
    def post(self, request):
        serializer = PaymentIntentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            log_event(WalletEvent.PAYMENT_INITIATION_FAILED, "FAILED", user=request.user, request=request, metadata={"error": "validation_error"})
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        header_key = request.headers.get("X-Idempotency-Key")
        if not header_key:
            log_event(WalletEvent.PAYMENT_INITIATION_FAILED, "FAILED", user=request.user, request=request, metadata={"result": "missing_idempotency_key"})
            return Response({"detail": "X-Idempotency-Key header is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            idempotency_key = UUID(header_key)
        except ValueError:
            log_event(WalletEvent.PAYMENT_INITIATION_FAILED, "FAILED", user=request.user, request=request, metadata={"result": "invalid_idempotency_key"})
            return Response({"detail": "X-Idempotency-Key must be a UUID v4."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            intent = create_payment_intent(
                sender=request.user,
                recipient_identifier=serializer.validated_data["recipient"],
                amount=int(serializer.validated_data["amount"] * 100),
                memo=serializer.validated_data.get("memo", ""),
                idempotency_key=idempotency_key,
            )
        except (User.DoesNotExist, ValueError) as exc:
            log_event(WalletEvent.PAYMENT_INITIATION_FAILED, "FAILED", user=request.user, request=request, metadata={"error": str(exc)})
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_event(WalletEvent.PAYMENT_INITIATED, "SUCCESS", user=request.user, request=request, metadata={"payment_intent_id": str(intent.id)})
        return Response(PaymentIntentSerializer(intent).data, status=status.HTTP_201_CREATED)


class PaymentIntentConfirmView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    def post(self, request, intent_id):
        intent = PaymentIntent.objects.filter(id=intent_id, sender=request.user).first()
        if not intent:
            if PaymentIntent.objects.filter(id=intent_id).exists():
                log_event(WalletEvent.PAYMENT_OWNER_MISMATCH, "FAILED", user=request.user, request=request, metadata={"intent_id": str(intent_id), "result": "wrong_owner"})
            log_event(WalletEvent.PAYMENT_CONFIRM_FAILED, "FAILED", user=request.user, request=request, metadata={"intent_id": str(intent_id), "result": "not_found"})
            return Response({"detail": "Payment intent not found."}, status=status.HTTP_404_NOT_FOUND)
        was_first_time = not has_prior_successful_payment(request.user, intent.recipient)
        from wallet.services import confirm_payment_intent
        try:
            confirmed_intent, sender_txn, recipient_txn, receipt = confirm_payment_intent(intent)
        except ValueError as exc:
            log_event(WalletEvent.PAYMENT_CONFIRM_FAILED, "FAILED", user=request.user, request=request, metadata={"payment_intent_id": str(intent.id), "error": str(exc)})
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_event(WalletEvent.PAYMENT_CONFIRMED, "SUCCESS", user=request.user, request=request, metadata={"payment_intent_id": str(intent.id), "transaction_id": str(sender_txn.id)})
        if was_first_time and abs(sender_txn.amount) > FIRST_TIME_LARGE_TRANSACTION_THRESHOLD_CENTS:
            notify_first_time_large_transaction(request.user, intent.recipient, abs(sender_txn.amount))
        if recent_successful_payment_count(request.user) > HIGH_FREQUENCY_TRANSACTION_THRESHOLD:
            notify_high_frequency_transactions(request.user)
        return Response(
            {
                "intent": PaymentIntentSerializer(confirmed_intent).data,
                "transaction_id": str(sender_txn.id),
                "receipt_id": str(receipt.id),
            }
        )


class PaymentRequestListCreateView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    @extend_schema(request=PaymentRequestCreateSerializer, responses=PaymentRequestSerializer)
    def post(self, request):
        serializer = PaymentRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            log_event(WalletEvent.PAYMENT_REQUEST_CREATE_FAILED, "FAILED", user=request.user, request=request, metadata={"error": "validation_error"})
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            payment_request = create_payment_request(
                requester=request.user,
                target_identifier=serializer.validated_data["target_user"],
                amount=int(serializer.validated_data["amount"] * 100),
                memo=serializer.validated_data.get("memo", ""),
            )
        except (User.DoesNotExist, ValueError) as exc:
            log_event(WalletEvent.PAYMENT_REQUEST_CREATE_FAILED, "FAILED", user=request.user, request=request, metadata={"error": str(exc)})
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_event(WalletEvent.PAYMENT_REQUEST_CREATED, "SUCCESS", user=request.user, request=request, metadata={"payment_request_id": str(payment_request.id)})
        return Response(PaymentRequestSerializer(payment_request).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        expire_requests()
        queryset = PaymentRequest.objects.filter(Q(requester=request.user) | Q(target_user=request.user)).order_by("-datetime_created")
        log_event(WalletEvent.PAYMENT_REQUEST_LIST_VIEWED, "SUCCESS", user=request.user, request=request, metadata={"count": queryset.count()})
        return Response(PaymentRequestSerializer(queryset, many=True).data)


class PaymentRequestApproveView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    def post(self, request, request_id):
        payment_request = PaymentRequest.objects.filter(id=request_id, target_user=request.user).first()
        if not payment_request:
            if PaymentRequest.objects.filter(id=request_id).exists():
                log_event(WalletEvent.PAYMENT_REQUEST_OWNER_MISMATCH, "FAILED", user=request.user, request=request, metadata={"payment_request_id": str(request_id), "result": "wrong_owner"})
            log_event(WalletEvent.PAYMENT_REQUEST_APPROVE_FAILED, "FAILED", user=request.user, request=request, metadata={"payment_request_id": str(request_id), "result": "not_found"})
            return Response({"detail": "Payment request not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            confirmed_intent, sender_txn, _recipient_txn = approve_request(payment_request)
        except ValueError as exc:
            log_event(WalletEvent.PAYMENT_REQUEST_APPROVE_FAILED, "FAILED", user=request.user, request=request, metadata={"payment_request_id": str(payment_request.id), "error": str(exc)})
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_event(WalletEvent.PAYMENT_REQUEST_APPROVED, "SUCCESS", user=request.user, request=request, metadata={"payment_request_id": str(payment_request.id), "transaction_id": str(sender_txn.id)})
        return Response({"payment_request_id": str(payment_request.id), "payment_intent_id": str(confirmed_intent.id)})


class PaymentRequestDeclineView(APIView):
    permission_classes = [IsVerifiedMfaAuthenticated]

    def post(self, request, request_id):
        payment_request = PaymentRequest.objects.filter(id=request_id, target_user=request.user).first()
        if not payment_request:
            if PaymentRequest.objects.filter(id=request_id).exists():
                log_event(WalletEvent.PAYMENT_REQUEST_OWNER_MISMATCH, "FAILED", user=request.user, request=request, metadata={"payment_request_id": str(request_id), "result": "wrong_owner"})
            log_event(WalletEvent.PAYMENT_REQUEST_DECLINE_FAILED, "FAILED", user=request.user, request=request, metadata={"payment_request_id": str(request_id), "result": "not_found"})
            return Response({"detail": "Payment request not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            declined = decline_request(payment_request)
        except ValueError as exc:
            log_event(WalletEvent.PAYMENT_REQUEST_DECLINE_FAILED, "FAILED", user=request.user, request=request, metadata={"payment_request_id": str(payment_request.id), "error": str(exc)})
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_event(WalletEvent.PAYMENT_REQUEST_DECLINED, "SUCCESS", user=request.user, request=request, metadata={"payment_request_id": str(payment_request.id)})
        return Response({"payment_request_id": str(declined.id), "status": declined.status})


class TransactionListView(ListAPIView):
    permission_classes = [IsVerifiedMfaAuthenticated]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        serializer = TransactionQuerySerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        queryset = Transaction.objects.filter(wallet__user=self.request.user).order_by("-effective_at", "-datetime_created")
        data = serializer.validated_data
        if data.get("date_from"):
            queryset = queryset.filter(effective_at__date__gte=data["date_from"])
        if data.get("date_to"):
            queryset = queryset.filter(effective_at__date__lte=data["date_to"])
        if data.get("transaction_type"):
            queryset = queryset.filter(transaction_type=data["transaction_type"])
        if data.get("amount_min") is not None:
            queryset = queryset.filter(amount__gte=int(data["amount_min"] * 100))
        if data.get("amount_max") is not None:
            queryset = queryset.filter(amount__lte=int(data["amount_max"] * 100))
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        log_event(WalletEvent.TRANSACTION_HISTORY_VIEWED, "SUCCESS", user=request.user, request=request, metadata={"transaction_count": queryset.count()})
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class SupervisoryApprovalListCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        queryset = SupervisoryApproval.objects.order_by("-datetime_created")
        log_event(WalletEvent.SUPERVISORY_APPROVAL_LIST_VIEWED, "SUCCESS", user=request.user, request=request, metadata={"count": queryset.count()})
        return Response(SupervisoryApprovalSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = SupervisoryApprovalSerializer(data=request.data)
        if not serializer.is_valid():
            log_event(WalletEvent.SUPERVISORY_APPROVAL_CREATED, "FAILED", user=request.user, request=request, metadata={"error": "validation_error"})
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        approval = serializer.save(approved_by=request.user)
        log_event(WalletEvent.SUPERVISORY_APPROVAL_CREATED, "SUCCESS", user=request.user, request=request)
        return Response(SupervisoryApprovalSerializer(approval).data, status=status.HTTP_201_CREATED)
