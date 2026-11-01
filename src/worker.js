import { DurableObject } from "cloudflare:workers";
import { BOOKING } from "./booking-config.js";
import { handleAuth } from "./auth.js";
export { Accounts } from "./auth.js";
import { HttpError, randInt, CODE_CHARS, MAX_PLAYERS, ROOM_TTL, tick, apply, view, makePlayer } from "../public/games/jjan-playground/engine.js";

const ONLINE_MS = 9000;
const HOST_AWAY_MS = 30000;

// ---- 방 저장소 ----
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.room = null;
    ctx.blockConcurrencyWhile(async () => { this.room = (await ctx.storage.get("room")) || null; });
  }

  async save() { await this.ctx.storage.put("room", this.room); }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      const now = Date.now();
      let body = {};
      if (request.method === "POST") {
        const text = await request.text();
        if (text.length > 4000) throw new HttpError(413, "내용이 너무 길어요.");
        try { body = JSON.parse(text || "{}"); } catch { throw new HttpError(400, "요청을 이해하지 못했어요."); }
      }
      const auth = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const op = request.method === "GET" ? "get" : body.op;

      if (op === "create") return json(await this.create(body, request.headers.get("x-new-room"), now));
      if (!this.room) throw new HttpError(404, "방을 찾을 수 없어요. 코드를 다시 확인해 주세요.");
      if (now - this.room.createdAt > ROOM_TTL) throw new HttpError(410, "이 방은 닫혔어요. 새 방을 만들어 주세요.");
      if (op === "join") return json(await this.join(body, now));

      const me = this.room.players.find((p) => p.token === auth && p.active);
      if (!me) throw new HttpError(401, "다시 참가해 주세요.");
      me.lastSeen = now;

      const changed = tick(this.room, now);
      let mutated = changed;
      if (op !== "get") {
        const seen = this.room.seen || (this.room.seen = []);
        if (!(body.actionId && seen.includes(body.actionId))) {
          if (body.actionId) { seen.push(body.actionId); if (seen.length > 60) seen.shift(); }
          const res = apply(this.room, me, op, body, now);
          mutated = true;
          if (res === "left") { this.room.revision++; await this.save(); return json({ ok: true, left: true, serverNow: now }); }
          tick(this.room, now);
        }
      }
      if (mutated) this.room.revision++;
      await this.save();
      void url;
      return json(view(this.room, me, now));
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      return json({ error: "잠시 후 다시 시도해 주세요." }, 500);
    }
  }

  async create(body, code, now) {
    if (this.room && now - this.room.createdAt < ROOM_TTL) throw new HttpError(409, "retry");
    if (!code || !/^[A-Z2-9]{6}$/.test(code)) throw new HttpError(400, "잘못된 요청이에요.");
    const player = makePlayer(body, now);
    this.room = { code, createdAt: now, revision: 1, hostId: player.id, players: [player], status: "lobby", selected: "bomb", rounds: 0, completed: 0, round: null, seen: [], entries: { [String(body.entryToken || "")]: player.id } };
    await this.save();
    return { ...view(this.room, player, now), token: player.token };
  }

  async join(body, now) {
    const r = this.room;
    const tokenKey = String(body.entryToken || "");
    if (tokenKey && r.entries?.[tokenKey]) {
      const again = r.players.find((p) => p.id === r.entries[tokenKey] && p.active);
      if (again) { again.lastSeen = now; return { ...view(r, again, now), token: again.token }; }
    }
    const actives = r.players.filter((p) => p.active);
    if (actives.length >= MAX_PLAYERS) throw new HttpError(409, "방이 가득 찼어요. (최대 12명)");
    if (r.status === "playing") throw new HttpError(409, "게임 중에는 참가할 수 없어요. 대기실로 돌아오면 들어올 수 있어요.");
    const player = makePlayer(body, now);
    r.players.push(player);
    if (tokenKey) (r.entries ||= {})[tokenKey] = player.id;
    r.revision++;
    await this.save();
    return { ...view(r, player, now), token: player.token };
  }
}

// ---- 상담 예약 저장소 ----
const KST = 9 * 3600 * 1000;
const ymd = (ms) => new Date(ms + KST).toISOString().slice(0, 10);
const addDays = (d, n) => ymd(Date.parse(d + "T00:00:00Z") - KST + n * 86400000 + 12 * 3600 * 1000);
const dow = (d) => new Date(d + "T00:00:00Z").getUTCDay();
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

function slotOpen(date, time, now) {
  const C = BOOKING;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !C.times.includes(time)) return false;
  const today = ymd(now);
  if (date < addDays(today, C.minLeadDays) || date > addDays(today, C.maxDays)) return false;
  if (!C.days.includes(dow(date)) || C.holidays.includes(date)) return false;
  if (C.blocked.includes(date) || C.blocked.includes(date + " " + time)) return false;
  return true;
}

