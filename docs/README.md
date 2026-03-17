# FableMap 文档总览

## 文档整理原则

当前仓库文档按以下原则重新编排：

1. **先看当前主线，再看专题协议**
2. **优先信任仍与当前代码状态一致的文档**
3. **历史变更、认领说明、阶段性判断与已过时草案，不再作为主入口**
4. **存在冲突时，以当前总览、当前任务、当前协议文档为准**

---

## 先读这些（当前有效主入口）

### 1. 项目总览

- [`README.md`](../README.md)
- [`docs/PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
- [`docs/TECH_STACK.md`](TECH_STACK.md)

### 2. 当前方向与任务

- [`docs/EVOLUTION_DIRECTION.md`](EVOLUTION_DIRECTION.md)
- [`docs/CURRENT_TASKS.md`](CURRENT_TASKS.md)
- [`docs/AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md)
- [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md)
- [`docs/AIO1_WORLD_ORCHESTRATOR_PLAN.md`](AIO1_WORLD_ORCHESTRATOR_PLAN.md)

### 3. 当前核心协议

- [`docs/WORLD_SCHEMA.md`](WORLD_SCHEMA.md)
- [`docs/PLAYER_STATE.md`](PLAYER_STATE.md)
- [`docs/WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
- [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
- [`docs/TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)

---

## 按主题阅读

### 一、产品与架构

- [`docs/PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)：项目定位与长期体验方向
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)：系统结构与模块关系
- [`docs/ARCHITECTURE_PRINCIPLES.md`](ARCHITECTURE_PRINCIPLES.md)：当前高优先级架构原则与边界
- [`docs/WHAT_NOT_TO_BUILD.md`](WHAT_NOT_TO_BUILD.md)：明确不做的方向
- [`docs/TECH_STACK.md`](TECH_STACK.md)：技术栈与当前工程实现边界

### 路演与对外表达

- [`docs/EXTERNAL_SWOT_AND_NEXT_STAGE_PRIORITIES.md`](EXTERNAL_SWOT_AND_NEXT_STAGE_PRIORITIES.md)：对外 SWOT、风险拆解与下一阶段优先级建议
- [`docs/STRATEGIC_ANALYSIS.md`](STRATEGIC_ANALYSIS.md)：内部战略分析与阶段优先级调整

### 二、当前执行与协作

- [`docs/CURRENT_TASKS.md`](CURRENT_TASKS.md)：当前项目管理视角下的主线任务
- [`docs/AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md)：共享任务认领入口
- [`docs/AI参与开发协议.md`](AI参与开发协议.md)：协作约定
- [`docs/changes/`](changes/)：变更记录
- [`docs/claims/`](claims/)：认领记录

### 三、世界协议与状态层

- [`docs/WORLD_SCHEMA.md`](WORLD_SCHEMA.md)
- [`docs/PLAYER_STATE.md`](PLAYER_STATE.md)
- [`docs/WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
- [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
- [`docs/WORLD_WRITEBACK_PLAN.md`](WORLD_WRITEBACK_PLAN.md)
- [`docs/TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)

### 四、AI-native 演进主线

- [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md)
- [`docs/AIO1_WORLD_ORCHESTRATOR_PLAN.md`](AIO1_WORLD_ORCHESTRATOR_PLAN.md)
- [`docs/ARCHITECTURE_PRINCIPLES.md`](ARCHITECTURE_PRINCIPLES.md)
- [`docs/WHAT_NOT_TO_BUILD.md`](WHAT_NOT_TO_BUILD.md)

### 五、地图主舞台与体验层设计

- [`docs/WEB_2D_SPIRIT_VIEW.md`](WEB_2D_SPIRIT_VIEW.md)
- [`docs/MAP_ABSTRACTION_RULES_V0_1.md`](MAP_ABSTRACTION_RULES_V0_1.md)：原型阶段地图抽象尺度、区域聚合与对象转译规则
- [`docs/DISTURBANCE_INTERFACE_ALIGNMENT.md`](DISTURBANCE_INTERFACE_ALIGNMENT.md)
- [`docs/DISTURBANCE_MODEL.md`](DISTURBANCE_MODEL.md)
- [`docs/DUAL_TRACK_MAPPING.md`](DUAL_TRACK_MAPPING.md)
- [`docs/FACTION_SYSTEM.md`](FACTION_SYSTEM.md)
- [`docs/CAUSAL_RIPPLE_ALGORITHM.md`](CAUSAL_RIPPLE_ALGORITHM.md)
- [`docs/CULTURAL_INTERPRETATION.md`](CULTURAL_INTERPRETATION.md)
- [`docs/STYLE_VIBES_MANIFESTO.md`](STYLE_VIBES_MANIFESTO.md)
- [`docs/AESTHETIC_EMOTION_SYSTEMS.md`](AESTHETIC_EMOTION_SYSTEMS.md)
- [`docs/LONG_TERM_EXPERIENCE.md`](LONG_TERM_EXPERIENCE.md)

