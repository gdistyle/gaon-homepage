import json,subprocess,re,html,sys
for f in ['news.json','biz.json']:
    D=json.load(open(f,encoding='utf8'))
    for x in D:
        if x.get('thumb') and '--force' not in sys.argv: continue
        t=subprocess.run(['curl','-s','-L','--max-time','20','-A','Mozilla/5.0',x['url']],capture_output=True).stdout.decode('utf8','ignore')
        m=re.search(r'<meta[^>]+(?:property|name)=["\']og:image["\'][^>]*content=["\']([^"\']+)',t) or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']og:image',t)
        x['thumb']=html.unescape(m.group(1)).strip() if m else ''
        if x['thumb'].startswith('//'): x['thumb']='https:'+x['thumb']
        print(f[:3],x['title'][:30],'|',x['thumb'][:110])
    json.dump(D,open(f,'w',encoding='utf8'),ensure_ascii=False,indent=1)
