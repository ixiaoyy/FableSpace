# Special Tavern Type Thin Layer

## Goal

Design the smallest reusable “special tavern type” layer for FableMap so cultivation taverns can be identified, created, filtered, and rendered without turning the product into a generic game/plugin framework.

## Todo

* Decide whether MVP extends existing `place_type` with a value such as `cultivation-retreat`, or stores a lower-risk owner-confirmed theme/play-pack marker.
* Define how create/discover/tavern pages display the type label and default copy.
* Define how special type initializes owner-confirmed templates without auto-publishing NPCs, world info, gameplay, or images.
* Update schema/docs/tests if a persisted enum or API contract changes.

## Acceptance Criteria

* [ ] Data/API boundary is chosen and documented.
* [ ] Owner sovereignty and real-coordinate constraints are preserved.
* [ ] Future types can reuse the layer without introducing a plugin marketplace.
* [ ] Verification plan includes backend/frontend tests relevant to any schema/UI change.

## Out of Scope

* Full plugin marketplace.
* Cross-tavern game framework.
* Platform-generated published content.
