from ipware import get_client_ip as ipware_get_client_ip
from rest_framework.throttling import SimpleRateThrottle


class LoginIPThrottle(SimpleRateThrottle):
    """Rate limit login attempts by client IP address (20/hour)."""
    scope = "login_ip"

    def get_cache_key(self, request, view):
        ip, _ = ipware_get_client_ip(request)
        ident = ip or request.META.get("REMOTE_ADDR", "unknown")
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginFingerprintThrottle(SimpleRateThrottle):
    """Rate limit login attempts by device fingerprint header (20/hour).

    Blocks attackers who rotate IPs but use the same browser/device.
    If no fingerprint is present, this throttle is skipped and only
    LoginIPThrottle applies.
    """
    scope = "login_fingerprint"

    def get_cache_key(self, request, view):
        fingerprint = request.headers.get("X-DEVICE-ID", "").strip()
        if not fingerprint or fingerprint == "unknown-device":
            return None
        return self.cache_format % {"scope": self.scope, "ident": fingerprint}
