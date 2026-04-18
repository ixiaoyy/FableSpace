# 2026-04-18 - UX-03 移动端酒馆体验

把酒馆三栏聊天页在 720px 以下收口成可用的手机体验。

## 范围

| 文件 | 说明 |
|------|------|
| `frontend/src/TavernChatRoom.jsx` | 记忆 / 上下文按钮互斥打开；移动端选择角色后收起角色抽屉 |
| `frontend/src/TavernContextPanel.jsx` | 增加 `open` 类，修复移动端抽屉被 transform 隐藏的问题 |
| `frontend/src/styles.css` | 新增最终移动端覆盖，确保规则排在桌面样式之后 |
| `docs/AI_SHARED_TASKLIST.md` | 标记 UX-01 / UX-02 / UX-03 认领与完成状态 |
| `docs/CURRENT_TASKS.md` | 增加 UX 阶段任务表 |

## 行为

- 手机端酒馆聊天页保持单列布局，角色列表默认收起为抽屉。
- 展开角色抽屉后横向选择角色，选中后自动收起。
- 聊天输入区贴底，不再被角色栏或右侧面板挤出视口。
- 上下文面板在手机端变成底部抽屉，保留角色 / 场所 / 世界书 / 记忆 / AI 标签。
- 记忆面板和角色详情在手机端同样以底部抽屉展示。

## 验证

- `npm --prefix .\frontend run build`
- `py -3 -m pytest tests --ignore=tests/test_api.py -q`
- `py -3 -m compileall -q fablemap`
