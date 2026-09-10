extends Node2D
## 场景投影会话快照，输入只发送意图；规则、交易和保存由 GDScript 领域负责。

const COLORS := {"default":"ffffff","red":"f07669","orange":"f0a15b","yellow":"f4d87a","lime":"c2df80","green":"85bd80","teal":"77b4a2","cyan":"92d8d2","sky":"94cdeb","blue":"84a7d7","indigo":"9994cb","purple":"b692cc","violet":"c9a0e2","magenta":"d890bf","pink":"f0b4c4","rose":"d69098","tan":"e4c392","brown":"b48c69","gray":"b0b7b4","black":"74767b","white":"fff6df"}
@onready var session: FarmGameSession=$Session
@onready var player: CharacterBody2D=$Actors/Islander
@onready var region_root: Node2D=$Region
@onready var actors: Node2D=$Actors
@onready var camera: Camera2D=$Camera2D
var assets: FarmAssets
var audio: FarmAudio
var ui: FarmGameUI
var state: Dictionary={}
var display_region: String=""
var dynamic: Dictionary={}
var touch_direction:=Vector2.ZERO
var pending_tap:=Vector2.ZERO
var facing: String="down"
var aim:=Vector2.ZERO
var pointer_aim:=false
var action_busy:=false
var active_tool_action: FarmToolAction
var transition_cooldown:=0.0
var elapsed:=0.0
var step_distance:=0.0
var last_appearance: String=""
var last_hit_id: String=""
var last_hit_time:=0.0
var shade: ColorRect
var weather_effect: Node2D
var crow_events: Array=[]
var crow_day:=0
var crow_seed:=0
var crow_actors: Node2D
var fishing_view: FarmFishingView

## 建立原生界面、声音和资源，启动页不创建世界或覆盖存档。
func _ready() -> void:
	_sync_display_scale(); get_window().size_changed.connect(_sync_display_scale)
	assets=FarmAssets.new()
	crow_actors=Node2D.new(); crow_actors.z_index=1; actors.add_child(crow_actors)
	audio=FarmAudio.new(); add_child(audio); audio.configure(assets)
	ui=FarmGameUI.new(); add_child(ui)
	ui.selected.connect(_selected); ui.action_requested.connect(_button_action); ui.movement_requested.connect(_touch)
	ui.placement_requested.connect(_placement_started); ui.placement_cancelled.connect(_placement_cancelled); ui.placement_confirmed.connect(_placement_confirmed)
	session.changed.connect(_project); session.feedback.connect(_feedback)
	_configure_input()
	var overlay:=CanvasLayer.new(); overlay.layer=1; add_child(overlay)
	shade=ColorRect.new(); shade.mouse_filter=Control.MOUSE_FILTER_IGNORE; shade.color=Color.TRANSPARENT; overlay.add_child(shade)
	weather_effect=Node2D.new(); weather_effect.set_script(load("res://presentation/weather.gd")); overlay.add_child(weather_effect)
	state=session.rules.initial.duplicate(true)
	_load_region("farm"); player.visible=false; camera.position=FarmWorldRules.point(state.player)
	ui.configure(session,assets,audio)

## 每帧仅推进临时表现与会话时间；关键保存期间领域自己保持互斥。
func _process(delta: float) -> void:
	elapsed+=delta; transition_cooldown=maxf(0,transition_cooldown-delta)
	if not session.active or ui==null: return
	session.tick(delta,ui.pauses_clock() or action_busy or transition_cooldown>0)
	state=session.snapshot()
	if display_region==state.player.regionId:
		player.visible=true; player.position=FarmWorldRules.point(state.player); _sync_camera()
	else: player.visible=false
	_project_dynamic()
	_start_crow_departures()
	_sync_fishing_view(delta)
	if not pointer_aim: aim=_facing_point()
	_lighting(); queue_redraw()

## 运动只送入领域规则，CharacterBody2D 不维护第二套坐标。
func _physics_process(delta: float) -> void:
	if not session.active or ui==null or ui.locks_world() or action_busy or transition_cooldown>0: return
	var direction:=Input.get_vector("move_left","move_right","move_up","move_down")
	if not touch_direction.is_zero_approx(): direction=touch_direction
	elif direction.is_zero_approx(): direction=pending_tap
	pending_tap=Vector2.ZERO
	var before:=FarmWorldRules.point(state.player)
	session.move_player(direction,delta)
	var after:=session.snapshot()
	var displacement:=FarmWorldRules.point(after.player)-before
	if not direction.is_zero_approx(): facing=FarmWorldRules.facing(displacement if not displacement.is_zero_approx() else direction,facing); pointer_aim=false
	player.facing=FarmWorldRules.VECTORS[facing]; player.animate_movement(displacement,delta)
	step_distance+=displacement.length()
	if step_distance>=12: audio.cue("footstep"); step_distance=0
	var exit:=session.world.exit_at(after.player.regionId,FarmWorldRules.point(after.player))
	if not exit.is_empty():
		transition_cooldown=0.35
		await session.dispatch({"type":"transition-region","exitId":exit.id})

