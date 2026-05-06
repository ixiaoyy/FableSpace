# brainstorm: 酒馆与角色关系联动图谱

## Goal

探索一个“酒馆↔酒馆、角色↔角色、跨酒馆角色↔角色”的关系图谱系统：关系可为友好/亲近/同盟，也可为陌生/竞争/敌对，并影响访客与相关酒馆或角色的好感/关系变化。

## What I already know

* 用户希望酒馆之间存在不同关系：亲近、同盟、陌生、敌对等。
* 负向关系：访客与某酒馆关系越好，可能导致与另一个敌对酒馆关系越差。
* 正向关系：访客与某酒馆关系越好，可带动与友好酒馆关系略微变好，但有上限。
* 角色之间也应有关系；两个酒馆里的角色之间也可以有独立关系。
* 访客与某角色关系提升/下降，也可能通过角色关系影响另一个角色。
* 用户特别强调：友好联动有上限，敌对联动没有同样上限。

## Assumptions (temporary)

* 这是产品/架构头脑风暴，不立即实现代码。
* 关系系统应保持 FableMap 主线：地图酒馆、店主主权、AI NPC 对话、记忆/回访，不变成传统社交网络或战斗阵营系统。
* 关系联动应是可解释、可配置、可测试的数值规则，而不是 AI 自由改写正史。

## Open Questions

* MVP 中是否只做“关系影响好感数值”，还是也要在发现页/酒馆详情/对话中展示关系提示？

## Requirements (evolving)

* 支持酒馆与酒馆之间的关系类型和强度。
* 支持角色与角色之间的关系类型和强度，包含跨酒馆角色关系。
* 访客与一个节点关系变化时，可沿关系边传播到相关节点。
* 友好传播有上限；敌对传播可持续拉低或形成强烈排斥。
* 不绕过店主确认自动改变 Tavern / Character 固定设定。

## Acceptance Criteria (evolving)

* [ ] 明确关系类型、强度、方向性、作用域和 owner 权限。
* [ ] 明确访客-酒馆、访客-角色好感联动的计算规则。
* [ ] 明确友好上限与敌对无上限的数值边界。
* [ ] 明确哪些数据持久化、哪些仅作为推导展示。
* [ ] 明确 MVP 不做范围，避免变成公开社交/战斗阵营系统。

## Definition of Done (team quality bar)

* Tests added/updated when implementation begins.
* Lint / typecheck / backend tests green when implementation begins.
* Schema/docs updated if behavior changes.
* Rollout/rollback and legacy data compatibility considered.

## Out of Scope (explicit)

* 本 brainstorm 不写实现代码。
* 不做访客间社交、关注、私信、帮派排行。
* 不做战斗、等级、装备或阵营战争系统。
* 不让平台 AI 自动生成/发布酒馆关系正史；关系应由店主或明确规则确认。

## Technical Notes

* Pending repo inspection: existing Affinity, NpcPublicBond, PlaceRelationship, StateCard, Tavern skill/relationship docs.

## Repo Context Findings

* Existing `VisitorState` already stores visitor↔tavern relationship as `relationship.strength` 0.0–1.0 and `AffinityStage` (`stranger` → `best_friend`) in `docs/WORLD_SCHEMA.md`.
* `backend/src/fablemap_api/core/affinity.py` calculates chat/gameplay/decay deltas and clamps strength to 0.0–1.0. Current model is positive-affinity only; it has no negative stage below `stranger`.
* `backend/src/fablemap_api/application/services/runtime.py` updates affinity during chat and visit touch, so relationship propagation should probably hook into this service boundary rather than UI-only code.
* Existing `PlaceRelationship` is a governance relation for Home/member → target place (`school_enrollment`, `care_link`, `membership`, `work_affiliation`, `story_link`). Docs explicitly say it is not a public social graph.
* Existing `NpcPublicBond` is visitor↔NPC public/permanent bond after approval. It is not the same thing as hidden/ambient NPC↔NPC or tavern↔tavern affinity propagation.
* `StateCard` already provides confirmed/pending continuity records and explicitly forbids becoming RPG stats/equipment/rankings; relationship graph changes that are AI-suggested should stay pending until confirmed.
* `docs/WHAT_NOT_TO_BUILD.md` forbids unbounded visitor social, cross-tavern private messaging, global online status, battle/level/equipment/ranking systems. This feature must be framed as owner-governed tavern/NPC lore + per-visitor affinity effects, not a social network.

