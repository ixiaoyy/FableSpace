"""
Home Store - 个人主页数据存储

默认运行时使用 SQLAlchemyHomeStore；HomeStore JSON 实现仅作为显式本地/兼容 fallback。
"""

from __future__ import annotations

import json
import uuid
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any

from fablemap_api.core.home import Home, HomeMember, HomeVisit, HomeStatus, HomeVisitSettings, HomeMemberType, get_nonliving_response


def _utc_now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


class HomeStore:
    """
    Home 数据存储（显式 JSON fallback）

    使用 JSON 文件存储，支持：
    - Home CRUD
    - Home 成员管理
    - Home 拜访记录
    """

    def __init__(self, data_root: str = ".fablemap-api/homes"):
        self.data_root = Path(data_root)
        self.data_root.mkdir(parents=True, exist_ok=True)
        self._homes_file = self.data_root / "homes.json"
        self._visits_file = self.data_root / "visits.json"
        self._ensure_files()

    def _ensure_files(self):
        """确保存储文件存在"""
        if not self._homes_file.exists():
            self._save_homes({})
        if not self._visits_file.exists():
            self._save_visits({})

    def _load_homes(self) -> dict[str, dict[str, Any]]:
        """加载所有 Home 数据"""
        try:
            with open(self._homes_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}

    def _save_homes(self, homes: dict[str, dict[str, Any]]):
        """保存所有 Home 数据"""
        with open(self._homes_file, "w", encoding="utf-8") as f:
            json.dump(homes, f, ensure_ascii=False, indent=2)

    def _load_visits(self) -> dict[str, list[dict[str, Any]]]:
        """加载所有拜访记录"""
        try:
            with open(self._visits_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}

    def _save_visits(self, visits: dict[str, list[dict[str, Any]]]):
        """保存所有拜访记录"""
        with open(self._visits_file, "w", encoding="utf-8") as f:
            json.dump(visits, f, ensure_ascii=False, indent=2)

    # ── Home CRUD ────────────────────────────────

    def create_home(
        self,
        owner_id: str,
        name: str,
        description: str = "",
        avatar: str = "",
        cover_image: str = "",
        theme: str = "cozy",
        visit_settings: dict[str, Any] | None = None,
        members: list[dict[str, Any]] | None = None,
    ) -> Home:
        """创建新的 Home"""
        home_id = f"home_{uuid.uuid4().hex[:12]}"
        home = Home(
            id=home_id,
            owner_id=owner_id,
            name=name or f"{owner_id}的小窝",
            description=description,
            avatar=avatar,
            cover_image=cover_image,
            theme=theme,
            visit_settings=HomeVisitSettings.from_dict(visit_settings or {}),
            members=[HomeMember.from_dict(m) for m in (members or [])],
            status=HomeStatus.OPEN if (visit_settings or {}).get("public", True) else HomeStatus.HIDDEN,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        homes = self._load_homes()
        homes[home_id] = home.to_dict()
        self._save_homes(homes)

        return home

    def get_home(self, home_id: str) -> Home | None:
        """获取 Home"""
        homes = self._load_homes()
        data = homes.get(home_id)
        if not data:
            return None
        return Home.from_dict(data)

    def get_home_by_owner(self, owner_id: str) -> Home | None:
        """根据 owner_id 获取 Home"""
        homes = self._load_homes()
        for data in homes.values():
            if data.get("owner_id") == owner_id:
                return Home.from_dict(data)
        return None

    def update_home(self, home_id: str, updates: dict[str, Any]) -> Home | None:
        """更新 Home"""
        homes = self._load_homes()
        if home_id not in homes:
            return None

        data = homes[home_id]
        home = Home.from_dict(data)

        # 应用更新
        if "name" in updates and updates["name"] is not None:
            home.name = updates["name"]
        if "description" in updates and updates["description"] is not None:
            home.description = updates["description"]
        if "avatar" in updates and updates["avatar"] is not None:
            home.avatar = updates["avatar"]
        if "cover_image" in updates and updates["cover_image"] is not None:
            home.cover_image = updates["cover_image"]
        if "theme" in updates and updates["theme"] is not None:
            home.theme = updates["theme"]
        if "status" in updates and updates["status"] is not None:
            try:
                home.status = HomeStatus(updates["status"])
            except ValueError:
                pass
        if "visit_settings" in updates and updates["visit_settings"] is not None:
            home.visit_settings = HomeVisitSettings.from_dict(updates["visit_settings"])

        home.updated_at = datetime.utcnow()
        homes[home_id] = home.to_dict()
        self._save_homes(homes)

        return home

    def delete_home(self, home_id: str) -> bool:
        """删除 Home"""
        homes = self._load_homes()
        if home_id in homes:
            del homes[home_id]
            self._save_homes(homes)

            # 同时删除拜访记录
            visits = self._load_visits()
            if home_id in visits:
                del visits[home_id]
                self._save_visits(visits)

            return True
        return False

    def list_homes(
        self,
        owner_id: str | None = None,
        status: str | None = None,
        theme: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Home], int]:
        """列出 Home"""
        homes = self._load_homes()
        results = []

        for data in homes.values():
            # 过滤条件
            if owner_id and data.get("owner_id") != owner_id:
                continue
            if status and data.get("status") != status:
                continue
            if theme and data.get("theme") != theme:
                continue
            results.append(Home.from_dict(data))

        # 按更新时间倒序
        results.sort(key=lambda h: h.updated_at or datetime.min, reverse=True)

        total = len(results)
        results = results[offset : offset + limit]

        return results, total

    def list_public_homes(self, limit: int = 20, offset: int = 0) -> tuple[list[Home], int]:
        """列出公开的 Home"""
        return self.list_homes(status="open", limit=limit, offset=offset)

    # ── Home 成员管理 ──────────────────────────

    def add_member(self, home_id: str, member_data: dict[str, Any]) -> HomeMember | None:
        """添加 Home 成员"""
        homes = self._load_homes()
        if home_id not in homes:
            return None

        home = Home.from_dict(homes[home_id])

        # 生成成员 ID
        member_id = member_data.get("id") or f"mem_{uuid.uuid4().hex[:8]}"
        member = HomeMember(
            id=member_id,
            name=member_data.get("name") or member_data.get("display_name", "未命名成员"),
            display_name=member_data.get("display_name"),
            member_type=HomeMemberType(member_data.get("member_type", "silent_member")),
            description=member_data.get("description", ""),
            avatar=member_data.get("avatar", ""),
            is_speaking=member_data.get("is_speaking", member_data.get("member_type") == "conversational_character"),
            is_living=member_data.get("is_living", member_data.get("member_type") != "display_object"),
            speech_mode=member_data.get("speech_mode", "silent"),
            nonliving_note=member_data.get("nonliving_note"),
            character_id=member_data.get("character_id"),
            metadata=member_data.get("metadata", {}),
        )

        home.members.append(member)
        home.updated_at = datetime.utcnow()
        homes[home_id] = home.to_dict()
        self._save_homes(homes)

        return member

    def update_member(self, home_id: str, member_id: str, updates: dict[str, Any]) -> HomeMember | None:
        """更新 Home 成员"""
        homes = self._load_homes()
        if home_id not in homes:
            return None

        home = Home.from_dict(homes[home_id])

        for member in home.members:
            if member.id == member_id:
                # 应用更新
                if "name" in updates and updates["name"] is not None:
                    member.name = updates["name"]
                if "display_name" in updates and updates["display_name"] is not None:
                    member.display_name = updates["display_name"]
                if "member_type" in updates and updates["member_type"] is not None:
                    member.member_type = HomeMemberType(updates["member_type"])
                if "description" in updates and updates["description"] is not None:
                    member.description = updates["description"]
                if "avatar" in updates and updates["avatar"] is not None:
                    member.avatar = updates["avatar"]
                if "is_speaking" in updates and updates["is_speaking"] is not None:
                    member.is_speaking = updates["is_speaking"]
                if "is_living" in updates and updates["is_living"] is not None:
                    member.is_living = updates["is_living"]
                if "speech_mode" in updates and updates["speech_mode"] is not None:
                    member.speech_mode = updates["speech_mode"]
                if "nonliving_note" in updates and updates["nonliving_note"] is not None:
                    member.nonliving_note = updates["nonliving_note"]
                if "character_id" in updates and updates["character_id"] is not None:
                    member.character_id = updates["character_id"]

                home.updated_at = datetime.utcnow()
                homes[home_id] = home.to_dict()
                self._save_homes(homes)
                return member

        return None

    def remove_member(self, home_id: str, member_id: str) -> bool:
        """移除 Home 成员"""
        homes = self._load_homes()
        if home_id not in homes:
            return False

        home = Home.from_dict(homes[home_id])
        original_len = len(home.members)
        home.members = [m for m in home.members if m.id != member_id]

        if len(home.members) < original_len:
            home.updated_at = datetime.utcnow()
            homes[home_id] = home.to_dict()
            self._save_homes(homes)
            return True

        return False

    def get_member(self, home_id: str, member_id: str) -> HomeMember | None:
        """获取 Home 成员"""
        home = self.get_home(home_id)
        if not home:
            return None
        for member in home.members:
            if member.id == member_id:
                return member
        return None

    # ── Home 拜访 ──────────────────────────────

    def record_visit(self, home_id: str, visitor_id: str, stay_duration: int = 0) -> HomeVisit | None:
        """记录拜访"""
        homes = self._load_homes()
        if home_id not in homes:
            return None

        visits = self._load_visits()
        if home_id not in visits:
            visits[home_id] = []

        visit = HomeVisit(
            id=f"visit_{uuid.uuid4().hex[:12]}",
            home_id=home_id,
            visitor_id=visitor_id,
            visited_at=datetime.utcnow(),
            stay_duration=stay_duration,
        )

        visits[home_id].append(visit.to_dict())
        self._save_visits(visits)

        return visit

    def add_visit_message(self, home_id: str, visitor_id: str, message: str, visitor_nickname: str = "旅人") -> bool:
        """添加访客留言"""
        homes = self._load_homes()
        if home_id not in homes:
            return False

        visits = self._load_visits()
        if home_id not in visits:
            visits[home_id] = []

        # 找到最新的拜访记录并添加留言
        for visit in reversed(visits[home_id]):
            if visit.get("visitor_id") == visitor_id:
                visit["left_message"] = message
                self._save_visits(visits)
                return True

        # 如果没有找到拜访记录，创建一个
        visit = HomeVisit(
            id=f"visit_{uuid.uuid4().hex[:12]}",
            home_id=home_id,
            visitor_id=visitor_id,
            visited_at=datetime.utcnow(),
            left_message=message,
        )
        visits[home_id].append(visit.to_dict())
        self._save_visits(visits)
        return True

    def get_visits(self, home_id: str, limit: int = 50) -> list[HomeVisit]:
        """获取 Home 的拜访记录"""
        visits = self._load_visits()
        home_visits = visits.get(home_id, [])
        return [HomeVisit.from_dict(v) for v in home_visits[-limit:]]

    # ── Home 对话 ──────────────────────────────

    def chat_with_member(self, home_id: str, member_id: str, message: str) -> str | None:
        """与 Home 成员对话"""
        member = self.get_member(home_id, member_id)
        if not member:
            return None

        # 非生物成员返回沉默
        if not member.can_speak:
            return get_nonliving_response(member)

        # TODO: 对于可对话角色，可以使用 LLM 生成回复
        # 目前返回占位符
        return f"[{member.display_name}]: (正在思考如何回复...)"


