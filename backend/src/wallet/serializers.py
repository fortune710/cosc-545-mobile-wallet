from decimal import Decimal
from uuid import UUID

from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from wallet.models import PaymentIntent, PaymentRequest, SupervisoryApproval, Transaction, Wallet
from wallet.services import decimal_to_cents

DEMO_CARD_NUMBER = "4242424242424242"
DEMO_CARDHOLDER_NAME = "SecureWallet Demo"
DEMO_EXPIRY_MONTH = "12"
DEMO_EXPIRY_YEAR = "34"
DEMO_CVV = "123"


class MoneyField(serializers.DecimalField):
    def __init__(self, **kwargs):
        super().__init__(max_digits=8, decimal_places=2, **kwargs)


class WalletBalanceSerializer(serializers.Serializer):
    balance = serializers.IntegerField(read_only=True)


class FundingSerializer(serializers.Serializer):
    amount = MoneyField(min_value=Decimal("1.00"), max_value=Decimal("500.00"))
    cardholder_name = serializers.CharField(max_length=100)
    card_number = serializers.CharField(max_length=24)
    expiry_month = serializers.RegexField(r"^\d{2}$")
    expiry_year = serializers.RegexField(r"^\d{2}$")
    cvv = serializers.RegexField(r"^\d{3}$")

    def validate_cardholder_name(self, value):
        cleaned = " ".join(value.split())
        if not cleaned:
            raise serializers.ValidationError("Cardholder name is required.")
        return cleaned

    def validate_card_number(self, value):
        digits = "".join(character for character in value if character.isdigit())
        if len(digits) != 16:
            raise serializers.ValidationError("Card number must contain 16 digits.")
        return digits

    def validate_expiry_month(self, value):
        if not 1 <= int(value) <= 12:
            raise serializers.ValidationError("Expiry month must be between 01 and 12.")
        return value

    def validate(self, attrs):
        if (
            attrs["cardholder_name"] != DEMO_CARDHOLDER_NAME
            or attrs["card_number"] != DEMO_CARD_NUMBER
            or attrs["expiry_month"] != DEMO_EXPIRY_MONTH
            or attrs["expiry_year"] != DEMO_EXPIRY_YEAR
            or attrs["cvv"] != DEMO_CVV
        ):
            raise serializers.ValidationError("Demo card declined. Use the provided test card.")
        return attrs


class PaymentIntentCreateSerializer(serializers.Serializer):
    recipient = serializers.CharField()
    amount = MoneyField(min_value=Decimal("0.01"), max_value=Decimal("50.00"))
    memo = serializers.CharField(required=False, allow_blank=True, max_length=100)


class PaymentIntentSerializer(serializers.ModelSerializer):
    amount = serializers.SerializerMethodField()

    class Meta:
        model = PaymentIntent
        fields = ["id", "recipient", "amount", "memo", "status", "confirmed_at"]
        read_only_fields = fields

    def get_amount(self, obj):
        return f"{obj.amount / 100:.2f}"


class PaymentRequestCreateSerializer(serializers.Serializer):
    target_user = serializers.CharField()
    amount = MoneyField(min_value=Decimal("0.01"), max_value=Decimal("50.00"))
    memo = serializers.CharField(required=False, allow_blank=True, max_length=100)


class PaymentRequestSerializer(serializers.ModelSerializer):
    amount = serializers.SerializerMethodField()

    class Meta:
        model = PaymentRequest
        fields = [
            "id",
            "requester",
            "target_user",
            "amount",
            "memo",
            "status",
            "expires_at",
            "resolved_at",
        ]
        read_only_fields = fields

    def get_amount(self, obj):
        return f"{obj.amount / 100:.2f}"


class TransactionSerializer(serializers.ModelSerializer):
    date_time_utc = serializers.DateTimeField(source="effective_at", read_only=True)
    type = serializers.CharField(source="transaction_type", read_only=True)
    counterparty_display_name = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "date_time_utc",
            "type",
            "counterparty_display_name",
            "amount",
            "memo",
            "status",
        ]
        read_only_fields = fields

    def get_counterparty_display_name(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not obj.counterparty_user:
            if obj.transaction_type == Transaction.Type.FUNDING:
                return "Card Funding"
            return ""
        if user and user.role == User.Role.USER:
            return obj.counterparty_user.display_name or obj.counterparty_user.email
        approval = SupervisoryApproval.objects.filter(
            support_agent=user,
            target_user=obj.wallet.user,
            can_view_sensitive_details=True,
            expires_at__gt=timezone.now(),
        ).exists()
        if approval or (user and user.role == User.Role.ADMIN):
            return obj.counterparty_user.display_name or obj.counterparty_user.email
        return "Restricted"

    def get_amount(self, obj):
        return f"{obj.amount / 100:.2f}"


class TransactionQuerySerializer(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    transaction_type = serializers.ChoiceField(choices=Transaction.Type.choices, required=False)
    amount_min = MoneyField(required=False)
    amount_max = MoneyField(required=False)


class SupervisoryApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupervisoryApproval
        fields = [
            "id",
            "support_agent",
            "approved_by",
            "target_user",
            "can_view_sensitive_details",
            "expires_at",
            "reason",
        ]
        read_only_fields = ["id", "approved_by"]
