class_name FarmGameUI
extends CanvasLayer
## Godot 原生游戏界面；显示防御性快照，所有库存、交易和存档操作只发会话命令。
## 视觉约定：世界优先，菜单是一册暖白农场手册；林绿指示操作，蜜金标出收获。
## 常驻信息分居屏幕两角，底部十二格工具盘保持真实顺序；打开手册后背景收暗。
## 标题、内容、操作提示各自独立，窄屏保持原生文字尺寸和可滚动内容。

const FarmFenceRules = preload("res://domain/fence_rules.gd")
signal selected(index: int)
signal action_requested(tool: bool)
signal movement_requested(direction: Vector2)
signal placement_requested(request: Dictionary)
signal placement_cancelled
signal placement_confirmed
var session: FarmGameSession
var assets: FarmAssets
var audio: FarmAudio
var mode: String="start"
var selected_index: int=-1
var _selection_initialized:=false
var container_id: String=""
var selected_source: Dictionary={}
var transfer_amount: String="stack"
var recipe_id: String=""
var craft_amount: int=1
var dialogue_result: Dictionary={}
var inspect_id: String=""
var appearance_value: Dictionary={}
var placement_request: Dictionary={}
var demolish_id: String=""
var save_exists:=false
var root: Control
var header: Control
var hud_menu: GridContainer
var status_panel: PanelContainer
var status: Label
var clock_label: Label
var weather_label: Label
var gold_label: Label
var stamina_label: Label
var stamina_bar: ProgressBar
var stamina_fill: StyleBoxFlat
var energy_panel: PanelContainer
var toolbar: PanelContainer
var hotbar: GridContainer
var hotbar_slots: Array[Dictionary]=[]
var held_label: Label
var hotbar_hint: Label
var hotbar_row_button: Button
var touch: GridContainer
var actions: VBoxContainer
var message: Label
var message_panel: PanelContainer
var dialog: PanelContainer
var dialog_margin: MarginContainer
var slot_styles: Dictionary={}
var body: VBoxContainer
var title: Label
var close_button: Button
var saving: PanelContainer
var placement_controls: HBoxContainer
var theme: Theme
var fish_progress: ProgressBar
var fish_tension: ProgressBar
var fish_label: Label
var dialog_feedback: Label
var character_preview: Node2D
var preview_direction: String="down"
var preview_walking:=false
var _inventory_key: String=""
var message_lifetime:=0.0
var backdrop: ColorRect
var dialog_scroll: ScrollContainer
var dialog_kicker: Label
var dialog_footer: Label
var dialog_actions: HBoxContainer
var location_label: Label
var _rendered_mode: String=""
var _dialog_tween: Tween
var recipe_list_scroll: ScrollContainer
var _body_revision:=0

## 组合原生控件和统一主题，绑定会话信号后检查唯一新引擎存档。
func configure(owner_session: FarmGameSession, asset_library: FarmAssets, sound: FarmAudio) -> void:
	layer=2
	session=owner_session; assets=asset_library; audio=sound
	theme=_theme()
	root=Control.new(); root.mouse_filter=Control.MOUSE_FILTER_IGNORE; root.theme=theme; add_child(root)
	_build_hotbar()
	_build_hud()
	touch=GridContainer.new(); touch.columns=3; touch.add_theme_constant_override("h_separation",3); touch.add_theme_constant_override("v_separation",3); root.add_child(touch)
	for pair in [["",Vector2.ZERO],["↑",Vector2.UP],["",Vector2.ZERO],["←",Vector2.LEFT],["↓",Vector2.DOWN],["→",Vector2.RIGHT]]:
		if pair[0]=="":
			var space:=Control.new(); space.custom_minimum_size=Vector2(44,44); space.mouse_filter=Control.MOUSE_FILTER_IGNORE; touch.add_child(space); continue
		var button:=_button(pair[0],touch,func():pass)
		button.custom_minimum_size=Vector2(44,44)
		button.button_down.connect(_move.bind(pair[1])); button.button_up.connect(_move.bind(Vector2.ZERO)); button.mouse_exited.connect(_move.bind(Vector2.ZERO))
	actions=VBoxContainer.new(); root.add_child(actions)
	_button("使用 C",actions,_action.bind(true)); _button("交互 X",actions,_action.bind(false))
	for area in [touch,actions]:
		for child: Node in area.get_children():
			if not child is Button: continue
			var button:=child as Button
			for style_name: String in slot_styles: button.add_theme_stylebox_override(style_name,slot_styles[style_name])
			button.add_theme_color_override("font_pressed_color",Color("493b2b")); button.add_theme_color_override("font_hover_pressed_color",Color("493b2b")); button.add_theme_font_size_override("font_size",14); button.custom_minimum_size.y=44
			if area==actions: button.custom_minimum_size.x=80
	message_panel=PanelContainer.new(); message_panel.mouse_filter=Control.MOUSE_FILTER_IGNORE; message_panel.add_theme_stylebox_override("panel",_hotbar_style("fff8e8","aa8559",2)); root.add_child(message_panel); message_panel.visible=false
	message=_label("",message_panel); message.mouse_filter=Control.MOUSE_FILTER_IGNORE; message.add_theme_font_size_override("font_size",14)
	backdrop=ColorRect.new(); backdrop.color=Color(0.08,0.17,0.14,0.48); backdrop.mouse_filter=Control.MOUSE_FILTER_STOP; root.add_child(backdrop)
	dialog=PanelContainer.new(); root.add_child(dialog)
	var margin:=MarginContainer.new(); margin.add_theme_constant_override("margin_left",16); margin.add_theme_constant_override("margin_right",16); margin.add_theme_constant_override("margin_top",12); margin.add_theme_constant_override("margin_bottom",12); dialog.add_child(margin)
	dialog_margin=margin
	var content:=VBoxContainer.new(); content.add_theme_constant_override("separation",12); margin.add_child(content)
	dialog_kicker=_label("镜像岛  /  农场手册",content); dialog_kicker.add_theme_font_size_override("font_size",12); dialog_kicker.add_theme_color_override("font_color",Color("65735a"))
	var heading:=HBoxContainer.new(); content.add_child(heading)
	title=_label("",heading); title.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	close_button=_button("返回 Esc",heading,close)
	close_button.add_theme_font_size_override("font_size",13)
	content.add_child(HSeparator.new())
	dialog_feedback=_label("",content); dialog_feedback.add_theme_font_size_override("font_size",14); dialog_feedback.visible=false
	var scroll:=ScrollContainer.new(); scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL; scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; scroll.follow_focus=true; content.add_child(scroll)
	dialog_scroll=scroll
	body=VBoxContainer.new(); body.size_flags_horizontal=Control.SIZE_EXPAND_FILL; body.add_theme_constant_override("separation",10); scroll.add_child(body)
	content.add_child(HSeparator.new())
	dialog_actions=HBoxContainer.new(); content.add_child(dialog_actions); dialog_actions.visible=false
	dialog_footer=_label("",content); dialog_footer.add_theme_font_size_override("font_size",12); dialog_footer.add_theme_color_override("font_color",Color("65735a"))
	saving=PanelContainer.new(); root.add_child(saving); saving.visible=false
	placement_controls=HBoxContainer.new(); root.add_child(placement_controls); placement_controls.visible=false
	_button("确认摆放",placement_controls,func():placement_confirmed.emit()); _button("取消摆放",placement_controls,close)
	session.changed.connect(_changed); session.feedback.connect(_feedback); session.save_changed.connect(_save_changed)
	get_viewport().size_changed.connect(_resize)
	_resize(); _changed()
	var information:=await session.inspect_save()
	save_exists=information.exists
	if information.error!="": session.error=information.error
	_render()

## 判断普通菜单是否暂停世界时间；钓鱼等待单独遵循其状态机。
func pauses_clock() -> bool:
	return mode!="" and mode!="fishing"

## 返回世界输入是否被界面或保存状态占用。
func locks_world() -> bool:
	return mode!="" or session.world_locked()

## 每帧仅更新钓鱼动态数值，不重建按钮或丢失按住状态。
func _process(_delta: float) -> void:
	if session==null: return
	if message_lifetime>0:
		message_lifetime=maxf(0,message_lifetime-_delta)
	if message_lifetime==0 and mode!="placement" and message.text!="": message.text=""; message_panel.visible=false
	if is_instance_valid(character_preview):
		character_preview.facing=FarmWorldRules.VECTORS[preview_direction]
		character_preview.animate_movement(FarmWorldRules.VECTORS[preview_direction] if preview_walking else Vector2.ZERO,_delta)
	if mode=="fishing" and not session.fishing.runtime.is_empty() and is_instance_valid(fish_progress):
		var fishing: Dictionary=session.fishing.runtime
		fish_progress.value=fishing.castPower if fishing.phase=="casting" else fishing.progress
		fish_tension.value=clampf(fishing.tension,0,100)
		var caught_id: String=fishing.fish.itemId if fishing.fish!=null else ""
		var caught_name:=FarmQualityRules.name(session.rules.items.get(caught_id,{}).get("name","鱼"),int(fishing.get("quality",0)))
		var perfect_suffix: String="，完美捕获" if bool(fishing.get("perfect",false)) else ""
		var texts: Dictionary={"casting":"按住蓄力，松手抛竿。","waiting":"等待浮漂动静……","reeling":"按住收线，松手降张力；保持在 22–78。","caught":"钓到了 %s%s。"%[caught_name,perfect_suffix],"escaped":"鱼跑掉了。","inventory-full":"背包已满，没能装下鱼获。"}
		fish_label.text="咬钩了，按下收线！" if session.fishing.bite() else texts[fishing.phase]
		if fishing.phase=="caught" and (session.busy or session.save_phase!="idle"): fish_label.text="鱼获尚未保存，请等待或完成保存重试。"

## 将暂停之外的方向按钮送入同一世界输入路径。
func _move(direction: Vector2) -> void:
	if not locks_world() or direction==Vector2.ZERO: movement_requested.emit(direction)

## 分离工具与交互意图，避免拿着工具时无法开箱。
func _action(tool: bool) -> void:
	if not locks_world(): action_requested.emit(tool)

## 打开指定界面并清除短暂选择，不修改世界进度。
func _open(next_mode: String) -> void:
	if session.busy or session.save_phase=="failed": return
	if next_mode=="shipping" and transfer_amount=="half": transfer_amount="stack"
	dialog_feedback.visible=false
	mode=next_mode; selected_source={}; _render(); _resize()
	_focus_dialog.call_deferred()

## 面板打开后聚焦首个可用按钮；无参数和返回值，保存失败时保留重试框焦点。
func _focus_dialog() -> void:
	if not dialog.visible or session.busy or session.save_phase=="failed": return
	var candidates:=body.find_children("*","Button",true,false)+dialog_actions.find_children("*","Button",true,false)
	for node: Node in candidates:
		if node.is_visible_in_tree() and not node.disabled:
			node.grab_focus(); return
	if close_button.is_visible_in_tree() and not close_button.disabled: close_button.grab_focus()

