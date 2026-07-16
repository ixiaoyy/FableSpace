# Frontend Public Assets

本目录只保留图片相关的文本 sidecar 和说明。图片二进制已迁移到对象存储，运行时使用 `https://img.pingxingxian.space/fablespace/media/v1/public/assets/...`。

## 目录约定

```text
fablespace/media/v1/public/assets/
├── npcs/public-welfare/<char_id>/<expression>.png
└── map-snapshots/<snapshot_id>/tile-*.png
```

## 规则

- 默认公益 NPC 使用 `https://img.pingxingxian.space/fablespace/media/v1/public/assets/npcs/public-welfare/<char_id>/<expression>.png`。
- 不要向本目录提交图片文件，也不要在代码里引用 `/assets/...`。
- 生成图必须先上传对象存储、登记 `deploy/cdn/media-manifest.json`，再更新 URL 引用。
- NPC 图片必须保留 prompt sidecar；完整规则见 [docs/IMAGE_ASSETS_SPEC.md](../../../docs/IMAGE_ASSETS_SPEC.md)。
