/**
 * Story Microgame Templates
 *
 * Lightweight narrative microgame templates (3–5 steps) that complement
 * the existing 10 owner gameplay templates in ownerGameplayTemplates.js.
 *
 * Categories: 剧情 (narrative), 故事 (story), 目标 (goal-driven)
 * Each template generates a GameplayDefinition-compatible structure.
 *
 * 参考 PRD Approach A1:
 * - "救场/判词"型：3–5 步剧情选择
 * - "误会/线索"型：多分支小互动
 * - "目标驱动"型：到达目标才算完成，可复玩
 */

import { createBlankGameplay } from './GameplayDefinitionEditor.jsx'

export const STORY_GAMEPLAY_CATEGORIES = ['全部', '剧情', '故事', '目标驱动', '抉择']

export const STORY_GAMEPLAY_TEMPLATES = [
  {
    id: 'rescue-judgment',
    category: '剧情',
    badge: '判词',
    title: '救场判词',
    duration: '4-6 分钟',
    bestFor: '医院、调解室、应急站、社工空间',
    entryLabel: '介入判词',
    summary: '3–5 步剧情选择，帮访客在高压场景中做出不后悔的小决定。',
    goal: '让访客描述当前处境，从 3 步以内找到一个最小行动，然后记录这个决定。',
    tone: '克制、尊重当事人判断力、不承诺结果。',
    materials: ['判词卡', '小决定记录', '紧急热线提示'],
    rewardText: '你已经做了一个决定。它可能不完美，但它是你的。',
    nodes: [
      {
        id: 'start',
        title: '处境说明',
        prompt: '请访客用一句话说明现在最需要解决的那件事。',
        choices: [
          { id: 'stakeholders', label: '说说涉及的人', next_node_id: 'stakeholders' },
          { id: 'direct', label: '直接说我想做的那件事', next_node_id: 'action' },
        ],
      },
      {
        id: 'stakeholders',
        title: '涉及的人',
        prompt: '请访客简单说明每一方最在乎的事（不索取隐私细节）。',
        choices: [{ id: 'action', label: '那我现在能做的一件小事是...', next_node_id: 'action' }],
      },
      {
        id: 'action',
        title: '最小行动',
        prompt: '请访客说出一件今天能做的、最小风险的小行动。不要多，只要一件。',
        choices: [
          { id: 'confirm', label: '这件事我决定去做', next_node_id: 'confirm' },
          { id: 'replace', label: '换一个更小的事', next_node_id: 'action' },
        ],
      },
      {
        id: 'confirm',
        title: '记录决定',
        prompt: '把这件事记录下来。写下"我已经决定做..."，并注明今天什么时间前。',
        choices: [{ id: 'complete', label: '完成判词', next_node_id: 'complete' }],
      },
      { id: 'complete', title: '判词完成', prompt: '这个决定已经是你的了。记得给自己一点耐心。', choices: [] },
    ],
  },
  {
    id: 'misunderstanding-clue',
    category: '故事',
    badge: '误会',
    title: '误会澄清',
    duration: '3-5 分钟',
    bestFor: '社区空间、咖啡馆、宿舍、亲子角',
    entryLabel: '解开一个误会',
    summary: '多分支小互动，帮访客从多个视角重新审视一个误会。',
    goal: '让访客描述一个未解决的误会，用多视角拆解后找到下一步沟通动作。',
    tone: '中立、不站队、帮助访客自己找到答案。',
    materials: ['误会登记卡', '多视角镜', '沟通便签'],
    rewardText: '误会没有被消除，但你已经看见了更多。',
    nodes: [
      {
        id: 'start',
        title: '描述误会',
        prompt: '请访客用一段话描述这个误会。不要说对方坏话，只要说清楚。',
        choices: [
          { id: 'my_view', label: '先说我的视角', next_node_id: 'my_view' },
          { id: 'their_view', label: '先猜对方的视角', next_node_id: 'their_view' },
        ],
      },
      {
        id: 'my_view',
        title: '我的视角',
        prompt: '请访客说完后，简要复述，不评价。然后问：对方可能看到了什么？',
        choices: [{ id: 'their_view', label: '猜猜对方的视角', next_node_id: 'their_view' }],
      },
      {
        id: 'their_view',
        title: '对方视角',
        prompt: '请访客尝试站在对方角度说一句可能的话。不必认同，只要试着说。',
        choices: [
          { id: 'next_action', label: '那下一步可以是...', next_node_id: 'next_action' },
          { id: 'no_action', label: '这次不说话也可以', next_node_id: 'complete' },
        ],
      },
      {
        id: 'next_action',
        title: '下一步沟通',
        prompt: '请访客想一件今天可以做的最小沟通动作。一句问候、一条消息、一次见面。',
        choices: [{ id: 'complete', label: '记录并完成', next_node_id: 'complete' }],
      },
      { id: 'complete', title: '澄清完成', prompt: '误会还在，但你已经多看见了一个视角。', choices: [] },
    ],
  },
  {
    id: 'goal-driven-quest',
    category: '目标驱动',
    badge: '目标',
    title: '目标小征程',
    duration: '5-8 分钟',
    bestFor: '学习角、职场空间、创作工坊、个人成长空间',
    entryLabel: '开启小征程',
    summary: '目标驱动的多步玩法，访客需要完成多个步骤才能到达终点。',
    goal: '让访客设定一个可衡量的短期目标，通过3-4步到达终点，每步都有小成就记录。',
    tone: '务实、鼓励、记录每一步小进展。',
    materials: ['目标卡', '里程碑印章', '终点奖状'],
    rewardText: '你已经到达终点。这段路是你一步一步走出来的。',
    nodes: [
      {
        id: 'start',
        title: '设定目标',
        prompt: '请访客用一个具体的结果描述目标。不是过程，是想要得到的那个结果。',
        choices: [
          { id: 'define_goal', label: '定义这个目标', next_node_id: 'define_goal' },
          { id: 'vague', label: '还比较模糊', next_node_id: 'vague' },
        ],
      },
      {
        id: 'define_goal',
        title: '目标可衡量吗',
        prompt: '请访客说明：怎么知道目标达到了？谁能验证？',
        choices: [{ id: 'milestone_1', label: '可以衡量，设定第一个里程碑', next_node_id: 'milestone_1' }],
      },
      {
        id: 'vague',
        title: '模糊目标澄清',
        prompt: '请访客把目标压缩成一句：我想做到的事情是...',
        choices: [{ id: 'define_goal', label: '现在可以定义了', next_node_id: 'define_goal' }],
      },
      {
        id: 'milestone_1',
        title: '第一个里程碑',
        prompt: '为了到达目标，第一个需要完成的小步骤是什么？',
        choices: [
          { id: 'milestone_2', label: '再定一个里程碑', next_node_id: 'milestone_2' },
          { id: 'checkpoint', label: '就这一个够了，开始', next_node_id: 'checkpoint' },
        ],
      },
      {
        id: 'milestone_2',
        title: '第二个里程碑',
        prompt: '第二个需要完成的小步骤是什么？',
        choices: [{ id: 'checkpoint', label: '够了，开始行动', next_node_id: 'checkpoint' }],
      },
      {
        id: 'checkpoint',
        title: '当前进度',
        prompt: '现在你已经在通往目标的路上。请记录今天的状态。',
        choices: [{ id: 'complete', label: '到达终点', next_node_id: 'complete' }],
      },
      { id: 'complete', title: '征程完成', prompt: '目标到达了，或者路已经走过一段了。这段路有记录。', choices: [] },
    ],
  },
  {
    id: 'story-choice-point',
    category: '抉择',
    badge: '抉择',
    title: '故事岔路口',
    duration: '3-5 分钟',
    bestFor: '奇谈空间、创作工坊、故事角、角色扮演空间',
    entryLabel: '站在岔路口',
    summary: '在故事叙事中嵌入一个抉择点，帮访客体验决策并看到后果。',
    goal: '让访客进入一个叙事场景，做出选择，然后看到选择带来的轻量后果。',
    tone: '叙事感、有画面感、后果清晰但不戏剧化。',
    materials: ['故事册', '选择卡片', '后果镜子'],
    rewardText: '你选择了这条路。它不是唯一对的，但它是你选的。',
    nodes: [
      {
        id: 'start',
        title: '进入故事',
        prompt: '请访客描述一个自己正在经历的场景片段，或者请 NPC 描述。',
        choices: [
          { id: 'narrate', label: 'NPC 描述场景', next_node_id: 'narrate' },
          { id: 'describe', label: '我自己描述', next_node_id: 'describe' },
        ],
      },
      {
        id: 'narrate',
        title: '场景说明',
        prompt: 'NPC 描述一个正在发生的场景，访客从中感到压力。',
        choices: [{ id: 'choice', label: '我做出选择', next_node_id: 'choice' }],
      },
      {
        id: 'describe',
        title: '访客自述',
        prompt: '请访客描述这个场景，并说明是什么让这件事变得困难。',
        choices: [{ id: 'choice', label: '我做出选择', next_node_id: 'choice' }],
      },
      {
        id: 'choice',
        title: '岔路口选择',
        prompt: '现在请访客做一个选择。每个选择都有后果，但都不是唯一正确的。',
        choices: [
          { id: 'consequence_a', label: '选择 A', next_node_id: 'consequence_a' },
          { id: 'consequence_b', label: '选择 B', next_node_id: 'consequence_b' },
          { id: 'observe', label: '先不选，再观察一下', next_node_id: 'observe' },
        ],
      },
      {
        id: 'consequence_a',
        title: '后果 A',
        prompt: 'A 带来了...（描述一个现实的后果，不戏剧化）。',
        choices: [{ id: 'complete', label: '接受这个后果', next_node_id: 'complete' }],
      },
      {
        id: 'consequence_b',
        title: '后果 B',
        prompt: 'B 带来了...（描述另一个现实的后果，不戏剧化）。',
        choices: [{ id: 'complete', label: '接受这个后果', next_node_id: 'complete' }],
      },
      {
        id: 'observe',
        title: '再观察',
        prompt: '访客选择再等一等。此时 NPC 说：有时候等待也是一种选择。',
        choices: [{ id: 'choice', label: '现在可以选了', next_node_id: 'choice' }],
      },
      { id: 'complete', title: '岔路完成', prompt: '你选了，它发生了。这个故事是你的。', choices: [] },
    ],
  },
  {
    id: 'memory-replay',
    category: '故事',
    badge: '回忆',
    title: '回忆重播',
    duration: '4-6 分钟',
    bestFor: '树洞、深夜空间、老年关怀、记忆角',
    entryLabel: '重播一段回忆',
    summary: '用叙事方式帮访客整理一段记忆，不做分析，只做记录。',
    goal: '让访客选择一段回忆，用叙事方式重新讲述，然后记录一个轻量摘要。',
    tone: '安静、温和、不追问、不分析。只让访客说出来。',
    materials: ['回忆册', '沉默灯', '摘要卡'],
    rewardText: '这段回忆现在被说出来了。它不再是独自待在你心里的东西。',
    nodes: [
      {
        id: 'start',
        title: '选择回忆',
        prompt: '请访客从"过去的一个片段 / 一个还没放下的事 / 一个想再说一次的故事"里选一个。',
        choices: [
          { id: 'narrate', label: '过去的片段', next_node_id: 'narrate' },
          { id: 'unresolved', label: '还没放下的事', next_node_id: 'unresolved' },
          { id: 'story', label: '想说一次的故事', next_node_id: 'story' },
        ],
      },
      {
        id: 'narrate',
        title: '说一说那段片段',
        prompt: '请访客慢慢说出来。不用组织语言，只要说出来。',
        choices: [{ id: 'summary', label: '够了，记录摘要', next_node_id: 'summary' }],
      },
      {
        id: 'unresolved',
        title: '还没放下的事',
        prompt: '请访客说一说这件事。说完后，问：这件事里，最想记住的是什么？',
        choices: [{ id: 'summary', label: '记录这个', next_node_id: 'summary' }],
      },
      {
        id: 'story',
        title: '那个故事',
        prompt: '请访客把这个故事说一次。不需要完整，只要主要的画面。',
        choices: [{ id: 'summary', label: '记录主要画面', next_node_id: 'summary' }],
      },
      {
        id: 'summary',
        title: '记录摘要',
        prompt: '请访客用一句话总结这段回忆的核心。',
        choices: [{ id: 'complete', label: '封存这段回忆', next_node_id: 'complete' }],
      },
      { id: 'complete', title: '重播完成', prompt: '它已经被说出来了。这段回忆现在有了一个位置。', choices: [] },
    ],
  },
]

