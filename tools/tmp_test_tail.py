with open(r'd:\work\ai-\tests\test_e4_player_home.py', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines[80:], start=81):
    print(f'{i}: {line}', end='')
