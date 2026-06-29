#!/usr/bin/env python3
"""Test all API endpoints for response time > 0.5s"""
import time
import httpx
import json
from collections import defaultdict

BASE_URL = "http://127.0.0.1:8950"
THRESHOLD = 0.5  # seconds

# Endpoints to test (method, path, params, body)
# Empty params/body means no extra data needed
ENDPOINTS = [
    # System endpoints
    ("GET", "/api/health"),
    ("GET", "/api/meta"),
    ("GET", "/api/v1/system/health"),
    ("GET", "/api/v1/system/meta"),

    # Tavern endpoints
    ("GET", "/api/taverns"),
    ("GET", "/api/v1/taverns"),
    ("GET", "/api/expressions"),

    # Tokenizer endpoints
    ("GET", "/api/tokenizers"),
    ("POST", "/api/tokenizers/count", {"text": "Hello world test"}),
    ("POST", "/api/tokenizers/count_messages", {"messages": [{"content": "Hello"}, {"content": "World"}]}),

    # Character card parsing
    ("POST", "/api/characters/parse", {"json": {"name": "Test", "description": "A test character"}}),

    # Expression inference (keyword mode - no LLM needed)
    ("POST", "/api/expression/infer", {"text": "Hello, how are you today?"}),

    # Memory endpoints (keyword only, no LLM)
    ("POST", "/api/memory/truncate", {"messages": [{"content": "Test"}], "max_tokens": 8192}),
    ("POST", "/api/memory/importance", {"messages": [{"content": "Test message"}]}),

    # Chat history (needs tavern_id, character_id, visitor_id)
    ("GET", "/api/chat/history", {"player_id": "test", "poi_id": "test"}),

    # WorldInfo test (keyword matching, no LLM)
    ("POST", "/api/worldinfo/test", {"tavern_id": "", "text": "test message"}),

    # Chat endpoints
    ("GET", "/api/taverns/test-tavern/chat", {"visitor_id": "test"}),
    ("GET", "/api/chats", {}),

    # TTS providers
    ("GET", "/api/tts/providers"),
]

# v1 API endpoints
V1_ENDPOINTS = [
    # Platform
    ("GET", "/api/v1/platform/stats"),
    ("GET", "/api/v1/platform/recent-memories"),

    # System
    ("GET", "/api/v1/system/health"),
    ("GET", "/api/v1/system/meta"),

    # Engagement
    ("GET", "/api/v1/engagement/me"),
    ("GET", "/api/v1/engagement/config"),

    # Affinity
    ("GET", "/api/v1/affinity/stages"),

    # Notifications
    ("GET", "/api/v1/notifications"),
    ("GET", "/api/v1/notifications/unread-count"),

    # Territories
    ("GET", "/api/v1/territories"),
    ("GET", "/api/v1/territories/check"),

    # Utilities
    ("GET", "/api/v1/utilities/tokenizers"),
    ("POST", "/api/v1/utilities/tokenizers/count", {"text": "Hello world"}),
    ("POST", "/api/v1/utilities/tokenizers/count_messages", {"messages": [{"content": "Test"}]}),

    # Affinity stages
    ("GET", "/api/v1/affinity/stages"),
]

def test_endpoint(client, method, path, params=None, json_data=None):
    """Test a single endpoint and return response time"""
    full_url = f"{BASE_URL}{path}"
    start = time.time()
    try:
        if method == "GET":
            response = client.get(full_url, params=params, timeout=30.0)
        elif method == "POST":
            response = client.post(full_url, params=params, json=json_data, timeout=30.0)
        elif method == "PUT":
            response = client.put(full_url, params=params, json=json_data, timeout=30.0)
        elif method == "DELETE":
            response = client.delete(full_url, params=params, timeout=30.0)
        else:
            return None, 0, f"Unknown method: {method}"

        elapsed = time.time() - start
        status = response.status_code
        return elapsed, status, None
    except Exception as e:
        elapsed = time.time() - start
        return elapsed, 0, str(e)


def main():
    print(f"Testing API endpoints against {BASE_URL}")
    print(f"Threshold: {THRESHOLD}s\n")
    print("=" * 80)

    slow_endpoints = []
    fast_endpoints = []
    error_endpoints = []

    with httpx.Client(timeout=30.0) as client:
        # Test main API endpoints
        print("\n### Main API Endpoints (/api/*) ###\n")
        for method, path, *args in ENDPOINTS:
            params = args[0] if args and isinstance(args[0], dict) else None
            json_data = args[1] if len(args) > 1 and isinstance(args[1], dict) else args[0] if args and isinstance(args[0], dict) else None

            elapsed, status, error = test_endpoint(client, method, path, params, json_data)

            if error:
                error_endpoints.append((method, path, elapsed, error))
                print(f"[ERROR] {method} {path}: {error} ({elapsed:.3f}s)")
            elif status >= 400:
                error_endpoints.append((method, path, elapsed, f"HTTP {status}"))
                print(f"[ERROR] {method} {path}: HTTP {status} ({elapsed:.3f}s)")
            elif elapsed > THRESHOLD:
                slow_endpoints.append((method, path, elapsed, status))
                print(f"[SLOW]  {method} {path}: {elapsed:.3f}s (HTTP {status})")
            else:
                fast_endpoints.append((method, path, elapsed, status))
                print(f"[OK]    {method} {path}: {elapsed:.3f}s (HTTP {status})")

        # Test v1 API endpoints
        print("\n### V1 API Endpoints (/api/v1/*) ###\n")
        for method, path, *args in V1_ENDPOINTS:
            params = args[0] if args and isinstance(args[0], dict) else None
            json_data = args[1] if len(args) > 1 and isinstance(args[1], dict) else args[0] if args and isinstance(args[0], dict) else None

            elapsed, status, error = test_endpoint(client, method, path, params, json_data)

            if error:
                error_endpoints.append((method, path, elapsed, error))
                print(f"[ERROR] {method} {path}: {error} ({elapsed:.3f}s)")
            elif status >= 400:
                error_endpoints.append((method, path, elapsed, f"HTTP {status}"))
                print(f"[ERROR] {method} {path}: HTTP {status} ({elapsed:.3f}s)")
            elif elapsed > THRESHOLD:
                slow_endpoints.append((method, path, elapsed, status))
                print(f"[SLOW]  {method} {path}: {elapsed:.3f}s (HTTP {status})")
            else:
                fast_endpoints.append((method, path, elapsed, status))
                print(f"[OK]    {method} {path}: {elapsed:.3f}s (HTTP {status})")

    # Summary
    print("\n" + "=" * 80)
    print("### SUMMARY ###\n")

    if slow_endpoints:
        print(f"[!] SLOW ENDPOINTS (> {THRESHOLD}s): {len(slow_endpoints)}")
        print("-" * 60)
        for method, path, elapsed, status in sorted(slow_endpoints, key=lambda x: -x[2]):
            print(f"  {elapsed:.3f}s  {method} {path}")
    else:
        print(f"[OK] No slow endpoints found (all < {THRESHOLD}s)")

    if error_endpoints:
        print(f"\n[!] ERROR ENDPOINTS: {len(error_endpoints)}")
        print("-" * 60)
        for method, path, elapsed, error in error_endpoints:
            print(f"  {method} {path}: {error} ({elapsed:.3f}s)")

    print(f"\n[i] Total: {len(fast_endpoints)} OK, {len(slow_endpoints)} slow, {len(error_endpoints)} errors")
    print(f"[i] Fast avg: {sum(e[2] for e in fast_endpoints)/len(fast_endpoints):.3f}s" if fast_endpoints else "")


if __name__ == "__main__":
    main()