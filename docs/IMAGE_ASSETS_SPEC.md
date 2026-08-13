# 游戏美术资源规范

本规范覆盖当前 Web 像素游戏使用的 tileset、spritesheet、静态 UI 图像及以后单独批准的音频。核心目标是：正式二进制不进入 Git，代码只加载可追踪、不可变且允许当前用途的 CDN 对象。

## Storage and manifest

- 新游戏上游媒体基址为 `https://img.pingxingxian.space/game/media/v1`。前端默认把 `VITE_MEDIA_BASE_URL` 设为同源 `/game-media/v1`，由 Vite 或 Nginx 代理到该 HTTPS 基址，避免 Canvas/WebGL 依赖跨域响应头。
- 新游戏静态资源登记在 `deploy/cdn/game-media-manifest.json`。每项至少包含 `source`、`width`、`height`、`bytes`、`sha256`、`content_type`、`object_key` 和 `url`。
- 对象 key 一经发布不可覆盖。内容或处理方式变化时使用新的版本目录或文件名。
- 新增或替换的 PNG、JPG、WebP、GIF、AVIF、ICO、SVG、spritesheet、tileset 和音频二进制不进入 Git；现有文本型站点 favicon 不属于游戏素材，也不在首片清退范围。地图布局、frame/region 配置、来源记录和哈希可以作为文本提交。
- 旧 `deploy/cdn/media-manifest.json` 与 `fablespace/media/v1` 只属于待清退历史资产，不得混入新游戏 manifest，也不得在本任务中静默删除。

推荐对象 key：

```text
assets/vendor/<package>/<source-version>/<purpose>.<ext>
assets/original/<asset-version>/<purpose>.<ext>
```

## Ninja Adventure

- 首片只采用 Pixel-Boy 官方 `Ninja Adventure - Asset Pack`，正式来源为 `https://pixel-boy.itch.io/ninja-adventure-asset-pack`。
- 采用项必须来自官方 itch 包或作者官方 GitHub 仓库的固定提交；禁止引用浮动 `main`、镜像、二次打包和预览截图裁切。
- 授权记录为 CC0-1.0；第三方 CC0 素材不需要 prompt sidecar，但必须有文本来源记录。
- 来源记录至少保存作者、官方 URL、固定提交或归档日期、原始相对路径、原始/归档 SHA-256、裁切/合图/转码说明和最终对象映射。
- 不上传完整素材包；只发布当前切片实际加载的图集。

当前采用记录见 `docs/assets/ninja-adventure-2024-04-19.md`。

## Project-original and generated art

- Phaser Graphics 在运行时绘制的简单床、地毯、光影或 UI 图形属于代码生成的项目原创图形，不产生静态图片二进制；颜色、尺寸和用途应在代码常量中可审查。
- 人工绘制或 AI 生成并正式采用的静态图片仍须上传对象存储、登记新游戏 manifest，并记录制作或生成来源。
- AI 生成角色/精灵仍须保留 prompt sidecar；无法取得原 prompt 时使用 `reverse-engineered` 并明确说明。
- `.codex/generated_images`、临时目录、浏览器下载和聊天预览只算候选来源，不能被生产代码直接引用。

## Runtime loading

- 资源 URL 由 `apps/web/app/game/constants.ts` 集中生成；场景不得散落硬编码 CDN 地址。
- 男角色使用已登记的 `ninja_blue/sprite.png`；女角色采用同一固定提交的 `samurai_green/samurai_green.png`。两者都按 16×16 frame 加载，React 预览与 Phaser 必须引用同一 avatar 注册表中的不可变对象 URL。
- Phaser 加载前，上游资源必须可通过 HTTPS 读取。默认同源代理必须能完整回读对象；只有改为浏览器跨域直连时，才额外要求 CDN 返回 Canvas/WebGL 所需的 CORS 头。
- 使用像素素材时开启 nearest-neighbor/pixelArt；不得通过模糊缩放掩盖尺寸不匹配。
- 资源加载失败必须进入可重试状态，不得显示空白 canvas 或静默换成来源不明的占位图。

## Publication and verification

1. 在仓库外取得官方文件或制作候选资源。
2. 核对来源、授权、实际字节、尺寸、MIME 与 SHA-256。
3. 选择新游戏不可变对象 key；若远端已有同 key，必须先证明哈希相同，禁止覆盖不同内容。
4. 上传时设置正确 `Content-Type` 与 `Cache-Control: public,max-age=31536000,immutable`。
5. 更新 `game-media-manifest.json` 和来源记录，运行时基址只映射 manifest 对应对象。
6. 从 CDN 重新读取并核对 SHA-256 与缓存头；使用同源代理时再从代理路径回读，使用跨域直连时核对 CORS。
7. 确认 Git 跟踪图片二进制为零，再运行前端 build。

对象存储发布不需要数据库，也不得借发布资源连接数据库。游戏 PNG 只通过 `publish-game-media` 的精确 allowlist 发布；事件 payload 的对象 key、官方固定来源、MIME、bytes 与 SHA-256 必须全部匹配，最终仍须满足上述不可变、哈希和 CDN 回读合同。

## Delivery checklist

- [ ] 资源来自官方或可证明的原创来源，授权允许当前用途。
- [ ] 新游戏资源位于 `game/media/v1`，未复用旧 FableSpace 对象 key。
- [ ] manifest 的 URL、bytes、MIME 和 SHA-256 与 CDN 实际内容一致。
- [ ] 来源记录覆盖原始路径、固定版本和任何处理步骤。
- [ ] Phaser 场景只通过集中常量加载采用项。
- [ ] Git 跟踪图片二进制为零。
- [ ] 前端 typecheck、build 与浏览器资源加载验收使用本轮新鲜结果。
