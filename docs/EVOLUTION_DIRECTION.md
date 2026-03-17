# FableMap 演进方向说明

## 这份文档解决什么问题

当前仓库已经经历了多个阶段：

1. 早期 CLI 世界生成原型
2. 早期 Godot-first 设想
3. 浏览器 Web-2D 主舞台建立
4. 写回协议、治理边界与时间深度补位
5. AI-native 世界编排方向收束

历史文档很多，容易让协作者误把旧阶段方案当成当前主线。

因此这份文档只回答一个问题：

> **FableMap 到底是怎么一步步演进到当前方向的，现在真正应该往哪里继续推进？**

---

## 一句话结论

> **FableMap 已从“把真实地图转成异世界说明”的原型，演进为“以真实地图为稳定底座、以写回协议为演化入口、以 AI 编排为下一阶段核心”的世界系统。**

当前不应再把项目理解为：

- 一个 Godot-first 的地图原型
- 一个不断堆页面表现层的 Web Demo
- 一个靠全 AI 实时生成画面的世界产品

当前更准确的理解应是：

- 底层是稳定现实骨架
- 中层是结构化世界状态与写回协议
- 上层是浏览器 2D 主舞台与前后端交互
- 下一阶段重点是世界编排、镜头系统、长期记忆与城市人格

---

## 项目演进分期

## 第一阶段：CLI 世界生成原型

这个阶段的目标非常直接：

- 输入坐标
- 拉取 OSM / Overpass 数据
- 做最小语义映射
- 生成稳定的 `world.json`

这个阶段证明了最核心的一件事：

> **真实地点可以被稳定转译成结构化异世界切片。**

这个阶段留下的核心资产仍然有效：

- 真实地图骨架
- 结构化世界输出
- 稳定 slice / world 基线
- CLI / demo / bundle 基础链路

但这个阶段的很多“路线描述文档”已经不再适合作为当前总入口，因为它们默认项目仍停留在原型验证期。

---

## 第二阶段：Godot-first 设想

早期大量文档把 Godot 视为近期主承载体，判断逻辑是：

- 先把 JSON 输出给 Godot
- 在 Godot 中实例化场景
- 让用户移动、点击、查看地点描述

这条路线在当时是合理的，因为它帮助项目把“世界描述”进一步想象成“可探索场景”。

但后续实际工程演进证明：

- 浏览器中的快速迭代速度更高
- Web 更适合作为入口与验证舞台
- 当前仓库已形成 FastAPI + React + 浏览器 2D 主舞台链路
- Godot 不再是近期唯一主线承载体

因此，Godot 现在更适合作为**后续消费层 / 扩展方向**，而不是当前文档体系的核心叙事中心。

---

## 第三阶段：浏览器 Web-2D 主舞台成立

随着 [`frontend/src/App.jsx`](../frontend/src/App.jsx:1)、[`frontend/src/WorldMap.jsx`](../frontend/src/WorldMap.jsx:1)、[`fablemap/web/app.py`](../fablemap/web/app.py:1)、[`fablemap/web/router.py`](../fablemap/web/router.py:1) 这条链路逐渐稳定，项目完成了关键转折：

> **地图不再只是产物预览页，而开始成为浏览器里的主舞台。**

这一阶段完成的不是“页面更好看”这么简单，而是建立了新的产品事实：

- 世界入口发生在浏览器里
- 地图成为交互本体，而不是附属说明页
- 前后端职责已经分离
- 世界切片开始具备持续交互空间

这使得很多更早期的“Web MVP 草案”“2D 升级草案”“前端框架是否要引入”的文档，历史上有价值，但当前已经不再适合作为主入口。

---

## 第四阶段：从可看、可走，进入可写回

当主舞台、玩家移动、观察、视觉代理、回声等能力逐步形成后，项目的主矛盾发生了变化。

问题不再是：

- 地图能不能显示
- 场景能不能跑起来
- 页面还能不能更像游戏

问题变成了：

- 玩家做了什么，如何进入世界状态
- 地点如何记住玩家行为
- 哪些痕迹属于私人、局部公共或全局公共
- 世界是否能在回访时保留这些变化

因此项目进入了“协议层补位”阶段，核心文档变成：

- [`docs/WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
- [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
- [`docs/TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)
- [`docs/PLAYER_STATE.md`](PLAYER_STATE.md)

这一步非常关键，因为它让 FableMap 从“交互展示”开始转向“可演化世界”。

---

## 第五阶段：AI-native 世界编排方向收束

在补齐写回、治理、时间深度基础后，项目又进一步面对一个更大的问题：

> **在 AI 技术快速变化的背景下，FableMap 应该把 AI 用在什么地方？**

当前答案已经收束得比较清楚：

- 不是让 AI 替代空间结构
- 不是转向全 AI 视频流主世界
- 不是让 AI 直接成为世界唯一真相来源

而是：

