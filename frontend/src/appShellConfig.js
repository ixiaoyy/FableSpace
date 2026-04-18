export const LOCATION_PRESETS = [
  {
    id: 'shanghai-bund',
    title: '上海外滩',
    subtitle: '高密度都市切片 / 近代地标 / 江岸夜景',
    lat: '31.2400',
    lon: '121.4900',
    radius: '320',
    mode: 'live',
  },
  {
    id: 'beijing-tiananmen',
    title: '北京天安门周边',
    subtitle: '纪念性空间 / 中轴线 / 大尺度城市界面',
    lat: '39.9087',
    lon: '116.3975',
    radius: '360',
    mode: 'live',
  },
  {
    id: 'fixture-demo',
    title: '离线演示样例',
    subtitle: '离线可用，仅用于确认生成链路，不代表国内风格',
    lat: '35.6580',
    lon: '139.7016',
    radius: '300',
    mode: 'fixture',
  },
]

export const INITIAL_FORM = {
  lat: '35.6580',
  lon: '139.7016',
  radius: '300',
  mode: 'fixture',
  seed: '',
}

export const INITIAL_WRITEBACK_FORM = {
  playerId: 'player_local',
  eventType: 'observe',
  visibility: 'private',
  targetType: 'poi',
  targetId: 'poi_clocktower_01',
  sliceId: 'slice_demo_shibuya',
  zoneId: 'zone_shibuya_core',
  intensity: '1',
  tag: 'safe',
  note: '',
}

export const WRITEBACK_ACTIONS = [
  {
    eventType: 'observe',
    label: '观察',
    hint: '留下第一层观察痕迹，提升地点熟悉度与玩家 attunement。',
  },
  {
    eventType: 'dwell',
    label: '驻足',
    hint: '让区域开始记住你的步频，提升 clarity 并降低 tension。',
  },
  {
    eventType: 'mark',
    label: '标记',
    hint: '给地点留下可回访的语义标签，为后续世界编排提供稳定输入。',
  },
  {
    eventType: 'repair',
    label: '修复',
    hint: '为地标贡献一次修复，积累城市荣誉榜排名。仅对 landmark 目标有效。',
  },
]

export const VISIBILITY_OPTIONS = [
  {
    value: 'private',
    label: 'private',
    title: '留给你自己',
    hint: '默认私有。适合观察记录、个人驻足痕迹、私密地点标记，不进入公共空间。',
    access: '仅你自己可见，可随时删除，不会进入广播或公共回声池。',
    semantics: '把一次进入先留成你自己的隐秘回声，适合试探、记忆和未成熟的判断。',
    participationLabel: '私人记忆胶囊',
    participationAction: '适合用 observe 或 mark 留下一次仅自己可回访的地点感受。',
    participationReward: '会先沉淀为可回访的个人痕迹，不直接进入他人可见层。',
  },
  {
    value: 'local_public',
    label: 'local_public',
    title: '分享到当前区域',
    hint: '适合区域传闻、公共情绪标签与轻量共创句子，会留在目标 zone 的局部公共层。',
    access: '需要满足区域熟悉度与内容门槛，通过后只在该区域内对其他玩家可见。',
    semantics: '把你对这片街区的理解交给同一地区的后来者，形成可继承的街头传说。',
    participationLabel: '街区传说条目',
    participationAction: '适合把 note 写成一句传闻、提示或地方气质描述。',
    participationReward: '若通过门槛，会进入当前区域的局部公共层，推进本地 myth thread。',
  },
  {
    value: 'global',
    label: 'global',
    title: '尝试进入城市神话层',
    hint: '高门槛公共表达，适合修复痕迹、长期命名与可能影响全城叙事的内容。',
    access: '普通玩家不能直接稳定写入，需要精选、冷却或更高权限才能晋升。',
    semantics: '这不是普通广播，而是尝试把一次行动抬升成整座城市会记得的神话材料。',
    participationLabel: '城市神话提案',
    participationAction: '适合修复行为、长期命名候选或希望影响全城语义的记录。',
    participationReward: '通常只会作为候选提案进入更高层筛选，不保证立即成为全局叙事。',
  },
]

export const DEFAULT_VISIBLE_MAP_LAYERS = {
  roads: true,
  pois: true,
  landmarks: true,
  factionZones: true,
  labels: true,
  legend: true,
  ghostTraces: true,
}

export const MAP_LAYER_OPTIONS = [
  { key: 'roads', label: '路径', hint: '显示地点之间的路径骨架与道路发光' },
  { key: 'pois', label: '地点', hint: '显示可点击的候选地点与进入入口' },
  { key: 'landmarks', label: '地标', hint: '显示大型地标与地点装饰图标' },
  { key: 'factionZones', label: '阵营影响区', hint: '显示势力在地点周边的扩散光晕' },
  { key: 'labels', label: '地点标签', hint: '显示地点名与空间说明' },
  { key: 'legend', label: '图例', hint: '显示右下角图例与阵营色板' },
  { key: 'ghostTraces', label: '回访痕迹', hint: '显示玩家残影与回访痕迹' },
]

export const MAP_LAYER_PRESETS = [
  {
    key: 'explore',
    label: '探索',
    hint: '保留完整地点信息，适合第一次进入切片',
    layers: {
      roads: true,
      pois: true,
      landmarks: true,
      factionZones: true,
      labels: true,
      legend: true,
      ghostTraces: true,
    },
  },
  {
    key: 'navigation',
    label: '导航',
    hint: '突出路径、地标与路标，减少干扰信息',
    layers: {
      roads: true,
      pois: true,
      landmarks: true,
      factionZones: false,
      labels: true,
      legend: false,
      ghostTraces: false,
    },
  },
  {
    key: 'narrative',
    label: '叙事',
    hint: '保留阵营、标签与残影，强调地点气氛',
    layers: {
      roads: false,
      pois: true,
      landmarks: true,
      factionZones: true,
      labels: true,
      legend: true,
      ghostTraces: true,
    },
  },
]
