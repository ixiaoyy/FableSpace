# 编排器工程能力增强

## 变更时间
2026-03-17

## 变更类型
工程实践 / 协议治理

## 变更概述

基于 waoowaoo 工程实践启发，为编排器补充关键工程能力，防止协议漂移和复杂度失控。

## 主要内容

### 1. 统一任务状态结构

新增 `fablemap/orchestrator/task_envelope.py`：
- 定义统一的任务封装结构
- 包含 task_id, task_type, status, stage
- 记录时间戳、输入输出摘要、警告和错误

### 2. 增强编排器输出元信息

更新 `fablemap/orchestrator/schemas.py`：
- OrchestratorOutput 新增 stage, status, started_at, completed_at, warnings
- 为前端提供可观察的任务状态

### 3. 协议回归测试（Guard）

新增 `tests/test_protocol_guard.py`：
- Guard A: 编排器输出结构稳定性检查
- Guard B: 观察者效应结构稳定性检查
- Guard C: 事件建议结构稳定性检查
- 防止协议字段悄悄漂移

### 4. 编排器填充元信息

更新 `fablemap/orchestrator/rule_engine.py`：
- 记录 started_at 和 completed_at
- 填充 stage 和 status 字段
- 为后续异步任务化打基础

## 测试结果

```
tests/test_protocol_guard.py::test_orchestrator_output_structure PASSED
tests/test_protocol_guard.py::test_observer_effect_structure PASSED
tests/test_protocol_guard.py::test_event_suggestion_structure PASSED
```

## 设计原则

遵循 waoowaoo 启发的 5 类经验：
1. ✅ 阶段化工作流 - 增加 stage 字段
2. ✅ 后台任务语义 - 定义 TaskEnvelope
3. ⏳ AI/Provider 抽离 - 待后续实现
4. ✅ Guard 约束 - 协议回归测试
5. ✅ 可运维意识 - 时间戳和状态追踪

## 影响范围

- `fablemap/orchestrator/` - 新增 task_envelope.py，更新 schemas.py 和 rule_engine.py
- `tests/` - 新增 test_protocol_guard.py
- 前端暂无影响，但为后续状态面板预留接口

## 后续工作

1. 为写回系统增加类似的任务封装
2. 定义模型角色注册表（semantic_interpreter, world_orchestrator 等）
3. 前端增加结构化状态面板
4. 补充更多 Guard（写回协议、确定性映射等）

## 参考文档

- [waoowaoo-inspired-engineering-adoption.md](waoowaoo-inspired-engineering-adoption.md)
- [WORLD_ORCHESTRATOR_PROTOCOL.md](../WORLD_ORCHESTRATOR_PROTOCOL.md)
