import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { parseCharacterCard, extractCharacterCardPayloadFromPng } from './services/tavernService'
import { buildAiDraftLifecycle } from '../lib/ai-draft-lifecycle.js'
import {
  DIGITAL_HUMAN_DRAFT_FORBIDDEN,
  DIGITAL_HUMAN_DRAFT_STYLE_TAGS,
  DIGITAL_HUMAN_STUDIO_TYPE_ID,
} from '../lib/digital-human-studio.js'
import { deriveSpecialTavernTypeDisplay } from '../lib/special-tavern-types.js'
import { addCharacter, deleteCharacter, exportCharacterCard, generateCharacterDraft, importCharacterCard, listCharacters, updateCharacter } from '../lib/taverns'
import CharacterEditor, { createEmptyCharacterDraft, normalizeCharacterPayload } from './CharacterEditor'
import CharacterAvatar from './CharacterAvatar'
import CharacterLookSummary from './CharacterLookSummary'
import OwnerDialoguePreviewSimulator from './OwnerDialoguePreviewSimulator'
import SystemCharacterPresetPicker from './SystemCharacterPresetPicker'
import { createCharacterDraftFromPreset } from './systemCharacterPresets'
import {
  DEFAULT_AI_DRAFT_FORBIDDEN,
  DEFAULT_AI_DRAFT_STYLE_TAGS,
  createAiCharacterDraftRequest,
  describeCharacterDraftSource,
  draftResponseToEditorDraft,
} from './aiCharacterDrafts'
import {
  NPC_BATCH_IMPORT_EXAMPLE,
  parseNpcBatchInput,
} from './npcBatchImport'
import {
  analyzeCharacterPromptRisk,
  assertCharacterPromptRiskCanSave,
  formatPromptRiskBlockMessage,
} from './characterPromptRiskLinter.js'
import {
  buildCharacterCardImportPayload,
  buildCharacterCardImportTrustReport,
  createCharacterCardExportFilename,
} from './characterCardImportTrust.js'

/**
 * CharacterManagementModal — 空间角色管理面板
 *
 * 允许店主从空间添加、编辑、导入和删除角色。
 *
 * @param {object}   tavern        - 当前空间数据
 * @param {string}   ownerId       - 店主 ID
 * @param {Function} onClose       - () => void 关闭回调
 * @param {Function} onCharactersChanged - (characters) => void 角色变动回调（用于更新父组件）
 */
