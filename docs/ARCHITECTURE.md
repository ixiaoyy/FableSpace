# FableMap 系统架构（当前 Web 主线版）

## 文档定位

本文档描述的是 FableMap **当前已经落地并应继续收束的实现架构**，不是早期的 Godot-first 设想，也不是长期愿景的泛化草图。

当前唯一主链路固定为：

> **坐标输入 -> nearby preview -> world map -> writeback -> feedback**

所有近期实现、重构、测试与协议接线，都应优先服务这条主链路。

---

## 当前阶段结论

FableMap 当前不是“验证地图能否显示”的阶段，而是“在稳定世界底座之上，把写回闭环补平，并为 AI-native 编排层建立清晰边界”的阶段。

当前已具备的稳定基础：

1. 基于 OSM / Overpass 的现实地理骨架
2. 结构化 `world` 数据与切片化世界生成能力
3. 浏览器内 2D 世界地图主舞台
4. 最小可用的世界写回协议与后端实现
5. FastAPI + React + Vite 的当前工程化结构
6. 围绕治理、时间褶皱、编排与镜头系统的协议文档基础

因此，架构目标不是继续发散功能，而是：

1. 固定唯一主链路
2. 收敛前后端模块边界
3. 补齐写回链路稳定性与可验证性
4. 为 orchestrator / lens 等 AI-native 能力预留明确接线点

---

## 当前架构总览

FableMap 当前应按“稳定底座 + Web 主舞台 + AI 增强边界”来理解。

### 第一层：Reality Kernel（现实内核）

职责：

- 接收坐标、半径等地理输入
- 拉取和清洗 OSM / Overpass 数据
- 提供道路、POI、zone、route 等稳定空间锚点
- 保证同一 slice 可验证、可缓存、可重建

当前落点：

- [`fablemap/overpass.py`](../fablemap/overpass.py)
- [`fablemap/api.py`](../fablemap/api.py)
- [`fablemap/api_service.py`](../fablemap/api_service.py)
- world build 相关模块

原则：

- 不让 AI 替代真实空间骨架
- 不让表现层决定世界结构
- 同一地理输入应尽可能产生稳定基础结果

### 第二层：Structured World State（结构化世界状态）

职责：

- 维护 `world` 数据及其可演化字段
- 保存 slice、POI、地点状态、玩家痕迹、写回事件等结构化信息
- 作为前端主舞台、写回协议、时间褶皱与后续编排器的共同事实来源

当前落点：

- [`fablemap/writeback.py`](../fablemap/writeback.py)
- [`fablemap/world_builder.py`](../fablemap/world_builder.py)
- [`fablemap/memory_graph.py`](../fablemap/memory_graph.py)
- world / player / event 相关数据结构与测试

原则：

- 世界真相必须可持久化、可回放、可验证
- 玩家痕迹必须附着在结构化对象上，而不是只存在于临时 UI 文案
- AI 输出若进入主世界，必须先结构化

### 第三层：Deterministic Surface Mapping（确定性表面映射）

职责：

- 将 `fantasy_type -> asset key`
- 将 `vibe_profile -> lens / pack`
- 将 world 数据映射为稳定的 2D 图层、图标、建筑与装饰资源
- 保证相同输入在 Web 主舞台上尽量得到一致视觉结果

当前落点：

- [`frontend/src/mapAssets/manifest.js`](../frontend/src/mapAssets/manifest.js)
- [`frontend/src/mapAssets/iconMapping.js`](../frontend/src/mapAssets/iconMapping.js)
- [`frontend/src/WorldMap.jsx`](../frontend/src/WorldMap.jsx)

原则：

- 地图主舞台是确定性渲染，不是即兴生成画面
- 资源包、标签映射、图标规则应集中治理，避免散落在页面层
- 视觉增强不能破坏主链路稳定性

### 第四层：Web Presentation & Interaction（Web 主舞台与交互层）

职责：

