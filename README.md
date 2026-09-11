# 镜像岛

开发目标分为两阶段：**第一阶段完整复刻《星露谷物语》，第二阶段补充和替换镜像岛自己的内容**。旧十系统计划只作为先行批次，完整范围与完成标准见 [两阶段开发目标](docs/PHASE_PLAN.md)。

当前客户端为 **Godot 4.7.2 + GDScript**，正式产品面向原生桌面版，保留同工程 Web 试玩。本次迁移已接入原有玩法并切换默认开发/构建入口，按用户要求纳入 `main`；完整真人验收与线上发布结果仍需分别核验。操作与验证范围见 [Godot 工程说明](apps/mirror-island/godot/README.md)。

镜像岛是一款东方风格的单人像素生活 RPG。当前保留种田、采集、钓鱼和日常社交，玩法由本地 GDScript GameSession 统一处理；不依赖账号、游戏服务器或数据库。真实城市生成、改名及新玩法没有在这次迁移中实施。

RPGJS 和 Phaser/Colyseus 多人技术切片均已封存，不再是活跃运行时。公开根入口 `/` 只服务镜像岛单人主线。

当前 Godot 内容包括 12 个区域、六种普通春作与春季野种、五件基础工具、12/24/36 格背包与快捷行、制作、箱子存取 / 摆放 / 推移、共享出货与日结报告、木匠服务、四项生活技能、首批职业与配方、品质肥料、围栏、湖河钓鱼、时间 / 体力 / 天气、八名 NPC 日程 / 对话 / 送礼 / 委托、猫狗与分层角色外观。

地表工具、小屋与两处商店精修均已提交并进入本地 `main`。春季 v10 有历史真人通过记录；后续批次的真人反馈和当前部署需分别核验，详见 [当前状态](docs/CURRENT_STATE.md)。

**当前：浅层矿洞、铜冶炼与铜工具 v1 的 MINE-0 合同已完成。** 下一批是第 1–5 层、楼梯、电梯、重置和存档底座；生产代码尚未开始，随后再接熔炉与铜工具。既有真人验收尾项和完整计划见 [开发计划](docs/DEVELOPMENT_PLAN.md)。

## 新主线底座

- Godot `4.7.2` 标准版 + GDScript：原生场景、界面、输入、声音和游戏规则。
- `godot/domain` 的 GameSession：唯一可变状态所有者，关键操作先保存候选再发布。
- Web 使用独立 IndexedDB 槽，Windows 使用原子文件保存；不迁移或覆盖旧 Phaser 开发档。
- Node.js / TypeScript 保留为内容准备、构建工具和独立服务端；旧客户端与 TypeScript 玩法已清理，历史规则只从归档规范与 Git 历史查证。
- Keycloak `26.7.1`：保留的身份与论坛 OIDC 代理基础设施；当前试玩客户端不接入。
- `oidc-provider` `9.11.1`：将 ParallelLines 现有一次性票据适配为标准 OIDC。
- Prisma `7.9.1` + PostgreSQL 17：保留已评审的后端数据基础设施，未来云能力另行评审；当前本地玩法不接入。
- Nginx：`/`、`/identity/`、`/forum-sso/` 和 `/game-media/v1/` 同域路由；单人玩法不提供 WebSocket 路由。

## 本地开发

```powershell
npm --prefix .\apps\mirror-island ci --ignore-scripts
npm --prefix .\apps\mirror-island run godot:setup
npm --prefix .\apps\mirror-island run dev:client
```

本地 Web 默认地址为 `http://127.0.0.1:8080/`，开发命令先准备素材并导出 Web。需要 Node.js 22 和 Python 3；Windows/Linux x86_64 的引擎与模板按锁文件下载到忽略的 `artifacts/`。原生编辑器使用 `godot:editor`，Windows 导出使用 `build:windows`。不需要启动 Keycloak、游戏服务端或 PostgreSQL，也不需要复制任何数据库凭据。

## 最小检查

```powershell
npm --prefix .\apps\mirror-island run typecheck
npm --prefix .\apps\mirror-island run build:client
npm --prefix .\apps\mirror-island run build:windows
npm --prefix .\apps\mirror-island run build:server
```

数据库只有一个已评审 migration，位于 `apps/mirror-island/prisma/migrations/20260819000000_mirror_island_baseline/`。生产通过一次性 migration 镜像执行 `prisma migrate deploy`，不在游戏启动时建表。

## 资源

游戏图片优先使用经许可审核和登记的成熟素材。正式 Farm/Town 直接使用 VectoRaith Farming Sim v1.08 的 6 张官方 Original/16×16 PNG，不再裁剪、重排、合图或重编码；Ninja Adventure 只保留室内技术占位。采用项位于不可变 `game/media/v1` CDN 命名空间，Git 不跟踪游戏图片二进制。详见 [图片与美术规范](docs/IMAGE_ASSETS_SPEC.md)。

## 文档

- [文档索引](docs/INDEX.md)
- [当前状态](docs/CURRENT_STATE.md)
- [下一步开发计划](docs/DEVELOPMENT_PLAN.md)
- [产品简报](docs/PRODUCT_BRIEF.md)
- [明确不做](docs/WHAT_NOT_TO_BUILD.md)
- [Town 后续开发路线图](docs/TOWN_ROADMAP.md)
- [现阶段精细化验收门禁](docs/CURRENT_SLICE_POLISH_GATE.md)
- [生产部署](docs/DEPLOYMENT.md)
- [Godot 单人运行时规范](docs/architecture/GODOT_RUNTIME.md)
- [Phaser 历史规则来源](docs/architecture/PHASER_RUNTIME_ARCHIVE.md)
