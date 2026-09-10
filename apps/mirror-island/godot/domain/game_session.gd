class_name FarmGameSession
extends Node
## 单一可变游戏会话。所有关键操作先在隔离候选里执行，保存成功才发布；重试不重新结算。

signal changed
signal feedback(result: Dictionary)
signal save_changed
signal checkpoint_finished
const SUCCESSES := ["changed","crafted","placed","collected","collected-double","recovered","recovered-scarecrow","pushed","destroyed-with-drops","shipped","reclaimed","built","moved","demolished","upgraded-backpack","tilled","planted","watered","harvested","harvested-double","refilled","cut","mined","branch-chopped","chopped","chopped-with-seed","crop-cleared","stump-cleared","ate","ate-zero","bought","sold","upgraded-watering-can","talked","gift-liked","gift-neutral","gift-disliked","adopted","petted","fishing-rod-received","started","appearance-changed","milestone-acknowledged","profession-selected","slept","passed-out","caught","transitioned"]
var rules: Dictionary
var dialogues: Dictionary
var world: FarmWorldRules
var inventory: FarmInventory
var resource_rules: FarmResourceRules
var storage: FarmStorageRules
var social: FarmSocialRules
var fishing: FarmFishingRules
var npcs: FarmNpcMotion
var repository: FarmSaveRepository
var codec: FarmSaveCodec
var busy:=false
var save_phase: String="idle"
var error: String=""
var active:=false
var day_summary: Dictionary={}
var _state: Dictionary={}
var _pending: Dictionary={}
var _clock_accumulator:=0.0
var _checkpoint_accumulator:=0.0
var _movement_dirty:=false
var _suspended:=false
var _checkpointing:=false

## 装载项目内容并组合领域服务，不在初始化时创建或覆盖存档。
func _ready() -> void:
	rules=FarmSaveCodec.normalize_numbers(JSON.parse_string(FileAccess.get_file_as_string("res://data/rules.json")))
	dialogues=JSON.parse_string(FileAccess.get_file_as_string("res://data/dialogues.json"))
	world=FarmWorldRules.new(FarmSaveCodec.normalize_numbers(JSON.parse_string(FileAccess.get_file_as_string("res://generated/catalog.json"))),rules.crops)
	inventory=FarmInventory.new(rules.items)
	resource_rules=FarmResourceRules.new(world,inventory,rules)
	storage=FarmStorageRules.new(inventory,world,rules)
	social=FarmSocialRules.new(rules,inventory,world)
	fishing=FarmFishingRules.new(inventory,world,rules.fish)
	npcs=FarmNpcMotion.new(world,FarmSaveCodec.normalize_numbers(JSON.parse_string(FileAccess.get_file_as_string("res://data/schedules.json"))))
	if repository==null: repository=FarmSaveRepository.new()
	codec=FarmSaveCodec.new(rules,dialogues,world)

## 提供防御性状态副本，界面与场景不得写入会话的实际状态。
func snapshot() -> Dictionary:
	return _state.duplicate(true)

## 检查唯一存档，保留不兼容或损坏记录并返回可见错误。
func inspect_save() -> Dictionary:
	var loaded: Dictionary=await repository.read()
	if not loaded.ok: return {"exists":false,"error":loaded.text}
	if loaded.text=="": return {"exists":false,"error":""}
	var decoded:=codec.decode(loaded.text)
	return {"exists":true,"error":decoded.get("error","")}

## 新建独立 Godot 世界，先保存后进入；覆盖确认必须由调用界面完成。
func new_game(appearance: Dictionary) -> bool:
	if busy or not FarmSaveCodec.appearance(appearance): return false
	var candidate: Dictionary=rules.initial.duplicate(true)
	candidate.player.appearance=appearance.duplicate(true)
	candidate.worldSeed=FarmWorldRules.stable_hash(0,1,"local-farm:%d"%int(Time.get_unix_time_from_system()*1000))
	candidate.weather={"day":1,"current":"sunny","next":FarmWorldRules.weather_at(candidate.worldSeed,2)}
	fishing.runtime.clear()
	var saved:=await _commit(candidate,{"code":"new-game"})
	if saved:
		active=true; npcs.reset(_state); changed.emit()
	return saved

