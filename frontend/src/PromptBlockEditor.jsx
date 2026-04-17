import { useEffect, useMemo, useState } from 'react'
import { getDefaultTavernService } from './services/tavernService'

const PROMPT_BLOCK_TYPES = [
  { id: 'scene', label: '酒馆场景' },
  { id: 'character', label: '角色' },
  { id: 'world_info', label: '世界书' },
  { id: 'visitor_state', label: '访客关系' },
  { id: 'short_memory', label: '短期记忆' },
  { id: 'mid_memory', label: '中期记忆' },
  { id: 'long_memory', label: '长期记忆' },
  { id: 'style_guard', label: '风格护栏' },
  { id: 'author_note', label: '作者备注' },
  { id: 'output_rule', label: '输出护栏提示' },
  { id: 'custom', label: '自定义' },
]

function makeBlockId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pb_${crypto.randomUUID()}`
  }
  return `pb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeBlock(block = {}) {
  const id = String(block.id || makeBlockId()).trim() || makeBlockId()
  const type = PROMPT_BLOCK_TYPES.some((item) => item.id === block.type) ? block.type : 'custom'
  const order = Number(block.order)
  const tokenBudget = Number(block.token_budget)
  return {
    id,
    name: String(block.name || id || '未命名段落').trim() || '未命名段落',
    enabled: block.enabled ?? true,
    type,
    order: Number.isFinite(order) ? order : 100,
    template: String(block.template || ''),
    token_budget: Number.isFinite(tokenBudget) ? Math.max(0, Math.round(tokenBudget)) : 0,
    built_in: Boolean(block.built_in),
  }
}

function normalizeBlocks(value) {
  return Array.isArray(value)
    ? value.map(normalizeBlock).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    : []
}

function getTypeLabel(type) {
  return PROMPT_BLOCK_TYPES.find((item) => item.id === type)?.label || type || '自定义'
}

function getBlockPreview(block) {
  if (block.type === 'world_info') return '由命中的世界书条目动态注入'
  const text = String(block.template || '').trim()
  if (!text) return '还没有填写模板'
  return text.length > 76 ? `${text.slice(0, 76)}...` : text
}

