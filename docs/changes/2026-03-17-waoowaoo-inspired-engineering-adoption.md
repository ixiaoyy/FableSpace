# 从 `waoowaoo` 借鉴到 FableMap 的工程实践集成计划

## 文档目的

这份文档不试图把 FableMap 变成另一个 AI 视频工作台，而是提炼 `waoowaoo` 中**适合当前阶段直接吸收**的工程经验，服务于 FableMap 现阶段主线：

- 保持稳定的 Reality Kernel / Structured World State
- 先补齐写回闭环
- 再进入 AI-native 世界编排层

相关上游参考：

- [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md)
- [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](docs/AI_NATIVE_WORLD_ORCHESTRATION.md)
- [`docs/ARCHITECTURE_PRINCIPLES.md`](docs/ARCHITECTURE_PRINCIPLES.md)

---

## 一句话判断

`waoowaoo` 最值得学习的不是“AI 视频生成”本身，而是它在一个高不确定性 AI 产品里，如何通过**工作流拆层、异步执行、配置治理、契约检查、回归脚本**来抑制复杂度失控。

对 FableMap 而言，可迁移的重点不是媒体能力，而是：

1. **把长链路任务拆成明确阶段**
2. **把不稳定能力包进后台执行与可观察状态**
3. **把模型 / 提供商 / 配置从业务逻辑里抽离**
4. **用 guard / contract / test 防止架构倒退**

---

## 适合直接借鉴的 5 类经验

## 1. 从“单次调用”升级到“阶段化工作流”

`waoowaoo` 的核心经验之一，是把复杂生成过程拆成 text / image / voice / video 等异步阶段，而不是把所有逻辑塞进一个同步入口。

### 对 FableMap 的对应启发

FableMap 当前虽然已有：

- `nearby -> world -> bundle / web`
- 最小写回能力
- AI-native 编排协议草案

但在实现层仍可以进一步显式拆出“阶段状态”。

### 建议新增的 FableMap 工作流阶段

1. **Slice Resolve**
   - 输入坐标、半径、seed
   - 解析 slice key
   - 确认缓存命中策略

2. **Reality Fetch**
   - 拉取或读取 OSM / Overpass 数据
   - 记录数据来源、时间、缓存命中情况

3. **Semantic Build**
   - 从真实地理对象推导 `world.json`
   - 生成稳定对象与解释字段

4. **Writeback Merge**
   - 合并 `observe / dwell / mark` 等事件后的状态
   - 更新 slice-level / poi-level 痕迹

5. **Orchestration Pass**
   - 读取世界状态、玩家状态、最近事件
   - 产出结构化编排建议

6. **Presentation Bundle**
   - 为前端主舞台整理稳定渲染数据
   - 为后续 scene capsule / 广播卡片 / 观察面板预留输出槽位

### 近期落地动作

把当前“生成”与“写回”链路的返回结果，统一增加：

- `stage`
- `status`
- `started_at`
- `completed_at`
- `input_summary`
- `output_summary`
- `warnings`

这样前端和后续编排器都能更稳定地理解当前世界切片到底处于哪一步。

---

## 2. 引入“后台任务语义”，而不是继续放大同步请求

`waoowaoo` 用 worker + queue 承接高耗时、易失败、外部依赖强的任务。这种模式对 FableMap 后续进入编排层非常重要。

### 对 FableMap 的判断

当前 FableMap 的同步链路适合：

- nearby 试跑
- demo / showcase / bundle 生成
- 小规模本地实验

但未来以下能力一旦落地，就会明显更适合后台任务化：

- 世界编排器批处理
- 定时回放与历史折叠更新
- slice 级缓存重建
- 动态信号融合
- scene capsule / 分享卡片生成
- 批量地点解释重算

### 近期不必马上引入 Redis / BullMQ

不建议现在直接把 FableMap 改造成重型队列系统。

### 建议的过渡方案

先在 Python 侧定义统一任务协议：

- `task_id`
- `task_type`
- `status`
- `created_at`
- `updated_at`
- `input_ref`
- `result_ref`
- `error_code`
- `error_message`

