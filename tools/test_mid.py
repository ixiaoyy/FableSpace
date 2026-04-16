with open(r'd:\work\ai-\tests\test_e4_player_home.py', encoding='utf-8') as f:
    src = f.read()
lines = src.splitlines()
with open(r'd:\work\ai-\test_mid_result.txt', 'w', encoding='utf-8') as out:
    for i, line in enumerate(lines[49:], 50):
        out.write(f'{i}: {line}\n')