export default function PromptBlockEditor({ tavern, ownerId, onClose, onBlocksChanged }) {
  const tavernService = getDefaultTavernService()
  const fallbackBlocks = useMemo(() => normalizeBlocks(tavern?.prompt_blocks || []), [tavern?.id])

  const [blocks, setBlocks] = useState(fallbackBlocks)
  const [defaultBlocks, setDefaultBlocks] = useState([])
  const [selectedId, setSelectedId] = useState(fallbackBlocks[0]?.id || '')
  const [draft, setDraft] = useState(fallbackBlocks[0] || null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [previewMessage, setPreviewMessage] = useState('我想了解这里最近发生了什么。')
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let alive = true
    async function loadBlocks() {
      if (!tavern?.id) return
      setLoading(true)
      setError('')
      setStatus('')
      try {
        const payload = await tavernService.getPromptBlocks(tavern.id, ownerId)
        if (!alive) return
        const nextBlocks = normalizeBlocks(payload.blocks || [])
        const nextDefaults = normalizeBlocks(payload.default_blocks || [])
        setBlocks(nextBlocks)
        setDefaultBlocks(nextDefaults)
        setSelectedId(nextBlocks[0]?.id || '')
        setDraft(nextBlocks[0] || null)
        setDirty(false)
        setPreview(null)
      } catch (err) {
        if (!alive) return
        setError(`加载 Prompt 段落失败：${err.message}`)
      } finally {
        if (alive) setLoading(false)
      }
    }
    loadBlocks()
    return () => { alive = false }
  }, [tavern?.id, ownerId])

  const enabledCount = blocks.filter((block) => block.enabled).length
  const builtInCount = blocks.filter((block) => block.built_in).length

  function applyDraftToBlocks(options = {}) {
    if (!draft) return blocks
    const normalizedDraft = normalizeBlock(draft)
    const nextBlocks = normalizeBlocks(
      blocks.some((block) => block.id === normalizedDraft.id)
        ? blocks.map((block) => (block.id === normalizedDraft.id ? normalizedDraft : block))
        : [normalizedDraft, ...blocks],
    )
    setBlocks(nextBlocks)
    setDraft(normalizedDraft)
    setSelectedId(normalizedDraft.id)
    setDirty(true)
    if (!options.silent) setStatus('段落已暂存，记得保存后才会影响聊天。')
    return nextBlocks
  }

  function handleSelectBlock(block) {
    setSelectedId(block.id)
    setDraft(normalizeBlock(block))
    setError('')
    setStatus('')
  }

  function handleUpdateDraft(patch) {
    setDraft((prev) => normalizeBlock({ ...(prev || {}), ...patch }))
    setStatus('')
  }

  function handleAddBlock() {
    const nextBlock = normalizeBlock({
      id: makeBlockId(),
      name: '自定义段落',
      enabled: true,
      type: 'custom',
      order: blocks.length ? Math.max(...blocks.map((block) => Number(block.order || 0))) + 10 : 100,
      template: '【补充规则】\n',
      token_budget: 600,
      built_in: false,
    })
    setBlocks((prev) => normalizeBlocks([nextBlock, ...prev]))
    setSelectedId(nextBlock.id)
    setDraft(nextBlock)
    setDirty(true)
    setStatus('已新增自定义段落。')
  }

  function handleDuplicateBlock() {
    if (!draft) return
    const nextBlock = normalizeBlock({
      ...draft,
      id: makeBlockId(),
      name: `${draft.name || '段落'} 副本`,
      built_in: false,
      order: Number(draft.order || 100) + 1,
    })
    setBlocks((prev) => normalizeBlocks([nextBlock, ...prev]))
    setSelectedId(nextBlock.id)
    setDraft(nextBlock)
    setDirty(true)
    setStatus('已复制段落。')
  }

  function handleDeleteBlock(blockId) {
    const target = blocks.find((block) => block.id === blockId)
    if (target?.built_in) {
      setError('内置段落不能删除，可以关闭或改写。')
      return
    }
    const nextBlocks = blocks.filter((block) => block.id !== blockId)
    setBlocks(nextBlocks)
    const nextSelected = nextBlocks[0] || null
    setSelectedId(nextSelected?.id || '')
    setDraft(nextSelected || null)
    setDirty(true)
    setStatus('段落已删除，保存后生效。')
  }

  function handleResetDefaults() {
    const nextBlocks = normalizeBlocks(defaultBlocks)
    setBlocks(nextBlocks)
    setSelectedId(nextBlocks[0]?.id || '')
    setDraft(nextBlocks[0] || null)
    setDirty(true)
    setPreview(null)
    setStatus('已恢复内置默认段落，保存后生效。')
  }

  async function handleSave() {
    if (!tavern?.id) return
    const nextBlocks = applyDraftToBlocks({ silent: true })
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const payload = await tavernService.savePromptBlocks(tavern.id, nextBlocks.map(normalizeBlock), ownerId)
      const savedBlocks = normalizeBlocks(payload.blocks || payload.tavern?.prompt_blocks || nextBlocks)
      setBlocks(savedBlocks)
      setDraft(savedBlocks.find((block) => block.id === selectedId) || savedBlocks[0] || null)
      setDirty(false)
      setStatus('Prompt 段落已保存，新的聊天会按这些段落组装上下文。')
      if (payload.tavern && onBlocksChanged) onBlocksChanged(payload.tavern)
    } catch (err) {
      setError(`保存失败：${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handlePreview() {
    if (!tavern?.id) return
    const nextBlocks = applyDraftToBlocks({ silent: true })
    setPreviewing(true)
    setError('')
    setPreview(null)
    try {
      const payload = await tavernService.previewPromptBlocks(tavern.id, {
        message: previewMessage,
        blocks: nextBlocks,
      }, ownerId)
      setPreview(payload)
    } catch (err) {
      setError(`预览失败：${err.message}`)
    } finally {
      setPreviewing(false)
    }
  }

  return (
    <div className="modal-overlay prompt-block-overlay" onClick={onClose}>
      <div className="modal-content panel prompt-block-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header prompt-block-header">
          <div>
            <p className="mini-label">Prompt Block 段落引擎</p>
            <h3>{tavern?.name || '酒馆'} 的段落结构</h3>
            <p className="note muted">用开关、顺序和模板控制 AI 在回复前读到哪些上下文段落。</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>&times;</button>
        </header>

        <div className="prompt-block-summary">
          <span>段落 {blocks.length}</span>
          <strong>启用 {enabledCount}</strong>
          <span>内置 {builtInCount}</span>
          {dirty && <em>有未保存更改</em>}
        </div>

        <div className="prompt-block-body">
          <aside className="prompt-block-list">
            <div className="prompt-block-list-header">
              <strong>段落列表</strong>
              <button className="secondary" type="button" onClick={handleAddBlock}>+ 新建</button>
            </div>
            {loading ? (
              <div className="prompt-block-empty">正在加载段落...</div>
            ) : blocks.length === 0 ? (
              <div className="prompt-block-empty">
                <p>还没有段落。</p>
                <button className="secondary" type="button" onClick={handleResetDefaults}>恢复默认</button>
              </div>
            ) : (
              <div className="prompt-block-items">
                {blocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    className={`prompt-block-card ${block.id === selectedId ? 'is-active' : ''} ${!block.enabled ? 'is-disabled' : ''}`}
                    onClick={() => handleSelectBlock(block)}
                  >
                    <div>
                      <strong>{block.order}. {block.name}</strong>
                      <small>{getTypeLabel(block.type)}{block.built_in ? ' · 内置' : ''}</small>
                    </div>
                    <span>{getBlockPreview(block)}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="prompt-block-editor-area">
            {!draft ? (
              <div className="prompt-block-placeholder">选择一个段落开始编辑，或新建自定义段落。</div>
            ) : (
              <div className="prompt-block-form">
                <div className="prompt-block-form-grid">
                  <label className="form-group">
                    <span>段落名</span>
                    <input value={draft.name} onChange={(event) => handleUpdateDraft({ name: event.target.value })} />
                  </label>
                  <label className="form-group">
                    <span>类型</span>
                    <select value={draft.type} onChange={(event) => handleUpdateDraft({ type: event.target.value })}>
                      {PROMPT_BLOCK_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="prompt-block-form-grid is-narrow">
                  <label className="form-group">
                    <span>顺序</span>
                    <input type="number" value={draft.order} onChange={(event) => handleUpdateDraft({ order: event.target.value })} />
                  </label>
                  <label className="form-group">
                    <span>预算（粗略 token）</span>
                    <input type="number" min="0" value={draft.token_budget} onChange={(event) => handleUpdateDraft({ token_budget: event.target.value })} />
                  </label>
                  <label className="prompt-block-toggle">
                    <input type="checkbox" checked={Boolean(draft.enabled)} onChange={(event) => handleUpdateDraft({ enabled: event.target.checked })} />
                    <span>启用这个段落</span>
                  </label>
                </div>

                <label className="form-group">
                  <span>模板</span>
                  <textarea
                    value={draft.template}
                    rows={9}
                    onChange={(event) => handleUpdateDraft({ template: event.target.value })}
                    placeholder="支持 {{char}}、{{user}}、{{tavern_name}}、{{input}} 等变量"
                    disabled={draft.type === 'world_info'}
                  />
                </label>

                <div className="prompt-block-macro-help">
                  <strong>常用变量</strong>
                  <span>{'{{char}} 角色名'}</span>
                  <span>{'{{user}} 访客称呼'}</span>
                  <span>{'{{tavern_name}} 酒馆名'}</span>
                  <span>{'{{input}} 当前输入'}</span>
                  <span>{'{{visitor_facts}} 访客关系事实'}</span>
                </div>

                <div className="prompt-block-actions">
                  <button type="button" className="secondary" onClick={() => applyDraftToBlocks()}>暂存当前段落</button>
                  <button type="button" className="secondary" onClick={handleDuplicateBlock}>复制</button>
                  {!draft.built_in && (
                    <button type="button" className="btn-danger-ghost" onClick={() => handleDeleteBlock(draft.id)}>删除</button>
                  )}
                </div>

                <section className="prompt-block-preview">
                  <div className="prompt-block-preview-header">
                    <div>
                      <strong>组装预览</strong>
                      <small>不会调用 AI，只展示最终 messages 顺序。</small>
                    </div>
                    <button type="button" className="secondary" onClick={handlePreview} disabled={previewing}>
                      {previewing ? '预览中...' : '预览段落'}
                    </button>
                  </div>
                  <textarea rows={3} value={previewMessage} onChange={(event) => setPreviewMessage(event.target.value)} />
                  {preview && (
                    <div className="prompt-block-preview-result">
                      <strong>{preview.message_count || preview.messages?.length || 0} 条 messages</strong>
                      {(preview.messages || []).slice(0, 10).map((message, index) => (
                        <article key={`${message.role}-${index}`}>
                          <small>{index + 1}. {message.role}</small>
                          <pre>{message.content}</pre>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>

        {(error || status) && (
          <div className={error ? 'prompt-block-error' : 'prompt-block-status'}>
            {error || status}
          </div>
        )}

        <footer className="prompt-block-footer">
          <p className="note muted">世界书段落由命中结果动态生成；关闭后不会向 AI 注入世界书。</p>
          <div>
            <button className="secondary" type="button" onClick={handleResetDefaults} disabled={!defaultBlocks.length}>恢复默认</button>
            <button className="secondary" type="button" onClick={onClose}>关闭</button>
            <button className="primary" type="button" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存段落'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
