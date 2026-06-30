import hashlib
import io
import logging
from datetime import UTC, datetime

from app.types import FileMetadataDetail
from app.types.formatting import humanize_bytes

logger = logging.getLogger(__name__)


def _extract_image_metadata(file_data: bytes) -> dict:
    """Pull width/height from an image. Used only by the bucket explorer's
    metadata panel — irrelevant to the moderation pipeline itself."""
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(file_data))
        return {
            "image_width": img.width,
            "image_height": img.height,
        }
    except Exception:
        logger.warning("Image metadata extraction failed", exc_info=True)
        return {}


def extract_metadata(
    file_data: bytes,
    filename: str,
    content_type: str,
) -> FileMetadataDetail:
    md5 = hashlib.md5(file_data, usedforsecurity=False).hexdigest()
    sha256 = hashlib.sha256(file_data).hexdigest()
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    extra: dict = {}
    if content_type.startswith("image/"):
        extra = _extract_image_metadata(file_data)

    return FileMetadataDetail(
        filename=filename,
        size_bytes=len(file_data),
        size_human=humanize_bytes(len(file_data)),
        mime_type=content_type,
        extension=extension,
        md5=md5,
        sha256=sha256,
        uploaded_at=datetime.now(UTC),
        **extra,
    )
