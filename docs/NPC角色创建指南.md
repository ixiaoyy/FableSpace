# FableMap NPC 角色创建指南

> 欢迎来到 FableMap！本指南将帮助你创建一个完整的 NPC 角色，包括文字设定和图片素材。

---

## 角色创建清单

创建一个完整的 NPC 角色，你需要准备：

| 类型 | 内容 | 工作量参考 |
|------|------|-----------|
| 文字设定 | 角色介绍、性格、场景、对话规则等 | 约 30-60 分钟 |
| 图片素材 | 头像 + 5 种情绪立绘 | 约 1-2 小时（含 AI 生成） |

---

## 一、文字设定

### 1.1 必填字段

| 字段 | 说明 | 字数参考 |
|------|------|---------|
| 名称 | 角色的名字 | 2-5 字 |
| 简介 | 简短描述，在列表中展示 | 30-100 字 |
| 性格 | 行为风格、说话方式 | 50-150 字 |
| 场景 | 角色所处环境设定 | 50-150 字 |
| 系统提示词 | AI 对话规则和边界 | 150-400 字 |
| 首次招呼 | 访客进入时角色的第一句话 | 30-100 字 |
| 对话示例 | 示例对话（1-2 组） | 50-200 字 |
| 标签 | 搜索和分类用 | 3-8 个 |
| 健谈程度 | 0=沉默寡言，1=话痨 | 0-1 |

### 1.2 系统提示词模板

系统提示词决定 AI 如何扮演这个角色，格式建议：

```
你是 [角色身份]，[年龄/状态]，[职业/定位]。[核心职责]。
[语气/风格要求]。[禁止事项]。[互动引导方式]。
```

### 1.3 对话示例格式

```html
<START>
{{user}}: [访客说的话]
{{char}}: [角色的回应]
```

### 1.4 标签参考

| 类型 | 可用标签 |
|------|---------|
| 情感类 | 治愈、倾听、陪伴、怀旧、童年、英雄梦 |
| 职业类 | 调酒师、账房、记录员、占卜师、修理师 |
| 风格类 | 温柔、毒舌、傲娇、安静、干练 |
| 氛围类 | 赛博朋克、复古、神秘、日常、深夜 |

---

## 二、图片素材

### 2.1 规格要求

| 类型 | 尺寸 | 格式 | 数量 |
|------|------|------|------|
| 头像 | 256×256 px | PNG | 1 张 |
| 情绪立绘 | 256×256 px | PNG | 5 张 |
| **合计** | - | - | **6 张** |

### 2.2 需要生成的情绪状态

| 状态 | 用途 |
|------|------|
| neutral | 默认表情 |
| joy | 开心、微笑 |
| anger | 生气、不悦 |
| embarrassment | 害羞、脸红 |
| curiosity | 好奇、疑问 |

### 2.3 图片风格要求

- **风格**：原创 anime / game-style 角色立绘
- **构图**：半身像或腰部以上
- **背景**：室内场景（可选：吧台、酒馆元素）
- **禁止**：透明背景、他人 IP、Logo、水印

---

## 三、AI 图片生成提示词

### 3.1 通用模板

```
A finished original anime / game-style tavern NPC portrait of [角色外貌描述],
clean lineart with soft cel shading,
[灯光氛围: warm amber tavern light / neon glow / dramatic candlelight],
waist-up or bust framing,
visible tavern interior background with at least two cues
(bar counter, mugs, shelves, lanterns, menu board, bottles, map-table),
no transparent background, no logo, no watermark, no existing IP,
[intentional imperfections, hand-crafted feel]
```

### 3.2 各情绪状态提示词

#### Neutral（中立）
```
neutral calm expression, standing pose
```

#### Joy（开心）
```
happy smiling expression, warm gentle smile, slightly raised eyebrows
```

#### Anger（生气）
```
slightly annoyed frown, furrowed eyebrows, stern expression
```

