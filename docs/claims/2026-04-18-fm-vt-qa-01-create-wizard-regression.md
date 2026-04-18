# FM-VT-QA-01 任务认领：开店向导回归测试

## 任务 ID
FM-VT-QA-01

## 任务名称
开店向导回归测试

## 认领时间
2026-04-18

## 负责人
Codex

## 改动类型
测试补全 / 回归验证切片

## 任务目标
为 3 分钟开店向导的关键提交链路补充回归测试，覆盖公开、密码、私人酒馆创建，无 AI 配置时的状态，LLM 配置测试成功 / 失败，以及导入角色卡和手动创建角色后的持久化行为。

## 可修改范围
- `tests/test_tavern_create_wizard_regression.py`
- `docs/AI_SHARED_TASKLIST.md`
- `docs/CURRENT_TASKS.md`
- `docs/changes/2026-04-18-fm-vt-qa-01-create-wizard-regression.md`

如测试暴露已有实现缺口，仅允许小范围修改对应后端 API / service 文件，并在变更记录中说明。

## 明确不改范围
- 不引入新的前端测试框架或依赖。
- 不重写 `TavernCreatePanel` 交互。
- 不修改 Tavern / Character / LLM 既有字段协议。
- 不接管当前工作树中其他未提交的记忆、移动端或控制台改动。

## 依据的协议文档
- `docs/AI参与开发协议.md`
- `docs/AI_SHARED_TASKLIST.md`
- `docs/CURRENT_TASKS.md`

## 预期产出
- 新增开店向导回归测试文件。
- 若有必要，补极小实现修正。
- 新增本次 QA 切片变更说明。
- 更新共享任务清单认领记录。

## 验证方式
- `pytest tests/test_tavern_create_wizard_regression.py`
- `py -3 -m compileall -q fablemap`
- `npm --prefix .\frontend run build`

## 当前状态
done