export default function CharacterManagementModal({ tavern, ownerId, onClose, onCharactersChanged }) {
  const specialTavernType = deriveSpecialTavernTypeDisplay(tavern || {})
  const isDigitalHumanStudio = specialTavernType?.id === DIGITAL_HUMAN_STUDIO_TYPE_ID
  const defaultAiDraftStyleTags = isDigitalHumanStudio ? DIGITAL_HUMAN_DRAFT_STYLE_TAGS : DEFAULT_AI_DRAFT_STYLE_TAGS
  const defaultAiDraftForbidden = isDigitalHumanStudio ? DIGITAL_HUMAN_DRAFT_FORBIDDEN : DEFAULT_AI_DRAFT_FORBIDDEN
  const [characters, setCharacters] = useState(tavern?.characters || [])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 编辑状态
  const [editingChar, setEditingChar] = useState(null)   // null=无, 'new'=新建, charObj=编辑现有
  const [editorDraft, setEditorDraft] = useState(null)
  const [editorError, setEditorError] = useState('')

  // 删除确认
  const [deletingCharId, setDeletingCharId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // 导入状态
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [pendingImport, setPendingImport] = useState(null)
  const fileInputRef = useRef(null)

  // 导出状态
  const [exportingCharId, setExportingCharId] = useState('')
  const [exportError, setExportError] = useState('')
  const [exportStatus, setExportStatus] = useState('')

  // AI 草稿状态（只生成编辑器草稿，保存仍走 addCharacter）
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState('')
  const [draftStatus, setDraftStatus] = useState('')
  const [aiDraftStyleText, setAiDraftStyleText] = useState(defaultAiDraftStyleTags.join(', '))
  const [aiDraftForbiddenText, setAiDraftForbiddenText] = useState(defaultAiDraftForbidden.join(', '))
  const [aiDraftTone, setAiDraftTone] = useState(isDigitalHumanStudio ? '访谈式、清晰、尊重授权、适合视频出镜' : '温暖、短句、有空间陪伴感')
  const characterDraftLifecycle = buildAiDraftLifecycle('character')

  // 批量背景 NPC：先预览，店主确认后才逐个走现有 addCharacter API
  const [batchInput, setBatchInput] = useState('')
  const [batchPreview, setBatchPreview] = useState([])
  const [batchSource, setBatchSource] = useState('')
  const [batchError, setBatchError] = useState('')
  const [batchStatus, setBatchStatus] = useState('')
  const [batchSaving, setBatchSaving] = useState(false)

  // 拉取最新角色列表
  async function refreshCharacters() {
    try {
      const result = await listCharacters(tavern.id, ownerId)
      const list = result?.characters || []
      setCharacters(list)
      if (onCharactersChanged) onCharactersChanged(list)
    } catch {
      // 静默失败，使用本地缓存
    }
  }

  // 点击「添加角色」→ 切换到新建模式
  function handleAddNew() {
    setPendingImport(null)
    setImportStatus('')
    setEditingChar('new')
    setEditorDraft(createEmptyCharacterDraft())
    setEditorError('')
  }

  function handleAddFromPreset(preset) {
    setPendingImport(null)
    setImportStatus('')
    setEditingChar('new')
    setEditorDraft({
      ...createEmptyCharacterDraft(),
      ...createCharacterDraftFromPreset(preset),
    })
    setEditorError('')
  }

  function handlePreviewBatchInput() {
    setBatchError('')
    setBatchStatus('')
    try {
      const parsed = parseNpcBatchInput(batchInput)
      setBatchPreview(parsed.characters)
      setBatchSource(parsed.source)
    } catch (err) {
      setBatchPreview([])
      setBatchSource('')
      setBatchError(err.message)
    }
  }

  function handleFillBatchExample() {
    setBatchInput(NPC_BATCH_IMPORT_EXAMPLE)
    setBatchPreview([])
    setBatchSource('')
    setBatchError('')
    setBatchStatus('已填入示例；点击“预览批量清单”后再确认创建。')
  }

  async function handleConfirmBatchImport() {
    if (batchPreview.length === 0) {
      handlePreviewBatchInput()
      return
    }
    setBatchSaving(true)
    setBatchError('')
    setBatchStatus('')
    try {
      batchPreview.forEach((draft) => assertCharacterPromptRiskCanSave(draft))
      const savedCharacters = []
      for (const draft of batchPreview) {
        const saved = await addCharacter(tavern.id, draft, ownerId)
        savedCharacters.push(saved)
      }
      const updated = [...characters, ...savedCharacters]
      setCharacters(updated)
      if (onCharactersChanged) onCharactersChanged(updated)
      setBatchInput('')
      setBatchPreview([])
      setBatchSource('')
      setBatchStatus(`已由店主确认创建 ${savedCharacters.length} 个背景 NPC；可继续逐个编辑精修。`)
    } catch (err) {
      if (err.report) {
        setBatchError(`批量创建被阻断：${formatPromptRiskBlockMessage(err.report)}`)
      } else {
        setBatchError(`批量创建失败：${err.message}`)
      }
    } finally {
      setBatchSaving(false)
    }
  }

  async function handleGenerateAiDraft() {
    setDrafting(true)
    setDraftError('')
    setDraftStatus('')
    setEditorError('')
    try {
      const response = await generateCharacterDraft(
        tavern.id,
        createAiCharacterDraftRequest({
          styleTagsText: aiDraftStyleText,
          forbiddenText: aiDraftForbiddenText,
          tone: aiDraftTone,
          defaultStyleTags: defaultAiDraftStyleTags,
          defaultForbidden: defaultAiDraftForbidden,
        }),
        ownerId,
      )
      setEditingChar('new')
      setEditorDraft(draftResponseToEditorDraft(response, createEmptyCharacterDraft()))
      setDraftStatus(describeCharacterDraftSource(response))
    } catch (err) {
      setDraftError(`生成失败：${err.message}`)
    } finally {
      setDrafting(false)
    }
  }

  // 点击角色列表中的「编辑」
  function handleEdit(char) {
    setPendingImport(null)
    setImportStatus('')
    setEditingChar(char)
    setEditorDraft({
      ...createEmptyCharacterDraft(),
      ...char,
      tags_text: Array.isArray(char.tags) ? char.tags.join(', ') : (char.tags || ''),
      alternate_greetings_text: Array.isArray(char.alternate_greetings)
        ? char.alternate_greetings.join('\n')
        : (char.alternate_greetings || ''),
    })
    setEditorError('')
  }

  // 保存角色（新建或编辑）
  async function handleSave(draft) {
    const payload = normalizeCharacterPayload(draft)
    if (!payload.name) {
      setEditorError('请填写角色名称')
      return
    }
    setSaving(true)
    setEditorError('')
    try {
      let saved
      if (editingChar === 'new') {
        saved = await addCharacter(tavern.id, payload, ownerId)
      } else {
        saved = await updateCharacter(tavern.id, editingChar.id, payload, ownerId)
      }
      const updated = editingChar === 'new'
        ? [...characters, saved]
        : characters.map((c) => (c.id === saved.id ? saved : c))
      setCharacters(updated)
      if (onCharactersChanged) onCharactersChanged(updated)
      setEditingChar(null)
      setEditorDraft(null)
    } catch (err) {
      setEditorError(`保存失败：${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // 删除角色
  async function handleDelete(charId) {
    setDeleting(true)
    try {
      await deleteCharacter(tavern.id, charId, ownerId)
      const updated = characters.filter((c) => c.id !== charId)
      setCharacters(updated)
      if (onCharactersChanged) onCharactersChanged(updated)
      setDeletingCharId(null)
    } catch (err) {
      setError(`删除失败：${err.message}`)
      setDeletingCharId(null)
    } finally {
      setDeleting(false)
    }
  }

  /**
   * 解析 SillyTavern 角色卡并生成待确认导入预览，不直接写入空间。
   * @param {File} file - 店主选择的 JSON 或 PNG 角色卡文件。
   * @returns {Promise<void>} 仅更新本地 pendingImport/importError 状态。
   */
  async function handleFileImport(file) {
    if (!file) return
    setImporting(true)
    setImportError('')
    setImportStatus('')
    try {
      let rawCard
      const filename = file.name || 'character-card'
      if (filename.toLowerCase().endsWith('.png') || file.type === 'image/png') {
        rawCard = await extractCharacterCardPayloadFromPng(file)
      } else {
        const text = await file.text()
        rawCard = JSON.parse(text)
      }
      const cardData = parseCharacterCard(rawCard)
      const riskReport = analyzeCharacterPromptRisk(cardData)
      const compatibilityReport = buildCharacterCardImportTrustReport({
        rawCard,
        normalizedCard: cardData,
        sourceName: filename,
      })
      setPendingImport({
        cardData,
        compatibilityReport,
        importPayload: buildCharacterCardImportPayload(rawCard, cardData),
        riskReport,
        sourceName: filename,
      })
      setEditingChar(null)
      setEditorDraft(null)
      setEditorError('')
    } catch (err) {
      setPendingImport(null)
      setImportError(`导入失败：${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  /**
   * 清空待确认导入预览，让店主可以重新选择文件或改为手动创建。
   * @returns {void} 仅更新本地导入相关状态。
   */
  function clearPendingImport() {
    setPendingImport(null)
    setImportError('')
    setImportStatus('')
  }

  /**
   * 在店主确认后保存待导入角色，并保留 prompt-risk 阻断作为最终门禁。
   * @returns {Promise<void>} 成功时更新角色列表；失败时展示导入错误。
   */
  async function handleConfirmImport() {
    if (!pendingImport) return
    if (pendingImport.riskReport && !pendingImport.riskReport.canSave) {
      setImportError(`导入被阻断：${formatPromptRiskBlockMessage(pendingImport.riskReport)}`)
      return
    }
    setImporting(true)
    setImportError('')
    setImportStatus('')
    try {
      assertCharacterPromptRiskCanSave(pendingImport.cardData)
      const saved = await importCharacterCard(tavern.id, pendingImport.importPayload, ownerId)
      const updated = [...characters, saved]
      setCharacters(updated)
      if (onCharactersChanged) onCharactersChanged(updated)
      setEditingChar(null)
      setPendingImport(null)
      const worldInfoCount = pendingImport.compatibilityReport?.counts?.worldInfo || 0
      setImportStatus(`已导入「${saved.name || pendingImport.compatibilityReport?.characterName || '未命名角色'}」；${worldInfoCount > 0 ? `同时带入 ${worldInfoCount} 条世界书，请稍后核对。` : '未检测到随卡世界书。'}`)
    } catch (err) {
      if (err.report) {
        setImportError(`导入被阻断：${formatPromptRiskBlockMessage(err.report)}`)
      } else {
        setImportError(`导入失败：${err.message}`)
      }
    } finally {
      setImporting(false)
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0]
    if (file) handleFileImport(file)
    e.target.value = ''
  }

  /**
   * 导出已保存角色为 SillyTavern V2 JSON，并触发浏览器下载。
   * @param {object} char - 当前空间内已保存的角色。
   * @returns {Promise<void>} 副作用：创建临时 Blob URL 并点击下载链接。
   */
  async function handleExportCharacter(char) {
    if (!char) return
    setExportingCharId(char.id || char.name || 'character')
    setExportError('')
    setExportStatus('')
    try {
      const payload = await exportCharacterCard({ character: char, format: 'v2' }, ownerId)
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = createCharacterCardExportFilename(char)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setExportStatus(`已准备下载「${char.name || '未命名角色'}」的 SillyTavern JSON 角色卡。`)
    } catch (err) {
      setExportError(`导出失败：${err.message}`)
    } finally {
      setExportingCharId('')
    }
  }

  // 点击编辑器的保存/取消
  function handleEditorSave(draft) {
    handleSave(draft)
  }

  function handleEditorCancel() {
    setEditingChar(null)
    setEditorDraft(null)
    setEditorError('')
  }

  // 点击「导入 SillyTavern 卡」触发隐藏的文件输入
  function triggerFileImport() {
    fileInputRef.current?.click()
  }

  const pendingImportRisk = pendingImport?.riskReport
  const pendingImportReport = pendingImport?.compatibilityReport
  const pendingImportBlocked = Boolean(pendingImportRisk && !pendingImportRisk.canSave)
  const pendingImportRiskItems = pendingImportRisk?.items || []

  return (
    <div className="modal-overlay char-mgmt-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content panel char-mgmt-modal">
        {/* Header */}
        <header className="modal-header">
          <h3>角色管理 — {tavern?.name}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        {/* Body */}
        <div className="char-mgmt-body">
          {/* 左侧：角色列表 */}
          <div className="char-mgmt-list">
            <div className="char-mgmt-list-header">
              <span className="mini-label">{characters.length} 个角色</span>
              <div className="char-mgmt-import-btns">
                <button
                  type="button"
                  className="secondary btn-sm"
                  onClick={triggerFileImport}
                  disabled={importing}
                  title="导入 SillyTavern 角色卡（PNG 或 JSON）"
                >
                  {importing ? '导入中...' : '+ 导入角色卡'}
                </button>
                <button
                  type="button"
                  className="primary btn-sm"
                  onClick={handleAddNew}
                  disabled={!!editingChar}
                >
                  + 新建角色
                </button>
              </div>
              {/* 隐藏的文件输入 */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.png,image/png"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
            </div>

            {importError && (
              <div className="char-mgmt-error">{importError}</div>
            )}
            {exportError && (
              <div className="char-mgmt-error">{exportError}</div>
            )}
            {importStatus && (
              <div className="char-mgmt-status">{importStatus}</div>
            )}
            {exportStatus && (
              <div className="char-mgmt-status">{exportStatus}</div>
            )}

            {characters.length === 0 ? (
              <div className="char-mgmt-empty">
                <p>这个空间还没有角色。</p>
                <p>可以导入 SillyTavern 角色卡，或新建一个空白角色。</p>
              </div>
            ) : (
              <ul className="char-mgmt-items">
                {characters.map((char) => (
                  <li
                    key={char.id}
                    className={`char-mgmt-item ${editingChar?.id === char.id ? 'is-active' : ''}`}
                  >
                    <div className="char-mgmt-item-info">
                      <CharacterAvatar character={char} size="small" className="char-mgmt-item-avatar" />
                      <div className="char-mgmt-item-text">
                        <strong>{char.name}</strong>
                        {char.personality && (
                          <span className="muted">{char.personality.slice(0, 40)}{char.personality.length > 40 ? '...' : ''}</span>
                        )}
                        <CharacterLookSummary character={char} compact />
                      </div>
                    </div>
                    <div className="char-mgmt-item-actions">
                      <Link
                        to={`/tavern/${tavern.id}/character/${char.id}/prompt?owner_id=${encodeURIComponent(ownerId)}`}
                        className="btn-sm text-cyan-400 hover:underline flex items-center gap-1"
                        style={{ fontSize: '12px', fontWeight: 'bold' }}
                      >
                        提示词实验室
                      </Link>
                      <button
                        type="button"
                        className="secondary btn-sm"
                        onClick={() => handleExportCharacter(char)}
                        disabled={!!editingChar || exportingCharId === char.id}
                        aria-label={`导出 ${char.name || '未命名角色'} 的 SillyTavern JSON 角色卡`}
                      >
                        {exportingCharId === char.id ? '导出中...' : '导出 JSON'}
                      </button>
                      <button
                        type="button"
                        className="secondary btn-sm"
                        onClick={() => handleEdit(char)}
                        disabled={!!editingChar || deletingCharId === char.id}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="btn-danger-ghost btn-sm"
                        onClick={() => setDeletingCharId(char.id)}
                        disabled={!!editingChar}
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 右侧：编辑器 / 删除确认 / 导入提示 */}
          <div className="char-mgmt-editor-area">
            {!editingChar ? (
              <div className="char-mgmt-editor-placeholder char-mgmt-editor-placeholder--picker">
                {pendingImport && pendingImportReport && (
                  <section
                    className={`char-card-import-preview ${pendingImportBlocked ? 'char-card-import-preview--blocked' : 'char-card-import-preview--ready'}`}
                    data-character-card-import-preview
                    aria-label="角色卡导入兼容预览"
                  >
                    <header className="char-card-import-preview__header">
                      <div>
                        <span className="mini-label">IMPORT PREVIEW</span>
                        <h4>确认导入「{pendingImportReport.characterName}」？</h4>
                        <p>
                          {pendingImportReport.sourceName || '角色卡文件'} · {pendingImportReport.sourceFormat}
                        </p>
                      </div>
                      <strong>{pendingImportBlocked ? '需要先修正风险' : '可确认导入'}</strong>
                    </header>

                    <div className="char-card-import-preview__summary">
                      <span>映射字段 {pendingImportReport.counts.mapped}</span>
                      <span>世界书 {pendingImportReport.counts.worldInfo}</span>
                      <span>备用开场 {pendingImportReport.counts.alternateGreetings}</span>
                      <span>待复核 {pendingImportReport.counts.review}</span>
                    </div>

                    <div className="char-card-import-preview__grid">
                      <div>
                        <strong>会保存到角色卡</strong>
                        {pendingImportReport.mappedItems.length > 0 ? (
                          <ul className="char-card-import-preview__chips">
                            {pendingImportReport.mappedItems.map((item) => (
                              <li key={item.id}>
                                <span>{item.label}</span>
                                <small>{item.detail}</small>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="form-hint">没有检测到可保存字段；请确认文件格式是否正确。</p>
                        )}
                      </div>
                      <div>
                        <strong>导入前请复核</strong>
                        {pendingImportReport.reviewItems.length > 0 ? (
                          <ul className="char-card-import-preview__notes">
                            {pendingImportReport.reviewItems.map((item) => (
                              <li key={item.id} className={`is-${item.level}`}>
                                <span>{item.label}</span>
                                <small>{item.detail}</small>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="form-hint">未检测到需要额外复核的兼容项。</p>
                        )}
                      </div>
                    </div>

                    <div className="char-card-import-preview__risk">
                      <strong>Prompt 风险门禁</strong>
                      {pendingImportRiskItems.length > 0 ? (
                        <ul>
                          {pendingImportRiskItems.slice(0, 4).map((item) => (
                            <li key={item.id} className={`is-${item.level}`}>
                              <span>{item.level === 'blocked' ? '阻断' : item.level === 'warning' ? '提醒' : '信息'}</span>
                              {item.field_label}：{item.message}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>未检测到阻断风险；确认导入前仍建议快速扫一遍角色指令。</p>
                      )}
                    </div>

                    <div className="char-card-import-preview__actions">
                      <button
                        type="button"
                        className="primary"
                        onClick={handleConfirmImport}
                        disabled={importing || pendingImportBlocked}
                      >
                        {importing ? '导入中...' : '确认导入这张角色卡'}
                      </button>
                      <button type="button" className="secondary" onClick={clearPendingImport} disabled={importing}>
                        取消
                      </button>
                    </div>
                  </section>
                )}

                <section className="char-mgmt-batch-panel" aria-label="批量创建背景 NPC">
                  <div className="character-editor-section-heading">
                    <span>批量创建背景 NPC</span>
                    <small>粘贴 JSON 数组或每行一个“名称 | 描述 | 标签”。先生成待确认清单；不自动发布、不会覆盖已有角色。</small>
                  </div>
                  <label className="character-editor-full">
                    <span>背景演员清单</span>
                    <textarea
                      value={batchInput}
                      onChange={(event) => {
                        setBatchInput(event.target.value)
                        setBatchPreview([])
                        setBatchSource('')
                        setBatchError('')
                        setBatchStatus('')
                      }}
                      disabled={batchSaving || saving || importing || deleting || drafting}
                      rows={4}
                      placeholder="夜班灯叔 | 调暗霓虹灯的背景店员 | 后勤, 低干扰"
                    />
                  </label>
                  <div className="char-mgmt-batch-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleFillBatchExample}
                      disabled={batchSaving || saving || importing || deleting || drafting}
                    >
                      填入示例
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handlePreviewBatchInput}
                      disabled={batchSaving || saving || importing || deleting || drafting || !batchInput.trim()}
                    >
                      预览批量清单
                    </button>
                    <button
                      type="button"
                      className="primary"
                      onClick={handleConfirmBatchImport}
                      disabled={batchSaving || saving || importing || deleting || drafting || batchPreview.length === 0}
                    >
                      {batchSaving
                        ? '创建中...'
                        : batchPreview.length
                          ? `确认创建 ${batchPreview.length} 个背景 NPC`
                          : '确认创建背景 NPC'}
                    </button>
                  </div>
                  {batchPreview.length > 0 ? (
                    <div className="char-mgmt-batch-preview" role="status">
                      <div className="char-mgmt-batch-preview__summary">
                        <strong>{batchPreview.length} 个待确认 NPC</strong>
                        <span>{batchSource === 'json' ? '来自 JSON / 角色卡字段' : '来自逐行文本草稿'}</span>
                      </div>
                      <ul>
                        {batchPreview.map((draft, index) => (
                          <li key={`${draft.name}-${index}`}>
                            <strong>{draft.name}</strong>
                            <span>{draft.description || '未填写描述，保存后建议补齐。'}</span>
                            {draft.tags?.length ? <small>{draft.tags.slice(0, 4).join(' · ')}</small> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {batchStatus && <div className="char-mgmt-batch-status">{batchStatus}</div>}
                  {batchError && <div className="char-mgmt-error">{batchError}</div>}
                </section>

                <OwnerDialoguePreviewSimulator
                  tavern={tavern}
                  characters={characters}
                  ownerId={ownerId}
                  disabled={batchSaving || saving || importing || deleting || drafting}
                />

                <section className="char-mgmt-ai-draft">
                  <div className="character-editor-section-heading">
                    <span>{isDigitalHumanStudio ? '制作数字人档案草稿' : '生成 AI 草稿'}</span>
                    <small>
                      {isDigitalHumanStudio
                        ? 'NPC 档案师会把访谈结果整理成可迁移数字人档案：可保存为角色卡，也可复制视频/短剧出镜 prompt。保存前仍是待确认草稿。'
                        : '优先使用店主默认 LLM；无可用配置时只返回本地模板草稿。只放进右侧编辑器，店主保存后才会成为正式角色。'}
                    </small>
                  </div>
                  {isDigitalHumanStudio ? (
                    <div className="ai-draft-lifecycle">
                      <strong>Digital human adapter</strong>
                      <p>第一版只输出文本档案与视频 / 短剧出镜 prompt，不直接生成视频、语音克隆或真人影像。</p>
                      <ul>
                        <li>先确认数字人是本人、虚构角色还是已授权品牌人格。</li>
                        <li>再整理身份定位、口吻节奏、外观风格、示例台词和禁忌边界。</li>
                        <li>最后由店主/用户在编辑器中确认，才保存为角色卡或复制到外部工具。</li>
                      </ul>
                    </div>
                  ) : null}
                  <div className="ai-draft-lifecycle" aria-label="AI 草稿生命周期">
                    <strong>{characterDraftLifecycle.title}</strong>
                    <p>{characterDraftLifecycle.summary}</p>
                    <div className="ai-draft-lifecycle__steps">
                      {characterDraftLifecycle.steps.map((step) => (
                        <span key={step.id}>
                          <b>{step.label}</b>
                          <small>{step.helper}</small>
                        </span>
                      ))}
                    </div>
                    <ul>
                      {characterDraftLifecycle.guardrails.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="form-grid">
                    <label>
                      <span>风格标签</span>
                      <input
                        value={aiDraftStyleText}
                        onChange={(event) => setAiDraftStyleText(event.target.value)}
                        disabled={drafting || saving || importing || deleting}
                        placeholder={isDigitalHumanStudio ? '数字人档案, 视频出镜, 短剧角色' : '猫娘, 傲娇, 酒保'}
                      />
                    </label>
                    <label>
                      <span>语气</span>
                      <input
                        value={aiDraftTone}
                        onChange={(event) => setAiDraftTone(event.target.value)}
                        disabled={drafting || saving || importing || deleting}
                        placeholder={isDigitalHumanStudio ? '访谈式、清晰、尊重授权、适合视频出镜' : '温暖、短句、有空间陪伴感'}
                      />
                    </label>
                  </div>
                  <label className="character-editor-full">
                    <span>禁忌方向</span>
                    <textarea
                      value={aiDraftForbiddenText}
                      onChange={(event) => setAiDraftForbiddenText(event.target.value)}
                      disabled={drafting || saving || importing || deleting}
                      rows={2}
                      placeholder={isDigitalHumanStudio ? '不要现实名人或他人肖像复刻，不要直接生成真人视频或语音克隆' : '不要露骨，不要现实名人，不要真实私人地址'}
                    />
                  </label>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleGenerateAiDraft}
                    disabled={drafting || saving || importing || deleting}
                  >
                    {drafting ? '生成中...' : isDigitalHumanStudio ? '生成数字人档案草稿' : '生成 AI 草稿'}
                  </button>
                  {draftStatus && <div className="char-mgmt-batch-status">{draftStatus}</div>}
                  {draftError && <div className="char-mgmt-error">{draftError}</div>}
                </section>
                <SystemCharacterPresetPicker
                  title="快速起一个新角色"
                  description="系统会先帮你填好角色原型，点一下就能继续在右侧编辑并保存。"
                  actionLabel="用作新角色"
                  disabled={saving || importing || deleting}
                  onPick={handleAddFromPreset}
                />
              </div>
            ) : editingChar === 'new' ? (
              <EditorWrapper
                title="新建角色"
                draft={editorDraft}
                error={editorError}
                saving={saving}
                onSave={handleEditorSave}
                onCancel={handleEditorCancel}
              />
            ) : (
              <EditorWrapper
                title={`编辑角色 — ${editingChar.name}`}
                draft={editorDraft}
                error={editorError}
                saving={saving}
                onSave={handleEditorSave}
                onCancel={handleEditorCancel}
              />
            )}
          </div>
        </div>

        {/* 删除确认 */}
        {deletingCharId && (
          <div className="char-mgmt-delete-confirm">
            <p>确定要删除这个角色吗？角色将从空间中移除，此操作不可恢复。</p>
            <div className="char-mgmt-delete-actions">
              <button
                type="button"
                className="secondary btn-sm"
                onClick={() => setDeletingCharId(null)}
                disabled={deleting}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={() => handleDelete(deletingCharId)}
                disabled={deleting}
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        )}

        {/* 全局错误 */}
        {error && <div className="char-mgmt-error">{error}</div>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// EditorWrapper
// ─────────────────────────────────────────
function EditorWrapper({ title, draft, error, saving, onSave, onCancel }) {
  if (!draft) {
    return <div className="char-mgmt-editor-placeholder">加载编辑器...</div>
  }

  return (
    <div className="char-editor-wrapper">
      <CharacterEditor
        value={draft}
        onSave={onSave}
        onCancel={onCancel}
        title={title}
        submitLabel={saving ? '保存中...' : '保存角色'}
        disabled={saving}
      />
      {error && <div className="char-mgmt-error">{error}</div>}
    </div>
  )
}
