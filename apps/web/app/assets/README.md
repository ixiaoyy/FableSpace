# Frontend App Assets

本目录只保留历史逻辑目录下的图片说明和文本 sidecar。前端图片二进制已迁移到对象存储，代码不再使用 Vite 图片 import。

## 目录约定

```text
fablespace/media/v1/app/assets/
├── fable-space-05-10/      # 首页 / 发现页运行时切图与参考资产
├── npc-style-cast/       # SpaceNpcStage fallback NPC 头像
└── <feature>/            # 新功能自己的 import 资产
```

## 规则

- `app/assets/fable-space-05-10/` 对应页面、品牌和参考媒体对象。
- `app/assets/npc-style-cast/portraits/` 对应 256x256 PNG fallback 头像，优先被 owner 自定义 `sprites.neutral` / `avatar` / `image_url` 覆盖。
- 新图片必须上传对象存储并进入 `deploy/cdn/media-manifest.json`；代码使用 HTTPS URL 或 `mediaAssetUrl()`。
- prompt sidecar、hash 和上传规则见 [docs/IMAGE_ASSETS_SPEC.md](../../../docs/IMAGE_ASSETS_SPEC.md)。

## 禁止

- 不要向 Git 提交图片二进制，也不要把 `.codex/generated_images`、下载目录或聊天预览当作正式资源。
- 不要新增 loose `main.png`、`right-rail.png`、`sidebar.png`、`home-slices/` 这类不清晰切片目录。
- 不要使用 copyrighted IP、未授权 logo、真人肖像或 living-artist imitation。
