# 固化历史正史边界

## Goal

统一历史题材不可改写时间线、史实标记和运行时 AI 边界。

## Requirements

- 在 `AGENTS.md`、平台主线和不做清单中统一声明：已核验的历史时间、地点、真实参与者、制度阶段与已知结果不可被玩家或运行时 AI 改写。
- 明确区分 `固定史实`、`可模拟空白`、`待核验`，史料空白不得自动被当作虚构许可。
- 玩家能动性只影响原创角色、局部关系、证据顺序和私有回访结果，不产生架空历史分支。
- 为历史资料表面定义唯一的解释性文案例外，以及 `史实 / 剧情设定 / 待核验` 三类标记。
- 新增历史完整性思考指南并登记到指南索引，链接到现有权威文档和历史内容任务。
- 不修改 Schema、故事种子、运行时代码、具体史实记录或选题母库。

## Acceptance Criteria

- [x] 六个合同与指南文件对历史边界使用一致术语，不互相矛盾。
- [x] UI 文案例外只允许出现在用户主动打开的历史资料表面。
- [x] 运行时 AI 不得把推测或来源不足内容升级为史实。
- [x] 指南中的仓库相对链接均指向真实文件。
- [x] 本批只有规则与文档变化，不包含 Python、React、Schema 或故事内容数据。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
