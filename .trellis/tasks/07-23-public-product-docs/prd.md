# 重写公开产品定位文档

## Goal

只重写 README、文档索引和产品简报中的角色故事平台定位。

## Requirements

- 只修改 `README.md`、`docs/INDEX.md` 和 `docs/PRODUCT_BRIEF.md`。
- 对外定位统一为角色故事平台，P0 为安妮宽街与雪夜封宫。
- 首页阅读顺序先说明角色发现、故事固定身份、对话选择和回访连续性。
- 删除坐标、UGC、SillyTavern、店主和地图作为当前或兼容卖点的表述。
- 不修改 Schema 细节、AI 协作约束或业务代码。

## Acceptance Criteria

- [x] 三个文件的一句话定位和 P0 用户旅程一致。
- [x] README 的启动部署信息仍与当前仓库路径一致。
- [x] 文档索引职责与链接有效。
- [x] 不再出现会把旧能力升格为产品本体的摘要。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