## 关闭前先取消暂存选择；报告与失败保存不能用 Esc 跳过。
func close() -> void:
	if session.busy or session.save_phase=="failed" or mode=="report": return
	if not selected_source.is_empty(): selected_source={}; _render(); return
	if mode=="appearance-new" or mode=="confirm-new": mode="start"
	elif mode=="fishing":
		await session.dispatch({"type":"dismiss-fishing"}); mode=""
	elif mode=="placement": placement_request={}; placement_cancelled.emit(); mode=""
	elif not session.active: mode="start"
	else: mode=""
	_render(); _resize(); get_viewport().gui_release_focus()

## 打开经世界层距离检查后的物件面板；稻草人只显示驱赶计数，不作为容器。
func open_container(id: String) -> void:
	container_id=id
	var object:=FarmWorldRules.object_by_id(session.snapshot(),id)
	if object.is_empty() or FarmFenceRules.is_fence(str(object.get("kind",""))): return
	_open("scarecrow" if object.get("kind")=="scarecrow" else "shipping" if object.get("kind")=="shipping-bin" else "chest")

## 展示已经执行过交谈的结果，不再重复发交谈命令。
func show_dialogue(result: Dictionary) -> void:
	dialogue_result=result.duplicate(true); inspect_id=""; _open("dialogue")

## 展示固定查看点，公告板同时提供当日委托内容。
func inspect(id: String) -> void:
	inspect_id=id; dialogue_result={}; _open("dialogue")

## 请求睡眠确认，确认按钮才会提交日结命令。
func sleep_at(id: String) -> void:
	inspect_id=id; _open("sleep")

## 木匠建筑预览保留实际角色在柜台的状态，临时切换显示地图由世界层完成。
func request_placement(request: Dictionary) -> void:
	placement_request=request.duplicate(true); mode="placement"; _render(); placement_requested.emit(placement_request)

## 用屏幕选中的合法格确认一次摆放，失败仍留在预览中。
func confirm_placement(column: int, row: int) -> void:
	if mode!="placement" or session.busy: return
	var command:=placement_request.duplicate(true)
	command.column=column; command.row=row
	var result:=await session.dispatch(command)
	if result.get("tone")=="success": mode=""; placement_request={}; placement_cancelled.emit(); _render()

## 开始钓鱼后显示唯一收线按钮，按下与释放均交给领域状态机。
func show_fishing() -> void:
	_open("fishing")

## 监听关键状态更新并刷新可见投影，移动存档检查点不重建无关界面。
func _changed() -> void:
	if session==null or root==null: return
	var state:=session.snapshot()
	header.visible=session.active; toolbar.visible=session.active; energy_panel.visible=session.active
	if session.active:
		if mode in ["start","appearance-new","confirm-new"]: mode=""
		if state.unacknowledgedShippingReport!=null: mode="report"
		elif mode=="report": mode=""
		var minute:=int(state.minuteOfDay)
		status.text="第 %d 天 · 周%s"%[state.day,["一","二","三","四","五","六","日"][(int(state.day)-1)%7]]
		clock_label.text="%02d:%02d"%[floori(minute/60.0)%24,minute%60]
		clock_label.add_theme_color_override("font_color",Color("9c522d") if minute>=1440 else Color("304d3f"))
		weather_label.text={"sunny":"☀ 晴天","rain":"☂ 下雨","wind":"≈ 有风"}[state.weather.current]
		location_label.text="镜像岛  /  "+str(session.world.regions[state.player.regionId].displayName)
		gold_label.text=str(int(state.gold)); gold_label.tooltip_text="金币 %d"%state.gold
		stamina_bar.value=state.stamina; stamina_label.text=str(roundi(state.stamina))
		stamina_fill.bg_color=Color("c5794c") if state.stamina<FarmEnergyRules.LOW_STAMINA else Color("76a078")
		stamina_bar.tooltip_text="体力 %d/%d"%[roundi(state.stamina),int(FarmEnergyRules.MAX_STAMINA)]
		var key:=JSON.stringify(state.inventory)+str(selected_index)+str(state.wateringCanWater)+str(state.wateringCanLevel)
		if key!=_inventory_key:
			_inventory_key=key; _render_hotbar(state)
	_render(); _resize()
	if session.active and mode=="" and not session.busy: _mark_milestone.call_deferred()

## 按旧首周提示自动记录最新已解锁提示；无奖励，重复刷新不重复写入。
func _mark_milestone() -> void:
	if not session.active or session.busy or mode!="": return
	var state:=session.snapshot()
	var available: Dictionary={}
	for milestone: Dictionary in session.rules.milestones:
		if milestone.unlockDay<=state.day: available=milestone
	if not available.is_empty() and available.eventId not in state.seenEventIds:
		await session.dispatch({"type":"acknowledge-retention-event","eventId":available.eventId})

## 保存中只禁用操作，失败显示独立重试框；不丢弃候选或跳转到新游戏。
func _save_changed() -> void:
	if saving==null: return
	saving.visible=session.save_phase=="failed"
	_clear(saving)
	if saving.visible:
		var box:=VBoxContainer.new(); saving.add_child(box)
		_label(session.error,box)
		var retry:=_button("重试保存",box,_retry); retry.grab_focus.call_deferred()
	for button: Node in dialog.find_children("*","Button",true,false): button.disabled=session.busy or session.save_phase=="failed"
	for field: Node in dialog.find_children("*","LineEdit",true,false): field.editable=not session.busy and session.save_phase!="failed"; field.focus_mode=Control.FOCUS_ALL if field.editable else Control.FOCUS_NONE
	for area: Node in [header,toolbar,touch,actions]:
		for button: Node in area.find_children("*","Button",true,false): button.disabled=session.busy or session.save_phase=="failed" or mode!=""
	_resize()

## 重试会话已保留的候选，不重新执行消费、日结或鱼获逻辑。
func _retry() -> void:
	await session.dispatch({"type":"retry-storage-save"})

## 显示短反馈，状态和详细失败原因仍由对应面板负责。
func _feedback(result: Dictionary) -> void:
	message.text=result.get("message","")
	message_lifetime=3.0
	message.modulate=Color.WHITE
	message.add_theme_color_override("font_color",Color("934927") if result.get("tone")=="error" else Color("304d3f"))
	message_panel.visible=message.text!="" and mode in ["","placement"]
	if dialog_feedback!=null:
		dialog_feedback.text=message.text
		dialog_feedback.add_theme_color_override("font_color",Color("934927") if result.get("tone")=="error" else Color("416b50"))
		dialog_feedback.visible=message.text!="" and mode not in ["","placement"]

## 创建只读状态面板和原有菜单入口；字体层级区分时间、资源与辅助信息。
func _build_hud() -> void:
	header=Control.new(); header.mouse_filter=Control.MOUSE_FILTER_IGNORE; root.add_child(header)
	hud_menu=GridContainer.new(); hud_menu.columns=3; hud_menu.add_theme_constant_override("h_separation",6); hud_menu.add_theme_constant_override("v_separation",6); header.add_child(hud_menu)
	for entry in [["背包  E","inventory","chest"],["制作","crafting","wood"],["手册  Esc","menu",""]]:
		var button:=_button(entry[0],hud_menu,_open.bind(entry[1]))
		button.add_theme_font_size_override("font_size",14); button.custom_minimum_size.y=44
		button.icon=assets.icon(entry[2]); button.expand_icon=true; button.add_theme_constant_override("icon_max_width",22)
	location_label=_label("",header); location_label.add_theme_font_size_override("font_size",13)
	location_label.add_theme_color_override("font_color",Color("fff9eb")); location_label.add_theme_color_override("font_shadow_color",Color("274d40")); location_label.add_theme_constant_override("shadow_offset_y",2)
	status_panel=PanelContainer.new(); status_panel.add_theme_stylebox_override("panel",FarmUITheme.surface("fff9eb","849772",2,10)); header.add_child(status_panel)
	var content:=VBoxContainer.new(); content.add_theme_constant_override("separation",4); status_panel.add_child(content)
	var calendar:=HBoxContainer.new(); calendar.add_theme_constant_override("separation",10); content.add_child(calendar)
	status=_label("",calendar); status.add_theme_font_size_override("font_size",13); status.autowrap_mode=TextServer.AUTOWRAP_OFF
	weather_label=Label.new(); weather_label.add_theme_font_size_override("font_size",13); weather_label.add_theme_color_override("font_color",Color("785b30")); calendar.add_child(weather_label)
	content.add_child(HSeparator.new())
	var numbers:=HBoxContainer.new(); numbers.add_theme_constant_override("separation",16); content.add_child(numbers)
	clock_label=_label("06:00",numbers); clock_label.autowrap_mode=TextServer.AUTOWRAP_OFF; clock_label.add_theme_font_size_override("font_size",30)
	var wallet:=VBoxContainer.new(); wallet.size_flags_horizontal=Control.SIZE_EXPAND_FILL; wallet.add_theme_constant_override("separation",0); numbers.add_child(wallet)
	var caption:=_label("持有金币",wallet); caption.autowrap_mode=TextServer.AUTOWRAP_OFF; caption.add_theme_font_size_override("font_size",10); caption.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT
	gold_label=_label("0",wallet); gold_label.autowrap_mode=TextServer.AUTOWRAP_OFF; gold_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; gold_label.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; gold_label.add_theme_font_size_override("font_size",19); gold_label.add_theme_color_override("font_color",Color("885a29"))
	energy_panel=PanelContainer.new(); root.add_child(energy_panel)
	energy_panel.add_theme_stylebox_override("panel",FarmUITheme.surface("fff9eb","849772",1,5))
	var energy:=VBoxContainer.new(); energy.add_theme_constant_override("separation",4); energy_panel.add_child(energy)
	var energy_caption:=Label.new(); energy_caption.text="体力"; energy_caption.add_theme_font_size_override("font_size",11); energy.add_child(energy_caption)
	stamina_bar=ProgressBar.new(); stamina_bar.show_percentage=false; stamina_bar.max_value=FarmEnergyRules.MAX_STAMINA; stamina_bar.fill_mode=ProgressBar.FILL_BOTTOM_TO_TOP; stamina_bar.size_flags_horizontal=Control.SIZE_SHRINK_CENTER; stamina_bar.custom_minimum_size=Vector2(10,62); stamina_bar.size_flags_vertical=Control.SIZE_EXPAND_FILL; energy.add_child(stamina_bar)
	var track:=StyleBoxFlat.new(); track.bg_color=Color("dce4cc"); track.set_corner_radius_all(2); stamina_bar.add_theme_stylebox_override("background",track)
	stamina_fill=StyleBoxFlat.new(); stamina_fill.bg_color=Color("668f61"); stamina_fill.set_corner_radius_all(2); stamina_bar.add_theme_stylebox_override("fill",stamina_fill)
	stamina_label=Label.new(); stamina_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; stamina_label.add_theme_font_size_override("font_size",11); energy.add_child(stamina_label)

## 创建工具栏与背包共用的直角样式；固定留白避免选中时挤动图标。
func _hotbar_style(background: String, border: String, border_width: int=2) -> StyleBoxFlat:
	var style:=StyleBoxFlat.new()
	style.bg_color=Color(background); style.border_color=Color(border); style.set_border_width_all(border_width)
	style.content_margin_left=6; style.content_margin_right=6; style.content_margin_top=6; style.content_margin_bottom=6
	style.set_corner_radius_all(3)
	return style

