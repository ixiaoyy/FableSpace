export function buildEntryStatusText({ autoEntering, submitting, result }) {
  if (autoEntering) {
    return '正在自动进入附近地点'
  }

  if (submitting) {
    return '正在刷新当前地点切片'
  }

  if (result) {
    return '当前地点切片已就绪'
  }

  return '等待生成附近地点切片'
}

export function buildHeroMetrics({
  entryStatusText,
  form,
  mapLayerOptions,
  result,
  visibleMapLayers,
  originLabel,
}) {
  const visibleLayerCount = Object.values(visibleMapLayers || {}).filter(Boolean).length
  const mapReady = Boolean(result?.world)

  return {
    visibleLayerCount,
    cards: [
      {
        id: 'entry',
        label: '当前步骤',
        value: result ? '地点入口已建立' : entryStatusText,
        detail: result ? `当前入口锚定在 ${originLabel}` : `先确认入口：${originLabel}`,
      },
      {
        id: 'map',
        label: '现在就做',
        value: mapReady ? '先选一个地点' : '先生成附近地点',
        detail: mapReady
          ? `空间容器已可点击 · 当前显示 ${visibleLayerCount} / ${mapLayerOptions.length} 个图层`
          : `${form.radius}m 半径 · ${form.mode === 'fixture' ? '离线样例' : '实时地图'}`,
      },
      {
        id: 'world',
        label: '地点规模',
        value: result ? `${result?.poi_count ?? 0} 个候选地点` : '等待切片生成',
        detail: result
          ? `${result.landmark_count ?? 0} 个地标 · ${result.road_count ?? 0} 条路径`
          : '生成后即可选择地点并进入观察',
      },
    ],
  }
}

export function buildStageStatusViewModel({ autoEntering, submitting, result, activePoiId }) {
  if (autoEntering) {
    return {
      classNameSuffix: ' is-pending',
      label: '地点切片生成中',
      title: '系统正在根据当前位置生成附近地点切片，完成后会自动带你进入地点舞台。',
    }
  }

  if (submitting) {
    return {
      classNameSuffix: ' is-pending',
      label: '地点切片生成中',
      title: '正在准备地点内容与空间容器，请稍候，成功后页面会自动滚动到这里。',
    }
  }

  if (result && activePoiId) {
    return {
      classNameSuffix: ' is-ready',
      label: '当前地点已锁定',
      title: '你已经选中了一个地点，可以继续查看事件、角色线索与写回反馈。',
    }
  }

  if (result) {
    return {
      classNameSuffix: ' is-ready',
      label: '等待选择地点',
      title: '切片已经生成，先从地点列表里选一个地点，再进入后续动作。',
    }
  }

  return {
    classNameSuffix: '',
    label: '等待生成地点切片',
    title: '点击上方主按钮后，生成出的地点切片会出现在这里。',
  }
}
