# 野山葵与蒲公英本地像素素材

制作者：Codex；日期：2026-09-10；版本：local-v1。两张图均为本轮直接编写的 16×16 像素矩阵，没有复制原作图像、读取第三方图片像素或调用图像生成服务。真实任务上下文见 [prompt 记录](spring-forage-completion-local-2026-09-10.prompt.md)。

权威源位于 `apps/mirror-island/godot/data/media.json` 的 `items.wild-horseradish` / `items.dandelion`，由现有 `FarmAssets.icon()` 在内存生成 RGBA 纹理；没有新增 PNG、远端对象或 CDN key。野山葵使用深浅绿叶与暖棕根体，蒲公英使用圆形黄色花冠与锯齿感绿叶，沿用当前清新田园配色。两者是本地功能素材，最终美术质量仍需真人验收。

| 项目 | 尺寸 | 源定义格式 / MIME | 源定义字节 | SHA-256 |
|---|---|---|---:|---|
| wild-horseradish | 16×16 | 原生 pixels JSON / application/json | 406 | `dce752b663e8014bac6afcb5a0b93e878552c0f68528ee059ab5b44636ae07fc` |
| dandelion | 16×16 | 原生 pixels JSON / application/json | 392 | `4b4a9ccb81b122f27ec68085f3a86881d2c27dfba4d4339109f22a1829401e91` |

哈希针对单个 `items` 定义，递归按键排序后使用无多余空格的 UTF-8 JSON 计算，不是 PNG 哈希。隐藏 Web 隔离新档实际检查了快捷栏与背包详情：野山葵显示 50g / `食用 +13 体力`，蒲公英显示 40g / `食用 +25 体力`。临时起始物品已恢复，最终导出不含诊断物品；没有完成真机或最终美术验收。
