import { useState, useRef, useEffect } from 'react'
import { formatTagLabel } from './services/appDisplay'
import ChatPanel from './ChatPanel'
import {
  getCharactersForPoi,
} from './services/characterEngine'
import WorldStageWritebackActionPanel from './WorldStageWritebackActionPanel'
import WorldStageWritebackInsightsPanel from './WorldStageWritebackInsightsPanel'
import {
  formatFamiliarity,
  formatDwellTime,
  getRelationshipStageLabel,
  getRelationshipColor,
} from './services/placeProtocol'

function PlaceStateSection({ poi, writebackResult, familiarityMap }) {
  if (!poi) return null

  const placeState = writebackResult?.place_state || {}
  const playerState = writebackResult?.player_state || {}
  const familiarity = familiarityMap?.[poi.id] ?? placeState.familiarity ?? 0
  const visitCount = placeState.visit_count ?? 0
  const dwellSeconds = playerState.total_dwell_seconds ?? 0
  const markCount = (placeState.marks || []).length

  let stage = 'unexplored'
  if (visitCount > 0) stage = 'observed'
  if (dwellSeconds > 0) stage = 'dwelling'
  if (markCount > 0) stage = 'marked'
  if (familiarity >= 0.5) stage = 'familiar'
  if (familiarity >= 0.8) stage = 'home'

  return (
    <div className="poi-state-bar">
      <div className="poi-state-chip" style={{ color: getRelationshipColor(familiarity) }}>
        {getRelationshipStageLabel(stage)}
      </div>
      <div className="poi-state-chip">
        熟悉度 {formatFamiliarity(familiarity)}
      </div>
      <div className="poi-state-chip">
        {visitCount}次访问
      </div>
      {dwellSeconds > 0 ? (
        <div className="poi-state-chip">
          驻足{formatDwellTime(dwellSeconds)}
        </div>
      ) : null}
      {markCount > 0 ? (
        <div className="poi-state-chip">
          {markCount}条痕迹
        </div>
      ) : null}
    </div>
  )
}

