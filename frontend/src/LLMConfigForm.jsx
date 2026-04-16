import { useState } from 'react'
import { getDefaultTavernService } from './services/tavernService'

/**
 * All supported LLM backends with metadata.
 * Keep in sync with fablemap/llm_clients.py DEFAULT_MODELS.
 */
export const LLM_BACKENDS = [
  { id: 'openai',      label: 'OpenAI',           icon: '🤖', docs: 'https://platform.openai.com/docs/models' },
  { id: 'claude',      label: 'Anthropic Claude', icon: '🧠', docs: 'https://docs.anthropic.com/claude/reference/models' },
  { id: 'openrouter',  label: 'OpenRouter',        icon: '🌐', docs: 'https://openrouter.ai/models' },
  { id: 'ollama',      label: 'Ollama (本地)',      icon: '🏠', docs: 'https://ollama.com/library' },
  { id: 'groq',        label: 'Groq',               icon: '⚡', docs: 'https://console.groq.com/docs/models' },
  { id: 'deepseek',    label: 'DeepSeek',           icon: '🔮', docs: 'https://platform.deepseek.com/docs' },
  { id: 'mistral',     label: 'Mistral AI',          icon: '🌊', docs: 'https://docs.mistral.ai/getting-started/models/' },
  { id: 'cohere',      label: 'Cohere',              icon: '🌊', docs: 'https://docs.cohere.com/docs/models' },
  { id: 'fireworks',   label: 'Fireworks AI',        icon: '🎆', docs: 'https://docs.fireworks.ai/models' },
  { id: 'moonshot',    label: 'Moonshot (月之暗面)',  icon: '🌙', docs: 'https://platform.moonshot.cn/docs' },
  { id: 'zhipu',       label: '智谱 GLM',             icon: '🇨🇳', docs: 'https://open.bigmodel.cn/dev/howuse' },
  { id: 'baidu',       label: '百度文心一言',          icon: '🦅', docs: 'https://cloud.baidu.com/doc/WENXINWORKSHOP' },
  { id: 'aliyun',      label: '阿里云通义千问',         icon: '☁️', docs: 'https://help.aliyun.com/document_detail/2431236' },
  { id: 'tencent',     label: '腾讯混元',               icon: '🐧', docs: 'https://cloud.tencent.com/document/product/1729' },
  { id: 'minimax',     label: 'MiniMax',               icon: '📉', docs: 'https://www.minimaxi.com/document' },
  { id: 'stepfun',     label: '阶跃星辰 StepFun',       icon: '🪜', docs: 'https://stepfun.com/docs' },
  { id: 'qwen',        label: 'Qwen (通义千问开源)',     icon: '🔢', docs: 'https://qwenlm.github.io' },
  { id: 'gemini',      label: 'Google Gemini',         icon: '💎', docs: 'https://ai.google.dev/gemini-api/docs/models' },
  { id: 'perplexity',  label: 'Perplexity',             icon: '🔍', docs: 'https://docs.perplexity.ai/docs/model-cards' },
  { id: 'together',    label: 'Together AI',            icon: '🤝', docs: 'https://docs.together.ai/docs/models' },
  { id: 'samba',       label: 'SambaNova',              icon: '🇧🇷', docs: 'https://docs.sambanova.ai/docs/models' },
  { id: 'lepton',      label: 'Lepton AI',               icon: '⚙️', docs: 'https://www.lepton.ai/docs' },
  { id: 'novita',      label: 'Novita AI',               icon: '✨', docs: 'https://novita.ai/docs' },
  { id: 'localai',     label: 'LocalAI (通用)',          icon: '🖥️', docs: 'https://localai.io/models/' },
]

/**
 * Default models per backend.
 */
export const DEFAULT_MODELS = {
  openai:      'gpt-4o-mini',
  claude:      'claude-3-5-haiku-20241022',
  openrouter:  'anthropic/claude-3.5-haiku',
  ollama:      'llama3.2',
  groq:        'llama-3.2-90b-vision-preview',
  deepseek:    'deepseek-chat',
  mistral:     'mistral-large-latest',
  cohere:      'command-r-plus-08-2024',
  fireworks:   'accounts/fireworks/models/llama-v3p1-70b-instruct',
  moonshot:    'moonshot-v1-8k',
  zhipu:       'glm-4-flash',
  baidu:       'ernie-4.0-8k-latest',
  aliyun:      'qwen-turbo',
  tencent:     'hunyuan-pro',
  minimax:     'abab6.5s-chat',
  stepfun:     'step-1v-8k',
  qwen:        'Qwen/Qwen2.5-72B-Instruct',
  gemini:      'gemini-2.0-flash',
  perplexity:  'sonar-pro',
  together:    'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  samba:       'SN-XL-8B',
  lepton:      'llama-3.1-70b',
  novita:      'meta-llama/llama-3.1-70b-instruct',
  localai:     'gpt-3.5-turbo',
}

/**
 * Base URLs per backend (leave empty for default).
 */
export const DEFAULT_BASE_URLS = {
  openai:      'https://api.openai.com/v1',
  claude:      'https://api.anthropic.com',
  openrouter:  'https://openrouter.ai/api/v1',
  groq:        'https://api.groq.com/openai/v1',
  deepseek:    'https://api.deepseek.com/v1',
  mistral:     'https://api.mistral.ai/v1',
  cohere:     'https://api.cohere.ai/v1',
  fireworks:  'https://api.fireworks.ai/inference/v1',
  moonshot:   'https://api.moonshot.cn/v1',
  zhipu:      'https://open.bigmodel.cn/api/paas/v4',
  baidu:      'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
  aliyun:     'https://dashscope.aliyuncs.com/compatible-mode/v1',
  tencent:    'https://hunyuan.cloud.tencent.com/hyapi',
  minimax:    'https://api.minimax.chat/v1',
  stepfun:    'https://api.stepfun.com/v1',
  qwen:       'https://api.together.xyz/v1',
  gemini:     'https://generativelanguage.googleapis.com/v1beta',
  perplexity: 'https://api.perplexity.ai',
  together:   'https://api.together.xyz/v1',
  samba:      'https://api.sambanova.cloud/api/v1',
  lepton:     'https://llama3-1-70b.lepton.run/api/v1',
  novita:     'https://api.novita.ai/v1',
  localai:    '',
}

