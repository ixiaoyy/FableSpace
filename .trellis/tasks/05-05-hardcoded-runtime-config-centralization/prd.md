# Centralize hardcoded runtime config

## 目标

把本轮检索发现的“散落写死数据”纳入 Trellis 任务并完成低风险集中化：

1. 后端规则 fallback 中按公益酒馆 ID 分散的运行时特判，集中到单一配置模块。
2. 前端 NPC fallback 肖像、公益 NPC 资产路径兼容、氛围图/首页 fallback、新人入口默认酒馆等配置集中到可复用模块。
3. 默认 owner/visitor demo 身份保留现有 API 兼容，但增加明确命名和回归检查，避免 visitor 路径错误落到 owner-demo。
4. 保持现有 Tavern / TavernCharacter / WorldInfoEntry / VisitorState Schema 不变，保持公益默认内容不改文案语义。

## 可修改范围

- `backend/src/fablemap_api/core/` 中运行时规则配置和服务调用点。
- `backend/src/fablemap_api/application/services/` 中按酒馆 ID 的轻量规则调用点。
- `frontend/app/lib/`、`frontend/app/features/tavern-npc-stage/`、`frontend/app/features/tavern-chat-workbench/`、`frontend/app/product/services/` 中配置/解析工具。
- `frontend/scripts/` 和 `tests/` 中针对集中化边界的回归测试。
- 本任务目录内 Trellis 记录。

## 不改范围

- 不新增或修改 `docs/WORLD_SCHEMA.md` 中的数据字段/枚举含义。
- 不改变默认公益酒馆的 tavern_id / character_id / 文案语义 / 坐标 / 访问规则。
- 不移动、删除、重命名既有 `docs/` 文档。
- 不引入新依赖。
- 不改图片资源文件本身。
- 不做平台自动生成并上线内容、Token 结算、访客社交、战斗等级等负面清单方向。

## 输入依据

- 用户要求：把检索出的类似写死数据列入 Trellis 任务并全部改一下。
- `AGENTS.md`、`README.md`、`docs/PRODUCT_BRIEF.md`、`docs/FABLEMAP_TAVERN_PLATFORM.md`、`docs/ARCHITECTURE.md`、`docs/WORLD_SCHEMA.md`、`docs/WHAT_NOT_TO_BUILD.md`、`docs/AI参与开发协议.md`。
- `.trellis/spec/backend/*`、`.trellis/spec/frontend/*`、`.trellis/spec/guides/*`。

## 验收标准

- 后端公益规则 fallback 不再在服务方法里直接写多段 `if tavern_id == "pw_*"` 的完整规则表；服务方法从集中配置解析。
- 前端公益 NPC 资产路径/肖像 fallback、新人入口 ID、氛围 fallback 有集中配置入口，组件/服务复用，不新增散落常量。
- 回归测试覆盖：
  - 公益规则配置能命中原有关键字回复。
  - 重点文件不再出现服务层分散特判结构。
  - 前端脚本能验证新集中配置模块存在并被调用。
- 所有原有核心测试/build 通过。

## 验证方式

- `C:\Users\phpxi\miniconda3\python.exe -m compileall -q backend/src`
- `C:\Users\phpxi\miniconda3\python.exe -m pytest -q --tb=short tests/test_tavern_output_rules.py tests/test_default_public_welfare_gameplays.py tests/test_default_public_welfare_taverns.py`
- `node .\frontend\scripts\tavern-chat-workbench-test.mjs`
- `npm --prefix .\frontend run typecheck`
- `npm --prefix .\frontend run build`
- `npm --prefix .\frontend test`
