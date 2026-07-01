import { useEffect, useState } from 'react'
import { AffinityBadge } from '../components/AffinityBadge'
import { AffinityProgress } from '../components/AffinityProgress'
import { getAffinityStageMeta } from '../lib/affinity.js'
import { getHobbyIcon, getHobbyCategory } from '../lib/character-hobbies.js'
import {
  deleteMemoryAtom,
  listMemoryAtoms,
  togglePinMemory,
  updateMemoryAtom,
  listStateCards,
} from '../lib/spaces'

function TabButton({ id, label, active, onClick }) {
  return (
    <button
      type="button"
      className={`ctx-tab-btn ${active ? 'active' : ''}`}
      onClick={() => onClick(id)}
      title={label}
    >
      {label}
    </button>
  )
}

function CharacterInfoTab({ character, space }) {
  if (!character) {
    return (
      <div className="ctx-empty">
        <p>选择一个角色</p>
      </div>
    )
  }

  return (
    <div className="ctx-section">
      <div className="ctx-card">
        <div className="ctx-card-avatar">
          {character.avatar || character.image_url ? (
            <img src={character.avatar || character.image_url} alt={character.name} />
          ) : (
            <div className="ctx-avatar-placeholder">{character.name?.[0] || '?'}</div>
          )}
        </div>
        <div className="ctx-card-info">
          <strong>{character.name}</strong>
          <span className="muted">{character.personality?.slice(0, 40) || character.archetype || '无设定'}</span>
        </div>
      </div>

      {character.description && (
        <div className="ctx-field">
          <span className="mini-label">角色描述</span>
          <p>{character.description}</p>
        </div>
      )}

      {character.personality && (
        <div className="ctx-field">
          <span className="mini-label">性格设定</span>
          <p>{character.personality}</p>
        </div>
      )}

      {character.tags?.length > 0 && (
        <div className="ctx-field">
          <span className="mini-label">标签</span>
          <div className="tag-list">
            {character.tags.map((tag, i) => (
              <span key={i} className="tag-chip">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {character.hobbies?.length > 0 && (
        <div className="ctx-field">
          <span className="mini-label">兴趣与爱好</span>
          <div className="hobby-list">
            {character.hobbies.map((hobby, i) => (
              <span key={i} className={`hobby-tag hobby-tag--${getHobbyCategory(hobby).id}`}>
                {getHobbyIcon(hobby)} {hobby}
              </span>
            ))}
          </div>
        </div>
      )}

      {space?.scene_prompt && (
        <div className="ctx-field">
          <span className="mini-label">场景氛围</span>
          <p>{space.scene_prompt}</p>
        </div>
      )}
    </div>
  )
}

function SpaceInfoTab({ space }) {
  if (!space) {
    return (
      <div className="ctx-empty">
        <p>没有空间信息</p>
      </div>
    )
  }

  const activeSkills = (space.skill_packs || []).filter(p => p.enabled)

  return (
    <div className="ctx-section">
      <div className="ctx-space-header">
        <div className="ctx-space-title">
          <strong>{space.name}</strong>
          <span className={`space-status-badge status-${space.status || 'closed'}`}>
            {space.status === 'open' ? '营业中' : '歇业'}
          </span>
        </div>
        <div className="ctx-badges">
          {space.special_type === 'cultivation' && <span className="badge badge--cultivation">🧘 修行空间</span>}
          {space.special_type === 'divination' && <span className="badge badge--divination">🔮 占卜空间</span>}
        </div>
      </div>

      {space.description && (
        <div className="ctx-field">
          <span className="mini-label">简介</span>
          <p>{space.description}</p>
        </div>
      )}

      {activeSkills.length > 0 && (
        <div className="ctx-field">
          <span className="mini-label">空间特质 / 技能</span>
          <div className="ctx-skill-chips">
            {activeSkills.map(skill => (
              <span key={skill.id} className="ctx-skill-chip" title={skill.id}>
                ✨ {skill.id === 'local-rumor' ? '环境传闻' : 
                    skill.id === 'neighborhood-knowledge' ? '邻里知识' : 
                    skill.id === 'territory-awareness' ? '领地感知' : skill.id}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="ctx-field">
        <span className="mini-label">位置</span>
        <p className="muted">
          {space.lat != null && space.lon != null
            ? `${Number(space.lat).toFixed(4)}, ${Number(space.lon).toFixed(4)}`
            : '未设置坐标'}
        </p>
      </div>

      <div className="ctx-field">
        <span className="mini-label">访问权限</span>
        <p>{space.access === 'public' ? '公开' : space.access === 'password' ? '密码入场' : '私人'}</p>
      </div>
    </div>
  )
}

function WorldBookTab({ space }) {
  const worldInfo = space?.world_info || []

  if (worldInfo.length === 0) {
    return (
      <div className="ctx-empty">
        <p>还没有世界书条目。</p>
        <p className="muted">店主可以在世界书编辑器里添加背景设定。</p>
      </div>
    )
  }

  return (
    <div className="ctx-section">
      <span className="mini-label">共 {worldInfo.length} 条设定</span>
      <div className="ctx-worldbook-list">
        {worldInfo.map((entry, i) => (
          <div key={entry.id || i} className={`ctx-wb-entry ${entry.disable ? 'is-disabled' : ''} ${entry.constant ? 'is-constant' : ''}`}>
            <div className="ctx-wb-title">
              <strong>{entry.constant ? '常驻' : entry.keys?.[0] || '未命名'}</strong>
              {entry.disable && <span className="badge badge-danger">暂停</span>}
            </div>
            {entry.content && (
              <p className="ctx-wb-content">{entry.content.slice(0, 80)}{entry.content.length > 80 ? '...' : ''}</p>
            )}
            {entry.keys?.length > 0 && !entry.constant && (
              <div className="ctx-wb-keys">
                {entry.keys.map((k, ki) => (
                  <span key={ki} className="tag-chip">{k}</span>
                ))}
              </div>
            )}
            <small className="muted">
              顺序 {entry.insertion_order ?? entry.order ?? 100} · 深度 {entry.depth ?? 4} · 概率 {entry.probability ?? 100}%
            </small>
          </div>
        ))}
      </div>
    </div>
  )
}

function MemoryTab({ entryState, messages, visitorNickname, roomName, selectedChar, spaceId, visitorId }) {
  const visitorState = entryState?.visitor_state || entryState || {}
  const relationship = visitorState.relationship || {}
  const [memoryAtoms, setMemoryAtoms] = useState([])
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [memoryError, setMemoryError] = useState('')
  const [busyMemoryId, setBusyMemoryId] = useState('')

  const visitCount = Number(visitorState.visit_count ?? 0)
  const stage = relationship.stage || visitorState.relationship_stage || ''
  const strength = Number(relationship.strength ?? visitorState.relationship_strength ?? 0)
  const firstVisit = visitorState.first_visit || ''
  const lastVisit = visitorState.last_visit || ''
  const stageMeta = getAffinityStageMeta(stage, strength)

  const userMessages = messages.filter(m => m.role === 'user')
  const recentUser = [...userMessages].reverse().find(m => m.content)
  const recentAssistant = [...messages].reverse().find(m => m.role === 'assistant')

  const dimensionLabels = {
    fact: '事实',
    emotion: '情绪',
    event: '事件',
    preference: '偏好',
    promise: '承诺',
  }
  const horizonLabels = {
    short: '短期',
    mid: '中期',
    long: '长期',
  }

  async function loadStructuredMemories({ silent = false } = {}) {
    if (!spaceId || !visitorId) {
      setMemoryAtoms([])
      return
    }
    if (!silent) setMemoryLoading(true)
    setMemoryError('')
    try {
      const result = await listMemoryAtoms(
        spaceId,
        {
          visitor_id: visitorId,
          limit: 24,
        },
        visitorId,
      )
      setMemoryAtoms(result.memory_atoms || result.memories || [])
    } catch (err) {
      setMemoryError(err.message || '记忆读取失败')
    } finally {
      if (!silent) setMemoryLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!spaceId || !visitorId) {
        setMemoryAtoms([])
        return
      }
      setMemoryLoading(true)
      setMemoryError('')
      try {
        const result = await listMemoryAtoms(
          spaceId,
          {
            visitor_id: visitorId,
            limit: 24,
          },
          visitorId,
        )
        if (!cancelled) setMemoryAtoms(result.memory_atoms || result.memories || [])
      } catch (err) {
        if (!cancelled) setMemoryError(err.message || '记忆读取失败')
      } finally {
        if (!cancelled) setMemoryLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [spaceId, visitorId, messages.length])

  async function updateMemoryAtom(atom, updateFn) {
    if (!spaceId || !visitorId || !atom?.id) return
    setBusyMemoryId(atom.id)
    setMemoryError('')
    try {
      const result = await updateFn()
      const updated = result.memory_atom
      if (updated) {
        setMemoryAtoms((prev) => prev.map((item) => (item.id === atom.id ? updated : item)))
      }
    } catch (err) {
      setMemoryError(err.message || '记忆更新失败')
    } finally {
      setBusyMemoryId('')
    }
  }

  function handleTogglePin(atom) {
    updateMemoryAtom(atom, () => togglePinMemory(spaceId, atom.id, !atom.pinned, visitorId))
  }

  function handleToggleWrong(atom) {
    const flagged = Boolean(atom.metadata?.flagged_wrong)
    updateMemoryAtom(atom, () => updateMemoryAtom(spaceId, atom.id, { metadata: { ...(atom.metadata || {}), flagged_wrong: !flagged } }, visitorId))
  }

  async function handleDelete(atom) {
    if (!spaceId || !visitorId || !atom?.id) return
    if (!window.confirm('删除这条记忆？')) return
    setBusyMemoryId(atom.id)
    setMemoryError('')
    try {
      await deleteMemoryAtom(spaceId, atom.id, visitorId)
      setMemoryAtoms((prev) => prev.filter((item) => item.id !== atom.id))
    } catch (err) {
      setMemoryError(err.message || '记忆删除失败')
    } finally {
      setBusyMemoryId('')
    }
  }

  return (
    <div className="ctx-section">
      <div className="ctx-memory-relation">
        <span className="mini-label">当前关系</span>
        <AffinityBadge stage={stage} strength={strength} showEnglish />
        <AffinityProgress stage={stage} strength={strength} />
        <p className="muted">{visitorNickname || '这位访客'} 已到访 {visitCount} 次。</p>
      </div>

      <div className="ctx-memory-grid">
        <div>
          <span className="mini-label">首次到访</span>
          <strong>{firstVisit ? new Date(firstVisit).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '暂无'}</strong>
        </div>
        <div>
          <span className="mini-label">最近到访</span>
          <strong>{lastVisit ? new Date(lastVisit).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '暂无'}</strong>
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

      <div className="ctx-field">
        <span className="mini-label">本轮对话摘要</span>
        {recentUser || recentAssistant ? (
          <div className="ctx-memory-recent">
            {recentUser && <p><strong>{visitorNickname || '访客'}：</strong>{recentUser.content.slice(0, 80)}{recentUser.content.length > 80 ? '...' : ''}</p>}
            {recentAssistant && <p><strong>{selectedChar?.name || 'NPC'}：</strong>{recentAssistant.content.slice(0, 80)}{recentAssistant.content.length > 80 ? '...' : ''}</p>}
          </div>
        ) : (
          <p className="muted">还没有本轮对话。</p>
        )}
      </div>

      <div className="ctx-field">
        <span className="mini-label">注入到 Prompt 的稳定事实</span>
        <ul className="ctx-memory-facts">
          <li>空间：{roomName}</li>
          <li>访客称呼：{visitorNickname || '旅人'}</li>
          <li>关系阶段：{stageMeta.name_zh || stage || '未建立'}</li>
          <li>到访次数：{visitCount}</li>
        </ul>
      </div>

      <div className="ctx-field">
        <div className="ctx-field-heading">
          <span className="mini-label">自动提炼记忆</span>
          <button
            type="button"
            className="ctx-mini-action"
            onClick={() => loadStructuredMemories()}
            disabled={memoryLoading}
          >
            刷新
          </button>
        </div>
        {memoryError && <p className="error-note">{memoryError}</p>}
        {memoryLoading ? (
          <p className="muted">正在读取记忆...</p>
        ) : memoryAtoms.length > 0 ? (
          <div className="ctx-memory-atom-list">
            {memoryAtoms.map((atom) => {
              const flaggedWrong = Boolean(atom.metadata?.flagged_wrong)
              const busy = busyMemoryId === atom.id
              return (
                <article key={atom.id} className={`ctx-memory-atom ${flaggedWrong ? 'is-flagged' : ''}`}>
                  <div className="ctx-memory-atom-meta">
                    {atom.pinned && <span>置顶</span>}
                    <span>{horizonLabels[atom.horizon] || atom.horizon || '短期'}</span>
                    <span>{dimensionLabels[atom.dimension] || atom.dimension || '事实'}</span>
                    <span>{Math.round(Number(atom.importance || 0) * 100)}%</span>
                  </div>
                  <p>{atom.content}</p>
                  {flaggedWrong && <small className="error-note">已标错，不会注入 Prompt。</small>}
                  <div className="ctx-memory-atom-actions">
                    <button type="button" className="ctx-mini-action" onClick={() => handleTogglePin(atom)} disabled={busy}>
                      {atom.pinned ? '取消置顶' : '置顶'}
                    </button>
                    <button type="button" className="ctx-mini-action" onClick={() => handleToggleWrong(atom)} disabled={busy}>
                      {flaggedWrong ? '恢复' : '标错'}
                    </button>
                    <button type="button" className="ctx-mini-action danger" onClick={() => handleDelete(atom)} disabled={busy}>
                      删除
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="muted">还没有自动记忆。多聊几句后，这里会沉淀偏好、事件和承诺。</p>
        )}
      </div>
    </div>
  )
}

function StateCardsTab({ spaceId, visitorId }) {
  const [canonCards, setCanonCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const CATEGORY_META = {
    character: { label: '角色事实', icon: '👤' },
    task: { label: '任务/委托', icon: '📋' },
    resource: { label: '资源/线索', icon: '🔑' },
    conflict: { label: '冲突/机会', icon: '⚡' },
    event_log: { label: '事件', icon: '📖' },
  }

  async function loadCanonCards() {
    if (!spaceId) return
    setLoading(true)
    setError('')
    try {
      const result = await listStateCards(spaceId, { status: 'confirmed' }, visitorId)
      const all = Array.isArray(result?.state_cards) ? result.state_cards : []
      const canon = all.filter(c => c.fixed_canon || c.canon_scope === 'space')
      setCanonCards(canon)
    } catch (err) {
      setError(err.message || '正史卡读取失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCanonCards()
  }, [spaceId])

  return (
    <div className="ctx-section">
      <div className="ctx-field-heading">
        <span className="mini-label">剧情正史（已确认）</span>
        <button type="button" className="ctx-mini-action" onClick={loadCanonCards} disabled={loading}>
          刷新
        </button>
      </div>

      {error && <p className="error-note">{error}</p>}

      {loading ? (
        <p className="muted">正在读取正史...</p>
      ) : canonCards.length === 0 ? (
        <div className="ctx-empty">
          <p>还没有正史卡。</p>
          <p className="muted">访客确认的事实和店主创建的正史卡会出现在这里。</p>
        </div>
      ) : (
        <div className="ctx-sc-list">
          {[...canonCards]
            .sort((a, b) => {
              const order = ['character', 'task', 'resource', 'conflict', 'event_log']
              return (order.indexOf(a.category) - order.indexOf(b.category))
            })
            .map((card) => {
              const meta = CATEGORY_META[card.category] || { label: card.category, icon: '📄' }
              return (
                <article key={card.id} className="ctx-sc-item">
                  <div className="ctx-sc-header">
                    <span className="ctx-sc-icon">{meta.icon}</span>
                    <span className="ctx-sc-category">{meta.label}</span>
                    {card.fixed_canon && (
                      <span className="ctx-sc-badge fixed">正史</span>
                    )}
                    {card.canon_scope === 'space' && !card.fixed_canon && (
                      <span className="ctx-sc-badge space">空间</span>
                    )}
                  </div>
                  <h5 className="ctx-sc-title">{card.title}</h5>
                  {card.summary && (
                    <p className="ctx-sc-summary">{card.summary}</p>
                  )}
                </article>
              )
            })}
        </div>
      )}
    </div>
  )
}

function AIConfigTab({ space, voiceConfig }) {
  const llm = space?.llm_config || {}

  return (
    <div className="ctx-section">
      <div className="ctx-field">
        <span className="mini-label">AI 后端</span>
        <p>{llm.backend || '未配置'}</p>
      </div>

      {llm.model && (
        <div className="ctx-field">
          <span className="mini-label">模型</span>
          <p>{llm.model}</p>
        </div>
      )}

      {llm.base_url && (
        <div className="ctx-field">
          <span className="mini-label">接口地址</span>
          <p className="ctx-url">{llm.base_url}</p>
        </div>
      )}

      {llm.temperature != null && (
        <div className="ctx-field">
          <span className="mini-label">温度参数</span>
          <p>{llm.temperature}</p>
        </div>
      )}

      {llm.max_tokens != null && (
        <div className="ctx-field">
          <span className="mini-label">最长回复预算</span>
          <p>{llm.max_tokens} tokens</p>
        </div>
      )}

      {!llm.backend && (
        <div className="ctx-empty">
          <p>空间还没有配置 AI。</p>
          <p className="muted">店主可以在 AI 配置里设置。</p>
        </div>
      )}

      {voiceConfig?.enabled && (
        <>
          <div className="ctx-divider" />
          <div className="ctx-field">
            <span className="mini-label">语音合成</span>
            <p>{voiceConfig.tts_provider || '已启用'}</p>
          </div>
          {voiceConfig.tts_voice && (
            <div className="ctx-field">
              <span className="mini-label">语音</span>
              <p>{voiceConfig.tts_voice}</p>
            </div>
          )}
          {voiceConfig.tts_speed != null && (
            <div className="ctx-field">
              <span className="mini-label">语速</span>
              <p>{voiceConfig.tts_speed}x</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * SpaceContextPanel — 三栏布局右侧上下文面板
 *
 * 提供角色、场所、世界书、记忆、AI 配置五个标签页的上下文信息。
 */
export default function SpaceContextPanel({
  space,
  selectedChar,
  entryState,
  messages,
  visitorId,
  visitorNickname,
  roomName,
  voiceConfig,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('character')

  const tabs = [
    { id: 'character', label: '角色' },
    { id: 'space', label: '场所' },
    { id: 'worldbook', label: '世界书' },
    { id: 'memory', label: '记忆' },
    { id: 'state_cards', label: '正史' },
    { id: 'ai', label: 'AI' },
  ]

  return (
    <aside className="space-context-panel open">
      <div className="ctx-header">
        <div className="ctx-tabs">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={setActiveTab}
            />
          ))}
        </div>
        {onClose && (
          <button type="button" className="close-btn" onClick={onClose} title="关闭">×</button>
        )}
      </div>

      <div className="ctx-body">
        {activeTab === 'character' && (
          <CharacterInfoTab character={selectedChar} space={space} />
        )}
        {activeTab === 'space' && (
          <SpaceInfoTab space={space} />
        )}
        {activeTab === 'worldbook' && (
          <WorldBookTab space={space} />
        )}
        {activeTab === 'memory' && (
          <MemoryTab
            entryState={entryState}
            messages={messages}
            spaceId={space?.id || ''}
            visitorId={visitorId}
            visitorNickname={visitorNickname}
            roomName={roomName}
            selectedChar={selectedChar}
          />
        )}
        {activeTab === 'state_cards' && (
          <StateCardsTab spaceId={space?.id || ''} visitorId={visitorId} />
        )}
        {activeTab === 'ai' && (
          <AIConfigTab space={space} voiceConfig={voiceConfig} />
        )}
      </div>
    </aside>
  )
}
