import { formatCount, formatTag, getFactionColors, getIcon } from './config.js'

export default function WorldMapOverlays({
  region,
  vibe,
  originLabel,
  roadNodes,
  poiNodes,
  landmarkNodes,
  layers,
  hoveredPoi,
  hoveredFaction,
  activePoi,
  featuredPoi,
  featuredFaction,
  presentFactions,
  rankedNodes,
}) {
  return (
    <>
      <div className="map-sky-glow" />
      <div className="map-overlay map-overlay-top">
        <div className="map-biome-banner">
          <span className="map-biome-kicker">FableMap 世界切片</span>
          <strong>{formatTag(region?.theme || vibe)}</strong>
          <span>{originLabel || '附近切片'} · {formatCount(poiNodes.length, '个地点')} · {formatCount(landmarkNodes.length, '个地标')}</span>
        </div>
        <div className="map-chip-row">
          <div className="map-chip">{formatTag(vibe)}</div>
          {layers.roads ? <div className="map-chip">{formatCount(roadNodes.length, '条道路')}</div> : null}
          {layers.pois ? <div className="map-chip">{formatCount(poiNodes.length, '个地点')}</div> : null}
          {layers.landmarks ? <div className="map-chip">{formatCount(landmarkNodes.length, '个地标')}</div> : null}
        </div>
      </div>

      {layers.pois && hoveredPoi ? (
        <div className="map-tooltip">
          <span className="map-tooltip-icon">{getIcon(hoveredPoi.fantasy_type)}</span>
          <div>
            <strong>{hoveredPoi.real_name || hoveredPoi.fantasy_name}</strong>
            {hoveredPoi.faction_alignment ? (
              <span className="map-tooltip-faction" style={hoveredFaction ? { color: hoveredFaction.glow } : undefined}>
                {formatTag(hoveredPoi.faction_alignment)}
              </span>
            ) : null}
            <p>{hoveredPoi.satire_hook}</p>
          </div>
        </div>
      ) : null}

      {layers.pois && featuredPoi ? (
        <div className="map-sidecar">
          <div className="map-sidecar-kicker">{activePoi ? '当前关注点' : '建议进入点'}</div>
          <div className="map-sidecar-title-row">
            <span className="map-sidecar-icon">{getIcon(featuredPoi.fantasy_type)}</span>
            <div>
              <h3>{featuredPoi.real_name || featuredPoi.fantasy_name}</h3>
              <p>{featuredPoi.fantasy_name}</p>
            </div>
          </div>

          <div className="map-sidecar-chip-row">
            <span className="map-sidecar-chip">{formatTag(featuredPoi.fantasy_type)}</span>
            {featuredPoi.faction_alignment ? (
              <span className="map-sidecar-chip" style={featuredFaction ? { borderColor: `${featuredFaction.glow}66`, color: featuredFaction.glow } : undefined}>
                {formatTag(featuredPoi.faction_alignment)}
              </span>
            ) : null}
            {featuredPoi.secret_slot ? <span className="map-sidecar-chip">隐藏槽位</span> : null}
          </div>

          <p className="map-sidecar-copy">{featuredPoi.satire_hook}</p>
          {featuredPoi.emotion_hook ? <p className="map-sidecar-subcopy">{featuredPoi.emotion_hook}</p> : null}
          {featuredPoi.rumor_hook ? <p className="map-sidecar-rumor">{featuredPoi.rumor_hook}</p> : null}
        </div>
      ) : null}

      {layers.legend ? (
        <div className="map-legend">
          {presentFactions.map((faction) => {
            const colors = getFactionColors(faction)
            return colors ? (
              <span key={faction} className="map-legend-faction">
                <span className="map-legend-swatch" style={{ background: colors.fill }} />
                {formatTag(faction)}
              </span>
            ) : null
          })}
        </div>
      ) : null}

      <div className="map-bottom-dock">
        {layers.roads ? (
          <div className="map-dock-item">
            <span className="map-dock-icon">🗺️</span>
            <div>
              <strong>{roadNodes.length}</strong>
              <span>道路</span>
            </div>
          </div>
        ) : null}
        {layers.pois ? (
          <div className="map-dock-item">
            <span className="map-dock-icon">🏠</span>
            <div>
              <strong>{poiNodes.length}</strong>
              <span>地点</span>
            </div>
          </div>
        ) : null}
        {layers.landmarks ? (
          <div className="map-dock-item">
            <span className="map-dock-icon">💎</span>
            <div>
              <strong>{landmarkNodes.length}</strong>
              <span>地标</span>
            </div>
          </div>
        ) : null}
      </div>

      {layers.labels && rankedNodes.length > 0 ? <div className="map-caption">二维世界切片 · 点击任一地点可将其设为当前舞台卡片。</div> : null}
    </>
  )
}
