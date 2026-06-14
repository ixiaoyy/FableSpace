# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

FableMap 是一个基于真实地理位置的 AI 空间 UGC 平台：
- **店主**：在地图上创建空间、配置 AI NPC
- **探索者**：进入空间对话、游玩、留下记忆并回访
- **核心优势**：真实坐标锚定 + SillyTavern 角色卡兼容 + 回访记忆

## 常用命令

### 前端（React Router + Vite + Tailwind v4）

```powershell
# 安装依赖
npm --prefix .\frontend install

# 开发模式（需要后端先启动）
npm --prefix .\frontend run dev

# 构建（必须用 Windows 终端运行，不能在 Claude bash 中执行）
npm --prefix .\frontend run build

# 类型检查
npm --prefix .\frontend run typecheck
```

### 后端（Python / FastAPI）

```powershell
# 设置 PYTHONPATH 后启动本地 API（端口 8950，可托管前端）
$env:PYTHONPATH = "$PWD\backend\src"
py -3 -m fablemap_api api --no-open

# 语法检查
py -3 -m compileall -q backend/src
```

### 一体化运行

```powershell
npm --prefix .\frontend run build
$env:PYTHONPATH = "$PWD\backend\src"
py -3 -m fablemap_api api --no-open
```

访问 `http://127.0.0.1:8950/`

## 架构要点

### 分层结构

```
Frontend (React Router / Vite)
  -> API client / lib services
  -> FastAPI routes (/api and /api/v1)
  -> Application services
  -> Core domain modules
  -> SQLAlchemy database or JSON fallback
```

- `/api/*`：旧兼容层和产品模块使用
- `/api/v1/*`：新功能优先使用

### 关键路径

| 区域 | 路径 | 说明 |
|------|------|------|
| 后端入口 | `backend/src/fablemap_api/core/api.py` | 默认端口 8950 |
| v1 API | `backend/src/fablemap_api/api/v1/` | 当前原生接口 |
| 应用服务 | `backend/src/fablemap_api/application/services/` | API 编排层 |
| 核心领域 | `backend/src/fablemap_api/core/` | Tavern、玩法、记忆、LLM |
| 前端路由 | `frontend/app/routes/` | 页面入口 |
| 前端功能 | `frontend/app/features/` | 独立功能模块 |
| 兼容模块 | `frontend/app/product/` | 历史产品模块 |
| Tavern 客户端 | `frontend/app/lib/taverns.ts` | 空间 API 客户端 |

### 数据存储

- 默认使用 SQLite（`FABLEMAP_DATABASE_URL` 未配置时）
- 支持 MySQL / PostgreSQL（配置环境变量）
- 旧 JSON 存储需设置 `FABLEMAP_STORAGE_BACKEND=json`

### 敏感数据原则

- 店主 LLM API Key 不暴露给访客
- 访客 Token 统计不写入公开 payload
- 平台不做 Token 充值 / 结算

### Trellis 任务系统

任务目录：`d:/work/ai-/.trellis/tasks/`
任务生命周期：brainstorm → research → implement → check → update-spec → record-session

## 开发边界

- 空间必须挂接真实坐标
- 平台不能绕过店主确认自动发布内容
- 不做无边界访客社交、路线导航、评分系统
- API / Schema 改动必须同步测试和文档

## 文档入口

- [产品概述](docs/PRODUCT_BRIEF.md)
- [空间平台设计](docs/FABLEMAP_TAVERN_PLATFORM.md)
- [系统架构](docs/ARCHITECTURE.md)
- [明确不做清单](docs/WHAT_NOT_TO_BUILD.md)
- [AI 协作协议](docs/AI参与开发协议.md)