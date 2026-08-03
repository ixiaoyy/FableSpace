# FableSpace 自动部署与 CDN

生产部署使用 GitHub Actions、SSH、Docker Compose 和 S3 兼容对象存储。实现入口是 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)。对象存储可以使用 Cloudflare R2，也可以使用支持自定义 S3 endpoint 的兼容服务。

## 发布流程

```text
push main
  -> 检测 apps/api / apps/web / 部署配置变化
  -> 前端构建时写入稳定媒体 CDN base
  -> 媒体/CDN 配置或部署工作流变化时，对照 media-manifest.json 核对桶内全部图片对象
  -> 全量媒体校验触发时，通过 CDN 域名读取抽样图片做真实校验
  -> 前端 Docker 镜像上传到服务器并替换 frontend
  -> 后端变化时在服务器重建 backend 并检查 /api/v1/health
```

项目图片路径使用：

```text
https://<cdn-domain>/fablespace/media/v1/<object-key>
```

图片对象使用稳定、不可变 key，文件响应头为 `public,max-age=31536000,immutable`。内容变化时发布新 key 并更新清单和代码 URL，不覆盖旧对象，也不依赖清 CDN 缓存。JS/CSS 保持在前端站点同源部署。

代码随附图片继续由 `deploy/cdn/media-manifest.json` 管理。固定管理员在 Character 编辑页上传的图片进入 `fablespace/media/v1/admin/`，由 `managed_media_assets` 记录，不写静态 manifest，也不提供媒体库或对象删除。

## GitHub 配置

先在仓库 `Settings -> Secrets and variables -> Actions` 配置以下内容。Secret 不得写入仓库文件。

### Variables

| 名称 | 必填 | 示例 | 说明 |
|------|------|------|------|
| `DEPLOY_ENABLED` | 是 | `true` | 部署意图开关；未设为 `true` 时只做变更检测，不部署 |
| `DEPLOY_CONFIGURED` | 是 | `true` | 配置就绪开关；服务器、CDN 和全部 Secret 验证完成后才可设为 `true` |
| `DEPLOY_PATH` | 否 | `/opt/fablespace` | 服务器仓库目录，默认 `/opt/fablespace` |
| `CDN_S3_REGION` | 否 | `auto` | R2 使用 `auto`，AWS S3 使用实际 region |
| `CDN_S3_PREFIX` | 否 | `fablespace` | 同一桶内的项目目录，默认 `fablespace` |

### Secrets

| 名称 | 必填 | 说明 |
|------|------|------|
| `DEPLOY_HOST` | 是 | SSH 服务器地址 |
| `DEPLOY_USER` | 是 | SSH 用户 |
| `DEPLOY_SSH_KEY` | 是 | 部署私钥 |
| `DEPLOY_PORT` | 否 | SSH 端口，默认 `22` |
| `CDN_BASE_URL` | 是 | 对象存储绑定的 HTTPS CDN 域名，不带 release 路径 |
| `CDN_S3_BUCKET` | 是 | 对象存储桶名 |
| `CDN_S3_ENDPOINT_URL` | 是 | S3 endpoint；R2 形如 `https://<account-id>.r2.cloudflarestorage.com` |
| `CDN_S3_ACCESS_KEY_ID` | 是 | 仅允许写目标桶的访问 Key |
| `CDN_S3_SECRET_ACCESS_KEY` | 是 | 对应 Secret Key |
| `VITE_API_BASE` | 否 | 前后端分离时的 API 基址；同源部署留空 |

配置顺序应为：先保持 `DEPLOY_ENABLED` 或 `DEPLOY_CONFIGURED` 未启用，完成服务器、桶、CDN 和 Secret 配置；最后把两个开关都设为 `true`，再手动触发一次 `Deploy` workflow。双开关用于避免只打开部署意图、但生产凭据尚未齐全时误触发发布。

## R2 / S3 与 CDN

本节用于公开的项目图片和固定管理员提供的 Character 图片。ParallelLines 私密联动模式的运行时生成文件仍必须保留在本地持久卷，不进入公开 CDN；`FABLESPACE_GENERATED_STORAGE_BACKEND=local` 不妨碍受保护的管理员上传使用同一 S3/CDN 配置。

