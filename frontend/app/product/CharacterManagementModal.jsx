import { useRef, useState } from 'react'
import { parseCharacterCard, extractCharacterCardFromPng } from './services/tavernService'
import { addCharacter, deleteCharacter, importCharacterCard, listCharacters, updateCharacter } from '../lib/taverns'
import CharacterEditor, { createEmptyCharacterDraft, normalizeCharacterPayload } from './CharacterEditor'
import CharacterAvatar from './CharacterAvatar'
import CharacterLookSummary from './CharacterLookSummary'
import SystemCharacterPresetPicker from './SystemCharacterPresetPicker'
import { createCharacterDraftFromPreset } from './systemCharacterPresets'

/**
 * CharacterManagementModal — 酒馆角色管理面板
 *
 * 允许店主从酒馆添加、编辑、导入和删除角色。
 *
 * @param {object}   tavern        - 当前酒馆数据
 * @param {string}   ownerId       - 店主 ID
 * @param {Function} onClose       - () => void 关闭回调
 * @param {Function} onCharactersChanged - (characters) => void 角色变动回调（用于更新父组件）
 */
export default function CharacterManagementModal({ tavern, ownerId, onClose, onCharactersChanged }) {
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
  const fileInputRef = useRef(null)

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
    setEditingChar('new')
    setEditorDraft(createEmptyCharacterDraft())
    setEditorError('')
  }

  function handleAddFromPreset(preset) {
    setEditingChar('new')
    setEditorDraft({
      ...createEmptyCharacterDraft(),
      ...createCharacterDraftFromPreset(preset),
    })
    setEditorError('')
  }

  // 点击角色列表中的「编辑」
  function handleEdit(char) {
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

  // 导入 SillyTavern 角色卡（PNG 或 JSON）
  async function handleFileImport(file) {
    if (!file) return
    setImporting(true)
    setImportError('')
    try {
      let cardData
      if (file.name.endsWith('.png') || file.type === 'image/png') {
        cardData = await extractCharacterCardFromPng(file)
      } else {
        const text = await file.text()
        cardData = parseCharacterCard(JSON.parse(text))
      }
      const saved = await importCharacterCard(tavern.id, cardData, ownerId)
      const updated = [...characters, saved]
      setCharacters(updated)
      if (onCharactersChanged) onCharactersChanged(updated)
      setEditingChar(null)
    } catch (err) {
      setImportError(`导入失败：${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0]
    if (file) handleFileImport(file)
    e.target.value = ''
  }

  function handleImportJson() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.png'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (file) handleFileImport(file)
    }
    input.click()
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

            {characters.length === 0 ? (
              <div className="char-mgmt-empty">
                <p>这个酒馆还没有角色。</p>
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
            <p>确定要删除这个角色吗？角色将从酒馆中移除，此操作不可恢复。</p>
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