## 一次创建十二个原生槽位及状态标签；此后只更新内容，保留节点、焦点与输入连接。
func _build_hotbar() -> void:
	toolbar=PanelContainer.new(); root.add_child(toolbar)
	var frame:=FarmUITheme.surface("e4cfa7","907854",2,8)
	frame.shadow_color=Color(0.10,0.19,0.13,0.24); frame.shadow_size=6; frame.shadow_offset=Vector2(0,3)
	frame.content_margin_left=8; frame.content_margin_right=8; frame.content_margin_top=8; frame.content_margin_bottom=8
	toolbar.add_theme_stylebox_override("panel",frame)
	var content:=VBoxContainer.new(); content.add_theme_constant_override("separation",4); toolbar.add_child(content)
	var heading:=HBoxContainer.new(); heading.add_theme_constant_override("separation",8); content.add_child(heading)
	held_label=_label("随身工具",heading); held_label.autowrap_mode=TextServer.AUTOWRAP_OFF; held_label.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; held_label.add_theme_font_size_override("font_size",14); held_label.add_theme_color_override("font_color",Color("493b2b"))
	hotbar_hint=Label.new(); hotbar_hint.text="数字键 / 滚轮"; hotbar_hint.add_theme_font_size_override("font_size",12); hotbar_hint.add_theme_color_override("font_color",Color("665039")); heading.add_child(hotbar_hint)
	hotbar_row_button=Button.new(); hotbar_row_button.text="换排 Tab"; hotbar_row_button.custom_minimum_size=Vector2(80,24); hotbar_row_button.add_theme_font_size_override("font_size",12); hotbar_row_button.tooltip_text="切换背包工具排 · Tab；Shift+Tab 反向切换"; heading.add_child(hotbar_row_button)
	hotbar_row_button.pressed.connect(_command.bind({"type":"rotate-hotbar-row","direction":1}))
	hotbar=GridContainer.new(); hotbar.columns=12; hotbar.add_theme_constant_override("h_separation",3); hotbar.add_theme_constant_override("v_separation",3); content.add_child(hotbar)
	var styles: Dictionary={"normal":_hotbar_style("f7ecd5","b5a17a",1),"hover":_hotbar_style("fff9e8","6e8b64",2),"pressed":_hotbar_style("e4eed4","53794e",3),"disabled":_hotbar_style("e7dfcb","bdad90",1)}
	styles.hover_pressed=styles.pressed
	var focus:=_hotbar_style("00000000","446d60",2)
	focus.expand_margin_left=2; focus.expand_margin_right=2; focus.expand_margin_top=2; focus.expand_margin_bottom=2
	styles.focus=focus
	slot_styles=styles
	for style_name: String in styles:
		var row_style:=styles[style_name].duplicate() as StyleBoxFlat
		row_style.content_margin_top=1; row_style.content_margin_bottom=1; hotbar_row_button.add_theme_stylebox_override(style_name,row_style)
	hotbar_row_button.add_theme_color_override("font_pressed_color",Color("493b2b"))
	hotbar_row_button.add_theme_color_override("font_hover_pressed_color",Color("493b2b"))
	for index in range(12):
		var button:=Button.new(); button.custom_minimum_size=Vector2(44,52); button.size_flags_horizontal=Control.SIZE_EXPAND_FILL; button.toggle_mode=true; button.expand_icon=true; button.icon_alignment=HORIZONTAL_ALIGNMENT_CENTER; button.add_theme_constant_override("icon_max_width",32)
		for style_name: String in styles: button.add_theme_stylebox_override(style_name,styles[style_name])
		hotbar.add_child(button); button.pressed.connect(_select.bind(index))
		var key:=Label.new(); key.text=["1","2","3","4","5","6","7","8","9","0","-","="][index]; key.position=Vector2(4,1); key.add_theme_font_size_override("font_size",10); key.add_theme_color_override("font_color",Color("735633")); key.mouse_filter=Control.MOUSE_FILTER_IGNORE; button.add_child(key)
		var quality:=Label.new(); quality.position=Vector2(25,1); quality.add_theme_font_size_override("font_size",11); quality.mouse_filter=Control.MOUSE_FILTER_IGNORE; button.add_child(quality)
		var quantity:=Label.new(); quantity.add_theme_font_size_override("font_size",12); quantity.add_theme_color_override("font_color",Color("493523")); quantity.add_theme_color_override("font_outline_color",Color("fff8e6")); quantity.add_theme_constant_override("outline_size",3); quantity.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; quantity.mouse_filter=Control.MOUSE_FILTER_IGNORE; button.add_child(quantity); quantity.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE); quantity.offset_left=4; quantity.offset_right=-4; quantity.offset_top=-19; quantity.offset_bottom=-2
		var badge:=TextureRect.new(); badge.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; badge.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; badge.mouse_filter=Control.MOUSE_FILTER_IGNORE; button.add_child(badge); badge.set_anchors_and_offsets_preset(Control.PRESET_CENTER); badge.offset_left=1; badge.offset_top=0; badge.offset_right=13; badge.offset_bottom=12
		var water:=ProgressBar.new(); water.show_percentage=false; water.mouse_filter=Control.MOUSE_FILTER_IGNORE; water.add_theme_stylebox_override("background",_hotbar_style("c4d6cf","66897c",1)); water.add_theme_stylebox_override("fill",_hotbar_style("4fa7b0","4fa7b0",0)); button.add_child(water)
		# 细条不继承槽位留白，否则最小高度会盖住工具图标。
		for style_name: String in ["background","fill"]:
			var style:=water.get_theme_stylebox(style_name).duplicate() as StyleBoxFlat
			style.content_margin_left=0; style.content_margin_right=0; style.content_margin_top=0; style.content_margin_bottom=0; water.add_theme_stylebox_override(style_name,style)
		water.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE); water.offset_left=5; water.offset_right=-5; water.offset_top=-7; water.offset_bottom=-3
		hotbar_slots.append({"button":button,"quantity":quantity,"badge":badge,"water":water,"quality":quality})

## 将当前背包首排投影到既有槽位，显示数量、水量与所选名称，不重建控件或写入库存。
func _render_hotbar(state: Dictionary) -> void:
	if not _selection_initialized:
		_selection_initialized=true
		selected_index=_first_non_empty_slot(state)
	elif selected_index>=0 and (selected_index>=state.inventory.size() or state.inventory[selected_index].itemId==""):
		selected_index=-1
		selected.emit(-1)
	for index in range(12):
		var slot: Dictionary=state.inventory[index]
		var controls: Dictionary=hotbar_slots[index]
		var button: Button=controls.button
		button.icon=assets.icon(slot.itemId); button.set_pressed_no_signal(index==selected_index)
		button.add_theme_constant_override("icon_max_width",40 if assets.media.items.get(slot.itemId,{}).has("grip") else 32)
		button.tooltip_text=FarmQualityRules.name(session.rules.items.get(slot.itemId,{}).get("name","空槽"),slot.quality)
		controls.quality.text=FarmQualityRules.LABELS[slot.quality] if slot.quality!=0 else ""
		controls.quality.add_theme_color_override("font_color",Color(FarmQualityRules.COLORS[slot.quality]))
		controls.quantity.text=str(slot.quantity) if slot.quantity>1 else ""
		controls.badge.texture=assets.badge(slot.itemId); controls.badge.visible=controls.badge.texture!=null
		controls.water.visible=slot.itemId=="watering-can"
		if controls.water.visible:
			controls.water.max_value=20 if state.wateringCanLevel==1 else 40; controls.water.value=state.wateringCanWater
			button.tooltip_text+=" · 水量 %d/%d"%[state.wateringCanWater,int(controls.water.max_value)]
		if index==selected_index: held_label.text=button.tooltip_text
	if selected_index<0: held_label.text="选择工具"
	held_label.tooltip_text=held_label.text
	hotbar_row_button.visible=state.inventoryCapacity>12

## 返回首个非空快捷槽，首次进入时给玩家一个可立即操作的工具。
func _first_non_empty_slot(state: Dictionary) -> int:
	for index in range(mini(12,state.inventory.size())):
		if state.inventory[index].itemId!="": return index
	return -1

## 选择活动行非空槽位；空槽不改变当前工具，再次选择同一格收起手持物。
func _select(index: int) -> void:
	if session.busy: return
	var state:=session.snapshot()
	if index<0 or index>=state.inventory.size() or state.inventory[index].itemId=="": return
	selected_index=-1 if selected_index==index else index
	selected.emit(selected_index); _inventory_key=""; _render_hotbar(session.snapshot())
	get_viewport().gui_release_focus()

## 仅在窄屏或触屏设备显示操作按钮；隐藏时释放已按住的移动意图，避免调整窗口后继续移动。
func _update_touch_controls() -> void:
	if touch==null or actions==null: return
	var show_controls: bool=session.active and mode=="" and (get_viewport().get_visible_rect().size.x<680 or DisplayServer.is_touchscreen_available())
	if touch.visible and not show_controls: movement_requested.emit(Vector2.ZERO)
	touch.visible=show_controls; actions.visible=show_controls

