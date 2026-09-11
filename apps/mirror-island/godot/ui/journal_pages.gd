class_name FarmJournalPages
extends RefCounted
## 生活手册的只读页面；沿用游戏界面的导航和资源，不拥有玩法状态。

const PAPER := Color("fff9eb")
const INK := Color("274d40")
const MUTED := Color("5e715b")
const SAGE := Color("dce8d5")
const LINE := Color("d6d5bc")
const GOLD := Color("bd8b42")

## 构建生活手册入口；state 只决定日期和领养入口，所有导航仍交给原界面。
static func menu(ui: FarmGameUI, state: Dictionary) -> void:
	ui.title.text="岛上生活"
	ui.body.add_theme_constant_override("separation",10)
	var introduction:=ui._label("第 %d 天，留一点时间给自己的生活。"%int(state.day),ui.body)
	introduction.add_theme_color_override("font_color",MUTED)
	_section(ui,"日常",ui.body)
	var daily:=_columns(ui.body,ui.root.size.x,560)
	_menu_entry(ui,daily,"随身背包","整理物品，准备今天的出行。","inventory","chest",true)
	_menu_entry(ui,daily,"制作","查看配方，把材料变成新物件。","crafting","wood",true)
	_menu_entry(ui,daily,"日历","看看日子，记住明天的天气。","calendar","",false)
	_menu_entry(ui,daily,"技能","每一次劳动，都在慢慢积累。","skills","watering-can",false)
	_section(ui,"岛上生活",ui.body)
	var island:=_columns(ui.body,ui.root.size.x,560)
	_menu_entry(ui,island,"居民名册","记住邻居，也记住每一份心意。","social","",false)
	_menu_entry(ui,island,"今日目标与委托","看看今天可以帮上什么忙。","requests","",false)
	_menu_entry(ui,island,"外观","换一身适合今天的打扮。","appearance","",false)
	if int(state.day)>=2 and state.pet==null:
		_menu_entry(ui,island,"领养伙伴","为小院迎接一位新伙伴。","adoption","",false)
	_section(ui,"设置",ui.body)
	var settings:=HFlowContainer.new()
	settings.add_theme_constant_override("h_separation",10)
	ui.body.add_child(settings)
	ui._button("声音",settings,ui._open.bind("audio"))
	ui._button("鸣谢与许可证",settings,ui._open.bind("credits"))

## 绘制当前春季的二十八日历；日期和天气只投影已有快照，不补造节庆或未来事件。
static func calendar(ui: FarmGameUI, state: Dictionary) -> void:
	ui.title.text="日历"
	var summary:=HFlowContainer.new()
	summary.add_theme_constant_override("h_separation",12)
	summary.add_theme_constant_override("v_separation",8)
	ui.body.add_child(summary)
	_tag(ui,summary,"春季",SAGE,INK)
	_tag(ui,summary,"第 %d 天"%int(state.day),PAPER,INK)
	var weather_names: Dictionary={"sunny":"晴天","rain":"下雨","wind":"有风"}
	_tag(ui,summary,"明日 · "+str(weather_names[state.weather.next]),Color("eee4c9"),INK)
	var paper:=PanelContainer.new()
	paper.add_theme_stylebox_override("panel",_surface(PAPER,LINE,12))
	ui.body.add_child(paper)
	var days:=GridContainer.new()
	days.columns=7
	days.add_theme_constant_override("h_separation",4)
	days.add_theme_constant_override("v_separation",4)
	paper.add_child(days)
	for weekday: String in ["一","二","三","四","五","六","日"]:
		var label:=ui._label(weekday,days)
		label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
		label.custom_minimum_size.y=26
		label.add_theme_font_size_override("font_size",13)
		label.add_theme_color_override("font_color",MUTED)
	var today: int=(int(state.day)-1)%28+1
	for day: int in range(1,29):
		var selected:=day==today
		var cell:=PanelContainer.new()
		cell.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		cell.custom_minimum_size=Vector2(0,58)
		cell.add_theme_stylebox_override("panel",_surface(INK if selected else Color("f1eedf"),INK if selected else Color("f1eedf"),4))
		days.add_child(cell)
		var content:=VBoxContainer.new()
		content.add_theme_constant_override("separation",0)
		cell.add_child(content)
		var number:=ui._label(str(day),content)
		number.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
		number.add_theme_font_size_override("font_size",18)
		number.add_theme_color_override("font_color",PAPER if selected else INK)
		var caption:=ui._label("今天" if selected else "",content)
		caption.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
		caption.add_theme_font_size_override("font_size",11)
		caption.add_theme_color_override("font_color",SAGE if selected else MUTED)
	var note:=ui._label("当前可玩内容为春季。第 28 天后，仍可继续经营农场。",ui.body)
	note.add_theme_font_size_override("font_size",13)
	note.add_theme_color_override("font_color",MUTED)

