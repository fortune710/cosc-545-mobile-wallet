from django.db import models
from django.conf import settings
from core.models import BaseModel


class NotificationType(models.TextChoices):
    SECURITY = "security", "Security"
    PAYMENT_SENT = "payment_sent", "Payment Sent"
    PAYMENT_RECEIVED = "payment_received", "Payment Received"
    SYSTEM = "system", "System"


class Notification(BaseModel):
    title = models.CharField(max_length=255)
    body = models.TextField()
    type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"{self.title} ({self.user.email})"


class Recipient(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_recipients",
        db_index=True,
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_as_recipient",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "recipients"
        ordering = ["-created_at"]
        unique_together = ("user", "recipient")
        verbose_name = "Recipient"
        verbose_name_plural = "Recipients"

    def __str__(self):
        return f"{self.user.email} -> {self.recipient.email}"
