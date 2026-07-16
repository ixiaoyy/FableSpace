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
  totalSpaces = 0,
  matchingSpaces = 0,
  openSpaces = 0,
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
          value: '从门牌开始',
          detail: '先把店开起来，再慢慢补细节。',
        },
        {
          id: 'manage',
          label: '店主后台',
          value: '吧台账本',
          detail: '空间、角色和访客都收在这里。',
        },
        {
          id: 'memory',
          label: '回访价值',
          value: '常客会留下痕迹',
          detail: '回访时，故事不用每次从零开始。',
        },
      ],
    }
  }

  return {
    visibleLayerCount,
    cards: [
      {
        id: 'spaces',
        label: '附近空间',
        value: totalSpaces > 0 ? `${matchingSpaces} / ${totalSpaces} 间` : '等待发现',
        detail: openSpaces > 0
          ? `${openSpaces} 盏灯亮着，挑一间进去。`
          : '刷新后看看附近有没有灯亮。',
      },
      {
        id: 'location',
        label: '当前位置',
        value: originLabel,
        detail: mapReady
          ? `地图已铺开 · ${visibleLayerCount} / ${mapLayerOptions.length} 层亮着`
          : `${form.radius}m 范围 · 真实街区`,
      },
      {
        id: 'memory',
        label: 'NPC 记忆',
        value: '入场后可查看',
        detail: result
          ? `${result?.poi_count ?? 0} 个地点正等着变成故事入口。`
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
      title: '系统正在根据当前位置准备附近地点与空间入口，完成后会自动带你到地图区域。',
    }
  }

  if (submitting) {
    return {
      classNameSuffix: ' is-pending',
      label: '正在刷新附近内容',
      title: '正在准备地点、空间和地图标记，请稍候，成功后页面会自动滚动到这里。',
    }
  }

  if (result && activePoiId) {
    return {
      classNameSuffix: ' is-ready',
      label: '当前地点已锁定',
      title: '你已经选中了一个地点，可以继续查看附近空间、地点线索和后续动作。',
    }
  }

  if (result) {
    return {
      classNameSuffix: ' is-ready',
      label: '地图已准备',
      title: '附近内容已经生成，可以从地图或空间列表中选择下一步。',
    }
  }

  return {
    classNameSuffix: '',
    label: '等待查看附近地点',
    title: '点击上方主按钮后，附近地点和空间入口会出现在这里。',
  }
}
