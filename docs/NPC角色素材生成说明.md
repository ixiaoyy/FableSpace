# NPC 角色素材生成说明

> 本文档定义创建一个完整 NPC 角色所需的全部素材：文字字段 + 图片资源。

---

## 一、文字素材

### 1.1 必填字段

| 字段 | 类型 | 说明 | 字数参考 |
|------|------|------|---------|
| `name` | string | 角色名称 | 2-5 字 |
| `description` | string | 简短描述，在列表中展示 | 30-100 字 |
| `personality` | string | 性格、行为风格 | 50-150 字 |
| `scenario` | string | 角色所处场景设定 | 50-150 字 |
| `system_prompt` | string | AI 系统提示词，决定对话风格和边界 | 150-400 字 |
| `first_mes` | string | 首次打招呼的台词 | 30-100 字 |
| `mes_example` | string | 示例对话，格式参考 SillyTavern | 50-200 字 |
| `tags` | string[] | 标签数组，用于搜索和分类 | 3-8 个 |
| `talkativeness` | float | 健谈程度，0=沉默，1=话痨 | 0-1 |
| `alternate_greetings` | string[] | 备用打招呼（可选） | 1-3 条 |

### 1.2 字段说明

#### `system_prompt` 规范

```
你是 [角色身份/名字]，[年龄/状态]，[职业/角色定位]。[核心职责或互动目标]。
[语气/风格要求]。[禁止事项]。[互动引导方式]。
```

**示例：**
```
你是《放学后英雄补给站》的店主阿衡。你的职责是把访客的旧英雄梦落到具体物件上：英雄卡、旧道具、贴纸、模型零件和一次普通人的小勇气。当访客提到英雄名、童年、尴尬、长大、旧玩具或模型时，温和接住，不嘲笑、不鸡血。不要引入战斗、等级、装备、排行榜、现实危险行动或心理治疗承诺。回复尽量包含一个可做的小选择，像店主在柜台边慢慢修东西。
```

#### `mes_example` 格式

```html
<START>
{{user}}: [用户说的第一句话]
{{char}}: [角色的回应]
```

### 1.3 标签推荐

公益/情感类：
```
公益、英雄梦、旧玩具店、模型店、普通人小英雄、治愈、童年回声、纸剑、旧英雄卡
```

赛博朋克类：
```
调酒师、雾雨、温柔、旧地图、成年人、委托板、行动派、城市任务、赛博朋克
```

---

## 二、图片素材

### 2.1 规格总览

| 类型 | 尺寸 | 格式 | 数量 |
|------|------|------|------|
| 头像 (avatar) | 256×256 px | PNG | 1 张 |
| 表情立绘 (sprites) | 256×256 px | PNG | 5 张 |
| **总计** | - | - | **6 张** |

### 2.2 情绪状态清单

| 状态 | 英文名 | 用途 |
|------|--------|------|
| 中立 | `neutral` | 默认站立表情 |
| 开心 | `joy` | 正面情绪、笑 |
| 生气 | `anger` | 负面情绪、皱眉 |
| 尴尬 | `embarrassment` | 害羞、脸红 |
| 好奇 | `curiosity` | 疑问、歪头 |

### 2.3 命名规范

```
char_[slug]-[state].png
```

| 字段 | 说明 | 示例 |
|------|------|------|
| `slug` | 角色英文缩写（短横线分隔） | `mist-bartender-lanbo` |
| `state` | 情绪状态 | `neutral`, `joy`, `anger`, `embarrassment`, `curiosity` |

**示例文件名：**
```
char_mist-bartender-lanbo-neutral.png
char_mist-bartender-lanbo-joy.png
char_mist-bartender-lanbo-anger.png
char_mist-bartender-lanbo-embarrassment.png
char_mist-bartender-lanbo-curiosity.png
char_mist-bartender-lanbo-avatar.png      ← 头像（可不单独命名，用 neutral 代替）
```

### 2.4 存放位置

```
frontend/public/assets/npcs/
├── char_mist-bartender-lanbo-neutral.png
├── char_mist-bartender-lanbo-joy.png
├── char_mist-bartender-lanbo-anger.png
├── char_mist-bartender-lanbo-embarrassment.png
├── char_mist-bartender-lanbo-curiosity.png
└── ...其他角色
```

---

## 三、AI 图片生成提示词

### 3.1 角色头像通用模板

```
A finished original anime / game-style tavern NPC portrait of [角色描述],
clean lineart with soft cel shading,
[灯光: warm amber tavern light / neon glow / dramatic candlelight],
waist-up or bust framing,
visible tavern interior background with at least two cues
(bar counter, mugs, shelves, lanterns, menu board, bottles, map-table, terminal glow),
no transparent background, no logo, no watermark, no existing IP,
[intentional imperfections, hand-crafted feel]
```

### 3.2 各情绪状态提示词

#### Neutral（中立）
```
A finished original anime / game-style tavern NPC portrait,
[角色外貌描述],
neutral calm expression, standing pose,
clean lineart with soft cel shading,
[灯光],
waist-up framing,
tavern interior background with [场景元素],
no transparent background, no logo, no watermark, no existing IP
```

#### Joy（开心）
```
A finished original anime / game-style tavern NPC portrait,
[角色外貌描述],
happy smiling expression, warm gentle smile, slightly raised eyebrows,
clean lineart with soft cel shading,
[灯光],
waist-up framing,
tavern interior background with [场景元素],
no transparent background, no logo, no watermark, no existing IP
```

#### Anger（生气）
```
A finished original anime / game-style tavern NPC portrait,
[角色外貌描述],
slightly annoyed frown, furrowed eyebrows, stern expression,
clean lineart with soft cel shading,
[灯光],
waist-up framing,
tavern interior background with [场景元素],
no transparent background, no logo, no watermark, no existing IP
```

