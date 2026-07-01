# Frontend App Assets

`frontend/app/assets/` 放 Vite import 的前端运行时资产；需要被后端 seed、数据库 payload 或公开 URL 引用的资源放 `frontend/public/assets/`。

## 目录约定

```text
frontend/app/assets/
├── fable-space-05-10/      # 首页 / 发现页运行时切图与参考资产
├── npc-style-cast/       # SpaceNpcStage fallback NPC 头像
└── <feature>/            # 新功能自己的 import 资产
```

## 规则

- `fable-space-05-10/` 只保留运行时会 import 的素材和必要 reference；不要恢复整页 screenshot 切片作为动态内容。
- `npc-style-cast/portraits/` 是默认 NPC fallback 头像目录，运行时图片应保持 256x256 PNG，优先被 owner 自定义 `sprites.neutral` / `avatar` / `image_url` 覆盖。
- 原始草图、对比截图、contact sheet、审计图优先放 `artifacts/assets/<YYYY-MM-DD-task>/` 或 Trellis evidence，不要散落在运行时目录。
- 与图片资产有关的 prompt sidecar、hash 和落盘规则见 [docs/IMAGE_ASSETS_SPEC.md](../../../docs/IMAGE_ASSETS_SPEC.md)。

## 禁止

- 不要把 `.codex/generated_images`、下载目录或聊天预览当作项目资源。
- 不要新增 loose `main.png`、`right-rail.png`、`sidebar.png`、`home-slices/` 这类不清晰切片目录。
- 不要使用 copyrighted IP、未授权 logo、真人肖像或 living-artist imitation。
