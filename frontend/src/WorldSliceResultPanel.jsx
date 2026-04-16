import { formatTagLabel } from './services/appDisplay'
import { computePlaceStats, getPlaceTypeEmoji } from './services/placeProtocol'

function PlaceStatsSection({ poiStates, pois }) {
  if (!poiStates) return null

  const stats = computePlaceStats(pois || [])

  const topTypes = Object.entries(stats.by_type)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const topFactions = Object.entries(stats.by_faction)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div className="result-card world-result-panel__card world-result-panel__card--place-stats">
      <p className="mini-label">地点统计</p>
      <div className="place-stats-grid">
        <div className="place-stats-section">
          <p className="place-stats-section-label">按类型</p>
          <div className="place-stats-chips">
            {topTypes.map(([type, count]) => (
              <span key={type} className="place-stats-chip">
                {getPlaceTypeEmoji(type)} {formatTagLabel(type, type)} · {count}
              </span>
            ))}
          </div>
        </div>
        <div className="place-stats-section">
          <p className="place-stats-section-label">按势力</p>
          <div className="place-stats-chips">
            {topFactions.map(([faction, count]) => (
              <span key={faction} className="place-stats-chip">
                {formatTagLabel(faction, '游离')} · {count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WorldSliceResultPanel({
  result,
  statusOk,
  sliceAtmosphere,
  sliceHighlights,
}) {
  const poiStates = result?.poi_states
  const pois = result?.world?.pois || []

  return (
    <section className="panel secondary-panel world-result-panel">
      <div className="section-heading world-result-panel__heading">
        <div>
          <p className="mini-label">步骤 2</p>
          <h2>{result ? '地点切片已准备好，下一步直接选地点' : '当前切片结果'}</h2>
        </div>
        <p className="note muted">
          {result
            ? '这里不再承担主操作入口，而是用最短摘要告诉你：地点切片已经生成，继续往下选地点即可开始探索。'
            : '生成成功后，这里会先给你最短切片摘要，然后把注意力交给下方地点舞台。'}
        </p>
      </div>

      {result ? (
        <div className="result-stack world-result-panel__stack">
          <div className="result-card emphasis-card story-card world-result-panel__hero-card">
            <p className="mini-label">已生成切片</p>
            <h3 className="story-card-title">{formatTagLabel(result.region_theme, '未命名切片')}</h3>
            <p className="note story-card-copy">{sliceAtmosphere}</p>
            <div className="story-chip-row world-result-panel__chips">
              <span>势力 · {formatTagLabel(result.dominant_faction, '-')}</span>
              <span>地点 · {result.poi_count ?? '-'}</span>
              <span>道路 · {result.road_count ?? '-'}</span>
              <span>地标 · {result.landmark_count ?? '-'}</span>
            </div>
            <div className="world-result-panel__next-action" aria-live="polite">
              <span className="mini-label">现在就做</span>
              <strong>直接去下方地点舞台，点击一个地点，把它设为这次进入的当前地点。</strong>
              <p>先读名字和钩子，点击后首页会立刻显示当前地点反馈，不需要先打开预览文件。</p>
            </div>
          </div>

          <div className="result-grid world-result-panel__grid">
            <PlaceStatsSection poiStates={poiStates} pois={pois} />

            <div className="result-card world-result-panel__card">
              <p className="mini-label">进入前 3 个线索</p>
              <div className="story-bullets world-result-panel__bullets">
                {sliceHighlights.map((item) => (
                  <div key={item} className="story-bullet">{item}</div>
                ))}
              </div>
            </div>
            <div className="result-card world-result-panel__card world-result-panel__card--guide">
              <p className="mini-label">地点优先路径</p>
              <div className="story-bullets world-result-panel__bullets">
                <div className="story-bullet">先看下方地点舞台里最值得进入的候选地点。</div>
                <div className="story-bullet">再点击一个地点，把它提升为当前观察目标。</div>
                <div className="story-bullet">资源文件保留在下方，只作为补充入口，不打断首屏探索。</div>
              </div>
            </div>
          </div>

          <div className="result-card world-result-panel__resources">
            <p className="mini-label">补充资源</p>
            <p className="note muted">这些链接仍可用于深入查看原始文本与资源，但它们已经降级为次级入口。</p>
            <div className="link-row action-links world-result-panel__resource-links">
              <a className="button-link" href={result.preview_url} target="_blank" rel="noreferrer">文字预览</a>
              <a href={result.world_url} target="_blank" rel="noreferrer">world.json</a>
              <a href={result.manifest_url} target="_blank" rel="noreferrer">manifest.json</a>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state story-empty-state">
          <div>
            <p className="empty-title">还没有生成任何地点切片</p>
            <p className="note muted">先选一个入口：可以用预设地点，也可以直接用浏览器定位。</p>
            <div className="empty-chips">
              <span>{statusOk ? '服务已就绪' : '先确认服务'}</span>
              <span>推荐先试离线演示样例</span>
              <span>生成后可直接选择地点</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
