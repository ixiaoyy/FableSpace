extends "res://tools/validate_quality.gd"
## 湖岸基础钓鱼技能的内存检查；不读取玩家存档或打开可见窗口。

## 构造可在第七天旧码头抛竿的合法状态，调用方可再调整技能或体力。
func fishing_state(session: FarmGameSession, base: Dictionary) -> Dictionary:
	var state:=base.duplicate(true)
	state.day=7; state.weather.day=7; state.dailyForage.day=7
	state.dailyRequest={"day":7,"requestId":session.social.request_for_day(7).requestId,"completed":false}
	var zone: Dictionary=session.world.zones["lakeshore-old-dock-fishing"]
	state.player.regionId="lakeshore"; state.player.x=zone.x+zone.width/2.0; state.player.y=zone.y+zone.height/2.0
	state.inventory[5]=stack("fishing-rod",1)
	return state

## 把瞬态钓鱼推进到下一帧即可完成的收线状态；鱼获仍由真实 tick 候选提交。
func prime_catch(session: FarmGameSession, fish: Dictionary, progress: float=99.0, tension: float=50.0) -> void:
	session.fishing.runtime={"phase":"reeling","zoneId":"lakeshore-old-dock-fishing","held":true,"elapsedMs":0.0,"biteAtMs":0,"castPower":50.0,"tension":tension,"progress":progress,"fish":fish,"attempt":1,"failureReason":null}