### 六、地图资源与前端资产

- [`docs/MAP_ASSETS_PLAN.md`](MAP_ASSETS_PLAN.md)
- [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](MAP_ASSETS_GENERATION_GUIDE.md)
- [`docs/LOCAL_GPU_MAP_ASSETS_GUIDE.md`](LOCAL_GPU_MAP_ASSETS_GUIDE.md)
- [`docs/MAP_ASSETS_FRONTEND_BASELINE.md`](MAP_ASSETS_FRONTEND_BASELINE.md)

---

## 已删除的过时文档

以下文档已从主目录移除，不再作为当前协作入口：

- `AI_SHARED_TASKLIST_V2.md`
- `NEXT_PHASE_TECH_PRIORITY.md`
- `NEXT_PHASE_PROTOCOL_FOCUS.md`
- `ROADMAP.md`
- `PRD_V0.1.md`
- `ENGINEERING_PLAN_V0.1.md`
- `PLAN_2D_GAME_MAP_UPGRADE.md`
- `WEB_MVP_INTERACTION_LOOP_AI.md`

这些文档的问题主要包括：

- 与当前任务表或当前工程状态冲突
- 仍停留在早期原型 / Godot-first / 阶段性判断口径
- 已被当前协议、当前任务表与演进方向文档吸收
- 会增加协作者判断成本

---

## 当前推荐阅读顺序

### 如果你要做对外路演 / 对外说明

1. [`docs/PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)
2. [`docs/EXTERNAL_SWOT_AND_NEXT_STAGE_PRIORITIES.md`](EXTERNAL_SWOT_AND_NEXT_STAGE_PRIORITIES.md)
3. [`docs/STRATEGIC_ANALYSIS.md`](STRATEGIC_ANALYSIS.md)
4. [`docs/EVOLUTION_DIRECTION.md`](EVOLUTION_DIRECTION.md)


### 如果你第一次进入仓库

1. [`README.md`](../README.md)
2. [`docs/README.md`](README.md)
3. [`docs/EVOLUTION_DIRECTION.md`](EVOLUTION_DIRECTION.md)
4. [`docs/PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)
5. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
6. [`docs/CURRENT_TASKS.md`](CURRENT_TASKS.md)

### 如果你要参与当前协议 / 任务

1. [`docs/CURRENT_TASKS.md`](CURRENT_TASKS.md)
2. [`docs/AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md)
3. [`docs/WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
4. [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
5. [`docs/TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)
6. [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md)

### 如果你要参与前端 / 地图主舞台

1. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
2. [`docs/WEB_2D_SPIRIT_VIEW.md`](WEB_2D_SPIRIT_VIEW.md)
3. [`docs/MAP_ABSTRACTION_RULES_V0_1.md`](MAP_ABSTRACTION_RULES_V0_1.md)
4. [`docs/MAP_ASSETS_PLAN.md`](MAP_ASSETS_PLAN.md)
5. [`docs/MAP_ASSETS_FRONTEND_BASELINE.md`](MAP_ASSETS_FRONTEND_BASELINE.md)
6. [`docs/AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md)

---

## 维护规则

1. 新文档进入主入口前，必须明确它属于：产品 / 架构 / 协议 / 当前任务 / 变更记录 / 历史参考中的哪一类
2. 阶段性判断文档若已被正式协议或当前任务吸收，应降级为历史参考，不再并列作为主入口
3. 同类文档只保留一个当前有效入口，避免 `v1` / `v2` 并存且同时指导开发
4. 若某文档结论与代码现状冲突，应优先更新或降级该文档，而不是继续引用
