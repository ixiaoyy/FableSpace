# 镜像岛 AI 协作约束

适用于整个仓库；更近层级的 `AGENTS.md` 优先。

## 产品主线

- 当前唯一产品是基于 RPGJS v5 的“镜像岛”共享 Web 像素农场世界，公开入口为 `/`。
- 旧 React/Phaser 本地农场、FastAPI、Character、StoryWorld、StoryRun、历史故事、关系/记忆、内容后台和 LLM 产品已永久退役；不从 Git 历史恢复建立兼容层或备用路由。
- 世界目标固定为 512×512 瓦片、32×32 区块、RPGJS WebSocket room、全服时间、无主土地/作物争抢、迎宾 NPC 免费建房和私人住宅室内。
- 论坛账号和独立用户名密码都通过 Keycloak 进入游戏；不提供游客、邮箱、找回、账号自动合并或绑定。
- 旧 localStorage 名称、外观和进度不迁移；新客户端只精确删除 `farm-game.save.v1`–`v4`。

## 技术边界

- 唯一应用目录是 `apps/mirror-island/`，固定 RPGJS `5.0.0-beta.32`/上游提交 `7c7db1b...`。
- RPGJS 负责地图房间、玩家同步、NPC/Event、动态 tile、Items/Inventory、auth hook 和 SaveStorageStrategy；不自研通用游戏循环、同步引擎或背包平台。
- Keycloak `26.7.1` 管理身份与会话；`oidc-provider` `9.11.1` 只把 ParallelLines 一次性票据适配为 OIDC，不保存论坛密码或建第二个用户库。
- 镜像岛游戏数据使用 Prisma `7.9.1` + 独立 PostgreSQL 17；Keycloak 和游戏分库、分凭据、分 volume。
- 已评审的九表范围只允许一个基线 migration。应用启动不建表；生产使用一次性 migration 镜像执行 `prisma migrate deploy`。
- Keycloak/RPGJS token、密码、ticket、数据库 URL、SSO secret 和 cookie key 不进 URL、浏览器存储、Git、镜像或日志。
- 固定虚构 Tilemap 是核心能力；现实地图、经纬度、定位、现实 POI 和导航永久禁止。
- 每个新增方法或 helper 必须有方法级注释，说明用途、关键参数、返回结果和非显而易见约束。

## 开源优先

- 新增通用能力前必须检索成熟开源方案，核对官方来源、许可证/商用兼容、维护和安全记录、技术栈兼容、体积、数据归属、升级和退出成本。
- 优先边界清楚的窄集成；版本/提交必须锁定，不引用漂移主分支或来源不明镜像。
- 只有检索后没有合适方案，或接入成本/风险高于项目专用薄层时，才允许最小自研并记录拒绝原因。

## 数据库与不可逆操作

- 除非用户明确授权，禁止连接任何数据库，包括只读查询、连通性、统计和结构探测。
- 新表/字段/migration 必须先提交结构、数据影响、部署和 forward-fix 范围并得到批准；同一需求版本最多一个 migration。
- 破坏性 Git/文件/数据操作必须先核对精确绝对目标和完整 diff；不对根目录、主目录、未解析变量或通配递归目标执行删除。
- 旧 FableSpace 的 `fablespace` MySQL database、`fablespace_data` volume、备份、Schema/LLM/env 和 R2 `fablespace/` prefix 已获用户永久删除授权；必须保留论坛数据、`mirror_identity_db`、`mirror_game_db` 和 `game/` prefix。
- 撤销前检查工作区和目标文件完整 diff，只精确撤销自己的改动；不用整文件 restore 覆盖他人改动。

## 图片与第三方素材

- 当前只采用 pixel-boy 官方 `Ninja Adventure - Asset Pack` 已登记子集，官方来源 `https://pixel-boy.itch.io/ninja-adventure-asset-pack`，授权 CC0。
- 不从镜像、二次打包或来源不明仓库取材，不把完整素材包或图片二进制加入 Git。
- 采用项必须先上传不可变 `game/media/v1` 对象并登记 `deploy/cdn/game-media-manifest.json`；浏览器默认通过同源 `/game-media/v1` 读取。
- 每项记录官方来源、固定提交/快照哈希、原路径、处理、尺寸、字节、MIME 和 SHA-256；第三方 CC0 不伪造 prompt sidecar。
- 旧 `fablespace/` 对象已授权清退，不得被镜像岛引用。

## 权威来源与验证

- 权威入口：`README.md`、`docs/INDEX.md`、`docs/PRODUCT_BRIEF.md`、`docs/WHAT_NOT_TO_BUILD.md`、`docs/IMAGE_ASSETS_SPEC.md`、`docs/DEPLOYMENT.md`、`.trellis/spec/frontend/mirror-island-rpgjs.md`。
- 聊天与文档冲突时以用户最新明确决定为准，先同步权威合同再实现。
- 查看/解释保持只读；只有用户要求修改才变更代码、配置或数据。
- 结论只基于已检查代码、配置、数据、日志和运行状态；证据不足时说明缺口。

最小验证：

```powershell
npm --prefix .\apps\mirror-island run prisma:validate
npm --prefix .\apps\mirror-island run typecheck
npm --prefix .\apps\mirror-island test
npm --prefix .\apps\mirror-island run build
npm --prefix .\apps\mirror-island run build:server
docker compose -f docker-compose.yml -f deploy/docker-compose.mirror-island.yml config
```

- 身份/主题改动还要验收中文注册、论坛 SSO、再访、Remember Me、同名不合并、桌面/手机/200% zoom/键盘/错误状态。
- 持久化改动要在隔离 PostgreSQL 实际应用 migration，验证存档跨 Prisma/进程重连恢复，且生产数据路径健康不能只用 `/health` 代替。
- 改图片要核对 URL/key/尺寸/格式/字节/MIME/SHA-256/缓存头和 Git 跟踪图片二进制为零。
- 业务实现新增生产代码/配置并通过最小验证后立即 `git add`；测试、文档、截图和诊断产物不自动暂存。
