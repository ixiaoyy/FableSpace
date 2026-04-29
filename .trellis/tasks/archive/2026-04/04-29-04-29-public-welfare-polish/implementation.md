# Implementation Notes

## Completed
- Replaced the 10 newly added NPC image sets in `frontend/public/assets/npcs/` with more detailed tavern-themed portrait illustrations at the same runtime paths.
- Added per-tavern `NPC 分工` world info entries for all 8 public-welfare taverns.
- Added per-tavern role-division gameplay entries for all 8 public-welfare taverns.
- Added focused regression coverage for NPC role-division world info and role-division gameplay discoverability.

## Verification
- `C:\Users\phpxi\miniconda3\python.exe -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py` -> 20 passed
- `C:\Users\phpxi\miniconda3\python.exe -m compileall -q backend/src` -> passed
- `npm --prefix .\frontend run build` -> passed after sandbox escalation due native dependency/spawn EPERM in sandbox
