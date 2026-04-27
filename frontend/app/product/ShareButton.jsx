import { useEffect, useState } from 'react'
import { getTavernShare } from '../lib/taverns'

/**
 * 分享按钮组件
 *
 * 提供酒馆分享功能：
 * - 复制链接
 * - 分享到社交平台（微博、微信等）
 * - 显示分享预览信息
 */
export default function ShareButton({ tavernId, tavernName = '', className = '', variant = 'primary' }) {
  const [showModal, setShowModal] = useState(false)
  const [shareData, setShareData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  // Load share data when modal opens
  useEffect(() => {
    if (!showModal || shareData) return

    setLoading(true)
    setError(null)

    getTavernShare(tavernId)
      .then((data) => {
        setShareData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load share data:', err)
        setError('加载分享信息失败')
        setLoading(false)
      })
  }, [showModal, shareData, tavernId])

  const handleCopyLink = async () => {
    const url = shareData?.share_url || `${window.location.origin}/tavern/${tavernId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNativeShare = async () => {
    if (!navigator.share) {
      alert('您的浏览器不支持原生分享功能，请使用复制链接')
      return
    }

    try {
      await navigator.share({
        title: shareData?.share_title || tavernName || '赛博酒馆',
        text: shareData?.share_text || '发现了一个有趣的赛博酒馆',
        url: shareData?.share_url || `${window.location.origin}/tavern/${tavernId}`,
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err)
      }
    }
  }

  const handleWeiboShare = () => {
    const url = shareData?.share_url || `${window.location.origin}/tavern/${tavernId}`
    const title = encodeURIComponent(shareData?.share_text || `${tavernName} - 赛博酒馆`)
    const wbUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${title}`
    window.open(wbUrl, '_blank', 'width=600,height=400')
  }

  const buttonClass = variant === 'icon'
    ? 'share-button share-button--icon'
    : 'share-button'

  return (
    <>
      <button
        type="button"
        className={`${buttonClass} ${className}`}
        onClick={() => setShowModal(true)}
        title="分享酒馆"
      >
        {variant === 'icon' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            分享
          </>
        )}
      </button>

      {showModal && (
        <div className="share-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>分享酒馆</h3>
              <button type="button" className="share-modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="share-modal-body">
              {loading && <div className="share-loading">加载中...</div>}
              {error && <div className="share-error">{error}</div>}
              {shareData && !loading && !error && (
                <>
                  {/* Preview Card */}
                  <div className="share-preview">
                    <div className="share-preview-title">{shareData.title}</div>
                    <div className="share-preview-desc">{shareData.short_description}</div>
                    <div className="share-preview-meta">
                      <span>{shareData.character_count} 个角色</span>
                      {shareData.location?.address && (
                        <span>· {shareData.location.address}</span>
                      )}
                    </div>
                  </div>

                  {/* Share Actions */}
                  <div className="share-actions">
                    {/* Copy Link */}
                    <button
                      type="button"
                      className={`share-action ${copied ? 'share-action--copied' : ''}`}
                      onClick={handleCopyLink}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>{copied ? '已复制' : '复制链接'}</span>
                    </button>

                    {/* Native Share (mobile) */}
                    {'share' in navigator && (
                      <button type="button" className="share-action" onClick={handleNativeShare}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16,6 12,2 8,6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        <span>分享</span>
                      </button>
                    )}

                    {/* Weibo */}
                    <button type="button" className="share-action share-action--weibo" onClick={handleWeiboShare}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.098 20c-4.612 0-8.598-2.617-8.598-6.115 0-1.97 1.077-3.725 2.742-4.836.32-.214.69-.08.86.233.168.313.127.69-.15.87-.4.24-.748.545-.993.91-.254.38-.39.79-.39 1.24 0 2.67 3.27 4.87 7.28 4.87h.24c4.01 0 7.28-2.2 7.28-4.87 0-.45-.136-.86-.39-1.24-.245-.365-.593-.67-.993-.91-.277-.18-.318-.557-.15-.87.17-.313.54-.447.86-.233 1.665 1.11 2.742 2.866 2.742 4.836 0 3.498-3.986 6.115-8.598 6.115h-.24z" />
                        <ellipse cx="10.098" cy="7.64" rx="2.45" ry="2.14" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M17.5 9.6c-.5.8-1.4 1.4-2.4 1.4-.2 0-.4 0-.6-.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      <span>微博</span>
                    </button>
                  </div>

                  {/* URL Display */}
                  <div className="share-url">
                    <input
                      type="text"
                      readOnly
                      value={shareData.share_url}
                      onClick={(e) => e.target.select()}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .share-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          background: var(--bg-color, #fff);
          color: var(--text-color, #333);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .share-button:hover {
          background: var(--bg-hover, #f5f5f5);
          border-color: var(--border-hover, #ccc);
        }

        .share-button--icon {
          padding: 8px;
          border-radius: 50%;
        }

        .share-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .share-modal {
          background: var(--bg-color, #fff);
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow: auto;
        }

        .share-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border-color, #e0e0e0);
        }

        .share-modal-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .share-modal-close {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--text-secondary, #666);
        }

        .share-modal-body {
          padding: 16px;
        }

        .share-loading,
        .share-error {
          text-align: center;
          padding: 32px;
          color: var(--text-secondary, #666);
        }

        .share-error {
          color: var(--error-color, #e53935);
        }

        .share-preview {
          background: var(--bg-secondary, #f9f9f9);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .share-preview-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .share-preview-desc {
          font-size: 14px;
          color: var(--text-secondary, #666);
          margin-bottom: 8px;
        }

        .share-preview-meta {
          font-size: 12px;
          color: var(--text-tertiary, #999);
        }

        .share-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .share-action {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 8px;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          background: var(--bg-color, #fff);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
        }

        .share-action:hover {
          background: var(--bg-hover, #f5f5f5);
          border-color: var(--border-hover, #ccc);
        }

        .share-action--copied {
          background: var(--success-bg, #e8f5e9);
          border-color: var(--success-color, #4caf50);
          color: var(--success-color, #4caf50);
        }

        .share-action--weibo:hover {
          background: #ff8200;
          border-color: #ff8200;
          color: #fff;
        }

        .share-url input {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text-secondary, #666);
          background: var(--bg-secondary, #f9f9f9);
        }

        @media (max-width: 480px) {
          .share-modal {
            width: 95%;
            margin: 16px;
          }

          .share-actions {
            flex-wrap: wrap;
          }

          .share-action {
            min-width: calc(50% - 6px);
          }
        }
      `}</style>
    </>
  )
}
