import uuid

from django.db import models
from django.conf import settings
from notifications.constants import EmailProviders, EmailRequestStatus, EmailStatus
from core.models import BaseModel
from django.contrib.postgres.fields import ArrayField


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


class RequestLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    datetime_created = models.DateTimeField(auto_now_add=True)
    datetime_updated = models.DateTimeField(auto_now=True)
    archived = models.BooleanField(default=False)
    url = models.URLField(editable=False)
    method = models.CharField(max_length=5, editable=False)
    params = models.JSONField(blank=True, editable=False)
    post_data = models.JSONField(blank=True, editable=False)
    status = models.IntegerField(editable=False)
    response = models.TextField(blank=True, editable=False)
    external_id = models.CharField(blank=True, max_length=255)

    def __str__(self):
        return f"RequestLog: {self.id}"


class EmailRequest(models.Model):
    """Model that represents an EmailRequest."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    datetime_created = models.DateTimeField(auto_now_add=True)
    datetime_updated = models.DateTimeField(auto_now=True)
    archived = models.BooleanField(default=False)

    provider = models.IntegerField(choices=EmailProviders.choices, null=True)

    to_recipients = ArrayField(base_field=models.EmailField())
    cc_recipients = ArrayField(base_field=models.EmailField(), blank=True, null=True)
    bcc_recipients = ArrayField(base_field=models.EmailField(), blank=True, null=True)

    subject = models.CharField(max_length=200, blank=True)
    sender_name = models.CharField(max_length=200, blank=True)
    from_email = models.EmailField(blank=True)
    text_content = models.TextField(blank=True)
    html_content = models.TextField(blank=True)

    status = models.IntegerField(
        choices=EmailRequestStatus.choices, default=EmailRequestStatus.PENDING
    )

    template_id = models.CharField(max_length=40, blank=True)
    template_unique_data = models.JSONField(null=True)
    template_global_data = models.JSONField(null=True)

    api_responses = models.ManyToManyField(to=RequestLog, blank=True)

    def __str__(self):
        """
        Unicode representation for an EmailRequest model.

        :return: string
        """
        return f"Email Request: {self.id} - {self.created_datetime}"

    @property
    def all_recipients(self):
        """Get all recipients"""
        return self.to_recipients + (self.cc_recipients or []) + (self.bcc_recipients or [])


class Email(models.Model):
    """Model that represents an Email."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    datetime_created = models.DateTimeField(auto_now_add=True)
    datetime_updated = models.DateTimeField(auto_now=True)
    archived = models.BooleanField(default=False)

    request = models.ForeignKey(
        to=EmailRequest, on_delete=models.PROTECT, related_name="email_request_set"
    )
    recipient = models.EmailField()
    status = models.IntegerField(choices=EmailStatus.choices, default=EmailStatus.PENDING)
    external_id = models.CharField(max_length=100, blank=True, db_index=True)

    delivery_date = models.DateTimeField(null=True)
    opened_date = models.DateTimeField(null=True)

    def __str__(self):
        """
        Unicode representation for an Email model.

        :return: string
        """
        return f"Email: {self.id} - {self.get_status_display()}"
