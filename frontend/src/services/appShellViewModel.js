export function buildEntryStatusText({ autoEntering, submitting, result }) {
  if (autoEntering) {
    return '正在读取你附近的地点'
  }

  if (submitting) {
    return '正在刷新附近内容'
  }

  if (result) {
    return '附近地图已准备好'
  }

  return '等待查看附近地点'
}

export function buildHeroMetrics({
  entryStatusText,
  form,
  mapLayerOptions,
  result,
  visibleMapLayers,
  originLabel,
  view = 'map',
  totalTaverns = 0,
  matchingTaverns = 0,
  openTaverns = 0,
}) {
  const visibleLayerCount = Object.values(visibleMapLayers || {}).filter(Boolean).length
  const mapReady = Boolean(result?.world)

  if (view === 'owner') {
    return {
      visibleLayerCount,
      cards: [
        {
          id: 'create',
          label: '开店路径',
          value: '3 分钟向导',
          detail: '地点 → 酒馆 → 角色 → AI → 开门，普通字段优先展示。',
        },
        {
          id: 'manage',
          label: '店主后台',
          value: '酒馆 / 角色 / AI / 访客',
          detail: '经营核心默认可见，世界书和调试能力后续放入高级区。',
        },
        {
          id: 'memory',
          label: '回访价值',
          value: '访客关系可追踪',
          detail: '常客、最近会话和关系阶段会在记忆面板里逐步沉淀。',
        },
      ],
    }
  }

  return {
    visibleLayerCount,
    cards: [
      {
        id: 'taverns',
        label: '附近酒馆',
        value: totalTaverns > 0 ? `${matchingTaverns} / ${totalTaverns} 间` : '等待发现',
        detail: openTaverns > 0
          ? `${openTaverns} 间营业中，可从地图标记或列表卡片进入。`
          : '刷新附近内容后，会显示可进入的公开酒馆。',
      },
      {
        id: 'location',
        label: '当前位置',
        value: originLabel,
        detail: mapReady
          ? `地图已准备 · 当前显示 ${visibleLayerCount} / ${mapLayerOptions.length} 个图层`
          : `${form.radius}m 范围 · ${form.mode === 'fixture' ? '离线样例' : '实时地图'}`,
      },
      {
        id: 'memory',
        label: 'NPC 记忆',
        value: '入场后可查看',
        detail: result
          ? `${result?.poi_count ?? 0} 个附近地点可作为酒馆锚点或探索入口。`
          : entryStatusText,
      },
    ],
  }
}

export function buildStageStatusViewModel({ autoEntering, submitting, result, activePoiId }) {
  if (autoEntering) {
    return {
      classNameSuffix: ' is-pending',
      label: '正在读取附近地点',
      title: '系统正在根据当前位置准备附近地点与酒馆入口，完成后会自动带你到地图区域。',
    }
  }

  if (submitting) {
    return {
      classNameSuffix: ' is-pending',
      label: '正在刷新附近内容',
      title: '正在准备地点、酒馆和地图标记，请稍候，成功后页面会自动滚动到这里。',
    }
  }

  if (result && activePoiId) {
    return {
      classNameSuffix: ' is-ready',
      label: '当前地点已锁定',
      title: '你已经选中了一个地点，可以继续查看附近酒馆、地点线索和后续动作。',
    }
  }

  if (result) {
    return {
      classNameSuffix: ' is-ready',
      label: '地图已准备',
      title: '附近内容已经生成，可以从地图或酒馆列表中选择下一步。',
    }
  }

  return {
    classNameSuffix: '',
    label: '等待查看附近地点',
    title: '点击上方主按钮后，附近地点和酒馆入口会出现在这里。',
  }
}
