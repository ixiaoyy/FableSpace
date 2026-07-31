# 技术设计：删除地图与坐标能力

## 边界与数据流

当前旧链路的数据流是：

```text
default_spaces / legacy JSON
  -> Space.from_dict
  -> Space dataclass
  -> JSON SpaceStore 或 MySQLSpaceStore
  -> SpaceService.to_dict_entry
  -> 旧 entry API / 当前前端过渡数据
```

公开 entry 投影已经使用 `to_dict_entry()`，不含坐标。本任务在更靠前的内容与领域边界删除坐标，使坐标不再进入应用对象、默认内容或新 JSON 写入。

## 应用合同变更

### 旧 Space 领域

- 删除 `Space.lat` 与 `Space.lon`。
- `Space.to_dict()` 不再输出坐标。
- `Space.from_dict()` 忽略旧记录中的坐标。
- 默认 Space 工厂不再接收或输出坐标；四个旧种子删除硬编码坐标。
- 默认种子完整性检查不再把坐标视为必需字段。

`address`、owner、Home、营业状态和其他旧 Space 字段保持不变，由各自清退任务处理。

### JSON 存储

JSON `SpaceStore` 继续复用 `Space.to_dict()` / `Space.from_dict()`：

- 读取旧文件时坐标被忽略；
- 新建或更新后写出的记录不含坐标；
- 不批量重写或删除用户目录中的现有文件。

### MySQL 兼容边界

现有 `taverns` 表的 `lat` / `lon` 是 `NOT NULL`，本任务又不得创建迁移或连接数据库。因此：

- `_to_tavern()` 不再读取或投影这两列；
- 新建旧 Space 时仅向旧列写入固定 `0.0`，该值没有地理语义，只用于满足物理 Schema；
- 更新旧 Space 时不再修改已有列；
- ORM 列、索引、历史 SQL、迁移器和 Schema 注释保留，由 `07-23-legacy-schema-config-removal` 在备份与人工 Schema 评审后统一删除。

这不是新合同或长期兼容层；它是旧表物理清退前的隔离边界。新 StoryWorld 代码和 API 不得引用该值。

## 附近与地图残留

- `NeighborhoodKnowledgeModel` 与 `TerritoryModel` 没有业务服务、API 或前端消费者，只通过旧 ORM metadata 保留表定义。
- 当前仓库不存在 AMap、浏览器 geolocation、附近搜索、地图页、路线规划或 POI 运行路径。
- 物理表定义与历史迁移不在本任务中删除，避免与 Schema 清退子任务交叉及绕过迁移评审。

## 历史内容保护

以下命中属于内容而不是产品能力，必须保留：

- 1854 年宽街的地点、门牌、水泵和“附近”叙事；
- John Snow 使用地图分析病例与饮水来源的史实及来源；
- 图片 prompt 中禁止地图/坐标元素的负面约束；
- 权威文档中明确禁止地图、坐标和 LBS 的条款。

## 兼容性与回滚

- 不改变公开响应，因此前端无需协议迁移。
- 不修改数据库，不做数据回填或删除。
- 旧 JSON 的坐标只在该记录经过应用写回时自然消失。
- 回滚方式是 revert 本任务代码提交；数据库状态始终未被本任务改变。

## 风险

- 旧数据库列在后续 Schema 清退前仍会被残留审计命中，必须按所有者任务解释，不能误报为完成物理删除。
- `Space` 构造调用若遗漏更新会在 Python 编译或最小实例验证中暴露。
- MySQL 插入若不提供兼容值会被旧 `NOT NULL` 约束拒绝；因此必须保留适配器边界验证。
