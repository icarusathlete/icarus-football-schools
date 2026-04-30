import re
import sys

def check_file(filename):
    print(f"Checking {filename}...")
    content = open(filename).read()
    content = re.sub(r'{/\*.*?\*/}', '', content, flags=re.DOTALL)
    full_tags = re.findall(r'<(/?)([a-zA-Z0-9\_]*)([^>]*)>', content, re.DOTALL)
    stack = []
    track = ['div', 'section', 'main', 'header', 'footer', 'aside', 'nav']
    for is_closing, name, attrs in full_tags:
        if name not in track: continue
        if attrs.strip().endswith('/'): continue
        if is_closing:
            if not stack:
                print(f"  ERROR: Extra </{name}>")
                stack.append('EXTRA_'+name)
                continue
            last = stack.pop()
            if last != name:
                print(f"  ERROR: Mismatch <{last}> vs </{name}>")
        else:
            stack.append(name)
    if stack: print(f"  Unclosed: {stack}")
    else: print("  Balanced!")

for f in ['components/EvaluationCard.tsx', 'components/EvaluationManager.tsx', 'components/MessagingManager.tsx', 'components/PlayerManager.tsx']:
    check_file(f)
