from rest_framework import serializers
from .models import Notification, Recipient
from accounts.serializers import UserSerializer


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "body",
            "type",
            "user",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RecipientSerializer(serializers.ModelSerializer):
    recipient_details = UserSerializer(source="recipient", read_only=True)

    class Meta:
        model = Recipient
        fields = [
            "id",
            "user",
            "recipient",
            "recipient_details",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "recipient_details"]
