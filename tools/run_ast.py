import ast, sys

with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    src = f.read()

tree = ast.parse(src)
lines = src.splitlines()
output = []

for node in ast.walk(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        name = node.name
        if any(kw in name for kw in ['ghost', 'home', 'trace', 'evolve', 'merge', 'persona']):
            start = node.lineno - 1
            end = node.end_lineno
            output.append(f'=== {name} (lines {node.lineno}-{end}) ===')
            for line in lines[start:end]:
                output.append(line)
            output.append('')

result = '\n'.join(output)
with open(r'd:\work\ai-\ast_result.txt', 'w', encoding='utf-8') as f:
    f.write(result)
sys.stdout.write(result)
