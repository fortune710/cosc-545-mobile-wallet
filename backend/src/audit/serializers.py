from rest_framework import serializers
from .models import AuditEvent
from .events import AccountEvent, WalletEvent, RecipientEvent, NotificationEvent


AUDIT_EVENT_CHOICES = sorted(
    {
        value
        for event_group in (AccountEvent, WalletEvent, RecipientEvent, NotificationEvent)
        for key, value in event_group.__dict__.items()
        if not key.startswith("_") and isinstance(value, str)
    }
)

class AuditEventSerializer(serializers.ModelSerializer):
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = AuditEvent
        fields = [
            "id", "user", "actor_id", "session_id", "ip_address", "device_id",
            "event_type", "status", "metadata", "timestamp", "is_valid"
        ]
        read_only_fields = fields

    def get_is_valid(self, obj):
        return obj.verify()


class AuditEventFilterSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(required=False)
    event_type = serializers.ChoiceField(required=False, choices=AUDIT_EVENT_CHOICES)
    status = serializers.ChoiceField(required=False, choices=["SUCCESS", "FAILED"])
