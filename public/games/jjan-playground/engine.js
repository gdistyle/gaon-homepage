// 짠! 놀이터 대화방 서버 (Cloudflare Workers + Durable Objects)
// - /api/game 만 이 서버가 처리하고, 나머지 홈페이지 파일은 기존처럼 정적 배포됩니다.

export const MIN_PLAYERS = { bomb: 2, count: 2, liar: 3, balance: 2, quiz: 2, challenge: 2, timing: 2, king: 3, telepathy: 2, image: 3 };
export const MAX_PLAYERS = 12;
export const ROOM_TTL = 12 * 3600 * 1000;
const ONLINE_MS = 9000;
const HOST_AWAY_MS = 30000;
// 한 기기로 함께 할 때(room.local)는 제한 시간 없이 진행합니다.
const dl = (room, now, ms) => (room.local ? null : now + ms);
export const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const randInt = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
const pick = (arr) => arr[randInt(arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickN = (arr, n) => shuffle(arr).slice(0, n);
const rid = (n = 8) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, (x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join(""); };
const norm = (s) => String(s ?? "").replace(/\s+/g, "").toLowerCase();
const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const initialsOf = (s) => Array.from(s, (ch) => { const c = ch.charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 ? CHO[Math.floor((c - 0xac00) / 588)] : ch; }).join("");

// ---- 문제·주제 (모두 직접 작성한 오리지널 문구) ----
const WORDS = {
  음식: ["김밥", "떡볶이", "라면", "치킨", "피자", "삼겹살", "비빔밥", "햄버거", "초밥", "냉면", "만두", "순대", "잡채", "김치찌개", "된장찌개"],
  동물: ["고양이", "강아지", "토끼", "펭귄", "코끼리", "기린", "다람쥐", "거북이", "판다", "햄스터", "고슴도치", "오리", "개구리", "여우", "사슴"],
  장소: ["놀이공원", "도서관", "공항", "수영장", "찜질방", "편의점", "영화관", "캠핑장", "시장", "학교", "미술관", "동물원", "목욕탕", "서점", "카페"],
  직업: ["소방관", "요리사", "의사", "교사", "경찰관", "우주비행사", "마술사", "농부", "기자", "가수", "화가", "미용사", "택배기사", "사육사", "작가"],
  물건: ["우산", "안경", "이어폰", "텀블러", "리모컨", "가위", "거울", "시계", "베개", "열쇠", "지갑", "양말", "담요", "손풍기", "충전기"],
  과일: ["사과", "바나나", "딸기", "포도", "수박", "복숭아", "귤", "참외", "망고", "키위", "자두", "체리", "블루베리", "감", "배"],
};
const BALANCE = [
  ["평생 여름에만 살기", "평생 겨울에만 살기"], ["치킨만 평생 먹기", "피자만 평생 먹기"], ["매일 지각하는 친구", "약속 당일 취소하는 친구"],
  ["말 못 하지만 모든 동물과 대화", "말은 하지만 동물과는 대화 불가"], ["투명 인간이 되는 능력", "하늘을 나는 능력"], ["평생 휴대폰 없이 살기", "평생 에어컨 없이 살기"],
  ["아침형 인간으로 살기", "올빼미형 인간으로 살기"], ["집에서 하루 종일 뒹굴기", "밖에서 하루 종일 돌아다니기"], ["과거로 돌아가 한 번 살아 보기", "미래로 가서 한 번 살아 보기"],
  ["라면에 밥 말아 먹기", "라면에 밥 안 말아 먹기"], ["민트초코 평생 먹기", "고수 평생 먹기"], ["모든 소리가 두 배로 들리기", "모든 맛이 두 배로 느껴지기"],
  ["일주일 내내 비 오는 여행", "일주일 내내 폭염인 여행"], ["친구들 앞에서 노래 한 곡", "친구들 앞에서 춤 한 곡"], ["평생 같은 노래만 듣기", "평생 같은 드라마만 보기"],
  ["엄청 빠른 인터넷", "엄청 푹신한 침대"], ["물 대신 탄산수만 마시기", "커피 대신 보리차만 마시기"], ["여행은 계획 철저히", "여행은 발길 닿는 대로"],
  ["연락은 전화로만", "연락은 문자로만"], ["겨울 이불 속 귤 먹기", "여름 에어컨 앞 수박 먹기"], ["매일 떡볶이 점심", "매일 비빔밥 점심"],
  ["고양이와 사는 집", "강아지와 사는 집"], ["하루 4시간만 자도 쌩쌩", "하루 12시간 자야 쌩쌩"], ["영화는 극장에서", "영화는 집에서"],
];
const CHALLENGE = [
  "라면에 넣으면 맛있는 것", "여름에 생각나는 것", "빨간색인 것", "동그란 모양인 것", "냉장고 안에 있는 것", "학교에 있는 물건",
  "노란색인 과일이나 음식", "소리가 큰 것", "주말에 하고 싶은 일", "가방에 들어 있는 것", "두 글자 동물 이름", "겨울에 먹는 간식",
  "공원에서 볼 수 있는 것", "길이가 긴 것", "집에서 소리 나는 물건", "아침에 하는 일", "달콤한 것", "한국 도시 이름", "세 글자 과일", "바다에서 볼 수 있는 것",
  "비 오는 날 생각나는 음식", "생일에 있는 것", "욕실에 있는 물건", "여행 갈 때 챙기는 것",
].map((x) => x + " 세 가지");
const TELEPATHY = [
  "치킨 하면 떠오르는 단어는?", "여름 하면 떠오르는 단어는?", "월요일 하면 떠오르는 단어는?", "카페 하면 떠오르는 단어는?", "소풍 하면 떠오르는 단어는?",
  "겨울 하면 떠오르는 단어는?", "생일 하면 떠오르는 단어는?", "비 오는 날 하면 떠오르는 단어는?", "편의점 하면 떠오르는 단어는?", "바다 하면 떠오르는 단어는?",
  "여행 하면 떠오르는 단어는?", "라면 하면 떠오르는 단어는?", "집 하면 떠오르는 단어는?", "주말 하면 떠오르는 단어는?", "놀이공원 하면 떠오르는 단어는?",
  "떡볶이 하면 떠오르는 단어는?", "새해 하면 떠오르는 단어는?", "도서관 하면 떠오르는 단어는?", "캠핑 하면 떠오르는 단어는?", "아침 하면 떠오르는 단어는?",
];
const IMAGE_Q = [
  "약속에 가장 먼저 도착할 것 같은 친구는?", "길에서 고양이를 만나면 말을 걸 것 같은 친구는?", "로또에 당첨되면 제일 먼저 한턱 낼 친구는?", "여행 계획을 가장 꼼꼼히 짤 것 같은 친구는?",
  "무인도에서도 잘 살아남을 것 같은 친구는?", "영화 보다가 가장 먼저 울 것 같은 친구는?", "다음 모임에 제일 늦게 올 것 같은 친구는?", "맛집을 가장 잘 찾아낼 것 같은 친구는?",
  "노래방에서 분위기를 띄울 것 같은 친구는?", "가장 먼저 결혼할 것 같은 친구는?", "비밀을 가장 잘 지킬 것 같은 친구는?", "아침에 가장 일찍 일어날 것 같은 친구는?",
  "길치일 것 같은 친구는?", "연예인이 되면 잘 어울릴 것 같은 친구는?", "게임을 제일 잘할 것 같은 친구는?", "선물을 가장 센스 있게 고를 것 같은 친구는?",
  "갑자기 여행을 떠나자고 할 것 같은 친구는?", "회사에서 일을 가장 잘할 것 같은 친구는?", "하루 종일 웃고 있을 것 같은 친구는?", "가장 먼저 잠들 것 같은 친구는?",
];
const KING_MISSIONS = [
  "서로 칭찬 한 가지씩 해 주기", "가위바위보 해서 진 사람이 건배사 외치기", "눈 마주치고 10초 동안 웃지 않기", "서로의 첫인상 한 줄로 말하기",
  "최근 가장 행복했던 일 한 가지씩 말하기", "두 사람이 함께 하트 만들기", "서로 별명 지어 주기", "좋아하는 음식 세 가지씩 말하기",
  "함께 큰 소리로 '짠!' 외치기", "두 사람이 같은 포즈로 사진 한 장", "서로에게 응원 한마디 하기", "어릴 적 꿈 한 가지씩 말하기",
];
const SMALL_MISSIONS = [
  "다음 판 끝날 때까지 존댓말 쓰기", "옆 사람에게 칭찬 한마디 하기", "가장 좋아하는 노래 한 소절 흥얼거리기", "귀여운 표정 3초 유지하기",
  "오늘 가장 웃겼던 순간 말하기", "친구에게 하고 싶은 말 한마디 하기", "애교 한 번 보여 주기", "좋아하는 음식 소개하기",
];

export function makePlayer(body, now) {
  const name = String(body.name ?? "").trim().slice(0, 12);
  if (!name) throw new HttpError(400, "닉네임을 입력해 주세요.");
  const avatar = Number.isInteger(body.avatar) && body.avatar >= 0 && body.avatar < 8 ? body.avatar : 0;
  return { id: rid(6), token: rid(24), name, avatar, score: 0, active: true, lastSeen: now };
}

// ---- 판 만들기 ----
function newRound(room, type, now) {
  const order = shuffle(room.players.filter((p) => p.active).map((p) => p.id));
  const r = { id: rid(6), type, phase: "play", order, turnSequence: 0, startedAt: 0, deadline: null };
  if (type === "bomb") { Object.assign(r, { lo: 1, hi: 99, bomb: 1 + randInt(99), turnIdx: 0, turnId: order[0], history: [], deadline: dl(room, now, 30000) }); }
  else if (type === "count") { Object.assign(r, { count: 0, turnIdx: 0, turnId: order[0], history: [], deadline: dl(room, now, 30000) }); }
  else if (type === "liar") {
    const category = pick(Object.keys(WORDS).filter((c) => c !== "과일"));
    Object.assign(r, { phase: "reveal", category, word: pick(WORDS[category]), liarId: pick(order), ready: [], clues: {}, votes: {} });
  } else if (type === "balance") { const q = pick(BALANCE); Object.assign(r, { question: { a: q[0], b: q[1] }, votes: {}, deadline: dl(room, now, 60000) }); }
  else if (type === "quiz") {
    const category = pick(Object.keys(WORDS));
    const answerWord = pick(WORDS[category]);
    const ini = initialsOf(answerWord);
    Object.assign(r, { category, answerWord, initials: ini, accepts: WORDS[category].filter((w) => initialsOf(w) === ini).map(norm), startedAt: now + 3500, deadline: dl(room, now, 3500 + 20000) });
  } else if (type === "challenge") { Object.assign(r, { phase: "ready", challenger: pick(order), promptText: pick(CHALLENGE) }); }
  else if (type === "timing") { Object.assign(r, { entries: {}, starts: {}, deadline: dl(room, now, 90000) }); }
  else if (type === "king") {
    const kingId = pick(order);
    const others = shuffle(order.filter((id) => id !== kingId));
    const numbers = {}; others.forEach((id, i) => { numbers[id] = i + 1; });
    Object.assign(r, { phase: "reveal", kingId, numbers, ready: [], missions: pickN(KING_MISSIONS, 6) });
  } else if (type === "telepathy") { Object.assign(r, { promptText: pick(TELEPATHY), answers: {}, startedAt: room.local ? now - 1 : now + 3500, deadline: dl(room, now, 3500 + 25000) }); }
  else if (type === "image") { Object.assign(r, { promptText: pick(IMAGE_Q), votes: {}, deadline: dl(room, now, 60000) }); }
  return r;
}

const nm = (room, id) => room.players.find((p) => p.id === id)?.name || "친구";
const addScore = (room, id, n) => { const p = room.players.find((x) => x.id === id); if (p) p.score += n; };

function finish(room, r, result) {
  r.phase = "result"; r.deadline = null; r.result = result; room.completed++;
}
const loserResult = (room, loserId, title, detail) => ({ title, detail, losers: [loserId], mission: pick(SMALL_MISSIONS) });

function advanceTurn(room, r, now) {
  r.turnIdx = (r.turnIdx + 1) % r.order.length;
  r.turnId = r.order[r.turnIdx];
  r.turnSequence++;
  r.deadline = dl(room, now, 30000);
}

function applyCount(room, r, id, n, now) {
  r.count += n;
  r.history.push({ id, value: n, text: "개 → " + r.count });
  if (r.count >= 31) {
    for (const p of r.order) if (p !== id) addScore(room, p, 1);
    finish(room, r, loserResult(room, id, nm(room, id) + "님, 31!", "31을 부른 사람이 걸렸어요. 나머지 친구들은 1점씩 가져가요."));
  } else advanceTurn(room, r, now);
}

function resolve(room, r) {
  if (r.type === "balance") {
    const vals = Object.values(r.votes), a = vals.filter((v) => v === "a").length, b = vals.filter((v) => v === "b").length;
    finish(room, r, { title: "A " + a + "명 · B " + b + "명", detail: !a && !b ? "아직 아무도 고르지 않았어요." : a === b ? "딱 반반! 이유를 서로 들어 봐요." : (a > b ? "A" : "B") + " 쪽이 더 많았어요. 고른 이유를 이야기해 봐요." });
    r.revealVotes = r.votes;
  } else if (r.type === "image") {
    const totals = {}; for (const t of Object.values(r.votes)) totals[t] = (totals[t] || 0) + 1;
    r.totals = totals;
    const max = Math.max(0, ...Object.values(totals)), tops = Object.keys(totals).filter((k) => totals[k] === max);
    finish(room, r, !tops.length ? { title: "아직 지목이 없어요", detail: "다음 질문으로 넘어가 볼까요?" } : { title: tops.map((id) => nm(room, id)).join(", ") + "님이 오늘의 주인공!", detail: max + "표를 받았어요. 왜 그런지 이야기해 봐요." });
  } else if (r.type === "timing") {
    const ent = Object.entries(r.entries);
    if (!ent.length) return finish(room, r, { title: "아무도 멈추지 않았어요", detail: "다음 판에서 다시 도전해 봐요." });
    ent.sort((x, y) => Math.abs(x[1] - 7000) - Math.abs(y[1] - 7000));
    const [id, ms] = ent[0];
    addScore(room, id, 1);
    finish(room, r, { title: nm(room, id) + "님의 감각이 가장 정확해요!", detail: (ms / 1000).toFixed(2) + "초 · 오차 " + (Math.abs(ms - 7000) / 1000).toFixed(2) + "초. 1점을 얻었어요." });
  } else if (r.type === "telepathy") {
    const groups = {};
    for (const [id, a] of Object.entries(r.answers)) (groups[norm(a)] ||= []).push(id);
    const sizes = Object.values(groups).map((g) => g.length), max = Math.max(0, ...sizes);
    if (max < 2) return finish(room, r, { title: "아쉽게도 겹치는 답이 없어요", detail: "다음 질문에서는 통할지도 몰라요!" });
    const winners = Object.values(groups).filter((g) => g.length === max).flat();
    winners.forEach((id) => addScore(room, id, 1));
    finish(room, r, { title: winners.map((id) => nm(room, id)).join(", ") + "님이 통했어요!", detail: "같은 답을 낸 친구가 " + max + "명이에요. 1점씩 얻었어요." });
  } else if (r.type === "quiz") {
    finish(room, r, { title: "아쉽게 시간 종료!", detail: "정답은 '" + r.answerWord + "'이었어요." });
  }
}

function liarTally(room, r, now) {
  const cnt = {}; for (const v of Object.values(r.votes)) cnt[v] = (cnt[v] || 0) + 1;
  r.totals = cnt;
  const max = Math.max(0, ...Object.values(cnt)), tops = Object.keys(cnt).filter((k) => cnt[k] === max);
  if (tops.length === 1 && tops[0] === r.liarId) { r.phase = "guess"; r.deadline = dl(room, now, 20000); return; }
  addScore(room, r.liarId, 2);
  finish(room, r, { title: "라이어 승리!", detail: nm(room, r.liarId) + "님이 끝까지 들키지 않았어요." + (tops.length > 1 ? " (동률이라 라이어가 탈출했어요)" : "") });
}

function liarEnd(room, r, correct) {
  if (correct) {
    addScore(room, r.liarId, 2);
    finish(room, r, { title: "역전! 라이어 승리", detail: nm(room, r.liarId) + "님이 제시어 '" + r.word + "'을 맞혔어요." });
  } else {
    r.order.forEach((id) => { if (id !== r.liarId) addScore(room, id, 1); });
    finish(room, r, loserResult(room, r.liarId, "라이어를 찾았어요!", nm(room, r.liarId) + "님이 라이어였어요. 제시어는 '" + r.word + "'였어요."));
  }
}

// ---- 시간 흐름 (요청이 올 때마다 확인) ----
export function tick(room, now) {
  const r = room.round;
  if (room.status !== "playing" || !r || r.phase === "result") return false;
  let changed = false;
  if (r.type === "bomb") {
    for (let i = 0; i < r.order.length && r.deadline && now >= r.deadline; i++) { r.history.push({ id: r.turnId, value: "", text: "시간 초과" }); advanceTurn(room, r, r.deadline); changed = true; }
  } else if (r.type === "count") {
    for (let i = 0; i < r.order.length && r.phase === "play" && r.deadline && now >= r.deadline; i++) { applyCount(room, r, r.turnId, 1, r.deadline); changed = true; }
  } else if (r.type === "liar") {
    if (r.phase === "vote" && r.deadline && now >= r.deadline) { liarTally(room, r, now); changed = true; }
    else if (r.phase === "guess" && r.deadline && now >= r.deadline) { liarEnd(room, r, false); changed = true; }
  } else if (["balance", "image", "timing", "telepathy"].includes(r.type)) {
    if (r.deadline && now >= r.deadline) { resolve(room, r); changed = true; }
  } else if (r.type === "quiz") {
    if (r.deadline && now >= r.deadline) { resolve(room, r); changed = true; }
  } else if (r.type === "challenge") {
    if (r.phase === "play" && now >= r.deadline) { r.phase = "judge"; r.deadline = null; changed = true; }
  } else if (r.type === "king") {
    if (r.phase === "decree" && r.deadline && now >= r.deadline) { finish(room, r, { title: "왕이 명령을 내리지 못했어요", detail: "시간이 지나서 이번 판은 넘어가요." }); r.chosen = null; changed = true; }
  }
  return changed;
}

// ---- 동작 처리 ----
function need(cond, msg, status = 400) { if (!cond) throw new HttpError(status, msg); }

export function apply(room, me, op, body, now) {
  const isHost = room.hostId === me.id;
  const actives = () => room.players.filter((p) => p.active);
  const resetToLobby = (notice) => {
    room.status = "lobby"; room.round = null;
    if (notice) { room.notice = notice; room.noticeUntil = now + 8000; }
  };
  const r = room.round;
  const needRound = () => {
    need(room.status === "playing" && r, "진행 중인 게임이 없어요.", 409);
    need(!body.roundId || body.roundId === r.id, "이미 다음 장면으로 넘어갔어요.", 409);
  };
  const needLive = () => { needRound(); need(r.phase !== "result", "이번 판은 이미 끝났어요.", 409); };

  switch (op) {
    case "leave": {
      me.active = false;
      const rest = actives();
      if (!rest.length) { room.status = "ended"; room.round = null; return "left"; }
      if (room.hostId === me.id) room.hostId = rest.sort((a, b) => b.lastSeen - a.lastSeen)[0].id;
      if (room.status === "playing") resetToLobby("친구가 나가서 대기실로 돌아왔어요.");
      return "left";
    }
    case "select": need(isHost, "방장만 고를 수 있어요.", 403); need(MIN_PLAYERS[body.game], "알 수 없는 게임이에요."); need(room.status === "lobby", "대기실에서만 바꿀 수 있어요.", 409); room.selected = body.game; return;
    case "lobby": need(isHost, "방장만 할 수 있어요.", 403); if (room.status === "playing" && r && r.phase !== "result") room.completed = room.completed; resetToLobby(); return;
    case "end": need(isHost, "방장만 마무리할 수 있어요.", 403); room.status = "ended"; room.round = null; return;
    case "claimHost": {
      const host = room.players.find((p) => p.id === room.hostId);
      need(!host || !host.active || now - host.lastSeen > HOST_AWAY_MS, "방장이 아직 자리에 있어요.", 409);
      room.hostId = me.id; return;
    }
    case "remove": {
      need(isHost, "방장만 할 수 있어요.", 403);
      const t = room.players.find((p) => p.id === body.target && p.active);
      need(t && t.id !== me.id, "내보낼 수 없는 친구예요.");
      t.active = false;
      if (room.status === "playing") resetToLobby(t.name + "님이 나가서 대기실로 돌아왔어요.");
      return;
    }
    case "start": {
      need(isHost, "방장만 시작할 수 있어요.", 403);
      need(room.status === "lobby" || (room.status === "playing" && r?.phase === "result"), "지금은 시작할 수 없어요.", 409);
      const game = String(body.game || room.selected);
      need(MIN_PLAYERS[game], "알 수 없는 게임이에요.");
      need(actives().length >= MIN_PLAYERS[game], "친구가 더 필요해요. (최소 " + MIN_PLAYERS[game] + "명)");
      room.selected = game; room.status = "playing"; room.rounds++;
      room.round = newRound(room, game, now);
      return;
    }
    case "ready": {
      needLive(); need(["liar", "king"].includes(r.type) && r.phase === "reveal", "지금은 확인할 수 없어요.", 409);
      if (!r.ready.includes(me.id)) r.ready.push(me.id);
      if (r.order.every((id) => r.ready.includes(id))) { r.phase = r.type === "liar" ? "talk" : "decree"; if (r.type === "king") r.deadline = dl(room, now, 90000); }
      return;
    }
    case "guess": {
      needLive(); need(r.type === "bomb", "잘못된 요청이에요.");
      need(r.turnId === me.id, "내 차례가 아니에요.", 409);
      const v = Number(body.value);
      need(Number.isInteger(v) && v >= r.lo && v <= r.hi, r.lo + " ~ " + r.hi + " 사이의 숫자를 넣어 주세요.");
      if (v === r.bomb) {
        r.history.push({ id: me.id, value: v, text: "펑!" });
        r.order.forEach((id) => { if (id !== me.id) addScore(room, id, 1); });
        finish(room, r, loserResult(room, me.id, nm(room, me.id) + "님, 펑!", "숨은 숫자는 " + r.bomb + "이었어요. 나머지 친구들은 1점씩 가져가요."));
      } else {
        if (v < r.bomb) { r.lo = v + 1; r.history.push({ id: me.id, value: v, text: "안전 · 더 커요" }); }
        else { r.hi = v - 1; r.history.push({ id: me.id, value: v, text: "안전 · 더 작아요" }); }
        advanceTurn(room, r, now);
      }
      return;
    }
    case "count": {
      needLive(); need(r.type === "count", "잘못된 요청이에요.");
      need(r.turnId === me.id, "내 차례가 아니에요.", 409);
      const n = Number(body.value);
      need([1, 2, 3].includes(n) && r.count + n <= 31, "그 숫자는 부를 수 없어요.");
      applyCount(room, r, me.id, n, now); return;
    }
    case "clue": {
      needLive(); need(r.type === "liar" && r.phase === "talk", "지금은 힌트를 낼 수 없어요.", 409);
      const v = String(body.value ?? "").trim().slice(0, 80); need(v, "힌트를 적어 주세요.");
      need(!r.clues[me.id], "이미 힌트를 보냈어요.", 409);
      r.clues[me.id] = v;
      if (room.local && r.order.every((id) => r.clues[id])) { r.phase = "vote"; r.deadline = dl(room, now, 60000); }
      return;
    }
    case "openVote": need(isHost, "방장만 할 수 있어요.", 403); needLive(); need(r.type === "liar" && r.phase === "talk", "지금은 투표를 열 수 없어요.", 409); r.phase = "vote"; r.deadline = dl(room, now, 60000); return;
    case "vote": {
      needLive();
      if (r.type === "balance") {
        need(["a", "b"].includes(body.choice) && !r.votes[me.id], "이미 선택했어요.", 409); r.votes[me.id] = body.choice;
        if (r.order.every((id) => r.votes[id])) resolve(room, r);
      } else if (r.type === "liar" || r.type === "image") {
        if (r.type === "liar") need(r.phase === "vote", "지금은 투표할 수 없어요.", 409);
        need(r.order.includes(body.target) && body.target !== me.id, "고를 수 없는 친구예요.");
        need(!r.votes[me.id], "이미 투표했어요.", 409); r.votes[me.id] = body.target;
        if (r.order.every((id) => r.votes[id])) { if (r.type === "liar") liarTally(room, r, now); else resolve(room, r); }
      } else need(false, "잘못된 요청이에요.");
      return;
    }
    case "liarGuess": {
      needLive(); need(r.type === "liar" && r.phase === "guess" && r.liarId === me.id, "지금은 맞힐 수 없어요.", 409);
      liarEnd(room, r, norm(body.value) === norm(r.word)); return;
    }
    case "answer": {
      needLive();
      if (r.type === "quiz") {
        need(now >= r.startedAt, "아직 시작 전이에요.", 409);
        const v = norm(body.value); need(v, "정답을 입력해 주세요.");
        if (r.accepts.includes(v)) { addScore(room, me.id, 1); finish(room, r, { title: nm(room, me.id) + "님이 가장 먼저 맞혔어요!", detail: "정답은 '" + r.answerWord + "'였어요. 1점을 얻었어요." }); }
      } else if (r.type === "telepathy") {
        need(now >= r.startedAt, "아직 시작 전이에요.", 409);
        const v = String(body.value ?? "").trim().slice(0, 20); need(v, "단어를 적어 주세요.");
        need(!r.answers[me.id], "이미 답했어요.", 409); r.answers[me.id] = v;
        if (r.order.every((id) => r.answers[id])) resolve(room, r);
      } else need(false, "잘못된 요청이에요.");
      return;
    }
    case "quizWinner": {
      need(room.local && isHost, "이 기능은 한 기기로 할 때만 쓸 수 있어요.", 403); needLive(); need(r.type === "quiz", "잘못된 요청이에요.");
      need(r.order.includes(body.target), "고를 수 없는 친구예요.");
      addScore(room, body.target, 1);
      finish(room, r, { title: nm(room, body.target) + "님이 가장 먼저 맞혔어요!", detail: "정답은 '" + r.answerWord + "'였어요. 1점을 얻었어요." });
      return;
    }
    case "challengeStart": {
      needLive(); need(r.type === "challenge" && r.phase === "ready" && r.challenger === me.id, "지금은 시작할 수 없어요.", 409);
      r.phase = "play"; r.startedAt = now + 3500; r.deadline = r.startedAt + 5000; return;
    }
    case "judge": {
      need(isHost, "방장만 판정할 수 있어요.", 403); needLive(); need(r.type === "challenge" && r.phase === "judge", "지금은 판정할 수 없어요.", 409);
      const ok = body.success === true;
      if (ok) addScore(room, r.challenger, 1);
      finish(room, r, ok ? { title: nm(room, r.challenger) + "님 성공!", detail: "5초 안에 세 가지를 해냈어요. 1점을 얻었어요." } : { title: "아쉽게 실패!", detail: nm(room, r.challenger) + "님, 다음에 다시 도전해요." });
      return;
    }
    case "timerStart": { needLive(); need(r.type === "timing" && !r.starts[me.id], "이미 시작했어요.", 409); r.starts[me.id] = now; return; }
    case "timerStop": {
      needLive(); need(r.type === "timing" && r.starts[me.id] && r.entries[me.id] === undefined, "지금은 멈출 수 없어요.", 409);
      const server = now - r.starts[me.id];
      let ms = Number(body.value);
      if (!Number.isFinite(ms) || ms < 0 || Math.abs(ms - server) > 3000) ms = server;
      r.entries[me.id] = Math.round(Math.min(ms, 60000));
      if (r.order.every((id) => r.entries[id] !== undefined)) resolve(room, r);
      return;
    }
    case "decree": {
      needLive(); need(r.type === "king" && r.phase === "decree" && r.kingId === me.id, "지금은 명령할 수 없어요.", 409);
      const a = Number(body.a), b = Number(body.b), max = r.order.length - 1;
      need(Number.isInteger(a) && Number.isInteger(b) && a !== b && a >= 1 && b >= 1 && a <= max && b <= max, "서로 다른 번호 두 개를 골라 주세요.");
      const mission = r.missions[Number(body.mission)] ?? r.missions[0];
      const targets = [a, b].map((n) => Object.keys(r.numbers).find((id) => r.numbers[id] === n));
      r.chosen = [a, b]; r.mission = mission; r.targets = targets;
      finish(room, r, { title: a + "번과 " + b + "번은 " + targets.map((id) => nm(room, id)).join(", ") + "님!", detail: "왕의 명령을 함께 해 봐요. 가볍게 패스해도 괜찮아요." });
      return;
    }
    case "forceReveal": {
      need(isHost, "방장만 할 수 있어요.", 403); needLive();
      need(["balance", "image", "timing", "telepathy", "quiz"].includes(r.type), "지금은 할 수 없어요.", 409);
      resolve(room, r); return;
    }
    default: need(false, "알 수 없는 요청이에요.");
  }
}

// ---- 화면용 데이터 ----
export function view(room, me, now) {
  const onlineIds = room.players.filter((p) => p.active && now - p.lastSeen < ONLINE_MS).map((p) => p.id);
  const host = room.players.find((p) => p.id === room.hostId);
  const out = {
    code: room.code, revision: room.revision, serverNow: now, me: me.id, hostId: room.hostId,
    players: room.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, active: p.active })),
    onlineIds, canClaimHost: !!host && host.id !== me.id && (!host.active || now - host.lastSeen > HOST_AWAY_MS),
    status: room.status, selected: room.selected, rounds: room.rounds, completed: room.completed,
    notice: room.noticeUntil && now < room.noticeUntil ? room.notice : "",
  };
  if (room.round) out.round = roundView(room, room.round, me, now);
  return out;
}

