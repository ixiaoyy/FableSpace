# 首页热门酒馆链接指向不存在酒馆

## 现象

浏览器打开 `http://127.0.0.1:5173/tavern/tavern-001` 时，前端请求 `/api/v1/taverns/tavern-001`。截图中表现为 `HTTP 502`，原因是 Vite dev server 的 `/api` 代理目标 `127.0.0.1:8950` 未启动。

启动 native backend 后，`/api/v1/taverns/tavern-001` 会变为 `404 酒馆不存在`，说明首页热门酒馆卡片仍使用旧占位 ID。

## 根因

- 环境层：后端 native API 未运行时，Vite 代理返回 502。
- 代码层：`frontend/app/routes/home.tsx` 的热门酒馆卡硬编码 `tavern-001/002/003`，这些 ID 不在默认公益酒馆种子列表里。

## 修复目标

- 首页热门卡片链接改为默认可种入的公开公益酒馆 ID。
- 增加脚本测试，防止首页继续链接到 `tavern-001` 这类不存在占位 ID。
- 验证 backend 启动后 Vite 代理不再返回 502，目标酒馆接口返回 200。

## 非目标

- 不新增示例酒馆内容或 schema 字段。
- 不改视觉设计。
