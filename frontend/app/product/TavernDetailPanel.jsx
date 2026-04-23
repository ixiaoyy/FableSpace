import { useState } from 'react'
import { getTavernStatusColor, getTavernStatusLabel, getTavernAccessLabel, getTavernAccessIcon } from './services/tavernService'
import { enterTavern } from '../lib/taverns'
import { inferTavernPlayMode, getTavernPlayBadges } from './tavernPlayModes'

/**
 * TavernDetailPanel — 酒馆详情面板
 *
 * 显示酒馆信息，允许访客进入或店主管理。
 */
export default function TavernDetailPanel({
  tavern,
  visitorId,
  onEnter,
  onOwnerManage,
  onClose,
}) {
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [entering, setEntering] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const isOwner = tavern?.owner_id === visitorId
  const characters = tavern?.characters || []
  const playMode = inferTavernPlayMode(tavern)
  const playBadges = getTavernPlayBadges(tavern)

  async function handleEnter(passwordToUse = '') {
    setEntering(true)
    setPasswordError('')
    try {
      await enterTavern(tavern.id, passwordToUse, visitorId)
      if (onEnter) onEnter()
    } catch (err) {
      if (err.message?.includes('密码')) {
        setPasswordError('密码错误')
      } else {
        setPasswordError(err.message || '进入失败')
      }
      setEntering(false)
    }
  }

  function handlePublicEnter() {
    if (tavern?.access === 'password') {
      setShowPasswordModal(true)
    } else {
      handleEnter('')
    }
  }

  function handlePasswordSubmit() {
    if (!password.trim()) {
      setPasswordError('请输入密码')
      return
    }
    handleEnter(password.trim())
  }

  const statusColor = getTavernStatusColor(tavern?.status)
  const statusLabel = getTavernStatusLabel(tavern?.status)
  const accessIcon = getTavernAccessIcon(tavern?.access)
  const accessLabel = getTavernAccessLabel(tavern?.access)

  return (
    <div className="tavern-detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="tavern-detail-panel">
        {/* Header */}
        <div className="tavern-detail-header">
          <div className="tavern-detail-title-row">
            <div className="tavern-detail-access">{accessIcon}</div>
            <div>
              <h2 className="tavern-detail-name">{tavern?.name || '未命名酒馆'}</h2>
              <div className="tavern-detail-badges">
                <span className="tavern-badge" style={{ color: statusColor }}>
                  {statusLabel}
                </span>
                <span className="tavern-badge tavern-badge--access">
                  {accessLabel}
                </span>
                <span className="tavern-badge tavern-badge--chars">
                  {characters.length} 个角色
                </span>
                <span className="tavern-badge tavern-badge--play">
                  {playMode.icon} {playMode.label}
                </span>
              </div>
            </div>
          </div>
          <button className="tavern-detail-close" onClick={onClose} title="关闭">×</button>
        </div>

        {/* Description */}
        {tavern?.description && (
          <div className="tavern-detail-section">
            <p className="tavern-detail-description">{tavern.description}</p>
          </div>
        )}

        {/* Scene prompt */}
        {tavern?.scene_prompt && (
          <div className="tavern-detail-section">
            <label className="tavern-detail-label">场景氛围</label>
            <p className="tavern-detail-scene-prompt">{tavern.scene_prompt}</p>
          </div>
        )}

        {/* Status note */}
        {tavern?.status === 'closed' && (
          <div className="tavern-detail-notice tavern-detail-notice--warning">
            此酒馆暂未配置 AI 或已歇业，暂时无法聊天。
          </div>
        )}

        <div className="tavern-detail-section">
          <label className="tavern-detail-label">怎么玩</label>
          <div className="tavern-detail-play-card">
            <div>
              <strong>{playMode.icon} {playMode.label}</strong>
              <p>{playMode.summary}</p>
            </div>
            <div className="tavern-detail-play-badges">
              {playBadges.map((badge) => <span key={badge}>{badge}</span>)}
            </div>
            <div className="tavern-detail-play-prompts">
              {playMode.prompts.slice(0, 3).map((prompt) => <small key={prompt}>{prompt}</small>)}
            </div>
          </div>
        </div>

        {/* Character list */}
        {characters.length > 0 && (
          <div className="tavern-detail-section">
            <label className="tavern-detail-label">酒馆角色</label>
            <div className="tavern-detail-chars">
              {characters.map((char) => (
                <div key={char.id} className="tavern-detail-char-item">
                  <div className="tavern-detail-char-avatar">
                    {char.avatar || char.sprites?.neutral ? (
                      <img
                        src={char.avatar || char.sprites?.neutral}
                        alt={char.name}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <span>{char.name?.[0] || '?'}</span>
                    )}
                  </div>
                  <div className="tavern-detail-char-info">
                    <div className="tavern-detail-char-name">{char.name}</div>
                    {char.personality && (
                      <div className="tavern-detail-char-personality muted">
                        {char.personality.slice(0, 40)}{char.personality.length > 40 ? '...' : ''}
                      </div>
                    )}
                    {char.first_mes && (
                      <div className="tavern-detail-char-firstmes">
                        「{char.first_mes.slice(0, 60)}{char.first_mes.length > 60 ? '...' : '」'}」
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {characters.length === 0 && (
          <div className="tavern-detail-section">
            <div className="tavern-detail-empty-chars">
              这个酒馆还没有角色。让酒馆主人添加一些吧。
            </div>
          </div>
        )}

        {/* Owner info */}
        {isOwner && tavern?.llm_config?.token_used > 0 && (
          <div className="tavern-detail-section">
            <label className="tavern-detail-label">AI 消耗</label>
            <div className="tavern-detail-token-stat">
              累计使用 <strong>{tavern.llm_config.token_used.toLocaleString()}</strong> 用量单位
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="tavern-detail-actions">
          {isOwner && (
            <button
              type="button"
              className="tavern-detail-btn tavern-detail-btn--manage"
              onClick={onOwnerManage}
            >
              管理酒馆
            </button>
          )}

          {tavern?.status !== 'closed' || isOwner ? (
            <button
              type="button"
              className="tavern-detail-btn tavern-detail-btn--enter"
              onClick={handlePublicEnter}
              disabled={entering}
            >
              {entering ? '进入中...' : '进入酒馆'}
            </button>
          ) : (
            <button
              type="button"
              className="tavern-detail-btn tavern-detail-btn--disabled"
              disabled
            >
              暂时歇业
            </button>
          )}
        </div>
      </div>

      {/* Password modal */}
      {showPasswordModal && (
        <div className="tavern-password-modal" onClick={(e) => e.target === e.currentTarget && setShowPasswordModal(false)}>
          <div className="tavern-password-box">
            <h3>{accessIcon} 需要密码</h3>
            <p>此酒馆需要密码才能进入</p>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
              placeholder="输入访问密码"
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              autoFocus
            />
            {passwordError && (
              <div className="tavern-password-error">{passwordError}</div>
            )}
            <div className="tavern-password-actions">
              <button
                type="button"
                className="tavern-detail-btn tavern-detail-btn--cancel"
                onClick={() => setShowPasswordModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="tavern-detail-btn tavern-detail-btn--enter"
                onClick={handlePasswordSubmit}
                disabled={entering}
              >
                {entering ? '验证中...' : '进入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
