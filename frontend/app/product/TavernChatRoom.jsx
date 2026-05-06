import { useMemo, useState, useEffect, useRef } from 'react'
import TavernContextPanel from './TavernContextPanel'
import TavernMemoryPanel from './TavernMemoryPanel'
import CharacterAvatar from './CharacterAvatar'
import CharacterLookSummary from './CharacterLookSummary'
import TavernMiniGamePanel from './TavernMiniGamePanel'
import TavernGameplayLauncher from './TavernGameplayLauncher'
import GameplaySessionPanel from './GameplaySessionPanel'
import StateCardReviewPanel from './StateCardReviewPanel'
import {
  buildGuildActionPrompt,
  GUILD_REPUTATION_TIERS,
  getGuildQuestBoard,
  getQuestRecordLabel,
  getQuestReturnHint,
  getGuildTier,
  inferTavernPlayMode,
  loadGuildProgress,
  saveGuildProgress,
  updateGuildProgress,
} from './tavernPlayModes'
import { buildMiniGameStartPrompt, getMiniGameTemplates } from './tavernMiniGames'
import {
  abandonGameplaySession,
  advanceGameplaySession,
  decideStateCard,
  getCharacterSprites,
  getExpressions,
  getGameplays,
  getGroupChatHistory,
  getTavernChatHistory,
  getVoiceConfig,
  inferExpression,
  listStateCards,
  listGameplaySessions,
  sendGroupChat,
  sendTavernChat,
  startGameplaySession,
  synthesizeVoice,
  transcribeVoice,
} from '../lib/taverns'

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

const GROUP_STRATEGY_LABELS = {
  balanced: '均衡轮换',
  weighted_random: '按积极度',
  round_robin: '固定轮流',
  relevance: '减少重复',
}

const GROUP_ROOM_RULES = [
  {
    id: 'speaker-rules',
    label: '发言规则',
  },
  {
    id: 'visitor-agency',
    label: '访客主导',
  },
  {
    id: 'canon-boundary',
    label: '正史边界',
  },
]

function getExpressionLabel(expression) {
  return EXPRESSION_LABELS[expression] || expression || EXPRESSION_LABELS.neutral
}

function getExpressionSourceLabel(source) {
  return EXPRESSION_SOURCE_LABELS[source] || source || EXPRESSION_SOURCE_LABELS.default
}

function getGroupStrategyLabel(strategy) {
  return GROUP_STRATEGY_LABELS[strategy] || GROUP_STRATEGY_LABELS.balanced
}

function getTavernResponseMode(tavern) {
  const llmConfig = tavern?.llm_config && typeof tavern.llm_config === 'object' ? tavern.llm_config : {}
  const backend = String(llmConfig.backend || '').trim().toLowerCase()
  if (['rules', 'rule_based', 'public_welfare'].includes(backend)) {
    return {
      label: '规则模式 / 无 Key 轻量接待',
      className: 'is-rules',
      title: '内置公益酒馆使用本地规则模板接待，不会伪装成外部 LLM。',
    }
  }
  if (tavern?.status === 'closed' && !['rules', 'rule_based', 'public_welfare'].includes(backend)) {
    return {
      label: 'AI 后端未开放或未配置',
      className: 'is-missing-llm',
      title: '店主需要开放酒馆并配置、测试模型后，NPC 才能以外部 LLM 接待。',
    }
  }
  return {
    label: '外部 LLM 模式',
    className: 'is-llm',
    title: '当前按店主配置的外部 LLM 进行 NPC 对话。',
  }
}

function getGroupResponseCapLabel(maxResponses) {
  const parsed = Number.parseInt(maxResponses, 10)
  const count = Number.isFinite(parsed) ? Math.max(1, Math.min(3, parsed)) : 2
  return `每轮最多 ${count} 人`
}

