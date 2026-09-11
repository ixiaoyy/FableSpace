# 清新田园基础工具正式采用

五件基础工具已于 2026-09-11 上传到正式 CDN，并纳入 `deploy/cdn/game-media-manifest.json`。Godot 的工具栏、背包、技能图标与手持动作通过同一个 `FarmAssets` 读取正式图集；普通 Web / Windows 构建直接使用新版。

## 来源与对象

- 图集由镜像岛项目通过 OpenAI ImageGen 辅助制作；本次复用此前已完成的透明切片，没有重新生成图片。
- 原始提示词保存在 [生成记录](pastoral-tools-local-2026-09-08.prompts.json)，源图哈希、透明处理与握点保存在 [处理记录](pastoral-tools-local-2026-09-08.metadata.json)。其中 `local-tool-art` 是制作阶段的历史名称，不再是运行时入口。
- 正式对象：`game/media/v1/assets/original/pastoral-tools/2026-09-08-v1/tools-runtime-v1.png`。
- [CDN 图集](https://img.pingxingxian.space/game/media/v1/assets/original/pastoral-tools/2026-09-08-v1/tools-runtime-v1.png)：320×64，RGBA PNG，15,770 字节，`image/png`。
- SHA-256：`367ed6a3d822a2e652a46ac5e595aefa344d3828976568b500c8efc1cda4f55b`。
- CDN 回读状态为 `200`，缓存为 `public, max-age=31536000, immutable`；回读文件与本地图集字节哈希一致。
- 发布配置提交：`502dca99`，仅修改素材上传白名单；[上传任务 34586654800](https://github.com/ixiaoyy/FableSpace/actions/runs/34586654800) 成功。

## 切片与手持

每格 64×64，y 坐标均为 0。下表握点是格内坐标，手持尺寸沿用此前实景调试结果。

| 物品 | x | 握点 | 手持尺寸 |
|---|---:|---|---:|
| 锄头 `hoe` | 0 | 8,52 | 18 |
| 喷壶 `watering-can` | 64 | 26,18 | 14 |
| 斧头 `axe` | 128 | 11,50 | 18 |
| 十字镐 `pickaxe` | 192 | 10,53 | 18 |
| 镰刀 `scythe` | 256 | 18,50 | 16 |

正式定义位于 `apps/mirror-island/godot/data/media.json`，使用同源 `/game-media/v1/` URL。`prepare-godot.mjs` 按正式清单校验并准备图集，缺失或哈希不一致会失败，不会改用旧工具。

## 旧入口清理与交付范围

已删除五件工具的旧 16×16 像素矩阵、运行时候选覆盖分支、候选构建分支、候选 JSON 及三条 `tool-art` 命令；旧候选 PNG、登记文件和对应导入缓存也已精确清除。其它物品仍使用的像素渲染方法、物品 ID、数量、品质、工具动作与存档格式保持原样。

后续直接使用 `npm --prefix apps/mirror-island run build:client` 或 `build:windows`。历史制作稿与来源记录保留在非运行目录，不能再作为备用素材入口。

普通 Web / Windows 构建与 33 项场景检查已通过；两次独立素材准备后，生成映射仍是 `res://media/367ed6a3d822-tools-runtime-v1.png`，哈希匹配正式清单，旧候选文件均不存在。正式清单共登记 22 张图片，Git 跟踪图片二进制为零。验证记录在 `artifacts/ui-polish-2026-09-11/published-tools-cdn-check.json`，普通构建日志为同目录 `published-normal-web.log`、`published-normal-windows.log` 与 `published-normal-views.log`。

此次远端发布只有一张工具 PNG，未上传整个素材目录、未覆盖其它对象，也未部署游戏。正式引用和清理代码只在当前工作区暂存；发布配置的单文件提交已推送。图片二进制不进入 Git。

如后续调整美术，使用新版本对象 key 并更新清单与切片；不要覆盖已发布对象。此次不涉及数据库或存档迁移，真人动作手感和真机观感仍需单独验收。
