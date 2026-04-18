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
          <p className="mini-label">附近摘要</p>
          <h2>{result ? '附近内容已准备好，下一步选择地点或酒馆' : '等待附近内容'}</h2>
        </div>
        <p className="note muted">
          {result
            ? '这里只保留最短摘要，真正的进入动作在下方地图和酒馆列表中完成。'
            : '刷新成功后，这里会显示附近氛围摘要，然后把注意力交给下方地图。'}
        </p>
      </div>

      {result ? (
        <div className="result-stack world-result-panel__stack">
          <div className="result-card emphasis-card story-card world-result-panel__hero-card">
            <p className="mini-label">附近氛围</p>
            <h3 className="story-card-title">{formatTagLabel(result.region_theme, '未命名区域')}</h3>
            <p className="note story-card-copy">{sliceAtmosphere}</p>
            {result.fallback_notice ? (
              <p className="note muted">{result.fallback_notice}</p>
            ) : null}
            <div className="story-chip-row world-result-panel__chips">
              <span>势力 · {formatTagLabel(result.dominant_faction, '-')}</span>
              <span>地点 · {result.poi_count ?? '-'}</span>
              <span>道路 · {result.road_count ?? '-'}</span>
              <span>地标 · {result.landmark_count ?? '-'}</span>
            </div>
            <div className="world-result-panel__next-action" aria-live="polite">
              <span className="mini-label">现在就做</span>
              <strong>继续往下看地图和酒馆列表，点击一个你想进入的地点。</strong>
              <p>先看名字和简介；如果附近有酒馆，可以直接打开入场卡片开始对话。</p>
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
              <p className="mini-label">推荐路径</p>
              <div className="story-bullets world-result-panel__bullets">
                <div className="story-bullet">先看下方地图里最值得进入的候选地点。</div>
                <div className="story-bullet">如果已有附近酒馆，优先进入酒馆和 NPC 对话。</div>
                <div className="story-bullet">需要开店时，点击顶部“创建酒馆”即可使用向导。</div>
              </div>
            </div>
          </div>

          <div className="result-card world-result-panel__resources">
            <p className="mini-label">高级资源</p>
            <p className="note muted">这些链接主要给调试和创作者查看原始文件，普通游玩可以忽略。</p>
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
            <p className="empty-title">还没有读取附近内容</p>
            <p className="note muted">先选一个入口：可以用预设地点，也可以直接用浏览器定位。</p>
            <div className="empty-chips">
              <span>{statusOk ? '服务已就绪' : '先确认服务'}</span>
              <span>推荐先试离线演示样例</span>
              <span>刷新后可直接选择地点或酒馆</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
