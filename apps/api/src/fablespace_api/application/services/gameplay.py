from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from fablespace_api.core.gameplay import (
    GameplayEvent,
    GameplaySession,
    completion_payload,
    fallback_result,
    is_complete_node,
    new_event,
    normalize_gameplay_definitions,
    scene_for_node,
)
from fablespace_api.core.space import Tavern


class GameplayApplicationMixin:
    """Run published Gameplay definitions for the authenticated player."""

    def list_gameplays(self, space_id: str, user_id: str = "") -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        gameplays = [
            gameplay
            for gameplay in normalize_gameplay_definitions(tavern.gameplay_definitions)
            if gameplay.get("status") == "published"
        ]
        return {"space_id": space_id, "gameplays": gameplays}

    def list_gameplay_sessions(
        self,
        space_id: str,
        *,
        user_id: str = "",
        state: str = "",
        visitor_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        resolved_visitor_id = visitor_id or user_id
        if not user_id or resolved_visitor_id != user_id:
            raise HTTPException(status_code=403, detail="不能读取其他玩家的故事进度")
        sessions = [
            session
            for session in self.store.list_gameplay_sessions(space_id)
            if session.visitor_id == user_id
        ]
        if state == "active":
            sessions = [
                session
                for session in sessions
                if session.state in {"started", "in_progress"}
            ]
        elif state:
            sessions = [session for session in sessions if session.state == state]
        return {
            "space_id": space_id,
            "sessions": [
                self._session_payload(session, include_events=False)
                for session in sessions
            ],
        }

    def start_gameplay_session(
        self,
        space_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        if not user_id:
            raise HTTPException(status_code=403, detail="缺少玩家身份")
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        gameplay = self._find_gameplay(
            tavern,
            str((data or {}).get("gameplay_id") or (data or {}).get("gameplayId") or ""),
        )
        character_id = str(
            (data or {}).get("character_id")
            or (data or {}).get("characterId")
            or ""
        ).strip()
        if not character_id and tavern.characters:
            character_id = tavern.characters[0].id

        for session in self.store.list_gameplay_sessions(space_id):
            if (
                session.visitor_id == user_id
                and session.gameplay_id == gameplay["id"]
                and session.state in {"started", "in_progress"}
            ):
                return {
                    "ok": True,
                    "resumed": True,
                    "session": self._session_payload(session),
                    "scene": scene_for_node(gameplay, session.current_node_id),
                }

        first_node_id = (gameplay.get("nodes") or [{"id": "start"}])[0].get(
            "id",
            "start",
        )
        session = GameplaySession.new(
            space_id=space_id,
            gameplay_id=gameplay["id"],
            visitor_id=user_id,
            character_id=character_id,
            current_node_id=first_node_id,
        )
        session.add_event(
            new_event(
                "session_started",
                narration=scene_for_node(gameplay, first_node_id).get("narration", ""),
                to_node_id=first_node_id,
                source="system",
            )
        )
        self.store.save_gameplay_session(space_id, session)
        return {
            "ok": True,
            "resumed": False,
            "session": self._session_payload(session),
            "scene": scene_for_node(gameplay, session.current_node_id),
        }

    def advance_gameplay_session(
        self,
        space_id: str,
        session_id: str,
        data: dict[str, Any],
        user_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        session = self.store.get_gameplay_session(space_id, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="故事会话不存在")
        if session.visitor_id != user_id:
            raise HTTPException(status_code=403, detail="不能推进其他玩家的故事")

        gameplay = self._find_gameplay(tavern, session.gameplay_id)
        choice_id = str(
            (data or {}).get("choice_id") or (data or {}).get("choiceId") or ""
        ).strip()
        result = (
            self._advance_by_choice(gameplay, session, choice_id)
            if choice_id
            else fallback_result(gameplay, session)
        )
        event = GameplayEvent.from_dict(result["event"])
        session.add_event(event)
        session.turn_count += 1
        session.current_node_id = str(
            result.get("next_node_id") or session.current_node_id
        )
        if result.get("completed") or is_complete_node(
            gameplay,
            session.current_node_id,
        ):
            session.state = "completed"
            completion_scene = scene_for_node(gameplay, session.current_node_id)
            session.completion = completion_payload(
                gameplay,
                session,
                completion_scene.get("narration") or event.narration,
            )
        else:
            session.state = "in_progress"
        self.store.save_gameplay_session(space_id, session)
        return {
            "ok": True,
            "session": self._session_payload(session),
            "event": event.to_dict(),
            "scene": scene_for_node(gameplay, session.current_node_id),
            "completed": session.state == "completed",
        }

    def abandon_gameplay_session(
        self,
        space_id: str,
        session_id: str,
        user_id: str = "",
    ) -> dict[str, Any]:
        tavern = self._get_tavern_or_404(space_id)
        self._ensure_visible(tavern, user_id)
        session = self.store.get_gameplay_session(space_id, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="故事会话不存在")
        if session.visitor_id != user_id:
            raise HTTPException(status_code=403, detail="不能结束其他玩家的故事")
        session.state = "abandoned"
        session.add_event(
            new_event(
                "abandoned",
                narration="玩家结束了这段故事。",
                source="system",
            )
        )
        self.store.save_gameplay_session(space_id, session)
        return {"ok": True, "session": self._session_payload(session)}

    def _find_gameplay(
        self,
        tavern: Tavern,
        gameplay_id: str,
    ) -> dict[str, Any]:
        if not gameplay_id:
            raise HTTPException(status_code=400, detail="缺少 Gameplay ID")
        for gameplay in normalize_gameplay_definitions(tavern.gameplay_definitions):
            if (
                gameplay.get("id") == gameplay_id
                and gameplay.get("status") == "published"
            ):
                return gameplay
        raise HTTPException(status_code=404, detail="Gameplay 不存在或未发布")

    def _advance_by_choice(
        self,
        gameplay: dict[str, Any],
        session: GameplaySession,
        choice_id: str,
    ) -> dict[str, Any]:
        scene = scene_for_node(gameplay, session.current_node_id)
        choice = next(
            (
                item
                for item in scene.get("choices", [])
                if item.get("id") == choice_id
            ),
            None,
        )
        if not choice:
            return fallback_result(gameplay, session)
        source_node = next(
            (
                node
                for node in gameplay.get("nodes", [])
                if node.get("id") == session.current_node_id
            ),
            {},
        )
        raw_choice = next(
            (
                item
                for item in source_node.get("choices", [])
                if item.get("id") == choice_id
            ),
            {},
        )
        next_node_id = str(
            raw_choice.get("next_node_id") or session.current_node_id
        )
        event = new_event(
            "choice_selected",
            narration=str(raw_choice.get("label") or choice.get("label") or "继续"),
            from_node_id=session.current_node_id,
            to_node_id=next_node_id,
            choice_id=choice_id,
            source="visitor",
        )
        return {
            "source": "choice",
            "event": event.to_dict(),
            "next_node_id": next_node_id,
            "completed": is_complete_node(
                gameplay,
                next_node_id,
                choice=raw_choice,
            ),
            "scene": scene_for_node(gameplay, next_node_id),
        }

    def _session_payload(
        self,
        session: GameplaySession,
        *,
        include_events: bool = True,
    ) -> dict[str, Any]:
        payload = session.to_dict()
        if not include_events:
            payload.pop("events", None)
        return payload
