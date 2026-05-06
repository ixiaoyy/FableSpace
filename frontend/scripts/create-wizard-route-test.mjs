import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const route = readFileSync(resolve(__dirname, "../app/routes/create.tsx"), "utf8")
const packageJson = readFileSync(resolve(__dirname, "../package.json"), "utf8")

assert.ok(route.includes("CREATE_WIZARD_STEPS"), "create route should define route-level wizard step metadata")
assert.ok(route.includes('aria-label="创建酒馆分步向导"'), "create route should render an accessible wizard stepper")
assert.ok(route.includes("data-create-wizard-step"), "create route should map form sections to explicit wizard steps")
assert.ok(route.includes("min-h-11 touch-manipulation"), "wizard controls should keep mobile-safe touch targets")
assert.ok(route.includes("店主确认后开门"), "wizard should end with owner-confirmed publish/open-door language")
assert.ok(route.includes("AI 草稿只进入可编辑表单"), "AI draft copy must say drafts only fill editable form fields")
assert.ok(route.includes('name="place_type"'), "wizard must preserve existing place_type form payload")
assert.ok(route.includes("真实坐标"), "wizard should keep real coordinates as a first-class requirement")
assert.ok(route.includes('data-create-live-preview'), "right rail should expose a live preview marker for place-type changes")
assert.ok(route.includes('data-active-place-type-preview'), "right rail should mark the active place type preview card")
assert.ok(route.includes("activePlaceType.label"), "right rail should render the selected place type label")
assert.ok(route.includes("activePlaceType.tone"), "right rail should render the selected place type tone")
assert.ok(route.includes("activePlaceType.description"), "right rail should render the selected place type description")
assert.ok(route.includes("activePlaceType.shortLabel"), "right rail NPC/checklist copy should use the selected place type short label")
assert.ok(route.includes("activePlaceType.cardClass"), "right rail should reuse the selected place type visual class")
assert.ok(route.includes("activePlaceType.reserved"), "right rail should explain reserved/private place types")
assert.ok(!route.includes("用 AI 生成酒馆创意"), "AI draft helper should not stay hardcoded to tavern-only copy")
assert.ok(!route.includes('alt="赛博酒馆街景"'), "right preview image alt should not stay hardcoded to tavern-only copy")

const generateDraftStart = route.indexOf("async function handleGenerateDraft")
const submitStart = route.indexOf("async function handleSubmit")
assert.ok(generateDraftStart >= 0 && submitStart > generateDraftStart, "route should keep draft and submit handlers separate")
const generateDraftBody = route.slice(generateDraftStart, submitStart)
assert.ok(generateDraftBody.includes("generateTavernDraft"), "draft handler should call draft generation helper")
assert.ok(generateDraftBody.includes("applyDraft"), "draft handler should only apply generated text to the editable form")
assert.ok(!generateDraftBody.includes("createTavern("), "draft handler must not persist a tavern")
assert.ok(!generateDraftBody.includes("addCharacter("), "draft handler must not persist a character")

assert.ok(packageJson.includes("create-wizard-route-test.mjs"), "frontend test script should include the create wizard route guard")

console.log("create-wizard-route-test: ok")
