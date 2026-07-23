# 迁移安妮宽街故事

## Goal

只迁移并验证安妮、乞丐 PlayerRole、历史正史和本故事关系分支。

## Requirements

- 只迁移安妮的 1854 年宽街故事到新内容模型。
- 保留安妮抱陶罐讨水的开场和故事专属“乞丐” PlayerRole。
- 固定史实、可模拟空白、待核验内容和来源边界必须保持明确。
- 定义本故事章节、选择、关系变化、结局和回访摘要。
- 不修改宫廷故事、前端或通用领域模型。

## Acceptance Criteria

- [ ] 安妮是唯一公开角色，PlayerRole 为“乞丐”。
- [ ] 给水、追问水源、另找水、求助成年人和拒绝均有安全推进路径。
- [ ] 所有分支不改写 John Snow、泵柄决策和已核验历史节点。
- [ ] 自然对话小幅影响关系，关键选择显著影响关系与结局。
- [ ] 历史对抗式自审记录 PASS，或明确 BLOCKED 证据。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