## 继续仅加载当前版本，不推进离线天数，不将失败当成新游戏。
func continue_game() -> bool:
	if busy: return false
	busy=true; save_changed.emit()
	var loaded: Dictionary=await repository.read()
	busy=false
	if not loaded.ok or loaded.text=="":
		error=loaded.text if not loaded.ok else "还没有 Godot 本地存档。"; save_changed.emit(); return false
	var decoded:=codec.decode(loaded.text)
	if decoded.has("error"):
		error=decoded.error; save_changed.emit(); return false
	var candidate: Dictionary=decoded.state
	error=""; save_phase="idle"; _pending.clear(); fishing.runtime.clear()
	_clock_accumulator=0.0; _movement_dirty=false
	if candidate.weather.current=="rain":
		for tile: Dictionary in candidate.farmTiles.values(): tile.watered=true
	npcs.reset(candidate)
	if world.blocked(candidate,candidate.player.regionId,FarmWorldRules.point(candidate.player),Vector2(5,4),"",npcs.snapshot()):
		var spawn: Dictionary=world.regions[candidate.player.regionId].spawns[world.regions[candidate.player.regionId].defaultSpawnId]
		candidate.player.x=spawn.x; candidate.player.y=spawn.y
	return await _commit(candidate,{"code":"continued"})

## 冻结界面、未确认日结、钓鱼或保存期间的世界输入。
func world_locked() -> bool:
	return not active or busy or not _pending.is_empty() or _state.get("unacknowledgedShippingReport")!=null or not fishing.runtime.is_empty()

## 用共享规则按轴移动并保留原九十六像素速度；场景只投影结果。
func move_player(direction: Vector2, delta: float) -> void:
	if world_locked() or direction.is_zero_approx() or _suspended: return
	var normalized:=direction.normalized()
	var distance:=96.0*minf(delta,0.1)
	var previous:=FarmWorldRules.point(_state.player)
	var region: Dictionary=world.regions[_state.player.regionId]
	var position:=previous
	var actors:=npcs.snapshot()
	var next_x:=clampf(position.x+normalized.x*distance,5,region.widthPixels-5)
	if not world.blocked(_state,_state.player.regionId,Vector2(next_x,position.y),Vector2(5,4),"",actors): position.x=next_x
	var next_y:=clampf(position.y+normalized.y*distance,4,region.heightPixels-4)
	if not world.blocked(_state,_state.player.regionId,Vector2(position.x,next_y),Vector2(5,4),"",actors): position.y=next_y
	if position!=previous:
		_state.player.x=position.x; _state.player.y=position.y; _movement_dirty=true

