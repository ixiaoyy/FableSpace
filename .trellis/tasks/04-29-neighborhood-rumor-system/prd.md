# Neighborhood Rumor System — PRD

> 创建日期：2026-04-29
> 状态：**实现完成**（Phase 1）

---

## 概述

邻里传闻系统 — NPC 主动分享关于其他酒馆的传闻，为访客推荐其他酒馆，增加探索动力。

### 核心价值
- 增加酒馆间导流
- 提升访客探索感
- NPC 更有人情味

---

## 用户故事

1. **访客在 A 酒馆聊天时**，NPC 提及 "听说 XX 街新开了家不错的咖啡店"
2. **访客点击传闻链接**，跳转到目标酒馆
3. **访客在目标酒馆**可以看到 "来自 [A酒馆] 的推荐" 标记

---

## 数据模型

### NeighborhoodRumor

| 字段 | 类型 | 描述 |
|------|------|------|
| id | string | 唯一标识 |
| source_tavern_id | string | 消息来源酒馆 |
| target_tavern_id | string | 推荐目标酒馆 |
| target_tavern_name | string | 推荐目标酒馆名称（冗余存储） |
| character_id | string | 发言 NPC ID |
| character_name | string | NPC 名称 |
| rumor_text | string | 传闻内容（AI 生成或模板） |
| trigger_type | string | 触发类型: keyword, random, visit |
| trigger_keywords | string[] | 触发关键词 |
| weight | float | 随机权重 |
| created_at | datetime | 创建时间 |
| expires_at | datetime | 过期时间（可选） |
| view_count | int | 浏览次数 |
| click_count | int | 点击次数 |
| is_active | bool | 是否激活 |

---

## 触发机制

1. **关键词触发**：访客聊到特定话题，NPC 联想到相关酒馆
2. **随机触发**：对话 N 轮后随机分享一条传闻
3. **访问触发**：访客首次进入某酒馆时，NPC 提及其他访客去过的酒馆

---

## API 端点

### GET /api/v1/rumors

获取传闻列表

**参数**：
- `source_tavern_id` (string, optional): 按来源酒馆筛选
- `limit` (int, default=10): 返回数量
- `include_expired` (bool, default=false): 包含过期

**响应**：
```json
{
  "rumors": [...],
  "count": 3
}
```

### POST /api/v1/rumors/generate

生成一条传闻

**请求体**：
```json
{
  "source_tavern_id": "tavern_xxx",
  "target_tavern_id": "tavern_yyy",
  "target_tavern_name": "隔壁咖啡店",
  "character_id": "char_001",
  "character_name": "老王",
  "trigger_type": "keyword",
  "trigger_keywords": ["咖啡", "推荐"]
}
```

### POST /api/v1/rumors/{rumor_id}/view

记录传闻浏览

### POST /api/v1/rumors/{rumor_id}/click

记录传闻点击

### DELETE /api/v1/rumors/{rumor_id}

删除传闻（仅酒馆主人可操作）

---

## 前端组件

### NeighborhoodRumorBubble

显示 NPC 分享的传闻气泡，带有跳转到目标酒馆的功能。

**位置**：酒馆详情页（tavern.tsx）

**功能**：
- 自动加载当前酒馆产生的传闻
- 显示传闻内容、发言 NPC、时间
- 点击跳转到目标酒馆
- 记录浏览和点击

---

## 实现文件

### Backend
- `backend/src/fablemap_api/core/rumor.py` — 数据模型
- `backend/src/fablemap_api/contracts/rumor.py` — Pydantic 合同
- `backend/src/fablemap_api/api/v1/rumors.py` — API 端点
- `backend/src/fablemap_api/application/services/rumor.py` — 服务层
- `backend/src/fablemap_api/application/taverns.py` — 添加 RumorApplicationMixin

### Frontend
- `frontend/app/components/NeighborhoodRumorBubble.tsx` — 组件
- `frontend/app/lib/taverns.ts` — 添加 rumor API 函数和类型

---

## 下一步计划

1. **完善传闻生成**：集成 LLM 生成更自然的传闻内容
2. **智能推荐**：根据访客兴趣推荐相关酒馆
3. **来源标记**：在目标酒馆显示 "来自 [A酒馆] 的推荐"
4. **传闻管理**：店主可管理自己酒馆产生的传闻

---

## 参考文档

- `.trellis/tasks/04-29-new-feature-directions/brainstorm.md` — 方向 D2 访客留言板
- `docs/FABLEMAP_TAVERN_PLATFORM.md` — 核心设计文档
