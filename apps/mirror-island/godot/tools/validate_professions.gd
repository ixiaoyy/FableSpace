extends "res://tools/validate_quality.gd"
## 采集五级职业的内存检查；覆盖夜间选择、保存恢复与两条真实效果，不读取玩家存档。

## 清空非工具格，保留当前十二格背包结构。
func clear_items(state: Dictionary) -> void:
	for index in range(5,state.inventory.size()): state.inventory[index]=stack("",0)

## 返回当前地图第一个标准地面野采定义，供真实 gather 入口使用。
func forage_spawn(session: FarmGameSession, state: Dictionary) -> Dictionary:
	for region: String in session.world.regions:
		for spawn: Dictionary in session.world.active_forage(state,region):
			if spawn.kind in ["wild-horseradish","daffodil","leek","dandelion"]: return spawn
	return {}

## 检查职业状态、日结门禁、稳定双份和护林木材；失败以非零退出。
func _run() -> void:
	var session:=FarmGameSession.new(); var repo:=MemoryRepository.new(); session.repository=repo
	root.add_child(session)
	expect(await session.new_game(session.rules.initial.player.appearance),"新建职业档")
	var base:=session.snapshot()
	expect(base.version==25 and FarmSaveCodec.VERSION==13 and base.professions=={"farming":[],"foraging":[],"mining":[],"fishing":[]},"版本与空职业")
	var damaged:=base.duplicate(true); damaged.erase("professions")
	expect(session.codec.validate(damaged)!="","缺职业集合拒绝")
	damaged=base.duplicate(true); damaged.professions.foraging=["unknown"]
	expect(session.codec.validate(damaged)!="","未知职业拒绝")
	damaged=base.duplicate(true); damaged.professions.farming=["forester"]
	expect(session.codec.validate(damaged)!="","跨技能职业拒绝")
	damaged=base.duplicate(true); damaged.professions.foraging=["gatherer"]
	expect(session.codec.validate(damaged)!="","未到五级职业拒绝")
	var old_payload:=JSON.stringify({"engine":"godot","version":10,"updatedAt":1,"state":base})
	repo.payload=old_payload; var writes:=repo.writes
	expect(not await session.continue_game() and repo.payload==old_payload and repo.writes==writes,"旧封套保留拒绝")

	var bed: Dictionary=session.world.interactions.values().filter(func(x:Dictionary)->bool:return x.kind=="bed")[0]
	var state:=base.duplicate(true)
	state.skills.foraging={"xp":2150,"level":5,"reportedLevel":4}
	state.player.regionId="cottage"; state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	reset(session,state); repo.fail_next=true
	await session.dispatch({"type":"sleep","bedId":bed.entityId})
	expect(session.snapshot()==state,"职业日结失败不发布")
	await session.dispatch({"type":"retry-day-settlement"})
	var report: Dictionary=session.snapshot().unacknowledgedShippingReport
	expect(report.professionChoices==[{"skill":"foraging","level":5,"options":["forester","gatherer"]}] and session.snapshot().professions.foraging.is_empty(),"夜间生成二选一")
	var before:=session.snapshot(); var result:=await session.dispatch({"type":"dismiss-day-settlement"})
	expect(result.code=="profession-choice-required" and session.snapshot()==before,"未选择不能关闭")
	result=await session.dispatch({"type":"choose-profession","skill":"foraging","level":5,"profession":"botanist"})
	expect(result.code=="invalid-profession-choice" and session.snapshot()==before,"非法分支不修改")
	damaged=before.duplicate(true); damaged.unacknowledgedShippingReport.professionChoices=[]
	expect(session.codec.validate(damaged)!="","报告不能丢失选择")
	damaged=before.duplicate(true); damaged.unacknowledgedShippingReport.professionChoices[0].options.reverse()
	expect(session.codec.validate(damaged)!="","选项顺序篡改拒绝")
	repo.fail_next=true
	await session.dispatch({"type":"choose-profession","skill":"foraging","level":5,"profession":"forester"})
	expect(session.snapshot()==before,"选择保存失败不提前生效")
	await session.dispatch({"type":"retry-storage-save"})
	expect(session.snapshot().professions.foraging==["forester"] and session.snapshot().unacknowledgedShippingReport.professionChoices.is_empty(),"选择重试只生效一次")
	expect(await session.continue_game() and session.snapshot().professions.foraging==["forester"],"待关闭报告与职业恢复")
	await session.dispatch({"type":"dismiss-day-settlement"})
	expect(session.snapshot().unacknowledgedShippingReport==null and session.snapshot().professions.foraging==["forester"],"关闭后职业保留")

	state=base.duplicate(true); clear_items(state)
	var tree: Dictionary=session.world.resources["farm-tree-001"]
	state.player.x=tree.x; state.player.y=tree.y+16
	expect(session.resource_rules.gather(state,tree.entityId,"axe","up") in ["chopped","chopped-with-seed"] and session.inventory.quantity(state.inventory,"wood")==12 and state.skills.foraging.xp==14,"普通树最低十二木十四经验")
	expect(session.resource_rules.gather(state,tree.entityId,"axe","up")=="stump-cleared" and session.inventory.quantity(state.inventory,"wood")==17 and state.skills.foraging.xp==16,"普通树桩五木二经验")
	state=base.duplicate(true); clear_items(state); state.professions.foraging=["forester"]; state.skills.foraging={"xp":2150,"level":5,"reportedLevel":5}
	state.player.x=tree.x; state.player.y=tree.y+16
	session.resource_rules.gather(state,tree.entityId,"axe","up")
	expect(session.inventory.quantity(state.inventory,"wood")==15 and state.skills.foraging.xp==2164,"护林树木十五木")
	session.resource_rules.gather(state,tree.entityId,"axe","up")
	expect(session.inventory.quantity(state.inventory,"wood")==21 and state.skills.foraging.xp==2166,"护林树桩六木")

	state=base.duplicate(true); clear_items(state); state.professions.foraging=["gatherer"]; state.skills.foraging={"xp":2150,"level":5,"reportedLevel":5}
	var spawn:=forage_spawn(session,state); state.player.regionId=spawn.regionId; state.player.x=spawn.x; state.player.y=spawn.y
	for seed in range(1000):
		state.worldSeed=seed
		if session.resource_rules.gatherer_double(state,state.day,spawn.entityId+":ground-forage"): break
	var quality:=FarmQualityRules.roll(state.worldSeed,state.day,spawn.entityId+":forage",5,0,true)
	reset(session,state); repo.fail_next=true
	await session.dispatch({"type":"use-item-on-target","targetId":spawn.entityId,"itemId":"","facing":"down"})
	expect(session.snapshot()==state,"双份野采保存失败不发布")
	await session.dispatch({"type":"retry-storage-save"})
	state=session.snapshot()
	expect(session.inventory.quantity(state.inventory,spawn.kind,quality)==2 and state.skills.foraging.xp==2164,"地面野采双份同品质十四经验")
	damaged=state.duplicate(true); damaged.dailyForage.collectedIds=[]; clear_items(damaged)
	for index in range(5,damaged.inventory.size()): damaged.inventory[index]=stack("stone",999)
	before=damaged.duplicate(true)
	expect(session.resource_rules.gather(damaged,spawn.entityId,"","down")=="inventory-full" and damaged==before,"双份满包整次不变")

	state=base.duplicate(true); clear_items(state); state.professions.foraging=["gatherer"]; state.skills.foraging={"xp":2150,"level":5,"reportedLevel":5}; state.player.x=408; state.player.y=280
	var farm_tile:=tile(); farm_tile.merge({"phase":"mature","cropId":"spring-forage","growthDays":7,"plantedDay":1},true); state.farmTiles[farm_tile.id]=farm_tile
	for planted in range(1,1000):
		farm_tile.plantedDay=planted
		if session.resource_rules.gatherer_double(state,planted,"%s:%d:wild-harvest"%[farm_tile.id,farm_tile.harvestCount]): break
	var output:=session.resource_rules.harvest_item_id(state,farm_tile,session.world.crops["spring-forage"])
	quality=session.resource_rules.harvest_quality(state,farm_tile,session.world.crops["spring-forage"])
	result={"code":session.resource_rules.farm(state,26,17,"","down")}
	expect(result.code=="harvested-double" and session.inventory.quantity(state.inventory,output,quality)==2,"野生种子双份同品质")
	expect(state.skills.farming.xp==3 and state.skills.foraging.xp==2154,"野种双份三种植四采集经验")
	expect(not session.codec.decode(FarmSaveCodec.encode(state)).has("error"),"职业效果档往返")

	for failure: String in failures: push_error(failure)
	print("Profession checks: %d/%d passed"%[checks-failures.size(),checks])
	session.queue_free(); await process_frame; quit(0 if failures.is_empty() else 1)