## 分派原命令集合；每个成功候选只有一次原子保存，失败反馈不修改可玩状态。
func dispatch(command: Dictionary) -> Dictionary:
	var type: String=command.get("type","")
	if type in ["retry-storage-save","retry-day-settlement","retry-fishing-save"]:
		if not busy and not _pending.is_empty(): await _persist_pending()
		return _result("retry")
	if not active: return _result("not-ready")
	if busy or not _pending.is_empty(): return _result("save-pending")
	if _state.unacknowledgedShippingReport!=null and type not in ["dismiss-day-settlement","choose-profession"]: return _result("day-settlement-pending")
	if not fishing.runtime.is_empty() and type not in ["set-fishing-input","dismiss-fishing"]: return _result("fishing-active")
	if type=="set-fishing-input":
		fishing.set_held(_state,command.held); return {}
	if type=="dismiss-fishing":
		fishing.runtime.clear(); changed.emit(); return {}
	var candidate:=_state.duplicate(true)
	var code: String="unknown-command"
	var details: Dictionary={}
	var actors:=npcs.snapshot()
	match type:
		"sweep-scythe": code=resource_rules.sweep_scythe(candidate,command.get("facing",""))
		"change-appearance":
			if not FarmSaveCodec.appearance(command.get("appearance")): return _result("invalid-appearance")
			candidate.player.appearance=command.appearance.duplicate(true); code="appearance-changed"
		"use-item-on-tile": code=resource_rules.farm(candidate,command.column,command.row,command.itemId,command.get("facing",""),actors)
		"use-item-on-target": code=resource_rules.gather(candidate,command.targetId,command.itemId,command.get("facing","down"))
		"refill-watering-can": code=resource_rules.refill(candidate,command.column,command.row)
		"eat-item":
			var item: Dictionary=rules.items.get(command.itemId,{})
			var quality: Variant=command.get("quality",0)
			if not FarmQualityRules.valid(item,quality): return _result("invalid-quality")
			if not item.get("edible",item.get("staminaRestore",0)>0): code="not-edible"
			elif item.get("staminaRestore",0)>0 and candidate.stamina>=FarmEnergyRules.MAX_STAMINA: code="stamina-full"
			elif not inventory.consume(candidate.inventory,command.itemId,1,quality): code="missing-item"
			else:
				var restore: float=FarmQualityRules.energy(item,quality)
				candidate.stamina=clampf(float(candidate.stamina)+restore,0,FarmEnergyRules.MAX_STAMINA)
				code="ate" if restore>0 else "ate-zero"
				if restore<0: details.message="吃下后体力减少了。"
		"buy-item","sell-item": code=_shop(candidate,actors,command)
		"buy-coal":
			var counter: Dictionary=world.interactions.get("blacksmith-tool-rack",{})
			if candidate.player.regionId!="blacksmith" or counter.is_empty() or FarmWorldRules.point(candidate.player).distance_to(Vector2(counter.x+counter.width/2.0,counter.y+counter.height/2.0))>42: code="not-at-smith-counter"
			elif candidate.gold<coal_price(candidate.day): code="insufficient-gold"
			elif not inventory.add(candidate.inventory,"coal",1): code="inventory-full"
			else: candidate.gold-=coal_price(candidate.day); code="bought"
		"upgrade-watering-can":
			var smith:=_npc(actors,"town-blacksmith")
			if candidate.day<3: code="watering-upgrade-locked"
			elif candidate.wateringCanLevel>=2: code="watering-already-upgraded"
			elif smith.is_empty() or not FarmSocialRules.watering_service(candidate,smith): code="watering-upgrade-unavailable"
			elif candidate.gold<900: code="insufficient-gold"
			elif inventory.quantity(candidate.inventory,"wood")<15: code="insufficient-wood"
			else:
				inventory.consume(candidate.inventory,"wood",15); candidate.gold-=900; candidate.wateringCanLevel=2; candidate.wateringCanWater=40; code="upgraded-watering-can"
		"talk-to-npc": details=social.talk(candidate,_npc(actors,command.npcId)); code=details.code
		"gift-item-to-npc": code=social.gift(candidate,actors,command.npcId,command.itemId,command.get("quality",0))
		"claim-fishing-rod":
			var npc:=_npc(actors,command.npcId)
			if candidate.day<7 or npc.is_empty() or command.npcId!="town-resident-xiangzi" or npc.regionId!=candidate.player.regionId or FarmWorldRules.point(candidate.player).distance_to(FarmWorldRules.point(npc))>42: code="fishing-rod-unavailable"
			elif inventory.quantity(candidate.inventory,"fishing-rod")>0: code="fishing-rod-owned"
			elif not inventory.add(candidate.inventory,"fishing-rod",1): code="inventory-full"
			else: code="fishing-rod-received"
		"adopt-pet": code=social.adopt(candidate,command.species,command.name)
		"pet-home-pet": code=FarmSocialRules.pet(candidate)
		"acknowledge-retention-event":
			code="milestone-unsupported"
			for milestone: Dictionary in rules.milestones:
				if milestone.eventId!=command.eventId: continue
				if candidate.day<milestone.unlockDay: code="milestone-not-yet-available"
				elif command.eventId in candidate.seenEventIds: code="milestone-already-seen"
				else: candidate.seenEventIds.append(command.eventId); code="milestone-acknowledged"
		"choose-profession": code="profession-selected" if FarmSkillRules.choose_profession(candidate,command.get("skill",""),command.get("level",0),command.get("profession","")) else "invalid-profession-choice"
		"start-fishing": code=fishing.start(candidate,command.zoneId)
		"sleep":
			var bed: Dictionary=world.interactions.get(command.bedId,{})
			if bed.is_empty() or bed.kind!="bed" or bed.regionId!="cottage" or candidate.player.regionId!="cottage": return _result("missing-bed")
			if FarmWorldRules.point(candidate.player).distance_to(Vector2(bed.x+bed.width/2.0,bed.y+bed.height/2.0))>42: return _result("too-far")
			return await _settle_day("slept")
		"transition-region":
			var exit:=world.exit_at(candidate.player.regionId,FarmWorldRules.point(candidate.player))
			if exit.get("id")!=command.exitId: return _result("missing-exit")
			if exit.targetRegionId=="blacksmith" and (candidate.minuteOfDay<540 or candidate.minuteOfDay>=960): return _result("blacksmith-closed")
			var spawn: Dictionary=world.regions[exit.targetRegionId].spawns[exit.targetSpawnId]
			candidate.player.regionId=exit.targetRegionId; candidate.player.x=spawn.x; candidate.player.y=spawn.y; code="transitioned"
		_: code=storage.apply(candidate,actors,command)
	var result:=_result(code)
	result.merge(details,true)
	if result.tone!="success": feedback.emit(result); return result
	if not await _commit(candidate,result): return _result("save-failed")
	return result

