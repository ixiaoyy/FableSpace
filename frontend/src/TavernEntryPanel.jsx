import { useState, useEffect } from 'react'
import { getDefaultTavernService, getTavernAccessIcon, getTavernAccessLabel } from './services/tavernService'

/**
 * TavernEntryPanel — 酒馆入场面板
 * 当用户在地图上点击一个酒馆标记时显示。
 */
export default function TavernEntryPanel({
  tavernId,
  onEnter,
  onClose,
}) {
  const [tavern, setTavern] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [entering, setEntering] = useState(false)

  const tavernService = getDefaultTavernService()

  useEffect(() => {
    if (!tavernId) return
    fetchTavern()
  }, [tavernId])

  async function fetchTavern() {
    setLoading(true)
    setError(null)
    try {
      const data = await tavernService.getTavern(tavernId)
      setTavern(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEnter() {
    setEntering(true)
    setError(null)
    try {
      if (tavern.access === 'password') {
        await tavernService.enterTavern(tavernId, password)
      }
      if (onEnter) onEnter(tavern)
    } catch (err) {
      setError(`入场失败: ${err.message}`)
    } finally {
      setEntering(false)
    }
  }

  if (loading) return <div className="panel tavern-entry-panel is-loading">正在打听酒馆消息...</div>
  if (error && !tavern) return <div className="panel tavern-entry-panel is-error">{error}</div>
  if (!tavern) return null

  return (
    <div className="panel tavern-entry-panel slide-up">
      <header className="tavern-entry-header">
        <div className="tavern-entry-title">
          <span className="eyebrow">Tavern Found</span>
          <h2>{tavern.name}</h2>
          <div className="tavern-meta">
            <span className="storyboard-chip">{getTavernAccessIcon(tavern.access)} {getTavernAccessLabel(tavern.access)}</span>
            <span className="storyboard-chip">{tavern.status === 'open' ? '🟢 营业中' : '🔴 歇业中'}</span>
            <span className="storyboard-chip">访客 {tavern.visit_count || 0}</span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </header>

      <section className="tavern-entry-content">
        <p className="tavern-description">{tavern.description || '这里似乎是一个神秘的去处，没有任何公开的描述。'}</p>
        
        <div className="tavern-chars-preview">
          <label className="mini-label">驻店角色 ({tavern.characters?.length || 0})</label>
          <div className="char-avatars">
            {tavern.characters?.map(char => (
              <div key={char.id} className="char-avatar-ring" title={char.name}>
                <img src={char.avatar || '/assets/default-avatar.png'} alt={char.name} />
              </div>
            ))}
            {(!tavern.characters || tavern.characters.length === 0) && <p className="note muted">暂无角色</p>}
          </div>
        </div>

        {tavern.access === 'password' && (
          <div className="form-group password-group">
            <label>该酒馆由于某种原因被锁上了。请输入密令：</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="输入入场密码..."
            />
          </div>
        )}

        {error && <p className="error-note">{error}</p>}
      </section>

      <footer className="tavern-entry-footer">
        <button 
          className="primary btn-enter" 
          disabled={entering || tavern.status !== 'open'}
          onClick={handleEnter}
        >
          {entering ? '正在进入...' : tavern.status === 'open' ? '这就动身' : '吃个闭门羹'}
        </button>
      </footer>
    </div>
  )
}
