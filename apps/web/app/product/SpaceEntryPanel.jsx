import { useState, useEffect } from 'react'
import { getSpaceAccessIcon, getSpaceAccessLabel } from './services/spaceService'
import { DEFAULT_NPC_PREVIEW_PORTRAIT } from '../features/space-npc-stage/portraitCatalogConfig'
import { enterSpace, getSpace } from '../lib/spaces'
import { buildShortDramaTeaser } from '../lib/short-drama-teasers.js'
import { inferSpacePlayMode, getSpacePlayBadges } from './spacePlayModes'
import { buildSpaceArrivalScene } from './sceneSettingProse'

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
 * SpaceEntryPanel — 空间入场面板
 * 当用户在地图上点击一个空间标记时显示。
 */
export default function SpaceEntryPanel({
  spaceId,
  visitorId = '',
  onEnter,
  onClose,
}) {
  const [space, setSpace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    if (!spaceId) return
    fetchSpace()
  }, [spaceId])

  async function fetchSpace() {
    setLoading(true)
    setError(null)
    try {
      const data = await getSpace(spaceId, visitorId)
      setSpace(data)
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
      const entryState = await enterSpace(spaceId, space.access === 'password' ? password : '', visitorId)
      if (onEnter) onEnter({ ...space, entry_state: entryState })
    } catch (err) {
      setError(`入场失败: ${err.message}`)
    } finally {
      setEntering(false)
    }
  }

  if (loading) return (
    <div className="panel space-entry-panel is-loading slide-up">
      <div className="space-entry-loading">
        <div className="loading-spinner">
          <div className="spinner-ring" />
        </div>
        <p>正在打听空间消息...</p>
        <div className="skeleton-space-preview">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--text" />
          <div className="skeleton-line skeleton-line--text short" />
        </div>
      </div>
    </div>
  )
  if (error && !space) return (
    <div className="panel space-entry-panel is-error slide-up">
      <div className="space-entry-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button type="button" className="secondary" onClick={fetchSpace}>重试</button>
      </div>
    </div>
  )
  if (!space) return null
  const playMode = inferSpacePlayMode(space)
  const playBadges = getSpacePlayBadges(space)
  const shortDramaTeaser = buildShortDramaTeaser(space)
  const arrivalScene = buildSpaceArrivalScene(space, playMode)

  return (
    <div className="panel space-entry-panel slide-up">
      <header className="space-entry-header">
        <div className="space-entry-title">
          <span className="eyebrow">Space Found</span>
          <h2>{space.name}</h2>
          <div className="space-meta">
            <span className="storyboard-chip">{getSpaceAccessIcon(space.access)} {getSpaceAccessLabel(space.access)}</span>
            <span className="storyboard-chip">{space.status === 'open' ? '🟢 营业中' : '🔴 歇业中'}</span>
            <span className="storyboard-chip">访客 {space.visit_count || 0}</span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </header>

      <section className="space-entry-content">
        <p className="space-description">{space.description || '这里似乎是一个神秘的去处，没有任何公开的描述。'}</p>

        {arrivalScene ? (
          <div className="space-entry-arrival-scene" aria-label="入场前场景提示">
            <span>{arrivalScene.kicker}</span>
            <strong>{arrivalScene.title}</strong>
            <p>{arrivalScene.text}</p>
            <div className="space-entry-arrival-scene__cue">
              {arrivalScene.anchor ? <small>{arrivalScene.anchor}</small> : null}
              <em>{arrivalScene.action}</em>
            </div>
          </div>
        ) : null}

        <div className="space-entry-play-card">
          <div className="space-entry-play-card__main">
            <span>{playMode.icon}</span>
            <div>
              <strong>{playMode.label}</strong>
              <p>{playMode.summary}</p>
            </div>
          </div>
          <div className="space-entry-play-card__badges">
            {playBadges.map((badge) => <small key={badge}>{badge}</small>)}
          </div>
          <div className="space-entry-play-card__prompts">
            {playMode.prompts.slice(0, 3).map((prompt) => <span key={prompt}>{prompt}</span>)}
          </div>
        </div>

        {shortDramaTeaser ? (
          <div className="space-entry-short-drama" aria-label="短剧玩法入口">
            <span>{shortDramaTeaser.kicker}</span>
            <strong>{shortDramaTeaser.conflictTitle}</strong>
            <p>{shortDramaTeaser.sceneHook || shortDramaTeaser.summary}</p>
            <small>{shortDramaTeaser.ctaLabel} · {shortDramaTeaser.guardrail}</small>
          </div>
        ) : null}
        
        <div className="space-chars-preview">
          <label className="mini-label">驻店角色 ({space.characters?.length || 0})</label>
          <div className="char-avatars">
            {space.characters?.map(char => {
              const avatarUrl = characterAvatarUrl(char)

              return (
                <div key={char.id} className="char-avatar-ring" title={char.name}>
                  <img src={avatarUrl} alt={char.name} />
                </div>
              )
            })}
            {(!space.characters || space.characters.length === 0) && <p className="note muted">暂无角色</p>}
          </div>
        </div>

        {space.access === 'password' && (
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

      <footer className="space-entry-footer">
        <button 
          className="primary btn-enter" 
          disabled={entering || space.status !== 'open'}
          onClick={handleEnter}
        >
          {entering ? '正在进入...' : space.status === 'open' ? '这就动身' : '吃个闭门羹'}
        </button>
      </footer>
    </div>
  )
}
