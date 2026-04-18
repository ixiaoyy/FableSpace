# FM-VT-QA-02 任务认领：记忆权限测试

## 任务 ID
FM-VT-QA-02

## 任务名称
记忆权限测试

## 认领时间
2026-04-18

## 负责人
Codex

## 改动类型
测试补全 / 权限回归切片

## 任务目标
为结构化记忆补充权限回归测试，确认访客只能读取自己的私密记忆，店主只能读取 owner / public 级别的经营记忆，其他访客不能读取别人的私密记忆，且酒馆包导出不会泄漏访客私密 MemoryAtom 内容。

## 可修改范围
- `tests/test_tavern_memory_permissions.py`
- `docs/AI_SHARED_TASKLIST.md`
- `docs/CURRENT_TASKS.md`
- `docs/changes/2026-04-18-fm-vt-qa-02-memory-permissions.md`

如测试暴露已有实现缺口，仅允许小范围修改对应后端 service / memory 权限逻辑，并在变更记录中说明。

## 明确不改范围
- 不重写 MemoryAtom 模型或存储结构。
- 不修改记忆自动提炼和 Prompt 注入策略。
- 不新增前端 UI。
- 不接管当前工作树中其他未提交的记忆、移动端或控制台改动。

## 依据的协议文档
- `docs/AI参与开发协议.md`
- `docs/AI_SHARED_TASKLIST.md`
- `docs/CURRENT_TASKS.md`

## 预期产出
- 新增记忆权限回归测试文件。
- 新增本次 QA 切片变更说明。
- 更新共享任务清单认领记录。

## 验证方式
- `py -3 -m pytest tests/test_tavern_memory_permissions.py`
- `py -3 -m compileall -q fablemap`
- `npm --prefix .\frontend run build`

## 当前状态
done
