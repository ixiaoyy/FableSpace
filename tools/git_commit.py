import subprocess, sys, os

os.chdir(r'd:\work\ai-')

# Add all tracked and untracked files, excluding temp files
subprocess.run([sys.executable, '-c', ''], check=True)  # warm up

# Stage files
result = subprocess.run(
    ['git', 'add',
     'docs/', 'fablemap/', 'frontend/', 'tests/', 'run_tests.py'],
    capture_output=True, text=True, cwd=r'd:\work\ai-'
)
print('git add:', result.returncode, result.stdout, result.stderr)

# Commit
result = subprocess.run(
    ['git', 'commit', '-m',
     'fix: all tests pass - lens/scene_capsule/orchestrator + AIO6 protocol\n\n- lens_engine: Rule 7 veil threshold >= 0.2 (fix drift lonely night)\n- scene_capsule: _resolve_visibility picks higher level; broadcast_echo/rift -> global\n- scene_capsule: allow_persona_address=False replaces address with 旅人\n- AIO6 SceneCapsuleGenerator: full protocol with sound_hints, cache_key, cooldown\n- orchestrator/schemas: extended CapsuleInput/CapsuleOutput fields\n- tests: test_lens_engine, test_orchestrator, test_scene_capsule, test_page all pass\n- 120 tests passed total'],
    capture_output=True, text=True, cwd=r'd:\work\ai-'
)
print('git commit:', result.returncode)
print(result.stdout)
print(result.stderr)

with open(r'd:\work\ai-\git_commit_result.txt', 'w', encoding='utf-8') as f:
    f.write(f'add rc={result.returncode}\n{result.stdout}\n{result.stderr}\n')
