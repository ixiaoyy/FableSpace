import { useState, useEffect } from 'react'
import { fetchOrchestration, applyOrchestration } from './services/orchestrator'

export default function WorldDensityIndicator({ sliceId, playerId, lat, lon, onEvent }) {
  const [density, setDensity] = useState(null)
  const [broadcasts, setBroadcasts] = useState([])
  const [relationship, setRelationship] = useState(0)

  useEffect(() => {
    if (!sliceId || !playerId) return

    fetchOrchestration(sliceId, playerId, lat, lon)
      .then(result => {
        setBroadcasts([])
        applyOrchestration(result, {
          onDensityUpdate: (data) => setDensity(data),
          onBroadcast: (b) => setBroadcasts(prev => [...prev, b].slice(-3)),
          onRelationshipUpdate: (r) => setRelationship(r),
          onEvent
        })
      })
      .catch(err => console.error('Orchestration failed:', err))
  }, [sliceId, playerId, lat, lon])

  if (!density) return null

  return (
    <section className="world-intel-panel">
      <div className="world-intel-block">
        <div className="world-intel-kicker">切片热度</div>
        <div className="world-intel-level" style={{ color: density.color }}>
          {(density.level * 100).toFixed(0)}%
        </div>
        <div className="world-intel-meta">
          <span>{density.rarity}</span>
          <span>{density.count} 观察者</span>
        </div>
      </div>

      <div className="world-intel-block">
        <div className="world-intel-kicker">关系强度</div>
        <div className="world-intel-bar">
          <div
            className="world-intel-bar-fill"
            style={{ width: `${Math.max(0, Math.min(relationship, 1)) * 100}%` }}
          />
        </div>
        <div className="world-intel-meta">
          <span>{relationship > 0 ? '连接已建立' : '尚未形成显著关系'}</span>
          <span>{(Math.max(0, Math.min(relationship, 1)) * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="world-intel-block world-intel-block--broadcasts">
        <div className="world-intel-kicker">最近广播</div>
        {broadcasts.length > 0 ? (
          <div className="world-intel-broadcast-list">
            {broadcasts.map((b, i) => (
              <article key={i} className="world-intel-broadcast-card">
                <strong>{b.mood || 'broadcast'}</strong>
                <p>{b.text}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="world-intel-empty">当前没有新的公共广播，附近地点仍在低声组织自己。</p>
        )}
      </div>
    </section>
  )
}
