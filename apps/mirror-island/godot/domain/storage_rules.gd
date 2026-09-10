class_name FarmStorageRules
extends RefCounted
## 制作、仓储、摆放与隔夜出货；只修改传入候选，保存由 GameSession 统一负责。

const COLORS := ["default","red","orange","yellow","lime","green","teal","cyan","sky","blue","indigo","purple","violet","magenta","pink","rose","tan","brown","gray","black","white"]
var inventory: FarmInventory
var world: FarmWorldRules
var rules: Dictionary

## 绑定同一份库存与地图服务，避免容器拥有另一套堆叠规则。
func _init(items: FarmInventory, catalog: FarmWorldRules, content: Dictionary) -> void:
	inventory=items; world=catalog; rules=content

## 测量玩家到对象最近边界的距离；箱子菜单另用中心四十八像素限制。
func reachable(state: Dictionary, object: Dictionary, center_only: bool = false) -> bool:
	if object.is_empty() or object.regionId!=state.player.regionId: return false
	var origin := Vector2(object.column*16,object.row*16)
	var player := FarmWorldRules.point(state.player)
	if center_only: return player.distance_to(origin+Vector2(8,8))<=48
	var nearest := player.clamp(origin,origin+Vector2(32 if object.kind=="shipping-bin" else 16,16))
	return player.distance_to(nearest)<=48

## 查询木匠柜台实际服务，禁止只凭日程目的地开放交易。
func carpenter_available(state: Dictionary, npcs: Array, id: String) -> bool:
	if id!="town-house-west-carpenter-counter" or state.player.regionId!="town-house-west": return false
	var desk: Dictionary=world.interactions.get(id,{})
	if desk.is_empty() or FarmWorldRules.point(state.player).distance_to(Vector2(desk.x+desk.width/2.0,desk.y+desk.height/2.0))>42: return false
	for npc: Dictionary in npcs:
		if npc.npcId=="town-resident-mozi" and npc.regionId=="town-house-west" and npc.interactionType=="building-service":
			var position := FarmWorldRules.point(npc)
			var counter := FarmWorldRules.point(world.regions["town-house-west"].spawns["npc-mozi-counter"])
			var passing := FarmWorldRules.point(world.regions["town-house-west"].spawns["npc-mozi-counter-pass"])
			return position.distance_to(counter)<=12 or position.distance_to(passing)<=12
	return false

