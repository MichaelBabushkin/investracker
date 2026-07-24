"""
Object storage for uploaded report PDFs (Cloudflare R2, S3-compatible).

Design:
  - Fully optional: if R2 env vars are unset, `is_configured()` returns False
    and callers fall back to storing bytes in Postgres (legacy behavior).
  - boto3 is imported lazily inside the client factory so it never loads at
    app startup (keeps the web process lean, same discipline as the price stack).
  - The S3 client is cached per-process after first use.

Object keys are namespaced per user: ``reports/<user_id>/<uuid>_<filename>``.
"""
import logging
import re
import uuid
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_client = None  # cached boto3 S3 client


def is_configured() -> bool:
    """True when all R2 credentials are present."""
    return bool(
        settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_BUCKET
    )


def _get_client():
    global _client
    if _client is None:
        import boto3
        from botocore.config import Config

        endpoint = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        _client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            # R2 requires signature v4; 'auto' region is the R2 convention
            config=Config(signature_version="s3v4", region_name="auto"),
        )
    return _client


def _safe_filename(name: str) -> str:
    """Strip characters that don't belong in an object key."""
    return re.sub(r"[^A-Za-z0-9._-]", "_", name or "report.pdf")


def build_key(user_id: str, filename: str) -> str:
    return f"reports/{user_id}/{uuid.uuid4().hex}_{_safe_filename(filename)}"


def upload_pdf(user_id: str, filename: str, data: bytes) -> str:
    """Upload PDF bytes and return the stored object key. Raises on failure."""
    key = build_key(user_id, filename)
    _get_client().put_object(
        Bucket=settings.R2_BUCKET,
        Key=key,
        Body=data,
        ContentType="application/pdf",
    )
    logger.info(f"Uploaded report to R2: {key} ({len(data)} bytes)")
    return key


def download_pdf(key: str) -> bytes:
    """Fetch PDF bytes for an object key."""
    obj = _get_client().get_object(Bucket=settings.R2_BUCKET, Key=key)
    return obj["Body"].read()


def delete_pdf(key: str) -> None:
    """Best-effort delete; logs but does not raise."""
    try:
        _get_client().delete_object(Bucket=settings.R2_BUCKET, Key=key)
    except Exception as e:
        logger.warning(f"Failed to delete R2 object {key}: {e}")
