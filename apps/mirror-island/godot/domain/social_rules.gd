class_name FarmSocialRules
extends RefCounted
## 日常对话、委托、送礼、首周事件与宠物规则；所有奖励与日期保持旧版定义。

var rules: Dictionary
var inventory: FarmInventory
var world: FarmWorldRules

## 当前内容表允许的礼物偏好及其基础好感；负向偏好不参与品质倍率。
const GIFT_POINTS: Dictionary={"liked":45,"neutral":20,"disliked":-20,"hated":-40}

## 绑定源内容与共享领域服务，不持有界面状态。
func _init(content: Dictionary, items: FarmInventory, catalog: FarmWorldRules) -> void:
	rules=content; inventory=items; world=catalog

## 查找当天确定性委托；前九日保持原八项轮换，其后使用完整清单。
func request_for_day(day: int) -> Dictionary:
	if day<2: return {}
	return rules.requests[(day-2)%(8 if day<=9 else rules.requests.size())]

## 返回三个已实现的关系阶段，无未批准的新好感事件。
static func stage(points: int) -> String:
	return "friendly" if points>=500 else "familiar" if points>=250 else "stranger"

## 对附近 NPC 执行委托交付、每日首次交谈和上下文选句，返回固定 ID 供界面读取。
func talk(state: Dictionary, npc: Dictionary) -> Dictionary:
	if npc.is_empty() or npc.regionId!=state.player.regionId or FarmWorldRules.point(state.player).distance_to(FarmWorldRules.point(npc))>42: return {"code":"too-far"}
	var id: String=npc.npcId
	var friendship: Dictionary=state.friendships[id]
	var request:=request_for_day(state.day)
	var request_result: String="request-not-target"
	if not request.is_empty() and request.npcId==id:
		if state.dailyRequest.completed: request_result="request-already-completed"
		elif inventory.quantity(state.inventory,request.itemId)<request.quantity: request_result="request-missing-items"
		elif state.gold+request.goldReward>FarmWorldRules.LIMIT: return {"code":"gold-limit"}
		else:
			inventory.consume(state.inventory,request.itemId,request.quantity)
			state.gold+=request.goldReward
			friendship.points=mini(2500,int(friendship.points+request.friendshipReward))
			state.dailyRequest.completed=true
			request_result="request-completed"
	var first: bool=friendship.lastTalkedDay!=state.day
	if first:
		friendship.points=mini(2500,int(friendship.points)+20)
		friendship.lastTalkedDay=state.day
	var memory: Dictionary=state.npcDialogue[id]
	prune(memory,state.day)
	var groups: Array=[]
	if not request.is_empty() and request.npcId==id:
		if state.dailyRequest.completed: groups.append(["request:%s:thanks"%request.requestId])
		elif request_result=="request-missing-items": groups.append(["request:%s:missing"%request.requestId])
	var current_stage:=stage(friendship.points)
	var event: String=""
	if current_stage=="friendly":
		if id=="seed-keeper" and npc.regionId=="seed-shop": event="seed-keeper-two-heart"
		elif id=="town-blacksmith" and npc.regionId in ["town","blacksmith"]: event="blacksmith-two-heart"
	if event!="" and event not in state.seenEventIds: groups.append(["event:"+event])
	var stages: Array=["stranger","familiar","friendly"]
	if stages.find(current_stage)>stages.find(memory.acknowledgedStage): groups.append(["relationship:%s:%s"%[id,current_stage]])
	if npc.get("routine") in ["rain","rest"]: groups.append(["routine:%s:%s"%[id,npc.routine]])
	else: groups.append(["activity:%s:%s:0"%[id,FarmWorldRules.phase(state.minuteOfDay)],"activity:%s:%s:1"%[id,FarmWorldRules.phase(state.minuteOfDay)]])
	groups.append(["personality:%s:0"%id,"personality:%s:1"%id,"personality:%s:2"%id])
	var recent: Array=memory.recent.map(func(entry:Dictionary)->String:return entry.dialogueId)
	var chosen: String=""
	for group: Array in groups:
		var available: Array=group.filter(func(candidate:String)->bool:return candidate not in recent)
		if not available.is_empty():
			chosen=available[(int(state.day)+memory.recent.size())%available.size()]
			memory.recent.append({"dialogueId":chosen,"day":state.day})
			break
	if chosen=="": chosen=groups[0][0]
	prune(memory,state.day)
	if chosen.begins_with("relationship:"): memory.acknowledgedStage=current_stage
	if event!="" and chosen=="event:"+event: state.seenEventIds.append(event)
	return {"code":"talked","npcId":id,"dialogueId":chosen,"baseDialogueId":npc.dialogueId,"firstTalkToday":first,"requestResult":request_result,"shopAvailable":npc.interactionType=="shop","wateringServiceAvailable":watering_service(state,npc)}