- 组织 `nearby preview -> world map -> writeback -> feedback` 前端闭环
- 暴露玩家可操作的 nearby、world、writeback、debug/admin 入口
- 呈现结构化反馈，而不是只做一次性提示
- 为回访、回声、历史与后续 orchestrator 输出提供消费入口

当前落点：

- [`frontend/src/App.jsx`](../frontend/src/App.jsx)
- [`frontend/src/hooks/useNearbySession.js`](../frontend/src/hooks/useNearbySession.js)
- [`frontend/src/hooks/useWorldSession.js`](../frontend/src/hooks/useWorldSession.js)
- [`frontend/src/hooks/useWritebackSession.js`](../frontend/src/hooks/useWritebackSession.js)
- 相关 panel / shell / status 组件

原则：

- Web 是当前正式主舞台
- 页面装配、session、API 与写回副作用应拆分治理
- 不允许继续把核心逻辑无限叠加到单一大文件中

### 第五层：AI-Native Augmentation Boundary（AI-native 增强边界）

这不是当前主链路本体，而是下一阶段的增强层接线边界。

职责：

- 读取 `world_state / player_state / writeback_events / governance / time_folds`
- 生成事件建议、镜头建议、排序建议、广播建议
- 在失败时回退到规则或静默降级，不影响主链路可用性

当前关联方向：

- [`fablemap/orchestrator/ai_engine.py`](../fablemap/orchestrator/ai_engine.py)
- [`fablemap/orchestrator/rule_engine.py`](../fablemap/orchestrator/rule_engine.py)
- [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md)
- [`docs/AIO1_WORLD_ORCHESTRATOR_PLAN.md`](AIO1_WORLD_ORCHESTRATOR_PLAN.md)

原则：

- AI 负责编排、解释、增强，不替代稳定世界底座
- AI 输出必须可被结构化消费
- 即使 AI 不可用，主链路也必须继续成立

---

## 当前唯一主链路

### 1. 坐标输入

用户输入坐标、半径或使用上一次会话定位，触发附近区域查询。

### 2. Nearby Preview

系统生成 nearby 预览结果，提供当前切片的世界入口与上下文摘要。

### 3. World Map

前端载入结构化 `world` 数据，在 Web 2D 主舞台中进行确定性渲染。

### 4. Writeback

玩家通过 `observe / dwell / mark / repair` 等动作把痕迹写回世界状态。

### 5. Feedback

前端展示结构化反馈、状态变化与回访可见结果，形成最小闭环。

---

## 当前主线外的模块口径

以下能力仍然重要，但当前统一视为“增强模块”或“实验模块”，不再与主链路并列叙述：

### 增强模块

- ghost trace
- disturbance / dynamic signals
- landmark honor board
- place legend
- 资源包切换与地图资产增强

### 实验模块

- scene capsule
- city persona
- AI orchestrator 深度接线
- world memory graph 的进一步产品化表达
- 更重的生成式表现层

边界要求：

1. 新需求优先服务主链路，而不是绕开主链路另起产品叙事
2. 增强模块必须挂接真实空间锚点与结构化世界状态
3. 实验模块失败时不得破坏 Web 主舞台与写回闭环

---

## 当前代码层职责边界

### 前端

#### 页面装配层

- [`frontend/src/App.jsx`](../frontend/src/App.jsx)
- 顶层页面流程、区域编排、状态接线

#### 会话层

- [`frontend/src/hooks/useNearbySession.js`](../frontend/src/hooks/useNearbySession.js)
- [`frontend/src/hooks/useWorldSession.js`](../frontend/src/hooks/useWorldSession.js)
- [`frontend/src/hooks/useWritebackSession.js`](../frontend/src/hooks/useWritebackSession.js)

职责边界：

- nearby session：附近预览与切片进入
- world session：world loading、slice identity、session persistence
- writeback session：写回提交、反馈状态、错误处理

#### 地图层

- [`frontend/src/WorldMap.jsx`](../frontend/src/WorldMap.jsx)
- [`frontend/src/mapAssets/manifest.js`](../frontend/src/mapAssets/manifest.js)
- [`frontend/src/mapAssets/iconMapping.js`](../frontend/src/mapAssets/iconMapping.js)

