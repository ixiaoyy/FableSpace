# 酒馆分享与病毒传播（完整路线）

## 背景

已有轻量 B 阶段 `04-27-tavern-invite-link` 在前端详情页生成邀请文案。这个 P0 任务走完整路线：补齐后端 `/api/v1/taverns/{id}/share` 契约、权限边界、前端服务统一接入和可验证测试，为后续 SEO / 公开预览页打基础。

## 目标

- 新增 native `/api/v1/taverns/{tavern_id}/share`，返回 public-safe 分享 payload。
- 分享 payload 只包含公开 Tavern 信息：名称、短描述、坐标/地址、访问状态、角色公开名字/avatar、分享 URL/标题/文案。
- 复用 Tavern 可见性边界：public/password 可生成分享；private 只有 owner 可生成分享。
- 不返回 `api_key`、`password_hash`、聊天历史、访客状态、私有记忆、gameplay session 等敏感/运行时数据。
- 前端 `getTavernShare` 与详情页分享卡优先使用后端 payload，失败时保持前端-only fallback。

## 非目标

- 不实现平台自动生成营销文案或酒馆/NPC/剧情内容。
- 不实现访客好友、动态墙、私信、全局在线状态。
- 不新增外部分享 SDK、埋点、排行或付费转化系统。
- 不改变 Tavern / TavernCharacter 持久化 schema。

## API Contract

`GET /api/v1/taverns/{tavern_id}/share`

Headers:

- `X-User-Id` 可选；用于 private tavern owner 访问。

Response 200:

```json
{
  "tavern_id": "...",
  "title": "酒馆名",
  "description": "最长 200 字公开简介",
  "short_description": "最长 80 字公开简介",
  "cover": "",
  "location": { "lat": 31.2304, "lon": 121.4737, "address": "..." },
  "status": "open",
  "access": "public",
  "tags": [],
  "characters": [{ "id": "...", "name": "...", "avatar": "..." }],
  "character_count": 1,
  "share_url": "http://host/tavern/...",
  "share_title": "邀请你进入「酒馆名」",
  "share_text": "..."
}
```

Errors:

- 404: 酒馆不存在
- 403: 此酒馆是私人的

## 实现计划

1. RED：新增 `backend/tests/test_v1_tavern_share.py`，覆盖 public share、private visitor forbidden、private owner allowed、payload redaction。
2. GREEN：在 native application service 添加 `get_tavern_share()`，在 `api/v1/taverns.py` 添加 thin route。
3. 修正 legacy `/api/taverns/{id}/share` 也复用可见性和 URL encoding，避免旧路由泄露。
4. 前端：补齐 `getTavernShare(tavernId, userId?)`，详情页分享卡尝试加载后端 payload，失败 fallback 到已有 `tavern-share` helper。
5. 更新测试和文档记录。

## 验收标准

- `/api/v1/taverns/{id}/share` 对 public/password 酒馆返回 public-safe payload。
- private 酒馆非 owner 返回 403，owner 返回 200。
- 响应文本不包含 `api_key`、`password_hash`、密码、私有 runtime bucket。
- 前端 build/typecheck/test 通过，后端 compile/focused pytest 通过。
