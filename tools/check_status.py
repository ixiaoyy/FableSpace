import subprocess, sys

result = subprocess.run(
    ["git", "status", "--short"],
    capture_output=True, text=True, cwd=r"d:\work\ai-"
)
print(result.stdout)
print(result.stderr)