1. 创建私有写入凭据，权限限制到目标桶的对象读写和列举。
2. 为桶绑定公开 HTTPS 域名，把该域名写入 `CDN_BASE_URL`。
3. 当前页面通过 `<img>`、CSS 背景和只读 Canvas 绘制图片，不要求 CDN 返回 CORS 响应头；未来如需读取像素或导出 Canvas，再按 [`deploy/cdn/cors.example.json`](../deploy/cdn/cors.example.json) 配置 GET/HEAD CORS。
4. 确认 CDN 不覆盖源站的 `Cache-Control`；`fablespace/media/v1/` 使用长期缓存。
5. 不要对仍在 `deploy/cdn/media-manifest.json` 中的对象设置过期规则；删除或替换对象前必须先确认没有代码、seed 或文档 URL 引用。

当 `deploy/cdn/**` 或部署工作流变化，或手动触发部署时，Workflow 会比较清单中每个对象的 key 与字节数，并通过 `CDN_BASE_URL` 实际下载抽样图片；普通前端代码变更不执行全量桶扫描，避免被无关的历史媒体漂移阻塞。全量校验触发后，对象缺失、大小不符、公开域名或 CDN 回源未生效仍会在替换服务器前阻止发布。
清单为空时，全量校验会要求静态媒体命名空间同样为空；数据库登记的 `fablespace/media/v1/admin/` 动态对象不参与该空清单判断。

## 服务器首次准备

服务器需要 Git、Docker 和 Docker Compose。生产方案复用 ParallelLines 的 MySQL、共享 Docker 网络，以及项目图片使用的 R2 bucket/CDN；FableSpace 使用独立的 `fablespace` database，私密运行时生成文件保存在 `fablespace_data` 持久卷。FableSpace 不使用 Redis。

先准备仓库和环境文件：

```bash
sudo git clone https://github.com/ixiaoyy/FableSpace.git /opt/fablespace
cd /opt/fablespace
sudo cp apps/api/.env.example apps/api/.env
sudo python3 deploy/server/configure_shared_services.py --cors-origin https://fable.pingxingxian.space --dry-run
sudo python3 deploy/server/configure_shared_services.py --cors-origin https://fable.pingxingxian.space
```

配置脚本从 `/opt/parallellines/apps/api/.env` 只映射 MySQL 连接，默认写入 `FABLESPACE_GENERATED_STORAGE_BACKEND=local`；同时在两端环境文件中补齐私密联动配置。若 ParallelLines 已配置完整 `UPLOAD_S3_*` 与 `UPLOAD_CDN_BASE_URL`，脚本也会映射对应的 `FABLESPACE_S3_*`，供受保护的 Character 图片上传使用，但不会改变生成文件的本地归属。若两端都没有有效 SSO 密钥，脚本生成一份共享高强度随机值；若任一端已有有效值则复用；若两端已有不同的有效值则拒绝继续，避免静默轮换导致登录中断。FableSpace 会话密钥独立生成或复用，不与 SSO 密钥共享。发生实际变更前会生成 `.env.pre-shared-<UTC>` 备份，输出不包含密码或密钥；配置未变化时不会重复备份。

脚本会保留无关配置，并从 FableSpace 环境文件中删除旧 `FABLEMAP_*`、`FABLESPACE_MYSQL_URL`、JSON storage、旧前端 root、默认 Space seed、Redis 和早期模型 Key 等退役键。它不会删除 ParallelLines 自身仍在使用的配置。Compose 插值写入仓库根 `.env`，其中后端宿主绑定为 `127.0.0.1:8950`，避免与 ParallelLines 的 `8000` 端口冲突，容器内 API 端口仍为 `8000`。生产部署 workflow 会幂等执行该脚本，并仅在 ParallelLines 环境实际变化时重建其 API/worker 以加载新值。只有独立公开部署才可传入 `--auth-mode legacy --generated-storage s3` 让生成文件进入 R2；私密联动模式会拒绝公开生成文件存储。

在 ParallelLines MySQL 中创建独立库并给现有应用用户授权。实际容器名可用 `docker compose -p parallellines ps` 确认：

```bash
docker exec parallellines-db-1 sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS fablespace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON fablespace.* TO '\''$MYSQL_USER'\''@'\''%'\''; FLUSH PRIVILEGES"'
```

### 空库初始化

应用启动的 SQLAlchemy `create_tables()` 是空库基线，只会创建以下 8 张当前表：