## 检查湖岸鱼池、经验原子性、四技能存档、日结和鱼竿熟练度；失败返回非零。
func _run() -> void:
	var session:=FarmGameSession.new(); var repo:=MemoryRepository.new(); session.repository=repo
	root.add_child(session)
	expect(await session.new_game(session.rules.initial.player.appearance),"新建钓鱼技能档")
	var base:=session.snapshot()
	expect(base.version==24 and FarmSaveCodec.VERSION==12,"版本24/12")
	var skill_ids: Array[String]=["farming","foraging","mining","fishing"]
	expect(base.skills.size()==4 and base.professions.size()==4 and skill_ids.all(func(id:String)->bool:return base.skills.has(id) and base.professions.has(id)),"技能职业四键")
	expect(base.skills.fishing=={"xp":0,"level":0,"reportedLevel":0} and base.professions.fishing.is_empty(),"初始钓鱼进度")

	var expected: Dictionary={"lake-carp":{"difficulty":15,"xp":8,"price":30,"energy":13,"maxMinute":1560,"pull":8},"silver-minnow":{"difficulty":35,"xp":14,"price":50,"energy":25,"maxMinute":1560,"pull":12},"jade-bream":{"difficulty":50,"xp":19,"price":100,"energy":38,"maxMinute":1140,"pull":24}}
	var active_ids: Array=[]
	for fish: Dictionary in session.rules.fish:
		active_ids.append(fish.itemId)
		var item: Dictionary=session.rules.items[fish.itemId]; var value: Dictionary=expected.get(fish.itemId,{})
		expect(not value.is_empty() and fish.difficulty==value.difficulty and FarmSkillRules.fishing_xp(0,fish.difficulty)==value.xp,"湖鱼难度与经验 "+fish.itemId)
		expect(fish.minMinute==360 and fish.maxMinute==value.maxMinute and fish.minCast==0 and fish.pull==value.pull and not fish.has("weather"),"湖鱼时段天气与张力 "+fish.itemId)
		expect(session.rules.prices[fish.itemId]==value.price and item.staminaRestore==value.energy,"湖鱼价格与恢复 "+fish.itemId)
	expect(active_ids==["lake-carp","silver-minnow","jade-bream"],"湖岸只启用三条湖鱼")
	for id: String in ["rain-loach","wind-dace","dusk-perch"]:
		expect(session.rules.items.has(id) and id not in active_ids,"河流鱼保留但不在湖岸 "+id)

	var damaged:=base.duplicate(true); damaged.skills.erase("fishing")
	expect(session.codec.validate(damaged)!="","缺钓鱼技能拒绝")
	damaged=base.duplicate(true); damaged.professions.erase("fishing")
	expect(session.codec.validate(damaged)!="","缺钓鱼职业键拒绝")
	damaged=base.duplicate(true); damaged.professions.fishing=["forester"]
	expect(session.codec.validate(damaged)!="","未开放钓鱼职业拒绝")
	var old:=base.duplicate(true); old.version=23
	expect(session.codec.validate(old)!="","旧状态版本直接拒绝")
	expect(session.codec.decode(JSON.stringify({"engine":"godot","version":12,"updatedAt":1,"state":old})).has("error"),"当前封套拒绝旧状态")
	var old_payload:=JSON.stringify({"engine":"godot","version":11,"updatedAt":1,"state":old})
	repo.payload=old_payload; var writes:=repo.writes
	expect(not await session.continue_game() and repo.payload==old_payload and repo.writes==writes,"旧11/23档保留拒绝")

	var state:=fishing_state(session,base); state.skills.fishing={"xp":92,"level":0,"reportedLevel":0}
	reset(session,state); repo.fail_next=true; prime_catch(session,session.rules.fish[0])
	await session.tick(0.05,true)
	expect(session.snapshot()==state and session.save_phase=="failed","鱼获保存失败不发布")
	await session.dispatch({"type":"retry-fishing-save"}); await session.dispatch({"type":"retry-fishing-save"})
	var caught:=session.snapshot()
	expect(session.inventory.quantity(caught.inventory,"lake-carp",0)==1 and caught.skills.fishing=={"xp":100,"level":1,"reportedLevel":0},"普通鱼获重试只增加一次经验")
	expect(not session.codec.decode(repo.payload).has("error"),"钓鱼技能档同版本恢复")

	state=fishing_state(session,base)
	for index in range(5,state.inventory.size()): state.inventory[index]=stack("stone",999)
	reset(session,state); prime_catch(session,session.rules.fish[0])
	await session.tick(0.05,true)
	expect(session.snapshot()==state and session.fishing.runtime.phase=="inventory-full" and state.skills.fishing.xp==0,"满包不增加经验")
	state=fishing_state(session,base); reset(session,state); prime_catch(session,session.rules.fish[0],0.0,99.0)
	await session.tick(0.05,true)
	expect(session.snapshot()==state and session.fishing.runtime.phase=="escaped" and state.skills.fishing.xp==0,"逃脱不增加经验")

	state=caught.duplicate(true); state.stamina=5.0; session.fishing.runtime.clear()
	var bed: Dictionary=session.world.interactions.values().filter(func(value:Dictionary)->bool:return value.kind=="bed")[0]
	state.player.regionId="cottage"; state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	reset(session,state); await session.dispatch({"type":"sleep","bedId":bed.entityId})
	var report: Dictionary=session.snapshot().unacknowledgedShippingReport
	expect(report.skillUpgrades==[{"skill":"fishing","from":0,"to":1}] and report.professionChoices.is_empty() and session.snapshot().stamina==270,"夜间报告钓鱼升级、恢复满体力且无假职业")
	expect(await session.continue_game() and session.snapshot().unacknowledgedShippingReport.skillUpgrades==report.skillUpgrades,"钓鱼升级报告恢复")

	state=fishing_state(session,base); state.skills.fishing={"xp":100,"level":1,"reportedLevel":1}; state.stamina=7.9
	reset(session,state); session.fishing.runtime.clear()
	var result:=await session.dispatch({"type":"start-fishing","zoneId":"lakeshore-old-dock-fishing"})
	expect(result.code=="started" and is_zero_approx(session.snapshot().stamina),"一级钓鱼下一次抛竿耗能7.9")
	state=fishing_state(session,base); state.skills.fishing={"xp":100,"level":1,"reportedLevel":1}; state.stamina=7.89
	reset(session,state); session.fishing.runtime.clear(); var before:=session.snapshot()
	result=await session.dispatch({"type":"start-fishing","zoneId":"lakeshore-old-dock-fishing"})
	expect(result.code=="insufficient-stamina" and session.snapshot()==before,"鱼竿熟练度余额边界")

	for failure: String in failures: push_error(failure)
	print("Fishing skill checks: %d/%d passed"%[checks-failures.size(),checks])
	session.queue_free(); await process_frame; quit(0 if failures.is_empty() else 1)
