
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
    display_name = serializers.CharField(source="recipient.display_name", read_only=True)
    email = serializers.EmailField(source="recipient.email", read_only=True)

    class Meta:
        model = Recipient
        fields = [
            "id",
            "user",
            "display_name",
            "email",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "display_name", "email"]