- `player_story_states`
- `story_runs`
- `character_relationships`
- `story_events`
- `story_messages`
- `private_memories`
- `managed_story_worlds`
- `managed_media_assets`

004–007 保留当前 Schema 的演进历史；空库不需要先执行已删除的 FableMap 001–003。首次启动只补入缺失的安妮与长明宫 StoryWorld，不覆盖已经存在的管理文档。

### 已有库的受控 006/008 修复与旧 Schema 清退

普通 push 部署和应用启动都不会执行 SQL 迁移。生产库缺少
`story_runs.player_role_id`、同时还保留旧内联
`story_runs.private_memories` 时，只能在单独获得目标库与破坏性范围授权后，
手动触发
[`repair-story-run-schema.yml`](../.github/workflows/repair-story-run-schema.yml)。
该入口固定操作 `/opt/fablespace` 的 `fablespace` database，要求输入精确确认词
`APPLY-006-AND-008-FABLESPACE-PRODUCTION`，并锁定当前审核过的 006、008 文件
SHA-256；它不接受数据库名、SQL 或 shell 参数。

专用修复与普通 `Deploy` 共用 `fablespace-production` concurrency group，且都不
取消已经运行的生产操作。执行顺序固定为：

1. 校验服务器提交、迁移哈希和当前 ORM；构建当前 backend 镜像。
2. 定位唯一运行中的 ParallelLines MySQL 容器，停止 FableSpace backend 写入。
3. 把完整逻辑备份写到
   `/opt/fablespace/backups/story-run-schema-repair/`，文件权限为 `0600`，并生成
   同名 `.sha256`。
4. 在任何 DDL 前确认当前 8 张表完整、没有 006/008 清单之外的表、
   `story_runs.player_role_id` 完全不存在、每条 StoryRun 都能唯一回填有效
   PlayerRole；若内联记忆列仍存在，只接受 SQL `NULL` 或 JSON 空数组。
5. 依次执行 `006_story_run_player_role.sql` 和
   `008_retire_legacy_space_schema.sql`，每一步都验证列定义、数据、行数和最终
   8 表集合。
6. 重建 backend，检查 `/api/v1/health`，并使用当前 SQLAlchemy
   `StoryRunModel` 发起一次真实查询。

DDL 前失败时 workflow 会重新启动已经核验的 backend 镜像；任一 DDL 开始后
失败时则保持 backend 停止，并保留备份和日志供人工整库恢复。它不会自动导入
备份、猜测反向 SQL，也不会把备份或玩家数据上传为 GitHub artifact。成功日志
只输出维护时间、服务器备份路径和 SHA-256。

`apps/api/sql/migrations/008_retire_legacy_space_schema.sql` 仍是一份一次性、显式
且破坏性的清退迁移。无法使用上述受控 workflow 的自托管环境也必须先发布包含
当前 8 表 ORM 的代码并通过健康检查，再进入停止写入的维护窗口；旧版本后端不得
在该列删除后继续运行。只有在另行获得目标 database 操作授权后，才可使用受保护
的 MySQL client option file 执行以下流程；不得使用 `mysql --force`：

```bash
install -d -m 0700 /secure/fablespace-backups
BACKUP_PATH="/secure/fablespace-backups/fablespace-$(date -u +%Y%m%dT%H%M%SZ).sql"

mysqldump \
  --defaults-extra-file=/secure/mysql-client.cnf \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --databases fablespace > "${BACKUP_PATH}"

test -s "${BACKUP_PATH}"
sha256sum "${BACKUP_PATH}" | tee "${BACKUP_PATH}.sha256"

mysql \
  --defaults-extra-file=/secure/mysql-client.cnf \
  --database=fablespace \
  --show-warnings \
  < apps/api/sql/migrations/008_retire_legacy_space_schema.sql
```

执行前必须记录目标主机、数据库名、备份路径、UTC 时间和 SHA-256，并停止或隔离应用写入。迁移先确认 8 张当前表全部存在；若旧 `story_runs.private_memories` 列存在，只接受 SQL `NULL` 或 JSON 空数组 `[]`，其他值会在删除任何目标表或列前终止。随后按外键依赖顺序删除精确的 23 张旧表，并在安全时删除该内联列。旧表已不存在或旧列已删除时可以重复执行。

