# Phaser Pixel Game Runtime

## Ownership

- React Router 只提供 `/` 页面、首次/回访入口、角色表单草稿、重开确认、Phaser canvas 生命周期、加载失败状态和论坛普通外链。
- Phaser 单独持有逐帧位置、速度、输入、动画、碰撞、摄像机、场景和 HUD。
- `localStorage` 只持有经过 codec 校验的跨刷新存档；React state、URL 和旧 API 都不是游戏状态源。
- React 只在进入游戏前持有一次性 `initialSave`，并将它传入 Phaser；BootScene 不得在加载完成后再次读取 localStorage。
- 首片只实现 `FarmScene` 与 `HomeScene`，不得抽象通用地图平台、ECS、玩法 DSL 或编辑器。

## Browser lifecycle

- Phaser 只能在浏览器 effect 中动态加载和创建；模块顶层不得假定 `window`、`document` 或 canvas 已存在。
- React StrictMode 重放 effect 时，旧实例必须先 `destroy(true)`；同一容器不得存在两个游戏实例。
- effect 添加的监听器、timer 和订阅必须在 cleanup 中移除；销毁后的异步加载结果不得重新创建实例。
- 资源加载失败必须通知 React 显示简短重试状态，不能停留在空 canvas。

## Display

- 使用 16×16 逻辑瓦片和固定内部画布；外层只做等比适配，不拉伸世界比例。
- 开启 Phaser `pixelArt` 与 `roundPixels`，canvas CSS 使用 `image-rendering: pixelated`。
- 玩家与需要前后穿行的对象以脚底 Y 坐标计算 depth；树冠等视觉上层不得扩大树干碰撞范围。
- 摄像机只跟随玩家并限制在当前固定场景边界，不实现缩放控制、小地图或现实坐标。

## Input and movement

- WASD 与方向键映射到同一四向输入；斜向向量必须归一化。
- 行走动画由当前速度和主方向决定；停止后保留最后朝向并显示对应静止帧。
- 门和出口只依赖移动进入明确交互区；床边自动打开睡眠确认，不要求玩家记忆额外交互键。
- 场景过渡或睡眠结算期间锁定输入，直到淡入结束；长按不得重复切换或增加多天。

## Collision and interaction

- 玩家物理体只覆盖脚下实体区域，不以整张精灵图作为碰撞体。
- 农场边界、住宅实体、树干和石头为静态碰撞；室内墙体和占地家具为静态碰撞。
- 门和出口进入明确区域后触发一次受锁保护的过渡；床边进入区域后打开默认选择“暂不”的睡眠确认，支持鼠标左键点击按钮或方向键加 Enter，Esc 取消。确认时暂停时钟和移动，取消后必须离开床区再进入才重新打开。每个场景出生点必须位于对应交互区外，避免加载后立即反向切换或打开睡眠确认。
- 场景切换使用稳定 `spawn_id`，不得保存或恢复任意浮点坐标到碰撞体中。

## Save contract

当前存档键为 `farm-game.save.v3`，结构只包含：

```text
schema_version: 3
player_name: normalized 1–12 Unicode characters
avatar_id: authored appearance identifier
day: positive integer
time_minutes: 360..1550, divisible by 10
scene: farm | home
spawn_id: stable authored identifier
```

- JSON 解析结果视为 `unknown`，逐字段验证后才采用；不使用类型断言跳过边界。
- 缺失存档进入首次角色创建；损坏、未知版本、未知场景或未知出生点进入带提示的角色创建，不直接挂载缺少身份的默认角色。
- 读取优先级为 v3 → v2 → v1；上级键存在但损坏时不得回退复活旧键。合法 v2 在内存中补齐 06:00，合法 v1 在入口补齐身份与 06:00；先成功写 v3 再删除被升级的旧键。
- 场景切换完成后保存场景、出生点和当前时间；睡眠或 02:00 强制结算只在过渡锁内执行一次 `day + 1`，重置到 06:00 并保存住宅次日出生点。
- 场景切换和睡眠重建存档时必须保留 `player_name` 与 `avatar_id`。
- 当前不读取、迁移或删除任何旧 FableSpace/localStorage 键；只识别精确的当前农场 v1 键。

## Scenario: player onboarding and v1/v2 upgrade

### 1. Scope / Trigger

- 首次角色创建、回访继续、确认重开，以及 `farm-game.save.v1/v2` 升级到 v3 时使用本合同。

### 2. Signatures

- `inspectGameSave(): SaveInspection`
- `validatePlayerName(rawName: string): PlayerNameValidation`
- `createNewGameSave(rawPlayerName, avatarId, legacyProgress?): NewGameSaveResult`
- `GameCanvas({ initialSave }: { initialSave: GameSave })`

### 3. Contracts

- `SaveInspection` 必须显式区分 `empty | current | legacy | invalid | unavailable`。
- `GameSave` 必须携带已规范化的 `player_name`、`male | female` 的 `avatar_id`、合法 `day/time_minutes` 与 `scene/spawn_id` 配对。
- React 只把一次性 `initialSave` 交给 Phaser registry；BootScene 和玩法场景不得再次读取 localStorage。

### 4. Validation & Error Matrix

