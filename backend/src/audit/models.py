import hashlib
import hmac
import json
from django.db import models
from django.conf import settings


class AuditEvent(models.Model):
    # --- Who ---
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        db_index=True
    )
    actor_id = models.CharField(max_length=100)
    session_id = models.CharField(max_length=255, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True)
    device_id = models.CharField(max_length=255, null=True, blank=True)

    # --- What ---
    event_type = models.CharField(max_length=100, db_index=True)
    status = models.CharField(max_length=20)
    metadata = models.JSONField(default=dict)

    # --- When ---
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # --- Integrity ---
    signature = models.CharField(max_length=64)

    class Meta:
        db_table = "audit_events"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["event_type", "status"]),
        ]

    def _canonical_payload(self):
        # We need a stable string representation
        return json.dumps({
            'actor_id': self.actor_id,
            'event_type': self.event_type,
            'status': self.status,
            'metadata': self.metadata,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ip_address': self.ip_address,
            'device_id': self.device_id,
        }, sort_keys=True)

    def compute_signature(self):
        secret = getattr(settings, 'AUDIT_HMAC_SECRET', None)
        if not secret:
            secret = getattr(settings, 'SECRET_KEY', 'fallback')
            
        return hmac.new(
            secret.encode(),
            self._canonical_payload().encode(),
            hashlib.sha256
        ).hexdigest()

    def verify(self):
        expected = self.compute_signature()
        return hmac.compare_digest(expected, self.signature)
