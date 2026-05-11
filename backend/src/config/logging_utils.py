from __future__ import annotations

import json
import logging
from collections.abc import Mapping, Sequence
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from uuid import UUID


SENSITIVE_FIELD_MARKERS = {
    "address",
    "amount",
    "api_key",
    "authorization",
    "balance",
    "city",
    "code",
    "country",
    "credit",
    "cvv",
    "device_fingerprint",
    "email",
    "ip",
    "last_name",
    "line_1",
    "line_2",
    "mfa",
    "otp",
    "password",
    "phone",
    "pin",
    "postal",
    "secret",
    "session",
    "ssn",
    "state",
    "street",
    "token",
}
ALLOWED_AUDIT_METADATA_FIELDS = {
    "action",
    "count",
    "detail",
    "endpoint",
    "error",
    "failure_reason",
    "fields",
    "flow_purpose",
    "intent_id",
    "is_mfa_enabled",
    "last_sequence_number",
    "mfa_method",
    "outcome",
    "page",
    "page_size",
    "payment_intent_id",
    "payment_request_id",
    "purpose",
    "recipient_id",
    "reason",
    "request_id",
    "result",
    "status_code",
    "transaction_count",
    "transaction_id",
    "user_search_query_length",
    "wallet_id",
}
RESERVED_LOG_RECORD_FIELDS = {
    "args",
    "asctime",
    "created",
    "exc_info",
    "exc_text",
    "filename",
    "funcName",
    "levelname",
    "levelno",
    "lineno",
    "module",
    "msecs",
    "message",
    "msg",
    "name",
    "pathname",
    "process",
    "processName",
    "relativeCreated",
    "stack_info",
    "thread",
    "threadName",
}


def _normalize_key(value: object) -> str:
    return str(value).strip().lower().replace("-", "_").replace(".", "_")


def should_redact_key(key: object) -> bool:
    normalized = _normalize_key(key)
    return any(marker in normalized for marker in SENSITIVE_FIELD_MARKERS)


def sanitize_for_log(value: object) -> object:
    if isinstance(value, Mapping):
        sanitized: dict[str, object] = {}
        for key, item in value.items():
            key_text = str(key)
            if should_redact_key(key_text):
                sanitized[key_text] = "[REDACTED]"
                continue
            sanitized[key_text] = sanitize_for_log(item)
        return sanitized

    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [sanitize_for_log(item) for item in value]

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, (Decimal, UUID, Path)):
        return str(value)

    return value


def sanitize_audit_metadata(metadata: Mapping[str, object] | None) -> dict[str, object]:
    if not metadata:
        return {}

    sanitized: dict[str, object] = {}
    for key, value in metadata.items():
        normalized = _normalize_key(key)
        if normalized not in ALLOWED_AUDIT_METADATA_FIELDS:
            continue
        if should_redact_key(normalized):
            sanitized[str(key)] = "[REDACTED]"
            continue
        sanitized[str(key)] = sanitize_for_log(value)
    return sanitized


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.utcnow().isoformat(timespec="milliseconds") + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": getattr(record, "service", "securewallet-backend"),
            "environment": getattr(record, "environment", "development"),
            "source": getattr(record, "source", "securewallet"),
        }

        subsystem = getattr(record, "subsystem", None)
        if subsystem:
            payload["subsystem"] = subsystem

        dataset = getattr(record, "event_dataset", None)
        if dataset:
            payload["event.dataset"] = dataset

        event_kind = getattr(record, "event_kind", None)
        if event_kind:
            payload["event.kind"] = event_kind

        for key, value in record.__dict__.items():
            if key in RESERVED_LOG_RECORD_FIELDS or key.startswith("_"):
                continue
            payload[key] = sanitize_for_log(value)

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str, separators=(",", ":"), sort_keys=True)
