"""
Home domain model - 个人主页系统数据模型

Home 是用户的个人主页，可以被其他用户拜访。
每个用户可以拥有自己的 Home，Home 主人可以添加角色/家庭成员。

关键概念：
- Home vs Place: Place 是公开场所，Home 是私人空间
- Home 成员可以是生物（角色 NPC）或非生物（物件、宠物等）
- 非生物默认 is_speaking=False，访客对话时返回沉默
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class HomeStatus(str, Enum):
    """Home 状态枚举"""
    OPEN = "open"       # 开放，允许访客进入
    CLOSED = "closed"   # 关闭，不允许访客进入
    HIDDEN = "hidden"   # 隐藏，不在探索列表显示


class HomeMemberType(str, Enum):
    """Home 成员类型"""
    CONVERSATIONAL_CHARACTER = "conversational_character"  # 可对话角色（NPC）
    SILENT_MEMBER = "silent_member"  # 沉默成员（非对话，如物件）
    DISPLAY_OBJECT = "display_object"  # 展示对象（纯展示）


class HomeVisitSettings:
    """Home 访问设置"""

    def __init__(
        self,
        public: bool = True,
        approval_required: bool = False,
        friends_only: bool = False,
        max_daily_visitors: int = 100,
    ):
        self.public = public
        self.approval_required = approval_required
        self.friends_only = friends_only
        self.max_daily_visitors = max_daily_visitors

    def to_dict(self) -> dict[str, Any]:
        return {
            "public": self.public,
            "approval_required": self.approval_required,
            "friends_only": self.friends_only,
            "max_daily_visitors": self.max_daily_visitors,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> HomeVisitSettings:
        return cls(
            public=data.get("public", True),
            approval_required=data.get("approval_required", False),
            friends_only=data.get("friends_only", False),
            max_daily_visitors=data.get("max_daily_visitors", 100),
        )


class HomeMember:
    """Home 成员 - 可以是生物或非生物"""

    def __init__(
        self,
        id: str,
        name: str,
        member_type: HomeMemberType = HomeMemberType.SILENT_MEMBER,
        display_name: str | None = None,
        description: str = "",
        avatar: str = "",
        is_speaking: bool = False,
        is_living: bool = True,
        speech_mode: str = "silent",
        nonliving_note: str | None = None,
        character_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        self.id = id
        self.name = name
        self.member_type = member_type
        self.display_name = display_name or name
        self.description = description
        self.avatar = avatar
        self.is_speaking = is_speaking
        self.is_living = is_living
        self.speech_mode = speech_mode
        self.nonliving_note = nonliving_note
        self.character_id = character_id
        self.metadata = metadata or {}

    @property
    def can_speak(self) -> bool:
        """成员是否可以说话"""
        return self.is_speaking and self.member_type == HomeMemberType.CONVERSATIONAL_CHARACTER

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "member_type": self.member_type.value if isinstance(self.member_type, HomeMemberType) else self.member_type,
            "display_name": self.display_name,
            "description": self.description,
            "avatar": self.avatar,
            "is_speaking": self.is_speaking,
            "is_living": self.is_living,
            "speech_mode": self.speech_mode,
            "nonliving_note": self.nonliving_note,
            "character_id": self.character_id,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> HomeMember:
        member_type_str = data.get("member_type", "silent_member")
        if isinstance(member_type_str, str):
            try:
                member_type = HomeMemberType(member_type_str)
            except ValueError:
                member_type = HomeMemberType.SILENT_MEMBER
        else:
            member_type = member_type_str

        # 自动推断 is_living
        is_living = data.get("is_living", member_type != HomeMemberType.DISPLAY_OBJECT)

        return cls(
            id=data.get("id", ""),
            name=data.get("name", "") or data.get("display_name", ""),
            member_type=member_type,
            display_name=data.get("display_name"),
            description=data.get("description", ""),
            avatar=data.get("avatar", ""),
            is_speaking=data.get("is_speaking", member_type == HomeMemberType.CONVERSATIONAL_CHARACTER),
            is_living=is_living,
            speech_mode=data.get("speech_mode", "silent" if not data.get("is_speaking") else "character"),
            nonliving_note=data.get("nonliving_note"),
            character_id=data.get("character_id"),
            metadata=data.get("metadata", {}),
        )


class Home:
    """Home 实体"""

    def __init__(
        self,
        id: str,
        owner_id: str,
        name: str,
        description: str = "",
        avatar: str = "",
        cover_image: str = "",
        theme: str = "cozy",
        visit_settings: HomeVisitSettings | None = None,
        members: list[HomeMember] | None = None,
        status: HomeStatus = HomeStatus.HIDDEN,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        self.id = id
        self.owner_id = owner_id
        self.name = name
        self.description = description
        self.avatar = avatar
        self.cover_image = cover_image
        self.theme = theme
        self.visit_settings = visit_settings or HomeVisitSettings()
        self.members = members or []
        self.status = status
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.metadata = metadata or {}

    @property
    def is_public(self) -> bool:
        """Home 是否公开可见"""
        return self.visit_settings.public and self.status == HomeStatus.OPEN

    def get_speaking_members(self) -> list[HomeMember]:
        """获取可以对话的成员"""
        return [m for m in self.members if m.can_speak]

    def get_nonliving_members(self) -> list[HomeMember]:
        """获取非生物成员"""
        return [m for m in self.members if not m.is_living]

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "name": self.name,
            "description": self.description,
            "avatar": self.avatar,
            "cover_image": self.cover_image,
            "theme": self.theme,
            "visit_settings": self.visit_settings.to_dict(),
            "members": [m.to_dict() for m in self.members],
            "status": self.status.value if isinstance(self.status, HomeStatus) else self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Home:
        status_str = data.get("status", "hidden")
        try:
            status = HomeStatus(status_str)
        except ValueError:
            status = HomeStatus.HIDDEN

        visit_settings_data = data.get("visit_settings", {})
        visit_settings = HomeVisitSettings.from_dict(visit_settings_data) if visit_settings_data else HomeVisitSettings()

        members_data = data.get("members", [])
        members = [HomeMember.from_dict(m) for m in members_data]

        created_at = data.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

        updated_at = data.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))

        return cls(
            id=data.get("id", ""),
            owner_id=data.get("owner_id", ""),
            name=data.get("name", "未命名小窝"),
            description=data.get("description", ""),
            avatar=data.get("avatar", ""),
            cover_image=data.get("cover_image", ""),
            theme=data.get("theme", "cozy"),
            visit_settings=visit_settings,
            members=members,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
            metadata=data.get("metadata", {}),
        )


@dataclass
class HomeVisit:
    """Home 拜访记录"""
    id: str
    home_id: str
    visitor_id: str
    visited_at: datetime
    stay_duration: int = 0  # 秒
    left_message: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "home_id": self.home_id,
            "visitor_id": self.visitor_id,
            "visited_at": self.visited_at.isoformat() if self.visited_at else None,
            "stay_duration": self.stay_duration,
            "left_message": self.left_message,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> HomeVisit:
        visited_at = data.get("visited_at")
        if isinstance(visited_at, str):
            visited_at = datetime.fromisoformat(visited_at.replace("Z", "+00:00"))
        return cls(
            id=data.get("id", ""),
            home_id=data.get("home_id", ""),
            visitor_id=data.get("visitor_id", ""),
            visited_at=visited_at or datetime.utcnow(),
            stay_duration=data.get("stay_duration", 0),
            left_message=data.get("left_message"),
            metadata=data.get("metadata", {}),
        )


# 非生物交互沉默响应
NONLIVING_SILENCE_RESPONSES = [
    "……",  # 沉默
    "（它静静地看着你）",
    "（这是什么也没发生）",
    "（没有回应）",
]


def get_nonliving_response(member: HomeMember) -> str:
    """获取非生物成员的沉默响应"""
    import random
    base = random.choice(NONLIVING_SILENCE_RESPONSES)
    if member.nonliving_note:
        return f"{base}\n\n{member.nonliving_note}"
    return base