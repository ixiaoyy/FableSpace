from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Sequence


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify every media manifest entry against an S3 object listing.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--objects", type=Path, required=True)
    parser.add_argument("--s3-prefix", required=True)
    parser.add_argument("--samples-output", type=Path, required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    manifest = _read_json(args.manifest)
    objects_payload = _read_json(args.objects)

    entries = list(manifest.get("entries", []))
    if objects_payload.get("IsTruncated"):
        raise ValueError("S3 object listing was truncated; verification requires the complete media namespace")

    remote_objects = {
        str(item.get("Key") or ""): int(item.get("Size") or 0)
        for item in objects_payload.get("Contents", [])
        if item.get("Key")
    }
    prefix = args.s3_prefix.strip("/")
    if not entries:
        unexpected = sorted(
            key
            for key in remote_objects
            if key == prefix or key.startswith(f"{prefix}/")
        )
        if unexpected:
            raise ValueError(
                "empty media manifest still has remote objects: "
                + json.dumps(unexpected[:20], ensure_ascii=False)
            )
        args.samples_output.write_text("", encoding="utf-8")
        print(json.dumps({"verified": 0, "cdn_samples": []}, ensure_ascii=False))
        return 0

    missing: list[str] = []
    wrong_size: list[str] = []
    for entry in entries:
        object_key = str(entry["object_key"])
        remote_key = f"{prefix}/{object_key}"
        if remote_key not in remote_objects:
            missing.append(object_key)
        elif remote_objects[remote_key] != int(entry["bytes"]):
            wrong_size.append(object_key)

    if missing or wrong_size:
        details = {
            "expected": len(entries),
            "missing": missing[:20],
            "wrong_size": wrong_size[:20],
        }
        raise ValueError(f"media storage verification failed: {json.dumps(details, ensure_ascii=False)}")

    sample_indexes = sorted({0, len(entries) // 2, len(entries) - 1})
    samples = [str(entries[index]["url"]) for index in sample_indexes]
    args.samples_output.write_text("\n".join(samples) + "\n", encoding="utf-8")
    print(json.dumps({"verified": len(entries), "cdn_samples": samples}, ensure_ascii=False))
    return 0


def _read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected a JSON object in {path}")
    return payload


if __name__ == "__main__":
    raise SystemExit(main())
