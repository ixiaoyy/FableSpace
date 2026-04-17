import { useEffect, useMemo, useState } from 'react'
import { getDefaultTavernService } from './services/tavernService'

const MEMORY_MODES = [
  { id: 'visitor_state', label: '轻量回访关系' },
  { id: 'balanced', label: '平衡记忆' },
  { id: 'long_context', label: '长上下文记忆' },
  { id: 'off', label: '关闭记忆' },
]

function makePresetId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `rp_${crypto.randomUUID()}`
  }
  return `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function safeLlmConfig(value = {}) {
  return {
    backend: String(value.backend || 'openai'),
    model: String(value.model || 'gpt-4o-mini'),
    base_url: String(value.base_url || ''),
    temperature: normalizeNumber(value.temperature, 0.8),
    max_tokens: Math.round(normalizeNumber(value.max_tokens, 4096)),
    top_p: normalizeNumber(value.top_p, 0.95),
  }
}

function safeMemoryPolicy(value = {}) {
  const mode = MEMORY_MODES.some((item) => item.id === value.mode) ? value.mode : 'visitor_state'
  return {
    mode,
    short_term: value.short_term ?? true,
    mid_term: value.mid_term ?? mode !== 'visitor_state',
    long_term: value.long_term ?? mode === 'long_context',
    budget_tokens: Math.round(normalizeNumber(value.budget_tokens, 1200)),
    notes: String(value.notes || ''),
  }
}

function normalizePreset(preset = {}) {
  const id = String(preset.id || makePresetId()).trim() || makePresetId()
  return {
    id,
    name: String(preset.name || preset.title || id || '未命名预设').trim() || '未命名预设',
    description: String(preset.description || ''),
    version: String(preset.version || '1.0'),
    built_in: Boolean(preset.built_in),
    model_hint: String(preset.model_hint || preset.best_for || ''),
    llm_config: safeLlmConfig(preset.llm_config || preset.config || {}),
    prompt_blocks: Array.isArray(preset.prompt_blocks) ? preset.prompt_blocks : [],
    output_rules: Array.isArray(preset.output_rules) ? preset.output_rules : [],
    memory_policy: safeMemoryPolicy(preset.memory_policy || {}),
  }
}

function normalizePresets(value) {
  return Array.isArray(value) ? value.map(normalizePreset) : []
}

function capturePresetFromTavern(tavern, base = {}) {
  return normalizePreset({
    ...base,
    llm_config: tavern?.llm_config || base.llm_config,
    prompt_blocks: tavern?.prompt_blocks || base.prompt_blocks || [],
    output_rules: tavern?.output_rules || base.output_rules || [],
    memory_policy: tavern?.memory_policy || base.memory_policy || {},
  })
}

function summarizePreset(preset) {
  const llm = preset?.llm_config || {}
  const promptBlockCount = preset?.prompt_blocks?.length || 0
  const ruleCount = preset?.output_rules?.length || 0
  return `${llm.backend || 'AI'} · ${llm.model || 'model'} · ${promptBlockCount || '默认'} 段落 · ${ruleCount || '默认'} 护栏`
}

export default function PresetManager({ tavern, ownerId, onClose, onPresetApplied }) {
  const tavernService = getDefaultTavernService()
  const fallbackPresets = useMemo(() => normalizePresets(tavern?.runtime_presets || []), [tavern?.id])

  const [presets, setPresets] = useState(fallbackPresets)
  const [defaultPresets, setDefaultPresets] = useState([])
  const [selectedId, setSelectedId] = useState(tavern?.active_preset_id || fallbackPresets[0]?.id || '')
  const [draft, setDraft] = useState(fallbackPresets[0] || null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let alive = true
    async function loadPresets() {
      if (!tavern?.id) return
      setLoading(true)
      setError('')
      setStatus('')
      try {
        const payload = await tavernService.getRuntimePresets(tavern.id, ownerId)
        if (!alive) return
        const loaded = normalizePresets(payload.presets || [])
        const defaults = normalizePresets(payload.default_presets || [])
        const activeId = payload.active_preset_id || tavern?.active_preset_id || loaded[0]?.id || ''
        const activePreset = loaded.find((preset) => preset.id === activeId) || loaded[0] || null
        setPresets(loaded)
        setDefaultPresets(defaults)
        setSelectedId(activePreset?.id || '')
        setDraft(activePreset)
        setDirty(false)
      } catch (err) {
        if (alive) setError(`加载运行预设失败：${err.message}`)
      } finally {
        if (alive) setLoading(false)
      }
    }
    loadPresets()
    return () => { alive = false }
  }, [tavern?.id, ownerId])

  const customPresets = presets.filter((preset) => !preset.built_in)
  const selectedPreset = presets.find((preset) => preset.id === selectedId) || null
  const canEditDraft = draft && !draft.built_in

  function upsertDraft(options = {}) {
    if (!draft) return presets
    const normalizedDraft = normalizePreset(draft)
    const next = presets.some((preset) => preset.id === normalizedDraft.id)
      ? presets.map((preset) => (preset.id === normalizedDraft.id ? normalizedDraft : preset))
      : [...presets, normalizedDraft]
    setPresets(next)
    setDraft(normalizedDraft)
    setSelectedId(normalizedDraft.id)
    setDirty(true)
    if (!options.silent) setStatus('预设已暂存，保存后会出现在这间酒馆的自定义预设里。')
    return next
  }

  function handleSelect(preset) {
    const normalized = normalizePreset(preset)
    setSelectedId(normalized.id)
    setDraft(normalized)
    setError('')
    setStatus('')
  }

  function handlePatchDraft(patch) {
    if (!draft || draft.built_in) return
    setDraft((prev) => normalizePreset({ ...(prev || {}), ...patch }))
    setDirty(true)
    setStatus('')
  }

  function handlePatchLlm(patch) {
    handlePatchDraft({ llm_config: { ...(draft?.llm_config || {}), ...patch } })
  }

  function handlePatchMemory(patch) {
    handlePatchDraft({ memory_policy: { ...(draft?.memory_policy || {}), ...patch } })
  }

  function handleDuplicate(preset = draft) {
    if (!preset) return
    const copy = normalizePreset({
      ...preset,
      id: makePresetId(),
      name: `${preset.name || '运行预设'} 副本`,
      built_in: false,
    })
    setPresets((prev) => [...prev, copy])
    setDraft(copy)
    setSelectedId(copy.id)
    setDirty(true)
    setStatus('已复制为自定义预设，可以编辑后保存。')
  }

  function handleCaptureCurrent() {
    if (!draft || draft.built_in) return
    const captured = capturePresetFromTavern(tavern, draft)
    setDraft(captured)
    setPresets((prev) => prev.map((preset) => (preset.id === captured.id ? captured : preset)))
    setDirty(true)
    setStatus('已把当前酒馆的 AI 参数、段落、护栏和记忆策略写入此预设。')
  }

  function handleDeletePreset() {
    if (!draft || draft.built_in) return
    const next = presets.filter((preset) => preset.id !== draft.id)
    const nextSelected = next[0] || null
    setPresets(next)
    setDraft(nextSelected)
    setSelectedId(nextSelected?.id || '')
    setDirty(true)
    setStatus('自定义预设已删除，保存后生效。')
  }

  async function handleSave() {
    if (!tavern?.id) return
    const next = draft && !draft.built_in ? upsertDraft({ silent: true }) : presets
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const payload = await tavernService.saveRuntimePresets(
        tavern.id,
        next.filter((preset) => !preset.built_in).map(normalizePreset),
        ownerId,
      )
      const loaded = normalizePresets(payload.presets || [])
      setPresets(loaded)
      setDraft(loaded.find((preset) => preset.id === selectedId) || loaded[0] || null)
      setDirty(false)
      setStatus('自定义运行预设已保存。')
      if (payload.tavern && onPresetApplied) onPresetApplied(payload.tavern)
    } catch (err) {
      setError(`保存失败：${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleApply() {
    if (!tavern?.id || !draft) return
    const presetToApply = normalizePreset(draft)
    setApplying(true)
    setError('')
    setStatus('')
    try {
      const payload = await tavernService.applyRuntimePreset(
        tavern.id,
        presetToApply.built_in ? { preset_id: presetToApply.id } : { preset: presetToApply },
        ownerId,
      )
      setSelectedId(payload.active_preset_id || presetToApply.id)
      setStatus('运行预设已应用：AI 参数、段落、护栏和记忆策略已同步到酒馆。')
      if (payload.tavern && onPresetApplied) onPresetApplied(payload.tavern)
    } catch (err) {
      setError(`应用失败：${err.message}`)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="modal-overlay preset-manager-overlay" onClick={onClose}>
      <div className="modal-content panel preset-manager-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header preset-manager-header">
          <div>
            <p className="mini-label">运行预设</p>
            <h3>{tavern?.name || '酒馆'} 的 AI 运行方案</h3>
            <p className="note muted">把模型参数、Prompt 段落、记忆策略和输出护栏打包成可复用方案。</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>&times;</button>
        </header>

        <div className="preset-manager-summary">
          <span>内置 {defaultPresets.length}</span>
          <strong>自定义 {customPresets.length}</strong>
          {tavern?.active_preset_id && <span>当前 {tavern.active_preset_id}</span>}
          {dirty && <em>有未保存更改</em>}
        </div>

        <div className="preset-manager-body">
          <aside className="preset-manager-list">
            <div className="preset-manager-list-header">
              <strong>预设列表</strong>
              <button className="secondary" type="button" onClick={() => handleDuplicate(selectedPreset || defaultPresets[0])}>+ 复制</button>
            </div>
            {loading ? (
              <div className="preset-manager-empty">正在加载预设...</div>
            ) : presets.length === 0 ? (
              <div className="preset-manager-empty">暂无预设。</div>
            ) : (
              <div className="preset-manager-items">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-card ${preset.id === selectedId ? 'is-active' : ''}`}
                    onClick={() => handleSelect(preset)}
                  >
                    <div>
                      <strong>{preset.name}</strong>
                      <small>{preset.built_in ? '内置' : '自定义'}</small>
                    </div>
                    <span>{preset.description || summarizePreset(preset)}</span>
                    <em>{summarizePreset(preset)}</em>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="preset-manager-editor">
            {!draft ? (
              <div className="preset-manager-placeholder">选择一个预设，或从内置预设复制一个自定义版本。</div>
            ) : (
              <div className="preset-manager-form">
                {draft.built_in ? (
                  <div className="preset-manager-note">
                    内置预设不能直接修改。点击“复制为自定义”后，可以调整参数、保存并应用。
                  </div>
                ) : null}

                <div className="preset-manager-form-grid">
                  <label className="form-group">
                    <span>预设名</span>
                    <input value={draft.name} disabled={!canEditDraft} onChange={(event) => handlePatchDraft({ name: event.target.value })} />
                  </label>
                  <label className="form-group">
                    <span>适合模型 / 场景</span>
                    <input value={draft.model_hint} disabled={!canEditDraft} onChange={(event) => handlePatchDraft({ model_hint: event.target.value })} />
                  </label>
                </div>

                <label className="form-group">
                  <span>说明</span>
                  <textarea rows={3} value={draft.description} disabled={!canEditDraft} onChange={(event) => handlePatchDraft({ description: event.target.value })} />
                </label>

                <section className="preset-manager-section">
                  <div>
                    <strong>AI 参数</strong>
                    <small>不会保存 API Key；只保存可分享的模型参数。</small>
                  </div>
                  <div className="preset-manager-form-grid">
                    <label className="form-group">
                      <span>服务</span>
                      <input value={draft.llm_config.backend} disabled={!canEditDraft} onChange={(event) => handlePatchLlm({ backend: event.target.value })} />
                    </label>
                    <label className="form-group">
                      <span>模型</span>
                      <input value={draft.llm_config.model} disabled={!canEditDraft} onChange={(event) => handlePatchLlm({ model: event.target.value })} />
                    </label>
                  </div>
                  <label className="form-group">
                    <span>Base URL</span>
                    <input value={draft.llm_config.base_url} disabled={!canEditDraft} onChange={(event) => handlePatchLlm({ base_url: event.target.value })} />
                  </label>
                  <div className="preset-manager-form-grid is-three">
                    <label className="form-group">
                      <span>温度</span>
                      <input type="number" step="0.05" min="0" max="2" value={draft.llm_config.temperature} disabled={!canEditDraft} onChange={(event) => handlePatchLlm({ temperature: event.target.value })} />
                    </label>
                    <label className="form-group">
                      <span>最长回复预算</span>
                      <input type="number" min="256" value={draft.llm_config.max_tokens} disabled={!canEditDraft} onChange={(event) => handlePatchLlm({ max_tokens: event.target.value })} />
                    </label>
                    <label className="form-group">
                      <span>Top-P</span>
                      <input type="number" step="0.01" min="0.01" max="1" value={draft.llm_config.top_p} disabled={!canEditDraft} onChange={(event) => handlePatchLlm({ top_p: event.target.value })} />
                    </label>
                  </div>
                </section>

                <section className="preset-manager-section">
                  <div>
                    <strong>组合内容</strong>
                    <small>应用后会同步到酒馆当前配置。</small>
                  </div>
                  <div className="preset-manager-bundles">
                    <span>{draft.prompt_blocks?.length || 0} 个 Prompt 段落</span>
                    <span>{draft.output_rules?.length || 0} 条输出护栏</span>
                    <span>记忆：{MEMORY_MODES.find((mode) => mode.id === draft.memory_policy.mode)?.label || draft.memory_policy.mode}</span>
                  </div>
                  <div className="preset-manager-memory-grid">
                    <label className="form-group">
                      <span>记忆模式</span>
                      <select value={draft.memory_policy.mode} disabled={!canEditDraft} onChange={(event) => handlePatchMemory({ mode: event.target.value })}>
                        {MEMORY_MODES.map((mode) => (
                          <option key={mode.id} value={mode.id}>{mode.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="form-group">
                      <span>记忆预算</span>
                      <input type="number" min="0" value={draft.memory_policy.budget_tokens} disabled={!canEditDraft} onChange={(event) => handlePatchMemory({ budget_tokens: event.target.value })} />
                    </label>
                  </div>
                  {canEditDraft && (
                    <button className="secondary" type="button" onClick={handleCaptureCurrent}>
                      用当前酒馆配置覆盖此预设
                    </button>
                  )}
                </section>

                <div className="preset-manager-actions">
                  <button type="button" className="secondary" onClick={() => handleDuplicate(draft)}>
                    复制为自定义
                  </button>
                  {canEditDraft && (
                    <>
                      <button type="button" className="secondary" onClick={() => upsertDraft()}>暂存编辑</button>
                      <button type="button" className="btn-danger-ghost" onClick={handleDeletePreset}>删除</button>
                    </>
                  )}
                  <button type="button" className="btn-primary" onClick={handleApply} disabled={applying}>
                    {applying ? '应用中...' : '应用到酒馆'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {(error || status) && (
          <div className={error ? 'preset-manager-error' : 'preset-manager-status'}>
            {error || status}
          </div>
        )}

        <footer className="preset-manager-footer">
          <p className="note muted">预设只保存可分享参数，不保存 API Key；应用预设会尽量保留当前同服务的密钥。</p>
          <div>
            <button className="secondary" type="button" onClick={onClose}>关闭</button>
            <button className="primary" type="button" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存自定义预设'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