function roundView(room, r, me, now) {
  const done = r.phase === "result";
  const v = { id: r.id, type: r.type, phase: r.phase, deadline: r.deadline ?? null, turnId: r.turnId, turnSequence: r.turnSequence, order: r.order, startedAt: r.startedAt };
  if (done) v.result = r.result;
  switch (r.type) {
    case "bomb": Object.assign(v, { lo: r.lo, hi: r.hi, history: r.history }); break;
    case "count": Object.assign(v, { count: r.count, history: r.history }); break;
    case "liar": {
      const isLiar = r.liarId === me.id;
      Object.assign(v, { category: r.category, myRole: isLiar ? "liar" : "citizen", ready: r.ready, clues: r.clues, voted: Object.keys(r.votes), myVote: r.votes[me.id] });
      if (!isLiar || done) v.word = r.word;
      if (r.phase === "guess" || done) v.liarId = r.liarId;
      if (done) v.votes = r.votes;
      break;
    }
    case "balance": Object.assign(v, { question: r.question, voted: Object.keys(r.votes), myVote: r.votes[me.id] }); if (done) v.votes = r.votes; break;
    case "quiz": {
      v.category = r.category;
      if (now >= r.startedAt) { v.initials = r.initials; if (now >= r.startedAt + 8000) v.hint = "첫 글자는 '" + r.answerWord[0] + "', 모두 " + r.answerWord.length + "글자예요."; }
      break;
    }
    case "challenge": {
      v.challenger = r.challenger;
      if (r.phase !== "ready" && now >= r.startedAt) v.prompt = r.promptText;
      if (r.phase === "judge" || done) v.prompt = r.promptText;
      break;
    }
    case "timing": {
      v.submitted = Object.keys(r.entries);
      if (r.starts[me.id]) v.myStart = r.starts[me.id];
      if (r.entries[me.id] !== undefined) v.myEntry = r.entries[me.id];
      if (done) v.entries = r.entries;
      break;
    }
    case "king": {
      v.ready = r.ready; v.missions = r.missions;
      v.kingId = r.phase === "reveal" ? (r.kingId === me.id ? me.id : null) : r.kingId;
      if (r.numbers[me.id]) v.myNumber = r.numbers[me.id];
      if (done) { v.numbers = r.numbers; v.chosen = r.chosen; v.mission = r.mission; v.targets = r.targets; }
      break;
    }
    case "telepathy": {
      v.submitted = Object.keys(r.answers);
      if (now >= r.startedAt) v.prompt = r.promptText;
      if (r.answers[me.id]) v.myAnswer = r.answers[me.id];
      if (done) v.answers = r.answers;
      break;
    }
    case "image": Object.assign(v, { prompt: r.promptText, voted: Object.keys(r.votes), myVote: r.votes[me.id] }); if (done) v.totals = r.totals; break;
  }
  return v;
}


