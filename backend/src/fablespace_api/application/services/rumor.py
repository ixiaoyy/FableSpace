"""
FableSpace Rumor Application Service Mixin — 邻里传闻应用服务
"""

from __future__ import annotations

import random
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException

from fablespace_api.core.rumor import NeighborhoodRumor, RumorStore, SQLAlchemyRumorStore

if TYPE_CHECKING:
    from fablespace_api.core.space import Tavern


# 默认传闻模板（当无法调用 LLM 时使用）
DEFAULT_RUMOR_TEMPLATES = [
    "听说附近新开了家「{space_name}」，听说那里的气氛很不错。",
    "之前有旅人提起过「{space_name}」，说那里的 NPC 很有人情味。",
    "你知道吗？「{space_name}」最近挺火的，很多人都去打卡。",
    "有个客人刚从「{space_name}」回来，说那里的体验很特别。",
    "说起来，「{space_name}」离这儿不远，有空可以去看看。",
]


class RumorApplicationMixin:
    """邻里传闻应用服务 Mixin"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 初始化 rumor store
        if not hasattr(self, "_rumor_store"):
            self._rumor_store = RumorStore()

    def _get_rumor_store(self) -> RumorStore:
        """获取 rumor store"""
        current = getattr(self, "_rumor_store", None)
        db_getter = getattr(self.store, "_session", None)
        if callable(db_getter) and not isinstance(current, SQLAlchemyRumorStore):
            self._rumor_store = SQLAlchemyRumorStore(db_getter())
        elif current is None:
            self._rumor_store = RumorStore()
        return self._rumor_store

    def list_rumors(
        self,
        source_space_id: str = "",
        limit: int = 10,
        include_expired: bool = False,
    ) -> dict[str, Any]:
        """列出传闻"""
        store = self._get_rumor_store()

        if source_space_id:
            rumors = store.list_by_source(source_space_id, limit, include_expired)
        else:
            rumors = store.list_recent(limit)

        return {
            "rumors": [r.to_dict() for r in rumors],
            "count": len(rumors),
        }

    def generate_rumor(
        self,
        source_space_id: str,
        target_space_id: str,
        target_tavern_name: str,
        character_id: str,
        character_name: str,
        trigger_type: str = "keyword",
        trigger_keywords: list[str] | None = None,
        user_id: str = "",
    ) -> dict[str, Any]:
        """生成一条传闻"""
        # 验证源空间存在且用户可访问
        source_tavern = self.store.get_space(source_space_id)
        if not source_tavern:
            raise HTTPException(status_code=404, detail="源空间不存在")

        # 不能推荐自己的空间
        if source_space_id == target_space_id:
            raise HTTPException(status_code=400, detail="不能推荐自己的空间")

        # 验证目标空间存在
        target_tavern = self.store.get_space(target_space_id)
        if not target_tavern:
            raise HTTPException(status_code=404, detail="目标空间不存在")

        # 生成传闻文本
        # 尝试调用 LLM 生成，如果没有配置则使用模板
        rumor_text = self._generate_rumor_text(
            source_tavern_name=source_tavern.name,
            target_tavern_name=target_tavern_name,
            character_name=character_name,
            trigger_keywords=trigger_keywords or [],
        )

        # 创建传闻
        rumor = NeighborhoodRumor.create(
            source_space_id=source_space_id,
            target_space_id=target_space_id,
            target_tavern_name=target_tavern_name,
            character_id=character_id,
            character_name=character_name,
            rumor_text=rumor_text,
            trigger_type=trigger_type,
            trigger_keywords=trigger_keywords,
            weight=random.uniform(0.5, 1.5),
        )

        store = self._get_rumor_store()
        store.add(rumor)

        return {"ok": True, "rumor": rumor.to_dict()}

    def _generate_rumor_text(
        self,
        source_tavern_name: str,
        target_tavern_name: str,
        character_name: str,
        trigger_keywords: list[str],
    ) -> str:
        """生成传闻文本"""
        # 尝试使用 LLM 生成
        try:
            llm_config = self._get_runtime_llm_config(source_space_id="")
            if llm_config:
                text = self._call_llm_for_rumor(
                    source_tavern_name,
                    target_tavern_name,
                    character_name,
                    trigger_keywords,
                    llm_config,
                )
                if text:
                    return text
        except Exception:
            pass

        # 使用模板
        template = random.choice(DEFAULT_RUMOR_TEMPLATES)
        return template.format(space_name=target_tavern_name)

    def _call_llm_for_rumor(
        self,
        source_tavern_name: str,
        target_tavern_name: str,
        character_name: str,
        trigger_keywords: list[str],
        llm_config: Any,
    ) -> str | None:
        """调用 LLM 生成传闻"""
        # 这个方法可以在未来实现
        # 目前返回 None 使用模板
        return None

    def record_rumor_view(self, rumor_id: str) -> dict[str, Any]:
        """记录传闻浏览"""
        store = self._get_rumor_store()
        rumor = store.get(rumor_id)
        if not rumor:
            raise HTTPException(status_code=404, detail="传闻不存在")

        store.record_view(rumor_id)
        return {"ok": True, "view_count": rumor.view_count + 1}

    def record_rumor_click(self, rumor_id: str) -> dict[str, Any]:
        """记录传闻点击"""
        store = self._get_rumor_store()
        rumor = store.get(rumor_id)
        if not rumor:
            raise HTTPException(status_code=404, detail="传闻不存在")

        store.record_click(rumor_id)
        return {"ok": True, "click_count": rumor.click_count + 1}

    def delete_rumor(self, rumor_id: str, user_id: str) -> dict[str, Any]:
        """删除传闻"""
        store = self._get_rumor_store()
        rumor = store.get(rumor_id)

        if not rumor:
            raise HTTPException(status_code=404, detail="传闻不存在")

        # 检查权限：只有源空间主人可以删除
        source_tavern = self.store.get_space(rumor.source_space_id)
        if not source_tavern:
            raise HTTPException(status_code=404, detail="源空间不存在")

        if source_tavern.owner_id and source_tavern.owner_id != user_id:
            raise HTTPException(status_code=403, detail="你不是此传闻来源空间的主人")

        store.delete(rumor_id)
        return {"ok": True, "rumor_id": rumor_id}

    def get_rumors_for_tavern(
        self,
        space_id: str,
        visitor_id: str = "",
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """获取空间可展示的传闻"""
        store = self._get_rumor_store()

        # 获取该空间产生的传闻
        rumors = store.list_by_source(space_id, limit)

        # 如果不足，随机补充一些其他空间的传闻
        if len(rumors) < limit:
            other_rumors = store.list_recent(limit - len(rumors), exclude_tavern_id=space_id)
            rumors.extend(other_rumors)

        return [r.to_dict() for r in rumors]
