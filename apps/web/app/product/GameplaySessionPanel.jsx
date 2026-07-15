import { useState } from 'react'
import './spaceGameplay.css'

function latestNarration(session, scene) {
  if (scene?.narration) return scene.narration
  const lastEvent = Array.isArray(session?.events) ? session.events[session.events.length - 1] : null
  return lastEvent?.narration || '玩法正在进行。选择一个动作，或输入一句话交给 AI Director 主持。'
}

/**
 * Detects the planting prototype so the generic gameplay panel can use garden
 * language without coupling the backend definition to front-end-only fields.
 */
function isFlowerbedGameplay(gameplay) {
  const id = String(gameplay?.id || '')
  const text = `${gameplay?.title || ''} ${gameplay?.summary || ''} ${gameplay?.entry_label || ''}`
  return id.includes('secret_flowerbed') || /花圃|种植|播种|收获/.test(text)
}

/**
 * Returns panel copy for the current gameplay family; values are presentation
 * only and do not change session state, rewards, or backend completion data.
 */
function gameplayPanelLabels(gameplay) {
  if (isFlowerbedGameplay(gameplay)) {
    return {
      activeLabel: '种植中',
      completeLabel: '本轮已收获',
      progressAria: '花圃进度',
      completionTitle: '花圃回执',
      returnLabel: '回到花圃入口',
    }
  }
  return {
    activeLabel: '玩法进行中',
    completeLabel: '委托已结算',
    progressAria: '委托进度',
    completionTitle: '委托回执',
    returnLabel: '回到空间入口',
  }
}

/**
 * Converts known gameplay node ids into visitor-facing stages.
 * Unknown ids fall back to the node narration/title flow without leaking internals.
 */
function stageForNodeId(nodeId, gameplay = null) {
  const normalized = String(nodeId || '')
  if (isFlowerbedGameplay(gameplay)) {
    if (normalized === 'start') return '领种子'
    if (normalized === 'clear-plot') return '割草'
    if (normalized === 'loosen-soil') return '松土'
    if (normalized === 'plant-seed') return '播种'
    if (normalized === 'water') return '浇水'
    if (normalized === 'fertilize') return '施肥'
    if (normalized === 'wait-growth') return '等成熟'
    if (normalized === 'harvest') return '收获'
    if (normalized === 'trade') return 'NPC 兑换'
    if (normalized === 'complete') return '花圃回执'
    return '照看中'
  }
  if (normalized === 'start') return '接委托'
  if (['position', 'writing', 'time'].includes(normalized)) return '查线索'
  if (['timeline', 'witness'].includes(normalized)) return '交叉验证'
  if (normalized === 'hypothesis') return '写判断'
  if (normalized === 'safe-boundary') return '安全边界'
  if (normalized === 'complete') return '委托回执'
  if (normalized === 'progress') return '推进中'
  return '进行中'
}

/**
 * Builds a compact progress model from gameplay nodes so visitors can see why
 * a session is worth continuing and when it has reached the return hook.
 */
function gameplayProgress(gameplay, scene, session) {
  const nodes = Array.isArray(gameplay?.nodes) ? gameplay.nodes : []
  const currentNodeId = String(scene?.node_id || session?.current_node_id || '')
  const seen = new Set()
  const stages = []
  nodes.forEach((node) => {
    const label = stageForNodeId(node?.id, gameplay)
    if (seen.has(label)) return
    seen.add(label)
    stages.push({ id: String(node?.id || label), label })
  })
  if (!stages.length) {
    return { stages: [], currentIndex: 0, total: 0 }
  }
  const currentStage = stageForNodeId(currentNodeId, gameplay)
  const currentIndex = Math.max(0, stages.findIndex((stage) => stage.label === currentStage))
  return { stages, currentIndex: currentIndex === -1 ? 0 : currentIndex, total: stages.length }
}

export default function GameplaySessionPanel({ session, scene = {}, gameplay = null, busy = false, onChoice, onSubmit, onAbandon, onReturnToDoorway }) {
  const [message, setMessage] = useState('')
  if (!session) return null

  const choices = Array.isArray(scene?.choices) ? scene.choices : []
  const completion = session?.completion
  const completed = session.state === 'completed'
  const goal = gameplay?.owner_brief?.goal || ''
  const progress = gameplayProgress(gameplay, scene, session)
  const labels = gameplayPanelLabels(gameplay)
  const gameplayTitle = String(gameplay?.title || gameplay?.name || '').trim()
  const progressStep = completed ? progress.total : Math.min(progress.currentIndex + 1, progress.total || Number(session.turn_count || 0) + 1)

  function handleSubmit(event) {
    event.preventDefault()
    const text = message.trim()
    if (!text || busy || completed) return
    setMessage('')
    onSubmit?.(text)
  }

  return (
    <section className={`gameplay-session-panel ${completed ? 'is-complete' : ''}`} aria-label="玩法会话">
      <div className="gameplay-session-panel__header">
        <div className="gameplay-session-panel__identity">
          <span className="mini-label">{completed ? labels.completeLabel : labels.activeLabel}</span>
          {gameplayTitle ? <span className="gameplay-session-panel__title">{gameplayTitle}</span> : null}
          <strong>{progress.total ? `${progressStep} / ${progress.total} · ${progress.stages[Math.max(0, progressStep - 1)]?.label || '推进中'}` : (completed ? '已完成' : `第 ${Number(session.turn_count || 0) + 1} 步`)}</strong>
        </div>
        {!completed ? (
          <button type="button" className="button-link" onClick={onAbandon} disabled={busy}>
            放弃本局
          </button>
        ) : null}
      </div>

      {progress.stages.length ? (
        <div className="gameplay-session-panel__progress" aria-label={labels.progressAria}>
          {progress.stages.map((stage, index) => (
            <span
              key={`${stage.id}-${stage.label}`}
              className={`gameplay-session-panel__progress-step ${index < progressStep ? 'is-done' : ''} ${index === progressStep - 1 ? 'is-current' : ''}`}
            >
              {stage.label}
            </span>
          ))}
        </div>
      ) : null}

      {goal ? (
        <div className="gameplay-session-panel__objective">
          <span className="mini-label">本局目标</span>
          <p>{goal}</p>
        </div>
      ) : null}

      <p className="gameplay-session-panel__narration">{latestNarration(session, scene)}</p>

      {completion ? (
        <div className="gameplay-session-panel__completion">
          <strong>{labels.completionTitle}</strong>
          <span className="mini-label">本局总结</span>
          <p>{completion.summary || '本局玩法完成。'}</p>
          {completion.reward_text ? (
            <div className="gameplay-session-panel__return-hook">
              <span className="mini-label">带走的理由</span>
              <small>{completion.reward_text}</small>
            </div>
          ) : null}
          <div className="gameplay-session-panel__completion-actions">
            <button type="button" className="secondary" onClick={onReturnToDoorway} disabled={busy}>
              {labels.returnLabel}
            </button>
          </div>
        </div>
      ) : null}

      {!completed && choices.length > 0 ? (
        <div className="gameplay-session-panel__choices">
          {choices.map((choice) => (
            <button key={choice.id} type="button" className="gameplay-session-panel__choice secondary" onClick={() => onChoice?.(choice)} disabled={busy}>
              {choice.label || choice.id}
            </button>
          ))}
        </div>
      ) : null}

      {!completed ? (
        <form className="gameplay-session-panel__input" onSubmit={handleSubmit}>
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="也可以补充一句话，让主持人接住这一幕"
            disabled={busy}
          />
          <button type="submit" className="primary" disabled={busy || !message.trim()}>
            {busy ? '推进中...' : '提交'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
