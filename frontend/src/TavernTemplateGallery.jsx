import { useMemo, useState } from 'react'
import { getDefaultTavernService } from './services/tavernService'
import { getTemplateTags, TAVERN_TEMPLATES } from './tavernTemplates'

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function getPackageCounts(template) {
  const pkg = template.package || {}
  return {
    characters: Array.isArray(pkg.characters) ? pkg.characters.length : 0,
    worldInfo: Array.isArray(pkg.world_info) ? pkg.world_info.length : 0,
  }
}

export default function TavernTemplateGallery({
  ownerId = '',
  currentLat = 0,
  currentLon = 0,
  onInstalled,
  onOpenOwner,
}) {
  const tavernService = getDefaultTavernService()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState('all')
  const [selectedTemplateId, setSelectedTemplateId] = useState(TAVERN_TEMPLATES[0]?.id || '')
  const selectedTemplate = TAVERN_TEMPLATES.find((template) => template.id === selectedTemplateId) || TAVERN_TEMPLATES[0]
  const [installForm, setInstallForm] = useState(() => ({
    lat: String(currentLat || ''),
    lon: String(currentLon || ''),
    name: selectedTemplate ? `${selectedTemplate.title} 副本` : '',
    access: 'private',
  }))
  const [installing, setInstalling] = useState(false)
  const [status, setStatus] = useState('')

  const tags = useMemo(() => getTemplateTags(), [])
  const filteredTemplates = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return TAVERN_TEMPLATES.filter((template) => {
      if (activeTag !== 'all' && !template.tags.includes(activeTag)) return false
      if (!keyword) return true
      return [
        template.title,
        template.summary,
        template.placement,
        template.author,
        template.tags.join(' '),
      ].join(' ').toLowerCase().includes(keyword)
    })
  }, [activeTag, query])

  function selectTemplate(template) {
    setSelectedTemplateId(template.id)
    setInstallForm((form) => ({
      ...form,
      name: `${template.title} 副本`,
    }))
    setStatus('')
  }

  function useCurrentCoordinate() {
    setInstallForm((form) => ({
      ...form,
      lat: String(currentLat || ''),
      lon: String(currentLon || ''),
    }))
  }

  async function installTemplate() {
    if (!selectedTemplate) return
    const lat = toNumber(installForm.lat, Number.NaN)
    const lon = toNumber(installForm.lon, Number.NaN)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      setStatus('请输入有效的经纬度，再安装模板。')
      return
    }
    setInstalling(true)
    setStatus('')
    try {
      const result = await tavernService.importTavernPackage(
        selectedTemplate.package,
        {
          lat,
          lon,
          name: installForm.name || `${selectedTemplate.title} 副本`,
          access: installForm.access,
        },
        ownerId,
      )
      const tavern = result?.tavern
      setStatus(`已安装模板：${tavern?.name || selectedTemplate.title}`)
      if (onInstalled && tavern) onInstalled(tavern)
    } catch (err) {
      setStatus(`安装失败：${err.message}`)
    } finally {
      setInstalling(false)
    }
  }

  const selectedCounts = selectedTemplate ? getPackageCounts(selectedTemplate) : { characters: 0, worldInfo: 0 }

  return (
    <section className="template-gallery page-enter" aria-label="酒馆模板库">
      <header className="template-gallery__header panel">
        <div>
          <p className="mini-label">模板库</p>
          <h2>从一个可复用酒馆包开始</h2>
          <p className="note muted">
            选择模板、指定真实地图坐标，即可安装成你的私人酒馆；之后可继续编辑角色、世界书和 AI 配置。
          </p>
        </div>
        <div className="template-gallery__actions">
          <button type="button" className="secondary" onClick={useCurrentCoordinate}>
            使用当前地图坐标
          </button>
          {onOpenOwner ? (
            <button type="button" className="secondary" onClick={onOpenOwner}>
              去我的酒馆
            </button>
          ) : null}
        </div>
      </header>

      <div className="template-gallery__filters panel">
        <label className="template-search">
          <span className="mini-label">搜索模板</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索校园、都市、奇谈、治愈..."
          />
        </label>
        <div className="template-tags" aria-label="模板标签筛选">
          <button
            type="button"
            className={activeTag === 'all' ? 'primary' : 'secondary'}
            onClick={() => setActiveTag('all')}
          >
            全部
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={activeTag === tag ? 'primary' : 'secondary'}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="template-gallery__layout">
        <div className="template-card-grid">
          {filteredTemplates.map((template) => {
            const counts = getPackageCounts(template)
            return (
              <article
                key={template.id}
                className={`template-card panel ${selectedTemplateId === template.id ? 'is-selected' : ''}`}
              >
                <button type="button" className="template-card__select" onClick={() => selectTemplate(template)}>
                  <div className={`template-card__cover ${template.coverClass || ''}`} aria-hidden="true" />
                  <div className="template-card__body">
                    <div className="template-card__title-row">
                      <h3>{template.title}</h3>
                      <span>{counts.characters} 角色 · {counts.worldInfo} 世界书</span>
                    </div>
                    <p>{template.summary}</p>
                    <div className="template-card__tags">
                      {template.tags.map((tag) => <small key={tag}>{tag}</small>)}
                    </div>
                    <footer>
                      <span>by {template.author}</span>
                      <span>{template.recommendedPerspective}</span>
                    </footer>
                  </div>
                </button>
              </article>
            )
          })}
        </div>

        <aside className="template-install-panel panel">
          {selectedTemplate ? (
            <>
              <p className="mini-label">安装模板</p>
              <h3>{selectedTemplate.title}</h3>
              <p className="note muted">{selectedTemplate.placement}</p>
              <div className="template-install-summary">
                <span>{selectedCounts.characters} 个角色</span>
                <span>{selectedCounts.worldInfo} 条世界书</span>
                <span>默认私人</span>
              </div>

              <label className="form-group">
                <span>安装后的酒馆名</span>
                <input
                  value={installForm.name}
                  onChange={(event) => setInstallForm((form) => ({ ...form, name: event.target.value }))}
                />
              </label>

              <div className="template-coordinate-grid">
                <label className="form-group">
                  <span>纬度</span>
                  <input
                    value={installForm.lat}
                    onChange={(event) => setInstallForm((form) => ({ ...form, lat: event.target.value }))}
                    placeholder="31.2304"
                  />
                </label>
                <label className="form-group">
                  <span>经度</span>
                  <input
                    value={installForm.lon}
                    onChange={(event) => setInstallForm((form) => ({ ...form, lon: event.target.value }))}
                    placeholder="121.4737"
                  />
                </label>
              </div>

              <label className="form-group">
                <span>访问权限</span>
                <select
                  value={installForm.access}
                  onChange={(event) => setInstallForm((form) => ({ ...form, access: event.target.value }))}
                >
                  <option value="private">私人 — 先自己调试</option>
                  <option value="public">公开 — 安装后可被发现</option>
                </select>
              </label>

              <button type="button" className="primary" onClick={installTemplate} disabled={installing}>
                {installing ? '安装中...' : '安装到我的地图'}
              </button>
              {status ? <div className="template-install-status">{status}</div> : null}
              <p className="note muted">
                模板不包含 API Key。安装后如果没有可用 AI 配置，酒馆会先保持歇业，可在“我的酒馆 → AI 配置”中开门。
              </p>
            </>
          ) : (
            <div className="template-empty">请选择一个模板。</div>
          )}
        </aside>
      </div>
    </section>
  )
}
