# 今晚新增酒馆 NPC 专属头像

## Goal

为今晚新增的两个默认公益酒馆补充角色专属展示头像，让《第三货架后面》和《午夜委托板》的 NPC 在没有店主上传头像时，也能显示与角色设定匹配的酒馆主题形象。

## Requirements

- 为 6 个新增默认角色补充项目内头像资产：
  - `char_pw_9_delta`
  - `char_pw_mu_mu`
  - `char_pw_v17`
  - `char_pw_pi_pi`
  - `char_pw_mozhan`
  - `char_pw_zhideng`
- 头像必须是酒馆/便利店/委托板场景中的角色形象，不使用纯占位图。
- 头像只作为前端展示 fallback；不得写回角色卡，不得覆盖店主自定义 `sprites` / `avatar` / `image_url`。
- 资产放在 `frontend/app/assets/npc-style-cast/portraits/` 下，并由现有 `tavern-npc-stage` 解析逻辑消费。
- 保持 SillyTavern 兼容与现有后端 TavernCharacter schema 不变。

## Acceptance Criteria

- [x] 6 个角色在无自定义头像时解析到各自专属项目头像。
- [x] 现有通用风格 fallback 仍可服务其他角色。
- [x] 店主上传或角色卡自带头像字段仍优先于项目 fallback。
- [x] 前端 typecheck 和 build 通过，或如实记录失败原因。

## Technical Notes

- 仅修改前端展示资产与头像目录解析，不新增 API、数据库字段或后端 schema。
- 使用内置 image generation 工具生成项目绑定 PNG，再复制到仓库资产目录。
- 若需要记录生成提示词，可更新 `frontend/app/assets/npc-style-cast/README.md`。
