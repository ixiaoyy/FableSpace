# 重写角色故事平台合同与术语

## Goal

将权威文档、协作约束和公开术语统一到角色优先的系统故事平台合同。

## Requirements

- 本任务是权威合同阶段协调父任务，不直接修改文档或业务代码。
- 公开定位、平台边界、Schema/AI 约束由三个独立子任务实施。
- 三组文档必须共享角色故事平台、两个 P0 故事和四个核心对象的同一合同。
- 协调时只解决交叉引用和术语冲突，不把跨文件重写回收到父任务。

## Acceptance Criteria

- [ ] 三个子任务均完成各自文档检查。
- [ ] 权威读取顺序只表达一套产品主线。
- [ ] 文档链接、术语和交叉引用一致。
- [ ] 父任务未产生额外业务代码或数据改动。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
