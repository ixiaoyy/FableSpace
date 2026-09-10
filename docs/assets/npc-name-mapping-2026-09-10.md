# 居民名称映射（2026-09-10）

本批按用户确认，将当前八名居民的显示名统一为与其职责对应的《星露谷物语》简体中文参考名。名称只作用于运行时可见文本，不改变既有数据身份。

| 稳定 `npcId` | 原显示名 | 当前显示名 | 参考职责 |
| --- | --- | --- | --- |
| `seed-keeper` | 华强 | 皮埃尔 | 种子店与农资 |
| `town-blacksmith` | 昊天 | 克林特 | 铁匠铺与工具升级 |
| `town-resident-01` | 阿禾 | 艾芙琳 | 花园与日常照料 |
| `town-resident-mozi` | 墨子 | 罗宾 | 木匠服务与建筑 |
| `town-resident-haonan` | 浩南 | 德米特里厄斯 | 山地观察与研究 |
| `town-resident-alan` | 阿澜 | 莉亚 | 河岸观察与绘图 |
| `town-resident-haomeili` | 昊美丽 | 艾米丽 | 裁缝与修补 |
| `town-resident-xiangzi` | 祥子 | 威利 | 湖岸旧码头与钓鱼 |

已同步 `data/dialogues.json`、`data/rules.json`、居民提示和服务界面。贴图资源键、`baseDialogueId`、日程、喜好、关系字段与存档版本均保持原值，因此不需要迁移已有本地存档。

验证：运行时旧名字检索为 0；八个 `baseDialogueId` 的说话人均与映射一致；稳定 `npcId` 集合保持不变；NPC 资源校验通过 `8 mappings / 96 frames`。
