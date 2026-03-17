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

### P. 写回协议与可用性

- `P6` · `done` · 写回闭环前端接入与验证：在前端接入 `observe / dwell / mark` 三种动作入口，对接 `POST /api/world/event`，显示结构化状态变化，并验证同一 slice 回访时仍能看到写回痕迹。变更记录：[`docs/changes/2026-03-17-p6-writeback-frontend-verification.md`](changes/2026-03-17-p6-writeback-frontend-verification.md)。
- `P3` · `done` · 玩家写回权限与语义治理边界：见 [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)。
- `P4` · `done` · 历史深度 / Time Folds 协议：见 [`docs/TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)。
- `P5` · `done` · World Writeback Protocol 后端实现：[`fablemap/writeback.py`](../fablemap/writeback.py) 与 [`fablemap/web/router.py`](../fablemap/web/router.py) 已形成最小写回链路。

### D. 玩家参与与共创入口

- `D3` · `done` · 玩家参与感与城市神话共创主线收束：participation_modes（private_capsules/street_legends/repair_rituals）与 AIO2 镜头引擎 lens_hint 对齐，可见性语义（private/local_public/global）与写回协议统一。变更记录：[`docs/changes/2026-03-17-d3-co-creation-lens-alignment.md`](changes/2026-03-17-d3-co-creation-lens-alignment.md)。“玩家如何进入世界写回系统”作为产品入口重新整理，对齐参与面板、神话线程、可见性层级与写回语义，不再只作为叙事汇总文档。

### AIO. AI-native 架构演进

- `AIO1` · `done` · 世界编排器协议定义：见 [`docs/WORLD_ORCHESTRATOR_PROTOCOL.md`](WORLD_ORCHESTRATOR_PROTOCOL.md)。协议已完成，包含完整输入输出结构、8 种事件类型、失败降级策略、前后端消费关系。变更记录：[`docs/changes/2026-03-17-aio1-world-orchestrator-protocol-complete.md`](changes/2026-03-17-aio1-world-orchestrator-protocol-complete.md)。
- `AIO2` · `done` · 镜头引擎 / Lens Engine 协议：定义 `lens schema`、`vibe_profile -> lens` 映射、镜头切换时的资源包 / 文案 / 可见性 / 事件权重规则。变更记录：[`docs/changes/2026-03-17-aio2-lens-engine-complete.md`](changes/2026-03-17-aio2-lens-engine-complete.md)。
- `AIO3` · `done` · 世界记忆图谱：设计玩家、POI、zone、route、echo、历史片段与阵营关系的统一记忆索引结构。变更记录：[`docs/changes/2026-03-17-aio3-memory-graph-complete.md`](changes/2026-03-17-aio3-memory-graph-complete.md)。
- `AIO4` · `done` · 行为到意义编译器：把连续行为模式编译成高阶世界含义，为个性化反馈与私人神话层提供中间层。五维语义向量（explorer/chronicler/restorer/recluse/resonant）+ myth_entry 映射，集成至编排器。变更记录：[`docs/changes/2026-03-17-aio4-behavior-compiler-complete.md`](changes/2026-03-17-aio4-behavior-compiler-complete.md)。
- `AIO5` · `planned` · 城市人格代理：定义城市如何基于玩家路径、停留、写回与回访形成持续人格与回应。
- `AIO6` · `planned` · 生成式场景胶囊规范：定义局部生成式表现层的触发条件、输入结构、输出格式与失败降级边界。

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

- `M1` · `in_progress` · 双资源包地图资产主线收束：作为配套主线继续推进，但必须服从镜头系统、确定性映射和前端真实接入需求。
- `M2` · `in_progress` · 地图资源生成与落盘：继续推进 Pack A / Pack B 的生成与规范化，但不应替代当前写回与编排主线。
- `M3` · `planned` · 地图资源验收与前端接入基线：为后续主舞台资源映射提供统一验收口径。

---

## P2：依赖上游成立后再推进的任务

### E. 社会化与轻社区

以下任务依赖 `P6 + AIO1`，当前不宜提前扩写：

- `E1` · `planned` · 都市精灵共同发现、互助与交换生态
- `E2` · `planned` · 公共地标修复任务与城市荣誉榜
- `E3` · `planned` · 玩家命名权、地点传说与地点气质演化
- `E4` · `planned` · 玩家据点、幽灵回放与城市身份系统

### F. 世界规则治理与现实输入

- `F1` · `planned` · 审美宪法投票与社区转义规则治理
- `F2` · `planned` · 现实行为输入与人为扰动接口
- `F3` · `planned` · 地理脚本注入与创作者权限模型

### G. 沉浸式世界事件

- `G1` · `planned` · 异世界电台与音景叙事层
- `G2` · `planned` · 城市觉醒事件、世界 Boss 与阵营战争长期路线

---

## 当前推荐认领顺序

### 第一优先级

1. `P6`：把写回闭环真正接进前端并可验证
2. `D3`：把玩家参与与共创语义收束成统一入口
3. `AIO1`：定义世界编排器协议边界

### 第二优先级

4. `AIO2`：补齐镜头引擎协议
5. `AIO3`：设计世界记忆图谱
6. `M3`：补资源验收与前端接入基线

### 第三优先级

7. `AIO4`
8. `AIO5`
9. `AIO6`
10. `E1-E4`

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
