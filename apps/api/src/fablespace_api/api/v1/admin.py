"""Single-administrator API for current StoryWorld content."""

from __future__ import annotations

import hashlib
import struct
from datetime import UTC
from pathlib import PurePath
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from pydantic import BaseModel

from ...content.story_world_codec import story_world_to_payload
from ...domain.story_world import StoryContentValidationError
from ...infrastructure.generated_storage import (
    GeneratedStorageError,
    S3AdminMediaStorage,
)
from ...infrastructure.managed_story_content_store import (
    ManagedMediaAssetStore,
    ManagedStoryWorldRecord,
    ManagedStoryWorldStore,
)
from .auth import SessionIdentity, require_story_session_identity


class StoryWorldSaveRequest(BaseModel):
    story_world: dict[str, Any]


def require_admin(request: Request, response: Response) -> SessionIdentity:
    identity = require_story_session_identity(request)
    if identity.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="当前账号不能访问内容后台",
            headers={"Cache-Control": "no-store"},
        )
    response.headers["Cache-Control"] = "no-store"
    return identity


router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


def _story_world_store(request: Request) -> ManagedStoryWorldStore:
    return request.app.state.managed_story_worlds


def _media_asset_store(request: Request) -> ManagedMediaAssetStore:
    return request.app.state.managed_media_assets


@router.get("/story-worlds")
def list_story_worlds(request: Request) -> dict[str, object]:
    records = _story_world_store(request).list_records()
    return {
        "story_worlds": [
            {
                "id": record.story_world.id,
                "title": record.story_world.title,
                "summary": record.story_world.summary,
                "genre": record.story_world.genre,
                "story_count": len(record.story_world.stories),
                "published_story_count": sum(
                    1
                    for story in record.story_world.stories
                    if story.publication_status == "published"
                ),
                "character_count": len(record.story_world.characters),
                "updated_at": _timestamp(record),
            }
            for record in records
        ]
    }


@router.get("/story-worlds/{story_world_id}")
def get_story_world(story_world_id: str, request: Request) -> dict[str, object]:
    record = _story_world_store(request).get_record(story_world_id)
    if record is None:
        raise HTTPException(status_code=404, detail="没有找到这个故事世界")
    return _record_payload(record)


@router.put("/story-worlds/{story_world_id}")
def save_story_world(
    story_world_id: str,
    payload: StoryWorldSaveRequest,
    request: Request,
) -> dict[str, object]:
    try:
        record = _story_world_store(request).save(
            story_world_id,
            payload.story_world,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="没有找到这个故事世界") from exc
    except StoryContentValidationError as exc:
        _raise_content_error(exc)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _record_payload(record)


@router.post(
    "/story-worlds/{story_world_id}/characters/{character_id}/portrait"
)
def upload_character_portrait(
    story_world_id: str,
    character_id: str,
    request: Request,
    image: UploadFile = File(...),
    source_note: str = Form(default="", max_length=500),
) -> dict[str, object]:
    media_storage = getattr(request.app.state, "admin_media_storage", None)
    if not isinstance(media_storage, S3AdminMediaStorage):
        raise HTTPException(status_code=503, detail="角色图片存储未配置")

    settings = request.app.state.settings
    max_bytes = max(1, min(int(settings.admin_media_max_bytes), 50 * 1024 * 1024))
    content = image.file.read(max_bytes + 1)
    if not content:
        raise HTTPException(status_code=422, detail="图片不能为空")
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail="图片超过上传大小限制")

    detected = _image_metadata(content)
    if detected is None:
        raise HTTPException(status_code=422, detail="只支持 PNG、JPEG 或 WebP 图片")
    mime_type, extension, width, height = detected
    declared_type = str(image.content_type or "").lower().strip()
    if declared_type == "image/jpg":
        declared_type = "image/jpeg"
    if declared_type != mime_type:
        raise HTTPException(status_code=422, detail="图片类型与文件内容不一致")

    store = _story_world_store(request)
    record = store.get_record(story_world_id)
    if record is None:
        raise HTTPException(status_code=404, detail="没有找到这个故事世界")
    document = story_world_to_payload(record.story_world)
    characters = document["characters"]
    character = next(
        (
            item
            for item in characters
            if isinstance(item, dict) and item.get("id") == character_id
        ),
        None,
    )
    if character is None:
        raise HTTPException(status_code=404, detail="没有找到这个角色")

    try:
        object_key, url = media_storage.publish(content, mime_type, extension)
    except GeneratedStorageError as exc:
        raise HTTPException(status_code=503, detail="角色图片上传失败") from exc

    filename = PurePath(
        str(image.filename or "").replace("\\", "/")
    ).name
    provenance = source_note.strip() or (
        f"管理员上传：{filename}" if filename else "管理员上传"
    )
    asset = _media_asset_store(request).record(
        object_key=object_key,
        url=url,
        content=content,
        sha256=hashlib.sha256(content).hexdigest(),
        mime_type=mime_type,
        width=width,
        height=height,
        source_note=provenance,
    )
    character["portrait_url"] = url
    try:
        updated_record = store.save(story_world_id, document)
    except (ValueError, StoryContentValidationError) as exc:
        if isinstance(exc, StoryContentValidationError):
            _raise_content_error(exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        **_record_payload(updated_record),
        "asset": {
            "id": asset.id,
            "object_key": asset.object_key,
            "url": asset.url,
            "byte_count": asset.byte_count,
            "sha256": asset.sha256,
            "mime_type": asset.mime_type,
            "width": asset.width,
            "height": asset.height,
            "source_type": asset.source_type,
            "source_note": asset.source_note,
            "created_at": asset.created_at.replace(tzinfo=UTC).isoformat(),
        },
    }


