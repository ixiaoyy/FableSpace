# Cultivation Offline Return Loop

## Goal

Design the cultivation tavern online/offline idle loop as visitor-private, bounded return-visit progression that produces text records rather than farmable resources.

## Todo

* Choose the loop model: recommended hybrid of daily return + stage event.
* Define private progress fields: last return date/time, current mind-state stage, recent retreat summary, and unlocked prompts/events.
* Define caps and anti-farming rules for offline accumulation.
* Define how return results are shown as “闭关纪要 / 梦境 / NPC 留言 / 心境微变”.
* Decide whether the first MVP persists through existing VisitorState/GameplaySession or a dedicated private bucket.

## Acceptance Criteria

* [ ] Offline progress is visitor-private and not included in public Tavern payload.
* [ ] Results are bounded, replayable, and explainable.
* [ ] No paid acceleration, inventory economy, or competitive ranking is introduced.
* [ ] Failure/degraded behavior is defined for missing data or stale taverns.

## Out of Scope

* Real-time background jobs required for every visitor.
* Infinite resource farming.
* Global online/offline status or social presence.
