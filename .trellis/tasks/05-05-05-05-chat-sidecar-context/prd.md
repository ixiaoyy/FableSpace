# Chat sidecar context

## Problem

The right sidebar of the tavern chat workbench currently exposes authoring/project-style content: current NPC profile, first message, expression thumbnails, map coordinates, access mode, and management copy. For a visitor who is trying to chat, this reads like product documentation instead of conversation help.

## Acceptance

- Remove the duplicated NPC profile/first-message/expression-thumbnail sidebar from the chat surface.
- Replace project-like "酒馆信息 / 真实地图锚点与公开说明" with an in-world conversation context panel.
- Keep only information that helps the user chat now: who is speaking, scene mood, memory/revisit state, and optional quick opening lines.
- Do not expose visitor-facing admin/project explanation copy in the non-owner sidebar.
- Preserve compact composer and no large blank gap behavior from the previous fix.