然后优先用以下轻量方式实现：

1. 文件型任务记录
2. SQLite 任务表
3. API 轮询读取任务状态

等 AIO1 边界稳定后，再决定是否引入真正队列基础设施。

---

## 3. 把 AI / Provider / 模型选择从业务逻辑中抽离

`waoowaoo` 的另一个强项，是它明显在尝试治理“多模型、多供应商、多能力入口”问题，而不是把模型调用散落在每个 API 处理器里。

### 对 FableMap 的启发

FableMap 接下来会逐步引入：

- 编排模型
- 语义解释模型
- 记忆总结模型
- 局部生成模型

如果不及早抽象，后面很容易出现：

- 某个模块直接硬编码 provider
- 同一类任务在不同地方 prompt / 参数不一致
- 降级策略分散
- 成本与能力边界不可观测

### 建议新增的统一抽象

建议围绕未来 [`fablemap/orchestrator/`](fablemap/orchestrator/__init__.py) 和 [`fablemap/api_service.py`](fablemap/api_service.py) 所在层，逐步形成：

1. **Model Role Registry**
   - `semantic_interpreter`
   - `world_orchestrator`
   - `memory_summarizer`
   - `surface_generator`

2. **Provider Adapter Interface**
   - 统一输入输出结构
   - 统一异常分类
   - 统一超时 / 重试 / 降级语义

3. **Capability Contract**
   - 是否支持结构化 JSON
   - 是否支持长上下文
   - 是否适合低延迟编排
   - 是否允许高成本批处理

### 当前原则

在 FableMap 中，任何 AI 能力都应优先输出**结构化字段**，而不是直接把长文本当成唯一结果。

这与 [`docs/AI_NATIVE_WORLD_ORCHESTRATION.md`](docs/AI_NATIVE_WORLD_ORCHESTRATION.md) 和 [`docs/ARCHITECTURE_PRINCIPLES.md`](docs/ARCHITECTURE_PRINCIPLES.md) 完全一致。

---

## 4. 学习它的“工程 guard 思维”

`waoowaoo` 很值得借鉴的一点，是它已经把不少经验固化成检查脚本，而不是继续依赖开发者记忆。

### 对 FableMap 最值得落地的 guard

不是复制它的大量脚本数量，而是学习这种思路，先实现最关键的 4 个 guard：

#### Guard A：世界真相来源约束

目标：防止前端或临时脚本绕过统一世界协议，私自拼装世界状态。

建议规则：

- 浏览器主舞台只能消费标准化 world payload
- 前端不得自行派生“第二份真相状态”
- 写回后新增字段必须经过协议文档登记

#### Guard B：AI 输出结构化约束

目标：防止后续把散文式 AI 输出直接塞进主链路。

建议规则：

- 编排器输出必须可序列化为 JSON
- 语义解释必须至少包含结构化键
- 任何生成失败都必须有可解释错误对象

#### Guard C：写回协议回归约束

目标：保证 `observe / dwell / mark` 的 payload 和返回结构不会悄悄漂移。

建议规则：

- 请求字段最小集合固定
- 返回字段最小集合固定
- 可见性层级字段固定

#### Guard D：确定性映射约束

目标：防止资产映射与世界字段映射在重构中失稳。

建议规则：

- `fantasy_type -> asset key` 必须可测试
- 相同 fixture 输入的基础舞台渲染数据应稳定

---

## 5. 借鉴“可运维的复杂系统”意识

`waoowaoo` 已经不仅仅是功能堆叠，而是在处理：

- 日志
- 回归
- 迁移
- 配置中心
- 多环境部署
- 用户侧错误恢复

这对 FableMap 的提醒是：

> 一旦进入“写回 + 编排 + 记忆 + 局部生成”阶段，项目就不再只是 world builder，而会变成一个持续运行的世界系统。

### 对当前项目最重要的运维意识补强

1. **统一错误分类**
   - 网络错误
   - 上游数据错误
   - 协议错误
   - AI 结构化失败
   - 写回治理拒绝