## 根据模式构建原生菜单，不创建无动作的演示按钮。
func _render() -> void:
	if dialog==null: return
	_update_touch_controls()
	hud_menu.visible=mode!="fishing"
	toolbar.visible=session.active and mode!="fishing"; energy_panel.visible=toolbar.visible
	message_panel.visible=message.text!="" and mode in ["","placement"]
	for area: Node in [header,toolbar,touch,actions]:
		for button: Node in area.find_children("*","Button",true,false): button.disabled=mode!="" or session.busy or session.save_phase=="failed"
	placement_controls.visible=mode=="placement"
	dialog.visible=mode!="" and mode!="placement"
	backdrop.visible=dialog.visible and mode!="fishing"
	if not dialog.visible:
		_rendered_mode=mode
		return
	if mode=="fishing" and is_instance_valid(fish_progress): return
	var same_page:=_rendered_mode==mode
	var old_scroll:=dialog_scroll.scroll_vertical if same_page else 0
	var old_recipe_scroll:=recipe_list_scroll.scroll_vertical if same_page and is_instance_valid(recipe_list_scroll) else 0
	var focus_key:=_focused_control_key() if same_page else ""
	_body_revision+=1
	_rendered_mode=mode
	_clear(body); fish_progress=null; character_preview=null; recipe_list_scroll=null
	_clear(dialog_actions); dialog_actions.visible=false
	title.add_theme_font_size_override("font_size",40 if mode=="start" else 26)
	body.add_theme_constant_override("separation",8 if mode=="fishing" else 12 if mode=="crafting" else 14)
	close_button.visible=session.active and mode!="report" or mode in ["appearance-new","confirm-new"]
	var state:=session.snapshot()
	dialog.add_theme_stylebox_override("panel",FarmUITheme.surface("fff9eb","8f9b76",2,6))
	dialog_kicker.text="镜像岛  /  从一方小院开始" if mode=="start" else "镜像岛  /  农场手册"
	dialog_footer.text="进度仅保存在本机" if not session.active else "时间已暂停  ·  Esc 返回农场"
	if mode=="fishing": dialog_footer.text="按住收线，松手降张力"
	elif mode=="report": dialog_footer.text="确认今日收获后，开始新的一天"
	elif mode=="crafting": dialog_footer.text="选择配方，再点击背包目标格完成制作"
	elif mode in ["inventory","chest"]: dialog_footer.text="拖动物品移动  ·  右键单件  ·  Shift + 右键半组"
	match mode:
		"start": _start_menu()
		"confirm-new":
			title.text="开始新的农场？"
			_label("确认后将替换这台设备的 Godot 本地农场，旧进度无法恢复。",body)
			_button("确认重新开始",body,_appearance_new)
		"appearance-new","appearance": _appearance_menu()
		"inventory","chest","shipping","crafting": _inventory_menu(state)
		"menu": FarmJournalPages.menu(self,state)
		"report": _report(state)
		"skills": _skills_menu(state)
		"scarecrow":
			title.text="稻草人"
			var object:=FarmWorldRules.object_by_id(state,container_id)
			if not object.is_empty(): _label("已驱赶 %d 只乌鸦。\n可用工具收回，回收后计数重置。"%object.scaredCount,body)
		"dialogue": _dialogue_menu(state)
		"sleep":
			title.text="今天就休息了吗？"; _label("睡觉后作物生长、资源恢复，出货收入在次日结算。",body)
			_command_button("睡到明天",body,{"type":"sleep","bedId":inspect_id})
		"social": FarmJournalPages.social(self,state)
		"calendar": FarmJournalPages.calendar(self,state)
		"requests": _requests(state)
		"adoption": _adoption()
		"fishing": _fishing_menu()
		"building": _building_menu(state)
		"confirm-demolish":
			title.text="拆除此出货箱？"
			_label("拆除不退还建造材料，共享出货队列会保留。农场至少要留一个出货箱。",body)
			_button("确认拆除",body,_demolish)
		"backpack-upgrade":
			title.text="背包升级"
			if state.inventoryCapacity>=36: _label("已经拥有 36 格背包。",body)
			else:
				var cost:=2000 if state.inventoryCapacity==12 else 10000
				_label("%d → %d 格 · %dg"%[state.inventoryCapacity,state.inventoryCapacity+12,cost],body)
				_command_button("购买升级",body,{"type":"buy-backpack-upgrade","interactionId":inspect_id})
		"gift":
			title.text="送出礼物？"
			var item_id: String=state.inventory[selected_index].itemId if selected_index>=0 else ""
			var quality: int=state.inventory[selected_index].quality if selected_index>=0 else 0
			_label("送出 1 件 %s，每人每天一份、每周两份。"%FarmQualityRules.name(session.rules.items.get(item_id,{}).get("name","物品"),quality),body)
			_button("确认送出",body,_gift.bind(item_id))
		"audio":
			title.text="声音"
			for entry in [["总音量","master"],["环境音","music"],["效果音","sfx"]]:
				_label(entry[0],body)
				var slider:=HSlider.new(); slider.min_value=0; slider.max_value=100; slider.value=audio.settings[entry[1]]*100; body.add_child(slider)
				slider.value_changed.connect(_volume.bind(entry[1]))
			_button("测试声音",body,audio.cue.bind("pickup"))
		"credits":
			title.text="鸣谢与许可证"
			_label(FileAccess.get_file_as_string("res://generated/THIRD_PARTY_NOTICES.txt"),body)
			_label("Godot Engine\n"+Engine.get_license_text(),body)
			_label("Noto Sans CJK SC Sans2.004\n"+FileAccess.get_file_as_string("res://generated/NotoSansCJK-LICENSE.txt"),body)
			_label("引擎依赖版权\n"+JSON.stringify(Engine.get_copyright_info(),"  "),body)
			var licenses:=Engine.get_license_info()
			for name: String in licenses: _label(name+"\n"+str(licenses[name]),body)
	_resize()
	_restore_body_position.call_deferred(old_scroll,focus_key,old_recipe_scroll,_body_revision)
	if not same_page:
		_animate_dialog.call_deferred(); _focus_dialog.call_deferred()


## 构建启动页；仅展示现有物品图标与真实存档状态，按钮仍进入原新建或继续流程。
func _start_menu() -> void:
	title.text="镜像岛"
	var welcome:=PanelContainer.new(); welcome.add_theme_stylebox_override("panel",FarmUITheme.surface("dce8d5","9dad88",0,18)); body.add_child(welcome)
	var content:=VBoxContainer.new(); content.add_theme_constant_override("separation",12); welcome.add_child(content)
	var harvest:=HBoxContainer.new(); harvest.add_theme_constant_override("separation",18); content.add_child(harvest)
	for item_id: String in ["watering-can","parsnip","wood","fishing-rod"]:
		var icon:=TextureRect.new(); icon.texture=assets.icon(item_id); icon.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; icon.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; icon.custom_minimum_size=Vector2(44,48); icon.texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST; harvest.add_child(icon)
	_label("把日子，种成喜欢的样子。",content).add_theme_font_size_override("font_size",22)
	_label("播种、收获、采集，慢慢经营岛上生活。",content).add_theme_font_size_override("font_size",14)
	var resume:=_button("继续我的农场" if save_exists else "暂无本机农场",body,_continue)
	resume.disabled=not save_exists or session.error!=""; resume.custom_minimum_size.y=52
	var start:=_button("开始新生活",body,_begin_new); start.custom_minimum_size.y=52
	var primary:=resume if save_exists and session.error=="" else start
	primary.add_theme_stylebox_override("normal",FarmUITheme.surface("365f49","274d40",1,12)); primary.add_theme_color_override("font_color",Color("fff9eb")); primary.add_theme_color_override("font_focus_color",Color("fff9eb"))
	var note:=_label("进度保存在本机。清除站点数据会丢失网页进度，不会自动同步到其他设备。",body); note.add_theme_font_size_override("font_size",12); note.add_theme_color_override("font_color",Color("65735a"))
	if session.error!="": _label(session.error,body).add_theme_color_override("font_color",Color("9a4834"))

## 读取当前内容按钮的稳定标识；返回空字符串表示焦点不在内容区，不干预标题按钮。
func _focused_control_key() -> String:
	var focused:=get_viewport().gui_get_focus_owner()
	if focused==null or not body.is_ancestor_of(focused): return ""
	if focused is FarmSlotButton: return "slot:%s:%d"%[focused.grid_id,focused.slot_index]
	if focused is Button: return str(focused.get_meta("focus_key",focused.text))
	return ""

## 按旧滚动位置和控件标识恢复内容；revision 排除过期回调，保存期间只恢复滚动，不抢重试焦点。
func _restore_body_position(scroll_y: int, focus_key: String, recipe_scroll_y: int, revision: int) -> void:
	if not dialog.visible or revision!=_body_revision: return
	if focus_key!="" and not session.busy and session.save_phase!="failed":
		for node: Node in body.find_children("*","Button",true,false):
			var key: String="slot:%s:%d"%[node.grid_id,node.slot_index] if node is FarmSlotButton else str(node.get_meta("focus_key",node.text))
			if key==focus_key and not node.disabled:
				node.grab_focus(); break
	dialog_scroll.set_deferred("scroll_vertical",scroll_y)
	if is_instance_valid(recipe_list_scroll): recipe_list_scroll.set_deferred("scroll_vertical",recipe_scroll_y)

## 仅在切换页面时播放短暂淡入；无参数与返回值，不移动命中区域或反复动画状态更新。
func _animate_dialog() -> void:
	if not dialog.visible: return
	if _dialog_tween!=null and _dialog_tween.is_valid(): _dialog_tween.kill()
	dialog.modulate=Color(1,1,1,0.78)
	_dialog_tween=create_tween(); _dialog_tween.tween_property(dialog,"modulate",Color.WHITE,0.16).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

## 新游戏已有存档时先确认覆盖，首次新建直接进入外观选择。
func _begin_new() -> void:
	if save_exists: _open("confirm-new")
	else: _appearance_new()

## 初始化新角色的独立外观选择，尚不创建世界。
func _appearance_new() -> void:
	appearance_value=session.rules.initial.player.appearance.duplicate(true); _open("appearance-new")

## 继续游戏仅在仓库与完整 decoder 成功后关闭启动界面。
func _continue() -> void:
	if await session.continue_game(): mode=""; _changed()
	else: _render()

## 创建独立三层角色预览与全部已发布外观选项。
func _appearance_menu() -> void:
	title.text="创建岛民" if mode=="appearance-new" else "更换外观"
	if mode=="appearance": appearance_value=session.snapshot().player.appearance.duplicate(true)
	var row:=HBoxContainer.new(); body.add_child(row)
	var preview:=Control.new(); preview.custom_minimum_size=Vector2(108,220); row.add_child(preview)
	character_preview=load("res://scenes/islander.tscn").instantiate(); character_preview.position=Vector2(54,195); character_preview.scale=Vector2(6,6); character_preview.collision_layer=0; character_preview.collision_mask=0; preview.add_child(character_preview)
	var options:=GridContainer.new(); options.set_meta("appearance_options",true); options.columns=4 if root.size.x>=800 else 2; options.size_flags_horizontal=Control.SIZE_EXPAND_FILL; options.add_theme_constant_override("v_separation",8); row.add_child(options)
	var choices: Dictionary={"gender":["性别",["male","female"],["男","女"]],"head":["发型",["short","bob","ponytail"],["清爽短发","柔软短波波","轻快马尾"]],"top":["上装",["shirt","overalls","jacket"],["日常衬衫","农场背带装","轻便外套"]],"bottom":["下装",["trousers","shorts","skirt"],["直筒长裤","夏日短裤","田园短裙"]],"skinTone":["肤色",["peach","tan","umber"],["浅桃","暖棕","深褐"]],"hairColor":["发色",["chestnut","black","gold"],["栗棕","墨黑","亚麻金"]],"topColor":["衣服颜色",["cream","mint","coral","sky"],["暖白","薄荷绿","珊瑚橙","晴空蓝"]],"bottomColor":["下装颜色",["denim","sand","forest"],["牛仔蓝","浅沙色","森林绿"]]}
	for key: String in choices:
		var label:=_label(choices[key][0],options); label.size_flags_horizontal=Control.SIZE_SHRINK_BEGIN; label.custom_minimum_size.x=68
		var picker:=OptionButton.new(); picker.custom_minimum_size.y=40; picker.size_flags_horizontal=Control.SIZE_EXPAND_FILL; options.add_child(picker)
		for name: String in choices[key][2]: picker.add_item(name)
		picker.select(choices[key][1].find(appearance_value[key])); picker.item_selected.connect(_appearance_select.bind(key,choices[key][1]))
	_apply_preview()
	var directions:=HFlowContainer.new(); body.add_child(directions)
	for direction in [["正面","down"],["左侧","left"],["右侧","right"],["背面","up"]]: _button(direction[0],directions,_preview_face.bind(direction[1]))
	var walking:=CheckButton.new(); walking.text="看看走路"; walking.button_pressed=preview_walking; directions.add_child(walking); walking.toggled.connect(_preview_walk)
	_button("开始新生活" if mode=="appearance-new" else "保存外观",body,_save_appearance)

