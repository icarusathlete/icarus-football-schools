import os
import re

dir_path = 'components'
files = [f for f in os.listdir(dir_path) if f.endswith('.tsx')]
for f in files:
    with open(os.path.join(dir_path, f), 'r') as file:
        content = file.read()
        
        # Check if it has something similar to bg-brand-900
        match = re.search(r'(<div[^>]*bg-brand-900[^>]*>.*?)(?:<div className="glass-card|<div className="grid|{/\* )', content, re.DOTALL)
        if match:
            print(f"--- {f} ---")
            lines = match.group(1).split('\n')
            for line in lines[:15]:
                print(line)
            if len(lines) > 15:
                print("...")
