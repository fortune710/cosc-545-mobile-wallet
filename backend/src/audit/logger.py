from .models import AuditEvent
from django.db import transaction


def get_client_ip(request):
    """Utility to get client IP from request."""
    if not request:
        return None
    # For security, we only trust REMOTE_ADDR unless behind a known proxy.
    return request.META.get('REMOTE_ADDR')


def log_event(
    event_type: str,
    status: str,
    user=None,
    metadata: dict = None,
    request=None,
    device_id: str = None,
):
    ip = None
    session_id = None
    
    if request:
        ip = get_client_ip(request)
        session_id = request.META.get('HTTP_X_SESSION_ID')
        device_id = device_id or request.META.get('HTTP_X_DEVICE_ID')
        if user is None and hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user

    # Ensure metadata is dict
    metadata = metadata or {}

    # actor_id is the string representation of user.id to persist past deletion
    # We fallback to email or 'anonymous' if user is not available
    raw_actor_id = str(user.id) if user else str(metadata.get('email') or 'anonymous')
    actor_id = raw_actor_id[:50]

    event = AuditEvent(
        user=user,
        actor_id=actor_id,
        session_id=session_id,
        ip_address=ip,
        device_id=device_id,
        event_type=event_type,
        status=status,
        metadata=metadata,
    )
    
    with transaction.atomic():
        # The first save provides an ID and triggers auto_now_add on timestamp
        event.save()
        
        # Compute signature with the stable timestamp
        event.signature = event.compute_signature()
        event.save(update_fields=['signature'])
    
    return event
