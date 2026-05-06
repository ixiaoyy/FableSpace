# PRD: Database-backed runtime storage

## Goal

检索整个项目的数据存储，把用户可见、运行时、权限/身份/通知/记忆/回访等状态从内存、缓存或 JSON-only 存储升级到真实数据库后端。文件系统只保留用于导入导出、生成物、备份和外部 API cache。

## Requirements

- 主启动路径和旧 `py -m fablemap_api api` 路径在配置数据库 URL 时都必须使用 SQLAlchemy 数据库存储，而不是偷偷走 JSON `TavernStore`。
- 已经有 `MySQLTavernStore` 覆盖的 Tavern/Character/WorldInfo/VisitorState/Chat/Memory/Gameplay/LLM 数据，要保证两套 app 启动路径都能接上。
- 当前 in-memory 或 JSON-only 的用户可见状态要提供 DB-backed store：notifications、owner default LLM config、visitor notes、rumors、legacy homes/visits。
- 缓存/导出/备份/生成静态文件不迁移为数据库，因为它们不是权威业务状态。
- 不能泄漏 owner API key、password/hash、访客私密记忆或完整 prompt。
- 新增 SQLAlchemy/PyMySQL 到 requirements，因为项目已有 SQLAlchemy/MySQL 基础设施但 Docker 依赖未声明。

## Acceptance Criteria

- [x] 全仓存储审计报告列出：迁移项、保留文件项、原因。
- [x] `FABLEMAP_DATABASE_URL` / `FABLEMAP_MYSQL_URL` 配置后，native app 与 legacy web app 都使用数据库-backed TavernStore。
- [x] Notifications 不再是 in-memory-only：新增通知、读/未读、删除可数据库持久化。
- [x] Owner default LLM config 使用数据库-backed store，读响应仍不回显 raw api_key。
- [x] Visitor notes 使用数据库-backed store，owner-only 边界不变。
- [x] Rumor store 使用数据库-backed store，浏览/点击计数持久化。
- [x] Legacy Home API 可配置为数据库-backed store，homes / members / visits 不再只能写 JSON。
- [x] `py -3 -m compileall -q backend/src` 通过。
- [x] 相关后端测试通过或明确说明跳过原因。

## Non-goals

- 不做平台级 Token 付费/结算。
- 不实现完整账号系统迁移；未接路由的 `core/auth.py` 只审计留痕。
- 不把 Overpass cache、图片生成物、备份文件、导入导出包迁进数据库。
