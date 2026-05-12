# FableMap 图片资源规范 v1.2

## 概述

本文档定义 FableMap 项目所需的 AI 生成图片资源的规格、存放位置和命名规范。

---

## AI 生成图片落盘总规则

- 生成 NPC 图片资产必须遵守 Prompt-first：先用项目 skill 生成并记录最终 Prompt / Prompt manifest，再用该 Prompt 调用生图工具；不允许直接从未记录的临时描述调图。
- NPC 图片资产的 Prompt 必须保存在任务记录、prompt artifact、实现说明、最终报告、项目 recipe 或同目录 sidecar 中；只存在于 tool call 里的 Prompt 不算项目记忆。非 NPC 的页面切图、UI 参考图、模块插画、审计截图或用户提供/裁切替换素材不强制保存对应 Prompt，可按任务需要记录来源/处理方式。
- 图片质量与差异化是验收要求，不是锦上添花。素材图不能因为“安全、合规、有关空间”就算合格；若画面仍是千篇一律的暖木吧台、青色终端光、居中头像/门面、普通 anime concept art，应视为质量不足。
- 非同一系列的多张素材必须刻意区分视觉 thesis、构图装置、材质系统、色彩策略、光影哲学或媒介语境；批量素材生成前应有 diversity matrix 或等价说明。
- 任何用于代码、默认 seed、文档验收或前端展示的 AI 生成图片，必须复制/转换到本仓库内的规范路径后才算完成。
- `.codex/generated_images`、系统临时目录、浏览器下载目录和聊天预览只算生成来源，不算项目资源目录。
- 替换既有图片时，必须覆盖实际被代码/文档引用的项目文件；如果只是生成了新图但引用路径仍指向旧图，视为未替换。
- 允许保留废稿或参考图，但必须放入明确的项目资源/参考目录，或在交付说明里明确标记为“未采用/参考-only”。`artifacts/` 默认作为本地生成证据忽略；只有需要长期保留且经确认的参考资产才应强制加入版本库。
- 图片类任务完成前，要核对本轮 `.codex/generated_images` 输出与项目目标路径的对应关系；必要时用 hash、尺寸、修改时间或源→目标映射证明已落盘。
- 生成的 NPC 图片资产必须在同目录保留 prompt sidecar。单张 NPC 头像 / 立绘 / 精灵图推荐命名为 `<image-stem>.prompt.md`；NPC 同一角色的一组表情图可共用一个 `expression-set.prompt.md`，避免为 `neutral` / `joy` / `anger` / `embarrassment` / `curiosity` 重复保存几乎相同的 prompt。组级 sidecar 的 `## Final prompt` 只保留自然/neutral 单图 prompt；不要把五个表情 prompt 都写进去，以免生图工具生成五表情同框或表情表。已有最终 prompt / prompt manifest 时使用 `prompt_type: original-final`；找不到原始 prompt 时必须反向解析当前图片并使用 `prompt_type: reverse-engineered`，正文明确说明“不是原始生成 prompt”；仅作证据或非生成式参考的 NPC 图片可使用 `reference-only`。非 NPC 图片不因缺少 `<image-stem>.prompt.md` 判定为未完成。

### NPC Prompt sidecar 格式（仅 NPC 生成资产强制）

Sidecar 使用 Markdown + YAML frontmatter。单张 NPC 图片至少包含：

```markdown
---
asset: frontend/public/assets/npcs/public-welfare/char_pw_demo/neutral.png
prompt_type: original-final
source_type: prompt-manifest
source_manifest: frontend/public/assets/<task>/prompt-manifest.json
character_id: char_pw_demo
expression: neutral
width: 256
height: 256
sha256: <current image sha256>
updated_at: 2026-05-02
can_regenerate_higher_quality: true
---

## Final prompt

<最终正向 prompt；反推时写 reverse-engineered prompt，并声明不是原始 prompt。>

## Negative constraints

- No readable brand text / logo / watermark.
- No existing IP or living-artist imitation.
- No photorealistic human / real-person portrait / celebrity likeness / live-action cosplay / stock photo.
- No DSLR or camera-lens photography look, no hyperreal skin-pore rendering for NPC assets.
- No private data / API key / exact private address.

## Style recipe / Style DNA source

<Style DNA 来源、prompt manifest、人工反推依据或 reference-only 说明。>

## Identity locks

- <角色轮廓 / 主色 / 标志道具 / 表情组一致性约束>

## Provenance notes

<生成模型、脚本、历史 manifest、人工反推、或需要人工复核的说明。>
```

