import { useMemo, useState } from 'react'

import {
  RPS_MOVES,
  createRpsDuelState,
  isNpcRpsDuelTemplate,
  playRpsRound,
} from './spaceMiniGames'
import './spaceMiniGames.css'

export default function SpaceMiniGamePanel({
  templates = [],
  sending = false,
  disabled = false,
  characterName = '当前 NPC',
  spaceName = '',
  onStart,
}) {
  const [activeDuelId, setActiveDuelId] = useState('')
  const [rpsState, setRpsState] = useState(() => createRpsDuelState())
  const activeDuelTemplate = useMemo(
    () => templates.find((template) => template.id === activeDuelId && isNpcRpsDuelTemplate(template)) || null,
    [templates, activeDuelId],
  )

  if (!Array.isArray(templates) || templates.length === 0) return null

  function handleTemplateClick(template) {
    if (isNpcRpsDuelTemplate(template)) {
      setActiveDuelId(template.id)
      setRpsState(createRpsDuelState())
      return
    }
    onStart?.(template)
  }

  function handleRpsMove(moveId) {
    if (disabled || sending) return
    setRpsState((current) => playRpsRound(current, moveId, {
      characterName,
      spaceName,
      duelId: activeDuelTemplate?.id || 'npc-rps-duel',
    }))
  }

  return (
    <section className="space-mini-game-panel" data-mini-game-launcher aria-label="AI 主持小游戏">
      <div className="space-mini-game-panel__header">
        <div>
          <span className="space-mini-game-panel__eyebrow">桌边小玩法</span>
          <strong>抽一张玩法卡</strong>
          <span>挑一个名字，今晚的故事就从这里拐弯。</span>
        </div>
        <small>短局 · 随时停</small>
      </div>
      <div className="space-mini-game-grid">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="space-mini-game-card"
            onClick={() => handleTemplateClick(template)}
            disabled={disabled || sending}
            title={template.summary}
          >
            <span className="space-mini-game-card__icon" aria-hidden="true">{template.icon}</span>
            <span className="space-mini-game-card__body">
              <strong>{template.title}</strong>
              <small>{template.duration}</small>
              <em>{template.summary}</em>
            </span>
            <span className="space-mini-game-card__action">{isNpcRpsDuelTemplate(template) ? '对局' : '抽卡'}</span>
          </button>
        ))}
      </div>
      {activeDuelTemplate ? (
        <div className="space-rps-duel" aria-label={`${characterName} 猜拳心理战`}>
          <div className="space-rps-duel__topline">
            <div>
              <span>NPC 对局 · 非排行</span>
              <strong>{characterName} 正在等你出手</strong>
            </div>
            <button type="button" onClick={() => setRpsState(createRpsDuelState())} disabled={disabled || sending}>
              重开
            </button>
          </div>
          <div className="space-rps-duel__score" aria-label="当前比分">
            <span>你 {rpsState.playerScore}</span>
            <span>平 {rpsState.drawCount}</span>
            <span>{characterName} {rpsState.npcScore}</span>
          </div>
          <div className="space-rps-duel__moves" role="group" aria-label="选择你的出招">
            {RPS_MOVES.map((move) => (
              <button
                key={move.id}
                type="button"
                onClick={() => handleRpsMove(move.id)}
                disabled={disabled || sending}
              >
                <span aria-hidden="true">{move.icon}</span>
                {move.label}
              </button>
            ))}
          </div>
          <div className="space-rps-duel__result" aria-live="polite">
            {rpsState.lastRound ? (
              <>
                <strong>{rpsState.lastRound.label}</strong>
                <span>
                  你出 {rpsState.lastRound.playerMove?.label || '？'}，
                  {characterName} 出 {rpsState.lastRound.npcMove?.label || '？'}。
                </span>
                <em>{rpsState.lastRound.npcLine}</em>
              </>
            ) : (
              <>
                <strong>三手小局开始</strong>
                <span>选择石头、剪刀或布。胜负只按规则结算，不写入排行或奖励。</span>
                <em>{characterName}看着你，像是在读你的第一手。</em>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
