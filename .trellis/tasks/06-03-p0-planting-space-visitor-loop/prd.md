# P0 Planting Space Visitor Loop — Brainstorm PRD

## 1. Product intent

User idea: build a planting-type visitor experience where visitors can farm a small plot: buy seeds, clear grass, water, fertilize, wait for crops to mature, harvest, and trade.

Positioning constraint: this is still FableMap — a private, location-anchored mirror-world space. The planting loop should help explorers want to return to one specific space, not turn the product into a traditional global farming/economy game.

## 2. Evidence checked before decisions

- `docs/PRODUCT_BRIEF.md`: FableMap supports multiple space types and visitor-first playable experiences anchored to real locations.
- `docs/WORLD_SCHEMA.md`: Engagement is a visitor x space lightweight return loop; it is not a platform wallet, paid draw, or tradeable inventory system.
- `docs/WHAT_NOT_TO_BUILD.md`: do not build platform payment/token systems, unbounded visitor social, RPG combat/level/equipment/ranking systems, or traditional map-app features.
- `frontend/app/product/tavernFarmModes.js`: existing front-end farm concepts already include crop progress, seeds, planting, harvest, market quote/sale, shop items, daily/login prompts. This suggests the P0 planting loop can reuse or refactor existing farm experience rather than inventing everything from scratch.

## 3. Recommended P0 direction

Build one system-created planting space, not a global farm system.

Working concept: **镜面小菜园 / 秘密花圃**

- Visitor role: 探索者, temporarily caring for one small plot in the space.
- Host role: NPC gardener/shopkeeper-like host inside the space, not a user-facing店主 tool.
- Core promise: “你在这个真实地点的镜像空间里留下一株会长大的东西；下次回来，它会记得你。”

## 4. P0 gameplay loop

Minimum loop should be longer than a 2-click interaction, but not explode into full simulation.

1. Enter planting space.
2. NPC gives today’s plot status and one clear objective.
3. Visitor gets or buys one seed packet from NPC.
4. Visitor clears grass / prepares soil.
5. Visitor plants seed.
6. Visitor waters or fertilizes.
7. Crop enters growth state; visitor sees next return time or current stage.
8. On return / after maturity, visitor harvests.
9. Visitor trades harvest with NPC market for a space-local reward.
10. Reward creates a return hook: new seed, plot note, crop memory, or next-day event.

## 5. Trading rule

Use **space-local NPC exchange**, not platform economy.

Allowed for P0:

- Sell/hand in crop to NPC.
- Receive local items: seed packet, soil note, decoration badge, story receipt, crop card.
- Prices/quotes can be narrative and space-local.

Not allowed for P0:

- Platform currency.
- Visitor-to-visitor trading.
- Global marketplace.
- Ranking/leaderboard.
- Stealing from other visitors.

## 6. Retention hooks

The loop should make users willing to return by giving them a pending private object.

- Time-based growth: sprout / leaf / bloom / mature.
- NPC remembers the visitor’s plot state.
- Daily small event: rain, weeds, dry soil, surprise seed, wilt warning.
- Harvest unlocks a “crop receipt” or “plot diary”.
- Next objective appears after harvest: plant a second crop or complete a small delivery.

## 7. Implementation options

### Option A — Narrative gameplay definition only

Use existing `gameplay_definitions` node flow like the Midnight Commission Board.

Pros:
- Lowest risk.
- No new schema.
- Fast to ship.

Cons:
- Weak real return loop.
- Crop does not truly grow across visits unless manually encoded as session state.

### Option B — Reuse existing farm front-end module

Inspect and adapt `frontend/app/product/tavernFarmModes.js` into a focused planting space panel.

Pros:
- Existing code already covers planting, crop progress, shop, sale, daily prompts.
- More interactive than pure text nodes.

Cons:
- Must audit existing “neighbor/steal/social” concepts and exclude them from P0.
- Need verify persistence model before promising return behavior.

### Option C — Durable backend visitor-state farm loop

Store one plot’s state per visitor x tavern using existing visitor engagement/state patterns if available.

Pros:
- Best fit for “愿意返回来玩”.
- Crop can actually mature between visits.

Cons:
- Higher implementation risk.
- Requires careful API/state contract review and docs/tests.
- Avoid adding DB schema unless explicitly confirmed.

## 8. Recommended execution

Recommended P0 slice: combine B + limited C only if existing visitor-state storage supports it.

- One space only.
- One plot only.
- Three seed types at most.
- NPC exchange only.
- No platform economy.
- No visitor social.
- No rankings.
- No shopkeeper authoring changes.

