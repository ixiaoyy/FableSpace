import { useState, useEffect } from 'react'
import { getDefaultTavernService, getTavernAccessIcon, getTavernAccessLabel, getTavernStatusColor, getTavernStatusLabel } from './services/tavernService'
import LLMConfigForm from './LLMConfigForm'
import TavernCreatePanel from './TavernCreatePanel'

/**
 * TavernOwnerPanel — 店主管理面板
 *
 * Props:
 *   ownerId        — 店主 ID
 *   onClose        — () => void — 关闭面板
 *   onTavernCreated — (tavern) => void — 酒馆创建/更新后回调
 *   initialTab     — number — 初始标签页（0=列表，1=创建）
 *   editTavern     — object — 初始要编辑的酒馆数据
 */
export default function TavernOwnerPanel({
  ownerId = '',
  onClose,
  onTavernCreated,
  initialTab = 0,
  editTavern = null,
}) {
  const [tab, setTab] = useState(initialTab)
  const [myTaverns, setMyTaverns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(initialTab === 1 && !editTavern)
  const [editingTavern, setEditingTavern] = useState(editTavern)
  const [editingLlmTavern, setEditingLlmTavern] = useState(null)
  const [llmFormData, setLlmFormData] = useState(null)
  const [savingLlm, setSavingLlm] = useState(false)
  const [llmSaveResult, setLlmSaveResult] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const tavernService = getDefaultTavernService()

  useEffect(() => {
    if (!showCreate && !editingTavern) {
      fetchMyTaverns()
    }
  }, [showCreate, editingTavern])

  // Switch to create tab when editTavern prop is provided
  useEffect(() => {
    if (editTavern) {
      setEditingTavern(editTavern)
      setShowCreate(false)
      setTab(1)
    }
  }, [editTavern])

  async function fetchMyTaverns() {
    setLoading(true)
    setError(null)
    try {
      const result = await tavernService.listTaverns({ owner_id: ownerId })
      const list = Array.isArray(result) ? result : (result?.taverns || [])
      // Filter to only show taverns owned by this user
      setMyTaverns(list.filter(t => t.owner_id === ownerId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(tavern) {
    const newStatus = tavern.status === 'open' ? 'closed' : 'open'
    try {
      await tavernService.updateTavern(tavern.id, { status: newStatus })
      setMyTaverns(prev => prev.map(t => t.id === tavern.id ? { ...t, status: newStatus } : t))
    } catch (err) {
      alert(`更新失败: ${err.message}`)
    }
  }

  async function handleSaveEdit(updatedData) {
    try {
      const result = await tavernService.updateTavern(editingTavern.id, updatedData)
      setMyTaverns(prev => prev.map(t => t.id === editingTavern.id ? { ...t, ...result } : t))
      setEditingTavern(null)
      if (onTavernCreated) onTavernCreated(result)
    } catch (err) {
      alert(`保存失败: ${err.message}`)
    }
  }

  async function handleDelete(tavernId) {
    try {
      await tavernService.deleteTavern(tavernId)
      setMyTaverns(prev => prev.filter(t => t.id !== tavernId))
      setDeleteTarget(null)
    } catch (err) {
      alert(`删除失败: ${err.message}`)
    }
  }

  async function handleSaveLlm() {
    if (!editingLlmTavern || !llmFormData) return
    setSavingLlm(true)
    setLlmSaveResult(null)
    try {
      const result = await tavernService.updateTavern(editingLlmTavern.id, { llm_config: llmFormData })
      setMyTaverns(prev => prev.map(t => t.id === editingLlmTavern.id ? { ...t, ...result } : t))
      setLlmSaveResult({ ok: true, message: 'AI 配置已保存' })
      if (onTavernCreated) onTavernCreated(result)
    } catch (err) {
      setLlmSaveResult({ ok: false, message: `保存失败：${err.message}` })
    } finally {
      setSavingLlm(false)
    }
  }

  function handleTavernCreated(newTavern) {
    setShowCreate(false)
    setEditingTavern(null)
    if (!myTaverns.find(t => t.id === newTavern.id)) {
      setMyTaverns(prev => [newTavern, ...prev])
    } else {
      setMyTaverns(prev => prev.map(t => t.id === newTavern.id ? newTavern : t))
    }
    setTab(0)
    if (onTavernCreated) onTavernCreated(newTavern)
  }

  function openLlmEdit(tavern) {
    setEditingLlmTavern(tavern)
    setLlmFormData({
      backend: tavern.llm_config?.backend || 'openai',
      model: tavern.llm_config?.model || 'gpt-4o-mini',
      api_key: '',  // Don't pre-fill for security
      base_url: tavern.llm_config?.base_url || '',
      temperature: tavern.llm_config?.temperature ?? 0.8,
      max_tokens: tavern.llm_config?.max_tokens ?? 4096,
      top_p: tavern.llm_config?.top_p ?? 1.0,
    })
    setLlmSaveResult(null)
  }

  function closeLlmEdit() {
    setEditingLlmTavern(null)
    setLlmFormData(null)
    setLlmSaveResult(null)
  }

  function handleEditTavern(tavern) {
    setEditingTavern(tavern)
    setShowCreate(false)
  }

  // Show create panel
  if (showCreate) {
    return (
      <div className="owner-create-container">
        <TavernCreatePanel
          initialLat={0}
          initialLon={0}
          onCreated={handleTavernCreated}
          onCancel={() => { setShowCreate(false); setTab(0) }}
        />
      </div>
    )
  }

  // Show edit modal
  if (editingTavern) {
    return (
      <TavernEditModal
        tavern={editingTavern}
        onSave={handleSaveEdit}
        onClose={() => setEditingTavern(null)}
      />
    )
  }

  return (
    <div className="tavern-owner-panel page-enter">
      <header className="owner-header">
        <div className="owner-header__title">
          <h1>我的酒馆控制台</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + 创建新酒馆
        </button>
      </header>

      {loading ? (
        <div className="owner-loading panel">正在读取酒馆数据...</div>
      ) : error ? (
        <div className="owner-error panel">读取失败: {error}</div>
      ) : myTaverns.length === 0 ? (
        <div className="owner-empty panel">
          <div className="empty-icon">🏚️</div>
          <p>你还没有创建任何酒馆。现在就开始你的店主生涯吧！</p>
          <button className="button-link" onClick={() => setShowCreate(true)}>立即创建</button>
        </div>
      ) : (
        <div className="owner-list">
          {myTaverns.map(tavern => (
            <TavernCard
              key={tavern.id}
              tavern={tavern}
              onEdit={() => handleEditTavern(tavern)}
              onToggleStatus={() => handleToggleStatus(tavern)}
              onManageLlm={() => openLlmEdit(tavern)}
              onDelete={() => setDeleteTarget(tavern.id)}
            />
          ))}
        </div>
      )}

      {/* LLM Config Modal */}
      {editingLlmTavern && (
        <div className="modal-overlay" onClick={closeLlmEdit}>
          <div className="modal-content panel llm-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>AI 配置 — {editingLlmTavern.name}</h3>
              <button className="close-btn" onClick={closeLlmEdit}>&times;</button>
            </header>
            <div className="llm-modal-body">
              <p className="form-hint" style={{ marginBottom: 12 }}>
                保存 API Key 后，酒馆将变为"营业中"状态，访客可以和 AI NPC 对话了。
              </p>
              <LLMConfigForm
                value={llmFormData || {}}
                onChange={(cfg) => { setLlmFormData(cfg); setLlmSaveResult(null) }}
                compact={false}
                tavernId={editingLlmTavern.id}
              />
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={closeLlmEdit}>取消</button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleSaveLlm}
                  disabled={savingLlm}
                >
                  {savingLlm ? '保存中...' : '保存 AI 配置'}
                </button>
              </div>
              {llmSaveResult && (
                <div className={`llm-save-result ${llmSaveResult.ok ? 'ok' : 'error'}`}>
                  {llmSaveResult.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content panel delete-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>确认删除酒馆</h3>
              <button className="close-btn" onClick={() => setDeleteTarget(null)}>&times;</button>
            </header>
            <p className="delete-warning">
              删除酒馆将清除所有角色和对话记录。此操作不可恢复。
            </p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" className="btn-danger" onClick={() => handleDelete(deleteTarget)}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TavernCard({ tavern, onEdit, onToggleStatus, onManageLlm, onDelete }) {
  const isOpen = tavern.status === 'open'
  const tokenUsed = tavern.llm_config?.token_used || 0
  const statusColor = getTavernStatusColor(tavern?.status)
  const charCount = tavern?.characters?.length || 0

  return (
    <div className={`tavern-card panel ${!isOpen ? 'is-closed' : ''}`}>
      <div className="tavern-card__header">
        <div className="tavern-card__info">
          <h3>
            {getTavernAccessIcon(tavern.access)} {tavern.name}
          </h3>
          <p className="note muted">{tavern.description || '无描述'}</p>
        </div>
        <div className="status-badge-row">
          <span className={`status-badge ${tavern.status}`}>
            <span className={`dot ${isOpen ? 'ok' : ''}`}></span>
            {getTavernStatusLabel(tavern.status)}
          </span>
          <span className="char-count-badge">{charCount} 角色</span>
        </div>
      </div>

      <div className="tavern-card__metrics">
        <div className="owner-metric">
          <span className="mini-label">Token 消耗</span>
          <strong>{tokenUsed > 0 ? `${tokenUsed.toLocaleString()} tokens` : '—'}</strong>
        </div>
        <div className="owner-metric">
          <span className="mini-label">访问权限</span>
          <strong>{getTavernAccessIcon(tavern.access)} {getTavernAccessLabel(tavern.access)}</strong>
        </div>
        <div className="owner-metric">
          <span className="mini-label">坐标</span>
          <strong>{tavern.lat.toFixed(4)}, {tavern.lon.toFixed(4)}</strong>
        </div>
      </div>

      <div className="tavern-card__actions">
        <button className="secondary" onClick={onManageLlm}>AI 配置</button>
        <button className="secondary" onClick={onEdit}>编辑</button>
        <button className={isOpen ? 'secondary' : ''} onClick={onToggleStatus}>
          {isOpen ? '歇业' : '开放'}
        </button>
        <button className="btn-danger-ghost" onClick={onDelete}>删除</button>
      </div>
    </div>
  )
}

function TavernEditModal({ tavern, onSave, onClose }) {
  const [form, setForm] = useState({
    name: tavern.name,
    description: tavern.description,
    access: tavern.access,
    scene_prompt: tavern.scene_prompt,
    llm_config: tavern.llm_config || {},
  })

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content panel edit-modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h3>编辑酒馆: {tavern.name}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-grid">
            <div className="form-main">
              <div className="form-group">
                <label>酒馆名称</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                />
              </div>
              <div className="form-group">
                <label>酒馆描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>访问权限</label>
                <select
                  value={form.access}
                  onChange={e => setForm(f => ({...f, access: e.target.value}))}
                >
                  <option value="public">公开 — 任何人都能进入</option>
                  <option value="password">密码 — 需要密码才能进入</option>
                  <option value="private">私人 — 仅自己可用</option>
                </select>
              </div>
              <div className="form-group">
                <label>场景设定 (AI Prompt)</label>
                <textarea
                  value={form.scene_prompt}
                  onChange={e => setForm(f => ({...f, scene_prompt: e.target.value}))}
                  rows={4}
                  placeholder="描述酒馆的环境、气氛，帮助 AI 更好入戏"
                />
              </div>
            </div>

            <div className="form-side">
              <div className="form-group">
                <label>AI 配置</label>
                <LLMConfigForm
                  value={form.llm_config}
                  onChange={cfg => setForm(f => ({...f, llm_config: cfg}))}
                  compact={true}
                  tavernId={tavern.id}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>取消</button>
            <button type="submit" className="primary">保存修改</button>
          </div>
        </form>
      </div>
    </div>
  )
}
