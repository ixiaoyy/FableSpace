import { useState, useEffect, useRef } from 'react'
import { getDefaultTavernService } from './services/tavernService'
import TavernContextPanel from './TavernContextPanel'

/**
 * TavernChatRoom — 酒馆三栏布局聊天房间
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
  if (Number.isNaN(date.getTime())) {
    return '刚刚'
  }
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) +
    ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const DEFAULT_EXPRESSION = 'neutral'

const EXPRESSION_LABELS = {
  admiration: '赞赏',
  amusement: '好笑',
  anger: '愤怒',
  annoyance: '烦躁',
  approval: '认可',
  caring: '关切',
  confusion: '困惑',
  curiosity: '好奇',
  desire: '渴望',
  disappointment: '失望',
  disapproval: '不赞同',
  disgust: '厌恶',
  embarrassment: '尴尬',
  excitement: '兴奋',
  fear: '害怕',
  gratitude: '感谢',
  grief: '悲伤',
  joy: '开心',
  love: '喜爱',
  nervousness: '紧张',
  optimism: '乐观',
  pride: '骄傲',
  realization: '恍然',
  relief: '安心',
  remorse: '懊悔',
  sadness: '难过',
  surprise: '惊讶',
  neutral: '平静',
}

const EXPRESSION_SOURCE_LABELS = {
  default: '默认表情',
  fallback: '临时规则回应',
  keyword: '关键词推断',
  llm: 'AI 推断',
  manual: '手动选择',
}

function getExpressionLabel(expression) {
  return EXPRESSION_LABELS[expression] || expression || EXPRESSION_LABELS.neutral
}

function getExpressionSourceLabel(source) {
  return EXPRESSION_SOURCE_LABELS[source] || source || EXPRESSION_SOURCE_LABELS.default
}

function getRelationshipStageLabel(stage) {
  const labels = {
    stranger: '初访者',
    acquaintance: '熟面孔',
    regular: '常客',
    confidant: '熟客盟友',
  }
  return labels[stage] || stage || '未建立'
}

function formatMemoryTime(value) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getVisitorMemoryPayload(entryState, fallbackVisitCount = 0) {
  const visitorState = entryState?.visitor_state || entryState || {}
  const relationship = visitorState.relationship || entryState?.relationship || {}
  return {
    visitCount: Number(visitorState.visit_count ?? entryState?.visit_count ?? fallbackVisitCount ?? 0),
    stage: relationship.stage || visitorState.relationship_stage || '',
    strength: Number(relationship.strength ?? visitorState.relationship_strength ?? 0),
    firstVisit: visitorState.first_visit || entryState?.first_visit || '',
    lastVisit: visitorState.last_visit || entryState?.last_visit || '',
  }
}

function normalizeSprites(rawSprites) {
  if (!rawSprites || typeof rawSprites !== 'object') return {}
  return Object.fromEntries(
    Object.entries(rawSprites).filter(([, url]) => typeof url === 'string' && url.trim())
  )
}

function getSpriteExpressionList(rawSprites, availableExpressions = []) {
  const sprites = normalizeSprites(rawSprites)
  const configured = Object.keys(sprites)
  const ordered = availableExpressions.filter((expression) => sprites[expression])
  const extras = configured.filter((expression) => !ordered.includes(expression)).sort()
  return [...ordered, ...extras]
}

function normalizeChatTimestamp(timestamp) {
  if (!timestamp) return Date.now()
  if (typeof timestamp === 'number') {
    return timestamp > 1e12 ? timestamp : timestamp * 1000
  }
  const parsed = Date.parse(timestamp)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

// ─────────────────────────────────────────
// Character Avatar Component
// ─────────────────────────────────────────

function CharacterAvatar({ character, size = 'normal', isActive, onClick, expression = DEFAULT_EXPRESSION, spritesOverride = null }) {
  const sizeMap = {
    small: '40px',
    normal: '56px',
    large: '72px',
  }
  const px = sizeMap[size] || sizeMap.normal

  // 获取立绘 URL（支持表情精灵图）
  // 优先级：1. 指定表情的立绘 2. avatar 字段 3. sprites.neutral 4. image_url
  const sprites = normalizeSprites(spritesOverride || character?.sprites)
  const resolvedExpression = expression || DEFAULT_EXPRESSION
  const avatarUrl = sprites[resolvedExpression] || character?.avatar || sprites.neutral || character?.image_url || null
  const expressionClass = String(resolvedExpression).replace(/[^a-z0-9_-]/gi, '') || DEFAULT_EXPRESSION

  return (
    <div
      className={`char-avatar char-avatar--${expressionClass} ${isActive ? 'active' : ''} ${onClick ? 'clickable' : ''}`}
      style={{ width: px, height: px, flexShrink: 0 }}
      onClick={onClick}
      title={character?.name ? `${character.name} · ${getExpressionLabel(resolvedExpression)}` : character?.name}
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

function ChatMessage({ message, character, sprites, visitorNickname, voiceConfig, tavernId, onPlayTTS }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const expression = message.expression || DEFAULT_EXPRESSION

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
        expression={isUser ? DEFAULT_EXPRESSION : expression}
        spritesOverride={isUser ? null : sprites}
      />
      <div className="message-bubble">
        {!isUser && character && (
          <div className="message-sender">
            <span>{character.name}</span>
            <span className="message-expression">{getExpressionLabel(expression)}</span>
          </div>
        )}
        {isUser && visitorNickname && (
          <div className="message-sender visitor-sender">
            <span>{visitorNickname}</span>
          </div>
        )}
        <div
          className="message-content"
          dangerouslySetInnerHTML={{ __html: formatMessageText(message.content) }}
        />
        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          {!isUser && voiceConfig?.enabled && (
            <button
              className="btn-play-tts"
              onClick={() => onPlayTTS(tavernId, message.content)}
              title="播放语音"
            >
              🔊
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Chat Input Area
// ─────────────────────────────────────────

function ChatInputArea({ onSend, sending, character, placeholder, voiceConfig }) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
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

  // Speech-to-Text using Web Speech API or Backend STT
  const handleRecord = async () => {
    // Check if backend STT is enabled (not browser)
    const useBackendSTT = voiceConfig?.enabled && voiceConfig?.stt_provider && voiceConfig?.stt_provider !== 'browser'

    if (useBackendSTT) {
      // Use backend STT (Whisper/FasterWhisper)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        const chunks = []

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          stream.getTracks().forEach(track => track.stop())
          setRecording(false)

          try {
            const { transcribeVoice } = await import('./services/tavernService')
            const result = await transcribeVoice(voiceConfig?.tavernId || '', blob)
            setText((prev) => prev + (result.text || ''))
            // Auto-resize after adding text
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
              }
            }, 0)
          } catch (err) {
            console.error('Backend STT error:', err)
            alert('语音转写失败：' + (err.message || '未知错误'))
          }
        }

        setRecording(true)
        mediaRecorder.start()

        // Stop recording after 10 seconds max
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
          }
        }, 10000)
      } catch (err) {
        console.error('Microphone access error:', err)
        alert('无法访问麦克风，请检查权限设置。')
      }
      return
    }

    // Browser STT (Web Speech API)
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别。请使用 Chrome 浏览器。')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setRecording(true)
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setText((prev) => prev + transcript)
      // Auto-resize after adding text
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
        }
      }, 0)
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setRecording(false)
    }

    recognition.onend = () => {
      setRecording(false)
    }

    recognition.start()
  }

  // Check if voice is enabled
  const voiceEnabled = voiceConfig?.enabled && voiceConfig?.stt_provider === 'browser'

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
          {voiceEnabled && (
            <button
              type="button"
              className={`btn-voice-input ${recording ? 'recording' : ''}`}
              onClick={handleRecord}
              disabled={sending}
              title={recording ? '正在录音...' : '语音输入 (STT)'}
            >
              {recording ? '🔴' : '🎤'}
            </button>
          )}
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
        {voiceEnabled && <span>🎤 语音输入</span>}
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
            <label>角色指令（高级）</label>
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
// Visitor Memory Panel
// ─────────────────────────────────────────

function TavernMemoryPanel({
  entryState,
  messages,
  selectedChar,
  visitorNickname,
  roomName,
  onClose,
}) {
  const memory = getVisitorMemoryPayload(entryState)
  const userMessages = messages.filter((message) => message.role === 'user')
  const assistantMessages = messages.filter((message) => message.role === 'assistant')
  const recentUserMessage = [...userMessages].reverse().find((message) => message.content)
  const recentAssistantMessage = [...assistantMessages].reverse().find((message) => message.content)
  const strengthPercent = Math.max(0, Math.min(100, Math.round(memory.strength * 100)))

  return (
    <aside className="memory-detail-panel">
      <div className="char-detail-header">
        <h4>记忆</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="memory-panel-section">
        <span className="mini-label">当前关系</span>
        <strong>{getRelationshipStageLabel(memory.stage)}</strong>
        <div className="memory-strength-bar" aria-label={`关系强度 ${strengthPercent}%`}>
          <span style={{ width: `${strengthPercent}%` }} />
        </div>
        <p className="muted">
          {visitorNickname || '这位访客'} 已到访 {memory.visitCount || 0} 次。
        </p>
      </div>

      <div className="memory-grid">
        <div>
          <span className="mini-label">首次到访</span>
          <strong>{formatMemoryTime(memory.firstVisit)}</strong>
        </div>
        <div>
          <span className="mini-label">最近到访</span>
          <strong>{formatMemoryTime(memory.lastVisit)}</strong>
        </div>
        <div>
          <span className="mini-label">本轮消息</span>
          <strong>{messages.length}</strong>
        </div>
        <div>
          <span className="mini-label">当前角色</span>
          <strong>{selectedChar?.name || '未选择'}</strong>
        </div>
      </div>

      <div className="memory-panel-section">
        <span className="mini-label">本轮短期记忆</span>
        {recentUserMessage || recentAssistantMessage ? (
          <div className="memory-recent-list">
            {recentUserMessage ? (
              <p><strong>{visitorNickname || '访客'}：</strong>{recentUserMessage.content.slice(0, 90)}</p>
            ) : null}
            {recentAssistantMessage ? (
              <p><strong>{selectedChar?.name || 'NPC'}：</strong>{recentAssistantMessage.content.slice(0, 90)}</p>
            ) : null}
          </div>
        ) : (
          <p className="muted">还没有本轮对话。发出第一句话后，这里会显示最新短期上下文。</p>
        )}
      </div>

      <div className="memory-panel-section">
        <span className="mini-label">系统会注入的稳定事实</span>
        <ul className="memory-fact-list">
          <li>酒馆：{roomName}</li>
          <li>访客称呼：{visitorNickname || '旅人'}</li>
          <li>关系阶段：{getRelationshipStageLabel(memory.stage)}</li>
          <li>到访次数：{memory.visitCount || 0}</li>
        </ul>
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────
// Expression Selector Component
// ─────────────────────────────────────────

function ExpressionSelector({ sprites = {}, availableExpressions = [], currentExpression, onChange }) {
  const exprList = getSpriteExpressionList(sprites, availableExpressions)
  const options = exprList.includes(currentExpression)
    ? exprList
    : [currentExpression || DEFAULT_EXPRESSION, ...exprList].filter(Boolean)

  if (exprList.length === 0) {
    return (
      <span className="expression-selector-empty" title="当前角色还没有配置表情立绘">
        {getExpressionLabel(currentExpression)}
      </span>
    )
  }

  return (
    <select
      className="expression-selector"
      value={currentExpression || 'neutral'}
      onChange={(e) => onChange(e.target.value)}
      title="选择角色表情"
    >
      {options.map((expr) => (
        <option key={expr} value={expr}>{getExpressionLabel(expr)}</option>
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
 * @param {string} props.visitorId - 访客 ID
 * @param {string} props.visitorNickname - 访客昵称（显示在用户消息旁）
 * @param {object} props.entryState - 入场返回的访客记忆 / 回访状态
 * @param {function} props.onCharacterSwitch - 角色切换回调
 */
