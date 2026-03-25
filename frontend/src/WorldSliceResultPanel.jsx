import { formatTagLabel } from './services/appDisplay'

export default function WorldSliceResultPanel({
  result,
  statusOk,
  worldAtmosphere,
  sliceHighlights,
}) {
  return (
    <section className="panel secondary-panel">
      <div className="section-heading">
        <div>
          <p className="mini-label">步骤 2</p>
          <h2>当前切片结果</h2>
        </div>
        <p className="note muted">生成成功后，这里先给出世界摘要，再进入地图和文字观察窗。</p>
      </div>

      {result ? (
        <div className="result-stack">
          <div className="result-card emphasis-card story-card">
            <p className="mini-label">世界快照</p>
            <h3 className="story-card-title">{formatTagLabel(result.region_theme, '未命名切片')}</h3>
            <p className="note story-card-copy">{worldAtmosphere}</p>
            <div className="story-chip-row">
              <span>势力 · {formatTagLabel(result.dominant_faction, '-')}</span>
              <span>地点 · {result.poi_count ?? '-'}</span>
              <span>道路 · {result.road_count ?? '-'}</span>
              <span>地标 · {result.landmark_count ?? '-'}</span>
            </div>
          </div>

          <div className="result-grid">
            <div className="result-card">
              <p className="mini-label">你将进入什么</p>
              <div className="story-bullets">
                {sliceHighlights.map((item) => (
                  <div key={item} className="story-bullet">{item}</div>
                ))}
              </div>
            </div>
            <div className="result-card">
              <p className="mini-label">下一步</p>
              <div className="story-bullets">
                <div className="story-bullet">先打开下方地图，悬停节点查看地点名字与讽刺钩子。</div>
                <div className="story-bullet">点击一个节点，页面会把它提升为当前观察目标。</div>
                <div className="story-bullet">如果要看更完整的文本世界，再打开文字预览。</div>
              </div>
            </div>
          </div>

          <div className="link-row action-links">
            <a className="button-link" href={result.preview_url} target="_blank" rel="noreferrer">打开预览</a>
            <a href={result.world_url} target="_blank" rel="noreferrer">世界数据 world.json</a>
            <a href={result.manifest_url} target="_blank" rel="noreferrer">资源清单 manifest.json</a>
          </div>
        </div>
      ) : (
        <div className="empty-state story-empty-state">
          <div>
            <p className="empty-title">还没有打开任何世界切片</p>
            <p className="note muted">先选一个入口：可以用预设地点，也可以直接用浏览器定位。</p>
            <div className="empty-chips">
              <span>{statusOk ? '服务已就绪' : '先确认服务'}</span>
              <span>推荐先试演示样例世界</span>
              <span>生成后可直接点地图节点</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
