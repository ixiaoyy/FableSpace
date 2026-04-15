with open(r'd:\work\ai-\tests\test_e4_player_home.py', encoding='utf-8') as f:
    src = f.read()
lines = src.splitlines()
with open(r'd:\work\ai-\test_tail2.txt', 'w', encoding='utf-8') as out:
    out.write(f'Total lines: {len(lines)}\n')
    for i, line in enumerate(lines[79:], 80):
        out.write(f'{i}: {line}\n')