/**
 * LLMConfigForm — 可复用的 LLM 配置表单
 *
 * Props:
 *   value      — { backend, model, api_key, base_url, temperature, max_tokens, top_p }
 *   onChange   — (config) => void
 *   compact    — 是否使用紧凑布局
 *   tavernId   — 可选，用于测试连接
 */
export default function LLMConfigForm({ value = {}, onChange, compact = false, tavernId = null }) {
  const config = {
    backend:    value.backend    || 'openai',
    model:      value.model      || DEFAULT_MODELS['openai'],
    api_key:    value.api_key    || '',
    base_url:   value.base_url   || DEFAULT_BASE_URLS['openai'],
    temperature: value.temperature ?? 0.8,
    max_tokens:  value.max_tokens  ?? 4096,
    top_p:       value.top_p       ?? 0.95,
  }

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | { ok: bool, message: string }

  function update(key, val) {
    const next = { ...config, [key]: val }
    // Auto-fill base_url when switching backend
    if (key === 'backend') {
      next.base_url = DEFAULT_BASE_URLS[val] || ''
      next.model   = DEFAULT_MODELS[val] || ''
    }
    if (onChange) onChange(next)
  }

  async function handleTest() {
    if (!tavernId) {
      setTestResult({ ok: false, message: '需要先保存酒馆才能测试连接' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const service = getDefaultTavernService()
      await service.testLlmConfig(tavernId, config)
      setTestResult({ ok: true, message: '连接成功！AI 配置正常' })
    } catch (err) {
      setTestResult({ ok: false, message: `连接失败：${err.message}` })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={`llm-config-form${compact ? ' compact' : ''}`}>
      {!compact && (
        <div className="form-section-header">
          <h4>AI 后端配置</h4>
          <p className="form-hint">选择 AI 服务商，配置 API Key，让你的 NPC 能和访客对话</p>
        </div>
      )}

      {/* Backend selector */}
      <div className="form-group">
        <label>AI 后端</label>
        <div className="backend-grid">
          {LLM_BACKENDS.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`backend-btn${config.backend === b.id ? ' active' : ''}`}
              onClick={() => update('backend', b.id)}
              title={b.label}
            >
              <span className="backend-icon">{b.icon}</span>
              <span className="backend-label">{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Model */}
      <div className="form-group">
        <label>
          模型
          <button
            type="button"
            className="link-btn"
            onClick={() => window.open(LLM_BACKENDS.find(b => b.id === config.backend)?.docs, '_blank')}
          >
            查看可用模型 ↗
          </button>
        </label>
        <input
          type="text"
          value={config.model}
          onChange={(e) => update('model', e.target.value)}
          placeholder={DEFAULT_MODELS[config.backend] || '模型名称'}
        />
      </div>

      {/* API Key */}
      <div className="form-group">
        <label>API Key</label>
        <input
          type="password"
          value={config.api_key}
          onChange={(e) => update('api_key', e.target.value)}
          placeholder={config.backend === 'ollama' || config.backend === 'localai' ? '（本地部署无需 Key）' : 'sk-...'}
          autoComplete="off"
        />
        {config.backend === 'ollama' || config.backend === 'localai' ? (
          <p className="form-hint">本地部署无需 API Key，但请确保服务正在运行</p>
        ) : (
          <p className="form-hint">API Key 仅你可见，不会被其他用户看到</p>
        )}
      </div>

      {/* Base URL */}
      {(config.backend === 'ollama' || config.backend === 'localai' || config.base_url) && (
        <div className="form-group">
          <label>API 地址 {config.backend === 'ollama' || config.backend === 'localai' ? '*' : '（可选）'}</label>
          <input
            type="text"
            value={config.base_url}
            onChange={(e) => update('base_url', e.target.value)}
            placeholder={
              config.backend === 'ollama' ? 'http://localhost:11434' :
              config.backend === 'localai' ? 'http://localhost:8080/v1' :
              DEFAULT_BASE_URLS[config.backend] || ''
            }
          />
        </div>
      )}

      {/* Advanced settings */}
      {!compact && (
        <details className="advanced-settings">
          <summary>高级设置</summary>

          <div className="form-group">
            <label>
              温度参数: <strong>{config.temperature}</strong>
              <span className="param-hint">
                {config.temperature < 0.5 ? '精确' : config.temperature < 1.0 ? '平衡' : '创意'}
              </span>
            </label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={config.temperature}
              onChange={(e) => update('temperature', parseFloat(e.target.value))}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>最大 Token: {config.max_tokens}</label>
              <input
                type="range"
                min="256"
                max="32000"
                step="256"
                value={config.max_tokens}
                onChange={(e) => update('max_tokens', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Top-P: {config.top_p}</label>
              <input
                type="range"
                min="0.01"
                max="1.0"
                step="0.01"
                value={config.top_p}
                onChange={(e) => update('top_p', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </details>
      )}

      {/* Test connection */}
      {tavernId && (
        <div className="test-connection">
          <button
            type="button"
            className="btn-test"
            onClick={handleTest}
            disabled={testing || !config.model}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          {testResult && (
            <span className={`test-result ${testResult.ok ? 'ok' : 'error'}`}>
              {testResult.message}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
