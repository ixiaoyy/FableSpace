import { useEffect, useMemo, useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '发布' },
  { value: 'disabled', label: '停用' },
]

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}))
}

function splitLines(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function stringifyJson(value) {
  return JSON.stringify(value || [], null, 2)
}

function safeParseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value || '')
    return parsed == null ? fallback : parsed
  } catch {
    return fallback
  }
}

export function createBlankGameplay(index = 1) {
  return {
    id: `gp_custom_${Date.now().toString(36)}_${index}`,
    title: `新玩法 ${index}`,
    status: 'draft',
    summary: '用三到五步完成一段空间内的小体验。',
    entry_label: '开始玩法',
    mode: 'ai_directed_branch',
    owner_brief: {
      goal: '让访客完成一段安全、轻量、贴合本空间氛围的小体验。',
      tone: '温和、有主持感、不催促',
      materials: [],
      forbidden: ['索取身份证件、住址、手机号等敏感信息', '要求真实危险行动'],
    },
    nodes: [],
    fallback_events: [],
    completion: {
      complete_node_ids: ['complete'],
      reward_text: '你完成了这局玩法。',
      memory_atom: { enabled: false },
    },
  }
}

export default function GameplayDefinitionEditor({ gameplay, onChange }) {
  const draft = useMemo(() => clone(gameplay || createBlankGameplay()), [gameplay?.id])
  const [materialsText, setMaterialsText] = useState((draft.owner_brief?.materials || []).join('\n'))
  const [forbiddenText, setForbiddenText] = useState((draft.owner_brief?.forbidden || []).join('\n'))
  const [fallbackText, setFallbackText] = useState(stringifyJson(draft.fallback_events || []))
  const [nodesText, setNodesText] = useState(stringifyJson(draft.nodes || []))
  const [jsonError, setJsonError] = useState('')

  useEffect(() => {
    setMaterialsText((gameplay?.owner_brief?.materials || []).join('\n'))
    setForbiddenText((gameplay?.owner_brief?.forbidden || []).join('\n'))
    setFallbackText(stringifyJson(gameplay?.fallback_events || []))
    setNodesText(stringifyJson(gameplay?.nodes || []))
    setJsonError('')
  }, [gameplay?.id])

  function emit(patch) {
    onChange?.({ ...(gameplay || draft), ...patch })
  }

  function emitBrief(patch) {
    emit({ owner_brief: { ...(gameplay?.owner_brief || draft.owner_brief || {}), ...patch } })
  }

  function syncJson() {
    const nextFallback = safeParseJson(fallbackText, null)
    const nextNodes = safeParseJson(nodesText, null)
    if (!Array.isArray(nextFallback) || !Array.isArray(nextNodes)) {
      setJsonError('高级 JSON 必须是数组；保存前会继续保留当前已生效配置。')
      return
    }
    setJsonError('')
    const nodesWithFallback = nextNodes.map((node) => {
      if (!node || typeof node !== 'object') return node
      return Array.isArray(node.fallback_events) && node.fallback_events.length > 0
        ? node
        : { ...node, fallback_events: nextFallback }
    })
    setNodesText(stringifyJson(nodesWithFallback))
    emit({ fallback_events: nextFallback, nodes: nodesWithFallback })
  }

  return (
    <div className="gameplay-definition-editor">
      <div className="form-grid compact-grid">
        <label>
          <span className="mini-label">玩法名称</span>
          <input
            value={gameplay?.title || ''}
            onChange={(event) => emit({ title: event.target.value })}
            placeholder="例如：三步线索登记"
            maxLength={48}
          />
        </label>
        <label>
          <span className="mini-label">入口按钮</span>
          <input
            value={gameplay?.entry_label || ''}
            onChange={(event) => emit({ entry_label: event.target.value })}
            placeholder="开始玩法"
            maxLength={40}
          />
        </label>
        <label>
          <span className="mini-label">发布状态</span>
          <select value={gameplay?.status || 'draft'} onChange={(event) => emit({ status: event.target.value })}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span className="mini-label">简介</span>
        <textarea
          value={gameplay?.summary || ''}
          onChange={(event) => emit({ summary: event.target.value })}
          rows={2}
          maxLength={180}
          placeholder="访客会看到的一句话玩法说明。"
        />
      </label>

      <label>
        <span className="mini-label">玩法目标</span>
        <textarea
          value={gameplay?.owner_brief?.goal || ''}
          onChange={(event) => emitBrief({ goal: event.target.value })}
          rows={3}
          placeholder="AI Director 会围绕这个目标主持下一步。"
        />
      </label>

      <div className="form-grid compact-grid">
        <label>
          <span className="mini-label">氛围语气</span>
          <textarea
            value={gameplay?.owner_brief?.tone || ''}
            onChange={(event) => emitBrief({ tone: event.target.value })}
            rows={3}
            placeholder="温柔、悬疑、像前台服务生……"
          />
        </label>
        <label>
          <span className="mini-label">结算奖励文案</span>
          <textarea
            value={gameplay?.completion?.reward_text || ''}
            onChange={(event) => emit({ completion: { ...(gameplay?.completion || {}), reward_text: event.target.value } })}
            rows={3}
            placeholder="完成后给访客看到的文字奖励。"
          />
        </label>
      </div>

      <div className="form-grid compact-grid">
        <label>
          <span className="mini-label">可用素材（每行一项）</span>
          <textarea
            value={materialsText}
            onChange={(event) => {
              setMaterialsText(event.target.value)
              emitBrief({ materials: splitLines(event.target.value) })
            }}
            rows={4}
            placeholder="登记册\n骰子\n旧地图"
          />
        </label>
        <label>
          <span className="mini-label">禁止事项（每行一项）</span>
          <textarea
            value={forbiddenText}
            onChange={(event) => {
              setForbiddenText(event.target.value)
              emitBrief({ forbidden: splitLines(event.target.value) })
            }}
            rows={4}
            placeholder="不索取真实身份信息\n不承诺医疗/法律结论"
          />
        </label>
      </div>

      <details className="gameplay-advanced-editor">
        <summary>高级节点 / fallback_events</summary>
        <p className="note muted">默认不必配置。需要精细分支时，可编辑底层节点数组和 fallback_events 数组；不要写脚本或表达式。</p>
        <label>
          <span className="mini-label">高级节点</span>
          <textarea
            value={nodesText}
            onChange={(event) => setNodesText(event.target.value)}
            onBlur={syncJson}
            rows={8}
            spellCheck={false}
          />
        </label>
        <label>
          <span className="mini-label">fallback_events</span>
          <textarea
            value={fallbackText}
            onChange={(event) => setFallbackText(event.target.value)}
            onBlur={syncJson}
            rows={5}
            spellCheck={false}
          />
        </label>
        {jsonError ? <p className="form-error">{jsonError}</p> : null}
      </details>
    </div>
  )
}
