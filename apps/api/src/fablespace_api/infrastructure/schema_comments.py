"""Authoritative SQLAlchemy table and column comments for FableSpace.

This module is intentionally separate from model declarations so the comments can
be reused by tests and by the MySQL metadata sync script.  Every SQLAlchemy table
and column in ``models.py`` should have a concise Chinese comment here before the
schema is considered complete.
"""

from __future__ import annotations

from collections.abc import Iterable
from sqlalchemy import MetaData


TABLE_COMMENTS: dict[str, str] = {
    "taverns": "FableSpace 空间主表：真实坐标锚定的可进入空间及店主配置。",
    "characters": "空间 NPC 角色表：兼容 SillyTavern 角色卡的店主确认角色信息。",
    "world_info": "世界知识条目表：按关键词注入 NPC 对话上下文的店主背景知识。",
    "visitors": "访客状态表：单个访客在单个空间内的访问与关系状态。",
    "chat_messages": "对话消息表：访客与空间 NPC 的可回放聊天历史。",
    "memory_atoms": "记忆原子表：可检索的空间/访客/角色长期记忆片段。",
    "gameplay_sessions": "玩法会话表：访客在店主发布玩法中的运行时进度。",
    "llm_configs": "店主 LLM 配置密钥表：空间级模型参数与敏感 API Key。",
    "npc_public_bonds": "NPC 公开关系表：访客与 NPC 经审批生效的公开结缘关系。",
    "npc_public_bond_queues": "NPC 公开关系等待队列表：1:1 排他关系冲突时的候补申请。",
    "tavern_messages": "空间留言表：访客在单个空间留下的公开/半公开留言。",
    "state_cards": "连续性状态卡表：AI/用户提出并经确认的长期会话正史候选。",
    "relationship_edges": "空间/角色关系边表：店主或系统确认的 source-side 关系视角。",
    "visitor_relationship_projections": "访客关系投影表：单访客对空间/角色节点的私有双轴关系状态。",
    "owner_configs": "店主私有配置表：店主级默认 LLM 等非公开偏好。",
    "visitor_notes": "访客反馈便签表：店主可见、非公开留言板的访客反馈。",
    "notifications": "通知表：用户可读通知、审批提醒与系统消息。",
    "neighborhood_rumors": "邻里传闻表：空间之间可被技能包引用的店主/系统传闻线索。",
    "neighborhood_knowledge": "邻里共享知识表：地理半径内可检索的公共背景知识。",
    "homes": "Home 兼容表：旧 Home API 的家庭空间配置。",
    "home_visits": "Home 访问记录表：旧 Home API 的访客停留与留言记录。",
    "writeback_states": "旧写回状态表：兼容层保存的动态世界状态文档。",
    "territories": "领地表：地图坐标范围上的店主认领区域。",
    "player_story_states": "玩家故事状态表：按玩家与 StoryWorld 隔离活动轮次和安全回访摘要。",
    "story_runs": "故事轮次表：锁定内容版本并保存不可回退的故事进度与结局。",
    "character_relationships": "角色关系表：保存单个 StoryRun 内的连续关系值和可见阶段。",
    "story_events": "故事事件表：按轮次顺序保存可观察消息、人工选择与叙事结果。",
}