## 世界鼠标事件在原生控件处理后才到达，不会点击菜单同时挥动工具。
func _unhandled_input(event: InputEvent) -> void:
	if ui==null or not session.active: return
	if event is InputEventMouseMotion and ui.mode in ["","placement"]:
		aim=get_global_mouse_position(); pointer_aim=true; return
	if event is InputEventMouseButton and event.pressed:
		if ui.mode=="placement":
			if event.button_index==MOUSE_BUTTON_LEFT: aim=get_global_mouse_position(); pointer_aim=true; _placement_hint()
			return
		if ui.locks_world() or action_busy: return
		if event.button_index in [MOUSE_BUTTON_WHEEL_UP,MOUSE_BUTTON_WHEEL_DOWN]:
			var next: int=(ui.selected_index+(1 if event.button_index==MOUSE_BUTTON_WHEEL_DOWN else -1)+12)%12
			ui._select(next); return
		if event.button_index in [MOUSE_BUTTON_LEFT,MOUSE_BUTTON_RIGHT]:
			aim=get_global_mouse_position(); pointer_aim=true; _perform(event.button_index==MOUSE_BUTTON_LEFT,aim)

## 数字键、换行、工具、交互均保留明确按键；弹窗内由 UI 独占键盘。
func _unhandled_key_input(event: InputEvent) -> void:
	if ui==null or not session.active or not event is InputEventKey or not event.pressed or event.echo: return
	if ui.mode=="placement":
		var offset: Vector2={KEY_LEFT:Vector2.LEFT,KEY_RIGHT:Vector2.RIGHT,KEY_UP:Vector2.UP,KEY_DOWN:Vector2.DOWN}.get(event.keycode,Vector2.ZERO)
		if offset!=Vector2.ZERO: aim+=offset*16; pointer_aim=true; _placement_hint(); get_viewport().set_input_as_handled()
		elif event.keycode==KEY_ENTER: _placement_confirmed(); get_viewport().set_input_as_handled()
		return
	if ui.locks_world() or action_busy: return
	var keys: Array=[KEY_1,KEY_2,KEY_3,KEY_4,KEY_5,KEY_6,KEY_7,KEY_8,KEY_9,KEY_0,KEY_MINUS,KEY_EQUAL]
	if event.keycode in keys: ui._select(keys.find(event.keycode)); get_viewport().set_input_as_handled()
	elif event.keycode==KEY_TAB:
		session.dispatch({"type":"rotate-hotbar-row","direction":-1 if event.shift_pressed else 1}); get_viewport().set_input_as_handled()
	elif event.keycode in [KEY_C,KEY_X]:
		pointer_aim=false; _perform(event.keycode==KEY_C,_facing_point()); get_viewport().set_input_as_handled()
	elif event.keycode==KEY_SPACE: _punch(); get_viewport().set_input_as_handled()
	else:
		for action: String in ["move_left","move_right","move_up","move_down"]:
			if event.is_action_pressed(action): pending_tap={"move_left":Vector2.LEFT,"move_right":Vector2.RIGHT,"move_up":Vector2.UP,"move_down":Vector2.DOWN}[action]

## 持久变更后同步区域和外观，角色参数继续对应原图集的独立部件。
func _project() -> void:
	if not session.active: return
	state=session.snapshot()
	if ui==null or ui.mode!="placement": _load_region(state.player.regionId)
	audio.enter_region(display_region)
	player.position=FarmWorldRules.point(state.player)
	var appearance_key:=JSON.stringify(state.player.appearance)
	if appearance_key!=last_appearance:
		last_appearance=appearance_key
		var values: Dictionary={"gender":["gender",["male","female"]],"head":["head",["short","bob","ponytail"]],"top":["top",["shirt","overalls","jacket"]],"bottom":["bottom",["trousers","shorts","skirt"]],"skinTone":["skin_tone",["peach","tan","umber"]],"hairColor":["hair_color",["chestnut","black","gold"]],"topColor":["top_color",["cream","mint","coral","sky"]],"bottomColor":["bottom_color",["denim","sand","forest"]]}
		for key: String in values: player.set(values[key][0],values[key][1].find(state.player.appearance[key]))
	_project_dynamic(); _sync_camera()

## 切换已导入场景并释放旧区域实体，保留人工覆盖层。
func _load_region(id: String) -> void:
	if id==display_region: return
	var packed:=load("res://scenes/regions/%s.tscn"%id) as PackedScene
	if packed==null: push_error("地图不可用："+id); return
	_cancel_tool_action()
	if is_instance_valid(fishing_view): fishing_view.get_parent().remove_child(fishing_view); fishing_view.queue_free(); fishing_view=null
	if crow_actors!=null:
		for crow: Node in crow_actors.get_children(): crow_actors.remove_child(crow); crow.queue_free()
	for child in region_root.get_children(): region_root.remove_child(child); child.queue_free()
	for node: Node in dynamic.values(): node.get_parent().remove_child(node); node.queue_free()
	dynamic.clear()
	var scene:=packed.instantiate()
	region_root.add_child(scene); display_region=id
	if id in ["farm","town"]:
		for layer: Node in scene.find_children("Ground","TileMapLayer",true,false):
			var material:=ShaderMaterial.new()
			material.shader=load("res://presentation/pastoral_grass.gdshader")
			layer.material=material
	if session.active: audio.enter_region(id)
	var region: Dictionary=session.world.regions[id]
	var fixed: bool=region.get("cameraAnchorId")!=null or (ui!=null and ui.mode=="placement" and state.player.regionId!=id)
	camera.limit_left=-1000000 if fixed else 0; camera.limit_top=-1000000 if fixed else 0
	camera.limit_right=1000000 if fixed else int(region.widthPixels); camera.limit_bottom=1000000 if fixed else int(region.heightPixels)

