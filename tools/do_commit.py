import subprocess, sys

cwd = r'd:\work\ai-'

# Stage only the two changed files
for cmd in [
    ['git', 'add', 'fablemap/world_builder.py', 'tests/test_world_builder.py'],
    ['git', 'commit', '-m', 'feat: add prefer_zh localization to world_builder (region name/summary/poi description)'],
]:
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    print(' '.join(cmd))
    print(r.stdout)
    print(r.stderr)
    if r.returncode != 0:
        print('FAILED', r.returncode)
        sys.exit(1)

print('commit done')
