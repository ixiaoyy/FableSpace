# Completion note

## 实现摘要

- 后端新增 `public_welfare_rules.py`，把公益酒馆 no-network/rules backend 的关键字、动作和回复文案从 service 方法迁到集中配置。
- `web/service.py` 和 `application/services/runtime.py` 改为调用集中规则解析函数，不再按 `pw_*` 酒馆 ID 写内联特判分支。
- `default_taverns.py` 增加 `public_welfare_npc_asset_url()` 和 NPC ID 清单，默认公益 NPC neutral 资产 URL 由统一 helper 生成。
- 前端新增 `tavern-runtime-config.js`，集中 demo 身份、新人入口、公益 NPC 表情预览/旧路径兼容、酒馆氛围图 fallback 配置。
- 前端新增 `portraitCatalogConfig.ts`，集中 NPC fallback portrait imports、公益角色 portrait override、首页/创建/入场面板预览头像。
- 更新前端路由/服务/组件调用集中配置，减少散落 literal。
- 新增后端与前端集中化回归测试，并纳入 `npm test`。

## 保留边界

- 未修改 Tavern/TavernCharacter/WorldInfoEntry/VisitorState Schema。
- 未改变公益默认酒馆/角色 ID、默认文案语义、坐标或访问规则。
- 未移动或删除 docs 文档。
- 未新增依赖。
- 未修改图片资源文件本身。

## 验证记录

- `C:\Users\phpxi\miniconda3\python.exe -m compileall -q backend/src`：通过。
- `C:\Users\phpxi\miniconda3\python.exe -m pytest -q --tb=short tests/test_public_welfare_runtime_config.py tests/test_default_public_welfare_gameplays.py tests/test_default_public_welfare_taverns.py`：31 passed。
- `node .\frontend\scripts\runtime-config-centralization-test.mjs`：ok。
- `node .\frontend\scripts\homepage-dynamic-entry-test.mjs`：ok。
- `node .\frontend\scripts\tavern-chat-workbench-test.mjs`：ok。
- `npm --prefix .\frontend run typecheck`：通过。
- `npm --prefix .\frontend run build`：通过。
- `npm --prefix .\frontend test`：通过。
- `C:\Users\phpxi\miniconda3\python.exe -m pytest -q --tb=short`：543 passed, 103 warnings（既有 datetime.utcnow DeprecationWarning）。
- `git diff --check -- <本任务文件>`：0 错误，仅 CRLF warning。

## 交叉层检查

- 后端服务层只编排调用，公益规则数据集中在 `core/public_welfare_rules.py`。
- 前端展示层只导入配置，demo/newcomer/asset/fallback 数据集中在 `app/lib/tavern-runtime-config.js` 和 `portraitCatalogConfig.ts`。
- 搜索确认运行时代码中剩余 `owner-demo`、`visitor-demo`、`pw_lantern_helpdesk`、`npc-style-cast/portraits` 只保留在集中配置文件；`default_taverns.py` 中 `pw_*` seed 数据按任务边界保留。
- `C:\Users\phpxi\miniconda3\python.exe .\.trellis\scripts\task.py validate 05-05-hardcoded-runtime-config-centralization`：通过。
