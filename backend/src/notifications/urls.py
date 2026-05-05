from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, RecipientViewSet

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"recipients", RecipientViewSet, basename="recipient")

urlpatterns = [
    path("", include(router.urls)),
]