执行成功后，在同一已授权目标上查询 `information_schema.TABLES`，结果必须精确等于上述 8 张当前表；同时确认 `information_schema.COLUMNS` 中不存在 `story_runs.private_memories`。随后检查 `/api/v1/health`，用当前 ORM 完成一次 StoryRun 查询，并用受控账号完成一次最小故事读取与写入验收。任何额外表、缺表、旧列残留或运行时失败都视为未完成，不继续恢复外部流量。健康端点本身不读取故事表，不能单独作为 Schema 一致性的证据。

MySQL DDL 会隐式提交，因此迁移中途失败可能已经产生部分删除。失败时停止应用写入，使用执行前逻辑备份恢复整个 `fablespace` database，再重新验证；不使用反向 SQL 猜测恢复旧数据。仅合并仓库代码不代表任何现有数据库已经执行 008。

后端同时连接 Compose 默认网络与外部 `parallellines_default` 网络；前端仍只在 FableSpace 默认网络内访问 backend。若共享网络名称不同，设置 `FABLESPACE_SHARED_NETWORK`。启动命令必须包含共享覆盖文件：

```bash
sudo docker compose -f docker-compose.yml -f deploy/docker-compose.shared.yml up -d --build
```

## 运行日志

部署流程会把 `deploy/server/fablelog` 安装到 `/usr/local/bin/fablelog`。登录服务器后可直接实时查看：

```bash
fablelog backend
fablelog frontend
fablelog all
```

默认显示最近 200 行并持续跟踪，按 `Ctrl+C` 退出。临时调整初始行数可设置 `FABLESPACE_LOG_TAIL`，例如：

```bash
FABLESPACE_LOG_TAIL=500 fablelog backend
```

前后端继续把日志写到标准输出，由 Docker `json-file` 驱动接管。每个容器日志文件达到 20 MB 时自动轮转，最多保留 5 个文件，避免日志无限增长占满磁盘。

## ParallelLines 私密空间联动

生产环境把 FableSpace 设为只接受 ParallelLines 授权的产品会话。在 `/opt/fablespace/apps/api/.env` 配置：

```dotenv
FABLESPACE_AUTH_MODE=parallellines
FABLESPACE_GENERATED_STORAGE_BACKEND=local
FABLESPACE_PARALLELLINES_API_BASE_URL=http://api:8000/api/v1
FABLESPACE_PARALLELLINES_PUBLIC_BASE_URL=https://pingxingxian.space
FABLESPACE_PARALLELLINES_SSO_SERVICE_SECRET=<与主站相同的高强度随机值>
FABLESPACE_SESSION_SECRET=<另一份独立高强度随机值>
FABLESPACE_SESSION_COOKIE_SECURE=true
FABLESPACE_SESSION_TTL_SECONDS=3600
FABLESPACE_AUTH_INTROSPECTION_CACHE_TTL_SECONDS=30
FABLESPACE_AUTH_INTROSPECTION_TIMEOUT_SECONDS=5
FABLESPACE_ADMIN_MEDIA_MAX_BYTES=10485760

# 已有部署级公共模型路由；StoryWorld 默认直接复用。
FABLEMAP_DEFAULT_FREE_LLM_BACKEND=custom
FABLEMAP_DEFAULT_FREE_LLM_MODEL=deepseek-v4-flash-free
FABLEMAP_DEFAULT_FREE_LLM_BASE_URL=https://opencode.ai/zen
FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV=OPENCODE_API_KEY
OPENCODE_API_KEY=<现有系统模型 Key>

# Character 编辑页上传；生成文件仍保持 local。
FABLESPACE_S3_BUCKET=<项目现有桶>
FABLESPACE_S3_REGION=auto
FABLESPACE_S3_ENDPOINT_URL=<S3 endpoint>
FABLESPACE_S3_ACCESS_KEY_ID=<仅限目标桶的写入 Key>
FABLESPACE_S3_SECRET_ACCESS_KEY=<对应 Secret>
FABLESPACE_S3_PREFIX=fablespace
FABLESPACE_CDN_BASE_URL=https://img.pingxingxian.space
```

在 `/opt/parallellines/apps/api/.env` 配置：

```dotenv
FABLESPACE_BASE_URL=https://fable.pingxingxian.space
FABLESPACE_SSO_SERVICE_SECRET=<与 FableSpace 兑换密钥相同>
FABLESPACE_SSO_TICKET_TTL_SECONDS=60
```

