# FableSpace

FableSpace 是一个角色故事平台。玩家因想见一个角色而进入其所属的完整故事世界，通过对话和选择建立关系、经历事件，并在回访中延续彼此的故事。

项目以经过策划、审核和版本化发布的系统故事为内容基础，适合自托管部署，也适合作为“角色演绎 + 人工剧情骨架 + 私有连续性”方向的开源基础工程。

## 主要能力

- 角色优先发现：首页直接呈现角色，玩家从想见的人进入其故事世界。
- 故事固定身份：每个故事提供经过设计的玩家身份、背景和入场理由，不使用全平台通用身份。
- 对话与选择：玩家可以自由回应，也可以作出人工编写的关键选择；AI 在已发布剧情和正史边界内演绎角色。
- 关系与分支：自然对话可以小幅改变好感和语气，关键选择会显著改变关系与可进入分支。
- 私有连续性：记录玩家的故事进度、角色关系、关键选择和记忆，下次回访从已有结果继续。
- 历史内容边界：历史故事通过原创角色进入真实事件，玩家可以改变私人经历，不能改写已经核验的史实。
- 自托管部署：前端、后端和持久化数据可通过 Docker Compose 一体化运行。

当前 P0 包含两个系统故事：安妮在 1854 年伦敦宽街向玩家讨水，以及架空宫廷“雪夜封宫”中魏观海与萧明珠围绕寝殿和未宣诏书的冲突。

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
| `docs/` | 产品定义、数据契约、部署和资源规范 |
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

仓库提供 `.github/workflows/deploy.yml`：推送 `main` 后按前端、后端、媒体和部署配置的实际变化选择构建范围。后端通过 SSH + Docker Compose 更新；前端图片只从 S3 兼容对象存储的稳定媒体命名空间读取。媒体/CDN 配置或部署工作流变化及手动部署会在替换服务器镜像前逐项核对媒体清单并通过 CDN 做真实读取验证，普通前端代码变更不执行全量桶扫描。

部署默认受 GitHub Actions 仓库变量 `DEPLOY_ENABLED` 保护。服务器、存储桶、CDN 域名和全部 Secret 配置完成后才能启用。完整 Secret 清单、R2/CORS 设置和首次服务器准备步骤见 [自动部署与 CDN](docs/DEPLOYMENT.md)。

## 配置

后端环境文件位于 `apps/api/.env`，示例文件是 `apps/api/.env.example`。不要提交真实密钥。

常用后端变量：

| 变量 | 说明 |
|------|------|
| `FABLESPACE_DATABASE_URL` | 首选 SQLAlchemy 数据库 URL；留空时使用默认 SQLite |
| `FABLESPACE_OUTPUT_ROOT` | 后端输出目录；Docker Compose 中为 `/data` |
| `FABLESPACE_CORS_ORIGINS` | 前后端分离部署时允许的浏览器来源 |
| `OPENCODE_API_KEY` | 可选的系统 LLM 服务 Key；不要提交真实密钥 |

前端环境示例位于 `apps/web/.env.example`。Docker 默认使用同源 `/api` 调用后端；如果你自行构建或分离部署前端，可以按需设置：

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE` | 前端构建期 API 基址，留空时使用同源 `/api` |
| `VITE_MEDIA_BASE_URL` | 项目图片的稳定 HTTPS 基址，默认 `https://img.pingxingxian.space/fablespace/media/v1` |

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

- [文档索引](docs/INDEX.md)
- [产品概述](docs/PRODUCT_BRIEF.md)
- [角色故事平台设计](docs/FABLESPACE_SPACE_PLATFORM.md)
- [故事世界数据结构](docs/WORLD_SCHEMA.md)
- [明确不做清单](docs/WHAT_NOT_TO_BUILD.md)
- [图像资源规范](docs/IMAGE_ASSETS_SPEC.md)
- [自动部署与 CDN](docs/DEPLOYMENT.md)

## 安全提醒

- 不要提交 `.env`、数据库文件、日志文件或真实 API Key。
- 公开故事内容与玩家私有进度、对话和记忆应分开处理。
- 公开部署时建议使用 HTTPS、强随机访问密码和受限数据库账号。
- 对 LLM Key、对话记录和记忆写回数据按敏感数据处理。
