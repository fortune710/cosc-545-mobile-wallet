from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from accounts.urls import auth_urlpatterns, recipient_urlpatterns

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/auth/", include(auth_urlpatterns)),
    path("api/", include("notifications.urls")),
    path("api/", include(recipient_urlpatterns)),
    path("api/", include("wallet.urls")),
    path("api/", include("core.urls")),
    path("api/audit/", include("audit.urls")),
]
