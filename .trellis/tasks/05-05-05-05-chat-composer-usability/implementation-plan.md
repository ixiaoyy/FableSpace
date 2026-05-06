# Implementation plan

1. Add a regression guard to `frontend/scripts/tavern-chat-workbench-test.mjs` for the compact chat log, fast composer, and folded visitor identity controls.
2. Remove the fixed desktop min-height/flex filler from `frontend/app/features/tavern-chat-workbench/index.tsx` so short histories do not create a large blank gap before the composer.
3. Keep long histories usable by bounding the chat log height and preserving overflow scrolling.
4. Fold display name and gender controls into a compact `发言身份` details row above the textarea.
5. Collapse secondary right-rail panels by default so they do not force first-screen height.
6. Run script tests, full frontend test suite, typecheck, build, and Playwright desktop/mobile visual self-acceptance.
