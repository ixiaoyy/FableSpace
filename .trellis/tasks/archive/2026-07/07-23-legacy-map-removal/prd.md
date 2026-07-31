# 删除地图与坐标能力

## Goal

从当前可运行的应用合同中删除地图、通用坐标和附近发现能力，同时保留历史故事对真实地点、史料和 John Snow 地图史的内容表达。

## Background

- 当前公开 StoryWorld API、旧 `/api/v1/spaces/{space_id}` entry 响应和前端 `Space` 类型均不声明或返回 `lat` / `lon`。
- 当前前端没有地图页、附近/城市入口、定位权限调用或地图适配器；仓库没有 AMap 环境变量、前端依赖或运行配置。
- 可执行的坐标残留集中在旧 `Space` 内存合同、默认 Space 种子和 MySQL Space 适配器。
- `taverns.lat` / `taverns.lon`、`neighborhood_knowledge`、`territories` 及历史 SQL/迁移仍属于旧数据库 Schema；物理清退由兄弟任务 `07-23-legacy-schema-config-removal` 统一评审和实施。
- 本任务不连接数据库、不创建或修改迁移，也不删除任何现有数据。

## Requirements

- 从旧 `Space` dataclass、完整序列化、反序列化和默认 Space 种子中移除 `lat` / `lon`。
- 文件存储的新写入不得继续生成坐标字段；读取旧 JSON 时忽略已有坐标。
- MySQL 适配器不得把旧表坐标投影进应用领域对象；在物理列删除前，仅允许使用无地理含义的兼容值满足旧 `NOT NULL` 列，并且更新 Space 时不得重写已有坐标。
- 不新增地图、附近发现、城市入口、定位权限、路线规划、POI 或地理服务依赖。
- 历史故事中的真实地点、宽街水泵、John Snow 地图史和“附近”等普通叙事必须保留，并继续通过内容事实与来源表达。
- 完成残留审计；每个保留的坐标/地图命中必须明确属于历史内容、负面产品合同、图片负面提示或待后续物理清退的旧数据库 Schema。

## Out of Scope

- 删除 `Space`、`SpaceCharacter`、`VisitorState`、`/spaces` 路由或旧前端 Space 数据流。
- 删除 owner、Home、SillyTavern、社交、Gameplay 或其他旧供给侧能力。
- 删除或修改数据库表、列、索引、历史 SQL 迁移和数据库迁移工具。
- 修改 StoryWorld、Character、PlayerRole、PlayerStoryState 或 StoryRun Schema。

## Acceptance Criteria

- [x] 公开前后端不要求或返回通用坐标，且旧 `Space` 应用领域对象不再包含 `lat` / `lon`。
- [x] 默认种子和文件存储的新写入不再生成坐标。
- [x] 地图入口、适配器、定位调用、附近发现及 AMap 配置没有可达引用。
- [x] 历史故事仍能表达真实地点、地图史与来源，不把地点转为通用坐标 Schema。
- [x] 数据库 Schema 残留已逐项归属后续清退任务，没有执行数据库连接、迁移或数据删除。
- [x] `py -3 -m compileall -q apps/api/src`、前端 typecheck/build 和残留审计通过。
