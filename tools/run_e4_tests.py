import subprocess, sys
result = subprocess.run(
    [sys.executable, "-m", "pytest", "tests/test_e4_player_home.py", "-v", "--tb=short"],
    capture_output=True, text=True, cwd=r"d:\work\ai-"
)
with open(r"d:\work\ai-\e4_test_result.txt", "w", encoding="utf-8") as f:
    f.write(result.stdout + result.stderr)
print(result.stdout + result.stderr)
