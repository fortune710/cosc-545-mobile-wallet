from rest_framework import viewsets, permissions, pagination
from .models import Notification, Recipient
from .serializers import NotificationSerializer, RecipientSerializer
from audit.logger import log_event
from audit.events import RecipientEvent


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RecipientViewSet(viewsets.ModelViewSet):
    serializer_class = RecipientSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Recipient.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        recipient = serializer.save(user=self.request.user)
        log_event(
            RecipientEvent.RECIPIENT_ADDED, 
            "SUCCESS", 
            user=self.request.user, 
            request=self.request,
            metadata={"recipient_id": recipient.id}
        )

    def perform_destroy(self, instance):
        log_event(
            RecipientEvent.RECIPIENT_REMOVED, 
            "SUCCESS", 
            user=self.request.user, 
            request=self.request,
            metadata={"recipient_id": instance.id}
        )
        instance.delete()
