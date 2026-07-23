# Technical Design

## Scope boundary

本批清退以精确 allowlist 为边界，不做目录级删除。候选条目必须同时满足：

1. 位于 `app/assets/npc-style-cast/`；
2. 是 PRD 明列的 25 个 object key；
3. 当前媒体清单存在唯一记录；
4. 对应 sidecar 唯一存在；
5. 排除清单、sidecar、任务记录、构建产物与 Git 历史后，全仓无消费引用；
6. 远端对象大小与清单一致。

任一条件不满足，该条目退出本批，不能扩大或猜测删除范围。

## Source of truth and audit trail

- `deploy/cdn/media-manifest.json`：保留对象的部署与远端校验清单。
- `retired-media.json`：本批被清退对象的不可歧义台账，完整保存原条目的
  `source`、`object_key`、`url`、`bytes`、`sha256`、`content_type` 和
  `disposition`，并记录批次统计及远端核验结果。
- Git 历史：保存被删除 prompt sidecar 的原始内容。

清退后不把删除条目继续留在媒体清单，因为部署校验器会把清单中的每一项解释为“远端必须存在”。

## Remote deletion

使用 `apps/api/.env` 中现有 S3-compatible 配置，并在执行前验证：

- endpoint 使用 HTTPS；
- bucket、endpoint、access key 和 secret 均已配置；
- `FABLESPACE_CDN_BASE_URL/FABLESPACE_S3_PREFIX/media/v1`
  与媒体清单的 `media_base_url` 完全相等。

对象远端 key 只能按以下公式产生：

```text
<FABLESPACE_S3_PREFIX>/media/v1/<manifest.object_key>
```

执行顺序：

1. 签名 HEAD 所有精确 key，核对 `Content-Length`；
2. 对同一精确 key 发出签名 DELETE；
3. 再次签名 HEAD，只有 404 才视为删除完成；
4. 把聚合结果写入删除台账，不记录凭据、bucket 或 endpoint。

不使用 `sync --delete`、通配符或目录递归删除。

## Repository retirement

远端删除确认后：

1. 删除 25 个对应 `.prompt.md`；
2. 从媒体清单移除 25 个条目；
3. 重新按剩余条目计算：
   - `tracked_image_count = 333`
   - `tracked_image_bytes = 139007917`
   - `migrate_count = 333`
   - `delete_count = 0`
4. 保持条目原有顺序和其余字段不变。

`delete_count` 仍为 0，因为它统计当前清单内 `disposition=delete` 的条目；
本批历史删除数由 `retired-media.json` 记录。

## Protected assets

- `guardian-*`、`healer-*`、`merchant-*`、`scholar-*`、`spirit-*`、
  `wanderer-*`：仍由通用头像 catalog 使用。
- `public/npcs/public-welfare/**`：仍由旧持久化 URL 兼容映射使用。
- 地图、场景、身份、品牌、QA 与 Home 书架：不在本批 allowlist。

## Verification

- 校验删除台账与清单的集合互斥、统计正确、SHA-256 格式正确。
- 精确扫描候选 stem、object key 和 URL，确认活动树无残留引用。
- 签名 HEAD 确认 25 个远端 key 全部为 404。
- `git ls-files` 确认图片二进制数量为 0。
- 运行 `npm --prefix .\apps\web run build`。
- 运行 `git diff --check`，并核对未触碰保护文件。
