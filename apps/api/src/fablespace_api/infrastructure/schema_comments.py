"""Canonical comments for the current FableSpace SQLAlchemy schema."""

from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import MetaData


TABLE_COMMENTS: dict[str, str] = {
    "player_story_states": "玩家故事状态表：按玩家与 StoryWorld 隔离活动轮次和安全回访摘要。",
    "story_runs": "故事轮次表：锁定玩家身份与内容版本并保存不可回退的故事进度。",
    "character_relationships": "角色关系表：保存单个 StoryRun 内的连续关系值和可见阶段。",
    "story_events": "故事事件表：按轮次顺序追加可观察输入、确定性规则来源与结果。",
    "story_messages": "故事消息表：保存可回放的玩家、角色与系统消息及来源事件。",
    "private_memories": "私有记忆表：保存已通过筛选且可追溯来源事件的故事记忆。",
    "managed_story_worlds": "托管故事世界表：保存固定管理员维护的当前 StoryWorld 内容文档。",
    "managed_media_assets": "托管媒体资产表：登记固定管理员上传的不可变 Character 图片对象。",
}


COLUMN_COMMENTS: dict[str, dict[str, str]] = {
    "player_story_states": {
        "player_id": "服务端从已验证登录会话解析的玩家 ID。",
        "story_world_id": "玩家状态所属 StoryWorld ID。",
        "player_role_id": "当前活动轮次或最近一轮选择的 PlayerRole ID。",
        "active_story_run_id": "当前活动 StoryRun ID；无活动轮次时为空。",
        "visit_count": "该玩家进入此 StoryWorld 的轮次数。",
        "last_visited_at": "最近进入或恢复此 StoryWorld 的时间。",
        "completed_run_summaries": "已完成轮次的安全回访摘要 JSON 列表。",
    },
    "story_runs": {
        "id": "StoryRun 唯一 ID。",
        "player_id": "服务端解析的玩家 ID。",
        "story_world_id": "本轮次所属 StoryWorld ID。",
        "content_version": "本轮次当前采用的系统内容版本。",
        "player_role_id": "本轮次锁定的所属 StoryWorld PlayerRole ID。",
        "status": "轮次状态：active 或 completed。",
        "current_chapter_id": "当前审核章节 ID。",
        "current_node_id": "当前审核节点 ID。",
        "key_choices": "已确认且不可回退的关键选择及幂等来源。",
        "story_flags": "由人工审核剧情动作确定性写入的故事标记列表。",
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
        "event_type": "受控事件类型，如 run_started、message 或 choice。",
        "character_id": "事件关联 Character ID，可为空。",
        "role": "消息角色：player、character 或 system；非消息可为空。",
        "content": "玩家可观察的事件正文。",
        "source_kind": "事件来源类型，如 authored、free_input 或 reviewed_choice。",
        "source_id": "审核内容或幂等来源 ID，可为空。",
        "payload": "不含思维链的结构化可观察事件数据。",
        "created_at": "事件创建时间。",
    },
    "story_messages": {
        "id": "故事消息唯一 ID。",
        "story_run_id": "消息所属 StoryRun ID。",
        "sequence": "同一 StoryRun 内唯一且严格递增的消息序号。",
        "role": "消息角色：player、character 或 system。",
        "character_id": "发送该消息的 Character ID；非角色消息为空。",
        "visible_to_character_ids": "允许观察该消息的 Character ID 列表。",
        "content": "玩家可观察的消息正文。",
        "source_event_id": "产生该消息的 StoryEvent ID。",
        "source_event_sequence": "来源 StoryEvent 的轮次内序号。",
        "created_at": "消息创建时间。",
    },
    "private_memories": {
        "id": "私有记忆唯一 ID。",
        "story_run_id": "记忆所属 StoryRun ID。",
        "content": "已通过上游筛选的私有记忆正文。",
        "source_event_id": "产生该记忆的 StoryEvent ID。",
        "source_event_sequence": "来源 StoryEvent 的轮次内序号。",
        "character_id": "该记忆的可选 Character 来源 ID。",
        "created_at": "记忆创建时间。",
    },
    "managed_story_worlds": {
        "story_world_id": "被固定管理员维护的 StoryWorld ID。",
        "payload_json": "通过领域 codec 与完整注册表校验的当前内容文档。",
        "updated_at": "当前内容最后保存时间。",
    },
    "managed_media_assets": {
        "id": "托管媒体资产记录 ID。",
        "object_key": "对象存储中不可变且唯一的媒体 key。",
        "url": "经校验的公开 HTTPS CDN URL。",
        "byte_count": "原始上传文件的字节数。",
        "sha256": "原始上传文件的小写 SHA-256。",
        "mime_type": "允许的图片 MIME 类型。",
        "width": "图片像素宽度；无法读取时为空。",
        "height": "图片像素高度；无法读取时为空。",
        "source_type": "审核来源类型。",
        "source_note": "不含密钥或私有内容的来源说明。",
        "created_at": "资产登记时间。",
    },
}


def apply_schema_comments(metadata: MetaData) -> None:
    """Attach canonical comments to the supplied SQLAlchemy metadata."""

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
    """Return missing or stale table and column comment coverage errors."""

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
                errors.append(
                    f"comment references missing column: {table_name}.{column_name}"
                )

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
