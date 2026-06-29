#!/usr/bin/env python3
"""Test all API endpoints for response time > 0.5s using urllib"""
import time
import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:8950"
THRESHOLD = 0.5  # seconds


def test_endpoint(method, path, json_data=None):
    """Test a single endpoint and return response time"""
    url = f"{BASE_URL}{path}"
    start = time.time()
    try:
        if method == "GET":
            with urllib.request.urlopen(url, timeout=30.0) as response:
                status = response.status
        elif method in ("POST", "PUT", "DELETE"):
            data = json.dumps(json_data).encode() if json_data else b"{}"
            req = urllib.request.Request(url, data=data, method=method)
            req.add_header("Content-Type", "application/json")
            with urllib.request.urlopen(req, timeout=30.0) as response:
                status = response.status
        else:
            return None, 0, f"Unknown method: {method}"

        elapsed = time.time() - start
        return elapsed, status, None
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        return elapsed, e.code, None
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

    # Main API endpoints
    MAIN_ENDPOINTS = [
        ("GET", "/api/health"),
        ("GET", "/api/meta"),
        ("GET", "/api/taverns"),
        ("GET", "/api/expressions"),
        ("GET", "/api/tokenizers"),
        ("GET", "/api/tts/providers"),
        ("GET", "/api/chats"),
        ("POST", "/api/tokenizers/count", {"text": "Hello world test"}),
        ("POST", "/api/tokenizers/count_messages", {"messages": [{"content": "Hello"}, {"content": "World"}]}),
        ("POST", "/api/characters/parse", {"json": {"name": "Test", "description": "A test character"}}),
        ("POST", "/api/expression/infer", {"text": "Hello, how are you today?"}),
        ("POST", "/api/memory/truncate", {"messages": [{"content": "Test"}], "max_tokens": 8192}),
        ("POST", "/api/memory/importance", {"messages": [{"content": "Test message"}]}),
        ("GET", "/api/chat/history?player_id=test&poi_id=test"),
        ("POST", "/api/worldinfo/test", {"tavern_id": "", "text": "test message"}),
    ]

    # v1 API endpoints
    V1_ENDPOINTS = [
        ("GET", "/api/v1/system/health"),
        ("GET", "/api/v1/system/meta"),
        ("GET", "/api/v1/platform/stats"),
        ("GET", "/api/v1/platform/recent-memories"),
        ("GET", "/api/v1/taverns"),
        ("GET", "/api/v1/engagement/me"),
        ("GET", "/api/v1/engagement/config"),
        ("GET", "/api/v1/affinity/stages"),
        ("GET", "/api/v1/notifications"),
        ("GET", "/api/v1/notifications/unread-count"),
        ("GET", "/api/v1/territories"),
        ("GET", "/api/v1/territories/check"),
        ("GET", "/api/v1/utilities/tokenizers"),
        ("POST", "/api/v1/utilities/tokenizers/count", {"text": "Hello world"}),
        ("POST", "/api/v1/utilities/tokenizers/count_messages", {"messages": [{"content": "Test"}]}),
        ("POST", "/api/v1/worldinfo/test", {"tavern_id": "", "text": "test"}),
    ]

    print("\n### Main API Endpoints (/api/*) ###\n")
    for method, path, *args in MAIN_ENDPOINTS:
        json_data = args[0] if args else None
        elapsed, status, error = test_endpoint(method, path, json_data)

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

    print("\n### V1 API Endpoints (/api/v1/*) ###\n")
    for method, path, *args in V1_ENDPOINTS:
        json_data = args[0] if args else None
        elapsed, status, error = test_endpoint(method, path, json_data)

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

    total = len(fast_endpoints) + len(slow_endpoints) + len(error_endpoints)
    avg_fast = sum(e[2] for e in fast_endpoints) / len(fast_endpoints) if fast_endpoints else 0
    print(f"\n[i] Total: {len(fast_endpoints)} OK, {len(slow_endpoints)} slow, {len(error_endpoints)} errors ({total} tested)")
    if fast_endpoints:
        print(f"[i] Fast avg: {avg_fast:.3f}s")


if __name__ == "__main__":
    main()