NPC 表情组推荐改用同目录一个 `expression-set.prompt.md`，至少包含：

```markdown
---
prompt_scope: npc-expression-set
asset_group: frontend/public/assets/npcs/public-welfare/char_pw_demo/
assets: frontend/public/assets/npcs/public-welfare/char_pw_demo/neutral.png; frontend/public/assets/npcs/public-welfare/char_pw_demo/joy.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: original-final
source_type: prompt-manifest
source_manifest: frontend/public/assets/<task>/prompt-manifest.json
character_id: char_pw_demo
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=<hash>; joy=<hash>; anger=<hash>; embarrassment=<hash>; curiosity=<hash>
updated_at: 2026-05-02
can_regenerate_higher_quality: true
---

## Final prompt

<自然/neutral 单图 prompt；必须明确“只生成一张自然表情头像”，并锁定 non-photoreal fictional NPC / 非真人照片化形象；不要在这里列出 joy / anger / embarrassment / curiosity 的生成 prompt。>

## Expression assets

- `neutral.png` — neutral
- `joy.png` — joy

## Negative constraints

...

## Style recipe / Style DNA source

...

## Identity locks

...

## Provenance notes

...
```

NPC 表情组的组级 sidecar 必须保留同一组 identity locks，并用 `expressions` / `## Expression assets` 覆盖每张表情图的路径、尺寸和 hash；`## Final prompt` 只放自然/neutral 单图 prompt。其它表情的差异可在 provenance 中说明“生成时逐张替换 expression suffix”，但不要把五段表情 prompt 放进 `## Final prompt`。目录级 `prompts.md` / `prompt-manifest.json` 只能作为额外索引，不能替代可校验的 `expression-set.prompt.md`。

---

## 图片分类

### 1. 角色头像（Character Portraits）

**用途**：在 TavernNpcStage / 角色展示区 / 未来聊天头部中展示当前对话角色的形象

**优先级**：🔴 高 — 直接提升聊天体验代入感

#### 规格

| 属性 | 值 |
|------|-----|
| 尺寸 | 256×256 px |
| 格式 | PNG |
| 风格 | 原创 anime / game-style tavern NPC portrait，半身或腰部以上；非真人、非照片、非写实真人感 |
| 背景 | 空间内景，不是透明背景，不是纯色占位 |

#### 非真人形象约束

- 角色头像必须是原创虚构 NPC 的非照片化插画形象；允许人形 / 类人角色，但只能是 anime / game-style / cartoon 风格，不得生成真人照片、写实人像、演员/模特/网红感、明星脸或真人 cosplay。
- NPC Prompt 正向约束必须包含等价语义：`stylized anime/game illustration`、`non-photoreal fictional NPC`、`original character`、`not a real person`、`no celebrity likeness`。
- NPC Prompt / sidecar 的 Negative constraints 必须包含等价语义：`no photorealistic human`、`no real-person portrait`、`no live-action cosplay`、`no stock photo`、`no celebrity likeness`、`no hyperreal skin pores`、`no DSLR/camera-lens look`。
- 生成结果如果看起来像真人照片、摄影棚人像、cosplay 照或可识别现实人物，不能进入 `frontend/public/...` / `frontend/app/assets/...` 等项目资源路径；必须先退回重生或改作明确废稿/参考图。

#### 角色原型清单

每个原型需要生成 2 张变体（共 12 张）：

