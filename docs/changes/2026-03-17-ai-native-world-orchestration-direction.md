# 2026-03-17 AI-native world orchestration direction

## 背景

近期围绕世界模型、实时互动生成与生成式游戏世界的技术讨论，进一步暴露出一个关键现实：

- 短时沉浸式生成能力正在快速增强
- 但长期一致、可写回、可治理、可跨时间沉淀的世界系统仍远未成熟

对 FableMap 而言，这不是一个要求项目转向“全 AI 视频流主世界”的信号，反而说明当前仓库坚持的几条主线具有长期价值：

- 真实地图骨架
- 结构化 `world` 数据
- 浏览器 2D 主舞台
- 世界写回协议
- 时间褶皱与历史深度
- 资源包与确定性视觉映射

因此，需要把近期关于 AI 技术趋势的判断正式沉淀为项目方向文档，并同步到共享任务表与项目管理清单中。

## 本次变更

新增：

- [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](docs/AI_NATIVE_WORLD_ORCHESTRATION.md)
- [`docs/changes/2026-03-17-ai-native-world-orchestration-direction.md`](docs/changes/2026-03-17-ai-native-world-orchestration-direction.md)

更新：

- [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md)
- [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md)

本次新增方向文档明确收束为：

- FableMap 不用 AI 替代世界结构，而用 AI 强化世界编排、镜头切换、长期记忆与城市人格
- 项目继续坚持“确定性 2D 地理底座 + 结构化世界状态”
- AI 的主战场应从一次性生成，升级到 `Semantic Runtime / World Orchestrator / Generative Surface` 等中上层能力
- 后续应围绕世界编排器、镜头引擎、世界记忆图谱、行为到意义编译器、城市人格代理与 scene capsules 拆分新任务

## 影响范围

- 为 AI 技术趋势讨论提供可引用的正式项目文档
- 为共享任务表新增 AI-native 架构演进主线
- 为当前任务清单补充“写回闭环之后的 AI 编排层升级方向”
- 为后续协议设计、任务认领与实现拆分提供统一架构口径

## 明确没有改什么

- 没有修改 [`fablemap/writeback.py`](fablemap/writeback.py) 的协议实现逻辑
- 没有修改 [`frontend/src/WorldMap.jsx`](frontend/src/WorldMap.jsx) 的渲染逻辑
- 没有改变当前 `M1 / M2 / M3` 地图资源主线边界
- 没有把“全 AI 视频流世界”纳入当前主线
- 没有替换现有 `P5 -> P3` 的近期基础依赖顺序

## 验证方式

- 检查是否已新增 [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](docs/AI_NATIVE_WORLD_ORCHESTRATION.md)
- 检查 [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md) 是否已加入 AI-native 架构演进相关任务
- 检查 [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md) 是否已同步新的中期方向描述
- 确认后续协作者可直接基于新增方向文档拆分协议和实现任务

## 结果

项目关于“如何结合 AI 趋势又不放弃稳定世界底座”的判断，不再只停留在会话讨论中，而是正式沉淀为可执行、可引用、可拆分任务的架构主线。