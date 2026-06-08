# FableMap 操作手册

> FableMap 是一个基于真实地理位置的 AI 空间 UGC 平台：店主在地图上创建空间、配置 AI NPC，探索者进入空间对话、游玩、留下记忆并回访。

本 README 是项目默认入口，侧重“怎么把项目跑起来、怎么配置、怎么验证、常见操作在哪里做”。产品定义、架构和 Schema 细节请看文末文档入口。

## 目录速览

| 路径 | 用途 |
|------|------|
| `backend/src/fablemap_api/` | Python / FastAPI 后端源码 |
| `frontend/` | React Router + Vite 前端 |
| `docs/` | 产品、架构、Schema、边界与资源规范 |
| `.trellis/` | Trellis 任务、规范与协作记录 |
| `fablemap_data/` | 本地运行数据参考目录 |
| `.fablemap-api/` | 默认本地输出 / SQLite / 兼容数据目录，运行后生成 |

## 环境准备

本仓库常用命令以 Windows PowerShell 为例。

需要准备：

- Python 3 与 `pip`
- Node.js 与 `npm`
- 可选：Docker Desktop / Docker Compose

首次安装依赖：

```powershell
py -3 -m pip install -r requirements.txt
npm --prefix .\frontend install
```

## 本地一体化运行

这种方式先构建前端，再由 Python 后端在 `8950` 端口同时提供 API 和前端页面。

```powershell
npm --prefix .\frontend run build

$env:PYTHONPATH = "$PWD\backend\src"
py -3 -m fablemap_api api --no-open
```

访问：

```text
http://127.0.0.1:8950/
http://127.0.0.1:8950/api/health
http://127.0.0.1:8950/api/meta
```

常用参数：

```powershell
py -3 -m fablemap_api api --host 127.0.0.1 --port 8950 --no-open
py -3 -m fablemap_api api --output-root .fablemap-api --no-open
```

## 前端开发运行

需要两个终端。

终端 A：启动后端。

```powershell
$env:PYTHONPATH = "$PWD\backend\src"
py -3 -m fablemap_api api --no-open
```

终端 B：启动前端开发服务器。

```powershell
npm --prefix .\frontend run dev
```

访问：

```text
http://127.0.0.1:5173/
```

`frontend/vite.config.js` 已把 `/api` 和 `/generated` 代理到 `http://127.0.0.1:8950`，所以前端开发模式下仍需要后端先启动。

## Docker Compose 运行

仓库提供 `docker-compose.yml`，前端由 nginx 托管静态构建，后端运行 `uvicorn fablemap_api.main:app`。

```powershell
Copy-Item .env.example .env
docker compose up --build
```

默认访问：

```text
http://127.0.0.1:3000/
http://127.0.0.1:8000/api/v1/health
```

端口可在 `.env` 中调整：

```env
FABLEMAP_FRONTEND_PORT=3000
FABLEMAP_API_PORT=8000
```

## 环境变量

复制 `.env.example` 为 `.env` 后按需修改。

| 变量 | 用途 |
|------|------|
| `FABLEMAP_DATABASE_URL` | 首选 SQLAlchemy 数据库 URL；可指向 MySQL / Postgres / SQLite |
| `FABLEMAP_MYSQL_URL` | 旧数据库 URL 别名，新配置优先用 `FABLEMAP_DATABASE_URL` |
| `FABLEMAP_STORAGE_BACKEND` | 默认 `database`；只有显式设为 `json` 时使用旧 JSON 文件存储 |
| `FABLEMAP_OUTPUT_ROOT` | 后端输出目录；本地默认 `.fablemap-api`，Docker 默认 `/data` |
| `FABLEMAP_SEED_DEFAULT_TAVERNS` | 是否写入默认公益空间；默认 `1` |
| `FABLEMAP_CORS_ORIGINS` | 前后端分离运行时允许的浏览器来源 |
| `VITE_API_BASE` | 前端构建期 API 基址；留空时使用同源 `/api` |
| `VITE_AMAP_KEY` / `VITE_AMAP_SECURITY_CODE` | 可选地图服务密钥 |
| `OPENCODE_API_KEY` | 可选系统公益空间测试 LLM Key；普通店主 Key 不应写入共享 `.env` |

店主自己的 LLM API Key 应在 FableMap 店主管理界面中按空间配置，不要提交到仓库，也不要写入共享环境文件。

## 数据存储

默认存储策略：

