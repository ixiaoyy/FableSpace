extends SceneTree
## 校验当前直接映射内容使用星露谷官方简体中文名；只读取内容与源码，不访问玩家存档。

var failures: Array[String]=[]
var checks:=0

## 场景树初始化后执行只读命名检查。
func _initialize() -> void: _run.call_deferred()

## 记录一个命名断言及其可定位标签。
func expect(condition: bool, label: String) -> void:
	checks+=1
	if not condition: failures.append(label)

## 核对物品、配方、技能、职业和当前运行文本，失败以非零退出。
func _run() -> void:
	var rules: Dictionary=JSON.parse_string(FileAccess.get_file_as_string("res://data/rules.json"))
	var items: Dictionary={
		"wood":"木材","axe":"斧头","hoe":"锄头","pickaxe":"十字镐","scythe":"镰刀","stone":"石头","fiber":"纤维","watering-can":"喷壶",
		"parsnip-seed":"防风草种子","parsnip":"防风草","kale-seed":"甘蓝种子","kale":"甘蓝菜","cauliflower-seed":"花椰菜种子","cauliflower":"花椰菜",
		"wild-horseradish":"野山葵","daffodil":"黄水仙","leek":"韭葱","dandelion":"蒲公英","spring-seeds":"春季种子","maple-seed":"枫树种子","acorn":"橡子","pine-cone":"松果","field-snack":"工作小食",
		"bean-starter":"青豆种子","green-bean":"青豆","potato-seed":"土豆种子","potato":"土豆","jazz-seed":"蓝爵士种子","blue-jazz":"蓝爵士","fishing-rod":"竹鱼竿",
		"lake-carp":"鲤鱼","silver-minnow":"鲢鱼","rain-loach":"西鲱","wind-dace":"小嘴鲈鱼","dusk-perch":"鲷鱼","jade-bream":"大嘴鲈鱼","chest":"宝箱","coal":"煤炭","scarecrow":"稻草人","sap":"树液","basic-fertilizer":"初级肥料","basic-retaining-soil":"初级保湿土",
	}
	for id: String in items: expect(rules.items[id].name==items[id],"物品 "+id)
	var recipes: Dictionary={"chest":"宝箱","scarecrow":"稻草人","spring-seeds":"野生种子（春季）","field-snack":"工作小食","basic-fertilizer":"初级肥料","basic-retaining-soil":"初级保湿土"}
	for id: String in recipes: expect(rules.recipes[id].name==recipes[id],"配方 "+id)
	expect(FarmSkillRules.NAMES=={"farming":"耕种","foraging":"采集","mining":"采矿","fishing":"钓鱼"},"技能名称")
	expect(FarmSkillRules.PROFESSION_DETAILS.forester.name=="护林人" and FarmSkillRules.PROFESSION_DETAILS.gatherer.name=="收集者","职业名称")
	expect(FarmQualityRules.LABELS=={0:"普通",1:"银星",2:"金星",4:"铱星"},"品质名称")
	var legacy: Array[String]=["异星木材","石料","植物纤维","木斧","基础镐","基础镰刀","水壶","竹制鱼竿","普通箱","羽衣甘蓝","野外小吃","基础肥料","豆苗","湖鲫","银鲦","雨鳅","风鲌","暮鲈","青鳞鱼","采集者","生活技能"]
	var current_text: String=""
	for path: String in ["res://data/rules.json","res://data/dialogues.json","res://domain/game_session.gd","res://domain/resource_rules.gd","res://ui/game_ui.gd"]: current_text+=FileAccess.get_file_as_string(path)
	for term: String in legacy: expect(term not in current_text,"旧显示名 "+term)
	for failure: String in failures: push_error(failure)
	print("Stardew naming checks: %d/%d passed"%[checks-failures.size(),checks])
	quit(0 if failures.is_empty() else 1)
