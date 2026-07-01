import { useEffect, useMemo, useState } from 'react'
import { getGroupChatConfig, saveGroupChatConfig } from '../lib/spaces'
import CharacterAvatar from './CharacterAvatar'
import CharacterLookSummary from './CharacterLookSummary'

const GROUP_STRATEGIES = [
  {
    id: 'balanced',
    label: '均衡轮换',
    helper: '兼顾发言积极度和最近谁说过话。',
  },
  {
    id: 'weighted_random',
    label: '按积极度抽取',
    helper: '越主动的角色越容易接话。',
  },
  {
    id: 'round_robin',
    label: '固定轮流',
    helper: '角色按顺序依次发言。',
  },
  {
    id: 'relevance',
    label: '减少重复发言',
    helper: '优先让近期较少说话的人开口。',
  },
]

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function normalizeTalkativeness(value) {
  return clampNumber(value, 0, 1, 0.5)
}

function normalizeBool(value, fallback = false) {
  if (value == null || value === '') return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return Boolean(value)
}

function normalizeGroupConfig(value = {}) {
  const strategyIds = new Set(GROUP_STRATEGIES.map((item) => item.id))
  const strategy = strategyIds.has(value.strategy) ? value.strategy : 'balanced'
  return {
    strategy,
    max_responses_per_turn: Math.round(clampNumber(value.max_responses_per_turn, 1, 3, 2)),
    response_cooldown_seconds: Math.round(clampNumber(value.response_cooldown_seconds, 0, 30, 0)),
    require_name_prefix: normalizeBool(value.require_name_prefix, true),
  }
}

function normalizeCharacter(character = {}) {
  return {
    ...character,
    talkativeness: normalizeTalkativeness(character.talkativeness),
  }
}

function mergeConfigCharacters(currentCharacters = [], configCharacters = []) {
  const byId = new Map(
    configCharacters
      .filter((character) => character?.id)
      .map((character) => [character.id, character]),
  )
  const seen = new Set()
  const merged = currentCharacters.map((character) => {
    const remote = byId.get(character?.id)
    if (character?.id) seen.add(character.id)
    return normalizeCharacter({
      ...character,
      talkativeness: remote?.talkativeness ?? character?.talkativeness,
      avatar: remote?.avatar || character?.avatar || '',
    })
  })

  configCharacters.forEach((character) => {
    if (character?.id && !seen.has(character.id)) {
      merged.push(normalizeCharacter(character))
    }
  })
  return merged
}