两份密钥不得写入仓库、前端构建变量或日志。`configure_shared_services.py` 负责生成或复用密钥并同步两端；手工修改时仍必须重建/重启两个后端。FableSpace 在 `parallellines` 模式下若缺少 SSO 服务密钥或会话密钥会拒绝启动，避免部署时静默退回可伪造的旧身份模式。`FABLESPACE_AUTH_INTROSPECTION_CACHE_TTL_SECONDS` 运行时限制为 1–60 秒；缓存过期后续验主站失败会拒绝访问，不使用过期结果兜底。

StoryWorld 默认复用上述已有部署级公共模型路由：backend、model 和 base URL 来自 `FABLEMAP_DEFAULT_FREE_LLM_*`，`FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV` 只保存服务端 Key 的环境变量名，运行时在内存中解析实际 Key；生成参数沿用 `temperature=0.8`、`max_tokens=1024`、`top_p=0.9`。无需为 StoryWorld 复制同一把 Key。

需要独立覆盖时，可以同时提供 `FABLESPACE_LLM_BACKEND`、`FABLESPACE_LLM_MODEL`、`FABLESPACE_LLM_API_KEY`、`FABLESPACE_LLM_BASE_URL`、`FABLESPACE_LLM_TEMPERATURE`、`FABLESPACE_LLM_MAX_TOKENS` 和 `FABLESPACE_LLM_TOP_P`。只要其中任一项出现，运行时就严格校验整组且不与公共路由混用；temperature 允许 `0..2`，max tokens 允许 `1..4096`，top-p 允许 `(0, 1]`。所选来源缺失或非法时，公开页面和内容后台继续可用，对话请求返回 `503`。两种来源都只读取后端部署环境，不读取仓库 JSON、owner、StoryWorld 或数据库；启动日志只记录固定配置字段名，不记录配置值、Key 指针目标值或密钥。修改后必须重建或重启 FableSpace 后端。

ParallelLines 必须为账号返回 `fablespace.access` 才能签发并维持会话。
FableSpace 不注册 creator、owner、故事创建、角色卡、地图或私有 LLM 产品能力。
票据兑换响应需要在身份资料之外返回 `capabilities`、
`authorization_version`、`access_expires_at`，并提供同一服务密钥保护的
`POST /api/v1/auth/fablespace/introspect`。部署后直接打开 FableSpace 域名
可浏览首页、角色卡和公开 StoryWorld 角色详情；开始、恢复、推进或重新开始
故事的 API 必须在票据兑换并建立有效会话后开放，无会话时返回 `401`。

内容后台不维护第二份管理员账号或管理员 ID 配置。后端在已有 `fablespace.access`
可信会话基础上，以 ParallelLines 票据兑换和实时回查返回的 `user.role`
为准；当前角色为 `admin` 的账号自动获得 `/api/v1/admin/**`、StoryWorld
保存和 Character 图片上传权限，角色变更会在鉴权缓存过期后生效。普通账号
即使具备其他 FableSpace 产品 capability 也不能进入内容后台。

未登录玩家从角色页进入故事时，FableSpace 的
`GET /api/v1/auth/parallellines/start` 先把允许的本站角色路径写入短期签名
HttpOnly Cookie，再跳转 ParallelLines `/play` 现有入口。票据回调建立会话后
只读取该服务端签名路径并以 `303` 回到原角色页；无效、过期、外部或非允许
路径统一回到 `/`。回跳 Cookie 在成功兑换后删除，不进入前端构建变量或 URL。

## 回滚

推荐 revert 问题提交并推送 `main`。媒体对象只有仍登记在当前
`deploy/cdn/media-manifest.json` 时才可作为回滚依赖；已经完成退役并从
正式命名空间删除的对象不会为了旧版本保留。回滚到仍引用退役 URL 的提交前，
必须先发布等价的新对象并同步清单与代码引用。若只在服务器手工切换镜像，
仓库状态与后端版本可能不一致，不作为标准回滚流程。

## 本地验证 CDN base

PowerShell：

```powershell
$env:VITE_MEDIA_BASE_URL = "https://cdn.example.com/fablespace/media/v1"
npm --prefix .\apps\web run build
rg "cdn.example.com/fablespace/media/v1" .\apps\web\build\client
Remove-Item Env:VITE_MEDIA_BASE_URL
```

该变量只改变项目图片基址，不改变 `/api`、`/generated` 或运行时上传数据的归属。