## 根据快照投影资源、作物、仓储、NPC 与宠物；稳定 ID 对应稳定节点。
func _project_dynamic() -> void:
	if state.is_empty() or display_region=="": return
	var keep: Dictionary={}
	var region: Dictionary=session.world.regions[display_region]
	var profile: Dictionary=assets.media.regions[display_region]
	for spawn: Dictionary in region.resources:
		if not state.resources.has(spawn.entityId): continue
		var resource: Dictionary=state.resources[spawn.entityId]
		if resource.phase=="cleared": continue
		var node: Node2D
		if spawn.kind=="weed":
			if not dynamic.has(spawn.entityId): node=Node2D.new(); node.set_script(load("res://presentation/weed.gd")); actors.add_child(node); dynamic[spawn.entityId]=node
			else: node=dynamic[spawn.entityId]
		else:
			var image: Texture2D
			if spawn.kind=="tree": image=assets.entity_frame(profile.tree.textureKey if resource.phase=="standing" else profile.tree.stumpTextureKey,profile.tree.frame if resource.phase=="standing" else profile.tree.stumpFrame)
			else: image=assets.entity_frame(profile.rock.textureKey,profile.rock.frame)
			node=_sprite(spawn.entityId,image,Vector2(0.5,1))
		node.position=FarmWorldRules.point(spawn); keep[spawn.entityId]=true
	for spawn: Dictionary in session.world.active_forage(state,display_region):
		var node:=_sprite(spawn.entityId,assets.icon("wood" if spawn.kind=="fallen-branch" else spawn.kind),Vector2(0.5,1)); node.position=FarmWorldRules.point(spawn); keep[spawn.entityId]=true
	if display_region=="farm":
		for tile: Dictionary in state.farmTiles.values():
			var soil:=_sprite(tile.id,assets.entity_frame(profile.farmSoil.textureKey,profile.farmSoil.frame),Vector2(0.5,0.5))
			soil.position=Vector2(tile.column*16+8,tile.row*16+8); soil.modulate=Color("ad9a81") if tile.watered else Color.WHITE; keep[tile.id]=true
			if tile.fertilizer>0:
				var fertilizer:=_sprite(tile.id+":fertilizer",assets.icon("retaining-soil-ground" if tile.fertilizer==2 else "fertilizer-soil"),Vector2(0.5,0.5))
				fertilizer.position=soil.position; keep[tile.id+":fertilizer"]=true
			if tile.cropId!="":
				var crop:=_sprite(tile.id+":crop",assets.crop_texture(tile),Vector2(0.5,1))
				crop.position=soil.position+Vector2(0,3); keep[tile.id+":crop"]=true
	for object: Dictionary in state.worldObjects:
		if object.regionId!=display_region: continue
		var image: Texture2D=assets.icon("scarecrow" if object.kind=="scarecrow" else "chest")
		if object.kind=="shipping-bin":
			var nearby: bool=state.player.regionId==display_region and session.storage.reachable(state,object)
			image=assets.frame(assets.media.textures.buildings,{"x":80,"y":32 if nearby else 0,"width":32,"height":32})
		var node:=_sprite(object.id,image,Vector2(0.5,0.75 if object.kind=="chest" else 0.875))
		node.scale=Vector2.ONE*(32.0 if object.kind=="shipping-bin" else 16.0)/image.get_width()
		node.position=Vector2(object.column*16+(16 if object.kind=="shipping-bin" else 8),object.row*16+12)
		node.modulate=Color(COLORS[object.colorId]) if object.kind=="chest" else Color.WHITE; keep[object.id]=true
	for drop: Dictionary in state.worldDrops:
		if drop.regionId!=display_region: continue
		var node:=_sprite(drop.id,assets.icon(drop.stack.itemId),Vector2(0.5,1)); node.position=Vector2(drop.originX,drop.originY); node.scale=Vector2.ONE*16.0/maxi(1,node.texture.get_width()); keep[drop.id]=true
	for npc: Dictionary in session.npcs.snapshot():
		if npc.regionId!=display_region: continue
		var node: FarmNpcSprite
		if dynamic.has(npc.entityId): node=dynamic[npc.entityId]
		else: node=FarmNpcSprite.new(); actors.add_child(node); dynamic[npc.entityId]=node
		node.project(npc,assets,ui.pauses_clock() or session.busy); keep[npc.entityId]=true
		var label:=_world_label(npc.entityId+":label",_npc_name(npc.npcId)); label.position=node.position+Vector2(-18,-39); label.visible=state.player.regionId==display_region and FarmWorldRules.point(state.player).distance_to(node.position)<=48; keep[npc.entityId+":label"]=true
		if npc.activity!=null:
			var activity:=_world_label(npc.entityId+":activity",{"serve":"迎","forge":"锻","tend":"护","repair":"修","mountain-patrol":"巡","observe":"望","organize":"理","dock-watch":"守","stock":"备","close":"收","prepare":"备","tea":"茶","record":"记","sew":"缝","rope-check":"绳"}.get(npc.activity,""))
			activity.position=node.position+Vector2(16,-24); activity.visible=label.visible and npc.motion=="idle"; activity.modulate.a=0.6+0.3*npc.activityPhase; keep[npc.entityId+":activity"]=true
	if state.pet!=null and state.pet.regionId==display_region:
		var pet:=_sprite("home-pet",assets.pet_texture(state.pet,elapsed),Vector2(0.5,0.8)); pet.position=FarmWorldRules.point(state.pet); keep["home-pet"]=true
	for interaction: Dictionary in region.interactions:
		if interaction.kind=="bed" and display_region=="cottage":
			var bed:=_sprite(interaction.entityId,assets.frame("res://media/cottage-woodwork.runtime.png",{"x":0,"y":80,"width":32,"height":48}),Vector2(0.5,1)); bed.position=Vector2(interaction.x+interaction.width/2.0,interaction.y+interaction.height); keep[interaction.entityId]=true
		var text: String={"bed":"休息","backpack-display":"背包升级","building-service":"木匠服务","inspect":"查看"}.get(interaction.kind,"")
		if text=="": continue
		var label:=_world_label(interaction.entityId+":hint",text); label.position=Vector2(interaction.x+interaction.width/2.0-12,interaction.y-12)
		label.visible=ui.mode!="fishing" and state.player.regionId==display_region and FarmWorldRules.point(state.player).distance_to(Vector2(interaction.x+interaction.width/2.0,interaction.y+interaction.height/2.0))<=42; keep[interaction.entityId+":hint"]=true
	for zone: Dictionary in region.fishingZones:
		var label:=_world_label(zone.id+":hint","钓鱼"); label.position=Vector2(zone.x+zone.width/2.0-10,zone.y-10); label.visible=ui.mode!="fishing"; keep[zone.id+":hint"]=true
	for id: String in dynamic.keys():
		if not keep.has(id):
			var node: Node=dynamic[id]; node.get_parent().remove_child(node); node.queue_free(); dynamic.erase(id)