## 暂停感知的实时推进；钓鱼等待仍走时间，收线与终局暂停；页面失焦不补跑。
func tick(delta: float, paused: bool) -> void:
	if not active or busy or not _pending.is_empty() or _suspended or _state.unacknowledgedShippingReport!=null: return
	var elapsed:=clampf(delta*1000,0,1000)
	if _state.minuteOfDay>=1560:
		await _settle_day("passed-out"); return
	var fish_candidate:=_state.duplicate(true)
	var fish_result:=fishing.tick(fish_candidate,elapsed)
	if fish_result=="caught":
		await _commit(fish_candidate,_result("caught")); return
	elif fish_result!="": feedback.emit(_result(fish_result)); changed.emit()
	var fishing_paused: bool=not fishing.runtime.is_empty() and fishing.runtime.phase in ["reeling","caught","escaped","inventory-full"]
	if not paused and not fishing_paused:
		npcs.advance(_state,elapsed)
		social.advance_pet(_state,elapsed)
		if _state.pet!=null: _movement_dirty=true
		if not npcs.pending_pushes.is_empty():
			var pushed_candidate:=_state.duplicate(true)
			var pushed:=false
			for id: String in npcs.pending_pushes:
				var chest:=FarmWorldRules.object_by_id(pushed_candidate,id)
				if chest.is_empty(): continue
				var result:=storage.push(pushed_candidate,chest,"npc","down",npcs.snapshot())
				pushed=pushed or result in ["pushed","destroyed-with-drops"]
			if pushed: await _commit(pushed_candidate,{"code":"npc-push"}); return
		_clock_accumulator+=elapsed
		if _clock_accumulator>=8000:
			_clock_accumulator-=8000
			_state.minuteOfDay=mini(1560,int(_state.minuteOfDay)+10)
			npcs.transition(_state)
			if _state.minuteOfDay==1440 and _state.lateWarningDay!=_state.day:
				_state.lateWarningDay=_state.day; feedback.emit({"tone":"error","code":"late-night-warning","message":"已经午夜，02:00 前记得回家休息。"})
			if _state.minuteOfDay>=1560: await _settle_day("passed-out"); return
			_movement_dirty=true; changed.emit()
	_checkpoint_accumulator+=elapsed
	if _movement_dirty and _checkpoint_accumulator>=500:
		_checkpoint_accumulator=0.0
		if not _checkpointing: await _checkpoint()

## 非关键移动检查点不冻结输入；关键命令会等待此写入结束后保存更新候选。
func _checkpoint() -> void:
	if _checkpointing or busy or not _pending.is_empty(): return
	_checkpointing=true; _movement_dirty=false
	var success:=await repository.write(FarmSaveCodec.encode(_state.duplicate(true)))
	_checkpointing=false
	if not success and _pending.is_empty():
		_pending={"state":_state.duplicate(true),"result":{"code":"checkpoint"}}
		save_phase="failed"; error="自动保存失败，请重试以保存当前进度。"; save_changed.emit()
	checkpoint_finished.emit()

