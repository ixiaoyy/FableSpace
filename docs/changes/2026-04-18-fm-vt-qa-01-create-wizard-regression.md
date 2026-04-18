# 2026-04-18 - FM-VT-QA-01 开店向导回归测试

为 3 分钟开店向导补充回归测试，锁住创建酒馆、入口规则、AI 配置测试和角色持久化的核心链路。

## 范围

| 文件 | 说明 |
|------|------|
| `tests/test_tavern_create_wizard_regression.py` | 新增开店向导 payload 层回归测试 |
| `docs/claims/2026-04-18-fm-vt-qa-01-create-wizard-regression.md` | 新增并完成 QA-01 认领说明 |
| `docs/AI_SHARED_TASKLIST.md` | 标记 QA-01 完成并补认领记录 |
| `docs/CURRENT_TASKS.md` | 增加 QA 回归阶段记录 |

## 行为

- 覆盖公开、密码、私人三类酒馆的创建和入场边界。
- 覆盖无 AI 配置创建为 closed、本地 Ollama base_url-only 配置开门、远端 API Key 配置开门。
- 覆盖 `/api/llm/test-config` 同源 payload 的成功、缺少凭据失败和上游错误失败。
- 覆盖 SillyTavern 角色卡导入、手动角色追加、角色标签 / 精灵图 / 世界书条目持久化。
- 不修改 Tavern / Character / LLM 既有字段协议，不引入新的前端测试依赖。

## 验证

- `py -3 -m pytest tests/test_tavern_create_wizard_regression.py`
- `py -3 -m compileall -q fablemap`
- `npm --prefix .\frontend run build`
