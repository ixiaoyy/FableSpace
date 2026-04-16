import { useState, useEffect, useRef, useCallback } from 'react'
import { getDefaultTavernService, getTavernAccessIcon } from './services/tavernService'

/**
 * TavernChatRoom — SillyTavern 风格的聊天房间
 *
 * 核心功能：
 * - 左侧：角色列表（可切换角色）
 * - 中间：聊天消息区域（带角色扮演格式）
 * - 底部：消息输入框
 *
 * 每个 POI/区域就是一个聊天房间，可以和多个角色对话。
 */

/**
 * 格式化消息文本，支持 *斜体* 和角色名: 格式
 */
function formatMessageText(text) {
  if (!text) return ''
  // Convert *text* to <em>text</em> for italic
  let formatted = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // Convert Name: message to bold name
  formatted = formatted.replace(/^([^:\n]+):\s*/gm, '<strong>$1：</strong>')
  return formatted
}

/**
 * 时间戳格式化
 */
function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) +
    ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// ─────────────────────────────────────────
// Character Avatar Component
// ─────────────────────────────────────────

function CharacterAvatar({ character, size = 'normal', isActive, onClick, expression = 'neutral' }) {
  const sizeMap = {
    small: '40px',
    normal: '56px',
    large: '72px',
  }
  const px = sizeMap[size] || sizeMap.normal

  // 获取立绘 URL（支持表情精灵图）
  // 优先级：1. 指定表情的立绘 2. avatar 字段 3. sprites.neutral 4. image_url
  const sprites = character?.sprites || {}
  const avatarUrl = sprites[expression] || character?.avatar || sprites.neutral || character?.image_url || null

  return (
    <div
      className={`char-avatar ${isActive ? 'active' : ''} ${onClick ? 'clickable' : ''}`}
      style={{ width: px, height: px, flexShrink: 0 }}
      onClick={onClick}
      title={character?.name ? `${character.name} [${expression}]` : character?.name}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={character?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
      ) : (
        <div className="char-avatar-placeholder" style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #1e293b, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size === 'small' ? '16px' : size === 'large' ? '28px' : '20px',
        }}>
          {character?.name?.[0] || '?'}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// Character Sidebar
// ─────────────────────────────────────────

function CharacterSidebar({ characters, selectedChar, onSelectChar }) {
  const [expanded, setExpanded] = useState(false)

  if (!characters || characters.length === 0) {
    return (
      <div className="char-sidebar empty">
        <div className="empty-hint">
          <p>这个地点没有角色。</p>
          <p className="muted">让酒馆主人添加一些角色吧。</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`char-sidebar ${expanded ? 'expanded' : ''}`}>
      <div className="char-sidebar-header">
        <span className="char-count">{characters.length} 个角色</span>
        <button
          className="toggle-btn"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? '收起' : '展开'}
        >
          {expanded ? '◀' : '▶'}
        </button>
      </div>

      <div className="char-list">
        {characters.map((char) => (
          <div
            key={char.id}
            className={`char-item ${selectedChar?.id === char.id ? 'active' : ''}`}
            onClick={() => onSelectChar(char)}
          >
            <CharacterAvatar
              character={char}
              size="normal"
              isActive={selectedChar?.id === char.id}
            />
            <div className="char-info">
              <div className="char-name">{char.name}</div>
              <div className="char-archetype muted">
                {char.archetype || char.personality?.slice(0, 20) || ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Chat Message
// ─────────────────────────────────────────

function ChatMessage({ message, character }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="chat-message system-message">
        <div className="system-text">{message.content}</div>
      </div>
    )
  }

  return (
    <div className={`chat-message ${isUser ? 'user-message' : 'char-message'}`}>
      <CharacterAvatar
        character={isUser ? null : character}
        size="small"
      />
      <div className="message-bubble">
        {!isUser && character && (
          <div className="message-sender">{character.name}</div>
        )}
        <div
          className="message-content"
          dangerouslySetInnerHTML={{ __html: formatMessageText(message.content) }}
        />
        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Chat Input Area
// ─────────────────────────────────────────

function ChatInputArea({ onSend, sending, character, placeholder }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const handleSend = () => {
    if (!text.trim() || sending) return
    onSend(text.trim())
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  const handleInput = (e) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
  }

  return (
    <div className="chat-input-area">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `对 ${character?.name || '角色'} 说...`}
          rows={1}
          disabled={sending}
          className="chat-textarea"
        />
        <div className="input-actions">
          <span className="char-count-hint">{text.length}</span>
          <button
            className="btn-send"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            title="发送 (Enter)"
          >
            {sending ? (
              <span className="sending-indicator">生成中...</span>
            ) : (
              '▶'
            )}
          </button>
        </div>
      </div>
      <div className="input-hints muted">
        <span>Enter 发送</span>
        <span>Shift+Enter 换行</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Character Detail Panel
// ─────────────────────────────────────────

function CharacterDetail({ character, onClose }) {
  if (!character) return null

  return (
    <div className="char-detail-panel">
      <div className="char-detail-header">
        <h3>{character.name}</h3>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>
      <div className="char-detail-body">
        {character.description && (
          <div className="char-detail-section">
            <label>角色描述</label>
            <p>{character.description}</p>
          </div>
        )}
        {character.personality && (
          <div className="char-detail-section">
            <label>性格设定</label>
            <p>{character.personality}</p>
          </div>
        )}
        {character.scenario && (
          <div className="char-detail-section">
            <label>场景设定</label>
            <p>{character.scenario}</p>
          </div>
        )}
        {character.system_prompt && (
          <div className="char-detail-section">
            <label>系统提示词</label>
            <p className="system-prompt-text">{character.system_prompt}</p>
          </div>
        )}
        {character.tags && character.tags.length > 0 && (
          <div className="char-detail-section">
            <label>标签</label>
            <div className="tag-list">
              {character.tags.map((tag, i) => (
                <span key={i} className="tag-chip">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Expression Selector Component
// ─────────────────────────────────────────

function ExpressionSelector({ sprites = {}, availableExpressions = [], currentExpression, onChange }) {
  const exprList = availableExpressions.filter(expr => sprites[expr])

  if (exprList.length === 0) {
    return null
  }

  return (
    <select
      className="expression-selector"
      value={currentExpression || 'neutral'}
      onChange={(e) => onChange(e.target.value)}
      title="选择角色表情"
    >
      {exprList.map((expr) => (
        <option key={expr} value={expr}>{expr}</option>
      ))}
    </select>
  )
}

// ─────────────────────────────────────────
// Main Chat Room Component
// ─────────────────────────────────────────

/**
 * TavernChatRoom — SillyTavern 风格的聊天房间
 *
 * @param {object} props
 * @param {string} props.roomId - 房间 ID（可以是 POI ID 或 tavern ID）
 * @param {string} props.roomName - 房间名称（显示在标题）
 * @param {string} props.roomDescription - 房间描述
 * @param {Array} props.characters - 角色列表
 * @param {object} props.scenePrompt - 场景提示词
 * @param {string} props.visitorId - 访客 ID
 * @param {string} props.apiBase - API 基础 URL（可选，默认使用 tavernService）
 * @param {function} props.onCharacterSwitch - 角色切换回调
 */
export default function TavernChatRoom({
  roomId,
  roomName = '未知地点',
  roomDescription = '',
  characters = [],
  scenePrompt = '',
  visitorId = 'visitor',
  apiBase = '',
  onCharacterSwitch,
}) {
  const [selectedChar, setSelectedChar] = useState(characters[0] || null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState(null)
  const [currentExpression, setCurrentExpression] = useState('neutral')
  const [sprites, setSprites] = useState({})
  const [availableExpressions, setAvailableExpressions] = useState([])
  const messagesEndRef = useRef(null)
  const tavernService = getDefaultTavernService()

  // Auto-select first character
  useEffect(() => {
    if (characters.length > 0 && !selectedChar) {
      setSelectedChar(characters[0])
    }
  }, [characters])

  // Load chat history when character changes
  useEffect(() => {
    if (selectedChar && roomId) {
      loadHistory()
    }
  }, [selectedChar?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add opening message when character changes
  useEffect(() => {
    if (selectedChar?.first_mes && messages.length === 0) {
      setMessages([{
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: selectedChar.first_mes,
        timestamp: Date.now(),
        character: selectedChar,
      }])
    }
  }, [selectedChar?.id])

  // Load sprites and expressions when character changes
  useEffect(() => {
    if (!roomId || !selectedChar) return
    loadSprites()
  }, [selectedChar?.id, roomId])

  async function loadSprites() {
    if (!roomId || !selectedChar) return
    try {
      // Load available expressions
      const exprResult = await tavernService.getExpressions()
      setAvailableExpressions(exprResult.expressions || [])

      // Load character sprites
      const spriteResult = await tavernService.getCharacterSprites(roomId, selectedChar.id)
      if (spriteResult.sprites) {
        setSprites(spriteResult.sprites)
        setCurrentExpression(spriteResult.default_expression || 'neutral')
      }
    } catch (err) {
      console.error('Load sprites error:', err)
    }
  }

  async function inferExpression(text) {
    if (!text || !roomId || !selectedChar) return
    try {
      const result = await tavernService.inferExpression(text, selectedChar.name, roomId, selectedChar.id)
      if (result.expression && sprites[result.expression]) {
        setCurrentExpression(result.expression)
      }
    } catch (err) {
      // Silently fail - expression inference is optional
    }
  }

  async function loadHistory() {
    if (!roomId || !selectedChar) return
    setLoading(true)
    try {
      const result = await tavernService.getChatHistory(roomId, visitorId, selectedChar.id)
      if (result.messages && result.messages.length > 0) {
        setMessages(result.messages.map((m) => ({
          id: m.id || `hist-${Date.now()}-${Math.random()}`,
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
          timestamp: m.timestamp
            ? (m.timestamp > 1e12 ? m.timestamp : m.timestamp * 1000)
            : Date.now(),
          character: m.role === 'assistant' ? selectedChar : null,
        })))
      } else if (selectedChar.first_mes) {
        // Add opening message if no history
        setMessages([{
          id: `init-${Date.now()}`,
          role: 'assistant',
          content: selectedChar.first_mes,
          timestamp: Date.now(),
          character: selectedChar,
        }])
      }
    } catch (err) {
      console.error('Load history error:', err)
      // Add opening message on error
      if (selectedChar.first_mes) {
        setMessages([{
          id: `init-${Date.now()}`,
          role: 'assistant',
          content: selectedChar.first_mes,
          timestamp: Date.now(),
          character: selectedChar,
        }])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(text) {
    if (!text.trim() || sending || !selectedChar) return

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      character: null,
    }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)

    try {
      const result = await tavernService.sendChat(roomId, selectedChar.id, text.trim(), visitorId)
      const charMsg = {
        id: `msg-${Date.now()}-r`,
        role: 'assistant',
        content: result.response || '...',
        timestamp: Date.now(),
        character: selectedChar,
      }
      setMessages((prev) => [...prev, charMsg])
    } catch (err) {
      console.error('Send error:', err)
      const charMsg = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: selectedChar?.first_mes || '对方没有回应。',
        timestamp: Date.now(),
        character: selectedChar,
      }
      setMessages((prev) => [...prev, charMsg])
    } finally {
      setSending(false)
    }
  }

  function handleSelectChar(char) {
    if (char.id === selectedChar?.id) return
    setSelectedChar(char)
    setMessages([])
    if (onCharacterSwitch) {
      onCharacterSwitch(char)
    }
  }

  function handleAvatarClick(char) {
    setSelectedChar(char)
    setShowDetail(true)
  }

  return (
    <div className="tavern-chat-room">
      {/* Header */}
      <div className="chat-room-header">
        <div className="room-info">
          <h3 className="room-name">{roomName}</h3>
          {roomDescription && (
            <p className="room-desc muted">{roomDescription.slice(0, 60)}</p>
          )}
        </div>
        <div className="room-status">
          {characters.length > 0 && (
            <span className="char-badge">{characters.length} 角色</span>
          )}
        </div>
      </div>

      {/* Body: sidebar + chat area */}
      <div className="chat-room-body">
        {/* Character sidebar */}
        <CharacterSidebar
          characters={characters}
          selectedChar={selectedChar}
          onSelectChar={handleSelectChar}
        />

        {/* Chat area */}
        <div className="chat-area">
          {selectedChar ? (
            <>
              {/* Character info bar */}
              <div className="chat-char-bar">
                <CharacterAvatar
                  character={selectedChar}
                  size="small"
                  expression={currentExpression}
                  onClick={() => handleAvatarClick(selectedChar)}
                />
                <div className="char-bar-info">
                  <div className="char-bar-name">{selectedChar.name}</div>
                  <div className="char-bar-archetype muted">
                    {selectedChar.personality?.slice(0, 30) || selectedChar.archetype || ''}
                  </div>
                </div>
                {/* Expression selector */}
                <ExpressionSelector
                  sprites={sprites}
                  availableExpressions={availableExpressions}
                  currentExpression={currentExpression}
                  onChange={setCurrentExpression}
                />
                <button
                  className="btn-char-detail"
                  onClick={() => setShowDetail(!showDetail)}
                  title="查看角色详情"
                >
                  ℹ
                </button>
              </div>

              {/* Messages */}
              <div className="chat-messages-area">
                {loading && (
                  <div className="chat-loading">
                    <span>加载对话历史...</span>
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div className="chat-empty">
                    <div className="empty-char-avatar">
                      <CharacterAvatar character={selectedChar} size="large" />
                    </div>
                    <p>开始和 {selectedChar.name} 对话吧</p>
                    {selectedChar.first_mes && (
                      <div className="first-mes-quote">
                        <span className="quote-label">开场白：</span>
                        <span className="quote-text">{selectedChar.first_mes}</span>
                      </div>
                    )}
                  </div>
                )}

                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    character={msg.character || selectedChar}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <ChatInputArea
                onSend={handleSend}
                sending={sending}
                character={selectedChar}
              />
            </>
          ) : (
            <div className="chat-no-char">
              <p>选择一个角色开始对话</p>
            </div>
          )}
        </div>

        {/* Character detail panel */}
        {showDetail && selectedChar && (
          <CharacterDetail
            character={selectedChar}
            onClose={() => setShowDetail(false)}
          />
        )}
      </div>
    </div>
  )
}
