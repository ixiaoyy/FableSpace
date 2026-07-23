# Technical Design

## Goal and boundaries

目标是删除所有可达创作者产品面、地图前台、中文兼容路由和对应写 API，
再删除失去消费者的实现文件。

允许修改：

- `apps/web/app/routes.ts`、相关路由、导航、CTA 和旧 URL 适配；
- 只服务于创建、owner 管理、角色卡、preset、package 和私有 LLM 的前端文件；
- `apps/api/src/fablespace_api/api/v1/` 中专用 creator 路由，以及混合路由中的 creator 写端点；
- 失去全部调用方的 creator contracts、application services、domain policy、store 与配置；
- 与上述删除直接对应的环境示例和权威文档。

禁止修改：

- `apps/api/src/fablespace_api/domain/story_world.py` 和系统故事注册表；
- 系统级 `OPENCODE_*` LLM 配置；
- 玩家当前仍依赖的旧 Space 读取、进入、聊天和 Gameplay 运行端点；
- 当前未提交的 `default_spaces.py`、Home 书架组件、素材临时目录和日志。

## Phase A: public surface

React Router 收口为：

- `/`
- `/characters`
- `/stories/:spaceRef`

删除以下前端入口及中文、旧英文和 Tavern 别名：

- `/空间/新建`
- `/空间/:spaceRef/管理`
- `/空间/:spaceRef/角色/:characterRef/提示词`
- `/店主`
- `/店主/:ownerRef`
- `/create`
- `/owner`
- `/space/:spaceId/manage`
- `/space/:spaceId/character/:characterId/prompt`
- `/tavern/:spaceId/manage`
- `/tavern/:spaceId/character/:characterId/prompt`
- `/creator/:ownerId`

同步移除主导航、发现页、任务页、通知页和参考界面中的创建/店主 CTA。
旧 URL 返回 404，不重定向到另一个隐藏兼容入口。

同时删除 `WorldMap`、territory 面板、附近检索、经纬度筛选、地图 SDK
配置与地图视觉。历史地点、年份和建筑名只作为故事内容，不触发地图能力。

## Phase B: creator API

完整删除专用路由：

- `/owners/**`
- `/space-packages/**`
- `/spaces/{id}/package`
- `/spaces/{id}/visitors`
- owner config、WorldInfo authoring 和 SkillPack authoring 路由

混合路由按 HTTP 能力删除：

- Space：create/update/delete、owner metrics 与 owner 管理写入；
- Character：parse/export/AI draft/import/add/update/delete 与 sprite 写入；
- Runtime：owner LLM test、私有 LLM/voice 配置写入；
- Gameplay：定义写入；保留玩家会话运行；
- 其他模块只在端点本身明确属于用户创作或 owner 管理时删除。

API 删除以 FastAPI 实际注册路由清单为验收依据，不只靠文件名扫描。

## Phase C: dependency retirement

从已删入口向下生成依赖闭包，并对每个候选做反向引用检查：

1. 活动路由、root、shell 或保留模块仍导入 → 保留或先迁移通用函数；
2. 只被已删 creator 入口导入 → 删除；
3. 同时含玩家通用逻辑 → 抽出最小通用函数后删除 owner 容器；
4. 数据表、列和物理迁移留给 `07-23-legacy-schema-config-removal`，本任务不静默删库。

旧 `/api/v1/spaces` 名称属于 `07-23-legacy-space-contract-removal` 的过渡
债务；本任务只保留当前玩家运行所需的最小只读/互动子集，不把该名字继续
暴露为创作者或地图合同。

## System LLM boundary

删除 owner / Space 级模型、API Key、base URL、生成参数和 Token 面板。
保留部署环境统一管理的系统 LLM；不得把系统密钥移入 StoryWorld 内容或公开 API。

## Verification

- 从 React Router 配置提取路径，确认 creator 入口集合为空。
- 确认路由字符串无中文且地图/territory/AMap 不在活动前端依赖图。
- 从 FastAPI app 提取实际路由与方法，确认 creator 写端点为空。
- 对删除文件执行反向引用扫描。
- `py -3 -m compileall -q apps/api/src`
- `npm --prefix .\apps\web run typecheck`
- `npm --prefix .\apps\web run build`
- `git diff --check` 与暂存路径白名单审计。