| 原型 | 命名 | 描述 Prompt | 变体 A 描述 | 变体 B 描述 |
|------|------|------------|------------|------------|
| merchant（商人） | `merchant-a.png` / `merchant-b.png` | 狡黠的中年商人，戴着羽毛帽，披着毛皮披风，手里拿着天平或钱袋，表情机敏 | 微笑正面 | 皱眉侧面 |
| guardian（守卫） | `guardian-a.png` / `guardian-b.png` | 身披重甲的魁梧守卫，手持长剑或长戟，姿态威严 | 站立正视 | 持剑侧身 |
| healer（疗愈者） | `healer-a.png` / `healer-b.png` | 身着白袍的疗愈师，戴着兜帽，手持发光的草药或法杖，周身有柔和光晕 | 低眉垂目 | 张开双臂 |
| scholar（学者） | `scholar-a.png` / `scholar-b.png` | 戴着圆框眼镜的资深学者/书记员，披着深色斗篷，手持古籍或羽毛笔 | 沉思凝视 | 执笔书写 |
| wanderer（流浪者） | `wanderer-a.png` / `wanderer-b.png` | 神秘的流浪者，披着旧斗篷，背着行囊或旅包，像刚走进空间歇脚的长途旅人 | 阴影角落 | 半侧蒙面 |
| spirit（精灵） | `spirit-a.png` / `spirit-b.png` | 人形空间灵体 / 精灵招待员，半透明发光，仍明确处于空间内部 | 举杯微笑 | 聚集能量 |

#### 存放位置

```
frontend/app/assets/npc-style-cast/portraits/
├── merchant-a.png
├── merchant-b.png
├── guardian-a.png
├── guardian-b.png
├── healer-a.png
├── healer-b.png
├── scholar-a.png
├── scholar-b.png
├── wanderer-a.png
├── wanderer-b.png
├── spirit-a.png
└── spirit-b.png
```

#### 默认公益 NPC 专属素材

`AI 草稿` 示例角色「眯眯喵桑」属于已批准默认 demo seed，专属头像 / 表情素材作为公开 URL 按角色目录存放在：

```
frontend/public/assets/npcs/public-welfare/char_pw_mimi_nya/
├── neutral.png
├── joy.png
├── anger.png
├── embarrassment.png
└── curiosity.png
```

这些文件由 `backend/src/fablemap_api/core/default_taverns.py` 的默认角色 `avatar` / `sprites` 引用；它们不是通用 fallback，也不会被写回其他店主角色。

#### 加载逻辑

- canonical runtime 路径：`frontend/app/assets/npc-style-cast/portraits/`
- runtime copy 为优化后的 `256×256` PNG，供 `TavernNpcStage` 直接静态导入
- `TavernNpcStage` 在无 owner 图像时，根据角色文本 / tags / appearance preset / style 偏好解析 archetype
- 变体使用稳定哈希选择（避免每次渲染随机跳变）
- 优先级保持：`sprites.neutral` → `avatar` → `image_url` → project fallback portrait

---

### 2. 地点氛围图（Place Atmosphere）

**用途**：进入地点时显示的背景氛围图

**优先级**：🟡 中 — 提升地点进入的沉浸感

#### 规格

| 属性 | 值 |
|------|-----|
| 尺寸 | 512×288 px（16:9）|
| 格式 | WebP（优先）/ PNG |
| 风格 | Fantasy 风格的水彩或数字绘画，半鸟瞰视角，带有神秘氛围 |
| 内容 | 模糊的真实地点场景 + 幻想元素叠加 |

#### 地点氛围清单

按地点类型生成：

