from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException

from fablemap_api.core.clue_hunt import (
    SYSTEM_PUBLIC_WELFARE_OWNER_ID,
    ClueHuntRoute,
    ClueHuntSession,
    ClueHuntStore,
    hash_answer,
    utc_now_iso,
)
from fablemap_api.core.tavern import TavernStore


def _require_identity(value: str, label: str = "用户身份") -> str:
    safe = str(value or "").strip()
    if not safe:
        raise HTTPException(status_code=401, detail=f"{label}不能为空")
    return safe


def _has_real_coordinate(tavern: Any) -> bool:
    try:
        float(tavern.lat)
        float(tavern.lon)
    except (TypeError, ValueError):
        return False
    return True


class ClueHuntApplicationService:
    def __init__(self, store: ClueHuntStore, tavern_store: TavernStore):
        self.store = store
        self.tavern_store = tavern_store

    def _get_route_or_404(self, route_id: str) -> ClueHuntRoute:
        route = self.store.get_route(route_id)
        if not route:
            raise HTTPException(status_code=404, detail="寻宝路线不存在")
        return route

    def _ensure_route_owner(self, route: ClueHuntRoute, user_id: str) -> None:
        if route.owner_id != _require_identity(user_id):
            raise HTTPException(status_code=403, detail="只能管理自己的寻宝路线")

    def _validate_route_governance(self, route: ClueHuntRoute) -> None:
        if not route.owner_id:
            raise HTTPException(status_code=400, detail="路线 owner_id 不能为空")
        if len(route.nodes) < 2:
            raise HTTPException(status_code=400, detail="寻宝路线至少需要两个真实坐标节点")
        seen: set[str] = set()
        for index, node in enumerate(route.nodes):
            if not node.tavern_id:
                raise HTTPException(status_code=400, detail=f"第 {index + 1} 站缺少 tavern_id")
            if not node.clue:
                raise HTTPException(status_code=400, detail=f"第 {index + 1} 站缺少线索")
            if not node.answer_hash:
                raise HTTPException(status_code=400, detail=f"第 {index + 1} 站缺少答案")
            if node.tavern_id in seen:
                raise HTTPException(status_code=400, detail="同一空间不能在一条路线中重复出现")
            seen.add(node.tavern_id)

            tavern = self.tavern_store.get_tavern(node.tavern_id)
            if not tavern:
                raise HTTPException(status_code=404, detail=f"第 {index + 1} 站空间不存在")
            if not _has_real_coordinate(tavern):
                raise HTTPException(status_code=400, detail="寻宝节点必须绑定真实坐标空间")
            if tavern.access != "public":
                raise HTTPException(status_code=400, detail="MVP 寻宝路线只能使用公开空间，避免泄露私密入口")
            if route.owner_id == SYSTEM_PUBLIC_WELFARE_OWNER_ID:
                if tavern.owner_id != SYSTEM_PUBLIC_WELFARE_OWNER_ID:
                    raise HTTPException(status_code=403, detail="系统公益路线只能包含系统公益空间")
            elif tavern.owner_id != route.owner_id:
                raise HTTPException(status_code=403, detail="普通店主只能串联自己名下的空间")

    def _route_owner_payload(self, route: ClueHuntRoute) -> dict[str, Any]:
        return {
            "id": route.id,
            "owner_id": route.owner_id,
            "title": route.title,
            "description": route.description,
            "status": route.status,
            "reward_text": route.reward_text,
            "reward_coin_amount": route.reward_coin_amount,
            "node_count": len(route.nodes),
            "nodes": [
                {
                    "id": node.id,
                    "tavern_id": node.tavern_id,
                    "clue": node.clue,
                    "hint": node.hint,
                    "unlocked_summary": node.unlocked_summary,
                    "answer_configured": bool(node.answer_hash),
                }
                for node in route.nodes
            ],
            "created_at": route.created_at,
            "updated_at": route.updated_at,
        }

    def _route_public_summary(self, route: ClueHuntRoute) -> dict[str, Any]:
        first = route.nodes[0] if route.nodes else None
        first_tavern = self.tavern_store.get_tavern(first.tavern_id) if first else None
        return {
            "id": route.id,
            "title": route.title,
            "description": route.description,
            "status": route.status,
            "node_count": len(route.nodes),
            "first_node": self._node_public_payload(first, first_tavern) if first and first_tavern else None,
            "reward_text": route.reward_text,
            "reward_coin_amount": route.reward_coin_amount,
        }

    def _node_public_payload(self, node: Any, tavern: Any | None = None) -> dict[str, Any]:
        if not node:
            return {}
        tavern = tavern or self.tavern_store.get_tavern(node.tavern_id)
        if not tavern or tavern.access != "public":
            return {"id": node.id, "locked": True}
        return {
            "id": node.id,
            "tavern_id": node.tavern_id,
            "tavern_name": tavern.name,
            "lat": tavern.lat,
            "lon": tavern.lon,
            "address": tavern.address,
            "clue": node.clue,
            "hint": node.hint,
            "unlocked_summary": node.unlocked_summary or tavern.description,
            "to": f"/tavern/{node.tavern_id}",
        }

    def _session_payload(self, route: ClueHuntRoute, session: ClueHuntSession) -> dict[str, Any]:
        visible_nodes = [
            self._node_public_payload(route.nodes[index])
            for index in range(min(session.current_index + 1, len(route.nodes)))
        ]
        current_node = None
        if session.status != "completed" and session.current_index < len(route.nodes):
            current_node = self._node_public_payload(route.nodes[session.current_index])
        return {
            "id": session.id,
            "route_id": session.route_id,
            "visitor_id": session.visitor_id,
            "status": session.status,
            "current_index": session.current_index,
            "solved_node_ids": list(session.solved_node_ids),
            "visible_nodes": visible_nodes,
            "current_node": current_node,
            "node_count": len(route.nodes),
            "completed_at": session.completed_at,
            "reward_claimed": bool(session.reward_claimed_at),
            "reward_claimed_at": session.reward_claimed_at,
        }

    def create_route(self, data: dict[str, Any], user_id: str) -> dict[str, Any]:
        owner_id = _require_identity(user_id, "店主身份")
        route = ClueHuntRoute.from_payload(data or {}, owner_id=owner_id)
        route.owner_id = owner_id
        self._validate_route_governance(route)
        self.store.save_route(route)
        return {"ok": True, "route": self._route_owner_payload(route)}

    def update_route(self, route_id: str, data: dict[str, Any], user_id: str) -> dict[str, Any]:
        existing = self._get_route_or_404(route_id)
        self._ensure_route_owner(existing, user_id)
        payload = existing.to_internal_dict()
        payload.update(data or {})
        payload["id"] = route_id
        payload["owner_id"] = existing.owner_id
        route = ClueHuntRoute.from_payload(payload, owner_id=existing.owner_id)
        route.created_at = existing.created_at
        self._validate_route_governance(route)
        self.store.save_route(route)
        return {"ok": True, "route": self._route_owner_payload(route)}

    def list_routes(self, owner_id: str = "") -> dict[str, Any]:
        routes = self.store.list_routes(owner_id=owner_id)
        return {"routes": [self._route_owner_payload(route) for route in routes], "count": len(routes)}

    def get_public_route(self, route_id: str) -> dict[str, Any]:
        route = self._get_route_or_404(route_id)
        if route.status != "published":
            raise HTTPException(status_code=404, detail="寻宝路线暂未发布")
        return {"route": self._route_public_summary(route)}

    def start_or_resume_session(self, route_id: str, data: dict[str, Any], user_id: str) -> dict[str, Any]:
        route = self._get_route_or_404(route_id)
        if route.status != "published":
            raise HTTPException(status_code=404, detail="寻宝路线暂未发布")
        visitor_id = _require_identity((data or {}).get("visitor_id") or user_id, "访客身份")
        session = self.store.get_session_for_visitor(route_id, visitor_id)
        if not session:
            session = ClueHuntSession(
                id=f"clue_session_{uuid.uuid4().hex[:12]}",
                route_id=route_id,
                visitor_id=visitor_id,
            )
            self.store.save_session(session)
        return {"ok": True, "route": self._route_public_summary(route), "session": self._session_payload(route, session)}

    def get_session(self, route_id: str, session_id: str, user_id: str) -> dict[str, Any]:
        route = self._get_route_or_404(route_id)
        session = self.store.get_session(session_id)
        if not session or session.route_id != route_id:
            raise HTTPException(status_code=404, detail="寻宝进度不存在")
        if session.visitor_id != _require_identity(user_id, "访客身份") and route.owner_id != user_id:
            raise HTTPException(status_code=403, detail="不能读取其他访客的寻宝进度")
        return {"session": self._session_payload(route, session)}

    def submit_answer(self, route_id: str, session_id: str, data: dict[str, Any], user_id: str) -> dict[str, Any]:
        route = self._get_route_or_404(route_id)
        session = self.store.get_session(session_id)
        if not session or session.route_id != route_id:
            raise HTTPException(status_code=404, detail="寻宝进度不存在")
        visitor_id = _require_identity((data or {}).get("visitor_id") or user_id, "访客身份")
        if session.visitor_id != visitor_id:
            raise HTTPException(status_code=403, detail="不能推进其他访客的寻宝进度")
        if session.status == "completed":
            return {"ok": True, "correct": True, "completed": True, "session": self._session_payload(route, session)}
        if session.current_index >= len(route.nodes):
            session.status = "completed"
            session.completed_at = session.completed_at or utc_now_iso()
            self.store.save_session(session)
            return {"ok": True, "correct": True, "completed": True, "session": self._session_payload(route, session)}

        node = route.nodes[session.current_index]
        session.attempts[node.id] = session.attempts.get(node.id, 0) + 1
        if hash_answer((data or {}).get("answer")) != node.answer_hash:
            session.updated_at = utc_now_iso()
            self.store.save_session(session)
            return {
                "ok": False,
                "correct": False,
                "completed": False,
                "message": "答案还没有对上。可以回到当前空间再找一找线索。",
                "hint": node.hint,
                "session": self._session_payload(route, session),
            }

        session.solved_node_ids.append(node.id)
        session.current_index += 1
        if session.current_index >= len(route.nodes):
            session.status = "completed"
            session.completed_at = utc_now_iso()
        session.updated_at = utc_now_iso()
        self.store.save_session(session)
        return {
            "ok": True,
            "correct": True,
            "completed": session.status == "completed",
            "message": "线索对上了，下一站已经亮起。",
            "session": self._session_payload(route, session),
        }

    def claim_reward(self, route_id: str, session_id: str, user_id: str) -> dict[str, Any]:
        route = self._get_route_or_404(route_id)
        session = self.store.get_session(session_id)
        if not session or session.route_id != route_id:
            raise HTTPException(status_code=404, detail="寻宝进度不存在")
        if session.visitor_id != _require_identity(user_id, "访客身份"):
            raise HTTPException(status_code=403, detail="不能领取其他访客的寻宝奖励")
        if session.status != "completed":
            raise HTTPException(status_code=409, detail="完成寻宝后才能领取纪念奖励")

        duplicate = bool(session.reward_claimed_at)
        if not duplicate:
            session.reward_claimed_at = utc_now_iso()
            session.updated_at = session.reward_claimed_at
            self.store.save_session(session)
        final_node = route.nodes[-1] if route.nodes else None
        return {
            "ok": True,
            "duplicate": duplicate,
            "reward": {
                "source": "clue_hunt_completion",
                "text": route.reward_text,
                "coin_amount": route.reward_coin_amount,
                "balance": route.reward_coin_amount,
                "scope": "tavern-local",
                "tavern_id": final_node.tavern_id if final_node else "",
            },
            "session": self._session_payload(route, session),
        }
