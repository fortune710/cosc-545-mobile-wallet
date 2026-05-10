from django.conf import settings
import os
from postmark import ServerClient
from dotenv import load_dotenv

load_dotenv()


class EmailService:
    def __init__(self):
        self.client = ServerClient(os.getenv("POSTMARK_API_TOKEN"))

    async def send_email(self, to_email, subject, text_content):
        async with self.client as client:
            response = await client.outbound.send({
                "sender": getattr(settings, "SENDER_EMAIL", "contact@fortunealebiosu.dev"),
                "to": to_email,
                "subject": subject,
                "text_body": text_content,
            })
            return response