/**
 * FableMap Chat Panel — 聊天气泡 UI
 *
 * 最小可玩原型的核心：展示角色、发送消息、显示对话历史
 */

import { useState, useRef, useEffect } from 'react'
import { formatTagLabel } from './services/appDisplay'
import { getRelationshipColor, getRelationshipStageLabel } from './services/placeProtocol'

/**
 * 单条消息组件
 * @param {Object} message
 * @param {string} message.id
 * @param {string} message.role - 'player' | 'character'
 * @param {string} message.content
 * @param {number} message.timestamp
 */
function ChatBubble({ message, characterName }) {
  const isPlayer = message.role === 'player'

  return (
    <div className={`chat-bubble chat-bubble--${message.role}`}>
      {!isPlayer && characterName && (
        <span className="chat-bubble__sender">{characterName}</span>
      )}
      <div className="chat-bubble__content">
        {message.content}
      </div>
      <span className="chat-bubble__time">
        {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

/**
 * 角色信息头部
 * @param {Object} character
 */
function CharacterHeader({ character }) {
  if (!character) return null

  return (
    <div className="chat-character-header">
      <div className="chat-character-header__info">
        <strong className="chat-character-header__name">{character.name}</strong>
        <span className="chat-character-header__archetype muted">
          {formatTagLabel(character.archetype, '未知角色')}
        </span>
      </div>
      {character.faction_name && (
        <span className="chat-character-header__faction faction-tag">
          {character.faction_name}
        </span>
      )}
      {character.relationship && (
        <div className="chat-character-header__relationship">
          <span
            className="chat-relationship-badge"
            style={{ color: getRelationshipColor(character.relationship.strength) }}
          >
            {getRelationshipStageLabel(character.relationship.stage)}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * 聊天输入框
 * @param {Function} onSend - 发送消息回调
 * @param {boolean} disabled - 是否禁用
 */
function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        className="chat-input__field"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={disabled ? '等待角色...' : '输入你想说的话...'}
        disabled={disabled}
      />
      <button
        type="submit"
        className="chat-input__send"
        disabled={disabled || !input.trim()}
      >
        发送
      </button>
    </form>
  )
}

/**
 * 主聊天面板组件
 * @param {Object} props
 * @param {Object} props.character - 当前角色（来自 characterEngine）
 * @param {Array} props.messages - 消息历史 [{id, role, content, timestamp}]
 * @param {Function} props.onSendMessage - 发送消息回调
 * @param {boolean} props.sending - 是否正在发送
 */
export default function ChatPanel({
  character,
  messages = [],
  onSendMessage,
  sending = false,
}) {
  const messagesEndRef = useRef(null)

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!character) {
    return (
      <div className="chat-panel chat-panel--empty">
        <div className="chat-empty-state">
          <span className="chat-empty-state__icon">💬</span>
          <p>选择一个地点，和这里的角色展开对话</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-panel">
      <CharacterHeader character={character} />

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-messages__empty">
            <p>你和 {character.name} 的对话即将开始...</p>
            <p className="muted small">发送消息，开始你们的第一次遭遇</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              characterName={character.name}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={onSendMessage}
        disabled={sending}
      />
    </div>
  )
}