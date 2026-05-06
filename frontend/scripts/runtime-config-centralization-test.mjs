import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(__dirname, "../app")

function source(path) {
  return readFileSync(resolve(appRoot, path), "utf8")
}

const runtimeConfigPath = resolve(appRoot, "lib/tavern-runtime-config.js")
const portraitConfigPath = resolve(appRoot, "features/tavern-npc-stage/portraitCatalogConfig.ts")

assert.ok(existsSync(runtimeConfigPath), "frontend runtime config should centralize identity helpers, newcomer tavern, NPC asset aliases, and atmosphere fallbacks")
assert.ok(existsSync(portraitConfigPath), "NPC portrait catalog config should be separated from matching logic")

const tavernsSource = source("lib/taverns.ts")
assert.ok(tavernsSource.includes("getOrCreateVisitorIdentity"), "taverns API client should use stable anonymous visitor identity helper from runtime config")
assert.ok(tavernsSource.includes('DEFAULT_OWNER_ID: string = ""'), "taverns API client should not default owner operations to a shared demo owner")
assert.ok(!tavernsSource.includes('"owner-demo"'), "owner-demo literal should not live in the API client")
assert.ok(!tavernsSource.includes('"visitor-demo"'), "visitor-demo literal should not live in the API client")

const newcomerSource = source("product/services/newcomerTavern.js")
assert.ok(newcomerSource.includes("NEWCOMER_TAVERN_CONFIG"), "newcomer resolver should import its default tavern config")
assert.ok(!newcomerSource.includes("'pw_lantern_helpdesk'"), "newcomer tavern ID should not be locally hardcoded")

const atmosphereSource = source("product/services/atmosphereAssets.js")
assert.ok(atmosphereSource.includes("TAVERN_ATMOSPHERE_CONFIG"), "atmosphere resolver should import its mapping config")
assert.ok(!atmosphereSource.includes("const ATMOSPHERE_BY_TYPE"), "atmosphere type map should not live in resolver logic")

const homepageSource = source("lib/homepage-taverns.ts")
assert.ok(homepageSource.includes("FALLBACK_ATMOSPHERE_IMAGES"), "homepage cover fallback pool should be imported from runtime config")
assert.ok(!homepageSource.includes("const FALLBACK_ATMOSPHERE_IMAGES"), "homepage helper should not keep a local fallback image pool")

const workbenchSource = source("features/tavern-chat-workbench/index.tsx")
assert.ok(workbenchSource.includes("normalizePublicWelfareNpcAssetPath"), "chat workbench should reuse the shared NPC asset path normalizer")
assert.ok(!workbenchSource.includes("const NPC_EXPRESSION_PREVIEW_KEYS"), "chat workbench should not own expression preview config")


const homeSource = source("routes/home.tsx")
assert.ok(homeSource.includes("HOMEPAGE_NPC_PREVIEW_PORTRAITS"), "homepage NPC preview portraits should come from the shared portrait config")
assert.ok(!homeSource.includes("npc-style-cast/portraits"), "homepage should not directly hardcode NPC portrait asset imports")


const createSource = source("routes/create.tsx")
const entryPanelSource = source("product/TavernEntryPanel.jsx")
assert.ok(createSource.includes("DEFAULT_NPC_PREVIEW_PORTRAIT"), "create route NPC example should use shared portrait config")
assert.ok(entryPanelSource.includes("DEFAULT_NPC_PREVIEW_PORTRAIT"), "entry panel NPC fallback should use shared portrait config")
assert.ok(!createSource.includes("npc-style-cast/portraits"), "create route should not directly hardcode NPC portrait imports")
assert.ok(!entryPanelSource.includes("npc-style-cast/portraits"), "entry panel should not directly hardcode NPC portrait imports")

const portraitSource = source("features/tavern-npc-stage/portraitCatalog.ts")
assert.ok(portraitSource.includes("NPC_PORTRAIT_CATALOG"), "portrait matcher should import the shared portrait catalog config")
assert.ok(!portraitSource.includes("const NPC_CHARACTER_PORTRAITS"), "character-specific portrait overrides should not live in matcher logic")

console.log("runtime-config-centralization-test: ok")