## 展示居民与真实交往记录；好感、交谈和每周礼物均使用领域现有日期规则。
static func social(ui: FarmGameUI, state: Dictionary) -> void:
	ui.title.text="居民名册"
	var introduction:=ui._label("从打个招呼开始，慢慢熟悉岛上的每一个人。",ui.body)
	introduction.add_theme_color_override("font_color",MUTED)
	var profiles: Array=ui.session.rules.profiles
	var index:=0
	for profile: Dictionary in profiles:
		if index>0: _divider(ui.body)
		index+=1
		var friendship: Dictionary=state.friendships[profile.npcId]
		var name: String=ui.session.dialogues[profile.baseDialogueId].speaker
		var row:=HBoxContainer.new()
		row.add_theme_constant_override("separation",12)
		ui.body.add_child(row)
		var portrait:=PanelContainer.new()
		portrait.custom_minimum_size=Vector2(58,72)
		portrait.size_flags_vertical=Control.SIZE_SHRINK_BEGIN
		portrait.add_theme_stylebox_override("panel",_surface(SAGE,LINE,4))
		row.add_child(portrait)
		if ui.assets.media.regions.farm.npc.frames.has(profile.npcId):
			var sprite:=TextureRect.new()
			sprite.texture=ui.assets.npc_texture(profile.npcId)
			sprite.texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST
			sprite.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
			sprite.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			portrait.add_child(sprite)
		else:
			var initial:=ui._label(name.left(1),portrait)
			initial.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
			initial.vertical_alignment=VERTICAL_ALIGNMENT_CENTER
			initial.add_theme_font_size_override("font_size",24)
		var detail:=VBoxContainer.new()
		detail.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		detail.add_theme_constant_override("separation",5)
		row.add_child(detail)
		var heading:=HFlowContainer.new()
		heading.add_theme_constant_override("h_separation",12)
		detail.add_child(heading)
		var name_label:=ui._label(name,heading)
		name_label.autowrap_mode=TextServer.AUTOWRAP_OFF
		name_label.add_theme_font_size_override("font_size",18)
		var talked: bool=int(friendship.lastTalkedDay)==int(state.day)
		var talked_label:=ui._label("今日已交谈" if talked else "今日未交谈",heading)
		talked_label.autowrap_mode=TextServer.AUTOWRAP_OFF
		talked_label.add_theme_font_size_override("font_size",12)
		talked_label.add_theme_color_override("font_color",MUTED)
		var points:=int(friendship.points)
		_segments(detail,float(points)/250.0,10,Color("b87566"),Color("e8ded2"),8)
		var relationship:=ui._label("好感 %.1f / 10"%(float(points)/250.0),detail)
		relationship.add_theme_font_size_override("font_size",12)
		relationship.add_theme_color_override("font_color",MUTED)
		var week:=floori(float(state.day)/7.0)
		var gifts:=int(friendship.giftsThisWeek) if int(friendship.giftWeekIndex)==week else 0
		var gift_status: String="今日已送礼" if int(friendship.lastGiftDay)==int(state.day) else "今日未送礼"
		var gifts_label:=ui._label("本周礼物 %d / 2 · %s"%[gifts,gift_status],detail)
		gifts_label.add_theme_font_size_override("font_size",13)
		gifts_label.add_theme_color_override("font_color",INK)

