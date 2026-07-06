import { useEffect, useMemo, useState } from 'react'
import { listSkillPacks, saveSkillPacks } from '../lib/spaces'

const SPATIAL_PACKS = ['local-rumor', 'neighborhood-knowledge', 'territory-awareness']

function settingFor(settings, packId) {
  return settings.find((item) => item?.id === packId) || { id: packId, enabled: false, config: {} }
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 3
  return Math.max(1, Math.min(10, parsed))
}

export default function SkillPackManager({ space, ownerId = '', onClose, onUpdated }) {
  const [availablePacks, setAvailablePacks] = useState([])
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const spaceId = space?.id || ''

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!spaceId) return
      setLoading(true)
      setError('')
      try {
        const result = await listSkillPacks(spaceId, ownerId)
        if (cancelled) return
        setAvailablePacks(Array.isArray(result?.available_packs) ? result.available_packs : [])
        setSettings(Array.isArray(result?.skill_packs) ? result.skill_packs : [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err || '读取技能包失败'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [spaceId, ownerId])

  const mergedSettings = useMemo(() => {
    return availablePacks.map((pack) => settingFor(settings, pack.id))
  }, [availablePacks, settings])

  function updatePack(packId, patch) {
    setSettings((prev) => {
      const current = settingFor(prev, packId)
      const next = { 
        ...current, 
        ...patch, 
        config: { ...(current.config || {}), ...(patch.config || {}) } 
      }
      const without = prev.filter((item) => item?.id !== packId)
      return [...without, next]
    })
  }

  async function handleSave() {
    if (!spaceId) return
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const payload = mergedSettings.map((item) => ({
        id: item.id,
        enabled: Boolean(item.enabled),
        config: { 
          ...item.config,
          limit: normalizeLimit(item.config?.limit) 
        },
      }))
      const result = await saveSkillPacks(spaceId, payload, ownerId)
      setSettings(Array.isArray(result?.skill_packs) ? result.skill_packs : payload)
      setStatus('技能包设置已保存。')
      onUpdated?.({ ...(space || {}), skill_packs: result?.skill_packs || payload })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err || '保存技能包失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal skill-pack-manager">
        <div className="modal-header">
          <div>
            <p className="mini-label">Space Skill Packs</p>
            <h2>技能包 · {space?.name || '未命名空间'}</h2>
            <p className="note muted">技能包提供环境传闻、周边知识等特定维度的感知能力，只增强当前对话参考，不会写入正史。</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>&times;</button>
        </div>

        {loading && <div className="loading-shimmer">正在读取技能包...</div>}
        {error && <p className="form-error">{error}</p>}
        {status && <p className="form-success">{status}</p>}

        {!loading && (
          <div className="skill-pack-list">
            {availablePacks.map((pack) => {
              const setting = settingFor(settings, pack.id)
              const enabled = Boolean(setting.enabled)
              const limit = normalizeLimit(setting.config?.limit)
              const isSpatial = SPATIAL_PACKS.includes(pack.id)

              return (
                <section key={pack.id} className={`skill-pack-card ${enabled ? 'is-enabled' : ''}`}>
                  <div className="skill-pack-card__header">
                    <div>
                      <p className="mini-label">{pack.category || '能力'}</p>
                      <h3>{pack.label || pack.id}</h3>
                      <p className="note muted">{pack.description}</p>
                    </div>
                    <div className="skill-pack-status">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(event) => updatePack(pack.id, { enabled: event.target.checked })}
                        />
                        <span className="slider" />
                      </label>
                      <span className="status-label">{enabled ? '已启用' : '未启用'}</span>
                    </div>
                  </div>

                  <div className="skill-pack-grid">
                    <div className="capability-list">
                      <strong>能力范围</strong>
                      <ul>
                        {(pack.capabilities || []).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="note-list">
                      <strong>边界与约束</strong>
                      <ul>
                        {(pack.prompt_notes || []).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>

                  {enabled && isSpatial && (
                    <div className="skill-pack-config">
                      <label className="field compact-field">
                        <span>参考深度 (Limit)</span>
                        <div className="input-group">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={limit}
                            onChange={(event) => updatePack(pack.id, { config: { limit: normalizeLimit(event.target.value) } })}
                          />
                          <span className="value-badge">{limit}</span>
                        </div>
                        <small>单轮对话最多参考的相关条目数。建议保持在 3-5 之间以平衡效果与 Token 消耗。</small>
                      </label>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>取消</button>
          <button type="button" className="primary-btn" onClick={handleSave} disabled={loading || saving}>
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  )
}
