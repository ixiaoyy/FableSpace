# 2026-04-18 - FM-VT-QA-02 记忆权限测试

为结构化记忆补充权限回归测试，锁住访客私密记忆、店主经营记忆、公共记忆和酒馆包导出的隐私边界。

## 范围

| 文件 | 说明 |
|------|------|
| `tests/test_tavern_memory_permissions.py` | 新增记忆权限回归测试 |
| `docs/claims/2026-04-18-fm-vt-qa-02-memory-permissions.md` | 新增并完成 QA-02 认领说明 |
| `docs/AI_SHARED_TASKLIST.md` | 标记 QA-02 完成并补认领记录 |
| `docs/CURRENT_TASKS.md` | 增加 QA-02 回归阶段记录 |

## 行为

- 访客只能读取自己的 private 记忆、与自己相关的 owner 记忆和 public 记忆。
- 其他访客不能通过列表或单条读取访问别人的 private 记忆。
- 店主能读取 owner / public 级别经营记忆，但不能读取访客 private 记忆内容或私密 metadata。
- 匿名 / 未登录视角只能读取 public 记忆。
- 酒馆包导出不会包含访客 private MemoryAtom 内容、ID 或私密 metadata。

## 验证

- `py -3 -m pytest tests/test_tavern_memory_permissions.py`
- `py -3 -m pytest tests/test_tavern_memory_permissions.py tests/test_tavern_memory_atoms.py`
- `py -3 -m compileall -q fablemap`
- `npm --prefix .\frontend run build`
