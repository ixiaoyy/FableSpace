with open(r'd:\work\ai-\e4_test_result.txt', encoding='utf-8') as f:
    content = f.read()
with open(r'd:\work\ai-\e4_full_error.txt', 'w', encoding='utf-8') as out:
    out.write(content)
print(content)
