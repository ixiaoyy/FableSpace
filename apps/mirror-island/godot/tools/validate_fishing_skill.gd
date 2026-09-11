extends "res://tools/validate_quality.gd"
## 湖岸基础钓鱼技能的内存检查；不读取玩家存档或打开可见窗口。

## 构造可在第七天指定钓位抛竿的合法状态，调用方可再调整技能、天气或体力。
func fishing_state(session: FarmGameSession, base: Dictionary, zone_id: String="lakeshore-old-dock-fishing") -> Dictionary:
	var state:=base.duplicate(true)
	state.day=7; state.weather.day=7; state.dailyForage.day=7
	state.dailyRequest={"day":7,"requestId":session.social.request_for_day(7).requestId,"completed":false}
	var zone: Dictionary=session.world.zones[zone_id]
	state.player.regionId=zone.regionId; state.player.x=zone.x+zone.width/2.0; state.player.y=zone.y+zone.height/2.0
	state.inventory[5]=stack("fishing-rod",1)
	return state

## 把瞬态钓鱼推进到下一帧即可完成的收线状态；鱼获仍由真实 tick 候选提交。
func prime_catch(session: FarmGameSession, fish: Dictionary, progress: float=99.0, tension: float=50.0, zone_id: String="lakeshore-old-dock-fishing", cast_power: float=5.0, perfect: bool=false) -> void:
	session.fishing.runtime={"phase":"reeling","zoneId":zone_id,"held":true,"elapsedMs":0.0,"biteAtMs":0,"castPower":cast_power,"tension":tension,"progress":progress,"fish":fish,"quality":0,"perfect":perfect,"attempt":1,"failureReason":null}

## 返回指定水域类型绑定的鱼种 ID；只检查内容合同，不执行随机选鱼。
func fish_ids_for(session: FarmGameSession, habitat: String) -> Array:
	var result: Array=[]
	for fish: Dictionary in session.rules.fish:
		if fish.get("habitats",[]).has(habitat): result.append(fish.itemId)
	return result

## 用指定钓位、时间和天气直接检查候选池；不触发扣体力、咬钩或保存。
func eligible_ids(session: FarmGameSession, base: Dictionary, zone_id: String, minute: int, weather: String, strength: int=100) -> Array:
	var state:=base.duplicate(true)
	state.minuteOfDay=minute; state.weather.current=weather
	session.fishing.runtime={"zoneId":zone_id}
	var result: Array=[]
	for fish: Dictionary in session.fishing._eligible(state,strength): result.append(fish.itemId)
	session.fishing.runtime.clear()
	return result

