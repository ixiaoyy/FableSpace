# Legacy NPC asset reference manifest

Audited: 2026-07-16

This manifest covers every file under the two legacy NPC asset roots. A row that
uses a glob is exhaustive for the named directories/stems and includes both the
image and its prompt sidecar.

## Decision key

- `KEEP_ACTIVE`: loaded by the current story-world UI.
- `KEEP_COMPAT`: not used by the three new seeds, but retained because historical
  or user-owned records may still contain the public URL.
- `KEEP_OTHER_UI`: used by another current UI surface.
- `DELETE_DEFERRED`: no current runtime import was found, but deletion is deferred
  until a replacement/reference-art cleanup is scoped separately.

## Public expression assets (168 files)

Root: `apps/web/public/assets/npcs/public-welfare/`

Every directory below contains exactly `neutral.png`, `joy.png`, `anger.png`,
`curiosity.png`, `embarrassment.png`, and `expression-set.prompt.md`.

| Character directories (all six files in each directory) | Count | Decision | Evidence |
| --- | ---: | --- | --- |
| `char_pw_9_delta`, `char_pw_aheng`, `char_pw_ahuai`, `char_pw_anlan`, `char_pw_dengxin`, `char_pw_heguang`, `char_pw_huoyan` | 42 | `KEEP_COMPAT` | Historical character payloads can still resolve legacy `/assets/npcs/char_pw_*-<expression>.png` URLs through `normalizePublicWelfareNpcAssetPath`. |
| `char_pw_luming`, `char_pw_mika_nurse`, `char_pw_mimi_nya`, `char_pw_mozhan`, `char_pw_mu_mu`, `char_pw_nanxing_liaison`, `char_pw_pi_pi` | 42 | `KEEP_COMPAT` | Same compatibility path; user-owned records sharing a retired space ID are intentionally not modified. |
| `char_pw_qiaoqiao`, `char_pw_qiaoshou`, `char_pw_qingyou_records`, `char_pw_shiyi`, `char_pw_suoyin`, `char_pw_tongling`, `char_pw_v17` | 42 | `KEEP_COMPAT` | Same compatibility path; deleting the public files would break persisted avatar/sprite URLs. |
| `char_pw_wenjian`, `char_pw_xiaozhou`, `char_pw_xingdai`, `char_pw_yeyu`, `char_pw_yinpiao`, `char_pw_zhideng`, `char_pw_zhijian` | 42 | `KEEP_COMPAT` | Same compatibility path; no new story seed depends on these files. |

Conclusion: none of the 168 public files can be deleted safely while preserved
user-owned/historical character payloads may still reference them. They are
compatibility assets, not current default-content dependencies.

## Bundled NPC style-cast assets (98 files)

Root: `apps/web/app/assets/npc-style-cast/`

| Exact files / exhaustive pattern | Count | Decision | Evidence |
| --- | ---: | --- | --- |
| `space-npc-style-cast.png`, `space-npc-style-cast.prompt.md` | 2 | `DELETE_DEFERRED` | No runtime import found; retain until the reference-art source is reviewed as a separate asset task. |
| `portraits-hd/{guardian-a,guardian-b,healer-a,healer-b,merchant-a,merchant-b,scholar-a,scholar-b,spirit-a,spirit-b,wanderer-a,wanderer-b}.{png,prompt.md}` | 24 | `KEEP_ACTIVE` | Imported by `portraitCatalogConfig.ts`; the six launch characters resolve through their appearance archetypes instead of legacy character IDs. |
| `portraits/{guardian-a,guardian-b,healer-a,healer-b,merchant-a,merchant-b,scholar-a,scholar-b,spirit-a,spirit-b,wanderer-a,wanderer-b}.{png,prompt.md}` | 24 | `KEEP_ACTIVE` | Source/sidecar set for the active HD archetype catalog; HD prompt files record these source assets. |
| `portraits-hd/commission-zhideng.{png,prompt.md}` | 2 | `KEEP_OTHER_UI` | The PNG is imported as the reference-artboard user avatar; the sidecar documents that asset. |
| `portraits/commission-zhideng.{png,prompt.md}` | 2 | `KEEP_OTHER_UI` | Source/sidecar set for the still-used HD reference-artboard asset. |
| `portraits-hd/{alien-9-delta,alien-mu-mu,alien-pi-pi,alien-v17,cat-accountant-yinpiao,commission-chimao,commission-mozhan,mist-bartender-lanbo,neon-oracle-iris-zero,starport-boxing,terminal-repair-luotong}.{png,prompt.md}` | 22 | `DELETE_DEFERRED` | No runtime import remains after removing legacy character-ID portrait bindings. |
| `portraits/{alien-9-delta,alien-mu-mu,alien-pi-pi,alien-v17,cat-accountant-yinpiao,commission-chimao,commission-mozhan,mist-bartender-lanbo,neon-oracle-iris-zero,starport-boxing,terminal-repair-luotong}.{png,prompt.md}` | 22 | `DELETE_DEFERRED` | Source/sidecar pairs for the unreferenced HD files; delete together only after a separately scoped reference-art cleanup. |

Totals: 98 bundled files classified; 50 active/other-UI files retained and 48
unreferenced files marked for deferred paired deletion.

## New-world fallback proof

The six launch characters use existing appearance archetypes resolved by
`portraitCatalog.ts`:

| Launch character | Appearance archetype | Active fallback |
| --- | --- | --- |
| 魏司籍 | `archive-curator` | scholar |
| 昭宁公主 | `fortune-reader` | spirit |
| 阿绯 | `fortune-reader` | spirit |
| 宁长风 | `dusty-bookshop` | scholar |
| 沈老师 | `museum-docent` | scholar |
| 苏晚晴 | `city-photographer` | merchant |

No launch character relies on a `char_pw_*` explicit portrait mapping or an old
public-welfare expression directory.
