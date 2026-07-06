import { useState } from 'react'

/**
 * VisitorNicknameModal — 首次入场昵称输入弹窗
 *
 * 访客第一次使用平台时弹出，引导设置显示名称。
 * 点击遮罩无法关闭（强制设置），必须输入昵称才能继续。
 *
 * @param {Function} onSubmit - (nickname: string) => void — 提交后回调
 */
export default function VisitorNicknameModal({ onSubmit }) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) {
      setError('请输入一个昵称')
      return
    }
    if (trimmed.length > 24) {
      setError('昵称不能超过 24 个字符')
      return
    }
    onSubmit(trimmed)
  }

  return (
    <div className="modal-overlay visitor-nickname-overlay" role="dialog" aria-modal="true" aria-labelledby="nickname-title">
      <div className="modal-content panel visitor-nickname-modal">
        <div className="visitor-nickname-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="rgba(20,120,255,0.12)" />
            <circle cx="24" cy="18" r="8" stroke="#3b82f6" strokeWidth="2" fill="none" />
            <path d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        <h2 id="nickname-title" className="visitor-nickname-title">欢迎来到空间</h2>
        <p className="visitor-nickname-subtitle">
          设置你在空间中的显示名称，角色会用这个称呼与你对话。
        </p>

        <form className="visitor-nickname-form" onSubmit={handleSubmit}>
          <div className="visitor-nickname-field">
            <label htmlFor="visitor-nickname-input" className="visitor-nickname-label">
              你的昵称
            </label>
            <input
              id="visitor-nickname-input"
              type="text"
              className="visitor-nickname-input"
              placeholder="例如：旅人、漫游者、酒客..."
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                if (error) setError('')
              }}
              maxLength={24}
              autoFocus
            />
            {error && (
              <span className="visitor-nickname-error">{error}</span>
            )}
          </div>

          <button
            type="submit"
            className="primary visitor-nickname-submit"
            disabled={!nickname.trim()}
          >
            进入空间
          </button>
        </form>

        <p className="visitor-nickname-hint muted">
          昵称存储在本地，下次访问自动填充。
        </p>
      </div>
    </div>
  )
}
