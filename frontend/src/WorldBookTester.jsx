import { useState, useCallback } from 'react'
import { getDefaultTavernService } from './services/tavernService'

const STATUS_LABELS = {
  matched: '命中',
  matched_with_probability: '概率命中',
  probability_zero: '零概率',
  not_matched: '未命中',
  disabled: '已暂停',
}

function StatusBadge({ status }) {
  const cls = {
    matched: 'badge-success',
    matched_with_probability: 'badge-warn',
    probability_zero: 'badge-muted',
    not_matched: 'badge-muted',
    disabled: 'badge-danger',
  }[status] || 'badge-muted'
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status] || status}</span>
}

function MatchedEntryCard({ entry, testText }) {
  if (!entry) return null
  const { title, status, matched_keys, matched_secondary_keys, keys, keys_secondary, content_preview, order, depth, probability, constant, selective, disable } = entry

  // Highlight matched keywords in content preview
  function highlightText(text, matchKeys) {
    if (!text || !matchKeys?.length) return text
    let result = text
    for (const key of matchKeys) {
      if (key && key.length > 1 && !key.startsWith('regex:')) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        result = result.replace(new RegExp(escaped, 'gi'), m => `<mark>${m}</mark>`)
      }
    }
    return result
  }

  const allMatchedKeys = [...(matched_keys || []), ...(matched_secondary_keys || [])]
  const highlighted = highlightText(content_preview, allMatchedKeys)

  return (
    <div className={`wbt-entry-card ${status === 'matched' || status === 'matched_with_probability' ? 'is-matched' : ''} ${disable ? 'is-disabled' : ''}`}>
      <div className="wbt-entry-header">
        <strong className="wbt-entry-title">{title || '未命名条目'}</strong>
        <div className="wbt-entry-meta">
          <StatusBadge status={status} />
          <small className="muted">顺序 {order} | 深度 {depth} | 概率 {probability}%</small>
        </div>
      </div>

      {allMatchedKeys.length > 0 ? (
        <div className="wbt-keys">
          <span className="mini-label">命中关键词</span>
          <div className="wbt-key-list">
            {(matched_keys || []).map((k, i) => (
              <span key={`p-${i}`} className="wbt-key wbt-key--primary">{k}</span>
            ))}
            {(matched_secondary_keys || []).map((k, i) => (
              <span key={`s-${i}`} className="wbt-key wbt-key--secondary">{k}</span>
            ))}
          </div>
        </div>
      ) : constant ? (
        <div className="wbt-keys">
          <span className="mini-label">常驻条目</span>
          <span className="wbt-key wbt-key--constant">每轮注入</span>
        </div>
      ) : null}

      {keys?.length > 0 && !constant && (
        <div className="wbt-keys">
          <span className="mini-label">未命中关键词</span>
          <div className="wbt-key-list">
            {keys.filter(k => !(matched_keys || []).includes(k)).map((k, i) => (
              <span key={`um-${i}`} className="wbt-key wbt-key--missed">{k}</span>
            ))}
          </div>
        </div>
      )}

      {content_preview ? (
        <div className="wbt-content-preview">
          <span className="mini-label">内容预览</span>
          <p
            className="wbt-content-text"
            dangerouslySetInnerHTML={{ __html: highlighted || content_preview }}
          />
        </div>
      ) : null}

      {!constant && !selective && (
        <small className="muted">* 非关键词模式：主关键词任意一个命中即可</small>
      )}
    </div>
  )
}

/**
 * WorldBookTester — 世界书命中测试器
 *
 * 店主输入一句话，查看哪些世界书条目会被触发。
 * 支持测试编辑器中未保存的更改。
 */
