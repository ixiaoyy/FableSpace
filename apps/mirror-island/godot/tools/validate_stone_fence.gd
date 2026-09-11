extends "res://tools/validate_quality.gd"
## 围栏与大门的窄回归检查；只使用内存仓库，不读取玩家槽或真实存档。

const FarmFenceRules = preload("res://domain/fence_rules.gd")

## 检查木围栏、大门、石围栏的配方、摆放、碰撞、开合、老化、回收、出货和存档边界。
func _run() -> void:
	var session:=FarmGameSession.new(); var repo:=MemoryRepository.new(); session.repository=repo
	root.add_child(session)
	expect(await session.new_game(session.rules.initial.player.appearance),"新建围栏测试档")
	var base:=session.snapshot()
	var assets:=FarmAssets.new()
	expect(base.version==25 and FarmSaveCodec.VERSION==13 and FarmSaveCodec.STATE_VERSION==25,"版本25/13")
	expect("wood-fence" in base.knownRecipes and "gate" in base.knownRecipes and "stone-fence" not in base.knownRecipes,"默认围栏配方集合")

	var wood_recipe: Dictionary=session.rules.recipes["wood-fence"]
	var gate_recipe: Dictionary=session.rules.recipes["gate"]
	var stone_recipe: Dictionary=session.rules.recipes["stone-fence"]
	expect(wood_recipe.ingredients==[{"itemId":"wood","quantity":2}] and wood_recipe.output=={"itemId":"wood-fence","quantity":1} and wood_recipe.knownByDefault,"木围栏默认配方")
	expect(gate_recipe.ingredients==[{"itemId":"wood","quantity":10}] and gate_recipe.output=={"itemId":"gate","quantity":1} and gate_recipe.knownByDefault,"大门默认配方")
	expect(stone_recipe.ingredients==[{"itemId":"stone","quantity":2}] and stone_recipe.output=={"itemId":"stone-fence","quantity":1} and stone_recipe.skill=="farming" and stone_recipe.level==2 and not stone_recipe.knownByDefault,"石围栏二级配方")
	expect(session.rules.items["wood-fence"].name=="木围栏" and session.rules.items["stone-fence"].name=="石围栏" and session.rules.items["gate"].name=="大门","围栏官方中文名")
	expect(session.rules.prices["wood-fence"]==1 and session.rules.prices["stone-fence"]==2 and session.rules.prices["gate"]==4,"围栏出货价格")
	for id: String in ["wood-fence","stone-fence","gate","gate-open"]:
		expect(assets.icon(id)!=null and assets.icon(id).get_width()==16 and assets.icon(id).get_height()==16,"围栏图标 "+id)
	for profile: Dictionary in session.rules.profiles:
		for id: String in ["wood-fence","stone-fence","gate"]:
			expect(session.rules.giftPreferences[profile.npcId].get(id)=="disliked","围栏礼物反应 "+profile.npcId+" "+id)

	var state:=base.duplicate(true); state.inventory[5]=stack("wood",12)
	expect(session.storage.craft(state,"wood-fence",1,6)=="crafted" and state.inventory[5].quantity==10 and state.inventory[6]==stack("wood-fence",1),"木围栏制作消耗2木材")
	expect(session.storage.craft(state,"gate",1,7)=="crafted" and state.inventory[5].itemId=="" and state.inventory[7]==stack("gate",1),"大门制作消耗10木材")
	state=base.duplicate(true); state.inventory[5]=stack("stone",2)
	expect(session.storage.craft(state,"stone-fence",1,6)=="unknown-recipe" and state.inventory[5]==stack("stone",2),"二级前不能制作石围栏且不消费材料")
	state.skills.farming={"xp":380,"level":2,"reportedLevel":0}
	var bed: Dictionary=session.world.interactions.values().filter(func(value:Dictionary)->bool:return value.kind=="bed")[0]
	state.player.regionId="cottage"; state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	reset(session,state); repo.fail_next=true
	await session.dispatch({"type":"sleep","bedId":bed.entityId})
	expect(session.snapshot()==state,"石围栏升级报告保存失败不发布")
	await session.dispatch({"type":"retry-day-settlement"})
	var report: Dictionary=session.snapshot().unacknowledgedShippingReport
	expect("stone-fence" in report.recipeUnlocks and "stone-fence" not in session.snapshot().knownRecipes,"耕种二级夜间待学")
	await session.dispatch({"type":"dismiss-day-settlement"})
	state=session.snapshot()
	expect("stone-fence" in state.knownRecipes,"确认报告后学会石围栏")

	state.inventory[5]=stack("stone",2); state.player.regionId="cottage"; state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	reset(session,state)
	var result:=await session.dispatch({"type":"craft-item","recipeId":"stone-fence","quantity":1,"targetIndex":6})
	expect(result.code=="crafted" and session.inventory.quantity(session.snapshot().inventory,"stone")==0 and session.inventory.quantity(session.snapshot().inventory,"stone-fence")==1,"确认学习后制作石围栏")

	state=session.snapshot(); state.player.regionId="farm"; state.player.x=408; state.player.y=280
	reset(session,state); var before:=session.snapshot(); repo.fail_next=true
	await session.dispatch({"type":"place-world-object","inventoryIndex":6,"column":26,"row":17})
	expect(session.snapshot()==before and session.save_phase=="failed","石围栏摆放保存失败不发布")
	await session.dispatch({"type":"retry-storage-save"})
	state=session.snapshot()
	var fences: Array=state.worldObjects.filter(func(value:Dictionary)->bool:return value.kind=="stone-fence")
	expect(fences.size()==1 and session.inventory.quantity(state.inventory,"stone-fence")==0,"石围栏摆放成功")
	var fence: Dictionary=fences[0]
	expect(fence.placedDay==state.day and not fence.damaged and not fence.has("open"),"石围栏初始耐久状态")
	expect(session.world.blocked(state,"farm",Vector2(26*16+8,17*16+8),Vector2(4,3),"",session.npcs.snapshot()),"石围栏阻挡移动")
	expect(not session.world.placement(state,"stone-fence","town",26,17).allowed,"石围栏不能摆放到农场外")

	before=state.duplicate(true); repo.fail_next=true
	await session.dispatch({"type":"recover-stone-fence","objectId":fence.id,"itemId":"pickaxe"})
	expect(session.snapshot()==before and session.save_phase=="failed","石围栏回收保存失败不发布")
	await session.dispatch({"type":"retry-storage-save"})
	state=session.snapshot()
	expect(state.worldObjects.filter(func(value:Dictionary)->bool:return value.kind=="stone-fence").is_empty() and session.inventory.quantity(state.inventory,"stone-fence")==1,"十字镐回收石围栏")

	state=base.duplicate(true); state.player.regionId="farm"; state.player.x=408; state.player.y=280; state.nextWorldEntitySequence=2
	state.worldObjects.append({"id":"world-1","kind":"stone-fence","regionId":"farm","column":26,"row":17,"placedDay":state.day,"damaged":false})
	before=state.duplicate(true)
	expect(session.storage.apply(state,[],{"type":"recover-stone-fence","objectId":"world-1","itemId":"axe"})=="wrong-tool" and state==before,"错误工具不能回收石围栏")
	for index in range(5,state.inventory.size()): state.inventory[index]=stack("stone",999)
	expect(session.storage.apply(state,[],{"type":"recover-stone-fence","objectId":"world-1","itemId":"pickaxe"})=="inventory-full" and state.worldObjects.size()==2,"回收满包保留完整石围栏")
	state.worldObjects[1].damaged=true
	expect(session.storage.apply(state,[],{"type":"recover-stone-fence","objectId":"world-1","itemId":"pickaxe"})=="removed-damaged-fence" and state.worldObjects.size()==1 and session.inventory.quantity(state.inventory,"stone-fence")==0,"损坏石围栏可清理但不返还物品")

	state=base.duplicate(true); state.player.regionId="farm"; state.player.x=408; state.player.y=280; state.nextWorldEntitySequence=1
	state.inventory[5]=stack("wood-fence",1); state.inventory[6]=stack("gate",1)
	expect(session.storage.apply(state,[],{"type":"place-world-object","inventoryIndex":5,"column":26,"row":17})=="placed","木围栏可摆放")
	var wood_fence: Dictionary=state.worldObjects.filter(func(value:Dictionary)->bool:return value.kind=="wood-fence")[0]
	expect(wood_fence.placedDay==state.day and not wood_fence.damaged and session.world.blocked(state,"farm",Vector2(26*16+8,17*16+8),Vector2(4,3),"",session.npcs.snapshot()),"木围栏初始阻挡")
	expect(session.storage.apply(state,[],{"type":"place-world-object","inventoryIndex":6,"column":26,"row":17})=="placed","大门替换普通围栏")
	var gate: Dictionary=state.worldObjects.filter(func(value:Dictionary)->bool:return value.kind=="gate")[0]
	expect(not gate.open and session.world.blocked(state,"farm",Vector2(26*16+8,17*16+8),Vector2(4,3),"",session.npcs.snapshot()),"关闭大门阻挡")
	expect(session.storage.apply(state,[],{"type":"toggle-gate","objectId":gate.id})=="gate-opened" and gate.open and not session.world.blocked(state,"farm",Vector2(26*16+8,17*16+8),Vector2(4,3),"",session.npcs.snapshot()),"打开大门允许通行")
	state.player.x=26*16+8; state.player.y=17*16+8
	expect(session.storage.apply(state,[],{"type":"toggle-gate","objectId":gate.id})=="blocked" and gate.open,"角色站在大门上时不能关闭")
	state.player.x=408; state.player.y=280
	expect(session.storage.apply(state,[],{"type":"toggle-gate","objectId":gate.id})=="gate-closed" and not gate.open,"离开后大门可关闭")

	state=base.duplicate(true); state.player.regionId="farm"; state.player.x=408; state.player.y=280; state.nextWorldEntitySequence=2
	state.inventory[5]=stack("stone-fence",1)
	state.worldObjects.append({"id":"world-1","kind":"wood-fence","regionId":"farm","column":26,"row":17,"placedDay":1,"damaged":true})
	expect(session.storage.apply(state,[],{"type":"place-world-object","inventoryIndex":5,"column":26,"row":17})=="placed","新围栏替换损坏围栏")
	expect(state.worldObjects.filter(func(value:Dictionary)->bool:return value.kind=="wood-fence").is_empty() and state.worldObjects.filter(func(value:Dictionary)->bool:return value.kind=="stone-fence").size()==1,"替换后只保留新围栏")

	state=base.duplicate(true); state.worldObjects.append({"id":"world-1","kind":"stone-fence","regionId":"farm","column":26,"row":17,"placedDay":1,"damaged":false}); state.nextWorldEntitySequence=2
	var aging_fence: Dictionary=state.worldObjects[1]
	var lifespan:=FarmFenceRules.durability_days(state,aging_fence)
	expect(lifespan>=106 and lifespan<=109 and FarmFenceRules.durability_days(state,{"id":"world-2","kind":"wood-fence","placedDay":1})>=48 and FarmFenceRules.durability_days(state,{"id":"world-3","kind":"gate","placedDay":1})==360,"围栏寿命区间")
	state.day=lifespan+1
	var fence_events:=FarmFenceRules.settle_day(state)
	expect(fence_events.damaged==1 and fence_events.vanished==0 and aging_fence.damaged,"寿命结束后先变损坏")
	state.day+=1
	fence_events=FarmFenceRules.settle_day(state)
	expect(fence_events.vanished==1 and state.worldObjects.size()==1,"损坏围栏次日消失")

	state=base.duplicate(true); state.player.regionId="farm"; state.player.x=376; state.player.y=232
	state.inventory[5]=stack("wood-fence",1); state.inventory[6]=stack("gate",1); state.inventory[7]=stack("stone-fence",1)
	expect(session.storage.apply(state,[],{"type":"ship-item","objectId":"farm-shipping-bin-default","sourceIndex":5,"quantity":"stack"})=="shipped","木围栏进入出货队列")
	expect(session.storage.apply(state,[],{"type":"ship-item","objectId":"farm-shipping-bin-default","sourceIndex":6,"quantity":"stack"})=="shipped","大门进入出货队列")
	expect(session.storage.apply(state,[],{"type":"ship-item","objectId":"farm-shipping-bin-default","sourceIndex":7,"quantity":"stack"})=="shipped","石围栏进入出货队列")
	expect(session.storage.settle_shipping(state) and state.unacknowledgedShippingReport.totalGold==7,"围栏按1g、4g、2g出货")

	state=base.duplicate(true); state.player.regionId="farm"; state.player.x=408; state.player.y=280; state.nextWorldEntitySequence=2
	state.worldObjects.append({"id":"world-1","kind":"stone-fence","regionId":"farm","column":26,"row":17,"placedDay":state.day,"damaged":false})
	expect(session.codec.validate(state)=="" and not session.codec.decode(JSON.stringify({"engine":"godot","version":13,"updatedAt":1,"state":state})).has("error"),"石围栏同版本存档往返")
	before=state.duplicate(true); before.worldObjects[1].erase("placedDay")
	expect(session.codec.validate(before)!="","存档拒绝缺少摆放日期的围栏")
	before=state.duplicate(true); before.worldObjects[1].regionId="town"
	expect(session.codec.validate(before)!="","存档拒绝农场外围栏")
	before=state.duplicate(true); before.worldObjects[1]={"id":"world-1","kind":"gate","regionId":"farm","column":26,"row":17,"placedDay":state.day,"damaged":false}
	expect(session.codec.validate(before)!="","存档拒绝缺少开合状态的大门")
	before.worldObjects[1].open=false
	expect(session.codec.validate(before)=="","存档接受完整大门状态")
	before.worldObjects[1].open="false"
	expect(session.codec.validate(before)!="","存档拒绝非布尔大门状态")
	expect(session.codec.decode(JSON.stringify({"engine":"godot","version":12,"updatedAt":1,"state":state})).has("error"),"旧封套拒绝")

	for failure: String in failures: push_error(failure)
	print("Fence rules: %d/%d passed"%[checks-failures.size(),checks])
	session.queue_free(); await process_frame; quit(0 if failures.is_empty() else 1)
