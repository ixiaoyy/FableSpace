with open(r'd:/work/ai-/pytest_result.txt', encoding='utf-8') as f:
    content = f.read()
print(content[-5000:])
