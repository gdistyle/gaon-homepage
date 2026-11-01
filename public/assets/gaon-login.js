/* 가온 통합 로그인 — 어느 가온 사이트에서나 쓰는 공용 위젯
   사용: <script src="https://gaonlab.gdistyle.workers.dev/assets/gaon-login.js" defer></script>
   - GaonLogin.mount(요소)   : 로그인/회원 버튼 표시
   - GaonLogin.load(앱이름)  : 회원별 저장 자료 불러오기
   - GaonLogin.save(앱이름, 자료) : 회원별 저장 */
(function () {
  'use strict';
  if (window.GaonLogin) return;
  var BASE = 'https://gaonlab.gdistyle.workers.dev';
  var KEY = 'gaon_token', UKEY = 'gaon_user';
  var listeners = [], current = null;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { return store(KEY) || ''; }
  function emit() { listeners.forEach(function (f) { try { f(current); } catch (e) {} }); }
  function api(path, opt) {
    opt = opt || {};
    var h = opt.headers || {};
    if (token()) h.Authorization = 'Bearer ' + token();
    opt.headers = h;
    return fetch(BASE + '/api/auth/' + path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (r.status === 401) { setSession(null); } if (!r.ok) throw new Error(j.error || '요청 실패'); return j; });
    });
  }
  function setSession(tok, user) {
    if (!tok) { store(KEY, null); store(UKEY, null); current = null; emit(); return; }
    store(KEY, tok); if (user) store(UKEY, JSON.stringify(user)); current = user || current; emit();
  }

  // 로그인 페이지에서 돌아올 때 주소 끝(#gaon_token=…)으로 받은 열쇠 저장
  (function takeHash() {
    var m = /[#&]gaon_token=([a-f0-9]{64})/.exec(location.hash || '');
    if (!m) return;
    store(KEY, m[1]);
    var clean = location.hash.replace(/[#&]?gaon_token=[a-f0-9]{64}/, '');
    try { history.replaceState(null, '', location.pathname + location.search + (clean && clean !== '#' ? clean : '')); } catch (e) {}
  })();

  try { current = JSON.parse(store(UKEY) || 'null'); } catch (e) { current = null; }
  var ready = token() ? api('me').then(function (j) { current = j.user; store(UKEY, JSON.stringify(j.user)); emit(); return current; }).catch(function () { return current; }) : Promise.resolve(null);

  var GL = {
    base: BASE,
    ready: ready,
    user: function () { return current; },
    onChange: function (f) { listeners.push(f); },
    login: function () { location.href = BASE + '/login?return=' + encodeURIComponent(location.href.split('#')[0]); },
    logout: function () { var t = token(); setSession(null); if (t) fetch(BASE + '/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + t } }).catch(function () {}); },
    load: function (app) { return api('data?app=' + encodeURIComponent(app)).then(function (j) { return j.data; }); },
    save: function (app, data) { return api('data?app=' + encodeURIComponent(app), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); },
    mount: function (el, opt) {
      opt = opt || {};
      if (!el) return;
      injectStyle();
      function render() {
        var u = current;
        if (!u) {
          el.innerHTML = '<button type="button" class="gl-btn' + (opt.dark ? ' gl-dark' : '') + '">로그인</button>';
          el.firstChild.onclick = GL.login;
        } else {
          el.innerHTML = '<div class="gl-wrap"><button type="button" class="gl-btn gl-on' + (opt.dark ? ' gl-dark' : '') + '" aria-haspopup="true">' + esc(u.name) + ' 님</button><div class="gl-menu" hidden><span class="gl-prov">' + ({ google: '구글', naver: '네이버', kakao: '카카오' }[u.provider] || '') + ' 계정</span><button type="button" class="gl-out">로그아웃</button></div></div>';
          var b = el.querySelector('.gl-on'), m = el.querySelector('.gl-menu');
          b.onclick = function (e) { e.stopPropagation(); m.hidden = !m.hidden; };
          document.addEventListener('click', function () { m.hidden = true; });
          el.querySelector('.gl-out').onclick = GL.logout;
        }
      }
      render(); GL.onChange(render);
    }
  };

  function injectStyle() {
    if (document.getElementById('gl-style')) return;
    var s = document.createElement('style'); s.id = 'gl-style';
    s.textContent = '.gl-wrap{position:relative;display:inline-block}' +
      '.gl-btn{font:inherit;font-size:.92rem;font-weight:700;padding:9px 16px;border-radius:4px;border:1px solid rgba(0,0,0,.18);background:transparent;color:inherit;cursor:pointer;white-space:nowrap;line-height:1.2}' +
      '.gl-btn:hover{border-color:currentColor}.gl-dark{border-color:rgba(255,255,255,.4);color:#fff}' +
      '.gl-menu{position:absolute;right:0;top:calc(100% + 6px);min-width:150px;background:#fff;color:#1d2433;border:1px solid #d8dde5;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:8px;z-index:9999;text-align:center}' +
      '.gl-prov{display:block;font-size:.8rem;color:#6b7383;padding:4px 0 8px}' +
      '.gl-out{width:100%;font:inherit;font-size:.9rem;padding:8px;border:0;border-radius:4px;background:#eef1f5;color:#1d2433;cursor:pointer}.gl-out:hover{background:#e2e7ee}';
    document.head.appendChild(s);
  }

  window.GaonLogin = GL;
})();
