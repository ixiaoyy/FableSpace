# 回访与关系界面执行计划

## 1. 启动门槛

- [x] 用户确认界面完整优先，功能可后续接入。
- [x] 已拆出独立 P1 跨设备/会话数据接入任务。
- [x] PRD 与设计不新增后端、Schema 或数据库范围。
- [x] `task.py start` 后才修改业务代码。

## 2. 前端实现

- [x] 把首次未登录、会话失效和访问读取失败建模为独立状态。
- [x] 重组运行态为故事主区与连续性侧栏。
- [x] 展示真实关系阶段、变化原因和安全结局摘要。
- [x] 补齐无轮次、无结局、加载、写失败与完成态。
- [x] 保持消息、选择与重新开始请求不做乐观写入或自动重放。
- [x] 完成桌面与 360px 响应式、焦点和 reduced-motion 处理。

## 3. 定向验证

- [x] 搜索新增说明性文案和伪数据模式。
- [x] `npm --prefix .\apps\web run typecheck`
- [x] `npm --prefix .\apps\web run build`
- [x] React Doctor 无本轮回归。
- [x] 浏览器 1280px / 360px 检查公开、登录、会话失效、活动与结局视觉状态；无法从真实服务触达的状态只做代码路径与组件级静态核对，不伪造生产数据。
- [x] 检查 staged snapshot 未依赖未暂存前端文件。

## 4. Review Gates

- [x] 无 API、Schema、数据库和旧 Space 范围变化。
- [x] 无 affinity、玩家标识、私有跨玩家数据和伪回访记录。
- [x] 会话失效不重放写操作。
- [x] 视觉 QA 记录 PASS / FAIL / BLOCKED 及证据。

## 5. 新鲜验证记录

- `npm --prefix .\apps\web run typecheck` → 通过。
- `npm --prefix .\apps\web run build` → 通过。
- `npx -y react-doctor@latest . --verbose --diff` → 100/100，0 issue。
- 说明性文案与敏感字段搜索 → 未新增 `affinity`、`player_id`、旧 Space 或调试输出。
- staged snapshot 只包含 `story-world-character.tsx/.css`；新增 import 均来自已跟踪文件/既有依赖，未引用未暂存首页组件或临时验收文件。

## 6. 视觉验收

**Verdict: PASS**

- 真实本地服务：1280px 与 360px 的公开详情、首次登录门禁通过；360px 实测 `document.scrollWidth=345 < innerWidth=360`。
- 临时合同桩只复用已发布安妮详情、节点、选择与结局文本，用于触达活动轮次、完成轮次和 401 会话失效状态；未连接数据库、未写入产品数据，验收后服务、配置、日志和脚本已全部删除。
- 1280px 活动态实测工作区为 `812px + 288px`，回访侧栏 sticky；完成态的重新开始、关系和安全结局摘要均可见。
- 360px 活动态实测单列 `297px`，选择、输入、关系与结局摘要顺序正确，无页面级横向溢出。
- 会话失效显示独立 `alert` 和当前 Character 深链重新登录动作；QA 页面 console 0 warning / error。
