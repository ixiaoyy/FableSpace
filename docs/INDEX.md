# FableMap 文档索引

## 快速导航

如果你是第一次进入这个项目，建议按以下顺序阅读：

1. [README.md](../README.md) — 项目总览、启动方式、核心模块
2. [docs/PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) — 产品定义与目标体验
3. [docs/FABLEMAP_TAVERN_PLATFORM.md](FABLEMAP_TAVERN_PLATFORM.md) — 空间平台主线设计
4. [docs/ARCHITECTURE.md](ARCHITECTURE.md) — 系统分层、模块边界、API 端点
5. [docs/WORLD_SCHEMA.md](WORLD_SCHEMA.md) — 数据模型与 Schema 约束
6. [docs/WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) — 明确不做清单
7. [docs/AI参与开发协议.md](AI参与开发协议.md) — AI 协作、认领、验证和变更说明规则
8. [.trellis/workflow.md](../.trellis/workflow.md) — Trellis 任务与会话流程
9. [.trellis/spec/](../.trellis/spec/) — 按改动范围读取 backend / frontend / guides 规范

---

## P0 - 当前主线文档（必读）

| 文档 | 用途 | 状态 |
|------|------|------|
| [README.md](../README.md) | 项目总览、启动方式、核心模块 | ✅ 当前有效 |
| [docs/PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) | 产品定义、用户价值、目标体验 | ✅ 当前有效 |
| [docs/FABLEMAP_TAVERN_PLATFORM.md](FABLEMAP_TAVERN_PLATFORM.md) | 空间平台完整设计文档 | ✅ 主线 |
| [docs/ARCHITECTURE.md](ARCHITECTURE.md) | 系统分层、模块边界、API 端点 | ✅ 当前有效 |
| [docs/WORLD_SCHEMA.md](WORLD_SCHEMA.md) | Tavern / TavernCharacter / WorldInfoEntry / VisitorState 等数据结构 | ✅ 当前有效 |
| [docs/WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) | 明确不做清单、约束边界 | ✅ 当前有效 |

---

## P1 - 资源与协作规范

| 文档 | 用途 | 状态 |
|------|------|------|
| [docs/IMAGE_ASSETS_SPEC.md](IMAGE_ASSETS_SPEC.md) | 图像资源、prompt sidecar 与资产落盘规范 | ✅ 当前有效 |
| [docs/AI参与开发协议.md](AI参与开发协议.md) | AI 协作、任务认领、验证和交付协议 | ✅ 当前有效 |

---

## 任务与历史记录

- 当前任务、认领、验收记录统一使用 [.trellis/tasks/](../.trellis/tasks/)。
- 开发规范统一使用 [.trellis/spec/](../.trellis/spec/)。
- 旧 `docs/changes/`、`docs/claims/`、共享任务清单和一次性规划文档已在 2026-05-12 清理，不再作为仓库入口。

---

## 一句话说明

当前 FableMap 的文档主线为**空间平台**：每个人都可以在真实地图上开一间自己的空间，配置 AI NPC，接待访客。