const STORY_FORBIDDEN = [
  '不使用战斗、等级、装备、排行榜或可交易奖励',
  '不做心理诊断或治疗暗示',
  '不索取身份证件、住址、手机号、银行卡等敏感信息',
  '不替代医疗、法律等专业结论',
  '不绕过店主确认自动发布剧情、NPC 或空间内容',
  '不承诺玩法的心理或健康改善效果',
]

function safeId(value) {
  return String(value || 'story-template')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'story-template'
}

export function createStoryGameplayFromTemplate(template, index = 1) {
  if (!template?.id) return null
  return {
    id: `gp_story_${safeId(template.id)}_${Date.now().toString(36)}_${index}`,
    title: template.title,
    status: 'draft',
    summary: template.summary,
    entry_label: template.entryLabel || '开始故事',
    mode: 'ai_directed_branch',
    owner_brief: {
      goal: template.goal,
      tone: template.tone,
      materials: [...(template.materials || [])],
      forbidden: [...STORY_FORBIDDEN],
    },
    nodes: JSON.parse(JSON.stringify(template.nodes)),
    fallback_events: [
      {
        id: 'gentle_nudge',
        type: 'nudge',
        text: '如果访客卡住，请给出两个低风险选项，邀请访客选择而不是直接替访客决定。',
      },
      {
        id: 'space_reminder',
        type: 'nudge',
        text: '如果访客的情绪有变化，可以轻轻提醒：这个空间是一个故事空间，体验由你主导。',
      },
    ],
    completion: {
      complete_node_ids: ['complete'],
      reward_text: template.rewardText || '你完成了这段叙事体验。',
      memory_atom: { enabled: false },
    },
  }
}

export function filterStoryGameplayTemplates({ query = '', category = '全部' } = {}) {
  const keyword = String(query || '').trim().toLowerCase()
  return STORY_GAMEPLAY_TEMPLATES.filter((template) => {
    if (category && category !== '全部' && template.category !== category) return false
    if (!keyword) return true
    return [
      template.title,
      template.summary,
      template.bestFor,
      template.category,
      ...(template.materials || []),
    ].join(' ').toLowerCase().includes(keyword)
  })
}

/**
 * Create a blank story gameplay (for manual creation)
 */
export function createBlankStoryGameplay(index = 1) {
  const base = createBlankGameplay(index)
  return {
    ...base,
    owner_brief: {
      goal: '',
      tone: '叙事感、温和、有画面感',
      materials: [],
      forbidden: [...STORY_FORBIDDEN],
    },
    fallback_events: [
      {
        id: 'gentle_nudge',
        type: 'nudge',
        text: '如果访客卡住，请给出两个低风险选项，邀请访客选择而不是直接替访客决定。',
      },
    ],
  }
}