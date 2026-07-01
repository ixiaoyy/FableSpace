from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from fablespace_api.core.state_cards import (
    STATE_CARD_STATUSES,
    StateCard,
    extract_state_card_candidates_from_turn,
    state_card_from_payload,
    state_card_matches_filters,
)
from fablespace_api.core.gm_layer import GmLayerPreviewError, preview_gm_layer_candidates
from fablespace_api.core.space import Tavern


def _utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class StateCardApplicationMixin:
    """Continuity state-card / Canon Ledger use cases."""

    def list_state_cards(
        self,
        space_id: str,
        *,
        user_id: str = "",
        status: str = "",
        category: str = "",
        canon_scope: str = "",
        visitor_id: str = "",
        character_id: str = "",
        limit: int = 100,
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        safe_limit = max(1, min(int(limit or 100), 500))
        filters = {
            "status": status if status in STATE_CARD_STATUSES else "",
            "category": str(category or "").strip(),
            "canon_scope": str(canon_scope or "").strip(),
            "visitor_id": str(visitor_id or "").strip(),
            "character_id": str(character_id or "").strip(),
        }

        cards: list[dict[str, Any]] = []
        for card in self.store.list_state_cards(space_id):
            if not self._can_view_state_card(card, tavern, user_id):
                continue
            if not state_card_matches_filters(card, **filters):
                continue
            cards.append(card.to_dict())
            if len(cards) >= safe_limit:
                break
        return {"space_id": space_id, "state_cards": cards, "count": len(cards), "filters": filters}

    def create_state_card(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        if not user_id:
            raise HTTPException(status_code=401, detail="创建状态卡需要明确用户身份")
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        owner = self._is_owner(tavern, user_id)
        try:
            card = state_card_from_payload(data or {}, space_id=space_id, user_id=user_id, now=_utc_now_iso())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        self._ensure_state_card_write_allowed(card, tavern, user_id, owner=owner, creating=True)
        saved = self.store.save_state_card(space_id, card)
        return {"ok": True, "space_id": space_id, "state_card": saved.to_dict()}

    def decide_state_card(
        self,
        space_id: str,
        card_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        if not user_id:
            raise HTTPException(status_code=401, detail="确认状态卡需要明确用户身份")
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        card = self.store.get_state_card(space_id, card_id)
        if not card:
            raise HTTPException(status_code=404, detail="状态卡不存在")
        owner = self._is_owner(tavern, user_id)
        self._ensure_state_card_write_allowed(card, tavern, user_id, owner=owner, creating=False)

        status = str((data or {}).get("status") or "").strip()
        if status not in {"confirmed", "rejected", "superseded"}:
            raise HTTPException(status_code=400, detail="状态卡决定必须是 confirmed / rejected / superseded")

        card.status = status
        card.updated_at = _utc_now_iso()
        if status == "confirmed":
            card.confirmed_by = user_id
        note = str((data or {}).get("note") or "").strip()
        metadata = dict(card.metadata or {})
        if note:
            metadata["decision_note"] = note[:300]
        metadata["decided_by"] = user_id
        metadata["decided_at"] = card.updated_at
        card.metadata = metadata
        saved = self.store.save_state_card(space_id, card)

        # Sync to neighborhood knowledge if it's a public tavern-scoped confirmed card
        if status == "confirmed" and hasattr(self, "neighborhood_service") and self.neighborhood_service:
            self.neighborhood_service.sync_from_state_card(tavern, saved)

        return {"ok": True, "space_id": space_id, "state_card": saved.to_dict()}

    def create_state_card_candidates_from_chat(
        self,
        *,
        space_id: str,
        visitor_id: str,
        character_id: str = "",
        user_message: str = "",
        assistant_message: str = "",
        source_message_ids: list[str] | None = None,
        proposed_by: str = "",
        source: str = "chat",
    ) -> list[dict[str, Any]]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, proposed_by or visitor_id)
        cards = extract_state_card_candidates_from_turn(
            space_id=space_id,
            visitor_id=visitor_id,
            character_id=character_id,
            user_message=user_message,
            assistant_message=assistant_message,
            source_message_ids=source_message_ids or [],
            proposed_by=proposed_by or visitor_id,
            source=source,
            now=_utc_now_iso(),
        )
        saved_cards: list[dict[str, Any]] = []
        for card in cards:
            saved = self.store.save_state_card(space_id, card)
            saved_cards.append(saved.to_dict())
        return saved_cards

    def preview_gm_layer(self, space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]:
        if not user_id:
            raise HTTPException(status_code=401, detail="GM Layer 预览需要明确用户身份")
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)

        payload = data or {}
        visitor_id = str(payload.get("visitor_id") or payload.get("visitorId") or user_id).strip()
        if not visitor_id:
            raise HTTPException(status_code=400, detail="GM Layer 预览需要 visitor_id")
        if visitor_id != user_id and not self._is_owner(tavern, user_id):
            raise HTTPException(status_code=403, detail="不能为其他访客预览 GM Layer 候选")

        try:
            preview = preview_gm_layer_candidates(
                space_id=space_id,
                visitor_id=visitor_id,
                character_id=str(payload.get("character_id") or payload.get("characterId") or "").strip(),
                user_message=payload.get("user_message") or payload.get("message") or "",
                assistant_message=payload.get("assistant_message") or payload.get("response") or "",
                source_message_ids=payload.get("source_message_ids") or payload.get("sourceMessageIds") or [],
                proposed_by=user_id,
                source=str(payload.get("source") or "system").strip() or "system",
                now=_utc_now_iso(),
            )
        except GmLayerPreviewError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        preview["space_name"] = tavern.name
        return preview

    def _can_view_state_card(self, card: StateCard, tavern: Tavern, user_id: str) -> bool:
        if self._is_owner(tavern, user_id):
            return True
        if card.canon_scope == "tavern" and card.status == "confirmed":
            return True
        return bool(user_id and card.visitor_id == user_id)

    def _ensure_state_card_write_allowed(
        self,
        card: StateCard,
        tavern: Tavern,
        user_id: str,
        *,
        owner: bool,
        creating: bool,
    ) -> None:
        if owner:
            return
        if card.fixed_canon:
            raise HTTPException(status_code=403, detail="固定正史只能由店主维护")
        if card.canon_scope == "tavern":
            raise HTTPException(status_code=403, detail="空间级正史只能由店主确认")
        if card.visitor_id and card.visitor_id != user_id:
            raise HTTPException(status_code=403, detail="不能修改其他访客的状态卡")
        if creating and card.status != "pending":
            raise HTTPException(status_code=403, detail="访客只能创建待确认状态卡")
        if not card.visitor_id:
            card.visitor_id = user_id
