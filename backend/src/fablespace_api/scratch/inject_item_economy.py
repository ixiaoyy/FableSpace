"""
Inject item economy processing into runtime.py send_chat method.
"""
from pathlib import Path

file_path = Path("backend/src/fablespace_api/application/services/runtime.py")
content = file_path.read_text(encoding="utf-8")

MARKER = "        now = _utc_now_iso()\r\n        user_message = ChatMessage(\r\n            id=f\"msg_{uuid.uuid4().hex[:12]}\","

INJECTION = """        # ── Item Economy: parse gifts, award coins, strip tags ─────────────
        _rel_stage = "stranger"
        try:
            _prompt_vs = self.store.get_visitor_state(space_id, visitor_id)
            _rel = _prompt_vs.relationship if _prompt_vs else None
            _rel_stage = (_rel.get("stage", "stranger") if isinstance(_rel, dict) else getattr(_rel, "stage", "stranger")) or "stranger"
        except Exception:
            pass
        _engagement = self._get_or_init_engagement(space_id, visitor_id)
        _gift_result = process_item_gifts(
            response_text,
            relationship_stage=_rel_stage,
            wallet=_engagement.get("wallet"),
            ledger=_engagement.get("ledger"),
            character_id=character_id,
        )
        response_text = _gift_result["clean_text"]
        if _gift_result["coins_added"] > 0:
            try:
                self._save_engagement(space_id, visitor_id, _engagement)
            except Exception as _exc:
                logger.warning("Failed to save engagement wallet: %s", _exc)
        # ──────────────────────────────────────────────────────────────────

"""

REPLACEMENT = INJECTION + "        now = _utc_now_iso()\r\n        user_message = ChatMessage(\r\n            id=f\"msg_{uuid.uuid4().hex[:12]}\","

if MARKER in content:
    new_content = content.replace(MARKER, REPLACEMENT, 1)
    file_path.write_text(new_content, encoding="utf-8")
    print("SUCCESS: Item economy block injected into send_chat")
else:
    # Try LF version
    MARKER_LF = "        now = _utc_now_iso()\n        user_message = ChatMessage(\n            id=f\"msg_{uuid.uuid4().hex[:12]}\","
    if MARKER_LF in content:
        REPLACEMENT_LF = INJECTION + "        now = _utc_now_iso()\n        user_message = ChatMessage(\n            id=f\"msg_{uuid.uuid4().hex[:12]}\","
        new_content = content.replace(MARKER_LF, REPLACEMENT_LF, 1)
        file_path.write_text(new_content, encoding="utf-8")
        print("SUCCESS (LF): Item economy block injected into send_chat")
    else:
        # Find context
        idx = content.find("now = _utc_now_iso()")
        print(f"FAIL: Marker not found. First occurrence of 'now = _utc_now_iso()' at index {idx}")
        if idx > 0:
            print(repr(content[idx-10:idx+80]))
