# Frontend App Assets

Files under `frontend/app/assets/` are imported by route modules, features, or product compatibility modules and are processed by Vite.

## Canonical layout

```text
frontend/app/assets/
├── discover/
│   └── reference/        # discover page cover/radar reference images
├── homepage/
│   └── reference/        # homepage and conversion module illustrations
├── fable-map-05-10/
│   ├── brand/            # SoulLink brand raster lockups
│   ├── home-black/       # SoulLink home runtime materials
│   └── discover/cards/   # FableMap discover/search shared 1:1 card materials
└── npc-style-cast/       # imported fallback NPC portraits and reference sheet
```

Product parity map packs currently remain under `frontend/app/product/assets/map-packs/` because `frontend/app/product/mapAssets/manifest.js` imports that stable compatibility path.

## Rules

- Use `frontend/app/assets/<feature>/...` for Vite-imported route/feature images.
- Use `frontend/public/assets/...` instead when backend seed data or persisted payloads need stable public URLs.
- Use `artifacts/assets/<YYYY-MM-DD-task>/...` for dated source, contact-sheet, or audit material.
- For `fable-map-05-10`, accepted runtime assets stay in explicit page/material folders (for example `brand/`, `home-black/`, and shared `discover/cards/`); avoid ad-hoc import folders for shipped page materials.
