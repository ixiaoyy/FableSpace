import subprocess, sys
result = subprocess.run(
    [sys.executable, '-c',
     'with open(r\'d:\\\\work\\\\ai-\\\\fablemap\\\\memory_graph.py\\', encoding=\'utf-8\') as f: content=f.read(); print(content[3900:])'],
    capture_output=True, text=True
)
print(result.stdout)
print(result.stderr)
