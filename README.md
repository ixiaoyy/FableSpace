# FableSpace 操作手册

> FableSpace 是一个基于真实地理位置的 AI 空间 UGC 平台：店主在地图上创建空间、配置 AI NPC，探索者进入空间对话、游玩、留下记忆并回访。

本 README 是项目默认入口，侧重“怎么把项目跑起来、怎么配置、怎么验证、常见操作在哪里做”。产品定义、架构和 Schema 细节请看文末文档入口。

## 目录速览

| 路径 | 用途 |
|------|------|
| `apps/api/src/fablespace_api/` | Python / FastAPI 后端源码 |
| `apps/web/` | React Router + Vite 前端 |
| `docs/` | 产品、架构、Schema、边界与资源规范 |
| `.trellis/` | Trellis 任务、规范与协作记录 |
| `.fablespace-api/` | 默认本地输出 / SQLite / 兼容数据目录，运行后生成，不入库 |

## 环境准备

本仓库常用命令以 Windows PowerShell 为例。

需要准备：

- Python 3 与 `pip`
- Node.js 与 `npm`
- 可选：Docker Desktop / Docker Compose

首次安装依赖：

```powershell
py -3 -m pip install -r .\apps\api\requirements.txt
npm --prefix .\apps\web install
```

可选本地环境文件：

```powershell
Copy-Item .\apps\api\.env.example .\apps\api\.env
Copy-Item .\apps\web\.env.example .\apps\web\.env.local
```

## 本地一体化运行

这种方式先构建前端，再由 Python 后端在 `8950` 端口同时提供 API 和前端页面。

```powershell
npm --prefix .\apps\web run build

$env:PYTHONPATH = "$PWD\apps\api\src"
py -3 -m fablespace_api api --no-open
```

访问：

```text
http://127.0.0.1:8950/
http://127.0.0.1:8950/api/health
http://127.0.0.1:8950/api/meta
```

常用参数：

```powershell
py -3 -m fablespace_api api --host 127.0.0.1 --port 8950 --no-open
py -3 -m fablespace_api api --output-root .fablespace-api --no-open
```

## 前端开发运行

需要两个终端。

终端 A：启动后端。

```powershell
$env:PYTHONPATH = "$PWD\apps\api\src"
py -3 -m fablespace_api api --no-open
```

终端 B：启动前端开发服务器。

```powershell
npm --prefix .\apps\web run dev
```

访问：

```text
http://127.0.0.1:5173/
```

`apps/web/vite.config.js` 已把 `/api` 和 `/generated` 代理到 `http://127.0.0.1:8950`，所以前端开发模式下仍需要后端先启动。

## Docker Compose 运行

仓库提供 `docker-compose.yml`，前端由 nginx 托管静态构建，后端运行 `uvicorn fablespace_api.main:app`。

```powershell
Copy-Item .\apps\api\.env.example .\apps\api\.env
docker compose up --build
```

默认访问：

```text
http://127.0.0.1:3000/
http://127.0.0.1:8000/api/v1/health
```

默认端口在 `docker-compose.yml` 中固定：

```yaml
frontend: 3000 -> 80
backend: 8000 -> 8000
```

## 环境变量

环境文件按用途拆开：

- `apps/api/.env`：给本地 Python 后端和 Docker 后端服务读取；示例是 `apps/api/.env.example`。
- `apps/web/.env.local`：给 Vite 前端开发读取；示例是 `apps/web/.env.example`。

本地 Python 后端默认只读取 `apps/api/.env`；已有的 Shell / Docker 环境变量仍优先。

| 变量 | 用途 |
|------|------|
| `FABLESPACE_DATABASE_URL` | 首选 SQLAlchemy 数据库 URL；可指向 MySQL / Postgres / SQLite |
| `FABLESPACE_MYSQL_URL` | 旧数据库 URL 别名，新配置优先用 `FABLESPACE_DATABASE_URL` |
| `FABLESPACE_STORAGE_BACKEND` | 默认 `database`；只有显式设为 `json` 时使用旧 JSON 文件存储 |
| `FABLESPACE_OUTPUT_ROOT` | 后端输出目录；本地默认 `.fablespace-api`，Docker 默认 `/data` |
| `FABLESPACE_SEED_DEFAULT_SPACES` | 是否写入默认公益空间；默认 `1` |
| `FABLESPACE_CORS_ORIGINS` | 前后端分离运行时允许的浏览器来源 |
| `VITE_API_BASE` | 前端构建期 API 基址；留空时使用同源 `/api` |
| `VITE_AMAP_KEY` / `VITE_AMAP_SECURITY_CODE` | 可选地图服务密钥 |
| `OPENCODE_API_KEY` | 可选系统公益空间测试 LLM Key；普通店主 Key 不应写入共享环境文件 |