## 切换外观预览方向，不改变农场角色的真实位置。
func _preview_face(direction: String) -> void:
	preview_direction=direction

## 预览行走只推进三层动画，不产生移动或存档。
func _preview_walk(enabled: bool) -> void:
	preview_walking=enabled

## 修改本次外观草稿并更新预览，不触发库存或世界状态变更。
func _appearance_select(index: int, key: String, values: Array) -> void:
	appearance_value[key]=values[index]; _apply_preview()

## 将原外观枚举映射到可编辑角色组件的检查器参数。
func _apply_preview() -> void:
	if not is_instance_valid(character_preview): return
	var mapping: Dictionary={"gender":["gender",["male","female"]],"head":["head",["short","bob","ponytail"]],"top":["top",["shirt","overalls","jacket"]],"bottom":["bottom",["trousers","shorts","skirt"]],"skinTone":["skin_tone",["peach","tan","umber"]],"hairColor":["hair_color",["chestnut","black","gold"]],"topColor":["top_color",["cream","mint","coral","sky"]],"bottomColor":["bottom_color",["denim","sand","forest"]]}
	for key: String in mapping: character_preview.set(mapping[key][0],mapping[key][1].find(appearance_value[key]))

## 新游戏与游戏中换装分别调用对应保存路径，失败不关闭编辑界面。
func _save_appearance() -> void:
	var success:=false
	if mode=="appearance-new": success=await session.new_game(appearance_value)
	else:
		var result:=await session.dispatch({"type":"change-appearance","appearance":appearance_value})
		success=result.get("tone")=="success"
	if success: mode=""; save_exists=true; _changed()

## 构建背包、容器、出货和制作菜单，共用同一槽位控件和数量选择。
func _inventory_menu(state: Dictionary) -> void:
	title.text={"inventory":"随身背包","chest":"宝箱","shipping":"出货箱","crafting":"制作"}[mode]
	if mode in ["inventory","crafting"]:
		var tabs:=HBoxContainer.new(); body.add_child(tabs)
		for entry in [["随身物品","inventory"],["制作配方","crafting"]]:
			var tab:=_button(entry[0],tabs,_open.bind(entry[1])); tab.toggle_mode=true; tab.button_pressed=mode==entry[1]; tab.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	var options:=HFlowContainer.new(); body.add_child(options)
	for pair in [["整组","stack"],["单件","one"],["半组","half"]]:
		if mode=="crafting" or (mode=="shipping" and pair[1]=="half"): continue
		var button:=_button(pair[0],options,_amount.bind(pair[1])); button.toggle_mode=true; button.button_pressed=transfer_amount==pair[1]
		button.tooltip_text="选择本次移动的数量"
	if mode!="crafting": _command_button("整理背包",options,{"type":"sort-inventory"})
	else: options.visible=false
	if mode=="crafting": _crafting_recipes(state)
	if mode=="chest":
		var chest:=FarmWorldRules.object_by_id(state,container_id)
		if chest.is_empty(): return
		var controls:=HFlowContainer.new(); body.add_child(controls)
		_command_button("放入已有堆叠",controls,{"type":"add-to-existing-stacks","objectId":container_id})
		_command_button("整理箱子",controls,{"type":"sort-container","objectId":container_id})
		var colors:=OptionButton.new(); controls.add_child(colors)
		var color_names: Array[String]=["原木","红","橙","黄","黄绿","绿","青绿","青","天蓝","蓝","靛蓝","紫","紫罗兰","洋红","粉","玫瑰","浅棕","棕","灰","黑","白"]
		for color: String in color_names: colors.add_item(color)
		colors.select(FarmStorageRules.COLORS.find(chest.colorId)); colors.item_selected.connect(_chest_color)
		_label("箱内物品 · 36 格",body); _grid(chest.slots,"chest")
	if mode=="shipping":
		_label("投入后明早结算，只能取回最后一次投入。",body)
		if not state.shippingQueue.is_empty():
			var last: Dictionary=state.shippingQueue.back()
			_label("最后投入：%s ×%d"%[FarmQualityRules.name(session.rules.items[last.itemId].name,last.quality),last.quantity],body)
			_command_button("取回最后一笔",body,{"type":"reclaim-last-shipment","objectId":container_id})
	var occupied:=0
	for slot: Dictionary in state.inventory:
		if slot.itemId!="": occupied+=1
	_label("随身物品 · %d / %d 格"%[occupied,state.inventoryCapacity],body); _grid(state.inventory,"inventory")
	if mode=="inventory": _inventory_details(state)
	elif mode=="chest": _label("点选来源，再点目标格存取；也可以直接拖动。",body)

## 展示紧凑配方选择与当前材料明细；只读数量，制作仍由玩家点击背包目标格触发。
func _crafting_recipes(state: Dictionary) -> void:
	if recipe_id not in state.knownRecipes: recipe_id=""
	var quantities:=HBoxContainer.new(); body.add_child(quantities)
	_label("制作数量",quantities).add_theme_font_size_override("font_size",14)
	for amount: int in [1,5,25]:
		var amount_button:=_button("×%d"%amount,quantities,_craft_amount.bind(amount)); amount_button.toggle_mode=true; amount_button.button_pressed=craft_amount==amount
	var sort_button:=_command_button("整理",quantities,{"type":"sort-inventory"}); sort_button.tooltip_text="整理背包"
	var recipe_scroll:=ScrollContainer.new(); recipe_scroll.custom_minimum_size.y=148; recipe_scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; recipe_scroll.follow_focus=true; body.add_child(recipe_scroll)
	recipe_list_scroll=recipe_scroll
	var recipes:=GridContainer.new(); recipes.columns=2 if root.size.x>=620 else 1; recipes.set_meta("responsive_columns",true); recipes.size_flags_horizontal=Control.SIZE_EXPAND_FILL; recipe_scroll.add_child(recipes)
	for recipe: Dictionary in session.rules.recipes.values():
		if recipe.id not in state.knownRecipes: continue
		var enough:=true
		for ingredient: Dictionary in recipe.ingredients:
			if session.inventory.quantity(state.inventory,ingredient.itemId)<int(ingredient.quantity)*craft_amount: enough=false
		var button:=_button("%s ×%d  ·  %s"%[recipe.name,craft_amount*int(recipe.output.quantity),"材料足够" if enough else "缺少材料"],recipes,_choose_recipe.bind(recipe.id))
		button.set_meta("focus_key","recipe:"+recipe.id); button.size_flags_horizontal=Control.SIZE_EXPAND_FILL; button.alignment=HORIZONTAL_ALIGNMENT_LEFT; button.add_theme_font_size_override("font_size",14); button.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS
		button.icon=assets.icon(recipe.output.itemId); button.expand_icon=true; button.add_theme_constant_override("icon_max_width",28)
		button.toggle_mode=true; button.button_pressed=recipe_id==recipe.id
	if recipe_id=="":
		_label("选择一张配方，查看材料和制作数量。",body).add_theme_font_size_override("font_size",14)
		return
	var chosen: Dictionary=session.rules.recipes[recipe_id]
	var detail:=_information_card(body)
	_label("%s ×%d"%[chosen.name,craft_amount*int(chosen.output.quantity)],detail).add_theme_font_size_override("font_size",19)
	var materials:=HFlowContainer.new(); materials.add_theme_constant_override("h_separation",16); detail.add_child(materials)
	for ingredient: Dictionary in chosen.ingredients:
		var row:=HBoxContainer.new(); materials.add_child(row)
		var icon:=TextureRect.new(); icon.texture=assets.icon(ingredient.itemId); icon.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; icon.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; icon.custom_minimum_size=Vector2(22,22); row.add_child(icon)
		var owned:=session.inventory.quantity(state.inventory,ingredient.itemId)
		var required:=int(ingredient.quantity)*craft_amount
		var material:=_label("%s %d/%d%s"%[session.rules.items[ingredient.itemId].name,owned,required," · 缺 %d"%(required-owned) if owned<required else ""],row)
		material.autowrap_mode=TextServer.AUTOWRAP_OFF; material.add_theme_font_size_override("font_size",14); material.add_theme_color_override("font_color",Color("98462f") if owned<required else Color("365f49"))
	_label("材料：持有 / 需要。点击下方背包目标格，放入成品。",detail).add_theme_font_size_override("font_size",12)

## 集中显示当前物品和原有操作；只读取定义与快照，不复制消费、售价或放置规则。
func _inventory_details(state: Dictionary) -> void:
	var panel:=PanelContainer.new(); panel.custom_minimum_size.y=126; panel.add_theme_stylebox_override("panel",FarmUITheme.surface("e8eddb","bccbad",0,16)); body.add_child(panel)
	if selected_source.is_empty():
		var empty:=VBoxContainer.new(); empty.add_theme_constant_override("separation",8); panel.add_child(empty)
		_label("带上工具，出发吧。",empty).add_theme_font_size_override("font_size",20)
		_label("点选物品查看详情，拖动或再点目标格移动。",empty).add_theme_font_size_override("font_size",14)
		return
	var slot: Dictionary=state.inventory[selected_source.index]
	var item: Dictionary=session.rules.items[slot.itemId]
	var row:=HBoxContainer.new(); row.add_theme_constant_override("separation",12); panel.add_child(row)
	var icon:=TextureRect.new(); icon.texture=assets.icon(slot.itemId); icon.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; icon.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; icon.custom_minimum_size=Vector2(64,72); icon.texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST; icon.size_flags_vertical=Control.SIZE_SHRINK_CENTER; row.add_child(icon)
	var details:=VBoxContainer.new(); details.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(details)
	var name_label:=_label("%s ×%d"%[FarmQualityRules.name(item.name,slot.quality),slot.quantity],details); name_label.add_theme_font_size_override("font_size",21)
	var information: Array[String]=[]
	if item.category=="tool": information.append("工具")
	if not item.get("canShip",false): information.append("不可出货")
	if slot.itemId=="watering-can": information.append("水量 %d/%d"%[state.wateringCanWater,20 if state.wateringCanLevel==1 else 40])
	var price: Variant=session.rules.prices.get(slot.itemId)
	if item.get("canShip",false) and price!=null: information.append("出货单价 %dg"%FarmQualityRules.price(int(price),slot.quality))
	if not information.is_empty(): _label(" · ".join(information),details)
	var controls:=HFlowContainer.new(); details.add_child(controls)
	if selected_source.index<12: _button("拿在手上",controls,_hold_selected)
	if item.get("edible",item.get("staminaRestore",0)>0):
		var restore: int=FarmQualityRules.energy(item,slot.quality)
		_command_button("食用" if restore==0 else "食用 %+d 体力"%restore,controls,{"type":"eat-item","itemId":slot.itemId,"quality":slot.quality})
	if slot.itemId=="basic-fertilizer": _label("拿在手上，对空耕地或尚未发芽的种子使用。",details)
	if slot.itemId=="basic-retaining-soil": _label("对耕地使用，作物生长期间也可施用。已浇水的土地隔夜约有三分之一概率保水，不能与其他肥料叠加。",details)
	if slot.itemId in ["wood-fence","stone-fence"]: _label("摆放在农场阻挡通行，损坏后可用新围栏替换，使用十字镐可以回收。",details)
	if slot.itemId=="gate": _label("摆放在农场后可开合，打开时可以通行，使用十字镐可以回收。",details)
	if slot.itemId in ["chest","scarecrow"] or FarmFenceRules.is_fence(slot.itemId): _button("摆放"+item.name,controls,request_placement.bind({"type":"place-world-object","inventoryIndex":selected_source.index}))

