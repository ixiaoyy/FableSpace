# FableMap AI 协作共享任务列表（当前有效版）

## 文档定位

这份文档是当前仓库里**唯一有效的共享任务认领入口**。

它服务于三件事：

1. 协作者判断当前值得投入的任务
2. 协作者在开始改动前明确任务边界
3. 协作者在完成后同步更新认领与变更记录

如果与其他阶段性任务文档冲突，以本文件、[`docs/CURRENT_TASKS.md`](CURRENT_TASKS.md) 与当前协议文档为准。

---

## 使用方式

1. 先阅读 [`docs/README.md`](README.md) 理解当前文档入口
2. 阅读 [`docs/CURRENT_TASKS.md`](CURRENT_TASKS.md) 判断当前主线
3. 在本表中选择一个任务
4. 若任务属于协议、新模块、跨文件或高风险改动，先在 [`docs/claims/`](claims/) 新增认领说明
5. 完成后补 [`docs/changes/`](changes/) 变更记录，并同步任务状态

---

## 状态约定

- `planned`：已进入共享列表，但还没人认领
- `claimed`：已认领，尚未进入实现
- `in_progress`：正在推进
- `blocked`：存在依赖或阻塞
- `done`：已完成并并入主线
- `reference_only`：仅保留参考价值，不作为当前优先认领项

---

## 当前基础能力（已完成，不再作为优先认领项）

- `generate / inspect / demo / showcase / bundle / nearby / page / api` 基础闭环
- FastAPI + React + Vite 当前工程化结构
- 浏览器内 2D 世界地图主舞台基础能力
- 世界写回后端最小实现（`observe / dwell / mark`）
- 写回治理协议与时间褶皱协议基础
- 基础地图资源规划与生成链路
- 世界观察窗、共创入口、回声、镜像家园等前置体验层

---

## P0：当前最高优先级任务

### T0. 工程收敛与可维护性治理

- `T0.1` · `planned` · 主链路收束：将当前唯一主链路固定为 `坐标输入 -> nearby preview -> world map -> writeback -> feedback`，把 orchestration、ghost trace、disturbance、scene capsule、city persona 统一标记为增强或实验模块，不再并列主线。依据：[`docs/CURRENT_TASKS.md`](CURRENT_TASKS.md)。
- `T0.2` · `planned` · 前端边界拆分：继续收敛 [`frontend/src/App.jsx`](../frontend/src/App.jsx) 与 [`frontend/src/hooks/useWorldSession.js`](../frontend/src/hooks/useWorldSession.js)，拆分 API、session persistence、writeback、map layers、poi filters 与页面装配职责，建立共享配置单一来源。
- `T0.3` · `planned` · 地图模块治理：拆分 [`frontend/src/WorldMap.jsx`](../frontend/src/WorldMap.jsx) 中的 palette、icon、road style、tag label 配置，以及 geometry、occupancy、asset preload、renderer 等职责，避免继续向超大地图组件叠加核心逻辑。
- `T0.4` · `planned` · 后端服务层收敛：以 [`fablemap/api_service.py`](../fablemap/api_service.py) 为当前已存在的应用入口基线，后续新增领域逻辑优先进入独立 application / domain 模块；历史文档中对 `fablemap/web/service.py` 的引用应视为待清理旧口径。
- `T0.5` · `planned` · 质量护栏补齐：为 nearby、writeback、orchestrate 等核心链路补 contract test、纯函数测试，以及 lint / format / type-check 基线。

### P. 写回闭环补平