## 缓存真实图集帧对应的节点，保留素材尺寸与脚底锚点。
func _sprite(id: String, image: Texture2D, origin: Vector2) -> Sprite2D:
	var node: Sprite2D
	if dynamic.has(id): node=dynamic[id]
	else: node=Sprite2D.new(); node.centered=false; actors.add_child(node); dynamic[id]=node
	node.texture=image
	if image!=null: node.offset=-Vector2(image.get_width(),image.get_height())*origin
	return node

## 创建带明确中文字体的世界标签，标签不截取地图事件。
func _world_label(id: String, text: String) -> Label:
	var label: Label
	if dynamic.has(id): label=dynamic[id]
	else:
		label=Label.new(); label.add_theme_font_override("font",load("res://media/NotoSansCJKsc-Regular.otf")); label.add_theme_font_size_override("font_size",9); label.add_theme_color_override("font_color",Color("fff8dd")); label.add_theme_color_override("font_shadow_color",Color("304d3f")); label.add_theme_constant_override("shadow_offset_x",1); label.add_theme_constant_override("shadow_offset_y",1); label.mouse_filter=Control.MOUSE_FILTER_IGNORE; label.z_index=25; actors.add_child(label); dynamic[id]=label
	label.text=text
	return label

## 室内按实际房间边界避让 HUD 并适配缩放；建筑预览显示整图，其余场景跟随角色。
func _sync_camera() -> void:
	var region: Dictionary=session.world.regions[display_region]
	if ui!=null and ui.mode=="placement" and display_region!=state.player.regionId:
		camera.zoom=Vector2.ONE*minf(2,minf(get_viewport().get_visible_rect().size.x/region.widthPixels,(get_viewport().get_visible_rect().size.y-160)/region.heightPixels)); camera.position=Vector2(region.widthPixels/2.0,region.heightPixels/2.0); return
	camera.zoom=Vector2(2,2)
	var anchor_id: Variant=region.get("cameraAnchorId")
	camera.position=FarmWorldRules.point(region.spawns[anchor_id]) if anchor_id!=null else player.position
	if ui!=null and ui.mode=="fishing" and not session.fishing.runtime.is_empty():
		var zone: Dictionary=session.world.zones[session.fishing.runtime.zoneId]
		var water: Vector2=fishing_view.water if is_instance_valid(fishing_view) else Vector2(zone.x+zone.width/2,zone.y+zone.height/2)
		var focus: Vector2=(player.position+water)/2+Vector2(0,-8)
		camera.position=focus+(get_viewport().get_visible_rect().size/2-ui.fishing_view_rect().get_center())/camera.zoom
		return
	if anchor_id!=null and ui!=null:
		var bounds: Dictionary=region.cameraBounds
		var room:=Rect2(bounds.x,bounds.y,bounds.width,bounds.height)
		var safe:=ui.room_view_rect(room.size)
		var zoom_factor:=minf(2,minf(safe.size.x/room.size.x,safe.size.y/room.size.y))
		camera.zoom=Vector2.ONE*zoom_factor
		var viewport_center:=get_viewport().get_visible_rect().size/2
		var screen_center:=viewport_center+(room.get_center()-camera.position)*zoom_factor
		var half_room:=room.size*zoom_factor/2
		screen_center=screen_center.clamp(safe.position+half_room,safe.end-half_room)
		camera.position=room.get_center()-(screen_center-viewport_center)/zoom_factor