| fantasy_type | 命名 | 描述 Prompt |
|-------------|------|-----------|
| healing_sanctum | `atmosphere-healing.png` | A mystical healing sanctuary bathed in soft golden light, arcane symbols on the walls, warm and inviting atmosphere, fantasy watercolor style |
| supply_outpost | `atmosphere-supply.png` | A bustling supply outpost at dusk, lanterns glowing, crates stacked, merchant stalls, warm amber tones, cozy yet active atmosphere |
| judgement_tower | `atmosphere-judgement.png` | An imposing stone tower under stormy skies, ominous atmosphere, dramatic lighting, imposing columns, fantasy dark style |
| ember_parlor | `atmosphere-ember.png` | A warm cozy tavern interior, firelight dancing, wooden interior, steam rising from cups, inviting red and orange tones |
| lore_academy | `atmosphere-lore.png` | An ancient academy hall with towering bookshelves, floating candles, mystical inscriptions, scholarly and serene atmosphere |
| whispering_grove | `atmosphere-grove.png` | An enchanted forest grove at twilight, bioluminescent plants, ancient trees, magical particles floating, ethereal green and purple tones |
| spirit_anchor | `atmosphere-spirit.png` | A glowing spiritual nexus, energy swirling around ancient stones, blue and white ethereal light, mysterious and calming |
| forgotten_shrine | `atmosphere-shrine.png` | An overgrown abandoned shrine, nature reclaiming ancient stones, moss and vines, melancholic yet beautiful, muted green tones |
| market_hall | `atmosphere-market.png` | A grand indoor market hall, colorful stalls, bustling crowds, warm lighting, vibrant and lively atmosphere |
| transit_node | `atmosphere-transit.png` | A mysterious transit hub, glowing pathways, floating platforms, futuristic yet ancient, blue and silver tones |

#### 存放位置

```
frontend/public/place-atmosphere/
├── atmosphere-healing.png
├── atmosphere-supply.png
├── atmosphere-judgement.png
├── atmosphere-ember.png
├── atmosphere-lore.png
├── atmosphere-grove.png
├── atmosphere-spirit.png
├── atmosphere-shrine.png
├── atmosphere-market.png
└── atmosphere-transit.png
```

---

### 3. 势力徽章（Faction Emblems）

**用途**：势力关联展示时的徽章图标

**优先级**：🟢 低 — 可用 emoji 或 SVG 代替

#### 规格

| 属性 | 值 |
|------|-----|
| 尺寸 | 64×64 px |
| 格式 | SVG（优先）或 PNG |

#### 势力清单

| faction_id | 命名 | 描述 |
|-----------|------|------|
| trade_guild | `emblem-trade.svg` | 天平 + 麦穗，金色 |
| order_bureau | `emblem-order.svg` | 齿轮 + 羽毛笔，银色 |
| clinic_circle | `emblem-clinic.svg` | 十字 + 藤蔓，绿色 |
| memory_collective | `emblem-memory.svg` | 书本 + 烛火，蓝色 |
| night_bloom | `emblem-night.svg` | 月亮 + 花瓣，深紫色 |

#### 存放位置

```
frontend/public/faction-emblems/
├── emblem-trade.svg
├── emblem-order.svg
├── emblem-clinic.svg
├── emblem-memory.svg
└── emblem-night.svg
```

---

## 图片生成提示词模板

### Prompt-as-Code 结构化协议

图片生成先锁定用途和结构，再写风格。对于批量 NPC、表情组、发现页卡片、坐标纪念图、科普信息图等任务，优先使用结构化 envelope，然后再改写成自然语言 Prompt。