## Initial Product Shape

A likely clean model is a **Relationship Graph** with two layers:

1. **Canon graph**: owner-confirmed relations between taverns and characters. Example: `ally`, `friendly`, `neutral`, `rival`, `hostile`, with strength/weight and optional direction.
2. **Visitor projection**: a visitor's affinity change to one node propagates to linked nodes according to canon graph rules. This projection affects the visitor's private `VisitorState` / future character-affinity state, not the public canon graph itself.

## Feasible Approaches

**Approach A: Tavern-first propagation MVP (recommended)**

* Start with tavern↔tavern relations only; when visitor affinity changes at Tavern A, derive bounded friendly boost or enemy penalty for Tavern B.
* Pros: smallest schema/API/UI surface; works with existing `VisitorState`; tests are straightforward.
* Cons: does not yet express individual NPC drama.

**Approach B: Unified graph from day one**

* Add a generic graph edge model: node can be `tavern` or `character`; source/target can cross taverns. A propagation engine applies the same rules to visitor↔tavern and visitor↔character affinity.
* Pros: best long-term architecture and matches the full user idea.
* Cons: larger schema/API/UI design; needs a new visitor↔character affinity state if current `VisitorState` remains tavern-scoped.

**Approach C: StateCard-only narrative relation MVP**

* Store relationships as confirmed StateCards and inject them into prompts; no automatic affinity propagation yet.
* Pros: very safe, minimal schema risk, owner-confirmed by default.
* Cons: misses the key mechanic the user described: one relationship changing another.

## Expansion Sweep

### Future evolution

* Relation graph can later drive discovery hints (“这家店与你常去的店是同盟/敌对”) and NPC dialogue stance.
* Need extension point for owner approval and AI-suggested pending relation changes.

### Related scenarios

* Create/update/import/export of tavern packages must decide whether relationship edges are included.
* Public display must avoid exposing private visitor affinity projections.

### Failure & edge cases

* Cycles in graph: A friendly B, B hostile C, C friendly A. Propagation needs depth limit and no infinite loops.
* Multi-owner edges: cross-owner tavern relation should be pending until both sides or target owner approves.
* Negative affinity needs a product decision: current `AffinityStage` starts at 0.0, so “敌对无上限” likely needs a separate signed stance score or debt/hostility meter rather than forcing `relationship_strength` below 0.

## Decision Update: Approach 2 selected

User selected **Approach B: Unified graph from day one**.

### Decision

MVP should design a generic Relationship Graph rather than a tavern-only stopgap:

* Nodes can be `tavern` or `character`.
* Edges can connect tavern↔tavern, character↔character, or cross-tavern character↔character.
* Visitor affinity changes to one node can propagate to related nodes according to the edge type, direction, weight and propagation rule.
* This likely requires a new visitor↔character affinity/projection store, because existing `VisitorState` only models visitor↔tavern affinity.

### Consequences

* Higher schema/API complexity than tavern-only MVP.
* Better long-term fit for cross-tavern NPC drama, alliances and rivalries.
* Must explicitly preserve product boundaries: owner-confirmed relation canon, no visitor social graph, no combat/faction war mechanics.
* Need a propagation engine with cycle/depth limits and deterministic math.

### Open Design Issue

The next critical decision is how to represent negative relationships, because current `AffinityStage` is clamped to `0.0–1.0` and has no hostile side.

## Decision Update: Dual-axis relationship projection selected

User selected **Option 1: Dual-axis model**.

### Decision

Visitor-to-node relationship projection uses two separate axes:

* `affinity`: `0.0–1.0`, positive closeness/trust/familiarity. This remains compatible with existing `AffinityStage` semantics.
* `hostility`: `0.0–∞`, negative tension/conflict/resentment. This does not reuse `AffinityStage`; it needs its own labels, caps for UI display if needed, and decay/mitigation rules later.

### Propagation implications

