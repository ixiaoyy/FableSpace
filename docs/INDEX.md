# FableSpace 文档索引

本文档只保留当前有效入口。历史任务记录统一在 `.trellis/tasks/`，不再放入 `docs/changes/`。

## 推荐阅读顺序

1. [README.md](../README.md) — 运行、配置、验证和常见操作手册。
2. [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) — 产品定位、核心体验和当前取舍。
3. [FABLESPACE_SPACE_PLATFORM.md](FABLESPACE_SPACE_PLATFORM.md) — 空间平台主线。
4. [ARCHITECTURE.md](ARCHITECTURE.md) — 系统分层、关键模块和 API 面。
5. [WORLD_SCHEMA.md](WORLD_SCHEMA.md) — 核心数据结构与约束。
6. [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) — 明确不做的产品/技术方向。
7. [IMAGE_ASSETS_SPEC.md](IMAGE_ASSETS_SPEC.md) — 图片资产落盘与 prompt sidecar 规则。
8. [AI参与开发协议.md](AI参与开发协议.md) — AI 协作和验证规则。

## 文档职责

| 文档 | 职责 |
|------|------|
| `README.md` | 项目操作手册，不承载详细产品论证。 |
| `PRODUCT_BRIEF.md` | 解释为什么做、给谁用、主体验是什么。 |
| `FABLESPACE_SPACE_PLATFORM.md` | 定义 P0 空间平台主线和产品边界。 |
| `ARCHITECTURE.md` | 把产品主线映射到代码模块、API 与存储。 |
| `WORLD_SCHEMA.md` | 维护 Space / NPC / 访客状态 / 玩法 / 关系等核心 Schema 约束。 |
| `WHAT_NOT_TO_BUILD.md` | 作为负面清单，阻止方向漂移。 |
| `IMAGE_ASSETS_SPEC.md` | 约束图片资产路径、命名、prompt sidecar 与验证。 |
| `AI参与开发协议.md` | 约束 AI 如何读文档、改代码、留痕和汇报。 |

## 历史与规范

- 当前任务、认领和验收记录：`.trellis/tasks/`
- 长期开发规范：`.trellis/spec/`
- Trellis 流程说明：`.trellis/workflow.md`
- 旧 `docs/changes/` 已清理；一次性变更记录不要再回流到 `docs/`。

## 一句话说明

FableSpace 的当前主线是**真实地图锚点上的 AI 空间平台**：店主创建空间并配置 NPC，探索者进入空间互动、留下记忆并回访。
