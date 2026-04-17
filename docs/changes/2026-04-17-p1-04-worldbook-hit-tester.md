# P1-04: 世界书命中测试器

## 概述

提供确定性（无 LLM）世界书条目命中测试功能，帮助创作者验证关键词配置是否正确。

## 改动

### 后端

- `fablemap/web/router.py`:
  - 新增 `POST /api/worldinfo/test` 端点
  - 支持 `tavern_id` + `text` 参数，返回所有世界书条目匹配结果
  - 返回匹配状态、命中的关键词、注入顺序、内容预览

### 前端

- `frontend/src/WorldBookTester.jsx` — 新增独立命中测试器组件：
  - 支持输入测试消息（支持 Ctrl+Enter 快捷测试）
  - 支持包含酒馆上下文选项
  - 支持填入最近对话历史（用于 depth > 0 的条目扫描）
  - 支持传入未保存的世界书条目（测试编辑器临时更改）
  - 命中/全部标签页切换
  - 命中的关键词高亮显示
  - 内容预览展示

- `frontend/src/styles.css`:
  - 新增 `.wbt-*` 系列样式（WorldBookTester 组件）
  - 新增 `.badge-*` 状态徽章样式
  - 新增 `.tab-btn` 标签页按钮样式

## 已存在但已验证

- `fablemap/web/service.py` 的 `test_world_info_payload` 方法（完整命中测试逻辑）
- `fablemap/web/router.py` 的 `POST /api/taverns/{tavern_id}/world-info/test` 端点
- `frontend/src/services/tavernService.js` 的 `testWorldInfo` 服务方法
- `frontend/src/WorldBookEditor.jsx` 内置命中测试区（inline compact 版本）

## 验证

- `npm --prefix ./frontend run build` 通过
- `pytest` 171 passed

## 影响

- 店主可以在开店向导中快速验证世界书关键词是否正确配置
- 访客侧和店主侧均可使用命中测试（店主端调用需要 X-User-Id）