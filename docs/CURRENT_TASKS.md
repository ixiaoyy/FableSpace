# FableMap 当前任务清单（当前有效版）

## 当前阶段结论

FableMap 现阶段已经不再处于“验证地图能否显示”的阶段。

当前工程已经具备：

- 稳定的 `nearby -> world -> bundle / web` 基础闭环
- [`fablemap/writeback.py`](../fablemap/writeback.py) 支持的最小世界写回实现
- 浏览器内 2D 世界地图主舞台与基础交互层
- FastAPI + React 的当前工程化前后端结构
- 围绕写回治理、时间褶皱与 AI-native 编排方向的协议文档基础

因此，当前主线应收束为：

> **在不破坏稳定世界底座的前提下，先补齐“写回闭环可用性”，再进入 AI-native 世界编排层。**

---

## 当前最高优先级

### 0. T0 · 工程收敛与可维护性治理
**状态：proposed**

目标：在不破坏当前可运行闭环的前提下，把项目从“功能持续堆叠的原型态”收敛为“可持续迭代的工程态”，为后续写回、编排与 AI-native 扩展建立稳定边界。

问题判断：

1. [`frontend/src/App.jsx`](../frontend/src/App.jsx) 职责过多，页面状态、API、持久化与业务编排混杂
2. [`frontend/src/WorldMap.jsx`](../frontend/src/WorldMap.jsx) 同时承担视觉配置、资源加载、语义映射与 Canvas 渲染
3. [`fablemap/web/service.py`](../fablemap/web/service.py) 过度中心化，API 层与领域编排层边界不清
4. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) 仍以 Godot-first 口径为主，和当前 FastAPI + React 实现存在偏移

整改原则：

1. 先收缩主链路，再继续扩展能力
2. 先拆模块边界，再补体验与视觉增强
3. 先统一文档与契约，再进入多线并行开发
4. 新功能接入不得继续向超大文件追加核心逻辑

近期重点：

1. 明确当前唯一主链路为 `坐标输入 -> nearby preview -> world map -> writeback -> feedback`
2. 重写当前 Web 实现架构说明，补齐正式模块边界与实验模块边界
3. 拆分 [`frontend/src/App.jsx`](../frontend/src/App.jsx) 的 API、session、hooks、页面面板职责
4. 拆分 [`frontend/src/WorldMap.jsx`](../frontend/src/WorldMap.jsx) 的配置、纯函数、资源加载与 renderer
5. 把 [`fablemap/web/service.py`](../fablemap/web/service.py) 收敛为薄应用入口，迁移复杂逻辑到独立 application services
6. 合并前端重复常量与标签字典，建立共享配置单一来源
7. 为核心链路补齐 contract test、纯函数测试与 lint/type-check 闸门

关键参考：

- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
- [`docs/ARCHITECTURE_PRINCIPLES.md`](ARCHITECTURE_PRINCIPLES.md)
- [`docs/STRATEGIC_ANALYSIS.md`](STRATEGIC_ANALYSIS.md)
- [`docs/WHAT_NOT_TO_BUILD.md`](WHAT_NOT_TO_BUILD.md)

### 1. P6 · 写回闭环前端接入与验证
**状态：in_progress**

目标：让已存在的写回协议与后端能力，真正在前端主舞台中可触发、可见、可验证。

当前重点：

1. 在前端接入 `observe / dwell / mark` 三种动作入口
2. 对接 `POST /api/world/event`
3. 在 UI 中显示结构化状态变化，而不只是一次性提示
4. 验证重新进入同一 slice 后仍能看到写回痕迹
5. 为后续编排器消费事件流提供稳定输入

关键参考：

- [`docs/WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
- [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
- [`docs/PLAYER_STATE.md`](PLAYER_STATE.md)
- [`docs/AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md)

### 2. D3 · 玩家参与感与城市神话共创主线收束
**状态：in_progress**

目标：把“玩家如何参与城市神话共创”整理成统一入口，并与写回协议、可见性边界、前端入口形成一条闭环主线。

当前重点：