2. **统一日志上下文**
   - `slice_id`
   - `player_id`（如果有）
   - `task_id`
   - `event_type`
   - `lens`

3. **统一结果引用方式**
   - 不只返回“成功 / 失败”
   - 要返回当前世界切片、事件痕迹、编排建议、版本信息

---

## 不应照搬的部分

为了避免方向跑偏，也要明确哪些是**不适合直接照搬**的：

1. **不要把 FableMap 变成重型媒体生产系统**
   - 当前主线不是视频工作台
   - 当前主线是写回闭环 + 编排协议 + 世界状态成长

2. **不要过早引入过重的基础设施**
   - Redis、BullMQ、对象存储不是当前阻塞项
   - 当前更重要的是协议稳定与任务语义先行

3. **不要为了“像成熟 SaaS”而牺牲可迭代性**
   - FableMap 仍处于原型到系统化之间
   - 先做最小可持续抽象，不要一口气企业化过度设计

---

## 建议纳入当前项目的具体动作

## P0：本周就能开始的动作

### 1. 为写回与编排预留统一任务状态结构

建议位置：

- [`fablemap/writeback.py`](fablemap/writeback.py)
- [`fablemap/api_service.py`](fablemap/api_service.py)
- [`fablemap/orchestrator/schemas.py`](fablemap/orchestrator/schemas.py)

目标：

- 统一任务 / 事件 / 编排结果的结构化 envelope
- 为前端后续展示“状态变化而不是一次性提示”打基础

### 2. 增加最小协议回归测试

建议优先覆盖：

- `POST /api/world/event`
- `observe / dwell / mark` 事件结构
- 同一 slice 重入后的状态一致性

建议位置：

- [`tests/test_api.py`](tests/test_api.py)
- [`tests/test_demo.py`](tests/test_demo.py)
- [`tests/test_orchestrator.py`](tests/test_orchestrator.py)

### 3. 新增最小 guard 文档与脚本规划

建议先不大规模实现，而先在文档中明确：

- 什么叫协议漂移
- 什么叫第二真相来源
- 什么叫非结构化 AI 输出污染主链路

---

## P1：下一阶段动作

### 4. 定义 FableMap 任务注册表

建议新增概念：

- `slice.generate`
- `slice.merge_writeback`
- `slice.orchestrate`
- `surface.render_card`
- `memory.summarize`

### 5. 定义 FableMap 模型角色注册表

建议与 AIO1 对齐，至少区分：

- 解释模型
- 编排模型
- 记忆总结模型
- 表现生成模型

### 6. 为前端引入结构化状态面板

学习 `waoowaoo` 的不是 UI 风格，而是“复杂过程应该被看见”。

FableMap 前端后续可以显示：

- 本次切片是否命中缓存
- 最近写回事件
- 当前编排状态
- 当前镜头 / vibe / 可见性
- 最近一次失败属于哪一层

---

## 对当前路线的最终影响

吸收这些经验后，FableMap 的演进会更接近：

1. **稳定世界底座**继续保留
2. **写回事件**不再只是简单文件回写，而成为标准化世界输入流
3. **世界编排器**不再只是文档概念，而有明确任务化边界
4. **AI 能力**不再散落接入，而被角色化、结构化、可降级地治理
5. **前端主舞台**不再只展示结果，也能展示世界系统当前状态

这比直接追求“更炫的生成表现”更符合当前阶段，也更符合 FableMap 的长期护城河。

---

## 结论

FableMap 从 `waoowaoo` 最该学习的，是：

> **当产品开始依赖 AI、异步链路、外部能力与复杂状态时，必须尽早把这些不确定性收进“阶段化工作流 + 结构化协议 + guard 约束 + 可观察状态”里。**

对当前项目而言，这些经验最适合被集成为：

- 写回 / 编排统一任务语义
- AI 角色与 provider 抽象
- 最小协议回归测试
- 最小 guard 体系
- 前端结构化状态可见性

它们不会改变 FableMap 的方向，但会显著提升项目进入下一阶段时的稳定性与可扩展性。