* Friendly/allied edges can increase target `affinity`, but only up to a configured friendly cap.
* Hostile/rival edges can increase target `hostility` without the same friendly cap.
* A visitor can simultaneously have high affinity and high hostility toward the same node if the story supports conflicted feelings; UI can summarize this as “亲近但紧张” rather than forcing a single scalar.
* Existing `VisitorState.relationship_strength` can remain the tavern affinity axis for backward compatibility; new relationship projection storage should add hostility and character-scoped affinity instead of forcing negative values into the existing field.

## Decision Update: One-hop propagation selected

User selected **Option 1: one-hop propagation only**.

### Decision

MVP relationship propagation is limited to direct neighbors only:

* If visitor affinity/hostility changes at node A, only edges directly connected to A can affect node B.
* Propagation does not continue from B to C in the same event.
* This avoids graph-wide cascades, cycle handling complexity, and unintuitive global relationship changes.

### Consequences

* Easier to explain to owners and visitors: “Because A and B are allies/rivals, your relationship with A slightly affects B.”
* Deterministic tests are simple: one source event, one edge, one derived target projection.
* Future versions can add two-hop propagation behind an explicit setting, but MVP must not do it implicitly.

### Draft propagation rule

* Friendly/allied edge: `target.affinity += source_delta * edge.weight * friendly_multiplier`, clamped by `edge.friendly_cap`.
* Hostile/rival edge: `target.hostility += positive_source_delta * edge.weight * hostile_multiplier`; no friendly cap is applied.
* Negative source events can be handled explicitly later; MVP should first define positive affinity gains and their relation-side effects.

## Decision Update: One-sided perspective relationships selected

User selected **Option 2: one-sided declaration as perspective** because it better matches real-world social relationships.

### Decision

Cross-owner relationship edges are allowed as unilateral perspectives:

* Same-owner relation can be treated as owner-confirmed canon for that owner scope.
* Cross-owner relation created by Tavern A's owner is stored as A's perspective about B, not as B's accepted canon.
* A's perspective can affect A-side narrative, A-side NPC prompts, and relationship propagation initiated from A's nodes.
* B is not forced to display, accept, or use A's declaration unless B creates/approves its own edge.
* Conflicting perspectives are valid: A can see B as hostile while B sees A as friendly, neutral, or unknown.

### Product rationale

This reflects realistic social situations: relationships can be asymmetric, misunderstood, one-sided, or disputed. The system should preserve that ambiguity instead of requiring every relation to be mutually agreed before it can matter.

### Governance constraints

* A one-sided edge must be clearly attributed to its source owner / source tavern.
* Public UI must not present a one-sided edge as objective platform truth.
* B-side public pages and B-side propagation cannot be hijacked by A's one-sided declaration.
* If both sides declare edges, the graph may contain two directional edges with different relation types and strengths.

### Updated requirement

* Relationship edges need `source_owner_id`, `source_node`, `target_node`, `perspective_scope`, and directionality.
* Propagation must respect perspective scope: a source-owner edge applies when the triggering interaction belongs to that owner's node/context, not globally everywhere.

## Decision Update: Perspective edges apply only in declaring context

User selected **Option 1: one-sided relation only applies in the declaring-side context**.

### Decision

A unilateral perspective edge only participates in propagation when the triggering interaction happens in the declaring owner's context:

* If Tavern A declares A→B as hostile, then visitor interaction with A / A's characters can propagate hostility toward B.
* Tavern B is not forced to apply A's declaration inside B's own scene, prompts, UI, or propagation rules.
* If B wants the relation to matter in B's context, B must create its own B→A perspective edge.

### Consequences

* Prevents one owner from hijacking another owner's relationship graph.
* Keeps asymmetric and disputed relationships possible.
* Relationship projection needs to record propagation provenance so the system can explain why a visitor's relation to B changed: e.g. `source_edge_id`, `source_owner_id`, `source_context_node_id`.
* B-side UI may optionally show “external perspectives mention this tavern” in an owner/admin view later, but not as MVP public truth.

### Updated propagation guard

For each propagation event:

1. Determine the interaction context node and owner.
2. Load only edges whose `source_owner_id` matches that context owner and whose source node is directly involved.
3. Apply only one-hop effects to target visitor projections.
4. Store provenance on derived projection changes.

## Decision Update: Ownership-aware bilateral vs perspective propagation

User refined the previous context rule:

* If two nodes belong to the same owner, or both are system/public-welfare shops, their declared relation can be treated as mutually effective within that owner/system scope.
* Otherwise, a one-sided declaration remains a perspective edge and must not force the target owner to accept or display it as canon.
* However, a one-sided A→B perspective can still affect A's relationship with a visitor based on that visitor's relationship to B:
  * If A declares A dislikes/hates B, then the better the visitor's relationship with B becomes, the worse A's relationship with the visitor becomes.
  * If A declares A likes/allies with B, then the better the visitor's relationship with B becomes, the better A's relationship with the visitor becomes.

### Revised mental model

A one-sided relationship edge is not global truth about B; it is A's social preference function.

This means:

* B-side canon, prompts and public UI are not hijacked by A's declaration.
* A-side projection can respond to the visitor's affinity toward B, even if the triggering interaction occurred at B.
* For same-owner/system relations, the edge may be used symmetrically because the same governance scope owns both sides.

### Propagation direction update

Edges should support two calculations:

1. **Source-to-target contextual propagation**: interacting positively with A can affect visitor projection toward B according to A→B.
2. **Target-to-source preference reaction**: if A has a perspective about B, changes in visitor↔B can affect visitor↔A because A approves/disapproves of B.

### Governance guard

For cross-owner unilateral edges:

* The target node B is not forced to accept A's statement.
* Derived visitor↔A changes must record provenance from A's perspective edge.
* Any UI explanation should phrase it as A's stance, e.g. “因为 A 对 B 持敌对立场，你与 B 的亲近让 A 对你更疏远。”

### Open design issue

“关系越差” needs an explicit dual-axis behavior: should it reduce `affinity`, increase `hostility`, or both?

## Decision Update: Negative reaction drains affinity before adding hostility

User selected **Option 3: reduce affinity first, then increase hostility after affinity reaches 0**.

### Decision

When a relationship effect makes a node's relationship with the visitor worse:

1. First reduce `affinity` toward `0.0`.
2. If the negative effect exceeds remaining affinity, convert the remainder into `hostility` increase.
3. This preserves a natural progression: disappointment/estrangement before open hostility.

### Example

If A dislikes B and visitor's relationship with B improves by an effect amount of `0.08`:

* Visitor↔A currently `affinity=0.05`, `hostility=0.00`.
* Apply `-0.08` negative reaction.
* `affinity` drops from `0.05` to `0.00`.
* Remaining `0.03` becomes `hostility += 0.03`.

### Positive reaction

When A likes B and visitor's relationship with B improves:

* Increase visitor↔A `affinity` up to the friendly cap.
* Do not automatically reduce existing `hostility` in MVP unless a future reconciliation mechanic is designed.

### Requirement update

* Relationship projection math needs helper functions for `apply_positive_effect` and `apply_negative_effect` so tavern and character projections stay consistent.

## Decision Update: More specific relationship wins

User selected **Option 1: the more specific relationship takes priority**.

### Decision

When multiple relationship edges could explain the same propagation, the more specific edge wins:

1. `character↔character` edge has priority over `tavern↔tavern` edge.
2. `character↔tavern` edge, if added later, sits between character-specific and tavern-wide edges.
3. `tavern↔tavern` edge is the broad fallback when no more specific relation applies.

### Example

If Tavern A broadly dislikes Tavern B, but character `A.小灯` is friends with character `B.白鸟`:

* Visitor improves relationship with `A.小灯`.
* Propagation toward `B.白鸟` uses the character↔character friendly edge.
* The tavern↔tavern hostile edge does not override this specific character relationship for that target character.

### Product rationale

This preserves individual NPC agency and narrative nuance. A tavern-wide rivalry can exist while specific characters still have private friendship, romance, mentorship, debt, or secret alliance.

### Implementation note for later

Propagation edge resolution should rank candidates by specificity before applying effects. MVP can define priority as:

```text
character↔character > character↔tavern > tavern↔tavern
```