// ---- 한 기기로 함께 하기(로컬) ----
const BOT_NAMES = ["로봇 하나", "로봇 둘", "로봇 셋", "로봇 넷", "로봇 다섯", "로봇 여섯", "로봇 일곱", "로봇 여덟", "로봇 아홉", "로봇 열", "로봇 열하나"];

export function createLocalRoom(names, now = Date.now()) {
  const players = names.map((n, i) => ({ ...makePlayer({ name: n, avatar: i % 8 }, now), bot: false }));
  return { code: "LOCAL", local: true, createdAt: now, revision: 1, hostId: players[0].id, players, status: "lobby", selected: "bomb", rounds: 0, completed: 0, round: null, seen: [] };
}

export function addBots(room, game, now = Date.now()) {
  const act = room.players.filter((p) => p.active);
  for (let i = act.length; i < MIN_PLAYERS[game]; i++) {
    const botCount = room.players.filter((p) => p.bot).length;
    room.players.push({ ...makePlayer({ name: BOT_NAMES[botCount] || "로봇 " + (botCount + 1), avatar: (room.players.length + 3) % 8 }, now), bot: true });
  }
}

// 지금 휴대폰을 들고 있어야 하는 사람
export function seatFor(room) {
  const host = room.hostId, r = room.round;
  if (room.status !== "playing" || !r || r.phase === "result") return host;
  const firstNot = (pred) => r.order.find((id) => !pred(id)) || host;
  switch (r.type) {
    case "bomb": case "count": return r.turnId;
    case "liar":
      if (r.phase === "reveal") return firstNot((id) => r.ready.includes(id));
      if (r.phase === "talk") return firstNot((id) => r.clues[id]);
      if (r.phase === "vote") return firstNot((id) => r.votes[id]);
      if (r.phase === "guess") return r.liarId;
      return host;
    case "balance": case "image": return firstNot((id) => r.votes[id]);
    case "telepathy": return firstNot((id) => r.answers[id]);
    case "timing": return firstNot((id) => r.entries[id] !== undefined);
    case "king": return r.phase === "reveal" ? firstNot((id) => r.ready.includes(id)) : r.kingId;
    case "challenge": return r.phase === "judge" ? host : r.challenger;
    default: return host;
  }
}

