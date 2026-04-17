# 2026-04-17 — P1-08 店主控制台重新分组

## 完成内容

- 店主控制台新增分组导航：
  - 总览
  - 酒馆
  - 访客
  - AI
  - 高级工具
- 默认进入“总览”，只展示经营摘要和建议下一步，不再把 Token、会话搜索、访客列表、酒馆筛选、高级工具全部堆在首屏。
- “酒馆”分组承载基础信息、营业状态、访问权限和酒馆卡片管理。
- “访客”分组承载最近会话、会话关键词搜索、访客回访关系。
- “AI”分组承载模型使用量和 AI 配置入口。
- “高级工具”分组集中：
  - 角色
  - 世界书
  - 输出护栏
  - AI 配置
  - 酒馆包导入 / 导出
- 新增 `frontend/src/OwnerConsoleSections.jsx`，抽出分组导航、建议操作卡和高级工具台，降低 `TavernOwnerPanel.jsx` 的职责。
- `frontend/src/styles.css` 新增对应布局和移动端响应式样式。

## 验证

- `npm --prefix .\frontend run build` → passed
- `py -3 -m compileall -q fablemap` → passed
- `py -3 -m pytest -q --tb=short` → 173 passed