If two edges have the same specificity and both apply, use the stronger edge or require an explicit owner decision; this remains open for later convergence.

## Decision Update: Character relationship weakly affects parent tavern

User selected **Option 1: character relationships can weakly affect the parent tavern relationship**.

### Decision

Visitor↔character projection can roll up into visitor↔tavern projection with a weak bounded effect:

* If a visitor's relationship with a tavern character improves, the visitor's relationship with that character's parent tavern can improve slightly.
* If a visitor's relationship with a tavern character worsens, the parent tavern relationship can worsen slightly using the same negative-effect rule: drain affinity first, then add hostility if needed.
* This roll-up is weaker than direct visitor↔tavern interaction and should have a cap, so one NPC does not fully hijack the tavern-wide relationship.

### Product rationale

A tavern is partly represented by its characters. Liking or disliking a memorable NPC should influence how the visitor feels about the place, but the place should still have its own relationship state.

### Draft rule

* Direct tavern interaction remains the primary source for visitor↔tavern affinity.
* Character roll-up uses a small multiplier, e.g. `character_to_tavern_multiplier`.
* Roll-up should be explainable: “因为你和小灯更熟了，你对第三货架后面的整体印象也更亲近了一点。”

### Open design issue

Not all characters should necessarily affect the tavern equally. Core NPCs may represent the tavern more than background or temporary roles.

## Decision Update: Character roll-up uses influence weights

User selected **Option 1: character relationships affect parent tavern through role/influence weights**.

### Decision

Character-to-tavern roll-up should be weighted:

* Each character can have an `influence_weight` or owner-visible role importance marker.
* Core NPCs have stronger effect on the parent tavern relationship projection.
* Normal NPCs have a smaller effect.
* Background, temporary, silent, or low-importance roles should have little or no tavern-wide roll-up.

### Product rationale

Not every character represents the tavern equally. A shop owner, manager, mascot, or core NPC can shape the visitor's impression of the whole place; a temporary passerby should not.

### Draft rule

```text
tavern_rollup_delta = character_delta * character_to_tavern_multiplier * influence_weight
```

Suggested conceptual weights for later design:

* `core`: high, e.g. `1.0`
* `regular`: medium, e.g. `0.4–0.6`
* `background`: low, e.g. `0.1–0.2`
* `silent/display/temporary`: `0` unless owner explicitly opts in

### Governance note

`influence_weight` should be owner-controlled and not inferred by platform AI from character text alone. AI may suggest a weight as an editable draft, but should not publish it without owner confirmation.

## Decision Update: Owner-confirmed relationship edges only

User selected **Option 1: owners create/modify relationships manually; AI can only propose pending candidates**.

### Decision

Relationship graph canon is owner-governed:

* Owners can manually create, edit, disable, or delete relationship edges within their governance scope.
* AI/NPC dialogue, StateCard-like extraction, or gameplay events may propose relationship changes only as `pending` candidates.
* A pending candidate does not affect propagation, prompts, public UI, or visitor projections until the relevant owner confirms it.
* Cross-owner unilateral perspective edges are still allowed, but the declaring owner is the only authority for their own perspective edge.

### Product rationale

This preserves owner sovereignty and avoids platform AI accidentally rewriting tavern or character lore. The graph can feel alive through suggestions, but canon changes remain explicit and reviewable.

### Candidate workflow notes

* AI candidate should include proposed source node, target node, relation type, strength/weight, reason, evidence message IDs, and confidence.
* Owner actions: confirm, edit-and-confirm, reject, archive.
* Confirmed edges should be auditable and explainable; private messages/API keys/full prompts must not be exposed in candidate rationale.

### Requirement update

* Relationship graph schema needs `status: pending | confirmed | rejected | disabled` or equivalent.
* Propagation must only load confirmed/enabled edges.

## Decision Update: AI auto-confirm for system shops and owner-delegated mode

User refined the previous owner-confirmation rule:

* System/public-welfare shops do not have a normal human owner; relationship candidates there can be auto-confirmed by AI/system policy.
* Human owners may also choose to fully delegate relationship graph governance to AI.
* Therefore, owner confirmation is the default governance mode, not the only possible mode.

