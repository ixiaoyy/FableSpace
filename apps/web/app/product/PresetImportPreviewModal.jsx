import { useMemo, useState } from 'react'
import { applyPresetImport, errorMessage, previewPresetImport } from '../lib/spaces'

const SAMPLE_PRESET = {
  name: '示例社区预设',
  temperature: 0.85,
  prompts: [
    {
      name: 'Space Style',
      content: 'Use warm space atmosphere and concise dialogue.',
    },
    {
      name: 'Rain World Info',
      content: 'world_info keyword rain: Rain echoes in the back room.',
    },
    {
      name: 'Mira Persona',
      content: 'character persona: Mira speaks softly and stays in character.',
    },
    {
      name: 'Model note',
      content: 'Optimized for a specific model; owner should review before migration.',
    },
  ],
}

const TARGET_OPTIONS = [
  { id: 'prompt_blocks', label: 'Prompt 段落' },
  { id: 'world_info', label: '世界书' },
  { id: 'characters', label: '角色卡' },
]

function countLabel(summary = {}) {
  return `${summary.supported || 0} 可应用 · ${summary.warning || 0} 需复核 · ${summary.blocked || 0} 已阻断`
}

function defaultTargetForItem(item = {}) {
  if (item.category === 'world_info') return 'world_info'
  if (item.category === 'role_consistency') return 'characters'
  return 'prompt_blocks'
}

function diffCountLabel(diff = {}) {
  const promptBlocks = diff.prompt_blocks?.length || 0
  const worldInfo = diff.world_info?.length || 0
  const characters = diff.characters?.length || 0
  const runtimePresets = diff.runtime_presets?.length || 0
  return `${promptBlocks} Prompt · ${worldInfo} 世界书 · ${characters} 角色 · ${runtimePresets} 运行预设`
}

