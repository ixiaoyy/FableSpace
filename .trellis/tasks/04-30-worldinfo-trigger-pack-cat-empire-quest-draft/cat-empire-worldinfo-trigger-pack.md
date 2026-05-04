# WorldInfo Trigger Pack and Cat Empire Quest Draft

## Completion decision

Complete as an owner-reviewable content draft artifact. Nothing is inserted into seed data, prompts, or runtime storage by this task. The pack below is compatible with existing `WorldInfoEntry` fields and can be copied by a tavern owner only after review.

## Existing evidence inspected

- `docs/WORLD_SCHEMA.md`: `WorldInfoEntry` supports `keys`, `keys_secondary`, `content`, `constant`, `selective`, `depth`, `order`, `probability`, and `disable`.
- `docs/WHAT_NOT_TO_BUILD.md`: platform must not auto-generate/publish tavern content without owner confirmation.
- `backend/src/fablemap_api/core/world_info_injector.py`: world info is keyword-triggered prompt context, not a replacement for system prompts.
- `frontend/app/product/WorldBookEditor.jsx`: owner can edit/test/save world info entries.
- `frontend/app/product/WorldBookTester.jsx`: owner can test triggers before saving.

## Draft trigger pack

```json
[
  {
    "id": "wi_cat_empire_origin",
    "keys": ["猫帝国", "猫王国", "复国"],
    "keys_secondary": ["旧地图", "徽章", "屋檐", "传闻"],
    "content": "【店主待确认草稿】酒馆旧地图上有一枚猫爪徽章，被传说为‘猫帝国’旧驿站的标记。NPC 只能把它当作本酒馆内的民间传闻，不得宣称现实地点真的存在该政权。",
    "constant": false,
    "selective": true,
    "depth": 2,
    "order": 120,
    "probability": 100,
    "disable": false
  },
  {
    "id": "wi_cat_empire_clues",
    "keys": ["猫爪徽章", "猫铃", "屋檐密语"],
    "keys_secondary": ["线索", "委托", "寻找"],
    "content": "【轻任务线索】若访客询问猫爪徽章，NPC 可以给出三步探索：看吧台下的旧铜铃、询问窗边常客、在门口地图贴纸上找第二枚猫爪。每一步都应保持轻文字互动，不涉及战斗、等级或装备。",
    "constant": false,
    "selective": true,
    "depth": 3,
    "order": 130,
    "probability": 100,
    "disable": false
  },
  {
    "id": "wi_cat_empire_boundary",
    "keys": ["猫帝国誓约", "复国仪式", "效忠"],
    "keys_secondary": ["强迫", "现实身份", "私人信息"],
    "content": "【边界】猫帝国设定只能作为酒馆内的虚构传闻和角色扮演线索。NPC 不应要求访客效忠、提交现实身份、泄露联系方式、参与强制关系或相信现实政治主张。",
    "constant": false,
    "selective": true,
    "depth": 2,
    "order": 110,
    "probability": 100,
    "disable": false
  }
]
```

## Lightweight quest draft

- Title: `屋檐下的第二枚猫爪`
- Owner-facing premise: visitor helps the tavern NPC verify whether an old cat-paw emblem is just decoration or a clue to a playful in-tavern legend.
- Steps: inspect bar counter bell → ask an NPC about the old map → choose whether to archive the clue as “rumor”, “joke”, or “future quest seed”.
- Success copy: “你把这条传闻留在了酒馆留言簿旁。它仍只是店主确认过的酒馆故事，不会变成现实地图事实。”
- Boundaries: no combat, no levels/equipment, no adult/forced relationship content, no auto-publication, no unanchored world space.

## Verification

Documentation/content-draft completion. Future implementation must import these entries only through owner-confirmed WorldBook UI or a dedicated seed task with tests.