## 目标提示与操作使用同一个格子，摆放可用性来自同一领域预检。
func _draw() -> void:
	if ui==null or not session.active or action_busy or ui.mode not in ["","placement"]: return
	if ui.mode=="" and _held()=="": return
	var cell:=Vector2i(floori(aim.x/16.0),floori(aim.y/16.0)); var valid:=true; var width:=1
	if ui.mode=="placement":
		var kind: String=state.inventory[ui.placement_request.inventoryIndex].itemId if ui.placement_request.type=="place-world-object" else "shipping-bin"; width=2 if kind=="shipping-bin" else 1
		valid=session.world.placement(state,kind,display_region,cell.x,cell.y,ui.placement_request.get("objectId",""),session.npcs.snapshot()).allowed
		if kind=="scarecrow" and display_region=="farm":
			var preview: Dictionary={"kind":"scarecrow","regionId":"farm","column":cell.x,"row":cell.y}
			for y in range(cell.y-8,cell.y+9):
				for x in range(cell.x-8,cell.x+9):
					if FarmCropProtection.protects(preview,x,y): draw_rect(Rect2(x*16,y*16,16,16),Color(0.45,0.72,0.5,0.12))
	else: valid=session.resource_rules.near_tile(state,cell.x,cell.y)
	draw_rect(Rect2(cell.x*16,cell.y*16,width*16,16),Color("f8ecc1") if valid else Color("d27363"),false,1)

## 返回活动行手持物，快捷选择不改变库存或存档。
func _held() -> String:
	return state.inventory[ui.selected_index].itemId if ui.selected_index>=0 and ui.selected_index<12 else ""

## 获取面前一格中心，消除角色脚点余数对格子选择的影响。
func _facing_point() -> Vector2:
	if state.is_empty(): return Vector2.ZERO
	var cell: Vector2=Vector2(floorf(state.player.x/16.0),floorf(state.player.y/16.0))+FarmWorldRules.VECTORS[facing]
	return cell*16+Vector2(8,8)

## 使用选定工具或执行纯交互，命中动作会在动画中发出一次命令。
func _perform(tool: bool, target: Vector2) -> void:
	if ui.locks_world() or action_busy: return
	facing=FarmWorldRules.facing(target-FarmWorldRules.point(state.player),facing); player.facing=FarmWorldRules.VECTORS[facing]; player.animate_movement(Vector2.ZERO,0)
	var item:=_held()
	if not tool or item=="": await _interact(target); return
	var cell:=Vector2i(floori(target.x/16.0),floori(target.y/16.0))
	if item in ["chest","scarecrow"]: ui.request_placement({"type":"place-world-object","inventoryIndex":ui.selected_index}); aim=target; pointer_aim=true; return
	var object:=_object_at(target)
	if object.get("kind")=="scarecrow" and item in ["axe","pickaxe","hoe"]:
		await _tool_command({"type":"recover-scarecrow","objectId":object.id,"itemId":item},target); return
	if not object.is_empty() and object.kind=="chest":
		var empty: bool=object.slots.all(func(slot:Dictionary)->bool:return slot.itemId=="")
		if empty: await _tool_command({"type":"recover-empty-chest","objectId":object.id,"itemId":item},target); return
		if item in ["axe","pickaxe","hoe"]:
			if last_hit_id!=object.id or elapsed-last_hit_time>1.2: last_hit_id=object.id; last_hit_time=elapsed; ui._feedback({"message":"再敲一下，把箱子移到附近空地。"}); return
			last_hit_id=""; await _tool_command({"type":"push-chest","objectId":object.id,"itemId":item,"facing":facing},target); return
	if item=="fishing-rod":
		var zone:=_nearest_zone(target)
		if not zone.is_empty():
			var result:=await session.dispatch({"type":"start-fishing","zoneId":zone.id})
			if result.get("tone")=="success": ui.show_fishing()
		return
	if item=="watering-can" and session.world.mask(state.player.regionId,"waterTiles",cell.x,cell.y): await _tool_command({"type":"refill-watering-can","column":cell.x,"row":cell.y},target); return
	if item=="axe" and state.player.regionId=="farm":
		var crop_tile: Dictionary=state.farmTiles.get("farm:%d:%d"%[cell.x,cell.y],{})
		if session.world.crops.get(crop_tile.get("cropId",""),{}).get("isRaised",false):
			await _tool_command({"type":"use-item-on-tile","itemId":item,"column":cell.x,"row":cell.y,"facing":facing},target); return
	if item=="scythe":
		await _tool_command({"type":"sweep-scythe","itemId":item,"facing":facing},target); return
	var kind: String={"axe":"tree","pickaxe":"stone"}.get(item,"")
	if kind!="":
		var spawn:=_resource_at(target,kind)
		if not spawn.is_empty(): await _tool_command({"type":"use-item-on-target","itemId":item,"targetId":spawn.entityId,"facing":facing},target)
		return
	await _tool_command({"type":"use-item-on-tile","itemId":item,"column":cell.x,"row":cell.y,"facing":facing},target)

