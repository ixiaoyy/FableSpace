"""
Engagement Application Service — per-tavern soft currency, gifts, and bonus vouchers.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request

from ..infrastructure.engagement_store import EngagementStore


def get_engagement_service(request: Request) -> "EngagementService":
    space_service = request.app.state.spaces
    return EngagementService(
        store=EngagementStore(space_service.store),
        space_service=space_service,
    )


class EngagementService:
    def __init__(self, store: EngagementStore, space_service: Any):
        self._store = store
        self._tavern_service = space_service

    def _require_user_id(self, user_id: str, detail: str) -> str:
        safe_user_id = str(user_id or "").strip()
        if not safe_user_id:
            raise HTTPException(status_code=401, detail=detail)
        return safe_user_id

    def _get_visible_tavern(self, space_id: str, user_id: str = "") -> Any:
        tavern = self._tavern_service._get_tavern_or_404(space_id)
        self._tavern_service._ensure_visible(tavern, user_id)
        return tavern

    def _resolved_config(self, tavern: Any) -> Any:
        from ..core.engagement import EngagementConfig, build_default_reward_rules

        stored = self._store.load_config(tavern.id)
        if isinstance(stored, dict) and stored:
            config = EngagementConfig.from_dict(stored)
        else:
            config = EngagementConfig.default_template()
        if not config.reward_rules:
            config.reward_rules = build_default_reward_rules(getattr(tavern, "gameplay_definitions", []))
        return config

    def _load_progress(self, space_id: str, visitor_id: str) -> Any:
        from ..core.engagement import VisitorEngagementProgress

        data = self._store.load_progress(space_id, visitor_id)
        return VisitorEngagementProgress.from_dict(data) if isinstance(data, dict) and data else VisitorEngagementProgress()

    def get_config(self, space_id: str, user_id: str) -> dict[str, Any]:
        tavern = self._get_visible_tavern(space_id, user_id)
        config = self._resolved_config(tavern)
        payload = config.to_dict()
        if not self._tavern_service._is_owner(tavern, user_id):
            payload.pop("reward_rules", None)
        return payload

    def update_config(self, space_id: str, owner_id: str, data: dict[str, Any]) -> dict[str, Any]:
        tavern = self._get_visible_tavern(space_id, owner_id)
        self._tavern_service._ensure_owner(tavern, owner_id)
        from ..core.engagement import EngagementConfig

        config = EngagementConfig.from_dict(data if isinstance(data, dict) else {})
        self._store.save_config(space_id, config.to_dict())
        return {"ok": True, "engagement_config": config.to_dict()}

    def get_visitor_progress(self, space_id: str, visitor_id: str) -> dict[str, Any]:
        visitor_id = self._require_user_id(visitor_id, "纪念币进度需要明确访客身份")
        tavern = self._get_visible_tavern(space_id, visitor_id)
        config = self._resolved_config(tavern)
        progress = self._load_progress(space_id, visitor_id)
        progress_dict = progress.to_dict()
        wallet = progress_dict.get("wallet", {})
        vouchers = progress_dict.get("bonus_draw_vouchers", [])
        active_vouchers = [voucher for voucher in vouchers if isinstance(voucher, dict) and not voucher.get("redeemed")]
        return {
            "coin_label": config.coin_label,
            "wallet": wallet,
            "vouchers_available": len(active_vouchers),
            "daily_earned": progress_dict.get("daily_counters", {}).get(_today_key(), {}).get("earned", 0),
        }

    def claim_reward(self, space_id: str, visitor_id: str, session_id: str) -> dict[str, Any]:
        visitor_id = self._require_user_id(visitor_id, "领取纪念币奖励需要明确访客身份")
        safe_session_id = str(session_id or "").strip()
        if not safe_session_id:
            raise HTTPException(status_code=400, detail="缺少玩法会话 ID")

        tavern = self._get_visible_tavern(space_id, visitor_id)
        config = self._resolved_config(tavern)
        session = self._store.get_gameplay_session(space_id, safe_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="玩法会话不存在")
        if session.visitor_id != visitor_id:
            raise HTTPException(status_code=403, detail="不能领取其他访客的纪念币奖励")
        progress = self._load_progress(space_id, visitor_id)
        if str(session.state or "") != "completed":
            raise HTTPException(status_code=400, detail="只有已完成玩法才能领取纪念币奖励")

        reward_rule = next((rule for rule in config.reward_rules if rule.source_id == session.gameplay_id), None)
        if not reward_rule:
            return {
                "success": False,
                "reason": "该玩法暂不提供纪念币奖励",
                "balance": progress.wallet.balance,
            }

        from ..core.engagement import earn_coins

        result = earn_coins(
            progress,
            config,
            amount=reward_rule.amount,
            source_type="gameplay_completion",
            source_id=session.id,
        )
        self._store.save_progress(space_id, session.visitor_id, progress.to_dict())
        return {
            "success": result.success,
            "amount": result.amount,
            "reason": result.reason,
            "balance": result.new_balance,
        }

    def send_gift(self, space_id: str, visitor_id: str, character_id: str, gift_id: str) -> dict[str, Any]:
        visitor_id = self._require_user_id(visitor_id, "送礼需要明确访客身份")
        safe_character_id = str(character_id or "").strip()
        safe_gift_id = str(gift_id or "").strip()
        if not safe_character_id:
            raise HTTPException(status_code=400, detail="缺少角色 ID")
        if not safe_gift_id:
            raise HTTPException(status_code=400, detail="缺少礼物 ID")

        tavern = self._get_visible_tavern(space_id, visitor_id)
        config = self._resolved_config(tavern)
        progress = self._load_progress(space_id, visitor_id)

        from ..core.engagement import send_gift as do_send_gift

        result = do_send_gift(progress, config, safe_gift_id, safe_character_id)
        self._store.save_progress(space_id, visitor_id, progress.to_dict())
        return {
            "success": result.success,
            "gift_id": result.gift_id,
            "character_id": result.character_id,
            "amount": result.amount,
            "affinity_delta": result.affinity_delta,
            "cap_applied": result.cap_applied,
            "reason": result.reason,
            "narration": result.narration,
            "balance": result.new_balance,
        }

    def redeem_voucher(self, space_id: str, visitor_id: str) -> dict[str, Any]:
        visitor_id = self._require_user_id(visitor_id, "兑换抽奖券需要明确访客身份")
        tavern = self._get_visible_tavern(space_id, visitor_id)
        config = self._resolved_config(tavern)
        progress = self._load_progress(space_id, visitor_id)

        from ..core.engagement import redeem_voucher as do_redeem

        result = do_redeem(progress, config)
        self._store.save_progress(space_id, visitor_id, progress.to_dict())
        return {
            "success": result.success,
            "voucher_id": result.voucher_id,
            "reason": result.reason,
            "vouchers_remaining": result.vouchers_remaining,
            "balance": progress.wallet.balance,
        }


def _today_key() -> str:
    from datetime import UTC, datetime

    return datetime.now(UTC).strftime("%Y-%m-%d")
