import json, urllib.request, xml.etree.ElementTree as ET, concurrent.futures, datetime,sys
from pathlib import Path
sources=json.loads(Path('public/MainEvents/Multimedia/sources.json').read_text(encoding='utf-8'))
def audit(s):
 result={**s,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'downloadPolicy':'metadata-only-until-rights-confirmed'}
 try:
  req=urllib.request.Request(s['url'],headers={'User-Agent':'TELMI-Sync-Plus/0.20 (RSS validation)'})
  with urllib.request.urlopen(req,timeout=30) as response:
   result.update(httpStatus=response.status,finalUrl=response.url)
   content=response.read(20*1024*1024+1)
  if len(content)>20*1024*1024 or b'<!DOCTYPE' in content or b'<!ENTITY' in content: raise ValueError('XML unsafe or oversized')
  root=ET.fromstring(content); channel=root.find('channel'); title=(channel.findtext('title') if channel is not None else root.findtext('{http://www.w3.org/2005/Atom}title')) or ''
  items=root.findall('./channel/item') or root.findall('{http://www.w3.org/2005/Atom}entry')
  enclosures=[e for item in items for e in list(item) if e.tag.split('}')[-1]=='enclosure' and e.get('url','').startswith(('http://','https://'))]
  result.update(feedTitle=title,episodes=len(items),audioEnclosures=len(enclosures),valid=True,identityConfirmed=(s['id']!='kidstory' or 'kidstory' in title.lower()))
  result['feedPublisher']=channel.findtext('link') if channel is not None else ''
  if '--check-audio' in sys.argv:
   def head(e):
    try:
     req=urllib.request.Request(e.get('url'),method='HEAD',headers={'User-Agent':'TELMI-Sync-Plus/0.20 RSS link verification'})
     with urllib.request.urlopen(req,timeout=8) as r:
      if r.status==200 and ('audio' in r.headers.get('Content-Type','') or 'octet-stream' in r.headers.get('Content-Type','')):return True
     # Acast serves a two-byte text health response for HEAD. Request only
     # range headers, close immediately, and never read an audio body.
     req=urllib.request.Request(e.get('url'),headers={'Range':'bytes=0-0','User-Agent':'TELMI-Sync-Plus/0.20 RSS link verification'})
     with urllib.request.urlopen(req,timeout=8) as r:return r.status in (200,206) and ('audio' in r.headers.get('Content-Type','') or 'octet-stream' in r.headers.get('Content-Type',''))
    except Exception:return False
   with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:checks=list(pool.map(head,enclosures))
   result.update(audioHttpVerified=sum(checks),audioUnavailableOrUnverified=len(checks)-sum(checks),audioVerification='HTTP HEAD or GET Range headers only; no audio body read; does not establish download rights')
   print(json.dumps({'source':s['id'],'audioHttpVerified':sum(checks),'unverified':len(checks)-sum(checks)}),flush=True)
 except Exception as e:result.update(valid=False,error=str(e),episodes=0,audioEnclosures=0)
 return result
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(audit,sources))
Path('FEED_AUDIT.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
for r in results:print(json.dumps({k:r.get(k) for k in ('id','httpStatus','feedTitle','episodes','audioEnclosures','valid','identityConfirmed','error')},ensure_ascii=True))
