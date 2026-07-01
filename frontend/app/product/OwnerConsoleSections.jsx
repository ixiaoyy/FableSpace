import { getSpaceAccessLabel, getSpaceStatusLabel } from './services/spaceService'

export function OwnerSectionNav({ sections, activeSection, onChange }) {
  return (
    <nav className="owner-section-nav panel" aria-label="店主控制台分组导航">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`owner-section-tab ${activeSection === section.id ? 'is-active' : ''}`}
          onClick={() => onChange(section.id)}
          aria-current={activeSection === section.id ? 'page' : undefined}
        >
          <span>
            <strong>{section.label}</strong>
            <small>{section.helper}</small>
          </span>
          <em>{section.badge}</em>
        </button>
      ))}
    </nav>
  )
}

export function OwnerNextActionPanel({ ownerStats, visitorStats, chatStats, onCreate, onOpenSection }) {
  const actions = [
    {
      id: 'create',
      label: ownerStats.total ? '继续开新空间' : '创建第一间空间',
      note: ownerStats.total ? '从地点、角色、AI 到开门继续走向导。' : '3 分钟完成地点、空间、角色和 AI 基础配置。',
      cta: '开始创建',
      onClick: onCreate,
    },
    {
      id: 'spaces',
      label: '管理空间基础信息',
      note: `${ownerStats.open} 间营业中，${ownerStats.closed} 间歇业中。`,
      cta: '进入空间',
      onClick: () => onOpenSection('spaces'),
    },
    {
      id: 'visitors',
      label: '查看访客回访',
      note: visitorStats.visitors ? `${visitorStats.visitors} 位访客，${visitorStats.returningVisitors} 位回访者。` : `${chatStats.sessions} 个最近会话。`,
      cta: '看访客',
      onClick: () => onOpenSection('visitors'),
    },
    {
      id: 'advanced',
      label: '配置创作工具',
      note: '角色、世界书、输出护栏、导入导出都收在高级工具里。',
      cta: '打开工具',
      onClick: () => onOpenSection('advanced'),
    },
  ]

  return (
    <section className="owner-next-actions panel" aria-label="建议操作">
      <div className="owner-next-actions__header">
        <div>
          <p className="mini-label">建议下一步</p>
          <h2>按经营路径分组，不再把所有设置堆在首屏</h2>
        </div>
        <button type="button" className="secondary" onClick={() => onOpenSection('ai')}>查看 AI 消耗</button>
      </div>
      <div className="owner-next-actions__grid">
        {actions.map((action) => (
          <article key={action.id} className="owner-next-action-card">
            <div>
              <strong>{action.label}</strong>
              <p>{action.note}</p>
            </div>
            <button type="button" className="button-link" onClick={action.onClick}>{action.cta}</button>
          </article>
        ))}
      </div>
    </section>
  )
}

export function OwnerAdvancedToolPanel({
  spaces,
  packageBusy,
  onCreate,
  onImportPackage,
  onManageLlm,
  onManageCharacters,
  onManageWorldBook,
  onManageOutputRules,
  onManagePromptBlocks,
  onManagePresets,
  onPreviewPresetImport,
  onManageSkillPacks,
  onManageGroupSettings,
  onManageStateCards,
  onManageGameplay,
  onExportPackage,
}) {
  return (
    <section className="owner-advanced-panel panel" aria-label="高级创作工具">
      <div className="owner-advanced-panel__header">
        <div>
          <p className="mini-label">高级工具</p>
          <h2>把运行预设、世界书、Prompt 段落、输出护栏和数据工具收在一个工作台</h2>
          <p className="note muted">普通经营视图不再默认暴露这些复杂能力，但创作者仍可快速进入。</p>
        </div>
        <div className="owner-advanced-panel__actions">
          <button type="button" className="secondary" onClick={onImportPackage} disabled={packageBusy === 'import'}>
            {packageBusy === 'import' ? '导入中...' : '导入空间包'}
          </button>
          <button type="button" className="btn-primary" onClick={onCreate}>+ 创建空间</button>
        </div>
      </div>

      {spaces.length === 0 ? (
        <div className="owner-empty">
          <div className="empty-icon">🧰</div>
          <p>创建空间后，这里会出现角色、世界书、运行预设、Prompt 段落、输出护栏和导出入口。</p>
          <button className="button-link" type="button" onClick={onCreate}>先创建一间空间</button>
        </div>
      ) : (
        <div className="owner-advanced-grid">
          {spaces.map((space) => {
            const charCount = space?.characters?.length || 0
            const worldInfoCount = space?.world_info?.length || 0
            const ruleCount = space?.output_rules?.length || 0
            const blockCount = space?.prompt_blocks?.length || 0
            const presetCount = space?.runtime_presets?.length || 0
            const skillPackCount = (space?.skill_packs || []).filter((item) => item?.enabled).length
            const groupEnabled = Boolean(space?.group_chat_enabled)
            return (
              <article key={space.id} className="owner-advanced-card">
                <div className="owner-advanced-card__main">
                  <div>
                    <strong>{space.name}</strong>
                    <p>{space.description || '暂无描述'}</p>
                  </div>
                  <span>{getSpaceStatusLabel(space.status)} · {getSpaceAccessLabel(space.access)}</span>
                </div>
                <div className="owner-advanced-card__stats">
                  <small>{charCount} 角色</small>
                  <small>{worldInfoCount} 世界书</small>
                  <small>{presetCount || '内置'} 预设</small>
                  <small>{skillPackCount ? `${skillPackCount} 技能包` : '技能包未开'}</small>
                  <small>{blockCount || '默认'} 段落</small>
                  <small>{ruleCount || '默认'} 护栏</small>
                  <small>{groupEnabled ? '群聊已开' : '群聊未开'}</small>
                </div>
                <div className="owner-advanced-card__actions">
                  <button type="button" className="secondary" onClick={() => onManageCharacters(space)}>角色</button>
                  <button type="button" className="secondary" onClick={() => onManageWorldBook(space)}>世界书</button>
                  <button type="button" className="secondary" onClick={() => onManagePresets(space)}>预设</button>
                  <button type="button" className="secondary" onClick={() => onPreviewPresetImport(space)}>预览导入</button>
                  <button type="button" className="secondary" onClick={() => onManageSkillPacks(space)}>技能包</button>
                  <button type="button" className="secondary" onClick={() => onManagePromptBlocks(space)}>段落</button>
                  <button type="button" className="secondary" onClick={() => onManageGroupSettings(space)}>群聊</button>
                  <button type="button" className="secondary" onClick={() => onManageStateCards(space)}>状态卡</button>
                  <button type="button" className="secondary" onClick={() => onManageOutputRules(space)}>护栏</button>
                  <button type="button" className="secondary" onClick={() => onManageLlm(space)}>AI</button>
                  <button type="button" className="secondary" onClick={() => onExportPackage(space)} disabled={packageBusy === `export:${space.id}`}>
                    {packageBusy === `export:${space.id}` ? '导出中...' : '导出'}
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
