# 删除 Home 社交与外围能力

## Goal

只删除 Home、territory、rumor、public bond、relationship graph 等非 P0 产品面。

## Requirements

- 只删除不属于 P0 的 Home、territory、rumor、public bond、relationship graph、访客社交和外围玩法入口。
- 保留玩家与 Character 的私有关系、记忆和回访连续性。
- 删除前先区分旧公开社交关系与新 `CharacterRelationship`。
- 不删除地图、创作者或旧 Space 基础合同。

## Acceptance Criteria

- [ ] 被列入范围的页面、API 和导航不可达。
- [ ] 新私有关系与 PlayerStoryState 保持可用。
- [ ] 不存在好友、私信、动态墙、公开 bond 或跨世界关系图入口。
- [ ] Python、前端构建和引用审计通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