```json
{
  "schema_version": "fablemap.visual_prompt.v1",
  "type": "FableMap Visual Asset Prompt",
  "asset_use": "npc_portrait | npc_expression_sprite_set | tavern_entry_card | discovery_campaign_card | coordinate_map_card | owner_guide_infographic | visual_souvenir_prompt_preview | series_grid_or_contact_sheet | exploded_diagram_card | editorial_mood_poster",
  "renderer_profile": "single_image_prompt | batch_prompt_manifest | prompt_preview_only | future_api_payload",
  "real_coordinate_anchor": {
    "place_name_or_area": "",
    "privacy_level": "public_area_only | approximate | abstracted",
    "must_not_include": ["exact private address", "official map-provider imitation"]
  },
  "owner_confirmed_content": {
    "tavern_name": "",
    "tavern_theme": "",
    "npc_or_subject_role": "",
    "visitor_feeling": "",
    "must_keep": [],
    "must_avoid": []
  },
  "subject": {
    "description": "",
    "species_or_body_plan": "",
    "identity_locks": ["silhouette", "main palette", "signature prop"],
    "allowed_variations": ["expression", "gesture", "local accent light"]
  },
  "style_dna": {
    "art_style_and_genre": "",
    "palette_color_science": "",
    "lighting_signature": "",
    "medium_texture": "",
    "mood": "",
    "era_context": "",
    "detail_density": "",
    "post_processing": "",
    "symbolic_motifs": []
  },
  "quality_diversity": {
    "visual_thesis": "",
    "must_differ_from_recent_assets": ["composition", "palette", "material system", "lighting", "style family"],
    "anti_repetition_notes": ["avoid repeating the same warm wood bar + teal glow formula unless intentional"],
    "rejection_criteria": ["generic AI concept art", "same decor as previous batch", "weak focal hierarchy"]
  },
  "composition": {
    "aspect_ratio": "",
    "layout": "",
    "shot_type_angle": "",
    "spatial_logic": "",
    "module_budget": "",
    "mobile_crop_safe_area": ""
  },
  "text_policy": {
    "mode": "none | owner_exact | simulated",
    "allowed_text": [],
    "forbidden_text": ["logos", "fake brand slogans", "visitor-private data"]
  },
  "constraints": ["original asset only", "non-photoreal fictional NPC for NPC assets", "not a real person", "no photorealistic human", "no real-person portrait", "no celebrity likeness", "no live-action cosplay", "no existing IP", "no living-artist imitation", "no watermark"],
  "extension_modules": []
}
```

使用规则：

- `asset_use` 决定模板，不要把头像、海报、地图、信息图混成一个泛 prompt。
- `composition` 必须先于风格确定，尤其是网格、系列图、信息图和移动端竖图。
- `text_policy` 必须明确：头像默认 `none`；店主明确给出的招牌/标题才用 `owner_exact`；装饰性出版物纹理用 `simulated`。
- 坐标/地图类素材只能做 `coordinate-inspired` 或 `abstracted` 表达，不替代真实地图，不生成私密精确地址。
- 外部参考项目可用于学习结构化技巧；不要复制第三方图片、品牌、角色、案例文本或未授权 Logo。
- 未来新能力优先作为 versioned extension module 增加，例如 `diagram.callouts.v1`、`series.identity-locks.v1`、`map.coordinate-memory.v1`，不要破坏基础 envelope。

### 可扩展能力注册表

| 能力模块 | 适用资产 | 作用 | 自动检查方向 |
| --- | --- | --- | --- |
| `layout_module` | 全部 | 锁定比例、网格、层级、安全裁切区 | aspect ratio、移动端裁切说明 |
| `text_module` | 海报/卡片/信息图 | 限定 none / owner_exact / simulated | 禁止未授权 Logo、假品牌、访客隐私 |
| `identity_module` | NPC / 表情组 / 批量角色 | 固定物种体态、轮廓、主色、标志道具 | 表情变体不换脸/换装 |
| `style_dna_module` | 全部 | 复用风格 DNA，避免短关键词 | 是否覆盖色彩、光影、材质、情绪 |
| `quality_diversity_module` | 全部 | 防止默认 AI 图和同质化装修/光影/构图 | 是否有视觉 thesis、差异点、拒收条件 |
| `diagram_module` | 拆解图 / 科普图 | 控制 callout、箭头、编号、部件层级 | callout 数量和文字长度 |
| `series_module` | 宫格 / contact sheet | 控制面板数量、行列语义、一致性 | panel count、allowed variations |
| `anchor_module` | 地图/坐标/入口卡 | 维持真实坐标锚点但不伪装导航 | 禁止精确私址和地图供应商仿制 |

### 风格 DNA 抽取/选择模板（生成前置）

生成 NPC 图片资产前，必须先从参考图、用户风格说明或 `.agents/skills/generate-character-prompt/references/style-recipes.md` 中确定一段可复用 Style DNA。生成非 NPC 可交付图时推荐沿用这套方法，但不强制保存同目录 prompt sidecar。不要只写“朋克 / 二次元 / 复古”这类短标签。