COLUMN_COMMENTS: dict[str, dict[str, str]] = {
    "taverns": {
        "id": "空间唯一 ID。",
        "name": "店主确认的空间名称。",
        "description": "访客可见的空间描述。",
        "lat": "空间真实锚点纬度。",
        "lon": "空间真实锚点经度。",
        "address": "可选现实地址或反查地址文本。",
        "owner_id": "空间店主用户 ID；系统公益空间使用 system_public_welfare。",
        "created_at": "空间创建时间。",
        "access": "访问控制类型：public/password/private。",
        "password_hash": "密码空间的密码哈希；不得向访客回显。",
        "status": "运营状态：open 可互动，closed 暂停互动。",
        "roleplay_mode": "NPC 驱动模式：纯 AI 或店主审批的混合扮演。",
        "layout_style": "空间页默认布局样式。",
        "place_type": "地点类型枚举；所有空间仍必须有真实坐标。",
        "special_type": "特殊功能薄层类型，空字符串表示普通空间。",
        "scene_prompt": "店主确认的场景氛围提示词。",
        "visit_count": "空间累计访问次数缓存。",
        "group_chat_enabled": "是否启用空间内群聊体验。",
        "group_chat_config": "群聊配置 JSON。",
        "groups": "旧兼容分组配置 JSON。",
        "bookmarks": "店主/空间书签配置 JSON。",
        "chat_templates": "空间聊天模板配置 JSON。",
        "character_claims": "访客申请扮演 NPC 的认领记录 JSON。",
        "gameplay_definitions": "店主配置并可发布的结构化玩法定义 JSON。",
        "output_rules": "空间输出规则配置 JSON。",
        "prompt_blocks": "店主管理的 Prompt 段落配置 JSON。",
        "runtime_presets": "运行时预设配置 JSON，不含 API Key。",
        "skill_packs": "店主显式启用的 NPC 技能包设置 JSON。",
        "engagement_config": "互动/礼物等空间参与度配置 JSON。",
        "active_preset_id": "当前启用的运行时预设 ID。",
        "memory_policy": "空间记忆写入与检索策略 JSON。",
        "voice_config": "语音问候/朗读预览配置 JSON。",
        "home_members": "Home 地点成员配置 JSON。",
        "place_relationships": "从本地点发起的受控跨地点关系 JSON。",
        "timezone": "空间 IANA 时区；缺省时可由坐标推断。",
        "operating_hours": "空间营业时间配置 JSON。",
    },
    "characters": {
        "id": "角色在空间内的唯一 ID。",
        "space_id": "所属空间 ID。",
        "name": "店主确认的 NPC 名称。",
        "description": "角色描述，主要给主人/管理端查看。",
        "personality": "角色性格设定。",
        "scenario": "角色所处场景设定。",
        "gender": "NPC 性别枚举；缺省 unspecified，不由平台推断。",
        "system_prompt": "角色扮演系统提示词。",
        "first_mes": "NPC 首次发言。",
        "mes_example": "示例对话文本，用于约束回复风格。",
        "alternate_greetings": "备用开场白列表 JSON。",
        "tags": "角色标签列表 JSON。",
        "sprites": "表情立绘路径映射 JSON。",
        "avatar": "默认头像或立绘资源路径。",
        "appearance": "外貌/形象 preset 信息 JSON。",
        "talkativeness": "群聊发言积极度，0.0 到 1.0。",
        "hobbies": "兴趣爱好标签列表 JSON。",
    },
    "world_info": {
        "id": "世界知识条目 ID。",
        "space_id": "所属空间 ID。",
        "keys": "主要触发关键词列表 JSON。",
        "content": "命中后注入到上下文的知识内容。",
        "keys_secondary": "次要触发关键词列表 JSON。",
        "selective": "是否仅在关键词命中时注入。",
        "constant": "是否作为常驻上下文注入。",
        "depth": "向前检索对话历史的深度。",
        "order": "注入顺序，数值越小越靠前。",
        "probability": "注入概率，0 到 100。",
        "disable": "是否禁用该知识条目。",
    },
    "visitors": {
        "id": "访客状态记录 ID。",
        "space_id": "所属空间 ID。",
        "visitor_id": "空间内访客 ID。",
        "gender": "访客在本空间内自声明性别。",
        "visit_count": "该访客访问本空间的次数。",
        "first_visit": "首次访问时间。",
        "last_visit": "最近访问时间。",
        "relationship_strength": "访客与空间/NPC 的关系强度，0.0 到 1.0。",
        "relationship_stage": "关系阶段枚举，如 stranger/friend。",
        "metadata": "访客状态扩展元数据 JSON。",
    },
    "chat_messages": {
        "id": "消息唯一 ID。",
        "space_id": "所属空间 ID。",
        "character_id": "参与回复的 NPC 角色 ID。",
        "visitor_id": "发送或接收消息的访客 ID。",
        "visitor_name": "访客展示名快照。",
        "role": "消息角色：user 或 assistant。",
        "content": "消息正文。",
        "timestamp": "消息创建时间。",
        "token_count": "该消息关联的 token 计数，仅供店主参考。",
    },
    "memory_atoms": {
        "id": "记忆原子唯一 ID。",
        "space_id": "所属空间 ID。",
        "scope": "记忆作用域，如 visitor/tavern/character。",
        "dimension": "记忆维度分类。",
        "horizon": "记忆有效期或时间跨度分类。",
        "subject": "记忆主题或实体名。",
        "content": "记忆内容正文。",
        "importance": "重要性权重，0.0 到 1.0。",
        "confidence": "置信度权重，0.0 到 1.0。",
        "source_message_ids": "产生该记忆的源消息 ID 列表 JSON。",
        "created_at": "记忆创建时间。",
        "updated_at": "记忆更新时间。",
        "pinned": "是否固定保留该记忆。",
        "visibility": "记忆可见性边界。",
        "visitor_id": "关联访客 ID，可为空。",
        "character_id": "关联角色 ID，可为空。",
        "place_id": "关联地点/空间 ID，可为空。",
        "created_by": "创建者 ID 或系统来源。",
        "metadata": "记忆扩展元数据 JSON。",
    },
    "gameplay_sessions": {
        "id": "玩法会话唯一 ID。",
        "space_id": "所属空间 ID。",
        "gameplay_id": "店主玩法定义 ID。",
        "visitor_id": "参与玩法的访客 ID。",
        "character_id": "主持或关联 NPC 角色 ID，可为空。",
        "state": "会话状态：started/in_progress/completed/abandoned。",
        "current_node_id": "当前玩法节点 ID。",
        "turn_count": "会话推进轮数。",
        "events": "玩法事件轨迹 JSON。",
        "completion": "完成结算信息 JSON。",
        "created_at": "会话创建时间。",
        "updated_at": "会话更新时间。",
    },
    "llm_configs": {
        "space_id": "所属空间 ID，同时作为主键。",
        "backend": "LLM 后端提供方标识。",
        "model": "店主选择的模型名称。",
        "api_key": "店主私有 API Key；敏感字段，不得对访客暴露。",
        "base_url": "兼容 OpenAI 的自定义服务地址，可为空。",
        "temperature": "模型温度参数。",
        "max_tokens": "单次回复最大 token 数。",
        "top_p": "模型 top_p 采样参数。",
        "token_used": "空间累计 token 使用量，仅供店主参考。",
    },
    "npc_public_bonds": {
        "id": "公开关系申请/记录 ID。",
        "space_id": "所属空间 ID。",
        "character_id": "关联 NPC 角色 ID。",
        "visitor_id": "申请或拥有关系的访客 ID。",
        "bond_type": "公开关系类型枚举。",
        "status": "关系状态：pending/active/revoked/expired。",
        "created_at": "申请创建时间。",
        "approved_at": "审批通过时间。",
        "revoked_at": "关系撤销时间。",
        "expires_at": "关系过期时间，MVP 通常为空。",
        "approved_by": "审批人 ID。",
        "revoked_by": "撤销人 ID。",
        "visitor_note": "访客申请留言。",
        "owner_note": "店主审批备注。",
        "revoke_reason": "撤销原因。",
        "metadata": "公开关系扩展元数据 JSON。",
    },
    "npc_public_bond_queues": {
        "id": "等待队列记录 ID。",
        "space_id": "所属空间 ID。",
        "character_id": "关联 NPC 角色 ID。",
        "visitor_id": "等待中的访客 ID。",
        "bond_type": "等待申请的公开关系类型。",
        "position": "当前等待位置，1 为队首。",
        "status": "等待状态：waiting/promoted/expired。",
        "created_at": "入队时间。",
        "promoted_at": "晋升为 active 的时间。",
    },
    "tavern_messages": {
        "id": "留言唯一 ID。",
        "space_id": "所属空间 ID。",
        "visitor_id": "留言访客 ID。",
        "visitor_nickname": "留言展示昵称。",
        "content": "留言正文。",
        "created_at": "留言创建时间。",
        "is_pinned": "是否被置顶。",
        "parent_id": "父留言 ID，用于回复关系。",
    },
    "state_cards": {
        "id": "状态卡 ID。",
        "space_id": "所属空间 ID。",
        "status": "状态卡状态：pending/confirmed/rejected/superseded。",
        "category": "状态卡类别，如 task/resource/event_log。",
        "canon_scope": "正史作用域：visitor 或 tavern。",
        "visitor_id": "关联访客 ID；tavern scope 可为空字符串。",
        "character_id": "关联角色 ID，可为空字符串。",
        "payload": "状态卡完整结构化内容 JSON。",
        "created_at": "状态卡创建时间。",
        "updated_at": "状态卡更新时间。",
    },
    "relationship_edges": {
        "id": "关系边唯一 ID。",
        "source_owner_id": "声明该关系视角的 source 店主/系统 ID。",
        "source_space_id": "source 节点所属空间 ID。",
        "source_node_type": "source 节点类型：tavern 或 character。",
        "source_node_id": "source 节点 ID。",
        "target_owner_id": "target 节点店主/系统 ID。",
        "target_space_id": "target 节点所属空间 ID。",
        "target_node_type": "target 节点类型：tavern 或 character。",
        "target_node_id": "target 节点 ID。",
        "behavior_type": "关系行为类型：friendly/allied/neutral/rival/hostile。",
        "display_name": "店主可编辑的关系展示名。",
        "description": "关系描述或设定说明。",
        "strength_preset": "关系强度预设：weak/normal/strong。",
        "status": "关系边状态：pending/confirmed/rejected/disabled。",
        "governance_mode": "治理模式：manual/assisted/delegated_ai/system_ai。",
        "confirmed_by": "确认该关系的主体 ID。",
        "confirmed_by_type": "确认主体类型。",
        "created_at": "关系边创建时间。",
        "updated_at": "关系边更新时间。",
        "metadata": "关系边扩展元数据 JSON。",
    },
    "visitor_relationship_projections": {
        "visitor_id": "访客 ID。",
        "node_type": "关系投影节点类型。",
        "node_id": "关系投影节点 ID。",
        "space_id": "投影所属或相关空间 ID。",
        "affinity": "正向好感度，0.0 到 1.0。",
        "hostility": "敌意/紧张度，0.0 起。",
        "last_event_at": "最近影响该投影的事件时间。",
        "updated_at": "投影更新时间。",
        "metadata": "投影来源与扩展元数据 JSON。",
    },
    "owner_configs": {
        "owner_id": "店主用户 ID。",
        "default_llm": "店主级默认 LLM 配置 JSON，不直接公开给访客。",
        "created_at": "配置创建时间。",
        "updated_at": "配置更新时间。",
    },
    "visitor_notes": {
        "id": "访客反馈便签 ID。",
        "space_id": "所属空间 ID。",
        "visitor_id": "反馈访客 ID。",
        "visitor_nickname": "访客展示昵称。",
        "content": "反馈内容。",
        "created_at": "反馈创建时间。",
        "visibility": "可见性，默认 owner_only。",
    },
    "notifications": {
        "id": "通知唯一 ID。",
        "user_id": "接收通知的用户 ID。",
        "notification_type": "通知类型标识。",
        "title": "通知标题。",
        "content": "通知正文。",
        "data": "通知附加数据 JSON。",
        "created_at": "通知创建时间。",
        "read": "是否已读。",
        "space_id": "关联空间 ID，可为空。",
        "space_name": "关联空间名称快照。",
    },
    "neighborhood_rumors": {
        "id": "传闻唯一 ID。",
        "source_space_id": "传闻来源空间 ID。",
        "target_space_id": "传闻指向的目标空间 ID。",
        "target_tavern_name": "目标空间名称快照。",
        "character_id": "产生或引用传闻的角色 ID。",
        "character_name": "角色名称快照。",
        "rumor_text": "传闻正文；不是空间正史。",
        "trigger_type": "触发方式，如 keyword。",
        "trigger_keywords": "触发关键词列表 JSON。",
        "weight": "传闻被引用的权重。",
        "created_at": "传闻创建时间。",
        "expires_at": "传闻过期时间。",
        "view_count": "传闻展示次数。",
        "click_count": "传闻点击次数。",
        "is_active": "传闻是否可被引用。",
    },
    "neighborhood_knowledge": {
        "id": "共享知识唯一 ID。",
        "content": "共享知识内容。",
        "lat": "知识锚点纬度。",
        "lon": "知识锚点经度。",
        "radius": "知识适用半径，单位米。",
        "importance": "知识重要性权重。",
        "category": "知识类别，如 general/news/gossip/event。",
        "source_type": "知识来源类型：owner/state_card/system 等。",
        "source_id": "来源记录 ID，可为空。",
        "created_at": "知识创建时间。",
        "expires_at": "知识过期时间。",
        "metadata": "共享知识扩展元数据 JSON。",
    },
    "homes": {
        "id": "Home 记录唯一 ID。",
        "owner_id": "Home 所属店主/用户 ID。",
        "name": "Home 名称。",
        "description": "Home 描述。",
        "avatar": "Home 头像资源路径。",
        "cover_image": "Home 封面资源路径。",
        "theme": "Home 主题标识。",
        "visit_settings": "Home 访问设置 JSON。",
        "members": "Home 成员列表 JSON。",
        "status": "Home 状态，如 hidden。",
        "created_at": "Home 创建时间。",
        "updated_at": "Home 更新时间。",
        "metadata": "Home 扩展元数据 JSON。",
    },
    "home_visits": {
        "id": "Home 访问记录 ID。",
        "home_id": "被访问 Home ID。",
        "visitor_id": "访问者 ID。",
        "visited_at": "访问时间。",
        "stay_duration": "停留时长，单位秒。",
        "left_message": "访客留下的消息，可为空。",
        "metadata": "访问记录扩展元数据 JSON。",
    },
    "writeback_states": {
        "key": "写回状态文档键。",
        "state": "兼容层动态世界状态 JSON。",
        "updated_at": "状态更新时间。",
    },
    "territories": {
        "id": "领地唯一 ID。",
        "owner_id": "领地拥有者用户 ID。",
        "space_id": "关联空间 ID，可为空。",
        "type": "领地类型枚举。",
        "center_lat": "领地中心纬度。",
        "center_lon": "领地中心经度。",
        "radius": "领地半径，单位米。",
        "status": "领地状态。",
        "name": "领地展示名称。",
        "created_at": "领地创建时间。",
        "updated_at": "领地更新时间。",
    },
    "player_story_states": {
        "player_id": "服务端解析的匿名或登录玩家 ID。",
        "story_world_id": "玩家状态所属 StoryWorld ID。",
        "player_role_id": "该 StoryWorld 锁定的 PlayerRole ID。",
        "active_story_run_id": "当前活动 StoryRun ID；无活动轮次时为空。",
        "visit_count": "该玩家进入此 StoryWorld 的轮次数。",
        "last_visited_at": "最近进入或恢复此 StoryWorld 的时间。",
        "completed_run_summaries": "已完成轮次的安全回访摘要 JSON 列表。",
    },
    "story_runs": {
        "id": "StoryRun 唯一 ID。",
        "player_id": "服务端解析的玩家 ID。",
        "story_world_id": "本轮次所属 StoryWorld ID。",
        "content_version": "本轮次开始时锁定的系统内容版本。",
        "status": "轮次状态：active 或 completed。",
        "current_chapter_id": "当前审核章节 ID。",
        "current_node_id": "当前审核节点 ID。",
        "key_choices": "已确认且不可回退的关键选择 ID 列表。",
        "story_flags": "由人工选择确定性写入的故事标记列表。",
        "private_memories": "本轮次私有记忆列表；当前切片保持为空。",
        "ending_id": "完成时命中的审核结局 ID。",
        "ending_summary": "完成时写入的安全结局摘要。",
        "started_at": "轮次开始时间。",
        "completed_at": "轮次完成时间。",
    },
    "character_relationships": {
        "story_run_id": "关系所属 StoryRun ID。",
        "character_id": "关系对应 Character ID。",
        "affinity": "仅内部计算使用的连续关系值。",
        "stage": "前端可显示的关系阶段 ID。",
        "last_change_reason": "最近一次确定性关系变化原因。",
        "flags": "本轮次内的关系标记列表。",
    },
    "story_events": {
        "id": "故事事件唯一 ID。",
        "story_run_id": "事件所属 StoryRun ID。",
        "sequence": "轮次内严格递增的事件序号。",
        "event_type": "事件类型，如 message、choice 或 narration。",
        "character_id": "事件关联 Character ID，可为空。",
        "role": "消息角色：player、character 或 system；非消息可为空。",
        "content": "玩家可观察的事件正文。",
        "source_kind": "事件来源类型：authored、free_input 或 reviewed_choice。",
        "source_id": "审核内容或幂等来源 ID，可为空。",
        "payload": "不含思维链的结构化可观察事件数据。",
        "created_at": "事件创建时间。",
    },
}


