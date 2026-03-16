# FableMap AI 协作共享任务列表 v0.1

## 目的

这份文档是当前仓库内统一的共享任务入口。

目标是把聊天中沉淀出的任务，转成可被多位开发者 / AI 协作者查看、认领、分工和持续更新的正式任务表，而不是散落在会话里。

## 使用方式

1. 先阅读本表，选择一个任务。
2. 若任务属于新模块、跨文件改动、协议相关或其他中高风险工作，先在 `docs/claims/` 新增认领说明。
3. 认领说明中引用本表任务 ID 或任务名，并写清范围与不改边界。
4. 开发完成后补对应 `docs/changes/` 文档，并在 PR / 提交说明中引用。

## 状态约定

- `planned`：已进入共享列表，但还没人认领
- `claimed`：已认领，尚未进入实现
- `in_progress`：正在开发
- `blocked`：存在依赖或阻塞
- `done`：已完成并并入主线

## 当前基础能力（已完成，不再作为首选认领项）

- `generate / inspect / demo / showcase / bundle / nearby / page` 最小闭环
- bundle HTML 预览页与入口页中英双语切换
- nearby 页面化入口、当前位置与预设地点体验
- 世界切片观察窗与浏览器 2D 世界地图过渡基础
- Web-2D 路线、审美系统、文化诠释与视觉气质文档
- 万物转义协议 / Universal Transmutation Protocol 基线文档
- Dual-Track Mapping 规则表 v0.1 初稿文档
- 动态扰动解释层与状态接口对齐文档

## P0：当前优先认领任务

### P. 协议与世界语法

- `P3` · `done` · 玩家写回权限与语义治理边界：已完成 [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](docs/WORLD_WRITEBACK_GOVERNANCE.md) 协议文档，定义 `private / local_public / global` 三层写回完整语义、AI 改写边界、moderation 审核机制、生命周期管理与系统衔接规则。
- `P4` · `planned` · 历史深度 / 尘封之眼 / Time Folds 协议 v0.1：定义历史证据来源、可信度、旧地标回声、深层入口与跨时间任务生成边界；优先级位于统一写回协议与治理边界之后。
- `P5` · `in_progress` · World Writeback Protocol v0.1：已新增 [`docs/WORLD_WRITEBACK_PROTOCOL.md`](docs/WORLD_WRITEBACK_PROTOCOL.md) 协议草案，统一 `event / target / effect / visibility` 结构，并以 `observe / dwell / mark` 作为首批最小写回行为；后续进入 API / 持久化最小闭环实现阶段，实施顺序见 [`docs/WORLD_WRITEBACK_PLAN.md`](docs/WORLD_WRITEBACK_PLAN.md)。

### A. 浏览器主舞台 / Web-2D

- `W1` · `done` · 地图式世界观察窗 v1：`bundle/index.html` 已接入基于 `roads / pois / landmarks` 的 SVG 地图主舞台与地点详情切换，但这仍是浏览器 2D 世界地图本体前的过渡层。
- `W1a` · `done` · 地图观察窗 v1 收尾验证与文档同步：已补相关测试、README / change 文档，并完成本轮最小验证与回归检查。
- `W2` · `done` · 浏览器内 2D 世界地图骨架 v0.1：已把 preview 重组为 `world-shell -> world-map-stage -> world-secondary-panels`，让地图舞台成为主入口，侧边详情与次级信息面板退为附属层，同时保留现有 SVG 空间渲染、i18n 与要素选中链路。
- `W3` · `done` · 2D 世界地图交互层与侧边信息面板：已为地图本体补齐平移（鼠标拖拽 / 触摸）、缩放（滚轮 / 双指捏合 / 缩放按钮）、悬停 tooltip、选中态聚焦（easeInOut 相机动画）与侧边详情联动。

### A2. 地图资源 / Map Assets

- `M1` · `planned` · 双资源包地图资产主线收束：将 `docs/MAP_ASSETS_PLAN.md`、`docs/MAP_ASSETS_GENERATION_GUIDE.md` 与 `scripts/generate_map_assets.py` 收束为共享任务主线，明确 Pack A / Pack B 的 scene、icons、tiles 输出规范，并为后续资源生成、验收与前端接入建立统一入口。
- `M2` · `planned` · 地图资源生成与落盘：按 Map Assets Plan 生成 Pack A（Dream-Glade Night）与 Pack B（Pastoral Storybook）两套资源包，输出到 `fablemap/demo_assets/new_map_assets/`，覆盖场景图、图标与 tile 资源。
- `M3` · `planned` · 地图资源验收与前端接入基线：验证双资源包在尺寸、透明背景、图标语言、tile 可拼接性上的一致性，并为 `WorldMap` / bundle 预览页后续接入提供最小资源映射基线。

### B. 视觉转义 / 模式切换

- `V1` · `done` · OSM -> 2D 建筑实体视觉转义规则库：已实现 15 种 fantasy_type 语义图标（公园 / 医院 / 补给站 / 权力塔 / 茶馆 / 学院 / 银行 / 餐厅 / 快餐 / 图书馆 / 礼拜场所 / 停车场 / 药店 / 健身房 / 写字楼）+ landmark 专属图标 + 道路三层级渲染（主干道 / 街道 / 步行路），图例同步更新。
- `V2` · `done` · 现实路况 -> NPC / 拥挤隐喻动态代理层：已基于 disturbance_level / spawn_window / poi_states 实现区域氛围脉动色晕、NPC 流动代理点、POI 状态徽章（idle/active/anomaly）及侧边扰动指标面板（social_tension / commerce_flux / anomaly_pressure）。
- `V3` · `done` · 治愈向精灵收集与情感锚点 MVP 钩子：已实现 comfort_level 驱动的暖金色晕、sprites 旋转菱形收集节点（spawn_window=active/rare 时显示）、memory_anchors 心形情感锚点标记，overview 面板补充 comfort/sprite/anchor 统计。