```
[在此处替换为您想要生成的主体内容 / Replace with your subject here]，以可被店主确认的原创 FableMap 素材身份呈现；整体采用 [具体艺术流派/混合风格及品位分支]，主色为 [主色]，辅以 [辅色] 与 [点缀色]，形成 [冷暖/互补/类似色/限色印刷] 的色彩科学策略。光影为 [方向与光质]，明暗对比 [强/弱/平面化]，阴影 [硬边/柔边/装饰性]。画面借鉴 [媒介纹理技法，如 Risograph 半调、胶片颗粒、水彩晕染、赛璐璐平涂、复印机碳粉]，但不强制生成完整海报/杂志/出版物载体；线稿 [粗细/硬边/流动感]，材质触感 [纸张、油墨、金属、玻璃、织物等]。情绪是 [精准情绪：是……而非……]，带有 [时代/文化圈层] 的品位语境；信息密度 [高/中/低]，在 [细节区类型] 保持高精度，在 [概括区类型] 使用平涂、留白或抽象纹理。保留 [符号化视觉语言类型] 作为风格签名。original, no readable text unless explicitly required, no logo, no watermark, no existing IP, no living-artist imitation.
```

### 可选构图骨架模块

可拼接在 Style DNA 后，也可按用途替换。构图模块只描述空间结构，不写具体故事内容。

```
Composition module: [composition technique: centered / rule of thirds / diagonal tension / asymmetrical balance / frame within frame / large negative space], [shot type and angle: bust / waist-up / medium shot / wide shot, eye-level / low angle / high angle], [spatial logic: flattened layers / one-point perspective / two-point perspective / compressed depth / collage windows / axonometric space]. Foreground acts as visual framing and depth cue, midground carries the main subject, background supplies atmosphere, rhythm, texture and color blocks without stealing focus.
```

### 角色头像通用模板

```
A finished original non-photoreal anime / game-style FableMap cyber-tavern NPC portrait of [species/body plan + role + maturity range + stable silhouette + signature tavern prop],
stylized fictional character art, not a real person or photo,
visibly anchored inside a real-place tavern interior with at least two cues
(bar counter, mugs, shelves, lanterns, menu board, bottles, map-table, door signage, cyber terminal glow),
[paste or summarize Style DNA here: art style, palette, lighting, medium texture, mood, era, post-processing],
[paste optional Composition module here: bust or waist-up portrait preferred unless usage requires otherwise],
identity-consistent character design, readable expression and body language, owner-reviewable draft only,
no transparent background, no blank placeholder, no readable text, no logo, no watermark, no existing IP, no living-artist imitation, no photorealistic human, no real-person portrait, no celebrity likeness, no live-action cosplay, no stock photo, no hyperreal skin pores, no DSLR/camera-lens look, no owner API keys or visitor-private data
```

### 地点氛围图通用模板

```
[real place or coordinate-inspired tavern atmosphere description, abstracted enough to avoid copying private/business marks],
[paste or summarize Style DNA here: art style, palette, lighting, medium texture, mood, era, post-processing],
[viewing angle: slightly elevated bird's-eye / eye-level / low-angle entry view],
[composition: centered / rule of thirds / diagonal pathway / large negative space],
visible tavern-entry or interior cues that support FableMap's real-coordinate anchor,
[atmosphere keywords: welcoming / mysterious / quiet / lively / memory-rich],
no readable brand signage, no private address details, no logo, no watermark, no existing IP
```

---

## 实现检查清单

### 角色头像
- [ ] 生成 12 张角色头像 PNG（256×256）
- [ ] 存入 `frontend/app/assets/npc-style-cast/portraits/`
- [ ] 验证文件名和命名规范
- [ ] `TavernNpcStage` 在无 owner 图像时加载并显示头像

### 地点氛围图
- [ ] 生成 10 张地点氛围图（512×288）
- [ ] 存入 `frontend/public/place-atmosphere/`
- [ ] 验证文件名和命名规范
- [ ] 前端在进入地点时显示氛围图

### 势力徽章
- [ ] 可选：SVG 势力徽章
- [ ] 或使用 emoji 替代（简单方案）
