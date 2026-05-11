from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import pagination, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsVerifiedMfaAuthenticated
from .models import Notification, Recipient
from .serializers import (
    NotificationSerializer,
    RecipientCandidateSerializer,
    RecipientListQuerySerializer,
    RecipientSerializer,
)
from audit.logger import log_event
from audit.events import NotificationEvent, RecipientEvent

User = get_user_model()


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsVerifiedMfaAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        count = response.data.get("count", len(response.data)) if isinstance(response.data, dict) else len(response.data)
        log_event(NotificationEvent.NOTIFICATION_LIST_VIEWED, "SUCCESS", user=request.user, request=request, metadata={"count": count})
        return response

class RecipientViewSet(viewsets.ModelViewSet):
    serializer_class = RecipientSerializer
    permission_classes = [IsVerifiedMfaAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Recipient.objects.filter(user=self.request.user).select_related("recipient")
        query_serializer = RecipientListQuerySerializer(data={"q": self.request.query_params.get("q", "")})
        query_serializer.is_valid(raise_exception=True)
        query = query_serializer.validated_data.get("q", "").strip()
        if not query:
            return queryset
        return queryset.filter(
            Q(recipient__email__icontains=query)
            | Q(recipient__display_name__icontains=query)
            | Q(recipient__first_name__icontains=query)
            | Q(recipient__last_name__icontains=query)
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        count = response.data.get("count", len(response.data)) if isinstance(response.data, dict) else len(response.data)
        log_event(RecipientEvent.RECIPIENT_LIST_VIEWED, "SUCCESS", user=request.user, request=request, metadata={"count": count})
        return response

    @action(detail=False, methods=["get"], url_path="search-users")
    def search_users(self, request):
        query_serializer = RecipientListQuerySerializer(data={"q": request.query_params.get("q", "")})
        query_serializer.is_valid(raise_exception=True)
        query = query_serializer.validated_data.get("q", "").strip()
        if not query:
            log_event(RecipientEvent.RECIPIENT_SEARCH_PERFORMED, "SUCCESS", user=request.user, request=request, metadata={"result": "empty_query"})
            return Response([])
        users = (
            User.objects.filter(is_active=True, email_verified_at__isnull=False, mfa_enabled=True)
            .exclude(pk=request.user.pk)
            .filter(
                Q(email__icontains=query)
                | Q(display_name__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
            )
            .order_by("display_name", "email")[:10]
        )
        serializer = RecipientCandidateSerializer(users, many=True)
        log_event(RecipientEvent.RECIPIENT_SEARCH_PERFORMED, "SUCCESS", user=request.user, request=request, metadata={"count": len(users), "user_search_query_length": len(query)})
        return Response(serializer.data)

    def perform_create(self, serializer):
        recipient = serializer.save(user=self.request.user)
        log_event(
            RecipientEvent.RECIPIENT_ADDED, 
            "SUCCESS", 
            user=self.request.user, 
            request=self.request,
            metadata={"recipient_id": str(recipient.id)}
        )

    def perform_destroy(self, instance):
        recipient_id = instance.id
        instance.delete()
        log_event(
            RecipientEvent.RECIPIENT_REMOVED, 
            "SUCCESS", 
            user=self.request.user, 
            request=self.request,
            metadata={"recipient_id": str(recipient_id)}
        )
