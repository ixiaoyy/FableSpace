# FableSpace 文档索引

本文档只保留当前有效入口。README 面向开源读者和部署者，`docs/` 面向产品定义、数据契约、部署和资源规范。AI 协作硬约束只在根目录 [AGENTS.md](../AGENTS.md) 维护。

## 推荐阅读顺序

1. [README.md](../README.md) — 开源项目介绍、自托管部署和基础配置入口。
2. [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) — 产品定位、核心体验和当前取舍。
3. [FABLESPACE_SPACE_PLATFORM.md](FABLESPACE_SPACE_PLATFORM.md) — 角色故事平台主线。
4. [WORLD_SCHEMA.md](WORLD_SCHEMA.md) — 核心数据结构与约束。
5. [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) — 明确不做的产品/技术方向。
6. [DEPLOYMENT.md](DEPLOYMENT.md) — GitHub Actions、Docker Compose、对象存储和 CDN 发布。
7. [IMAGE_ASSETS_SPEC.md](IMAGE_ASSETS_SPEC.md) — 图片对象存储、URL、清单与 prompt sidecar 规则。

## 文档职责

| 文档 | 职责 |
|------|------|
| `README.md` | 对外项目首页和部署入口，不承载详细产品论证。 |
| `AGENTS.md` | AI 协作硬约束的唯一入口，不在 `docs/` 维护副本。 |
| `PRODUCT_BRIEF.md` | 解释为什么做、给谁用、主体验是什么。 |
| `FABLESPACE_SPACE_PLATFORM.md` | 定义 P0 角色故事平台主线和产品边界。 |
| `WORLD_SCHEMA.md` | 维护 StoryWorld / Character / PlayerRole / PlayerStoryState 等核心 Schema 约束。 |
| `WHAT_NOT_TO_BUILD.md` | 作为负面清单，阻止方向漂移。 |
| `IMAGE_ASSETS_SPEC.md` | 约束图片对象 key、URL、清单、prompt sidecar 与验证。 |
| `DEPLOYMENT.md` | 维护生产自动部署、GitHub Secret、对象存储与 CDN 发布契约。 |

## 维护协作资料

- 当前任务、认领和验收结果保留在协作记录与最终汇报中。
- 开发任务树、依赖、执行清单和验收状态统一托管在 `.trellis/tasks/`，不再在 `docs/` 维护平行工作流文档。
- 长期产品、Schema、部署和开发约束维护在对应权威文档中。
- 代码路径、路由清单和实现分层以当前代码、README 与 `AGENTS.md` 为准，不在 `docs/` 维护易漂移的逐项镜像。
- 一次性实现过程和临时排查记录不要回流到 `docs/`。

## 一句话说明

FableSpace 的当前主线是**角色故事平台**：玩家从想见的角色进入其完整故事世界，以该故事预设的身份参与对话和选择，并通过私有关系、记忆和回访持续推进事件。当前只发布经过策划、审核和版本化的系统故事。
