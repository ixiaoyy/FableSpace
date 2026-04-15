import subprocess, sys
result = subprocess.run(
    ['git', 'push'],
    capture_output=True, text=True, cwd=r'd:\work\ai-'
)
output = result.stdout + result.stderr
print(output)
with open(r'd:\work\ai-\git_push_result.txt', 'w', encoding='utf-8') as f:
    f.write(f'rc={result.returncode}\n{output}\n')
