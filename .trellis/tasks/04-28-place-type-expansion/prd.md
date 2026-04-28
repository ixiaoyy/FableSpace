# Place Type Expansion - 地点类型扩展

## 目的

扩展地点类型，从单一"酒馆"扩展到更多现实地点类型，丰富地图探索体验。

## 地点类型定义

| 类型 | 描述 | 默认氛围 | 布局样式 | 典型 NPC |
|------|------|----------|----------|----------|
| 酒馆 | 夜间聚会场所 | 昏暗温暖 | lobby | 酒保、常客 |
| 咖啡店 | 白日休闲场所 | 明亮轻快 | lobby | 咖啡师、读者 |
| 奶茶店 | 年轻人聚集地 | 活泼可爱 | lobby | 店员、学生 |
| 书店 | 安静阅读空间 | 文艺沉静 | lobby | 店主、读者 |
| 便利店 | 24h服务 | 便利亲切 | lobby | 店员、夜班 |
| 学校 | 教育/学习场所 | 青春活力 | quest-play | 老师、学生 |
| 餐厅 | 正餐/约会场所 | 稳重仪式 | lobby | 主厨、侍者 |

## Place Type 数据模型

```python
class PlaceType(str, Enum):
    TAVERN = "tavern"
    CAFE = "cafe"
    MILK_TEA = "milk_tea"
    BOOKSTORE = "bookstore"
    CONVENIENCE = "convenience"
    SCHOOL = "school"
    RESTAURANT = "restaurant"

@dataclass
class PlaceTypeConfig:
    type: PlaceType
    label: str
    icon: str
    default_layout_style: str
    theme_colors: dict
    typical_npcs: list[str]  # 典型 NPC 描述
```

## 实现步骤

1. [ ] 定义 PlaceType 枚举和配置
2. [ ] 更新 Place/Tavern 数据模型添加 type 字段
3. [ ] 创建地点类型选择器 UI
4. [ ] 实现类型特定的模板预设
5. [ ] 添加类型发现过滤器
6. [ ] 创建类型展示页面

## MVP 范围

- 添加 3 种新类型：咖啡店、奶茶店、便利店
- 类型选择器
- 类型发现筛选
- 类型特定模板

## 验收标准

- [ ] 可以选择不同的地点类型
- [ ] 不同类型有不同的图标和展示
- [ ] 发现页面可以按类型筛选
- [ ] 新建地点时可以选择类型
