---
doc_type: issue-fix
issue: 2026-04-28-homepage-serves-stale-dist
status: fixed
severity: P1
summary: "127.0.0.1:8950 首页服务了旧 frontend/dist，导致看不到按设计参考实现的新版首页。"
tags: [frontend, backend-static, homepage]
---

# 8950 首页服务旧 dist 修复记录

## 现象

访问 `http://127.0.0.1:8950/` 时，页面显示旧兼容壳首页（附近门牌 / 模板 / 后台快捷卡片），不是按 `设计参考/index.png` 与后续首页设计任务实现的 React Router 首页。

## 根因

后端静态目录选择逻辑默认优先使用 `frontend/dist`。当前仓库里存在一个未追踪但仍在磁盘上的旧 `frontend/dist`，生成时间为 2026-04-22；React Router 的新构建产物实际位于 `frontend/build/client`。

因此 8950 端口在启动时挂载了旧 `dist`，浏览器拿到的是旧 `assets/index-*` 资源，而不是 `build/client` 里的 `entry.client-*` / `home-*` 资源。

## 修复

- `backend/src/fablemap_api/core/web/config.py`：默认前端构建目录改为 `frontend/build/client`。
- `backend/src/fablemap_api/core/web/service.py`：静态目录选择顺序改为：
  1. 显式配置的 `frontend_dist`
  2. React Router `frontend/build/client`
- 删除旧根目录前端入口：`frontend/api-client.js`、`frontend/app.js`、`frontend/dom.js`、`frontend/index.html`、`frontend/render.js`、`frontend/styles.css`。
- 删除旧产品壳入口：`frontend/app/product/main.jsx`。
- 默认服务逻辑不再自动回退 `frontend/dist` 或 `frontend/index.html`，避免旧入口重新影响 8950 首页。
- `tests/test_api.py`：补充回归测试，确认 `build/client` 会优先于旧 `dist`。

## 验证

- `py -3 -m pytest -q tests/test_api.py -k "frontend_static_dir or built_frontend or build_is_unavailable" --tb=short`：5 passed。
- `npm --prefix .\frontend run build`：通过，生成 `frontend/build/client/index.html`。
- `PYTHONPATH=backend/src` 下检查 `WebService(ApiSettings()).frontend_static_dir()`：返回 `D:\work\FableMap\frontend\build\client`。
- `backend/src/fablemap_api/core/web/config.py` 与 `backend/src/fablemap_api/core/web/service.py` AST 解析通过。
- `py -3 -m compileall -q backend/src` 因既有 `__pycache__/*.pyc` 文件 Windows 写入权限拒绝未完成；不是源码语法错误。

## 注意

8950 服务已重启，首页返回 React Router `entry.client`，不再返回旧 `assets/index-*`。
## 2026-04-28 follow-up: `/api/v1` HTML fallback

- Symptom: `http://127.0.0.1:8950/tavern/pw_lantern_helpdesk` rendered the tavern shell, but its frontend JSON request received `<!DOCTYPE html>...` instead of an API payload.
- Root cause: the local 8950 `create_web_app` entry registered legacy `/api/*` routes, but not the native `/api/v1/*` router used by `frontend/app/lib/taverns.ts`. Because the frontend is mounted at `/`, missing GET `/api/v1/...` paths fell through to the SPA `index.html`.
- Fix: `backend/src/fablemap_api/core/web/app.py` now wires the native `/api/v1` router into the 8950 app, exposes the shared tavern store as `app.state.taverns`, and returns JSON 404 for unknown `/api...` paths instead of serving the frontend HTML.
- Verification: `py -3 -m pytest -q tests/test_api.py -k "v1_routes or missing_api_paths or built_frontend or build_is_unavailable or frontend_static_dir" --tb=short` passed with 7 tests; `py -3 -m pytest -q backend/tests/test_api_smoke.py --tb=short` passed with 3 tests; `py -3 -m compileall -q backend/src` passed. The restarted `127.0.0.1:8950` process returns JSON for `/api/v1/taverns/pw_lantern_helpdesk` and JSON 404 for an unknown `/api/v1/...` path.
