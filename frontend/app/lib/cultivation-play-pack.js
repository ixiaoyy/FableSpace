/**
 * Cultivation Play Pack — 修行空间默认玩法包
 *
 * 提供修行、问道、历练回执与突破条件面板的默认内容模板。
 * 所有内容仅作为草稿，需经店主确认后方可保存。
 */

export const CULTIVATION_PLAY_PACK = {
  id: 'cultivation-play-pack',
  name: '修行空间默认玩法包',
  description: '提供修行、问道、历练回执与突破条件面板的默认内容。',
  owner_confirmation_note: '这里只提供待确认模板；只有店主在本空间确认注入后，NPC、世界书和玩法定义才会真正写入当前 Space。',

  // 安全边界 (Forbidden list)
  forbidden: '战斗, 等级, 装备, 排行榜, 充值, 跨空间社交, 竞技, 交易',

  preview_receipt: {
    title: '野外历练回执',
    action: '野外历练 · 密林古坛',
    result_summary: '你在古坛边静坐片刻，理清了残存灵气的来处，带回了一段更清澈的心境感悟。',
    progress_label: '私有进境',
    progress_delta: '修为 +24000（仅当前访客可见）',
    clue_label: '灵物线索',
    clue: '一截灵眼之树',
    boundary_note: '回执只记录本空间内的私有进境与纪念线索，不形成装备、交易物或公共排行。',
  },

  breakthrough_preview: {
    title: '下一心境要求',
    next_stage: '筑基前夕',
    status: '未达',
    summary: '下一步只看本空间里的回访、问道与练习完成度，不看战力、排行或付费加速。',
    requirements: [
      {
        id: 'return-days',
        label: '回访天数',
        current: 2,
        target: 5,
        note: '至少 5 天内回来问道，保持连续的空间回访记录。',
      },
      {
        id: 'conversation-turns',
        label: '问道对话轮次',
        current: 6,
        target: 12,
        note: '与引路 NPC 完成足量对话轮次，重点看持续交流而不是一次性爆发。',
      },
      {
        id: 'practice-receipts',
        label: '已确认历练回执',
        current: 1,
        target: 3,
        note: '只统计本空间内完成并确认的练习回执，不跨空间累计。',
      },
      {
        id: 'local-notes',
        label: '札记 / 观察记录',
        current: 2,
        target: 4,
        note: '阅读或留下本地札记即可推进，不会转成装备、货币或战力。',
      },
    ],
    boundary_note: '这些要求只是本空间的说明模板；真正进度只对游客自己可见。',
  },

  // NPC 建议
  characters: [
    {
      name: '青灯真人',
      description: '修行空间的引路人，性格沉稳、高深莫测。他会指引访客通过问道、打坐等方式提升心境。',
      personality: '沉稳、高深莫测、慈悲、严厉',
      first_mes: '道友，欢迎来到问道茶馆。世间纷扰，唯有此处可得片刻清宁。你是想在此打坐观星，还是下山历练？',
      tags: ['修行', '引路人', '真人'],
      avatar: '', // 建议留空或使用通用占位图
    }
  ],

  // 世界书建议
  world_info: [
    {
      keys: ['灵气', '灵力', '修为'],
      content: '灵气是世间万物的本源。修行者通过吸纳灵气转化为修为，从而提升境界。在空间内，修为代表了访客的私有进境进度，不可交易或展示。',
    },
    {
      keys: ['境界', '心境', '突破'],
      content: '修行分为多个阶段：入道、筑基、结丹、元婴、化神。每一个境界的突破都需要心境的沉淀与特定的历练指标（如回访天数、对话轮次）。',
    },
    {
      keys: ['历练', '问道'],
      content: '历练是提升修为的主要方式。访客可以离开空间进行虚拟历练，结束后获得“历练回执”。回执记录了历练中的感悟与获得的灵物线索。',
    }
  ],

  // 玩法定义建议
  gameplay_definitions: [
    {
      id: 'gp_cultivation_wilderness',
      title: '野外历练',
      summary: '前往灵山秀水历练，获得修行感悟。',
      entry_label: '开始历练',
      mode: 'ai_directed_branch',
      owner_brief: {
        goal: '让访客在野外遇到一些奇遇，提升修为（私有进度），并获得一些灵物线索（纪念卡）。',
        tone: '玄幻、叙事、奇遇、宁静',
        materials: ['灵山', '古迹', '仙草', '残卷'],
        forbidden: '战斗, 死亡, 失去修为, 跨用户交易, 竞技, 辱骂',
      },
      nodes: [
        {
          id: 'start',
          kind: 'scene',
          narration: '你收拾行囊，踏出了山门。眼前的灵山云雾缭绕，似乎隐藏着某种机缘。你可以选择向高处攀登，或探索幽深的密林。',
          choices: [
            { id: 'climb', label: '攀登主峰', next_node_id: 'climb_peak' },
            { id: 'forest', label: '深入密林', next_node_id: 'deep_forest' }
          ]
        },
        {
          id: 'climb_peak',
          kind: 'scene',
          narration: '你登上主峰之巅，俯瞰群山，云海翻腾。在猎猎风中，你心中忽然产生一丝明悟。',
          choices: [
            { id: 'meditate', label: '当山而坐', next_node_id: 'progress' },
            { id: 'finish', label: '感悟结束', next_node_id: 'complete', completes: true }
          ]
        },
        {
          id: 'deep_forest',
          kind: 'scene',
          narration: '密林中灵气逼人，草木葱茏。你发现了一处破败的古坛，似乎有人在此修行过。',
          choices: [
            { id: 'search', label: '仔细搜寻', next_node_id: 'progress' },
            { id: 'finish', label: '采摘并回山', next_node_id: 'complete', completes: true }
          ]
        },
        {
          id: 'progress',
          kind: 'scene',
          narration: '你的感悟正在加深，周围的灵气汇聚而来。你感到心境正在发生微妙的变化。',
          choices: [
            { id: 'finish', label: '圆满回山', next_node_id: 'complete', completes: true }
          ]
        },
        {
          id: 'complete',
          kind: 'complete',
          narration: '历练结束，你带着满身疲惫与感悟回到了修行空间。主持人正在为你整理这次的“历练回执”。',
        }
      ],
      completion: {
        reward_text: '你获得了一段宝贵的修行感悟。修为 +24000，获得线索：【一截灵眼之树】。',
        memory_atom: { enabled: true }
      }
    }
  ],
};