- `P6-R1` · `planned` · 写回主链路补平：在现有 `observe / dwell / mark / repair` 基础上，统一前端事件 payload、反馈渲染、错误处理与回访可见性验证，确保写回能力从“已接入”提升为“稳定可验证”。关键实现基线见 [`frontend/src/hooks/useWorldSession.js`](../frontend/src/hooks/useWorldSession.js) 与 [`fablemap/writeback.py`](../fablemap/writeback.py)。
- `P3` · `done` · 玩家写回权限与语义治理边界：见 [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)。
- `P4` · `done` · 历史深度 / Time Folds 协议：见 [`docs/TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)。
- `P5` · `done` · World Writeback Protocol 后端实现：见 [`fablemap/writeback.py`](../fablemap/writeback.py)。
- `P6` · `done` · 写回闭环前端接入与验证：变更记录：[`docs/changes/2026-03-17-p6-writeback-frontend-verification.md`](changes/2026-03-17-p6-writeback-frontend-verification.md)。

### D. 玩家参与与共创入口

- `D3-R1` · `planned` · D3 口径收束与共享入口对齐：保留 [`D3`](AI_SHARED_TASKLIST.md:61) 作为“玩家如何进入世界写回系统”的产品入口，但后续文档与实现必须与写回协议、可见性边界与前端入口保持单一口径，不再分裂成独立叙事支线。
- `D3` · `done` · 玩家参与感与城市神话共创主线收束：变更记录：[`docs/changes/2026-03-17-d3-co-creation-lens-alignment.md`](changes/2026-03-17-d3-co-creation-lens-alignment.md)。

### AIO. AI-native 架构演进准备

- `AIO1-R1` · `planned` · 编排器落地准备：在 [`docs/WORLD_ORCHESTRATOR_PROTOCOL.md`](WORLD_ORCHESTRATOR_PROTOCOL.md) 已完成的前提下，优先收束现有 `world_state / player_state / writeback_events / governance / time folds` 的实现消费边界，明确失败降级与前后端接线方式。
- `AIO2-R1` · `planned` · 镜头引擎接线准备：基于已完成协议，为 `vibe_profile -> lens`、资源包切换、文案口吻、可见性与事件权重建立明确接线点，避免继续把镜头能力散落到视图层和地图渲染层。
- `AIO3-AIO6` · `reference_only` · 世界记忆图谱、行为到意义编译器、城市人格代理、生成式场景胶囊协议均已完成并保留为下一阶段参考，不作为当前最高优先实现主线。

---

## P1：可继续推进，但不应盖过主线的任务

### A. 浏览器主舞台 / Web-2D

- `W1` · `done` · 地图式世界观察窗 v1
- `W1a` · `done` · 地图观察窗 v1 收尾验证与文档同步
- `W2` · `done` · 浏览器内 2D 世界地图骨架 v0.1
- `W3` · `done` · 2D 世界地图交互层与侧边信息面板
- `D1` · `done` · 语义坍缩与缩放变形效果钩子
- `D2` · `done` · 像素角色行走与街道通行抽象

### B. 视觉转义 / 模式切换

- `V1` · `done` · OSM -> 2D 建筑实体视觉转义规则库
- `V2` · `done` · 现实路况 -> NPC / 拥挤隐喻动态代理层
- `V3` · `done` · 治愈向精灵收集与情感锚点 MVP 钩子

### C. 参与感基础层

- `C1` · `done` · 全城播报系统
- `C2` · `done` · 情绪胶囊、私密留言与地点记忆回声
- `C3` · `done` · 镜像家园与现实住所锚点系统

### M. 地图资源 / Map Assets

- `M1` · `done` · 双资源包地图资产主线收束：Pack A / Pack B 资源包已对齐镜头系统与确定性映射，前端接入基线已落地。变更记录：[`docs/changes/2026-03-16-map-assets-mainline-consolidation.md`](changes/2026-03-16-map-assets-mainline-consolidation.md)。
- `M2` · `done` · 地图资源生成与落盘：Pack A / Pack B 完整资源（scene、icons、tiles、buildings、decorations）已生成并落盘至 `fablemap/demo_assets/new_map_assets/`，key 资源已同步至 `frontend/src/assets/map-packs/`。
- `M3` · `done` · 地图资源验收与前端接入基线：`manifest.js` 已暴露 buildings/decorations 分层，`iconMapping.js` 已补全 `FANTASY_TYPE_TO_BUILDING` 与 `FANTASY_TYPE_TO_DECORATION` 映射，`WorldMap.jsx` 已接入建筑 sprite 渲染层（有 sprite 时替代向量房屋，无则自动降级），构建验证通过。

---

## P2：依赖上游成立后再推进的任务

### E. 社会化与轻社区

以下任务依赖 `P6 + AIO1`，当前不宜提前扩写：

- `E1` · `planned` · 都市精灵共同发现、互助与交换生态
- `E2` · `done` · 公共地标修复任务与城市荣誉榜：repair 事件类型与 landmark 目标类型已接入写回层，honor_board 生成（修复 ≥2 次触发），新增 GET /api/world/landmark/honor/{slice_id} 端点，前端写回面板支持 repair 动作并展示荣誉榜。变更记录：[`docs/changes/2026-03-21-e2-landmark-repair-honor.md`](changes/2026-03-21-e2-landmark-repair-honor.md)。
- `E3` · `done` · 玩家命名权、地点传说与地点气质演化：地点传说基线已落地——mark 积累 ≥3 触发 place_legend 生成（碎片/传说/史诗三级、dominant_vibe、narrative 文本），前端写回面板展示。变更记录：[`docs/changes/2026-03-21-e3-place-legend-vibe-shift.md`](changes/2026-03-21-e3-place-legend-vibe-shift.md)。
- `E4` · `done` · 玩家据点、幽灵回放与城市身份系统：幽灵回放前端接入基线已落地——ghost traces 加载（world 加载后自动拉取）、WorldMap 渲染路径修复（waypoints → POI 坐标 → 虚线路径）、observe 写回自动积累 waypoint 并满 3 个后提交。变更记录：[`docs/changes/2026-03-20-e4-ghost-trace-frontend-wiring.md`](changes/2026-03-20-e4-ghost-trace-frontend-wiring.md)。

### F. 世界规则治理与现实输入

- `F1` · `planned` · 审美宪法投票与社区转义规则治理
- `F2` · `done` · 现实行为输入与人为扰动接口：内存扰动覆盖层已接入 dynamic_signals（weather/traffic_level/crowd_density/is_holiday/event_tag），三个 REST 端点（注入/清除/查看），前端扰动注入面板。变更记录：[`docs/changes/2026-03-21-f2-disturbance-input-interface.md`](changes/2026-03-21-f2-disturbance-input-interface.md)。
- `F3` · `planned` · 地理脚本注入与创作者权限模型

### G. 沉浸式世界事件

- `G1` · `planned` · 异世界电台与音景叙事层
- `G2` · `planned` · 城市觉醒事件、世界 Boss 与阵营战争长期路线

---

## 当前推荐认领顺序

### 第一优先级

1. `T0.1-T0.3`：先完成主链路收束、前端边界拆分与地图模块治理
2. `T0.4-T0.5`：补齐后端服务层收敛与测试 / type-check / lint 护栏
3. `P6-R1`：把写回链路从“已接入”补平为“稳定可验证”

### 第二优先级

4. `D3-R1`：统一玩家参与入口、可见性语义与前端共享口径
5. `AIO1-R1`：把编排器协议从文档层推进到实现接线准备
6. `AIO2-R1`：明确镜头引擎与资源包 / 文案 / 权重的接线点

### 第三优先级

7. `M1-M3`：继续地图资源与前端资产基线，但不得盖过主链路
8. `E1-E4`：依赖写回闭环与编排层，不应提前扩张
9. `F1-F3 / G1-G2`：保留为中长期方向

---

## 当前不建议继续作为主线扩写的方向

以下内容可以保留历史价值，但不应继续作为当前优先任务口径：

1. 单纯继续堆地图表现层
2. 在镜头引擎与编排层缺位时优先扩写更多 UI 面板
3. 把 bundle 页面继续当成长期核心产品形态
4. 继续以 Godot-first 作为近期项目叙事
5. 转向全 AI 视频流主世界

边界参考：

- [`docs/ARCHITECTURE_PRINCIPLES.md`](ARCHITECTURE_PRINCIPLES.md)
- [`docs/WHAT_NOT_TO_BUILD.md`](WHAT_NOT_TO_BUILD.md)

---

## 当前会话与历史文档的处理口径

- 本表保留“当前值得认领”的任务，不再堆叠所有阶段性讨论
- 历史细节以 [`docs/changes/`](changes/) 与 [`docs/claims/`](claims/) 为准
- 若旧文档与本表冲突，应优先更新旧文档或将其降级为参考材料
- [`docs/AI_SHARED_TASKLIST_V2.md`](AI_SHARED_TASKLIST_V2.md) 不再作为当前入口，避免双版本任务表并存

---

## 维护原则

1. 同类任务只保留一个当前有效入口
2. 协议优先于实现，边界优先于扩写
3. 任何新任务都应说明它属于：写回、编排、镜头、记忆、主舞台、资源还是长期体验
4. 若任务与当前代码状态不一致，应先修正文档口径再继续推进