### Revised decision

Relationship edge governance should support modes:

1. `manual`: AI can propose pending candidates, owner confirms before the edge affects propagation.
2. `assisted`: AI can draft/edit recommendations, but high-impact or cross-owner edges still require owner review.
3. `delegated_ai`: owner explicitly delegates graph governance; AI may auto-confirm within that owner's tavern/character scope.
4. `system_ai`: platform/system/public-welfare shops can auto-confirm relationship edges under built-in safety/product rules.

### Product rationale

This keeps owner sovereignty while allowing creators who want a living autonomous tavern to opt into AI-managed relationships. It also makes system/public-welfare shops operational without a human owner approving every relationship update.

### Safety and governance constraints

* AI auto-confirm must be opt-in for human-owned shops; it must not be the silent default.
* AI auto-confirmed edges need provenance: source event/message, model/system policy, timestamp, and confidence.
* Cross-owner unilateral perspective edges may be auto-confirmed only for the declaring owner's perspective. They still cannot force the target owner to accept or display the relation as their canon.
* High-impact changes may need thresholds even in delegated mode, such as disabling propagation until confidence is high enough or requiring owner review for public labels.
* System shops should use `system_ai` rather than pretending there is a human owner.

### Requirement update

* Relationship graph schema needs `governance_mode` or tavern-level relationship governance settings.
* Edge records need `confirmed_by` / `confirmed_by_type` such as `owner`, `delegated_ai`, `system_ai`.
* Candidate workflow should support auto-confirm transitions, not only owner review.

## Decision Update: Built-in behavior types with editable display names

User selected **Option 1: built-in relationship behavior types + editable display names**.

### Decision

Relationship edges should use stable built-in behavior types for propagation logic, while allowing owners/system AI to customize the user-facing label.

### Built-in behavior types draft

* `friendly`: mild positive affinity propagation with a friendly cap.
* `allied`: stronger positive affinity propagation with a higher friendly cap.
* `neutral`: relationship is documented but does not materially propagate by default.
* `rival`: competitive/negative reaction; drains affinity first, then adds hostility if needed.
* `hostile`: stronger negative reaction; drains affinity and can accumulate hostility without the same friendly cap.

### Editable display examples

The behavior type stays stable, but display text can vary by owner/tavern:

* `allied` displayed as “同盟”, “姐妹店”, “暗线盟友”.
* `rival` displayed as “商业竞争”, “抢客关系”, “理念不合”.
* `hostile` displayed as “死敌”, “禁忌对立”, “旧怨”.
* `friendly` displayed as “亲近”, “互相照应”, “常来往”.

### Product rationale

This keeps propagation deterministic and testable while preserving creator expression. Owners can write relationship flavor without inventing new formulas or breaking the graph engine.

### Requirement update

Each edge should distinguish:

* `behavior_type`: fixed enum used by backend propagation.
* `display_name`: owner/system-facing label.
* `description` / `note`: optional owner-authored context.
* `weight` or `strength_preset`: controls intensity inside behavior type.

AI-generated candidates must map proposed free-form wording to one of the built-in behavior types before confirmation/auto-confirmation.

## Decision Update: AI delegation can only auto-confirm own perspective

User selected **Option 1: delegated/system AI can only auto-confirm its own side's perspective relation**.

### Decision

AI governance never grants authority over another owner/system scope:

* If A is `delegated_ai` or `system_ai`, AI may auto-confirm A→B as A's perspective edge.
* AI may not auto-confirm B→A unless B also has its own `delegated_ai`/`system_ai` governance and its own policy independently creates/confirms B→A.
* A's auto-confirmed edge can affect A-side prompts, A-side propagation, and A's reaction to visitor affinity with B.
* B-side canon, UI, prompts and propagation remain untouched unless B confirms or auto-confirms its own edge.

### Product rationale

This combines liveliness with owner sovereignty. AI can make a tavern feel alive inside its own scope without hijacking another tavern's identity or social stance.

### Requirement update