export class Booking extends DurableObject {
  async sync() {
    const done = (await this.ctx.storage.get("freedDone")) || [];
    const todo = BOOKING.freed.filter((k) => !done.includes(k));
    if (!todo.length) return;
    for (const k of todo) await this.ctx.storage.delete("s:" + k);
    await this.ctx.storage.put("freedDone", done.concat(todo));
  }
  async fetch(request) {
    const now = Date.now();
    await this.sync();
    if (request.method === "GET") {
      const all = await this.ctx.storage.list({ prefix: "s:" });
      const today = ymd(now);
      const booked = [...all.keys()].map((k) => k.slice(2)).filter((k) => k.slice(0, 10) >= today);
      const { days, times, minLeadDays, maxDays, holidays, blocked, modes } = BOOKING;
      return json({ today, booked, days, times, minLeadDays, maxDays, holidays, blocked, modes });
    }
    let b; try { b = JSON.parse(await request.text()); } catch { return json({ error: "요청을 이해하지 못했습니다." }, 400); }
    const date = clip(b.date, 10), time = clip(b.time, 5);
    if (!slotOpen(date, time, now)) return json({ error: "선택하신 시간은 예약할 수 없습니다. 다른 시간을 골라 주십시오." }, 409);
    const name = clip(b.name, 40), company = clip(b.company, 60), phone = clip(b.phone, 30), email = clip(b.email, 80);
    if (!(name || company) || !(phone || email)) return json({ error: "이름(회사명)과 연락처를 적어 주십시오." }, 400);
    const ip = request.headers.get("cf-connecting-ip") || "-";
    const rk = "r:" + ip + ":" + ymd(now);
    const cnt = (await this.ctx.storage.get(rk)) || 0;
    if (cnt >= 5) return json({ error: "오늘은 더 이상 예약할 수 없습니다. 전화로 문의해 주십시오." }, 429);
    const key = "s:" + date + " " + time;
    if (await this.ctx.storage.get(key)) return json({ error: "방금 다른 분이 예약한 시간입니다. 다른 시간을 골라 주십시오." }, 409);
    await this.ctx.storage.put(key, { name, company, phone, email, mode: clip(b.mode, 20), topic: clip(b.topic, 40), at: now });
    await this.ctx.storage.put(rk, cnt + 1);
    return json({ ok: true, date, time });
  }
}

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/auth/")) return handleAuth(request, env);
    if (url.pathname === "/api/booking") {
      if (request.method !== "GET" && request.method !== "POST") return json({ error: "지원하지 않는 요청입니다." }, 405);
      const len = Number(request.headers.get("content-length") || 0);
      if (len > 4000) return json({ error: "내용이 너무 깁니다." }, 413);
      if (request.method === "POST") {
        // 상담 예약은 로그인 회원만
        const tok = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
        const me = tok ? await env.ACCOUNTS.get(env.ACCOUNTS.idFromName("gaon-accounts")).fetch("https://accounts/?op=me&token=" + encodeURIComponent(tok)) : null;
        if (!me || !me.ok) return json({ error: "상담 예약은 로그인 후 이용할 수 있습니다." }, 401);
      }
      try { return await env.BOOKING.get(env.BOOKING.idFromName("gaon")).fetch(request); }
      catch { return json({ error: "잠시 후 다시 시도해 주십시오." }, 500); }
    }
    if (url.pathname !== "/api/game") return new Response("Not found", { status: 404 });
    if (request.method !== "GET" && request.method !== "POST") return json({ error: "지원하지 않는 요청이에요." }, 405);
    try {
      if (request.method === "GET") {
        const code = String(url.searchParams.get("code") || "").toUpperCase();
        if (!/^[A-Z2-9]{6}$/.test(code)) return json({ error: "방 코드를 확인해 주세요." }, 400);
        return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
      }
      const raw = await request.text();
      if (raw.length > 4000) return json({ error: "내용이 너무 길어요." }, 413);
      let body; try { body = JSON.parse(raw || "{}"); } catch { return json({ error: "요청을 이해하지 못했어요." }, 400); }
      const forward = (code, extra = {}) => {
        const headers = new Headers(request.headers); for (const [k, v] of Object.entries(extra)) headers.set(k, v);
        return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(request.url, { method: "POST", headers, body: raw }));
      };
      if (body.op === "create") {
        for (let i = 0; i < 6; i++) {
          const code = Array.from({ length: 6 }, () => CODE_CHARS[randInt(CODE_CHARS.length)]).join("");
          const res = await forward(code, { "x-new-room": code });
          if (res.status !== 409) return res;
        }
        return json({ error: "잠시 후 다시 시도해 주세요." }, 503);
      }
      const code = String(body.code || "").toUpperCase();
      if (!/^[A-Z2-9]{6}$/.test(code)) return json({ error: "방 코드를 확인해 주세요." }, 400);
      return forward(code);
    } catch {
      return json({ error: "잠시 후 다시 시도해 주세요." }, 500);
    }
  },
};