## 创建响应式槽位列表，保持槽位编号和当前容量。
func _grid(slots: Array, grid_id: String) -> void:
	var grid:=GridContainer.new(); grid.set_meta("slot_grid",true); grid.columns=12 if root.size.x>=800 else 6; body.add_child(grid)
	grid.add_theme_constant_override("h_separation",3); grid.add_theme_constant_override("v_separation",3)
	for index in range(slots.size()):
		var slot: Dictionary=slots[index]
		var button:=FarmSlotButton.new(); button.grid_id=grid_id; button.slot_index=index; button.item_id=slot.itemId; button.amount_mode=transfer_amount; button.transfer_enabled=mode in ["inventory","chest"]
		button.custom_minimum_size=Vector2(44,52); button.size_flags_horizontal=Control.SIZE_EXPAND_FILL; button.icon=assets.icon(slot.itemId); button.expand_icon=true; button.add_theme_constant_override("icon_max_width",40 if assets.media.items.get(slot.itemId,{}).has("grip") else 28)
		for style_name: String in slot_styles: button.add_theme_stylebox_override(style_name,slot_styles[style_name])
		button.icon_alignment=HORIZONTAL_ALIGNMENT_CENTER; button.tooltip_text=FarmQualityRules.name(session.rules.items.get(slot.itemId,{}).get("name","空格"),slot.quality)
		button.toggle_mode=true; button.button_pressed=selected_source.get("grid")==grid_id and selected_source.get("index")==index
		grid.add_child(button); button.picked.connect(_pick_slot); button.moved.connect(_drop_slot)
		_slot_labels(button,index,slot.quantity,slot.itemId)
		if slot.quality!=0:
			var quality:=Label.new(); quality.text=FarmQualityRules.LABELS[slot.quality]; quality.position=Vector2(25,1); quality.add_theme_font_size_override("font_size",11); quality.add_theme_color_override("font_color",Color(FarmQualityRules.COLORS[slot.quality])); quality.mouse_filter=Control.MOUSE_FILTER_IGNORE; button.add_child(quality)

## 将槽号与数量放在图标角落，避免文字占掉图标宽度；标签不抢输入。
func _slot_labels(button: Button, index: int, count: int, item_id: String) -> void:
	var badge_texture:=assets.badge(item_id)
	if badge_texture!=null:
		var badge:=TextureRect.new(); badge.texture=badge_texture; badge.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; badge.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; badge.mouse_filter=Control.MOUSE_FILTER_IGNORE; button.add_child(badge); badge.set_anchors_and_offsets_preset(Control.PRESET_CENTER); badge.offset_left=1; badge.offset_top=0; badge.offset_right=13; badge.offset_bottom=12
	var number:=Label.new(); number.add_theme_color_override("font_color",Color("70694f")); number.text=str(index+1); number.position=Vector2(4,0); number.add_theme_font_size_override("font_size",10); number.mouse_filter=Control.MOUSE_FILTER_IGNORE; button.add_child(number)
	if count>1:
		var quantity:=Label.new(); quantity.text=str(count); quantity.add_theme_font_size_override("font_size",12); quantity.add_theme_color_override("font_outline_color",Color("fff8e6")); quantity.add_theme_constant_override("outline_size",3); quantity.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; quantity.mouse_filter=Control.MOUSE_FILTER_IGNORE; button.add_child(quantity); quantity.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE); quantity.offset_left=3; quantity.offset_right=-3; quantity.offset_top=-19; quantity.offset_bottom=-2

## 设置明确数量模式，不改变已选物品。
func _amount(value: String) -> void:
	transfer_amount=value; _render()

## 选择原制作批次数量，不引入任意输入或无限循环制作。
func _craft_amount(value: int) -> void:
	craft_amount=value; _render()

## 选择配方只显示预览，点目标格之前不消耗材料。
func _choose_recipe(id: String) -> void:
	recipe_id=id; _render()

## 依据当前面板决定点选、转移、出货或制作，全部走领域命令。
func _pick_slot(grid_id: String, index: int, amount: String) -> void:
	if session.busy: return
	transfer_amount=amount
	if mode=="shipping": await _command({"type":"ship-item","objectId":container_id,"sourceIndex":index,"quantity":"one" if amount=="one" else "stack"}); return
	if mode=="crafting":
		if recipe_id!="": await _command({"type":"craft-item","recipeId":recipe_id,"quantity":craft_amount,"targetIndex":index})
		return
	var state:=session.snapshot()
	var slots: Array=state.inventory if grid_id=="inventory" else FarmWorldRules.object_by_id(state,container_id).get("slots",[])
	if selected_source.is_empty():
		if index<slots.size() and slots[index].itemId!="": selected_source={"grid":grid_id,"index":index}
	elif selected_source.grid==grid_id and selected_source.index==index: selected_source={}
	else: await _transfer(selected_source,grid_id,index,amount)
	_render()

## 拖放完成只提交一次转移，失败保留源物品。
func _drop_slot(data: Dictionary, grid_id: String, index: int) -> void:
	await _transfer(data,grid_id,index,data.amount)
	_render()

## 按源目标容器选择原命令，禁止 UI 直接修改两个数组。
func _transfer(source: Dictionary, grid_id: String, index: int, amount: String) -> void:
	var command: Dictionary={"sourceIndex":source.index,"targetIndex":index,"amount":amount}
	if source.grid==grid_id:
		command.type="move-inventory" if grid_id=="inventory" else "move-container-item"
		if grid_id=="chest": command.objectId=container_id
	else: command.merge({"type":"transfer-container-item","objectId":container_id,"direction":"to-chest" if source.grid=="inventory" else "from-chest"})
	var result:=await session.dispatch(command)
	if result.get("tone")=="success": selected_source={}

## 将背包中当前活动行的物品拿到手上，保留非活动行限制。
func _hold_selected() -> void:
	selected_index=selected_source.index; selected.emit(selected_index); selected_source={}; mode=""; _inventory_key=""; _changed()

## 保存箱子颜色，仍使用原二十一色封闭列表。
func _chest_color(index: int) -> void:
	await _command({"type":"set-chest-color","objectId":container_id,"colorId":FarmStorageRules.COLORS[index]})

## 展示原对话文本和实际可用服务，商店内容与离柜检查由领域重复验证。
func _dialogue_menu(state: Dictionary) -> void:
	var definition: Dictionary={}
	if inspect_id!="":
		var point: Dictionary=session.world.interactions.get(inspect_id,{})
		definition=session.dialogues.get(point.get("dialogueId",""),{})
	else: definition=session.dialogues.get(dialogue_result.get("dialogueId",""),{})
	title.text=definition.get("speaker","交谈")
	for line: String in definition.get("lines",[]): _label(line,body)
	if inspect_id.contains("notice") or inspect_id.contains("board"): _requests(state)
	if dialogue_result.get("requestResult")=="request-completed": _label("今日委托已完成，报酬与好感已到账。",body)
	if dialogue_result.get("shopAvailable",false):
		_label("可用金币 %dg · 每次交易 1 件"%state.gold,body)
		_label("购买种子",body)
		for crop: Dictionary in session.rules.crops:
			if crop.get("seedPrice")!=null: _shop_item_row(crop.seedId,int(crop.seedPrice),true,state,{"type":"buy-item","itemId":crop.seedId,"quantity":1})
		if state.day>=15:
			for item_id: String in ["basic-fertilizer","basic-retaining-soil"]: _shop_item_row(item_id,100,true,state,{"type":"buy-item","itemId":item_id,"quantity":1})
		var listed: Dictionary={}
		for slot: Dictionary in state.inventory:
			var price: Variant=session.rules.prices.get(slot.itemId)
			var key: String=slot.itemId+":"+str(slot.quality)
			if price!=null and session.rules.items[slot.itemId].get("seedShopBuyback",true) and not listed.has(key):
				if listed.is_empty(): _label("出售随身物品",body)
				listed[key]=true
				_shop_item_row(slot.itemId,FarmQualityRules.price(int(price),slot.quality),false,state,{"type":"sell-item","itemId":slot.itemId,"quality":slot.quality,"quantity":1})
	if inspect_id=="blacksmith-tool-rack":
		_label("可用金币 %dg"%state.gold,body)
		_shop_item_row("coal",session.coal_price(state.day),true,state,{"type":"buy-coal"})
	if dialogue_result.get("wateringServiceAvailable",false): _command_button("升级喷壶 · 900g + 15 木材",body,{"type":"upgrade-watering-can"})
	if dialogue_result.get("npcId")=="town-resident-xiangzi" and state.day>=7: _command_button("领取竹鱼竿",body,{"type":"claim-fishing-rod","npcId":"town-resident-xiangzi"})
	if dialogue_result.get("npcId")=="town-resident-mozi" and session.storage.carpenter_available(state,session.npcs.snapshot(),"town-house-west-carpenter-counter"): _button("木匠服务",body,_open.bind("building"))
	if dialogue_result.has("npcId") and selected_index>=0:
		var item: Dictionary=session.rules.items.get(state.inventory[selected_index].itemId,{})
		if not item.is_empty() and item.category not in ["tool","seed"]: _button("赠送手持物品",body,_open.bind("gift"))

## 展示一件商品的图标、持有量和本次价格；按钮只发送原交易命令，购买资格由领域判定。
func _shop_item_row(item_id: String, price: int, buying: bool, state: Dictionary, command: Dictionary) -> void:
	var card:=_information_card(body)
	var row:=HBoxContainer.new(); row.add_theme_constant_override("separation",10); card.add_child(row)
	var icon:=TextureRect.new(); icon.texture=assets.icon(item_id); icon.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; icon.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; icon.custom_minimum_size=Vector2(32,32); icon.size_flags_vertical=Control.SIZE_SHRINK_CENTER; row.add_child(icon)
	var badge_texture:=assets.badge(item_id)
	if badge_texture!=null:
		var badge:=TextureRect.new(); badge.texture=badge_texture; badge.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; badge.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; badge.position=Vector2(16,16); badge.size=Vector2(14,14); icon.add_child(badge)
	var details:=VBoxContainer.new(); details.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(details)
	var quality: int=command.get("quality",0)
	_label(FarmQualityRules.name(session.rules.items[item_id].name,quality),details)
	var shortage: bool=buying and state.gold<price
	var hint:=_label("持有 %d%s"%[session.inventory.quantity(state.inventory,item_id,-1 if buying else quality)," · 金币不足" if shortage else ""],details)
	hint.add_theme_font_size_override("font_size",12); hint.add_theme_color_override("font_color",Color("934927") if shortage else Color("64745e"))
	var button:=_command_button("%s · %dg"%["买 1" if buying else "卖 1",price],row,command)
	button.add_theme_font_size_override("font_size",14); button.custom_minimum_size.x=100