## 将同一个候选放入待保存槽，验证失败明确停止，不掩盖规则错误。
func _commit(candidate: Dictionary, result: Dictionary) -> bool:
	var validation:=codec.validate(candidate)
	if validation!="":
		error=validation; feedback.emit({"tone":"error","code":"state-invalid","message":validation}); return false
	_pending={"state":candidate,"result":result}
	return await _persist_pending()

## 重试始终写入相同候选；成功前不发布库存、日期、金币或新存档。
func _persist_pending() -> bool:
	if busy or _pending.is_empty(): return false
	busy=true; save_phase="saving"; error=""; save_changed.emit()
	if _checkpointing: await checkpoint_finished
	var success:=await repository.write(FarmSaveCodec.encode(_pending.state))
	busy=false
	if not success:
		save_phase="failed"; error="保存失败，当前操作尚未提交。请重试。"; save_changed.emit(); return false
	var previous_day: int=int(_state.get("day",0))
	_state=_pending.state
	var result: Dictionary=_pending.result
	_pending={}; save_phase="idle"; _movement_dirty=false
	if result.has("daySummary"): day_summary=result.daySummary.duplicate(true)
	elif _state.unacknowledgedShippingReport==null or result.code=="continued": day_summary={}
	if previous_day!=_state.day:
		_clock_accumulator=0.0; npcs.reset(_state)
	if result.code in ["new-game","continued"]: active=true
	if result.code not in ["checkpoint","npc-push","new-game","continued"]: feedback.emit(result)
	changed.emit(); save_changed.emit()
	return true

## 构造原顺序的隔夜候选，重试时不会再次扣款或发放收入。
func _settle_day(reason: String) -> Dictionary:
	var candidate:=_state.duplicate(true)
	if candidate.day>=FarmWorldRules.LIMIT-2: return _result("day-limit")
	var loss:=mini(1000,floori(candidate.gold*0.1)) if reason=="passed-out" and candidate.player.regionId!="cottage" else 0
	candidate.gold-=loss
	if not storage.settle_shipping(candidate): return _result("gold-limit")
	var upgrades:=FarmSkillRules.settle_day(candidate)
	candidate.unacknowledgedShippingReport.skillUpgrades=upgrades
	candidate.unacknowledgedShippingReport.recipeUnlocks=FarmSkillRules.recipe_unlocks(candidate,rules.recipes)
	candidate.unacknowledgedShippingReport.professionChoices=FarmSkillRules.profession_choices(candidate,upgrades)
	candidate.stamina=FarmEnergyRules.MAX_STAMINA if not upgrades.is_empty() else FarmEnergyRules.after_sleep(float(candidate.stamina),int(candidate.minuteOfDay))
	for friend: Dictionary in candidate.friendships.values():
		if friend.lastTalkedDay!=candidate.day and friend.points>0 and friend.points<2500: friend.points=maxi(0,int(friend.points)-2)
	resource_rules.settle_crops(candidate)
	var crow_events: Array=[]
	candidate.unacknowledgedShippingReport.crows=FarmCropProtection.settle(candidate,world,crow_events)
	candidate.day+=1
	for memory: Dictionary in candidate.npcDialogue.values(): FarmSocialRules.prune(memory,candidate.day)
	resource_rules.regenerate(candidate)
	candidate.weather={"day":candidate.day,"current":candidate.weather.next,"next":FarmWorldRules.weather_at(candidate.worldSeed,int(candidate.day)+1)}
	candidate.dailyForage={"day":candidate.day,"collectedIds":[]}
	var request:=social.request_for_day(candidate.day)
	candidate.dailyRequest={"day":candidate.day,"requestId":request.requestId,"completed":false}
	if candidate.weather.current=="rain":
		for tile: Dictionary in candidate.farmTiles.values(): tile.watered=true
	candidate.minuteOfDay=360
	var spawn: Dictionary=world.regions.cottage.spawns[world.regions.cottage.defaultSpawnId]
	candidate.player.regionId="cottage"; candidate.player.x=spawn.x; candidate.player.y=spawn.y
	fishing.runtime.clear()
	var result:=_result(reason)
	result.message="新的一天开始了，体力 %d。%s"%[roundi(candidate.stamina),"送回家花费 %dg。"%loss if loss>0 else ""]
	result.daySummary={"reason":reason,"goldLost":loss,"nextStamina":candidate.stamina,"crowEvents":crow_events}
	return result if await _commit(candidate,result) else _result("save-failed")

