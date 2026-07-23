# 重写平台主线与不做边界

## Goal

只重写平台主线与 WHAT_NOT_TO_BUILD 的能力边界。

## Requirements

- 只修改 `docs/FABLESPACE_SPACE_PLATFORM.md` 和 `docs/WHAT_NOT_TO_BUILD.md`。
- 平台主线改为角色优先系统故事，使用 StoryWorld 核心术语。
- 固化系统故事、人工剧情骨架、AI 演绎、好感与连续性边界。
- 不做清单明确排除坐标/LBS、UGC、SillyTavern、owner 配置、公开社交和运行时改写正史。
- 不修改字段 Schema、AGENTS 或业务代码。

## Acceptance Criteria

- [ ] 两个文档的允许/禁止边界互相一致。
- [ ] 历史玩法与原创架空玩法的不同正史约束明确。
- [ ] 两个 P0 故事与延后内容的层级明确。
- [ ] 无旧 Space 平台兼容叙事残留。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
