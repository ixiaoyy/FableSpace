# FableMap 图片资源规范

本文档约束 AI 生成图片、用户提供图片、页面切图和运行时资源的落盘方式。核心目标：**代码引用的图片必须在仓库内、来源可追踪、NPC 生成图有 prompt sidecar**。

## 总规则

- 任何被代码、seed、文档验收或前端展示引用的图片，必须复制或转换到仓库内规范路径。
- `.codex/generated_images`、系统临时目录、浏览器下载目录和聊天预览只算生成来源，不算项目资源。
- 替换既有图片时，必须覆盖实际被代码或文档引用的文件；只生成新图但路径仍指旧图，视为未替换。
- 废稿或参考图必须放在明确的参考目录，或在交付说明中标记为“未采用 / reference-only”。
- 图片任务交付前要用路径、尺寸、hash、修改时间或源 -> 目标映射证明资源已落盘。
- 店主 API Key、访客私密信息、精确私人地址不得出现在图片或 prompt 中。

## 资源路径

| 位置 | 用途 |
|------|------|
| `frontend/public/assets/` | 需要稳定 public URL 的运行时资源，例如默认 NPC seed、地图快照。 |
| `frontend/app/assets/` | 由 React / Vite import 的前端资产。 |
| `frontend/public/place-atmosphere/` | 地点氛围图。 |
| `frontend/public/faction-emblems/` | 势力 / 分类徽章。 |
| `artifacts/assets/<YYYY-MM-DD-task>/` | 草稿、contact sheet、审计截图、参考素材。 |

不要把运行时资源只放在 `artifacts/`、`.codex/` 或临时目录。

## NPC prompt sidecar

NPC 头像、立绘、精灵图和表情组必须保留同目录 prompt sidecar。

单张图片推荐：

```text
<image-stem>.prompt.md
```

同一角色表情组推荐：

```text
expression-set.prompt.md
```

非 NPC 的页面切图、UI 参考图、模块插画、审计截图或用户裁切素材，不强制同目录 sidecar；如需记录来源，可写任务记录、manifest 或 README。

### 单图 sidecar 最小格式

```markdown
---
asset: frontend/public/assets/npcs/public-welfare/char_demo/neutral.png
prompt_type: original-final
source_type: prompt-manifest
source_manifest: artifacts/assets/2026-01-01-demo/prompt-manifest.json
character_id: char_demo
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

- 组内每张图片路径。
- expression 名称。
- 尺寸。
- SHA-256。
- prompt 类型：`original-final` / `reverse-engineered` / `reference-only`。
- 风格来源与 identity locks。

`## Final prompt` 只保留自然 / neutral 单图 prompt，不要把五个表情 prompt 全写进去，避免生图工具生成“五表情同框”。

找不到原始最终 prompt 时，使用 `prompt_type: reverse-engineered`，并明确标注“不是原始生成 prompt”。

## NPC 图片约束

NPC 资产必须是原创虚构角色插画，不得像真人照片。

正向 prompt 应包含等价语义：

- stylized anime / game illustration
- non-photoreal fictional NPC
- original character
- not a real person
- no celebrity likeness

负向约束必须包含等价语义：

- no photorealistic human
- no real-person portrait
- no live-action cosplay
- no stock photo
- no celebrity likeness
- no DSLR / camera-lens look

如果结果像摄影棚人像、cosplay 照、明星脸或现实人物，不得进入 `frontend/public/...` 或 `frontend/app/assets/...`，必须重生或标记为废稿。

## 图片规格

| 类型 | 推荐尺寸 | 推荐格式 | 位置 |
|------|----------|----------|------|
| NPC fallback 头像 | 256x256 | PNG | `frontend/app/assets/npc-style-cast/portraits/` |
| 默认公益 NPC 表情 | 256x256 | PNG | `frontend/public/assets/npcs/public-welfare/<char_id>/` |
| 地点氛围图 | 512x288 | WebP / PNG | `frontend/public/place-atmosphere/` |
| 势力徽章 | 64x64 | SVG / PNG | `frontend/public/faction-emblems/` |
| 前端页面 import 图 | 按 UI 槽位 | PNG / WebP / SVG | `frontend/app/assets/<feature>/` |
| 审计 / 参考图 | 原始尺寸 | PNG / WebP | `artifacts/assets/<task>/` |

## 质量要求

- 批量素材不能同质化；非同系列图片应区分构图、材质、色彩、光影或视觉 thesis。
- 不接受只有“安全、合规、相关”但画面普通的默认 AI 图。
- 不要重复暖木吧台、青色终端光、居中头像等单一套路，除非任务明确要求统一系列。
- 页面切图必须区分静态背景和动态 DOM 文本；动态文字、数字、用户信息不要烘焙进整页截图。

## 生成前提示词框架

生成 NPC 或关键运行时资产前，先明确：

```text
用途：
目标路径：
尺寸 / 比例：
主体：
真实坐标或空间锚点：
风格 DNA：
构图：
必须保留：
必须避免：
text policy: none / owner_exact / simulated
negative constraints:
```

坐标 / 地图类素材只能做 coordinate-inspired 或 abstracted 表达，不得伪装真实导航截图，不得暴露精确私人地址。

## 交付检查清单

- [ ] 目标图片已进入仓库规范路径。
- [ ] 代码或文档引用已更新到新路径。
- [ ] NPC 生成图已有同目录 prompt sidecar。
- [ ] Sidecar 中尺寸、hash、expression、prompt_type 与当前文件一致。
- [ ] 非 NPC 参考图已记录来源或处理方式。
- [ ] 已核对 `.codex/generated_images` 本轮产物，未采用的图已标记或不作为交付。
- [ ] 如前端会加载资源，已运行 `npm --prefix .\frontend run build` 或说明未运行原因。