## 执行一个原仓储命令，返回稳定结果码；失败候选必须由会话丢弃。
func apply(state: Dictionary, npcs: Array, command: Dictionary) -> String:
	var kind: String=command.type
	if kind=="move-inventory": return "changed" if inventory.transfer(state.inventory,command.sourceIndex,state.inventory,command.targetIndex,command.amount) else "invalid-transfer"
	if kind=="sort-inventory": return "changed" if inventory.sort_slots(state.inventory) else "unchanged"
	if kind=="rotate-hotbar-row": return "changed" if inventory.rotate(state.inventory,command.direction) else "unchanged"
	if kind=="craft-item": return craft(state,command.recipeId,command.quantity,command.targetIndex)
	if kind=="place-world-object":
		var index := int(command.inventoryIndex)
		if index<0 or index>=state.inventory.size() or state.inventory[index].itemId not in ["chest","scarecrow"]: return "missing-item"
		var item_id: String=state.inventory[index].itemId
		if FarmWorldRules.point(state.player).distance_to(Vector2(command.column*16+8,command.row*16+8))>48: return "too-far"
		var plan := world.placement(state,item_id,state.player.regionId,command.column,command.row,"",npcs)
		if not plan.allowed or state.nextWorldEntitySequence>=FarmWorldRules.LIMIT: return "blocked"
		inventory.consume_at(state.inventory,index,1)
		var object: Dictionary={"id":allocate(state),"kind":item_id,"regionId":state.player.regionId,"column":command.column,"row":command.row}
		if item_id=="chest": object.merge({"colorId":"default","slots":FarmInventory.empty_slots(36)})
		else: object.scaredCount=0
		state.worldObjects.append(object)
		return "placed"
	if kind=="buy-backpack-upgrade": return backpack(state,command.interactionId)
	if kind=="collect-world-drop":
		for drop: Dictionary in state.worldDrops:
			if drop.id!=command.dropId: continue
			if drop.regionId!=state.player.regionId or FarmWorldRules.point(state.player).distance_to(Vector2(drop.originX,drop.originY))>48: return "too-far"
			if not inventory.add(state.inventory,drop.stack.itemId,drop.stack.quantity,drop.stack.quality): return "inventory-full"
			state.worldDrops.erase(drop)
			return "collected"
		return "missing-drop"
	if kind=="dismiss-day-settlement":
		if state.unacknowledgedShippingReport==null: return "no-effect"
		if not state.unacknowledgedShippingReport.professionChoices.is_empty(): return "profession-choice-required"
		for id: String in state.unacknowledgedShippingReport.recipeUnlocks:
			if id not in state.knownRecipes: state.knownRecipes.append(id)
		state.unacknowledgedShippingReport=null
		return "changed"
	if kind in ["build-shipping-bin","move-farm-building","demolish-farm-building"]: return building(state,npcs,command)
	var object := FarmWorldRules.object_by_id(state,command.get("objectId",""))
	if object.is_empty(): return "missing-object"
	if not reachable(state,object): return "too-far"
	if kind=="recover-scarecrow":
		if object.kind!="scarecrow": return "missing-object"
		if command.get("itemId") not in ["axe","pickaxe","hoe"] or inventory.quantity(state.inventory,command.itemId)<1: return "wrong-tool"
		if not inventory.add(state.inventory,"scarecrow",1): return "inventory-full"
		state.worldObjects.erase(object)
		return "recovered-scarecrow"
	if kind in ["ship-item","reclaim-last-shipment"]:
		if object.kind!="shipping-bin": return "missing-object"
		if kind=="reclaim-last-shipment":
			if state.shippingQueue.is_empty(): return "empty"
			var last: Dictionary=state.shippingQueue.back()
			if not inventory.add(state.inventory,last.itemId,last.quantity,last.quality): return "inventory-full"
			state.shippingQueue.pop_back()
			return "reclaimed"
		var index:=int(command.sourceIndex)
		if index<0 or index>=state.inventory.size(): return "invalid-slot"
		var slot: Dictionary=state.inventory[index]
		if not rules.items.get(slot.itemId,{}).get("canShip",false) or command.quantity not in ["one","stack"]: return "not-shippable"
		var amount:=1 if command.quantity=="one" else int(slot.quantity)
		state.shippingQueue.append({"itemId":slot.itemId,"quantity":amount,"quality":slot.quality})
		inventory.consume_at(state.inventory,index,amount)
		return "shipped"
	if object.kind!="chest": return "missing-chest"
	if kind in ["recover-empty-chest","push-chest"]:
		var item: String=command.get("itemId","")
		if item!="" and (rules.items.get(item,{}).get("category")!="tool" or inventory.quantity(state.inventory,item)<1): return "missing-item"
		if kind=="recover-empty-chest":
			for slot: Dictionary in object.slots:
				if slot.itemId!="": return "not-empty"
			if not inventory.add(state.inventory,"chest",1): return "inventory-full"
			state.worldObjects.erase(object)
			return "recovered"
		if item not in ["axe","pickaxe","hoe"]: return "wrong-tool"
		return push(state,object,"player",command.get("facing","down"),npcs)
	if not reachable(state,object,true): return "too-far"
	match kind:
		"transfer-container-item":
			if command.direction not in ["to-chest","from-chest"]: return "invalid-transfer"
			var from: Array=state.inventory if command.direction=="to-chest" else object.slots
			var to: Array=object.slots if command.direction=="to-chest" else state.inventory
			return "changed" if inventory.transfer(from,command.sourceIndex,to,command.targetIndex,command.amount) else "invalid-transfer"
		"move-container-item": return "changed" if inventory.transfer(object.slots,command.sourceIndex,object.slots,command.targetIndex,command.amount) else "invalid-transfer"
		"sort-container": return "changed" if inventory.sort_slots(object.slots,false) else "unchanged"
		"set-chest-color":
			if command.colorId not in COLORS: return "invalid-color"
			if command.colorId==object.colorId: return "unchanged"
			object.colorId=command.colorId
			return "changed"
		"add-to-existing-stacks":
			var changed:=false
			for slot: Dictionary in state.inventory:
				if not rules.items.has(slot.itemId): continue
				for target: Dictionary in object.slots:
					if slot.itemId!=target.itemId or slot.quality!=target.quality or slot.quantity<=0: continue
					var amount:=mini(int(slot.quantity),int(rules.items[slot.itemId].maxStack-target.quantity))
					if amount<=0: continue
					target.quantity+=amount
					slot.quantity-=amount
					if slot.quantity==0: slot.itemId=""; slot.quality=0
					changed=true
			return "changed" if changed else "unchanged"
	return "invalid-transfer"

