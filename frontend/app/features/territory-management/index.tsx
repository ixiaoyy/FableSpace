import React, { useState } from 'react';
import {
  Rocket,
  Server,
  ShieldCheck,
  Puzzle,
  Code,
  Users,
  FolderOpen,
  Box,
  Zap,
  Key,
  RefreshCw,
  Trash2,
  MapPin,
  Compass,
  ChevronRight,
  Gift,
  Plus,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2
} from 'lucide-react';
import WorldMap from '../../product/WorldMap';

export function TerritoryManagementDashboard({
  space,
  territory,
  onClaim,
  onUpdate,
  onDelete,
  busy = false,
  message = ""
}) {
  const isClaimed = !!territory;

  return (
    <div className="min-h-screen bg-[#f8f9fe] font-sans relative overflow-hidden text-slate-800">
      {/* Anime style background grid */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#e5e7eb 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-pink-300/30 via-purple-300/20 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-300/30 to-transparent rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/3"></div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Anime Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-800 to-fuchsia-700 overflow-hidden shadow-[0_20px_50px_-12px_rgba(107,33,168,0.5)] border border-white/10">
          {/* Tech/Anime HUD decorative elements */}
          <div className="absolute top-4 left-6 text-white/30 font-mono text-xs font-bold tracking-widest">// FABLESPACE.SYS :: TERRITORY_LINK_ACTIVE</div>
          <div className="absolute bottom-4 right-6 text-white/30 font-mono text-xs font-bold tracking-widest">[ READY ]</div>
          {/* Subtle grid pattern over banner */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px] mix-blend-overlay"></div>
          
          <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between">
            <div className="text-white space-y-5 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold border border-white/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Sparkles className="w-4 h-4" />
                <span className="tracking-widest uppercase">Owner Console</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight drop-shadow-lg">
                一键开启
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 drop-shadow-sm">二次元专属酒馆</span>
              </h1>
              <p className="text-purple-200 text-base md:text-lg font-medium tracking-wide backdrop-blur-sm bg-black/20 inline-block px-4 py-2 rounded-xl border border-white/5">
                ★ 真实坐标映射 · 打造专属社交空间 ★
              </p>
            </div>
            
            {/* Guide Character Placeholder - Inline SVG to fix 404 */}
            <div className="mt-8 md:mt-0 relative w-64 h-64 md:w-80 md:h-80 hidden md:flex items-center justify-center group">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-fuchsia-500 rounded-full animate-pulse blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform duration-500">
                {/* Fallback Anime-style Mascot SVG */}
                <svg viewBox="0 0 200 200" className="w-48 h-48 text-white opacity-90" fill="currentColor">
                  <path d="M100 20C55.8 20 20 55.8 20 100c0 44.2 35.8 80 80 80s80-35.8 80-80c0-44.2-35.8-80-80-80zm0 145c-35.8 0-65-29.2-65-65s29.2-65 65-65 65 29.2 65 65-29.2 65-65 65z" fillOpacity="0.2"/>
                  <path d="M70 85c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15zm60 0c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15zm-30 45c-15 0-28.5-7.5-36-19.5 2.5-4 7-6.5 12-6.5h48c5 0 9.5 2.5 12 6.5-7.5 12-21 19.5-36 19.5z"/>
                  {/* Cat ears / anime accessories */}
                  <path d="M40 50L60 70L80 50Z" />
                  <path d="M160 50L140 70L120 50Z" />
                </svg>
              </div>
              
              {/* Floating elements around character */}
              <div className="absolute top-12 right-4 bg-white/10 backdrop-blur-md p-3 rounded-2xl rounded-br-none shadow-xl border border-white/20 animate-bounce delay-100">
                <span className="font-bold text-cyan-300 text-sm">主人，欢迎回来！</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column: My Space Info */}
          <div className="xl:col-span-2 space-y-6">
            {/* Glassmorphism Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-300/10 to-transparent rounded-bl-full pointer-events-none"></div>

              
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-2xl shadow-lg shadow-cyan-500/30">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">我的酒馆领地</h2>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-sm font-black border-2 ${isClaimed ? 'bg-green-100 border-green-200 text-green-600 shadow-[0_0_10px_rgba(74,222,128,0.3)]' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                  {isClaimed ? 'STATUS: ONLINE' : 'STATUS: OFFLINE'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="访问地址" value={isClaimed ? `fablespace.app/t/${space?.id}` : '等待申领...'} isMono />
                <InfoItem label="中心坐标" value={isClaimed ? `${territory.center_lat.toFixed(6)}, ${territory.center_lon.toFixed(6)}` : '未绑定坐标'} />
                <InfoItem label="领地半径" value={isClaimed ? `${territory.radius} 米` : '-'} />
                <InfoItem label="领地类型" value={isClaimed ? territory.type : '-'} badge />
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                {isClaimed ? (
                  <>
                    <button className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-[0_10px_20px_-10px_rgba(6,182,212,0.8)] hover:shadow-[0_15px_25px_-10px_rgba(6,182,212,1)] hover:-translate-y-1 text-lg border-2 border-cyan-400/50">
                      进入专属空间
                    </button>
                    <button className="flex-1 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-[0_10px_20px_-10px_rgba(245,158,11,0.8)] hover:shadow-[0_15px_25px_-10px_rgba(245,158,11,1)] hover:-translate-y-1 text-lg flex items-center justify-center gap-2 border-2 border-amber-300/50">
                      <Zap className="w-5 h-5" /> 开放设置
                    </button>
                    <button className="p-4 bg-white text-slate-400 rounded-2xl hover:text-cyan-500 transition-colors border-2 border-slate-100 hover:border-cyan-200 shadow-sm">
                      <RefreshCw className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={onClaim}
                    disabled={busy}
                    className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-black py-5 px-8 rounded-2xl transition-all shadow-[0_10px_30px_-10px_rgba(236,72,153,0.8)] hover:shadow-[0_15px_40px_-10px_rgba(236,72,153,1)] hover:-translate-y-1 text-xl flex items-center justify-center gap-3 border-2 border-pink-400/50 group"
                  >
                    <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" /> 
                    立即申领专属领地
                  </button>
                )}
              </div>
              
              {message && <div className="mt-6 p-4 bg-red-100/80 border-2 border-red-200 text-red-600 rounded-2xl text-sm font-bold">{message}</div>}
            </div>

            {/* Map Preview Section */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col min-h-[400px] relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800">领地地图预览</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">3D Map Visualization</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-slate-50 rounded-[2rem] relative overflow-hidden border border-slate-100 group min-h-[300px]">
                <WorldMap 
                  territories={territory ? [territory] : []}
                  onPoiClick={() => {}}
                  activePoiId=""
                  familiarityMap={{}}
                  originLabel="领地中心"
                  visibleLayers={{ territories: true }}
                  onSpaceClick={() => {}}
                  activeSpaceId=""
                  world={{
                    source: {
                      lat: territory?.center_lat || 39.9042,
                      lon: territory?.center_lon || 116.4074,
                      name: territory?.name || "领地中心"
                    }
                  }}
                />
                
                {!isClaimed && (
                  <div className="absolute inset-0 z-10 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 p-6 rounded-3xl shadow-xl max-w-xs text-center border border-white">
                      <Compass className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-800">尚未申领领地</p>
                      <p className="text-xs text-slate-500 mt-1">申领后即可在地图上查看您的次元坐标锚点</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Feature Cards Grid - Anime Chibi Style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AnimeFeatureCard icon={<Rocket />} title="一键开店" desc="真实坐标建站" color="pink" />
              <AnimeFeatureCard icon={<Server />} title="多NPC实例" desc="一个酒馆多人格" color="purple" />
              <AnimeFeatureCard icon={<ShieldCheck />} title="主权保护" desc="领地防碰撞" color="cyan" />
              <AnimeFeatureCard icon={<Puzzle />} title="场景插件" desc="扩展无限可能" color="green" />
              <AnimeFeatureCard icon={<Code />} title="开放能力" desc="更多互动入口" color="amber" />
              <AnimeFeatureCard icon={<Users />} title="访客系统" desc="轻松管理记录" color="blue" />
              <AnimeFeatureCard icon={<FolderOpen />} title="资产管理" desc="记忆日志全掌控" color="indigo" />
              <AnimeFeatureCard icon={<Box />} title="独立运行" desc="互不干扰更稳定" color="rose" />
            </div>
          </div>

          {/* Right Column: Quick Actions & Promos */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative">
              {/* Event Banner */}
              <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl p-4 mb-6 flex items-center justify-between border border-pink-200/50 shadow-inner group cursor-pointer hover:from-pink-200 hover:to-purple-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl text-pink-500 shadow-sm group-hover:scale-110 transition-transform">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">专属迎新礼包</h3>
                    <p className="text-xs font-bold text-pink-500 mt-0.5">SSR 级装饰限时领！</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-pink-500">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2">
                <AnimeQuickAction icon={<Gift />} label="查看空间礼包" tag="HOT" color="pink" />
                <AnimeQuickAction icon={<Zap />} label="一键加载二次元预设" color="purple" />
                <AnimeQuickAction icon={<Puzzle />} label="空间互动模板" color="cyan" />
                <AnimeQuickAction icon={<FolderOpen />} label="空间数字资产管理" color="indigo" />
              </div>

              <div className="h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent my-4"></div>

              <div className="space-y-2">
                <AnimeQuickAction icon={<Compass />} label="迁移至新坐标" color="slate" />
                <AnimeQuickAction 
                  icon={<Trash2 />} 
                  label="废弃当前领地" 
                  color="red" 
                  isDestructive 
                  disabled={!isClaimed || busy}
                  onClick={onDelete}
                />
              </div>
            </div>

            {/* Pro CTA Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-700">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 blur-2xl rounded-full"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/20 blur-2xl rounded-full"></div>
              
              <div className="relative z-10">
                <div className="inline-block px-3 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-black rounded-full mb-4 border border-cyan-500/30">
                  PRO VERSION
                </div>
                <h3 className="font-black text-2xl mb-2">高级定制服务</h3>
                <p className="text-slate-400 text-sm font-medium mb-6">一键接入顶级模型、专属动漫世界设定与无限记忆体。</p>
                
                <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black py-4 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                  立即升级体验 <Zap className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, isMono = false, badge = false }) {
  return (
    <div className="bg-white/50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1 hover:bg-white hover:shadow-sm transition-all">
      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</span>
      <div className={`text-slate-700 font-bold ${isMono ? 'font-mono text-sm break-all' : 'text-lg'}`}>
        {badge ? (
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-sm border border-indigo-100">
            {value}
          </span>
        ) : value}
      </div>
    </div>
  );
}

function AnimeFeatureCard({ icon, title, desc, color }) {
  const colorStyles = {
    pink: 'bg-pink-50 text-pink-500 border-pink-100 hover:border-pink-300 hover:shadow-pink-500/20',
    purple: 'bg-purple-50 text-purple-500 border-purple-100 hover:border-purple-300 hover:shadow-purple-500/20',
    cyan: 'bg-cyan-50 text-cyan-500 border-cyan-100 hover:border-cyan-300 hover:shadow-cyan-500/20',
    green: 'bg-emerald-50 text-emerald-500 border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-500/20',
    amber: 'bg-amber-50 text-amber-500 border-amber-100 hover:border-amber-300 hover:shadow-amber-500/20',
    blue: 'bg-blue-50 text-blue-500 border-blue-100 hover:border-blue-300 hover:shadow-blue-500/20',
    indigo: 'bg-indigo-50 text-indigo-500 border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-500/20',
    rose: 'bg-rose-50 text-rose-500 border-rose-100 hover:border-rose-300 hover:shadow-rose-500/20',
  };

  const activeColor = colorStyles[color] || colorStyles.pink;

  return (
    <div className={`bg-white/80 backdrop-blur-sm p-5 rounded-3xl border-2 transition-all duration-300 group cursor-pointer ${activeColor}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-white shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
        {React.cloneElement(icon, { className: 'w-6 h-6' })}
      </div>
      <h3 className="font-black text-slate-800 text-sm mb-1.5">{title}</h3>
      <p className="text-xs font-bold opacity-70 leading-tight">{desc}</p>
    </div>
  );
}

function AnimeQuickAction({ icon, label, tag = null, color = 'slate', isDestructive = false, onClick = () => {}, disabled = false }) {
  const colorMap = {
    pink: 'text-pink-500',
    purple: 'text-purple-500',
    cyan: 'text-cyan-500',
    indigo: 'text-indigo-500',
    slate: 'text-slate-500',
    red: 'text-red-500',
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-4 rounded-2xl bg-white/50 border-2 border-transparent hover:bg-white transition-all group ${isDestructive ? 'hover:border-red-200 hover:shadow-[0_5px_15px_rgba(239,68,68,0.1)]' : 'hover:border-indigo-100 hover:shadow-[0_5px_15px_rgba(99,102,241,0.05)]'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-slate-50 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm ${colorMap[color]}`}>
          {React.cloneElement(icon, { className: 'w-4 h-4' })}
        </div>
        <span className={`text-sm font-bold ${isDestructive ? 'text-red-500' : 'text-slate-700'}`}>{label}</span>
      </div>
      {tag && (
        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm animate-pulse">
          {tag}
        </span>
      )}
    </button>
  );
}
