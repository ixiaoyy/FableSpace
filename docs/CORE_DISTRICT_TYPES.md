# 核心地块类型定义 v1.0

## 5 种核心地块

### 1. 秩序高塔 (Order Tower) - 办公区
**现实特征**：写字楼、政府机构、银行
**转义规则**：
- 高耸建筑 → 权力塔楼
- 玻璃幕墙 → 透明结界
- 保安 → 守卫
**互动机制**：
- observe：感受到"规则的重量"
- dwell：获得"秩序印记"
- mark：留下"异议符文"（需要勇气值）
**观察者效应**：
- 低密度：冷漠的建筑
- 高密度：塔楼开始"注视"你

### 2. 记忆废墟 (Memory Ruins) - 老旧社区
**现实特征**：老小区、拆迁区、城中村
**转义规则**：
- 老建筑 → 时间裂痕
- 晾衣杆 → 生活印记
- 小卖部 → 记忆锚点
**互动机制**：
- observe：听到"过去的回声"
- dwell：触发"旧日幻影"
- mark：修复"记忆碎片"
**观察者效应**：
- 低密度：沉默的废墟
- 高密度：记忆开始复苏

### 3. 流动市集 (Flowing Market) - 商业区
**现实特征**：商场、步行街、夜市
**转义规则**：
- 商铺 → 交易站
- 人流 → 能量流
- 广告牌 → 欲望符号
**互动机制**：
- observe：感受"欲望的潮汐"
- dwell：被"商业气息"包围
- mark：留下"交易印记"
**观察者效应**：
- 低密度：普通市集
- 高密度：稀有商品出现

### 4. 治愈绿洲 (Healing Oasis) - 公园绿地
**现实特征**：公园、湖边、绿道
**转义规则**：
- 树木 → 生命之树
- 湖水 → 镜面之湖
- 长椅 → 休憩圣所
**互动机制**：
- observe：获得"宁静感"
- dwell：恢复"情绪值"
- mark：种下"希望之种"
**观察者效应**：
- 低密度：安静的绿地
- 高密度：精灵显现

### 5. 边缘裂隙 (Edge Rift) - 城市边缘
**现实特征**：工业区、郊区、荒地
**转义规则**：
- 废弃建筑 → 裂隙入口
- 铁轨 → 时空边界
- 荒草 → 野性回归
**互动机制**：
- observe：感受"世界的边缘"
- dwell：进入"半梦半醒"状态
- mark：留下"探索者标记"
**观察者效应**：
- 低密度：被遗忘的角落
- 高密度：异常事件频发

## 地块识别规则

```python
def identify_district_type(pois: List[POI]) -> str:
    office_count = count_by_type(pois, ["office", "bank", "government"])
    residential_old = count_by_age(pois, min_age=20)
    commercial = count_by_type(pois, ["shop", "mall", "restaurant"])
    park = count_by_type(pois, ["park", "green"])
    industrial = count_by_type(pois, ["factory", "warehouse"])

    if office_count > 5: return "order_tower"
    if residential_old > 10: return "memory_ruins"
    if commercial > 8: return "flowing_market"
    if park > 3: return "healing_oasis"
    if industrial > 2: return "edge_rift"

    return "mixed"  # 混合区域
```