## 制作完整批次到指定格，先在独立库存里消费材料，再提交库存。
func craft(state: Dictionary, recipe_id: String, amount: int, target: int) -> String:
	if amount not in [1,5,25]: return "invalid-quantity"
	var recipe: Dictionary=rules.recipes.get(recipe_id,{})
	if recipe.is_empty() or recipe_id not in state.knownRecipes: return "unknown-recipe"
	var candidate: Array=state.inventory.duplicate(true)
	for ingredient: Dictionary in recipe.ingredients:
		if not inventory.consume(candidate,ingredient.itemId,int(ingredient.quantity)*amount): return "requirements-not-met"
	var item_id: String=recipe.output.itemId
	var count:=int(recipe.output.quantity)*amount
	var placed:=inventory.add_at(candidate,target,item_id,1 if rules.items[item_id].maxStack==1 else count)
	if placed and rules.items[item_id].maxStack==1 and count>1: placed=inventory.add(candidate,item_id,count-1)
	if not placed: return "target-full"
	state.inventory=candidate
	return "crafted"

## 在种子店独立背包陈列前顺序购买 24/36 格，保持原费用。
func backpack(state: Dictionary, id: String) -> String:
	if state.inventoryCapacity>=36: return "backpack-already-upgraded"
	var display: Dictionary=world.interactions.get(id,{})
	if id!="seed-shop-backpack-display" or display.is_empty() or state.player.regionId!="seed-shop" or FarmWorldRules.point(state.player).distance_to(Vector2(display.x+display.width/2.0,display.y+display.height/2.0))>42: return "backpack-upgrade-unavailable"
	var cost:=2000 if state.inventoryCapacity==12 else 10000
	if state.gold<cost: return "backpack-upgrade-insufficient-gold"
	state.gold-=cost
	state.inventory.append_array(FarmInventory.empty_slots(12))
	state.inventoryCapacity+=12
	return "upgraded-backpack"

## 执行木匠建造、移动或拆除；出货队列独立于箱子位置，最后一个箱不可拆。
func building(state: Dictionary, npcs: Array, command: Dictionary) -> String:
	if not carpenter_available(state,npcs,command.interactionId): return "service-unavailable"
	var object:=FarmWorldRules.object_by_id(state,command.get("objectId",""))
	if command.type!="build-shipping-bin" and (object.is_empty() or object.kind!="shipping-bin"): return "missing-building"
	if command.type=="demolish-farm-building":
		var count:=0
		for entry: Dictionary in state.worldObjects: count+=int(entry.kind=="shipping-bin")
		if count<2: return "last-shipping-bin"
		state.worldObjects.erase(object)
		return "demolished"
	if command.type=="build-shipping-bin":
		if state.gold<250: return "insufficient-gold"
		if inventory.quantity(state.inventory,"wood")<150: return "insufficient-wood"
		if state.nextWorldEntitySequence>=FarmWorldRules.LIMIT: return "blocked"
	elif object.column==command.column and object.row==command.row: return "unchanged"
	var result:=world.placement(state,"shipping-bin","farm",command.column,command.row,command.get("objectId",""),npcs)
	if not result.allowed: return "blocked"
	FarmWorldRules.apply_placement(state,result)
	if command.type=="build-shipping-bin":
		inventory.consume(state.inventory,"wood",150)
		state.gold-=250
		state.worldObjects.append({"id":allocate(state),"kind":"shipping-bin","regionId":"farm","column":command.column,"row":command.row})
		return "built"
	object.column=command.column; object.row=command.row
	return "moved"

