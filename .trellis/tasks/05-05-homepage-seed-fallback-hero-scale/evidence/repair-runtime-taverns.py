from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from fablemap_api.core.default_taverns import DEFAULT_PUBLIC_WELFARE_TAVERN_IDS, default_public_welfare_taverns
from fablemap_api.core.tavern import Tavern

ROOT = Path(__file__).resolve().parents[4]
TAVERNS_FILE = ROOT / ".fablemap-api" / "taverns" / "taverns.json"
REPORT_FILE = Path(__file__).with_name("runtime-taverns-repair-report.json")

PRIVATE_KEYS_TO_PRESERVE = ("_",)
PUBLIC_RUNTIME_KEYS_TO_PRESERVE = {"visit_count"}


def preserve_runtime_fields(existing: dict[str, Any], repaired: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(repaired)
    for key, value in existing.items():
        if key.startswith(PRIVATE_KEYS_TO_PRESERVE) or key in PUBLIC_RUNTIME_KEYS_TO_PRESERVE:
            result[key] = deepcopy(value)
    return result


def main() -> None:
    data = json.loads(TAVERNS_FILE.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit("taverns.json root is not an object")

    defaults = {tavern["id"]: tavern for tavern in default_public_welfare_taverns()}
    changed: list[dict[str, Any]] = []

    for tavern_id in DEFAULT_PUBLIC_WELFARE_TAVERN_IDS:
        default = defaults[tavern_id]
        existing = data.get(tavern_id)
        if isinstance(existing, dict):
            repaired = preserve_runtime_fields(existing, default)
            reason = "canonical_public_welfare_restore_preserving_runtime_fields"
        else:
            repaired = deepcopy(default)
            reason = "missing_public_welfare_seed_restored"
        if existing != repaired:
            changed.append(
                {
                    "id": tavern_id,
                    "reason": reason,
                    "preserved_keys": [key for key in existing.keys() if key.startswith("_") or key in PUBLIC_RUNTIME_KEYS_TO_PRESERVE]
                    if isinstance(existing, dict)
                    else [],
                    "had_complete_id": isinstance(existing, dict) and existing.get("id") == tavern_id,
                }
            )
            data[tavern_id] = repaired

    # Validate the repaired public-welfare records without relying on read fallback.
    for tavern_id in DEFAULT_PUBLIC_WELFARE_TAVERN_IDS:
        record = data[tavern_id]
        tavern = Tavern.from_dict(record)
        if tavern.id != tavern_id:
            raise SystemExit(f"repaired tavern id mismatch: {tavern_id} -> {tavern.id}")
        if not tavern.characters:
            raise SystemExit(f"repaired tavern has no characters: {tavern_id}")

    TAVERNS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report = {
        "taverns_file": str(TAVERNS_FILE),
        "record_count": len(data),
        "public_welfare_count": len(DEFAULT_PUBLIC_WELFARE_TAVERN_IDS),
        "changed": changed,
        "custom_ids_preserved": [key for key in data.keys() if key not in DEFAULT_PUBLIC_WELFARE_TAVERN_IDS],
    }
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