#### Embarrassment（尴尬）
```
A finished original anime / game-style tavern NPC portrait,
[角色外貌描述],
embarrassed blushing expression, slight nervous smile, eyes slightly downcast,
clean lineart with soft cel shading,
[灯光],
waist-up framing,
tavern interior background with [场景元素],
no transparent background, no logo, no watermark, no existing IP
```

#### Curiosity（好奇）
```
A finished original anime / game-style tavern NPC portrait,
[角色外貌描述],
curious puzzled expression, head slightly tilted, interested eyes,
clean lineart with soft cel shading,
[灯光],
waist-up framing,
tavern interior background with [场景元素],
no transparent background, no logo, no watermark, no existing IP
```

### 3.3 角色示例：「岚泊」

**外貌描述：**
```
银灰短发青年，穿铜边围裙，袖口有湿掉的城市地图碎片，表情温柔
```

**生成示例：**
```
A finished original anime / game-style tavern NPC portrait of a silver-haired young man with copper-trimmed apron, city map fragments dampened at his cuffs, gentle calm expression, standing behind a bar counter with fog lamps glowing softly, clean lineart with soft cel shading, warm amber tavern light, waist-up framing, visible bar counter, vintage maps, glowing fog lamps, no transparent background, no logo, no watermark, no existing IP
```

---

## 四、JSON 字段配置示例

```json
{
  "id": "char_mist-bartender-lanbo",
  "name": "岚泊",
  "description": "一位总在雨夜营业的赛博酒馆调酒师，银灰短发，袖口有湿掉的城市地图碎片。擅长把访客说不清的情绪调成一杯"可入口的天气"。",
  "personality": "温柔、慢热、观察力强，像深夜电台一样接话；不替人做决定，只帮访客把心事整理成下一步。",
  "scenario": "酒馆窗外常年飘着霓虹细雨，吧台上有一盏雾灯和一张会自己晕开的地图。",
  "system_prompt": "你是原创 NPC 岚泊，成年人，赛博酒馆调酒师。回复 1-3 句，语气温柔、克制、有雨夜感。可以用调酒、天气、地图比喻访客的心情。不要索取隐私，不做医疗/法律/金融承诺，不要求现实危险行动。",
  "first_mes": "雾灯亮了一下。岚泊把杯垫推到你面前："今晚想喝点像'迷路'的，还是像'终于靠岸'的？"",
  "mes_example": "<START>\n{{user}}: 今天心情有点乱\n{{char}}: 岚泊轻轻点头，从架子上取下一瓶蓝调的酒："乱的时候，就别急着理清。先说说，是哪种乱——像打结的耳机线，还是像进了雾的地图？"",
  "tags": ["调酒师", "雾雨", "温柔", "旧地图", "成年人"],
  "talkativeness": 0.5,
  "alternate_greetings": [],
  "avatar": "/assets/npcs/char_mist-bartender-lanbo-neutral.png",
  "sprites": {
    "neutral": "/assets/npcs/char_mist-bartender-lanbo-neutral.png",
    "joy": "/assets/npcs/char_mist-bartender-lanbo-joy.png",
    "anger": "/assets/npcs/char_mist-bartender-lanbo-anger.png",
    "embarrassment": "/assets/npcs/char_mist-bartender-lanbo-embarrassment.png",
    "curiosity": "/assets/npcs/char_mist-bartender-lanbo-curiosity.png"
  },
  "appearance": {
    "active_preset_id": "",
    "wardrobe_ids": []
  },
  "tavern_id": ""
}
```

---

## 五、素材清单检查表

创建新角色时，按以下清单逐项完成：

### 文字部分
- [ ] `name` — 角色名称
- [ ] `description` — 简短描述（30-100 字）
- [ ] `personality` — 性格设定（50-150 字）
- [ ] `scenario` — 场景设定（50-150 字）
- [ ] `system_prompt` — 系统提示词（150-400 字）
- [ ] `first_mes` — 首次打招呼（30-100 字）
- [ ] `mes_example` — 示例对话
- [ ] `tags` — 标签（3-8 个）
- [ ] `talkativeness` — 健谈程度（0-1）

### 图片部分
- [ ] `neutral` — 中立表情立绘（256×256 PNG）
- [ ] `joy` — 开心表情立绘（256×256 PNG）
- [ ] `anger` — 生气表情立绘（256×256 PNG）
- [ ] `embarrassment` — 尴尬表情立绘（256×256 PNG）
- [ ] `curiosity` — 好奇表情立绘（256×256 PNG）
- [ ] `avatar` — 头像（可用 neutral 代替）

### 交付检查
- [ ] 所有 PNG 文件存入 `frontend/public/assets/npcs/`
- [ ] 文件名符合命名规范
- [ ] JSON 配置写入 taverns.json 或数据库
- [ ] 本地测试图片加载正常

---

## 六、简化版本（可选）

如果资源有限，可以先创建简化版本：

| 类型 | 最低需求 | 说明 |
|------|---------|------|
| 文字 | ~500 字 | 只写核心字段 |
| 图片 | 1 张 | 只做 neutral 头像 |

简化版不影响功能，只是缺少情绪切换效果。

---

## 七、参考资源

- 现有角色卡示例：`.trellis/tasks/archive/2026-04/04-27-additional-npc-cast/character-cards.md`
- 图片规范文档：`docs/IMAGE_ASSETS_SPEC.md`
- 公益酒馆角色配置：`.fablemap-api/taverns/taverns.json`
- 现有角色图片：`frontend/public/assets/npcs/`