旧 `FABLEMAP_*` 环境变量名仍作为后端回退兼容；新部署和新文档优先使用上表中的 `FABLESPACE_*`。

店主自己的 LLM API Key 应在 FableSpace 店主管理界面中按空间配置，不要提交到仓库，也不要写入共享环境文件。

## 数据存储

默认存储策略：

- `FABLESPACE_STORAGE_BACKEND=database` 是默认值。
- 未配置 `FABLESPACE_DATABASE_URL` / `FABLESPACE_MYSQL_URL` 时，本地会使用 `<output-root>/fablespace.sqlite3`。
- 显式设置 `FABLESPACE_STORAGE_BACKEND=json` 时，才使用旧 JSON 兼容存储。
- Docker Compose 会把后端输出写入 Docker volume `fablespace_data`。

从本地 SQLite 迁移到 `apps/api/.env` 中的目标数据库：

```powershell
$env:PYTHONPATH = "$PWD\apps\api\src"
py -3 -m fablespace_api.infrastructure.migrate_database --dry-run
py -3 -m fablespace_api.infrastructure.migrate_database
```

从旧 JSON / file runtime 数据迁移：

```powershell
$env:PYTHONPATH = "$PWD\apps\api\src"
$env:FABLESPACE_DATABASE_URL = "mysql+pymysql://user:pass@localhost:3306/fablespace"
py -3 -m fablespace_api.infrastructure.migrate --output-root .fablespace-api
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
npm --prefix .\apps\web run build
npm --prefix .\apps\web run typecheck
```

当前 `apps/web/package.json` 没有通用 `test` 脚本；如后续新增测试脚本，以 package scripts 为准。

### 后端语法检查

```powershell
py -3 -m compileall -q apps/api/src
```

当前仓库不保留 pytest 用例目录；不要把手工脚本放在根目录并命名为 `test_*.py`，以免重新污染开发验证。

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
py -3 -m fablespace_api api --port 8951 --no-open
```

前端开发模式如果换了后端端口，需要同步调整 `apps/web/vite.config.js` 的代理目标。

**前端开发页打开后 API 失败**

确认后端已在 `8950` 运行，并检查 `/api/health`。前端 dev server 只代理请求，不会自己启动后端。

**数据库初始化失败**

先确认 `FABLESPACE_DATABASE_URL` 是否正确。只想本地快速体验时，可以清空数据库 URL，默认使用 `.fablespace-api/fablespace.sqlite3`；只有需要旧文件存储时才设置 `FABLESPACE_STORAGE_BACKEND=json`。

**空间内 NPC 没有真实 LLM 回复**

确认店主已经在空间管理界面配置 LLM。没有外部 Key 时，默认公益空间仍可体验本地 fallback 玩法，但不等同于真实模型调用。

**Docker 端口冲突**

修改 `docker-compose.yml` 里的端口映射，或新增本地 compose override 文件后重新启动 Compose。

## 开发边界

改动前先按任务范围读取相关文档。尤其注意：

- 空间必须挂接真实坐标。
- 平台不能绕过店主确认自动发布空间内容。
- 店主 LLM API Key、Token 统计和对话记录按敏感数据处理。
- 不做平台级 Token 充值 / 结算。
- 不做无边界访客社交、路线导航、评分系统、战斗等级装备系统。
- API / Schema 改动必须同步文档，并运行当前保留的最小真实验证。

## 文档入口

- [产品概述](docs/PRODUCT_BRIEF.md)
- [空间平台设计](docs/FABLESPACE_SPACE_PLATFORM.md)
- [系统架构](docs/ARCHITECTURE.md)
- [世界数据结构](docs/WORLD_SCHEMA.md)
- [明确不做清单](docs/WHAT_NOT_TO_BUILD.md)
- [图像资源规范](docs/IMAGE_ASSETS_SPEC.md)
- [AI 协作协议](docs/AI参与开发协议.md)
- [文档索引](docs/INDEX.md)
