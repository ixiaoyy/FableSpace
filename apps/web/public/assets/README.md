# Frontend Public Assets

`apps/web/public/assets/` 放需要稳定公开 URL 的运行时资源，例如默认 NPC seed、地图快照和后端 payload 中引用的图片。

## 目录约定

```text
apps/web/public/assets/
├── npcs/public-welfare/<char_id>/<expression>.png
└── map-snapshots/<snapshot_id>/tile-*.png
```

## 规则

- Public URL 必须以 `/assets/...` 开头。
- 默认公益 NPC 使用 `/assets/npcs/public-welfare/<char_id>/<expression>.png`。
- 需要前端 import 的素材放 `apps/web/app/assets/`，不要混入 public runtime URL 目录。
- 生成图必须先落到项目资源目录并更新引用；临时目录、`.codex/generated_images` 和聊天预览不算交付。
- NPC 图片必须保留同目录 prompt sidecar；完整规则见 [docs/IMAGE_ASSETS_SPEC.md](../../../docs/IMAGE_ASSETS_SPEC.md)。
