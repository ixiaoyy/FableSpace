import { useState, useEffect } from 'react'
import { getTavernAccessIcon, getTavernAccessLabel } from './services/tavernService'
import { DEFAULT_NPC_PREVIEW_PORTRAIT } from '../features/tavern-npc-stage/portraitCatalogConfig'
import { enterTavern, getTavern } from '../lib/taverns'
import { buildShortDramaTeaser } from '../lib/short-drama-teasers.js'
import { inferTavernPlayMode, getTavernPlayBadges } from './tavernPlayModes'
import { buildTavernArrivalScene } from './sceneSettingProse'

function characterAvatarUrl(character = {}) {
  const sprites = character.sprites || {}

  return (
    sprites.neutral ||
    character.avatar ||
    character.image_url ||
    character.imageUrl ||
    Object.values(sprites).find(Boolean) ||
    DEFAULT_NPC_PREVIEW_PORTRAIT
  )
}

/**
 * TavernEntryPanel — 空间入场面板
 * 当用户在地图上点击一个空间标记时显示。
 */
export default function TavernEntryPanel({
  tavernId,
  visitorId = '',
  onEnter,
  onClose,
}) {
  const [tavern, setTavern] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    if (!tavernId) return
    fetchTavern()
  }, [tavernId])

  async function fetchTavern() {
    setLoading(true)
    setError(null)
    try {
      const data = await getTavern(tavernId, visitorId)
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
      const entryState = await enterTavern(tavernId, tavern.access === 'password' ? password : '', visitorId)
      if (onEnter) onEnter({ ...tavern, entry_state: entryState })
    } catch (err) {
      setError(`入场失败: ${err.message}`)
    } finally {
      setEntering(false)
    }
  }

  if (loading) return (
    <div className="panel tavern-entry-panel is-loading slide-up">
      <div className="tavern-entry-loading">
        <div className="loading-spinner">
          <div className="spinner-ring" />
        </div>
        <p>正在打听空间消息...</p>
        <div className="skeleton-tavern-preview">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--text" />
          <div className="skeleton-line skeleton-line--text short" />
        </div>
      </div>
    </div>
  )
  if (error && !tavern) return (
    <div className="panel tavern-entry-panel is-error slide-up">
      <div className="tavern-entry-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button type="button" className="secondary" onClick={fetchTavern}>重试</button>
      </div>
    </div>
  )
  if (!tavern) return null
  const playMode = inferTavernPlayMode(tavern)
  const playBadges = getTavernPlayBadges(tavern)
  const shortDramaTeaser = buildShortDramaTeaser(tavern)
  const arrivalScene = buildTavernArrivalScene(tavern, playMode)

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

        {arrivalScene ? (
          <div className="tavern-entry-arrival-scene" aria-label="入场前场景提示">
            <span>{arrivalScene.kicker}</span>
            <strong>{arrivalScene.title}</strong>
            <p>{arrivalScene.text}</p>
            <div className="tavern-entry-arrival-scene__cue">
              {arrivalScene.anchor ? <small>{arrivalScene.anchor}</small> : null}
              <em>{arrivalScene.action}</em>
            </div>
          </div>
        ) : null}

        <div className="tavern-entry-play-card">
          <div className="tavern-entry-play-card__main">
            <span>{playMode.icon}</span>
            <div>
              <strong>{playMode.label}</strong>
              <p>{playMode.summary}</p>
            </div>
          </div>
          <div className="tavern-entry-play-card__badges">
            {playBadges.map((badge) => <small key={badge}>{badge}</small>)}
          </div>
          <div className="tavern-entry-play-card__prompts">
            {playMode.prompts.slice(0, 3).map((prompt) => <span key={prompt}>{prompt}</span>)}
          </div>
        </div>

        {shortDramaTeaser ? (
          <div className="tavern-entry-short-drama" aria-label="短剧玩法入口">
            <span>{shortDramaTeaser.kicker}</span>
            <strong>{shortDramaTeaser.conflictTitle}</strong>
            <p>{shortDramaTeaser.sceneHook || shortDramaTeaser.summary}</p>
            <small>{shortDramaTeaser.ctaLabel} · {shortDramaTeaser.guardrail}</small>
          </div>
        ) : null}
        
        <div className="tavern-chars-preview">
          <label className="mini-label">驻店角色 ({tavern.characters?.length || 0})</label>
          <div className="char-avatars">
            {tavern.characters?.map(char => {
              const avatarUrl = characterAvatarUrl(char)

              return (
                <div key={char.id} className="char-avatar-ring" title={char.name}>
                  <img src={avatarUrl} alt={char.name} />
                </div>
              )
            })}
            {(!tavern.characters || tavern.characters.length === 0) && <p className="note muted">暂无角色</p>}
          </div>
        </div>

        {tavern.access === 'password' && (
          <div className="form-group password-group">
            <label>该空间由于某种原因被锁上了。请输入密令：</label>
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
