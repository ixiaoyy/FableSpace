# Web 像素农场生活游戏

本仓库正在原地重建为一个简单、独立的桌面 Web 俯视角像素农场生活游戏。游戏无需登录：首次访问先选择男角色或女角色并命名，回访从本地进度继续；全程不依赖论坛登录、后端 API、数据库或 LLM。

旧 FableSpace 角色故事产品已经退出当前主线。仓库中仍可见的 Character、StoryWorld、StoryRun、历史故事、聊天、后端和数据库代码只属于待精确清退的历史实现，不是新游戏的兼容合同。

## 首个可玩切片

```text
打开苔野小屋
  -> 选择男角色或女角色并写下名字
  -> 搬进农场
  -> 控制角色在住宅、树和石头之间移动
  -> 进入住宅室内
  -> 在床边睡觉
  -> 日期增加一天并在室内醒来
  -> 刷新页面后从本地存档恢复
```

首片包含原创标题/入住卡、男/女两种角色外观、角色命名、继续/安全重开，一张固定农场、一个固定住宅室内、四向移动与动画、碰撞与前后遮挡、进出门、名字/`第 N 天` HUD、睡眠过渡和版本化 `localStorage` 存档。树和石头只是有碰撞的环境物件。

首片不包含种地、作物、工具、砍树、碎石、掉落、NPC、对白、商店、金币、背包、体力、实时钟表、季节、天气、战斗、账号、云存档、SSO、API、数据库或 LLM。

## 操作

| 操作 | 按键 |
|---|---|
| 移动 | `WASD` 或方向键 |
| 交互 / 进出住宅 / 睡觉 | `E` 或空格 |

首发只验收桌面浏览器键盘/鼠标。移动端触控、虚拟摇杆和手柄不在当前范围。

## 技术栈

- React Router、Vite、TypeScript、React：应用外壳。
- Phaser 3：游戏循环、Tilemap、动画、Arcade Physics、镜头与场景。
- 浏览器 `localStorage`：纯本地存档，不上传服务端。
- 对象存储 + CDN：正式图片，采用项登记在 `deploy/cdn/game-media-manifest.json`。

React 只负责首次/回访入口、角色创建草稿、重开确认、挂载/销毁 Phaser canvas、加载失败状态和论坛 DOM 外链；逐帧位置、输入、动画、碰撞、场景和游戏状态由 Phaser 持有。

## 本地运行

```powershell
npm --prefix .\apps\web install
npm --prefix .\apps\web run dev
```

浏览器地址以 Vite 输出为准；不需要启动 `apps/api/` 或连接数据库。

最小检查：

```powershell
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
```

## 配置

前端环境示例位于 `apps/web/.env.example`。

| 变量 | 用途 |
|---|---|
| `VITE_FORUM_URL` | 普通论坛外链；默认 `https://pingxingxian.space` |
| `VITE_MEDIA_BASE_URL` | 游戏素材运行时基址；默认 `/game-media/v1`，由开发服务器或 Nginx 同源代理到 manifest 的 HTTPS CDN 基址 |

论坛链接在新标签页打开，不读取登录状态，不触发注册，也不共享存档。

## 素材

首片采用 pixel-boy 官方 [Ninja Adventure - Asset Pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) 作为统一视觉基线。官方页面将该包标记为 CC0。

- 只选择首片实际需要的角色、地形、树、石头、住宅、室内和家具素材。
- 男、女角色分别使用同一官方 CC0 固定提交中已核验的 64×112 图集，并以独立不可变对象登记；两者不带职业或属性差异。
- 不把完整素材包或图片二进制提交到 Git。
- 采用项上传不可变对象 key，并登记 URL、字节数、MIME 与 SHA-256。
- 地图、品牌、UI 和玩法表达不得复制《星露谷物语》或其他现有游戏的受保护内容。

完整规则见 [图片与游戏美术资源规范](docs/IMAGE_ASSETS_SPEC.md)。

## 仓库结构

| 路径 | 说明 |
|---|---|
| `apps/web/` | 当前 React Router / Vite / Phaser 游戏 |
| `deploy/cdn/` | 对象存储媒体清单与校验工具 |
| `docs/` | 当前产品、负面边界和资源规范 |
| `.trellis/spec/frontend/` | 当前前端与 Phaser 运行时合同 |
| `apps/api/` | 旧产品后端，待审计清退；新游戏不得依赖 |

既有 Docker、后端和数据库部署说明仍可能描述旧产品；完成独立部署重建前，它们不是本切片的支持启动路径。

## 当前权威文档

- [文档索引](docs/INDEX.md)
- [产品简报](docs/PRODUCT_BRIEF.md)
- [明确不做清单](docs/WHAT_NOT_TO_BUILD.md)
- [图片与游戏美术资源规范](docs/IMAGE_ASSETS_SPEC.md)
- [前端开发规范](.trellis/spec/frontend/index.md)
- [Phaser 像素游戏运行时规范](.trellis/spec/frontend/pixel-game-runtime.md)

## 安全

- 不提交 `.env`、密钥、数据库文件、日志或浏览器存档。
- 未经明确授权不连接、迁移或删除任何旧数据库。
- 删除旧产品代码、资源、配置或部署项前先做引用审计并确认精确范围。
