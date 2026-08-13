# Ninja Adventure 首片素材记录

## Source and license

- 作者：Pixel-Boy 与 AAA
- 官方发布页：`https://pixel-boy.itch.io/ninja-adventure-asset-pack`
- 官方示例仓库：`https://github.com/pixel-boy/NinjaAdventure`
- 固定源码提交：`6ac78232d5aedcc85ce5f27d060ea92366f7c24a`（2024-04-19）
- 授权：Creative Commons Zero v1.0 Universal（CC0-1.0）
- 本记录核验日期：2026-08-13

官方 itch.io 页面明确允许将包内素材用于个人与商业游戏，署名非强制但受欢迎。本项目仍在 README 与本记录中保留来源。

## Adopted files

| 用途 | 官方仓库路径 | 原始尺寸 | 处理 | 最终对象 key |
|---|---|---:|---|---|
| 玩家四向精灵 | `content/character/ninja_blue/sprite.png` | 64×112 | 原始 PNG，不裁切；运行时按 16×16 frame 读取 | `assets/vendor/ninja-adventure/2024-04-19/player.png` |
| 女玩家四向精灵 | `content/character/samurai_green/samurai_green.png` | 64×112 | 原始 PNG，不裁切；运行时按 16×16 frame 读取 | `assets/vendor/ninja-adventure/2024-04-19/player-female.png` |
| 农场地面 | `content/map/tileset_floor.png` | 352×417 | 原始 PNG，不裁切；运行时读取审核 frame | `assets/vendor/ninja-adventure/2024-04-19/floor.png` |
| 树、石头与住宅 | `content/map/tileset_village_abandoned.png` | 320×192 | 原始 PNG，不裁切；运行时登记审核 region | `assets/vendor/ninja-adventure/2024-04-19/village.png` |
| 住宅地板 | `content/map/tileset_interior_floor.png` | 352×272 | 原始 PNG，不裁切 | `assets/vendor/ninja-adventure/2024-04-19/interior-floor.png` |
| 住宅墙体 | `content/map/tileset_wall_simple.png` | 160×176 | 原始 PNG，不裁切 | `assets/vendor/ninja-adventure/2024-04-19/wall.png` |

精确 bytes、SHA-256、MIME 与 CDN URL 以 `deploy/cdn/game-media-manifest.json` 为准。

角色创建将上述两套图集分别作为“男角色 / 女角色”外观。两者只改变可见外观，不附带职业、属性或玩法差异；用户标签是本项目界面分类，不主张官方素材角色的剧情身份。

## Project-original runtime art

官方 2026-03-29 更新已包含 sleeping roll / bed / camping 图集，但公开 Godot 仓库未同步该版本，且当前未核实完整 ZIP 内的精确路径。首片的床和少量室内小物使用 Phaser Graphics 生成的项目原创像素图形：不复制其他游戏资产、不从 itch 预览图裁切，也不产生需要进入 Git 的图片二进制。取得并核验官方完整包后，可在新对象 key 下单独替换。
