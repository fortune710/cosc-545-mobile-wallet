import uuid

from django.db import models
from simple_history.models import HistoricalRecords


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid7, editable=False)
    datetime_created = models.DateTimeField(auto_now_add=True)
    datetime_updated = models.DateTimeField(auto_now=True)
    archived = models.BooleanField(default=False)
    history = HistoricalRecords(inherit=True)

    class Meta:
        abstract = True