function PreviewGroup({
  title,
  tone,
  items = [],
  selectable = false,
  selectedIds = [],
  targetMap = {},
  onToggle,
  onTargetChange,
}) {
  const selectedSet = new Set(selectedIds)
  return (
    <section className={`preset-import-preview__group is-${tone}`}>
      <div className="preset-import-preview__group-head">
        <strong>{title}</strong>
        <span>{items.length} 项</span>
      </div>
      {items.length === 0 ? (
        <p className="note muted">暂无条目。</p>
      ) : (
        <div className="preset-import-preview__items">
          {items.map((item) => {
            const checked = selectedSet.has(item.id)
            return (
              <article key={item.id || `${item.name}-${item.category}`} className="preset-import-preview__item">
                <div>
                  <strong>{item.name || '未命名模块'}</strong>
                  <small>{item.category || item.severity}</small>
                </div>
                {selectable ? (
                  <div className="preset-import-preview__apply-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle?.(item.id)}
                      />
                      <span>选择应用</span>
                    </label>
                    <select
                      value={targetMap[item.id] || defaultTargetForItem(item)}
                      onChange={(event) => onTargetChange?.(item.id, event.target.value)}
                      disabled={!checked}
                      aria-label={`${item.name || '模块'} 应用目标`}
                    >
                      {TARGET_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <p>{item.reason}</p>
                {item.sample ? <pre>{item.sample}</pre> : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function DiffList({ title, items = [] }) {
  return (
    <section className="preset-import-preview__diff-section">
      <strong>{title}</strong>
      {items.length === 0 ? (
        <p className="note muted">暂无变更。</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id || item.name}>{item.name || item.id || '未命名'}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function PresetImportPreviewModal({ space, ownerId = '', onClose, onApplied }) {
  const [rawText, setRawText] = useState(() => JSON.stringify(SAMPLE_PRESET, null, 2))
  const [result, setResult] = useState(null)
  const [applyPlan, setApplyPlan] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [targetMap, setTargetMap] = useState({})
  const [includeRuntimeParameters, setIncludeRuntimeParameters] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  const runtimeRows = useMemo(() => {
    const entries = Object.entries(result?.runtime_parameters || {})
    return entries.map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value) }))
  }, [result])

  const selectedCount = selectedIds.length

  function parsePreset() {
    try {
      return JSON.parse(rawText)
    } catch (err) {
      throw new Error(`JSON 解析失败：${err.message}`)
    }
  }

  function resetApplyState() {
    setApplyPlan(null)
    setStatus('')
  }

  async function handlePreview() {
    setError('')
    setResult(null)
    resetApplyState()
    let parsed
    try {
      parsed = parsePreset()
    } catch (err) {
      setError(err.message)
      return
    }
    setLoading(true)
    try {
      const payload = await previewPresetImport(space.id, { preset: parsed }, ownerId)
      const supported = payload.supported || []
      const nextTargetMap = Object.fromEntries(supported.map((item) => [item.id, defaultTargetForItem(item)]))
      setResult(payload)
      setSelectedIds(supported.map((item) => item.id))
      setTargetMap(nextTargetMap)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function requestApplyPlan(confirm = false) {
    if (!selectedIds.length) {
      setError('请至少选择一个 supported 条目。warning / blocked 不会被应用。')
      return null
    }
    let parsed
    try {
      parsed = parsePreset()
    } catch (err) {
      setError(err.message)
      return null
    }
    setApplying(true)
    setError('')
    setStatus('')
    try {
      const payload = await applyPresetImport(
        space.id,
        {
          preset: parsed,
          selected_ids: selectedIds,
          target_map: targetMap,
          include_runtime_parameters: includeRuntimeParameters,
          confirm,
        },
        ownerId,
      )
      setApplyPlan(payload)
      if (payload.applied) {
        setStatus(`已应用所选 supported 子集：${diffCountLabel(payload.diff)}。`)
        if (payload.space && onApplied) onApplied(payload.space)
      } else {
        setStatus(`已生成应用前 diff，可确认或取消：${diffCountLabel(payload.diff)}。`)
      }
      return payload
    } catch (err) {
      setError(errorMessage(err))
      return null
    } finally {
      setApplying(false)
    }
  }

  function toggleSelected(itemId) {
    resetApplyState()
    setSelectedIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  function changeTarget(itemId, target) {
    resetApplyState()
    setTargetMap((prev) => ({ ...prev, [itemId]: target }))
  }

  function loadSample() {
    setRawText(JSON.stringify(SAMPLE_PRESET, null, 2))
    setError('')
    setResult(null)
    setSelectedIds([])
    setTargetMap({})
    resetApplyState()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content panel preset-import-preview" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="mini-label">Preset Import · owner confirmed apply</p>
            <h3>预览并应用预设：{space?.name || '当前空间'}</h3>
            <p className="note muted">
              粘贴社区 / SillyTavern 风格 JSON，先生成风险报告；只有店主选择 supported 子集、查看 diff 后，才会写入空间。
            </p>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>&times;</button>
        </header>

        <div className="preset-import-preview__body">
          <label className="preset-import-preview__editor">
            <span className="mini-label">预设 JSON</span>
            <textarea
              value={rawText}
              onChange={(event) => {
                setRawText(event.target.value)
                setResult(null)
                setSelectedIds([])
                setTargetMap({})
                resetApplyState()
              }}
              rows={14}
              spellCheck={false}
              placeholder='{"name":"社区预设","prompts":[...]}'
            />
          </label>

          <aside className="preset-import-preview__side">
            <div className="preset-import-preview__notice">
              <strong>先 diff，后确认</strong>
              <p>Preview 会分类 supported / warning / blocked；Apply 只接受你勾选的 supported 条目。</p>
              <p>warning / blocked 条目会保留在报告里供识别风险，但不会成为可用 Prompt 或角色内容。</p>
              <label className="preset-import-preview__runtime-toggle">
                <input
                  type="checkbox"
                  checked={includeRuntimeParameters}
                  onChange={(event) => {
                    setIncludeRuntimeParameters(event.target.checked)
                    resetApplyState()
                  }}
                />
                <span>把安全运行参数生成自定义 runtime preset</span>
              </label>
            </div>
            <div className="modal-actions preset-import-preview__actions">
              <button type="button" className="secondary" onClick={loadSample} disabled={loading || applying}>填入示例</button>
              <button type="button" className="primary" onClick={handlePreview} disabled={loading || applying || !rawText.trim()}>
                {loading ? '预览中...' : '生成风险报告'}
              </button>
              <button type="button" className="secondary" onClick={() => requestApplyPlan(false)} disabled={applying || !result || selectedCount === 0}>
                {applying ? '处理中...' : `预览应用 diff（${selectedCount}）`}
              </button>
              <button type="button" className="primary" onClick={() => requestApplyPlan(true)} disabled={applying || !applyPlan || applyPlan.applied}>
                确认应用所选 supported
              </button>
            </div>
            {error ? <div className="llm-save-result error">{error}</div> : null}
            {status ? <div className="llm-save-result success">{status}</div> : null}
          </aside>
        </div>

        {result ? (
          <section className="preset-import-preview__report">
            <div className="preset-import-preview__summary">
              <div>
                <p className="mini-label">报告摘要</p>
                <h4>{result.preset_name || '未命名预设'}</h4>
                <p>{countLabel(result.summary)} · 已选择 {selectedCount} 项</p>
              </div>
              <span className="preset-import-preview__badge">applied: {String(applyPlan?.applied || result.applied)}</span>
            </div>

            {runtimeRows.length > 0 ? (
              <div className="preset-import-preview__runtime">
                <strong>识别到的运行参数</strong>
                <div>
                  {runtimeRows.map((row) => (
                    <span key={row.key}>{row.key}: {row.value}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {applyPlan?.diff ? (
              <div className="preset-import-preview__diff">
                <div className="preset-import-preview__summary">
                  <div>
                    <p className="mini-label">应用前 diff</p>
                    <h4>{diffCountLabel(applyPlan.diff)}</h4>
                  </div>
                  <span className="preset-import-preview__badge">confirm_required: {String(applyPlan.confirm_required)}</span>
                </div>
                <div className="preset-import-preview__diff-grid">
                  <DiffList title="Prompt 段落" items={applyPlan.diff.prompt_blocks || []} />
                  <DiffList title="世界书" items={applyPlan.diff.world_info || []} />
                  <DiffList title="角色卡" items={applyPlan.diff.characters || []} />
                  <DiffList title="运行预设" items={applyPlan.diff.runtime_presets || []} />
                </div>
              </div>
            ) : null}

            <div className="preset-import-preview__groups">
              <PreviewGroup
                title="可应用 supported"
                tone="supported"
                items={result.supported || []}
                selectable
                selectedIds={selectedIds}
                targetMap={targetMap}
                onToggle={toggleSelected}
                onTargetChange={changeTarget}
              />
              <PreviewGroup title="需复核 warning（不可直接应用）" tone="warning" items={result.warnings || []} />
              <PreviewGroup title="已阻断 blocked（不可应用）" tone="blocked" items={result.blocked || []} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
