"""Generated-file storage adapters for local disk and S3-compatible services."""

from __future__ import annotations

import hashlib
import hmac
import mimetypes
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen


class GeneratedStorageError(RuntimeError):
    """Report a safe generated-storage failure without credential details."""


class LocalGeneratedStorage:
    """Keep generated files in the configured local output directory."""

    def publish_directory(self, local_root: Path, relative_root: str) -> int:
        """Leave a generated directory on disk and return its regular-file count."""
        del relative_root
        return sum(1 for path in local_root.rglob("*") if path.is_file())

    def public_url(self, file_path: str) -> None:
        """Return no external URL because local files are served by FastAPI."""
        del file_path
        return None


class S3GeneratedStorage:
    """Write generated files to an S3-compatible bucket using AWS SigV4."""

    def __init__(self, settings: Any) -> None:
        """Validate non-empty S3/CDN settings without making a network request."""
        required = {
            "FABLESPACE_S3_BUCKET": getattr(settings, "s3_bucket", ""),
            "FABLESPACE_S3_ENDPOINT_URL": getattr(settings, "s3_endpoint_url", ""),
            "FABLESPACE_S3_ACCESS_KEY_ID": getattr(settings, "s3_access_key_id", ""),
            "FABLESPACE_S3_SECRET_ACCESS_KEY": getattr(settings, "s3_secret_access_key", ""),
            "FABLESPACE_CDN_BASE_URL": getattr(settings, "cdn_base_url", ""),
        }
        missing = [name for name, value in required.items() if not str(value).strip()]
        if missing:
            raise GeneratedStorageError(f"generated storage is missing configuration: {', '.join(missing)}")

        self.bucket = str(required["FABLESPACE_S3_BUCKET"]).strip()
        self.endpoint_url = str(required["FABLESPACE_S3_ENDPOINT_URL"]).strip().rstrip("/")
        self.access_key = str(required["FABLESPACE_S3_ACCESS_KEY_ID"]).strip()
        self.secret_key = str(required["FABLESPACE_S3_SECRET_ACCESS_KEY"]).strip()
        self.region = str(getattr(settings, "s3_region", "auto") or "auto").strip()
        self.prefix = str(getattr(settings, "s3_prefix", "fablespace") or "fablespace").strip("/")
        self.cdn_base_url = str(required["FABLESPACE_CDN_BASE_URL"]).strip().rstrip("/")
        self.timeout = max(1, int(getattr(settings, "s3_request_timeout_seconds", 20) or 20))
        self.endpoint = urlsplit(self.endpoint_url)
        if self.endpoint.scheme not in {"http", "https"} or not self.endpoint.netloc:
            raise GeneratedStorageError("generated storage endpoint is invalid")

    def publish_directory(self, local_root: Path, relative_root: str) -> int:
        """Upload every regular file below a directory and return the object count."""
        root = local_root.resolve()
        if not root.is_dir():
            raise GeneratedStorageError("generated directory does not exist")
        published = 0
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            relative_path = PurePosixPath(relative_root) / PurePosixPath(path.relative_to(root).as_posix())
            media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
            self._put_object(relative_path.as_posix(), path.read_bytes(), media_type)
            published += 1
        return published

    def public_url(self, file_path: str) -> str:
        """Return the CDN URL for one validated generated-file relative path."""
        return f"{self.cdn_base_url}/{quote(self._object_key(file_path), safe='/-_.~')}"

    def _object_key(self, file_path: str) -> str:
        """Build a bucket key under the configured FableSpace generated prefix."""
        normalized = PurePosixPath(str(file_path).replace("\\", "/"))
        if normalized.is_absolute() or ".." in normalized.parts or not normalized.parts:
            raise GeneratedStorageError("generated file path is invalid")
        segments = [segment for segment in (self.prefix, "generated", normalized.as_posix()) if segment]
        return "/".join(segments)

    def _put_object(self, file_path: str, content: bytes, media_type: str) -> None:
        """Send one signed S3 PUT request with public generated-file cache headers."""
        object_key = self._object_key(file_path)
        base_path = self.endpoint.path.rstrip("/")
        object_path = f"{base_path}/{quote(self.bucket, safe='')}/{quote(object_key, safe='/-_.~')}"
        url = urlunsplit((self.endpoint.scheme, self.endpoint.netloc, object_path, "", ""))
        headers = self._signed_headers("PUT", url, content, media_type)
        headers["Cache-Control"] = "public,max-age=86400"
        request = Request(url, data=content, headers=headers, method="PUT")
        try:
            with urlopen(request, timeout=self.timeout) as response:
                response.read()
        except HTTPError as exc:
            raise GeneratedStorageError(f"generated storage rejected an object with HTTP {exc.code}") from exc
        except (TimeoutError, URLError, OSError) as exc:
            raise GeneratedStorageError("generated storage is unavailable") from exc

    def _signed_headers(self, method: str, url: str, body: bytes, media_type: str) -> dict[str, str]:
        """Create AWS SigV4 headers for an S3-compatible object request."""
        parsed = urlsplit(url)
        payload_hash = hashlib.sha256(body).hexdigest()
        now = datetime.now(UTC)
        amz_date = now.strftime("%Y%m%dT%H%M%SZ")
        date_stamp = now.strftime("%Y%m%d")
        canonical_headers = {
            "content-type": media_type,
            "host": parsed.netloc,
            "x-amz-content-sha256": payload_hash,
            "x-amz-date": amz_date,
        }
        signed_names = sorted(canonical_headers)
        canonical_header_text = "".join(f"{name}:{canonical_headers[name]}\n" for name in signed_names)
        signed_headers = ";".join(signed_names)
        canonical_request = "\n".join(
            [method, parsed.path or "/", parsed.query, canonical_header_text, signed_headers, payload_hash]
        )
        scope = f"{date_stamp}/{self.region}/s3/aws4_request"
        string_to_sign = "\n".join(
            ["AWS4-HMAC-SHA256", amz_date, scope, hashlib.sha256(canonical_request.encode()).hexdigest()]
        )
        signature = hmac.new(self._signing_key(date_stamp), string_to_sign.encode(), hashlib.sha256).hexdigest()
        return {
            "Authorization": (
                "AWS4-HMAC-SHA256 "
                f"Credential={self.access_key}/{scope}, SignedHeaders={signed_headers}, Signature={signature}"
            ),
            "Content-Type": media_type,
            "Host": parsed.netloc,
            "X-Amz-Content-Sha256": payload_hash,
            "X-Amz-Date": amz_date,
        }

    def _signing_key(self, date_stamp: str) -> bytes:
        """Derive the AWS SigV4 signing key for one UTC date."""
        date_key = hmac.new(f"AWS4{self.secret_key}".encode(), date_stamp.encode(), hashlib.sha256).digest()
        region_key = hmac.new(date_key, self.region.encode(), hashlib.sha256).digest()
        service_key = hmac.new(region_key, b"s3", hashlib.sha256).digest()
        return hmac.new(service_key, b"aws4_request", hashlib.sha256).digest()


def create_generated_storage(settings: Any) -> LocalGeneratedStorage | S3GeneratedStorage:
    """Create the configured generated-file adapter without contacting its backend."""
    if getattr(settings, "generated_storage_backend", "local") == "s3":
        return S3GeneratedStorage(settings)
    return LocalGeneratedStorage()
