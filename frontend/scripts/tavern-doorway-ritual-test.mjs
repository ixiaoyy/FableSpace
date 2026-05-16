import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const workbench = readFileSync(resolve(root, "app/features/tavern-chat-workbench/index.tsx"), "utf8")
const firstMinute = readFileSync(resolve(root, "app/lib/tavern-first-minute.ts"), "utf8")

const startHandler = workbench.slice(workbench.indexOf("function handleDoorwayStartChat"), workbench.indexOf("async function handleStartGameplay"))

const checks = [
  [workbench.includes("data-tavern-doorway-ritual"), "doorway ritual marker exists"],
  [workbench.includes("data-doorway-map-anchor"), "map anchor is visible in doorway"],
  [workbench.includes("data-doorway-host-greeting"), "NPC greeting is visible in doorway"],
  [workbench.includes("data-doorway-start-chat"), "doorway CTA exists"],
  [workbench.includes("const shouldShowDoorway = !isOwner && !passwordLocked && !hasPassedDoorway"), "visitor doorway hides workbench until passed"],
  [workbench.includes("buildTavernFirstMinuteGuide(tavern)"), "doorway uses first-minute map copy"],
  [startHandler.includes("setHasPassedDoorway(true)"), "CTA advances past doorway"],
  [startHandler.includes("setMessage(doorwayStarterLine)"), "CTA only fills composer"],
  [!startHandler.includes("handleSubmit("), "CTA does not auto-send message"],
  [firstMinute.includes("进门先留意"), "whyHere copy is visitor-facing invitation"],
]

const failed = checks.filter(([ok]) => !ok)
if (failed.length) {
  console.error("Tavern doorway ritual checks failed:")
  for (const [, label] of failed) console.error(`- ${label}`)
  process.exit(1)
}

console.log("tavern-doorway-ritual-test: PASS")
