"""
NPC 仿真背景任务 (Simulation Background Worker)
定期遍历所有 NPC，更新状态并处理跨空间迁移。
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, UTC
from typing import TYPE_CHECKING, Dict

from ..core.simulation import tick_npc_simulation, decide_npc_mobility
from ..core.tavern import Tavern, TavernCharacter

if TYPE_CHECKING:
    from ..core.tavern import TavernStore

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
        taverns = self.store.list_all_taverns()
        tavern_map: Dict[str, Tavern] = {t.id: t for t in taverns}
        
        # 2. 收集所有唯一的 NPC
        # 注意：NPC 可能出现在两个地方（旧位置还没删或正在移动），以 current_tavern_id 为准
        all_unique_chars: Dict[str, TavernCharacter] = {}
        for t in taverns:
            for char in t.characters:
                if char.id not in all_unique_chars:
                    all_unique_chars[char.id] = char
        
        # 3. 更新状态并决定移动
        moved_chars = [] # (char, from_tid, to_tid)
        changed_taverns = set()

        now = datetime.now(UTC)
        
        # 确保所有 NPC 都有初始坐标
        for t in tavern_map.values():
            for char in t.characters:
                if char.lat is None: char.lat = t.lat
                if char.lon is None: char.lon = t.lon
                if not char.current_tavern_id: char.current_tavern_id = t.id
                if not char.home_tavern_id: char.home_tavern_id = t.id

        for char_id, char in all_unique_chars.items():
            # A. 状态衰减与回升
            current_t = tavern_map.get(char.current_tavern_id)
            t_type = current_t.place_type if current_t else ""
            if tick_npc_simulation(char, t_type, now):
                changed_taverns.add(char.current_tavern_id)
            
            # B. 移动决策
            dest_id = decide_npc_mobility(char, taverns)
            if dest_id and dest_id != char.current_tavern_id:
                moved_chars.append((char, char.current_tavern_id, dest_id))

        # 4. 执行移动逻辑
        for char, from_id, to_id in moved_chars:
            if from_id in tavern_map and to_id in tavern_map:
                from_tavern = tavern_map[from_id]
                to_tavern = tavern_map[to_id]
                
                # 从原地点移除
                from_tavern.characters = [c for c in from_tavern.characters if c.id != char.id]
                changed_taverns.add(from_id)
                
                # 加入新地点
                char.current_tavern_id = to_id
                char.is_visitor = (to_id != char.home_tavern_id)
                char.lat = to_tavern.lat
                char.lon = to_tavern.lon
                to_tavern.characters.append(char)
                changed_taverns.add(to_id)
                
                logger.info(f"NPC {char.name} ({char.id}) moved from {from_id} to {to_id}")

        # 5. 执行社交交换 (v0.1)
        self._process_social_exchange(tavern_map, changed_taverns)

        # 6. 持久化变更
        for tid in changed_taverns:
            if tid in tavern_map:
                try:
                    self.store.update_tavern(tavern_map[tid])
                except Exception as e:
                    logger.error(f"Failed to update tavern {tid} during simulation: {e}")

    def _process_social_exchange(self, tavern_map: Dict[str, Tavern], changed_taverns: set):
        """处理同一空间内 NPC 之间的社交互动"""
        import random
        from datetime import datetime, UTC
        
        now = datetime.now(UTC).isoformat()
        
        for tid, t in tavern_map.items():
            if len(t.characters) < 2:
                continue
            
            # 随机挑选两个 NPC 互动
            chars = list(t.characters)
            random.shuffle(chars)
            
            # 每次 Tick 每个酒馆只发生一对互动，避免信息爆炸
            p1, p2 = chars[0], chars[1]
            
            # P1 告诉 P2 一些事
            self._exchange_info(p1, p2, tavern_map)
            # P2 告诉 P1 一些事
            self._exchange_info(p2, p1, tavern_map)
            
            changed_taverns.add(tid)
            logger.info(f"Social interaction: {p1.name} and {p2.name} talked in {t.name}")

    def _exchange_info(self, source: TavernCharacter, target: TavernCharacter, tavern_map: Dict[str, Tavern]):
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
        if source.home_tavern_id and source.home_tavern_id in tavern_map:
            home_name = tavern_map[source.home_tavern_id].name
            potential_rumors.append(f"我平时住在{home_name}那边。")
        
        # C. 场所推荐
        if source.current_tavern_id in tavern_map:
            t = tavern_map[source.current_tavern_id]
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

        logger.info(f"NPC simulation tick completed. {len(moved_chars)} NPCs moved.")
