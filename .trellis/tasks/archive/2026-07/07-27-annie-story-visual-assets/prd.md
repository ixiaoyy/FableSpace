# 安妮故事视觉素材补全

## Goal

在剧情与交互稳定后，为安妮故事补充真正参与情绪表达的正式视觉素材，而不是
提前用批量图片掩盖玩法缺口。

## Requirements

- 本任务依赖安妮剧情、LLM 边界和交互任务完成。
- 先审计当前首页头像、代码生成宽街氛围图和各节点实际视觉需求，再确定最小
  资产清单。
- 角色素材必须保持安妮约十岁、原创、非真人、非恋爱、非性化和历史服装边界。
- 正式采用的图片先上传 `fablespace/media/v1/` 不可变 key，登记
  `deploy/cdn/media-manifest.json`，再由代码引用 HTTPS URL。
- Character 表情组必须有完整 prompt sidecar、identity locks、尺寸、hash、
  prompt_type 和核验时间；Git 不保存图片二进制。
- 不把动态文字、来源说明或玩家状态烘焙进图片。
- 若审计证明新增资产不能改善节点辨识或关系表达，应记录 no-add Verdict，
  不为完成任务而生成无用途图片。

## Acceptance Criteria

- [x] 形成节点/关系阶段到视觉需求的审计清单和采用/不采用 Verdict。
- [ ] 所有采用资产均有不可变 CDN URL、manifest 记录和合规 sidecar。
- [ ] 安妮身份、年龄、服装和非真人风格在全部采用资产中一致。
- [ ] 代码不引用本地图片路径，Git 跟踪图片二进制为零。
- [ ] CDN 真实读取、尺寸、格式、字节数和 SHA-256 验证通过。
- [ ] 加载新资产的前端 build 与移动端视觉验收通过。

## Current Gate

2026-07-27 审计结论为 `HOLD`：新增关系表情可以改善辨识，不采用 no-add
结论；但本机没有对象存储写入配置，且现有正式头像的 CDN `Cache-Control`
为 `public, max-age=86400`，不满足不可变资源要求。进入实现前须先完成
`audit.md` 中的解除阻塞条件。

## Out of Scope

- 修改剧情、LLM 行为、关系规则或 StoryWorld Schema。
