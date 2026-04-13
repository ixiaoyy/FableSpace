# C1 任务认领：Character Engine MVP

## 任务 ID
C1

## 任务名称
Character Engine MVP：定义 character/persona/mood/relationship/agenda/memory 结构

## 认领时间
2026-04-13

## 任务目标
定义角色的前端数据结构和服务模块，使地点面板能够展示与当前地点关联的角色信息。

## 当前分析

### 已有数据
- `world.factions` — 势力/组织（name, archetype, doctrine, influence）
- `world.historical_echoes` — 历史碎片（可能关联角色）
- `world.memory_anchors` — 记忆锚点（情绪容器）
- `world.sprites` — 都市精灵
- `poi.faction_alignment` — POI 所属势力
- `writebackResult` — 玩家写回结果
- `familiarityMap` — 玩家与地点的熟悉度
- `city_persona.py` 已有 CityPersona（城市对玩家的态度）

### 缺失项
1. 前端没有 character/persona 相关的 TypeScript 接口
2. 没有从 world 数据推导角色信息的服务
3. 地点面板无法展示"在这个地点会遇到什么角色/势力"
4. 没有角色关系（relationship）状态

## 实现计划

### Phase 1：数据结构定义
1. 创建 `frontend/src/services/characterEngine.js`
2. 定义 TypeScript JSDoc 接口：Character, Persona, Mood, Relationship, Agenda, Memory
3. 定义字段命名规则

### Phase 2：服务函数
1. `deriveFactionCharacter(faction, poi)` — 从势力派生角色信息
2. `computeRelationship(faction_alignment, familiarity, writebackResult)` — 计算关系
3. `getMoodFromTrust(trustLevel)` — 从信任度推导情绪
4. `getAgendaForPoi(poi, encounter_zones)` — 获取地点议程
5. `enrichCharacter(character, world, writebackResult)` — 合并静态/动态数据

### Phase 3：UI 集成（可选 MVP 范围外）
- 在 WorldStageActivePoiPanel 中展示角色信息（需要确认是否属于 MVP）

## MVP 范围
Phase 1 + Phase 2 足以满足 C1 MVP 定义。
Phase 3（UI 集成）可作为 C1 的扩展或 C3（角色与事件接线）的一部分。

## 依赖
- L1（地点协议）
- L2（地点详情面板）
- L3（地点进入状态流）

## 状态
claimed