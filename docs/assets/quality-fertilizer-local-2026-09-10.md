# 树液、基础肥料与施肥地面本地素材

制作者：Codex；日期：2026-09-10；版本：local-v1。直接编写 16×16 像素矩阵，未复制原作图像或读取第三方图片像素，未调用图片生成服务。任务与制作过程见 [制作记录](quality-fertilizer-local-2026-09-10.prompt.md)。

源位于 `apps/mirror-island/godot/data/media.json` 的 `items`。沿用 FarmAssets.icon 在内存生成 RGBA 纹理；没有新增 PNG、远端 URL / key 或 CDN 请求，缓存头不适用。树液为金黄色液滴，肥料为浅木色袋装图标，施肥地面为稀疏浅色颗粒。品质使用界面文字与颜色标记，没有额外图片。

| ID | 尺寸 | 格式 / MIME | 源字节 | SHA-256 |
|---|---|---|---:|---|
| sap | 16×16 | JSON / application/json | 392 | `29e9a57f6b0227a4649f7b85180da135fa1d18c307c0a5277ffc0998458dccb1` |
| basic-fertilizer | 16×16 | JSON / application/json | 406 | `a6d3e6ecc06e5740c3397d9588d131cccc69bb7baad86df0bc7f575d68620f0e` |
| fertilizer-soil | 16×16 | JSON / application/json | 364 | `9ec2ccdcc71daf5612c8aac5c3ec6c134e404161261a89b88b38fd85f5e3ba82` |

哈希针对单个定义递归按键排序后的紧凑 UTF-8 JSON。隐藏 Web 实景检查背包两种图标与施肥前后地面变化；未进行真人最终美术验收，没有素材上传或发布。
