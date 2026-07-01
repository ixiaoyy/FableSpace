"""
Patch runtime.py:
1. Add _get_or_init_engagement and _save_engagement helper methods
2. Add 'gift' field to send_chat return dict
"""
from pathlib import Path

file_path = Path("backend/src/fablespace_api/application/services/runtime.py")
content = file_path.read_text(encoding="utf-8")

# ── 1. Add helper methods before _touch_visitor_state ──────────────────────
HELPER_CODE = '''
    def _get_or_init_engagement(self, space_id: str, visitor_id: str) -> dict:
        """Get or initialize visitor engagement wallet from VisitorState.metadata."""
        try:
            vs = self.store.get_visitor_state(space_id, visitor_id)
            meta = (vs.metadata or {}) if vs else {}
            progress = meta.get("_engagement_progress") or {}
            if not isinstance(progress.get("wallet"), dict):
                progress["wallet"] = {"balance": 0, "lifetime_earned": 0, "lifetime_spent": 0}
            if not isinstance(progress.get("ledger"), list):
                progress["ledger"] = []
            return progress
        except Exception:
            return {"wallet": {"balance": 0, "lifetime_earned": 0, "lifetime_spent": 0}, "ledger": []}

    def _save_engagement(self, space_id: str, visitor_id: str, engagement: dict) -> None:
        """Persist visitor engagement wallet back to VisitorState.metadata."""
        try:
            vs = self.store.get_visitor_state(space_id, visitor_id)
            if vs is None:
                return
            if not isinstance(vs.metadata, dict):
                vs.metadata = {}
            vs.metadata["_engagement_progress"] = engagement
            self.store.update_visitor_state(space_id, vs)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("_save_engagement failed: %s", exc)

'''

ANCHOR = "    def _touch_visitor_state(\n        self,"
if ANCHOR in content:
    content = content.replace(ANCHOR, HELPER_CODE + "    def _touch_visitor_state(\n        self,", 1)
    print("SUCCESS: Helper methods inserted before _touch_visitor_state")
else:
    print(f"FAIL: anchor not found. Searching for partial...")
    idx = content.find("def _touch_visitor_state")
    print(f"  Found 'def _touch_visitor_state' at index {idx}")
    if idx > 0:
        print(repr(content[idx-5:idx+50]))

# ── 2. Add 'gift' field to return dict ─────────────────────────────────────
RETURN_ANCHOR = '            "conflicts": conflicts,\n            "timestamp": now,\n        }\n\n    def test_llm_config'
RETURN_REPLACEMENT = '            "conflicts": conflicts,\n            "timestamp": now,\n            "gift": {\n                "coins_added": _gift_result["coins_added"],\n                "events": _gift_result["events"],\n                "wallet_balance": _gift_result["wallet_balance"],\n            },\n        }\n\n    def test_llm_config'

if RETURN_ANCHOR in content:
    content = content.replace(RETURN_ANCHOR, RETURN_REPLACEMENT, 1)
    print("SUCCESS: 'gift' field added to send_chat return dict")
else:
    print("FAIL: return anchor not found")
    idx = content.find('"conflicts": conflicts')
    print(f"  'conflicts' found at index {idx}")
    if idx > 0:
        print(repr(content[idx:idx+150]))

file_path.write_text(content, encoding="utf-8")
