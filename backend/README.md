# FableMap Backend

Enterprise-style FastAPI backend for the FableMap rebuild.

## Development checks

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests --tb=short
```

## MySQL Database

FableMap supports both JSON file storage and MySQL database for tavern data persistence.
MySQL is recommended for production use due to better concurrency handling.

### Quick Start

1. **Install dependencies**:
   ```bash
   pip install sqlalchemy pymysql cryptography
   ```

2. **Create database** (using MySQL client):
   ```bash
   mysql -u root -p < backend/sql/migrations/001_initial_schema.sql
   ```

3. **Configure MySQL URL**:
   ```bash
   # Option 1: Environment variable
   export FABLEMAP_MYSQL_URL="mysql+pymysql://user:pass@localhost:3306/fablemap"

   # Option 2: In code
   from fablemap_api.infrastructure.settings import ApiSettings
   settings = ApiSettings(mysql_url="mysql+pymysql://user:pass@localhost:3306/fablemap")
   ```

4. **Run migration** (optional, for existing JSON data):
   ```bash
   python -m fablemap_api.infrastructure.migrate \
       --json-root .fablemap-api/taverns \
       --mysql-url "mysql+pymysql://user:pass@localhost:3306/fablemap"
   ```

5. **Start application**:
   ```bash
   uvicorn fablemap_api.main:app --reload
   ```

### Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `FABLEMAP_MYSQL_URL` | (empty) | MySQL connection URL |
| `FABLEMAP_SEED_DEFAULT_TAVERNS` | `1` | Auto-seed public welfare taverns |

### Storage Backend Selection

- **No `FABLEMAP_MYSQL_URL`**: Uses JSON file storage (`.fablemap-api/taverns/`)
- **`FABLEMAP_MYSQL_URL` set**: Uses MySQL database

### Database Schema

See `backend/sql/migrations/001_initial_schema.sql` for the complete schema.

Tables:
- `taverns` - Main tavern data
- `characters` - NPC characters (SillyTavern compatible)
- `world_info` - World knowledge entries
- `visitors` - Visitor states and relationships
- `chat_messages` - Chat history
- `memory_atoms` - Structured memories
- `gameplay_sessions` - Gameplay session state
- `llm_configs` - LLM configuration (secrets vault)