export default function SpaceGroupSettingsModal({
  space,
  ownerId = '',
  onClose,
  onSaved,
}) {
  const [enabled, setEnabled] = useState(normalizeBool(space?.group_chat_enabled))
  const [config, setConfig] = useState(() => normalizeGroupConfig(space?.group_chat_config || {}))
  const [characters, setCharacters] = useState(() => (space?.characters || []).map(normalizeCharacter))
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const averageTalkativeness = useMemo(() => {
    if (!characters.length) return 0
    const total = characters.reduce((sum, character) => sum + normalizeTalkativeness(character.talkativeness), 0)
    return total / characters.length
  }, [characters])

  const enabledCharacterCount = characters.filter((character) => normalizeTalkativeness(character.talkativeness) > 0).length
  const canEnable = characters.length >= 2 && enabledCharacterCount >= 1
  const isBusy = saving || loadingConfig

  useEffect(() => {
    if (!space?.id) return undefined
    let cancelled = false

    async function loadConfig() {
      setLoadingConfig(true)
      setError('')
      try {
        const payload = await getGroupChatConfig(space.id, ownerId)
        if (cancelled) return
        setEnabled(normalizeBool(payload?.group_chat_enabled))
        setConfig(normalizeGroupConfig(payload?.group_chat_config || {}))
        setCharacters((prev) => mergeConfigCharacters(prev, Array.isArray(payload?.characters) ? payload.characters : []))
      } catch (err) {
        if (!cancelled) {
          setError(`读取群聊配置失败：${err.message}`)
        }
      } finally {
        if (!cancelled) setLoadingConfig(false)
      }
    }

    loadConfig()
    return () => {
      cancelled = true
    }
  }, [ownerId, space?.id])

  function updateConfig(key, value) {
    setNotice('')
    setConfig((prev) => normalizeGroupConfig({ ...prev, [key]: value }))
  }

  function updateCharacterTalkativeness(characterId, value) {
    setNotice('')
    setCharacters((prev) => prev.map((character) => (
      character.id === characterId
        ? { ...character, talkativeness: normalizeTalkativeness(value) }
        : character
    )))
  }

  async function handleSave() {
    if (enabled && !canEnable) {
      setError('群聊至少需要 2 个角色，并且至少 1 个角色愿意接话。')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      const normalizedConfig = normalizeGroupConfig(config)
      const characterTalkativeness = characters.reduce((acc, character) => {
        if (character?.id) acc[character.id] = normalizeTalkativeness(character.talkativeness)
        return acc
      }, {})
      const payload = {
        group_chat_enabled: enabled,
        group_chat_config: normalizedConfig,
        character_talkativeness: characterTalkativeness,
      }
      const result = await saveGroupChatConfig(space.id, payload, ownerId)
      const resultCharacters = Array.isArray(result?.characters) ? result.characters : characters
      const mergedCharacters = mergeConfigCharacters(space?.characters || characters, resultCharacters)
      const updated = {
        ...space,
        group_chat_enabled: normalizeBool(result?.group_chat_enabled, enabled),
        group_chat_config: normalizeGroupConfig(result?.group_chat_config || normalizedConfig),
        characters: mergedCharacters,
      }
      setEnabled(updated.group_chat_enabled)
      setConfig(updated.group_chat_config)
      setCharacters(mergeConfigCharacters(characters, resultCharacters))
      setNotice('群聊设置已保存，访客侧群聊入口会立即读取新配置。')
      onSaved?.(updated)
    } catch (err) {
      setError(`保存失败：${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay group-settings-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content panel group-settings-modal">
        <header className="modal-header">
          <div>
            <p className="mini-label">群聊设置</p>
            <h3>{space?.name || '空间'} 的多人对话</h3>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>&times;</button>
        </header>

        <div className="group-settings-summary">
          <article>
            <span className="mini-label">角色数</span>
            <strong>{characters.length}</strong>
            <p>{characters.length >= 2 ? '可以开启多人对话。' : '至少再添加一个角色。'}</p>
          </article>
          <article>
            <span className="mini-label">平均积极度</span>
            <strong>{Math.round(averageTalkativeness * 100)}%</strong>
            <p>{enabledCharacterCount} 个角色会主动接话。</p>
          </article>
          <article>
            <span className="mini-label">每轮回应</span>
            <strong>{config.max_responses_per_turn}</strong>
            <p>访客发言后最多有几位角色回应。</p>
          </article>
        </div>

        <section className="group-settings-section">
          <label className="group-settings-toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                setNotice('')
                setEnabled(event.target.checked)
              }}
              disabled={isBusy}
            />
            <span>
              <strong>启用群聊模式</strong>
              <small>访客进入后可以让多个角色按策略轮流回应。</small>
            </span>
          </label>
          {!canEnable ? (
            <div className="group-settings-warning">当前空间角色不足，群聊保存时会保持关闭或提示补角色。</div>
          ) : null}
          {loadingConfig ? (
            <div className="group-settings-notice">正在读取最新群聊配置...</div>
          ) : null}
          {notice ? (
            <div className="group-settings-notice is-ok">{notice}</div>
          ) : null}
        </section>

        <section className="group-settings-section">
          <div className="group-settings-section__heading">
            <strong>回应策略</strong>
            <span>先保存经营配置，之后聊天入口会读取这里的开关和默认参数。</span>
          </div>
          <div className="group-strategy-grid">
            {GROUP_STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                type="button"
                className={config.strategy === strategy.id ? 'is-active' : ''}
                onClick={() => updateConfig('strategy', strategy.id)}
                disabled={isBusy}
              >
                <strong>{strategy.label}</strong>
                <small>{strategy.helper}</small>
              </button>
            ))}
          </div>
          <div className="group-settings-controls">
            <label>
              <span>每轮最多回应</span>
              <input
                type="range"
                min="1"
                max="3"
                step="1"
                value={config.max_responses_per_turn}
                onChange={(event) => updateConfig('max_responses_per_turn', event.target.value)}
                disabled={isBusy}
              />
              <small>{config.max_responses_per_turn} 位角色</small>
            </label>
            <label>
              <span>回应间隔</span>
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                value={config.response_cooldown_seconds}
                onChange={(event) => updateConfig('response_cooldown_seconds', event.target.value)}
                disabled={isBusy}
              />
              <small>{config.response_cooldown_seconds} 秒</small>
            </label>
            <label className="group-settings-prefix">
              <input
                type="checkbox"
                checked={config.require_name_prefix}
                onChange={(event) => updateConfig('require_name_prefix', event.target.checked)}
                disabled={isBusy}
              />
              <span>回复里保留角色名提示</span>
            </label>
          </div>
        </section>

        <section className="group-settings-section">
          <div className="group-settings-section__heading">
            <strong>角色接话积极度</strong>
            <span>这些数值会同步保存到角色卡，可在角色编辑器继续微调。</span>
          </div>
          <div className="group-character-list">
            {characters.length === 0 ? (
              <p className="group-settings-empty">还没有角色。请先在“角色”管理中添加至少 2 位 NPC，再开启群聊。</p>
            ) : characters.map((character) => {
              const talkativeness = normalizeTalkativeness(character.talkativeness)
              return (
                <article key={character.id || character.name} className="group-character-row">
                  <CharacterAvatar character={character} size="small" />
                  <div className="group-character-row__main">
                    <div className="group-character-row__header">
                      <strong>{character.name || '未命名角色'}</strong>
                      <span>{Math.round(talkativeness * 100)}%</span>
                    </div>
                    <CharacterLookSummary character={character} compact />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={talkativeness}
                      onChange={(event) => updateCharacterTalkativeness(character.id, event.target.value)}
                      disabled={isBusy}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {error ? <div className="group-settings-error">{error}</div> : null}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={saving}>取消</button>
          <button type="button" className="primary" onClick={handleSave} disabled={isBusy}>
            {saving ? '保存中...' : loadingConfig ? '读取中...' : '保存群聊设置'}
          </button>
        </div>
      </div>
    </div>
  )
}