## 检查湖岸鱼池、经验原子性、四技能存档、日结和鱼竿熟练度；失败返回非零。
func _run() -> void:
	var session:=FarmGameSession.new(); var repo:=MemoryRepository.new(); session.repository=repo
	root.add_child(session)
	expect(await session.new_game(session.rules.initial.player.appearance),"新建钓鱼技能档")
	var base:=session.snapshot()
	expect(base.version==25 and FarmSaveCodec.VERSION==13,"版本25/13")
	var skill_ids: Array[String]=["farming","foraging","mining","fishing"]
	expect(base.skills.size()==4 and base.professions.size()==4 and skill_ids.all(func(id:String)->bool:return base.skills.has(id) and base.professions.has(id)),"技能职业四键")
	expect(base.skills.fishing=={"xp":0,"level":0,"reportedLevel":0} and base.professions.fishing.is_empty(),"初始钓鱼进度")

	var expected: Dictionary={
		"lake-carp":{"habitat":"mountain-lake","difficulty":15,"xp":8,"price":30,"energy":13,"minMinute":360,"maxMinute":1560,"pull":8},
		"silver-minnow":{"habitat":"mountain-lake","difficulty":35,"xp":14,"price":50,"energy":25,"minMinute":360,"maxMinute":1560,"pull":12},
		"jade-bream":{"habitat":"mountain-lake","difficulty":50,"xp":19,"price":100,"energy":38,"minMinute":360,"maxMinute":1140,"pull":24},
		"bullhead":{"habitat":"mountain-lake","difficulty":46,"xp":18,"price":75,"energy":25,"minMinute":360,"maxMinute":1560,"pull":14},
		"rain-loach":{"habitat":"town-river","difficulty":45,"xp":18,"price":60,"energy":25,"minMinute":540,"maxMinute":1560,"weather":"rain","pull":14},
		"wind-dace":{"habitat":"town-river","difficulty":28,"xp":12,"price":50,"energy":25,"minMinute":360,"maxMinute":1560,"pull":17},
		"dusk-perch":{"habitat":"town-river","difficulty":35,"xp":14,"price":45,"energy":13,"minMinute":1080,"maxMinute":1560,"pull":20}
	}
	var active_ids: Array=[]
	for fish: Dictionary in session.rules.fish:
		active_ids.append(fish.itemId)
		var item: Dictionary=session.rules.items[fish.itemId]; var value: Dictionary=expected.get(fish.itemId,{})
		var expected_weather: String=value.get("weather","")
		expect(not value.is_empty() and fish.difficulty==value.difficulty and FarmSkillRules.fishing_xp(0,fish.difficulty)==value.xp,"鱼种难度与经验 "+fish.itemId)
		expect(fish.minMinute==value.minMinute and fish.maxMinute==value.maxMinute and fish.minCast==0 and fish.pull==value.pull and ((expected_weather=="" and not fish.has("weather")) or fish.get("weather","")==expected_weather),"鱼种时段天气与张力 "+fish.itemId)
		expect(fish.get("habitats",[]).size()==1 and fish.get("habitats",[]).has(value.habitat),"鱼种水域 "+fish.itemId)
		expect(session.rules.prices[fish.itemId]==value.price and item.staminaRestore==value.energy and item.hasQuality,"鱼种价格、恢复与品质 "+fish.itemId)
	expect(active_ids==["lake-carp","silver-minnow","jade-bream","bullhead","rain-loach","wind-dace","dusk-perch"],"七条当前鱼种全部入表")
	expect(fish_ids_for(session,"mountain-lake")==["lake-carp","silver-minnow","jade-bream","bullhead"],"山湖绑定四条非传说鱼")
	expect(fish_ids_for(session,"town-river")==["rain-loach","wind-dace","dusk-perch"],"镇河只绑定三条河鱼")
	expect(session.world.zones["lakeshore-old-dock-fishing"].maxQualityDistance==5 and session.world.zones["town-river-bridge-fishing"].maxQualityDistance==3,"钓位品质距离已登记")
	expect(eligible_ids(session,base,"lakeshore-old-dock-fishing",600,"rain")==["lake-carp","silver-minnow","jade-bream","bullhead"],"湖岸雨天上午不串河鱼")
	expect(eligible_ids(session,base,"town-river-bridge-fishing",600,"rain")==["rain-loach","wind-dace"],"镇河雨天上午启用西鲱和小嘴鲈鱼")
	expect(eligible_ids(session,base,"town-river-bridge-fishing",1140,"sunny")==["wind-dace","dusk-perch"],"镇河晴天夜间排除雨限定鱼")
	var bullhead_preferences: Dictionary={"seed-keeper":"hated","town-blacksmith":"disliked","town-resident-01":"hated","town-resident-mozi":"disliked","town-resident-haonan":"neutral","town-resident-alan":"disliked","town-resident-haomeili":"disliked","town-resident-xiangzi":"neutral"}
	for npc_id: String in bullhead_preferences:
		expect(session.rules.giftPreferences[npc_id].get("bullhead","")==bullhead_preferences[npc_id],"大头鱼礼物反应 "+npc_id)

	var damaged:=base.duplicate(true); damaged.skills.erase("fishing")
	expect(session.codec.validate(damaged)!="","缺钓鱼技能拒绝")
	damaged=base.duplicate(true); damaged.professions.erase("fishing")
	expect(session.codec.validate(damaged)!="","缺钓鱼职业键拒绝")
	damaged=base.duplicate(true); damaged.professions.fishing=["forester"]
	expect(session.codec.validate(damaged)!="","未开放钓鱼职业拒绝")
	var old:=base.duplicate(true); old.version=23
	expect(session.codec.validate(old)!="","旧状态版本直接拒绝")
	expect(session.codec.decode(JSON.stringify({"engine":"godot","version":13,"updatedAt":1,"state":old})).has("error"),"当前封套拒绝旧状态")
	var old_payload:=JSON.stringify({"engine":"godot","version":11,"updatedAt":1,"state":old})
	repo.payload=old_payload; var writes:=repo.writes
	expect(not await session.continue_game() and repo.payload==old_payload and repo.writes==writes,"旧11/23档保留拒绝")
	var hated_state:=base.duplicate(true); hated_state.inventory[5]=stack("bullhead",1); hated_state.friendships["seed-keeper"].points=100
	var hated_npc: Dictionary={"npcId":"seed-keeper","regionId":hated_state.player.regionId,"x":hated_state.player.x,"y":hated_state.player.y,"interactionType":"shop"}
	expect(session.social.gift(hated_state,[hated_npc],"seed-keeper","bullhead")=="gift-hated" and hated_state.friendships["seed-keeper"].points==60 and hated_state.inventory[5].itemId=="","大头鱼讨厌礼物扣40并消耗一次")
	expect(FarmGameSession._result("gift-hated")=={"code":"gift-hated","tone":"success","message":"对方很讨厌这份礼物。"},"讨厌礼物反馈为成功")
	var invalid_preference_state:=base.duplicate(true); invalid_preference_state.inventory[5]=stack("bullhead",1); invalid_preference_state.friendships["seed-keeper"].points=100
	var original_preference: String=session.rules.giftPreferences["seed-keeper"].bullhead; session.rules.giftPreferences["seed-keeper"].bullhead="unknown"
	var invalid_preference_before:=invalid_preference_state.duplicate(true)
	expect(session.social.gift(invalid_preference_state,[hated_npc],"seed-keeper","bullhead")=="invalid-gift-preference" and invalid_preference_state==invalid_preference_before,"未知礼物偏好在消费前拒绝")
	session.rules.giftPreferences["seed-keeper"].bullhead=original_preference

	var state:=fishing_state(session,base); state.skills.fishing={"xp":92,"level":0,"reportedLevel":0}
	reset(session,state); repo.fail_next=true; prime_catch(session,session.rules.fish[0])
	await session.tick(0.05,true)
	expect(session.snapshot()==state and session.save_phase=="failed","鱼获保存失败不发布")
	await session.dispatch({"type":"retry-fishing-save"}); await session.dispatch({"type":"retry-fishing-save"})
	var caught:=session.snapshot()
	expect(session.inventory.quantity(caught.inventory,"lake-carp",0)==1 and caught.skills.fishing=={"xp":100,"level":1,"reportedLevel":0},"普通鱼获重试只增加一次经验")
	expect(not session.codec.decode(repo.payload).has("error"),"钓鱼技能档同版本恢复")

	state=fishing_state(session,base); state.skills.fishing={"xp":15000,"level":10,"reportedLevel":10}
	reset(session,state); prime_catch(session,session.rules.fish[0],99.0,50.0,"lakeshore-old-dock-fishing",100.0,true)
	await session.tick(0.05,true)
	var gold_catch:=session.snapshot()
	expect(session.inventory.quantity(gold_catch.inventory,"lake-carp",4)==1 and gold_catch.skills.fishing.xp==15033 and session.fishing.runtime.perfect,"满级远投完美捕获升铱星并按原始金星经验")
	expect(FarmQualityRules.price(int(session.rules.prices["lake-carp"]),4)==60 and FarmQualityRules.energy(session.rules.items["lake-carp"],4)==33 and FarmQualityRules.name(session.rules.items["lake-carp"].name,4)=="铱星品质 鲤鱼" and FarmSkillRules.fishing_xp(2,15,true)==33,"完美鱼获复用出货、恢复、名称与2.4倍经验规则")
	expect(not session.codec.decode(repo.payload).has("error"),"品质鱼获同版本恢复")

	state=fishing_state(session,base); reset(session,state); prime_catch(session,session.rules.fish[0],99.0,50.0,"lakeshore-old-dock-fishing",5.0,true)
	await session.tick(0.05,true)
	var perfect_normal:=session.snapshot()
	expect(session.inventory.quantity(perfect_normal.inventory,"lake-carp",0)==1 and perfect_normal.skills.fishing.xp==19,"普通鱼完美捕获不升品质但获得2.4倍经验")

	state=fishing_state(session,base); state.skills.fishing={"xp":15000,"level":10,"reportedLevel":10}
	reset(session,state); prime_catch(session,session.rules.fish[0],99.0,80.0,"lakeshore-old-dock-fishing",100.0,true)
	await session.tick(0.05,true)
	expect(session.fishing.runtime.phase=="reeling" and not session.fishing.runtime.perfect,"张力离开安全范围后取消完美资格")
	session.fishing.runtime.progress=99.0; session.fishing.runtime.tension=50.0; session.fishing.runtime.held=true
	await session.tick(0.05,true)
	var imperfect_catch:=session.snapshot()
	expect(session.inventory.quantity(imperfect_catch.inventory,"lake-carp",2)==1 and imperfect_catch.skills.fishing.xp==15014,"非完美金星鱼保留原始品质与基础经验")

	state=fishing_state(session,base,"town-river-bridge-fishing"); state.weather.current="rain"; state.minuteOfDay=600
	reset(session,state)
	var river_fish: Dictionary=session.rules.fish.filter(func(value:Dictionary)->bool:return value.itemId=="rain-loach")[0]
	prime_catch(session,river_fish,99.0,50.0,"town-river-bridge-fishing")
	await session.tick(0.05,true)
	expect(session.inventory.quantity(session.snapshot().inventory,"rain-loach",0)==1 and session.snapshot().skills.fishing=={"xp":18,"level":0,"reportedLevel":0},"镇河雨天西鲱入包并授予18经验")

	state=fishing_state(session,base); reset(session,state)
	var bullhead: Dictionary=session.rules.fish.filter(func(value:Dictionary)->bool:return value.itemId=="bullhead")[0]
	prime_catch(session,bullhead)
	await session.tick(0.05,true)
	expect(session.inventory.quantity(session.snapshot().inventory,"bullhead",0)==1 and session.snapshot().skills.fishing=={"xp":18,"level":0,"reportedLevel":0},"大头鱼入包并授予18经验")

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
