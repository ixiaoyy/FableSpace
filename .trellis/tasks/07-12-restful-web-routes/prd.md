# RESTful 中文网页路由

## Goal

让网站地址表达资源关系，而不是暴露英文页面名、展示名称或内部主键。所有现行网页入口统一使用中文规范路径；空间、角色、寻宝路线和店主使用固定 11 位 public ID，不同实体继续复用同一组动态页面。

## Canonical routes

| 资源 | 规范路径 |
| --- | --- |
| 首页 | `/` |
| 空间集合 / 发现 | `/空间` |
| 新建空间 | `/空间/新建` |
| 单个空间 | `/空间/{spacePublicId}`，例如 `/空间/sbprKxgBpl4` |
| 空间管理 | `/空间/{spacePublicId}/管理` |
| 空间角色 | `/空间/{spacePublicId}/角色/{characterPublicId}` |
| 角色提示词 | `/空间/{spacePublicId}/角色/{characterPublicId}/提示词` |
| 任务指南 | `/任务` |
| 寻宝路线 | `/寻宝/{routePublicId}` |
| 店主后台 | `/店主` |
| 创作者公开页 | `/店主/{ownerPublicId}` |
| 领地 | `/领地` |
| 通知 | `/通知` |
| 我的回访 | `/我的家` |

## Public ID contract

- public ID 本身就是规范引用，必须匹配 `[A-Za-z0-9_-]{11}`；规范 URL 不添加 `~` 或其它前缀。
- public ID 输入是带实体命名空间的稳定内部身份：`space:{spaceId}`、`character:{spaceId}:{characterId}`、`clue-hunt:{routeId}`、`owner:{ownerId}`。
- 对输入按 UTF-8 执行 FNV-1a 64-bit，取得 unsigned 64-bit 值后按 8-byte big-endian 序列化，再做 base64url 编码并去掉 `=` padding；结果固定为 11 个字符。
- 规范 URL 不包含展示名称；空间或角色改名不会改变 public ID。
- public ID 不是密钥；解析冲突时拒绝猜测并返回明确错误。
- 本次不新增数据库字段、别名表或依赖。规模扩大后可迁移到带索引的持久别名表。

## Compatibility

- 保留旧 `~{11 位 public ID}`、`{展示名}~{20 位十进制公开码}` 引用，以及 `/discover`、`/quests`、`/clue-hunts/:id`、`/create`、`/owner`、`/territory`、`/notifications`、`/space/...`、`/tavern/...`、`/home-me`、`/home/me`、`/npc/...`、`/creator/...` 作为只读兼容入口。
- 旧十进制公开码按 unsigned 64-bit 值直接转换为同值的 8-byte big-endian base64url public ID；展示名前缀不参与定位。
- 兼容入口必须以 HTTP 308 或 SPA replace redirect 规范化到无前缀 public ID 路径，不渲染第二套页面；新生成的网页链接、分享地址和重定向目标只写规范 public ID 路径。
- FastAPI `/api/v1/*` 保持英文复数资源名；本次仅 Space 主读取、Space share，以及 ClueHunt 公开读取与访客会话流程允许内部 ID、旧公开引用或 public ID。其它 Space 子资源读取和所有管理写操作继续使用内部 ID。

## Scope

- 新增前后端同契约的公开引用和规范路径 helper。
- 集中替换当前 React Router 页面、导航、分享、寻宝节点和组件链接。
- 修复后端仍生成 `/tavern/:id`、创作者链接未注册和 `/home-me` 双入口不规范的问题。
- 更新当前路由契约文档；历史 Trellis 归档不回写。

## Out of scope

- 不改 `/api/v1/*` 的资源名或现有写接口。
- 不改 Space / SpaceCharacter / ClueHunt 主键，不新增 Schema 字段。
- 不翻译店主自定义的空间名、角色名或内容。
- 不恢复已删除的测试目录或 package test 脚本。
- 不顺带重做空间页视觉布局。

## Validation

- Python 语法检查。
- 前端 typecheck 与 build。
- 浏览器验证所有规范路由可达，旧路由最终 URL 正确，无 `404 Not Found`、page error 或横向溢出。
- 桌面与窄屏分别保存截图；HTTP 200 不能替代 SPA 路由 DOM 验证。

## Risks

- 派生公开引用解析空间时为 O(n) 扫描；当前数据规模可接受，后续规模化需持久别名索引。
- FNV-1a 64-bit 理论上可能碰撞；解析层必须检测多匹配并失败关闭。
- 当前一体化服务托管旧 build，代码改完必须重建并重启后再做浏览器验收。
