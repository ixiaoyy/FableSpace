import { useEffect, useMemo, useState } from 'react'
import { getGameplays, saveGameplays } from '../lib/taverns'
import GameplayDefinitionEditor, { createBlankGameplay } from './GameplayDefinitionEditor'
import './tavernGameplay.css'

const STATUS_LABEL = {
  draft: '草稿',
  published: '已发布',
  disabled: '已停用',
}

function normalizeGameplays(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []
}

export default function GameplayManager({ tavern, ownerId = '', onUpdated, onClose }) {
  const [gameplays, setGameplays] = useState(() => normalizeGameplays(tavern?.gameplay_definitions))
  const [selectedId, setSelectedId] = useState(gameplays[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const selectedGameplay = useMemo(() => (
    gameplays.find((item) => item.id === selectedId) || gameplays[0] || null
  ), [gameplays, selectedId])

  useEffect(() => {
    let ignore = false
    async function loadGameplays() {
      if (!tavern?.id) return
      setLoading(true)
      setError('')
      try {
        const result = await getGameplays(tavern.id, ownerId)
        if (ignore) return
        const next = normalizeGameplays(result.gameplays)
        setGameplays(next)
        setSelectedId((current) => current && next.some((item) => item.id === current) ? current : (next[0]?.id || ''))
      } catch (err) {
        if (!ignore) setError(`读取玩法失败：${err.message}`)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadGameplays()
    return () => { ignore = true }
  }, [tavern?.id, ownerId])

  function addGameplay() {
    const next = createBlankGameplay(gameplays.length + 1)
    setGameplays((prev) => [next, ...prev])
    setSelectedId(next.id)
    setStatus('新玩法已加入草稿，填写目标后保存。')
  }

  function updateGameplay(nextGameplay) {
    setGameplays((prev) => prev.map((item) => item.id === nextGameplay.id ? nextGameplay : item))
    setStatus('')
  }

  function removeGameplay(targetId) {
    setGameplays((prev) => prev.filter((item) => item.id !== targetId))
    if (selectedId === targetId) {
      const next = gameplays.find((item) => item.id !== targetId)
      setSelectedId(next?.id || '')
    }
    setStatus('已从本地列表移除，保存后生效。')
  }

  async function saveGameplays() {
    if (!tavern?.id) return
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const result = await saveGameplays(tavern.id, gameplays, ownerId)
      const next = normalizeGameplays(result.gameplays)
      setGameplays(next)
      setSelectedId((current) => current && next.some((item) => item.id === current) ? current : (next[0]?.id || ''))
      setStatus('玩法已保存。published 对访客可见，disabled 会从入口隐藏。')
      onUpdated?.({ ...tavern, gameplay_definitions: next })
    } catch (err) {
      setError(`保存玩法失败：${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content panel gameplay-manager" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header gameplay-manager__header">
          <div>
            <p className="mini-label">酒馆玩法</p>
            <h3>{tavern?.name || '当前酒馆'} · 玩法管理</h3>
            <p className="note muted">只填目标、氛围和结算即可；有 AI 时由 AI Director 决定下一步，无 AI 时走随机事件。</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>&times;</button>
        </header>

        {loading ? <div className="owner-loading">正在读取玩法...</div> : null}
        {error ? <div className="owner-error">{error}</div> : null}
        {status ? <div className="owner-package-status">{status}</div> : null}

        <div className="gameplay-manager__layout">
          <aside className="gameplay-manager__list">
            <button type="button" className="btn-primary" onClick={addGameplay}>+ 添加玩法</button>
            {gameplays.length === 0 ? (
              <p className="note muted">还没有玩法。添加一个草稿后，填写目标并保存即可。</p>
            ) : gameplays.map((gameplay) => (
              <button
                key={gameplay.id}
                type="button"
                className={`gameplay-manager__item ${selectedGameplay?.id === gameplay.id ? 'active' : ''}`}
                onClick={() => setSelectedId(gameplay.id)}
              >
                <strong>{gameplay.title || '未命名玩法'}</strong>
                <span>{STATUS_LABEL[gameplay.status] || gameplay.status || '草稿'}</span>
              </button>
            ))}
          </aside>

          <main className="gameplay-manager__editor">
            {selectedGameplay ? (
              <>
                <GameplayDefinitionEditor gameplay={selectedGameplay} onChange={updateGameplay} />
                <div className="modal-actions gameplay-manager__actions">
                  <button type="button" className="secondary" onClick={() => removeGameplay(selectedGameplay.id)}>删除草稿</button>
                  <button type="button" className="secondary" onClick={onClose}>关闭</button>
                  <button type="button" className="primary" onClick={saveGameplays} disabled={saving}>
                    {saving ? '保存中...' : '保存玩法'}
                  </button>
                </div>
              </>
            ) : (
              <div className="owner-empty">
                <p>先添加一个玩法草稿。</p>
                <button type="button" className="btn-primary" onClick={addGameplay}>添加玩法</button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
