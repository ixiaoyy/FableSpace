# 清退旧媒体与素材资源

## Goal

删除无引用旧图片、prompt sidecar、QA/参考素材和 CDN 清单项；对仍被持久数据引用的对象先迁移或备份。

## Requirements

- 以 `deploy/cdn/media-manifest.json` 为远端对象 key、字节数和 SHA-256 的唯一清退依据；不按目录前缀做模糊删除。
- 第一批只清退已完成全仓引用扫描、且不属于当前通用头像目录的旧 `npc-style-cast` 素材：
  - `space-npc-style-cast.png`；
  - `portraits/` 与 `portraits-hd/` 下的
    `alien-9-delta`、`alien-mu-mu`、`alien-pi-pi`、`alien-v17`、
    `cat-accountant-yinpiao`、`commission-chimao`、`commission-mozhan`、
    `commission-zhideng`、`mist-bartender-lanbo`、
    `neon-oracle-iris-zero`、`starport-boxing`、
    `terminal-repair-luotong`。
- 图片对象与对应 prompt sidecar 必须成对清退；删除前把原清单记录写入任务内的不可歧义删除台账。
- 远端删除前必须逐对象签名 HEAD，确认 25 个对象都存在且字节数与清单一致；删除后必须逐对象确认返回不存在。
- 媒体清单只描述当前应保留的远端对象。删除第一批 25 项后，同步修正条目数、总字节数和迁移条目数；删除历史保存在任务台账中，不把已删除对象继续留在部署校验输入里。
- 不删除当前仍由 `portraitCatalogConfig.ts` 使用的 12 个通用角色头像及 sidecar。
- 不删除 `public-welfare` 角色表情图及 sidecar；当前兼容层仍会把旧持久化路径映射到这批 CDN URL，必须由后续 Space 数据迁移先解除引用。
- 不删除地图、场景、身份选择、品牌和当前未提交的 Home 书架素材；这些资源分别由父任务的对应子任务核验。
- 不触碰当前工作区中与本任务无关的已修改或未跟踪文件。

## Acceptance Criteria

- [x] 25 个旧 CDN 对象已删除，删除前大小全部匹配，删除后签名 HEAD 全部确认不存在。
- [x] 25 个对应 prompt sidecar 已从仓库删除。
- [x] `deploy/cdn/media-manifest.json` 从 358 项、148522769 字节收敛为 333 项、139007917 字节，且头部统计与条目重新计算一致。
- [x] 任务删除台账完整保存 25 个原始清单记录、选择依据、删除前后核验结果和时间。
- [x] 排除删除台账、历史任务和 Git 历史后，全仓没有这 25 个对象 key、URL 或旧素材名的运行时/文档引用。
- [x] 仍在使用的通用头像与 `public-welfare` 资产数量不变。
- [x] Git 跟踪图片二进制数量仍为 0。
- [x] 前端生产构建通过，证明清退没有留下失效的构建期资源依赖。

## Notes

- 2026-07-23 清退前证据：精确引用扫描对第一批 25 个对象名返回 0 个活动引用；签名 HEAD 结果为 25/25 存在且大小匹配。
- 第一批释放 9,514,852 字节（约 9.07 MiB）远端对象数据，并删除 25 个只为这些图片保留的 sidecar。
- `public-welfare` 与通用头像不是“永久保留”，只是当前仍有真实消费路径，不能在其数据/页面迁移之前误删。
