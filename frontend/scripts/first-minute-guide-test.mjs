import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const helperSource = readFileSync(resolve(__dirname, "../app/lib/tavern-first-minute.ts"), "utf8")
const discoverSource = readFileSync(resolve(__dirname, "../app/routes/discover.tsx"), "utf8")
const soulLinkSource = readFileSync(resolve(__dirname, "../app/components/soul-link-reference-artboards.tsx"), "utf8")
const previewSource = readFileSync(resolve(__dirname, "../app/components/tavern-preview-modal.tsx"), "utf8")
const workbenchSource = readFileSync(resolve(__dirname, "../app/features/tavern-chat-workbench/index.tsx"), "utf8")
const createRouteSource = readFileSync(resolve(__dirname, "../app/routes/create.tsx"), "utf8")
const legacyCreateSource = readFileSync(resolve(__dirname, "../app/product/TavernCreatePanel.jsx"), "utf8")
const packageSource = readFileSync(resolve(__dirname, "../package.json"), "utf8")

assert.ok(helperSource.includes("export function buildTavernFirstMinuteGuide"), "first-minute guide helper should be centralized")
assert.ok(helperSource.includes("formatTavernAnchorLocation"), "guide should be derived from the existing real-anchor helper")
assert.ok(helperSource.includes("derivePlaceTypeDisplay"), "guide should reuse place type semantics")
assert.ok(helperSource.includes("deriveSpecialTavernTypeDisplay"), "guide should reuse special tavern type semantics")
assert.ok(!helperSource.includes("readApiJson") && !helperSource.includes("jsonInit"), "guide helper must not call APIs or mutate taverns")

assert.ok(discoverSource.includes("getTavernFirstMinuteSearchText"), "discover search should include first-minute guide text")
assert.ok(discoverSource.includes('data-first-minute-guide="discover-card"'), "discover cards should expose visitor first-minute guidance")
assert.ok(discoverSource.includes('data-first-minute-guide="radar-compact"'), "compact radar cards should expose why-here proof")

assert.ok(soulLinkSource.includes('data-first-minute-guide="soul-link-discover-card"'), "shared SoulLink desktop cards should show first-minute guidance")
assert.ok(soulLinkSource.includes('data-first-minute-guide="soul-link-mobile-card"'), "shared SoulLink mobile cards should show first-minute guidance")
assert.ok(soulLinkSource.includes("Why here · {card.experienceType}"), "SoulLink cards should label the experience type")

assert.ok(previewSource.includes('data-first-minute-guide="preview-modal"'), "preview modal should explain why the tavern belongs here")
assert.ok(workbenchSource.includes('data-first-minute-guide="tavern-workbench"'), "tavern workbench should include an in-chat first-minute guide")
assert.ok(workbenchSource.includes("setMessage(prompt)"), "first-minute prompts should be actionable and fill the composer")

assert.ok(createRouteSource.includes('data-first-minute-authoring-guide="create-route"'), "new create route should nudge owners to author why-here content")
assert.ok(legacyCreateSource.includes('data-first-minute-authoring-guide="legacy-create-panel"'), "legacy create panel should keep the same authoring nudge")
assert.ok(createRouteSource.includes("反“地图聊天室”检查"), "create route should explicitly guard against coordinate-tagged generic chat")

assert.ok(packageSource.includes("first-minute-guide-test.mjs"), "package test chain should include first-minute guide regression")

console.log("first-minute-guide-test: ok")