## 原时刻只派发一次领域命令；人物、工具和成功反馈由同一动作进度驱动。
func _tool_command(command: Dictionary, target: Vector2) -> void:
	if action_busy: return
	action_busy=true
	var action:=FarmToolAction.new(); player.add_child(action); active_tool_action=action
	action.configure(player,assets,command.get("itemId",_held()),facing)
	await action.windup()
	if not is_instance_valid(action): return
	if action.cancelled or ui.locks_world(): _finish_tool_action(action); return
	var result:=await session.dispatch(command)
	if not is_instance_valid(action): return
	if action.cancelled: _finish_tool_action(action); return
	if result.get("tone")=="success":
		var contact:=target
		if command.has("targetId") and session.world.resources.has(command.targetId): contact=FarmWorldRules.point(session.world.resources[command.targetId])
		elif command.has("column"): contact=Vector2(command.column*16+8,command.row*16+8)
		if not FarmToolAction.impact(region_root,contact,result.get("code","")):
			var flash:=Label.new(); flash.text="+"; flash.position=contact+Vector2(-2,-14); flash.z_index=30; region_root.add_child(flash)
			var effect:=flash.create_tween(); effect.tween_property(flash,"position:y",flash.position.y-12,0.3); effect.tween_callback(flash.queue_free)
	await action.recover()
	if is_instance_valid(action): _finish_tool_action(action)

## 回收本次动作；旧协程结束时不得清除后续动作的互斥状态。
func _finish_tool_action(action: FarmToolAction) -> void:
	if active_tool_action==action: active_tool_action=null; action_busy=false
	action.cancel(); action.queue_free()

## 切图或退出时先取消表现并唤醒等待者，命中前取消不再提交命令。
func _cancel_tool_action() -> void:
	if not is_instance_valid(active_tool_action): return
	var action:=active_tool_action; active_tool_action=null; action_busy=false
	action.cancel()
	if is_instance_valid(action) and not action.is_queued_for_deletion(): action.queue_free()

## 世界销毁时同步释放人物动作，不留下 Tween 或抬手姿势。
func _exit_tree() -> void:
	_cancel_tool_action()

## 纯交互依次检查箱子、成熟作物、居民、伙伴、野采和设施，不受手持工具误导。
func _interact(target: Vector2) -> void:
	var object:=_object_at(target)
	if not object.is_empty():
		if session.storage.reachable(state,object): ui.open_container(object.id)
		else: ui._feedback({"tone":"error","message":"走近箱子再操作。"})
		return
	var cell:=Vector2i(floori(target.x/16.0),floori(target.y/16.0))
	var tile: Dictionary=state.farmTiles.get("farm:%d:%d"%[cell.x,cell.y],{})
	if state.player.regionId=="farm" and tile.get("phase")=="mature": await _tool_command({"type":"use-item-on-tile","itemId":"","column":cell.x,"row":cell.y},target); return
	for npc: Dictionary in session.npcs.snapshot():
		if npc.regionId!=display_region or FarmWorldRules.point(state.player).distance_to(FarmWorldRules.point(npc))>42: continue
		if Rect2(npc.x-16,npc.y-32,32,48).has_point(target):
			var result:=await session.dispatch({"type":"talk-to-npc","npcId":npc.npcId})
			if result.get("tone")=="success": ui.show_dialogue(result)
			return
	if state.pet!=null and state.pet.regionId==display_region and FarmWorldRules.point(state.pet).distance_to(target)<24 and FarmWorldRules.point(state.player).distance_to(FarmWorldRules.point(state.pet))<=42: await session.dispatch({"type":"pet-home-pet"}); return
	for spawn: Dictionary in session.world.active_forage(state,display_region):
		if FarmWorldRules.point(spawn).distance_to(target)<=18: await session.dispatch({"type":"use-item-on-target","itemId":"","targetId":spawn.entityId}); return
	for interaction: Dictionary in session.world.regions[display_region].interactions:
		var center:=Vector2(interaction.x+interaction.width/2.0,interaction.y+interaction.height/2.0)
		if center.distance_to(FarmWorldRules.point(state.player))>42 or not Rect2(interaction.x-8,interaction.y-8,interaction.width+16,interaction.height+16).has_point(target): continue
		match interaction.kind:
			"bed": ui.sleep_at(interaction.entityId)
			"backpack-display": ui.inspect_id=interaction.entityId; ui._open("backpack-upgrade")
			"building-service":
				if session.storage.carpenter_available(state,session.npcs.snapshot(),interaction.entityId): ui._open("building")
				else: ui._feedback({"tone":"error","message":"罗宾现在不在柜台提供服务。"})
			"inspect": ui.inspect(interaction.entityId)
		return

