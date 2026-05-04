from django.db import connection
from django.db.utils import OperationalError
from drf_spectacular.utils import OpenApiExample, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    @extend_schema(
        responses=inline_serializer(
            name="HealthCheckResponse",
            fields={
                "status": serializers.CharField(),
                "database": serializers.CharField(),
            },
        ),
        examples=[
            OpenApiExample(
                "Healthy response",
                value={"status": "ok", "database": "ok"},
            )
        ],
    )
    def get(self, request):
        database_status = "ok"

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except OperationalError:
            database_status = "unavailable"

        return Response(
            {
                "status": "ok",
                "database": database_status,
            }
        )
