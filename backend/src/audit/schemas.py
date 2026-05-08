from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class AuditStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class AuditLogRequest(BaseModel):
    user_id: Optional[int] = Field(ge=1)
    event_type: Optional[str]
    status: Optional[AuditStatus]
    