## 返回点击外观范围内的世界物件，业务距离仍由领域验证。
func _object_at(target: Vector2) -> Dictionary:
	for object: Dictionary in state.worldObjects:
		if object.regionId!=display_region: continue
		if Rect2(object.column*16,object.row*16-16,32 if object.kind=="shipping-bin" else 16,32).has_point(target): return object
	return {}

## 按点击位置和资源种类返回最近目标；斧头的树木查询包含当前可见枯枝，无命中返回空字典。
func _resource_at(target: Vector2, kind: String) -> Dictionary:
	var found: Dictionary={}; var best:=INF
	var forage: Array=session.world.active_forage(state,display_region) if kind=="tree" else []
	for spawn: Dictionary in session.world.regions[display_region].resources:
		if spawn.kind=="fallen-branch" and kind=="tree":
			if spawn not in forage: continue
		elif spawn.kind!=kind or state.resources[spawn.entityId].phase=="cleared": continue
		var size:=Vector2(48,48) if spawn.kind=="tree" else Vector2(48,32) if spawn.kind=="stone" else Vector2(20,20)
		if not Rect2(Vector2(spawn.x-size.x/2,spawn.y-size.y),size+Vector2(0,8)).has_point(target): continue
		var distance:=target.distance_to(FarmWorldRules.point(spawn))
		if distance<best: found=spawn; best=distance
	return found

## 查找当前区域钓位，领域再次校验玩家距离、鱼竿和日期。
func _nearest_zone(target: Vector2) -> Dictionary:
	var found: Dictionary={}; var best:=INF
	for zone: Dictionary in session.world.regions[display_region].fishingZones:
		var center:=Vector2(zone.x+zone.width/2.0,zone.y+zone.height/2.0); var distance:=center.distance_to(target)
		if distance<best: best=distance; found=zone
	return found

## 建筑预览只换显示地图，保留领域角色仍在木匠柜台。
func _placement_started(request: Dictionary) -> void:
	if request.type!="place-world-object": _load_region("farm")
	aim=Vector2(376,256) if display_region!=state.player.regionId else _facing_point(); pointer_aim=true
	_sync_camera(); _placement_hint()

## 取消预览回到真实区域，不触发消费或移动建筑。
func _placement_cancelled() -> void:
	_load_region(state.player.regionId); pointer_aim=false; _sync_camera()

## 明确确认当前格子；不合法时领域保留预览和原材料。
func _placement_confirmed() -> void:
	ui.confirm_placement(floori(aim.x/16),floori(aim.y/16))

## 显示共享摆放判定结果，不提前清理耕地或移动伙伴。
func _placement_hint() -> void:
	var request: Dictionary=ui.placement_request
	var kind: String=state.inventory[request.inventoryIndex].itemId if request.type=="place-world-object" else "shipping-bin"
	var result:=session.world.placement(state,kind,display_region,floori(aim.x/16),floori(aim.y/16),request.get("objectId",""),session.npcs.snapshot())
	ui._feedback({"tone":"success" if result.allowed else "error","message":result.message+" 点击确认摆放。"})

## 保留原空手短动作表现，不增加战斗伤害。
func _punch() -> void:
	if action_busy: return
	action_busy=true
	var tween:=create_tween(); tween.tween_property(player,"rotation",0.08,0.1); tween.tween_property(player,"rotation",0,0.15); await tween.finished
	for npc: Dictionary in session.npcs.snapshot():
		if npc.regionId==display_region and FarmWorldRules.point(state.player).distance_to(FarmWorldRules.point(npc))<=42 and FarmWorldRules.in_sector(FarmWorldRules.point(state.player),FarmWorldRules.point(npc),facing) and dynamic.has(npc.entityId):
			var response:=create_tween(); response.tween_property(dynamic[npc.entityId],"self_modulate",Color("efc4b1"),0.08); response.tween_property(dynamic[npc.entityId],"self_modulate",Color.WHITE,0.18); break
	action_busy=false

## 将成功反馈映射到原音效，失败不播放获得物品的声音。
func _feedback(result: Dictionary) -> void:
	if result.get("tone")!="success": return
	if result.has("daySummary"):
		crow_events=result.daySummary.get("crowEvents",[]).duplicate(true)
		var committed:=session.snapshot()
		crow_day=int(committed.day); crow_seed=int(committed.worldSeed)
	var mapping: Dictionary={"tilled":"hoe","watered":"watering","refilled":"watering","chopped":"axe","chopped-with-seed":"axe","branch-chopped":"axe","stump-cleared":"axe","mined":"stone","cut":"harvest","harvested":"harvest","harvested-double":"harvest","collected":"pickup","collected-double":"pickup","caught":"pickup","bought":"buy","sold":"sell","talked":"dialogue-page","transitioned":"door","slept":"sleep"}
	if mapping.has(result.code): audio.cue(mapping[result.code])