class SQLAlchemyHomeStore(HomeStore):
    """Database-backed Home store for the legacy `/api/v1/homes` surface."""

    def __init__(self, database: Any):
        self.database = database

    @staticmethod
    def _to_home(model: Any) -> Home:
        return Home.from_dict({
            "id": model.id,
            "owner_id": model.owner_id,
            "name": model.name,
            "description": model.description or "",
            "avatar": model.avatar or "",
            "cover_image": model.cover_image or "",
            "theme": model.theme or "cozy",
            "visit_settings": model.visit_settings or {},
            "members": model.members or [],
            "status": model.status or "hidden",
            "created_at": model.created_at.isoformat() if model.created_at else None,
            "updated_at": model.updated_at.isoformat() if model.updated_at else None,
            "metadata": model.metadata_ or {},
        })

    @staticmethod
    def _apply_home_to_model(model: Any, home: Home) -> None:
        model.owner_id = home.owner_id
        model.name = home.name
        model.description = home.description
        model.avatar = home.avatar
        model.cover_image = home.cover_image
        model.theme = home.theme
        model.visit_settings = home.visit_settings.to_dict()
        model.members = [member.to_dict() for member in home.members]
        model.status = home.status.value if isinstance(home.status, HomeStatus) else str(home.status)
        model.created_at = home.created_at or datetime.utcnow()
        model.updated_at = home.updated_at or datetime.utcnow()
        model.metadata_ = home.metadata or {}

    @staticmethod
    def _to_visit(model: Any) -> HomeVisit:
        return HomeVisit.from_dict({
            "id": model.id,
            "home_id": model.home_id,
            "visitor_id": model.visitor_id,
            "visited_at": model.visited_at.isoformat() if model.visited_at else None,
            "stay_duration": model.stay_duration or 0,
            "left_message": model.left_message,
            "metadata": model.metadata_ or {},
        })

    def create_home(self, owner_id: str, name: str, description: str = "", avatar: str = "", cover_image: str = "", theme: str = "cozy", visit_settings: dict[str, Any] | None = None, members: list[dict[str, Any]] | None = None) -> Home:
        from fablemap_api.infrastructure.models import HomeModel

        home_id = f"home_{uuid.uuid4().hex[:12]}"
        home = Home(
            id=home_id,
            owner_id=owner_id,
            name=name or f"{owner_id}的小窝",
            description=description,
            avatar=avatar,
            cover_image=cover_image,
            theme=theme,
            visit_settings=HomeVisitSettings.from_dict(visit_settings or {}),
            members=[HomeMember.from_dict(m) for m in (members or [])],
            status=HomeStatus.OPEN if (visit_settings or {}).get("public", True) else HomeStatus.HIDDEN,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        model = HomeModel(id=home.id)
        self._apply_home_to_model(model, home)
        with self.database.session_scope() as session:
            session.add(model)
        return home

    def get_home(self, home_id: str) -> Home | None:
        from fablemap_api.infrastructure.models import HomeModel

        with self.database.session_scope() as session:
            model = session.query(HomeModel).filter_by(id=str(home_id)).first()
            return self._to_home(model) if model else None

    def get_home_by_owner(self, owner_id: str) -> Home | None:
        from fablemap_api.infrastructure.models import HomeModel

        with self.database.session_scope() as session:
            model = session.query(HomeModel).filter_by(owner_id=str(owner_id)).order_by(HomeModel.updated_at.desc()).first()
            return self._to_home(model) if model else None

    def update_home(self, home_id: str, updates: dict[str, Any]) -> Home | None:
        from fablemap_api.infrastructure.models import HomeModel

        with self.database.session_scope() as session:
            model = session.query(HomeModel).filter_by(id=str(home_id)).first()
            if not model:
                return None
            home = self._to_home(model)
            if "name" in updates and updates["name"] is not None:
                home.name = updates["name"]
            if "description" in updates and updates["description"] is not None:
                home.description = updates["description"]
            if "avatar" in updates and updates["avatar"] is not None:
                home.avatar = updates["avatar"]
            if "cover_image" in updates and updates["cover_image"] is not None:
                home.cover_image = updates["cover_image"]
            if "theme" in updates and updates["theme"] is not None:
                home.theme = updates["theme"]
            if "status" in updates and updates["status"] is not None:
                try:
                    home.status = HomeStatus(updates["status"])
                except ValueError:
                    pass
            if "visit_settings" in updates and updates["visit_settings"] is not None:
                home.visit_settings = HomeVisitSettings.from_dict(updates["visit_settings"])
            home.updated_at = datetime.utcnow()
            self._apply_home_to_model(model, home)
            return home

    def delete_home(self, home_id: str) -> bool:
        from fablemap_api.infrastructure.models import HomeModel, HomeVisitModel

        with self.database.session_scope() as session:
            deleted = session.query(HomeModel).filter_by(id=str(home_id)).delete()
            if deleted:
                session.query(HomeVisitModel).filter_by(home_id=str(home_id)).delete()
            return deleted > 0

    def list_homes(self, owner_id: str | None = None, status: str | None = None, theme: str | None = None, limit: int = 20, offset: int = 0) -> tuple[list[Home], int]:
        from fablemap_api.infrastructure.models import HomeModel

        with self.database.session_scope() as session:
            query = session.query(HomeModel)
            if owner_id:
                query = query.filter_by(owner_id=owner_id)
            if status:
                query = query.filter_by(status=status)
            if theme:
                query = query.filter_by(theme=theme)
            total = query.count()
            models = query.order_by(HomeModel.updated_at.desc()).offset(max(0, offset)).limit(max(1, min(limit, 100))).all()
            return [self._to_home(model) for model in models], total

    def add_member(self, home_id: str, member_data: dict[str, Any]) -> HomeMember | None:
        home = self.get_home(home_id)
        if not home:
            return None
        member_id = member_data.get("id") or f"mem_{uuid.uuid4().hex[:8]}"
        member = HomeMember(
            id=member_id,
            name=member_data.get("name") or member_data.get("display_name", "未命名成员"),
            display_name=member_data.get("display_name"),
            member_type=HomeMemberType(member_data.get("member_type", "silent_member")),
            description=member_data.get("description", ""),
            avatar=member_data.get("avatar", ""),
            is_speaking=member_data.get("is_speaking", member_data.get("member_type") == "conversational_character"),
            is_living=member_data.get("is_living", member_data.get("member_type") != "display_object"),
            speech_mode=member_data.get("speech_mode", "silent"),
            nonliving_note=member_data.get("nonliving_note"),
            character_id=member_data.get("character_id"),
            metadata=member_data.get("metadata", {}),
        )
        home.members.append(member)
        self._replace_home(home)
        return member

    def _replace_home(self, home: Home) -> None:
        from fablemap_api.infrastructure.models import HomeModel

        home.updated_at = datetime.utcnow()
        with self.database.session_scope() as session:
            model = session.query(HomeModel).filter_by(id=home.id).first()
            if model:
                self._apply_home_to_model(model, home)

    def update_member(self, home_id: str, member_id: str, updates: dict[str, Any]) -> HomeMember | None:
        home = self.get_home(home_id)
        if not home:
            return None
        for member in home.members:
            if member.id == member_id:
                for key in ["name", "display_name", "description", "avatar", "is_speaking", "is_living", "speech_mode", "nonliving_note", "character_id"]:
                    if key in updates and updates[key] is not None:
                        setattr(member, key, updates[key])
                if "member_type" in updates and updates["member_type"] is not None:
                    member.member_type = HomeMemberType(updates["member_type"])
                self._replace_home(home)
                return member
        return None

    def remove_member(self, home_id: str, member_id: str) -> bool:
        home = self.get_home(home_id)
        if not home:
            return False
        original_len = len(home.members)
        home.members = [m for m in home.members if m.id != member_id]
        if len(home.members) < original_len:
            self._replace_home(home)
            return True
        return False

    def record_visit(self, home_id: str, visitor_id: str, stay_duration: int = 0) -> HomeVisit | None:
        from fablemap_api.infrastructure.models import HomeModel, HomeVisitModel

        with self.database.session_scope() as session:
            if not session.query(HomeModel).filter_by(id=str(home_id)).first():
                return None
            visit = HomeVisit(
                id=f"visit_{uuid.uuid4().hex[:12]}",
                home_id=home_id,
                visitor_id=visitor_id,
                visited_at=datetime.utcnow(),
                stay_duration=stay_duration,
            )
            session.add(HomeVisitModel(
                id=visit.id,
                home_id=visit.home_id,
                visitor_id=visit.visitor_id,
                visited_at=visit.visited_at,
                stay_duration=visit.stay_duration,
                left_message=visit.left_message,
                metadata_=visit.metadata,
            ))
            return visit

    def add_visit_message(self, home_id: str, visitor_id: str, message: str, visitor_nickname: str = "旅人") -> bool:
        from fablemap_api.infrastructure.models import HomeModel, HomeVisitModel

        with self.database.session_scope() as session:
            if not session.query(HomeModel).filter_by(id=str(home_id)).first():
                return False
            model = session.query(HomeVisitModel).filter_by(home_id=str(home_id), visitor_id=str(visitor_id)).order_by(HomeVisitModel.visited_at.desc()).first()
            if model:
                model.left_message = message
                return True
            session.add(HomeVisitModel(
                id=f"visit_{uuid.uuid4().hex[:12]}",
                home_id=home_id,
                visitor_id=visitor_id,
                visited_at=datetime.utcnow(),
                left_message=message,
                metadata_={"visitor_nickname": visitor_nickname},
            ))
            return True

    def get_visits(self, home_id: str, limit: int = 50) -> list[HomeVisit]:
        from fablemap_api.infrastructure.models import HomeVisitModel

        with self.database.session_scope() as session:
            models = session.query(HomeVisitModel).filter_by(home_id=str(home_id)).order_by(HomeVisitModel.visited_at.desc()).limit(max(1, min(limit, 100))).all()
            return [self._to_visit(model) for model in reversed(models)]


def set_home_store(store: HomeStore) -> None:
    """Configure the process-wide Home store used by legacy home routes."""
    global _home_store
    _home_store = store


# ── 全局单例 ──────────────────────────────────

_home_store: HomeStore | None = None


def get_home_store() -> HomeStore:
    """获取全局 HomeStore 实例"""
    global _home_store
    if _home_store is None:
        _home_store = HomeStore()
    return _home_store