## 返回给定总天数的煤炭买价；一年112天，价表由当前内容持有，不接受客户端报价。
func coal_price(day: int) -> int:
	return int(rules.coalBuyPrices[0 if day<=112 else 1])

## 原商店一次交易一件，必须在实际营业的皮埃尔身边。
func _shop(state: Dictionary, actors: Array, command: Dictionary) -> String:
	var npc:=_npc(actors,"seed-keeper")
	if npc.is_empty() or npc.interactionType!="shop" or npc.regionId!=state.player.regionId or FarmWorldRules.point(npc).distance_to(FarmWorldRules.point(state.player))>42: return "not-at-shop"
	if command.type=="buy-item":
		var crop: Dictionary=resource_rules.seeds.get(command.itemId,{})
		var seed_price: Variant=crop.get("seedPrice")
		if command.itemId in ["basic-fertilizer","basic-retaining-soil"] and state.day>=15: seed_price=100
		if seed_price==null: return "unavailable-item"
		if state.gold<int(seed_price): return "insufficient-gold"
		if not inventory.add(state.inventory,command.itemId,1): return "inventory-full"
		state.gold-=int(seed_price)
		return "bought"
	var price: Variant=rules.prices.get(command.itemId)
	var quality: Variant=command.get("quality",0)
	if not FarmQualityRules.valid(rules.items.get(command.itemId,{}),quality): return "invalid-quality"
	if not rules.items.get(command.itemId,{}).get("seedShopBuyback",true): return "unavailable-item"
	if price==null: return "unavailable-item"
	price=FarmQualityRules.price(int(price),quality)
	if state.gold+price>FarmWorldRules.LIMIT: return "gold-limit"
	if not inventory.consume(state.inventory,command.itemId,1,quality): return "missing-item"
	state.gold+=price
	return "sold"

## 从当前真实投影查找居民，未知身份返回空字典。
static func _npc(actors: Array, id: String) -> Dictionary:
	for npc: Dictionary in actors:
		if npc.npcId==id: return npc
	return {}