* Edge confirmation authority must validate `confirmed_by`/`confirmed_by_type` against `source_owner_id` and `source_node` scope.
* There should be no API path where A's delegated AI can create a mutual/bilateral edge for B.
* If two scopes both auto-confirm compatible edges, the system stores them as two directional perspective edges, not as an implicit shared truth unless a later explicit mutual edge concept is designed.

## Decision Update: Strength presets selected

User selected **Option 1: strength presets**.

### Decision

Relationship edge intensity should use discrete presets instead of raw sliders:

* `weak`: light influence, low propagation multiplier.
* `normal`: default influence.
* `strong`: strong influence, but still governed by caps and specificity rules.

### Product rationale

Presets are easier for owners, safer for AI auto-confirm/delegated modes, and simpler to test. They prevent arbitrary formulas while preserving enough expressive range.

### Draft mapping concept

Exact numbers should be finalized during implementation design, but the schema can expose:

```text
strength_preset: weak | normal | strong
```

Backend can map this to stable constants such as:

```text
weak   -> 0.25x
normal -> 0.50x
strong -> 0.80x
```

These are not final balancing values; they represent the intended configuration style.

### Requirement update

* Owners/system AI choose behavior type + display name + strength preset, not arbitrary propagation formulas.
* Advanced raw weight editing is out of MVP unless a future expert mode is explicitly designed.

## Converged MVP Design Draft

### Goal

Build a unified tavern/character relationship graph that can express asymmetric, owner-scoped social stances between taverns and characters, and use those stances to project per-visitor affinity/hostility effects in a controlled, explainable way.

### Core model

* Node types: `tavern`, `character`.
* Edge scopes: tavern↔tavern, character↔character, future character↔tavern if needed.
* Edge behavior types: `friendly`, `allied`, `neutral`, `rival`, `hostile`.
* Display name is owner/system editable, but backend behavior type remains fixed.
* Edge intensity uses `strength_preset: weak | normal | strong`.

### Visitor projection axes

* `affinity`: `0.0–1.0`, positive closeness/trust/familiarity.
* `hostility`: `0.0–∞`, negative tension/conflict/resentment.
* Negative effects first drain `affinity`; once affinity reaches 0, remaining negative effect increases `hostility`.
* Positive effects increase `affinity` up to configured caps and do not automatically erase existing hostility in MVP.

### Propagation rules

* Propagation is one-hop only.
* More specific edge wins: `character↔character > character↔tavern > tavern↔tavern`.
* Friendly/allied effects have caps.
* Rival/hostile effects can accumulate hostility after affinity is drained.
* Character relationship can weakly roll up to parent tavern relationship using owner-controlled `influence_weight`.

### Ownership and perspective

* Same-owner relations and system/public-welfare shop relations can be treated as mutually effective within that governance scope.
* Cross-owner relations are directional perspectives, not platform objective truth.
* A one-sided A→B relation can affect A-side prompts/propagation and A's reaction to visitor affinity toward B.
* A one-sided relation cannot force B to display, accept, or use A's stance.
* If both sides declare their own edges, the graph stores two directional perspective edges.

### AI governance

* `manual`: owner confirms relationship changes.
* `assisted`: AI drafts recommendations; owner reviews important changes.
* `delegated_ai`: owner explicitly lets AI auto-confirm within their scope.
* `system_ai`: system/public-welfare shops can auto-confirm under system policy.
* AI auto-confirm can only confirm the source side's perspective, never the target owner's side.
* All AI-confirmed edges require provenance and confidence metadata.

### Out of MVP

* Multi-hop graph propagation.
* Free-form custom formulas or raw sliders.
* Public social graph, visitor-to-visitor social, private messaging, factions/rankings, battle/level systems.
* Letting one owner or AI confirm another owner’s relationship stance.

### Candidate implementation slices

1. Schema/domain design for graph nodes, edges, governance mode and visitor projections.
2. Deterministic propagation engine with unit tests.
3. Backend API for owner/system relationship edges and AI candidates.
4. Minimal owner UI for graph edge list/edit/confirm.
5. Prompt/discovery integration only after propagation is testable.

## User Approval

User approved the converged MVP design with “可以”.

### Approval meaning

Proceed to planning/subtask decomposition based on the unified relationship graph MVP. Do not start code implementation until an implementation task is explicitly selected/started.
