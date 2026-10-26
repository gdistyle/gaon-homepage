import { DurableObject } from "cloudflare:workers";
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

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
