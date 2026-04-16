import subprocess, sys
result = subprocess.run(
    [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short"],
    capture_output=True, text=True, cwd=r"d:\work\ai-"
)
output = result.stdout + result.stderr
with open(r"d:\work\ai-\pytest_result.txt", "w", encoding="utf-8") as f:
    f.write(output)
print(output[-4000:])
