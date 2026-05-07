import { useState } from 'react'

const MODE_OPTIONS = [
  {
    id: 'play',
    icon: '🧭',
    title: '我只是来玩的',
    description: '不用懂复杂设置：先设置昵称，进空间后可以点快捷句开始聊天或文字小游戏。',
    steps: ['设置昵称', '点快捷句', '聊天/小游戏'],
    cta: '开始找空间',
  },
  {
    id: 'owner',
    icon: '🏮',
    title: '我要开一间空间',
    description: '进入店主后台，用 3 分钟向导从地点、角色和 AI 配置开始开店。',
    steps: ['设置店主身份', '选择地点', '创建空间'],
    cta: '去开空间',
  },
]

/**
 * FirstRunModeModal — 首次使用分流向导
 *
 * 将“昵称输入”升级为普通用户可理解的两条路径：
 * 1. 只是来玩：发现空间 → 进入对话
 * 2. 我要开店：店主身份 → 选地点 → 创建空间
 */
export default function FirstRunModeModal({ initialNickname = '', initialMode = '', onComplete, onQuickTry }) {
  const [nickname, setNickname] = useState(initialNickname)
  const [mode, setMode] = useState(initialMode || 'play')
  const [error, setError] = useState('')
  const [quickTrying, setQuickTrying] = useState(false)

  const selectedOption = MODE_OPTIONS.find((item) => item.id === mode) || MODE_OPTIONS[0]

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) {
      setError('请先设置一个昵称')
      return
    }
    if (trimmed.length > 24) {
      setError('昵称不能超过 24 个字符')
      return
    }
    onComplete?.({ nickname: trimmed, mode: selectedOption.id })
  }

  async function handleQuickTry() {
    setQuickTrying(true)
    setError('')
    try {
      await onQuickTry?.({ nickname: nickname.trim() })
    } catch (err) {
      setError(err?.message || '暂时无法进入新手空间，请稍后重试。')
    } finally {
      setQuickTrying(false)
    }
  }

  return (
    <div className="modal-overlay visitor-nickname-overlay first-run-overlay" role="dialog" aria-modal="true" aria-labelledby="first-run-title">
      <div className="modal-content panel visitor-nickname-modal first-run-modal">
        <div className="visitor-nickname-icon first-run-icon" aria-hidden="true">
          ✦
        </div>

        <h2 id="first-run-title" className="visitor-nickname-title">欢迎来到 FableMap 空间</h2>
        <p className="visitor-nickname-subtitle first-run-subtitle">
          不会玩也没关系：可以直接试玩、点快捷句开始，或用模板开店。之后不会重复打扰，可随时重置新手引导。
        </p>

        <div className="first-run-quick-card">
          <div>
            <span className="mini-label">30 秒可体验</span>
            <strong>不想填配置？直接进入新手体验空间。</strong>
            <p>不用注册，输入称呼即可进入。NPC 会热情接待你。</p>
          </div>
          <button
            type="button"
            className="primary first-run-quick-btn large"
            onClick={handleQuickTry}
            disabled={quickTrying}
          >
            {quickTrying ? '正在开门...' : '⚡ 立即试玩 (30秒)'}
          </button>
        </div>

        <form className="visitor-nickname-form first-run-form" onSubmit={handleSubmit}>
          <div className="visitor-nickname-field">
            <label htmlFor="first-run-nickname" className="visitor-nickname-label">
              你的称呼
            </label>
            <input
              id="first-run-nickname"
              type="text"
              className="visitor-nickname-input"
              placeholder="例如：旅人、店主、林间来客..."
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                if (error) setError('')
              }}
              maxLength={24}
              autoFocus
            />
          </div>

          <div className="first-run-mode-grid" aria-label="选择首次使用路径">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`first-run-mode-card${mode === option.id ? ' active' : ''}`}
                onClick={() => setMode(option.id)}
              >
                <span className="first-run-mode-icon">{option.icon}</span>
                <strong>{option.title}</strong>
                <span>{option.description}</span>
                <div className="first-run-mode-steps">
                  {option.steps.map((step) => (
                    <span key={step}>{step}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {error && <span className="visitor-nickname-error">{error}</span>}

          <button
            type="button"
            className="primary visitor-nickname-submit first-run-submit"
            onClick={handleSubmit}
            disabled={!nickname.trim()}
          >
            {selectedOption.cta}
          </button>

          <div className="first-run-skip-hint muted">
            或直接
            <button
              type="button"
              className="button-link first-run-quick-link"
              onClick={handleQuickTry}
              disabled={quickTrying}
            >
              {quickTrying ? '进入中...' : '⚡ 跳过，30 秒体验'}
            </button>
          </div>
        </form>

        <p className="visitor-nickname-hint muted">
          昵称和路径只保存在本地浏览器。
        </p>
      </div>
    </div>
  )
}
