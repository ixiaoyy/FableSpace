"""Canonical comments for the approved FableSpace 11-table schema."""

from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import MetaData


TABLE_COMMENTS: dict[str, str] = {
    "player_story_states": "玩家 StoryWorld 私有状态根：只保存世界级回访状态。",
    "player_story_progress": "玩家分故事进度表：隔离每个 ReviewedStory 的活动轮次与完成摘要。",
    "story_runs": "故事轮次表：锁定故事、玩家身份与内容版本并保存不可回退进度。",
    "character_relationships": "长期角色关系表：按玩家、StoryWorld 与 Character 跨轮次保存。",
    "story_events": "故事事件账本：按轮次顺序追加可观察输入、规则来源与确定性结果。",
    "story_messages": "故事消息投影表：保存 Character 可见的消息及其来源事件。",
    "private_memories": "私有长期记忆 revision 表：保存受控 L1 至 L3 内容与召回范围。",
    "private_memory_sources": "私有记忆不可变来源边表：连接 event 证据与前序 memory revision。",
    "memory_formation_jobs": "记忆形成任务表：保存事件水位、租约、重试与阻断状态。",
    "managed_story_worlds": "托管故事世界表：保存固定管理员维护的当前 StoryWorld 内容文档。",
    "managed_media_assets": "托管媒体资产表：登记固定管理员上传的不可变 Character 图片对象。",
}


