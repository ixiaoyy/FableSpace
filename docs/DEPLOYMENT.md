# FableSpace 自动部署与 CDN

生产部署使用 GitHub Actions、SSH、Docker Compose 和 S3 兼容对象存储。实现入口是 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)。对象存储可以使用 Cloudflare R2，也可以使用支持自定义 S3 endpoint 的兼容服务。

## 发布流程

```text
push main
  -> 检测 apps/api / apps/web / 部署配置变化
  -> 前端构建时写入 release-scoped CDN base
  -> build/client/assets 同步到对象存储
  -> 通过 CDN 域名读取一个 JS/CSS 文件做真实校验
  -> 前端 Docker 镜像上传到服务器并替换 frontend
  -> 后端变化时在服务器重建 backend 并检查 /api/v1/health
```

前端资源路径使用：

```text
https://<cdn-domain>/fablespace/releases/<git-sha>/assets/<built-file>
```

每次发布使用独立提交号目录，文件响应头为 `public,max-age=31536000,immutable`。因此正常发布不需要清 CDN 缓存，新旧 HTML 也不会引用到彼此的构建资源。

## GitHub 配置

先在仓库 `Settings -> Secrets and variables -> Actions` 配置以下内容。Secret 不得写入仓库文件。

### Variables

| 名称 | 必填 | 示例 | 说明 |
|------|------|------|------|
| `DEPLOY_ENABLED` | 是 | `true` | 总开关；未设为 `true` 时只做变更检测，不部署 |
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
| `PUBLIC_SITE_ORIGIN` | 是 | 正式站点 origin，例如 `https://fablespace.example.com`，用于校验 CDN CORS |
| `VITE_API_BASE` | 否 | 前后端分离时的 API 基址；同源部署留空 |
| `VITE_AMAP_KEY` | 否 | 浏览器端地图 Key |
| `VITE_AMAP_SECURITY_CODE` | 否 | 地图安全码 |

配置顺序应为：先保持 `DEPLOY_ENABLED` 未启用，完成服务器、桶、CDN 和 Secret 配置；最后把 `DEPLOY_ENABLED` 设为 `true`，再手动触发一次 `Deploy` workflow。

## R2 / S3 与 CDN

1. 创建私有写入凭据，权限限制到目标桶的对象读写和列举。
2. 为桶绑定公开 HTTPS 域名，把该域名写入 `CDN_BASE_URL`。
3. 为前端正式站点配置 GET/HEAD CORS。示例见 [`deploy/cdn/cors.example.json`](../deploy/cdn/cors.example.json)，使用前替换域名。
4. 确认 CDN 不覆盖源站的 `Cache-Control`；release 目录允许长期缓存。
5. 在桶侧配置生命周期规则，例如保留最近 60 至 90 天的 `fablespace/releases/`。不要在发布 workflow 中立即删旧版本，以免仍打开的旧页面失去资源。

Workflow 会在同步后通过 `CDN_BASE_URL` 实际下载一个构建文件。桶写入成功但公开域名、CORS 或 CDN 回源未生效时，发布会在替换服务器前失败。

## 服务器首次准备

服务器需要 Git、Docker 和 Docker Compose。生产方案复用 ParallelLines 的 MySQL、Redis、R2 bucket 和 CDN，但分别使用 `fablespace` database、Redis DB `1` 和对象前缀 `fablespace/`。

先准备仓库和环境文件：

```bash
sudo git clone https://github.com/ixiaoyy/FableSpace.git /opt/fablespace
cd /opt/fablespace
sudo cp apps/api/.env.example apps/api/.env
sudo python3 deploy/server/configure_shared_services.py --dry-run
sudo python3 deploy/server/configure_shared_services.py
```

配置脚本从 `/opt/parallellines/apps/api/.env` 映射连接信息，写入前会生成 `apps/api/.env.pre-shared-<UTC>` 备份，输出不包含密码或 R2 Key。它同时把后端宿主绑定设为 `127.0.0.1:8950`，避免与 ParallelLines 的 `8000` 端口冲突；容器内 API 端口仍为 `8000`。部署 workflow 不创建或覆盖该环境文件。

在 ParallelLines MySQL 中创建独立库并给现有应用用户授权。实际容器名可用 `docker compose -p parallellines ps` 确认：

```bash
docker exec parallellines-db-1 sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS fablespace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON fablespace.* TO '\''$MYSQL_USER'\''@'\''%'\''; FLUSH PRIVILEGES"'
```

首次迁移前必须先为旧数据库做逻辑备份，再使用非破坏性迁移器执行 dry-run 和正式迁移。迁移器只建表并按主键 upsert，不删除目标行，并显式映射旧库 `tavern_id/tavern_name` 到当前 `space_id/space_name` 字段；实际执行时通过只读 volume 把 `apps/api/.env.pre-shared-*` 映射进临时 backend 容器，再用 `--source-env-file` 和 `--source-env-key FABLEMAP_DATABASE_URL` 读取源连接，避免把密码放进命令行或日志。

后端同时连接 Compose 默认网络与外部 `parallellines_default` 网络；前端仍只在 FableSpace 默认网络内访问 backend。若共享网络名称不同，设置 `FABLESPACE_SHARED_NETWORK`。启动命令必须包含共享覆盖文件：

```bash
sudo docker compose -f docker-compose.yml -f deploy/docker-compose.shared.yml up -d --build
```

## 回滚

推荐 revert 问题提交并推送 `main`。新提交会产生新的 release 目录并重新部署，旧 CDN 资源保持可用。若只在服务器手工切换镜像，仓库状态与后端版本可能不一致，不作为标准回滚流程。

## 本地验证 CDN base

PowerShell：

```powershell
$env:VITE_ASSET_BASE_URL = "https://cdn.example.com/releases/local-check"
npm --prefix .\apps\web run build
Select-String -Path .\apps\web\build\client\index.html -Pattern "cdn.example.com/releases/local-check"
Remove-Item Env:VITE_ASSET_BASE_URL
```

该变量只改变 Vite 构建资源地址，不改变 `/api`、`/generated` 或运行时上传数据的归属。
