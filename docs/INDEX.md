# Web 像素农场生活游戏文档索引

本文档只列当前新游戏的权威入口。根目录 `README.md` 面向开发者和部署者；`docs/` 维护长期产品与资源边界；AI 协作硬约束只在根目录 `AGENTS.md` 维护。

## 推荐阅读顺序

1. [README.md](../README.md) — 项目入口、首片范围、本地运行与配置。
2. [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) — 产品定位、核心循环与当前验收边界。
3. [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) — 永久禁区和首片明确不做事项。
4. [IMAGE_ASSETS_SPEC.md](IMAGE_ASSETS_SPEC.md) — 第三方 CC0 素材、对象存储、manifest、来源和哈希合同。
5. [前端开发规范](../.trellis/spec/frontend/index.md) — React Router / Vite / Phaser 开发入口。
6. [像素游戏运行时规范](../.trellis/spec/frontend/pixel-game-runtime.md) — 场景、输入、碰撞、遮挡、切换和本地存档合同。

## 文档职责

| 文档 | 职责 |
|---|---|
| `README.md` | 对外项目首页、运行入口和当前仓库状态 |
| `AGENTS.md` | 全仓 AI 协作、安全、产品与验证硬约束 |
| `PRODUCT_BRIEF.md` | 为什么做、给谁玩、首片体验和成功标准 |
| `WHAT_NOT_TO_BUILD.md` | 阻止旧产品回流、范围膨胀和未经批准的系统 |
| `IMAGE_ASSETS_SPEC.md` | 素材授权、来源、转换、对象 key、CDN 和清单 |
| `.trellis/spec/frontend/index.md` | 当前前端规范索引与前置检查 |
| `.trellis/spec/frontend/pixel-game-runtime.md` | Phaser 游戏运行时的可执行工程合同 |

## 待清退历史资料

`FABLESPACE_SPACE_PLATFORM.md`、`WORLD_SCHEMA.md` 及其他 Character、StoryWorld、StoryRun、LLM、历史故事、角色路由、聊天、记忆和后台管理文档不再是当前产品真源。仍描述旧后端、数据库或 `fablespace/media/v1` 的部署文档同样不是新游戏合同。

这些文件暂时保留只为后续引用审计和精确清退。新实现不得引用它们建立兼容层，也不得在本次合同重置中批量删除、移动或重命名。

## 维护规则

- 当前任务、实施顺序和验收状态保留在 `.trellis/tasks/`，不在 `docs/` 复制过程清单。
- 长期产品、运行时和资源合同变化须同步对应权威文档。
- 旧能力清退必须单独列出精确目标、引用、数据影响和回滚边界。
- 一次性调研、截图和临时排查记录不要提升为长期权威文档。

## 一句话说明

当前主线是一个无需登录即可直接游玩的桌面 Web 俯视角像素农场生活游戏：首片只完成农场、住宅、四向移动与碰撞、进出门、睡到第二天和本地存档；论坛只是普通外链。