def _record_payload(record: ManagedStoryWorldRecord) -> dict[str, object]:
    return {
        "story_world": story_world_to_payload(record.story_world),
        "updated_at": _timestamp(record),
    }


def _timestamp(record: ManagedStoryWorldRecord) -> str:
    return record.updated_at.replace(tzinfo=UTC).isoformat()


def _raise_content_error(exc: StoryContentValidationError) -> None:
    raise HTTPException(
        status_code=422,
        detail=f"{exc.path}：{exc.message}",
    ) from exc


def _image_metadata(
    content: bytes,
) -> tuple[str, str, int, int] | None:
    png = _png_size(content)
    if png is not None:
        return "image/png", "png", *png
    jpeg = _jpeg_size(content)
    if jpeg is not None:
        return "image/jpeg", "jpg", *jpeg
    webp = _webp_size(content)
    if webp is not None:
        return "image/webp", "webp", *webp
    return None


def _png_size(content: bytes) -> tuple[int, int] | None:
    if (
        len(content) < 24
        or content[:8] != b"\x89PNG\r\n\x1a\n"
        or content[12:16] != b"IHDR"
    ):
        return None
    width, height = struct.unpack(">II", content[16:24])
    return (width, height) if width > 0 and height > 0 else None


def _jpeg_size(content: bytes) -> tuple[int, int] | None:
    if len(content) < 4 or content[:2] != b"\xff\xd8":
        return None
    position = 2
    start_of_frame = {
        0xC0,
        0xC1,
        0xC2,
        0xC3,
        0xC5,
        0xC6,
        0xC7,
        0xC9,
        0xCA,
        0xCB,
        0xCD,
        0xCE,
        0xCF,
    }
    while position + 1 < len(content):
        if content[position] != 0xFF:
            position += 1
            continue
        while position < len(content) and content[position] == 0xFF:
            position += 1
        if position >= len(content):
            return None
        marker = content[position]
        position += 1
        if marker in {0x01, 0xD8, 0xD9} or 0xD0 <= marker <= 0xD7:
            continue
        if position + 2 > len(content):
            return None
        segment_length = int.from_bytes(content[position : position + 2], "big")
        if segment_length < 2 or position + segment_length > len(content):
            return None
        if marker in start_of_frame:
            if segment_length < 7:
                return None
            height = int.from_bytes(content[position + 3 : position + 5], "big")
            width = int.from_bytes(content[position + 5 : position + 7], "big")
            return (width, height) if width > 0 and height > 0 else None
        position += segment_length
    return None


def _webp_size(content: bytes) -> tuple[int, int] | None:
    if (
        len(content) < 30
        or content[:4] != b"RIFF"
        or content[8:12] != b"WEBP"
    ):
        return None
    riff_size = int.from_bytes(content[4:8], "little")
    if riff_size + 8 > len(content):
        return None
    chunk_type = content[12:16]
    if chunk_type == b"VP8X":
        width = 1 + int.from_bytes(content[24:27], "little")
        height = 1 + int.from_bytes(content[27:30], "little")
        return width, height
    if chunk_type == b"VP8L" and len(content) >= 25 and content[20] == 0x2F:
        bits = int.from_bytes(content[21:25], "little")
        width = (bits & 0x3FFF) + 1
        height = ((bits >> 14) & 0x3FFF) + 1
        return width, height
    if chunk_type == b"VP8 " and content[23:26] == b"\x9d\x01\x2a":
        width = int.from_bytes(content[26:28], "little") & 0x3FFF
        height = int.from_bytes(content[28:30], "little") & 0x3FFF
        return (width, height) if width > 0 and height > 0 else None
    return None


__all__ = ["router"]
