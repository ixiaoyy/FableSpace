export const GENDER_VALUES = ["unspecified", "female", "male", "nonbinary", "other"]

export const GENDER_OPTIONS = [
  { value: "unspecified", label: "未说明" },
  { value: "female", label: "女性" },
  { value: "male", label: "男性" },
  { value: "nonbinary", label: "非二元" },
  { value: "other", label: "其他" },
]

const GENDER_ALIASES = new Map([
  ["unspecified", "unspecified"],
  ["unknown", "unspecified"],
  ["none", "unspecified"],
  ["not-specified", "unspecified"],
  ["未说明", "unspecified"],
  ["不透露", "unspecified"],
  ["保密", "unspecified"],
  ["female", "female"],
  ["woman", "female"],
  ["girl", "female"],
  ["f", "female"],
  ["女", "female"],
  ["女性", "female"],
  ["女生", "female"],
  ["male", "male"],
  ["man", "male"],
  ["boy", "male"],
  ["m", "male"],
  ["男", "male"],
  ["男性", "male"],
  ["男生", "male"],
  ["nonbinary", "nonbinary"],
  ["non-binary", "nonbinary"],
  ["nb", "nonbinary"],
  ["非二元", "nonbinary"],
  ["非二元性别", "nonbinary"],
  ["other", "other"],
  ["其他", "other"],
  ["其它", "other"],
])

export function normalizeGender(value) {
  const raw = String(value || "").trim().toLowerCase()
  if (!raw) return "unspecified"
  const normalized = raw.replace(/_/g, "-").replace(/\s+/g, "-")
  const mapped = GENDER_ALIASES.get(normalized) || normalized
  return GENDER_VALUES.includes(mapped) ? mapped : "unspecified"
}

export function genderLabel(value) {
  const gender = normalizeGender(value)
  return GENDER_OPTIONS.find((option) => option.value === gender)?.label || "未说明"
}


