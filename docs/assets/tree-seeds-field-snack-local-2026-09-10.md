# 三种树种子与野外小吃本地像素素材

制作者：Codex；日期：2026-09-10；版本：local-v1。枫树种子、橡子、松果和野外小吃均由本轮直接编写 16×16 像素矩阵，没有复制原作图像、读取第三方图片像素或调用图像生成服务。真实任务上下文见 [prompt 记录](tree-seeds-field-snack-local-2026-09-10.prompt.md)。

权威源位于 `apps/mirror-island/godot/data/media.json` 的对应 `items`。现有 `FarmAssets.icon()` 在内存生成 RGBA 纹理，没有新增 PNG、远端对象或 CDN key。三种种子分别采用翼状枫籽、带帽橡子和鳞片松果轮廓；野外小吃为叶片包裹的坚果条。树木本体仍沿用当前通用外观，本批没有伪造三树种已具备独立树形。

| 项目 | 尺寸 | 源定义格式 / MIME | 源定义字节 | SHA-256 |
|---|---|---|---:|---|
| maple-seed | 16×16 | 原生 pixels JSON / application/json | 392 | `acfd1b04e0bf5439e96306a6ec7273ea95bae46bca33697903c6f70308df7a47` |
| acorn | 16×16 | 原生 pixels JSON / application/json | 392 | `1491beb4d9e32ec5a54a3f73c855d6f4732ec8a913388ec15570434d5240552b` |
| pine-cone | 16×16 | 原生 pixels JSON / application/json | 392 | `475aeb9c766c2e9649eadef8e5f03a09fe1e5aed364d67087b5cd9aa4dcfcab9` |
| field-snack | 16×16 | 原生 pixels JSON / application/json | 434 | `6d703c95e241d8c865c96f64394d01f7866db656c690eccf709b1ce4790c15c0` |

哈希针对单个定义，递归按键排序后使用无多余空格的 UTF-8 JSON 计算，不是 PNG 哈希。隐藏 Web 隔离新档实际检查了三种材料图标、配方行、制作结果和背包详情；材料从各 1 变为 0，生成野外小吃 1，显示 20g / `食用 +45 体力`。临时等级、配方和材料已恢复，最终导出不含诊断状态；真人砍树掉落、真机和最终美术仍待验收。
