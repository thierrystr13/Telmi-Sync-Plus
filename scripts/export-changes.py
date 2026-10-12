"""Export staged text changes for atomic publication through the GitHub connector."""
import json, subprocess,sys
paths = subprocess.check_output(['git', 'diff', '--cached', '--name-only', '-z']).decode().split('\0')
entries=[]
start=int(sys.argv[1]) if len(sys.argv)>1 else 0
count=int(sys.argv[2]) if len(sys.argv)>2 else len(paths)
for name in paths[start:start+count]:
    if not name: continue
    content=subprocess.check_output(['git','show',':'+name]).decode('utf-8')
    entries.append({'path':name,'mode':'100644','type':'blob','content':content})
print(json.dumps(entries, ensure_ascii=True))
