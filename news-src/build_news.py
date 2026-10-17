import json, html, re, os, datetime
D0 = os.path.dirname(os.path.abspath(__file__))
P = lambda n: os.path.join(D0, n)
H = open(P('news_head.html'), encoding='utf8').read()
T = open(P('news_tail.html'), encoding='utf8').read()
AI = json.load(open(P('news.json'), encoding='utf8'))
BIZ = json.load(open(P('biz.json'), encoding='utf8'))
_t = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).date()
STAMP = f'{_t.year}년 {_t.month}월 {_t.day}일'
for lst, p in ((AI, 'ai'), (BIZ, 'biz')):
    lst.sort(key=lambda x: x['date'], reverse=True)
    for i, it in enumerate(lst, 1):
        it['id'] = f'{p}-{i:02d}'
        it['sec'] = 'AI 소식' if p == 'ai' else '컨설팅 소식'

H = H.replace('<title>현장 지식 | 가온연구소 GAON Lab</title>', '<title>NEWS | 가온연구소 GAON Lab</title>')
H = H.replace('content="스마트공장 시스템 계층도, ISO 구조, 실무 가이드, 현장 용어 사전."', 'content="제조 AI·AX 소식과 스마트공장 지원사업·ESG·ISO 소식을 골라 요약과 가온연구소 코멘트로 정리합니다."')
H = H.replace('content="현장 지식 | 가온연구소 GAON Lab"', 'content="NEWS | 가온연구소 GAON Lab"')
H = H.replace('<div class="dd on">', '<div class="dd">', 1)
H = re.sub(r'(\n\s+)<a href="research.html">연구</a>', r'\1<a href="research.html">연구</a>\1<a href="news.html" aria-current="page">NEWS</a>', H, count=1)
H = H.replace('<li><a href="research.html">연구</a></li>', '<li><a href="research.html">연구</a></li><li><a href="news.html">NEWS</a></li>')
CATS_AI = ['제조 AI', 'AX 정책', '빅테크·모델', '로봇·피지컬 AI']
CATS_BIZ = ['스마트공장', '지원사업 공고', 'ESG·공급망', 'ISO·규제', '수출·기타']

style = """<style>
#ai,#biz{scroll-margin-top:90px}
.nw-filter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:26px}
.nw-filter button{padding:9px 16px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink-2);font-weight:700;font-size:.94rem;cursor:pointer;white-space:nowrap}
.nw-filter button.on{background:var(--co);border-color:var(--co);color:#fff}
.nw-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}
.nw-card{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:var(--r-m);overflow:hidden;text-decoration:none;color:inherit;transition:transform .18s,box-shadow .18s}
.nw-card:hover{transform:translateY(-3px);box-shadow:var(--sh-2)}
.nw-thumb{position:relative;display:block;aspect-ratio:16/10;overflow:hidden;background:var(--mist-2)}
.nw-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.nw-card:hover .nw-thumb img{transform:scale(1.04)}
.nw-thumb .nw-cat{position:absolute;left:14px;top:14px}
.nw-cat{display:inline-flex;padding:4px 11px;border-radius:999px;background:var(--co);color:#fff;font-weight:700;font-size:.82rem;white-space:nowrap}
.nw-body{padding:18px 20px 20px;display:flex;flex-direction:column;gap:8px;flex:1}
.nw-date{font-size:.86rem;color:var(--muted)}
.nw-card h3{font-size:1.06rem;line-height:1.5;font-weight:700;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nw-card p{font-size:.94rem;line-height:1.65;color:var(--ink-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nw-more{margin-top:auto;padding-top:8px;font-size:.88rem;font-weight:700;color:var(--gold-2)}
.nw-meta{display:flex;justify-content:space-between;color:var(--muted);font-size:.93rem;margin:-14px 0 22px;flex-wrap:wrap;gap:8px}
.nw-note{margin:0 0 60px;font-size:.88rem;color:var(--faint);text-align:center}
.nw-post{position:fixed;inset:0;z-index:300;background:rgba(7,14,34,.55);display:none;overflow-y:auto;padding:40px 16px}
.nw-post.open{display:block}
.nw-art{max-width:820px;margin:0 auto;background:var(--paper);border-radius:var(--r-l);overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.45)}
.nw-hero{position:relative;aspect-ratio:21/9;overflow:hidden}
.nw-hero img{width:100%;height:100%;object-fit:cover}
.nw-x{position:absolute;right:14px;top:14px;z-index:2;width:42px;height:42px;border-radius:50%;border:0;background:rgba(8,14,36,.75);font-size:1.4rem;cursor:pointer;color:#fff}
.nw-in{padding:34px 44px 40px}
.nw-crumb{font-size:.88rem;color:var(--muted);display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.nw-art h1{font-size:clamp(1.4rem,2.6vw,1.9rem);line-height:1.45;font-weight:700;margin-bottom:18px}
.nw-lead{font-size:1.05rem;font-weight:700;color:var(--gold-2);border-left:4px solid var(--gold);padding:4px 0 4px 14px;margin-bottom:22px}
.nw-text{font-size:1.02rem;line-height:1.95;color:var(--ink);text-align:justify}
.nw-cmt{margin-top:28px;background:var(--co-tint);border-radius:var(--r-m);padding:20px 22px}
.nw-cmt h4{font-size:.98rem;color:var(--gold-2);margin-bottom:6px}
.nw-cmt p{line-height:1.85}
.nw-srcbox{margin-top:24px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;padding-top:18px;border-top:1px solid var(--line)}
.nw-srcbox span{color:var(--muted);font-size:.93rem}
.nw-nav{display:flex;justify-content:space-between;gap:12px;margin-top:26px}
.nw-nav button{flex:1;padding:14px 16px;border-radius:var(--r-s);border:1px solid var(--line);background:var(--card);cursor:pointer;font-weight:700;color:var(--ink-2);text-align:center;white-space:nowrap}
.nw-nav button:disabled{opacity:.35;cursor:default}
body.nw-lock{overflow:hidden}
.nw-loadbox{text-align:center;margin-top:30px}
.nw-load{padding:13px 44px;border-radius:999px;border:1px solid var(--gold-2);background:transparent;color:var(--gold-2);font-weight:700;font-size:1rem;cursor:pointer}
.nw-load[hidden]{display:none}
@media (max-width:1000px){.nw-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.nw-grid{grid-template-columns:1fr}.nw-in{padding:24px 20px 28px}.nw-post{padding:0}.nw-art{border-radius:0;min-height:100%}}
</style>
"""
H = H.replace('</head>', style + '</head>')