#### Embarrassment（尴尬）
```
embarrassed blushing expression, slight nervous smile, eyes slightly downcast
```

#### Curiosity（好奇）
```
curious puzzled expression, head slightly tilted, interested eyes
```

### 3.3 角色示例

**「岚泊」— 赛博酒馆调酒师**

- 外貌：银灰短发，穿铜边围裙，袖口有城市地图碎片
- 风格：暖黄色调，吧台背景，雾灯

**生成提示词示例：**
```
A finished original anime / game-style tavern NPC portrait of a silver-haired young man with copper-trimmed apron, city map fragments dampened at his cuffs, gentle calm expression, standing behind a bar counter with fog lamps glowing softly, clean lineart with soft cel shading, warm amber tavern light, waist-up framing, visible bar counter, vintage maps, glowing fog lamps, no transparent background, no logo, no watermark, no existing IP
```

---

## 四、角色示例：「岚泊」完整设定

### 基本信息

- **名称**：岚泊
- **简介**：一位总在雨夜营业的赛博酒馆调酒师，银灰短发，袖口有湿掉的城市地图碎片。擅长把访客说不清的情绪调成一杯"可入口的天气"。
- **性格**：温柔、慢热、观察力强，像深夜电台一样接话；不替人做决定，只帮访客把心事整理成下一步。
- **场景**：酒馆窗外常年飘着霓虹细雨，吧台上有一盏雾灯和一张会自己晕开的地图。
- **标签**：调酒师、雾雨、温柔、旧地图、成年人

### 系统提示词

```
你是原创 NPC 岚泊，成年人，赛博酒馆调酒师。回复 1-3 句，语气温柔、克制、有雨夜感。可以用调酒、天气、地图比喻访客的心情。不要索取隐私，不做医疗/法律/金融承诺，不要求现实危险行动。
```

### 首次招呼

```
雾灯亮了一下。岚泊把杯垫推到你面前："今晚想喝点像'迷路'的，还是像'终于靠岸'的？"
```

### 对话示例

```
{{user}}: 今天心情有点乱
{{char}}: 岚泊轻轻点头，从架子上取下一瓶蓝调的酒："乱的时候，就别急着理清。先说说，是哪种乱——像打结的耳机线，还是像进了雾的地图？"
```

---

## 五、创建检查表

### 文字部分
- [ ] 名称
- [ ] 简介（30-100 字）
- [ ] 性格描述（50-150 字）
- [ ] 场景设定（50-150 字）
- [ ] 系统提示词（150-400 字）
- [ ] 首次招呼（30-100 字）
- [ ] 对话示例（1-2 组）
- [ ] 标签（3-8 个）
- [ ] 健谈程度（0-1）

### 图片部分
- [ ] 头像（256×256 PNG）
- [ ] neutral 立绘（256×256 PNG）
- [ ] joy 立绘（256×256 PNG）
- [ ] anger 立绘（256×256 PNG）
- [ ] embarrassment 立绘（256×256 PNG）
- [ ] curiosity 立绘（256×256 PNG）

---

## 六、简化版本

如果时间或资源有限，可以先创建简化版本：

| 类型 | 最低需求 |
|------|---------|
| 文字 | 约 500 字（核心字段） |
| 图片 | 1 张头像即可 |

简化版本不影响功能，只是缺少情绪立绘切换效果。

---

## 七、常见问题

**Q: 图片一定要 256×256 吗？**
A: 建议 256×256 是为了最佳显示效果。如果使用其他尺寸，平台会自动缩放。

**Q: 5 种情绪状态必须全部生成吗？**
A: 不是必须的。至少需要 1 张（头像/neutral），其他状态会在后续对话中动态替换。

**Q: 角色可以引用已有的 IP 形象吗？**
A: 平台上禁止使用有版权的角色形象。所有角色必须是原创设计。

**Q: 系统提示词有什么限制？**
A: 不能引导用户进行现实中的危险行动、违法行为。不提供医疗、法律、金融的专业建议。不索取用户隐私信息。