export default function TavernChatRoom({
  roomId,
  roomName = '未知地点',
  roomDescription = '',
  characters = [],
  tavern = null,
  visitorId = 'visitor',
  visitorNickname = '',
  entryState = null,
  onCharacterSwitch,
}) {
  const [selectedChar, setSelectedChar] = useState(characters[0] || null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentExpression, setCurrentExpression] = useState(DEFAULT_EXPRESSION)
  const [expressionSource, setExpressionSource] = useState('default')
  const [expressionBusy, setExpressionBusy] = useState(false)
  const [degradationNotice, setDegradationNotice] = useState(null)
  const [sprites, setSprites] = useState({})
  const [availableExpressions, setAvailableExpressions] = useState([])
  const [voiceConfig, setVoiceConfig] = useState(null)
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [visitorMemoryState, setVisitorMemoryState] = useState(entryState)
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

  useEffect(() => {
    setVisitorMemoryState(entryState)
  }, [entryState])

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
        expression: DEFAULT_EXPRESSION,
        expressionSource: 'default',
      }])
    }
  }, [selectedChar?.id])

  // Load sprites and expressions when character changes
  useEffect(() => {
    if (!roomId || !selectedChar) return
    loadSprites()
  }, [selectedChar?.id, roomId])

  // Load voice config when roomId changes
  useEffect(() => {
    if (!roomId) return
    tavernService.getVoiceConfig(roomId).then((result) => {
      setVoiceConfig(result.voice_config)
    }).catch(() => {
      // Voice config not available, silently ignore
      setVoiceConfig({ enabled: false })
    })
  }, [roomId])

  async function loadSprites() {
    if (!roomId || !selectedChar) return
    const fallbackSprites = normalizeSprites(selectedChar.sprites)
    try {
      // Load available expressions
      const exprResult = await tavernService.getExpressions()
      setAvailableExpressions(exprResult.expressions || [])

      // Load character sprites
      const spriteResult = await tavernService.getCharacterSprites(roomId, selectedChar.id)
      const loadedSprites = normalizeSprites(spriteResult.sprites || fallbackSprites)
      setSprites(loadedSprites)
      setCurrentExpression(spriteResult.default_expression || (loadedSprites.neutral ? DEFAULT_EXPRESSION : currentExpression))
      setExpressionSource('default')
    } catch (err) {
      console.error('Load sprites error:', err)
      setSprites(fallbackSprites)
      setCurrentExpression(fallbackSprites.neutral ? DEFAULT_EXPRESSION : currentExpression)
      setExpressionSource('default')
    }
  }

  async function inferExpression(text) {
    if (!text || !roomId || !selectedChar) return null
    setExpressionBusy(true)
    try {
      const result = await tavernService.inferExpression(text, selectedChar.name, roomId, selectedChar.id)
      const expression = result.expression || DEFAULT_EXPRESSION
      setCurrentExpression(expression)
      setExpressionSource(result.source || 'keyword')
      return {
        expression,
        source: result.source || 'keyword',
      }
    } catch (err) {
      return {
        expression: DEFAULT_EXPRESSION,
        source: 'fallback',
      }
    } finally {
      setExpressionBusy(false)
    }
  }

  function handleExpressionChange(expression) {
    setCurrentExpression(expression)
    setExpressionSource('manual')
  }

  function buildAssistantMessage({ id, content, timestamp = Date.now(), expression = DEFAULT_EXPRESSION, source = 'default' }) {
    return {
      id,
      role: 'assistant',
      content,
      timestamp,
      character: selectedChar,
      expression,
      expressionSource: source,
    }
  }

  function buildFallbackReply(id) {
    const content = selectedChar?.first_mes || '对方没有回应。'
    return buildAssistantMessage({
      id,
      content,
      expression: DEFAULT_EXPRESSION,
      source: 'fallback',
    })
  }

  function applyExpressionToMessage(messageId, expressionResult) {
    if (!expressionResult?.expression) return
    setMessages((prev) => prev.map((message) => (
      message.id === messageId
        ? {
          ...message,
          expression: expressionResult.expression,
          expressionSource: expressionResult.source || 'keyword',
        }
        : message
    )))
  }

  function resetExpressionForCharacter(char) {
    const nextSprites = normalizeSprites(char?.sprites)
    setSprites(nextSprites)
    setCurrentExpression(DEFAULT_EXPRESSION)
    setExpressionSource('default')
    setExpressionBusy(false)
    setDegradationNotice(null)
  }

  async function loadHistory() {
    if (!roomId || !selectedChar) return
    setLoading(true)
    try {
      const result = await tavernService.getChatHistory(roomId, visitorId, selectedChar.id, visitorId)
      if (result.messages && result.messages.length > 0) {
        setMessages(result.messages.map((m) => ({
          id: m.id || `hist-${Date.now()}-${Math.random()}`,
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
          timestamp: normalizeChatTimestamp(m.timestamp),
          character: m.role === 'assistant' ? selectedChar : null,
          expression: m.expression || DEFAULT_EXPRESSION,
          expressionSource: m.expression_source || 'default',
        })))
      } else if (selectedChar.first_mes) {
        // Add opening message if no history
        setMessages([buildAssistantMessage({
          id: `init-${Date.now()}`,
          content: selectedChar.first_mes,
        })])
      }
    } catch (err) {
      console.error('Load history error:', err)
      // Add opening message on error
      if (selectedChar.first_mes) {
        setMessages([buildAssistantMessage({
          id: `init-${Date.now()}`,
          content: selectedChar.first_mes,
        })])
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
      const result = await tavernService.sendChat(
        roomId,
        selectedChar.id,
        text.trim(),
        visitorId,
        visitorNickname,
      )
      const responseText = result.response || '...'
      const replyId = `msg-${Date.now()}-r`
      const isDegraded = Boolean(result.degraded)
      const nextExpression = isDegraded ? DEFAULT_EXPRESSION : currentExpression
      const nextExpressionSource = isDegraded ? 'fallback' : expressionSource
      if (result.visitor_state) {
        setVisitorMemoryState(result.visitor_state)
      }
      const charMsg = {
        ...buildAssistantMessage({
          id: replyId,
          content: responseText,
          expression: nextExpression,
          source: nextExpressionSource,
        }),
      }
      setMessages((prev) => [...prev, charMsg])
      if (isDegraded) {
        setCurrentExpression(DEFAULT_EXPRESSION)
        setExpressionSource('fallback')
        setDegradationNotice(result.degradation || {
          title: 'AI 服务暂时不可用',
          message: '已切换为规则回应。',
          action: '店主可以在 AI 配置里测试连接。',
        })
      } else {
        setDegradationNotice(null)
        const expressionResult = await inferExpression(responseText)
        applyExpressionToMessage(replyId, expressionResult)
      }
    } catch (err) {
      console.error('Send error:', err)
      const status = err.errorType
      let title, message, action

      if (status === 401) {
        title = '认证失败'
        message = 'API 密钥无效或已过期，无法连接到 AI 服务。'
        action = '请店主在 AI 配置中检查 API Key 是否正确。'
      } else if (status === 403) {
        title = '无访问权限'
        message = '没有权限访问该 AI 服务（可能被拒绝或 IP 未白名单）。'
        action = '请店主确认 Base URL 和 API Key 的权限设置。'
      } else if (status === 429) {
        title = '请求过于频繁'
        message = 'AI 服务限流了，稍等片刻后可重试。'
        action = '降低对话频率，或店主考虑升级 API 配额。'
      } else if (status && status >= 500) {
        title = '服务端暂时不可用'
        message = err.message || 'AI 服务出错，请稍后再试。'
        action = '稍后重试；如果持续出现，请店主检查 AI 服务状态。'
      } else {
        title = '消息没有送达'
        message = err.message || '网络或服务端暂时不可用。'
        action = '稍后重试；如果仍然失败，请店主检查服务状态。'
      }

      const charMsg = buildFallbackReply(`msg-${Date.now()}-err`)
      setMessages((prev) => [...prev, charMsg])
      setCurrentExpression(DEFAULT_EXPRESSION)
      setExpressionSource('fallback')
      setDegradationNotice({ title, message, action })
    } finally {
      setSending(false)
    }
  }

  function handleSelectChar(char) {
    if (char.id === selectedChar?.id) return
    setSelectedChar(char)
    setMessages([])
    resetExpressionForCharacter(char)
    if (onCharacterSwitch) {
      onCharacterSwitch(char)
    }
  }

  function handleAvatarClick(char) {
    setSelectedChar(char)
    setShowDetail(true)
  }

  async function handlePlayTTS(tavernId, text) {
    if (!text || !tavernId) return
    try {
      const audioUrl = await tavernService.synthesizeVoice(tavernId, text)
      // Play the audio
      const audio = new Audio(audioUrl)
      audio.play()
      // Clean up the blob URL after playback
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl)
      })
    } catch (err) {
      console.error('TTS playback failed:', err)
      alert('语音播放失败：' + (err.message || '未知错误'))
    }
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
          <button
            type="button"
            className={`btn-context-panel ${contextPanelOpen ? 'active' : ''}`}
            onClick={() => setContextPanelOpen((open) => !open)}
            title="上下文面板"
          >
            📋 上下文
          </button>
          <button
            type="button"
            className={`btn-memory-panel ${memoryPanelOpen ? 'active' : ''}`}
            onClick={() => setMemoryPanelOpen((open) => !open)}
            title="查看访客回访记忆"
          >
            🧠 记忆
          </button>
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
                  spritesOverride={sprites}
                  onClick={() => handleAvatarClick(selectedChar)}
                />
                <div className="char-bar-info">
                  <div className="char-bar-name">{selectedChar.name}</div>
                  <div className="char-bar-archetype muted">
                    {selectedChar.personality?.slice(0, 30) || selectedChar.archetype || ''}
                  </div>
                </div>
                <div className="expression-state" aria-live="polite">
                  <span>{expressionBusy ? '识别中...' : getExpressionLabel(currentExpression)}</span>
                  <small>{getExpressionSourceLabel(expressionSource)}</small>
                </div>
                {/* Expression selector */}
                <ExpressionSelector
                  sprites={sprites}
                  availableExpressions={availableExpressions}
                  currentExpression={currentExpression}
                  onChange={handleExpressionChange}
                />
                <button
                  className="btn-char-detail"
                  onClick={() => setShowDetail(!showDetail)}
                  title="查看角色详情"
                >
                  ℹ
                </button>
              </div>

              {degradationNotice ? (
                <div className="chat-degradation-banner" role="status" aria-live="polite">
                  <strong>{degradationNotice.title || 'AI 服务暂时不可用'}</strong>
                  <span>{degradationNotice.message || '已切换为规则回应。'}</span>
                  {degradationNotice.action ? <small>{degradationNotice.action}</small> : null}
                </div>
              ) : null}

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
                      <CharacterAvatar
                        character={selectedChar}
                        size="large"
                        expression={currentExpression}
                        spritesOverride={sprites}
                      />
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
                    sprites={sprites}
                    visitorNickname={visitorNickname}
                    voiceConfig={voiceConfig}
                    tavernId={roomId}
                    onPlayTTS={handlePlayTTS}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <ChatInputArea
                onSend={handleSend}
                sending={sending}
                character={selectedChar}
                voiceConfig={voiceConfig}
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

        {memoryPanelOpen && (
          <TavernMemoryPanel
            entryState={visitorMemoryState}
            messages={messages}
            selectedChar={selectedChar}
            visitorNickname={visitorNickname}
            roomName={roomName}
            onClose={() => setMemoryPanelOpen(false)}
          />
        )}

        {contextPanelOpen && (
          <TavernContextPanel
            tavern={tavern}
            selectedChar={selectedChar}
            entryState={entryState}
            messages={messages}
            visitorNickname={visitorNickname}
            roomName={roomName}
            voiceConfig={voiceConfig}
            onClose={() => setContextPanelOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
