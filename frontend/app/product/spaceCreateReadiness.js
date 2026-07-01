function text(value) {
  return String(value || '').trim()
}

export function getWizardReadiness(form = {}, hasLlmConfig = false) {
  const characters = Array.isArray(form.characters) ? form.characters : []
  const lat = Number.parseFloat(form.lat)
  const lon = Number.parseFloat(form.lon)
  const firstCharacter = characters[0] || {}
  const checks = [
    {
      id: 'coordinate',
      label: '地图坐标有效',
      hint: '空间能被挂到真实地图上',
      done: Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180,
      step: 1,
      required: true,
    },
    {
      id: 'name',
      label: '空间有清楚名称',
      hint: '访客在地图上能一眼认出入口',
      done: Boolean(text(form.name)),
      step: 2,
      required: true,
    },
    {
      id: 'description',
      label: '入口简介已填写',
      hint: '降低访客进入前的不确定感',
      done: Boolean(text(form.description)),
      step: 2,
    },
    {
      id: 'scene',
      label: '场景氛围已填写',
      hint: '让 NPC 回答更稳定、更有空间感',
      done: Boolean(text(form.scene_prompt)),
      step: 2,
    },
    {
      id: 'character',
      label: '至少有 1 个 NPC',
      hint: '进入后有明确对话对象',
      done: characters.length > 0,
      step: 3,
    },
    {
      id: 'first_mes',
      label: 'NPC 有开场白',
      hint: '访客第一句不用自己硬想',
      done: Boolean(text(firstCharacter.first_mes || firstCharacter.firstMes)),
      step: 3,
    },
    {
      id: 'ai',
      label: 'AI 配置可用',
      hint: '也可以先跳过，创建后再配置',
      done: Boolean(hasLlmConfig),
      step: 4,
      optional: true,
    },
  ]
  const doneCount = checks.filter((item) => item.done).length
  return {
    checks,
    doneCount,
    total: checks.length,
    percent: Math.round((doneCount / checks.length) * 100),
    missingRequired: checks.filter((item) => item.required && !item.done),
  }
}
