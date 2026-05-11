from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import SessionRecord, User
from notifications.services import notification_group_name


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = await self._authenticate()
        if self.user is None:
            await self.close(code=4401)
            return

        self.group_name = notification_group_name(self.user.id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", "")
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def notification_message(self, event):
        await self.send_json(event["payload"])

    async def _authenticate(self):
        query_string = self.scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [""])[0]
        if not token:
            return None

        try:
            access_token = AccessToken(token)
        except (InvalidToken, TokenError):
            return None

        session_key = access_token.get("sid")
        user_id = access_token.get("user_id")
        if not session_key or not user_id:
            return None

        return await self._get_authenticated_user(user_id, session_key)

    @database_sync_to_async
    def _get_authenticated_user(self, user_id, session_key):
        try:
            session = SessionRecord.objects.select_related("user").get(
                session_key=session_key,
                user_id=user_id,
            )
        except SessionRecord.DoesNotExist:
            return None

        if not session.is_active:
            return None

        user = session.user
        if not isinstance(user, User) or not user.is_active:
            return None
        return user