职责边界：

- 输入 world 数据
- 做稳定渲染
- 逐步拆分配置、纯函数、preload 与 renderer

### 后端

#### API Facade / Service Entry

- [`fablemap/api.py`](../fablemap/api.py)
- [`fablemap/api_service.py`](../fablemap/api_service.py)
- [`fablemap/web/router.py`](../fablemap/web/router.py)
- [`fablemap/web/service.py`](../fablemap/web/service.py)

职责边界：

- 参数解析
- 统一错误格式
- 调用应用服务
- 返回结构化响应

后续原则：

- 复杂业务逻辑应逐步移出入口层
- 新能力优先进入独立 application / domain 模块
- [`fablemap/web/service.py`](../fablemap/web/service.py) 应视为待收敛的历史中心化入口，而不是后续继续扩展的首选位置

---

## 当前数据流

1. 用户输入坐标
2. 后端获取与整理附近地理数据
3. 生成或加载结构化世界数据
4. 前端渲染 nearby preview 与 world map
5. 玩家执行写回动作
6. 后端持久化事件与状态变化
7. 前端展示反馈与可见性结果
8. 后续会话重新进入同一 slice 时看到已存在痕迹
9. 下一阶段再由 orchestrator / lens 等增强层消费这些结构化输入

---

## 近期重构优先级

### P0：工程收敛与可维护性治理

1. 收束 [`frontend/src/App.jsx`](../frontend/src/App.jsx) 与 [`frontend/src/hooks/useWorldSession.js`](../frontend/src/hooks/useWorldSession.js)
2. 治理 [`frontend/src/WorldMap.jsx`](../frontend/src/WorldMap.jsx) 的职责过载
3. 以 [`fablemap/api_service.py`](../fablemap/api_service.py) 为应用入口基线收敛后端边界
4. 补齐 nearby、writeback、orchestrate 相关测试与质量闸门

### P0：稳定底座与协议层补平

1. 统一前端写回 payload、反馈渲染与错误处理
2. 验证回访时的写回可见性
3. 收束玩家参与入口与可见性语义

### P0：AI-native 接线准备

1. 定义 orchestrator 输入输出边界
2. 明确失败降级策略
3. 定义 lens schema 与资源包、文案、权重接线点

---

## 当前明确不作为主线的方向

以下方向可以研究，但不应盖过当前主线：

1. 继续以 Godot-first 作为当前工程叙事
2. 在编排边界未清晰前继续无边界增加视觉层功能
3. 把 bundle 或单独实验页面重新抬升为长期产品主轴
4. 追逐全 AI 视频流主世界
5. 在没有结构化持久化前提下引入只依赖 prompt 的世界状态

---

## 设计原则

### 稳定底座优先

Reality Kernel、Structured World State 与 Deterministic Surface Mapping 是不可坍缩底座。

### 主链路优先

任何近期任务都应优先回答：它是否直接增强 `坐标输入 -> nearby preview -> world map -> writeback -> feedback`？

### Web 主舞台优先

当前正式交付面向的是 FastAPI + React + Vite 的 Web 体验，而不是历史上的 Godot 设想。

### AI 增强而非 AI 替代

AI 应负责解释、编排、记忆与局部生成，不替代地理骨架、结构化世界状态与确定性渲染。

### 小步收敛优先

先统一文档与边界，再拆分大文件，再补测试与接线，不以跨层大爆改作为默认策略。

---

## 与其他文档的关系

- 当前任务优先级以 [`docs/CURRENT_TASKS.md`](CURRENT_TASKS.md) 为准
- 当前共享认领入口以 [`docs/AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md) 为准
- 架构原则过滤器以 [`docs/ARCHITECTURE_PRINCIPLES.md`](ARCHITECTURE_PRINCIPLES.md) 为准
- AI-native 长期方向说明以 [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md) 为准

本文档的作用，是把这些文档收束到**当前可执行的 Web 主线架构**上。