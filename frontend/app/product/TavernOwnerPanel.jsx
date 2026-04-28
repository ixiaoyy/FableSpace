import { useState, useEffect, useMemo, useRef } from 'react'
import { getTavernAccessIcon, getTavernAccessLabel, getTavernStatusColor, getTavernStatusLabel } from './services/tavernService'
import {
  deleteMemoryAtom,
  deleteTavern,
  exportChatHistory,
  exportTavernPackage,
  getTavernChatHistory,
  getTavernMetrics,
  getVoiceConfig,
  importTavernPackage,
  listChatSessions,
  listGlobalChatSessions,
  listMemories,
  listTavernVisitors,
  listTaverns,
  saveVoiceConfig,
  searchChatHistory,
  synthesizeVoice,
  togglePinMemory,
  updateTavern,
} from '../lib/taverns'
import LLMConfigForm from './LLMConfigForm'
import TavernCreatePanel from './TavernCreatePanel'
import CharacterManagementModal from './CharacterManagementModal'
import WorldBookEditor from './WorldBookEditor'
import OutputRulesEditor from './OutputRulesEditor'
import PromptBlockEditor from './PromptBlockEditor'
import PresetManager from './PresetManager'
import TavernGroupSettingsModal from './TavernGroupSettingsModal'
import GameplayManager from './GameplayManager'
import { OwnerAdvancedToolPanel, OwnerNextActionPanel, OwnerSectionNav } from './OwnerConsoleSections'

const STATUS_FILTERS = [
  { id: 'all', label: '全部状态' },
  { id: 'open', label: '营业中' },
  { id: 'closed', label: '歇业中' },
]

const ACCESS_FILTERS = [
  { id: 'all', label: '全部权限' },
  { id: 'public', label: '公开' },
  { id: 'password', label: '密码' },
  { id: 'private', label: '私人' },
]

const OWNER_SECTION_COPY = {
  overview: { label: '总览', helper: '经营摘要' },
  taverns: { label: '酒馆', helper: '基础管理' },
  visitors: { label: '访客', helper: '回访与会话' },
  ai: { label: 'AI', helper: '成本与配置' },
  advanced: { label: '高级工具', helper: '世界书 / 护栏 / 数据' },
}

function formatCoordinate(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(4) : '未设置'
}

function formatTokens(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return '—'
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(2)}M`
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}K`
  return numeric.toLocaleString()
}

function formatChatTimestamp(value) {
  if (!value) return '暂无时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelationshipStage(stage) {
  const labels = {
    stranger: '初访者',
    acquaintance: '熟面孔',
    regular: '常客',
    confidant: '熟客盟友',
  }
  return labels[stage] || stage || '未建立'
}

function getSessionVisitorLabel(session) {
  return session?.visitor_name || (session?.visitor_id ? session.visitor_id.slice(0, 16) : '匿名访客')
}

function getChatMessageSpeaker(message, session) {
  if (message?.role === 'assistant') {
    return session?.character_name || 'NPC'
  }
  if (message?.role === 'system') {
    return '系统'
  }
  return message?.visitor_name || getSessionVisitorLabel(session)
}

function buildChatTranscript(session, messages = []) {
  if (!session || !Array.isArray(messages) || messages.length === 0) return ''
  const header = [
    `酒馆：${session.tavern_name || session.tavern_id || '未知酒馆'}`,
    `角色：${session.character_name || session.character_id || '未知角色'}`,
    `访客：${getSessionVisitorLabel(session)}`,
  ].join('\n')
  const body = messages.map((message) => {
    const timestamp = message?.timestamp ? `[${formatChatTimestamp(message.timestamp)}] ` : ''
    const speaker = getChatMessageSpeaker(message, session)
    return `${timestamp}${speaker}: ${message?.content || ''}`
  }).join('\n')
  return `${header}\n\n${body}`
}

function getTavernTokenUsage(tavern) {
  const usage = Number(tavern?.llm_config?.token_used || 0)
  return Number.isFinite(usage) && usage > 0 ? usage : 0
}

function slugifyFilename(value) {
  const normalized = String(value || 'tavern')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
  return normalized || 'tavern'
}

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/**
 * TavernOwnerPanel — 店主管理面板
 *
 * Props:
 *   ownerId        — 店主 ID
 *   onClose        — () => void — 关闭面板
 *   onTavernCreated — (tavern) => void — 酒馆创建/更新后回调
 *   initialTab     — number — 初始标签页（0=列表，1=创建）
 *   editTavern     — object — 初始要编辑的酒馆数据
 *   createSignal   — number — 外部递增时直接打开创建向导
 */