## 确认后送出一件手持物品；失败保留礼物确认界面。
func _gift(item_id: String) -> void:
	var snapshot:=session.snapshot()
	if selected_index<0 or snapshot.inventory[selected_index].itemId!=item_id: return
	var result:=await session.dispatch({"type":"gift-item-to-npc","npcId":dialogue_result.npcId,"itemId":item_id,"quality":snapshot.inventory[selected_index].quality})
	if result.get("tone")=="success": _open("dialogue")

## 以真实柜台身份进入整图建筑预览，拆除保持二次明确按钮。
func _building_menu(state: Dictionary) -> void:
	title.text="罗宾的木匠服务"
	_button("建造出货箱 · 250g + 150 木材",body,request_placement.bind({"type":"build-shipping-bin","interactionId":"town-house-west-carpenter-counter"}))
	for object: Dictionary in state.worldObjects:
		if object.kind!="shipping-bin": continue
		var row:=HBoxContainer.new(); body.add_child(row)
		_label("出货箱 · (%d, %d)"%[object.column,object.row],row)
		_button("移动",row,request_placement.bind({"type":"move-farm-building","interactionId":"town-house-west-carpenter-counter","objectId":object.id}))
		_button("拆除",row,_confirm_demolish.bind(object.id))

## 拆除先进入确认，保存完成前不删除场景物件。
func _confirm_demolish(id: String) -> void:
	demolish_id=id; _open("confirm-demolish")

## 确认后提交原木匠命令，失败留在当前界面显示原因。
func _demolish() -> void:
	var result:=await session.dispatch({"type":"demolish-farm-building","interactionId":"town-house-west-carpenter-counter","objectId":demolish_id})
	if result.get("tone")=="success": _open("building")

## 显示出货分类与总额，确认动作也必须先持久化。
func _report(state: Dictionary) -> void:
	title.text="第 %d 天日结"%state.unacknowledgedShippingReport.settledDay
	var receipt:=PanelContainer.new(); receipt.add_theme_stylebox_override("panel",FarmUITheme.surface("365f49","274d40",0,18)); body.add_child(receipt)
	var total:=VBoxContainer.new(); total.add_theme_constant_override("separation",4); receipt.add_child(total)
	_label("今日出货收入",total).add_theme_color_override("font_color",Color("e6ecd4"))
	var earned:=_label("%d g"%state.unacknowledgedShippingReport.totalGold,total); earned.add_theme_font_size_override("font_size",32); earned.add_theme_color_override("font_color",Color("f4dc9e"))
	var wallet:=_label("当前金币 %d g"%state.gold,total); wallet.add_theme_font_size_override("font_size",13); wallet.add_theme_color_override("font_color",Color("fff9eb"))
	if not session.day_summary.is_empty():
		var summary: Dictionary=session.day_summary
		_label(("02:00 已被送回家。" if summary.reason=="passed-out" else "睡醒了，新的一天开始。")+" 体力 %d/%d。"%[roundi(summary.nextStamina),int(FarmEnergyRules.MAX_STAMINA)],body)
		if summary.goldLost>0: _label("送回家花费 %dg。"%summary.goldLost,body)
		var fence_events: Dictionary=summary.get("fenceEvents",{})
		if int(fence_events.get("damaged",0))>0: _label("%d 段围栏已经损坏。"%int(fence_events.damaged),body)
		if int(fence_events.get("vanished",0))>0: _label("%d 段损坏围栏消失了。"%int(fence_events.vanished),body)
	var names: Dictionary={"farming":"农产","foraging":"采集","fishing":"渔获","mining":"矿产","other":"其他"}
	for category: Dictionary in state.unacknowledgedShippingReport.categories:
		var heading:=HBoxContainer.new(); body.add_child(heading)
		_label(names[category.category],heading).add_theme_font_size_override("font_size",19)
		var subtotal:=_label("%d g"%category.totalGold,heading); subtotal.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; subtotal.add_theme_color_override("font_color",Color("885a29"))
		for entry: Dictionary in category.entries:
			var row:=HBoxContainer.new(); body.add_child(row)
			_label("%s ×%d"%[FarmQualityRules.name(session.rules.items[entry.itemId].name,entry.quality),entry.quantity],row)
			var price:=_label("%d g"%entry.totalGold,row); price.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT
		body.add_child(HSeparator.new())
	for upgrade: Dictionary in state.unacknowledgedShippingReport.skillUpgrades:
		_label("%s提升：%d → %d 级"%[FarmSkillRules.NAMES[upgrade.skill],upgrade.from,upgrade.to],body)
	for id: String in state.unacknowledgedShippingReport.recipeUnlocks: _label("新配方："+session.rules.recipes[id].name,body)
	for choice: Dictionary in state.unacknowledgedShippingReport.professionChoices:
		_label("%s %d 级：选择职业"%[FarmSkillRules.NAMES[choice.skill],choice.level],body).add_theme_font_size_override("font_size",18)
		for profession: String in choice.options:
			var detail: Dictionary=FarmSkillRules.PROFESSION_DETAILS[profession]
			var card:=_information_card(body)
			_label(detail.name+" · "+detail.description,card)
			_command_button("选择"+detail.name,card,{"type":"choose-profession","skill":choice.skill,"level":choice.level,"profession":profession})
	var crows: Dictionary=state.unacknowledgedShippingReport.crows
	if crows.scared>0: _label("稻草人驱赶了 %d 只乌鸦。"%crows.scared,body)
	if not crows.lost.is_empty(): _label("乌鸦吃掉了 %d 株作物。"%crows.lost.size(),body)
	# 日结必须确认，固定在滚动区外；职业尚未选择时不提供跳过入口。
	if state.unacknowledgedShippingReport.professionChoices.is_empty():
		dialog_actions.visible=true
		var acknowledge:=_command_button("开始新的一天",dialog_actions,{"type":"dismiss-day-settlement"}); acknowledge.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		acknowledge.add_theme_stylebox_override("normal",FarmUITheme.surface("365f49","274d40",1,12)); acknowledge.add_theme_color_override("font_color",Color("fff9eb")); acknowledge.add_theme_color_override("font_focus_color",Color("fff9eb"))

## 展示当前已接入技能的真实等级、经验和来源；界面不修改成长或展示无实际效果的奖励。
func _skills_menu(state: Dictionary) -> void:
	FarmJournalPages.skills(self,state)

## 为配方材料和技能进度提供一致的浅木色信息块，返回可添加原生控件的内容列。
func _information_card(parent: Control) -> VBoxContainer:
	var panel:=PanelContainer.new()
	var style:=FarmUITheme.surface("eef0de","c4ccb0",0,12)
	style.content_margin_left=10; style.content_margin_right=10; style.content_margin_top=8; style.content_margin_bottom=8
	panel.add_theme_stylebox_override("panel",style); parent.add_child(panel)
	var content:=VBoxContainer.new(); content.add_theme_constant_override("separation",6); panel.add_child(content)
	return content

## 展示当前确定性委托与首周提示；领取奖励仍发生在目标居民交谈时。
func _requests(state: Dictionary) -> void:
	if mode=="requests": title.text="今日目标与委托"
	var hints: Array[String]=["打理农田，去小镇认识居民，到皮埃尔的店里看看种子。","粉树广场委托板已开放，将今日物品交给指定居民。","攒下 900g 和 15 木材，找克林特升级喷壶。","完成委托并坚持交谈，居民会逐渐熟悉你。","到种子店柜台旁购买背包升级，Tab 可以轮换快捷行。","今日可准备高投入委托，先查看所需物品。","向威利领取竹鱼竿，到湖岸旧码头试钓。"]
	if state.wateringCanLevel==2: hints[2]="Lv2 喷壶已能朝面向方向一次浇三格。"
	if state.friendships.values().any(func(friend:Dictionary)->bool:return friend.points>=250): hints[3]="有人已经把你当成熟悉的邻居，再交谈会听见新的话。"
	hints[4]="背包已扩至 36 格，可以轮换三行快捷栏。" if state.inventoryCapacity==36 else "种子店背包陈列可花 %dg 扩到 %d 格，Tab 可以轮换快捷行。"%[2000 if state.inventoryCapacity==12 else 10000,state.inventoryCapacity+12]
	var suggestion:=_information_card(body)
	_label("今天可以做什么",suggestion).add_theme_font_size_override("font_size",20)
	_label(hints[state.day-1] if state.day<=7 else "继续经营农场、完成每日委托，为下一次升级储蓄。",suggestion)
	var request:=session.social.request_for_day(state.day)
	if request.is_empty(): return
	var name: String=request.npcId
	for profile: Dictionary in session.rules.profiles:
		if profile.npcId==request.npcId: name=session.dialogues[profile.baseDialogueId].speaker
	_label("今日委托",body).add_theme_font_size_override("font_size",20)
	var task:=HBoxContainer.new(); task.add_theme_constant_override("separation",16); body.add_child(task)
	var icon:=TextureRect.new(); icon.texture=assets.icon(request.itemId); icon.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; icon.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; icon.custom_minimum_size=Vector2(56,64); icon.size_flags_vertical=Control.SIZE_SHRINK_CENTER; task.add_child(icon)
	var details:=VBoxContainer.new(); details.size_flags_horizontal=Control.SIZE_EXPAND_FILL; task.add_child(details)
	_label("%s需要 %s ×%d"%[name,session.rules.items[request.itemId].name,request.quantity],details)
	_label("报酬 %d g · 好感 +%d"%[request.goldReward,request.friendshipReward],details).add_theme_color_override("font_color",Color("885a29"))
	_label("已完成" if state.dailyRequest.completed else "与目标居民交谈即可提交",details).add_theme_font_size_override("font_size",14)

## 使用真实宠物图集展示选项，领养确认后不可替换伙伴。
func _adoption() -> void:
	title.text="领养伙伴"
	var species:=OptionButton.new(); species.add_item("猫"); species.add_item("狗"); body.add_child(species)
	var name:=LineEdit.new(); name.placeholder_text="伙伴名字（1–12 个字符）"; name.text="团子"; name.max_length=12; body.add_child(name)
	_button("确认领养",body,_adopt.bind(species,name))

## 读取当前控件值发出唯一领养命令，不以界面选项替代领域验证。
func _adopt(species: OptionButton, name: LineEdit) -> void:
	var result:=await session.dispatch({"type":"adopt-pet","species":"cat" if species.selected==0 else "dog","name":name.text})
	if result.get("tone")=="success": close()

## 构建钓鱼控制，按钮释放与失焦都停止收线输入。
func _fishing_menu() -> void:
	title.text=_fishing_title()
	fish_label=_label("按住蓄力，松手抛竿。",body)
	fish_progress=ProgressBar.new(); fish_progress.custom_minimum_size.y=18; body.add_child(fish_progress)
	_label("鱼线张力 · 安全范围 22–78",body)
	fish_tension=ProgressBar.new(); fish_tension.custom_minimum_size.y=18; body.add_child(fish_tension)
	var button:=_button("按住 / 松开",body,func():pass)
	button.custom_minimum_size.y=48
	button.button_down.connect(_fish_held.bind(true)); button.button_up.connect(_fish_held.bind(false)); button.focus_exited.connect(_fish_held.bind(false))

