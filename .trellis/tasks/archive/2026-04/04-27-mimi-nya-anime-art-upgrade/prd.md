# 眯眯喵桑二次元美术升级 PRD

## 问题

当前 `frontend/public/assets/npcs/mimi-nya-*.png` 是程序生成的低保真临时图，角色脸型、服装、美术完成度和“二次元卡通美少女猫娘”风格不匹配，不能作为正式 NPC 美术验收结果。

## 目标

将「眯眯喵桑」专属头像 / 立绘 / 表情差分升级为正式二次元卡通美少女猫娘风格，贴合 FableMap 赛博酒馆主题。

## 风格要求

- 原创二次元 / anime game-style 美少女猫娘。
- 成年角色气质；白毛、猫耳、猫尾。
- 西式 JK / 学院风过膝袜元素，但保持安全非露骨。
- 半身或腰部以上头像，适合 256×256 角色头像展示。
- 背景必须有酒馆/赛博酒馆语义：吧台、酒杯、木架、猫铃、地图桌、霓虹窗、终端光等。
- 表情差分：neutral、happy/joy、angry/anger、shy/embarrassment、curious/curiosity。
- 禁止：低保真几何图、抽象占位、纯色背景、IP/名人/特定画师模仿、露骨性化。

## 需替换文件

- `frontend/public/assets/npcs/mimi-nya-neutral.png`
- `frontend/public/assets/npcs/mimi-nya-joy.png`
- `frontend/public/assets/npcs/mimi-nya-anger.png`
- `frontend/public/assets/npcs/mimi-nya-embarrassment.png`
- `frontend/public/assets/npcs/mimi-nya-curiosity.png`

## 验收

- 以上 5 张图全部替换为高质量二次元卡通美少女猫娘风格。
- 文件仍为 PNG，路径不变，现有 payload 不需要再改。
- 运行现有默认酒馆测试确认文件存在。
- 前端 build 通过。
- 视觉人工检查：不再像占位图，能一眼看出“猫娘 + 酒馆/赛博酒馆”。
