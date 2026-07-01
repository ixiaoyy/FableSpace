export const OWNER_TOKEN_REFERENCE_BOUNDARIES = [
  '仅供店主参考',
  '不展示 API Key',
  '不含充值、结算或抽成',
  '访客不可见账单',
]

export function getOwnerTokenUsage(space) {
  const usage = Number(space?.llm_config?.token_used || 0)
  return Number.isFinite(usage) && usage > 0 ? usage : 0
}

export function formatOwnerTokenUnits(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return '—'
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(2)}M`
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}K`
  return numeric.toLocaleString()
}

function safeText(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

function hasConfiguredLlm(llmConfig = {}) {
  const backend = safeText(llmConfig.backend)
  if (!backend) return false
  if (backend === 'rules') return true
  if (backend === 'ollama') return Boolean(safeText(llmConfig.base_url) || safeText(llmConfig.model))
  return Boolean(llmConfig.api_key_configured || safeText(llmConfig.model))
}

export function createOwnerTokenRow(space = {}) {
  const llmConfig = space?.llm_config || {}
  const tokens = getOwnerTokenUsage(space)
  const configured = hasConfiguredLlm(llmConfig)
  return {
    spaceId: safeText(space.id, 'unknown'),
    name: safeText(space.name, '未命名空间'),
    status: space.status === 'open' ? 'open' : 'closed',
    statusLabel: space.status === 'open' ? '营业中' : '歇业中',
    tokens,
    backend: safeText(llmConfig.backend, '未配置'),
    model: safeText(llmConfig.model, configured ? '未填写模型' : '未配置模型'),
    configured,
    llmStatusLabel: configured ? 'AI 已配置' : '待配置 AI',
    usageLabel: tokens > 0 ? '已有参考记录' : '暂无用量记录',
  }
}

export function buildOwnerTokenStats(spaces = []) {
  const rows = (Array.isArray(spaces) ? spaces : [])
    .map(createOwnerTokenRow)
    .sort((a, b) => b.tokens - a.tokens || a.name.localeCompare(b.name, 'zh-Hans-CN'))

  const total = rows.reduce((sum, row) => sum + row.tokens, 0)
  const usedRows = rows.filter((row) => row.tokens > 0)
  const configuredCount = rows.filter((row) => row.configured).length
  const topTokens = rows[0]?.tokens || 0

  return {
    rows,
    total,
    average: rows.length ? Math.round(total / rows.length) : 0,
    usedCount: usedRows.length,
    unusedCount: rows.length - usedRows.length,
    configuredCount,
    unconfiguredCount: rows.length - configuredCount,
    topTokens,
    topSpaceName: usedRows[0]?.name || '',
  }
}
