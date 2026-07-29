# 单管理员 StoryWorld 内容后台技术设计

## Architecture

首版采用“每个 StoryWorld 一份内容文档 + 固定后台表单”，避免为 Character、章节、节点和选择建立大量可变关系表。

```text
单管理员 /admin
  -> /api/v1/admin/story-worlds/*
  -> 内容服务
      -> managed_story_worlds（每个 StoryWorld 一份 JSON）
      -> managed_media_assets（仅记录角色页内上传）
  -> Character 与 StoryWorld runtime 始终读取当前数据库内容
```

新增一次迁移 `007_managed_story_content.sql`，包含两张表：

- `managed_story_worlds`：`story_world_id`、`payload_json`、`updated_at`。
- `managed_media_assets`：资产 ID、对象 key、URL、字节数、SHA-256、MIME、可选宽高、来源说明、创建时间。

复杂内容以 JSON 整体原子替换。保存前通过 codec 转为现有 StoryWorld 领域对象，并把待保存世界与其余世界一起交给注册表校验，覆盖同世界引用和跨世界唯一性。`Character` 增加可选 `portrait_url`，不新增 `characterSlug` 持久化字段。

## Access Boundary

- 新增 `FABLESPACE_ADMIN_USER_ID`。
- 管理依赖读取现有可信 `SessionIdentity.id` 并与该值恒等比较。
- `/admin` 前端通过管理 API 的 401/403 状态处理未登录与无权限；全部写 API 在服务端校验。
- 不增加独立密码、浏览器存储 token 或前端可见存储凭据。

## Initial Data

应用首次发现 StoryWorld 管理表为空时，将当前安妮和长明宫 StoryWorld 幂等写入。只补充缺失的系统 StoryWorld，不覆盖或合并管理员已保存内容。

完成引导后：

- Python 内容模块仅作为首次引导来源，不参与正常 StoryWorld 读取。
- 首页及 `characterSlug` 映射本期保持现状，不接入管理内容。

## Runtime Data Flow

Character 详情和 StoryRun API 按 `story_world_id + character_id` 读取当前 `managed_story_worlds` 文档。StoryRun 原有 `content_version` 字段保留数据库兼容，但首版不用于选择旧内容。

若活动轮次的 Character、PlayerRole、章节或节点在当前文档中不存在：

1. 保留原轮次事件、消息和关系记录。
2. 使用现有重新开始语义终止其活动状态。
3. 按当前 StoryWorld 入口、当前仍存在的 Character 和 PlayerRole 建立新轮次。
4. 如果连有效入口都不存在，返回受控内容错误，不创建半成品轮次。

## Admin Information Architecture

- `/admin`、`/admin/story-worlds`：StoryWorld 列表。
- `/admin/story-worlds/:id/settings`：世界设置。
- `/admin/story-worlds/:id/background`：背景设定。
- `/admin/story-worlds/:id/chapters`：章节列表与章节编辑。
- `/admin/story-worlds/:id/characters`：角色列表与角色编辑。

全局侧栏只显示“故事世界”。进入世界后以顶部局部导航切换四个页面。表单保持显式字段，不提供通用 JSON 编辑器，也不放解释性界面文案。

## Media Upload

角色编辑页调用专用上传 API。媒体存储适配器复用现有 S3 SigV4 签名逻辑和部署配置，对象路径进入正式媒体命名空间：

```text
fablespace/media/v1/admin/<UTC-date>/<uuid>.<ext>
```

后端校验允许类型、大小和图片头，计算 SHA-256，以 `public,max-age=31536000,immutable` 上传，写入 `managed_media_assets` 后返回 CDN URL。前端随 Character 保存把 URL 写入 `portrait_url`。原始字节不进入 Git，不覆盖同 key 对象。

不提供媒体列表、通用选择或删除 API。静态部署清单继续管理代码随附资产；后台动态资产仅由数据库记录追踪。

## Compatibility and Contract Changes

- 更新产品文档，允许“单管理员系统内容后台”，仍禁止用户/店主/创作者后台。
- `draft/published/archived` 不再形成后台工作流；首版保存内容就是当前运行内容。
- 更新 WORLD_SCHEMA：运行时 StoryWorld 来源从冻结 Python 注册表改为经过同等结构校验的数据库 JSON 文档。
- 更新部署文档：管理员 ID、媒体上传 S3/CDN 配置和动态媒体清单。
- 首页内容配置与独立媒体库明确延期。
- 不恢复 `/spaces`、owner、SillyTavern 或旧管理页面。

## Trade-offs

- 整文档保存实现快、事务边界清晰，但多人并发和局部冲突处理较弱；单管理员首版可接受。
- 最新内容覆盖所有轮次最简单，但结构删除会使旧轮次重开；这是用户明确接受的 MVP 行为。
- 角色页内上传会留下未引用对象，但避免误删线上图片；媒体清理与资产库留待后续。
