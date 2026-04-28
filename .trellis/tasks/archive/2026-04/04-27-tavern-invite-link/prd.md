# 酒馆邀请链接

## 背景

C 阶段让店主看到经营反馈，A 阶段让探索者进入后看到回访关系。B 阶段需要一个最小传播闭环：让任意公开可见的酒馆详情页能被复制为邀请链接，便于店主或访客把「这间真实坐标锚定的酒馆」分享出去。

## 目标

- 在酒馆详情页展示一个轻量「邀请链接」卡片。
- 分享内容只来自当前公开 Tavern payload（名称、描述、坐标、链接），不调用 LLM，不生成/写回酒馆内容。
- 支持复制完整邀请文案；浏览器不支持剪贴板时也能手动复制。

## 非目标

- 不使用或修改现有未完成的 `04-27-tavern-share-viral` 任务。
- 不新增后端分享 API，不依赖当前工作区里未确认的 backend share 改动。
- 不做访客好友、动态墙、私信、全局在线状态等社交网络。
- 不做平台自动生成营销文案或酒馆内容。
- 不新增埋点、排行、外部分享 SDK 或依赖。

## 实现范围

- `frontend/app/lib/tavern-share.js`：纯函数，根据 Tavern 和 origin/path 构造分享 URL、标题、摘要、复制文本。
- `frontend/scripts/tavern-share-test.mjs`：覆盖 URL 归一化、文案截断、空描述 fallback、非法 origin/path fallback。
- `frontend/app/routes/tavern.tsx`：添加邀请链接卡与复制状态。
- `frontend/package.json`：接入脚本测试。

## 验收标准

1. 酒馆详情页能看到邀请链接卡。
2. 卡片展示稳定链接和 owner-authored 摘要，不写回 Tavern。
3. 点击复制后优先使用 `navigator.clipboard.writeText`，失败时回退为选中文案/手动复制提示。
4. 新增脚本测试、前端测试、typecheck、build 通过。