COLUMN_COMMENTS: dict[str, dict[str, str]] = {
    "player_story_states": {
        "player_id": "服务端从已验证登录会话解析的玩家 ID。",
        "story_world_id": "玩家状态所属 StoryWorld ID。",
        "visit_count": "该玩家进入此 StoryWorld 的非负次数。",
        "last_visited_at": "最近进入或恢复此 StoryWorld 的时间。",
    },
    "player_story_progress": {
        "player_id": "所属 PlayerStoryState 的可信玩家 ID。",
        "story_world_id": "所属 PlayerStoryState 的 StoryWorld ID。",
        "story_id": "进度所属 ReviewedStory ID。",
        "active_story_run_id": "本故事当前活动 StoryRun ID；没有时为空。",
        "last_visited_at": "最近进入或恢复本故事的时间；尚未访问时为空。",
        "completed_run_summaries": "本故事已完成轮次的安全摘要 JSON 列表。",
    },
    "story_runs": {
        "id": "StoryRun 唯一 ID。",
        "player_id": "服务端解析的玩家 ID。",
        "story_world_id": "本轮次所属 StoryWorld ID。",
        "story_id": "本轮次锁定且创建后不可更换的 ReviewedStory ID。",
        "content_version": "本轮次锁定且不可改写的系统内容版本。",
        "player_role_id": "本轮次锁定的所属 StoryWorld PlayerRole ID。",
        "status": "轮次状态：active 或 completed。",
        "active_slot": "active 时生成 1、completed 时生成 NULL 的单活动轮次槽。",
        "current_chapter_id": "当前审核章节 ID。",
        "current_node_id": "当前审核节点 ID。",
        "key_choices": "已确认且不可回退的关键选择及幂等来源。",
        "story_flags": "由人工审核剧情动作确定性写入的故事标记列表。",
        "ending_id": "完成时命中的审核结局 ID。",
        "ending_summary": "完成时写入的安全结局摘要。",
        "started_at": "轮次开始时间。",
        "completed_at": "轮次完成时间；活动轮次为空。",
    },
    "character_relationships": {
        "player_id": "长期关系所属玩家 ID。",
        "story_world_id": "长期关系所属 StoryWorld ID。",
        "character_id": "长期关系对应的 Character ID。",
        "affinity": "仅内部计算使用的连续关系值。",
        "stage": "前端可显示的审核关系阶段 ID。",
        "last_change_reason": "最近一次确定性关系变化原因。",
        "flags": "经审核且可在同世界延续的长期关系标记。",
        "last_source_story_run_id": "最近永久变化的来源 StoryRun ID；未变化时为空。",
        "last_source_event_id": "最近永久变化的来源 StoryEvent ID；未变化时为空。",
        "updated_at": "长期关系最近一次成功写入时间。",
    },
    "story_events": {
        "id": "故事事件唯一 ID。",
        "story_run_id": "事件所属 StoryRun ID。",
        "sequence": "轮次内唯一且严格递增的事件序号。",
        "event_type": "受控事件类型，如 run_started、message、choice 或 run_completed。",
        "character_id": "事件关联的参与 Character ID；无关联时为空。",
        "role": "消息角色：player、character 或 system；非消息可为空。",
        "content": "玩家可观察的事件正文。",
        "source_kind": "事件来源类型，如 authored、free_input 或 reviewed_choice。",
        "source_id": "审核内容或幂等来源 ID；无来源时为空。",
        "payload": "不含思维链的结构化可观察事件数据与规则来源。",
        "created_at": "事件创建时间。",
    },
    "story_messages": {
        "id": "故事消息唯一 ID。",
        "story_run_id": "消息所属 StoryRun ID。",
        "sequence": "同一 StoryRun 内唯一且严格递增的消息序号。",
        "role": "消息角色：player、character 或 system。",
        "character_id": "发送消息的参与 Character ID；非角色消息为空。",
        "visible_to_character_ids": "允许观察该消息的本故事参与 Character ID 列表。",
        "content": "玩家可观察的消息正文。",
        "source_event_id": "产生该消息的 StoryEvent ID。",
        "source_event_sequence": "来源 StoryEvent 的轮次内序号。",
        "created_at": "消息创建时间。",
    },
    "private_memories": {
        "id": "不可变 PrivateMemory revision ID。",
        "player_id": "服务端可信解析的记忆 owner ID。",
        "story_world_id": "记忆所属且永不跨越的 StoryWorld ID。",
        "origin_story_id": "记忆证据来源 ReviewedStory ID。",
        "origin_story_run_id": "记忆证据来源 StoryRun ID。",
        "character_id": "唯一允许观察该记忆的 Character ID。",
        "role_scope_player_role_id": "非空时限定为同一 PlayerRole 才可召回。",
        "layer": "记忆层级：l1、l2 或 l3。",
        "memory_kind": "与 layer 严格匹配的封闭记忆类型。",
        "evidence_class": "记忆证据权威类别。",
        "content": "已校验召回正文；invalidated tombstone 为空。",
        "structured_payload": "按 memory_kind 校验且不含思维链的结构化数据。",
        "salience": "0 到 100 的排序显著度，不改变记忆权威。",
        "recall_scope": "最大召回范围：none、run、story 或 world。",
        "review_status": "追加 revision 状态：validated、promoted 或 invalidated。",
        "promotion_rule_id": "允许扩大召回范围的审核晋升规则 ID。",
        "story_content_version": "来源 StoryRun 锁定的内容版本。",
        "pipeline_version": "抽取、校验与序列化管线版本。",
        "logical_key": "同一连续性链使用的规范小写 SHA-256 键。",
        "revision": "同一 logical_key 从 1 开始递增的追加版本。",
        "idempotency_key": "输入集合、管线与 ordinal 生成的规范小写 SHA-256 键。",
        "content_hash": "规范化有效正文的小写 SHA-256；tombstone 可为空。",
        "created_at": "该不可变 revision 的追加时间。",
    },
    "private_memory_sources": {
        "memory_id": "来源边所属目标 PrivateMemory revision ID。",
        "player_id": "目标与来源记忆共同的可信玩家 ID。",
        "story_world_id": "目标与来源共同的 StoryWorld ID。",
        "character_id": "目标与来源共同且不可跨越的 Character ID。",
        "ordinal": "目标 revision 内从 0 开始的稳定来源顺序。",
        "source_kind": "来源类型：event 或 memory。",
        "source_story_id": "event 来源所属 ReviewedStory ID；memory 来源为空。",
        "source_story_run_id": "event 来源所属 StoryRun ID；memory 来源为空。",
        "source_event_id": "event 来源 StoryEvent ID；memory 来源为空。",
        "source_event_sequence": "event 来源在 StoryRun 内的非负序号；memory 来源为空。",
        "source_memory_id": "memory 来源 revision ID；event 来源为空。",
        "relation_kind": "来源关系：evidence、derived_from、supersedes、contradicts 或 invalidates。",
        "created_at": "不可变来源边创建时间。",
    },
    "memory_formation_jobs": {
        "player_id": "任务所属可信玩家 ID。",
        "story_world_id": "任务所属 StoryWorld ID。",
        "story_id": "任务所属 ReviewedStory ID。",
        "story_run_id": "任务所属 StoryRun ID。",
        "character_id": "任务只为该 Character 形成私有记忆。",
        "pipeline_version": "任务使用的形成管线版本。",
        "processed_event_sequence": "已原子完成派生的 StoryEvent 水位。",
        "pending_event_sequence": "已提交且等待派生的 StoryEvent 水位。",
        "status": "任务状态：idle、pending、running、retryable_failed 或 blocked。",
        "attempt_count": "当前待处理水位的非负尝试次数。",
        "lease_token": "running worker 的不透明租约令牌；其他状态为空。",
        "lease_expires_at": "running worker 租约到期时间；其他状态为空。",
        "next_retry_at": "retryable_failed 状态允许的下次重试时间。",
        "last_error_code": "不含正文的固定安全错误码；blocked 时必填。",
        "created_at": "任务记录创建时间。",
        "updated_at": "任务水位或状态最后更新时间。",
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
    """Attach canonical comments to every currently registered project table."""

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
    """Yield approved project table names in deterministic order."""

    return sorted(metadata.tables)