def apply_schema_comments(metadata: MetaData) -> None:
    """Attach canonical comments to SQLAlchemy ``MetaData`` in-place."""

    for table_name, table in metadata.tables.items():
        table_comment = TABLE_COMMENTS.get(table_name)
        if table_comment:
            table.comment = table_comment
        column_comments = COLUMN_COMMENTS.get(table_name, {})
        for column in table.columns:
            column_comment = column_comments.get(column.name)
            if column_comment:
                column.comment = column_comment


def schema_comment_errors(metadata: MetaData) -> list[str]:
    """Return coverage errors for missing/stale table or column comments."""

    errors: list[str] = []
    table_names = set(metadata.tables)

    for table_name in sorted(TABLE_COMMENTS):
        if table_name not in table_names:
            errors.append(f"comment references missing table: {table_name}")

    for table_name in sorted(COLUMN_COMMENTS):
        table = metadata.tables.get(table_name)
        if table is None:
            errors.append(f"column comments reference missing table: {table_name}")
            continue
        column_names = {column.name for column in table.columns}
        for column_name in sorted(COLUMN_COMMENTS[table_name]):
            if column_name not in column_names:
                errors.append(f"comment references missing column: {table_name}.{column_name}")

    for table_name, table in sorted(metadata.tables.items()):
        if not (TABLE_COMMENTS.get(table_name) or "").strip():
            errors.append(f"missing table comment: {table_name}")
        column_comments = COLUMN_COMMENTS.get(table_name, {})
        for column in table.columns:
            if not (column_comments.get(column.name) or "").strip():
                errors.append(f"missing column comment: {table_name}.{column.name}")

    return errors


def iter_project_tables(metadata: MetaData) -> Iterable[str]:
    """Yield current project table names in deterministic order."""

    return sorted(metadata.tables)
