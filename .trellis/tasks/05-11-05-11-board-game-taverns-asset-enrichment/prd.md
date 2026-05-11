# PRD: Board Game Taverns Asset Enrichment (桌游系列空间资产补齐)

## 任务背景
在 FableMap 中已完成“桌游”分类及 4 个核心空间模版（剧本杀、狼人杀、麻将、纸牌屋）的逻辑构建。本任务旨在补齐这些空间的视觉资产（NPC 立绘与场景背景），以达到“完整可游玩”的状态。

## 目标资产清单

### 1. 雾都疑影·剧本杀馆 (Murder Mystery)
- **Scene**: `scenes/mystery-noir-room.png` - 维多利亚风格密室，壁炉、旧报纸、摇曳火光。
- **NPC: 探长·格雷**: `characters/detective-gray.png` - 中年、风衣、冷峻、手持烟斗或笔记本。
- **NPC: 塞琳娜夫人**: `characters/selina-widow.png` - 优雅、黑纱、神秘感。

### 2. 月圆之夜·狼人杀营地 (Werewolf)
- **Scene**: `scenes/werewolf-campfire.png` - 深夜森林营火，树影婆娑，月光清冷。
- **NPC: 预言家·白**: `characters/seer-white.png` - 披风、兜帽、手中可能有发光的球体。
- **NPC: 塞缪尔**: `characters/samuel-villager.png` - 普通农夫装束，但眼神阴沉。

### 3. 四方城·弄堂麻将馆 (Mahjong)
- **Scene**: `scenes/shanghai-mahjong-alley.png` - 老上海弄堂口，折叠桌，灯火阑珊。
- **NPC: 张阿姨**: `characters/auntie-zhang.png` - 典型的上海邻里长辈形象，烫头、红色或花色毛衣。

### 4. 至尊·纸牌屋俱乐部 (House of Cards)
- **Scene**: `scenes/poker-club-lounge.png` - 高级私人会所，绿丝绒桌布，昏暗暖色调。
- **NPC: 荷官·莫妮卡**: `characters/dealer-monica.png` - 职业西装、扎发、干练冷酷。

## 视觉风格锁定
- **画风**: **精致厚涂 / 电影感插画 (Cinematic Illustration)**。
- **要求**: 背景需有空间纵深感，NPC 立绘需支持半身像裁剪（Avatar）。

## 实施规范 (AGENTS.md)
1. 生成图片后存入 `frontend/public/assets/` 对应子目录。
2. 每个资产同目录保留 `<filename>.prompt.md` sidecar。
3. 更新 `tavernTemplates.js` 中的 `cover` 和 `avatar` 路径。

## 验收标准
- [x] 4 个空间的背景图生成并正确引用。
- [x] 6 名核心 NPC 的立绘生成并正确显示。
- [x] 所有生成图均附带 prompt sidecar 文件。
- [x] `npm run build` 无资源路径错误。
