import { useState, useEffect, useRef } from 'react'
import { getTavernStatusColor, getTavernStatusLabel, getTavernAccessIcon } from './services/tavernService'
import { enterTavern, getTavernChatHistory, sendTavernChat } from '../lib/taverns'

/**
 * TavernInterior — 酒馆内部视图
 *
 * 显示酒馆内的角色列表和聊天界面。
 * 访客可以选择一个角色开始聊天。
 */

// ─── Layout style background presets ────────────────────────────────────────

const LAYOUT_BACKGROUNDS = {
  lobby: {
    gradient: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.9))',
    accent: '#f59e0b',
    icon: '🍺',
  },
  'quest-play': {
    gradient: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
    accent: '#22c55e',
    icon: '📜',
  },
  'npc-chat': {
    gradient: 'linear-gradient(135deg, rgba(30, 20, 40, 0.95), rgba(50, 30, 60, 0.9))',
    accent: '#a855f7',
    icon: '💬',
  },
  'hybrid-room': {
    gradient: 'linear-gradient(135deg, rgba(20, 30, 40, 0.95), rgba(40, 60, 80, 0.9))',
    accent: '#06b6d4',
    icon: '🏠',
  },
}

function getLayoutStyle(tavern) {
  const style = tavern?.layout_style || 'lobby'
  return LAYOUT_BACKGROUNDS[style] || LAYOUT_BACKGROUNDS.lobby
}

// ─── Simple Character Avatar ─────────────────────────────────────────────────

