# Black Theme Home/Search Reference Self Acceptance

Date: 2026-05-09
Base URL: http://127.0.0.1:4180

## Assertions

- Dark homepage uses `data-home-black-reference="index-black-real-dom"`.
- Dark discover/search uses `data-discover-black-reference="search-black-real-dom"`.
- Both pages do **not** use the former full-artboard hotspot shell.
- Home declares `data-home-reference-template="home-light-compatible"`; discover declares `data-discover-reference-template="search-light-compatible"`.
- Home has 7 real page boundaries (nav + 6 body sections), with the hero image-backed and the lower 5 sections rendered as DOM.
- Discover has 6 real page boundaries (nav + 5 body sections), all body sections rendered as DOM.
- Home card hotspots and discover result hotspots derive links from real tavern IDs.
- Discover keeps a real search input overlay.
- Desktop and mobile viewports have no horizontal overflow.

## Screenshots

- `D:\work\ai-\.trellis\tasks\05-09-05-09-black-theme-home-search-reference-alignment\artifacts\playwright\home-black-reference-desktop.png`
- `D:\work\ai-\.trellis\tasks\05-09-05-09-black-theme-home-search-reference-alignment\artifacts\playwright\home-black-reference-mobile.png`
- `D:\work\ai-\.trellis\tasks\05-09-05-09-black-theme-home-search-reference-alignment\artifacts\playwright\discover-black-reference-desktop.png`
- `D:\work\ai-\.trellis\tasks\05-09-05-09-black-theme-home-search-reference-alignment\artifacts\playwright\discover-black-reference-mobile.png`
