import { useState, useMemo } from 'react'
import { ArrowLeft, Save, Sparkles, AlertTriangle, Layers, Info } from 'lucide-react'
import { Link } from 'react-router'

import {
  PROMPT_STYLE_DIAL_GROUPS,
  DEFAULT_PROMPT_STYLE_DIALS,
  normalizePromptStyleDials,
  compilePromptStyleDialLines,
  buildPromptLayerPreview,
} from './promptStyleDials.js'
import {
  assertCharacterPromptRiskCanSave,
} from './characterPromptRiskLinter.js'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

/**
 * PromptBlockEditor — 模块化视觉提示词块编辑器
 */
export default function PromptBlockEditor({
  character,
  space,
  onSave,
  onBack,
  disabled = false
}) {
  const [draft, setDraft] = useState(character)
  const [dials, setDials] = useState(character.style_dials || DEFAULT_PROMPT_STYLE_DIALS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // 模拟运行时注入的内容
  const simulatedWorldInfo = '命中关键词后注入店主确认的地点、传闻、背景或玩法线索。'
  const simulatedVisitorState = '回访次数、已确认记忆、当前 gameplay/session 状态；不公开其他访客私密内容。'

  const layers = useMemo(() => {
    return buildPromptLayerPreview(draft, dials)
  }, [draft, dials])

  const fullPromptSegments = useMemo(() => {
    // 最终拼接逻辑，带层标记用于预览高亮
    const dialLines = compilePromptStyleDialLines(dials)

    return [
      { id: 'platform_boundary', label: 'Platform Boundary', content: layers.find(l => l.id === 'platform_boundary')?.body },
      {
        id: 'character_card',
        label: 'SpaceCharacter',
        content: [
          `角色姓名：${draft.name}`,
          draft.description && `描述：${draft.description}`,
          draft.personality && `性格：${draft.personality}`,
          draft.scenario && `场景：${draft.scenario}`,
          draft.first_mes && `开场白：${draft.first_mes}`,
        ].filter(Boolean).join('\n')
      },
      {
        id: 'style_dials',
        label: 'Style Dials',
        content: `【FableSpace 风格拨盘】\n${dialLines.map(l => `- ${l}`).join('\n')}\n【/FableSpace 风格拨盘】`
      },
      { id: 'world_info', label: 'WorldInfo', content: `【世界背景补充】\n${simulatedWorldInfo}` },
      { id: 'visitor_state', label: 'Visitor State', content: `【当前访客关系与记忆】\n${simulatedVisitorState}` }
    ].filter(s => s.content)
  }, [draft, dials, layers])

  async function handleSave() {
    setBusy(true)
    setError('')
    try {
      // 风险检查
      assertCharacterPromptRiskCanSave(draft)
      await onSave({ ...draft, style_dials: dials })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleFieldChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="prompt-block-editor h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
      <header className="prompt-block-editor__header p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">提示词实验室：{character.name}</h1>
            <p className="text-sm text-violet-100/60 font-mono">Prompt Engineering Workbench v1.0</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack} disabled={busy} className="bg-white/5 hover:bg-white/10 border-white/10">
            取消
          </Button>
          <Button onClick={handleSave} disabled={busy || disabled} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold shadow-lg shadow-cyan-500/20">
            <Save className="h-4 w-4 mr-2" />
            应用并同步
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：积木栈 */}
        <section className="w-1/2 overflow-y-auto p-6 space-y-6 border-r border-white/5 custom-scrollbar">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-100/40 mb-2">
            <Layers className="h-3 w-3" />
            Prompt Layer Stack
          </div>
          
          <div className="space-y-4 pb-12">
            {layers.map((layer) => (
              <Card key={layer.id} className={`prompt-block border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300 overflow-hidden group`}>
                <CardHeader className="py-3 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-3 rounded-full ${
                        layer.id === 'character_card' ? 'bg-cyan-400' : 
                        layer.id === 'style_dials' ? 'bg-violet-400' : 
                        layer.id === 'platform_boundary' ? 'bg-slate-500' : 'bg-amber-400'
                      }`} />
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-white/90">{layer.label}</CardTitle>
                    </div>
                    {layer.id === 'character_card' && <Sparkles className="h-3.5 w-3.5 text-cyan-400 opacity-50" />}
                  </div>
                  <CardDescription className="text-[10px] text-violet-100/40 mt-1">{layer.helper}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 bg-black/20">
                  {layer.id === 'style_dials' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {PROMPT_STYLE_DIAL_GROUPS.map((group) => (
                        <div key={group.id} className="dial-group">
                          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-violet-100/50">{group.label}</label>
                          <select 
                            value={dials[group.id]} 
                            onChange={(e) => setDials({ ...dials, [group.id]: e.target.value })}
                            className="w-full rounded-md border border-white/5 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40 transition-colors"
                          >
                            {group.options.map((opt) => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  ) : layer.id === 'character_card' ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-violet-100/50">Name (角色姓名)</label>
                        <input 
                          type="text"
                          value={draft.name} 
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className="w-full rounded-md border border-white/5 bg-slate-950/80 px-3 py-2 text-xs text-violet-100/80 outline-none focus:border-cyan-400/40 transition-colors font-mono"
                          placeholder="角色姓名..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-violet-100/50">Description (核心描述/立绘)</label>
                        <textarea 
                          value={draft.description} 
                          onChange={(e) => handleFieldChange('description', e.target.value)}
                          className="w-full h-20 rounded-md border border-white/5 bg-slate-950/80 p-3 text-xs text-violet-100/80 outline-none focus:border-cyan-400/40 transition-colors resize-none font-mono"
                          placeholder="描述角色的外观、身份或核心设定..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-violet-100/50">Personality (性格设定)</label>
                        <textarea 
                          value={draft.personality} 
                          onChange={(e) => handleFieldChange('personality', e.target.value)}
                          className="w-full h-24 rounded-md border border-white/5 bg-slate-950/80 p-3 text-xs text-violet-100/80 outline-none focus:border-cyan-400/40 transition-colors resize-none font-mono"
                          placeholder="描述角色的核心性格..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-violet-100/50">Scenario (当前场景)</label>
                        <textarea 
                          value={draft.scenario} 
                          onChange={(e) => handleFieldChange('scenario', e.target.value)}
                          className="w-full h-20 rounded-md border border-white/5 bg-slate-950/80 p-3 text-xs text-violet-100/80 outline-none focus:border-cyan-400/40 transition-colors resize-none font-mono"
                          placeholder="描述角色所在的具体场景或任务..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-violet-100/50">First Message (开场白)</label>
                        <textarea 
                          value={draft.first_mes} 
                          onChange={(e) => handleFieldChange('first_mes', e.target.value)}
                          className="w-full h-20 rounded-md border border-white/5 bg-slate-950/80 p-3 text-xs text-violet-100/80 outline-none focus:border-cyan-400/40 transition-colors resize-none font-mono"
                          placeholder="角色打招呼的第一句话..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <pre className="whitespace-pre-wrap rounded-md bg-black/40 p-3 text-[11px] leading-relaxed text-violet-100/60 font-mono border border-white/[0.02]">
                        {layer.body}
                      </pre>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-white/30 border border-white/10 uppercase font-mono">Read Only</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 右侧：实时预览 */}
        <section className="w-1/2 bg-black/40 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-100/40">
              <Sparkles className="h-3 w-3" />
              Compiled System Prompt
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-500/80 font-mono">Live Preview Syncing</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.03),transparent_50%)]">
            <div className="max-w-2xl mx-auto space-y-6 pb-20">
              {fullPromptSegments.map((segment, idx) => (
                <div key={idx} className="relative group">
                  <div className={`absolute -left-4 top-0 bottom-0 w-1 rounded-full opacity-30 group-hover:opacity-100 transition-opacity ${
                    segment.id === 'character_card' ? 'bg-cyan-400' : 
                    segment.id === 'style_dials' ? 'bg-violet-400' : 
                    segment.id === 'platform_boundary' ? 'bg-slate-500' : 'bg-amber-400'
                  }`} />
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                      segment.id === 'character_card' ? 'bg-cyan-400/10 text-cyan-400' : 
                      segment.id === 'style_dials' ? 'bg-violet-400/10 text-violet-400' : 
                      segment.id === 'platform_boundary' ? 'bg-slate-500/10 text-slate-400' : 'bg-amber-400/10 text-amber-400'
                    }`}>
                      {segment.label}
                    </span>
                  </div>
                  <div className="text-sm leading-7 text-violet-50/90 font-mono whitespace-pre-wrap pl-2 border-l border-white/5 italic group-hover:not-italic transition-all">
                    {segment.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="m-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="font-bold mb-1">Risk Warning</p>
                <p className="text-xs text-red-200/80">{error}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
