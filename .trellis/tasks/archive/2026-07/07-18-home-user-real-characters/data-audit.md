# Data Audit

## Verdict

- Accepted launch contract: **PASS** — confirmed in product docs, two prior Trellis tasks and backend seed code.
- Current production visitor surface: **FAIL** — historical fixture content and fabricated UI metadata are visible.
- Direct current-database row audit: **BLOCKED** — the configured MySQL host is only resolvable inside the deployment/container network; local Docker and API listeners are not running.
- Production mutation: **NOT ATTEMPTED** — no row will be changed without an exact ID + owner guard.

## Accepted launch records

| Space ID | Space | Character IDs / names |
|---|---|---|
| `story_palace_snow_edict` | 长明宫·雪夜诏书 | `char_story_palace_eunuch_wei` / 魏观海; `char_story_palace_princess_xiao` / 萧明珠 |
| `story_ghost_foxfire_debt` | 青槐驿·狐火借命 | `char_story_ghost_fox_spirit_feiyue` / 绯月; `char_story_ghost_scholar_ning` / 宁怀书 |
| `story_campus_last_class` | 临川大学·最后一堂课 | `char_story_campus_teacher_shen` / 沈清禾; `char_story_campus_heir_gu` / 顾野 |

Evidence:

- `.trellis/tasks/07-16-character-first-story-worlds/design.md`
- `.trellis/tasks/07-16-three-world-six-character-seeds/prd.md`
- `.trellis/tasks/07-16-three-world-six-character-seeds/design.md`
- `docs/PRODUCT_BRIEF.md`
- `apps/api/src/fablespace_api/core/default_spaces.py`

## Production DOM evidence

Read-only inspection on 2026-07-18 used the user's existing signed-in Chrome tab. No form, write endpoint or database mutation was used.

Homepage actual cards:

| Visible Space | Visible character | Public route reference |
|---|---|---|
| 公开星港 | 阿珀 | `/空间/JhczvFgz0AA/角色/sq6ICyEt9Fk` |
| 临川大学·最后一堂课 | 顾野 | `/空间/ER_yHoSsdnA/角色/S3FVz-BEfhs` |
| 主链路验收空间 | 验收店员 | `/空间/IWnZNEhC1XU/角色/RtLjEWSEGhM` |
| 纪念币茶馆 | 茶博士 | `/空间/Qgk2zkRVGDg/角色/SEVtiqU7et8` |

The same DOM also showed:

- fixed sidebar badge `12`;
- `MIRROR READY`;
- fabricated `2 / 5 / 8 分钟前`;
- a static `RECENT ECHO` quote;
- Space descriptions relabeled as `MEMORY STREAM` with fabricated hours;
- fixed world statistics `12 / 28 / 156 / 3,214`;
- no real account surface in the homepage's reserved top-right area.

Default `/空间` visitor discovery also showed `纪念币茶馆 / 茶博士`, `Continuity Tavern / Logic` and `Episode Export Tavern / Keeper`, plus the hard-coded account `USER_07`.

Additional user screenshots on 2026-07-18:

- `codex-clipboard-942dced1-218e-4b45-810f-e34d2b134f95.png` shows the browser address bar retaining the Chinese `/空间` pathname.
- `codex-clipboard-b3cdae17-ac15-4192-9b21-52f729c5d87a.png` shows “纪念币茶馆 / Continuity Tavern / Episode Export Tavern” in the visitor discovery card grid.

Code inspection confirms two separate causes:

1. `routes.ts` and `web-routes.ts` intentionally make Chinese paths canonical, while `legacy-web-route.tsx` redirects older ASCII paths back to Chinese.
2. `discover.tsx` lets `?view=expanded` replace the fixed launch collection with `listSpaces()`, so a visitor-controlled query can expose the general catalog and historical fixtures.

The same component retains optional entity-card branches that can generate “等待真实空间 N”“待开放”“等待空间同步” instead of rendering one truthful collection state. The new Trellis scope treats route canonicalization, catalog authorization and collection-state rendering as one pending frontend correction. No code was changed for this added scope in the planning-only turn.