export default function WorldBookTester({
  tavern,
  ownerId,
  entries,
}) {
  const tavernService = getDefaultTavernService()
  const [testText, setTestText] = useState('')
  const [includeContext, setIncludeContext] = useState(true)
  const [recentMessages, setRecentMessages] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('matched') // 'matched' | 'all'

  const matched = results ? results.matches || [] : []
  const unmatched = results ? (results.entries || []).filter(e => !e.matched) : []
  const scannedCount = results ? results.scanned_recent_count || 0 : 0

  async function handleTest() {
    if (!testText.trim()) {
      setError('请输入要测试的消息内容')
      return
    }
    setLoading(true)
    setError('')
    try {
      const recent = recentMessages.trim()
        ? recentMessages.split('\n').filter(Boolean)
        : []
      const data = {
        message: testText.trim(),
        include_tavern_context: includeContext,
        recent_messages: recent,
        // Pass current editor entries to test unsaved changes
        world_info: entries,
      }
      const result = await tavernService.testWorldInfo(tavern.id, data, ownerId)
      setResults(result)
    } catch (err) {
      setError('测试失败：' + (err.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleTest()
    }
  }

  const showEntries = tab === 'matched' ? matched : (results ? (results.entries || []) : [])

  return (
    <div className="world-book-tester">
      <div className="wbt-header">
        <div>
          <p className="mini-label">命中测试</p>
          <h4>一句话会触发哪些设定？</h4>
        </div>
      </div>

      <div className="wbt-input-area">
        <label className="form-group">
          <span>测试消息</span>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="输入一段对话或描述，看看会触发哪些世界书条目...&#10;&#10;例如：刘大爷，我找到一张毕业照，上面好像有你"
          />
          <small>Ctrl+Enter 快捷测试</small>
        </label>

        <div className="wbt-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
            />
            <span>包含酒馆背景上下文</span>
            <small>（酒馆名、简介、场景描述也会参与匹配）</small>
          </label>

          <label className="form-group wbt-recent">
            <span>最近对话（可选）</span>
            <textarea
              value={recentMessages}
              onChange={(e) => setRecentMessages(e.target.value)}
              rows={3}
              placeholder="可选：每行填一条最近的对话内容，用于测试深度扫描。&#10;例如：&#10;玩家：那张照片在哪里拍的？&#10;NPC：就在旧校舍的档案柜里..."
            />
            <small>每行一条，用于 depth &gt; 0 的条目扫描</small>
          </label>
        </div>

        {error && <div className="wbt-error">{error}</div>}

        <button
          type="button"
          className="primary"
          onClick={handleTest}
          disabled={loading || !testText.trim()}
        >
          {loading ? '测试中...' : '测试命中'}
        </button>
      </div>

      {results ? (
        <div className="wbt-results">
          <div className="wbt-results-summary">
            <strong>
              {results.matched_count || 0} / {results.entry_count || 0} 条命中
            </strong>
            {scannedCount > 0 && (
              <small className="muted">，扫描了 {scannedCount} 条历史消息</small>
            )}
          </div>

          <div className="wbt-tabs">
            <button
              type="button"
              className={`tab-btn ${tab === 'matched' ? 'active' : ''}`}
              onClick={() => setTab('matched')}
            >
              命中 ({matched.length})
            </button>
            <button
              type="button"
              className={`tab-btn ${tab === 'all' ? 'active' : ''}`}
              onClick={() => setTab('all')}
            >
              全部 ({results.entry_count || 0})
            </button>
          </div>

          {results.entries?.length === 0 ? (
            <div className="wbt-empty">
              <p>世界书还没有条目。</p>
              <p>先去"编辑"标签添加条目，再回来测试。</p>
            </div>
          ) : showEntries.length === 0 && tab === 'matched' ? (
            <div className="wbt-empty">
              <p>没有任何条目命中。</p>
              <p>检查关键词配置，或者试试更长的描述。</p>
            </div>
          ) : (
            <div className="wbt-entry-list">
              {showEntries.map((entry) => (
                <MatchedEntryCard
                  key={entry.id}
                  entry={entry}
                  testText={testText}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="wbt-placeholder">
          <p>输入消息后点击"测试命中"，查看结果</p>
          <p className="muted">测试不调用 AI，不保存任何数据</p>
        </div>
      )}
    </div>
  )
}
