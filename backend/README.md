# FableMap Backend

Enterprise-style FastAPI backend for the FableMap rebuild.

## Development checks

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests --tb=short
```

## Runtime Database

FableMap uses SQLAlchemy database storage by default. Docker Compose reads
`FABLEMAP_DATABASE_URL` from `.env` and passes it to the backend. Local Python
API entrypoints also auto-load the project-root `.env`; SQLite fallback at
`<FABLEMAP_OUTPUT_ROOT>/fablemap.sqlite3` is only used when neither the process
environment nor `.env` provides a database URL. JSON file storage remains only
as an explicit compatibility fallback via `FABLEMAP_STORAGE_BACKEND=json`.

### Quick Start

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Docker Compose with `.env` database URL**:
   ```bash
   docker compose up --build
   ```

3. **Host Python backend against the same `.env` MySQL URL**:
   ```bash
   export PYTHONPATH="$PWD/backend/src"
   uvicorn fablemap_api.main:app --reload
   ```

4. **Run migration** (optional, for existing JSON data):
   ```bash
   # Current local SQLite DB -> .env FABLEMAP_DATABASE_URL target
   python -m fablemap_api.infrastructure.migrate_database

   # Older JSON/file runtime data -> explicit target URL
   python -m fablemap_api.infrastructure.migrate \
       --json-root .fablemap-api/taverns \
       --database-url "mysql+pymysql://user:pass@localhost:3306/fablemap"
   ```

### Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `FABLEMAP_DATABASE_URL` | SQLite fallback for direct local runs; read from `.env` by Compose | Preferred SQLAlchemy database URL |
| `FABLEMAP_MYSQL_URL` | (empty) | Legacy database URL alias |
| `FABLEMAP_STORAGE_BACKEND` | `database` | Use `json` only for explicit legacy fallback |
| `FABLEMAP_SEED_DEFAULT_TAVERNS` | `1` | Auto-seed public welfare taverns |

### Storage Backend Selection

- **Docker Compose**: passes `.env` `FABLEMAP_DATABASE_URL` to the backend.
- **Direct local Python, no database URL**: uses SQLite at `<output_root>/fablemap.sqlite3`.
- **`FABLEMAP_DATABASE_URL` set**: uses that SQLAlchemy database URL.
- **`FABLEMAP_STORAGE_BACKEND=json`**: uses legacy JSON file storage (`.fablemap-api/taverns/`).

### Database Schema

SQLAlchemy models live in `backend/src/fablemap_api/infrastructure/models.py`;
`Base.metadata.create_all(...)` creates tables on startup.

Tables:
- `taverns` - Main tavern data
- `characters` - NPC characters (SillyTavern compatible)
- `world_info` - World knowledge entries
- `visitors` - Visitor states and relationships
- `chat_messages` - Chat history
- `memory_atoms` - Structured memories
- `gameplay_sessions` - Gameplay session state
- `llm_configs` - LLM configuration (secrets vault)
