# 单管理员 StoryWorld 内容后台实施计划

## Scope

单管理员、数据库 StoryWorld、四个固定管理页面、保存即生效、角色页内原图上传。首版不实现首页配置、独立媒体库、审核、发布、回滚、版本兼容、页面搭建器、图片处理和多人权限。

## Implementation

1. **同步权威合同**
   - 更新 `docs/PRODUCT_BRIEF.md`、`docs/FABLESPACE_SPACE_PLATFORM.md`、`docs/WORLD_SCHEMA.md`、`docs/WHAT_NOT_TO_BUILD.md`、`docs/IMAGE_ASSETS_SPEC.md` 和 `docs/DEPLOYMENT.md`。
   - 区分单管理员系统内容后台与仍然禁止的用户/店主/创作者后台。

2. **一次数据库迁移**
   - 新增 `007_managed_story_content.sql`。
   - 建立 StoryWorld JSON 和角色上传资产两张表。
   - 增加对应的新领域 ORM；不得复用旧 `TavernModel`、`CharacterModel` 或 `/spaces` 表。

3. **内容 codec、仓储与引导**
   - 实现 StoryWorld JSON 与现有领域对象的双向 codec。
   - 实现整文档原子读写和注册表等价校验。
   - 幂等导入当前安妮和长明宫，已有管理内容绝不覆盖。

4. **单管理员鉴权与 API**
   - 新增 `FABLESPACE_ADMIN_USER_ID` 配置。
   - 增加管理依赖和 `/api/v1/admin/story-worlds/*` 读写端点。
   - 管理响应不得包含存储凭据、玩家私有状态或隐藏会话数据。

5. **角色图片上传**
   - 复用 S3 签名核心，增加正式媒体不可变上传路径与缓存头。
   - 仅允许 PNG、JPEG、WebP，限制请求大小，计算哈希并写动态资产清单。
   - 只提供角色编辑页上传 API；不提供媒体列表、选择、删除、裁剪或转码。

6. **管理前端**
   - 增加受保护的 `/admin` 路由和固定侧栏布局。
   - 实现 StoryWorld 列表以及世界设置、背景设定、章节管理、角色管理四个独立页面。
   - 使用显式字段，保留未在首版暴露的 PlayerRole 与结局数据；不放解释性文案。
   - 保存展示明确成功或字段错误；不建设草稿、审核和发布按钮。

7. **StoryWorld runtime 数据化**
   - Character 详情和 StoryRun 使用当前数据库 StoryWorld。
   - 对失效活动轮次执行保留历史、停止旧轮次和从当前入口重开的受控路径。
   - 不按旧 `content_version` 选择历史 StoryWorld。
   - 首页和 `characterSlug` 映射本期不改。

8. **最小验证**
   - `py -3 -m compileall -q apps/api/src`
   - `npm --prefix .\apps\web run typecheck`
   - `npm --prefix .\apps\web run build`
   - 运行内容引导与引用校验脚本。
   - 不主动连接任何数据库或真实存储桶；需要真实集成验证时先取得用户授权。

## Risk and Rollback

- 风险文件：StoryWorld 注册表读取、StoryRun 恢复、认证门禁和 S3 上传。
- 只新增一个迁移，不删除旧内容代码或旧列；首次上线可通过应用回退继续使用旧代码路径。
- 不自动删除数据库记录、玩家状态或存储桶对象。
