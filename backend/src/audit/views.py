from rest_framework import viewsets, permissions, pagination
from .models import AuditEvent
from .serializers import AuditEventSerializer

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
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AuditPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        event_type = self.request.query_params.get('event_type')
        status = self.request.query_params.get('status')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset
