from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path
from typing import Sequence


TEXT_SUFFIXES = {".md", ".json", ".yaml", ".yml"}
IMAGE_SUFFIX_PATTERN = r"(?:avif|gif|ico|jpe?g|png|svg|webp)"
BACKTICK_IMAGE_PATTERN = re.compile(rf"`([^`]+\.{IMAGE_SUFFIX_PATTERN})`", re.IGNORECASE)
YAML_ASSET_PATTERN = re.compile(r"(?m)^(\s*(?:asset|source_asset):\s*)([^\s#]+)\s*$")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Rewrite project media references to immutable CDN URLs.")
    parser.add_argument("--manifest", type=Path, default=Path("deploy/cdn/media-manifest.json"))
    parser.add_argument("roots", nargs="*", default=["apps/web"])
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    repo_root = Path(__file__).resolve().parents[2]
    manifest = json.loads((repo_root / args.manifest).read_text(encoding="utf-8"))
    source_urls = {
        str(entry["source"]).replace("\\", "/"): str(entry["url"])
        for entry in manifest.get("entries", [])
        if entry.get("disposition") == "migrate"
    }
    base_url = str(manifest["media_base_url"]).rstrip("/")

    tracked = subprocess.run(
        ["git", "ls-files", "--", *args.roots],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()

    changed = 0
    for relative_name in tracked:
        path = repo_root / relative_name
        if path.suffix.lower() not in TEXT_SUFFIXES or not path.is_file():
            continue
        original = path.read_text(encoding="utf-8")
        updated = _rewrite_text(original, path, repo_root, source_urls, base_url)
        if updated != original:
            path.write_text(updated, encoding="utf-8", newline="")
            changed += 1

    print(json.dumps({"changed_files": changed, "media_entries": len(source_urls)}, ensure_ascii=False))
    return 0


def _rewrite_text(
    text: str,
    path: Path,
    repo_root: Path,
    source_urls: dict[str, str],
    base_url: str,
) -> str:
    repo_prefix = repo_root.as_posix().rstrip("/") + "/"
    updated = text.replace(repo_prefix, "")

    for source, url in source_urls.items():
        updated = updated.replace(source, url).replace(source.replace("/", "\\"), url)

    prefix_replacements = (
        ("apps/web/app/product/assets/", f"{base_url}/app/product/assets/"),
        ("apps/web/app/assets/", f"{base_url}/app/assets/"),
        ("apps/web/public/", f"{base_url}/public/"),
    )
    for source_prefix, url_prefix in prefix_replacements:
        updated = updated.replace(source_prefix, url_prefix).replace(source_prefix.replace("/", "\\"), url_prefix)
    updated = updated.replace(
        f"{base_url}/app/assets/fable-map-05-10/",
        f"{base_url}/app/assets/fable-space-05-10/",
    )

    def replace_backtick(match: re.Match[str]) -> str:
        value = match.group(1)
        replacement = _resolve_relative_media(value, path, repo_root, source_urls)
        return f"`{replacement or value}`"

    def replace_yaml_asset(match: re.Match[str]) -> str:
        value = match.group(2).strip('"\'')
        replacement = _resolve_relative_media(value, path, repo_root, source_urls)
        return f"{match.group(1)}{replacement or match.group(2)}"

    updated = BACKTICK_IMAGE_PATTERN.sub(replace_backtick, updated)
    updated = YAML_ASSET_PATTERN.sub(replace_yaml_asset, updated)
    return updated


def _resolve_relative_media(
    value: str,
    document_path: Path,
    repo_root: Path,
    source_urls: dict[str, str],
) -> str | None:
    if re.match(r"^(?:https?:|data:|blob:)", value, re.IGNORECASE):
        return None
    candidate = (document_path.parent / value).resolve()
    try:
        relative = candidate.relative_to(repo_root).as_posix()
    except ValueError:
        return None
    return source_urls.get(relative)


if __name__ == "__main__":
    raise SystemExit(main())