### C. 参与感 / 共创

- `C1` · `done` · 全城播报系统：已基于 social_tension/commerce_flux/anomaly_pressure/comfort_level/spawn_window/active_lens/disturbance_level 生成规则驱动世界播报文字，CSS keyframe 无缝横向滚动条插入地图底部，支持 hover 暂停，双语 i18n。
- `C2` · `done` · 情绪胶囊、私密留言与地点记忆回声：已实现 historical_echoes 悬浮文字回声层（地标旁淡入淡出 SVG text）、情绪胶囊泡泡标记（private_marks 派生自 secret_slot POI emotion_hook）、地标 detail-card 补充回声摘要 echo-panel。
- `C3` · `done` · 镜像家园与现实住所锚点系统：已实现 home_style 基于 comfort_level 派生（verdant_nest/warm_corner/blank_slate）、世界中心坐标投影为房屋形状 SVG 锚点（呼吸光晕 + 颜色随 home_style 变化）、侧边栏 home-panel 展示 home_style/inventory/reputation。

## P1：第二层协作任务

### D. 世界入口深化

  - `D1` · `done` · 语义坍缩与缩放变形效果钩子：已为地图主舞台补充 semantic zoom tier（`survey / district / intimate`），缩放时同步更新 `data-zoom-tier` 与语义提示条，并通过 CSS 让标签、POI / landmark 强调度、回声 / 胶囊 / 精灵 / home anchor 随镜头层级发生可见变化。
  - `D2` · `done` · 像素角色行走与街道通行抽象：已实现 WASD/方向键控制的玩家实体、基于道路骨架的通行限制与滑动逻辑、以及自动随人移动的相机跟随系统；玩家状态设计基线已整理至 [`docs/PLAYER_STATE.md`](docs/PLAYER_STATE.md)。
  - `D3` · `in_progress` · 玩家参与感与城市神话共创主线文档化收束：已补充 `world.co_creation` 共创数据块（city_myth_stage / participation_modes / open_threads）、showcase `co_creation_storyline` 字段、`mythline_threads` / `participation_entries` 细粒度共创线索、bundle 预览页神话线索面板与参与入口面板（含双语 i18n）；world_builder RULES 同步扩展至 15 种 fantasy_type。

### E. 社会化与轻社区

- `E1` · `planned` · 都市精灵共同发现、互助与交换生态。
- `E2` · `planned` · 公共地标修复任务与城市荣誉榜。
- `E3` · `planned` · 玩家命名权、地点传说与地点气质演化。
- `E4` · `planned` · 玩家据点、幽灵回放与城市身份系统。

## P2：长期 / 高风险任务

### F. 世界规则治理与现实输入

- `F1` · `planned` · 审美宪法投票与社区转义规则治理。
- `F2` · `planned` · 现实行为输入与人为扰动接口（Proof of Commute / 祝福诅咒等）。
- `F3` · `planned` · 地理脚本注入与创作者权限模型。

### G. 沉浸式世界事件

- `G1` · `planned` · 异世界电台与音景叙事层。
- `G2` · `planned` · 城市觉醒事件、世界 Boss 与阵营战争长期路线。

## 当前会话未完成任务同步备注

- 会话中的 `实现地图式世界观察窗` 已对应到 `W1`。
- 会话中的 `补测试文档并完成地图观察窗提交推送` 已对应到 `W1a`。
- 会话中明确的“不要只是像 2D，而是就是 2D 世界地图”已收束到 `W2` / `W3` 的任务口径中。
- 会话中的协议拆分未完成项已对应到 `P3`、`P4`。
- 会话中的 Web-2D 主舞台未完成项已对应到 `W2`、`W3`、`D1`、`D2`。
- 会话中的视觉转义未完成项已对应到 `V1`、`V2`、`V3`。
- 会话中的玩家参与 / 城市共创未完成项已对应到 `C1`、`C2`、`C3`、`D3`、`E1`、`E2`、`E3`、`E4`。
- 会话中新增收束的“统一世界写回协议 + 最小写回闭环”已对应到 `P5`，分阶段实施计划见 [`docs/WORLD_WRITEBACK_PLAN.md`](docs/WORLD_WRITEBACK_PLAN.md)。
- 会话中的规则治理、现实输入与长期世界事件未完成项已对应到 `F1`、`F2`、`F3`、`G1`、`G2`。
- 新进入仓库的地图资源包规划、生成脚本与生成说明，已收束到 `M1`、`M2`、`M3`。

## 认领建议

- 改代码前，先在 `docs/claims/` 新增认领说明，不要直接抢做。
- 同一时间尽量只认领一个 P0 或一个跨文件任务，避免边界重叠。
- 如果任务会改协议、命名、字段或多模块接口，应先拆成设计文档任务，再拆实现任务。
- 若共享任务列表与实际仓库进度不一致，应在同一批提交中同时更新任务状态和变更说明。

## 维护原则

- 本表优先保留“当前值得认领”的任务，不追求把所有历史细节无限堆满。
- 历史已完成事项以 `README.md`、`docs/changes/` 与认领说明归档为准。
- 新任务进入本表前，最好先说明它属于哪条主线：Web-2D、视觉转义、参与感、治理、世界事件。