- 让 AI 负责语义解释
- 让 AI 负责世界编排
- 让 AI 负责长期记忆生成与检索
- 让 AI 负责局部生成式表现层

也就是说，FableMap 当前已经从“AI 帮忙润色地图描述”的项目，演进成：

> **稳定世界底座 + 写回协议 + 浏览器主舞台 + AI 编排中层**

这就是当前方向文档 [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md) 与实施规划 [`docs/AIO1_WORLD_ORCHESTRATOR_PLAN.md`](AIO1_WORLD_ORCHESTRATOR_PLAN.md) 的真正意义。

---

## 当前稳定下来的项目理解

现在可以把 FableMap 理解成四层：

### 1. 稳定底座

- OSM / Overpass 真实地理骨架
- `world.json` 等结构化世界状态
- `player_state`、事件流、地点状态
- 确定性资源映射

### 2. 协议与状态层

- 写回协议
- 治理边界
- 时间褶皱 / 历史层
- 玩家状态轴

### 3. 交互与表现层

- FastAPI + React 当前工程结构
- 浏览器 2D 地图主舞台
- POI 观察、选择、基础交互
- bundle / preview / world stage 相关视图

### 4. 下一阶段 AI-native 中层

- World Orchestrator
- Lens Engine
- World Memory Graph
- Action-to-Meaning Compiler
- City-as-Agent
- Scene Capsules

---

## 当前真正应该继续推进什么

按优先级看，当前不是继续发散，而是继续收束。

### 第一优先级：把写回闭环真正做实

也就是：

- 前端接入 `observe / dwell / mark`
- 对接事件接口
- 显示结构化状态变化
- 验证回访仍可见写回痕迹

这对应当前任务中的 `P6`。

### 第二优先级：把玩家参与入口语义收束清楚

也就是：

- 玩家究竟如何参与城市神话共创
- 什么是即时反馈，什么是持久写回
- `private / local_public / global` 在产品层到底意味着什么

这对应当前任务中的 `D3`。

### 第三优先级：定义世界编排器协议

也就是：

- 编排器读取哪些输入
- 输出哪些结构化建议
- 如何与治理、时间层、写回事件流对齐
- AI 失败时如何降级

这对应当前任务中的 `AIO1`。

---

## 当前明确不应再回到哪些方向

为了减少文档噪音，协作者现在应明确避开以下误读：

### 1. 不要再把项目理解成 Godot-first

Godot 仍然可以存在，但它不是当前文档与工程的主入口。

### 2. 不要再把项目理解成“继续堆页面表现层”

当前瓶颈不是地图不够炫，而是世界还缺少可持续写回与编排中层。

### 3. 不要再把项目理解成“全 AI 生成主世界”

这会破坏长期一致性、可持久化与玩家痕迹附着能力。

### 4. 不要再把旧阶段任务表、旧版路线图、旧 PRD 当作当前优先级依据

这些文档只能帮助理解历史，不应用来指导当前决策。

---

## 当前建议协作者只看哪些文档

如果只保留最小必要集合，优先看：

1. [`README.md`](../README.md)
2. [`docs/README.md`](README.md)
3. [`docs/EVOLUTION_DIRECTION.md`](EVOLUTION_DIRECTION.md)
4. [`docs/CURRENT_TASKS.md`](CURRENT_TASKS.md)
5. [`docs/AI_SHARED_TASKLIST.md`](AI_SHARED_TASKLIST.md)
6. [`docs/WORLD_WRITEBACK_PROTOCOL.md`](WORLD_WRITEBACK_PROTOCOL.md)
7. [`docs/WORLD_WRITEBACK_GOVERNANCE.md`](WORLD_WRITEBACK_GOVERNANCE.md)
8. [`docs/TIME_FOLDS_PROTOCOL.md`](TIME_FOLDS_PROTOCOL.md)
9. [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](AI_NATIVE_WORLD_ORCHESTRATION.md)
10. [`docs/AIO1_WORLD_ORCHESTRATOR_PLAN.md`](AIO1_WORLD_ORCHESTRATOR_PLAN.md)

如果不是直接做协议或 AI-native 中层，则不需要先钻进大量历史文档。

---

## 文档清理后的最终规则

1. 旧阶段文档若只剩历史价值，应直接删除或归档，不再放在主目录并列干扰判断
2. 当前主入口只保留少数几份：总览、当前任务、共享任务、核心协议、演进方向、AI-native 方向
3. 同类主题只允许一个当前有效入口
4. 协作者进入项目时，应先理解“项目如何演进到现在”，再开始改协议或改代码

---

## 最后结论

FableMap 当前不是一个等待继续堆概念文档的项目。

它已经进入了这样一个阶段：

> **先用稳定现实骨架和结构化状态把世界立住，再用写回协议让世界记住玩家，最后让 AI 成为世界的编排者，而不是世界本身的替代品。**