def card(it):
    return f'''<a class="nw-card" href="#{it['id']}" data-cat="{html.escape(it['category'])}">
<span class="nw-thumb"><img src="assets/img/{it['img']}.jpg" alt="" loading="lazy"><span class="nw-cat">{html.escape(it['category'])}</span></span>
<span class="nw-body"><span class="nw-date">{it['date'].replace('-', '.')} · {html.escape(it['source'])}</span>
<h3>{html.escape(it['title'])}</h3><p>{html.escape(it['summary'])}</p><span class="nw-more">글 읽기 →</span></span></a>'''


def block(sid, items, cats, title, desc, bg):
    counts = {c: sum(1 for i in items if i['category'] == c) for c in cats}
    btns = f'<button type="button" class="on" data-f="all">전체 {len(items)}</button>' + ''.join(
        f'<button type="button" data-f="{c}">{c} {counts[c]}</button>' for c in cats if counts[c])
    return f'''<section class="sec {bg}" id="{sid}"><div class="wrap">
<div class="head5"><div><h2>{title}</h2><p>{desc}</p></div></div>
<div class="nw-filter" role="group" aria-label="분야 선택" data-g="{sid}">{btns}</div>
<div class="nw-meta"><span>{STAMP} 기준 · 매주 월요일 업데이트</span><span>최신순 {len(items)}건</span></div>
<div class="nw-grid" data-g="{sid}">
{chr(10).join(card(i) for i in items)}
</div>
<div class="nw-loadbox"><button type="button" class="nw-load" data-g="{sid}">더 보기</button></div></div></section>'''


