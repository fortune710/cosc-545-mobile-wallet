from django.contrib import admin

from notifications.models import Email, EmailRequest, Notification, Recipient, RequestLog


admin.site.register(Notification)
admin.site.register(Recipient)
admin.site.register(RequestLog)
admin.site.register(EmailRequest)
admin.site.register(Email)
