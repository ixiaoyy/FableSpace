# FableSpace 图片资源规范

本文档约束 AI 生成图片、用户提供图片、页面切图和运行时图片。核心目标：**图片二进制只存放在对象存储，代码、seed 和文档使用 HTTPS URL，来源与哈希由清单追踪**。

## 存储与引用

- 正式媒体基址固定为 `https://img.pingxingxian.space/fablespace/media/v1`；部署可通过 `VITE_MEDIA_BASE_URL` / `FABLESPACE_MEDIA_BASE_URL` 指向同结构的其他环境。
- 项目代码不得 import 图片文件，也不得引用 `/assets/...`、`apps/web/...png` 等仓库路径；统一使用完整 HTTPS URL 或 `mediaAssetUrl()`。
- Git 不保存 PNG、JPG、WebP、GIF、AVIF、ICO、SVG 等图片二进制。`deploy/cdn/media-manifest.json` 保存对象 key、URL、字节数、SHA-256 和 MIME 类型。
- `.codex/generated_images`、系统临时目录、浏览器下载目录和聊天预览只算生成来源。被采用的图片必须先上传对象存储并进入清单；未采用的图片只标记为参考稿，不得被项目引用。
- 替换图片时必须上传新对象并更新实际代码 URL 与清单；只生成或上传但仍引用旧 URL，视为未替换。
- URL key 一经发布按不可变资源处理。内容变化时使用新 key，禁止原 key 覆盖后依赖清 CDN 缓存。
- 店主 API Key、访客私密信息、精确私人地址不得出现在图片或 prompt 中。

## 对象 key 约定

现有媒体沿用迁移前的逻辑目录，统一放在 `fablespace/media/v1/` 下：

| 对象 key 前缀 | 用途 |
|---|---|
| `app/assets/<feature>/` | React 页面、品牌和 UI 图片 |
| `app/product/assets/<feature>/` | 产品兼容模块图片 |
| `public/assets/npcs/...` | NPC seed、表情和运行时公共图片 |
| `public/place-atmosphere/` | 地点氛围图 |
| `public/faction-emblems/` | 势力或分类徽章 |

示例：

```text
https://img.pingxingxian.space/fablespace/media/v1/public/assets/npcs/public-welfare/char_example/neutral.png
```

## 上传与验证

1. 在仓库外准备候选图片，确认尺寸、格式和内容合规。
2. 选择未被占用的对象 key，上传时设置 `Cache-Control: public,max-age=31536000,immutable` 和正确 `Content-Type`。
3. 在 `deploy/cdn/media-manifest.json` 登记 URL、字节数和 SHA-256。
4. 通过 CDN URL 读取文件，核对状态码、内容与清单记录；只有像素读取或 Canvas 导出等场景才要求 CORS。
5. 更新代码、seed、sidecar 或文档引用；提交前确认 Git 跟踪图片数为零。

部署校验脚本位于 `deploy/cdn/`。部署会逐项比较清单与桶内对象的 key 和字节数，并通过 CDN 实际读取抽样资源。

## NPC prompt sidecar

NPC 头像、立绘、精灵图和表情组必须保留 prompt sidecar。Sidecar 是文本文件，可以留在仓库；其中 `asset` 和组内图片清单必须写对象存储 URL，不写本地图片路径。

单张图片推荐：

```text
<image-stem>.prompt.md
```

同一角色表情组推荐：

```text
expression-set.prompt.md
```

非 NPC 的页面切图、UI 参考图、模块插画或审计截图不强制 sidecar；来源可写任务记录、manifest 或 README。

### 单图 sidecar 最小格式

```markdown
---
asset: https://img.pingxingxian.space/fablespace/media/v1/public/assets/npcs/public-welfare/char_example/neutral.png
prompt_type: original-final
source_type: prompt-manifest
source_manifest: docs/assets/2026-01-01-character-media/prompt-manifest.json
character_id: char_example
expression: neutral
width: 256
height: 256
sha256: <current image sha256>
updated_at: 2026-01-01
---

## Final prompt

<最终正向 prompt；反推时必须说明不是原始生成 prompt。>

## Negative constraints

- No readable brand text / logo / watermark.
- No existing IP or living-artist imitation.
- No photorealistic human / real-person portrait / celebrity likeness / live-action cosplay / stock photo.
- No private data / API key / exact private address.

## Style recipe / source

<风格来源、prompt manifest、人工反推依据或 reference-only 说明。>

## Identity locks

- <角色轮廓 / 主色 / 标志道具 / 表情组一致性约束>

## Provenance notes

<生成模型、脚本、人工处理或需复核说明。>
```

### 表情组 sidecar 规则

`expression-set.prompt.md` 必须覆盖：

- 组内每张图片 URL、expression、尺寸和 SHA-256。
- prompt 类型：`original-final` / `reverse-engineered` / `reference-only`。
- 风格来源与 identity locks。

`## Final prompt` 只保留自然 / neutral 单图 prompt，不要把五个表情 prompt 全写进去，避免生图工具生成“五表情同框”。找不到原始最终 prompt 时使用 `prompt_type: reverse-engineered`，并明确标注“不是原始生成 prompt”。

## NPC 图片约束

NPC 资产必须是原创虚构角色插画，不得像真人照片。正向 prompt 应包含 stylized anime/game illustration、non-photoreal fictional NPC、original character、not a real person、no celebrity likeness 等价语义；负向约束必须排除 photorealistic human、real-person portrait、live-action cosplay、stock photo、celebrity likeness 和 DSLR/camera-lens look。

如果结果像摄影棚人像、cosplay 照、明星脸或现实人物，不得上传到正式媒体命名空间，必须重生或标记为废稿。

## 质量要求

- 批量素材不能同质化；非同系列图片应区分构图、材质、色彩、光影或视觉 thesis。
- 不接受只有“安全、合规、相关”但画面普通的默认 AI 图。
- 页面图片必须区分静态背景和动态 DOM 文本；动态文字、数字、用户信息不要烘焙进整页截图。
- 坐标或地图类素材只能做 coordinate-inspired 或 abstracted 表达，不得伪装真实导航截图，不得暴露精确私人地址。

## 交付检查清单

- [ ] 图片已上传到 `fablespace/media/v1/` 的不可变对象 key。
- [ ] 清单中的 URL、字节数、SHA-256 和 MIME 类型与对象一致。
- [ ] 代码、seed、文档和 sidecar 已改为 HTTPS URL。
- [ ] NPC 生成图已有 prompt sidecar，且清单覆盖 expression、尺寸、hash 和 prompt_type。
- [ ] 已通过 CDN URL 做真实读取验证。
- [ ] 已核对 `.codex/generated_images` 本轮产物，未采用的图不作为交付。
- [ ] Git 跟踪图片数为零。
- [ ] 如前端会加载资源，已运行 `npm --prefix .\apps\web run build`。