function getGroupCooldownLabel(seconds) {
  const parsed = Number.parseInt(seconds, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return '无额外冷却'
  return `${Math.min(30, parsed)} 秒冷却`
}

function getGroupRoomRules(groupChatConfig = {}) {
  const strategyLabel = getGroupStrategyLabel(groupChatConfig.strategy)
  const responseCapLabel = getGroupResponseCapLabel(groupChatConfig.max_responses_per_turn)
  const cooldownLabel = getGroupCooldownLabel(groupChatConfig.response_cooldown_seconds)
  const namePrefixLabel = groupChatConfig.require_name_prefix === false
    ? '当前不强制角色名前缀'
    : '回复保留角色名前缀'

  return GROUP_ROOM_RULES.map((rule) => {
    if (rule.id === 'speaker-rules') {
      return {
        ...rule,
        text: `店主设定谁更爱接话；当前按${strategyLabel}选择发言者，${responseCapLabel}，${cooldownLabel}，${namePrefixLabel}。`,
      }
    }
    if (rule.id === 'visitor-agency') {
      return {
        ...rule,
        text: 'NPC 只回应你放到桌上的话，不替你发言、不替你决定动作。',
      }
    }
    return {
      ...rule,
      text: '群聊可能提出记忆或状态卡候选；确认前不是酒馆正史，也不会改写店主设定。',
    }
  })
}

function normalizeGroupTalkativeness(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0.5
  return Math.max(0, Math.min(1, parsed))
}

function getGroupParticipantTone(character) {
  const talkativeness = normalizeGroupTalkativeness(character.talkativeness)
  if (talkativeness <= 0) return '暂不接话'
  if (talkativeness < 0.35) return `低积极度 · ${Math.round(talkativeness * 100)}%`
  if (talkativeness > 0.75) return `高积极度 · ${Math.round(talkativeness * 100)}%`
  return `中积极度 · ${Math.round(talkativeness * 100)}%`
}

function mergeStateCards(currentCards, incomingCards) {
  const nextById = new Map()
  const addCard = (card) => {
    if (!card || typeof card !== 'object' || !card.id) return
    nextById.set(card.id, { ...(nextById.get(card.id) || {}), ...card })
  }
  ;(Array.isArray(currentCards) ? currentCards : []).forEach(addCard)
  ;(Array.isArray(incomingCards) ? incomingCards : []).forEach(addCard)
  return Array.from(nextById.values())
    .filter((card) => card.status === 'pending')
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
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
            onClick={() => {
              onSelectChar(char)
              setExpanded(false)
            }}
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
              <CharacterLookSummary character={char} compact />
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

function ChatInputArea({ onSend, sending, character, placeholder, voiceConfig, tavernId, quickPrompts = [] }) {
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
            const result = await transcribeVoice(tavernId || voiceConfig?.tavernId || '', blob)
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
      {quickPrompts.length > 0 ? (
        <div className="chat-quick-actions" aria-label="快捷开始">
          <div className="chat-quick-actions__title">
            <strong>递一张小纸条</strong>
            <span>不想打字太多，就从这里挑一句。</span>
          </div>
          <div className="chat-quick-actions__chips">
            {quickPrompts.slice(0, 5).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSend(prompt)}
                disabled={sending}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}
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
// Exploration checklist panel
// ─────────────────────────────────────────

function GuildQuestPanel({
  enabled,
  progress,
  quests,
  tier,
  sending,
  onAction,
}) {
  if (!enabled) return null

  const acceptedCount = progress.acceptedQuestIds.length
  const completedCount = progress.completedQuestIds.length
  const nextTier = getNextGuildTier(progress.reputation)

  return (
    <section className="guild-quest-panel" aria-label="探索清单与酒馆委托">
      <div className="guild-quest-panel__header">
        <div>
          <span className="guild-kicker">🗺️ 探索清单 / 酒馆委托</span>
          <h4>{tier.title} · {tier.badge}</h4>
          <p>{tier.treatment}</p>
        </div>
        <div className="guild-header-actions">
          <button
            type="button"
            className="guild-status-btn"
            onClick={() => onAction('status')}
            disabled={sending}
          >
            查看记录
          </button>
          <button
            type="button"
            className="guild-status-btn"
            onClick={() => onAction('post')}
            disabled={sending}
          >
            提委托草稿
          </button>
        </div>
      </div>

      <div className="guild-progress-row">
        <span>完成点 <strong>{progress.reputation}</strong></span>
        <span>进行中 <strong>{acceptedCount}</strong></span>
        <span>已记录 <strong>{completedCount}</strong></span>
        {nextTier ? (
          <span>距 {nextTier.title} 还差 <strong>{Math.max(0, nextTier.min - progress.reputation)}</strong></span>
        ) : (
          <span>已完成当前清单记录</span>
        )}
      </div>

      <div className="guild-quest-list">
        {quests.map((quest) => (
          <article key={quest.id} className={`guild-quest-card is-${quest.status}`}>
            <div className="guild-quest-card__top">
              <strong>{quest.title}</strong>
              <span>{quest.difficulty} · +{quest.reward} 完成点</span>
            </div>
            <p>{quest.summary}</p>
            <small>完成记录：{getQuestRecordLabel(quest)} · 回访提示：{getQuestReturnHint(quest)}</small>
            <div className="guild-quest-card__actions">
              {quest.status === 'available' ? (
                <button type="button" onClick={() => onAction('accept', quest)} disabled={sending}>
                  领取清单
                </button>
              ) : null}
              {quest.status === 'accepted' ? (
                <button type="button" onClick={() => onAction('complete', quest)} disabled={sending}>
                  记录完成
                </button>
              ) : null}
              {quest.status === 'completed' ? (
                <span className="guild-quest-done">已记录</span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function MultiNpcRoomGuide({ characters = [], groupChatConfig = {} }) {
  const roomRules = getGroupRoomRules(groupChatConfig)
  const participants = (Array.isArray(characters) ? characters : []).filter(Boolean)
  const activeCount = participants.filter((character) => normalizeGroupTalkativeness(character.talkativeness) > 0).length

  if (participants.length <= 1) return null

  return (
    <section className="group-room-guide" aria-label="多人 NPC 房间说明">
      <div className="group-room-guide__header">
        <div>
          <span className="mini-label">多人 NPC 房间</span>
          <h4>把一句话放到桌上，NPC 轮流接住</h4>
          <p>群聊参与者会围绕你的输入回应；NPC 只回应，不替你发言、不替你决定动作。</p>
        </div>
        <div className="group-room-guide__meter" aria-label="可接话 NPC 数">
          <strong>{activeCount}/{participants.length}</strong>
          <span>可接话</span>
        </div>
      </div>

      <div className="group-room-guide__rules" aria-label="多人 NPC 房间规则">
        {roomRules.map((rule) => (
          <article key={rule.id} className={`group-room-rule-card is-${rule.id}`}>
            <span>{rule.label}</span>
            <p>{rule.text}</p>
          </article>
        ))}
      </div>

      <div className="group-room-participants" aria-label="群聊参与者">
        <div className="group-room-participants__head">
          <strong>群聊参与者</strong>
          <small>按店主设定的接话积极度展示</small>
        </div>
        <div className="group-room-participants__list">
          {participants.map((character) => (
            <div
              key={character.id || character.name}
              className={`group-room-participant ${normalizeGroupTalkativeness(character.talkativeness) <= 0 ? 'is-muted' : ''}`}
            >
              <CharacterAvatar character={character} size="small" />
              <div>
                <strong>{character.name || '未命名 NPC'}</strong>
                <span>{character.archetype || character.personality?.slice(0, 18) || '酒馆 NPC'}</span>
                <small>{getGroupParticipantTone(character)}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function getNextGuildTier(reputation) {
  return GUILD_REPUTATION_TIERS.find((tier) => tier.min > reputation) || null
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
        <div className="char-detail-section">
          <label>外观</label>
          <CharacterLookSummary character={character} showDefault showSummary />
        </div>
      </div>
    </div>
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
  const [createdMemories, setCreatedMemories] = useState([])
  const [groupSessionError, setGroupSessionError] = useState('')
  const [gameplays, setGameplays] = useState(() => (
    Array.isArray(tavern?.gameplay_definitions) ? tavern.gameplay_definitions : []
  ))
  const [gameplaySessions, setGameplaySessions] = useState([])
  const [activeGameplaySession, setActiveGameplaySession] = useState(null)
  const [gameplayScene, setGameplayScene] = useState(null)
  const [gameplayBusy, setGameplayBusy] = useState(false)
  const [gameplayError, setGameplayError] = useState('')
  const [stateCards, setStateCards] = useState([])
  const [stateCardBusy, setStateCardBusy] = useState(false)
  const [stateCardError, setStateCardError] = useState('')
  const messagesEndRef = useRef(null)
  const groupChatEnabled = Boolean(tavern?.group_chat_enabled && characters.length > 1)
  const groupChatConfig = tavern?.group_chat_config || {}
  const tavernResponseMode = getTavernResponseMode(tavern)
  const playMode = useMemo(
    () => inferTavernPlayMode(tavern || { characters }, selectedChar),
    [tavern, characters, selectedChar],
  )
  const guildEnabled = playMode.id === 'guild'
  const [guildProgress, setGuildProgress] = useState(() => loadGuildProgress(roomId, visitorId))
  const quickPrompts = playMode.prompts || []
  const miniGameTemplates = useMemo(
    () => getMiniGameTemplates({ playModeId: playMode.id, tavern, character: selectedChar }),
    [playMode.id, tavern, selectedChar],
  )
  const guildTier = useMemo(() => getGuildTier(guildProgress), [guildProgress])
  const guildQuests = useMemo(
    () => getGuildQuestBoard(tavern || {}, guildProgress),
    [tavern, guildProgress],
  )
  const activeGameplayDefinition = useMemo(() => {
    if (!activeGameplaySession?.gameplay_id) return null
    return gameplays.find((gameplay) => gameplay?.id === activeGameplaySession.gameplay_id) || null
  }, [gameplays, activeGameplaySession?.gameplay_id])

  // Auto-select first character
  useEffect(() => {
    if (characters.length > 0 && !selectedChar) {
      setSelectedChar(characters[0])
    }
  }, [characters])

  // Load chat history when character changes
  useEffect(() => {
    if (groupChatEnabled) return
    if (selectedChar && roomId) {
      loadHistory()
    }
  }, [selectedChar?.id, roomId, groupChatEnabled])

  useEffect(() => {
    if (!groupChatEnabled) return
    setGroupSessionError('')
    loadGroupHistory()
  }, [
    roomId,
    visitorId,
    groupChatEnabled,
    characters.map((character) => character.id).join('|'),
  ])

  useEffect(() => {
    setVisitorMemoryState(entryState)
  }, [entryState])

  useEffect(() => {
    setGameplays(Array.isArray(tavern?.gameplay_definitions) ? tavern.gameplay_definitions : [])
  }, [tavern?.id, tavern?.gameplay_definitions])

  useEffect(() => {
    loadGameplayState()
  }, [roomId, visitorId])

  useEffect(() => {
    loadStateCards()
  }, [roomId, visitorId])

  useEffect(() => {
    if (!guildEnabled) return
    setGuildProgress(loadGuildProgress(roomId, visitorId))
  }, [guildEnabled, roomId, visitorId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add opening message when character changes
  useEffect(() => {
    if (groupChatEnabled) return
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
  }, [selectedChar?.id, groupChatEnabled])

  // Load sprites and expressions when character changes
  useEffect(() => {
    if (!roomId || !selectedChar) return
    loadSprites()
  }, [selectedChar?.id, roomId])

  // Load voice config when roomId changes
  useEffect(() => {
    if (!roomId) return
    getVoiceConfig(roomId).then((result) => {
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
      const exprResult = await getExpressions()
      setAvailableExpressions(exprResult.expressions || [])

      // Load character sprites
      const spriteResult = await getCharacterSprites(roomId, selectedChar.id)
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
      const result = await inferExpression(text, selectedChar.name, roomId, selectedChar.id)
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

  function buildAssistantMessage({ id, content, timestamp = Date.now(), expression = DEFAULT_EXPRESSION, source = 'default', character = selectedChar }) {
    return {
      id,
      role: 'assistant',
      content,
      timestamp,
      character,
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

  function findGroupCharacter(characterId, fallbackName = '', avatar = '') {
    const found = characters.find((character) => character.id === characterId)
    if (found) return found
    if (!characterId && !fallbackName) return null
    return {
      id: characterId || `group-char-${fallbackName || 'unknown'}`,
      name: fallbackName || characterId || '群聊角色',
      avatar: avatar || '',
      sprites: {},
    }
  }

  function mapGroupHistoryMessage(message, index = 0) {
    const role = message.role === 'assistant' ? 'assistant' : (message.role === 'system' ? 'system' : 'user')
    const character = role === 'assistant'
      ? findGroupCharacter(message.character_id, message.character_name, message.avatar)
      : null
    return {
      id: message.id || `group-hist-${Date.now()}-${index}`,
      role,
      content: message.content || '',
      timestamp: normalizeChatTimestamp(message.timestamp),
      character,
      expression: message.expression || DEFAULT_EXPRESSION,
      expressionSource: message.expression_source || 'default',
    }
  }

  function mapGroupResponseMessage(response, index = 0) {
    const character = findGroupCharacter(response.character_id, response.character_name, response.avatar)
    return buildAssistantMessage({
      id: response.id || `group-${Date.now()}-${response.character_id || index}`,
      content: response.content || '...',
      timestamp: normalizeChatTimestamp(response.timestamp),
      expression: response.expression || DEFAULT_EXPRESSION,
      source: response.expression_source || 'default',
      character,
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

  async function loadGroupHistory() {
    if (!roomId) return
    setLoading(true)
    try {
      const result = await getGroupChatHistory(roomId, visitorId, visitorId, 80)
      const historyMessages = Array.isArray(result.messages) ? result.messages : []
      setMessages(historyMessages.map(mapGroupHistoryMessage))
      setGroupSessionError('')
    } catch (err) {
      console.error('Load group history error:', err)
      setMessages([])
      setGroupSessionError(`群聊历史加载失败：${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory() {
    if (!roomId || !selectedChar) return
    setLoading(true)
    try {
      const result = await getTavernChatHistory(roomId, visitorId, selectedChar.id)
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

  async function loadGameplayState() {
    if (!roomId || !visitorId) {
      setGameplays([])
      setGameplaySessions([])
      setActiveGameplaySession(null)
      setGameplayScene(null)
      return
    }
    setGameplayError('')
    try {
      const [gameplayResult, sessionResult] = await Promise.all([
        getGameplays(roomId, visitorId),
        listGameplaySessions(roomId, { state: 'active' }, visitorId),
      ])
      const nextGameplays = Array.isArray(gameplayResult?.gameplays) ? gameplayResult.gameplays : []
      const nextSessions = Array.isArray(sessionResult?.sessions) ? sessionResult.sessions : []
      setGameplays(nextGameplays)
      setGameplaySessions(nextSessions)
      setActiveGameplaySession((current) => {
        if (current && nextSessions.some((session) => session.id === current.id)) return current
        return nextSessions[0] || null
      })
    } catch (err) {
      setGameplayError(`玩法读取失败：${err.message}`)
    }
  }

  async function loadStateCards() {
    if (!roomId || !visitorId) {
      setStateCards([])
      setStateCardError('')
      return
    }
    try {
      const result = await listStateCards(
        roomId,
        { status: 'pending', visitor_id: visitorId },
        visitorId,
      )
      setStateCards(Array.isArray(result?.state_cards) ? result.state_cards : [])
      setStateCardError('')
    } catch (err) {
      setStateCardError(`状态卡读取失败：${err.message}`)
    }
  }

  async function handleStateCardDecision(card, status) {
    if (!roomId || !card?.id || stateCardBusy) return
    setStateCardBusy(true)
    setStateCardError('')
    try {
      const note = status === 'confirmed' ? '访客确认加入连续性正史。' : '访客忽略本次候选变化。'
      const result = await decideStateCard(roomId, card.id, { status, note }, visitorId)
      setStateCards((prev) => (
        status === 'confirmed' || status === 'rejected' || status === 'superseded'
          ? prev.filter((item) => item.id !== card.id)
          : mergeStateCards(prev, [result?.state_card])
      ))
    } catch (err) {
      setStateCardError(`状态卡更新失败：${err.message}`)
    } finally {
      setStateCardBusy(false)
    }
  }

  function applyGameplayResult(result) {
    if (result?.session) {
      setActiveGameplaySession(result.session)
      setGameplaySessions((prev) => {
        const without = prev.filter((session) => session.id !== result.session.id)
        return result.session.state === 'completed' || result.session.state === 'abandoned'
          ? without
          : [result.session, ...without]
      })
    }
    setGameplayScene(result?.scene || null)
  }

  async function handleGameplayStart(gameplay) {
    if (!roomId || !gameplay?.id || gameplayBusy) return
    setGameplayBusy(true)
    setGameplayError('')
    try {
      const characterId = selectedChar?.id || characters[0]?.id || ''
      const result = await startGameplaySession(
        roomId,
        { definition_id: gameplay.id },
        visitorId,
      )
      applyGameplayResult(result)
    } catch (err) {
      setGameplayError(`玩法开始失败：${err.message}`)
    } finally {
      setGameplayBusy(false)
    }
  }

  async function handleGameplayResume(session) {
    if (!roomId || !session?.gameplay_id || gameplayBusy) return
    setGameplayBusy(true)
    setGameplayError('')
    try {
      const result = await startGameplaySession(
        roomId,
        { definition_id: session.gameplay_id },
        visitorId,
      )
      applyGameplayResult(result)
    } catch (err) {
      setGameplayError(`玩法恢复失败：${err.message}`)
      setActiveGameplaySession(session)
    } finally {
      setGameplayBusy(false)
    }
  }

  async function handleGameplayAdvance(data = {}) {
    if (!roomId || !activeGameplaySession?.id || gameplayBusy) return
    setGameplayBusy(true)
    setGameplayError('')
    try {
      const result = await advanceGameplaySession(roomId, activeGameplaySession.id, data, visitorId)
      applyGameplayResult(result)
    } catch (err) {
      setGameplayError(`玩法推进失败：${err.message}`)
    } finally {
      setGameplayBusy(false)
    }
  }

  async function handleGameplayAbandon() {
    if (!roomId || !activeGameplaySession?.id || gameplayBusy) return
    setGameplayBusy(true)
    setGameplayError('')
    try {
      const result = await abandonGameplaySession(roomId, activeGameplaySession.id, visitorId)
      applyGameplayResult(result)
      setGameplayScene(null)
      await loadGameplayState()
    } catch (err) {
      setGameplayError(`玩法放弃失败：${err.message}`)
    } finally {
      setGameplayBusy(false)
    }
  }

  async function handleSend(text, options = {}) {
    const promptText = String(text || '').trim()
    const displayText = String(options.displayText || promptText).trim()
    if (!promptText || sending || !selectedChar) return

    if (groupChatEnabled) {
      await handleGroupSend(promptText, { displayText })
      return
    }

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: displayText,
      timestamp: Date.now(),
      character: null,
    }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)

    try {
      const result = await sendTavernChat(
        roomId,
        {
          character_id: selectedChar.id,
          message: promptText,
          visitor_id: visitorId,
          visitor_name: visitorNickname,
          visitor_gender: visitorMemoryState?.gender || entryState?.gender || 'unspecified',
        },
      )
      const responseText = result.response || '...'
      const replyId = `msg-${Date.now()}-r`
      const isDegraded = Boolean(result.degraded)
      const nextExpression = isDegraded ? DEFAULT_EXPRESSION : currentExpression
      const nextExpressionSource = isDegraded ? 'fallback' : expressionSource
      if (result.visitor_state) {
        setVisitorMemoryState(result.visitor_state)
      }
      if (result.created_memories && result.created_memories.length > 0) {
        setCreatedMemories(result.created_memories)
      }
      if (Array.isArray(result.state_card_candidates) && result.state_card_candidates.length > 0) {
        setStateCards((prev) => mergeStateCards(prev, result.state_card_candidates))
        setStateCardError('')
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

  async function handleGroupSend(text, options = {}) {
    const cleanText = text.trim()
    if (!cleanText || sending || characters.length === 0) return
    const displayText = String(options.displayText || cleanText).trim()

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: displayText,
      timestamp: Date.now(),
      character: null,
    }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)

    try {
      const result = await sendGroupChat(roomId, {
        message: cleanText,
        visitor_id: visitorId,
        visitor_name: visitorNickname,
        visitor_gender: visitorMemoryState?.gender || entryState?.gender || 'unspecified',
        display_message: displayText !== cleanText ? displayText : undefined,
      })
      const replyMessages = Array.isArray(result.messages)
        ? result.messages.map(mapGroupResponseMessage)
        : []

      if (result.visitor_state) {
        setVisitorMemoryState(result.visitor_state)
      }
      if (result.created_memories && result.created_memories.length > 0) {
        setCreatedMemories(result.created_memories)
      }
      if (Array.isArray(result.state_card_candidates) && result.state_card_candidates.length > 0) {
        setStateCards((prev) => mergeStateCards(prev, result.state_card_candidates))
        setStateCardError('')
      }

      if (result.degraded) {
        setGroupSessionError(result.error || '群聊角色暂时没有回应。')
      } else {
        setGroupSessionError('')
      }

      if (replyMessages.length === 0) {
        setMessages((prev) => [...prev, {
          id: `group-empty-${Date.now()}`,
          role: 'system',
          content: result.error || '群聊里暂时没有角色接话。',
          timestamp: Date.now(),
        }])
        return
      }

      setMessages((prev) => [...prev, ...replyMessages])
      setDegradationNotice(null)
    } catch (err) {
      console.error('Group send error:', err)
      setGroupSessionError(`群聊发送失败：${err.message}`)
      setMessages((prev) => [...prev, {
        id: `group-error-${Date.now()}`,
        role: 'system',
        content: `群聊发送失败：${err.message}`,
        timestamp: Date.now(),
      }])
    } finally {
      setSending(false)
    }
  }

  function commitGuildProgress(nextProgress) {
    const savedProgress = saveGuildProgress(roomId, visitorId, nextProgress)
    setGuildProgress(savedProgress)
    return savedProgress
  }

  function handleGuildAction(action, quest = null) {
    if (!guildEnabled || sending) return

    if (action === 'status' || action === 'post') {
      handleSend(buildGuildActionPrompt(action, null, guildTier))
      return
    }

    const nextProgress = updateGuildProgress(guildProgress, {
      type: action,
      questId: quest?.id,
      quest,
    })
    const savedProgress = commitGuildProgress(nextProgress)
    const nextTier = getGuildTier(savedProgress)
    handleSend(buildGuildActionPrompt(action, quest, nextTier))
  }

  function handleMiniGameStart(template) {
    if (!selectedChar || sending) return
    const prompt = buildMiniGameStartPrompt(template, {
      tavernName: roomName,
      characterName: selectedChar.name,
      playModeLabel: playMode.label,
    })
    if (prompt) {
      handleSend(prompt, {
        displayText: `抽一张《${template.title}》玩法卡。`,
      })
    }
  }

  function handleSelectChar(char) {
    if (char.id === selectedChar?.id) return
    setSelectedChar(char)
    resetExpressionForCharacter(char)
    if (onCharacterSwitch) {
      onCharacterSwitch(char)
    }
    if (groupChatEnabled) return
    setMessages([])
  }

  function handleAvatarClick(char) {
    setSelectedChar(char)
    setShowDetail(true)
  }

  async function handlePlayTTS(tavernId, text) {
    if (!text || !tavernId) return
    try {
      const audioUrl = await synthesizeVoice(tavernId, { text })
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
          {groupChatEnabled ? (
            <span className="char-badge is-group">群聊模式</span>
          ) : null}
          <span className={`char-badge ${tavernResponseMode.className}`} title={tavernResponseMode.title}>
            {tavernResponseMode.label}
          </span>
          <button
            type="button"
            className={`btn-context-panel ${contextPanelOpen ? 'active' : ''}`}
            onClick={() => {
              setContextPanelOpen((open) => !open)
              setMemoryPanelOpen(false)
            }}
            title="上下文面板"
          >
            📋 上下文
          </button>
          <button
            type="button"
            className={`btn-memory-panel ${memoryPanelOpen ? 'active' : ''}`}
            onClick={() => {
              setMemoryPanelOpen((open) => !open)
              setContextPanelOpen(false)
            }}
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
                  <div className="char-bar-name">{groupChatEnabled ? '多人群聊' : selectedChar.name}</div>
                  <div className="char-bar-archetype muted">
                    {groupChatEnabled
                      ? `${characters.length} 个角色会按${getGroupStrategyLabel(groupChatConfig.strategy)}接话`
                      : selectedChar.personality?.slice(0, 30) || selectedChar.archetype || ''}
                  </div>
                </div>
                <div className="chat-play-mode-pill" title={playMode.summary}>
                  <span>{playMode.icon}</span>
                  <strong>{playMode.label}</strong>
                </div>
                {groupChatEnabled ? (
                  <div className="expression-state" aria-live="polite">
                    <span>{getGroupStrategyLabel(groupChatConfig.strategy)}</span>
                    <small>{getGroupResponseCapLabel(groupChatConfig.max_responses_per_turn)}</small>
                  </div>
                ) : (
                  <>
                    <div className="expression-state" aria-live="polite">
                      <span>{expressionBusy ? '识别中...' : getExpressionLabel(currentExpression)}</span>
                      <small>{getExpressionSourceLabel(expressionSource)}</small>
                    </div>
                    <ExpressionSelector
                      sprites={sprites}
                      availableExpressions={availableExpressions}
                      currentExpression={currentExpression}
                      onChange={handleExpressionChange}
                    />
                  </>
                )}
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

              {groupSessionError ? (
                <div className="chat-degradation-banner" role="status" aria-live="polite">
                  <strong>群聊会话暂时不可用</strong>
                  <span>{groupSessionError}</span>
                </div>
              ) : null}

              {groupChatEnabled ? (
                <MultiNpcRoomGuide
                  characters={characters}
                  groupChatConfig={groupChatConfig}
                />
              ) : null}

              <GuildQuestPanel
                enabled={guildEnabled}
                progress={guildProgress}
                quests={guildQuests}
                tier={guildTier}
                sending={sending}
                onAction={handleGuildAction}
              />

              {gameplayError ? (
                <div className="chat-degradation-banner" role="status" aria-live="polite">
                  <strong>玩法暂时不可用</strong>
                  <span>{gameplayError}</span>
                </div>
              ) : null}

              <StateCardReviewPanel
                cards={stateCards}
                busy={stateCardBusy}
                error={stateCardError}
                onDecision={handleStateCardDecision}
              />

              <TavernGameplayLauncher
                gameplays={gameplays}
                activeSessions={gameplaySessions}
                busy={gameplayBusy}
                onStart={handleGameplayStart}
                onResume={handleGameplayResume}
              />

              <GameplaySessionPanel
                session={activeGameplaySession}
                scene={gameplayScene}
                gameplay={activeGameplayDefinition}
                busy={gameplayBusy}
                onChoice={(choice) => handleGameplayAdvance({ choiceId: choice.id })}
                onSubmit={(message) => handleGameplayAdvance({ message })}
                onAbandon={handleGameplayAbandon}
              />

              {/* Messages */}
              <div className="chat-messages-area">
                {loading && (
                  <div className="chat-loading">
                    <span>加载对话历史...</span>
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div className="chat-empty">
                    <div className="chat-empty__hero">
                      <div className="empty-char-avatar">
                        <CharacterAvatar
                          character={selectedChar}
                          size="large"
                          expression={currentExpression}
                          spritesOverride={sprites}
                        />
                      </div>
                      <div className="chat-empty__copy">
                        <span className="mini-label">桌灯亮着</span>
                        <h4>{groupChatEnabled ? '群聊桌已经留好位置' : `今晚从 ${selectedChar.name} 这桌开始`}</h4>
                        <p>
                          {groupChatEnabled
                            ? '先把一句话放到桌上，角色们会自然接过去。'
                            : '打个招呼，或从下方抽一张玩法卡。'}
                        </p>
                      </div>
                    </div>
                    {groupChatEnabled ? (
                      <div className="first-mes-quote">
                        <span className="quote-label">桌边声音</span>
                        <span className="quote-text">桌面还空着，等你放下一句。</span>
                      </div>
                    ) : selectedChar.first_mes && (
                      <div className="first-mes-quote">
                        <span className="quote-label">{selectedChar.name} 说</span>
                        <span className="quote-text">{selectedChar.first_mes}</span>
                      </div>
                    )}
                    <div className="chat-start-strip" aria-label="可选开局氛围">
                      <span>{playMode.icon} {playMode.label}</span>
                      <span>闲聊一会儿</span>
                      <span>抽一张玩法卡</span>
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    character={msg.character || selectedChar}
                    sprites={msg.character?.sprites || sprites}
                    visitorNickname={visitorNickname}
                    voiceConfig={voiceConfig}
                    tavernId={roomId}
                    onPlayTTS={handlePlayTTS}
                  />
                ))}
                {sending && (
                  <div className="chat-typing-indicator" aria-live="polite" aria-label="AI 正在输入">
                    <div className="typing-indicator">
                      <span className="typing-indicator__dot" />
                      <span className="typing-indicator__dot" />
                      <span className="typing-indicator__dot" />
                    </div>
                    <span className="typing-indicator__label">AI 正在思考...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <TavernMiniGamePanel
                templates={miniGameTemplates}
                sending={sending}
                disabled={!selectedChar}
                onStart={handleMiniGameStart}
              />
              <ChatInputArea
                onSend={handleSend}
                sending={sending}
                character={selectedChar}
                placeholder={groupChatEnabled ? '对群聊里的所有角色说...' : undefined}
                voiceConfig={voiceConfig}
                tavernId={roomId}
                quickPrompts={quickPrompts}
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
            tavernId={roomId}
            visitorId={visitorId}
            createdMemories={createdMemories}
            onClose={() => setMemoryPanelOpen(false)}
          />
        )}

        {contextPanelOpen && (
          <TavernContextPanel
            tavern={tavern}
            selectedChar={selectedChar}
            entryState={visitorMemoryState}
            messages={messages}
            visitorId={visitorId}
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
