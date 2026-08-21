# 技术设计

## 边界与不变量

- 只修改 `apps/mirror-island/`、对应部署/规范和任务文档；不改 ParallelLines、Keycloak、数据库 schema 或既有基线 migration。
- 房屋外观是所有玩家共享的 RPGJS map 状态；迎宾 NPC、选址预览和私人室内访问按玩家/房屋隔离。
- 数据库提交是唯一建房成功点：提交前不广播外观，提交失败不消耗木桩、不移除 NPC。
- 当前地图保持 32×32 可玩样板，但坐标、区块和数据库校验继续使用 512×512、32×32 世界合同。

## 固定地形与素材

- 已完成候选检索与用户评选，记录见 `research/open-source-assets.md`。用户选择 A：Ninja Adventure；Kenney Tiny Farm/Town 保留为未来整套换肤候选。
- 默认许可 allowlist 为 CC0、CC-BY、MIT、BSD-2/3-Clause、Apache-2.0；CC-BY 同步交付 NOTICE/Credits。NC、ND、来源不明和未批准强 copyleft 直接淘汰。
- 复用已登记 Ninja Adventure `floor/village/interior-floor/wall` 对象，由 `prepare-media.mjs` 按固定 bytes/SHA-256 下载；不上传新对象，Git 不跟踪图片二进制。
- 为采用素材补 TSX；在 `simplemap.tmx` 中加入固定河流、桥/浅滩、碰撞层和住宅可建区域。河流属于基础地图，不写 `world_cells`。
- 经 Ninja Adventure village sheet 审核，房屋 footprint 固定为 4×6 瓦片、朝南，房门偏移为 `(2, 5)`；实施时继续用 Tiled 渲染锁定确切 GID 和碰撞格。
- 新增纯 `terrain-contract.ts`（或等价文件）拥有当前已加载矩形、河水/桥、保留通道、安全出生候选和 `isWalkable/isBuildable`。出生与建房共享同一合同，不各自维护坐标列表。

## 首次出生与个人 NPC

- `player.onConnected` 仍先确保 world/profile 并尝试 slot 0 load；只有 `load.ok === false` 才从安全候选中用服务端 `crypto.randomInt` 选择首次出生点并保存。
- 初次或尚未建房的玩家进入室外地图时，根据当前安全相邻格生成 `mode: "scenario"`、`scenarioOwnerId=player.id` 的动态迎宾 NPC；RPGJS 负责只向所有者同步和触发碰撞/对话。
- NPC 与玩家互相朝向。对话根据数据库房屋和 RPGJS inventory 分支：无房无木桩时欢迎并发一个非消耗型 `HouseStake`；已有木桩时提醒选址；已有房屋时不再生成 NPC。
- 木桩随 RPGJS slot 0 存档持久化。非法/取消不消耗；事务建房成功后显式 `removeItem` 并保存。

## 选址与预览

- 玩家站在预期房门南侧并面向北方使用木桩；面前一格为朝南房门锚点，纯函数计算 4×6 footprint、origin、门前回落点和占用坐标。
- 第一阶段校验地图边界、当前加载区域、基础阻挡/河水、保留道路、入口可达、`world_cells` 和已有 `world_occupancy`。
- 合法候选通过 scenario 动态事件只向该玩家绘制 footprint/门位预览，随后使用 RPGJS `showChoices` 确认或取消；预览无论结果都清理。
- 确认后在数据库事务内重新执行持久化校验，消除预览与提交间的竞态。

## 房屋事务与共享外观

- 新增 `persistence/house.ts`：
  - `findHouseByOwner(client, accountId)`；
  - `listHousesForLoadedRegion(client, bounds)`；
  - `createHouseWithOccupancy(client, request)`。
- `createHouseWithOccupancy` 在一个事务中确保 profile/world、拒绝已有房屋或动态格、创建 `House(exteriorVariant="village-house-south-v1")` 并为完整 footprint `createMany WorldOccupancy`。owner unique 和 tile primary key 作为并发最终防线，任何冲突回滚整笔事务。
- 事务提交后才在 `Dynamic` 层设置房屋 GID/碰撞、创建稳定 ID 的共享房门事件，并播放短暂施工效果。地图加载时按区域读取房屋并幂等恢复外观与房门事件。
- 房门事件查询当前玩家是否为 `ownerAccountId`：所有者进入室内；其他玩家只收到私人住宅提示。

## 私人室内 room

- 新建固定 `house-interior.tmx` 模板；每座房屋使用 `house-interior-<house UUID>` 作为 RPGJS map room ID，避免 account ID 进入 URL/room ID。
- `node-server.ts` 注册一个窄 `PrivateInteriorPublisher`：读取并解析已审核的室内 TMX，通过官方 `RpgServerTransport.updateMap` 幂等创建该动态 room，然后在 room 内创建出口事件。业务模块只调用接口，不直接持有 transport。
- `player.canChangeMap` 对动态室内 map 校验房屋所有者；`onJoinMap` 再查一次并把非所有者送回室外，防止绕过房门直接连接。
- 进入室内前先保存室外门前位置。室内 `onJoinMap/onDisconnected` 不覆盖 slot 0 的室外 map/位置；进程重启或断线后玩家回到最后保存的室外门前。
- 出口事件只在对应房屋 room 中存在，验证 owner 后返回该房屋门前并恢复普通自动存档。

## 施工与 NPC 收尾

- 提交成功后播放现有 tileset 派生的短暂尘土效果，设置共享房屋 tile/door，移除木桩并保存。
- 迎宾 NPC 显示道贺文本后移除该玩家的 scenario event；有房玩家以后不再生成 onboarding NPC。
- 不增加施工计时、NPC 寻路、材料、金币或任务系统。

## 失败与恢复

- 无安全出生候选：使用审核过的保底出生点并记录固定非敏感错误；不能随机到非法格。
- NPC 相邻格不足：按固定方向优先级选择最近安全格；仍无位置时不生成 NPC并提示重试，玩家存档保持有效。
- 预览后被其他玩家抢占：事务返回“位置已被占用”，保留木桩与 NPC，不显示房屋。
- 动态室内创建失败：房屋仍有效，门提示暂时无法进入；不修改房屋/占地数据。
- 房屋已存在但外观缺失：下一次 map load/join 从 PostgreSQL 幂等恢复。

## 验证策略

- 自动检查收缩为程序语法、TypeScript 类型、模块导入和必要的客户端/服务端构建；既有自动测试也可删除、合并或降级，不继续扩建玩法、并发、Node transport 或数据库自动化测试。
- 人工测试负责随机首次出生、NPC 对话、木桩预览、河流/桥碰撞、建房效果、重登恢复、owner 进屋、非 owner 提示、手机菜单与键盘。
- 人工测试发现的问题以具体复现步骤反馈，再针对实际缺陷做窄修复；不预先建设大而全的测试矩阵。

## 风险与回滚

- 最大风险是动态私人 map room 和室内断线存档。通过最小类型/构建检查后交给人工验收；失败时保留房屋外观并禁用门，不回滚数据库基线。
- 素材许可或 GID 错位通过官方来源/许可证记录、Tiled 渲染截图、尺寸/SHA/GID 清单和无 Git 图片二进制检查前置拦截。
- 无 schema migration；代码回滚不删除房屋数据。旧版本看不到房屋时，重新部署新版本即可按表恢复。
