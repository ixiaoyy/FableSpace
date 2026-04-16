import ast

with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    src = f.read()

tree = ast.parse(src)
lines = src.splitlines()

for node in ast.walk(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        name = node.name
        if any(kw in name for kw in ['ghost', 'home', 'trace']):
            start = node.lineno - 1
            end = node.end_lineno
            print(f'=== {name} (lines {node.lineno}-{end}) ===')
            for line in lines[start:end]:
                print(line)
            print()
