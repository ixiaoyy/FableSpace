# AIO6 生成式场景胶囊协议完成

## 变更时间
2026-03-18

## 变更类型
协议定义

## 变更概述

完成 [`docs/SCENE_CAPSULES_PROTOCOL.md`](../SCENE_CAPSULES_PROTOCOL.md) 的首版协议定义，补齐 AIO6 生成式场景胶囊的职责边界、触发规则、输入输出 schema、失败降级策略，以及与世界编排器、镜头引擎、城市人格和前端主舞台的消费关系。

## 主要内容

### 1. 明确 Scene Capsule 的系统定位

协议明确 Scene Capsule 属于**局部生成式表现层**，负责把上游结构化信号压缩成可渲染、可缓存、可降级的局部体验单元，而不是承担：

- 世界规则判定
- 持久状态写回
- 地图资源生成
- 整页 UI 模式切换

并与 [`docs/WORLD_ORCHESTRATOR_PROTOCOL.md`](../WORLD_ORCHESTRATOR_PROTOCOL.md)、[`docs/LENS_ENGINE_PROTOCOL.md`](../LENS_ENGINE_PROTOCOL.md)、[`docs/CITY_PERSONA_PROTOCOL.md`](../CITY_PERSONA_PROTOCOL.md) 形成清晰分工。

### 2. 定义触发来源、优先级与去重规则

协议新增四类主触发来源：

- `event_driven`
- `lens_driven`
- `persona_driven`
- `revisit_driven`

并定义了：

- 回访优先于即时事件的主胶囊优先级
- 同类胶囊冷却时间
- 互斥类型限制
- 基于玩家、slice、target、type、visibility 的缓存/去重键

### 3. 定义 6 类 Scene Capsule 类型

首版协议统一定义以下胶囊类型：

1. `memory_reveal`
2. `dwell_aura`
3. `anomaly_glimpse`
4. `persona_whisper`
5. `legend_fragment`
6. `broadcast_echo`

并为每类补充：

- 语义定位
- 触发来源
- 默认可见性
- 典型镜头偏好

### 4. 定义输入输出 Schema

协议新增：

- `SceneCapsuleInput`
- `SceneCapsuleOutput`
- `TextBlock`
- `VisualHint`
- `SoundHint`
- `InteractionHook`

明确了：

- 最小必填字段
- `world_state_excerpt` / `player_state_excerpt` 的局部摘录要求
- `safety_flags` 的安全边界
- `render_mode` 的前端消费语义
- 文本、视觉、音景、交互结构的长度和数量约束

### 5. 定义失败降级策略

协议明确三级降级路径：

1. 模板降级
2. 确定性 UI 降级
3. 静默跳过

并要求生成失败时可退回现有确定性反馈层，例如：

- `echo_entries`
- `broadcast_hints`
- `capsule mark`
- `text panel`
- `ui_state_changes`

从而保证主舞台不因生成层失败而中断。

### 6. 定义前后端集成关系

协议补充了：

- Scene Capsule 在编排器输出流程中的推荐挂载位置
- 对 [`OrchestratorOutput`](../fablemap/orchestrator/schemas.py) 的建议扩展方向
- 前端按 `render_mode` 渐进增强消费的映射方式
- 与 [`fablemap/world_builder.py`](../fablemap/world_builder.py)、[`fablemap/bundle.py`](../fablemap/bundle.py) 现有锚点的兼容关系

## 影响范围

- **协议层**：补齐 AIO6 作为 AIO5 下游、前端生成式表现层上游的关键协议空白
- **后端**：为后续 `SceneCapsuleResolver`、schema 扩展与 orchestrator 输出扩展提供依据
- **前端**：为主舞台、侧边卡片、toast、overlay、ambient 增强层提供统一输入语义
- **治理与降级**：确保生成式能力受可见性与安全边界约束，并始终保留确定性回退路径

## 后续工作

协议定义完成后，可按以下顺序推进：

1. 在 [`fablemap/orchestrator/schemas.py`](../fablemap/orchestrator/schemas.py) 中为 `scene_capsules` 增加 schema
2. 在编排流程中增加 `SceneCapsuleResolver` 或同类后处理组件
3. 先接入 `memory_reveal` / `persona_whisper` / `legend_fragment` 三类 MVP 胶囊
4. 在前端主舞台中按 `render_mode` 做渐进消费，不阻塞现有确定性 UI

## 参考文档

- [`docs/SCENE_CAPSULES_PROTOCOL.md`](../SCENE_CAPSULES_PROTOCOL.md)
- [`docs/WORLD_ORCHESTRATOR_PROTOCOL.md`](../WORLD_ORCHESTRATOR_PROTOCOL.md)
- [`docs/LENS_ENGINE_PROTOCOL.md`](../LENS_ENGINE_PROTOCOL.md)
- [`docs/CITY_PERSONA_PROTOCOL.md`](../CITY_PERSONA_PROTOCOL.md)
- [`docs/WORLD_WRITEBACK_PROTOCOL.md`](../WORLD_WRITEBACK_PROTOCOL.md)