## 删除超过三天的对话记忆，并保留最后十二条，原历史边界为含当前日减三。
static func prune(memory: Dictionary, day: int) -> void:
	memory.recent=memory.recent.filter(func(entry:Dictionary)->bool:return entry.day>=day-3 and entry.day<=day).slice(-12)

## 送礼保持每人每日一份、周日重置的每周两份，不设置全镇限额。
func gift(state: Dictionary, npcs: Array, npc_id: String, item_id: String, quality: Variant = 0) -> String:
	if not rules.items.has(item_id) or rules.items[item_id].category in ["tool","seed"]: return "not-giftable"
	if not FarmQualityRules.valid(rules.items[item_id],quality): return "invalid-quality"
	if inventory.quantity(state.inventory,item_id,quality)<1: return "missing-item"
	var npc: Dictionary={}
	for entry: Dictionary in npcs:
		if entry.npcId==npc_id: npc=entry; break
	if npc.is_empty() or npc.regionId!=state.player.regionId or not state.friendships.has(npc_id): return "missing-npc"
	if FarmWorldRules.point(state.player).distance_to(FarmWorldRules.point(npc))>42: return "too-far"
	var friendship: Dictionary=state.friendships[npc_id]
	var week:=floori(float(state.day)/7.0)
	var count:=int(friendship.giftsThisWeek) if friendship.giftWeekIndex==week else 0
	if friendship.lastGiftDay==state.day: return "daily-limit"
	if count>=2: return "weekly-limit"
	var preference: String=rules.giftPreferences[npc_id].get(item_id,"")
	if not GIFT_POINTS.has(preference): return "invalid-gift-preference"
	inventory.consume(state.inventory,item_id,1,quality)
	friendship.points=clampi(int(friendship.points)+FarmQualityRules.friendship(int(GIFT_POINTS[preference]),quality),0,2500)
	friendship.lastGiftDay=state.day; friendship.giftWeekIndex=week; friendship.giftsThisWeek=count+1
	return "gift-"+preference

## 检查原铁匠服务的日期、时段、休息日与真实距离。
static func watering_service(state: Dictionary, npc: Dictionary) -> bool:
	return state.day>=3 and npc.get("npcId")=="town-blacksmith" and npc.get("routine")!="rest" and FarmWorldRules.phase(state.minuteOfDay)=="day" and npc.regionId in ["town","blacksmith"] and npc.regionId==state.player.regionId and FarmWorldRules.point(npc).distance_to(FarmWorldRules.point(state.player))<=42

## 一次性领养猫或狗，名字最多十二个码点；不允许替换已领养伙伴。
func adopt(state: Dictionary, species: String, raw_name: String) -> String:
	if state.day<2: return "not-ready"
	if state.pet!=null: return "already-adopted"
	if species not in ["cat","dog"]: return "invalid-species"
	var name:=raw_name.strip_edges()
	if name.length()<1 or name.length()>12: return "invalid-name"
	for index in range(name.length()):
		if name.unicode_at(index)<32 or (name.unicode_at(index)>=127 and name.unicode_at(index)<=159): return "invalid-name"
	state.pet={"species":species,"name":name,"adoptedDay":state.day,"bond":0,"lastPettedDay":0,"regionId":"farm","x":352.0,"y":272.0,"facing":"down","motion":"idle","anchorIndex":0,"pauseRemainingMs":1400.0}
	enter_pet_region(state)
	return "adopted"