1. 收束当前共创入口、神话线索与参与面板的文档口径
2. 明确哪些参与行为属于即时反馈，哪些属于持久写回
3. 为 `private / local_public / global` 三层可见性提供产品语义解释
4. 为后续轻社区、地点传说、命名权演化提供上游定义

关键参考：

- [`docs/WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
- [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
- [`docs/TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)

---

## 本周主线

### P0：工程收敛与重构准备

#### A. 主链路收敛

1. 把当前版本唯一主链路固定为 `坐标输入 -> nearby preview -> world map -> writeback -> feedback`
2. 将 orchestration、ghost trace、disturbance、scene capsule、city persona 标记为增强或实验模块，而不是继续并列主线
3. 约束新增需求必须服务主链路，不再无边界扩张页面与 service

#### B. 前端大文件拆分准备

1. 抽离 [`frontend/src/App.jsx`](../frontend/src/App.jsx) 中的 API client、session persistence 与页面装配逻辑
2. 规划 hooks 分层：backend status、world preview、writeback、map layers、poi filters
3. 合并共享常量，消除标签字典与展示映射的重复定义
4. 将页面区块改造成可独立维护的组件，而不是继续追加到单文件

#### C. 地图模块治理准备

1. 抽离 [`frontend/src/WorldMap.jsx`](../frontend/src/WorldMap.jsx) 中的 palette、icon、road style、tag label 配置
2. 抽离 geometry、ranking、occupancy 等纯函数工具
3. 抽离 map asset preload 与 renderer，避免组件继续承担完整地图系统

#### D. 后端服务层收敛准备

1. 将 [`fablemap/web/service.py`](../fablemap/web/service.py) 收敛为 API facade
2. 把 nearby、writeback、orchestration、insight 逻辑迁移到 application services
3. 统一 API schema、错误格式与响应契约

#### E. 质量护栏补齐

1. 为核心纯函数补测试
2. 为 nearby、writeback、orchestrate 补 contract test
3. 接入 lint、format 与 type-check 基线

### P0：稳定底座与协议层补平

#### A. 写回闭环补平

1. 完成前端 `observe / dwell / mark` 动作接入
2. 统一前端事件 payload、反馈渲染与错误处理
3. 验证文件持久化结果与回访可见性
4. 补齐写回链路测试与最小回归说明

#### B. D3 与协议口径收束

1. 保持 D3 作为“玩家如何进入世界写回系统”的产品入口
2. 对齐 `D3 -> P5/P6 -> P3 -> P4` 的上游下游关系
3. 避免再新增脱离协议层的零散参与功能

### P0：AI-native 架构演进准备

#### AIO1 · 世界编排器协议定义

1. 基于 [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md) 与 [`docs/AIO1_WORLD_ORCHESTRATOR_PLAN.md`](AIO1_WORLD_ORCHESTRATOR_PLAN.md) 收束输入输出边界
2. 与现有 `world_state / player_state / writeback_events / governance / time folds` 对齐
3. 明确失败降级策略：AI 编排失败时回落到规则编排或静默降级
4. 形成可供后端 service、前端消费与任务拆分使用的统一协议文档

#### AIO2 · 镜头引擎协议准备

1. 定义 `lens schema`
2. 定义 `vibe_profile -> lens` 映射关系
3. 明确镜头切换对资源包、文案口吻、可见性与事件权重的影响

#### AIO3 / AIO4 / AIO5 / AIO6 · 暂不直接实现

这些方向仍然重要，但当前更适合作为 AIO1 之后的拆分任务，而不是直接跳实现层：

- 世界记忆图谱
- 行为到意义编译器
- 城市人格代理
- Scene Capsules

---

## 当前进行中但不应喧宾夺主的工作

### M1 / M2 · 地图资源主线
**状态：in_progress**

地图资源与资产生成仍可继续推进，但应服从当前主线：

- 不应把资源包建设重新抬升为项目唯一主轴
- 资源层应服务于镜头系统、主舞台与确定性映射
- 新资产规划不应绕开当前协议层与 AI-native 主线

关键参考：

