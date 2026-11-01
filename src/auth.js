// 가온 통합 로그인 — 구글·네이버·카카오 로그인 + 회원별 저장 공간
// 비밀키(Client Secret) 없이 동작하도록 설계: 공개 클라이언트 ID만 사용
import { DurableObject } from "cloudflare:workers";
import { AUTH } from "./auth-config.js";

const SESSION_DAYS = 30;
const MAX_DATA = 200000; // 앱별 저장 한도(약 200KB)

const now = () => Date.now();
const rand = (n = 32) => { const b = new Uint8Array(n); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, "0")).join(""); };
const clip = (s, n) => String(s ?? "").slice(0, n);

export class Accounts extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, provider TEXT, sub TEXT, name TEXT, created INTEGER, last INTEGER, UNIQUE(provider, sub))`);
    sql.exec(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, uid TEXT, exp INTEGER)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS data (uid TEXT, app TEXT, body TEXT, updated INTEGER, PRIMARY KEY(uid, app))`);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.searchParams.get("op");
    const sql = this.ctx.storage.sql;
    const t = now();
    if (op === "login") {
      const { provider, sub, name } = await request.json();
      let row = sql.exec(`SELECT id FROM users WHERE provider=? AND sub=?`, provider, sub).toArray()[0];
      const id = row ? row.id : rand(12);
      if (row) sql.exec(`UPDATE users SET name=?, last=? WHERE id=?`, name, t, id);
      else sql.exec(`INSERT INTO users (id, provider, sub, name, created, last) VALUES (?,?,?,?,?,?)`, id, provider, sub, name, t, t);
      const token = rand(32);
      sql.exec(`INSERT INTO sessions (token, uid, exp) VALUES (?,?,?)`, token, id, t + SESSION_DAYS * 864e5);
      sql.exec(`DELETE FROM sessions WHERE exp < ?`, t);
      // 1년 이상 미이용 회원 파기 (개인정보처리방침)
      const old = t - 365 * 864e5;
      sql.exec(`DELETE FROM data WHERE uid IN (SELECT id FROM users WHERE last < ?)`, old);
      sql.exec(`DELETE FROM sessions WHERE uid IN (SELECT id FROM users WHERE last < ?)`, old);
      sql.exec(`DELETE FROM users WHERE last < ?`, old);
      return Response.json({ token, user: { id, provider, name } });
    }
    const token = url.searchParams.get("token") || "";
    const s = sql.exec(`SELECT s.uid, u.provider, u.name FROM sessions s JOIN users u ON u.id = s.uid WHERE s.token=? AND s.exp > ?`, token, t).toArray()[0];
    if (!s) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    sql.exec(`UPDATE users SET last=? WHERE id=?`, t, s.uid);
    if (op === "me") return Response.json({ user: { id: s.uid, provider: s.provider, name: s.name } });
    if (op === "logout") { sql.exec(`DELETE FROM sessions WHERE token=?`, token); return Response.json({ ok: true }); }
    if (op === "withdraw") {
      sql.exec(`DELETE FROM data WHERE uid=?`, s.uid);
      sql.exec(`DELETE FROM sessions WHERE uid=?`, s.uid);
      sql.exec(`DELETE FROM users WHERE id=?`, s.uid);
      return Response.json({ ok: true });
    }
    const app = clip(url.searchParams.get("app"), 40);
    if (!/^[a-z0-9-]+$/.test(app)) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
    if (op === "get") {
      const r = sql.exec(`SELECT body, updated FROM data WHERE uid=? AND app=?`, s.uid, app).toArray()[0];
      return Response.json({ data: r ? JSON.parse(r.body) : null, updated: r ? r.updated : null });
    }
    if (op === "put") {
      const body = await request.text();
      if (body.length > MAX_DATA) return Response.json({ error: "저장 용량을 넘었습니다." }, { status: 413 });
      try { JSON.parse(body); } catch { return Response.json({ error: "잘못된 형식입니다." }, { status: 400 }); }
      sql.exec(`INSERT INTO data (uid, app, body, updated) VALUES (?,?,?,?) ON CONFLICT(uid, app) DO UPDATE SET body=excluded.body, updated=excluded.updated`, s.uid, app, body, t);
      return Response.json({ ok: true, updated: t });
    }
    return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 404 });
  }
}

