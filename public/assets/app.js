/* 가온연구소 GAON Lab — 공통 인터랙션 */
(function(){
  'use strict';
  var D = window.GAON_DATA || {};
  var T = D.diagTemplates || [];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function $(s,r){return (r||document).querySelector(s);}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function store(k,v){try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v);}catch(e){return null;}}
  function stripNo(t){return String(t).replace(/^\d+\.\s*/,'');}

  var ICON = {
    alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/></svg>',
    fix:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h12M12 6l6 6-6 6"/></svg>',
    chip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
    kpi:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M6 16l4-5 3 3 5-7"/></svg>',
    file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    left:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    right:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h4l4 10h4l4-10"/><circle cx="4" cy="7" r="2"/><circle cx="20" cy="7" r="2"/></svg>'
  };

  /* ---------- 공정명 → 현장 문제 유형 연결 ---------- */
  var RULES = [
    [3,/검사|시험|품질|측정|검출|교정|판정/],
    [0,/수주|주문|설계|도안|디자인|도면|상담|견적|기획|사양|접수|본뜨기|모델링|CAD/],
    [4,/입고|원재료|원료|자재|보관|창고|재고|입하|구매|원단|원지|원목|수입/],
    [6,/출하|포장|납품|배송|설치|시공|출고|인도|발송/],
    [7,/용접|도장|열처리|소성|용해|화학|반응|살균|가열|도금|주조|단조|절단/],
    [2,/조립|재단|봉제|배합|조판|세팅|전환|제판|조색|조율|금형/],
    [5,/가공|성형|사출|프레스|절삭|인쇄|직조|방적|압출|가동|연마|건조|코팅|제직|편직|사상/]
  ];
  function templateFor(step){
    for(var i=0;i<RULES.length;i++){ if(RULES[i][1].test(step)) return RULES[i][0]; }
    return 1;
  }
  function industry(code){ return (D.industries||[]).filter(function(x){return x.code===code;})[0]; }


  /* ---------- 공정 픽토그램 ---------- */
  function sv(d){return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';}
  var PIC={
    truck:sv('<path d="M4 14h22v18H4zM26 20h9l7 7v5H26z"/><circle cx="12" cy="35" r="4"/><circle cx="34" cy="35" r="4"/>'),
    boxin:sv('<path d="M8 18l16-8 16 8v18L24 44 8 36z"/><path d="M8 18l16 8 16-8M24 26v18"/><path d="M24 2v8M20 6l4 4 4-4"/>'),
    water:sv('<path d="M24 6s-12 13-12 21a12 12 0 0 0 24 0C36 19 24 6 24 6z"/><path d="M18 29a6 6 0 0 0 6 6"/>'),
    dry:sv('<circle cx="24" cy="24" r="7"/><path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.5 10.5l3.5 3.5M34 34l3.5 3.5M10.5 37.5L14 34M34 14l3.5-3.5"/>'),
    mix:sv('<path d="M8 20h32l-4 20H12z"/><path d="M28 6l-6 22"/><path d="M14 26c4 3 8-3 12 0s8-3 10 0"/>'),
    gear:sv('<circle cx="24" cy="24" r="6"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2"/><circle cx="24" cy="24" r="13"/>'),
    press:sv('<path d="M10 6h28M24 6v10M14 16h20v8H14zM6 40h36M12 40V32h24v8"/><path d="M20 28h8"/>'),
    flame:sv('<path d="M24 4c2 8 10 11 10 22a10 10 0 0 1-20 0c0-6 4-8 4-14 3 2 4 5 4 8 2-3 2-10 2-16z"/>'),
    spark:sv('<path d="M8 40l14-14M22 26l4 4M26 30L40 16"/><path d="M30 8l2 6M38 10l-4 4M40 20l-6-1M24 12l3 4"/>'),
    wrench:sv('<path d="M30 6a10 10 0 0 0-9 14L6 35l7 7 15-15a10 10 0 0 0 14-9l-6 6-6-2-2-6z"/>'),
    paint:sv('<path d="M8 8h22v10H8zM30 13h6v10H20v6"/><path d="M17 29h6v13h-6z"/>'),
    printer:sv('<path d="M12 18V6h24v12M12 34H6V20h36v14h-6"/><path d="M12 28h24v14H12z"/><path d="M17 34h14M17 38h9"/>'),
    cut:sv('<circle cx="12" cy="34" r="5"/><circle cx="12" cy="14" r="5"/><path d="M16 31L42 8M16 17l26 23"/>'),
    inspect:sv('<circle cx="20" cy="20" r="12"/><path d="M29 29l12 12"/><path d="M14 20l4 4 8-8"/>'),
    package:sv('<path d="M6 16l18-10 18 10v18L24 44 6 34z"/><path d="M6 16l18 10 18-10M24 26v18M15 11l18 10"/>'),
    doc:sv('<path d="M12 4h16l10 10v30H12z"/><path d="M28 4v10h10M18 24h14M18 30h14M18 36h9"/>'),
    hammer:sv('<path d="M22 14l12 12-18 18-6-6z"/><path d="M26 10l6-6 12 12-6 6"/>'),
    factory:sv('<path d="M4 42V22l10 6v-6l10 6v-6l10 6V8h8v34z"/><path d="M10 36h4M20 36h4M30 36h4"/>'),
    store:sv('<path d="M6 42V18h36v24M6 18l4-10h28l4 10"/><path d="M18 42V30h12v12"/>'),
    sew:sv('<path d="M6 30h30v8H6zM36 14v24M14 14h24M14 14v16"/><path d="M28 20v10"/>')
  };
  var PIC_RULES=[
['boxin',/입고|원재료|원료|자재|원단|원지|원목|구매/],    ['inspect',/검사|시험|검출|측정|검수|판정|교정/],['truck',/출하|배송|납품|운송|출고/],['package',/포장|보관|창고|적재/],
['doc',/수주|설계|도면|디자인|상담|견적|기획|사양|CAD|모델링|본뜨기/],
    ['water',/세척|선별|세정/],['flame',/가열|살균|열처리|소성|용해|냉각|경화|소결/],['dry',/건조/],['mix',/배합|혼합|조색|반응|조합/],
    ['spark',/용접|절단|레이저/],['paint',/도장|코팅|도금|표면처리|도색|사상/],['printer',/인쇄|제판|출력|복제/],
    ['cut',/재단|커팅|타발/],['sew',/봉제|직조|편직|제직|방적/],['press',/성형|사출|압출|프레스|주조|단조|금형/],
    ['wrench',/조립|체결|결합|부착/],['hammer',/설치|시공|제작/],['gear',/가공|절삭|CNC|MCT|연마|기계/]
  ];
  function picFor(t){for(var i=0;i<PIC_RULES.length;i++){if(PIC_RULES[i][1].test(t)) return PIC[PIC_RULES[i][0]];}return PIC.factory;}


  /* ---------- 용어 그림 ---------- */
  function gv(d){return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';}
  var GPIC={
    'MES':gv('<rect x="5" y="7" width="38" height="26" rx="2"/><path d="M18 41h12M24 33v8"/><path d="M11 15h14M11 21h20M11 27h9"/><path d="M31 15h6" stroke-width="3"/>'),
    'ERP':gv('<circle cx="24" cy="24" r="6"/><circle cx="8" cy="10" r="4"/><circle cx="40" cy="10" r="4"/><circle cx="8" cy="38" r="4"/><circle cx="40" cy="38" r="4"/><path d="M11 13l8 7M37 13l-8 7M11 35l8-7M37 35l-8-7"/>'),
    'POP':gv('<rect x="9" y="5" width="30" height="38" rx="3"/><path d="M15 13h18M15 19h18"/><path d="M17 30l4 4 9-9"/>'),
    'PLC':gv('<rect x="8" y="9" width="32" height="30" rx="2"/><path d="M8 17h32"/><circle cx="14" cy="13" r="1"/><circle cx="19" cy="13" r="1"/><path d="M14 25h6v8h-6zM26 25h8M26 30h8M26 35h5"/><path d="M14 4v5M22 4v5M30 4v5M14 39v5M22 39v5M30 39v5"/>'),
    'IoT':gv('<rect x="17" y="26" width="14" height="16" rx="2"/><path d="M24 26v-4"/><path d="M17 16a10 10 0 0 1 14 0M12 11a17 17 0 0 1 24 0"/><circle cx="24" cy="34" r="2"/>'),
    'LOT':gv('<path d="M6 30h16v12H6zM26 30h16v12H26zM16 16h16v12H16z"/><path d="M30 6h10v7H30z"/><path d="M30 9.5h-6v6"/>'),
    '바코드 · QR':gv('<path d="M5 10v28M9 10v28M14 10v28M17 10v28M21 10v28"/><rect x="27" y="10" width="7" height="7"/><rect x="37" y="10" width="7" height="7"/><rect x="27" y="31" width="7" height="7"/><path d="M38 31h6v7h-6zM38 24h2M27 24h4"/>'),
    '디지털 트윈':gv('<path d="M3 40V26l6 4v-4l6 4V16h4v24z"/><path d="M29 40V26l6 4v-4l6 4V16h4v24z" stroke-dasharray="3 3"/><path d="M20 10c4-4 8-4 12 0M30 8l2 2-2 2"/>'),
    'AAS':gv('<path d="M24 4l17 9v22l-17 9-17-9V13z"/><path d="M7 13l17 9 17-9M24 22v22"/><rect x="13" y="25" width="7" height="9" rx="1"/>'),
    'PoC':gv('<path d="M18 5h12M20 5v13L9 39a3 3 0 0 0 3 4h24a3 3 0 0 0 3-4L28 18V5"/><path d="M13 31h22"/><circle cx="21" cy="36" r="1.5"/><circle cx="28" cy="34" r="1"/>'),
    'LLM':gv('<path d="M6 9h36v24H22l-9 8v-8H6z"/><path d="M24 15l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>'),
    '프롬프트':gv('<rect x="4" y="8" width="40" height="32" rx="3"/><path d="M4 15h40"/><path d="M11 23l6 5-6 5M21 33h10"/>'),
    '정형 · 비정형 데이터':gv('<rect x="4" y="10" width="18" height="28"/><path d="M4 17h18M4 24h18M4 31h18M13 10v28"/><path d="M28 18c4-6 10 0 7 4s5 8 0 10-8 4-9-1-6-8 2-13z"/>'),
    'ISO 9001':gv('<circle cx="24" cy="18" r="12"/><path d="M18 18l4 4 8-8"/><path d="M16 28l-4 15 6-3 4 5 3-11M32 28l4 15-6-3-4 5"/>'),
    'ISO 14001':gv('<path d="M40 8C16 8 8 20 10 38c18 2 30-6 30-30z"/><path d="M10 38L28 20"/><path d="M4 44h14"/>'),
    'ISO 45001':gv('<path d="M6 32a18 18 0 0 1 36 0z"/><path d="M4 32h40v5H4z"/><path d="M20 14v8M28 14v8M18 14h12"/>'),
    '내부심사':gv('<path d="M14 7h-5v36h22"/><path d="M14 4h14v6H14z"/><path d="M28 7h5v10"/><path d="M14 18h10M14 24h8"/><circle cx="32" cy="30" r="7"/><path d="M37 35l6 6"/>'),
    '시정조치':gv('<path d="M38 18A16 16 0 1 0 40 28"/><path d="M40 8v10H30"/><path d="M17 24l5 5 9-9"/>'),
    'ESG 공급망 관리':gv('<rect x="3" y="18" width="10" height="12" rx="2"/><rect x="19" y="18" width="10" height="12" rx="2"/><rect x="35" y="18" width="10" height="12" rx="2"/><path d="M13 24h6M29 24h6"/><path d="M24 4c-6 0-8 4-7 10 6 0 8-4 7-10z"/><path d="M17 40h14"/>'),
    'GMP':gv('<path d="M10 30L30 10a8 8 0 0 1 11 11L21 41a8 8 0 0 1-11-11z"/><path d="M20 20l11 11"/><path d="M36 38l4 4M38 34h6"/>'),
    'HACCP':gv('<path d="M24 4l16 6v12c0 11-7 18-16 22C15 40 8 33 8 22V10z"/><path d="M18 14v8a3 3 0 0 0 6 0v-8M21 14v20M29 14c-3 2-3 8 0 10v10"/>'),
    '청정구역':gv('<rect x="10" y="6" width="28" height="38" rx="1"/><path d="M33 26h.01"/><path d="M2 14c4-2 6 2 10 0M2 22c4-2 6 2 10 0M36 14c4-2 6 2 10 0M36 22c4-2 6 2 10 0"/><path d="M18 14l2 2M26 20l2 2M20 30l2 2"/>'),
    'PQCDS':gv('<path d="M24 4l19 14-7 23H12L5 18z"/><path d="M24 14l10 7-4 12H18l-4-12z" fill="currentColor" fill-opacity=".18"/>'),
    'KPI':gv('<circle cx="22" cy="26" r="17"/><circle cx="22" cy="26" r="10"/><circle cx="22" cy="26" r="3"/><path d="M22 26L40 8M34 8h6v6"/>'),
    '설비가동률':gv('<path d="M6 34a18 18 0 0 1 36 0"/><path d="M24 34l10-12"/><circle cx="24" cy="34" r="3"/><path d="M10 26l3 2M24 16v4M38 26l-3 2"/><path d="M6 40h36"/>'),
    'OEE':gv('<circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="13"/><circle cx="24" cy="24" r="7"/><path d="M24 5a19 19 0 0 1 17 25M24 11a13 13 0 0 1 12 15M24 17a7 7 0 0 1 7 7" stroke-width="3.5"/>'),
    'MTBF · MTTR':gv('<circle cx="18" cy="26" r="14"/><path d="M18 18v8l6 4"/><path d="M34 16a7 7 0 0 0 9-6l-4 3-3-1-1-3 3-4a7 7 0 0 0-7 9L24 22"/>'),
    '리드타임':gv('<circle cx="16" cy="24" r="11"/><path d="M16 17v7l5 3"/><path d="M27 24h17M38 18l6 6-6 6"/><path d="M4 40h40"/>'),
    '재공재고':gv('<rect x="3" y="14" width="10" height="20"/><rect x="35" y="14" width="10" height="20"/><path d="M17 28h7v6h-7zM24 28h7v6h-7zM20 22h7v6h-7z"/><path d="M3 38h42"/>')
  };
  function gpic(t){return GPIC[t]||PIC.factory;}
  /* ---------- 헤더 ---------- */
  var hd=$('.site-header');
  if(hd){ var onS=function(){hd.classList.toggle('scrolled',window.scrollY>8);}; onS(); addEventListener('scroll',onS,{passive:true}); }
  var bg=$('#burger'), nv=$('#gnav');
  if(bg&&nv){ bg.addEventListener('click',function(){ var o=nv.classList.toggle('open'); bg.setAttribute('aria-expanded',o?'true':'false'); }); }

  /* ---------- 홈 플로우보드 ---------- */
  var fb=$('[data-flowboard]');
  if(fb){
    var picks=[['C10','식료품'],['C25','금속가공'],['C18','인쇄'],['C22-2','플라스틱'],['C32','가구'],['C14','의복']];
    var seg=$('.seg',fb), chain=$('.chain',fb), det=$('.fb-detail',fb), cur=null;
    seg.innerHTML=picks.map(function(p,i){return '<button type="button" data-code="'+p[0]+'" aria-pressed="'+(i===0)+'">'+esc(p[1])+'</button>';}).join('')+
      '<a href="industry.html">전체 26개 업종 보기</a>';
    function showNode(x,i){
      $$('.node',chain).forEach(function(b,j){b.setAttribute('aria-pressed',String(j===i));});
      var nb=$$('.node',chain)[i]; if(nb){ var l=nb.offsetLeft-chain.offsetLeft-16; if(l<chain.scrollLeft||l+nb.offsetWidth>chain.scrollLeft+chain.clientWidth) chain.scrollTo({left:Math.max(0,l),behavior:reduce?'auto':'smooth'}); }
      var t=T[templateFor(x.flow[i])]||T[1];
      det.innerHTML=
        '<div class="problem"><span class="pic-lg">'+picFor(x.flow[i])+'</span><h3>'+esc(x.flow[i])+' 단계에서 자주 생기는 일</h3><p>'+esc(t[0])+'</p><small>'+esc(t[1])+'</small></div>'+
        '<div><h3>잡아야 할 데이터</h3><p>'+esc(t[4])+'</p></div>'+
        '<div><h3>도입 기술과 확인할 지표</h3><p>'+esc(t[2])+'</p><p style="margin-top:8px;color:var(--signal);font-weight:700">'+esc(t[3])+'</p></div>';
      var foot=$('.fb-foot',fb);
      if(foot) foot.innerHTML='<span>'+esc(x.name)+' 기준 공정 · 공정을 누르면 내용이 바뀝니다</span><a href="industry.html?code='+encodeURIComponent(x.code)+'">이 업종 진단지도 자세히 보기</a>';
    }
    function draw(code){
      var x=industry(code); if(!x) return; cur=x;
      $$('button',seg).forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.code===code));});
      chain.classList.remove('draw'); void chain.offsetWidth;
      chain.innerHTML=x.flow.map(function(s,i){
        var d=reduce?0:i*70;
        return (i?'<span class="link" aria-hidden="true" style="animation-delay:'+(d-35)+'ms"></span>':'')+
          '<button type="button" class="node" aria-pressed="false" style="animation-delay:'+d+'ms"><span class="pic">'+picFor(s)+'</span><span class="nx">공정 '+(i+1)+'</span><span class="nt">'+esc(s)+'</span></button>';
      }).join('');
      if(!reduce) chain.classList.add('draw');
      $$('.node',chain).forEach(function(b,i){b.addEventListener('click',function(){showNode(x,i);});});
      var start=x.flow.findIndex(function(s){return templateFor(s)===3;}); showNode(x,start<0?2:start);
    }
    seg.addEventListener('click',function(e){var b=e.target.closest('button'); if(b) draw(b.dataset.code);});
    draw(picks[0][0]);
  }

  /* ---------- 증상으로 찾기 ---------- */
  $$('[data-symptoms]').forEach(function(root){
    var list=$('.sym-list',root), path=$('.sym-path',root);
    list.innerHTML=T.map(function(t,i){return '<button type="button" aria-pressed="'+(i===0)+'">'+esc(t[0])+'</button>';}).join('');
    function show(i){
      var t=T[i];
      $$('button',list).forEach(function(b,j){b.setAttribute('aria-pressed',String(i===j));});
      path.innerHTML='<p class="now">이런 증상이라면</p><h3>'+esc(t[0])+'</h3><div class="path fade">'+
        step('fix','개선 방향',t[1])+step('chip','도입 기술 · 시스템',t[2])+step('file','남겨야 할 증빙',t[4])+step('kpi','성과를 확인할 지표',t[3],'kpi')+
        '</div><div class="sym-cta"><p>설비를 고르기 전에 이 줄이 끊기지 않는지 먼저 확인합니다.</p><a class="btn primary" href="contact.html?topic='+encodeURIComponent(t[0])+'">이 문제로 상담하기</a></div>';
    }
    function step(ic,h,p,cls){return '<div class="pstep '+(cls||'')+'"><span class="dot">'+ICON[ic]+'</span><div><h4>'+esc(h)+'</h4><p>'+esc(p)+'</p></div></div>';}
    list.addEventListener('click',function(e){var b=e.target.closest('button'); if(b) show($$('button',list).indexOf(b));});
    show(0);
  });

  /* ---------- 로드맵 탐색기 ---------- */
  $$('[data-roadmap]').forEach(function(root){
    var id=root.getAttribute('data-roadmap');
    var map=(D.learningMaps||[]).filter(function(m){return m.id===id;})[0]; if(!map) return;
    var pits=(D.pitfalls||{})[id]||[], N=map.steps.length;
    var qs=new URLSearchParams(location.search);
    var m=(location.hash||'').match(/s(\d+)/), idx=m?(+m[1]-1):(qs.get('step')!=null?+qs.get('step'):0);
    if(!(idx>=0&&idx<N)) idx=0;
    root.innerHTML='<div class="rm"><div class="rm-rail" role="tablist" aria-label="'+esc(map.title)+' 단계"><div class="bar" aria-hidden="true"><i></i></div></div><div class="rm-panel" role="tabpanel" aria-live="polite"></div></div>';
    var rail=$('.rm-rail',root), panel=$('.rm-panel',root);
    rail.insertAdjacentHTML('beforeend',map.steps.map(function(s,i){
      return '<button type="button" class="rm-step" role="tab" aria-selected="false" data-i="'+i+'"><span class="n">'+(i+1)+'</span><span><b>'+esc(stripNo(s.title))+'</b><small>'+esc(s.outputs[0]||'')+'</small></span></button>';
    }).join(''));
    function key(i,q){return 'gaon.rm.'+id+'.'+i+'.'+q;}
    function doneStep(i){var s=map.steps[i]; return s.questions.length&&s.questions.every(function(_,q){return store(key(i,q))==='1';});}
    function refresh(){
      var done=0;
      $$('.rm-step',rail).forEach(function(b,i){ var d=doneStep(i); if(d) done++; b.classList.toggle('done',d); b.setAttribute('aria-selected',String(i===idx)); b.tabIndex=i===idx?0:-1;});
      $('.bar i',rail).style.width=Math.round((idx+1)/N*100)+'%';
      return done;
    }
    function render(focus){
      var s=map.steps[idx], p=pits[idx]||[];
      var checked=s.questions.filter(function(_,q){return store(key(idx,q))==='1';}).length;
      panel.innerHTML='<div class="fade">'+
        '<div class="top"><p class="step-no">'+(idx+1)+'단계 / 전체 '+N+'단계</p><h2>'+esc(stripNo(s.title))+'</h2><p class="desc">'+esc(s.desc)+'</p></div>'+
        '<div class="rm-grid"><div>'+
          '<h3>우리 회사 점검 질문 <span class="count" data-count>'+checked+' / '+s.questions.length+'</span></h3>'+
          '<ul class="checks">'+s.questions.map(function(q,qi){return '<li><label><input type="checkbox" data-q="'+qi+'"'+(store(key(idx,qi))==='1'?' checked':'')+'><span>'+esc(q)+'</span></label></li>';}).join('')+'</ul>'+
          '<div class="study"><b>핵심 포인트</b>'+esc(s.study)+'</div>'+
        '</div><div>'+
          '<h3>이 단계에서 나오는 결과물</h3><div class="outs-chips">'+s.outputs.map(function(o){return '<span>'+ICON.file+esc(o)+'</span>';}).join('')+'</div>'+
          (p.length?'<h3 style="margin-top:30px">현장에서 자주 하는 실수</h3><ul class="pits">'+p.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'')+
        '</div></div>'+
        '<div class="rm-nav"><button type="button" class="prev"'+(idx===0?' disabled':'')+'>'+ICON.left+'이전 단계</button>'+
        (idx<N-1?'<button type="button" class="next">다음 단계'+ICON.right+'</button>':'<a class="btn primary" href="contact.html">이 로드맵으로 상담하기</a>')+'</div>'+
      '</div>';
      refresh();
      var sel=$('.rm-step[aria-selected="true"]',rail); if(sel&&rail.scrollWidth>rail.clientWidth){ rail.scrollTo({left:Math.max(0,sel.offsetLeft-rail.offsetLeft-16),behavior:reduce?'auto':'smooth'}); }
      if(history.replaceState) history.replaceState(null,'','#s'+(idx+1));
      if(focus){ var t=$('.rm-step[aria-selected="true"]',rail); if(t) t.focus(); }
    }
    rail.addEventListener('click',function(e){var b=e.target.closest('.rm-step'); if(!b) return; idx=+b.dataset.i; render(); if(innerWidth<900) panel.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});});
    rail.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'||e.key==='ArrowRight'){idx=Math.min(N-1,idx+1);render(true);e.preventDefault();} if(e.key==='ArrowUp'||e.key==='ArrowLeft'){idx=Math.max(0,idx-1);render(true);e.preventDefault();} });
    panel.addEventListener('click',function(e){
      if(e.target.closest('.prev')){idx=Math.max(0,idx-1);render();}
      else if(e.target.closest('.next')){idx=Math.min(N-1,idx+1);render();}
      else return;
      var top=root.getBoundingClientRect().top+scrollY-90; if(scrollY>top) scrollTo({top:top,behavior:reduce?'auto':'smooth'});
    });
    panel.addEventListener('change',function(e){
      var c=e.target.closest('input[data-q]'); if(!c) return;
      store(key(idx,c.dataset.q),c.checked?'1':null);
      var n=$$('input[data-q]',panel).filter(function(x){return x.checked;}).length;
      $('[data-count]',panel).textContent=n+' / '+map.steps[idx].questions.length;
      refresh();
    });
    render();
  });

  /* ---------- 업종 탐색기 ---------- */
  $$('[data-industry]').forEach(function(root){
    var inds=D.industries||[];
    var qs=new URLSearchParams(location.search), code=qs.get('code')||'C25';
    if(!industry(code)) code=inds[0]&&inds[0].code;
    root.innerHTML='<div class="ix"><aside class="ix-side"><div class="ix-search"><label class="sr" for="ixq">업종 찾기</label><input id="ixq" type="search" placeholder="업종명이나 코드로 찾기" autocomplete="off"></div><div class="ix-list" role="list"></div></aside><div class="ix-main" aria-live="polite"></div></div>';
    var list=$('.ix-list',root), main=$('.ix-main',root), q=$('#ixq',root);
    function renderList(){
      var k=(q.value||'').trim().toLowerCase();
      var f=inds.filter(function(x){return !k||(x.name+' '+x.code).toLowerCase().indexOf(k)>=0;});
      list.innerHTML=f.length?f.map(function(x){return '<button type="button" role="listitem" data-code="'+esc(x.code)+'" aria-pressed="'+(x.code===code)+'"><code>'+esc(x.code)+'</code><span>'+esc(x.name)+'</span></button>';}).join(''):'<p class="ix-empty">맞는 업종이 없습니다. 다른 단어로 찾아보세요.</p>';
    }
    function cols(){var g=$('.snake',main); if(!g) return 1; return getComputedStyle(g).gridTemplateColumns.split(' ').length;}
    function markRows(){var c=cols(); $$('.snake .node',main).forEach(function(n,i){n.classList.toggle('endrow',(i+1)%c===0);});}
    function pick(i,x){
      $$('.snake .node',main).forEach(function(b,j){b.setAttribute('aria-pressed',String(i===j));});
      var t=T[templateFor(x.flow[i])]||T[1];
      $('.pdetail',main).innerHTML='<p class="lead"><span class="pic-lg">'+picFor(x.flow[i])+'</span><small>'+esc(x.flow[i])+' 단계에서 자주 생기는 일</small>'+esc(t[0])+'</p>'+
        '<div><h4>개선 방향</h4><p>'+esc(t[1])+'</p></div><div><h4>도입 기술</h4><p>'+esc(t[2])+'</p></div><div><h4>남길 데이터</h4><p>'+esc(t[4])+'</p></div><div><h4>확인할 지표</h4><p style="color:var(--signal);font-weight:700">'+esc(t[3])+'</p></div>';
    }
    function show(c,scroll){
      var x=industry(c); if(!x) return; code=c;
      $$('button',list).forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.code===c));});
      document.title=x.name+' 공정도 | 가온연구소';
      if(history.replaceState) history.replaceState(null,'','?code='+encodeURIComponent(c));
      main.innerHTML='<div class="fade"><span class="code">'+esc(x.code)+'</span><h2>'+esc(x.name)+'</h2><p class="over">'+esc(x.overview)+'</p>'+
        '<div class="pboard"><div class="hint"><span>기준 공정 '+x.flow.length+'단계</span><span>공정을 누르면 <b>현장 진단 포인트</b>가 나옵니다</span></div>'+
        '<div class="snake">'+x.flow.map(function(s,i){return '<button type="button" class="node" aria-pressed="false"><span class="pic">'+picFor(s)+'</span><span class="nx">공정 '+(i+1)+'</span><span class="nt">'+esc(s)+'</span></button>';}).join('')+'</div>'+
        '<div class="pdetail"></div></div>'+
        '<div class="keys"><div class="key"><h3>'+ICON.flag+'품질관리 핵심</h3><p>'+esc(x.quality)+'</p></div><div class="key"><h3>'+ICON.link+'공급망 · 생산관리 핵심</h3><p>'+esc(x.supply)+'</p></div></div>'+
        '<div class="order"><h3>이 업종을 진단하는 순서</h3><ol><li>기준 공정과 실제 공정을 비교해 외주·대기·재작업 공정을 더합니다.</li><li>문제를 불편함이 아니라 시간·불량·재고·납기·안전의 숫자로 바꿉니다.</li><li>도입하려는 설비나 시스템이 그 숫자를 직접 움직이는지 확인합니다.</li><li>구축 전에 기준값·산식·측정주기·증빙파일을 함께 정합니다.</li></ol>'+
        '<div class="btn-row" style="margin-top:20px"><a class="btn primary" href="contact.html?topic='+encodeURIComponent(x.name)+'">이 업종으로 상담하기</a><a class="btn ghost" href="check.html">수준진단 해보기</a></div></div></div>';
      $$('.snake .node',main).forEach(function(b,i){b.addEventListener('click',function(){pick(i,x);});});
      markRows();
      var start=x.flow.findIndex(function(s){return templateFor(s)===3;}); pick(start<0?0:start,x);
      if(scroll&&innerWidth<900) main.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
    }
    q.addEventListener('input',renderList);
    list.addEventListener('click',function(e){var b=e.target.closest('button'); if(b) show(b.dataset.code,true);});
    addEventListener('resize',markRows);
    renderList(); show(code);
  });

  /* ---------- PQCDS ---------- */
  $$('[data-pqcds]').forEach(function(root){
    var P=D.pqcds||{};
    var meta={P:['생산성','같은 인원으로 얼마나 더 만드는가'],Q:['품질','다시 만드는 일이 얼마나 줄었는가'],C:['원가','돈이 묶여 있는 곳은 어디인가'],D:['납기','약속한 날짜를 지키는가'],S:['안전','사람이 다치지 않는가']};
    var NOTE={P:'시간당 생산량은 설비별·품목별로 나눠 최근 한 달 평균을 기준으로 잡습니다. 가동률은 계획정지와 고장정지를 나눠 적어야 비교가 됩니다.',Q:'공정불량과 완제품불량을 따로 셉니다. 불량 유형 코드를 먼저 정하고, 최근 3개월 불량일지로 유형별 기준값을 만듭니다.',C:'제품 1개당 작업시간과 재공·재고 금액을 봅니다. 구축 전 월말 재고 실사 금액을 출발점으로 남겨 둡니다.',D:'주문마다 수주일과 출하일을 남겨 리드타임을 계산합니다. 납기준수율은 처음 약속한 날짜 기준인지, 변경된 날짜 기준인지 먼저 정합니다.',S:'도수율·강도율은 근로시간을 기준으로 계산하므로 총 근로시간 기록이 함께 있어야 합니다. 아차사고는 건수가 늘면 오히려 신고가 잘 되고 있다는 신호일 수 있습니다.'};
    var keys=['P','Q','C','D','S'];
    root.innerHTML='<div class="pq">'+keys.map(function(k,i){return '<button type="button" aria-pressed="'+(i===0)+'" data-k="'+k+'"><b>'+k+'</b><span>'+meta[k][0]+'</span><small>'+meta[k][1]+'</small></button>';}).join('')+'</div><div class="pq-out" aria-live="polite"></div>';
    var out=$('.pq-out',root);
    function show(k){
      $$('.pq button',root).forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.k===k));});
      out.innerHTML='<div><h3>'+k+' · '+meta[k][0]+'</h3><p>'+meta[k][1]+'</p><p class="small muted" style="margin-top:10px">'+esc(NOTE[k]||'')+'</p></div><ul>'+(P[k]||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';
    }
    root.addEventListener('click',function(e){var b=e.target.closest('.pq button'); if(b) show(b.dataset.k);});
    show('P');
  });


  /* ---------- 지식창고: 스마트공장 시스템 계층 ---------- */
  var K = window.GAON_KNOW || {};
  $$('[data-stack]').forEach(function(root){
    var L=K.stack||[]; if(!L.length) return;
    root.innerHTML='<div class="stack"><div class="stack-viz" role="group" aria-label="시스템 계층"></div><div class="stack-out" aria-live="polite"></div></div>';
    var viz=$('.stack-viz',root), out=$('.stack-out',root);
    viz.innerHTML='<span class="flowup" aria-hidden="true"><i></i><i></i><i></i></span>'+L.map(function(l,i){
      return '<button type="button" class="layer" style="--w:'+(56+i*11)+'%;--c:'+l.color+'" aria-pressed="false" data-i="'+i+'"><b>'+esc(l.name)+'</b><small>'+esc(l.sys)+'</small></button>';
    }).join('')+'<p class="stack-cap">아래에서 위로 데이터가 올라갑니다</p>';
    function show(i){
      var l=L[i];
      $$('.layer',viz).forEach(function(b,j){b.setAttribute('aria-pressed',String(i===j));});
      out.innerHTML='<div class="fade"><p class="lv">'+(L.length-i)+'층 · '+esc(l.sys)+'</p><h3>'+esc(l.name)+'</h3><p class="does">'+esc(l.does)+'</p>'+
        '<h4>여기서 생기는 데이터</h4><div class="outs-chips">'+l.data.map(function(d){return '<span>'+esc(d)+'</span>';}).join('')+'</div>'+
        '<div class="two"><div class="bad"><h4>이 층이 비어 있으면</h4><p>'+esc(l.without)+'</p></div><div class="good"><h4>작은 공장의 첫걸음</h4><p>'+esc(l.first)+'</p></div></div></div>';
    }
    viz.addEventListener('click',function(e){var b=e.target.closest('.layer'); if(b) show(+b.dataset.i);});
    show(L.length-1);
  });

  /* ---------- 지식창고: ISO PDCA ---------- */
  $$('[data-pdca]').forEach(function(root){
    var P=K.pdca||[]; if(!P.length) return;
    var cx=150,cy=150,R=130,r=72, cols=['#014299','#1D5BC2','#0E9AA7','#0A2A66'];
    function arc(a0,a1){var g=Math.PI/180,p=function(rad,a){return [cx+rad*Math.cos(a*g),cy+rad*Math.sin(a*g)];};
      var A=p(R,a0),B=p(R,a1),C=p(r,a1),D=p(r,a0);
      return 'M'+A+' A'+R+' '+R+' 0 0 1 '+B+' L'+C+' A'+r+' '+r+' 0 0 0 '+D+'Z';}
    var segs=P.map(function(x,i){var a0=-90+i*90+2,a1=a0+86,m=(a0+a1)/2*Math.PI/180,tx=cx+(R+r)/2*Math.cos(m),ty=cy+(R+r)/2*Math.sin(m);
      return '<g class="seg-p" tabindex="0" role="button" aria-pressed="false" data-i="'+i+'" aria-label="'+x.en+' '+x.name+'"><path d="'+arc(a0,a1)+'" fill="'+cols[i]+'"/><text x="'+tx+'" y="'+(ty-4)+'" text-anchor="middle" font-size="26" font-weight="800" fill="#fff">'+x.k+'</text><text x="'+tx+'" y="'+(ty+18)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" opacity=".85">'+x.name+'</text></g>';}).join('');
    root.innerHTML='<div class="pdca"><svg viewBox="0 0 300 300" class="pdca-viz" role="group" aria-label="PDCA 순환">'+segs+
      '<circle cx="150" cy="150" r="62" fill="#fff"/><text x="150" y="146" text-anchor="middle" font-size="15" font-weight="800" fill="#0F1B2D">ISO</text><text x="150" y="166" text-anchor="middle" font-size="11.5" font-weight="600" fill="#5A6678">4~10장 구조</text></svg><div class="pdca-out" aria-live="polite"></div></div>';
    var out=$('.pdca-out',root);
    function show(i){
      var x=P[i];
      $$('.seg-p',root).forEach(function(g,j){g.setAttribute('aria-pressed',String(i===j));});
      out.innerHTML='<div class="fade"><p class="lv">'+x.en+' · '+x.name+'</p>'+x.clauses.map(function(c){return '<div class="clause"><span class="no">'+c[0]+'장</span><div><b>'+esc(c[1])+'</b><p>'+esc(c[2])+'</p></div></div>';}).join('')+
        '<div class="study"><b>심사원 한마디</b>'+esc(x.tip)+'</div></div>';
    }
    root.addEventListener('click',function(e){var g=e.target.closest('.seg-p'); if(g) show(+g.dataset.i);});
    root.addEventListener('keydown',function(e){var g=e.target.closest('.seg-p'); if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();show(+g.dataset.i);}});
    show(0);
  });

  /* ---------- 지식창고: 용어 사전 ---------- */
  $$('[data-glossary]').forEach(function(root){
    var G=K.glossary||[], cats=['전체'].concat(G.map(function(g){return g.cat;}).filter(function(c,i,a){return a.indexOf(c)===i;}));
    var cat='전체';
    root.innerHTML='<div class="gl-bar"><div class="gl-cats" role="group" aria-label="분류">'+cats.map(function(c,i){return '<button type="button" aria-pressed="'+(i===0)+'">'+esc(c)+'</button>';}).join('')+'</div>'+
      '<label class="sr" for="glq">용어 찾기</label><input id="glq" class="gl-q" type="search" placeholder="용어 찾기 (예: MES, 불량)"></div><p class="gl-n" aria-live="polite"></p><div class="gl-grid"></div>';
    var grid=$('.gl-grid',root), q=$('.gl-q',root), n=$('.gl-n',root);
    function draw(){
      var k=(q.value||'').trim().toLowerCase();
      var f=G.filter(function(g){return (cat==='전체'||g.cat===cat)&&(!k||(g.t+g.full+g.easy+g.ex).toLowerCase().indexOf(k)>=0);});
      n.textContent=f.length+'개 용어';
      grid.innerHTML=f.length?f.map(function(g,i){return '<article class="gl-card"><button type="button" aria-expanded="false"><span class="gl-pic">'+gpic(g.t)+'</span><span class="cat">'+esc(g.cat)+'</span><b>'+esc(g.t)+'</b><small>'+esc(g.full)+'</small><span class="plus" aria-hidden="true"></span></button>'+
        '<div class="gl-body"><p class="easy">'+esc(g.easy)+'</p><p class="ex"><b>현장에서는</b>'+esc(g.ex)+'</p></div></article>';}).join(''):'<p class="ix-empty">찾는 용어가 없습니다. 다른 단어로 찾아보세요.</p>';
    }
    root.addEventListener('click',function(e){
      var c=e.target.closest('.gl-cats button');
      if(c){cat=c.textContent; $$('.gl-cats button',root).forEach(function(b){b.setAttribute('aria-pressed',String(b===c));}); draw(); return;}
      var t=e.target.closest('.gl-card>button');
      if(t){var o=t.getAttribute('aria-expanded')!=='true'; t.setAttribute('aria-expanded',String(o)); t.parentNode.classList.toggle('open',o);}
    });
    q.addEventListener('input',draw);
    var hq=new URLSearchParams(location.search).get('q'); if(hq) q.value=hq;
    draw();
  });

  /* ---------- 오늘의 현장 용어 ---------- */
  $$('[data-today]').forEach(function(root){
    var G=K.glossary||[]; if(!G.length) return;
    var d=new Date(), i=(d.getFullYear()*372+d.getMonth()*31+d.getDate())%G.length;
    function put(j){var g=G[j]; root.innerHTML='<span class="today-pic">'+gpic(g.t)+'</span><p class="lv">오늘의 현장 용어</p><h3>'+esc(g.t)+'</h3><p class="full">'+esc(g.full)+'</p><p class="easy">'+esc(g.easy)+'</p><p class="ex"><b>현장에서는</b>'+esc(g.ex)+'</p>'+
      '<div class="btn-row" style="margin-top:20px"><button type="button" class="btn ghost" data-next>다른 용어 보기</button><a class="btn primary" href="knowledge.html#glossary">용어 사전 전체</a></div>';}
    root.addEventListener('click',function(e){if(e.target.closest('[data-next]')){i=(i+1)%G.length;put(i);}});
    put(i);
  });


  /* ---------- 언어 선택 (구글 번역) ---------- */
  var LANGS=[['ko','한국어','Korean'],['en','English','영어'],['zh-CN','中文','중국어'],['ja','日本語','일본어'],['vi','Tiếng Việt','베트남어'],['ru','Русский','러시아어'],['uz','Oʻzbekcha','우즈베크어'],['th','ไทย','태국어'],['id','Bahasa Indonesia','인도네시아어'],['mn','Монгол','몽골어']];
  function curLang(){var m=document.cookie.match(/googtrans=\/ko\/([^;]+)/);return m?decodeURIComponent(m[1]):'ko';}
  function setCookie(v){
    var h=location.hostname, parts=h.split('.'), doms=['',h];
    if(parts.length>1) doms.push('.'+parts.slice(-2).join('.'));
    doms.forEach(function(d){
      var dom=d?';domain='+d:'';
      if(v) document.cookie='googtrans='+v+';path=/'+dom;
      else document.cookie='googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'+dom;
    });
  }
  var cl=curLang();
  $$('.lang').forEach(function(box){
    var btn=$('button',box), panel=$('.lang-panel',box);
    var cur=LANGS.filter(function(l){return l[0]===cl;})[0]||LANGS[0];
    $('[data-cur]',box).textContent=cur[1];
    panel.innerHTML='<p>Language · 언어 선택</p><ul>'+LANGS.map(function(l){return '<li><button type="button" class="notranslate" translate="no" data-l="'+l[0]+'" aria-current="'+(l[0]===cl)+'">'+l[1]+'<small>'+l[2]+'</small></button></li>';}).join('')+'</ul>';
    btn.addEventListener('click',function(e){e.stopPropagation();var o=box.classList.toggle('open');btn.setAttribute('aria-expanded',String(o));});
    panel.addEventListener('click',function(e){
      var b=e.target.closest('[data-l]'); if(!b) return;
      var l=b.dataset.l; if(l===cl){box.classList.remove('open');return;}
      setCookie(l==='ko'?null:'/ko/'+l); location.reload();
    });
  });
  document.addEventListener('click',function(e){$$('.lang.open').forEach(function(b){if(!b.contains(e.target)){b.classList.remove('open');$('button',b).setAttribute('aria-expanded','false');}});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape') $$('.lang.open').forEach(function(b){b.classList.remove('open');});});
  if(cl!=='ko'){
    window.gaonTranslateInit=function(){ try{ new google.translate.TranslateElement({pageLanguage:'ko',includedLanguages:LANGS.map(function(l){return l[0];}).join(','),autoDisplay:false},'google_translate_element'); }catch(e){} };
    var gt=document.createElement('script'); gt.src='https://translate.google.com/translate_a/element.js?cb=gaonTranslateInit'; gt.async=true; document.body.appendChild(gt);
    document.documentElement.lang=cl;
  }

  /* ---------- 문의 폼: 주제 미리 채우기 ---------- */
  var f6=document.getElementById('f6'), tp=new URLSearchParams(location.search).get('topic');
  if(f6&&tp&&!f6.value) f6.value='['+tp+'] 관련 상담을 원합니다.\n\n';
})();


/* ---------- 카카오톡 상담 버튼 (고정 상담 버튼에 추가) ---------- */
(function(){
  var w=document.querySelector('.float-cta');
  if(!w||w.querySelector('.kakao')) return;
  var a=document.createElement('a');
  a.className='kakao';
  a.href='https://pf.kakao.com/_zMxfWX/chat';
  a.target='_blank'; a.rel='noopener';
  a.setAttribute('aria-label','카카오톡 상담');
  a.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.4 0 .9.1 1.3.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg><span>카톡상담</span>';
  w.appendChild(a);
})();

/* 가온 통합 로그인 버튼 — 상단 메뉴의 상담문의 앞에 표시 */
(function(){
  var nav = document.querySelector('.gnav'); if (!nav || /\/login(\.html)?$/.test(location.pathname)) return;
  var slot = document.createElement('span'); slot.className = 'gl-slot'; slot.style.marginLeft = '14px';
  var cta = nav.querySelector('a.btn.primary'); if (cta) nav.insertBefore(slot, cta); else nav.appendChild(slot);
  var s = document.createElement('script'); s.src = '/assets/gaon-login.js?v=1'; s.defer = true;
  s.onload = function(){ window.GaonLogin.mount(slot); };
  document.head.appendChild(s);
})();