## 当天第一次回到农场时消费已提交的临时事件；换天或新农场丢弃，重复投影不会重播。
func _start_crow_departures() -> void:
	if crow_events.is_empty(): return
	if int(state.day)!=crow_day or int(state.worldSeed)!=crow_seed:
		crow_events.clear(); return
	if display_region!="farm" or state.player.regionId!="farm" or ui.locks_world(): return
	for index in range(mini(4,crow_events.size())):
		var crow:=FarmCrowDeparture.new()
		crow.configure(assets,crow_events[index],index); crow_actors.add_child(crow)
	crow_events.clear()

## 只在已打开的钓鱼界面投影运行态；关闭或终止会话立即释放表现，鱼获须等待保存成功。
func _sync_fishing_view(delta: float) -> void:
	var runtime: Dictionary=session.fishing.runtime
	if ui.mode!="fishing" or runtime.is_empty():
		if is_instance_valid(fishing_view): fishing_view.get_parent().remove_child(fishing_view); fishing_view.queue_free(); fishing_view=null
		return
	if not is_instance_valid(fishing_view):
		var zone: Dictionary=session.world.zones[runtime.zoneId]
		fishing_view=FarmFishingView.new(); actors.add_child(fishing_view)
		fishing_view.configure(player,assets,_fishing_water_point(zone))
	fishing_view.project(runtime,session.fishing.bite(),session.save_phase=="idle" and not session.busy,delta)

## 在钓位附近有限网格中选择真正的水面；水域内可通行的码头格不能作为浮漂落点。
func _fishing_water_point(zone: Dictionary) -> Vector2:
	var center:=Vector2(zone.x+zone.width/2,zone.y+zone.height/2)
	var direction:=center-player.position
	if direction.length_squared()<1: direction=Vector2.DOWN
	var preferred:=center+direction.normalized()*48
	var target:=center
	var distance:=INF
	var collision: Dictionary=session.world.regions[display_region].collision
	for row in range(floori(center.y/16)-5,floori(center.y/16)+6):
		for column in range(floori(center.x/16)-5,floori(center.x/16)+6):
			if not session.world.mask(display_region,"waterTiles",column,row): continue
			if not collision.blocked[row*int(collision.columns)+column]: continue
			var point:=Vector2(column*16+8,row*16+8)
			var score:=point.distance_squared_to(preferred)
			if score<distance: distance=score; target=point
	return target

## 从原昼夜关键帧表读取颜色和透明度，区分室内外。
func _lighting() -> void:
	if not assets.media.has("daylight"): return
	var group: String="farm" if display_region in ["farm","town","foothills","lakeshore"] else "cottage"
	var lighting: Dictionary=assets.media.daylight[group][str(int(state.minuteOfDay))]
	var color:=Color(lighting.color); color.a=lighting.opacity; shade.color=color; shade.size=get_viewport().get_visible_rect().size
	var outside: bool=group=="farm"
	weather_effect.configure(state.weather.current,outside)
	audio.weather(state.weather.current,outside)

## 使用原人物名字，内部稳定 ID 不作为玩家可见名称。
func _npc_name(id: String) -> String:
	for profile: Dictionary in session.rules.profiles:
		if profile.npcId==id: return session.dialogues[profile.baseDialogueId].speaker
	return ""

## 屏幕动作按当前朝向使用，避免继承过时鼠标目标。
func _button_action(tool: bool) -> void:
	pointer_aim=false; _perform(tool,_facing_point()); get_viewport().gui_release_focus()

## 保留极短触摸的一次移动，释放时立即停止持续移动。
func _touch(direction: Vector2) -> void:
	touch_direction=direction
	if direction!=Vector2.ZERO: pending_tap=direction

## 切换快捷槽仅清理视觉目标，不修改物品数量。
func _selected(_index: int) -> void:
	pointer_aim=false

## 将原 WASD 和方向键注册到本项目 InputMap。
func _configure_input() -> void:
	var keys: Dictionary={"move_left":[KEY_A,KEY_LEFT],"move_right":[KEY_D,KEY_RIGHT],"move_up":[KEY_W,KEY_UP],"move_down":[KEY_S,KEY_DOWN]}
	for action: String in keys:
		if not InputMap.has_action(action): InputMap.add_action(action)
		for code: int in keys[action]:
			var event:=InputEventKey.new(); event.physical_keycode=code
			if not InputMap.action_has_event(action,event): InputMap.action_add_event(action,event)

## 按设备像素比例调整显示，不改变领域中的像素坐标。
func _sync_display_scale() -> void:
	var factor:=maxf(1,DisplayServer.screen_get_scale())
	if not is_equal_approx(get_window().content_scale_factor,factor): get_window().content_scale_factor=factor

## 页面失焦立即释放触屏意图，恢复不继续滑行。
func _notification(what: int) -> void:
	if what==NOTIFICATION_APPLICATION_FOCUS_OUT:
		touch_direction=Vector2.ZERO; pending_tap=Vector2.ZERO
		for action: String in ["move_left","move_right","move_up","move_down"]: Input.action_release(action)
