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

本节默认只用于公开的项目图片。ParallelLines 私密联动模式的运行时生成文件必须保留在本地持久卷，不进入公开 CDN。

1. 创建私有写入凭据，权限限制到目标桶的对象读写和列举。
2. 为桶绑定公开 HTTPS 域名，把该域名写入 `CDN_BASE_URL`。
3. 当前页面通过 `<img>`、CSS 背景和只读 Canvas 绘制图片，不要求 CDN 返回 CORS 响应头；未来如需读取像素或导出 Canvas，再按 [`deploy/cdn/cors.example.json`](../deploy/cdn/cors.example.json) 配置 GET/HEAD CORS。
4. 确认 CDN 不覆盖源站的 `Cache-Control`；`fablespace/media/v1/` 使用长期缓存。
5. 不要对仍在 `deploy/cdn/media-manifest.json` 中的对象设置过期规则；删除或替换对象前必须先确认没有代码、seed 或文档 URL 引用。

当 `deploy/cdn/**` 或部署工作流变化，或手动触发部署时，Workflow 会比较清单中每个对象的 key 与字节数，并通过 `CDN_BASE_URL` 实际下载抽样图片；普通前端代码变更不执行全量桶扫描，避免被无关的历史媒体漂移阻塞。全量校验触发后，对象缺失、大小不符、公开域名或 CDN 回源未生效仍会在替换服务器前阻止发布。
清单为空时，全量校验会要求 `fablespace/media/v1/` 命名空间同样为空；残留未登记对象会直接阻止发布。

## 服务器首次准备

服务器需要 Git、Docker 和 Docker Compose。生产方案复用 ParallelLines 的 MySQL、Redis，以及项目图片使用的 R2 bucket/CDN；FableSpace 分别使用 `fablespace` database 和 Redis DB `1`，私密运行时生成文件保存在 `fablespace_data` 持久卷。

先准备仓库和环境文件：

```bash
sudo git clone https://github.com/ixiaoyy/FableSpace.git /opt/fablespace
cd /opt/fablespace
sudo cp apps/api/.env.example apps/api/.env
sudo python3 deploy/server/configure_shared_services.py --cors-origin https://fable.pingxingxian.space --dry-run
sudo python3 deploy/server/configure_shared_services.py --cors-origin https://fable.pingxingxian.space
```

配置脚本从 `/opt/parallellines/apps/api/.env` 映射数据库和 Redis 连接，默认写入 `FABLESPACE_GENERATED_STORAGE_BACKEND=local`；同时在两端环境文件中补齐私密联动配置。若两端都没有有效 SSO 密钥，脚本生成一份共享高强度随机值；若任一端已有有效值则复用；若两端已有不同的有效值则拒绝继续，避免静默轮换导致登录中断。FableSpace 会话密钥独立生成或复用，不与 SSO 密钥共享。发生实际变更前会生成 `.env.pre-shared-<UTC>` 备份，输出不包含密码或密钥；配置未变化时不会重复备份。脚本会保留无关配置，但会删除 `FABLEMAP_DATABASE_URL`、`FABLESPACE_MYSQL_URL`、`FABLEMAP_MYSQL_URL` 这些已由 `FABLESPACE_DATABASE_URL` 取代的数据库别名，避免新旧连接同时残留。Compose 插值写入仓库根 `.env`，其中后端宿主绑定为 `127.0.0.1:8950`，避免与 ParallelLines 的 `8000` 端口冲突，容器内 API 端口仍为 `8000`。生产部署 workflow 会幂等执行该脚本，并仅在 ParallelLines 环境实际变化时重建其 API/worker 以加载新值。只有独立公开部署才可传入 `--auth-mode legacy --generated-storage s3` 映射 R2 配置；私密联动模式会拒绝公开生成文件存储。

在 ParallelLines MySQL 中创建独立库并给现有应用用户授权。实际容器名可用 `docker compose -p parallellines ps` 确认：

```bash
docker exec parallellines-db-1 sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS fablespace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON fablespace.* TO '\''$MYSQL_USER'\''@'\''%'\''; FLUSH PRIVILEGES"'
```

首次迁移前必须先为旧数据库做逻辑备份，再使用非破坏性迁移器执行 dry-run 和正式迁移。迁移器只建表并按主键 upsert，不删除目标行，并显式映射旧库 `tavern_id/tavern_name` 到当前 `space_id/space_name` 字段；实际执行时通过只读 volume 把 `apps/api/.env.pre-shared-*` 映射进临时 backend 容器，再用 `--source-env-file` 和 `--source-env-key FABLEMAP_DATABASE_URL` 读取源连接，避免把密码放进命令行或日志。

后端同时连接 Compose 默认网络与外部 `parallellines_default` 网络；前端仍只在 FableSpace 默认网络内访问 backend。若共享网络名称不同，设置 `FABLESPACE_SHARED_NETWORK`。启动命令必须包含共享覆盖文件：

```bash
sudo docker compose -f docker-compose.yml -f deploy/docker-compose.shared.yml up -d --build
```

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
```

在 `/opt/parallellines/apps/api/.env` 配置：

```dotenv
FABLESPACE_BASE_URL=https://fable.pingxingxian.space
FABLESPACE_SSO_SERVICE_SECRET=<与 FableSpace 兑换密钥相同>
FABLESPACE_SSO_TICKET_TTL_SECONDS=60
```

两份密钥不得写入仓库、前端构建变量或日志。`configure_shared_services.py` 负责生成或复用密钥并同步两端；手工修改时仍必须重建/重启两个后端。FableSpace 在 `parallellines` 模式下若缺少 SSO 服务密钥或会话密钥会拒绝启动，避免部署时静默退回可伪造的旧身份模式。`FABLESPACE_AUTH_INTROSPECTION_CACHE_TTL_SECONDS` 运行时限制为 1–60 秒；缓存过期后续验主站失败会拒绝访问，不使用过期结果兜底。

ParallelLines 必须为账号返回 `fablespace.access` 才能签发并维持会话。
FableSpace 不注册 creator、owner、admin、故事创建、角色卡、地图或私有
LLM 产品能力。票据兑换响应需要在身份资料之外返回 `capabilities`、
`authorization_version`、`access_expires_at`，并提供同一服务密钥保护的
`POST /api/v1/auth/fablespace/introspect`。部署后直接打开 FableSpace 域名
应显示关闭入口；只有从 ParallelLines 私密入口完成票据兑换后，业务页面、
API 与生成资源才会开放。

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
