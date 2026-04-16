# C1 Character Engine MVP — 角色引擎

## 概述

定义角色的前端数据结构和服务函数模块，为后续角色展示和角色遭遇系统建立基础。

## 变更内容

### frontend/src/services/characterEngine.js (新文件)

定义 TypeScript JSDoc 接口：
- `CharacterIdentity` — 角色身份信息（id, name, source, archetype）
- `CharacterMood` — 角色情绪（tone, intensity, description）
- `CharacterAgenda` — 角色议程（type, description, urgency, trigger_hint）
- `CharacterRelationship` — 玩家与角色关系（strength, stage, encounter_count, last_encounter, trust_delta）
- `CharacterMemory` — 角色记忆（跨玩家共享数据）
- `Character` — 完整角色对象

常量映射：
- `FACTION_ARCHETYPE_MAP` — 势力原型的角色类型映射
- `MOOD_TONE_MAP` — 情绪色调的详细描述
- `RELATIONSHIP_STAGES` — 关系阶段阈值
- `AGENDA_TYPE_MAP` — 角色议程类型映射

服务函数：
- `getCharacterArchetype(archetype)` — 推导角色原型
- `getMoodFromTone(tone)` — 获取完整情绪对象
- `getRelationshipStage(strength)` — 计算关系阶段
- `getRelationshipStageLabel(stage)` — 获取中文关系标签
- `getRelationshipColor(strength)` — 获取关系颜色
- `deriveFactionCharacter(faction, poi)` — 从势力派生角色
- `computeRelationship(faction_alignment, familiarity, writebackResult)` — 计算关系
- `deriveCharacterForPoi(poi, world, familiarity, writebackResult)` — 为 POI 推导角色
- `getCharactersForPoi(poi, world, familiarity, writebackResult)` — 获取地点所有关联角色

## 影响范围

- 新增 `frontend/src/services/characterEngine.js`
- 不影响现有 UI（数据服务层，未集成到面板）

## 验证方式

1. 导入 characterEngine 模块
2. 调用 `getCharactersForPoi(poi, world, familiarity, writebackResult)` 验证返回角色列表
3. 验证势力角色、历史回声角色、精灵角色都能正确派生

## 相关文件

- `frontend/src/services/characterEngine.js` (新文件)
- `docs/claims/2026-04-13-c1-character-engine-mvp.md`