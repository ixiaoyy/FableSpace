"""
NPC 仿真背景任务 (Simulation Background Worker)
定期遍历所有 NPC，更新状态并处理跨空间迁移。
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, UTC
from typing import TYPE_CHECKING, Dict

from ..core.simulation import tick_npc_simulation, decide_npc_mobility, classify_rumor_sentiment
from ..core.space import Tavern, TavernCharacter

if TYPE_CHECKING:
    from ..core.space import TavernStore

logger = logging.getLogger(__name__)

class SimulationWorker:
    def __init__(self, store: TavernStore, interval_seconds: int = 600):
        self.store = store
        self.interval_seconds = interval_seconds
        self._task = None
        self._running = False

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info(f"NPC Simulation Worker started with interval {self.interval_seconds}s")

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()

    async def _run_loop(self):
        while self._running:
            try:
                await self.perform_simulation_tick()
            except Exception as e:
                logger.exception("Error during NPC simulation tick")
            
            await asyncio.sleep(self.interval_seconds)

    async def perform_simulation_tick(self):
        """执行一次完整的仿真周期"""
        logger.info("Performing NPC simulation tick...")
        
        # 1. 获取所有酒馆数据
        taverns = self.store.list_all_spaces()
        space_map: Dict[str, Tavern] = {t.id: t for t in taverns}
        
        # 2. 收集所有唯一的 NPC
        # 注意：NPC 可能出现在两个地方（旧位置还没删或正在移动），以 current_space_id 为准
        all_unique_chars: Dict[str, TavernCharacter] = {}
        for t in taverns:
            for char in t.characters:
                if char.id not in all_unique_chars:
                    all_unique_chars[char.id] = char
        
        # 3. 更新状态并决定移动
        moved_chars = [] # (char, from_tid, to_tid)
        changed_spaces = set()

        now = datetime.now(UTC)
        
        # 确保所有 NPC 都有初始坐标
        for t in space_map.values():
            for char in t.characters:
                if char.lat is None: char.lat = t.lat
                if char.lon is None: char.lon = t.lon
                if not char.current_space_id: char.current_space_id = t.id
                if not char.home_space_id: char.home_space_id = t.id

        for char_id, char in all_unique_chars.items():
            # A. 状态衰减与回升
            current_t = space_map.get(char.current_space_id)
            t_type = current_t.place_type if current_t else ""
            if tick_npc_simulation(char, t_type, now):
                changed_spaces.add(char.current_space_id)
            
            # B. 移动决策
            dest_id = decide_npc_mobility(char, taverns)
            if dest_id and dest_id != char.current_space_id:
                moved_chars.append((char, char.current_space_id, dest_id))

        # 4. 执行移动逻辑
        for char, from_id, to_id in moved_chars:
            if from_id in space_map and to_id in space_map:
                from_space = space_map[from_id]
                to_space = space_map[to_id]
                
                # 从原地点移除
                from_space.characters = [c for c in from_space.characters if c.id != char.id]
                changed_spaces.add(from_id)
                
                # 加入新地点
                char.current_space_id = to_id
                char.is_visitor = (to_id != char.home_space_id)
                char.lat = to_space.lat
                char.lon = to_space.lon
                to_space.characters.append(char)
                changed_spaces.add(to_id)
                
                logger.info(f"NPC {char.name} ({char.id}) moved from {from_id} to {to_id}")

        # 5. 执行社交交换 (v0.1)
        self._process_social_exchange(space_map, changed_spaces)

        # 6. 持久化变更
        for tid in changed_spaces:
            if tid in space_map:
                try:
                    self.store.update_space(space_map[tid])
                except Exception as e:
                    logger.error(f"Failed to update tavern {tid} during simulation: {e}")

    def _process_social_exchange(self, space_map: Dict[str, Tavern], changed_spaces: set):
        """处理同一空间内 NPC 之间的社交互动"""
        import random
        from datetime import datetime, UTC
        
        now = datetime.now(UTC).isoformat()
        
        for tid, t in space_map.items():
            if len(t.characters) < 2:
                continue
            
            # 随机挑选两个 NPC 互动
            chars = list(t.characters)
            random.shuffle(chars)
            
            # 每次 Tick 每个酒馆只发生一对互动，避免信息爆炸
            p1, p2 = chars[0], chars[1]
            
            # P1 告诉 P2 一些事
            self._exchange_info(p1, p2, space_map)
            # P2 告诉 P1 一些事
            self._exchange_info(p2, p1, space_map)
            
            changed_spaces.add(tid)
            logger.info(f"Social interaction: {p1.name} and {p2.name} talked in {t.name}")

    def _exchange_info(self, source: TavernCharacter, target: TavernCharacter, space_map: Dict[str, Tavern]):
        """源 NPC 向目标 NPC 传递一条信息"""
        import random
        from datetime import datetime, UTC
        
        # 消息池
        potential_rumors = []
        
        # A. 性格自白
        if source.traits:
            t_label = random.choice(source.traits)
            potential_rumors.append(f"我其实是个{t_label}的人。")
        
        # B. 籍贯信息
        if source.home_space_id and source.home_space_id in space_map:
            home_name = space_map[source.home_space_id].name
            potential_rumors.append(f"我平时住在{home_name}那边。")
        
        # C. 场所推荐
        if source.current_space_id in space_map:
            t = space_map[source.current_space_id]
            potential_rumors.append(f"我觉得{t.name}这里的{t.place_type}氛围挺不错的。")

        if not potential_rumors:
            return

        rumor_content = random.choice(potential_rumors)
        
        # 存储到目标的社交记忆中（保持最近 5 条）
        new_memory = {
            "content": rumor_content,
            "source_name": source.name,
            "timestamp": datetime.now(UTC).isoformat()
        }
        
        # 避免重复
        if any(m["content"] == rumor_content and m["source_name"] == source.name for m in target.social_memories):
            return
            
        target.social_memories.insert(0, new_memory)
        target.social_memories = target.social_memories[:5]

        # ── 情感影响 (Emotional Impact) ──────────────────────────
        # 社交互动本身回升双方的 social 需求
        SOCIAL_BOOST = 8.0
        MOOD_SHIFT = 5.0

        if source.simulation_state:
            source.simulation_state.social = min(100.0, source.simulation_state.social + SOCIAL_BOOST)
        if target.simulation_state:
            target.simulation_state.social = min(100.0, target.simulation_state.social + SOCIAL_BOOST)

        # 根据传闻内容的情绪色彩修正心情
        sentiment = classify_rumor_sentiment(rumor_content)
        if sentiment == "positive":
            if target.simulation_state:
                target.simulation_state.mood = min(100.0, target.simulation_state.mood + MOOD_SHIFT)
            if source.simulation_state:
                source.simulation_state.mood = min(100.0, source.simulation_state.mood + MOOD_SHIFT * 0.5)
        elif sentiment == "negative":
            if target.simulation_state:
                target.simulation_state.mood = max(0.0, target.simulation_state.mood - MOOD_SHIFT)
            if source.simulation_state:
                source.simulation_state.mood = max(0.0, source.simulation_state.mood - MOOD_SHIFT * 0.5)

        logger.debug(
            "Rumor exchange: %s → %s | sentiment=%s | '%s'",
            source.name, target.name, sentiment, rumor_content[:40],
        )