## 展示四项已实现技能的等级、经验与职业；不预告未接入奖励，也不改变成长阈值。
static func skills(ui: FarmGameUI, state: Dictionary) -> void:
	ui.title.text="技能"
	var introduction:=ui._label("把日常的小事，慢慢做得更好。",ui.body)
	introduction.add_theme_color_override("font_color",MUTED)
	var definitions: Dictionary={
		"farming":{"icon":"watering-can","color":Color("6c9562"),"source":"收获作物","effect":"提高锄头与喷壶熟练度"},
		"foraging":{"icon":"axe","color":Color("5c968a"),"source":"地面野采、野种收获、伐木与清理树桩","effect":"提高斧头熟练度"},
		"mining":{"icon":"pickaxe","color":GOLD,"source":"开采地表石块","effect":"提高十字镐熟练度"},
		"fishing":{"icon":"fishing-rod","color":Color("668fa1"),"source":"成功钓获","effect":"提高竹鱼竿熟练度"},
	}
	var grid:=_columns(ui.body,ui.root.size.x,560)
	for id: String in FarmSkillRules.NAMES:
		var skill: Dictionary=state.skills[id]
		var definition: Dictionary=definitions[id]
		var paper:=PanelContainer.new()
		paper.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		paper.add_theme_stylebox_override("panel",_surface(Color("f5f0df"),LINE,12))
		grid.add_child(paper)
		var section:=VBoxContainer.new()
		section.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		section.add_theme_constant_override("separation",6)
		paper.add_child(section)
		var heading:=HBoxContainer.new()
		heading.add_theme_constant_override("separation",10)
		section.add_child(heading)
		_icon(ui,heading,definition.icon,34)
		var name:=ui._label(FarmSkillRules.NAMES[id],heading)
		name.add_theme_font_size_override("font_size",20)
		_tag(ui,heading,"%d 级"%int(skill.level),SAGE,INK)
		_segments(section,float(skill.level),10,definition.color,Color("e8e5d4"),10)
		var level:=int(skill.level)
		var base:=0 if level==0 else int(FarmSkillRules.THRESHOLDS[level-1])
		var target:=int(FarmSkillRules.THRESHOLDS[level]) if level<10 else base
		var progress:=ProgressBar.new()
		progress.custom_minimum_size.y=6
		progress.show_percentage=false
		progress.max_value=maxi(1,target-base)
		progress.value=int(skill.xp)-base if level<10 else progress.max_value
		progress.add_theme_stylebox_override("background",_bar_style(Color("e6e2cf")))
		progress.add_theme_stylebox_override("fill",_bar_style(definition.color))
		section.add_child(progress)
		var experience:=ui._label("本级经验 %d / %d · 还需 %d"%[int(skill.xp)-base,target-base,target-int(skill.xp)] if level<10 else "已达 10 级 · 累计经验 %d"%int(skill.xp),section)
		experience.add_theme_font_size_override("font_size",12)
		experience.add_theme_color_override("font_color",MUTED)
		var source:=ui._label(definition.source+" · "+definition.effect,section)
		source.add_theme_font_size_override("font_size",13)
		source.add_theme_color_override("font_color",INK)
		if not state.professions[id].is_empty():
			var profession: Dictionary=FarmSkillRules.PROFESSION_DETAILS[state.professions[id][0]]
			var profession_label:=ui._label("职业 · "+profession.name+"\n"+profession.description,section)
			profession_label.add_theme_font_size_override("font_size",13)
			profession_label.add_theme_color_override("font_color",INK)

## 为手册页面创建两列区域；宽度低于指定阈值时转单列，容器销毁会一并移除尺寸监听。
static func _columns(parent: Control, viewport_width: float, width_threshold: int) -> GridContainer:
	var grid:=GridContainer.new()
	grid.columns=2 if viewport_width>=width_threshold+64 else 1
	grid.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation",14)
	grid.add_theme_constant_override("v_separation",6)
	parent.add_child(grid)
	grid.resized.connect(_fit_columns.bind(grid,width_threshold))
	return grid

## 依据容器实际可用宽度调整页面列数；只更新布局，不读取或修改会话状态。
static func _fit_columns(grid: GridContainer, width_threshold: int) -> void:
	var columns:=2 if grid.size.x>=width_threshold else 1
	if grid.columns!=columns: grid.columns=columns

## 添加菜单入口并将说明放进提示；mode 是现有导航状态，图标仅使用已登记物品素材。
static func _menu_entry(ui: FarmGameUI, parent: Control, text: String, description: String, mode: String, item_id: String, featured: bool) -> void:
	var entry:=VBoxContainer.new()
	entry.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	parent.add_child(entry)
	var button:=ui._button(text,entry,ui._open.bind(mode))
	button.tooltip_text=description
	button.alignment=HORIZONTAL_ALIGNMENT_LEFT
	button.custom_minimum_size.y=44
	button.add_theme_stylebox_override("normal",_surface(INK if featured else Color("f0eedf"),INK if featured else LINE,10))
	button.add_theme_stylebox_override("hover",_surface(Color("38664f") if featured else SAGE,INK if featured else Color("a8b79b"),10))
	button.add_theme_color_override("font_color",PAPER if featured else INK)
	button.add_theme_color_override("font_hover_color",PAPER if featured else INK)
	button.add_theme_color_override("font_focus_color",PAPER if featured else INK)
	if item_id!="":
		button.icon=ui.assets.icon(item_id)
		button.expand_icon=true
		button.add_theme_constant_override("icon_max_width",25)
		button.add_theme_constant_override("h_separation",10)

