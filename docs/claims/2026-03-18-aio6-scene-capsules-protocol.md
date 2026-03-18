# AIO6 生成式场景胶囊规范 - 任务认领

## 认领信息
- **任务编号**: AIO6
- **认领时间**: 2026-03-18
- **认领者**: AI 协作者
- **预计完成**: 1-2 天
- **当前状态**: in_progress

## 任务目标

完成生成式场景胶囊（Scene Capsules）规范定义，为世界编排器下游提供统一的局部生成式表现层协议，明确：

1. 触发条件与触发优先级
2. 输入结构与字段约束
3. 输出格式与前后端消费关系
4. 失败降级边界与安全限制
5. 与城市人格、镜头引擎、写回事件和世界编排器的集成方式

## 当前背景

当前上游能力已经具备：

- [`docs/WORLD_ORCHESTRATOR_PROTOCOL.md`](../WORLD_ORCHESTRATOR_PROTOCOL.md)：定义编排器输入输出与事件建议
- [`docs/LENS_ENGINE_PROTOCOL.md`](../LENS_ENGINE_PROTOCOL.md)：定义镜头选择、资源包提示与 UI filter hint
- [`docs/CITY_PERSONA_PROTOCOL.md`](../CITY_PERSONA_PROTOCOL.md)：定义城市人格的称谓、语气、response_bias 与 trust_level
- [`fablemap/world_builder.py`](../../fablemap/world_builder.py)：已有 private capsules / echo / myth thread 等可被场景化消费的世界元素
- [`fablemap/bundle.py`](../../fablemap/bundle.py)：已有 capsule mark / echo panel 等静态呈现锚点

当前缺口在于：

尚未定义“什么时候允许生成一个局部场景胶囊、它应拿什么输入、输出给谁、生成失败时如何回退到确定性呈现”。AIO6 即补齐这一层。

## 本次工作范围

### Phase 0：协议定义（本次认领）

1. **定义 Scene Capsule 的定位**
   - 说明其属于局部生成式表现层，而非世界规则引擎
   - 明确它不直接改写世界状态，只消费上游状态并输出可渲染片段

2. **定义触发条件**
   - 基于 `event_suggestions`、`lens_output`、`city_persona`、`writeback_events`、地点类型与可见性进行触发
   - 说明哪些触发适合 `private`、哪些只能用于 `local_public` 或 `global`
   - 定义互斥、冷却与去重规则

3. **定义输入输出 Schema**
   - 输入：slice、target、lens、persona、recent events、dynamic signals、safety flags
   - 输出：scene capsule payload、文本块、视觉提示、音景提示、交互 affordance、ttl、fallback reason
   - 约束字段长度、可见性、可序列化格式与缓存 key

4. **定义降级策略**
   - 模型不可用 / 超时 / 输入不完整 / 置信度过低时如何回退
   - 回退到现有 `echo`、`broadcast`、`capsule mark`、`text panel` 等确定性 UI

5. **定义消费关系**
   - 后端 orchestrator / service 如何返回 scene capsule
   - 前端主舞台如何按 `capsule_type`、`render_mode`、`ui_filter_hint` 渐进消费
   - 与资源包、镜头主题类和世界回访链路的兼容方式

## 不包含的工作

- 不直接实现生成模型调用
- 不引入真实多模态素材生产链路
- 不重构 [`frontend/src/WorldMap.jsx`](../../frontend/src/WorldMap.jsx) 渲染层
- 不修改写回协议、治理协议或镜头协议既有边界
- 不直接落地长期社区玩法（`E1-E4`）

## 预期产出

- 新增 [`docs/SCENE_CAPSULES_PROTOCOL.md`](../SCENE_CAPSULES_PROTOCOL.md)
- 补一份对应的变更记录到 [`docs/changes/`](../changes/)
- 在任务列表中将 AIO6 从 `planned` 推进到可执行状态
- 为后续后端 schema / orchestrator 输出扩展提供统一依据

## 验收标准

- [ ] 协议文档完整定义 Scene Capsule 的职责与边界
- [ ] 至少定义 4 类可区分的 capsule 类型与触发来源
- [ ] 明确输入输出 schema、可见性和失败降级策略
- [ ] 与 [`docs/WORLD_ORCHESTRATOR_PROTOCOL.md`](../WORLD_ORCHESTRATOR_PROTOCOL.md)、[`docs/LENS_ENGINE_PROTOCOL.md`](../LENS_ENGINE_PROTOCOL.md) 与 [`docs/CITY_PERSONA_PROTOCOL.md`](../CITY_PERSONA_PROTOCOL.md) 不冲突
- [ ] 前后端消费关系清晰，可支持后续实现拆分

## 风险与备注

- AIO6 是生成式表现层，不应反向承担规则判定职责
- 必须坚持“生成失败可回退到确定性呈现”，避免主舞台被生成依赖卡死
- 必须先定义协议边界，再决定是否进入代码实现或前端试接入