- `FABLEMAP_STORAGE_BACKEND=database` 是默认值。
- 未配置 `FABLEMAP_DATABASE_URL` / `FABLEMAP_MYSQL_URL` 时，本地会使用 `<output-root>/fablemap.sqlite3`。
- 显式设置 `FABLEMAP_STORAGE_BACKEND=json` 时，才使用旧 JSON 兼容存储。
- Docker Compose 会把后端输出写入 Docker volume `fablemap_data`。

从本地 SQLite 迁移到 `.env` 中的目标数据库：

```powershell
$env:PYTHONPATH = "$PWD\backend\src"
py -3 -m fablemap_api.infrastructure.migrate_database --dry-run
py -3 -m fablemap_api.infrastructure.migrate_database
```

从旧 JSON / file runtime 数据迁移：

```powershell
$env:PYTHONPATH = "$PWD\backend\src"
$env:FABLEMAP_DATABASE_URL = "mysql+pymysql://user:pass@localhost:3306/fablemap"
py -3 -m fablemap_api.infrastructure.migrate --output-root .fablemap-api
```

## 常用操作

### 健康检查

```powershell
Invoke-RestMethod http://127.0.0.1:8950/api/health
Invoke-RestMethod http://127.0.0.1:8950/api/meta
```

Docker 模式：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

### 前端构建与类型检查

```powershell
npm --prefix .\frontend run build
npm --prefix .\frontend run typecheck
```

当前 `frontend/package.json` 没有通用 `test` 脚本；如后续新增测试脚本，以 package scripts 为准。

### 后端语法检查

```powershell
py -3 -m compileall -q backend/src
```

如当前分支包含测试目录，再运行对应 pytest：

```powershell
py -3 -m pytest -q --tb=short
```

## 产品内操作入口

启动后在浏览器中完成这些动作：

- **探索空间**：从地图 / 空间列表进入公开、密码或私密空间。
- **创建空间**：店主选择真实坐标，填写空间名称、描述、访问规则和空间类型。
- **配置 NPC**：在店主管理界面添加角色，或导入 SillyTavern 角色卡。
- **配置 LLM**：按空间保存 owner 私有模型配置；敏感 Key 不对访客展示。
- **配置玩法**：店主发布轻量文字玩法，访客可开始、继续、推进或放弃会话。
- **查看回访状态**：通过对话历史、访客状态、记忆和状态卡维护空间连续性。

## 常见问题

**`8950` 端口被占用**

换端口启动：

```powershell
py -3 -m fablemap_api api --port 8951 --no-open
```

前端开发模式如果换了后端端口，需要同步调整 `frontend/vite.config.js` 的代理目标。

**前端开发页打开后 API 失败**

确认后端已在 `8950` 运行，并检查 `/api/health`。前端 dev server 只代理请求，不会自己启动后端。

**数据库初始化失败**

先确认 `FABLEMAP_DATABASE_URL` 是否正确。只想本地快速体验时，可以清空数据库 URL，默认使用 `.fablemap-api/fablemap.sqlite3`；只有需要旧文件存储时才设置 `FABLEMAP_STORAGE_BACKEND=json`。

**空间内 NPC 没有真实 LLM 回复**

确认店主已经在空间管理界面配置 LLM。没有外部 Key 时，默认公益空间仍可体验本地 fallback 玩法，但不等同于真实模型调用。

**Docker 端口冲突**

修改 `.env` 中的 `FABLEMAP_FRONTEND_PORT` 或 `FABLEMAP_API_PORT` 后重新启动 Compose。

## 开发边界

改动前先按任务范围读取相关文档。尤其注意：

- 空间必须挂接真实坐标。
- 平台不能绕过店主确认自动发布空间内容。
- 店主 LLM API Key、Token 统计和对话记录按敏感数据处理。
- 不做平台级 Token 充值 / 结算。
- 不做无边界访客社交、路线导航、评分系统、战斗等级装备系统。
- API / Schema 改动必须同步测试和文档。

## 文档入口

- [产品概述](docs/PRODUCT_BRIEF.md)
- [空间平台设计](docs/FABLEMAP_TAVERN_PLATFORM.md)
- [系统架构](docs/ARCHITECTURE.md)
- [世界数据结构](docs/WORLD_SCHEMA.md)
- [明确不做清单](docs/WHAT_NOT_TO_BUILD.md)
- [图像资源规范](docs/IMAGE_ASSETS_SPEC.md)
- [AI 协作协议](docs/AI参与开发协议.md)
- [文档索引](docs/INDEX.md)