function CharAvatar({ character, size = 40, className = '' }) {
  const avatar = character?.avatar || character?.sprites?.neutral || null
  const name = character?.name || '?'

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        className={className}
      />
    )
  }

  // Fallback to name initial
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #475569, #64748b)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f8fafc',
        fontWeight: 600,
        fontSize: size * 0.4,
      }}
      className={className}
      title={name}
    >
      {name[0] || '?'}
    </div>
  )
}
export default function TavernInterior({
  tavern,
  visitorId,
  onExit,
}) {
  const [selectedChar, setSelectedChar] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [entering, setEntering] = useState(false)
  const [entered, setEntered] = useState(false)
  const messagesEndRef = useRef(null)

  const characters = tavern?.characters || []
  const layoutStyle = getLayoutStyle(tavern)

  // Auto-select first character
  useEffect(() => {
    if (characters.length > 0 && !selectedChar) {
      setSelectedChar(characters[0])
    }
  }, [characters])

  // Enter tavern on mount
  useEffect(() => {
    if (!entered && !passwordRequired && tavern) {
      handleEnter()
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat history when character changes
  useEffect(() => {
    if (!selectedChar || !entered) return
    loadHistory()
  }, [selectedChar?.id])

  async function handleEnter(pwd = '') {
    setEntering(true)
    try {
      const result = await enterTavern(tavern.id, pwd, visitorId)
      setEntered(true)
      setPasswordRequired(false)
      // Add first message from character
      if (result.first_mes) {
        setMessages([{
          id: `init-${Date.now()}`,
          role: 'assistant',
          content: result.first_mes,
          timestamp: Date.now(),
        }])
      }
    } catch (err) {
      if (err.message.includes('密码')) {
        setPasswordRequired(true)
      } else {
        console.error('Enter tavern error:', err)
      }
    } finally {
      setEntering(false)
    }
  }

  async function loadHistory() {
    try {
      const result = await getTavernChatHistory(tavern.id, visitorId, selectedChar?.id)
      if (result.messages && result.messages.length > 0) {
        setMessages(result.messages.map((m) => ({
          id: m.id,
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
          timestamp: m.timestamp ? (m.timestamp > 1e12 ? m.timestamp : m.timestamp * 1000) : Date.now(),
        })))
      }
    } catch (err) {
      console.error('Load history error:', err)
    }
  }

  async function handleSend(content) {
    if (!content.trim() || sending) return

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)

    try {
      const result = await sendTavernChat(tavern.id, {
        character_id: selectedChar.id,
        message: content.trim(),
        visitor_id: visitorId,
      })
      const charMsg = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: result.response || '...',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, charMsg])
    } catch (err) {
      const charMsg = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: selectedChar?.first_mes || '对方没有回应。',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, charMsg])
    } finally {
      setSending(false)
    }
  }

  // Password gate
  if (passwordRequired) {
    return (
      <div className="tavern-interior tavern-password-gate">
        <div className="tavern-password-form">
          <h3>{getTavernAccessIcon('password')} 需要密码</h3>
          <p>此酒馆需要密码才能进入</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            onKeyDown={(e) => e.key === 'Enter' && handleEnter(password)}
          />
          <button onClick={() => handleEnter(password)} disabled={entering}>
            {entering ? '验证中...' : '进入'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="tavern-interior"
      style={{ background: layoutStyle.gradient }}
      data-layout-style={tavern?.layout_style || 'lobby'}
    >
      {/* Scene atmosphere banner */}
      {tavern?.scene_prompt && (
        <div className="tavern-scene-atmosphere">
          <span className="atmosphere-icon">{layoutStyle.icon}</span>
          <span className="atmosphere-text">{tavern.scene_prompt.slice(0, 80)}</span>
        </div>
      )}

      {/* Header */}
      <div className="tavern-interior-header" style={{ borderBottomColor: layoutStyle.accent }}>
        <div className="tavern-info">
          <h3>{tavern?.name}</h3>
          <div className="tavern-meta">
            <span
              className="status-badge"
              style={{ color: getTavernStatusColor(tavern?.status) }}
            >
              {getTavernAccessIcon(tavern?.access)} {getTavernStatusLabel(tavern?.status)}
            </span>
            {characters.length > 0 && (
              <span className="char-count">{characters.length} 个角色</span>
            )}
          </div>
        </div>
        <button className="btn-exit" onClick={onExit}>
          返回地图
        </button>
      </div>

      <div className="tavern-interior-body">
        {/* Character list */}
        {characters.length > 0 && (
          <div className="tavern-char-list">
            <h4>酒馆角色</h4>
            {characters.map((char) => (
              <button
                key={char.id}
                className={`char-item ${selectedChar?.id === char.id ? 'active' : ''}`}
                onClick={() => setSelectedChar(char)}
              >
                <CharAvatar character={char} size={36} />
                <span className="char-name">{char.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Chat area */}
        <div className="tavern-chat-area">
          {selectedChar ? (
            <>
              <div className="chat-header">
                <div className="chat-char-info">
                  <CharAvatar character={selectedChar} size={32} />
                  <span className="chat-char-name">{selectedChar.name}</span>
                </div>
                {selectedChar.description && (
                  <span className="chat-char-desc muted">{selectedChar.description}</span>
                )}
              </div>

              <div className="chat-messages">
                {messages.length === 0 && (
                  <div className="chat-placeholder">
                    <p>和 {selectedChar.name} 开始对话吧。</p>
                    {selectedChar.first_mes && (
                      <p className="first-mes-hint">
                        开场白：{selectedChar.first_mes.slice(0, 50)}...
                      </p>
                    )}
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message ${msg.role === 'assistant' ? 'char-msg' : 'user-msg'}`}
                  >
                    <div className="message-avatar">
                      {msg.role === 'assistant' ? (
                        <CharAvatar character={selectedChar} size={32} />
                      ) : (
                        <div className="user-avatar-icon">👤</div>
                      )}
                    </div>
                    <div className="message-content">
                      <div className="message-text">{msg.content}</div>
                      <div className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">
                <textarea
                  placeholder={`对 ${selectedChar.name} 说...`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  disabled={sending}
                  rows={2}
                />
                <button
                  className="btn-send"
                  onClick={(e) => {
                    const textarea = e.target.closest('.chat-input-area').querySelector('textarea')
                    handleSend(textarea.value)
                    textarea.value = ''
                  }}
                  disabled={sending}
                >
                  {sending ? '...' : '发送'}
                </button>
              </div>
            </>
          ) : (
            <div className="tavern-empty">
              <p>这个酒馆还没有角色。</p>
              <p className="muted">让酒馆主人添加一些角色吧。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
