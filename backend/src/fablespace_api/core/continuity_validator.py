from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from .state_cards import StateCard

logger = logging.getLogger(__name__)

@dataclass
class ConflictReport:
    """A detected contradiction between a reply and the canon."""
    card_id: str
    card_title: str
    contradiction_reason: str
    severity: str = "warning"  # warning | error

class ContinuityValidator:
    """Validates AI responses against confirmed continuity state cards."""
    
    def validate_reply(
        self, 
        reply: str, 
        confirmed_cards: list[StateCard]
    ) -> list[ConflictReport]:
        """Check if the reply contradicts any confirmed cards."""
        conflicts = []
        
        # Rule-based check: Presence/Absence of entities
        # This is a placeholder for a more advanced LLM-based check
        for card in confirmed_cards:
            conflict = self._check_individual_card(reply, card)
            if conflict:
                conflicts.append(conflict)
                
        return conflicts

    def _check_individual_card(self, reply: str, card: StateCard) -> ConflictReport | None:
        """Heuristic-based check for common contradictions."""
        # Example: If a card says someone is "away" or "sleeping", but they "arrive" or "speak"
        summary = card.summary.lower()
        reply_lower = reply.lower()
        
        # Simple "Presence" contradiction
        inactive_markers = ["不在", "离开", "sleeping", "睡着", "睡觉", "休息", "昏迷"]
        if any(m in summary for m in inactive_markers):
            # If the card says they are NOT here, but the reply has them doing something
            if card.category == "character":
                active_markers = ["说", "走", "笑", "拿", "递", "回答", "喊", "跑"]
                if any(m in reply_lower for m in active_markers):
                    return ConflictReport(
                        card_id=card.id,
                        card_title=card.title,
                        contradiction_reason=f"正史记载该角色目前状态为“{card.summary}”，可能无法进行回复中的动作。"
                    )

        # Example: Resource contradiction
        if card.category == "resource":
            if "丢失" in summary or "没了" in summary or "不在手中" in summary:
                # If the reply mentions using/giving the item
                # Extraction of item name from card title/summary would be better
                pass

        return None

    async def validate_with_llm(
        self,
        reply: str,
        confirmed_cards: list[StateCard],
        llm_client: Any  # Should be a backend from llm_clients.py
    ) -> list[ConflictReport]:
        """Use an LLM to judge logical consistency (Future Implementation)."""
        # TODO: Implement the judge prompt here
        return self.validate_reply(reply, confirmed_cards)
