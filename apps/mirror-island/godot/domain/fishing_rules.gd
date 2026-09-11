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
	runtime={"phase":"casting","zoneId":zone_id,"held":false,"elapsedMs":0.0,"biteAtMs":0,"castPower":0.0,"tension":50.0,"progress":0.0,"fish":null,"quality":0,"perfect":false,"attempt":state.fishingCastCount,"failureReason":null}
	return "started"

## 接收按下/释放；抛竿蓄力后释放或咬钩时按下推进相应阶段。
func set_held(state: Dictionary, held: bool) -> void:
	if runtime.is_empty() or terminal(): return
	var previous: bool=runtime.held
	runtime.held=held
	if runtime.phase=="casting" and previous and not held and runtime.castPower>0: _commit_cast(state)
	elif runtime.phase=="waiting" and not previous and held and bite():
		runtime.phase="reeling"; runtime.elapsedMs=0.0; runtime.held=true; runtime.perfect=true

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
			if not safe: runtime.perfect=false
			runtime.progress=clampf(runtime.progress+(30 if safe else -12)*seconds,0,100)
			if runtime.tension<=0 or runtime.tension>=100:
				runtime.phase="escaped"; runtime.failureReason="line-broke" if runtime.tension>=100 else "slack-line"; return "escaped"
			if runtime.progress>=100:
				var base_quality:=catch_quality(state)
				var perfect: bool=bool(runtime.get("perfect",false))
				var quality:=_perfect_quality(base_quality)
				if not inventory.add(state.inventory,runtime.fish.itemId,1,quality): runtime.phase="inventory-full"; return "inventory-full"
				runtime.quality=quality
				FarmSkillRules.gain(state,"fishing",FarmSkillRules.fishing_xp(base_quality,int(runtime.fish.difficulty),perfect))
				runtime.phase="caught"; return "caught"
	return ""

## 终局只等待保存或关闭，不再产生鱼获。
func terminal() -> bool:
	return not runtime.is_empty() and runtime.phase in ["caught","escaped","inventory-full"]

## 咬钩窗口含两个边界，保持九百毫秒反应时间。
func bite() -> bool:
	return not runtime.is_empty() and runtime.phase=="waiting" and runtime.elapsedMs>=runtime.biteAtMs and runtime.elapsedMs<=runtime.biteAtMs+900

## 按当前项目已有的抛竿力度和钓位深度计算完美前的原始鱼获品质；不包含宝箱或鱼漂加成。
func catch_quality(state: Dictionary) -> int:
	if runtime.is_empty() or runtime.get("fish")==null: return 0
	var distance:=_quality_distance()
	var skill:=_quality_skill(state)
	var random_factor:=90+FarmWorldRules.stable_hash(state.worldSeed,state.day,"%s:quality-random:%d:%s"%[runtime.zoneId,int(runtime.attempt),runtime.fish.itemId])%21
	var score:=clampf(float(distance)/5.0*float(skill+2)/10.0*float(random_factor)/100.0,0.0,1.0)
	if score>=0.66: return 2
	if score>=0.33: return 1
	return 0

## 把完美收线的银星或金星鱼提升一档；普通鱼不提升，金星可进入铱星。
func _perfect_quality(base_quality: int) -> int:
	if not bool(runtime.get("perfect",false)) or base_quality<1: return base_quality
	var index: int=FarmQualityRules.VALUES.find(base_quality)
	if index<1: return base_quality
	return int(FarmQualityRules.VALUES[mini(index+1,FarmQualityRules.VALUES.size()-1)])

## 使用钓位标定的最大离岸距离和当前抛竿力度，返回 1–5 的本次品质距离。
func _quality_distance() -> int:
	var zone: Dictionary=world.zones.get(runtime.get("zoneId",""),{})
	var maximum:=clampi(int(zone.get("maxQualityDistance",1)),1,5)
	var power:=clampf(float(runtime.get("castPower",0.0)),0.0,100.0)
	return clampi(ceili(float(maximum)*power/100.0),1,maximum)

## 复用原作的偶数技能抽样口径；十级固定为 10，十级前从当前偶数等级到 10 中稳定抽取。
func _quality_skill(state: Dictionary) -> int:
	var level:=clampi(int(state.skills.fishing.level),0,10)
	if level>=10: return 10
	var minimum:=level-level%2
	var count:=floori(float(10-minimum)/2.0)+1
	var index:=FarmWorldRules.stable_hash(state.worldSeed,state.day,"%s:quality-skill:%d:%s"%[runtime.zoneId,int(runtime.attempt),runtime.fish.itemId])%count
	return minimum+index*2

## 按时段、天气和抛竿强度选择旧鱼种表中的稳定候选。
func _commit_cast(state: Dictionary) -> void:
	runtime.castPower=maxi(5,roundi(runtime.castPower))
	var pool:=_eligible(state,runtime.castPower)
	if pool.is_empty(): pool=_eligible(state,0)
	var hash_value:=FarmWorldRules.stable_hash(state.worldSeed,state.day,"%s:%d:%d:%d"%[runtime.zoneId,state.minuteOfDay,runtime.attempt,runtime.castPower])
	runtime.fish=null if pool.is_empty() else pool[hash_value%pool.size()]
	runtime.phase="waiting"; runtime.held=false; runtime.elapsedMs=0.0
	runtime.biteAtMs=1800+FarmWorldRules.stable_hash(state.worldSeed,state.day,"%s:bite:%d"%[runtime.zoneId,runtime.attempt])%2200

## 过滤当前钓位水域内的鱼种，不在迁移时改变窗口截止的严格小于语义。
func _eligible(state: Dictionary, strength: int) -> Array:
	var zone: Dictionary=world.zones.get(runtime.get("zoneId",""),{})
	var habitat: String=zone.get("fishHabitat","")
	return fish.filter(func(item:Dictionary)->bool:return item.get("habitats",[]).has(habitat) and state.minuteOfDay>=item.minMinute and state.minuteOfDay<item.maxMinute and (not item.has("weather") or item.weather==state.weather.current) and strength>=item.minCast)