## 隔夜按物品和分类汇总出货，只执行一次，报告保留到确认后才清除。
func settle_shipping(state: Dictionary) -> bool:
	if state.unacknowledgedShippingReport!=null: return false
	var grouped: Dictionary={}
	for deposit: Dictionary in state.shippingQueue:
		var price: Variant=rules.prices.get(deposit.itemId)
		if price==null or not rules.items[deposit.itemId].canShip: return false
		price=FarmQualityRules.price(int(price),int(deposit.quality))
		var key: String=deposit.itemId+":"+str(deposit.quality)
		var amount:=int(grouped.get(key,{}).get("quantity",0))+int(deposit.quantity)
		if amount>FarmWorldRules.LIMIT/maxi(1,int(price)): return false
		grouped[key]={"itemId":deposit.itemId,"quality":deposit.quality,"quantity":amount,"unitPrice":price,"totalGold":amount*int(price)}
	var categories: Array=[]
	var total:=0
	for category in ["farming","foraging","fishing","mining","other"]:
		var entries: Array=[]
		var subtotal:=0
		for entry: Dictionary in grouped.values():
			if rules.items[entry.itemId].shippingCategory==category:
				entries.append(entry); subtotal+=int(entry.totalGold)
		entries.sort_custom(func(a:Dictionary,b:Dictionary)->bool:return a.quality<b.quality if a.itemId==b.itemId else rules.items[a.itemId].inventorySortOrder<rules.items[b.itemId].inventorySortOrder)
		if not entries.is_empty(): categories.append({"category":category,"entries":entries,"totalGold":subtotal})
		total+=subtotal
	if state.gold+total>FarmWorldRules.LIMIT: return false
	state.gold+=total
	state.shippingQueue=[]
	state.unacknowledgedShippingReport={"settledDay":state.day,"categories":categories,"totalGold":total}
	return true

## 分配递增世界 ID，调用前必须确认没有溢出。
static func allocate(state: Dictionary) -> String:
	var id: String="world-%d"%state.nextWorldEntitySequence
	state.nextWorldEntitySequence+=1
	return id

## 按旧候选随机序列寻找推箱目标，NPC 无路可推时先生成全部持久掉落再移除箱子。
func push(state: Dictionary, chest: Dictionary, actor: String, preferred: String, npcs: Array) -> String:
	var rng: Array[int]=[FarmWorldRules.stable_hash(state.worldSeed,state.day,"chest-push:%s:%d:%d:%d"%[chest.id,chest.column,chest.row,state.minuteOfDay])]
	var target:=_search_push(state,chest,Vector2i(chest.column,chest.row),0,preferred,rng,npcs)
	if target!=Vector2i(-1,-1):
		chest.column=target.x; chest.row=target.y
		return "pushed"
	if actor=="player": return "blocked"
	var populated: Array=chest.slots.filter(func(slot:Dictionary)->bool:return slot.itemId!="" and slot.quantity>0)
	if state.nextWorldEntitySequence+populated.size()>=FarmWorldRules.LIMIT: return "blocked"
	for slot: Dictionary in populated:
		state.worldDrops.append({"id":allocate(state),"regionId":chest.regionId,"originX":chest.column*16+8,"originY":chest.row*16+8,"stack":slot.duplicate(true)})
	state.worldObjects.erase(chest)
	return "destroyed-with-drops"

## 每次访问独立洗牌，首选和反向优先；rng 仅属于当前推箱候选。
func _push_directions(preferred: String, rng: Array[int]) -> Array:
	var values: Array=["right","left","up","down"]
	for index in range(3,0,-1):
		rng[0]=(rng[0]*1664525+1013904223)&0xffffffff
		var other:=floori(float(rng[0])/4294967296.0*(index+1))
		var previous: String=values[index]; values[index]=values[other]; values[other]=previous
	var opposite: String={"left":"right","right":"left","up":"down","down":"up"}[preferred]
	values.erase(preferred); values.erase(opposite)
	return [preferred,opposite]+values

## 有界深度优先搜索；深度三仍检查相邻格，最多得到四步目标。
func _search_push(state: Dictionary, chest: Dictionary, cell: Vector2i, depth: int, preferred: String, rng: Array[int], npcs: Array) -> Vector2i:
	for direction: String in _push_directions(preferred,rng):
		var target:=cell+Vector2i(FarmWorldRules.VECTORS[direction])
		if target==Vector2i(chest.column,chest.row): continue
		if world.placement(state,"chest",chest.regionId,target.x,target.y,chest.id,npcs).allowed: return target
	if depth>=3: return Vector2i(-1,-1)
	for direction: String in _push_directions(preferred,rng):
		var target:=cell+Vector2i(FarmWorldRules.VECTORS[direction])
		if world.blocked(state,chest.regionId,Vector2(target*16+Vector2i(8,8)),Vector2(4,3),chest.id): continue
		var found:=_search_push(state,chest,target,depth+1,preferred,rng,npcs)
		if found!=Vector2i(-1,-1): return found
	return Vector2i(-1,-1)
