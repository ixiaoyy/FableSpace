from __future__ import annotations

import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fablemap_api.core.default_taverns import DEFAULT_PUBLIC_WELFARE_TAVERN_IDS, default_public_welfare_taverns
from fablemap_api.core.public_welfare_rules import resolve_public_welfare_rules_response


ROOT = Path(__file__).resolve().parents[4]
TAVERNS_ROOT = ROOT / ".fablemap-api" / "taverns"
TAVERNS_FILE = TAVERNS_ROOT / "taverns.json"
CHAT_HISTORY_ROOT = TAVERNS_ROOT / "chat_history"
TASK_ROOT = ROOT / ".trellis" / "tasks" / "05-05-homepage-seed-fallback-hero-scale"
BACKUP_ROOT = TASK_ROOT / "backups"
REPORT_PATH = TASK_ROOT / "evidence" / "bad-rules-chat-artifact-repair-report.json"

BAD_MARKERS = (
    "这里的气味和灯光让我想到",
    "我听见了——天气怎么样",
    "我听见了——你好",
)
RULES_BACKENDS = {"rules", "rule_based", "public_welfare"}


def _now_stamp() -> str:
    return datetime.now(UTC).strftime("%Y%m%d-%H%M%S")


def _contains_bad_marker(value: Any) -> bool:
    return any(marker in json.dumps(value, ensure_ascii=False) for marker in BAD_MARKERS)


def _character_lookup(taverns: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    lookup: dict[tuple[str, str], dict[str, Any]] = {}
    for tavern_id, tavern in taverns.items():
        if not isinstance(tavern, dict):
            continue
        for character in tavern.get("characters", []) or []:
            if isinstance(character, dict):
                lookup[(tavern_id, str(character.get("id") or ""))] = character
    return lookup


def _repair_chat_history_file(path: Path, taverns: dict[str, Any], characters: dict[tuple[str, str], dict[str, Any]]) -> int:
    rows: list[dict[str, Any]] = []
    changed = 0
    previous_user_message = ""

    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("role") == "user":
            previous_user_message = str(row.get("content") or "")
        elif row.get("role") == "assistant" and _contains_bad_marker(row.get("content", "")):
            tavern_id = str(row.get("tavern_id") or "")
            character_id = str(row.get("character_id") or "")
            tavern = taverns.get(tavern_id, {}) if isinstance(taverns.get(tavern_id), dict) else {}
            character = characters.get((tavern_id, character_id), {})
            row["content"] = resolve_public_welfare_rules_response(
                message=previous_user_message,
                tavern_id=tavern_id,
                character_name=str(character.get("name") or row.get("character_name") or character_id or "值守员"),
                tavern_name=str(tavern.get("name") or "公益酒馆"),
                first_mes=str(character.get("first_mes") or ""),
            )
            row["token_count"] = 0
            changed += 1
        rows.append(row)

    if changed:
        path.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in rows) + "\n", encoding="utf-8")
    return changed


def main() -> None:
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    stamp = _now_stamp()
    taverns_backup = BACKUP_ROOT / f"taverns.before-rules-chat-artifact-repair.{stamp}.json"
    chat_backup_dir = BACKUP_ROOT / f"chat-history.before-rules-chat-artifact-repair.{stamp}"

    shutil.copy2(TAVERNS_FILE, taverns_backup)
    chat_backup_dir.mkdir(parents=True, exist_ok=True)

    data = json.loads(TAVERNS_FILE.read_text(encoding="utf-8"))
    canonical = {
        str(tavern.get("id") or ""): tavern
        for tavern in default_public_welfare_taverns()
        if isinstance(tavern, dict) and tavern.get("id")
    }
    # Prefer the current runtime record because it may include private buckets;
    # fill any missing public-welfare seed data from the canonical source.
    taverns_for_lookup = {**canonical, **{k: v for k, v in data.items() if isinstance(v, dict)}}
    characters = _character_lookup(taverns_for_lookup)

    removed_memory_atoms: list[str] = []
    removed_state_cards: list[str] = []
    reset_token_taverns: list[str] = []

    for tavern_id in DEFAULT_PUBLIC_WELFARE_TAVERN_IDS:
        record = data.get(tavern_id)
        if not isinstance(record, dict):
            continue

        memory_atoms = record.get("_memory_atoms")
        if isinstance(memory_atoms, dict):
            for atom_id, atom in list(memory_atoms.items()):
                if _contains_bad_marker(atom):
                    memory_atoms.pop(atom_id, None)
                    removed_memory_atoms.append(f"{tavern_id}:{atom_id}")

        state_cards = record.get("_state_cards")
        if isinstance(state_cards, dict):
            for card_id, card in list(state_cards.items()):
                if _contains_bad_marker(card):
                    state_cards.pop(card_id, None)
                    removed_state_cards.append(f"{tavern_id}:{card_id}")

        llm_config = record.get("llm_config")
        if isinstance(llm_config, dict) and str(llm_config.get("backend") or "").lower() in RULES_BACKENDS:
            if int(llm_config.get("token_used") or 0) != 0:
                llm_config["token_used"] = 0
                reset_token_taverns.append(tavern_id)

    repaired_chat_messages: dict[str, int] = {}
    removed_verification_files: list[str] = []
    affected_files: list[Path] = []
    if CHAT_HISTORY_ROOT.exists():
        for path in CHAT_HISTORY_ROOT.rglob("*.jsonl"):
            relative = path.relative_to(ROOT).as_posix()
            if path.name.startswith("codex-weather-verify"):
                backup_path = chat_backup_dir / path.relative_to(CHAT_HISTORY_ROOT)
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, backup_path)
                path.unlink()
                removed_verification_files.append(relative)
                continue
            if not _contains_bad_marker(path.read_text(encoding="utf-8")):
                continue
            backup_path = chat_backup_dir / path.relative_to(CHAT_HISTORY_ROOT)
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, backup_path)
            repaired = _repair_chat_history_file(path, taverns_for_lookup, characters)
            if repaired:
                repaired_chat_messages[relative] = repaired
                affected_files.append(path)

    TAVERNS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    remaining_markers = []
    for path in [TAVERNS_FILE, *affected_files]:
        text = path.read_text(encoding="utf-8")
        for marker in BAD_MARKERS:
            if marker in text:
                remaining_markers.append({"file": path.relative_to(ROOT).as_posix(), "marker": marker})

    report = {
        "timestamp": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "taverns_backup": taverns_backup.relative_to(ROOT).as_posix(),
        "chat_backup_dir": chat_backup_dir.relative_to(ROOT).as_posix(),
        "removed_memory_atoms": removed_memory_atoms,
        "removed_state_cards": removed_state_cards,
        "reset_token_taverns": reset_token_taverns,
        "repaired_chat_messages": repaired_chat_messages,
        "removed_verification_files": removed_verification_files,
        "remaining_markers": remaining_markers,
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if remaining_markers:
        raise SystemExit("bad markers still present after repair")


if __name__ == "__main__":
    main()