## 将规则结果转换为简短可见反馈，错误码保留用于定位。
static func _result(code: String) -> Dictionary:
	var messages: Dictionary={"changed":"已整理好。","crafted":"制作完成。","placed":"已经摆好了。","collected":"已放入背包。","recovered":"已收回空箱。","recovered-scarecrow":"已收回稻草人。","not-at-smith-counter":"请走近铁匠铺工具架购买。","blacksmith-closed":"铁匠铺开放时间为 09:00–16:00。","pushed":"箱子已经移开。","shipped":"已投入出货箱，明早结算。","reclaimed":"已取回最后一笔出货。","built":"出货箱已建好。","moved":"建筑已移好。","demolished":"已拆除。","upgraded-backpack":"背包已扩容。","tilled":"土地已翻好。","planted":"种子已播下。","watered":"已经浇水。","harvested":"收获已放入背包。","refilled":"喷壶已装满。","cut":"已清理杂草。","mined":"获得石头。","chopped":"获得木材，留下树桩。","chopped-with-seed":"获得木材和树种，留下树桩。","branch-chopped":"已砍断树枝，获得木材。","requires-axe":"请使用斧头砍断树枝。","stump-cleared":"树桩已清除。","crop-cleared":"已清除青豆植株，耕地保留。","trellis-occupied":"请站到旁边再种青豆。","ate":"体力恢复了。","ate-zero":"已经吃下了。","bought":"种子已放入背包。","sold":"交易完成。","upgraded-watering-can":"喷壶已升级，可连续浇三格。","talked":"","gift-liked":"对方很喜欢这份礼物。","gift-neutral":"对方收下了礼物。","gift-disliked":"对方不太喜欢这份礼物。","adopted":"伙伴加入了你的家。","petted":"伙伴亲昵地蹭了蹭你。","fishing-rod-received":"领到了竹鱼竿，去旧码头试试吧。","started":"按住蓄力，松手抛竿。","caught":"钓到了鱼！","appearance-changed":"已换上新的装扮。","milestone-acknowledged":"","transitioned":"","insufficient-stamina":"体力不足，吃点东西或回家休息。","inventory-full":"背包放不下，请先整理。","target-full":"目标格放不下产物，材料未消耗。","too-far":"走近目标再操作。","missing-item":"背包里没有所需物品。","requirements-not-met":"制作材料不足。","insufficient-gold":"金币不足。","insufficient-wood":"木材不足。","wrong-tool":"请选择合适的工具。","requires-scythe":"这种作物需要用镰刀收获。","wrong-direction":"请面向要清理的杂草。","depleted":"这里已经采完了。","inactive":"这里今天没有可采物。","waiting":"已经浇过水了。","no-effect":"当前目标无需这项操作。","missing-tile":"这里无法耕作。","empty-watering-can":"喷壶空了，去水边补水。","not-at-shop":"请在营业时走到皮埃尔身边。","not-shippable":"这件物品不能出货。","invalid-transfer":"目标格无法完整接收所选物品。","unchanged":"当前无需更改。","not-empty":"箱子还有物品，不能收回。","blocked":"这里有阻挡，无法摆放。","last-shipping-bin":"农场至少保留一个出货箱。","service-unavailable":"罗宾现在不在柜台提供服务。","daily-limit":"今天已经送过礼了。","weekly-limit":"这周已送过两份礼物。","fishing-rod-owned":"你已经有鱼竿了。","fishing-rod-unavailable":"Day 7 起可以找威利领取鱼竿。","watering-upgrade-locked":"Day 3 起可找克林特升级喷壶。","watering-already-upgraded":"喷壶已经升级过了。","watering-upgrade-unavailable":"请在工作时间找克林特升级。","backpack-upgrade-unavailable":"请到种子店背包陈列前购买。","backpack-upgrade-insufficient-gold":"金币不足，先积攒下一档费用。","backpack-already-upgraded":"背包已扩至最大。","not-ready":"这项内容还未开放。","already-adopted":"你已经有一位伙伴了。","invalid-name":"名字需为 1 至 12 个字符，不能含控制字符。","already-petted":"今天已经陪过伙伴了。","pet-not-present":"伙伴正在另一处家园休息。","not-giftable":"这件物品不能作为礼物。","stamina-full":"体力已经满了。","not-edible":"这件物品不能食用。","empty":"没有可取回的投入。","escaped":"鱼跑掉了，再试一次吧。","missing-rod":"先向威利领取鱼竿。","save-pending":"请先完成保存，失败时可以重试。","save-failed":"保存失败，操作尚未提交，请重试。"}
	messages.merge({"fertilized":"已施用初级肥料。","retaining-soil-applied":"已施用初级保湿土。","already-fertilized":"这块地已经施过肥。","fertilizer-too-late":"种子已经发芽，无法施用初级肥料。","invalid-quality":"物品品质无效，请重新选择。"})
	messages.merge({"collected-double":"收集者生效，获得双份野采。","harvested-double":"收集者生效，获得双份野生作物。","profession-selected":"职业选择已保存。","profession-choice-required":"请先选择本次升级职业。","invalid-profession-choice":"职业选项已变化，请重新选择。"})
	return {"code":code,"tone":"success" if code in SUCCESSES or code in ["fertilized","retaining-soil-applied"] else "error","message":messages.get(code,"目标已变化，请重新选择。")}

## 页面或窗口失焦时停止逻辑时间和输入；恢复不会补算隐藏期间的时间。
func _notification(what: int) -> void:
	if what==NOTIFICATION_APPLICATION_FOCUS_OUT: _suspended=true
	elif what==NOTIFICATION_APPLICATION_FOCUS_IN: _suspended=false
