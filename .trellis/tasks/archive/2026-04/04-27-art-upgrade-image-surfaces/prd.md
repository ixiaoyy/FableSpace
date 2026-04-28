# 需要图片位置的美术升级 PRD

## 背景

当前 FableMap 已有默认图片规范和 NPC 完成标准，但部分“产品上明确需要图片”的位置仍可能走默认占位、通用 fallback、低保真图片或缺少表情差分。用户要求：凡是特定需要图片的地方，都应进入美术升级任务范围；后续做新 NPC / 新酒馆 / 新入口页时，不能只交文字和数据。

## 目标

建立一轮独立的美术升级任务，系统梳理并补齐所有需要图片支撑的产品位置，确保关键体验不再依赖占位图或低保真临时素材。

## 范围

### P0：NPC 角色相关图片

- 正式 NPC 必须满足 `.trellis/spec/frontend/npc-art-guidelines.md` 的 `New NPC Character Completion Contract`。
- 每个正式 NPC 至少需要：
  - `neutral` 头像 / 半身立绘
  - `happy / angry / shy / curious` 表情语义
  - 当前表达系统别名：`joy / anger / embarrassment / curiosity`
  - 写入 `avatar` 或 `sprites.neutral`
  - payload 测试确认字段和文件存在
- 优先检查并升级：
  - 默认公益酒馆 NPC
  - 系统角色预设 / demo NPC
  - TavernNpcStage / 角色展示区 / 聊天头部可见 NPC

### P1：酒馆体验相关图片

- 酒馆详情页 / 入场页 / TavernLayoutShowcase 中明确需要视觉图的位置。
- 酒馆封面 / 氛围图 / 内景图。
- 公益默认酒馆如外星便利店、午夜委托板、静安猫铃避难所等应有与主题匹配的高质量视觉资产。
- 可按 `docs/IMAGE_ASSETS_SPEC.md` 中 Place Atmosphere 规格生成或替换。

### P2：平台入口与传播图片

- 首页 hero、功能模块图、创建页示例图、分享/邀请视觉图。
- 发现页卡片、creator/profile 相关图片位。
- 所有对外传播图应避免临时占位、低清截图或无 tavern 语义的通用图。

## 非目标

- 不改变 Tavern / TavernCharacter 持久 Schema。
- 不新增大型 UI 框架或图片管理依赖。
- 不把 AI 生成图片自动写回用户酒馆；用户上传 / 导入图片仍优先。
- 不做版权 IP、现实名人、特定画师风格模仿。

## 建议执行步骤

1. 盘点图片消费点：搜索 `avatar`、`sprites`、`image_url`、`assets/`、`place-atmosphere`、`npc-style-cast`、`hero`、`cover`。
2. 按 P0/P1/P2 分类出缺口清单。
3. 为每个缺口确定资产规格、文件名、存放位置和引用位置。
4. 生成或放入高质量原创图片资产。
5. 更新引用代码 / seed 数据 / docs。
6. 补测试：payload 字段、文件存在、fallback 优先级、build。
7. 做浏览器视觉检查，确认窄屏下图片不破版。

## 验收标准

- 产出一份图片缺口清单和完成状态表。
- P0 NPC 图片缺口全部补齐或明确降级为“草稿/原型”。
- P1 至少完成默认公益酒馆关键视觉升级。
- 所有新增图片有稳定项目路径和引用点。
- 对应测试和 build 通过。

## 参考文档

- `docs/IMAGE_ASSETS_SPEC.md`
- `.trellis/spec/frontend/npc-art-guidelines.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/backend/quality-guidelines.md`
