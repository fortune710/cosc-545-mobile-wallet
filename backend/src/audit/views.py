from rest_framework import viewsets, pagination
from accounts.permissions import IsAdminUserRole
from .models import AuditEvent
from .serializers import AuditEventSerializer, AuditEventFilterSerializer

class AuditPagination(pagination.PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000

class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for administrators to inspect audit logs.
    """
    queryset = AuditEvent.objects.all().order_by('-timestamp')
    serializer_class = AuditEventSerializer
    permission_classes = [IsAdminUserRole]
    pagination_class = AuditPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        serializer = AuditEventFilterSerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data.get("user_id")
        event_type = serializer.validated_data.get("event_type")
        status = serializer.validated_data.get("status")
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset
