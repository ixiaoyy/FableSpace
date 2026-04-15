"""
Auth — user authentication and session management.

Inspired by SillyTavern's session-based auth:
- Token-based authentication
- Session management
- User accounts (multi-user mode)
- SSO support (Authelia, Authentik)
- API key management
"""

from __future__ import annotations

import hashlib
import logging
import secrets
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Models ──────────────────────────────────────────────────────────────────────


@dataclass
class User:
    """User account."""
    id: str = ""
    username: str = ""
    password_hash: str = ""
    salt: str = ""
    created_at: str = ""
    last_login: str = ""
    role: str = "user"  # "user" | "admin"
    # SSO
    sso_provider: str = ""
    sso_id: str = ""
    # Preferences
    preferences: dict = field(default_factory=dict)


@dataclass
class Session:
    """User session."""
    id: str = ""
    user_id: str = ""
    token: str = ""
    created_at: float = 0
    expires_at: float = 0
    ip_address: str = ""
    user_agent: str = ""


@dataclass
class ApiKey:
    """API key for programmatic access."""
    id: str = ""
    user_id: str = ""
    name: str = ""
    key_hash: str = ""
    created_at: float = 0
    last_used: float = 0
    permissions: list[str] = field(default_factory=list)


# ─── Auth Store ─────────────────────────────────────────────────────────────────


class AuthStore:
    """
    File-based auth store — mirrors FableMap's JSON-based persistence.

    Users and sessions are stored in JSON files.
    """

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.users_file = data_dir / "users.json"
        self.sessions_file = data_dir / "sessions.json"
        self.apikeys_file = data_dir / "apikeys.json"
        self._ensure_files()

    def _ensure_files(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if not self.users_file.exists():
            self.users_file.write_text("{}", "utf-8")
        if not self.sessions_file.exists():
            self.sessions_file.write_text("{}", "utf-8")
        if not self.apikeys_file.exists():
            self.apikeys_file.write_text("{}", "utf-8")

    def _load_users(self) -> dict[str, dict]:
        import json
        try:
            return json.loads(self.users_file.read_text("utf-8"))
        except Exception:
            return {}

    def _save_users(self, users: dict[str, dict]) -> None:
        import json
        self.users_file.write_text(json.dumps(users, ensure_ascii=False, indent=2), "utf-8")

    def _load_sessions(self) -> dict[str, dict]:
        import json
        try:
            return json.loads(self.sessions_file.read_text("utf-8"))
        except Exception:
            return {}

    def _save_sessions(self, sessions: dict[str, dict]) -> None:
        import json
        self.sessions_file.write_text(json.dumps(sessions, ensure_ascii=False, indent=2), "utf-8")

    def _load_apikeys(self) -> dict[str, dict]:
        import json
        try:
            return json.loads(self.apikeys_file.read_text("utf-8"))
        except Exception:
            return {}

    def _save_apikeys(self, apikeys: dict[str, dict]) -> None:
        import json
        self.apikeys_file.write_text(json.dumps(apikeys, ensure_ascii=False, indent=2), "utf-8")

    # ── User management ──────────────────────────────────────────────────────────

    def create_user(
        self,
        username: str,
        password: str,
        role: str = "user",
    ) -> User:
        """Create a new user account."""
        import json

        users = self._load_users()
        if username in users or any(u.get("username") == username for u in users.values()):
            raise AuthError(f"User '{username}' already exists")

        salt = secrets.token_hex(32)
        password_hash = self._hash_password(password, salt)
        user_id = f"user_{uuid.uuid4().hex[:12]}"

        user = User(
            id=user_id,
            username=username,
            password_hash=password_hash,
            salt=salt,
            created_at=self._now_iso(),
            role=role,
        )

        users[user_id] = {
            "id": user.id,
            "username": user.username,
            "password_hash": user.password_hash,
            "salt": user.salt,
            "created_at": user.created_at,
            "last_login": "",
            "role": user.role,
            "sso_provider": "",
            "sso_id": "",
            "preferences": {},
        }
        self._save_users(users)
        logger.info(f"Created user: {username} ({user_id})")
        return user

    def get_user(self, username: str) -> Optional[User]:
        """Get user by username."""
        users = self._load_users()
        for user_data in users.values():
            if user_data.get("username") == username:
                return self._dict_to_user(user_data)
        return None

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        users = self._load_users()
        if user_id in users:
            return self._dict_to_user(users[user_id])
        return None

    def verify_password(self, username: str, password: str) -> Optional[User]:
        """Verify username + password. Returns User if valid."""
        user = self.get_user(username)
        if not user:
            return None
        password_hash = self._hash_password(password, user.salt)
        if password_hash == user.password_hash:
            return user
        return None

    def update_last_login(self, user_id: str) -> None:
        """Update last login timestamp."""
        users = self._load_users()
        if user_id in users:
            users[user_id]["last_login"] = self._now_iso()
            self._save_users(users)

    def delete_user(self, user_id: str) -> bool:
        """Delete a user account."""
        users = self._load_users()
        if user_id in users:
            del users[user_id]
            self._save_users(users)
            return True
        return False

    # ── Session management ──────────────────────────────────────────────────────

    def create_session(
        self,
        user_id: str,
        timeout_seconds: int = 86400,
        ip_address: str = "",
        user_agent: str = "",
    ) -> Session:
        """Create a new session for a user."""
        import json

        sessions = self._load_sessions()

        # Clean expired sessions
        now = time.time()
        sessions = {k: v for k, v in sessions.items() if v.get("expires_at", 0) > now}
        self._save_sessions(sessions)

        token = secrets.token_urlsafe(32)
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        now_ts = time.time()

        session = Session(
            id=session_id,
            user_id=user_id,
            token=token,
            created_at=now_ts,
            expires_at=now_ts + timeout_seconds,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        sessions[session_id] = {
            "id": session.id,
            "user_id": session.user_id,
            "token": session.token,
            "created_at": session.created_at,
            "expires_at": session.expires_at,
            "ip_address": session.ip_address,
            "user_agent": session.user_agent,
        }
        self._save_sessions(sessions)
        return session

    def verify_session(self, token: str) -> Optional[Session]:
        """Verify a session token. Returns Session if valid and not expired."""
        sessions = self._load_sessions()
        now = time.time()
        for sess_data in sessions.values():
            if sess_data.get("token") == token:
                if sess_data.get("expires_at", 0) > now:
                    return Session(**sess_data)
        return None

    def revoke_session(self, token: str) -> bool:
        """Revoke a session."""
        sessions = self._load_sessions()
        for sess_id, sess_data in list(sessions.items()):
            if sess_data.get("token") == token:
                del sessions[sess_id]
                self._save_sessions(sessions)
                return True
        return False

    def revoke_all_sessions(self, user_id: str) -> int:
        """Revoke all sessions for a user."""
        sessions = self._load_sessions()
        original_count = len(sessions)
        sessions = {k: v for k, v in sessions.items() if v.get("user_id") != user_id}
        self._save_sessions(sessions)
        return original_count - len(sessions)

    def clean_expired_sessions(self) -> int:
        """Remove expired sessions."""
        sessions = self._load_sessions()
        now = time.time()
        original = len(sessions)
        sessions = {k: v for k, v in sessions.items() if v.get("expires_at", 0) > now}
        self._save_sessions(sessions)
        return original - len(sessions)

    # ── SSO ────────────────────────────────────────────────────────────────────

    def get_or_create_sso_user(
        self,
        provider: str,
        sso_id: str,
        username: str,
        preferences: dict = None,
    ) -> User:
        """Get or create a user via SSO."""
        users = self._load_users()

        # Find existing user with this SSO
        for user_data in users.values():
            if (user_data.get("sso_provider") == provider and
                user_data.get("sso_id") == sso_id):
                return self._dict_to_user(user_data)

        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = User(
            id=user_id,
            username=username,
            password_hash="",
            salt="",
            created_at=self._now_iso(),
            role="user",
            sso_provider=provider,
            sso_id=sso_id,
            preferences=preferences or {},
        )

        users[user_id] = {
            "id": user.id,
            "username": user.username,
            "password_hash": "",
            "salt": "",
            "created_at": user.created_at,
            "last_login": "",
            "role": user.role,
            "sso_provider": user.sso_provider,
            "sso_id": user.sso_id,
            "preferences": user.preferences,
        }
        self._save_users(users)
        return user

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _hash_password(password: str, salt: str) -> str:
        return hashlib.sha256((password + salt).encode()).hexdigest()

    @staticmethod
    def _dict_to_user(data: dict) -> User:
        return User(
            id=data.get("id", ""),
            username=data.get("username", ""),
            password_hash=data.get("password_hash", ""),
            salt=data.get("salt", ""),
            created_at=data.get("created_at", ""),
            last_login=data.get("last_login", ""),
            role=data.get("role", "user"),
            sso_provider=data.get("sso_provider", ""),
            sso_id=data.get("sso_id", ""),
            preferences=data.get("preferences", {}),
        )

    @staticmethod
    def _now_iso() -> str:
        from datetime import UTC, datetime
        return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# ─── Auth Middleware ─────────────────────────────────────────────────────────────


class AuthError(Exception):
    """Authentication/authorization error."""
    pass


def require_auth(
    token: Optional[str],
    store: AuthStore,
    required_role: str = "user",
) -> User:
    """FastAPI dependency: require authentication."""
    if not token:
        raise AuthError("Authentication required")

    session = store.verify_session(token)
    if not session:
        raise AuthError("Invalid or expired session")

    user = store.get_user_by_id(session.user_id)
    if not user:
        raise AuthError("User not found")

    if required_role == "admin" and user.role != "admin":
        raise AuthError("Admin access required")

    return user


# ─── SSO Providers ──────────────────────────────────────────────────────────────


class SSOManager:
    """Manage SSO authentication (Authelia, Authentik)."""

    def __init__(self, store: AuthStore):
        self.store = store

    async def handle_authelia_callback(
        self,
        remote_user: str,
        groups: list[str] = None,
    ) -> User:
        """Handle Authelia callback."""
        return self.store.get_or_create_sso_user(
            provider="authelia",
            sso_id=remote_user,
            username=remote_user.lower(),
            preferences={"groups": groups or []},
        )

    async def handle_authentik_callback(
        self,
        user_id: str,
        username: str,
        groups: list[str] = None,
    ) -> User:
        """Handle Authentik callback."""
        return self.store.get_or_create_sso_user(
            provider="authentik",
            sso_id=user_id,
            username=username,
            preferences={"groups": groups or []},
        )