## 根据当前钓位水域返回菜单标题；未知水域保留旧湖岸文案。
func _fishing_title() -> String:
	if session==null or session.fishing.runtime.is_empty(): return "湖岸垂钓"
	var zone: Dictionary=session.world.zones.get(session.fishing.runtime.get("zoneId",""),{})
	return "河畔垂钓" if zone.get("fishHabitat","")=="town-river" else "湖岸垂钓"

## 钓鱼按住状态只进入临时状态机，不触发多次扣体力。
func _fish_held(held: bool) -> void:
	await session.dispatch({"type":"set-fishing-input","held":held})

## 修改本机总音量；声音设置独立于游戏进度。
func _volume(value: float, channel: String) -> void:
	audio.volume(channel,value/100.0)

## 创建执行命令的真实按钮，业务结果通过会话反馈返回。
func _command_button(text: String, parent: Node, command: Dictionary) -> Button:
	return _button(text,parent,_command.bind(command))

## 通用按钮命令回调，不吞掉错误或自行补发奖励。
func _command(command: Dictionary) -> void:
	await session.dispatch(command)

## 创建可键盘聚焦的文字按钮；回调必须由调用方明确提供。
func _button(text: String, parent: Node, callback: Callable) -> Button:
	var button:=Button.new(); button.text=text; button.custom_minimum_size.y=42; button.size_flags_vertical=Control.SIZE_SHRINK_CENTER; parent.add_child(button); button.pressed.connect(callback)
	button.focus_mode=Control.FOCUS_ALL
	return button

## 创建可换行标签，避免手机长文本撑宽弹窗。
func _label(text: String, parent: Node) -> Label:
	var label:=Label.new(); label.text=text; label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; label.size_flags_horizontal=Control.SIZE_EXPAND_FILL; label.custom_minimum_size.x=1; parent.add_child(label)
	return label

## 移除本次动态列表节点，先脱离布局再排队释放。
func _clear(parent: Node) -> void:
	for child: Node in parent.get_children(): parent.remove_child(child); child.queue_free()

## 统一清新田园主题，图标仍使用原素材；中文明确绑定字体。
func _theme() -> Theme:
	return FarmUITheme.create()

## 在桌面和手机保留可点击区域与独立滚动，不缩小整个游戏画布。
func _resize() -> void:
	_update_touch_controls()
	if root==null: return
	root.size=get_viewport().get_visible_rect().size
	backdrop.size=root.size
	var size:=root.size
	dialog_kicker.visible=size.y>=500
	title.add_theme_font_size_override("font_size",(40 if size.y>=500 else 30) if mode=="start" else (26 if size.y>=500 else 22))
	dialog_margin.add_theme_constant_override("margin_top",12 if size.y>=500 else 6); dialog_margin.add_theme_constant_override("margin_bottom",12 if size.y>=500 else 6)
	var inventory_surface:=mode in ["inventory","chest","shipping","crafting"]
	var side_margin:=4 if inventory_surface and size.x<360 else 8 if inventory_surface and size.x<800 else 24
	dialog_margin.add_theme_constant_override("margin_left",side_margin); dialog_margin.add_theme_constant_override("margin_right",side_margin)
	for grid: Node in body.find_children("*","GridContainer",true,false):
		if grid.has_meta("slot_grid"): grid.columns=12 if size.x>=800 else 6
		elif grid.has_meta("responsive_columns"): grid.columns=2 if size.x>=620 else 1
		elif grid.has_meta("appearance_options"): grid.columns=4 if size.x>=800 else 2
	if is_instance_valid(recipe_list_scroll): recipe_list_scroll.custom_minimum_size.y=minf(156,maxf(48,ceili(float(session.snapshot().knownRecipes.size())/(2 if size.x>=620 else 1))*50))
	header.size=Vector2(size.x,112)
	var compact_hud:=size.x<680
	var status_width:=minf(220,size.x-110) if compact_hud else 220.0
	status_panel.position=Vector2(size.x-status_width-12,12)
	if mode=="fishing" and size.x>=800 and size.y<560: status_panel.position=Vector2(12,12)
	status_panel.size=Vector2(status_width,102)
	status_panel.set_deferred("size",Vector2(status_width,102))
	hud_menu.position=Vector2(12,12); hud_menu.columns=1 if compact_hud else 3; hud_menu.get_child(1).visible=not compact_hud
	hud_menu.set_deferred("size",Vector2.ZERO)
	location_label.position=Vector2(16,112 if compact_hud else 64); location_label.size=Vector2(200,24); location_label.visible=not compact_hud
	var compact:=size.x<680
	hotbar.columns=6 if compact else 12; hotbar_hint.visible=not compact
	var bar_width:=minf(366 if compact else 676,size.x-24)
	var bar_height:=151.0 if compact else 96.0
	toolbar.position=Vector2((size.x-bar_width)/2,size.y-bar_height-12); toolbar.size=Vector2(bar_width,bar_height)
	# 网格换列后再应用目标尺寸，避免横竖屏切换遗留旧的最小宽度。
	toolbar.set_deferred("size",Vector2(bar_width,bar_height))
	touch.position=Vector2(12,toolbar.position.y-96); actions.position=Vector2(size.x-140,toolbar.position.y-96)
	energy_panel.position=Vector2(size.x-44,toolbar.position.y-116); energy_panel.size=Vector2(32,112)
	message_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM); message_panel.grow_vertical=Control.GROW_DIRECTION_BEGIN
	var message_width:=minf(320,size.x-24)
	message_panel.offset_left=-message_width/2.0; message_panel.offset_right=message_width/2.0
	message_panel.offset_bottom=-(bar_height+(24 if size.x>=640 else 128)); message_panel.offset_top=message_panel.offset_bottom-32
	var preferred_width:=1000.0
	var preferred_height:=620.0
	if mode in ["start","confirm-new","confirm-demolish","sleep","gift","adoption","backpack-upgrade","audio"]: preferred_width=640; preferred_height=360
	if mode=="start": preferred_width=540; preferred_height=600
	elif mode=="menu": preferred_width=720; preferred_height=630
	elif mode=="calendar": preferred_width=680; preferred_height=590
	elif mode=="social": preferred_width=740; preferred_height=650
	elif mode in ["appearance-new","appearance"]: preferred_width=850; preferred_height=560 if size.x>=800 else 740
	elif mode=="scarecrow": preferred_width=460; preferred_height=220
	elif mode=="skills": preferred_width=760; preferred_height=620
	elif mode=="requests": preferred_width=680; preferred_height=520
	elif mode=="audio": preferred_height=450
	elif mode=="dialogue":
		preferred_width=680
		preferred_height=620 if dialogue_result.get("shopAvailable",false) else 520 if inspect_id.contains("notice") or inspect_id.contains("board") else 300
	elif mode=="crafting":
		preferred_width=850
		preferred_height=minf(700,280+session.snapshot().knownRecipes.size()*100+ceili(float(session.snapshot().inventoryCapacity)/(12 if size.x>=800 else 6))*55)
	elif mode=="fishing": preferred_width=330 if size.x>=800 and size.y<560 else 520; preferred_height=300
	elif mode=="inventory":
		var columns:=12 if size.x>=800 else 6
		preferred_width=850; preferred_height=530+ceili(float(session.snapshot().get("inventoryCapacity",12))/columns)*55
	elif mode=="report":
		var report: Dictionary=session.snapshot().get("unacknowledgedShippingReport",{})
		var lines:=0
		for category: Dictionary in report.get("categories",[]): lines+=category.entries.size()+1
		lines+=report.get("skillUpgrades",[]).size()+report.get("recipeUnlocks",[]).size()+report.get("professionChoices",[]).size()*4
		var crow_report: Dictionary=report.get("crows",{})
		lines+=int(crow_report.get("scared",0)>0)+int(not crow_report.get("lost",[]).is_empty())
		var fence_events: Dictionary=session.day_summary.get("fenceEvents",{}) if not session.day_summary.is_empty() else {}
		lines+=int(int(fence_events.get("damaged",0))>0)+int(int(fence_events.get("vanished",0))>0)
		preferred_width=760; preferred_height=minf(660,410+lines*28)
	var dialog_size:=Vector2(minf(preferred_width,size.x-(12 if inventory_surface else 20)),minf(preferred_height,size.y-24))
	var dialog_position: Vector2=(size-dialog_size)/2
	if mode=="fishing": dialog_position=Vector2(size.x-dialog_size.x-12,12) if size.x>=800 and size.y<560 else Vector2((size.x-dialog_size.x)/2,size.y-dialog_size.y-12)
	dialog.size=dialog_size; dialog.position=dialog_position
	# 等待网格最小尺寸更新后再次应用目标宽度，避免横屏切竖屏时保留旧的宽面板。
	dialog.set_deferred("size",dialog_size); dialog.set_deferred("position",dialog_position)
	var saving_size:=Vector2(minf(420,size.x-24),140)
	saving.size=saving_size; saving.position=(size-saving_size)/2
	# 错误文本初次换行会暂时撑高容器；布局完成后恢复目标尺寸，保证重试按钮留在屏内。
	saving.set_deferred("size",saving_size); saving.set_deferred("position",(size-saving_size)/2)
	placement_controls.position=Vector2(12,toolbar.position.y-56)

## 返回钓鱼面板之外的人物与水面展示区；矮横屏用左侧，其它尺寸用面板上方。
func fishing_view_rect() -> Rect2:
	var top:=maxf(status_panel.get_rect().end.y,hud_menu.get_rect().end.y)+8
	if root.size.x>=800 and root.size.y<560: return Rect2(12,top,maxf(1,dialog.position.x-24),maxf(1,root.size.y-top-12))
	return Rect2(12,top,root.size.x-24,maxf(1,dialog.position.y-top-12))

## 返回容纳指定房间尺寸的可用屏幕矩形；横屏可利用两侧操作键之间的空间，不包含临时提示或弹窗。
func room_view_rect(room_size: Vector2) -> Rect2:
	var top:=maxf(status_panel.get_rect().end.y,hud_menu.get_rect().end.y)+8
	var controls_top:=minf(touch.position.y,energy_panel.position.y)-8
	var above:=Rect2(Vector2(12,top),Vector2(root.size.x-24,maxf(1,controls_top-top)))
	var left:=touch.get_rect().end.x+12
	var right:=minf(actions.position.x,energy_panel.position.x)-12
	var between:=Rect2(Vector2(left,top),Vector2(maxf(1,right-left),maxf(1,toolbar.position.y-8-top)))
	var above_scale:=minf(above.size.x/room_size.x,above.size.y/room_size.y)
	var between_scale:=minf(between.size.x/room_size.x,between.size.y/room_size.y)
	return between if between_scale>above_scale else above

## Esc/E 保持菜单取消与关闭顺序，Tab 留给弹窗内正常键盘导航。
func _unhandled_key_input(event: InputEvent) -> void:
	if session==null or not event is InputEventKey or not event.pressed or event.echo: return
	if event.keycode==KEY_ESCAPE:
		if mode=="" and session.active: _open("menu")
		else: close()
		get_viewport().set_input_as_handled()
	elif event.keycode==KEY_E and session.active:
		if mode=="": _open("inventory")
		elif mode=="inventory": close()
		get_viewport().set_input_as_handled()
