"""Export staged text changes for atomic publication through the GitHub connector."""
import json, subprocess
from pathlib import Path
paths = subprocess.check_output(['git', 'diff', '--cached', '--name-only', '-z']).decode().split('\0')
entries=[]
for name in paths:
    if not name: continue
    file=Path(name)
    entries.append({'path':name,'mode':'100644','type':'blob','content':file.read_text(encoding='utf-8')})
print(json.dumps(entries, ensure_ascii=True))
