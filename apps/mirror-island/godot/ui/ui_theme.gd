class_name FarmUITheme
extends RefCounted
## 农场手册使用暖白纸、鼠尾草与木色描边，集中管理原生控件的全部交互状态。

const PAPER := "fff9eb"
const INK := "274d40"
const SAGE := "dce8d5"
const WOOD := "9b8869"
const MUTED := "5c6856"

## 创建独立主题并返回 Theme；无参数，沿用项目中文字体，只改变控件表现，不持有玩法状态。
static func create() -> Theme:
	var result := Theme.new()
	result.default_font = load("res://media/NotoSansCJKsc-Regular.otf")
	result.default_font_size = 16
	var ink := Color(INK)
	var paper_color := Color(PAPER)
	var muted := Color(MUTED)
	var panel := surface(PAPER, "b9b895", 1, 12)
	result.set_stylebox("panel", "PanelContainer", panel)
	result.set_stylebox("panel", "Panel", panel)
	for control_type: String in ["Label", "RichTextLabel", "TooltipLabel"]:
		result.set_color("font_color", control_type, ink)
		result.set_color("default_color", control_type, ink)
		result.set_color("font_shadow_color", control_type, Color.TRANSPARENT)
		result.set_color("font_outline_color", control_type, Color.TRANSPARENT)
		result.set_constant("outline_size", control_type, 0)
	result.set_font_size("font_size", "TooltipLabel", 14)
	result.set_constant("line_spacing", "Label", 3)
	result.set_constant("separation", "VBoxContainer", 10)
	result.set_constant("separation", "HBoxContainer", 8)
	result.set_constant("h_separation", "GridContainer", 8)
	result.set_constant("v_separation", "GridContainer", 8)

	var normal := surface("f4eedb", WOOD, 1, 12)
	normal.border_width_bottom = 3
	normal.content_margin_top = 8
	normal.content_margin_bottom = 10
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color(SAGE)
	hover.border_color = Color("728b64")
	var pressed := normal.duplicate() as StyleBoxFlat
	pressed.bg_color = Color("385e49")
	pressed.border_color = Color(INK)
	pressed.border_width_top = 2
	pressed.border_width_bottom = 1
	pressed.content_margin_top = 10
	pressed.content_margin_bottom = 8
	var hover_pressed := pressed.duplicate() as StyleBoxFlat
	hover_pressed.bg_color = Color("426c53")
	var disabled := normal.duplicate() as StyleBoxFlat
	disabled.bg_color = Color("e8e6d8")
	disabled.border_color = Color("b8b7a3")
	disabled.border_width_bottom = 1
	var focus := surface("00000000", INK, 2, 0)
	focus.draw_center = false
	focus.set_expand_margin_all(3)
	for control_type: String in ["Button", "OptionButton", "CheckButton", "CheckBox"]:
		result.set_stylebox("normal", control_type, normal)
		result.set_stylebox("hover", control_type, hover)
		result.set_stylebox("pressed", control_type, pressed)
		result.set_stylebox("hover_pressed", control_type, hover_pressed)
		result.set_stylebox("disabled", control_type, disabled)
		result.set_stylebox("focus", control_type, focus)
		result.set_color("font_color", control_type, ink)
		result.set_color("font_hover_color", control_type, ink)
		result.set_color("font_focus_color", control_type, ink)
		result.set_color("font_pressed_color", control_type, paper_color)
		result.set_color("font_hover_pressed_color", control_type, paper_color)
		result.set_color("font_disabled_color", control_type, muted)
		result.set_color("font_outline_color", control_type, Color.TRANSPARENT)
		# 物品与工具按钮保留素材原色；下拉箭头和开关继续使用文字同色。
		var icon_normal := Color.WHITE if control_type == "Button" else ink
		var icon_pressed := Color.WHITE if control_type == "Button" else paper_color
		var icon_disabled := Color(1, 1, 1, 0.55) if control_type == "Button" else muted
		result.set_color("icon_normal_color", control_type, icon_normal)
		result.set_color("icon_hover_color", control_type, icon_normal)
		result.set_color("icon_focus_color", control_type, icon_normal)
		result.set_color("icon_pressed_color", control_type, icon_pressed)
		result.set_color("icon_hover_pressed_color", control_type, icon_pressed)
		result.set_color("icon_disabled_color", control_type, icon_disabled)
		result.set_constant("outline_size", control_type, 0)
		result.set_constant("h_separation", control_type, 8)
	result.set_constant("arrow_margin", "OptionButton", 12)
	result.set_constant("modulate_arrow", "OptionButton", 1)
	result.set_color("button_checked_color", "CheckButton", Color("e6cf8d"))
	result.set_color("button_unchecked_color", "CheckButton", ink)

	var input := surface("fffdf5", "8c9c7d", 1, 12)
	input.content_margin_top = 9
	input.content_margin_bottom = 9
	result.set_stylebox("normal", "LineEdit", input)
	result.set_stylebox("read_only", "LineEdit", disabled)
	result.set_stylebox("focus", "LineEdit", focus)
	result.set_color("font_color", "LineEdit", ink)
	result.set_color("font_uneditable_color", "LineEdit", muted)
	result.set_color("font_placeholder_color", "LineEdit", muted)
	result.set_color("font_selected_color", "LineEdit", paper_color)
	result.set_color("selection_color", "LineEdit", Color("426c53"))
	result.set_color("caret_color", "LineEdit", ink)
	result.set_color("clear_button_color", "LineEdit", muted)
	result.set_color("clear_button_color_pressed", "LineEdit", ink)
	result.set_constant("caret_width", "LineEdit", 2)
	result.set_constant("outline_size", "LineEdit", 0)

	result.set_stylebox("panel", "PopupMenu", surface(PAPER, WOOD, 1, 8))
	result.set_stylebox("hover", "PopupMenu", surface(SAGE, "a5b98f", 0, 8))
	result.set_color("font_color", "PopupMenu", ink)
	result.set_color("font_hover_color", "PopupMenu", ink)
	result.set_color("font_disabled_color", "PopupMenu", muted)
	result.set_color("font_accelerator_color", "PopupMenu", muted)
	result.set_color("font_separator_color", "PopupMenu", muted)
	result.set_constant("v_separation", "PopupMenu", 12)
	result.set_constant("h_separation", "PopupMenu", 10)
	result.set_constant("item_start_padding", "PopupMenu", 8)
	result.set_constant("item_end_padding", "PopupMenu", 8)
	result.set_stylebox("panel", "TooltipPanel", surface(PAPER, WOOD, 1, 10))

	var separator := StyleBoxLine.new()
	separator.color = Color("cfceaf")
	separator.thickness = 1
	result.set_stylebox("separator", "HSeparator", separator)
	result.set_constant("separation", "HSeparator", 8)
	for style_name: String in ["separator", "labeled_separator_left", "labeled_separator_right"]:
		result.set_stylebox(style_name, "PopupMenu", separator)

	var progress_track := surface("e3e5d2", "b4b89c", 1, 0)
	var progress_fill := surface("a7c58e", "7c9b65", 1, 0)
	progress_track.set_corner_radius_all(4)
	progress_fill.set_corner_radius_all(4)
	result.set_stylebox("background", "ProgressBar", progress_track)
	result.set_stylebox("fill", "ProgressBar", progress_fill)
	result.set_color("font_color", "ProgressBar", ink)
	result.set_color("font_outline_color", "ProgressBar", Color.TRANSPARENT)
	result.set_constant("outline_size", "ProgressBar", 0)
	result.set_font_size("font_size", "ProgressBar", 13)

	for control_type: String in ["HSlider", "VSlider"]:
		var slider_track := surface("dfe4ce", "a7b18e", 1, 3)
		var slider_fill := surface("8ba876", "66835a", 1, 3)
		var slider_active := surface("75966a", "426c53", 1, 3)
		result.set_stylebox("slider", control_type, slider_track)
		result.set_stylebox("grabber_area", control_type, slider_fill)
		result.set_stylebox("grabber_area_highlight", control_type, slider_active)
		result.set_constant("grabber_offset", control_type, 0)
		for state: String in ["grabber", "grabber_highlight", "grabber_disabled"]:
			var thumb := GradientTexture2D.new()
			thumb.width = 20 if control_type == "HSlider" else 24
			thumb.height = 24 if control_type == "HSlider" else 20
			thumb.fill = GradientTexture2D.FILL_SQUARE
			thumb.fill_from = Vector2(0.5, 0.5)
			thumb.fill_to = Vector2(1, 0.5)
			var gradient := Gradient.new()
			var edge := Color(INK) if state == "grabber_highlight" else Color(WOOD)
			var face := Color("ecd6a0") if state == "grabber_highlight" else paper_color
			if state == "grabber_disabled":
				edge = Color("8c947a")
				face = Color("d8ddc8")
			gradient.interpolation_mode = Gradient.GRADIENT_INTERPOLATE_CONSTANT
			gradient.offsets = PackedFloat32Array([0.0, 0.64, 0.82, 1.0])
			gradient.colors = PackedColorArray([face, edge, Color.TRANSPARENT, Color.TRANSPARENT])
			thumb.gradient = gradient
			result.set_icon(state, control_type, thumb)

	for control_type: String in ["HScrollBar", "VScrollBar"]:
		var scroll_track := surface("e9eadb", "e9eadb", 0, 5)
		var scroll_thumb := surface("a6b394", "879878", 1, 5)
		var scroll_hover := surface("839c70", "607f55", 1, 5)
		var scroll_pressed := surface("53754e", "426343", 1, 5)
		result.set_stylebox("scroll", control_type, scroll_track)
		result.set_stylebox("scroll_focus", control_type, surface("e9eadb", INK, 2, 5))
		result.set_stylebox("grabber", control_type, scroll_thumb)
		result.set_stylebox("grabber_highlight", control_type, scroll_hover)
		result.set_stylebox("grabber_pressed", control_type, scroll_pressed)
	return result

## 返回独立平面样式；background/border 为 HTML 色值，border_width 为描边像素，inset 为四边内距，不改变控件尺寸或玩法状态。
static func surface(background: String, border: String, border_width: int = 1, inset: int = 12) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(background)
	style.border_color = Color(border)
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(6)
	style.content_margin_left = inset
	style.content_margin_right = inset
	style.content_margin_top = inset
	style.content_margin_bottom = inset
	style.anti_aliasing = false
	return style
