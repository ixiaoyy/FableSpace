shader_type canvas_item;
// 只用于农场和小镇的纯草地底层，压低重复细纹反差，不影响上层道路、树木和水面。
uniform vec4 grass_color : source_color = vec4(0.58, 0.76, 0.36, 1.0);
void fragment() {
	COLOR.rgb = mix(COLOR.rgb, grass_color.rgb, 0.45);
}
