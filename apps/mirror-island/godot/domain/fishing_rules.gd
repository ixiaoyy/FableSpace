class_name FarmFishingRules
extends RefCounted
## 单按钮钓鱼状态机，临时张力和等待不写入存档；鱼获仅提交一次。

var runtime: Dictionary={}
var inventory: FarmInventory
var world: FarmWorldRules
var fish: Array

## 绑定当前活动鱼表、库存和已登记钓位。
func _init(items: FarmInventory, catalog: FarmWorldRules, definitions: Array) -> void:
	inventory=items; world=catalog; fish=definitions

## 按钓鱼熟练度耗能开始抛竿，保留小数余量；仍按已保存尝试次数决定后续鱼种。
func start(state: Dictionary, zone_id: String) -> String:
	if not runtime.is_empty(): return "already-fishing"
	if state.day<7 or state.minuteOfDay>=1560: return "not-ready"
	if inventory.quantity(state.inventory,"fishing-rod")<1: return "missing-rod"
	var zone: Dictionary=world.zones.get(zone_id,{})
	if zone.is_empty() or zone.regionId!=state.player.regionId: return "missing-zone"
	if FarmWorldRules.point(state.player).distance_to(Vector2(zone.x+zone.width/2.0,zone.y+zone.height/2.0))>52: return "too-far"
	if state.stamina<FarmEnergyRules.unit_cost(state,"fishing-rod"): return "insufficient-stamina"
	if state.fishingCastCount>=FarmWorldRules.LIMIT: return "not-ready"
	if not FarmEnergyRules.spend(state,"fishing-rod"): return "insufficient-stamina"
	state.fishingCastCount+=1
	runtime={"phase":"casting","zoneId":zone_id,"held":false,"elapsedMs":0.0,"biteAtMs":0,"castPower":0.0,"tension":50.0,"progress":0.0,"fish":null,"attempt":state.fishingCastCount,"failureReason":null}
	return "started"

## 接收按下/释放；抛竿蓄力后释放或咬钩时按下推进相应阶段。
func set_held(state: Dictionary, held: bool) -> void:
	if runtime.is_empty() or terminal(): return
	var previous: bool=runtime.held
	runtime.held=held
	if runtime.phase=="casting" and previous and not held and runtime.castPower>0: _commit_cast(state)
	elif runtime.phase=="waiting" and not previous and held and bite():
		runtime.phase="reeling"; runtime.elapsedMs=0.0; runtime.held=true

## 在每次最多一秒、内部五十毫秒的步长下推进，返回终局结果或空字符串。
func tick(state: Dictionary, elapsed: float) -> String:
	if runtime.is_empty() or terminal() or elapsed<=0: return ""
	var remaining:=minf(1000,elapsed)
	while remaining>0 and not terminal():
		var step:=minf(50,remaining); remaining-=step
		runtime.elapsedMs+=step
		if runtime.phase=="casting":
			if runtime.held: runtime.castPower=minf(100,runtime.castPower+step/12.0)
			if runtime.castPower>=100: _commit_cast(state)
		elif runtime.phase=="waiting":
			if runtime.elapsedMs>runtime.biteAtMs+900:
				runtime.phase="escaped"; runtime.failureReason="missed-bite"; return "escaped"
		elif runtime.phase=="reeling" and runtime.fish!=null:
			var seconds:=step/1000.0
			var pulse: int=(floori(runtime.elapsedMs/450.0)+int(runtime.fish.pull))%3-1
			runtime.tension+=(28 if runtime.held else -22)*seconds+pulse*runtime.fish.pull*seconds
			var safe: bool=runtime.tension>=22 and runtime.tension<=78
			runtime.progress=clampf(runtime.progress+(30 if safe else -12)*seconds,0,100)
			if runtime.tension<=0 or runtime.tension>=100:
				runtime.phase="escaped"; runtime.failureReason="line-broke" if runtime.tension>=100 else "slack-line"; return "escaped"
			if runtime.progress>=100:
				var quality:=0
				if not inventory.add(state.inventory,runtime.fish.itemId,1,quality): runtime.phase="inventory-full"; return "inventory-full"
				FarmSkillRules.gain(state,"fishing",FarmSkillRules.fishing_xp(quality,int(runtime.fish.difficulty)))
				runtime.phase="caught"; return "caught"
	return ""

## 终局只等待保存或关闭，不再产生鱼获。
func terminal() -> bool:
	return not runtime.is_empty() and runtime.phase in ["caught","escaped","inventory-full"]

## 咬钩窗口含两个边界，保持九百毫秒反应时间。
func bite() -> bool:
	return not runtime.is_empty() and runtime.phase=="waiting" and runtime.elapsedMs>=runtime.biteAtMs and runtime.elapsedMs<=runtime.biteAtMs+900

## 按时段、天气和抛竿强度选择旧鱼种表中的稳定候选。
func _commit_cast(state: Dictionary) -> void:
	runtime.castPower=maxi(5,roundi(runtime.castPower))
	var pool:=_eligible(state,runtime.castPower)
	if pool.is_empty(): pool=_eligible(state,0)
	var hash_value:=FarmWorldRules.stable_hash(state.worldSeed,state.day,"%s:%d:%d:%d"%[runtime.zoneId,state.minuteOfDay,runtime.attempt,runtime.castPower])
	runtime.fish=null if pool.is_empty() else pool[hash_value%pool.size()]
	runtime.phase="waiting"; runtime.held=false; runtime.elapsedMs=0.0
	runtime.biteAtMs=1800+FarmWorldRules.stable_hash(state.worldSeed,state.day,"%s:bite:%d"%[runtime.zoneId,runtime.attempt])%2200

## 过滤鱼种，不在迁移时改变窗口截止的严格小于语义。
func _eligible(state: Dictionary, strength: int) -> Array:
	return fish.filter(func(item:Dictionary)->bool:return state.minuteOfDay>=item.minMinute and state.minuteOfDay<item.maxMinute and (not item.has("weather") or item.weather==state.weather.current) and strength>=item.minCast)
