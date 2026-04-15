import sys

# Read memory_graph.py tail
with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    mg = f.read()

# Read test file tail
with open(r'd:\work\ai-\tests\test_e4_player_home.py', encoding='utf-8') as f:
    test = f.read()

with open(r'd:\work\ai-\mg_tail.txt', 'w', encoding='utf-8') as f:
    f.write('=== memory_graph.py (from line 100) ===\n')
    lines = mg.splitlines()
    for i, line in enumerate(lines[99:], 100):
        f.write(f'{i+1}: {line}\n')
    f.write('\n=== test_e4_player_home.py (from line 80) ===\n')
    lines2 = test.splitlines()
    for i, line in enumerate(lines2[79:], 80):
        f.write(f'{i+1}: {line}\n')

print('done')
