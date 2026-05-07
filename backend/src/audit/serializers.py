from rest_framework import serializers
from .models import AuditEvent

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
