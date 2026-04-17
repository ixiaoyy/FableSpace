import { useState } from 'react'

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

function CharacterInfoTab({ character, tavern }) {
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

      {character.scenario && (
        <div className="ctx-field">
          <span className="mini-label">场景设定</span>
          <p>{character.scenario}</p>
        </div>
      )}

      {character.system_prompt && (
        <div className="ctx-field">
          <span className="mini-label">角色指令（高级）</span>
          <p className="system-prompt-text">{character.system_prompt.slice(0, 200)}{character.system_prompt.length > 200 ? '...' : ''}</p>
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

      {tavern?.scene_prompt && (
        <div className="ctx-field">
          <span className="mini-label">场景氛围</span>
          <p>{tavern.scene_prompt}</p>
        </div>
      )}
    </div>
  )
}

function TavernInfoTab({ tavern }) {
  if (!tavern) {
    return (
      <div className="ctx-empty">
        <p>没有酒馆信息</p>
      </div>
    )
  }

  return (
    <div className="ctx-section">
      <div className="ctx-tavern-header">
        <strong>{tavern.name}</strong>
        <span className={`tavern-status-badge status-${tavern.status || 'closed'}`}>
          {tavern.status === 'open' ? '营业中' : '歇业'}
        </span>
      </div>

      {tavern.description && (
        <div className="ctx-field">
          <span className="mini-label">简介</span>
          <p>{tavern.description}</p>
        </div>
      )}

      {tavern.scene_prompt && (
        <div className="ctx-field">
          <span className="mini-label">场景氛围</span>
          <p>{tavern.scene_prompt}</p>
        </div>
      )}

      <div className="ctx-field">
        <span className="mini-label">访问权限</span>
        <p>{tavern.access === 'public' ? '公开' : tavern.access === 'password' ? '密码入场' : '私人'}</p>
      </div>

      <div className="ctx-field">
        <span className="mini-label">位置</span>
        <p className="muted">
          {tavern.lat != null && tavern.lon != null
            ? `${Number(tavern.lat).toFixed(4)}, ${Number(tavern.lon).toFixed(4)}`
            : '未设置坐标'}
        </p>
      </div>

      <div className="ctx-field">
        <span className="mini-label">角色数量</span>
        <p>{(tavern.characters || []).length} 个角色</p>
      </div>

      <div className="ctx-field">
        <span className="mini-label">世界书条目</span>
        <p>{(tavern.world_info || []).length} 条设定</p>
      </div>
    </div>
  )
}

function WorldBookTab({ tavern }) {
  const worldInfo = tavern?.world_info || []

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

function MemoryTab({ entryState, messages, visitorNickname, roomName, selectedChar }) {
  const visitorState = entryState?.visitor_state || entryState || {}
  const relationship = visitorState.relationship || {}

  const visitCount = Number(visitorState.visit_count ?? 0)
  const stage = relationship.stage || visitorState.relationship_stage || ''
  const strength = Number(relationship.strength ?? visitorState.relationship_strength ?? 0)
  const firstVisit = visitorState.first_visit || ''
  const lastVisit = visitorState.last_visit || ''

  const stageLabels = {
    stranger: '初访者',
    acquaintance: '熟面孔',
    regular: '常客',
    confidant: '熟客盟友',
  }

  const strengthPercent = Math.max(0, Math.min(100, Math.round(strength * 100)))

  const userMessages = messages.filter(m => m.role === 'user')
  const recentUser = [...userMessages].reverse().find(m => m.content)
  const recentAssistant = [...messages].reverse().find(m => m.role === 'assistant')

  return (
    <div className="ctx-section">
      <div className="ctx-memory-relation">
        <span className="mini-label">当前关系</span>
        <strong>{stageLabels[stage] || stage || '未建立'}</strong>
        <div className="ctx-strength-bar" aria-label={`关系强度 ${strengthPercent}%`}>
          <span style={{ width: `${strengthPercent}%` }} />
        </div>
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
          <li>酒馆：{roomName}</li>
          <li>访客称呼：{visitorNickname || '旅人'}</li>
          <li>关系阶段：{stageLabels[stage] || stage || '未建立'}</li>
          <li>到访次数：{visitCount}</li>
        </ul>
      </div>
    </div>
  )
}

function AIConfigTab({ tavern, voiceConfig }) {
  const llm = tavern?.llm_config || {}

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
          <p>酒馆还没有配置 AI。</p>
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
 * TavernContextPanel — 三栏布局右侧上下文面板
 *
 * 提供角色、场所、世界书、记忆、AI 配置五个标签页的上下文信息。
 */
export default function TavernContextPanel({
  tavern,
  selectedChar,
  entryState,
  messages,
  visitorNickname,
  roomName,
  voiceConfig,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('character')

  const tabs = [
    { id: 'character', label: '角色' },
    { id: 'tavern', label: '场所' },
    { id: 'worldbook', label: '世界书' },
    { id: 'memory', label: '记忆' },
    { id: 'ai', label: 'AI' },
  ]

  return (
    <aside className="tavern-context-panel">
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
          <CharacterInfoTab character={selectedChar} tavern={tavern} />
        )}
        {activeTab === 'tavern' && (
          <TavernInfoTab tavern={tavern} />
        )}
        {activeTab === 'worldbook' && (
          <WorldBookTab tavern={tavern} />
        )}
        {activeTab === 'memory' && (
          <MemoryTab
            entryState={entryState}
            messages={messages}
            visitorNickname={visitorNickname}
            roomName={roomName}
            selectedChar={selectedChar}
          />
        )}
        {activeTab === 'ai' && (
          <AIConfigTab tavern={tavern} voiceConfig={voiceConfig} />
        )}
      </div>
    </aside>
  )
}
