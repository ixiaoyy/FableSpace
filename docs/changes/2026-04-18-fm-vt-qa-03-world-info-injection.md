# 2026-04-18 - FM-VT-QA-03 世界书注入测试

为世界书命中测试 API 与 Prompt 注入链路补充回归测试，锁住常驻条目、关键词、次级关键词、depth、order、disabled、probability 等规则。

## 范围

| 文件 | 说明 |
|------|------|
| `tests/test_tavern_world_info_injection.py` | 新增世界书注入回归测试 |
| `fablemap/world_info_injector.py` | 让 Prompt 注入按每条世界书的 `depth` 扫描最近历史 |
| `fablemap/web/service.py` | 让命中测试 API 按每条世界书的 `depth` 扫描最近历史，并归一化返回值 |
| `docs/claims/2026-04-18-fm-vt-qa-03-world-info-injection.md` | 新增并完成 QA-03 认领说明 |
| `docs/AI_SHARED_TASKLIST.md` | 标记 QA-03 完成并补认领记录 |
| `docs/CURRENT_TASKS.md` | 增加 QA-03 回归阶段记录 |

## 行为

- 常驻条目不需要关键词即可命中，并按 `order` 排入注入结果。
- 主关键词和次级关键词均会在当前输入与最近历史中命中。
- `depth` 现在限制每条世界书能扫描的最近历史条数；过旧历史不会触发低 depth 条目。
- `disable: true` 的条目即使命中关键词也不会注入，命中测试 API 返回 `disabled` 状态。
- `probability: 0` 的条目即使命中关键词也不会注入，命中测试 API 返回 `probability_zero` 状态。
- PromptBuilder 的世界书注入和命中测试 API 对 depth / order / disabled / probability 的判断保持一致。

## 验证

- `py -3 -m pytest tests/test_tavern_world_info_injection.py`
- `py -3 -m pytest tests/test_tavern_router_compat.py tests/test_tavern_prompt_blocks.py tests/test_tavern_world_info_injection.py`
- `py -3 -m compileall -q fablemap`
- `npm --prefix .\frontend run build`
