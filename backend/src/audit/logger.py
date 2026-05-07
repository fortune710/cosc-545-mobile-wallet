from django.contrib.auth import get_user_model
from .models import AuditEvent


def get_client_ip(request):
    """Utility to get client IP from request."""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


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
    actor_id = str(user.id) if user else metadata.get('email', 'anonymous')

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
    # The first save provides an ID and triggers auto_now_add on timestamp
    event.save()
    
    # Compute signature with the stable timestamp
    event.signature = event.compute_signature()
    event.save(update_fields=['signature'])
    
    return event