// ---- 공급자별 신원 확인 ----
async function verifyGoogle(credential) {
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential));
  if (!r.ok) throw new Error("구글 확인 실패");
  const j = await r.json();
  if (!AUTH.googleClients.includes(j.aud)) throw new Error("구글 앱 불일치");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(j.iss)) throw new Error("구글 발급처 불일치");
  if (Number(j.exp) * 1000 < now()) throw new Error("구글 토큰 만료");
  return { sub: j.sub, name: clip(j.name || j.given_name || "구글 사용자", 40) };
}

async function verifyNaver(accessToken) {
  const r = await fetch("https://openapi.naver.com/v1/nid/me", { headers: { Authorization: "Bearer " + accessToken } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.resultcode !== "00" || !j.response?.id) throw new Error("네이버 확인 실패");
  return { sub: j.response.id, name: clip(j.response.nickname || "네이버 사용자", 40) };
}

async function verifyKakao(code, redirectUri, clientKey) {
  const apps = { ...AUTH.kakaoApps };
  if (AUTH.kakao.restKey) apps[AUTH.kakao.restKey] = AUTH.kakao.redirectUri;
  const key = clientKey || AUTH.kakao.restKey;
  if (!key || !apps[key]) throw new Error("카카오 로그인 준비 중");
  if (redirectUri !== apps[key]) throw new Error("카카오 주소 불일치");
  const form = new URLSearchParams({ grant_type: "authorization_code", client_id: key, redirect_uri: redirectUri, code });
  const tr = await fetch("https://kauth.kakao.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body: form });
  const tj = await tr.json().catch(() => ({}));
  if (!tr.ok || !tj.access_token) throw new Error("카카오 토큰 실패");
  const ur = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: "Bearer " + tj.access_token } });
  const uj = await ur.json().catch(() => ({}));
  if (!ur.ok || !uj.id) throw new Error("카카오 확인 실패");
  return { sub: String(uj.id), name: clip(uj.properties?.nickname || uj.kakao_account?.profile?.nickname || "카카오 사용자", 40) };
}

// ---- /api/auth/* 처리 ----
function cors(request) {
  const origin = request.headers.get("Origin") || "";
  const h = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" };
  if (AUTH.allowedOrigins.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    h["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS";
    h["Vary"] = "Origin";
  }
  return h;
}

export async function handleAuth(request, env) {
  const headers = cors(request);
  const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/auth\/?/, "");
  const stub = env.ACCOUNTS.get(env.ACCOUNTS.idFromName("gaon-accounts"));
  const call = async (op, params = {}, init = {}) => {
    const u = new URL("https://accounts/?op=" + op);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    const r = await stub.fetch(u, init);
    return new Response(r.body, { status: r.status, headers });
  };
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  try {
    if (request.method === "POST" && ["google", "naver", "kakao"].includes(path)) {
      const raw = await request.text();
      if (raw.length > 8000) return reply({ error: "요청이 너무 깁니다." }, 413);
      const b = JSON.parse(raw || "{}");
      let who;
      if (path === "google") who = await verifyGoogle(String(b.credential || ""));
      if (path === "naver") who = await verifyNaver(String(b.accessToken || ""));
      if (path === "kakao") who = await verifyKakao(String(b.code || ""), String(b.redirectUri || ""), String(b.clientKey || ""));
      return call("login", {}, { method: "POST", body: JSON.stringify({ provider: path, ...who }) });
    }
    if (path === "config") return reply({ google: AUTH.google.clientId, naver: AUTH.naver.clientId, kakao: AUTH.kakao.restKey, kakaoRedirect: AUTH.kakao.redirectUri, returnOrigins: AUTH.allowedOrigins });
    if (path === "me" && request.method === "GET") return call("me", { token });
    if (path === "logout" && request.method === "POST") return call("logout", { token });
    if (path === "withdraw" && request.method === "POST") return call("withdraw", { token });
    if (path === "data") {
      const app = url.searchParams.get("app") || "";
      if (request.method === "GET") return call("get", { token, app });
      if (request.method === "PUT") {
        const len = Number(request.headers.get("content-length") || 0);
        if (len > MAX_DATA) return reply({ error: "저장 용량을 넘었습니다." }, 413);
        return call("put", { token, app }, { method: "PUT", body: await request.text() });
      }
    }
    return reply({ error: "지원하지 않는 요청입니다." }, 404);
  } catch (e) {
    return reply({ error: e && e.message ? e.message : "로그인에 실패했습니다." }, 400);
  }
}
