# L2 任务认领：地点详情面板

## 任务 ID
L2

## 任务名称
地点详情面板：让地点成为一等入口，展示当前角色、事件、历史与可行动作

## 认领时间
2026-04-13

## 任务目标
在 WorldStageActivePoiPanel 中增强地点详情展示：
1. 展示与当前地点关联的势力/角色
2. 展示历史回声和记忆锚点
3. 展示可行动作和事件选项

## 当前分析

### 现有数据结构
从 WORLD_SCHEMA.md 和现有实现来看，world 对象包含：
- `factions` - 区域内的组织和势力
- `historical_echoes` - 历史回声
- `memory_anchors` - 记忆锚点
- `sprites` - 都市精灵
- `state.story_events` - 故事事件
- `pois[].faction_alignment` - POI 的阵营归属

### 当前已展示
- fantasy_name, fantasy_type, satire_hook, emotion_hook
- PlaceStateSection: 关系阶段、熟悉度、访问次数、驻足时长、痕迹数
- WritebackActionPanel: 写回动作
- WritebackInsightsPanel: 写回洞察

### 待展示（L2）
1. **势力关联**：当前地点属于哪个势力/阵营，该势力在区域的影响
2. **历史回声**：与该地点相关的历史碎片
3. **记忆锚点**：与该地点相关的情绪容器/匿名留言
4. **精灵/收藏**：该地点可能产出的精灵或收藏物
5. **可行动作**：在该地点可以做什么（不仅仅是写回）

## 实现计划
1. 扩展 WorldStageActivePoiPanel，添加 PlaceDetailSection
2. 在 placeProtocol.js 中添加相关辅助函数
3. 添加 CSS 样式

## 依赖
- L1 已完成（地点协议）

## 状态
claimed