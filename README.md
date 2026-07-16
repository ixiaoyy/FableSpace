# FableSpace

FableSpace 是一个基于真实地理位置的角色故事平台。玩家选择私有游玩身份，从想见的角色进入其所属的完整 Space，通过对话、选择、记忆和回访持续推进故事。

项目适合自托管部署，也适合作为“真实坐标 + AI NPC + 角色卡 + 连续故事”方向的开源基础工程。

## 主要能力

- 角色优先发现：先选游玩身份和性别，再从角色进入其所属的完整故事 Space。
- 真实地图锚点：每个 Space 必须绑定真实坐标，地图提供现实入口与氛围，而不是导航玩法。
- AI NPC 对话：角色依据自身动机、秘密、命运与当前事件回应，并写回访客私有状态和记忆。
- 角色卡兼容：角色数据优先兼容 SillyTavern Character Card V2，支持导入和导出。
- 连续故事：支持线索、选择、关系变化、状态卡和回访续写。
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
- 生产复用 ParallelLines 的 MySQL/Redis 时，使用 `deploy/docker-compose.shared.yml` 覆盖文件；完整初始化、迁移和 R2/CDN 配置见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

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

## GitHub Actions 自动部署与 CDN

仓库提供 `.github/workflows/deploy.yml`：推送 `main` 后按前端、后端和部署配置的实际变化选择构建范围。后端通过 SSH + Docker Compose 更新；前端构建产物中的 JS、CSS 和导入图片会先同步到 S3 兼容对象存储（支持 Cloudflare R2），再替换服务器上的前端镜像。

部署默认受 GitHub Actions 仓库变量 `DEPLOY_ENABLED` 保护。服务器、存储桶、CDN 域名和全部 Secret 配置完成后才能启用。完整 Secret 清单、R2/CORS 设置和首次服务器准备步骤见 [自动部署与 CDN](docs/DEPLOYMENT.md)。

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
| `VITE_ASSET_BASE_URL` | 可选的构建资源绝对前缀；生产 workflow 自动设置为提交号隔离的 CDN release 路径 |

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
- [自动部署与 CDN](docs/DEPLOYMENT.md)

## 安全提醒

- 不要提交 `.env`、数据库文件、日志文件或真实 API Key。
- 访客可见数据和店主私有配置应分开处理。
- 公开部署时建议使用 HTTPS、强随机访问密码和受限数据库账号。
- 对 LLM Key、对话记录和记忆写回数据按敏感数据处理。