- v3 合法 → `current`；v3 存在但 JSON、版本或字段非法 → `invalid`，不得读取 v2/v1。
- v3 不存在且 v2 合法 → `current` 的内存升级结果；v2 非法 → `invalid`，不得读取 v1。
- v3/v2 不存在且 v1 合法 → `legacy`；v1 非法 → `invalid`。
- localStorage 读取失败 → `unavailable`；写入失败 → 返回内存 save 与非持久化警告，不删除 v2/v1。
- 名字在 NFC 后拒绝控制字符，trim 后须为 1–12 个 Unicode code point。

### 5. Good / Base / Bad Cases

- Good：第 7 天住宅 v1 补齐女角色与名字后，v3 仍是第 7 天同一住宅出生点、时间为 06:00，并删除 v1。
- Base：无存档时创建第 1 天 06:00 的 `farm/start` v3。
- Bad：损坏 v3 与合法 v2/v1 同时存在时回退旧档，或确认重开时立刻覆盖旧档。

### 6. Tests Required

- 断言 v3/v2/v1 优先级、旧档迁移保留进度、写失败保留旧键、时间边界、名字边界和 scene/spawn 判别联合。
- 浏览器断言首次不挂载 canvas、回访点击后只有一个 canvas、重开取消保留旧档、确认后焦点进入姓名输入。

### 7. Wrong vs Correct

```ts
// Wrong: BootScene silently changes the selected save after assets load.
const save = loadGameSave()

// Correct: every scene decodes the one React-approved registry handoff.
const save = decodeGameSave(this.game.registry.get(GAME_SAVE_REGISTRY_KEY))
```

## Scenario: day clock and next-day settlement

### 1. Scope / Trigger

- FarmScene 与 HomeScene 激活时创建日内时钟；自动进出门、确认睡眠或到达 02:00 时结束当前 Scene 的计时。睡眠确认打开期间暂停时钟，取消后从原时间继续。

### 2. Contracts

- 一天从 06:00 开始，每 7 秒推进 10 分钟；可持久化时间只允许 06:00 到次日 01:50。
- 时间只在 Phaser registry 与 v3 localStorage 存档间流动；React 不逐 tick 镜像时间。
- 每个 Scene 同时最多存在一个 TimerEvent，shutdown 与任何过渡开始时都必须移除。
- 02:00 边界不保存为当前日，而是在过渡锁内一次性写入次日 06:00、`home/next-day`。

### 3. Tests Required

- 验证一次 tick 只增加 10 分钟并持久化，进出住宅保持时间，刷新恢复时间。
- 验证床边取消不跨日、确认睡眠与 01:50 后的自动结算都只增加一天，并重置为 06:00。

## Asset contract

- 所有 spritesheet/tileset URL 由一个资源 manifest 或常量模块集中提供；场景不得散落拼接 URL。
- 当前只允许 `male` 与 `female` 两个 avatar_id。两者分别映射同一官方固定提交中已登记的 64×112 图集；React 预览与 BootScene 必须读取同一个 avatar 注册表，图片二进制不进入 Git。
- 官方 64×112 图集为 4 列方向（下、上、左、右）× 7 行动作；移动动画沿同一方向列读取前四行，静止帧使用首行对应列。不得把方向与动作轴对调。
- Ninja Adventure 采用项必须来自官方包，记录 CC0、原始路径、转换过程、尺寸和 SHA-256。
- 图片二进制不进入 Git；正式上游 URL 使用不可变对象 key。默认通过同源 `/game-media/v1` 代理加载；若改为跨域直连，必须先验证可用 CORS。
- 不加载完整素材包；只加载首片实际用到的图集。

## UI copy and accessibility

- 入口只显示名字、外观、继续/重开和必要存储提示；游戏内只显示名字、`第 N 天`、日内时间、睡眠确认、必要过渡状态、加载/失败/重试，不再显示交互键教学。
- 首次入口按游戏菜单组织：一个当前角色主预览、紧凑外观切换、姓名与主确认动作；不得把每个外观扩成带说明的网页卡片。桌面 3:2 画面内不得出现内部滚动条。
- 回访入口使用一个横向存档槽集中展示角色、名字与第 N 天；只有真实多存档能力落地后才能增加更多槽位。
- 外观使用原生 radio group；名字使用真实 label 和内联错误。重开使用模态确认，默认聚焦安全取消操作并支持 Escape。
- 不用长段文字解释产品、论坛、素材来源或未实现能力。
- 论坛链接是可聚焦的真实 `<a>`，有清楚可访问名称、focus-visible 状态、`target="_blank"` 和安全 `rel`。
- reduced-motion 用户仍能完成场景切换；CSS 外壳动画应关闭或缩短，Phaser 淡变不得成为输入永久锁。

## Verification

- Typecheck 与 production build 均通过。
- 验证首次建角、男/女外观一致性、姓名边界、刷新继续、v1 补资料、损坏 v2 和重开取消/提交。
- 在桌面浏览器用 WASD/方向键分别移动，验证斜向不加速、停止保留朝向。
- 验证所有实心对象、地图边界、树冠遮挡和家具深度。
- 验证走入门口和出口会自动触发一次；床边只打开一次睡眠确认，默认“暂不”，取消不跨日且离开后才能再次打开；所有出生点均在交互区外。
- 验证时间按 10 分钟推进、进出住宅保持时间、一次睡眠或凌晨 2:00 自动结算只增加一天；刷新恢复 day/time/scene/spawn；损坏存档回到新游戏。
- 验证论坛只打开外链，网络面板无旧 API、认证、LLM 或数据库请求。
