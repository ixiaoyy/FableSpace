# FableMap 文档总览

## 文档定位

这份文档用于说明当前仓库里各类文档的阅读顺序、信任层级与维护口径。

当前文档体系已经从“自绘地图 / Web-2D 主舞台优先”切换为：

> **真实底图 + 地点选择 + 角色遭遇 / 地点事件 + 聊天叙事 + writeback / memory**

因此阅读文档时应遵循以下原则：

1. **先看当前主线文档，再看协议文档**
2. **主线以当前产品方向与当前工程收束结果为准**
3. **旧地图渲染、地图资产包、Godot-first 方案只作为历史参考**
4. **若文档之间冲突，以当前主线文档优先**

---

## 当前主线入口（优先阅读）

### 1. 产品与架构

- [`README.md`](../README.md)
- [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`INDEX.md`](INDEX.md)

### 2. 当前任务与协作入口

- [`CURRENT_TASKS.md`](CURRENT_TASKS.md)
- [`AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md)
- [`AI参与开发协议.md`](AI参与开发协议.md)

### 3. 当前核心协议

- [`WORLD_SCHEMA.md`](WORLD_SCHEMA.md)
- [`WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
- [`WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
- [`TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)
- [`PLAYER_STATE.md`](PLAYER_STATE.md)
- [`WORLD_ORCHESTRATOR_PROTOCOL.md`](WORLD_ORCHESTRATOR_PROTOCOL.md)

---

## 按主题阅读

### 一、当前主线文档

这些文档定义“项目现在是什么、接下来做什么”。

- [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)：产品定义、目标体验、优先级取舍
- [`ARCHITECTURE.md`](ARCHITECTURE.md)：主链路、系统分层、模块边界
- [`CURRENT_TASKS.md`](CURRENT_TASKS.md)：当前执行主线
- [`AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md)：协作认领入口
- [`WHAT_NOT_TO_BUILD.md`](WHAT_NOT_TO_BUILD.md)：明确不做的方向
- [`INDEX.md`](INDEX.md)：文档导航索引

### 二、核心协议文档

这些文档描述当前仍然有效的世界结构、玩家状态、写回与编排协议。

- [`WORLD_SCHEMA.md`](WORLD_SCHEMA.md)
- [`WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
- [`WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
- [`TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)
- [`PLAYER_STATE.md`](PLAYER_STATE.md)
- [`WORLD_ORCHESTRATOR_PROTOCOL.md`](WORLD_ORCHESTRATOR_PROTOCOL.md)
- [`UNIVERSAL_TRANSMUTATION_PROTOCOL.md`](UNIVERSAL_TRANSMUTATION_PROTOCOL.md)

### 三、仍有参考价值的设计 / 演进文档

这些文档仍可用于理解演进逻辑，但不应覆盖当前主线文档。

- [`AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md)：AI-native 演进判断
- [`AIO1_WORLD_ORCHESTRATOR_PLAN.md`](AIO1_WORLD_ORCHESTRATOR_PLAN.md)：世界编排器实施计划
- [`ARCHITECTURE_PRINCIPLES.md`](ARCHITECTURE_PRINCIPLES.md)：架构决策过滤器
- [`EVOLUTION_DIRECTION.md`](EVOLUTION_DIRECTION.md)：历史阶段与路线收束说明
- [`DISTURBANCE_INTERFACE_ALIGNMENT.md`](DISTURBANCE_INTERFACE_ALIGNMENT.md)
- [`DISTURBANCE_MODEL.md`](DISTURBANCE_MODEL.md)

### 四、历史参考文档

以下文档保留历史价值，但**不再代表当前产品主线**：

- [`WEB_2D_SPIRIT_VIEW.md`](WEB_2D_SPIRIT_VIEW.md)
- [`MAP_ABSTRACTION_RULES_V0_1.md`](MAP_ABSTRACTION_RULES_V0_1.md)
- [`MAP_ASSETS_PLAN.md`](MAP_ASSETS_PLAN.md)
- [`MAP_ASSETS_GENERATION_GUIDE.md`](MAP_ASSETS_GENERATION_GUIDE.md)
- [`MAP_ASSETS_FRONTEND_BASELINE.md`](MAP_ASSETS_FRONTEND_BASELINE.md)
- [`LOCAL_GPU_MAP_ASSETS_GUIDE.md`](LOCAL_GPU_MAP_ASSETS_GUIDE.md)
- [`GODOT_INTEGRATION.md`](GODOT_INTEGRATION.md)
- [`LONG_TERM_EXPERIENCE.md`](LONG_TERM_EXPERIENCE.md)
- [`AESTHETIC_EMOTION_SYSTEMS.md`](AESTHETIC_EMOTION_SYSTEMS.md)
- [`FACTION_SYSTEM.md`](FACTION_SYSTEM.md)
- [`CAUSAL_RIPPLE_ALGORITHM.md`](CAUSAL_RIPPLE_ALGORITHM.md)

### 五、历史记录与协作留痕

这些内容保留，但不作为主线设计入口：

- [`changes/`](changes/)
- [`claims/`](claims/)

---

## 当前推荐阅读顺序

### 如果你第一次进入仓库

1. [`README.md`](../README.md)
2. [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)
3. [`ARCHITECTURE.md`](ARCHITECTURE.md)
4. [`CURRENT_TASKS.md`](CURRENT_TASKS.md)
5. [`AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md)
6. [`INDEX.md`](INDEX.md)

### 如果你要参与产品 / 架构判断

1. [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)
2. [`ARCHITECTURE.md`](ARCHITECTURE.md)
3. [`WHAT_NOT_TO_BUILD.md`](WHAT_NOT_TO_BUILD.md)
4. [`ARCHITECTURE_PRINCIPLES.md`](ARCHITECTURE_PRINCIPLES.md)
5. [`AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md)

### 如果你要参与协议与后端实现

1. [`WORLD_SCHEMA.md`](WORLD_SCHEMA.md)
2. [`WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
3. [`WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
4. [`PLAYER_STATE.md`](PLAYER_STATE.md)
5. [`WORLD_ORCHESTRATOR_PROTOCOL.md`](WORLD_ORCHESTRATOR_PROTOCOL.md)

### 如果你要理解旧地图链路为什么被降级

1. [`ARCHITECTURE.md`](ARCHITECTURE.md)
2. [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)
3. [`WEB_2D_SPIRIT_VIEW.md`](WEB_2D_SPIRIT_VIEW.md)
4. [`MAP_ABSTRACTION_RULES_V0_1.md`](MAP_ABSTRACTION_RULES_V0_1.md)
5. [`MAP_ASSETS_PLAN.md`](MAP_ASSETS_PLAN.md)
6. [`GODOT_INTEGRATION.md`](GODOT_INTEGRATION.md)

---

## 维护规则

1. 新文档必须先标明自己属于：主线文档 / 协议文档 / 参考设计 / 历史参考 / 历史记录 中的哪一类
2. 若某文档继续使用“自绘地图主舞台”“地图资产包优先”“Godot 近期主承载体”等旧口径，应降级或重写
3. 同一主题只保留一个当前有效主入口，避免多个版本同时指导开发
4. 若某文档结论与当前 [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md) 或 [`ARCHITECTURE.md`](ARCHITECTURE.md) 冲突，应优先更新该文档
5. 历史参考文档可以保留，但必须明确“仅供参考，不代表当前主线”

---

## 一句话说明

当前 FableMap 文档主线已经切换为：**真实底图承载现实地点，角色与事件驱动体验，聊天叙事与 writeback / memory 构成长期世界关系。**