const BOT_CLUES = ["흔히 볼 수 있어요", "좋아하는 사람이 많아요", "자주 떠올라요", "누구나 알 거예요", "생각보다 가까이 있어요"];
const BOT_WORDS = ["치즈", "밥", "물", "빵", "사랑", "여행"];

function botAct(room, bot, now) {
  const r = room.round, others = r.order.filter((id) => id !== bot.id);
  const go = (op, body = {}) => { apply(room, bot, op, body, now); return true; };
  switch (r.type) {
    case "bomb": return go("guess", { value: r.lo + randInt(r.hi - r.lo + 1) });
    case "count": return go("count", { value: pick([1, 2, 3].filter((n) => r.count + n <= 31)) });
    case "liar":
      if (r.phase === "reveal") return go("ready");
      if (r.phase === "talk") return go("clue", { value: pick(BOT_CLUES) });
      if (r.phase === "vote") return go("vote", { target: pick(others) });
      if (r.phase === "guess") return go("liarGuess", { value: pick(WORDS[r.category]) });
      return false;
    case "balance": return go("vote", { choice: pick(["a", "b"]) });
    case "image": return go("vote", { target: pick(others) });
    case "telepathy": return go("answer", { value: pick(BOT_WORDS) });
    case "timing": {
      const ms = 7000 + randInt(2000) - 1000;
      apply(room, bot, "timerStart", {}, now); r.starts[bot.id] = now - ms;
      return go("timerStop", { value: ms });
    }
    case "king":
      if (r.phase === "reveal") return go("ready");
      { const max = r.order.length - 1, a = 1 + randInt(max); let b = 1 + randInt(max); if (b === a) b = (a % max) + 1; return go("decree", { a, b, mission: 0 }); }
    case "challenge": return r.phase === "ready" && r.challenger === bot.id ? go("challengeStart") : false;
    default: return false;
  }
}

// 로봇 차례이면 자동으로 진행합니다. 바뀐 것이 있으면 true.
export function botStep(room, now = Date.now()) {
  let changed = false;
  for (let i = 0; i < 80; i++) {
    const seat = room.players.find((p) => p.id === seatFor(room));
    if (!seat || !seat.bot || room.status !== "playing" || !room.round || room.round.phase === "result") break;
    let did = false;
    try { did = botAct(room, seat, now); } catch { did = false; }
    if (!did) break;
    tick(room, now); changed = true;
  }
  return changed;
}
