# Neighborhood Shared Knowledge (Spatial Social Layer)

## Goal

Establish a "Neighborhood Shared Knowledge" system that allows AI NPCs in the same geographical area (neighborhood) to share and utilize common facts, events, and background information. This enhances the spatial social layer by making the environment feel interconnected and alive.

## Requirements

- **Geographical Boundary**: A neighborhood is defined by a physical radius (default 500m) around a coordinate point.
- **Knowledge Sources**:
  - **Owner (A)**: Owners can explicitly add "Neighborhood Notes" that apply to the surrounding area.
  - **StateCard Overflow (B)**: When a `StateCard` with `canon_scope='tavern'` is confirmed and marked as `is_public: true`, it automatically creates a piece of neighborhood knowledge.
  - **System Events (C)**: The system can inject regional or global events (e.g., weather, holidays, or plot-driven ambient facts).
- **AI Consumption**: 
  - A new `neighborhood-knowledge` skill pack will be added.
  - When enabled, NPCs will have relevant neighborhood knowledge injected into their system prompt as "Shared Facts" or "Neighborhood Context".
  - Knowledge injection is passive and governed by the skill-pack logic.

## Acceptance Criteria

- [x] New `neighborhood_knowledge` database table and core model implemented.
- [x] API for managing neighborhood knowledge (Create/Read/Update/Delete) for owners and system.
- [x] Hook in `StateCard` confirmation logic to propagate public tavern-level cards to neighborhood knowledge.
- [x] `neighborhood-knowledge` Skill Pack implemented in the backend with appropriate prompt generation.
- [x] Frontend support in `SkillPackManager` to enable/disable the new pack.
- [x] NPCs can correctly mention nearby neighborhood knowledge in chat when the skill pack is enabled.

## Technical Notes

- **Model**: `NeighborhoodKnowledge`
  - `id`: `knw_<hex>`
  - `content`: String (max 600 characters).
  - `lat`, `lon`: Center point.
  - `radius`: Relevance radius (default 500m).
  - `importance`: 0.0 - 1.0.
  - `source_type`: `owner` | `state_card` | `system`.
  - `expires_at`: Optional expiration timestamp.
- **Service**: `NeighborhoodKnowledgeService` will handle spatial queries (using `haversine_distance`).
- **StateCard Expansion**: Add `is_public` boolean to `StateCard` metadata or top-level schema to facilitate B-source overflow.

## Out of Scope

- Global social networks or visitor-to-visitor direct messaging.
- Real-time notification to all visitors when knowledge changes (it's passive context for NPCs).
- Complex faction/reputation system based on knowledge (handled by `RelationshipGraph`).
