import { useState } from 'react'
import { getSpaceStatusColor, getSpaceStatusLabel, getSpaceAccessLabel, getSpaceAccessIcon } from './services/spaceService'
import { enterSpace } from '../lib/spaces'
import { inferSpacePlayMode, getSpacePlayBadges } from './spacePlayModes'

/**
 * SpaceDetailPanel — 空间详情面板
 *
 * 显示空间信息，允许访客进入或店主管理。
 */
export default function SpaceDetailPanel({
  space,
  visitorId,
  onEnter,
  onOwnerManage,
  onClose,
}) {
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [entering, setEntering] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const isOwner = space?.owner_id === visitorId
  const characters = space?.characters || []
  const playMode = inferSpacePlayMode(space)
  const playBadges = getSpacePlayBadges(space)

  async function handleEnter(passwordToUse = '') {
    setEntering(true)
    setPasswordError('')
    try {
      await enterSpace(space.id, passwordToUse, visitorId)
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
    if (space?.access === 'password') {
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

  const statusColor = getSpaceStatusColor(space?.status)
  const statusLabel = getSpaceStatusLabel(space?.status)
  const accessIcon = getSpaceAccessIcon(space?.access)
  const accessLabel = getSpaceAccessLabel(space?.access)

  return (
    <div className="space-detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="space-detail-panel">
        {/* Header */}
        <div className="space-detail-header">
          <div className="space-detail-title-row">
            <div className="space-detail-access">{accessIcon}</div>
            <div>
              <h2 className="space-detail-name">{space?.name || '未命名空间'}</h2>
              <div className="space-detail-badges">
                <span className="space-badge" style={{ color: statusColor }}>
                  {statusLabel}
                </span>
                <span className="space-badge space-badge--access">
                  {accessLabel}
                </span>
                <span className="space-badge space-badge--chars">
                  {characters.length} 个角色
                </span>
                <span className="space-badge space-badge--play">
                  {playMode.icon} {playMode.label}
                </span>
              </div>
            </div>
          </div>
          <button className="space-detail-close" onClick={onClose} title="关闭">×</button>
        </div>

        {/* Description */}
        {space?.description && (
          <div className="space-detail-section">
            <p className="space-detail-description">{space.description}</p>
          </div>
        )}

        {/* Scene prompt */}
        {space?.scene_prompt && (
          <div className="space-detail-section">
            <label className="space-detail-label">场景氛围</label>
            <p className="space-detail-scene-prompt">{space.scene_prompt}</p>
          </div>
        )}

        {/* Status note */}
        {space?.status === 'closed' && (
          <div className="space-detail-notice space-detail-notice--warning">
            此空间暂未配置 AI 或已歇业，暂时无法聊天。
          </div>
        )}

        <div className="space-detail-section">
          <label className="space-detail-label">怎么玩</label>
          <div className="space-detail-play-card">
            <div>
              <strong>{playMode.icon} {playMode.label}</strong>
              <p>{playMode.summary}</p>
            </div>
            <div className="space-detail-play-badges">
              {playBadges.map((badge) => <span key={badge}>{badge}</span>)}
            </div>
            <div className="space-detail-play-prompts">
              {playMode.prompts.slice(0, 3).map((prompt) => <small key={prompt}>{prompt}</small>)}
            </div>
          </div>
        </div>

        {/* Character list */}
        {characters.length > 0 && (
          <div className="space-detail-section">
            <label className="space-detail-label">空间角色</label>
            <div className="space-detail-chars">
              {characters.map((char) => (
                <div key={char.id} className="space-detail-char-item">
                  <div className="space-detail-char-avatar">
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
                  <div className="space-detail-char-info">
                    <div className="space-detail-char-name">{char.name}</div>
                    {char.personality && (
                      <div className="space-detail-char-personality muted">
                        {char.personality.slice(0, 40)}{char.personality.length > 40 ? '...' : ''}
                      </div>
                    )}
                    {char.first_mes && (
                      <div className="space-detail-char-firstmes">
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
          <div className="space-detail-section">
            <div className="space-detail-empty-chars">
              这个空间还没有角色。让空间主人添加一些吧。
            </div>
          </div>
        )}

        {/* Owner info */}
        {isOwner && space?.llm_config?.token_used > 0 && (
          <div className="space-detail-section">
            <label className="space-detail-label">AI 消耗</label>
            <div className="space-detail-token-stat">
              累计使用 <strong>{space.llm_config.token_used.toLocaleString()}</strong> 用量单位
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-detail-actions">
          {isOwner && (
            <button
              type="button"
              className="space-detail-btn space-detail-btn--manage"
              onClick={onOwnerManage}
            >
              管理空间
            </button>
          )}

          {space?.status !== 'closed' || isOwner ? (
            <button
              type="button"
              className="space-detail-btn space-detail-btn--enter"
              onClick={handlePublicEnter}
              disabled={entering}
            >
              {entering ? '进入中...' : '进入空间'}
            </button>
          ) : (
            <button
              type="button"
              className="space-detail-btn space-detail-btn--disabled"
              disabled
            >
              暂时歇业
            </button>
          )}
        </div>
      </div>

      {/* Password modal */}
      {showPasswordModal && (
        <div className="space-password-modal" onClick={(e) => e.target === e.currentTarget && setShowPasswordModal(false)}>
          <div className="space-password-box">
            <h3>{accessIcon} 需要密码</h3>
            <p>此空间需要密码才能进入</p>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
              placeholder="输入访问密码"
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              autoFocus
            />
            {passwordError && (
              <div className="space-password-error">{passwordError}</div>
            )}
            <div className="space-password-actions">
              <button
                type="button"
                className="space-detail-btn space-detail-btn--cancel"
                onClick={() => setShowPasswordModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="space-detail-btn space-detail-btn--enter"
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