## 每日抚摸一次提高隐藏羁绊，返回同一反馈而不重复奖励。
static func pet(state: Dictionary) -> String:
	if state.pet==null: return "missing-pet"
	if state.player.regionId!=("farm" if state.minuteOfDay<1080 else "cottage"): return "pet-not-present"
	if state.pet.lastPettedDay==state.day: return "already-petted"
	state.pet.lastPettedDay=state.day; state.pet.bond=mini(100,int(state.pet.bond)+1)
	state.pet.motion="resting"; state.pet.pauseRemainingMs=1800.0
	return "petted"

## 切换宠物家园区域并选择原确定性锚点，遇阻挡寻找最近合法格。
func enter_pet_region(state: Dictionary) -> void:
	var pet_state: Dictionary=state.pet
	pet_state.regionId="farm" if state.minuteOfDay<1080 else "cottage"
	var anchors: Array=rules.petAnchors[pet_state.regionId]
	pet_state.anchorIndex=(int(pet_state.adoptedDay)+int(state.day)+int(pet_state.species=="dog"))%anchors.size()
	var origin:=FarmWorldRules.point(world.regions[pet_state.regionId].spawns[anchors[pet_state.anchorIndex]])
	var target:=origin
	if world.blocked(state,pet_state.regionId,target,Vector2(4,3)):
		var best:=INF
		for y in range(world.regions[pet_state.regionId].collision.rows):
			for x in range(world.regions[pet_state.regionId].collision.columns):
				var candidate:=Vector2(x*16+8,y*16+8)
				if candidate.distance_to(origin)>=best or world.blocked(state,pet_state.regionId,candidate,Vector2(4,3)) or not world.exit_at(pet_state.regionId,candidate).is_empty(): continue
				target=candidate; best=candidate.distance_to(origin)
	pet_state.x=target.x; pet_state.y=target.y; pet_state.motion="idle"; pet_state.facing="down"; pet_state.pauseRemainingMs=1400.0

## 在暂停之外推进原宠物漫步，每步最多一百毫秒，并使用共享占用判定。
func advance_pet(state: Dictionary, elapsed: float) -> void:
	if state.pet==null or elapsed<=0: return
	var pet_state: Dictionary=state.pet
	if pet_state.regionId!=("farm" if state.minuteOfDay<1080 else "cottage"):
		enter_pet_region(state); return
	var dt:=minf(100,elapsed)
	if pet_state.motion!="walking":
		pet_state.pauseRemainingMs=maxf(0,pet_state.pauseRemainingMs-dt)
		if pet_state.pauseRemainingMs==0: pet_state.motion="walking"
		return
	var anchors: Array=rules.petAnchors[pet_state.regionId]
	var index: int=(int(pet_state.anchorIndex)+1)%anchors.size()
	var target:=FarmWorldRules.point(world.regions[pet_state.regionId].spawns[anchors[index]])
	var previous:=FarmWorldRules.point(pet_state)
	var position:=previous.move_toward(target,18.0*dt/1000.0)
	if world.blocked(state,pet_state.regionId,position,Vector2(4,3)):
		pet_state.anchorIndex=index; pet_state.motion="idle"; pet_state.pauseRemainingMs=1400.0; return
	pet_state.facing=FarmWorldRules.facing(target-previous,pet_state.facing)
	pet_state.x=position.x; pet_state.y=position.y
	if position==target:
		pet_state.anchorIndex=index
		pet_state.motion="resting" if (int(state.day)+index+int(pet_state.species=="dog"))%3==0 else "idle"
		pet_state.pauseRemainingMs=2600.0 if pet_state.motion=="resting" else 1400.0