data = json.dumps(AI + BIZ, ensure_ascii=False)
main = f'''<main id="main">
<section class="banner" style="background-image:url(assets/img/dash.jpg)"><div class="wrap"><h1>NEWS</h1><p class="ben">AI 소식 · 컨설팅 소식</p><p class="bsub">AI 소식과 지원사업·ESG·ISO 소식을 골라 요약과 코멘트로</p></div></section>
<div class="tabbar"><div class="wrap"><nav class="subtabs" aria-label="목차"><a href="#ai">AI 소식</a><a href="#biz">컨설팅 소식</a></nav></div></div>
{block("ai", AI, CATS_AI, "이번 주 AI 소식", "제조 AI·AX 정책·빅테크·로봇 소식 — 카드를 누르면 요약 글과 가온 코멘트가 열립니다", "mist")}
{block("biz", BIZ, CATS_BIZ, "컨설팅 소식 — 지원사업 · ESG · ISO", "스마트공장 지원사업, 정부 공고, 공급망 ESG, 인증·규제 소식과 준비 포인트", "")}
<div class="wrap"><p class="nw-note">기사 내용을 요약해 소개하며 원문 저작권은 각 언론사·기관에 있습니다. 가온 코멘트는 가온연구소의 의견입니다. 섬네일은 가온연구소 사진입니다.</p></div>
<section class="cta5" style="background-image:url(assets/img/whiteboard.jpg)"><h2>뉴스는 많은데 우리 회사는 어디서부터?</h2><p>업무 하나, 공정 하나부터 함께 정리합니다.</p>
<a class="tel" href="tel:01022443100">010-2244-3100</a>
</section>
</main>
<div class="nw-post" id="nwPost" aria-hidden="true"><article class="nw-art" role="dialog" aria-modal="true" aria-labelledby="nwTitle">
<div class="nw-hero"><img id="nwImg" alt=""><button class="nw-x" type="button" aria-label="닫기" id="nwClose">×</button></div>
<div class="nw-in"><div class="nw-crumb"><span class="nw-cat" id="nwCat"></span><span id="nwMeta"></span></div>
<h1 id="nwTitle"></h1><p class="nw-lead" id="nwLead"></p><div class="nw-text" id="nwText"></div>
<div class="nw-cmt"><h4>가온 코멘트</h4><p id="nwCmt"></p></div>
<div class="nw-srcbox"><span id="nwSrc"></span><a class="btn primary" id="nwLink" target="_blank" rel="noopener">원문 기사 보기</a></div>
<div class="nw-nav"><button type="button" id="nwPrev">← 이전 글</button><button type="button" id="nwList">목록으로</button><button type="button" id="nwNext">다음 글 →</button></div>
</div></article></div>
<script>
(function(){{
var D={data};var M={{}};D.forEach(function(d,i){{M[d.id]=i}});
var P=document.getElementById('nwPost'),last=null;
function $(i){{return document.getElementById(i)}}
function show(id){{var i=M[id];var d=D[i];
$('nwImg').src='assets/img/'+d.img+'.jpg';$('nwCat').textContent=d.category;$('nwMeta').textContent=d.sec+' · '+d.date.replace(/-/g,'.')+' · '+d.source;
$('nwTitle').textContent=d.title;$('nwLead').textContent=d.summary;$('nwText').textContent=d.body;$('nwCmt').textContent=d.comment;
$('nwSrc').textContent='출처: '+d.source;$('nwLink').href=d.url;
var sib=D.filter(function(x){{return x.sec===d.sec}}),k=sib.indexOf(d);
$('nwPrev').disabled=k<=0;$('nwNext').disabled=k>=sib.length-1;
$('nwPrev').onclick=function(){{if(k>0)location.hash=sib[k-1].id}};$('nwNext').onclick=function(){{if(k<sib.length-1)location.hash=sib[k+1].id}};
P.classList.add('open');P.setAttribute('aria-hidden','false');document.body.classList.add('nw-lock');P.scrollTop=0;last=d.sec}}
function hide(){{P.classList.remove('open');P.setAttribute('aria-hidden','true');document.body.classList.remove('nw-lock')}}
function route(){{var h=location.hash.slice(1);if(M[h]!==undefined)show(h);else hide()}}
function back(){{location.hash=(last==='AI 소식'?'ai':'biz')}}
$('nwClose').onclick=back;$('nwList').onclick=back;
P.addEventListener('click',function(e){{if(e.target===P)back()}});
document.addEventListener('keydown',function(e){{if(e.key==='Escape'&&P.classList.contains('open'))back()}});
window.addEventListener('hashchange',function(){{var a=document.activeElement;if(a&&a.blur)a.blur();var g=document.getElementById('gnav');if(g)g.classList.remove('open');route()}});route();
var ST={{}};
function apply(g){{var st=ST[g],i=0,m=0;document.querySelectorAll('.nw-grid[data-g="'+g+'"] .nw-card').forEach(function(c){{var ok=st.f==='all'||c.getAttribute('data-cat')===st.f;if(ok){{m++;c.style.display=(i<st.n)?'':'none';i++}}else c.style.display='none'}});
var lb=document.querySelector('.nw-load[data-g="'+g+'"]');lb.hidden=m<=st.n;lb.textContent='더 보기 ('+Math.min(st.n,m)+' / '+m+')'}}
['ai','biz'].forEach(function(g){{ST[g]={{f:'all',n:12}};apply(g)}});
document.querySelectorAll('.nw-load').forEach(function(b){{b.addEventListener('click',function(){{var g=b.getAttribute('data-g');ST[g].n+=12;apply(g)}})}});
document.querySelectorAll('.nw-filter button').forEach(function(b){{b.addEventListener('click',function(){{
var g=b.parentNode.getAttribute('data-g');b.parentNode.querySelectorAll('button').forEach(function(x){{x.classList.toggle('on',x===b)}});
ST[g]={{f:b.getAttribute('data-f'),n:12}};apply(g);
}})}});
}})();
</script>'''
OUT = H + main + T
ARW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
DD=('<div class="dd on"><button type="button" aria-haspopup="true">NEWS'+ARW+'</button><div class="mega small">'
 '<a href="news.html#ai"><span class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 10h4v4h-4zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg></span><span><b>AI 소식</b><span>제조 AI·AX 정책·로봇 최신 흐름</span></span></a>'
 '<a href="news.html#biz"><span class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></span><span><b>컨설팅 소식</b><span>지원사업 공고·ESG·ISO 동향</span></span></a></div></div>')
OUT = OUT.replace('<a href="news.html" aria-current="page">NEWS</a>', DD, 1)
OUT = re.sub(r'(<li><a href="research.html">연구</a></li>)(?!<li><a href="news)', r'\1<li><a href="news.html#ai">AI 소식</a></li><li><a href="news.html#biz">컨설팅 소식</a></li>', OUT)
open(os.path.join(D0, '..', 'public', 'news.html'), 'w', encoding='utf8').write(OUT)
print(len(AI), len(BIZ))
