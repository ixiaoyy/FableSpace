# FableSpace 文档索引

本文档只保留当前有效入口。README 面向开源读者和部署者，`docs/` 面向产品理解、系统设计和维护协作。

## 推荐阅读顺序

1. [README.md](../README.md) — 开源项目介绍、自托管部署和基础配置入口。
2. [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) — 产品定位、核心体验和当前取舍。
3. [FABLESPACE_SPACE_PLATFORM.md](FABLESPACE_SPACE_PLATFORM.md) — 空间平台主线。
4. [ARCHITECTURE.md](ARCHITECTURE.md) — 系统分层、关键模块和 API 面。
5. [WORLD_SCHEMA.md](WORLD_SCHEMA.md) — 核心数据结构与约束。
6. [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) — 明确不做的产品/技术方向。
7. [IMAGE_ASSETS_SPEC.md](IMAGE_ASSETS_SPEC.md) — 图片资产落盘与 prompt sidecar 规则。
8. [AI参与开发协议.md](AI参与开发协议.md) — 仓库维护者的 AI 协作和验证规则。
9. [DEPLOYMENT.md](DEPLOYMENT.md) — GitHub Actions、Docker Compose、对象存储和 CDN 发布。

## 文档职责

| 文档 | 职责 |
|------|------|
| `README.md` | 对外项目首页和部署入口，不承载详细产品论证。 |
| `PRODUCT_BRIEF.md` | 解释为什么做、给谁用、主体验是什么。 |
| `FABLESPACE_SPACE_PLATFORM.md` | 定义 P0 空间平台主线和产品边界。 |
| `ARCHITECTURE.md` | 把产品主线映射到代码模块、API 与存储。 |
| `WORLD_SCHEMA.md` | 维护 Space / NPC / 访客状态 / 玩法 / 关系等核心 Schema 约束。 |
| `WHAT_NOT_TO_BUILD.md` | 作为负面清单，阻止方向漂移。 |
| `IMAGE_ASSETS_SPEC.md` | 约束图片资产路径、命名、prompt sidecar 与验证。 |
| `AI参与开发协议.md` | 约束 AI 如何读文档、改代码、留痕和汇报。 |
| `DEPLOYMENT.md` | 维护生产自动部署、GitHub Secret、对象存储与 CDN 发布契约。 |

## 维护协作资料

- 当前任务、认领和验收结果保留在协作记录与最终汇报中。
- 长期产品、Schema、架构和开发约束维护在对应权威文档中。
- 一次性实现过程和临时排查记录不要回流到 `docs/`。

## 一句话说明

FableSpace 的当前主线是**真实地图锚点上的 AI 空间平台**：店主创建空间并配置 NPC，探索者进入空间互动、留下记忆并回访。
