
import sys
import re

path = 'components/PlayerPortal.tsx'
with open(path, 'r', encoding='latin-1') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    if i > 710: break
    line_clean = re.sub(r'<div[^>]*/>', '', line)
    opens = re.findall(r'<div(?!\s*/)', line_clean)
    for _ in opens: stack.append((i+1, line.strip()))
    closes = re.findall(r'</div', line_clean)
    for _ in closes:
        if stack: stack.pop()

print(f"Unclosed at line 710: {len(stack)}")
for l, c in stack: print(f"Line {l}: {c[:50]}")
