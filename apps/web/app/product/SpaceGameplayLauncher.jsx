import { isShortDramaCandidate } from './shortDramaGameplayTemplates'
import './spaceGameplay.css'

const ACTIVE_STATES = new Set(['started', 'in_progress'])

function gameplayTitleFor(session, gameplays) {
  const gameplay = gameplays.find((item) => item.id === session.gameplay_id)
  return gameplay?.title || session.gameplay_title || session.gameplay_id || '未命名玩法'
}

export default function SpaceGameplayLauncher({ gameplays = [], activeSessions = [], busy = false, onStart, onResume }) {
  const publishedGameplays = gameplays.filter((gameplay) => gameplay?.status === 'published')
  const resumableSessions = activeSessions.filter((session) => ACTIVE_STATES.has(session?.state))

  if (publishedGameplays.length === 0 && resumableSessions.length === 0) return null

  return (
    <section className="space-gameplay-launcher" aria-label="空间玩法入口">
      <div className="space-gameplay-launcher__header">
        <div>
          <span className="mini-label">空间玩法</span>
          <strong>可玩的内容</strong>
        </div>
        {busy ? <small>处理中...</small> : null}
      </div>

      {resumableSessions.length > 0 ? (
        <div className="space-gameplay-launcher__sessions">
          {resumableSessions.map((session) => (
            <button key={session.id} type="button" className="gameplay-chip active" onClick={() => onResume?.(session)} disabled={busy}>
              继续 · {gameplayTitleFor(session, gameplays)}
            </button>
          ))}
        </div>
      ) : null}

      {publishedGameplays.length > 0 ? (
        <div className="space-gameplay-launcher__grid">
          {publishedGameplays.map((gameplay) => {
            const shortDrama = isShortDramaCandidate(gameplay)
            const goal = gameplay?.owner_brief?.goal || ''
            return (
              <article key={gameplay.id} className={`gameplay-launch-card ${shortDrama ? 'is-drama' : ''}`}>
                <div>
                  <span className="gameplay-launch-card__tag">{shortDrama ? '竖屏短剧感' : '空间玩法'}</span>
                  <strong>{gameplay.title}</strong>
                  <p>{gameplay.summary || '进入一局由空间主持的轻量玩法。'}</p>
                  {shortDrama && goal ? <small className="gameplay-launch-card__goal">目标：{goal}</small> : null}
                </div>
                <button type="button" className={shortDrama ? 'primary' : 'secondary'} onClick={() => onStart?.(gameplay)} disabled={busy}>
                  {gameplay.entry_label || (shortDrama ? '进入小剧场' : '开始玩法')}
                </button>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
