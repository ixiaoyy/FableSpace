# FableMap 文档索引

## 📌 快速导航

**新手必读**：
1. [ARCHITECTURE_PRINCIPLES.md](ARCHITECTURE_PRINCIPLES.md) - 架构原则与边界（最高优先级）
2. [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) - 明确不做清单
3. [AI_SHARED_TASKLIST_V2.md](AI_SHARED_TASKLIST_V2.md) - 当前任务列表

---

## P0 - 架构决策文档（必读）

| 文档 | 用途 | 优先级 |
|------|------|--------|
| [ARCHITECTURE_PRINCIPLES.md](ARCHITECTURE_PRINCIPLES.md) | 架构原则、四层模型、决策过滤器 | ⭐⭐⭐ |
| [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) | 明确不做清单、克制原则 | ⭐⭐⭐ |
| [AI_NATIVE_WORLD_ORCHESTRATION.md](AI_NATIVE_WORLD_ORCHESTRATION.md) | AI-native 完整架构设计 | ⭐⭐⭐ |
| [AI_SHARED_TASKLIST_V2.md](AI_SHARED_TASKLIST_V2.md) | 按四层模型组织的任务列表 | ⭐⭐⭐ |

---

## P1 - 核心协议文档

| 文档 | 用途 | 状态 |
|------|------|------|
| [WORLD_SCHEMA.md](WORLD_SCHEMA.md) | 世界数据结构定义 | ✅ 稳定 |
| [UNIVERSAL_TRANSMUTATION_PROTOCOL.md](UNIVERSAL_TRANSMUTATION_PROTOCOL.md) | 万物转义协议 | ✅ 稳定 |
| [WORLD_WRITEBACK_GOVERNANCE.md](WORLD_WRITEBACK_GOVERNANCE.md) | 写回治理边界（P3） | ✅ 完成 |
| [TIME_FOLDS_PROTOCOL.md](TIME_FOLDS_PROTOCOL.md) | 时间褶皱协议（P4） | ✅ 完成 |
| [DUAL_TRACK_MAPPING.md](DUAL_TRACK_MAPPING.md) | 双轨映射规则 | ✅ 稳定 |
| [PLAYER_STATE.md](PLAYER_STATE.md) | 玩家状态设计 | ✅ 稳定 |

---

## P2 - 实施计划文档

| 文档 | 用途 | 状态 |
|------|------|------|
| [AIO1_WORLD_ORCHESTRATOR_PLAN.md](AIO1_WORLD_ORCHESTRATOR_PLAN.md) | 世界编排器实施计划（5 阶段） | 📋 待实施 |
| [WORLD_WRITEBACK_PLAN.md](WORLD_WRITEBACK_PLAN.md) | 写回协议实施计划 | ✅ 后端完成 |
| [MAP_ASSETS_PLAN.md](MAP_ASSETS_PLAN.md) | 地图资源规划 | ⚠️ 已降低优先级 |

---

## P3 - 设计参考文档

| 文档 | 用途 | 状态 |
|------|------|------|
| [WEB_2D_SPIRIT_VIEW.md](WEB_2D_SPIRIT_VIEW.md) | 2D 世界地图设计 | 📖 参考 |
| [CULTURAL_INTERPRETATION.md](CULTURAL_INTERPRETATION.md) | 文化诠释系统 | 📖 参考 |
| [STYLE_VIBES_MANIFESTO.md](STYLE_VIBES_MANIFESTO.md) | 审美系统宣言 | 📖 参考 |
| [STREET_AS_A_SENTENCE.md](STREET_AS_A_SENTENCE.md) | 街道叙事设计 | 📖 参考 |
| [DISTURBANCE_MODEL.md](DISTURBANCE_MODEL.md) | 扰动模型 | 📖 参考 |
| [DISTURBANCE_INTERFACE_ALIGNMENT.md](DISTURBANCE_INTERFACE_ALIGNMENT.md) | 扰动接口对齐 | 📖 参考 |

---

## P4 - 协作规范

| 文档 | 用途 |
|------|------|
| [AI参与开发协议.md](AI参与开发协议.md) | AI 协作规范 |
| [claims/README.md](claims/README.md) | 任务认领规范 |

---

## 📁 归档文档（archive/）

以下文档已移至 `docs/archive/`，不再作为当前参考：

- `GODOT_INTEGRATION.md` - Godot 集成（已不在技术栈）
- `CAUSAL_RIPPLE_ALGORITHM.md` - 因果涟漪算法（已被世界编排器替代）
- `AESTHETIC_EMOTION_SYSTEMS.md` - 审美情感系统（过于早期）
- `FACTION_SYSTEM.md` - 阵营系统（长期项）
- `LONG_TERM_EXPERIENCE.md` - 长期体验设计（过于宏大）

---

## ⚠️ 已废弃文档

- `AI_SHARED_TASKLIST.md` (v0.1) - 请使用 [AI_SHARED_TASKLIST_V2.md](AI_SHARED_TASKLIST_V2.md)
- `CURRENT_TASKS.md` - 已简化为导航页

---

## 📂 文件夹说明

- `claims/` - 任务认领记录（历史保留）
- `changes/` - 变更记录（历史保留）
- `archive/` - 归档文档（不再维护）

---

## 🔄 文档更新规则

1. **核心文档变更**：需要团队评审
2. **协议文档变更**：需要遵循 [AI参与开发协议.md](AI参与开发协议.md)
3. **任务列表更新**：完成任务后同步更新状态
4. **新增文档**：需要在本索引中注册

---

## 版本历史

- v1.0 (2026-03-17): 初始版本，基于文档清理计划创建
