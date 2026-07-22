# Implementation Plan

## 1. Lock the canon

- [x] 审阅 `research/historical-canon.md`，把可直接写入剧情的史实与仅可作为剧情设定的内容分开。
- [x] 清除“Snow 正在靠画图发现水泵”与“拆泵柄立刻终结疫情”等误导表达。

## 2. Build the complete story graph

- [x] 为安妮创建专用 Gameplay definition，保持既有 ID 与 Schema。
- [x] 实现三个入口分支、证词判断、至少三个私人完成结局。
- [x] 校验所有节点和选择链接闭合，固定历史在所有分支一致。
- [x] 更新确定性回复，使无模型路径仍能维持安妮视角和史实边界。

## 3. Integrate the mobile story experience

- [x] 集中声明安妮 Gameplay ID 与识别逻辑。
- [x] 新增无玩法说明文字的安妮剧情面板。
- [x] 进入安妮后自动开始/恢复 session。
- [x] 选择动作同时写入私聊并推进 Gameplay session。
- [x] 隐藏安妮页面的通用任务、开口模板和无关干扰。
- [x] 增加玩家主动打开的史料面板，按节点解锁史实/剧情设定条目。

## 4. Verify

- [x] 运行后端定向剧情图校验和 Python 语法检查。
- [x] 运行前端 typecheck 与 build。
- [x] 运行 React 质量检查并处理本次引入的问题。
- [x] 在 390×844 窄屏真实走通开场、分支、结局、回访和史料页。
- [x] 完成史实与视觉对抗式自审，记录 PASS / FAIL / BLOCKED 及证据。

## 5. Record completion

- [x] 更新本任务实现记录、验证结果和剩余风险。
- [x] 只纳入本任务文件；保留工作区内其他既有改动。
