import subprocess
result = subprocess.run(
    ['git', 'diff', 'HEAD', 'fablemap/world_builder.py', 'tests/test_world_builder.py'],
    capture_output=True, text=True, cwd=r'd:\work\ai-'
)
with open(r'd:\work\ai-\diff_output.txt', 'w', encoding='utf-8') as f:
    f.write(result.stdout)
print(result.stdout[:6000])
