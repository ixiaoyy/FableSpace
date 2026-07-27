# 安妮故事视觉素材审计

审计时间：2026-07-27

## Verdict

`HOLD`

新增素材能够改善关系阶段辨识，因此不采用 no-add 结论；当前不能进入正式
生成与接入，因为对象存储写入条件缺失，且现有 CDN 缓存策略未达到不可变
资源要求。未生成本轮候选图，未修改产品代码、manifest 或图片 sidecar。

## 已有视觉与实际用途

| 视觉 | 当前用途 | 能表达什么 | 不能表达什么 |
|---|---|---|---|
| 安妮首页头像 | 首页角色卡、抽屉和浮层 | 安妮的基础身份、年龄、服装和画风 | 故事页关系变化、节点阶段 |
| `HistoricalBroadStreetVisual` | 故事页 hero；旧 Space 页面 | 宽街、水泵、雨夜和陶罐的地点氛围 | 安妮的细微情绪与关系变化 |
| 关系文字与时间线 | 故事页连续性栏和事件流 | 精确说明关系阶段与变化原因 | 快速的非文字情绪辨识 |

现有安妮头像的代码引用仅在首页发现组件；故事页没有加载该头像。故事页
使用代码生成 SVG，不需要也不应改为仓库图片二进制。

## 节点与关系阶段映射

| 内容阶段 | 主要节点 | 关系阶段 | 视觉需求 |
|---|---|---|---|
| 开场 | `node_water_request` | `guarded` / `watchful` | 紧抱陶罐、视线谨慎；不能表现惊恐、受伤或成人化姿态 |
| 调查 | `node_ask_pump`、`node_trace_water`、`node_walk_together`、`node_doctor_list`、`node_trace_source`、`node_doorstep`、`node_contrast_sources` | `watchful` / `walking_together` | 保持同一服装和构图，仅让视线更直接、姿态稍放松 |
| 记录 | `node_record_testimony`、`node_record_wary` | `walking_together` / `trusting` | 表现愿意讲述或重新戒备；不使用夸张喜怒哀乐 |
| 结局 | `node_trust_ending`、`node_safe_ending`、`node_repaired_ending`、`node_wary_ending`、`node_distant_ending` | 最终关系阶段 | 由最终关系选择表情，不为五个结局各做一张近似图片 |

## 最小资产清单

采用“一个中性基准 + 两个关系变体”，避免按 15 个节点批量生成同质图片：

1. `watchful`：复用现有中性头像作为身份基准；正式接入时纳入组级 sidecar。
2. `walking_together`：相同服装、镜头与背景，目光更直接，肩部略放松。
3. `trusting`：相同身份锁，轻微安心而非大笑、依恋或亲密姿态。

`guarded` 继续使用 `watchful` 基准图与明确关系文字，不额外生成近似变体。
节点辨识继续由 hero 场景、节点标题和叙事承担；不把文字、来源、玩家状态或
历史结论烘焙进图片。

建议不可变对象 key：

```text
app/assets/story-worlds/history_broad_street_water_1854/characters/char_history_broad_street_annie/watchful-v1.webp
app/assets/story-worlds/history_broad_street_water_1854/characters/char_history_broad_street_annie/walking-together-v1.webp
app/assets/story-worlds/history_broad_street_water_1854/characters/char_history_broad_street_annie/trusting-v1.webp
```

## 合规身份锁

- 原创、非真人、约十岁的 1854 年伦敦儿童历史见证者。
- 深色凌乱头发、灰绿色眼睛、雀斑、旧海军蓝羊毛斗篷和朴素时期服装。
- 非摄影、非 cosplay、非名人脸、非现有 IP、非在世艺术家模仿。
- 不恋爱、不暧昧、不性化、不诱导依附；无血腥、伤口、惊悚或剥削性痛苦。
- 表情变化只服务于 `guarded`、`watchful`、`walking_together`、
  `trusting` 的关系辨识，不暗示史实改变。

## 实测证据

- Git 跟踪图片二进制：`0`。
- `CDN_S3_BUCKET`、`CDN_S3_ENDPOINT_URL`、`CDN_S3_ACCESS_KEY_ID`、
  `CDN_S3_SECRET_ACCESS_KEY`、`CDN_S3_PREFIX`、`CDN_BASE_URL`：
  当前进程均未配置；检查只记录是否存在，未读取或输出任何密钥。
- 现有正式头像 CDN 读取：HTTP `200`、`image/webp`、`234132` bytes、
  SHA-256
  `6847e27c39dcea7526ddf6dae8beb76864b52f9493ed3a1213d5355fe4aea88b`，
  与 manifest 和 sidecar 一致。
- 现有头像 CDN `Cache-Control`：
  `public, max-age=86400`；规范要求
  `public,max-age=31536000,immutable`，因此当前 CDN/源站策略需先修正。
- 本轮没有调用图片生成工具；`.codex/generated_images` 中已有文件均不是
  本轮产物，也未被本任务采用或引用。

## 解除阻塞条件

1. 在受控环境提供只允许写目标桶/前缀的 S3 兼容凭据，或由部署负责人执行
   上传；不要把凭据写入仓库或聊天。
2. 修正 CDN/源站缓存策略，并重新验证现有正式头像返回
   `public,max-age=31536000,immutable`。
3. 以现有正式头像作为身份参考，生成两个关系变体，人工核验儿童安全、
   历史服装、原创身份和非真人风格。
4. 转为 WebP，核对尺寸、字节数与 SHA-256，上传三个不可变 key。
5. 更新 `deploy/cdn/media-manifest.json` 和组级
   `expression-set.prompt.md`，再让前端按关系阶段选择 CDN URL。
6. 运行 manifest/CDN 真实读取校验、前端 build 和移动端视觉验收。