## 创建小节标题和纸页分隔线；标题使用真实分组名，不新增交互或状态。
static func _section(ui: FarmGameUI, text: String, parent: Control) -> void:
	var heading:=HBoxContainer.new()
	heading.add_theme_constant_override("separation",6)
	parent.add_child(heading)
	var title:=ui._label(text,heading)
	title.autowrap_mode=TextServer.AUTOWRAP_OFF
	title.size_flags_horizontal=Control.SIZE_SHRINK_BEGIN
	title.add_theme_font_size_override("font_size",15)
	title.add_theme_color_override("font_color",INK)
	var rule:=HSeparator.new()
	rule.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	rule.size_flags_vertical=Control.SIZE_SHRINK_CENTER
	rule.add_theme_stylebox_override("separator",_bar_style(LINE))
	heading.add_child(rule)

## 添加居民条目间的细分隔；线条只用于列表结构，不表示任何数值。
static func _divider(parent: Control) -> void:
	var separator:=HSeparator.new()
	separator.custom_minimum_size.y=8
	separator.add_theme_stylebox_override("separator",_bar_style(LINE))
	parent.add_child(separator)

## 添加紧凑文字标记；颜色由调用方提供，文字保留完整状态含义。
static func _tag(ui: FarmGameUI, parent: Control, text: String, background: Color, foreground: Color) -> void:
	var tag:=PanelContainer.new()
	tag.size_flags_horizontal=Control.SIZE_SHRINK_BEGIN
	tag.size_flags_vertical=Control.SIZE_SHRINK_CENTER
	tag.add_theme_stylebox_override("panel",_surface(background,background,6))
	parent.add_child(tag)
	var label:=ui._label(text,tag)
	label.autowrap_mode=TextServer.AUTOWRAP_OFF
	label.add_theme_font_size_override("font_size",13)
	label.add_theme_color_override("font_color",foreground)

## 创建已有物品纹理的只读图标；size 为显示边长，不生成或改写素材。
static func _icon(ui: FarmGameUI, parent: Control, item_id: String, size: int) -> void:
	var icon:=TextureRect.new()
	icon.texture=ui.assets.icon(item_id)
	icon.texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST
	icon.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.custom_minimum_size=Vector2(size,size)
	icon.size_flags_vertical=Control.SIZE_SHRINK_CENTER
	parent.add_child(icon)

## 按实际数值绘制等宽进度分段；允许部分填充，只负责表现且始终限制在显示范围内。
static func _segments(parent: Control, value: float, count: int, fill: Color, background: Color, height: int) -> void:
	var segments:=HBoxContainer.new()
	segments.add_theme_constant_override("separation",4)
	parent.add_child(segments)
	for index: int in range(count):
		var segment:=ProgressBar.new()
		segment.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		segment.custom_minimum_size=Vector2(1,height)
		segment.show_percentage=false
		segment.max_value=1.0
		segment.value=clampf(value-float(index),0.0,1.0)
		segment.add_theme_stylebox_override("background",_bar_style(background))
		segment.add_theme_stylebox_override("fill",_bar_style(fill))
		segments.add_child(segment)

## 创建纸色控件表面；padding 仅影响内容边距，短直角保留像素世界的清晰边界。
static func _surface(background: Color, border: Color, padding: int) -> StyleBoxFlat:
	var style:=StyleBoxFlat.new()
	style.bg_color=background
	style.border_color=border
	style.set_border_width_all(1)
	style.set_corner_radius_all(2)
	style.content_margin_left=padding
	style.content_margin_right=padding
	style.content_margin_top=padding
	style.content_margin_bottom=padding
	return style

## 创建无边距的细线或进度底色；返回独立样式，避免多个控件共享可变填充值。
static func _bar_style(color: Color) -> StyleBoxFlat:
	var style:=StyleBoxFlat.new()
	style.bg_color=color
	style.content_margin_top=1
	style.content_margin_bottom=1
	return style