function PlaceDetailSection({ poi, world }) {
  if (!poi || !world) return null

  const factions = world.factions || []
  const historicalEchoes = world.historical_echoes || []
  const memoryAnchors = world.memory_anchors || []
  const sprites = world.sprites || []

  const linkedEchoes = historicalEchoes.filter(
    (e) => (e.linked_pois || []).includes(poi.id)
  )
  const linkedAnchors = memoryAnchors.filter(
    (a) => (a.linked_pois || []).includes(poi.id)
  )
  const linkedSprites = sprites.filter(
    (s) => (s.linked_poi || s.linked_pois || []).includes(poi.id)
  )
  const faction = factions.find((f) => f.id === poi.faction_alignment)

  const hasContent =
    faction || linkedEchoes.length || linkedAnchors.length || linkedSprites.length

  if (!hasContent) return null

  return (
    <div className="poi-detail-section">
      {faction && (
        <div className="poi-detail-row">
          <span className="poi-detail-label">势力</span>
          <span className="poi-detail-value faction-tag">{faction.name}</span>
          <span className="poi-detail-note muted">{faction.doctrine}</span>
        </div>
      )}
      {linkedEchoes.length > 0 && (
        <div className="poi-detail-row">
          <span className="poi-detail-label">历史回声</span>
          <div className="poi-detail-list">
            {linkedEchoes.map((echo) => (
              <span key={echo.id} className="poi-detail-chip echo-chip">
                {echo.summary}
              </span>
            ))}
          </div>
        </div>
      )}
      {linkedAnchors.length > 0 && (
        <div className="poi-detail-row">
          <span className="poi-detail-label">记忆锚点</span>
          <div className="poi-detail-list">
            {linkedAnchors.map((anchor) => (
              <span key={anchor.id} className="poi-detail-chip anchor-chip">
                {anchor.tone}
              </span>
            ))}
          </div>
        </div>
      )}
      {linkedSprites.length > 0 && (
        <div className="poi-detail-row">
          <span className="poi-detail-label">精灵</span>
          <div className="poi-detail-list">
            {linkedSprites.map((sprite) => (
              <span key={sprite.id} className="poi-detail-chip sprite-chip">
                {sprite.species}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorldStageActivePoiPanel({
  resolvedActivePoi,
  panelRef,
  world,
  familiarityMap,
  writebackTargetSummary,
  writebackActions,
  writebackForm,
  applyWritebackAction,
  selectedActionMeta,
  updateWritebackForm,
  visibilityOptions,
  selectedVisibilityMeta,
  writebackSubmitting,
  submitWriteback,
  writebackError,
  writebackTimeline,
  writebackResult,
  revisitSummary,
  writebackResidues,
  behaviorInsights,
  lastWritebackPoiId,
  focusWritebackTarget,
}) {
  // Derive characters from current POI
  const characters = resolvedActivePoi && world
    ? getCharactersForPoi(resolvedActivePoi, world, familiarityMap?.[resolvedActivePoi.id] || 0, writebackResult)
    : []
  const activeCharacter = characters[0] || null

  // Chat messages state — loaded from writeback when POI changes
  const [chatMessages, setChatMessages] = useState([])
  const [chatSending, setChatSending] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  // Load chat history from writeback when the active POI changes
  useEffect(() => {
    if (!resolvedActivePoi) {
      setChatMessages([])
      return
    }
    const poiId = resolvedActivePoi.id
    const playerId = writebackForm?.playerId || 'player'
    const characterId = activeCharacter?.id || `faction-${resolvedActivePoi.faction_alignment || 'unknown'}`

    setChatLoading(true)
    fetch(`/api/chat/history?player_id=${encodeURIComponent(playerId)}&poi_id=${encodeURIComponent(poiId)}&character_id=${encodeURIComponent(characterId)}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.messages)) {
          setChatMessages(data.messages.map(m => ({
            id: m.message_id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
          })))
        }
      })
      .catch(() => {
        // Silently fail — chat history is optional
      })
      .finally(() => setChatLoading(false))
  }, [resolvedActivePoi?.id, writebackForm?.playerId])

  async function handleSendMessage(content) {
    const playerMsg = {
      id: `msg-${Date.now()}`,
      role: 'player',
      content,
      timestamp: Date.now(),
    }
    setChatMessages(prev => [...prev, playerMsg])
    setChatSending(true)

    const characterId = activeCharacter?.id || `faction-${resolvedActivePoi?.faction_alignment || 'unknown'}`
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          message: content,
          world_id: world?.world_id || '',
          poi_id: resolvedActivePoi?.id || '',
          player_id: writebackForm?.playerId || 'player',
          history: [],  // Backend reads from writeback store
        }),
      })
      const data = await res.json()
      const charMsg = {
        id: `msg-${Date.now() + 1}`,
        role: 'character',
        content: data.response || '对方没有回应。',
        timestamp: data.timestamp ? (data.timestamp > 1e12 ? data.timestamp : data.timestamp * 1000) : Date.now(),
      }
      setChatMessages(prev => [...prev, charMsg])
    } catch (err) {
      const charMsg = {
        id: `msg-${Date.now() + 1}`,
        role: 'character',
        content: activeCharacter
          ? `这里是 ${activeCharacter.name}。${activeCharacter.description || '我还没有想好该说什么。'}`
          : '这个地点还没有角色。',
        timestamp: Date.now(),
      }
      setChatMessages(prev => [...prev, charMsg])
    }
    setChatSending(false)
  }

  return (
    <div className="storyboard-lane" ref={panelRef}>
      <div className="storyboard-lane-header">
        <span className="storyboard-category-label">当前地点卡</span>
        <span className="storyboard-lane-meta">把选中的地点当成当前叙事入口来查看</span>
      </div>
      {resolvedActivePoi ? (
        <div className="storyboard-stage-stack">
          <div className="poi-detail-bar storyboard-poi-bar">
            <span className="poi-detail-name">{resolvedActivePoi.fantasy_name}</span>
            <span className="poi-detail-type muted">{formatTagLabel(resolvedActivePoi.fantasy_type, '未分类地点')}</span>
            <span className="poi-detail-satire">{resolvedActivePoi.satire_hook}</span>
            <span className="poi-detail-emotion muted">{resolvedActivePoi.emotion_hook}</span>
          </div>

          <PlaceStateSection
            poi={resolvedActivePoi}
            writebackResult={writebackResult}
            familiarityMap={familiarityMap}
          />

          <PlaceDetailSection
            poi={resolvedActivePoi}
            world={world}
          />

          <WorldStageWritebackActionPanel
            writebackTargetSummary={writebackTargetSummary}
            writebackActions={writebackActions}
            writebackForm={writebackForm}
            applyWritebackAction={applyWritebackAction}
            selectedActionMeta={selectedActionMeta}
            updateWritebackForm={updateWritebackForm}
            visibilityOptions={visibilityOptions}
            selectedVisibilityMeta={selectedVisibilityMeta}
            writebackSubmitting={writebackSubmitting}
            submitWriteback={submitWriteback}
            writebackError={writebackError}
          />

          <WorldStageWritebackInsightsPanel
            writebackTimeline={writebackTimeline}
            writebackResult={writebackResult}
            revisitSummary={revisitSummary}
            writebackResidues={writebackResidues}
            behaviorInsights={behaviorInsights}
          />

          {activeCharacter && (
            <ChatPanel
              character={activeCharacter}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              sending={chatSending}
            />
          )}
        </div>
      ) : (
        <div className="storyboard-placeholder-card">
          <strong>等待你选中第一个地点</strong>
          <p>这里现在是地点入口，而不是静态平面图。先点一个地点，右侧信息就会变成你的当前地点卡。</p>
          {writebackResult && lastWritebackPoiId ? (
            <button type="button" className="storyboard-inline-btn" onClick={focusWritebackTarget}>
              回到上次写回目标
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
