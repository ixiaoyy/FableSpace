# 删除旧创作者、SillyTavern、地图前台与中文路由

## Goal

让新玩家前台只呈现角色发现与故事互动，删除创建、店主、owner、
SillyTavern、地图前台和中文兼容路由。

## Requirements

- 删除用户创作、店主/owner、SillyTavern 和故事包能力。
- 覆盖创建向导、管理页、owner API、角色卡导入导出、解析器、package、私有 LLM 配置和 Token 统计。
- 系统故事内容注册表与系统级 LLM 配置必须保持可用。
- 公开前端只保留 `/`、`/characters` 与 `/stories/:ref` 三类 ASCII 路由。
- 删除地图、territory、坐标筛选、地图 SDK 和地图视觉；真实地点与时间只可作为已发布故事内容呈现。
- 中文旧 URL、旧英文 URL 和 Tavern URL 必须直接 404，不保留重定向或隐藏兼容入口。
- 当前玩家游玩仍依赖的旧 `/api/v1/spaces` 读取、进入、聊天和 Gameplay
  运行合同可作为 StoryWorld runtime 落地前的短期内部桥接，但不得暴露
  owner 写入、地图、坐标或供给侧能力。
- 先移除所有可达入口与写 API，再按反向依赖图删除只被这些入口消费的文件；不保留隐藏路由、旧 URL 重定向或“仅管理员可见”的兼容入口。
- 混合承载玩家读取/游玩与创作者写入的路由模块，只删除创作者写入端点，保留玩家运行所需端点。
- `StoryWorldRegistry`、系统 `OPENCODE_*` 环境配置、认证和玩家私有运行状态不属于删除范围。
- 当前未提交的 Home 书架组件与 `default_spaces.py` 属于并行工作，不进入本任务提交；其中若仍出现 owner 文案，只记录冲突，不整文件覆盖或顺带提交。

## Acceptance Criteria

- [x] 无创建、店主、管理、导入、导出或故事包入口。
- [x] React Router 实际路由只有 `/`、`/characters` 与 `/stories/:ref`，不存在中文或旧 URL 别名。
- [x] 玩家前台不加载或显示地图、territory、经纬度、地图 SDK 或地图图标。
- [x] API 路由不再注册对应写入能力。
- [x] 文档和前端不再宣传 SillyTavern 或创作者生态。
- [x] 系统故事运行和系统 LLM 不受影响。
- [x] Python、前端构建和残留引用审计通过。
- [x] 暂存快照不包含并行 Home、默认种子、日志或临时数据文件。

## Notes

- 权威依据：`PRODUCT_BRIEF.md`、`FABLESPACE_SPACE_PLATFORM.md`、
  `WORLD_SCHEMA.md` 与 `WHAT_NOT_TO_BUILD.md` 都明确当前只发布系统故事，
  不保留创作者、owner、SillyTavern、角色卡、私有 LLM、地图/LBS、
  中文旧路径或兼容别名。