- [`docs/MAP_ASSETS_PLAN.md`](MAP_ASSETS_PLAN.md)
- [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](MAP_ASSETS_GENERATION_GUIDE.md)
- [`docs/MAP_ASSETS_FRONTEND_BASELINE.md`](MAP_ASSETS_FRONTEND_BASELINE.md)

---

## 待排期

### 第一组：AI-native 中层能力

1. AIO1.2 · 动态信号接入层
2. AIO1.3 · 规则 / 事件编排引擎
3. AIO2 · 镜头引擎协议与切换入口
4. AIO3 · 世界记忆图谱
5. AIO4 · 行为到意义编译器
6. AIO5 · 城市人格代理
7. AIO6 · 生成式场景胶囊规范

### 第二组：依赖写回与编排层的体验扩展

1. E1 · 都市精灵共同发现、互助与交换生态
2. E2 · 公共地标修复任务与城市荣誉榜
3. E3 · 玩家命名权、地点传说与地点气质演化
4. E4 · 玩家据点、幽灵回放与城市身份系统

### 第三组：长期世界能力

1. F1 · 审美宪法投票与社区转义规则治理
2. F2 · 现实行为输入与人为扰动接口
3. F3 · 地理脚本注入与创作者权限模型
4. G1 · 异世界电台与音景叙事层
5. G2 · 城市觉醒事件、世界 Boss 与阵营战争长期路线

---

## 明确不再作为当前主线的方向

以下方向可以保留为参考，但不应继续占据当前任务中心：

1. 单纯继续堆地图表现层
2. 把 bundle 页面继续当作核心产品形态去扩写
3. 继续以 Godot-first 叙事作为近期执行口径
4. 在编排层与镜头引擎缺位时继续无限扩写图标包 / UI 面板
5. 转向全 AI 视频流主世界
6. 把所有实验能力都继续并列堆进 [`frontend/src/App.jsx`](../frontend/src/App.jsx) 或 [`fablemap/web/service.py`](../fablemap/web/service.py)
7. 在未完成模块边界收敛前继续扩大前端状态数量与后端隐式依赖

相关边界参考：

- [`docs/ARCHITECTURE_PRINCIPLES.md`](ARCHITECTURE_PRINCIPLES.md)
- [`docs/WHAT_NOT_TO_BUILD.md`](WHAT_NOT_TO_BUILD.md)

---

## 当前依赖关系判断

当前依赖关系应理解为：

- `P6` 是近期最直接的工程闭环任务
- `D3` 为写回入口与产品语义收束提供上游定义
- `P3 / P4` 已完成协议基础，为后续实现提供边界
- `AIO1` 是下一阶段最值得投入的协议核心
- `E1-E4` 依赖 `P6 + AIO1`，不宜提前扩张

换句话说，当前顺序更应是：

1. 先把写回闭环真正接入前端并验证
2. 再收束 D3 的参与语义与产品入口
3. 再定义世界编排器协议
4. 最后再进入记忆、城市人格、轻社区与长期世界事件

---

## 协作补充说明：工程治理共识

为避免团队继续在现有大文件与模糊边界上追加功能，后续协作默认遵守以下共识：

1. 前端新增主流程能力时，优先新增模块、hooks 或独立组件，不直接向 [`frontend/src/App.jsx`](../frontend/src/App.jsx) 追加大量业务逻辑
2. 地图系统新增能力时，优先进入 config、utils、asset loader 或 renderer，不直接扩大 [`frontend/src/WorldMap.jsx`](../frontend/src/WorldMap.jsx) 的职责
3. 后端新增领域能力时，优先进入 application 或 domain 模块，不直接堆入 [`fablemap/web/service.py`](../fablemap/web/service.py)
4. 对外宣讲与内部协作时，默认以 FastAPI + React Web 形态作为当前正式工程口径；Godot 仅保留为历史设计参考或远期分支
5. 如新增实验功能，必须标记其归属为 核心 / 增强 / 实验，避免再次形成并列主线

## 当前执行口号

> **先让系统变得可维护，再让玩家真正写回世界，最后让世界开始主动编排回应。**
