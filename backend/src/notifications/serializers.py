from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Notification, Recipient

User = get_user_model()


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
        read_only_fields = ["id", "created_at", "user"]


class RecipientSerializer(serializers.ModelSerializer):
    recipient = serializers.EmailField(write_only=True)
    display_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="recipient.email", read_only=True)

    class Meta:
        model = Recipient
        fields = [
            "id",
            "user",
            "recipient",
            "display_name",
            "email",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "display_name", "email", "user"]

    def get_display_name(self, obj):
        return (
            obj.recipient.display_name
            or f"{obj.recipient.first_name} {obj.recipient.last_name}".strip()
            or obj.recipient.email
        )

    def validate_recipient(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        recipient = User.objects.filter(email__iexact=value).first()
        if not recipient:
            raise serializers.ValidationError("No user was found with that email address.")
        if user and recipient.pk == user.pk:
            raise serializers.ValidationError("You cannot add yourself as a recipient.")
        if user and Recipient.objects.filter(user=user, recipient=recipient).exists():
            raise serializers.ValidationError("This recipient is already saved.")
        return value

    def create(self, validated_data):
        recipient_email = validated_data.pop("recipient")
        validated_data["recipient"] = User.objects.get(email__iexact=recipient_email)
        return super().create(validated_data)


class RecipientListQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True, max_length=255)


class RecipientCandidateSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "display_name", "email"]

    def get_display_name(self, obj):
        return obj.display_name or f"{obj.first_name} {obj.last_name}".strip() or obj.email
