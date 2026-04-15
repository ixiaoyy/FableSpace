with open(r'd:\work\ai-\tests\test_e4_player_home.py', encoding='utf-8') as f:
    content = f.read()
with open(r'd:\work\ai-\test_tail.txt', 'w', encoding='utf-8') as out:
    out.write(content[2500:])
print('ok')