## 9. Open question

Do we want the first planting prototype to be:

1. **Playable text flow**: fastest, similar to current委托玩法, weaker return.
2. **Real plot state**: one crop really grows across visits, stronger return, more code/risk.

Recommended answer: **Real plot state**, but only one plot + NPC exchange for P0.

## Implementation note — 2026-06-03

User asked: "把其中一个空间改成 秘密花圃".

Decision:
- Repurpose existing system public welfare tavern `pw_community_repair` instead of changing the already-polished commission board.
- Keep tavern id stable to avoid route/API/session breakage.
- Make the displayed space name `秘密花圃`.
- Add one published gameplay definition: `gp_pw_secret_flowerbed_seed_cycle`.

Scope:
- Backend seed content only for the chosen system tavern.
- Frontend first-minute guide recognizes planting/flowerbed content.
- Generic gameplay panel gets flowerbed labels/stages so the session does not say "委托板" after harvest.

Product guardrails:
- NPC小摊兑换 only.
- No platform currency, recharge, withdrawal, visitor-to-visitor trading, stealing, ranking, combat, levels, or equipment.
- Real coordinate remains unchanged.
- No schema changes.

Validation to run after coding:
- `py -3 -m compileall -q backend/src`
- focused Python smoke for default tavern/gameplay structure
- `npm --prefix .\frontend run typecheck`
- `npm --prefix .\frontend run build`

## Validation — 2026-06-03

Commands/results:
- `py -3 -m compileall -q backend/src` — PASS.
- Focused Python smoke importing `default_public_welfare_taverns()` — PASS: `pw_community_repair` displays as `秘密花圃`, contains `gp_pw_secret_flowerbed_seed_cycle`, 10 nodes from `start` to `complete`, and forbids platform currency / visitor trading / stealing / rankings.
- `npm --prefix .\frontend run typecheck` — PASS.
- `npm --prefix .\frontend run build` — PASS.
- Browser smoke: dev server root `http://127.0.0.1:5173/` loaded with title `FableMap｜世界的镜像面`; direct tavern route `/tavern/pw_community_repair` could not show the flowerbed because the local API proxy returned HTTP 502 / `ECONNREFUSED 127.0.0.1:8950`. This matches the current local backend availability limitation and is not counted as visual acceptance.

## Follow-up fix — 2026-06-03

User challenged backend startup and whether this was a new space.

Evidence:
- Started native backend with `FABLEMAP_STORAGE_BACKEND=json` on `127.0.0.1:8950` via `py -3 -m uvicorn fablemap_api.main:app --host 127.0.0.1 --port 8950 --log-level info`.
- Initial PowerShell `Invoke-RestMethod` 502 was caused by environment proxy variables (`HTTP_PROXY` / `HTTPS_PROXY` = `http://127.0.0.1:7890`). Direct `curl.exe --noproxy '*'` hit uvicorn successfully.
- `GET /api/v1/taverns/pw_community_repair?view=entry` returns `name=秘密花圃`, existing characters `阿槐 / 和光 / 巧手`, and existing avatar paths under `/assets/npcs/public-welfare/.../neutral.png`.

Additional fixes:
- `backend/src/fablemap_api/core/tavern.py`: targeted system seed refresh removes deprecated repair ids from `pw_community_repair` (`gp_pw_repair_one_small_fix`, `gp_pw_repair_role_triage`, old repair world-info/bookmark ids) so historical JSON stores do not keep exposing old repair gameplay.
- `frontend/app/features/tavern-chat-workbench/index.tsx`: doorway now shows only `gp_pw_secret_flowerbed_seed_cycle` for `pw_community_repair`, matching the one-space P0 approach.

Runtime validation:
- Direct API after restart returns only flowerbed gameplays: `gp_pw_secret_flowerbed_seed_cycle`, `gp_pw_flowerbed_role_triage`.
- Browser route `http://127.0.0.1:5173/tavern/pw_community_repair` shows `秘密花圃`, planting objective, `阿槐`, 3 NPCs, one flowerbed gameplay entry, no old repair copy, no HTTP 502, no horizontal overflow.
- Gameplay API can start `gp_pw_secret_flowerbed_seed_cycle` and complete path in 9 turns; completion includes `月光薄荷` and next-return hook `雨铃豆`.

Validation commands:
- `py -3 -m compileall -q backend/src` — PASS.
- `npm --prefix .\frontend run typecheck` — PASS.
- `npm --prefix .\frontend run build` — PASS.
