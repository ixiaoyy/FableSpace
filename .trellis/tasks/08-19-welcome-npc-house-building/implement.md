# 实施计划

1. 同步 `PRODUCT_BRIEF`、`WHAT_NOT_TO_BUILD` 与 RPGJS code-spec：首次随机出生、scenario 迎宾 NPC、木桩选址、唯一住宅、私人室内和固定河流；继续禁止通用建造/材料/多房屋。
2. 按用户选择 A 复用已登记 Ninja Adventure 固定子集；把 village/interior-floor/wall 加入校验下载，补 TSX 与固定河流/桥 `simplemap.tmx`，并锁定 4×6 朝南房屋 GID、门位、碰撞和安全出生/保留通道合同；不上传新对象。
3. 实现纯地形与建房几何模块：当前加载边界、walkable/buildable、首次安全随机候选、NPC 相邻朝向、门锚点→footprint、入口与动态格/占地请求格式。
4. 实现 `persistence/house.ts`：按 owner/区域查询、事务创建 House+WorldOccupancy、拒绝一人二屋/重叠/world_cells，并统一映射可重试冲突；不新增 migration。
5. 把固定演示 NPC 改为 per-player scenario onboarding：首次/未建房 map join 生成，欢迎并幂等发放非消耗型 HouseStake，支持中断恢复和建房后道贺移除。
6. 实现 HouseStake `onUse`：只在室外、面向北时取门锚点；先校验并创建 owner-only footprint/门预览，`showChoices` 确认，取消/非法保留木桩。
7. 接入事务建房：确认后重验并提交，成功才消耗木桩、保存、播放施工效果、绘制共享房屋/碰撞并创建 owner-aware 房门事件；map load 幂等恢复所有当前区域房屋。
8. 完成动态室内 room 最小实现：通过 `RpgServerTransport.updateMap` 从固定 TMX 模板创建 `house-interior-<house UUID>`；只做类型、模块导入和构建级检查，具体 room 隔离交由人工反馈。
9. 接入私人室内：门 owner 校验、`canChangeMap` + `onJoinMap` 双重守卫、进入前室外存档、室内不覆盖存档、出口回门前、非 owner 提示。
10. 不继续扩建大规模自动测试或数据库集成矩阵；既有测试也按维护价值删除、合并或降级，人工反馈负责玩法、并发、回滚与重连问题。
11. 运行最小 `typecheck`、必要的 `build`/`build:server` 和范围内语法检查；媒体与 Git 图片二进制边界只做一次静态核对。
12. 由人工测试验收桌面、手机、键盘、错误状态与双账号 owner/non-owner；根据反馈窄修复，再按阶段提交部署。

## 回滚点

- 地形与素材准备可独立提交；若房屋逻辑失败，保留河流地图并回滚后续代码。
- House persistence/geometry 在接 RPGJS 事件前通过隔离 PostgreSQL；失败不进入 UI 阶段。
- 动态室内 spike 未通过时不启用房门，外部房屋与占地仍可交付并 forward-fix。
- 任何生产失败只 forward-fix；不删除已创建住宅，不改回基线 migration。
