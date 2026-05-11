from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication

from accounts.models import SessionRecord


class SessionJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        session_key = validated_token.get("sid")
        if not session_key:
            raise exceptions.AuthenticationFailed("Invalid session.", code="invalid_session")

        try:
            session = SessionRecord.objects.select_related("user").get(
                session_key=session_key,
                user=user,
            )
        except SessionRecord.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("Invalid session.", code="invalid_session") from exc

        if not session.is_active:
            raise exceptions.AuthenticationFailed("Session expired.", code="session_expired")

        validated_token["session_record_id"] = str(session.id)
        return user
