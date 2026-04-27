# 探索者转店主入口

## 背景

完成 C/A/B 后，探索者能看到活跃感、回访反馈与邀请链接。D 阶段需要把「我也想开一间」变成低摩擦入口，同时保持主人主权：不能复制别人的酒馆内容，只能带入坐标/地址这类真实空间锚点。

## 目标

- 在酒馆详情页提供「在附近开自己的酒馆」CTA。
- CTA 跳转到 `/create` 并预填当前酒馆的真实坐标/地址。
- `/create` 接收 query 参数作为默认值，同时明确提示不会复制原酒馆内容。

## 非目标

- 不复制 tavern name / description / scene_prompt / characters / world_info。
- 不新增后端接口或 schema。
- 不做推荐算法、排行榜、付费升级、平台自动生成酒馆内容。

## 实现范围

- `frontend/app/lib/creator-conversion.js`：构建安全的 create 链接与 query 预填默认值。
- `frontend/scripts/creator-conversion-test.mjs`：覆盖仅传坐标/地址、非法输入 fallback、不复制 owner-authored 内容。
- `frontend/app/routes/tavern.tsx`：增加探索者转店主 CTA 卡。
- `frontend/app/routes/create.tsx`：读取 query defaults 并展示来源提示。
- `frontend/package.json`：接入脚本测试。

## 验收标准

1. 酒馆页 CTA 链接包含 lat/lon/address/source_tavern，不包含 name/description/scene_prompt。
2. create 页能从 query 预填坐标/地址。
3. create 页提示「只带入空间锚点，不复制原酒馆内容」。
4. 前端测试、typecheck、build 通过。