## Historical fixture candidates

These rows are candidates only until their current persisted fields are read. Automatic retirement requires the complete historical signature: fixed Space ID, owner ID, Space name, original `public + open` state, and the listed fixed Character ID / name.

| Fixed Space ID | Expected test owner | Required Space name | Required fixed Character signature | Status |
|---|---|---|---|---|
| `platform-public` | `owner-platform-home` | 公开星港 | `public-char-a` / 阿珀; `public-char-b` / 米娅 | historical full signature; current row not yet read |
| `mainline-golden-path-tavern` | `owner-mainline-smoke` | 主链路验收空间 | `char-mainline-keeper` / 验收店员 | historical full signature; current row not yet read |
| `engagement-demo` | `owner_engagement` | 纪念币茶馆 | `npc_keeper` / 茶博士 | historical full signature; current row not yet read |
| `continuity-tavern` | `owner_continuity` | Continuity Tavern | `char_logic` / Logic | historical full signature; current row not yet read |
| `episode-export-tavern-public` | `owner_episode_export` | Episode Export Tavern | `char_keeper` / Keeper | historical full signature; current row not yet read |

Historical evidence:

- `eedcd3f0^:backend/tests/test_platform_home_api.py`
- `eedcd3f0^:backend/tests/test_v1_mainline_golden_path_smoke.py`
- `eedcd3f0^:backend/tests/test_v1_engagement.py`
- `eedcd3f0^:backend/tests/test_continuity_v2.py`
- `eedcd3f0^:backend/tests/test_v1_episode_export.py`

Another old API smoke fixture created “星港夜谈 / 阿珀” under `owner-1`, but both Space and Character IDs were generated at runtime. It is deliberately excluded from automatic cleanup.

## Audit limitation

The local `.env` selects the database backend and a MySQL URL whose host is a deployment/container alias. A read-only SQLAlchemy connection failed with MySQL error 2003 because that alias is not locally resolvable. Docker Desktop was not running and no local FableSpace port was listening. The production API health endpoint was reachable, but unauthenticated command-line Space listing returned 401.

The required deployment-network query is:

```sql
SET SESSION TRANSACTION READ ONLY;
START TRANSACTION READ ONLY;

SELECT
  t.id AS space_id,
  t.name,
  t.owner_id,
  t.status,
  t.access,
  t.created_at,
  c.id AS character_id,
  c.name AS character_name
FROM taverns t
LEFT JOIN characters c ON c.space_id = t.id
WHERE t.access = 'public'
ORDER BY t.created_at, t.id, c.id;

ROLLBACK;
```

## Implementation and local evidence

Implemented on 2026-07-18:

- Default homepage and `/空间` now load only the three accepted system launch Space IDs and validate `system_public_welfare`, `public + open`, and all six fixed Character IDs before rendering.
- The top-right account surface comes from access-session state; the private play identity remains a separate “当前身份” value.
- Historical fixtures are retired only when Space ID, owner ID, Space name, original access/status and fixed Character signatures all match. The operation is idempotent and changes only `access=private` plus `status=closed`.
- The default discovery filters are limited to 现代学校、古代皇宫、聊斋奇幻; the three Space covers are de-duplicated.

Fresh local results:

- Frontend typecheck: **PASS**
- Frontend production build: **PASS**
- Isolated local API responses for all three launch Spaces and access status: **PASS**
- Desktop 1536 × 1024: six homepage role cards and three discovery cards, no pairwise overlap or horizontal overflow: **PASS**
- Mobile 360 × 800: six homepage role cards and the “故事中的性别” control, no horizontal overflow: **PASS**
- DOM names and public links for all three Spaces / six Characters: **PASS**
- Further browser failure-state and React-diagnostic acceptance: **NOT RUN after the user requested an early stop**

Production persisted-row retirement remains **BLOCKED / NOT ATTEMPTED** until the deployment-network read-only audit can confirm the exact historical signatures.
