# FableSpace

FableSpace 是一个基于真实地理位置的 AI 空间 UGC 平台。每个用户都可以在真实地图上开设自己的空间，配置 AI NPC，接待访客进入空间探索、对话、游玩，并通过记忆和回访状态延续体验。

项目适合自托管部署，也适合作为“地图 + AI NPC + 角色卡 + 空间叙事”方向的开源基础工程。

## 主要能力

- 真实地图锚点：空间必须绑定真实坐标，访客从地图或空间列表进入。
- 店主自主管理：空间名称、描述、访问规则、NPC、玩法和氛围由店主配置。
- AI NPC 对话：支持单 NPC 对话、多人空间互动、访客状态和记忆写回。
- 角色卡兼容：角色数据优先兼容 SillyTavern Character Card V2，支持导入和导出。
- 轻量玩法系统：店主可以为空间配置文字玩法、任务线索和访客进度。
- 自托管部署：前端、后端和持久化数据可通过 Docker Compose 一体化运行。

## 技术栈

- 后端：Python 3.12、FastAPI、Uvicorn、SQLAlchemy。
- 前端：React Router、Vite、TypeScript、React 18。
- 容器：Docker Compose，前端容器使用 nginx 托管静态构建并反向代理 API。
- 存储：默认 SQLite；可通过 SQLAlchemy URL 配置 MySQL。其他数据库需要自行提供对应驱动。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `apps/api/` | FastAPI 后端、配置示例、SQL 和迁移工具 |
| `apps/web/` | React Router + Vite 前端应用 |
| `docs/` | 产品定义、架构、数据结构和资源规范 |
| `docker-compose.yml` | 默认自托管部署编排 |

## Docker Compose 部署

准备：

- Docker Desktop 或兼容的 Docker Compose 环境。
- 如需公开到互联网，建议在外层配置 HTTPS 反向代理。

Windows PowerShell：

```powershell
Copy-Item .\apps\api\.env.example .\apps\api\.env
docker compose up --build -d
```

Linux / macOS：

```bash
cp apps/api/.env.example apps/api/.env
docker compose up --build -d
```

默认访问地址：

| 服务 | 地址 |
|------|------|
| Web 应用 | `http://127.0.0.1:3000/` |
| 后端健康检查 | `http://127.0.0.1:8000/api/v1/health` |

Compose 默认启动两个服务：

- `frontend`：构建 `apps/web/`，由 nginx 暴露 `3000` 端口，并把 `/api`、`/generated` 反向代理到后端。
- `backend`：运行 `uvicorn fablespace_api.main:app`，暴露 `8000` 端口，数据写入 `/data`。

查看日志：

```bash
docker compose logs -f
```

停止服务：

```bash
docker compose down
```

重新构建并启动：

```bash
docker compose up --build -d
```

## 配置

后端环境文件位于 `apps/api/.env`，示例文件是 `apps/api/.env.example`。不要提交真实密钥。

常用后端变量：

| 变量 | 说明 |
|------|------|
| `FABLESPACE_STORAGE_BACKEND` | 默认 `database`；显式设为 `json` 时使用旧 JSON 文件存储 |
| `FABLESPACE_DATABASE_URL` | 首选 SQLAlchemy 数据库 URL；留空时使用默认 SQLite |
| `FABLESPACE_MYSQL_URL` | 旧 MySQL URL 别名，新部署优先使用 `FABLESPACE_DATABASE_URL` |
| `FABLESPACE_OUTPUT_ROOT` | 后端输出目录；Docker Compose 中为 `/data` |
| `FABLESPACE_SEED_DEFAULT_SPACES` | 是否写入默认示例空间，默认 `1` |
| `FABLESPACE_CORS_ORIGINS` | 前后端分离部署时允许的浏览器来源 |
| `OPENCODE_API_KEY` | 可选的系统示例 LLM Key；不要用于保存店主私有 Key |

前端环境示例位于 `apps/web/.env.example`。Docker 默认使用同源 `/api` 调用后端；如果你自行构建或分离部署前端，可以按需设置：

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE` | 前端构建期 API 基址，留空时使用同源 `/api` |
| `VITE_AMAP_KEY` | 可选地图服务 Key |
| `VITE_AMAP_SECURITY_CODE` | 可选地图服务安全码 |

店主自己的 LLM API Key 应在 FableSpace 的空间管理界面中配置，不应写入共享环境文件或提交到仓库。

## 数据持久化

Docker Compose 会把后端数据写入 volume `fablespace_data` 对应的数据卷。未配置外部数据库时，默认 SQLite 文件会位于容器内的 `/data/fablespace.sqlite3`。

部署到生产环境时建议：

- 定期备份 Compose 数据卷或外部数据库。
- 对公开访问的站点配置 HTTPS。
- 使用独立数据库时，把 `FABLESPACE_DATABASE_URL` 写入 `apps/api/.env`，并妥善管理数据库账号权限。
- 升级前先备份数据，再拉取新版本并重新构建容器。

## 非 Docker 运行

如果只想在本机快速预览，也可以先构建前端，再由 Python 后端托管 API 和前端页面。

Windows PowerShell：

```powershell
py -3 -m pip install -r .\apps\api\requirements.txt
npm --prefix .\apps\web install
npm --prefix .\apps\web run build

$env:PYTHONPATH = "$PWD\apps\api\src"
py -3 -m fablespace_api api --no-open
```

默认访问：

| 服务 | 地址 |
|------|------|
| Web 应用 | `http://127.0.0.1:8950/` |
| 健康检查 | `http://127.0.0.1:8950/api/health` |

需要改端口时：

```powershell
py -3 -m fablespace_api api --host 127.0.0.1 --port 8951 --no-open
```

## 项目文档

- [产品概述](docs/PRODUCT_BRIEF.md)
- [空间平台设计](docs/FABLESPACE_SPACE_PLATFORM.md)
- [系统架构](docs/ARCHITECTURE.md)
- [世界数据结构](docs/WORLD_SCHEMA.md)
- [明确不做清单](docs/WHAT_NOT_TO_BUILD.md)
- [图像资源规范](docs/IMAGE_ASSETS_SPEC.md)

## 安全提醒

- 不要提交 `.env`、数据库文件、日志文件或真实 API Key。
- 访客可见数据和店主私有配置应分开处理。
- 公开部署时建议使用 HTTPS、强随机访问密码和受限数据库账号。
- 对 LLM Key、对话记录和记忆写回数据按敏感数据处理。
