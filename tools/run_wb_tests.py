import subprocess, sys
result = subprocess.run(
    [sys.executable, "-m", "pytest", "tests/test_world_builder.py", "-v", "--tb=short"],
    capture_output=True, text=True, cwd=r"d:\work\ai-"
)
output = result.stdout + result.stderr
with open(r"d:\work\ai-\wb_test_result.txt", "w", encoding="utf-8") as f:
    f.write(output)
print(output[-4000:])
