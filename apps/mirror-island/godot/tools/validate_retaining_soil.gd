extends "res://tools/validate_quality.gd"
## 复用内存测试工具，定向验证保水日结、互斥、品质隔离和失败重试，不读玩家槽。

## 通过真实领域和会话入口检查保湿土；只在内存构造地块与材料。
func _run() -> void:
	var session:=FarmGameSession.new(); var repo:=MemoryRepository.new(); session.repository=repo
	root.add_child(session)
	expect(await session.new_game(session.rules.initial.player.appearance),"新建")
	var base:=session.snapshot(); var state:=base.duplicate(true); var t:=tile()
	state.player.x=408; state.player.y=280; state.farmTiles[t.id]=t
	state.inventory[5]=stack("basic-retaining-soil",3)
	t.merge({"phase":"mature","cropId":"parsnip","growthDays":4,"plantedDay":1},true)
	reset(session,state); repo.fail_next=true
	await session.dispatch({"type":"use-item-on-tile","itemId":"basic-retaining-soil","column":26,"row":17})
	expect(session.snapshot()==state,"施用失败不发布")
	await session.dispatch({"type":"retry-storage-save"})
	state=session.snapshot(); t=state.farmTiles[t.id]
	expect(t.fertilizer==2 and state.inventory[5].quantity==2,"成熟阶段施用成功一次")
	expect(not session.codec.decode(repo.payload).has("error"),"保湿土档往返")
	var before:=state.duplicate(true)
	expect(session.resource_rules.farm(state,26,17,"basic-retaining-soil","")=="already-fertilized" and state==before,"重复拒绝")
	state.inventory[6]=stack("basic-fertilizer",1)
	expect(session.resource_rules.farm(state,26,17,"basic-fertilizer","")=="already-fertilized","品质肥与保湿土互斥")
	var q:=session.resource_rules.harvest_quality(state,t,session.world.crops.parsnip)
	t.fertilizer=0
	expect(session.resource_rules.harvest_quality(state,t,session.world.crops.parsnip)==q,"保湿土无品质加成")
	t.fertilizer=3; expect(session.codec.validate(state)!="","未知肥料拒绝")
	t.fertilizer=2
	var kept:=0; var wet_day:=0
	for day in range(1,301):
		state.day=day; t.watered=true; session.resource_rules.settle_crops(state)
		if t.watered: kept+=1; wet_day=day
	expect(kept>65 and kept<135,"三百个稳定日期保水样本")
	state.day=wet_day; t.watered=false; session.resource_rules.settle_crops(state)
	expect(not t.watered,"干地即使命中也不变湿")
	t.watered=true; t.phase="growing"; t.growthDays=2
	session.resource_rules.settle_crops(state)
	expect(t.watered and t.growthDays==3,"先生长再保水")
	t.fertilizer=1; t.watered=true; session.resource_rules.settle_crops(state)
	expect(not t.watered and t.phase=="mature","基础肥料不会保水")
	state=base.duplicate(true); state.inventory[5]=stack("stone",2)
	expect(session.storage.craft(state,"basic-retaining-soil",1,6)=="unknown-recipe","未学不能制作")
	state.skills.farming={"xp":1300,"level":4,"reportedLevel":0}
	expect("basic-retaining-soil" in FarmSkillRules.recipe_unlocks(state,session.rules.recipes),"四级待学")
	var bed: Dictionary=session.world.interactions.values().filter(func(x:Dictionary)->bool:return x.kind=="bed")[0]
	state.player.regionId="cottage"; state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	t=tile(); t.fertilizer=2; t.watered=true; state.farmTiles[t.id]=t
	var expected: bool=FarmWorldRules.stable_hash(state.worldSeed,state.day,t.id+":retain-water")%3==0 or state.weather.next=="rain"
	reset(session,state); repo.fail_next=true
	await session.dispatch({"type":"sleep","bedId":bed.entityId})
	expect(session.snapshot()==state,"日结失败水分日期不发布")
	await session.dispatch({"type":"retry-day-settlement"})
	expect(session.snapshot().day==2 and session.snapshot().farmTiles[t.id].watered==expected,"日结重试保留同一保水候选及次日雨水")
	await session.dispatch({"type":"dismiss-day-settlement"}); state=session.snapshot()
	expect("basic-retaining-soil" in state.knownRecipes,"确认学会")
	expect(session.storage.craft(state,"basic-retaining-soil",1,6)=="crafted" and session.inventory.quantity(state.inventory,"stone")==0 and session.inventory.quantity(state.inventory,"basic-retaining-soil")==1,"二石换一保湿土")
	for failure: String in failures: push_error(failure)
	print("Retaining soil: %d/%d; sample=%d/300"%[checks-failures.size(),checks,kept])
	session.queue_free(); await process_frame; quit(0 if failures.is_empty() else 1)
