# Technical Design

## Boundary

入口流程留在根路由的 React 外壳中；只有进入 `playing` 状态时才挂载 `GameCanvas`。Phaser 继续独占逐帧游戏状态。无 API、数据库、认证或论坛状态参与。

## Save contracts

- 新键：`farm-game.save.v2`。
- 旧键：`farm-game.save.v1`，只用于一次性补资料迁移。
- v2 为现有场景/出生点判别联合，并在每个分支共同携带：
  - `schema_version: 2`
  - `player_name`
  - `avatar_id`
  - `day`
  - `scene`
  - `spawn_id`
- 入口读取返回显式联合：`empty | current | legacy | invalid | unavailable`，不把所有情况折叠为默认可玩存档。
- React 首次读取纯且幂等；StrictMode effect 不执行迁移、删除或自动写入。
- 新建/升级写 v2 成功后才删除 v1。场景切换和跨日由共享构造器保留身份字段。

## Entry state machine

```text
resolving
  ├─ empty/invalid/unavailable -> creating -> playing
  ├─ legacy -> creating-with-progress -> playing
  └─ current -> returning -> playing

returning -> restart-confirm -> creating-new -> playing
```

重开确认只改变 React 草稿状态，不修改 localStorage。`GameCanvas` 完全卸载时才允许重开，避免运行中的 Phaser registry 把旧进度写回。

## Runtime handoff

`GameCanvas`、`createGame` 和 `BootScene` 接受同一个稳定 `initialSave`。`createGame.preBoot` 在 BootScene preload 前写入 registry；BootScene 根据 registry 中的 `avatar_id` 生成玩家纹理并在加载成功后启动保存场景，不再读存储。

## Avatar rendering

只提供两个稳定外观 ID：`male` 与 `female`，不增加职业或属性。

- 男角色继续使用已登记的官方 `ninja_blue/sprite.png`。
- 女角色采用同一官方固定提交的 `samurai_green/samurai_green.png`：64×112、4784 bytes、SHA-256 `552e1af74a8d565408519ced8c5bb309d291a9d3002e4e37c881d2181f413e96`。
- 女角色发布到不可变 key `assets/vendor/ninja-adventure/2024-04-19/player-female.png`，登记 manifest 与来源记录；不把 PNG 加入 Git。
- React 预览直接裁显各自向下静止帧；BootScene 只加载 initialSave 选择的图集到共享 player texture key，现有动画无需复制成两套。

## Compatibility and rollback

- 回滚代码不会删除 v1；已经产生的 v2 对旧首版会被视为未知并回到旧默认，因此若回滚，玩家可手动保留 v1 或重新开始。正式 rollout 后不应覆盖回滚到旧版本。
- 素材发布 workflow 只允许该官方仓库固定提交的审核 PNG namespace，验证 bytes/hash 后才写不可变对象。
- localStorage 写失败时 Phaser 使用传入的内存 v2 继续当前会话；UI 先显示非阻断提示。
- 当前明确单标签运行，不增加 `storage` 事件同步。
