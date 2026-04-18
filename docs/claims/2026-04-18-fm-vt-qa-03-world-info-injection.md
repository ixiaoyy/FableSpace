# FM-VT-QA-03 任务认领：世界书注入测试

## 任务 ID
FM-VT-QA-03

## 任务名称
世界书注入测试

## 认领时间
2026-04-18

## 负责人
Codex

## 改动类型
测试补全 / 注入规则回归切片

## 任务目标
为世界书命中测试 API 与 Prompt 注入链路补充回归测试，覆盖常驻条目、关键词触发、次级关键词、depth、order、disabled、probability 和命中测试 API，确保“哪些世界书会进 Prompt”可预测、可解释。

## 可修改范围
- `tests/test_tavern_world_info_injection.py`
- `fablemap/world_info_injector.py`
- `fablemap/web/service.py`
- `docs/AI_SHARED_TASKLIST.md`
- `docs/CURRENT_TASKS.md`
- `docs/changes/2026-04-18-fm-vt-qa-03-world-info-injection.md`

实现文件仅在测试暴露现有规则缺口时做最小修正。

## 明确不改范围
- 不重写世界书模型字段协议。
- 不改 WorldBookEditor UI。
- 不引入 LLM 调用或随机验收。
- 不接管 Prompt Block / 输出护栏 QA-04。
- 不接管当前工作树中其他未提交的记忆、移动端或控制台改动。

## 依据的协议文档
- `docs/AI参与开发协议.md`
- `docs/AI_SHARED_TASKLIST.md`
- `docs/CURRENT_TASKS.md`

## 预期产出
- 新增世界书注入回归测试文件。
- 如有必要，补齐 depth 等注入规则的最小实现。
- 新增本次 QA 切片变更说明。
- 更新共享任务清单认领记录。

## 验证方式
- `py -3 -m pytest tests/test_tavern_world_info_injection.py`
- `py -3 -m pytest tests/test_tavern_router_compat.py tests/test_tavern_prompt_blocks.py tests/test_tavern_world_info_injection.py`
- `py -3 -m compileall -q fablemap`
- `npm --prefix .\frontend run build`

## 当前状态
done
