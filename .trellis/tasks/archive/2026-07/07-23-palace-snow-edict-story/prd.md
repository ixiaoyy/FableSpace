# 重写雪夜封宫故事

## Goal

只重写小太监 PlayerRole、魏观海、萧明珠、章节和关系分支。

## Requirements

- 只重写雪夜封宫故事到新内容模型。
- 固定 PlayerRole 为“小太监”，其传话和跑腿能力来自具体职责，不拥有决策权。
- 保留皇帝昏迷、魏观海封锁寝殿、萧明珠试图闯宫和未宣诏书的核心冲突。
- 定义两个角色各自的动机、秘密、关系变化、分支、结局和回访摘要。
- 水门、腰牌等设定只有在开场能自然解释且确有剧情作用时保留。

## Acceptance Criteria

- [ ] 玩家从魏观海或萧明珠进入时使用同一 StoryRun 和“小太监”身份。
- [ ] 两个角色对相同玩家行为产生不同语气、好感变化和分支。
- [ ] 玩家可传话、查证、站队、拒绝或承担后果。
- [ ] 关键选择不能回退，结局后可开始新轮次。
- [ ] 内容构造和关键路径定向验证通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
