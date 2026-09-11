# 清新田园基础工具：本地 Godot 接入

本文保留 2026-09-08 的制作与本地接入历史。2026-09-11 已完成正式上传登记，旧候选命令和覆盖分支已删除；当前运行方式见 [正式采用记录](pastoral-tools-published-2026-09-11.md)，不要继续使用下方历史命令。

用户要求实际替换新素材后，五件基础工具已接入同一 Godot 运行时的显式本地美术构建。工具栏、背包与手持共用新图集。本记录不表示 CDN 上传或正式发布。

## 文件与来源

- 制作者：镜像岛项目通过 Codex 内置 OpenAI ImageGen 辅助制作；没有采用新的第三方图片。
- 输入为 `artifacts/tool-materials-2026-09-08/tools-candidate-v2.png`，SHA-256 为 `6fa232dc5e6b55f75272b4adcd4c0e0ff8d4e01cfc99a35e16a45483da712330`。原图为 RGB，棋盘格不是真实透明。
- 原始生成与透明尝试的真实提示词见 [提示词记录](pastoral-tools-local-2026-09-08.prompts.json)。机械处理、源裁切框、尺寸、握点与文件哈希见 [处理记录](pastoral-tools-local-2026-09-08.metadata.json)。
- 本地处理配方保存在 `artifacts/tool-materials-2026-09-08/prepare-runtime.py`：浅色中性背景从边缘四连通去底，水壶两个开口另设种子；保留图标内部未连通的金属高光。按 alpha 包围盒裁切，最近邻缩放到最长边 56，再放入 64 × 64 格。没有重绘或伪称逐像素手绘。
- 输出为 `tools-runtime-v1.png`，320 × 64，RGBA，15,770 bytes，MIME `image/png`，SHA-256 `367ed6a3d822a2e652a46ac5e595aefa344d3828976568b500c8efc1cda4f55b`。有真实 alpha，五处握点采样均为不透明像素。
- 顺序为 hoe、watering-can、axe、pickaxe、scythe。物品 ID、数量、既有名称与升级规则不变。金属升级对照稿保留为后续版本设计，不在本轮新增玩法等级。

## 本地运行

在 `apps/mirror-island/` 执行：

```powershell
npm run dev:tool-art
```

该命令按哈希校验本地候选，导入并检查 Godot，导出 Web/Windows，然后在 `http://127.0.0.1:8080/` 提供试玩。只构建可用 `npm run build:tool-art`；构建后也可以运行 `npm run godot:run` 或 `godot/exports/windows/mirror-island.exe`（保留旁边的 pck）。

`scripts/content/tool-art-preview.json` 是本地候选登记。仅 `--tool-art-preview` 准备会生成固定的 `generated/tool-art-preview.json` 与 PNG。FarmAssets 在该构建中替换五个图标定义；不建立第二套引擎或游戏状态。

普通 `build:client`、`build:windows`、`dev` 的准备会清除未发布候选，继续使用正式 manifest。候选未被写入正式 CDN manifest，也没有预填未上传 URL。干净检出若没有本地候选文件，美术构建会明确失败，不能以旧图标掩盖文件缺失。

## 手持与验证

新工具按握点旋转，并将图集尺寸归一到世界尺度：锄头/斧头/镐为 18，水壶为 14，镰刀为 16。四方向采用人物实际手部附近的偏移；背向时工具位于人物后方。保留原来的 0.12 秒命中、0.16 秒恢复与一次领域命令。

隔离的内存会话已检查真实工具栏、背包、手机布局与五件工具四方向共二十个动作，日志为 `NEW TOOL ART PASSED`，没有读取或写入玩家槽。已查看实际截图并修正浮空握点与水壶比例；这不是完整真人玩法或真机触控验收。

普通准备移除候选的隔离检查通过。最终 Godot 检查与本地美术 Web/Windows 导出日志在 `artifacts/tool-materials-2026-09-08/`；PNG 和截图不进入 Git。

## 正式发布与回退

正式采用仍需针对该图集明确授权上传新的不可变 `game/media/v1` 对象，回读核验 MIME、字节、哈希与缓存头，再替换正式媒体定义。此次没有上传、部署、提交或推送。

本地回到正式素材可执行普通构建；不涉及存档迁移。若撤销代码，只精确撤销本轮候选读取、握点支持与图标尺寸差异，保留之前的工具栏和引擎迁移改动。