export default function TavernOwnerPanel({
  ownerId = '',
  onClose,
  onTavernCreated,
  initialTab = 0,
  editTavern = null,
  createSignal = 0,
  createInitialLat = 0,
  createInitialLon = 0,
}) {
  const [ownerSection, setOwnerSection] = useState(initialTab === 1 ? 'taverns' : 'overview')
  const [myTaverns, setMyTaverns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(initialTab === 1 && !editTavern)
  const [editingTavern, setEditingTavern] = useState(editTavern)
  const [editingLlmTavern, setEditingLlmTavern] = useState(null)
  const [characterManagerTavern, setCharacterManagerTavern] = useState(null)
  const [worldBookTavern, setWorldBookTavern] = useState(null)
  const [outputRulesTavern, setOutputRulesTavern] = useState(null)
  const [promptBlocksTavern, setPromptBlocksTavern] = useState(null)
  const [presetManagerTavern, setPresetManagerTavern] = useState(null)
  const [groupSettingsTavern, setGroupSettingsTavern] = useState(null)
  const [gameplayManagerTavern, setGameplayManagerTavern] = useState(null)
  const [llmFormData, setLlmFormData] = useState(null)
  const [savingLlm, setSavingLlm] = useState(false)
  const [llmSaveResult, setLlmSaveResult] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [accessFilter, setAccessFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [chatSessions, setChatSessions] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [chatSearchTavernId, setChatSearchTavernId] = useState('')
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchResults, setChatSearchResults] = useState([])
  const [chatSearchLoading, setChatSearchLoading] = useState(false)
  const [chatSearchError, setChatSearchError] = useState('')
  const [chatSearchStatus, setChatSearchStatus] = useState('')
  const [chatDetailSession, setChatDetailSession] = useState(null)
  const [chatDetailMessages, setChatDetailMessages] = useState([])
  const [chatDetailLoading, setChatDetailLoading] = useState(false)
  const [chatDetailError, setChatDetailError] = useState('')
  const [chatExportText, setChatExportText] = useState('')
  const [chatExportLoading, setChatExportLoading] = useState(false)
  const [chatExportStatus, setChatExportStatus] = useState('')
  const [visitorStates, setVisitorStates] = useState([])
  const [visitorLoading, setVisitorLoading] = useState(false)
  const [visitorError, setVisitorError] = useState('')
  const [memoryModalVisitor, setMemoryModalVisitor] = useState(null)
  const [memoryModalAtoms, setMemoryModalAtoms] = useState([])
  const [memoryModalLoading, setMemoryModalLoading] = useState(false)
  const [memoryModalError, setMemoryModalError] = useState('')
  const ownerLabel = ownerId || '未识别店主'
  const packageInputRef = useRef(null)
  const [packageBusy, setPackageBusy] = useState('')
  const [packageStatus, setPackageStatus] = useState('')
  const [tavernMetrics, setTavernMetrics] = useState({}) // { [tavernId]: metrics }
  const [metricsLoading, setMetricsLoading] = useState(false)

  const ownerStats = useMemo(() => {
    return myTaverns.reduce(
      (stats, tavern) => {
        const tokenUsed = getTavernTokenUsage(tavern)
        stats.total += 1
        stats.characters += tavern?.characters?.length || 0
        stats.worldInfo += tavern?.world_info?.length || 0
        stats.tokens += tokenUsed
        if (tavern.status === 'open') stats.open += 1
        if (tavern.status === 'closed') stats.closed += 1
        return stats
      },
      { total: 0, open: 0, closed: 0, characters: 0, worldInfo: 0, tokens: 0 },
    )
  }, [myTaverns])

  const tokenStats = useMemo(() => {
    const rows = myTaverns
      .map((tavern) => ({
        tavern,
        tokens: getTavernTokenUsage(tavern),
        backend: tavern?.llm_config?.backend || '未配置',
        model: tavern?.llm_config?.model || '未配置模型',
      }))
      .sort((a, b) => b.tokens - a.tokens || String(a.tavern.name || '').localeCompare(String(b.tavern.name || '')))

    const total = rows.reduce((sum, row) => sum + row.tokens, 0)
    const usedRows = rows.filter((row) => row.tokens > 0)
    const topTokens = rows[0]?.tokens || 0

    return {
      rows,
      total,
      average: rows.length ? Math.round(total / rows.length) : 0,
      usedCount: usedRows.length,
      unusedCount: rows.length - usedRows.length,
      topTokens,
      topTavernName: usedRows[0]?.tavern?.name || '',
    }
  }, [myTaverns])

  const chatStats = useMemo(() => {
    const visitorIds = new Set()
    const visitorNames = new Set()
    let messageCount = 0
    chatSessions.forEach((session) => {
      if (session.visitor_id) visitorIds.add(session.visitor_id)
      if (session.visitor_name) visitorNames.add(session.visitor_name)
      messageCount += Number(session.message_count || 0)
    })
    return {
      sessions: chatSessions.length,
      visitors: visitorNames.size || visitorIds.size,
      messages: messageCount,
    }
  }, [chatSessions])

  const visitorStats = useMemo(() => {
    const totalVisits = visitorStates.reduce((sum, visitor) => sum + Number(visitor.visit_count || 0), 0)
    const returningVisitors = visitorStates.filter((visitor) => Number(visitor.visit_count || 0) >= 2).length
    const engagedVisitors = visitorStates.filter((visitor) => Number(visitor.message_count || 0) > 0).length
    return {
      visitors: visitorStates.length,
      visits: totalVisits,
      returningVisitors,
      engagedVisitors,
    }
  }, [visitorStates])

  const filteredTaverns = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    return myTaverns.filter((tavern) => {
      const matchesStatus = statusFilter === 'all' || tavern.status === statusFilter
      const matchesAccess = accessFilter === 'all' || tavern.access === accessFilter
      const searchable = [
        tavern.name,
        tavern.description,
        tavern.scene_prompt,
        tavern.characters?.map((character) => character.name).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesKeyword = !keyword || searchable.includes(keyword)
      return matchesStatus && matchesAccess && matchesKeyword
    })
  }, [myTaverns, statusFilter, accessFilter, searchQuery])

  const hasActiveFilters = statusFilter !== 'all' || accessFilter !== 'all' || Boolean(searchQuery.trim())

  const ownerSections = useMemo(() => ([
    {
      id: 'overview',
      ...OWNER_SECTION_COPY.overview,
      badge: ownerStats.total ? `${ownerStats.total} 间` : '未开店',
    },
    {
      id: 'taverns',
      ...OWNER_SECTION_COPY.taverns,
      badge: `${filteredTaverns.length}/${myTaverns.length}`,
    },
    {
      id: 'visitors',
      ...OWNER_SECTION_COPY.visitors,
      badge: visitorStats.visitors ? `${visitorStats.visitors} 人` : `${chatStats.sessions} 会话`,
    },
    {
      id: 'ai',
      ...OWNER_SECTION_COPY.ai,
      badge: ownerStats.tokens > 0 ? formatTokens(ownerStats.tokens) : '未消耗',
    },
    {
      id: 'advanced',
      ...OWNER_SECTION_COPY.advanced,
      badge: '创作',
    },
  ]), [chatStats.sessions, filteredTaverns.length, myTaverns.length, ownerStats.total, ownerStats.tokens, visitorStats.visitors])

  useEffect(() => {
    if (!showCreate && !editingTavern) {
      refreshOwnerData()
    }
  }, [showCreate, editingTavern])

  useEffect(() => {
    if (!ownerId || showCreate || editingTavern || myTaverns.length === 0) {
      setVisitorStates([])
      return
    }
    fetchOwnerVisitorStates(myTaverns)
  }, [ownerId, showCreate, editingTavern, myTaverns])

  useEffect(() => {
    if (!ownerId || showCreate || editingTavern) {
      return
    }
    fetchTavernMetrics()
  }, [ownerId, showCreate, editingTavern, myTaverns])

  useEffect(() => {
    if (!myTaverns.length) {
      if (chatSearchTavernId) setChatSearchTavernId('')
      return
    }
    if (!chatSearchTavernId || !myTaverns.some((tavern) => tavern.id === chatSearchTavernId)) {
      setChatSearchTavernId(myTaverns[0].id)
    }
  }, [chatSearchTavernId, myTaverns])

  // Switch to tavern management when editTavern prop is provided
  useEffect(() => {
    if (editTavern) {
      setEditingTavern(editTavern)
      setShowCreate(false)
      setOwnerSection('taverns')
    }
  }, [editTavern])

  useEffect(() => {
    if (createSignal > 0) {
      setEditingTavern(null)
      setShowCreate(true)
      setOwnerSection('taverns')
    }
  }, [createSignal])

  async function fetchMyTaverns() {
    setLoading(true)
    setError(null)
    if (!ownerId) {
      setMyTaverns([])
      setError('缺少店主身份，暂时无法读取你的酒馆。')
      setLoading(false)
      return
    }
    try {
      const result = await listTaverns({ owner_id: ownerId })
      const list = Array.isArray(result) ? result : (result?.taverns || [])
      // Filter to only show taverns owned by this user
      setMyTaverns(list.filter(t => t.owner_id === ownerId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTavernMetrics() {
    if (!myTaverns.length) return
    setMetricsLoading(true)
    try {
      const metricsPromises = myTaverns.map(async (tavern) => {
        try {
          const metrics = await getTavernMetrics(tavern.id)
          return { tavernId: tavern.id, metrics }
        } catch (err) {
          return { tavernId: tavern.id, metrics: null }
        }
      })
      const results = await Promise.all(metricsPromises)
      const metricsMap = {}
      results.forEach(({ tavernId, metrics }) => {
        metricsMap[tavernId] = metrics
      })
      setTavernMetrics(metricsMap)
    } catch (err) {
      console.error('Failed to fetch tavern metrics:', err)
    } finally {
      setMetricsLoading(false)
    }
  }

  async function fetchOwnerChatSessions() {
    setChatError('')
    if (!ownerId) {
      setChatSessions([])
      return
    }
    setChatLoading(true)
    try {
      const result = await listGlobalChatSessions({}, ownerId)
      const chats = Array.isArray(result?.chats) ? result.chats : []
      setChatSessions(chats)
    } catch (err) {
      setChatError(err.message)
    } finally {
      setChatLoading(false)
    }
  }

  async function openChatSessionDetail(session) {
    if (!session?.tavern_id || !session?.visitor_id) return
    setChatDetailSession(session)
    setChatDetailMessages([])
    setChatDetailError('')
    setChatExportText('')
    setChatExportStatus('')
    setChatDetailLoading(true)
    try {
      const result = await getTavernChatHistory(
        session.tavern_id,
        session.visitor_id,
        session.character_id,
        ownerId,
        200,
      )
      setChatDetailMessages(Array.isArray(result?.messages) ? result.messages : [])
    } catch (err) {
      setChatDetailError(err.message)
    } finally {
      setChatDetailLoading(false)
    }
  }

  async function openVisitorLatestSession(visitor) {
    if (!visitor?.tavern_id || !visitor?.visitor_id) return
    setChatError('')
    const matchesCurrentSession = (session) => (
      session.tavern_id === visitor.tavern_id && session.visitor_id === visitor.visitor_id
    )
    const knownSessions = chatSessions
      .filter(matchesCurrentSession)
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
    if (knownSessions[0]) {
      openChatSessionDetail(knownSessions[0])
      return
    }

    setChatLoading(true)
    try {
      const result = await listChatSessions(
        { tavernId: visitor.tavern_id, visitorId: visitor.visitor_id },
        ownerId,
      )
      const fetchedSessions = Array.isArray(result?.chats) ? result.chats : []
      if (fetchedSessions.length === 0) {
        setChatError('该访客还没有可查看的聊天会话。')
        return
      }
      setChatSessions((prev) => {
        const existingKeys = new Set(prev.map((session) => `${session.tavern_id}:${session.visitor_id}:${session.character_id}`))
        const additions = fetchedSessions.filter((session) => !existingKeys.has(`${session.tavern_id}:${session.visitor_id}:${session.character_id}`))
        return [...additions, ...prev]
      })
      openChatSessionDetail(
        fetchedSessions.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0],
      )
    } catch (err) {
      setChatError(`读取访客会话失败：${err.message}`)
    } finally {
      setChatLoading(false)
    }
  }

  async function openVisitorMemoryModal(visitor) {
    if (!visitor?.tavern_id || !visitor?.visitor_id) return
    setMemoryModalVisitor(visitor)
    setMemoryModalAtoms([])
    setMemoryModalError('')
    setMemoryModalLoading(true)
    try {
      const result = await listMemories(
        visitor.tavern_id,
        { visitor_id: visitor.visitor_id, limit: 100 },
        ownerId,
      )
      setMemoryModalAtoms(Array.isArray(result?.memories) ? result.memories : [])
    } catch (err) {
      setMemoryModalError(err.message)
    } finally {
      setMemoryModalLoading(false)
    }
  }

  function closeMemoryModal() {
    setMemoryModalVisitor(null)
    setMemoryModalAtoms([])
    setMemoryModalError('')
  }

  function resolveChatSearchSession(message = {}) {
    const knownSession = chatSessions.find((session) => (
      session.tavern_id === message.tavern_id
      && session.visitor_id === message.visitor_id
      && session.character_id === message.character_id
    ))
    if (knownSession) return knownSession

    const tavern = myTaverns.find((item) => item.id === message.tavern_id)
    const character = tavern?.characters?.find((item) => item.id === message.character_id)
    return {
      tavern_id: message.tavern_id || '',
      tavern_name: tavern?.name || message.tavern_id || '未知酒馆',
      visitor_id: message.visitor_id || '',
      visitor_name: message.visitor_name || '',
      character_id: message.character_id || '',
      character_name: character?.name || message.character_id || '未知角色',
      message_count: 0,
      last_message: message.content || '',
      last_role: message.role || '',
      updated_at: message.timestamp || '',
    }
  }

  async function runChatSearch(event) {
    event?.preventDefault?.()
    const keyword = chatSearchQuery.trim()
    setChatSearchError('')
    setChatSearchStatus('')
    setChatSearchResults([])

    if (!ownerId) {
      setChatSearchError('缺少店主身份，无法搜索聊天记录。')
      return
    }
    if (!chatSearchTavernId) {
      setChatSearchError('请先选择要搜索的酒馆。')
      return
    }
    if (!keyword) {
      setChatSearchStatus('请输入关键词后再搜索。')
      return
    }

    setChatSearchLoading(true)
    try {
      const result = await searchChatHistory(
        {
          tavernId: chatSearchTavernId,
          query: keyword,
          limit: 20,
        },
        ownerId,
      )
      const results = Array.isArray(result?.results) ? result.results : []
      setChatSearchResults(results)
      if (result?.count > 0) {
        const suffix = result.truncated ? `，仅显示前 ${result.limit || results.length} 条` : ''
        setChatSearchStatus(`找到 ${result.count} 条匹配${suffix}`)
      } else {
        setChatSearchStatus('没有找到匹配消息。')
      }
    } catch (err) {
      setChatSearchError(err.message)
    } finally {
      setChatSearchLoading(false)
    }
  }

  function openChatSearchResult(result) {
    const session = resolveChatSearchSession(result?.message || {})
    if (!session?.tavern_id || !session?.visitor_id) return
    openChatSessionDetail(session)
  }

  async function refreshChatSessionDetail() {
    if (!chatDetailSession) return
    openChatSessionDetail(chatDetailSession)
  }

  async function generateChatExportText() {
    if (!chatDetailSession) return
    setChatExportLoading(true)
    setChatExportStatus('')
    try {
      const result = await exportChatHistory(
        {
          tavernId: chatDetailSession.tavern_id,
          characterId: chatDetailSession.character_id,
          visitorId: chatDetailSession.visitor_id,
          format: 'text',
        },
        ownerId,
      )
      setChatExportText(result?.text || buildChatTranscript(chatDetailSession, chatDetailMessages))
      setChatExportStatus('导出文本已生成')
    } catch (err) {
      setChatExportStatus(`导出失败：${err.message}`)
    } finally {
      setChatExportLoading(false)
    }
  }

  async function copyChatExportText() {
    const text = chatExportText || buildChatTranscript(chatDetailSession, chatDetailMessages)
    if (!text) return
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }
      await navigator.clipboard.writeText(text)
      setChatExportStatus('已复制到剪贴板')
    } catch {
      setChatExportStatus('当前浏览器不允许自动复制，请手动选中文本复制')
    }
  }

  function closeChatSessionDetail() {
    setChatDetailSession(null)
    setChatDetailMessages([])
    setChatDetailError('')
    setChatExportText('')
    setChatExportStatus('')
  }

  async function fetchOwnerVisitorStates(tavernList = myTaverns) {
    setVisitorError('')
    if (!ownerId || !tavernList.length) {
      setVisitorStates([])
      return
    }
    setVisitorLoading(true)
    try {
      const visitorPayloads = await Promise.all(
        tavernList.map(async (tavern) => {
          const result = await listTavernVisitors(tavern.id, ownerId)
          const visitors = Array.isArray(result?.visitors) ? result.visitors : []
          return visitors.map((visitor) => ({
            ...visitor,
            tavern_id: tavern.id,
            tavern_name: tavern.name,
          }))
        })
      )
      setVisitorStates(
        visitorPayloads
          .flat()
          .sort((a, b) => String(b.last_visit || '').localeCompare(String(a.last_visit || '')))
      )
    } catch (err) {
      setVisitorError(err.message)
    } finally {
      setVisitorLoading(false)
    }
  }

  function refreshOwnerData() {
    fetchMyTaverns()
    fetchOwnerChatSessions()
    fetchOwnerVisitorStates()
  }

  async function handleToggleStatus(tavern) {
    const newStatus = tavern.status === 'open' ? 'closed' : 'open'
    try {
      await updateTavern(tavern.id, { status: newStatus }, ownerId)
      setMyTaverns(prev => prev.map(t => t.id === tavern.id ? { ...t, status: newStatus } : t))
    } catch (err) {
      alert(`更新失败: ${err.message}`)
    }
  }

  async function handleSaveEdit(updatedData) {
    try {
      const result = await updateTavern(editingTavern.id, updatedData, ownerId)
      setMyTaverns(prev => prev.map(t => t.id === editingTavern.id ? { ...t, ...result } : t))
      setEditingTavern(null)
      if (onTavernCreated) onTavernCreated(result)
    } catch (err) {
      alert(`保存失败: ${err.message}`)
    }
  }

  async function handleDelete(tavernId) {
    try {
      await deleteTavern(tavernId, ownerId)
      setMyTaverns(prev => prev.filter(t => t.id !== tavernId))
      setDeleteTarget(null)
    } catch (err) {
      alert(`删除失败: ${err.message}`)
    }
  }

  async function handleSaveLlm() {
    if (!editingLlmTavern || !llmFormData) return
    setSavingLlm(true)
    setLlmSaveResult(null)
    try {
      const result = await updateTavern(editingLlmTavern.id, { llm_config: llmFormData }, ownerId)
      setMyTaverns(prev => prev.map(t => t.id === editingLlmTavern.id ? { ...t, ...result } : t))
      setEditingLlmTavern(prev => prev ? { ...prev, ...result } : prev)
      setLlmSaveResult({ ok: true, message: 'AI 配置已保存' })
      if (onTavernCreated) onTavernCreated(result)
    } catch (err) {
      setLlmSaveResult({ ok: false, message: `保存失败：${err.message}` })
    } finally {
      setSavingLlm(false)
    }
  }

  function handleTavernCreated(newTavern) {
    setShowCreate(false)
    setEditingTavern(null)
    if (!myTaverns.find(t => t.id === newTavern.id)) {
      setMyTaverns(prev => [newTavern, ...prev])
    } else {
      setMyTaverns(prev => prev.map(t => t.id === newTavern.id ? newTavern : t))
    }
    setOwnerSection('taverns')
    if (onTavernCreated) onTavernCreated(newTavern)
  }

  function handleCharactersUpdated(updatedTavern) {
    setMyTaverns(prev => prev.map(t => t.id === updatedTavern.id ? { ...t, ...updatedTavern } : t))
    setCharacterManagerTavern(updatedTavern)
    if (onTavernCreated) onTavernCreated(updatedTavern)
  }

  function handleWorldInfoUpdated(updatedTavern) {
    setMyTaverns(prev => prev.map(t => t.id === updatedTavern.id ? { ...t, ...updatedTavern } : t))
    setWorldBookTavern(updatedTavern)
    if (onTavernCreated) onTavernCreated(updatedTavern)
  }

  function handleOutputRulesUpdated(updatedTavern) {
    setMyTaverns(prev => prev.map(t => t.id === updatedTavern.id ? { ...t, ...updatedTavern } : t))
    setOutputRulesTavern(updatedTavern)
    if (onTavernCreated) onTavernCreated(updatedTavern)
  }

  function handlePromptBlocksUpdated(updatedTavern) {
    setMyTaverns(prev => prev.map(t => t.id === updatedTavern.id ? { ...t, ...updatedTavern } : t))
    setPromptBlocksTavern(updatedTavern)
    if (onTavernCreated) onTavernCreated(updatedTavern)
  }

  function handlePresetApplied(updatedTavern) {
    setMyTaverns(prev => prev.map(t => t.id === updatedTavern.id ? { ...t, ...updatedTavern } : t))
    setPresetManagerTavern(updatedTavern)
    if (onTavernCreated) onTavernCreated(updatedTavern)
  }

  function handleGroupSettingsUpdated(updatedTavern) {
    setMyTaverns(prev => prev.map(t => t.id === updatedTavern.id ? { ...t, ...updatedTavern } : t))
    setGroupSettingsTavern(updatedTavern)
    if (onTavernCreated) onTavernCreated(updatedTavern)
  }

  function handleGameplayUpdated(updatedTavern) {
    setMyTaverns(prev => prev.map(t => t.id === updatedTavern.id ? { ...t, ...updatedTavern } : t))
    setGameplayManagerTavern(updatedTavern)
    if (onTavernCreated) onTavernCreated(updatedTavern)
  }

  async function handleExportPackage(tavern) {
    if (!tavern?.id) return
    setPackageBusy(`export:${tavern.id}`)
    setPackageStatus('')
    try {
      const payload = await exportTavernPackage(tavern.id, ownerId)
      const filename = `${slugifyFilename(payload?.tavern?.name || tavern.name)}-fablemap-package.json`
      downloadJsonFile(filename, payload)
      setPackageStatus(`已导出《${tavern.name}》酒馆包，不包含 API Key 和访客聊天。`)
    } catch (err) {
      setPackageStatus(`导出失败：${err.message}`)
    } finally {
      setPackageBusy('')
    }
  }

  function openPackageImport() {
    packageInputRef.current?.click()
  }

  async function handlePackageFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setPackageBusy('import')
    setPackageStatus('')
    try {
      const packageData = JSON.parse(await file.text())
      const tavernPayload = packageData?.tavern || {}
      const defaultLat = tavernPayload.lat ?? createInitialLat ?? 0
      const defaultLon = tavernPayload.lon ?? createInitialLon ?? 0
      const latInput = window.prompt('导入酒馆包：请输入新酒馆纬度', String(defaultLat))
      if (latInput == null) return
      const lonInput = window.prompt('导入酒馆包：请输入新酒馆经度', String(defaultLon))
      if (lonInput == null) return
      const nameInput = window.prompt('导入后的酒馆名称', `${tavernPayload.name || '导入酒馆'} 副本`)
      if (nameInput == null) return
      const imported = await importTavernPackage(
        packageData,
        {
          lat: Number(latInput),
          lon: Number(lonInput),
          name: nameInput.trim() || `${tavernPayload.name || '导入酒馆'} 副本`,
          access: 'private',
        },
        ownerId,
      )
      const newTavern = imported?.tavern
      if (newTavern) {
        setMyTaverns(prev => [newTavern, ...prev.filter(t => t.id !== newTavern.id)])
        if (onTavernCreated) onTavernCreated(newTavern)
      }
      setPackageStatus(`已导入酒馆包：${newTavern?.name || nameInput}`)
      setOwnerSection('taverns')
    } catch (err) {
      setPackageStatus(`导入失败：${err.message}`)
    } finally {
      setPackageBusy('')
    }
  }

  function openLlmEdit(tavern) {
    setEditingLlmTavern(tavern)
    setLlmFormData({
      backend: tavern.llm_config?.backend || 'openai',
      model: tavern.llm_config?.model || 'gpt-4o-mini',
      api_key: '',  // Don't pre-fill for security
      base_url: tavern.llm_config?.base_url || '',
      temperature: tavern.llm_config?.temperature ?? 0.8,
      max_tokens: tavern.llm_config?.max_tokens ?? 4096,
      top_p: tavern.llm_config?.top_p ?? 1.0,
    })
    setLlmSaveResult(null)
  }

  function closeLlmEdit() {
    setEditingLlmTavern(null)
    setLlmFormData(null)
    setLlmSaveResult(null)
  }

  function handleEditTavern(tavern) {
    setEditingTavern(tavern)
    setShowCreate(false)
  }

  function clearFilters() {
    setStatusFilter('all')
    setAccessFilter('all')
    setSearchQuery('')
  }

  // Show create panel
  if (showCreate) {
    return (
      <div className="owner-create-container">
        <TavernCreatePanel
          initialLat={createInitialLat || 0}
          initialLon={createInitialLon || 0}
          ownerId={ownerId}
          onCreated={handleTavernCreated}
          onCancel={() => { setShowCreate(false); setOwnerSection('taverns') }}
        />
      </div>
    )
  }

  // Show edit modal
  if (editingTavern) {
    return (
      <TavernEditModal
        tavern={editingTavern}
        onSave={handleSaveEdit}
        onClose={() => setEditingTavern(null)}
      />
    )
  }

  return (
    <div className="tavern-owner-panel page-enter">
      <header className="owner-header">
        <div className="owner-header__title">
          <p className="mini-label">店主控制台</p>
          <h1>我的酒馆控制台</h1>
          <p className="note muted owner-header__note">
            店主身份：<code>{ownerLabel}</code>
          </p>
        </div>
        <div className="owner-header__actions">
          <button className="secondary" onClick={refreshOwnerData} disabled={loading || chatLoading}>
            {loading || chatLoading ? '刷新中...' : '刷新列表'}
          </button>
          {onClose ? (
            <button className="secondary" onClick={onClose}>返回</button>
          ) : null}
          <button className="secondary" onClick={openPackageImport} disabled={packageBusy === 'import'}>
            {packageBusy === 'import' ? '导入中...' : '导入酒馆包'}
          </button>
          <input
            ref={packageInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handlePackageFileChange}
          />
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + 创建新酒馆
          </button>
        </div>
      </header>

      {packageStatus ? (
        <div className="owner-package-status panel">{packageStatus}</div>
      ) : null}

      <OwnerSectionNav
        sections={ownerSections}
        activeSection={ownerSection}
        onChange={setOwnerSection}
      />

      {ownerSection === 'overview' && (
        <>
          <section className="owner-overview" aria-label="我的酒馆摘要">
            <article className="owner-overview-item">
              <span className="mini-label">全部酒馆</span>
              <strong>{ownerStats.total}</strong>
              <p>当前身份拥有的酒馆数量</p>
            </article>
            <article className="owner-overview-item">
              <span className="mini-label">营业中</span>
              <strong>{ownerStats.open}</strong>
              <p>{ownerStats.closed} 间正在歇业</p>
            </article>
            <article className="owner-overview-item">
              <span className="mini-label">角色 / 世界书</span>
              <strong>{ownerStats.characters} / {ownerStats.worldInfo}</strong>
              <p>NPC 与背景设定条目</p>
            </article>
            <article className="owner-overview-item">
              <span className="mini-label">AI 消耗</span>
              <strong>{ownerStats.tokens > 0 ? ownerStats.tokens.toLocaleString() : '—'}</strong>
              <p>来自已记录的 AI 对话</p>
            </article>
          </section>
          <OwnerNextActionPanel
            ownerStats={ownerStats}
            visitorStats={visitorStats}
            chatStats={chatStats}
            onCreate={() => setShowCreate(true)}
            onOpenSection={setOwnerSection}
          />
        </>
      )}

      {ownerSection === 'ai' && (
        <TokenUsagePanel
          tokenStats={tokenStats}
          onManageLlm={openLlmEdit}
        />
      )}

      {ownerSection === 'visitors' && (
        <>
          <OwnerChatActivityPanel
            sessions={chatSessions}
            stats={chatStats}
            loading={chatLoading}
            error={chatError}
            onRefresh={fetchOwnerChatSessions}
            onOpenSession={openChatSessionDetail}
          />

          <OwnerChatSearchPanel
            taverns={myTaverns}
            selectedTavernId={chatSearchTavernId}
            query={chatSearchQuery}
            results={chatSearchResults}
            loading={chatSearchLoading}
            error={chatSearchError}
            status={chatSearchStatus}
            onSelectTavern={setChatSearchTavernId}
            onQueryChange={setChatSearchQuery}
            onSearch={runChatSearch}
            onOpenResult={openChatSearchResult}
            resolveSession={resolveChatSearchSession}
          />

          <OwnerVisitorStatePanel
            visitors={visitorStates}
            stats={visitorStats}
            loading={visitorLoading}
            error={visitorError}
            onRefresh={() => fetchOwnerVisitorStates(myTaverns)}
            onOpenVisitorSessions={openVisitorLatestSession}
            onOpenVisitorMemory={openVisitorMemoryModal}
          />
        </>
      )}

      {ownerSection === 'taverns' && (
        <OwnerTavernManagementSection
          loading={loading}
          error={error}
          myTaverns={myTaverns}
          filteredTaverns={filteredTaverns}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          accessFilter={accessFilter}
          hasActiveFilters={hasActiveFilters}
          packageBusy={packageBusy}
          onSearchQueryChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onAccessFilterChange={setAccessFilter}
          onClearFilters={clearFilters}
          onCreate={() => setShowCreate(true)}
          onEdit={handleEditTavern}
          onToggleStatus={handleToggleStatus}
          onManageLlm={openLlmEdit}
          onManageCharacters={setCharacterManagerTavern}
          onManageWorldBook={setWorldBookTavern}
          onManageOutputRules={setOutputRulesTavern}
          onManagePromptBlocks={setPromptBlocksTavern}
          onManagePresets={setPresetManagerTavern}
          onManageGroupSettings={setGroupSettingsTavern}
          onManageGameplay={setGameplayManagerTavern}
          onExportPackage={handleExportPackage}
          onDelete={(tavern) => setDeleteTarget(tavern.id)}
        />
      )}

      {ownerSection === 'advanced' && (
        <OwnerAdvancedToolPanel
          taverns={myTaverns}
          packageBusy={packageBusy}
          onCreate={() => setShowCreate(true)}
          onImportPackage={openPackageImport}
          onManageLlm={openLlmEdit}
          onManageCharacters={setCharacterManagerTavern}
          onManageWorldBook={setWorldBookTavern}
          onManageOutputRules={setOutputRulesTavern}
          onManagePromptBlocks={setPromptBlocksTavern}
          onManagePresets={setPresetManagerTavern}
          onManageGroupSettings={setGroupSettingsTavern}
          onManageGameplay={setGameplayManagerTavern}
          onExportPackage={handleExportPackage}
        />
      )}

      {characterManagerTavern && (
        <CharacterManagementModal
          tavern={characterManagerTavern}
          ownerId={ownerId}
          onClose={() => setCharacterManagerTavern(null)}
          onCharactersChanged={(chars) => handleCharactersUpdated({ ...characterManagerTavern, characters: chars })}
        />
      )}

      {worldBookTavern && (
        <WorldBookEditor
          tavern={worldBookTavern}
          ownerId={ownerId}
          onClose={() => setWorldBookTavern(null)}
          onWorldInfoChanged={handleWorldInfoUpdated}
        />
      )}

      {outputRulesTavern && (
        <OutputRulesEditor
          tavern={outputRulesTavern}
          ownerId={ownerId}
          onClose={() => setOutputRulesTavern(null)}
          onRulesChanged={handleOutputRulesUpdated}
        />
      )}

      {promptBlocksTavern && (
        <PromptBlockEditor
          tavern={promptBlocksTavern}
          ownerId={ownerId}
          onClose={() => setPromptBlocksTavern(null)}
          onBlocksChanged={handlePromptBlocksUpdated}
        />
      )}

      {presetManagerTavern && (
        <PresetManager
          tavern={presetManagerTavern}
          ownerId={ownerId}
          onClose={() => setPresetManagerTavern(null)}
          onPresetApplied={handlePresetApplied}
        />
      )}

      {groupSettingsTavern && (
        <TavernGroupSettingsModal
          tavern={groupSettingsTavern}
          ownerId={ownerId}
          onClose={() => setGroupSettingsTavern(null)}
          onSaved={handleGroupSettingsUpdated}
        />
      )}

      {gameplayManagerTavern && (
        <GameplayManager
          tavern={gameplayManagerTavern}
          ownerId={ownerId}
          onClose={() => setGameplayManagerTavern(null)}
          onUpdated={handleGameplayUpdated}
        />
      )}

      {chatDetailSession && (
        <OwnerChatDetailModal
          session={chatDetailSession}
          messages={chatDetailMessages}
          loading={chatDetailLoading}
          error={chatDetailError}
          exportText={chatExportText}
          exportLoading={chatExportLoading}
          exportStatus={chatExportStatus}
          onClose={closeChatSessionDetail}
          onRefresh={refreshChatSessionDetail}
          onGenerateExport={generateChatExportText}
          onCopyExport={copyChatExportText}
        />
      )}

      {/* Visitor Memory Modal */}
      {memoryModalVisitor && (
        <OwnerVisitorMemoryModal
          visitor={memoryModalVisitor}
          atoms={memoryModalAtoms}
          loading={memoryModalLoading}
          error={memoryModalError}
          onClose={closeMemoryModal}
          onPin={(id, pinned) => {
            togglePinMemory(memoryModalVisitor.tavern_id, id, pinned, ownerId)
              .then(() => setMemoryModalAtoms(prev => prev.map(m => m.id === id ? { ...m, pinned } : m)))
              .catch(err => alert('固定失败：' + err.message))
          }}
          onDelete={(id) => {
            deleteMemoryAtom(memoryModalVisitor.tavern_id, id, ownerId)
              .then(() => setMemoryModalAtoms(prev => prev.filter(m => m.id !== id)))
              .catch(err => alert('删除失败：' + err.message))
          }}
        />
      )}

      {/* LLM Config Modal */}
      {editingLlmTavern && (
        <div className="modal-overlay" onClick={closeLlmEdit}>
          <div className="modal-content panel llm-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>AI 配置 — {editingLlmTavern.name}</h3>
              <button className="close-btn" onClick={closeLlmEdit}>&times;</button>
            </header>
            <div className="llm-modal-body">
              <p className="form-hint" style={{ marginBottom: 12 }}>
                保存 API Key 后，酒馆将变为"营业中"状态，访客可以和 AI NPC 对话了。
              </p>
              <LLMConfigForm
                value={llmFormData || {}}
                onChange={(cfg) => { setLlmFormData(cfg); setLlmSaveResult(null) }}
                compact={false}
                tavernId={editingLlmTavern.id}
              />
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={closeLlmEdit}>取消</button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleSaveLlm}
                  disabled={savingLlm}
                >
                  {savingLlm ? '保存中...' : '保存 AI 配置'}
                </button>
              </div>
              {llmSaveResult && (
                <div className={`llm-save-result ${llmSaveResult.ok ? 'ok' : 'error'}`}>
                  {llmSaveResult.message}
                </div>
              )}

              {/* Voice Config Section */}
              <VoiceConfigSection
                tavernId={editingLlmTavern.id}
                ownerId={ownerId}
                onSave={(voiceConfig) => {
                  setMyTaverns(prev => prev.map(t =>
                    t.id === editingLlmTavern.id ? { ...t, voice_config: voiceConfig } : t
                  ))
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content panel delete-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>确认删除酒馆</h3>
              <button className="close-btn" onClick={() => setDeleteTarget(null)}>&times;</button>
            </header>
            <p className="delete-warning">
              删除酒馆将清除所有角色和对话记录。此操作不可恢复。
            </p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" className="btn-danger" onClick={() => handleDelete(deleteTarget)}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OwnerTavernManagementSection({
  loading,
  error,
  myTaverns,
  filteredTaverns,
  searchQuery,
  statusFilter,
  accessFilter,
  hasActiveFilters,
  packageBusy,
  onSearchQueryChange,
  onStatusFilterChange,
  onAccessFilterChange,
  onClearFilters,
  onCreate,
  onEdit,
  onToggleStatus,
  onManageLlm,
  onManageCharacters,
  onManageWorldBook,
  onManageOutputRules,
  onManagePromptBlocks,
  onManagePresets,
  onManageGroupSettings,
  onManageGameplay,
  onExportPackage,
  onDelete,
}) {
  return (
    <section className="owner-section-panel" aria-label="酒馆管理">
      <div className="owner-section-heading">
        <div>
          <p className="mini-label">酒馆</p>
          <h2>基础信息、营业状态与公开入口</h2>
          <p className="note muted">常用经营动作放在这里；角色、世界书和护栏也可以从每张酒馆卡片进入。</p>
        </div>
        <button className="btn-primary" type="button" onClick={onCreate}>+ 创建新酒馆</button>
      </div>

      <section className="owner-filters" aria-label="酒馆筛选">
        <label className="owner-search">
          <span className="mini-label">搜索酒馆</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="按名称、描述、场景或角色搜索"
          />
        </label>
        <label>
          <span className="mini-label">营业状态</span>
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>{filter.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mini-label">访问权限</span>
          <select value={accessFilter} onChange={(event) => onAccessFilterChange(event.target.value)}>
            {ACCESS_FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>{filter.label}</option>
            ))}
          </select>
        </label>
        <div className="owner-filter-summary">
          <strong>{filteredTaverns.length}</strong>
          <span> / {myTaverns.length} 间可见</span>
          {hasActiveFilters ? (
            <button type="button" className="button-link" onClick={onClearFilters}>清除筛选</button>
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="owner-loading panel">正在读取酒馆数据...</div>
      ) : error ? (
        <div className="owner-error panel">读取失败: {error}</div>
      ) : myTaverns.length === 0 ? (
        <div className="owner-empty panel">
          <div className="empty-icon">🏚️</div>
          <p>你还没有创建任何酒馆。现在就开始你的店主生涯吧！</p>
          <button className="button-link" onClick={onCreate}>立即创建</button>
        </div>
      ) : filteredTaverns.length === 0 ? (
        <div className="owner-empty panel">
          <div className="empty-icon">🔎</div>
          <p>当前筛选没有匹配的酒馆。</p>
          <button className="button-link" onClick={onClearFilters}>清除筛选</button>
        </div>
      ) : (
        <div className="owner-list">
          {filteredTaverns.map(tavern => (
            <TavernCard
              key={tavern.id}
              tavern={tavern}
              metrics={tavernMetrics[tavern.id]}
              onEdit={() => onEdit(tavern)}
              onToggleStatus={() => onToggleStatus(tavern)}
              onManageLlm={() => onManageLlm(tavern)}
              onManageCharacters={() => onManageCharacters(tavern)}
              onManageWorldBook={() => onManageWorldBook(tavern)}
              onManageOutputRules={() => onManageOutputRules(tavern)}
              onManagePromptBlocks={() => onManagePromptBlocks(tavern)}
              onManagePresets={() => onManagePresets(tavern)}
              onManageGroupSettings={() => onManageGroupSettings(tavern)}
              onManageGameplay={() => onManageGameplay(tavern)}
              onExportPackage={() => onExportPackage(tavern)}
              packageBusy={packageBusy === `export:${tavern.id}`}
              onDelete={() => onDelete(tavern)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TokenUsagePanel({ tokenStats, onManageLlm }) {
  const rows = tokenStats.rows.slice(0, 8)
  const hasUsage = tokenStats.total > 0

  return (
    <section className="owner-token-panel panel" aria-label="AI 消耗统计面板">
      <div className="owner-token-panel__header">
        <div>
          <p className="mini-label">AI 消耗</p>
          <h2>模型使用量</h2>
          <p className="note muted">
            统计来自酒馆聊天记录的模型用量，用于店主观察成本趋势。
          </p>
        </div>
        <div className="owner-token-total">
          <span>累计</span>
          <strong>{formatTokens(tokenStats.total)}</strong>
          <small>用量单位</small>
        </div>
      </div>

      <div className="owner-token-summary">
        <div>
          <span className="mini-label">平均每馆</span>
          <strong>{formatTokens(tokenStats.average)}</strong>
        </div>
        <div>
          <span className="mini-label">已有消耗</span>
          <strong>{tokenStats.usedCount}</strong>
        </div>
        <div>
          <span className="mini-label">尚未消耗</span>
          <strong>{tokenStats.unusedCount}</strong>
        </div>
        <div>
          <span className="mini-label">最高消耗</span>
          <strong>{tokenStats.topTavernName || '—'}</strong>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="owner-token-empty">创建酒馆后，这里会显示每间酒馆的 AI 使用量。</div>
      ) : (
        <div className="owner-token-list">
          {rows.map(({ tavern, tokens, backend, model }) => {
            const percent = tokenStats.topTokens ? Math.round((tokens / tokenStats.topTokens) * 100) : 0
            return (
              <article key={tavern.id} className="owner-token-row">
                <div className="owner-token-row__main">
                  <div>
                    <strong>{tavern.name}</strong>
                    <span>{backend} · {model}</span>
                  </div>
                  <div className="owner-token-row__usage">
                    <strong>{formatTokens(tokens)}</strong>
                    <small>{hasUsage ? `${percent}%` : '未使用'}</small>
                  </div>
                </div>
                <div className="owner-token-bar" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <div className="owner-token-row__footer">
                  <span>{tavern.status === 'open' ? '营业中' : '歇业中'}</span>
                  <button type="button" className="button-link" onClick={() => onManageLlm(tavern)}>
                    AI 配置
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function OwnerChatDetailModal({
  session,
  messages,
  loading,
  error,
  exportText,
  exportLoading,
  exportStatus,
  onClose,
  onRefresh,
  onGenerateExport,
  onCopyExport,
}) {
  const visitorLabel = getSessionVisitorLabel(session)
  const transcript = exportText || buildChatTranscript(session, messages)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content panel owner-chat-detail-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header owner-chat-detail-header">
          <div>
            <p className="mini-label">会话详情</p>
            <h3>{visitorLabel} ↔ {session.character_name || '未知角色'}</h3>
            <p className="note muted">
              {session.tavern_name || '未知酒馆'} · {session.message_count || messages.length || 0} 条消息 · {formatChatTimestamp(session.updated_at)}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        <div className="owner-chat-detail-actions">
          <button type="button" className="secondary" onClick={onRefresh} disabled={loading}>
            {loading ? '刷新中...' : '刷新历史'}
          </button>
          <button type="button" className="secondary" onClick={onGenerateExport} disabled={exportLoading || loading}>
            {exportLoading ? '生成中...' : '生成导出文本'}
          </button>
          <button type="button" className="primary" onClick={onCopyExport} disabled={!transcript}>
            复制导出
          </button>
        </div>

        {error ? (
          <div className="owner-chat-detail-empty is-error">读取会话失败：{error}</div>
        ) : loading ? (
          <div className="owner-chat-detail-empty">正在读取完整聊天历史...</div>
        ) : messages.length === 0 ? (
          <div className="owner-chat-detail-empty">这条会话暂时没有可展示的消息。</div>
        ) : (
          <div className="owner-chat-detail-list">
            {messages.map((message, index) => {
              const role = message.role === 'assistant' ? 'assistant' : (message.role === 'system' ? 'system' : 'user')
              const speaker = getChatMessageSpeaker(message, session)
              return (
                <article key={message.id || `${role}-${index}`} className={`owner-chat-detail-message is-${role}`}>
                  <div className="owner-chat-detail-message__meta">
                    <strong>{speaker}</strong>
                    <time>{formatChatTimestamp(message.timestamp)}</time>
                  </div>
                  <p>{message.content}</p>
                </article>
              )
            })}
          </div>
        )}

        <label className="owner-chat-export">
          <span className="mini-label">导出预览</span>
          <textarea readOnly value={transcript} placeholder="点击“生成导出文本”，或直接复制当前历史预览。" rows={8} />
        </label>
        {exportStatus ? <p className="note muted owner-chat-export-status">{exportStatus}</p> : null}
      </div>
    </div>
  )
}

function OwnerChatActivityPanel({ sessions, stats, loading, error, onRefresh, onOpenSession }) {
  const rows = sessions.slice(0, 8)

  return (
    <section className="owner-chat-panel panel" aria-label="访客会话反馈">
      <div className="owner-chat-panel__header">
        <div>
          <p className="mini-label">访客反馈</p>
          <h2>最近对话会话</h2>
          <p className="note muted">
            来自酒馆聊天历史的会话摘要，帮助店主观察访客回访与 NPC 互动情况。
          </p>
        </div>
        <button type="button" className="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? '刷新中...' : '刷新会话'}
        </button>
      </div>

      <div className="owner-chat-summary">
        <div>
          <span className="mini-label">会话数</span>
          <strong>{stats.sessions}</strong>
        </div>
        <div>
          <span className="mini-label">访客数</span>
          <strong>{stats.visitors}</strong>
        </div>
        <div>
          <span className="mini-label">消息数</span>
          <strong>{stats.messages}</strong>
        </div>
      </div>

      {error ? (
        <div className="owner-chat-empty is-error">读取会话失败：{error}</div>
      ) : loading ? (
        <div className="owner-chat-empty">正在读取访客会话...</div>
      ) : rows.length === 0 ? (
        <div className="owner-chat-empty">还没有访客对话。开放酒馆后，这里会显示最近的 NPC 互动。</div>
      ) : (
        <div className="owner-chat-list">
          {rows.map((session) => {
            const visitorLabel = session.visitor_name || (session.visitor_id ? session.visitor_id.slice(0, 16) : '匿名访客')
            const lastMessage = session.last_message || '暂无消息预览'
            return (
              <article
                key={`${session.tavern_id}-${session.visitor_id}-${session.character_id}`}
                className="owner-chat-row"
              >
                <div className="owner-chat-row__meta">
                  <div>
                    <strong>{visitorLabel}</strong>
                    <span>{session.tavern_name || '未知酒馆'} · {session.character_name || '未知角色'}</span>
                  </div>
                  <time>{formatChatTimestamp(session.updated_at)}</time>
                </div>
                <p>{session.last_role === 'assistant' ? 'NPC' : '访客'}：{lastMessage}</p>
                <div className="owner-chat-row__footer">
                  <span>{session.message_count || 0} 条消息</span>
                  <button type="button" className="button-link" onClick={() => onOpenSession?.(session)}>
                    查看历史
                  </button>
                  {session.visitor_id && !session.visitor_name ? (
                    <small>{session.visitor_id.slice(0, 18)}</small>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function OwnerChatSearchPanel({
  taverns,
  selectedTavernId,
  query,
  results,
  loading,
  error,
  status,
  onSelectTavern,
  onQueryChange,
  onSearch,
  onOpenResult,
  resolveSession,
}) {
  const hasTaverns = taverns.length > 0

  return (
    <section className="owner-chat-search-panel panel" aria-label="会话关键词搜索">
      <div className="owner-chat-search-panel__header">
        <div>
          <p className="mini-label">会话检索</p>
          <h2>搜索访客消息</h2>
          <p className="note muted">
            在单个酒馆的聊天历史中查找关键词，便于回看高价值反馈或问题线索。
          </p>
        </div>
      </div>

      <form className="owner-chat-search-form" onSubmit={onSearch}>
        <label>
          <span className="mini-label">酒馆</span>
          <select
            value={selectedTavernId}
            onChange={(event) => onSelectTavern(event.target.value)}
            disabled={!hasTaverns || loading}
          >
            {hasTaverns ? taverns.map((tavern) => (
              <option key={tavern.id} value={tavern.id}>{tavern.name || tavern.id}</option>
            )) : (
              <option value="">暂无酒馆</option>
            )}
          </select>
        </label>
        <label className="owner-chat-search-form__query">
          <span className="mini-label">关键词</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="例如：价格、BUG、喜欢的角色..."
            disabled={!hasTaverns || loading}
          />
        </label>
        <button type="submit" className="primary" disabled={!hasTaverns || loading}>
          {loading ? '搜索中...' : '搜索聊天'}
        </button>
      </form>

      {error ? <div className="owner-chat-search-status is-error">搜索失败：{error}</div> : null}
      {!error && status ? <div className="owner-chat-search-status">{status}</div> : null}

      {results.length > 0 ? (
        <div className="owner-chat-search-results">
          {results.map((result) => {
            const message = result.message || {}
            const session = resolveSession?.(message) || {}
            const visitorLabel = getSessionVisitorLabel(session)
            const speaker = getChatMessageSpeaker(message, session)
            return (
              <article
                key={`${message.tavern_id}-${message.visitor_id}-${message.character_id}-${result.index}`}
                className="owner-chat-search-result"
              >
                <div className="owner-chat-search-result__meta">
                  <div>
                    <strong>{speaker}</strong>
                    <span>{session.tavern_name || '未知酒馆'} · {visitorLabel} · {session.character_name || '未知角色'}</span>
                  </div>
                  <time>{formatChatTimestamp(message.timestamp)}</time>
                </div>
                <p>{message.content || '空消息'}</p>
                <div className="owner-chat-search-result__footer">
                  <span>匹配序号 #{Number(result.index || 0) + 1}</span>
                  <button type="button" className="button-link" onClick={() => onOpenResult?.(result)}>
                    打开会话
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function OwnerVisitorStatePanel({ visitors, stats, loading, error, onRefresh, onOpenVisitorSessions, onOpenVisitorMemory }) {
  const rows = visitors.slice(0, 8)

  return (
    <section className="owner-visitor-panel panel" aria-label="访客回访状态">
      <div className="owner-visitor-panel__header">
        <div>
          <p className="mini-label">回访状态</p>
          <h2>访客关系与回访</h2>
          <p className="note muted">
            来自入场记录和聊天记忆，用来观察哪些访客正在形成持续关系。
          </p>
        </div>
        <button type="button" className="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? '刷新中...' : '刷新访客'}
        </button>
      </div>

      <div className="owner-visitor-summary">
        <div>
          <span className="mini-label">访客</span>
          <strong>{stats.visitors}</strong>
        </div>
        <div>
          <span className="mini-label">访问</span>
          <strong>{stats.visits}</strong>
        </div>
        <div>
          <span className="mini-label">回访者</span>
          <strong>{stats.returningVisitors}</strong>
        </div>
        <div>
          <span className="mini-label">已对话</span>
          <strong>{stats.engagedVisitors}</strong>
        </div>
      </div>

      {error ? (
        <div className="owner-visitor-empty is-error">读取访客状态失败：{error}</div>
      ) : loading ? (
        <div className="owner-visitor-empty">正在读取访客状态...</div>
      ) : rows.length === 0 ? (
        <div className="owner-visitor-empty">还没有可展示的访客状态。访客进入酒馆后，这里会开始记录回访。</div>
      ) : (
        <div className="owner-visitor-list">
          {rows.map((visitor) => {
            const rel = visitor.relationship || {}
            const strength = Number(rel.strength || 0)
            const percent = Math.max(0, Math.min(100, Math.round(strength * 100)))
            const visitorLabel = visitor.visitor_name || (visitor.visitor_id ? visitor.visitor_id.slice(0, 16) : '匿名访客')
            return (
              <article
                key={`${visitor.tavern_id}-${visitor.visitor_id}`}
                className="owner-visitor-row"
              >
                <div className="owner-visitor-row__main">
                  <div>
                    <strong>{visitorLabel}</strong>
                    <span>{visitor.tavern_name || '未知酒馆'} · {formatRelationshipStage(rel.stage)}</span>
                  </div>
                  <div className="owner-visitor-row__visits">
                    <strong>{visitor.visit_count || 0}</strong>
                    <small>次访问</small>
                  </div>
                </div>
                <div className="owner-visitor-bar" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <div className="owner-visitor-row__footer">
                  <span>{visitor.message_count || 0} 条消息</span>
                  {Number(visitor.message_count || 0) > 0 ? (
                    <button type="button" className="button-link" onClick={() => onOpenVisitorSessions?.(visitor)}>
                      查看会话
                    </button>
                  ) : null}
                  <button type="button" className="button-link" onClick={() => onOpenVisitorMemory?.(visitor)}>
                    查看记忆
                  </button>
                  <time>{formatChatTimestamp(visitor.last_visit)}</time>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function TavernCard({
  tavern,
  metrics,
  onEdit,
  onToggleStatus,
  onManageLlm,
  onManageCharacters,
  onManageWorldBook,
  onManageOutputRules,
  onManagePromptBlocks,
  onManagePresets,
  onManageGroupSettings,
  onManageGameplay,
  onExportPackage,
  packageBusy,
  onDelete,
}) {
  const isOpen = tavern.status === 'open'
  const tokenUsed = metrics?.total_tokens || getTavernTokenUsage(tavern)
  const totalVisits = metrics?.total_visits || 0
  const totalMessages = metrics?.total_messages || 0
  const npcRankings = metrics?.top_characters || []
  const statusColor = getTavernStatusColor(tavern?.status)
  const charCount = tavern?.characters?.length || 0
  const worldInfoCount = tavern?.world_info?.length || 0
  const promptBlockCount = tavern?.prompt_blocks?.length || 0
  const presetCount = tavern?.runtime_presets?.length || 0
  const gameplayCount = tavern?.gameplay_definitions?.length || 0
  const groupEnabled = Boolean(tavern?.group_chat_enabled)

  return (
    <div className={`tavern-card panel ${!isOpen ? 'is-closed' : ''}`}>
      <div className="tavern-card__header">
        <div className="tavern-card__info">
          <h3>
            {getTavernAccessIcon(tavern.access)} {tavern.name}
          </h3>
          <p className="note muted">{tavern.description || '无描述'}</p>
        </div>
        <div className="status-badge-row">
          <span className={`status-badge ${tavern.status}`} style={{ borderColor: `${statusColor}55` }}>
            <span className={`dot ${isOpen ? 'ok' : ''}`}></span>
            {getTavernStatusLabel(tavern.status)}
          </span>
          <span className="char-count-badge">{charCount} 角色</span>
          <span className="char-count-badge">{worldInfoCount} 世界书</span>
          <span className="char-count-badge">{promptBlockCount || '默认'} 段落</span>
          <span className="char-count-badge">{presetCount || '内置'} 预设</span>
          <span className="char-count-badge">{gameplayCount || '未设'} 玩法</span>
          <span className={`char-count-badge ${groupEnabled ? 'is-on' : ''}`}>{groupEnabled ? '群聊开' : '群聊关'}</span>
        </div>
      </div>

      <div className="tavern-card__metrics">
        <div className="owner-metric">
          <span className="mini-label">AI 消耗</span>
          <strong>{tokenUsed > 0 ? formatTokens(tokenUsed) : '—'}</strong>
        </div>
        <div className="owner-metric">
          <span className="mini-label">访问</span>
          <strong>{totalVisits > 0 ? `${totalVisits} 次` : '—'}</strong>
        </div>
        <div className="owner-metric">
          <span className="mini-label">消息</span>
          <strong>{totalMessages > 0 ? `${totalMessages} 条` : '—'}</strong>
        </div>
        <div className="owner-metric">
          <span className="mini-label">访问权限</span>
          <strong>{getTavernAccessIcon(tavern.access)} {getTavernAccessLabel(tavern.access)}</strong>
        </div>
        <div className="owner-metric">
          <span className="mini-label">语音</span>
          <strong>{tavern.voice_config?.enabled ? '🔊 启用' : '—'}</strong>
        </div>
        <div className="owner-metric">
          <span className="mini-label">坐标</span>
          <strong>{formatCoordinate(tavern.lat)}, {formatCoordinate(tavern.lon)}</strong>
        </div>
      </div>

      {npcRankings.length > 0 && (
        <div className="tavern-card__npc-rankings">
          <span className="mini-label">NPC 互动排行</span>
          <div className="npc-ranking-list">
            {npcRankings.slice(0, 5).map((npc, idx) => (
              <div key={npc.character_id} className="npc-ranking-item">
                <span className="ranking-number">{idx + 1}</span>
                <span className="npc-name">{npc.character_name}</span>
                <span className="npc-messages">{npc.message_count} 条消息</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tavern-card__actions">
        <button className="secondary" onClick={onManageLlm}>AI 配置</button>
        <button className="secondary" onClick={onManageCharacters}>角色</button>
        <button className="secondary" onClick={onManageWorldBook}>世界书</button>
        <button className="secondary" onClick={onManagePromptBlocks}>段落</button>
        <button className="secondary" onClick={onManagePresets}>预设</button>
        <button className="secondary" onClick={onManageGameplay}>玩法</button>
        <button className="secondary" onClick={onManageGroupSettings}>群聊</button>
        <button className="secondary" onClick={onManageOutputRules}>护栏</button>
        <button className="secondary" onClick={onExportPackage} disabled={packageBusy}>
          {packageBusy ? '导出中...' : '导出包'}
        </button>
        <button className="secondary" onClick={onEdit}>编辑</button>
        <button className={isOpen ? 'secondary' : ''} onClick={onToggleStatus}>
          {isOpen ? '歇业' : '开放'}
        </button>
        <button className="btn-danger-ghost" onClick={onDelete}>删除</button>
      </div>
    </div>
  )
}

function TavernEditModal({ tavern, onSave, onClose }) {
  const [form, setForm] = useState({
    name: tavern.name,
    description: tavern.description,
    access: tavern.access,
    scene_prompt: tavern.scene_prompt,
    llm_config: tavern.llm_config || {},
  })

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content panel edit-modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h3>编辑酒馆: {tavern.name}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-grid">
            <div className="form-main">
              <div className="form-group">
                <label>酒馆名称</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                />
              </div>
              <div className="form-group">
                <label>酒馆描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>访问权限</label>
                <select
                  value={form.access}
                  onChange={e => setForm(f => ({...f, access: e.target.value}))}
                >
                  <option value="public">公开 — 任何人都能进入</option>
                  <option value="password">密码 — 需要密码才能进入</option>
                  <option value="private">私人 — 仅自己可用</option>
                </select>
              </div>
              <div className="form-group">
                <label>场景氛围（给 AI 的剧情指令）</label>
                <textarea
                  value={form.scene_prompt}
                  onChange={e => setForm(f => ({...f, scene_prompt: e.target.value}))}
                  rows={4}
                  placeholder="描述酒馆的环境、气氛，帮助 AI 更好入戏"
                />
              </div>
            </div>

            <div className="form-side">
              <div className="form-group">
                <label>AI 配置</label>
                <LLMConfigForm
                  value={form.llm_config}
                  onChange={cfg => setForm(f => ({...f, llm_config: cfg}))}
                  compact={true}
                  tavernId={tavern.id}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>取消</button>
            <button type="submit" className="primary">保存修改</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Voice Config Section ─────────────────────────────────────────────────────

function VoiceConfigSection({ tavernId, ownerId = '', onSave }) {
  const [config, setConfig] = useState({
    enabled: false,
    tts_provider: 'elevenlabs',
    tts_voice: '',
    tts_speed: 1.0,
    auto_play: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)

  // Load voice config on mount
  useEffect(() => {
    if (!tavernId) return
    setLoading(true)
    getVoiceConfig(tavernId, ownerId).then((data) => {
      setConfig(data.voice_config || {
        enabled: false,
        tts_provider: 'elevenlabs',
        tts_voice: '',
        tts_speed: 1.0,
        auto_play: false,
      })
    }).catch(() => {
      // Use defaults on error
    }).finally(() => setLoading(false))
  }, [tavernId, ownerId])

  async function handleSave() {
    if (!tavernId) return
    setSaving(true)
    setResult(null)
    try {
      await saveVoiceConfig(tavernId, config, ownerId)
      setResult({ ok: true, message: '语音配置已保存' })
      if (onSave) onSave(config)
    } catch (err) {
      setResult({ ok: false, message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!tavernId) return
    setTesting(true)
    setResult(null)
    try {
      const audioBlob = await synthesizeVoice(tavernId, { text: '你好，这是语音测试' }, ownerId)
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      void audio.play()
      audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl), { once: true })
      setResult({ ok: true, message: '正在播放测试语音...' })
    } catch (err) {
      setResult({ ok: false, message: err.message })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <div className="voice-config-section loading">加载中...</div>
  }

  return (
    <div className="voice-config-section">
      <h4 style={{ marginTop: 16, marginBottom: 12 }}>语音设置 (TTS)</h4>

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={e => setConfig(c => ({ ...c, enabled: e.target.checked }))}
          />
          启用语音合成 (TTS)
        </label>
      </div>

      {config.enabled && (
        <>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>TTS 提供商</label>
            <select
              value={config.tts_provider}
              onChange={e => setConfig(c => ({ ...c, tts_provider: e.target.value, tts_voice: '' }))}
            >
              <option value="elevenlabs">ElevenLabs</option>
              <option value="openai_tts">OpenAI TTS</option>
              <option value="edge_tts">Edge TTS (免费)</option>
              <option value="silero">Silero (免费)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>语速</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={config.tts_speed}
              onChange={e => setConfig(c => ({ ...c, tts_speed: parseFloat(e.target.value) }))}
            />
            <span className="form-hint">{config.tts_speed.toFixed(1)}x</span>
          </div>

          <div className="form-group">
            <button
              type="button"
              className="secondary"
              onClick={handleTest}
              disabled={testing}
              style={{ marginRight: 8 }}
            >
              {testing ? '测试中...' : '🔊 测试语音'}
            </button>
            <button
              type="button"
              className="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存配置'}
            </button>
          </div>

          <p className="form-hint" style={{ marginTop: 8 }}>
            注：TTS 使用 AI 配置中的 API Key。免费提供商 (Edge/Silero) 无需 API Key。
          </p>
        </>
      )}

      {result && (
        <div className={`llm-save-result ${result.ok ? 'ok' : 'error'}`} style={{ marginTop: 12 }}>
          {result.message}
        </div>
      )}
    </div>
  )
}

// ─── Owner Visitor Memory Modal ───────────────────────────────────────────────

const DIMENSION_LABELS_OWNER = {
  fact: '事实',
  emotion: '情感',
  event: '事件',
  preference: '偏好',
  promise: '承诺',
}

const DIMENSION_COLORS_OWNER = {
  fact: '#4a9eff',
  emotion: '#ff6b9d',
  event: '#ffd166',
  preference: '#06d6a0',
  promise: '#c77dff',
}

const HORIZON_LABELS_OWNER = { short: '短期', mid: '中期', long: '长期' }

function formatMemoryTimeOwner(value) {
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

function OwnerVisitorMemoryModal({ visitor, atoms, loading, error, onClose, onPin, onDelete }) {
  const [filterDim, setFilterDim] = useState('all')

  const visitorLabel = visitor.visitor_name || (visitor.visitor_id ? visitor.visitor_id.slice(0, 16) : '匿名访客')

  const dimTabs = ['all', 'fact', 'emotion', 'event', 'preference', 'promise']

  const grouped = useMemo(() => {
    const filtered = filterDim === 'all'
      ? atoms
      : atoms.filter(m => m.dimension === filterDim)

    const groups = {}
    filtered.forEach(atom => {
      const dim = atom.dimension || 'fact'
      if (!groups[dim]) groups[dim] = []
      groups[dim].push(atom)
    })
    return groups
  }, [atoms, filterDim])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content panel owner-memory-modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="mini-label">访客记忆</p>
            <h3>{visitorLabel} 的结构化记忆</h3>
            <p className="note muted">
              {visitor.tavern_name || '未知酒馆'} · {atoms.length} 条记忆
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        {error && <div className="owner-chat-detail-empty is-error">加载失败：{error}</div>}
        {loading && <div className="owner-chat-detail-empty">正在加载记忆...</div>}

        {!loading && !error && (
          <>
            <div className="memory-dim-tabs" role="tablist" style={{ marginBottom: 12 }}>
              {dimTabs.map(d => (
                <button
                  key={d}
                  role="tab"
                  aria-selected={filterDim === d}
                  className={`memory-dim-tab ${filterDim === d ? 'active' : ''}`}
                  onClick={() => setFilterDim(d)}
                >
                  {d === 'all' ? '全部' : DIMENSION_LABELS_OWNER[d] || d}
                  {d !== 'all' && atoms.filter(m => m.dimension === d).length > 0 && (
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>
                      ({atoms.filter(m => m.dimension === d).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {atoms.length === 0 ? (
              <p className="owner-chat-detail-empty">该访客还没有结构化记忆。访客与 NPC 聊天后，系统会自动创建记忆。</p>
            ) : Object.keys(grouped).length === 0 ? (
              <p className="owner-chat-detail-empty">该分类下没有记忆。</p>
            ) : (
              <div className="owner-memory-modal-list">
                {Object.entries(grouped).map(([dim, dimAtoms]) => {
                  const color = DIMENSION_COLORS_OWNER[dim] || '#888'
                  return (
                    <div key={dim} className="owner-memory-modal-group">
                      <div className="owner-memory-modal-group__header">
                        <span
                          className="memory-badge"
                          style={{ background: color + '22', color }}
                        >
                          {DIMENSION_LABELS_OWNER[dim] || dim}
                        </span>
                        <span>{dimAtoms.length} 条</span>
                      </div>
                      {dimAtoms.map(atom => (
                        <article key={atom.id} className="owner-memory-atom-row">
                          <div className="owner-memory-atom-row__main">
                            <p>{atom.content}</p>
                            {atom.subject && (
                              <small>关于：{atom.subject}</small>
                            )}
                          </div>
                          <div className="owner-memory-atom-row__meta">
                            <span className="memory-horizon-tag">
                              {HORIZON_LABELS_OWNER[atom.horizon] || atom.horizon}
                            </span>
                            <span className={`visibility-badge visibility-${atom.visibility}`}>
                              {atom.visibility === 'owner' ? '店主可见' : atom.visibility === 'public' ? '公开' : '私有'}
                            </span>
                            {atom.pinned && <span>📌</span>}
                            <time>{formatMemoryTimeOwner(atom.updated_at || atom.created_at)}</time>
                          </div>
                          <div className="owner-memory-atom-row__actions">
                            <button
                              type="button"
                              className="button-link"
                              onClick={() => onPin(atom.id, !atom.pinned)}
                            >
                              {atom.pinned ? '取消固定' : '固定'}
                            </button>
                            <button
                              type="button"
                              className="button-link"
                              onClick={() => {
                                if (window.confirm('确定删除这条记忆？')) onDelete(atom.id)
                              }}
                              style={{ color: '#e74c3c' }}
                            >
                              删除
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
