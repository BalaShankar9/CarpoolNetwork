var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
import { DurableObject } from "cloudflare:workers";
import { RELEASE, captureFailure, diagnosticRoutes, guardRequest, validPushEndpoint } from "./reliability.js";
var RELEASE_VERSION = RELEASE;
var JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-carpool-version": RELEASE_VERSION };
var SESSION_COOKIE = "__Host-cn_session";
var SESSION_MAX_AGE = 60 * 60 * 24 * 365;
var SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=(self)",
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
};
var CATEGORIES = /* @__PURE__ */ new Set(["ride_offer", "ride_wanted", "marketplace", "job", "service", "accommodation", "community"]);
var RIDE_CATEGORIES = /* @__PURE__ */ new Set(["ride_offer", "ride_wanted"]);
var PROFILE_GENDERS = /* @__PURE__ */ new Set(["", "Woman", "Man", "Non-binary", "Prefer not to say"]);
var PROFILE_ROLES = /* @__PURE__ */ new Set(["driver", "rider", "both"]);
var AVATAR_EMOJIS = ["\u{1F697}", "\u{1F98A}", "\u{1F31F}", "\u{1F43C}", "\u{1F981}", "\u{1F42C}", "\u{1F989}", "\u{1F427}", "\u{1F98B}", "\u26A1", "\u{1F33F}", "\u{1F3AF}", "\u{1F699}", "\u2600\uFE0F", "\u{1F9ED}", "\u{1F428}", "\u{1F308}", "\u2615", "\u{1F3A7}", "\u{1F422}", "\u{1F41D}", "\u{1F319}", "\u{1F3C1}", "\u{1F6E3}\uFE0F"];
function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers(JSON_HEADERS);
  for (const [k, v] of Object.entries(extraHeaders || {})) headers.set(k, v);
  return new Response(JSON.stringify(data), { status, headers });
}
__name(json, "json");
function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return part.slice(i + 1).trim();
      }
    }
  }
  return "";
}
__name(cookieValue, "cookieValue");
function sessionCandidates(request) {
  const out = [];
  const auth = bearer(request);
  const cookie = cookieValue(request, SESSION_COOKIE);
  if (auth) out.push({ token: auth, source: "bearer" });
  if (cookie && cookie !== auth) out.push({ token: cookie, source: "cookie" });
  return out;
}
__name(sessionCandidates, "sessionCandidates");
function sessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
__name(sessionCookie, "sessionCookie");
function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
__name(clearSessionCookie, "clearSessionCookie");
function fail(message, status = 400) {
  return json({ ok: false, error: message }, status);
}
__name(fail, "fail");
function clean(value, max = 300) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}
__name(clean, "clean");
function cleanBody(value, max = 2500) {
  return String(value ?? "").trim().replace(/\r/g, "").slice(0, max);
}
__name(cleanBody, "cleanBody");
function validPhone(value) {
  return /^\+?[0-9][0-9\s()-]{7,20}$/.test(value) && /^\+[1-9]\d{7,14}$/.test(normalisePhone(value));
}
__name(validPhone, "validPhone");
function normalisePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = `44${digits.slice(1)}`;
  else if (digits.startsWith("7") && digits.length === 10) digits = `44${digits}`;
  return digits ? `+${digits}` : "";
}
__name(normalisePhone, "normalisePhone");
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value;
}
__name(validDate, "validDate");
function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
__name(validTime, "validTime");
function ukNowParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(/* @__PURE__ */ new Date());
  const get = /* @__PURE__ */ __name((type) => parts.find((p) => p.type === type)?.value || "", "get");
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}
__name(ukNowParts, "ukNowParts");
function journeyHasDeparted(date, time, graceMinutes = 15) {
  if (!validDate(date) || !validTime(time)) return true;
  const now = ukNowParts();
  if (date < now.date) return true;
  if (date > now.date) return false;
  return timeMinutes(time) < now.minutes - graceMinutes;
}
__name(journeyHasDeparted, "journeyHasDeparted");
function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
__name(withSecurityHeaders, "withSecurityHeaders");
function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
__name(clampInt, "clampInt");
function bearer(request) {
  const h = request.headers.get("authorization") || "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
}
__name(bearer, "bearer");
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
function requestIp(request) {
  const forwarded = request.headers.get("CF-Connecting-IP") || (request.headers.get("x-forwarded-for") || "").split(",")[0] || "unknown";
  return clean(forwarded, 80);
}
__name(requestIp, "requestIp");
async function rateLimitOrFail(request, env, bucket, limit, windowSeconds, subject = "") {
  const keyHash = await sha256(`${bucket}|${requestIp(request)}|${String(subject || "")}`);
  const resetAt = new Date(Date.now() + windowSeconds * 1e3).toISOString().slice(0, 19).replace("T", " ");
  const row = await env.DB.prepare(`
    INSERT INTO security_rate_limits(key_hash,bucket,count,reset_at,updated_at)
    VALUES(?,?,1,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key_hash,bucket) DO UPDATE SET
      count=CASE WHEN security_rate_limits.reset_at<=CURRENT_TIMESTAMP THEN 1 ELSE security_rate_limits.count+1 END,
      reset_at=CASE WHEN security_rate_limits.reset_at<=CURRENT_TIMESTAMP THEN excluded.reset_at ELSE security_rate_limits.reset_at END,
      updated_at=CURRENT_TIMESTAMP
    RETURNING count,reset_at
  `).bind(keyHash, bucket, resetAt).first();
  if (Number(row?.count || 0) > limit) {
    console.warn(JSON.stringify({ event: "rate_limited", bucket, keyHash: keyHash.slice(0, 12), resetAt: row?.reset_at || resetAt }));
    return fail("Too many requests. Please wait a little and try again.", 429);
  }
  return null;
}
__name(rateLimitOrFail, "rateLimitOrFail");
async function bookingEvent(env, rideRequestId, actorId, eventType, fromStatus = "", toStatus = "", detail = {}) {
  try {
    await env.DB.prepare("INSERT INTO booking_event_log(id,ride_request_id,actor_id,event_type,from_status,to_status,detail_json) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(), String(rideRequestId || ""), String(actorId || ""), clean(eventType, 60), clean(fromStatus, 20), clean(toStatus, 20), JSON.stringify(detail || {}).slice(0, 2500)).run();
  } catch (err) {
    await captureFailure(env, err, "/api/ride-requests", crypto.randomUUID());
  }
}
__name(bookingEvent, "bookingEvent");
function hexBytes(hex = "") {
  const cleanHex = String(hex).replace(/[^0-9a-f]/gi, "");
  const out = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
__name(hexBytes, "hexBytes");
function bytesFromPem(pem = "") {
  const body = String(pem).replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const raw = atob(body);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
__name(bytesFromPem, "bytesFromPem");
async function secureEqualHex(a = "", b = "") {
  const aa = hexBytes(a), bb = hexBytes(b);
  if (aa.length !== bb.length || !aa.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}
__name(secureEqualHex, "secureEqualHex");
function adminBearer(request) {
  return clean(request.headers.get("x-admin-token"), 180);
}
__name(adminBearer, "adminBearer");
function sqlNow() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
}
__name(sqlNow, "sqlNow");
async function importIntegrityPrivateKey(env) {
  if (!env.INTEGRITY_PRIVATE_KEY) throw new Error("Integrity signing key is not configured.");
  return crypto.subtle.importKey("pkcs8", bytesFromPem(env.INTEGRITY_PRIVATE_KEY), { name: "Ed25519" }, false, ["sign"]);
}
__name(importIntegrityPrivateKey, "importIntegrityPrivateKey");
async function importIntegrityPublicKey(pem) {
  return crypto.subtle.importKey("spki", bytesFromPem(pem), { name: "Ed25519" }, false, ["verify"]);
}
__name(importIntegrityPublicKey, "importIntegrityPublicKey");
async function integritySign(env, chainHash) {
  const key = await importIntegrityPrivateKey(env);
  const sig = new Uint8Array(await crypto.subtle.sign("Ed25519", key, new TextEncoder().encode(chainHash)));
  return b64url(sig);
}
__name(integritySign, "integritySign");
async function integrityVerify(publicPem, chainHash, signature) {
  try {
    const key = await importIntegrityPublicKey(publicPem);
    const raw = signature.replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw + "=".repeat((4 - raw.length % 4) % 4);
    const bin = atob(padded);
    const sig = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) sig[i] = bin.charCodeAt(i);
    return await crypto.subtle.verify("Ed25519", key, sig, new TextEncoder().encode(chainHash));
  } catch {
    return false;
  }
}
__name(integrityVerify, "integrityVerify");
async function requireAdmin(request, env) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth;
  const token = adminBearer(request);
  if (!token) return { error: fail("Admin unlock required.", 403) };
  const hash = await sha256(token);
  const row = await env.DB.prepare(`SELECT a.user_id,r.role,a.expires_at FROM admin_sessions a JOIN user_roles r ON r.user_id=a.user_id WHERE a.token_hash=? AND a.user_id=? AND a.expires_at>CURRENT_TIMESTAMP`).bind(hash, auth.user.id).first();
  if (!row) return { error: fail("Admin session expired. Unlock admin again.", 403) };
  await env.DB.prepare("UPDATE admin_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(hash).run();
  return { user: auth.user, role: row.role, adminToken: token };
}
__name(requireAdmin, "requireAdmin");
async function adminAudit(env, adminId, action, targetType, targetId, reason = "", detail = {}) {
  await env.DB.prepare("INSERT INTO admin_audit_log(id,admin_user_id,action,target_type,target_id,reason,detail_json) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(), adminId, clean(action, 80), clean(targetType, 40), clean(targetId, 100), cleanBody(reason, 500), JSON.stringify(detail || {}).slice(0, 3e3)).run();
}
__name(adminAudit, "adminAudit");
async function createSealedRating(env, rr, raterId, rateeId, score, comment) {
  const ratingId = crypto.randomUUID();
  const createdAt = sqlNow();
  const payload = { rating_id: ratingId, ride_request_id: rr.id, rater_id: raterId, ratee_id: rateeId, score: Number(score), comment: String(comment || ""), created_at: createdAt };
  const payloadHash = await sha256(JSON.stringify(payload));
  for (let attempt = 0; attempt < 6; attempt++) {
    const head = await env.DB.prepare("SELECT seq,head_hash FROM integrity_head WHERE singleton=1").first();
    const seq = Number(head?.seq || 0) + 1, prev = String(head?.head_hash || "GENESIS");
    const chainHash = await sha256(`${prev}|${seq}|rating|${ratingId}|create|${raterId}|${payloadHash}`);
    const signature = await integritySign(env, chainHash);
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO ratings(id,ride_request_id,rater_id,ratee_id,score,comment,created_at) VALUES(?,?,?,?,?,?,?)").bind(ratingId, rr.id, raterId, rateeId, score, comment, createdAt),
        env.DB.prepare("INSERT INTO integrity_ledger(seq,entity_type,entity_id,event_type,actor_id,payload_hash,prev_hash,chain_hash,signature,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(seq, "rating", ratingId, "create", raterId, payloadHash, prev, chainHash, signature, createdAt),
        env.DB.prepare("INSERT INTO rating_seals(rating_id,ledger_seq,payload_hash,chain_hash,signature,sealed_at) VALUES(?,?,?,?,?,?)").bind(ratingId, seq, payloadHash, chainHash, signature, createdAt)
      ]);
      return { ratingId, seq, chainHash, signature };
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.includes("LEDGER_RACE")) continue;
      if (msg.includes("UNIQUE")) throw new Error("RATING_ALREADY_SUBMITTED");
      throw err;
    }
  }
  throw new Error("INTEGRITY_LEDGER_BUSY");
}
__name(createSealedRating, "createSealedRating");
function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(b64url, "b64url");
function b64json(obj) {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}
__name(b64json, "b64json");
function recoveryCode() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const raw = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `CN-${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
}
__name(recoveryCode, "recoveryCode");
function avatarForId(id = "") {
  let hash = 0;
  for (const ch of String(id)) hash = hash * 31 + ch.charCodeAt(0) >>> 0;
  return AVATAR_EMOJIS[hash % AVATAR_EMOJIS.length];
}
__name(avatarForId, "avatarForId");
function cleanGender(value) {
  const v = clean(value, 40);
  return PROFILE_GENDERS.has(v) ? v : "";
}
__name(cleanGender, "cleanGender");
function cleanTravelRole(value) {
  const v = clean(value, 20).toLowerCase();
  return PROFILE_ROLES.has(v) ? v : "both";
}
__name(cleanTravelRole, "cleanTravelRole");
function cleanAvatar(value, id = "") {
  const v = clean(value, 8);
  return AVATAR_EMOJIS.includes(v) ? v : avatarForId(id);
}
__name(cleanAvatar, "cleanAvatar");
function normalisePlace(value) {
  return clean(value, 160).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\b(the|uk|united kingdom)\b/g, " ").replace(/\s+/g, " ").trim();
}
__name(normalisePlace, "normalisePlace");
function wordScore(a, b) {
  const na = normalisePlace(a), nb = normalisePlace(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const aa = new Set(na.split(" ").filter(Boolean));
  const bb = new Set(nb.split(" ").filter(Boolean));
  let overlap = 0;
  for (const w of aa) if (bb.has(w)) overlap++;
  const tokenScore = overlap / Math.max(aa.size, bb.size);
  const aPost = [...aa].find((x) => /^[a-z]{1,2}\d{1,2}/.test(x));
  const bPost = [...bb].find((x) => /^[a-z]{1,2}\d{1,2}/.test(x));
  const postcodeBonus = aPost && bPost && aPost.slice(0, 2) === bPost.slice(0, 2) ? 0.15 : 0;
  return Math.min(1, tokenScore + postcodeBonus);
}
__name(wordScore, "wordScore");
function timeMinutes(v) {
  const [h, m] = String(v).split(":").map(Number);
  return h * 60 + m;
}
__name(timeMinutes, "timeMinutes");
function rideMatchScore(a, b) {
  if (!RIDE_CATEGORIES.has(a.category) || !RIDE_CATEGORIES.has(b.category) || a.category === b.category) return 0;
  if (a.journey_date !== b.journey_date) return 0;
  const origin = wordScore(a.origin, b.origin);
  const dest = wordScore(a.destination, b.destination);
  const diff = Math.abs(timeMinutes(a.journey_time) - timeMinutes(b.journey_time));
  const flex = Math.max(60, Number(a.flexibility_minutes || 30) + Number(b.flexibility_minutes || 30));
  const time = Math.max(0, 1 - diff / Math.max(180, flex * 2));
  return Math.round((origin * 0.42 + dest * 0.42 + time * 0.16) * 100);
}
__name(rideMatchScore, "rideMatchScore");
function whatsappUrl(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text || "")}` : "";
}
__name(whatsappUrl, "whatsappUrl");
async function resolveSession(request, env) {
  const candidates = sessionCandidates(request);
  for (const candidate of candidates) {
    const hash = await sha256(candidate.token);
    const user = await env.DB.prepare(`
      SELECT u.id,u.name,u.phone,u.area,u.bio,u.created_at,
        COALESCE(d.avatar_emoji,'') avatar_emoji,COALESCE(d.gender,'') gender,
        COALESCE(d.travel_role,'both') travel_role,COALESCE(d.community,'') community,
        (SELECT ROUND(AVG(r.score),1) FROM ratings r WHERE r.ratee_id=u.id) rating,
        (SELECT COUNT(*) FROM ratings r WHERE r.ratee_id=u.id) rating_count,
        (SELECT COUNT(*) FROM ride_requests rr WHERE (rr.rider_id=u.id OR rr.driver_id=u.id) AND rr.status='completed') completed_rides,
        COALESCE((SELECT m.status FROM user_moderation m WHERE m.user_id=u.id),'active') moderation_status,
        COALESCE((SELECT m.reason FROM user_moderation m WHERE m.user_id=u.id),'') moderation_reason,
        COALESCE((SELECT m.until_at FROM user_moderation m WHERE m.user_id=u.id),'') moderation_until,
        COALESCE((SELECT r.role FROM user_roles r WHERE r.user_id=u.id),'') network_role
      FROM user_sessions s JOIN users u ON u.id=s.user_id
      LEFT JOIN user_profile_details d ON d.user_id=u.id
      WHERE s.token_hash=?
    `).bind(hash).first();
    if (user) {
      if (!user.avatar_emoji) user.avatar_emoji = avatarForId(user.id);
      try {
        await env.DB.prepare("UPDATE user_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(hash).run();
      } catch {
      }
      return { user, token: candidate.token, source: candidate.source, hash };
    }
  }
  return null;
}
__name(resolveSession, "resolveSession");
async function currentUser(request, env, required = false) {
  const session = await resolveSession(request, env);
  const user = session?.user;
  if (user?.moderation_status === "banned" || (user?.moderation_status === "suspended" && (!user.moderation_until || user.moderation_until > sqlNow()))) return null;
  return user || null;
}
__name(currentUser, "currentUser");
async function requireUser(request, env) {
  const session = await resolveSession(request, env);
  const user = session?.user;
  if (!user) return { error: fail("Your session is not connected. Reconnect or recover your Carpool Network account.", 401) };
  if (user.moderation_status === "banned") return { error: fail(`This account has been banned${user.moderation_reason ? `: ${user.moderation_reason}` : ""}. Contact Support if you believe this is wrong.`, 403) };
  if (user.moderation_status === "suspended") {
    if (!user.moderation_until || user.moderation_until > sqlNow()) return { error: fail(`This account is temporarily suspended${user.moderation_until ? ` until ${user.moderation_until}` : ""}${user.moderation_reason ? `: ${user.moderation_reason}` : ""}.`, 403) };
    await env.DB.prepare("UPDATE user_moderation SET status='active',reason='',until_at='',updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(user.id).run();
    user.moderation_status = "active";
  }
  return { user, sessionToken: session.token, authSource: session.source };
}
__name(requireUser, "requireUser");
function publicPost(row, viewerId = "", score = null) {
  const isMember = Boolean(viewerId);
  const own = viewerId && row.author_id === viewerId;
  const acceptedSeats = Number(row.accepted_seats || 0);
  const availableSeats = row.category === "ride_offer" ? Math.max(0, Number(row.seats || 0) - acceptedSeats) : Number(row.seats || 1);
  const contactText = RIDE_CATEGORIES.has(row.category) ? `Hi ${row.author_name}, I saw your ${row.category === "ride_offer" ? "ride offer" : "ride request"} from ${row.origin} to ${row.destination} on Carpool Network.` : `Hi ${row.author_name}, I'm contacting you about your \u201C${row.title}\u201D post on Carpool Network.`;
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    location: row.location,
    price: row.price,
    whatsappEnabled: Boolean(row.whatsapp_enabled),
    whatsappUrl: isMember && row.whatsapp_enabled && (!RIDE_CATEGORIES.has(row.category) || own) ? whatsappUrl(row.author_phone, contactText) : "",
    origin: row.origin,
    destination: row.destination,
    journeyDate: row.journey_date,
    journeyTime: row.journey_time,
    flexibilityMinutes: row.flexibility_minutes,
    seats: Number(row.seats || 1),
    availableSeats,
    acceptedSeats,
    status: row.status,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      name: row.author_name,
      area: row.author_area,
      avatarEmoji: row.author_avatar_emoji || avatarForId(row.author_id),
      rating: row.author_rating == null ? null : Number(row.author_rating),
      ratingCount: Number(row.author_rating_count || 0)
    },
    own,
    reactionCount: Number(row.reaction_count || 0),
    commentCount: Number(row.comment_count || 0),
    reacted: Boolean(row.viewer_reacted),
    matchScore: score
  };
}
__name(publicPost, "publicPost");
async function queryPost(env, id, viewerId = "") {
  return await env.DB.prepare(`
    SELECT p.*, u.name author_name, u.phone author_phone, u.area author_area,
      (SELECT avatar_emoji FROM user_profile_details d WHERE d.user_id=u.id) author_avatar_emoji,
      (SELECT ROUND(AVG(rt.score),1) FROM ratings rt WHERE rt.ratee_id=u.id) author_rating,
      (SELECT COUNT(*) FROM ratings rt WHERE rt.ratee_id=u.id) author_rating_count,
      (SELECT COALESCE(SUM(rr.seats_requested),0) FROM ride_requests rr WHERE rr.ride_offer_post_id=p.id AND rr.status IN ('accepted','completed')) accepted_seats,
      (SELECT COUNT(*) FROM reactions r WHERE r.post_id=p.id) reaction_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) comment_count,
      CASE WHEN ? <> '' THEN EXISTS(SELECT 1 FROM reactions vr WHERE vr.post_id=p.id AND vr.user_id=?) ELSE 0 END viewer_reacted
    FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=? AND p.status <> 'deleted'
  `).bind(viewerId, viewerId, id).first();
}
__name(queryPost, "queryPost");
async function createNotification(env, userId, kind, title, body, postId = "") {
  try {
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO notifications(id,user_id,kind,title,body,post_id) VALUES(?,?,?,?,?,?)").bind(id, userId, kind, clean(title, 120), clean(body, 240), postId).run();
    try {
      const hub = env.LIVE_HUB.get(env.LIVE_HUB.idFromName(userId));
      await hub.fetch("https://live.internal/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, notification: { id, kind, title, body, postId } })
      });
    } catch (err) {
      await captureFailure(env, err, "/api/live", crypto.randomUUID());
    }
    await sendBackgroundPush(env, userId);
    return id;
  } catch (err) {
    await captureFailure(env, err, "/api/notifications", crypto.randomUUID());
    return "";
  }
}
__name(createNotification, "createNotification");
async function getVapid(env) {
  const existing = await env.DB.prepare("SELECT value FROM app_settings WHERE key='vapid_pair'").first();
  if (existing?.value) return JSON.parse(existing.value);
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const generated = { vapid_public: b64url(raw), vapid_private_jwk: JSON.stringify(priv) };
  await env.DB.prepare("INSERT OR IGNORE INTO app_settings(key,value,updated_at) VALUES('vapid_pair',?,CURRENT_TIMESTAMP)").bind(JSON.stringify(generated)).run();
  const saved = await env.DB.prepare("SELECT value FROM app_settings WHERE key='vapid_pair'").first();
  return saved?.value ? JSON.parse(saved.value) : generated;
}
__name(getVapid, "getVapid");
async function vapidJwt(privateJwk, publicKey, endpoint) {
  const origin = new URL(endpoint).origin;
  const header = b64json({ typ: "JWT", alg: "ES256" });
  const payload = b64json({ aud: origin, exp: Math.floor(Date.now() / 1e3) + 6 * 60 * 60, sub: "mailto:admin@carpool.network" });
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("jwk", JSON.parse(privateJwk), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));
  return { jwt: `${unsigned}.${b64url(sig)}`, publicKey };
}
__name(vapidJwt, "vapidJwt");
async function sendBackgroundPush(env, userId) {
  try {
    const subs = await env.DB.prepare("SELECT id,endpoint FROM push_subscriptions WHERE user_id=?").bind(userId).all();
    if (!subs.results?.length) return;
    const keys = await getVapid(env);
    for (const sub of subs.results.slice(0, 5)) {
      try {
        if (!validPushEndpoint(sub.endpoint)) throw new Error("Unsupported push endpoint");
        const v = await vapidJwt(keys.vapid_private_jwk, keys.vapid_public, sub.endpoint);
        const response = await fetch(sub.endpoint, {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
          headers: { "TTL": "60", "Urgency": "high", "Authorization": `vapid t=${v.jwt}, k=${v.publicKey}` }
        });
        if (response.status === 404 || response.status === 410) {
          await env.DB.prepare("DELETE FROM push_subscriptions WHERE id=?").bind(sub.id).run();
        } else if (!response.ok) throw new Error("Push provider rejected delivery");
      } catch (err) {
        await captureFailure(env, err, "/api/push/subscribe", crypto.randomUUID());
      }
    }
  } catch (err) {
    await captureFailure(env, err, "/api/push/public-key", crypto.randomUUID());
  }
}
__name(sendBackgroundPush, "sendBackgroundPush");
async function notifyRideMatches(env, postRow) {
  if (!RIDE_CATEGORIES.has(postRow.category)) return [];
  const opposite = postRow.category === "ride_offer" ? "ride_wanted" : "ride_offer";
  const candidates = await env.DB.prepare(`
    SELECT p.*,u.name author_name,
      (SELECT COALESCE(SUM(rr.seats_requested),0) FROM ride_requests rr WHERE rr.ride_offer_post_id=p.id AND rr.status IN ('accepted','completed')) accepted_seats
    FROM posts p JOIN users u ON u.id=p.author_id
    WHERE p.status='active' AND p.category=? AND p.journey_date=? AND p.author_id<>?
    ORDER BY p.created_at DESC LIMIT 40
  `).bind(opposite, postRow.journey_date, postRow.author_id).all();
  const matches = (candidates.results || []).map((p) => ({ p, score: rideMatchScore(postRow, p) })).filter(({ p, score }) => {
    if (score < 45) return false;
    const offer = p.category === "ride_offer" ? p : postRow;
    const wanted = p.category === "ride_wanted" ? p : postRow;
    const available = Math.max(0, Number(offer.seats || 1) - Number(offer.accepted_seats || 0));
    return available >= Number(wanted.seats || 1);
  }).sort((a, b) => b.score - a.score).slice(0, 5);
  if (matches.length) {
    const best = matches[0];
    await createNotification(env, postRow.author_id, "ride_match", `${matches.length} compatible ride match${matches.length === 1 ? "" : "es"} found`, `Best match: ${best.score}% for ${postRow.origin} \u2192 ${postRow.destination}.`, best.p.id);
  }
  for (const { p, score } of matches) {
    await createNotification(env, p.author_id, "ride_match", `${score}% ride match found`, `A new compatible journey was posted for ${postRow.origin} \u2192 ${postRow.destination}.`, postRow.id);
  }
  return matches.map((x) => ({ id: x.p.id, score: x.score }));
}
__name(notifyRideMatches, "notifyRideMatches");
var LiveHub = class extends DurableObject {
  static {
    __name(this, "LiveHub");
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/connect") {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("Expected WebSocket", { status: 426 });
      const userId = clean(request.headers.get("x-user-id"), 80);
      const protocol = clean(request.headers.get("x-ws-protocol"), 180);
      if (!userId) return new Response("Missing user", { status: 400 });
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server, [userId]);
      server.serializeAttachment({ userId });
      const headers = protocol ? { "Sec-WebSocket-Protocol": protocol } : void 0;
      return new Response(null, { status: 101, webSocket: client, headers });
    }
    if (url.pathname === "/notify" && request.method === "POST") {
      const payload = await request.json();
      const userId = clean(payload.userId, 80);
      for (const ws of this.ctx.getWebSockets(userId)) {
        try {
          ws.send(JSON.stringify({ type: "notification", ...payload.notification }));
        } catch {
        }
      }
      return new Response("ok");
    }
    return new Response("Not found", { status: 404 });
  }
  webSocketMessage(ws, message) {
    if (String(message) === "ping") ws.send("pong");
  }
  webSocketClose(ws, code, reason, wasClean) {
    try {
      ws.close(code, reason);
    } catch {
    }
  }
  webSocketError(ws) {
    try {
      ws.close(1011, "socket error");
    } catch {
    }
  }
};
async function deactivateMemberSafety(env, targetId, actorId, reason = "") {
  const affected = await env.DB.prepare(`
    SELECT rr.id,rr.status,rr.rider_id,rr.driver_id,rr.ride_offer_post_id,rr.ride_wanted_post_id,rr.seats_requested,
      o.origin,o.destination,o.journey_date,o.journey_time,o.seats offer_seats
    FROM ride_requests rr JOIN posts o ON o.id=rr.ride_offer_post_id
    WHERE (rr.rider_id=? OR rr.driver_id=?) AND rr.status IN ('pending','accepted')
  `).bind(targetId, targetId).all();
  await env.DB.batch([
    env.DB.prepare("UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE (rider_id=? OR driver_id=?) AND status IN ('pending','accepted')").bind(targetId, targetId),
    env.DB.prepare("UPDATE posts SET status='closed',updated_at=CURRENT_TIMESTAMP WHERE author_id=? AND status='active'").bind(targetId),
    env.DB.prepare("DELETE FROM admin_sessions WHERE user_id=?").bind(targetId)
  ]);
  const offerIds = new Set();
  for (const rr of affected.results || []) {
    await bookingEvent(env, rr.id, actorId, "moderation_cancel", rr.status, "cancelled", { targetUserId: targetId, reason: cleanBody(reason, 300) });
    if (rr.driver_id === targetId) {
      if (rr.status === "accepted" && !journeyHasDeparted(rr.journey_date, rr.journey_time, 15)) {
        await env.DB.prepare(`UPDATE posts SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='closed' AND author_id<>? AND NOT EXISTS (SELECT 1 FROM user_moderation m WHERE m.user_id=posts.author_id AND (m.status='banned' OR (m.status='suspended' AND (m.until_at='' OR m.until_at>CURRENT_TIMESTAMP))))`).bind(rr.ride_wanted_post_id, targetId).run();
      }
      await createNotification(env, rr.rider_id, "ride_cancelled", "Driver account restricted", `This ${rr.origin} → ${rr.destination} booking was cancelled for safety. Your ride request is available again if the journey has not departed.`, rr.ride_wanted_post_id);
    } else {
      offerIds.add(rr.ride_offer_post_id);
      await createNotification(env, rr.driver_id, "ride_cancelled", "Rider account restricted", `A ${rr.origin} → ${rr.destination} seat request was cancelled for safety. Any confirmed seats have been released.`, rr.ride_offer_post_id);
    }
  }
  for (const offerId of offerIds) {
    const offer = await env.DB.prepare("SELECT id,seats,status,journey_date,journey_time,author_id FROM posts WHERE id=?").bind(offerId).first();
    if (!offer || journeyHasDeparted(offer.journey_date, offer.journey_time, 15)) continue;
    const booked = await env.DB.prepare("SELECT COALESCE(SUM(seats_requested),0) booked FROM ride_requests WHERE ride_offer_post_id=? AND status IN ('accepted','completed')").bind(offerId).first();
    const remaining = Math.max(0, Number(offer.seats || 0) - Number(booked?.booked || 0));
    if (remaining > 0 && offer.author_id !== targetId) await env.DB.prepare("UPDATE posts SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='closed'").bind(offerId).run();
  }
  return (affected.results || []).length;
}
__name(deactivateMemberSafety, "deactivateMemberSafety");
async function removePostSafety(env, post, actorId, reason = "") {
  if (!post || !RIDE_CATEGORIES.has(post.category)) {
    if (post) await env.DB.prepare("UPDATE posts SET status='deleted',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(post.id).run();
    return 0;
  }
  const isOffer = post.category === "ride_offer";
  const affected = await env.DB.prepare(`SELECT rr.id,rr.status,rr.rider_id,rr.driver_id,rr.ride_offer_post_id,rr.ride_wanted_post_id,rr.seats_requested,o.origin,o.destination,o.journey_date,o.journey_time,o.seats offer_seats FROM ride_requests rr JOIN posts o ON o.id=rr.ride_offer_post_id WHERE ${isOffer ? "rr.ride_offer_post_id" : "rr.ride_wanted_post_id"}=? AND rr.status IN ('pending','accepted')`).bind(post.id).all();
  await env.DB.batch([
    env.DB.prepare(`UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE ${isOffer ? "ride_offer_post_id" : "ride_wanted_post_id"}=? AND status IN ('pending','accepted')`).bind(post.id),
    env.DB.prepare("UPDATE posts SET status='deleted',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(post.id)
  ]);
  const offerIds = new Set();
  for (const rr of affected.results || []) {
    await bookingEvent(env, rr.id, actorId, "admin_post_removed", rr.status, "cancelled", { postId: post.id, reason: cleanBody(reason, 300) });
    if (isOffer) {
      if (rr.status === "accepted" && !journeyHasDeparted(rr.journey_date, rr.journey_time, 15)) await env.DB.prepare("UPDATE posts SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='closed'").bind(rr.ride_wanted_post_id).run();
      await createNotification(env, rr.rider_id, "ride_cancelled", "Ride removed by Carpool Network", `This ${rr.origin} → ${rr.destination} booking was cancelled. ${reason}`, rr.ride_wanted_post_id);
    } else {
      offerIds.add(rr.ride_offer_post_id);
      await createNotification(env, rr.driver_id, "request_closed", "Rider request removed", `A matching ${rr.origin} → ${rr.destination} request was removed. Any held seats are available again.`, rr.ride_offer_post_id);
    }
  }
  for (const offerId of offerIds) {
    const offer = await env.DB.prepare("SELECT id,seats,status,journey_date,journey_time FROM posts WHERE id=?").bind(offerId).first();
    if (!offer || journeyHasDeparted(offer.journey_date, offer.journey_time, 15)) continue;
    const booked = await env.DB.prepare("SELECT COALESCE(SUM(seats_requested),0) booked FROM ride_requests WHERE ride_offer_post_id=? AND status IN ('accepted','completed')").bind(offerId).first();
    if (Number(offer.seats || 0) - Number(booked?.booked || 0) > 0) await env.DB.prepare("UPDATE posts SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='closed'").bind(offerId).run();
  }
  return (affected.results || []).length;
}
__name(removePostSafety, "removePostSafety");
async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const diagnostic = await diagnosticRoutes(request, env, {json, fail, rateLimitOrFail, currentUser, requireAdmin, adminAudit});
  if (diagnostic) return diagnostic;
  if (path === "/api/health" && request.method === "GET") {
    await env.DB.prepare("SELECT id FROM diagnostic_issues LIMIT 1").first();
    return json({ ok: true, service: "Carpool Network", version: RELEASE_VERSION, database: "ok" });
  }
  if (path === "/api/stats" && request.method === "GET") {
    const uk = ukNowParts();
    const thresholdMinutes = Math.max(0, uk.minutes - 15);
    const threshold = `${String(Math.floor(thresholdMinutes / 60)).padStart(2, "0")}:${String(thresholdMinutes % 60).padStart(2, "0")}`;
    const row = await env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) members,
        (SELECT COUNT(*) FROM posts WHERE status='active' AND category='ride_offer' AND (journey_date>? OR (journey_date=? AND journey_time>=?))) ride_offers,
        (SELECT COUNT(*) FROM posts WHERE status='active' AND category='ride_wanted' AND (journey_date>? OR (journey_date=? AND journey_time>=?))) ride_needs,
        (SELECT COUNT(*) FROM ride_requests WHERE status IN ('accepted','completed')) confirmed_bookings,
        (SELECT COUNT(*) FROM posts WHERE status='active' AND created_at>=datetime('now','-24 hours')) posts_today
    `).bind(uk.date, uk.date, threshold, uk.date, uk.date, threshold).first();
    return json({ ok: true, stats: {
      members: Number(row?.members || 0),
      rideOffers: Number(row?.ride_offers || 0),
      rideNeeds: Number(row?.ride_needs || 0),
      confirmedBookings: Number(row?.confirmed_bookings || 0),
      postsToday: Number(row?.posts_today || 0)
    } });
  }
  if (path === "/api/rides/search" && request.method === "GET") {
    const viewer = await currentUser(request, env, false);
    const origin = clean(url.searchParams.get("from"), 120), destination = clean(url.searchParams.get("to"), 120);
    const journeyDate = clean(url.searchParams.get("date"), 10), journeyTime = clean(url.searchParams.get("time"), 5);
    const seats = clampInt(url.searchParams.get("seats"), 1, 8, 1);
    if (origin.length < 2 || destination.length < 2 || !validDate(journeyDate)) return fail("Enter where you are travelling from, where you are going and the date.");
    const nowUk = ukNowParts();
    if (journeyDate < nowUk.date) return fail("Choose today or a future date.");
    const source = { category: "ride_wanted", origin, destination, journey_date: journeyDate, journey_time: validTime(journeyTime) ? journeyTime : "12:00", flexibility_minutes: validTime(journeyTime) ? 60 : 720, seats };
    const rows = await env.DB.prepare(`
      SELECT p.*,u.name author_name,u.phone author_phone,u.area author_area,
        (SELECT avatar_emoji FROM user_profile_details d WHERE d.user_id=u.id) author_avatar_emoji,
        (SELECT ROUND(AVG(rt.score),1) FROM ratings rt WHERE rt.ratee_id=u.id) author_rating,
        (SELECT COUNT(*) FROM ratings rt WHERE rt.ratee_id=u.id) author_rating_count,
        (SELECT COALESCE(SUM(rr.seats_requested),0) FROM ride_requests rr WHERE rr.ride_offer_post_id=p.id AND rr.status IN ('accepted','completed')) accepted_seats,
        (SELECT COUNT(*) FROM reactions r WHERE r.post_id=p.id) reaction_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) comment_count,
        0 viewer_reacted
      FROM posts p JOIN users u ON u.id=p.author_id
      WHERE p.status='active' AND p.category='ride_offer' AND p.journey_date=?
      ORDER BY p.journey_time ASC,p.created_at DESC LIMIT 500
    `).bind(journeyDate).all();
    const rides = (rows.results || []).map((row) => ({ row, score: rideMatchScore(source, row) })).filter(({ row, score }) => {
      const available = Math.max(0, Number(row.seats || 1) - Number(row.accepted_seats || 0));
      return score >= 35 && available >= seats && !journeyHasDeparted(row.journey_date, row.journey_time, 15);
    }).sort((a, b) => b.score - a.score || String(a.row.journey_time).localeCompare(String(b.row.journey_time))).slice(0, 30).map(({ row, score }) => publicPost(row, viewer?.id || "", score));
    return json({ ok: true, rides, query: { origin, destination, journeyDate, journeyTime: validTime(journeyTime) ? journeyTime : "", seats } });
  }
  if (path === "/api/profile" && request.method === "POST") {
    const data = await request.json().catch(() => ({}));
    const name = clean(data.name, 60), rawPhone = clean(data.phone, 30), phone = normalisePhone(rawPhone), area = clean(data.area, 100);
    const gender = cleanGender(data.gender), travelRole = cleanTravelRole(data.travelRole), community = clean(data.community, 100);
    if (name.length < 2) return fail("Please enter your name.");
    if (!validPhone(rawPhone) || phone.length < 9) return fail("Please enter a valid WhatsApp number including country code.");
    if (area.length < 2) return fail("Please enter your area or town.");
    const signupLimited = await rateLimitOrFail(request, env, "signup_ip", 8, 3600);
    if (signupLimited) return signupLimited;
    const existing = await env.DB.prepare("SELECT id FROM users WHERE phone=? LIMIT 1").bind(phone).first();
    if (existing) return fail("This WhatsApp number is already a Carpool Network member. Use \u201CRecover account\u201D instead of joining again.", 409);
    const token = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256(token);
    const id = crypto.randomUUID();
    const recovery = recoveryCode();
    const avatarEmoji = avatarForId(id);
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users(id,token_hash,name,phone,area) VALUES(?,?,?,?,?)").bind(id, tokenHash, name, phone, area),
        env.DB.prepare("INSERT INTO user_profile_details(user_id,avatar_emoji,gender,travel_role,community) VALUES(?,?,?,?,?)").bind(id, avatarEmoji, gender, travelRole, community),
        env.DB.prepare("INSERT INTO user_sessions(token_hash,user_id) VALUES(?,?)").bind(tokenHash, id),
        env.DB.prepare("INSERT INTO account_recovery(user_id,code_hash) VALUES(?,?)").bind(id, await sha256(recovery)),
        env.DB.prepare("INSERT OR IGNORE INTO user_moderation(user_id,status) VALUES(?,'active')").bind(id)
      ]);
    } catch (error) {
      if (String(error?.message || error).includes("UNIQUE")) return fail("This WhatsApp number is already a Carpool Network member. Use \u201CRecover account\u201D instead.", 409);
      throw error;
    }
    return json({ ok: true, profile: { id, name, phone, area, bio: "", avatar_emoji: avatarEmoji, gender, travel_role: travelRole, community, completed_rides: 0, token }, recoveryCode: recovery }, 201, { "set-cookie": sessionCookie(token) });
  }
  if (path === "/api/profile" && request.method === "GET") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    return json({ ok: true, profile: auth.user }, 200, { "set-cookie": sessionCookie(auth.sessionToken), "x-auth-source": auth.authSource });
  }
  if (path === "/api/profile/logout" && request.method === "POST") {
    const candidates = sessionCandidates(request);
    for (const candidate of candidates) {
      const hash = await sha256(candidate.token);
      await env.DB.prepare("DELETE FROM user_sessions WHERE token_hash=?").bind(hash).run();
    }
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
  }
  if (path === "/api/profile/logout-others" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const currentHash = await sha256(auth.sessionToken);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM user_sessions WHERE user_id=? AND token_hash<>?").bind(auth.user.id, currentHash),
      env.DB.prepare("DELETE FROM admin_sessions WHERE user_id=?").bind(auth.user.id)
    ]);
    return json({ ok: true });
  }
  if (path === "/api/profile" && request.method === "PATCH") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const data = await request.json().catch(() => ({}));
    const name = clean(data.name, 60), rawPhone = clean(data.phone, 30), phone = normalisePhone(rawPhone), area = clean(data.area, 100), bio = cleanBody(data.bio, 300);
    const gender = cleanGender(data.gender), travelRole = cleanTravelRole(data.travelRole), community = clean(data.community, 100), avatarEmoji = cleanAvatar(data.avatarEmoji, auth.user.id);
    if (name.length < 2 || !validPhone(rawPhone) || phone.length < 9 || area.length < 2) return fail("Please check your profile details.");
    if (phone !== auth.user.phone) return fail("For security, WhatsApp number changes are locked until the new number can be verified. Contact Support to change it safely.", 409);
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET name=?,phone=?,area=?,bio=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(name, phone, area, bio, auth.user.id),
      env.DB.prepare(`INSERT INTO user_profile_details(user_id,avatar_emoji,gender,travel_role,community,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET avatar_emoji=excluded.avatar_emoji,gender=excluded.gender,travel_role=excluded.travel_role,community=excluded.community,updated_at=CURRENT_TIMESTAMP`).bind(auth.user.id, avatarEmoji, gender, travelRole, community)
    ]);
    return json({ ok: true });
  }
  if (path === "/api/profile/recovery-key" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const code = recoveryCode();
    await env.DB.prepare(`INSERT INTO account_recovery(user_id,code_hash,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash,updated_at=CURRENT_TIMESTAMP`).bind(auth.user.id, await sha256(code)).run();
    return json({ ok: true, recoveryCode: code });
  }
  if (path === "/api/profile/recover" && request.method === "POST") {
    const data = await request.json().catch(() => ({}));
    const rawPhone = clean(data.phone, 30), phone = normalisePhone(rawPhone), code = clean(data.recoveryCode, 40).toUpperCase();
    if (!validPhone(rawPhone) || phone.length < 9 || code.length < 10) return fail("Enter your WhatsApp number and recovery code.");
    const recoveryIpLimited = await rateLimitOrFail(request, env, "recovery_ip", 10, 900);
    if (recoveryIpLimited) return recoveryIpLimited;
    const recoveryPhoneLimited = await rateLimitOrFail(request, env, "recovery_phone", 5, 900, phone);
    if (recoveryPhoneLimited) return recoveryPhoneLimited;
    const hash = await sha256(code);
    const user = await env.DB.prepare(`SELECT u.id,u.name,u.phone,u.area,u.bio,COALESCE(d.avatar_emoji,'') avatar_emoji,COALESCE(d.gender,'') gender,COALESCE(d.travel_role,'both') travel_role,COALESCE(d.community,'') community,COALESCE(m.status,'active') moderation_status,COALESCE(m.reason,'') moderation_reason,COALESCE(m.until_at,'') moderation_until FROM users u JOIN account_recovery r ON r.user_id=u.id LEFT JOIN user_profile_details d ON d.user_id=u.id LEFT JOIN user_moderation m ON m.user_id=u.id WHERE r.code_hash=? AND u.phone=?`).bind(hash, phone).first();
    if (!user) return fail("Recovery details did not match.", 403);
    if (user.moderation_status === "banned") return fail("This account is banned. Contact Support if you believe this is wrong.", 403);
    if (user.moderation_status === "suspended" && (!user.moderation_until || user.moderation_until > sqlNow())) return fail("This account is temporarily suspended. Contact Support if you need help.", 403);
    if (!user.avatar_emoji) user.avatar_emoji = avatarForId(user.id);
    const token = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256(token);
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET token_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(tokenHash, user.id),
      env.DB.prepare("DELETE FROM user_sessions WHERE user_id=?").bind(user.id),
      env.DB.prepare("DELETE FROM admin_sessions WHERE user_id=?").bind(user.id),
      env.DB.prepare("INSERT INTO user_sessions(token_hash,user_id,last_seen_at) VALUES(?,?,CURRENT_TIMESTAMP)").bind(tokenHash, user.id),
      env.DB.prepare("UPDATE account_recovery SET updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(user.id)
    ]);
    return json({ ok: true, profile: { ...user, token } }, 200, { "set-cookie": sessionCookie(token) });
  }
  if (path === "/api/session/adopt" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    return json({ ok: true, profile: auth.user }, 200, { "set-cookie": sessionCookie(auth.sessionToken) });
  }
  if (path === "/api/feed" && request.method === "GET") {
    const viewer = await currentUser(request, env, false);
    const category = clean(url.searchParams.get("category"), 30);
    const q = clean(url.searchParams.get("q"), 80);
    const mine = url.searchParams.get("mine") === "1";
    const args = [viewer?.id || "", viewer?.id || ""];
    const where = [];
    if (mine) {
      if (!viewer) return fail("Join Carpool Network first.", 401);
      where.push("p.status <> 'deleted'");
      where.push("p.author_id=?");
      args.push(viewer.id);
    } else {
      where.push("p.status = 'active'");
      const uk = ukNowParts();
      const thresholdMinutes = Math.max(0, uk.minutes - 15);
      const threshold = `${String(Math.floor(thresholdMinutes / 60)).padStart(2, "0")}:${String(thresholdMinutes % 60).padStart(2, "0")}`;
      where.push("(p.category NOT IN ('ride_offer','ride_wanted') OR p.journey_date>? OR (p.journey_date=? AND p.journey_time>=?))");
      args.push(uk.date, uk.date, threshold);
    }
    if (category && CATEGORIES.has(category)) {
      where.push("p.category=?");
      args.push(category);
    }
    if (q) {
      where.push("(p.title LIKE ? OR p.body LIKE ? OR p.location LIKE ? OR p.origin LIKE ? OR p.destination LIKE ?)");
      const term = `%${q}%`;
      args.push(term, term, term, term, term);
    }
    const rows = await env.DB.prepare(`
      SELECT p.*,u.name author_name,u.phone author_phone,u.area author_area,
        (SELECT avatar_emoji FROM user_profile_details d WHERE d.user_id=u.id) author_avatar_emoji,
        (SELECT ROUND(AVG(rt.score),1) FROM ratings rt WHERE rt.ratee_id=u.id) author_rating,
        (SELECT COUNT(*) FROM ratings rt WHERE rt.ratee_id=u.id) author_rating_count,
        (SELECT COALESCE(SUM(rr.seats_requested),0) FROM ride_requests rr WHERE rr.ride_offer_post_id=p.id AND rr.status IN ('accepted','completed')) accepted_seats,
        (SELECT COUNT(*) FROM reactions r WHERE r.post_id=p.id) reaction_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) comment_count,
        CASE WHEN ? <> '' THEN EXISTS(SELECT 1 FROM reactions vr WHERE vr.post_id=p.id AND vr.user_id=?) ELSE 0 END viewer_reacted
      FROM posts p JOIN users u ON u.id=p.author_id
      WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC LIMIT 80
    `).bind(...args).all();
    return json({ ok: true, posts: (rows.results || []).map((r) => publicPost(r, viewer?.id || "")) });
  }
  if (path === "/api/posts" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const postLimited = await rateLimitOrFail(request, env, "post_create", 40, 3600, auth.user.id);
    if (postLimited) return postLimited;
    const data = await request.json().catch(() => ({}));
    const category = clean(data.category, 30);
    if (!CATEGORIES.has(category)) return fail("Choose a post type.");
    let title = clean(data.title, 140), body = cleanBody(data.body, 2500), location = clean(data.location, 120), price = clean(data.price, 60);
    const whatsappEnabled = RIDE_CATEGORIES.has(category) ? 1 : data.whatsappEnabled === false ? 0 : 1;
    let origin = "", destination = "", journeyDate = "", journeyTime = "", flexibility = 30, seats = 1;
    if (RIDE_CATEGORIES.has(category)) {
      origin = clean(data.origin, 120);
      destination = clean(data.destination, 120);
      journeyDate = clean(data.journeyDate, 10);
      journeyTime = clean(data.journeyTime, 5);
      flexibility = clampInt(data.flexibilityMinutes, 0, 240, 30);
      seats = clampInt(data.seats, 1, 8, 1);
      if (origin.length < 2 || destination.length < 2 || !validDate(journeyDate) || !validTime(journeyTime)) return fail("Please complete the journey details.");
      if (journeyHasDeparted(journeyDate, journeyTime, 15)) return fail("Choose a journey time that has not already passed.");
      if (category === "ride_offer") {
        const nearby = await env.DB.prepare(`SELECT journey_time FROM posts WHERE author_id=? AND category='ride_offer' AND status='active' AND journey_date=?`).bind(auth.user.id, journeyDate).all();
        const t = timeMinutes(journeyTime);
        if ((nearby.results || []).some((x) => Math.abs(timeMinutes(x.journey_time) - t) < 60)) return fail("You already have an active ride offer around this time. Manage that ride from My rides instead of posting a duplicate.", 409);
      } else {
        const existingWanted = await env.DB.prepare(`SELECT * FROM posts WHERE author_id=? AND category='ride_wanted' AND status='active' AND journey_date=? ORDER BY created_at DESC LIMIT 20`).bind(auth.user.id, journeyDate).all();
        const candidate = { category, origin, destination, journey_date: journeyDate, journey_time: journeyTime, flexibility_minutes: flexibility, seats };
        const t = timeMinutes(journeyTime);
        if ((existingWanted.results || []).some((x) => Math.abs(timeMinutes(x.journey_time) - t) < 60 && rideMatchScore({...candidate,category:"ride_offer"}, x) >= 80)) return fail("You already have a very similar ride request around this time. Manage it from My rides instead of posting a duplicate.", 409);
      }
      if (!title) title = category === "ride_offer" ? `${origin} \u2192 ${destination} \xB7 ${seats} seat${seats === 1 ? "" : "s"} available` : `Ride wanted: ${origin} \u2192 ${destination} \xB7 ${seats} seat${seats === 1 ? "" : "s"} needed`;
      location = location || auth.user.area;
    } else {
      if (title.length < 3) return fail("Please add a short title.");
      if (body.length < 3) return fail("Please add some details.");
      location = location || auth.user.area;
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO posts(id,author_id,category,title,body,location,price,whatsapp_enabled,origin,destination,journey_date,journey_time,flexibility_minutes,seats) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, auth.user.id, category, title, body, location, price, whatsappEnabled, origin, destination, journeyDate, journeyTime, flexibility, seats).run();
    const created = await queryPost(env, id, auth.user.id);
    const matches = await notifyRideMatches(env, created);
    return json({ ok: true, post: publicPost(created, auth.user.id), matches }, 201);
  }
  const postMatch = path.match(/^\/api\/posts\/([^/]+)$/);
  if (postMatch && request.method === "GET") {
    const viewer = await currentUser(request, env, false);
    const row = await queryPost(env, postMatch[1], viewer?.id || "");
    if (!row) return fail("Post not found.", 404);
    return json({ ok: true, post: publicPost(row, viewer?.id || "") });
  }
  if (postMatch && request.method === "PATCH") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const row = await env.DB.prepare("SELECT * FROM posts WHERE id=? AND author_id=?").bind(postMatch[1], auth.user.id).first();
    if (!row) return fail("Post not found.", 404);
    const data = await request.json().catch(() => ({}));
    if (typeof data.whatsappEnabled === "boolean" && data.status == null) {
      if (RIDE_CATEGORIES.has(row.category) && data.whatsappEnabled === false) return fail("Ride posts keep WhatsApp enabled because matched members finalise the trip there.", 409);
      await env.DB.prepare("UPDATE posts SET whatsapp_enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(data.whatsappEnabled ? 1 : 0, row.id).run();
      return json({ ok: true, whatsappEnabled: data.whatsappEnabled });
    }
    const status = clean(data.status, 20);
    if (!["active", "closed", "deleted"].includes(status)) return fail("Invalid status.");
    if (RIDE_CATEGORIES.has(row.category)) {
      if (status === "active" && row.journey_date && journeyHasDeparted(row.journey_date, row.journey_time, 15)) return fail("Journeys that have already departed cannot be reopened.", 409);
      const accepted = await env.DB.prepare(`SELECT COUNT(*) count FROM ride_requests WHERE ${row.category === "ride_offer" ? "ride_offer_post_id" : "ride_wanted_post_id"}=? AND status='accepted'`).bind(row.id).first();
      if ((status === "closed" || status === "deleted") && Number(accepted?.count || 0) > 0) {
        return fail(row.category === "ride_offer" ? "This ride has confirmed passengers. Cancel the ride from My rides so everyone is notified safely." : "You have a confirmed booking. Cancel that booking from My rides first.", 409);
      }
      if (status === "active" && row.category === "ride_offer") {
        const booked = await env.DB.prepare("SELECT COALESCE(SUM(seats_requested),0) booked FROM ride_requests WHERE ride_offer_post_id=? AND status IN ('accepted','completed')").bind(row.id).first();
        if (Number(booked?.booked || 0) >= Number(row.seats || 1)) return fail("This ride is already fully booked.", 409);
      }
      if (status === "closed" || status === "deleted") {
        const pending = await env.DB.prepare(`SELECT rr.id,rr.rider_id,rr.driver_id,rr.ride_offer_post_id,rr.ride_wanted_post_id FROM ride_requests rr WHERE ${row.category === "ride_offer" ? "rr.ride_offer_post_id" : "rr.ride_wanted_post_id"}=? AND rr.status='pending'`).bind(row.id).all();
        await env.DB.prepare(`UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE ${row.category === "ride_offer" ? "ride_offer_post_id" : "ride_wanted_post_id"}=? AND status='pending'`).bind(row.id).run();
        for (const rr of pending.results || []) {
          const target = row.category === "ride_offer" ? rr.rider_id : rr.driver_id;
          const pid = row.category === "ride_offer" ? rr.ride_wanted_post_id : rr.ride_offer_post_id;
          await createNotification(env, target, "request_closed", row.category === "ride_offer" ? "Driver closed this ride" : "Rider no longer needs this ride", row.category === "ride_offer" ? "Your pending seat request was cancelled. Your other matches remain available." : "This pending rider request was cancelled.", pid);
        }
      }
    }
    await env.DB.prepare("UPDATE posts SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, row.id).run();
    return json({ ok: true });
  }
  const cancelRideMatch = path.match(/^\/api\/posts\/([^/]+)\/cancel-ride$/);
  if (cancelRideMatch && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const offer = await env.DB.prepare("SELECT * FROM posts WHERE id=? AND author_id=? AND category='ride_offer' AND status<>'deleted'").bind(cancelRideMatch[1], auth.user.id).first();
    if (!offer) return fail("Ride offer not found.", 404);
    if (journeyHasDeparted(offer.journey_date, offer.journey_time, 15)) return fail("A ride that has already departed can no longer be cancelled here.", 409);
    const affected = await env.DB.prepare(`SELECT rr.id,rr.rider_id,rr.ride_wanted_post_id,rr.status,u.name rider_name FROM ride_requests rr JOIN users u ON u.id=rr.rider_id WHERE rr.ride_offer_post_id=? AND rr.status IN ('pending','accepted')`).bind(offer.id).all();
    const statements = [
      env.DB.prepare("UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE ride_offer_post_id=? AND status IN ('pending','accepted')").bind(offer.id),
      env.DB.prepare("UPDATE posts SET status='closed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(offer.id)
    ];
    for (const rr of affected.results || []) if (rr.status === "accepted") statements.push(env.DB.prepare("UPDATE posts SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='closed'").bind(rr.ride_wanted_post_id));
    await env.DB.batch(statements);
    for (const rr of affected.results || []) {
      await bookingEvent(env, rr.id, auth.user.id, "ride_cancelled_by_driver", rr.status, "cancelled", { rideOfferPostId: offer.id });
      await createNotification(env, rr.rider_id, "ride_cancelled", "Driver cancelled this ride", `${offer.origin} \u2192 ${offer.destination} on ${offer.journey_date} at ${offer.journey_time} has been cancelled by the driver.${rr.status === "accepted" ? " Your ride request is active again so you can find another driver." : ""}`, rr.ride_wanted_post_id);
    }
    return json({ ok: true, cancelledBookings: (affected.results || []).length });
  }
  const matchesMatch = path.match(/^\/api\/posts\/([^/]+)\/matches$/);
  if (matchesMatch && request.method === "GET") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const source = await env.DB.prepare("SELECT * FROM posts WHERE id=? AND author_id=? AND status='active'").bind(matchesMatch[1], auth.user.id).first();
    if (!source || !RIDE_CATEGORIES.has(source.category) || journeyHasDeparted(source.journey_date, source.journey_time, 15)) return fail("Active ride post not found.", 404);
    const opposite = source.category === "ride_wanted" ? "ride_offer" : "ride_wanted";
    const rows = await env.DB.prepare(`
      SELECT p.*,u.name author_name,u.phone author_phone,u.area author_area,
        (SELECT avatar_emoji FROM user_profile_details d WHERE d.user_id=u.id) author_avatar_emoji,
        (SELECT ROUND(AVG(rt.score),1) FROM ratings rt WHERE rt.ratee_id=u.id) author_rating,
        (SELECT COUNT(*) FROM ratings rt WHERE rt.ratee_id=u.id) author_rating_count,
        (SELECT COALESCE(SUM(rr.seats_requested),0) FROM ride_requests rr WHERE rr.ride_offer_post_id=p.id AND rr.status IN ('accepted','completed')) accepted_seats,
        (SELECT rr.status FROM ride_requests rr WHERE rr.ride_offer_post_id=CASE WHEN p.category='ride_offer' THEN p.id ELSE ? END AND rr.ride_wanted_post_id=CASE WHEN p.category='ride_wanted' THEN p.id ELSE ? END LIMIT 1) request_status,
        (SELECT rr.id FROM ride_requests rr WHERE rr.ride_offer_post_id=CASE WHEN p.category='ride_offer' THEN p.id ELSE ? END AND rr.ride_wanted_post_id=CASE WHEN p.category='ride_wanted' THEN p.id ELSE ? END LIMIT 1) request_id,
        0 reaction_count,0 comment_count,0 viewer_reacted
      FROM posts p JOIN users u ON u.id=p.author_id
      WHERE p.status='active' AND p.category=? AND p.journey_date=? AND p.author_id<>?
      ORDER BY p.created_at DESC LIMIT 60
    `).bind(source.id, source.id, source.id, source.id, opposite, source.journey_date, auth.user.id).all();
    const matches = (rows.results || []).map((row) => ({ row, score: rideMatchScore(source, row) })).filter(({ row, score }) => {
      if (score < 45 || journeyHasDeparted(row.journey_date, row.journey_time, 15)) return false;
      const offer = row.category === "ride_offer" ? row : source;
      const wanted = row.category === "ride_wanted" ? row : source;
      return Math.max(0, Number(offer.seats || 1) - Number(offer.accepted_seats || 0)) >= Number(wanted.seats || 1);
    }).sort((a, b) => b.score - a.score).slice(0, 12).map(({ row, score }) => ({ post: publicPost(row, auth.user.id, score), requestStatus: row.request_status || "", requestId: row.request_id || "" }));
    return json({ ok: true, matches });
  }
  if (path === "/api/ride-request-options" && request.method === "GET") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const offerId = clean(url.searchParams.get("offerPostId"), 80);
    const offer = await env.DB.prepare("SELECT p.*,u.name author_name,u.phone author_phone,u.area author_area FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=? AND p.category='ride_offer' AND p.status='active'").bind(offerId).first();
    if (!offer || journeyHasDeparted(offer.journey_date, offer.journey_time, 15)) return fail("Ride offer not found.", 404);
    if (offer.author_id === auth.user.id) return json({ ok: true, options: [] });
    const booked = await env.DB.prepare("SELECT COALESCE(SUM(seats_requested),0) booked FROM ride_requests WHERE ride_offer_post_id=? AND status IN ('accepted','completed')").bind(offer.id).first();
    const available = Math.max(0, Number(offer.seats || 1) - Number(booked?.booked || 0));
    const rows = await env.DB.prepare(`
      SELECT p.*,rr.id request_id,rr.status request_status
      FROM posts p LEFT JOIN ride_requests rr ON rr.ride_wanted_post_id=p.id AND rr.ride_offer_post_id=?
      WHERE p.author_id=? AND p.category='ride_wanted' AND p.status<>'deleted' AND p.journey_date=?
      ORDER BY p.created_at DESC LIMIT 12
    `).bind(offer.id, auth.user.id, offer.journey_date).all();
    const options = (rows.results || []).map((w) => ({ post: w, score: rideMatchScore(w, offer), requestId: w.request_id || "", requestStatus: w.request_status || "" })).filter((x) => x.requestStatus || x.post.status === "active" && x.score >= 45 && Number(x.post.seats || 1) <= available).sort((a, b) => b.score - a.score).map((x) => ({ rideWantedPostId: x.post.id, title: x.post.title, origin: x.post.origin, destination: x.post.destination, journeyDate: x.post.journey_date, journeyTime: x.post.journey_time, seats: Number(x.post.seats || 1), score: x.score, requestId: x.requestId, requestStatus: x.requestStatus, contactUrl: ["accepted", "completed"].includes(x.requestStatus) ? whatsappUrl(offer.author_phone, `Hi ${offer.author_name}, our Carpool Network match for ${offer.origin} \u2192 ${offer.destination} was accepted. Shall we finalise the exact pickup, time and any contribution here on WhatsApp?`) : "" }));
    return json({ ok: true, availableSeats: available, options });
  }
  if (path === "/api/ride-requests/quick" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const requestLimited = await rateLimitOrFail(request, env, "ride_request", 60, 3600, auth.user.id);
    if (requestLimited) return requestLimited;
    const data = await request.json().catch(() => ({}));
    const offerId = clean(data.rideOfferPostId, 80);
    const offer = await env.DB.prepare("SELECT p.*,u.name author_name FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=? AND p.category='ride_offer' AND p.status='active'").bind(offerId).first();
    if (!offer) return fail("That ride is no longer available.", 409);
    if (offer.author_id === auth.user.id) return fail("You cannot book your own ride.");
    const source = {
      category: "ride_wanted",
      origin: clean(data.origin || offer.origin, 120),
      destination: clean(data.destination || offer.destination, 120),
      journey_date: clean(data.journeyDate || offer.journey_date, 10),
      journey_time: clean(data.journeyTime || offer.journey_time, 5),
      flexibility_minutes: clampInt(data.flexibilityMinutes, 0, 240, 60),
      seats: clampInt(data.seats, 1, 8, 1)
    };
    if (!validDate(source.journey_date) || !validTime(source.journey_time) || source.origin.length < 2 || source.destination.length < 2) return fail("Please check your journey details.");
    if (journeyHasDeparted(offer.journey_date, offer.journey_time, 15)) return fail("That ride has already departed.", 409);
    if (source.journey_date !== offer.journey_date || rideMatchScore(source, offer) < 35) return fail("That ride does not match the journey you searched for.", 409);
    const booked = await env.DB.prepare("SELECT COALESCE(SUM(seats_requested),0) booked FROM ride_requests WHERE ride_offer_post_id=? AND status IN ('accepted','completed')").bind(offer.id).first();
    const available = Math.max(0, Number(offer.seats || 1) - Number(booked?.booked || 0));
    if (available < source.seats) return fail(`Only ${available} seat${available === 1 ? "" : "s"} remain on this ride.`, 409);
    const targetMins = timeMinutes(source.journey_time);
    const confirmedRows = await env.DB.prepare(`SELECT o.journey_time FROM ride_requests rr JOIN posts o ON o.id=rr.ride_offer_post_id WHERE rr.rider_id=? AND rr.status IN ('accepted','completed') AND o.journey_date=?`).bind(auth.user.id, source.journey_date).all();
    if ((confirmedRows.results || []).some((x) => Math.abs(timeMinutes(x.journey_time) - targetMins) < 180)) return fail("You already have a confirmed ride around this time. Manage that booking from My rides first.", 409);
    const pendingRows = await env.DB.prepare(`SELECT o.journey_time FROM ride_requests rr JOIN posts o ON o.id=rr.ride_offer_post_id WHERE rr.rider_id=? AND rr.status='pending' AND o.journey_date=?`).bind(auth.user.id, source.journey_date).all();
    const nearbyPending = (pendingRows.results || []).filter((x) => Math.abs(timeMinutes(x.journey_time) - targetMins) < 180).length;
    const wantedRows = await env.DB.prepare("SELECT * FROM posts WHERE author_id=? AND category='ride_wanted' AND status='active' AND journey_date=? ORDER BY created_at DESC LIMIT 20").bind(auth.user.id, source.journey_date).all();
    let wanted = (wantedRows.results || []).map((p) => ({ p, score: rideMatchScore({...source,category:"ride_offer"}, p) })).filter((x) => x.score >= 70).sort((a, b) => b.score - a.score)[0]?.p || null;
    let existing = wanted ? await env.DB.prepare("SELECT id,status FROM ride_requests WHERE ride_offer_post_id=? AND ride_wanted_post_id=?").bind(offer.id, wanted.id).first() : null;
    if (existing?.status === "pending") return json({ ok: true, id: existing.id, status: "pending", rideWantedPostId: wanted.id, already: true });
    if (existing && ["accepted", "completed"].includes(existing.status)) return fail("This ride is already confirmed.", 409);
    if (existing?.status !== "pending" && nearbyPending >= 3) return fail("You already have 3 driver requests waiting around this time. Check My rides before requesting another.", 409);
    const requestId = existing?.id || crypto.randomUUID();
    if (!wanted) {
      const wantedId = crypto.randomUUID();
      const title = `Ride wanted: ${source.origin} \u2192 ${source.destination} \xB7 ${source.seats} seat${source.seats === 1 ? "" : "s"} needed`;
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO posts(id,author_id,category,title,body,location,price,whatsapp_enabled,origin,destination,journey_date,journey_time,flexibility_minutes,seats) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(wantedId, auth.user.id, "ride_wanted", title, "", auth.user.area, "", 1, source.origin, source.destination, source.journey_date, source.journey_time, source.flexibility_minutes, source.seats),
        env.DB.prepare("INSERT INTO ride_requests(id,ride_offer_post_id,ride_wanted_post_id,rider_id,driver_id,seats_requested) VALUES(?,?,?,?,?,?)").bind(requestId, offer.id, wantedId, auth.user.id, offer.author_id, source.seats)
      ]);
      wanted = { id: wantedId, ...source };
    } else if (existing) {
      await env.DB.prepare("UPDATE ride_requests SET status='pending',seats_requested=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(source.seats, requestId).run();
    } else {
      await env.DB.prepare("INSERT INTO ride_requests(id,ride_offer_post_id,ride_wanted_post_id,rider_id,driver_id,seats_requested) VALUES(?,?,?,?,?,?)").bind(requestId, offer.id, wanted.id, auth.user.id, offer.author_id, source.seats).run();
    }
    await bookingEvent(env, requestId, auth.user.id, existing ? "request_reopened" : "request_created", existing?.status || "", "pending", { rideOfferPostId: offer.id, rideWantedPostId: wanted.id, seats: source.seats });
    await createNotification(env, offer.author_id, "seat_request", `${auth.user.name} requested ${source.seats} seat${source.seats === 1 ? "" : "s"}`, `${source.origin} \u2192 ${source.destination} on ${source.journey_date} at ${source.journey_time}.`, offer.id);
    return json({ ok: true, id: requestId, status: "pending", rideWantedPostId: wanted.id }, 201);
  }
  if (path === "/api/ride-requests" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const requestLimited = await rateLimitOrFail(request, env, "ride_request", 60, 3600, auth.user.id);
    if (requestLimited) return requestLimited;
    const data = await request.json().catch(() => ({}));
    const wantedId = clean(data.rideWantedPostId, 80), offerId = clean(data.rideOfferPostId, 80);
    const wanted = await env.DB.prepare("SELECT * FROM posts WHERE id=? AND author_id=? AND category='ride_wanted' AND status='active'").bind(wantedId, auth.user.id).first();
    const offer = await env.DB.prepare("SELECT * FROM posts WHERE id=? AND category='ride_offer' AND status='active'").bind(offerId).first();
    if (!wanted || !offer) return fail("That journey is no longer available.", 409);
    if (journeyHasDeparted(offer.journey_date, offer.journey_time, 15)) return fail("That ride has already departed.", 409);
    if (wanted.author_id === offer.author_id) return fail("You cannot request your own ride.");
    if (wanted.journey_date !== offer.journey_date || rideMatchScore(wanted, offer) < 45) return fail("These journeys are not a close enough match.", 409);
    const accepted = await env.DB.prepare("SELECT COALESCE(SUM(seats_requested),0) booked FROM ride_requests WHERE ride_offer_post_id=? AND status IN ('accepted','completed')").bind(offer.id).first();
    if (Number(offer.seats) - Number(accepted?.booked || 0) < Number(wanted.seats || 1)) return fail("That driver no longer has enough seats.", 409);
    const confirmed = await env.DB.prepare("SELECT id FROM ride_requests WHERE ride_wanted_post_id=? AND status IN ('accepted','completed')").bind(wanted.id).first();
    if (confirmed) return fail("You already have a confirmed driver for this journey.", 409);
    const targetMins = timeMinutes(wanted.journey_time);
    const otherConfirmed = await env.DB.prepare(`SELECT o.journey_time FROM ride_requests rr JOIN posts o ON o.id=rr.ride_offer_post_id WHERE rr.rider_id=? AND rr.status IN ('accepted','completed') AND o.journey_date=?`).bind(auth.user.id, wanted.journey_date).all();
    if ((otherConfirmed.results || []).some((x) => Math.abs(timeMinutes(x.journey_time) - targetMins) < 180)) return fail("You already have another confirmed ride around this time.", 409);
    const pendingRows = await env.DB.prepare(`SELECT o.journey_time FROM ride_requests rr JOIN posts o ON o.id=rr.ride_offer_post_id WHERE rr.rider_id=? AND rr.status='pending' AND o.journey_date=?`).bind(auth.user.id, wanted.journey_date).all();
    const nearbyPending = (pendingRows.results || []).filter((x) => Math.abs(timeMinutes(x.journey_time) - targetMins) < 180).length;
    const existing = await env.DB.prepare("SELECT id,status FROM ride_requests WHERE ride_offer_post_id=? AND ride_wanted_post_id=?").bind(offer.id, wanted.id).first();
    if (existing?.status !== "pending" && nearbyPending >= 3) return fail("You already have 3 driver requests pending around this time. Wait for a reply or cancel one first.", 409);
    let id = existing?.id || crypto.randomUUID();
    if (existing) {
      if (existing.status === "pending") return fail("Request already sent.", 409);
      if (existing.status === "accepted" || existing.status === "completed") return fail("This ride is already confirmed.", 409);
      await env.DB.prepare("UPDATE ride_requests SET status='pending',seats_requested=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(wanted.seats || 1), id).run();
    } else {
      await env.DB.prepare("INSERT INTO ride_requests(id,ride_offer_post_id,ride_wanted_post_id,rider_id,driver_id,seats_requested) VALUES(?,?,?,?,?,?)").bind(id, offer.id, wanted.id, auth.user.id, offer.author_id, Number(wanted.seats || 1)).run();
    }
    await bookingEvent(env, id, auth.user.id, existing ? "request_reopened" : "request_created", existing?.status || "", "pending", { rideOfferPostId: offer.id, rideWantedPostId: wanted.id, seats: Number(wanted.seats || 1) });
    await createNotification(env, offer.author_id, "seat_request", `${auth.user.name} requested ${Number(wanted.seats || 1)} seat${Number(wanted.seats || 1) === 1 ? "" : "s"}`, `${wanted.origin} \u2192 ${wanted.destination} on ${wanted.journey_date} at ${wanted.journey_time}.`, offer.id);
    return json({ ok: true, id, status: "pending" }, 201);
  }
  const postRequestsMatch = path.match(/^\/api\/posts\/([^/]+)\/ride-requests$/);
  if (postRequestsMatch && request.method === "GET") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const post = await env.DB.prepare("SELECT id,author_id,category FROM posts WHERE id=? AND author_id=?").bind(postRequestsMatch[1], auth.user.id).first();
    if (!post || !RIDE_CATEGORIES.has(post.category)) return fail("Ride post not found.", 404);
    const rows = await env.DB.prepare(`
      SELECT rr.*,uw.origin wanted_origin,uw.destination wanted_destination,uw.journey_date,uw.journey_time,
        rider.name rider_name,rider.area rider_area,rider.phone rider_phone,driver.name driver_name,driver.area driver_area,driver.phone driver_phone,
        (SELECT avatar_emoji FROM user_profile_details d WHERE d.user_id=rr.rider_id) rider_avatar_emoji,
        (SELECT ROUND(AVG(rt.score),1) FROM ratings rt WHERE rt.ratee_id=rr.rider_id) rider_rating,
        (SELECT COUNT(*) FROM ratings rt WHERE rt.ratee_id=rr.rider_id) rider_rating_count,
        (SELECT ROUND(AVG(rt.score),1) FROM ratings rt WHERE rt.ratee_id=rr.driver_id) driver_rating,
        (SELECT COUNT(*) FROM ratings rt WHERE rt.ratee_id=rr.driver_id) driver_rating_count
      FROM ride_requests rr
      JOIN posts uw ON uw.id=rr.ride_wanted_post_id
      JOIN users rider ON rider.id=rr.rider_id JOIN users driver ON driver.id=rr.driver_id
      WHERE ${post.category === "ride_offer" ? "rr.ride_offer_post_id=?" : "rr.ride_wanted_post_id=?"}
      ORDER BY CASE rr.status WHEN 'accepted' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,rr.created_at DESC
    `).bind(post.id).all();
    const safe = (rows.results || []).map((r) => {
      const contactUrl = ["accepted", "completed"].includes(r.status) ? whatsappUrl(
        post.category === "ride_offer" ? r.rider_phone : r.driver_phone,
        `Hi ${post.category === "ride_offer" ? r.rider_name : r.driver_name}, our Carpool Network match for ${r.wanted_origin} \u2192 ${r.wanted_destination} was accepted. Shall we finalise the exact pickup, timing and any contribution here on WhatsApp?`
      ) : "";
      const { rider_phone, driver_phone, ...rest } = r;
      return { ...rest, contact_url: contactUrl };
    });
    return json({ ok: true, requests: safe });
  }
  if (path === "/api/ride-requests/mine" && request.method === "GET") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const rows = await env.DB.prepare(`
      SELECT rr.*,offer.origin,offer.destination,offer.journey_date,offer.journey_time,offer.price,offer.whatsapp_enabled,
        rider.name rider_name,rider.phone rider_phone,rider.area rider_area,
        driver.name driver_name,driver.phone driver_phone,driver.area driver_area,
        (SELECT score FROM ratings r WHERE r.ride_request_id=rr.id AND r.rater_id=?) my_rating
      FROM ride_requests rr JOIN posts offer ON offer.id=rr.ride_offer_post_id
      JOIN users rider ON rider.id=rr.rider_id JOIN users driver ON driver.id=rr.driver_id
      WHERE rr.rider_id=? OR rr.driver_id=?
      ORDER BY CASE rr.status WHEN 'accepted' THEN 0 WHEN 'pending' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,rr.updated_at DESC LIMIT 80
    `).bind(auth.user.id, auth.user.id, auth.user.id).all();
    const out = (rows.results || []).map((r) => {
      const asRider = r.rider_id === auth.user.id;
      const otherName = asRider ? r.driver_name : r.rider_name;
      const otherPhone = asRider ? r.driver_phone : r.rider_phone;
      const confirmed = ["accepted", "completed"].includes(r.status);
      return {
        id: r.id,
        ride_offer_post_id: r.ride_offer_post_id,
        ride_wanted_post_id: r.ride_wanted_post_id,
        rider_id: r.rider_id,
        driver_id: r.driver_id,
        seats_requested: Number(r.seats_requested || 1),
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
        origin: r.origin,
        destination: r.destination,
        journey_date: r.journey_date,
        journey_time: r.journey_time,
        price: r.price,
        my_rating: r.my_rating,
        role: asRider ? "rider" : "driver",
        other_name: otherName,
        contact_url: confirmed ? whatsappUrl(otherPhone, `Hi ${otherName}, our Carpool Network match for ${r.origin} \u2192 ${r.destination} was accepted. Shall we finalise the exact pickup, timing and any contribution here on WhatsApp?`) : "",
        can_cancel: r.status === "pending" && asRider || r.status === "accepted" && !journeyHasDeparted(r.journey_date, r.journey_time, 0),
        can_rate: confirmed && r.journey_date < ukNowParts().date && !r.my_rating
      };
    });
    return json({ ok: true, requests: out });
  }
  const requestMatch = path.match(/^\/api\/ride-requests\/([^/]+)$/);
  if (requestMatch && request.method === "PATCH") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const rr = await env.DB.prepare(`SELECT rr.*,offer.seats offer_seats,offer.status offer_status,offer.journey_date,offer.journey_time,wanted.status wanted_status,wanted.origin,wanted.destination FROM ride_requests rr JOIN posts offer ON offer.id=rr.ride_offer_post_id JOIN posts wanted ON wanted.id=rr.ride_wanted_post_id WHERE rr.id=?`).bind(requestMatch[1]).first();
    if (!rr) return fail("Ride request not found.", 404);
    const data = await request.json().catch(() => ({}));
    const next = clean(data.status, 20);
    if (next === "accepted") {
      if (rr.driver_id !== auth.user.id) return fail("Only the driver can accept this request.", 403);
      if (rr.status === "accepted") return json({ ok: true, status: "accepted", idempotent: true });
      if (rr.status !== "pending") return fail("Only a pending request can be accepted.", 409);
      if (rr.offer_status !== "active" || rr.wanted_status !== "active") return fail("This journey is no longer active.", 409);
      if (journeyHasDeparted(rr.journey_date, rr.journey_time, 15)) return fail("This ride has already departed.", 409);
      const nearbyPendingRows = await env.DB.prepare(`
        SELECT other.id,other.driver_id,other.ride_offer_post_id,other.ride_wanted_post_id,o.journey_time
        FROM ride_requests other JOIN posts o ON o.id=other.ride_offer_post_id
        WHERE other.rider_id=? AND other.id<>? AND other.status='pending' AND o.journey_date=?
      `).bind(rr.rider_id, rr.id, rr.journey_date).all();
      const acceptedMins = timeMinutes(rr.journey_time);
      const otherDriverRequests = (nearbyPendingRows.results || []).filter((x) => Math.abs(timeMinutes(x.journey_time) - acceptedMins) < 180);
      try {
        const batchResult = await env.DB.batch([
          env.DB.prepare("UPDATE ride_requests SET status='accepted',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(rr.id),
          env.DB.prepare(`UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP
            WHERE rider_id=? AND id<>? AND status='pending' AND ride_offer_post_id IN (
              SELECT p.id FROM posts p WHERE p.category='ride_offer' AND p.journey_date=? AND
              ABS((CAST(substr(p.journey_time,1,2) AS INTEGER)*60+CAST(substr(p.journey_time,4,2) AS INTEGER))-?) < 180
            )`).bind(rr.rider_id, rr.id, rr.journey_date, acceptedMins),
          env.DB.prepare(`UPDATE posts SET status='closed',updated_at=CURRENT_TIMESTAMP
            WHERE author_id=? AND category='ride_wanted' AND status='active' AND journey_date=? AND
            ABS((CAST(substr(journey_time,1,2) AS INTEGER)*60+CAST(substr(journey_time,4,2) AS INTEGER))-?) < 180`).bind(rr.rider_id, rr.journey_date, acceptedMins)
        ]);
        if (!batchResult?.[0]?.meta?.changes) return fail("This request is no longer pending.", 409);
      } catch (err) {
        const msg = String(err);
        if (msg.includes("NO_SEATS")) return fail("Those seats were just taken by another confirmed request.", 409);
        if (msg.includes("RIDER_TIME_CONFLICT") || msg.includes("RIDER_ALREADY_BOOKED") || msg.includes("UNIQUE")) return fail("This rider is already confirmed on another ride around this time.", 409);
        if (msg.includes("DRIVER_TIME_CONFLICT")) return fail("You already have another confirmed ride around this time. Cancel or reschedule it before accepting this request.", 409);
        throw err;
      }
      for (const other of otherDriverRequests) await createNotification(env, other.driver_id, "request_closed", "Seat request no longer needed", `The rider has confirmed another driver for this journey.`, other.ride_offer_post_id);
      const booked = await env.DB.prepare("SELECT COALESCE(SUM(seats_requested),0) booked FROM ride_requests WHERE ride_offer_post_id=? AND status IN ('accepted','completed')").bind(rr.ride_offer_post_id).first();
      const remaining = Math.max(0, Number(rr.offer_seats) - Number(booked?.booked || 0));
      const impossible = await env.DB.prepare("SELECT id,rider_id,ride_wanted_post_id FROM ride_requests WHERE ride_offer_post_id=? AND status='pending' AND seats_requested>?").bind(rr.ride_offer_post_id, remaining).all();
      if ((impossible.results || []).length) {
        await env.DB.prepare("UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE ride_offer_post_id=? AND status='pending' AND seats_requested>?").bind(rr.ride_offer_post_id, remaining).run();
        for (const x of impossible.results || []) await createNotification(env, x.rider_id, "ride_unavailable", "Not enough seats remain", "Another booking was confirmed and this driver no longer has enough seats for your request. Your other driver requests remain active.", x.ride_wanted_post_id);
      }
      if (remaining === 0) await env.DB.prepare("UPDATE posts SET status='closed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(rr.ride_offer_post_id).run();
      await bookingEvent(env, rr.id, auth.user.id, "accepted", "pending", "accepted", { rideOfferPostId: rr.ride_offer_post_id, rideWantedPostId: rr.ride_wanted_post_id, seats: rr.seats_requested });
      await createNotification(env, rr.rider_id, "ride_confirmed", "Matched \u2014 finalise on WhatsApp \u2705", `The driver accepted your ${rr.origin} \u2192 ${rr.destination} seat request. Your seat is held in Carpool Network; now agree the exact pickup, timing and any contribution directly on WhatsApp. Other pending driver requests were cancelled automatically.`, rr.ride_offer_post_id);
      return json({ ok: true, status: "accepted" });
    }
    if (next === "declined") {
      if (rr.driver_id !== auth.user.id) return fail("Only the driver can decline this request.", 403);
      if (rr.status === "declined") return json({ ok: true, status: "declined", idempotent: true });
      if (rr.status !== "pending") return fail("Only a pending request can be declined.", 409);
      const declined = await env.DB.prepare("UPDATE ride_requests SET status='declined',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(rr.id).run();
      if (!declined.meta.changes) return fail("This booking changed. Refresh before trying again.", 409);
      await bookingEvent(env, rr.id, auth.user.id, "declined", "pending", "declined", {});
      await createNotification(env, rr.rider_id, "ride_declined", "Ride request declined", "That driver cannot take this journey. Your other matches remain available.", rr.ride_wanted_post_id);
      return json({ ok: true, status: "declined" });
    }
    if (next === "cancelled") {
      const asRider = rr.rider_id === auth.user.id, asDriver = rr.driver_id === auth.user.id;
      if (!asRider && !asDriver) return fail("You are not part of this booking.", 403);
      if (rr.status === "cancelled") return json({ ok: true, status: "cancelled", idempotent: true });
      if (rr.status === "pending" && !asRider) return fail("Drivers should decline pending requests rather than cancel them.", 409);
      if (!["pending", "accepted"].includes(rr.status)) return fail("This booking can no longer be cancelled.", 409);
      if (rr.status === "accepted" && journeyHasDeparted(rr.journey_date, rr.journey_time, 0)) return fail("A departed journey cannot be cancelled. Contact Support if there was a problem.", 409);
      const previousStatus = rr.status;
      const wasAccepted = rr.status === "accepted";
      const cancelled = await env.DB.prepare("UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?").bind(rr.id, previousStatus).run();
      if (!cancelled.meta.changes) return fail("This booking changed. Refresh before trying again.", 409);
      if (wasAccepted && !journeyHasDeparted(rr.journey_date, rr.journey_time, 15)) {
        const booked = await env.DB.prepare("SELECT COALESCE(SUM(seats_requested),0) booked FROM ride_requests WHERE ride_offer_post_id=? AND status IN ('accepted','completed')").bind(rr.ride_offer_post_id).first();
        const remaining = Math.max(0, Number(rr.offer_seats || 0) - Number(booked?.booked || 0));
        await env.DB.batch([
          env.DB.prepare("UPDATE posts SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='closed'").bind(rr.ride_wanted_post_id),
          env.DB.prepare("UPDATE posts SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='closed' AND journey_date>=? AND ? > 0").bind(rr.ride_offer_post_id, ukNowParts().date, remaining)
        ]);
        if (asRider) {
          await createNotification(env, rr.driver_id, "ride_cancelled", "Confirmed rider cancelled", `${rr.origin} \u2192 ${rr.destination}: ${rr.seats_requested} seat${rr.seats_requested === 1 ? "" : "s"} are available again. The offer was reopened automatically if seats remain.`, rr.ride_offer_post_id);
        } else {
          await createNotification(env, rr.rider_id, "ride_cancelled", "Driver cancelled your booking", `${rr.origin} \u2192 ${rr.destination}: your ride request is active again so you can choose another matching driver.`, rr.ride_wanted_post_id);
        }
      } else if (previousStatus === "pending" && asRider) {
        await createNotification(env, rr.driver_id, "request_closed", "Seat request withdrawn", `${auth.user.name} withdrew their pending seat request.`, rr.ride_offer_post_id);
      }
      await bookingEvent(env, rr.id, auth.user.id, asRider ? "cancelled_by_rider" : "cancelled_by_driver", previousStatus, "cancelled", { seats: rr.seats_requested });
      return json({ ok: true, status: "cancelled" });
    }
    return fail("Invalid ride request action.");
  }
  const rateMatch = path.match(/^\/api\/ride-requests\/([^/]+)\/rating$/);
  if (rateMatch && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const rr = await env.DB.prepare(`SELECT rr.*,p.journey_date,p.origin,p.destination FROM ride_requests rr JOIN posts p ON p.id=rr.ride_offer_post_id WHERE rr.id=?`).bind(rateMatch[1]).first();
    if (!rr || rr.rider_id !== auth.user.id && rr.driver_id !== auth.user.id) return fail("Ride not found.", 404);
    if (!["accepted", "completed"].includes(rr.status)) return fail("Only confirmed journeys can be rated.", 409);
    if (rr.journey_date >= ukNowParts().date) return fail("Ratings open after the journey day has finished.", 409);
    const data = await request.json().catch(() => ({}));
    const score = Number(data.score), comment = cleanBody(data.comment, 500);
    if (!Number.isInteger(score) || score < 1 || score > 5) return fail("Choose a rating from 1 to 5 stars.");
    const ratee = rr.rider_id === auth.user.id ? rr.driver_id : rr.rider_id;
    try {
      const seal = await createSealedRating(env, rr, auth.user.id, ratee, score, comment);
      await createNotification(env, ratee, "rating", `You received a ${score}\u2605 sealed rating`, `A confirmed Carpool Network journey was rated${comment ? `: ${comment.slice(0, 120)}` : "."} The review is cryptographically sealed and cannot be edited after submission.`, rr.ride_offer_post_id);
      return json({ ok: true, integrity: { sealed: true, sequence: seal.seq, chainHash: seal.chainHash } });
    } catch (err) {
      if (String(err?.message || err).includes("RATING_ALREADY_SUBMITTED")) return fail("Your rating for this journey is already sealed and cannot be edited.", 409);
      throw err;
    }
  }
  const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && request.method === "GET") {
    const user = await env.DB.prepare(`SELECT u.id,u.name,u.area,u.bio,u.created_at,
      COALESCE(d.avatar_emoji,'') avatar_emoji,COALESCE(d.gender,'') gender,COALESCE(d.travel_role,'both') travel_role,COALESCE(d.community,'') community,
      ROUND(AVG(r.score),1) rating,COUNT(r.id) rating_count,
      (SELECT COUNT(*) FROM ride_requests rr WHERE (rr.rider_id=u.id OR rr.driver_id=u.id) AND rr.status='completed') completed_rides
      FROM users u LEFT JOIN user_profile_details d ON d.user_id=u.id LEFT JOIN ratings r ON r.ratee_id=u.id WHERE u.id=? GROUP BY u.id`).bind(userMatch[1]).first();
    if (!user) return fail("Member not found.", 404);
    const reviews = await env.DB.prepare(`SELECT r.id,r.score,r.comment,r.created_at,ru.name rater_name,CASE WHEN rs.rating_id IS NOT NULL THEN 1 ELSE 0 END sealed,rs.chain_hash FROM ratings r JOIN users ru ON ru.id=r.rater_id LEFT JOIN rating_seals rs ON rs.rating_id=r.id WHERE r.ratee_id=? AND r.comment<>'' ORDER BY r.created_at DESC LIMIT 20`).bind(user.id).all();
    if (!user.avatar_emoji) user.avatar_emoji = avatarForId(user.id);
    return json({ ok: true, user: { ...user, rating: user.rating == null ? null : Number(user.rating), rating_count: Number(user.rating_count || 0), completed_rides: Number(user.completed_rides || 0) }, reviews: reviews.results || [] });
  }
  const commentsMatch = path.match(/^\/api\/posts\/([^/]+)\/comments$/);
  if (commentsMatch && request.method === "GET") {
    const post = await env.DB.prepare("SELECT id FROM posts WHERE id=? AND status<>'deleted'").bind(commentsMatch[1]).first();
    if (!post) return fail("Post not found.", 404);
    const rows = await env.DB.prepare(`SELECT c.id,c.body,c.created_at,u.id author_id,u.name author_name,u.area author_area,(SELECT avatar_emoji FROM user_profile_details d WHERE d.user_id=u.id) author_avatar_emoji FROM comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=? ORDER BY c.created_at ASC LIMIT 100`).bind(commentsMatch[1]).all();
    return json({ ok: true, comments: rows.results || [] });
  }
  if (commentsMatch && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const data = await request.json().catch(() => ({}));
    const body = cleanBody(data.body, 600);
    if (body.length < 1) return fail("Write a comment first.");
    const post = await env.DB.prepare("SELECT id,author_id,title,status FROM posts WHERE id=? AND status<>'deleted'").bind(commentsMatch[1]).first();
    if (!post) return fail("Post not found.", 404);
    if (post.status !== "active") return fail("This post is closed to new comments.", 409);
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO comments(id,post_id,author_id,body) VALUES(?,?,?,?)").bind(id, post.id, auth.user.id, body).run();
    if (post.author_id !== auth.user.id) await createNotification(env, post.author_id, "comment", `${auth.user.name} commented on your post`, body.slice(0, 140), post.id);
    return json({ ok: true, id }, 201);
  }
  const reactionMatch = path.match(/^\/api\/posts\/([^/]+)\/reaction$/);
  if (reactionMatch && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const reactionPost = await env.DB.prepare("SELECT id FROM posts WHERE id=? AND status='active'").bind(reactionMatch[1]).first();
    if (!reactionPost) return fail("Post is not available.", 404);
    const exists = await env.DB.prepare("SELECT 1 x FROM reactions WHERE post_id=? AND user_id=?").bind(reactionMatch[1], auth.user.id).first();
    if (exists) await env.DB.prepare("DELETE FROM reactions WHERE post_id=? AND user_id=?").bind(reactionMatch[1], auth.user.id).run();
    else await env.DB.prepare("INSERT OR IGNORE INTO reactions(post_id,user_id) VALUES(?,?)").bind(reactionMatch[1], auth.user.id).run();
    const count = await env.DB.prepare("SELECT COUNT(*) count FROM reactions WHERE post_id=?").bind(reactionMatch[1]).first();
    return json({ ok: true, reacted: !exists, count: Number(count.count || 0) });
  }
  if (path === "/api/support/tickets" && request.method === "GET") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const rows = await env.DB.prepare(`SELECT t.*, (SELECT body FROM support_messages sm WHERE sm.ticket_id=t.id ORDER BY sm.created_at DESC LIMIT 1) last_message FROM support_tickets t WHERE t.user_id=? ORDER BY t.updated_at DESC LIMIT 30`).bind(auth.user.id).all();
    return json({ ok: true, tickets: rows.results || [] });
  }
  if (path === "/api/support/tickets" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const data = await request.json().catch(() => ({}));
    const category = clean(data.category, 30), subject = clean(data.subject, 120), message = cleanBody(data.message, 1800);
    if (!["safety", "booking", "account", "community", "technical", "other"].includes(category)) return fail("Choose a support category.");
    if (subject.length < 3 || message.length < 5) return fail("Please describe what you need help with.");
    const open = await env.DB.prepare("SELECT COUNT(*) count FROM support_tickets WHERE user_id=? AND status IN ('open','waiting')").bind(auth.user.id).first();
    if (Number(open?.count || 0) >= 3) return fail("You already have 3 open support requests. Please reply to one of them instead.", 429);
    const id = crypto.randomUUID();
    const priority = category === "safety" ? "urgent" : "normal";
    await env.DB.batch([
      env.DB.prepare("INSERT INTO support_tickets(id,user_id,category,subject,priority) VALUES(?,?,?,?,?)").bind(id, auth.user.id, category, subject, priority),
      env.DB.prepare("INSERT INTO support_messages(id,ticket_id,sender_user_id,sender_role,body) VALUES(?,?,?,'member',?)").bind(crypto.randomUUID(), id, auth.user.id, message)
    ]);
    return json({ ok: true, id }, 201);
  }
  const supportMatch = path.match(/^\/api\/support\/tickets\/([^/]+)\/messages$/);
  if (supportMatch && request.method === "GET") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const ticket = await env.DB.prepare("SELECT id,status,subject,category,created_at,updated_at FROM support_tickets WHERE id=? AND user_id=?").bind(supportMatch[1], auth.user.id).first();
    if (!ticket) return fail("Support request not found.", 404);
    const msgs = await env.DB.prepare("SELECT id,sender_role,body,created_at FROM support_messages WHERE ticket_id=? ORDER BY created_at ASC").bind(ticket.id).all();
    return json({ ok: true, ticket, messages: msgs.results || [] });
  }
  if (supportMatch && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const ticket = await env.DB.prepare("SELECT id,status FROM support_tickets WHERE id=? AND user_id=? AND status<>'closed'").bind(supportMatch[1], auth.user.id).first();
    if (!ticket) return fail("Support request not found.", 404);
    const data = await request.json().catch(() => ({}));
    const body = cleanBody(data.message, 1800);
    if (body.length < 2) return fail("Write a message first.");
    await env.DB.batch([
      env.DB.prepare("INSERT INTO support_messages(id,ticket_id,sender_user_id,sender_role,body) VALUES(?,?,?,'member',?)").bind(crypto.randomUUID(), ticket.id, auth.user.id, body),
      env.DB.prepare("UPDATE support_tickets SET status='open',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(ticket.id)
    ]);
    return json({ ok: true }, 201);
  }
  const memberReport = path.match(/^\/api\/users\/([^/]+)\/report$/);
  if (memberReport && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    if (memberReport[1] === auth.user.id) return fail("You cannot report your own profile.");
    const target = await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(memberReport[1]).first();
    if (!target) return fail("Member not found.", 404);
    const data = await request.json().catch(() => ({}));
    const reason = cleanBody(data.reason, 600);
    if (reason.length < 5) return fail("Tell Support what happened.");
    await env.DB.prepare(`INSERT INTO member_reports(id,reporter_id,reported_user_id,reason) VALUES(?,?,?,?) ON CONFLICT(reporter_id,reported_user_id) DO UPDATE SET reason=excluded.reason,status='open',updated_at=CURRENT_TIMESTAMP`).bind(crypto.randomUUID(), auth.user.id, target.id, reason).run();
    return json({ ok: true });
  }
  if (path === "/api/integrity/public-key" && request.method === "GET") {
    const head = await env.DB.prepare("SELECT seq,head_hash,updated_at FROM integrity_head WHERE singleton=1").first();
    return json({ ok: true, algorithm: "Ed25519 + SHA-256 hash chain", publicKey: env.INTEGRITY_PUBLIC_KEY || "", head: head || { seq: 0, head_hash: "GENESIS" } });
  }
  const integrityRating = path.match(/^\/api\/integrity\/ratings\/([^/]+)$/);
  if (integrityRating && request.method === "GET") {
    const row = await env.DB.prepare(`SELECT r.id,r.ride_request_id,r.rater_id,r.ratee_id,r.score,r.comment,r.created_at,s.ledger_seq,s.payload_hash,s.chain_hash,s.signature,s.key_id,l.prev_hash FROM ratings r LEFT JOIN rating_seals s ON s.rating_id=r.id LEFT JOIN integrity_ledger l ON l.seq=s.ledger_seq WHERE r.id=?`).bind(integrityRating[1]).first();
    if (!row) return fail("Rating not found.", 404);
    const valid = Boolean(row.signature && env.INTEGRITY_PUBLIC_KEY && await integrityVerify(env.INTEGRITY_PUBLIC_KEY, row.chain_hash, row.signature));
    return json({ ok: true, rating: { id: row.id, score: row.score, comment: row.comment, created_at: row.created_at }, integrity: { sealed: Boolean(row.signature), signatureValid: valid, sequence: row.ledger_seq || null, chainHash: row.chain_hash || "", previousHash: row.prev_hash || "", algorithm: "Ed25519 + SHA-256" } });
  }
  if (path === "/api/admin/status" && request.method === "GET") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const role = await env.DB.prepare("SELECT role FROM user_roles WHERE user_id=?").bind(auth.user.id).first();
    return json({ ok: true, isAdmin: Boolean(role), role: role?.role || "" });
  }
  if (path === "/api/admin/unlock" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const role = await env.DB.prepare("SELECT role FROM user_roles WHERE user_id=?").bind(auth.user.id).first();
    if (!role) return fail("This account is not an administrator.", 403);
    const cred = await env.DB.prepare("SELECT code_hash FROM admin_credentials WHERE user_id=?").bind(auth.user.id).first();
    if (!cred?.code_hash) return fail("Admin security code has not been configured yet.", 503);
    const guard = await env.DB.prepare("SELECT failures,locked_until FROM admin_auth_guard WHERE user_id=?").bind(auth.user.id).first();
    if (guard?.locked_until && guard.locked_until > sqlNow()) return fail("Admin unlock is temporarily locked after repeated failed attempts. Try again later.", 429);
    const data = await request.json().catch(() => ({}));
    const code = clean(data.code, 100).toUpperCase();
    const hash = await sha256(code);
    if (!await secureEqualHex(hash, cred.code_hash)) {
      const failures = Number(guard?.failures || 0) + 1;
      const locked = failures >= 5 ? new Date(Date.now() + 15 * 6e4).toISOString().slice(0, 19).replace("T", " ") : "";
      await env.DB.prepare(`INSERT INTO admin_auth_guard(user_id,failures,locked_until,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until,updated_at=CURRENT_TIMESTAMP`).bind(auth.user.id, failures, locked).run();
      await adminAudit(env, auth.user.id, "admin_unlock_failed", "admin", auth.user.id, "Incorrect admin code", { failures });
      return fail(locked ? "Admin unlock locked for 15 minutes after repeated failures." : "Admin security code did not match.", locked ? 429 : 403);
    }
    await env.DB.prepare("DELETE FROM admin_auth_guard WHERE user_id=?").bind(auth.user.id).run();
    const token = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256(token);
    await env.DB.prepare("INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+30 minutes'))").bind(tokenHash, auth.user.id).run();
    await adminAudit(env, auth.user.id, "admin_unlock", "admin", auth.user.id, "");
    return json({ ok: true, adminToken: token, role: role.role, expiresMinutes: 30 });
  }
  if (path === "/api/admin/lock" && request.method === "POST") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await sha256(auth.adminToken)).run();
    return json({ ok: true });
  }
  if (path === "/api/admin/dashboard" && request.method === "GET") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const stats = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM users) members,(SELECT COUNT(*) FROM user_moderation WHERE status='banned') banned,(SELECT COUNT(*) FROM user_moderation WHERE status='suspended') suspended,(SELECT COUNT(*) FROM posts WHERE status='active') active_posts,(SELECT COUNT(*) FROM reports) post_reports,(SELECT COUNT(*) FROM member_reports WHERE status='open') member_reports,(SELECT COUNT(*) FROM support_tickets WHERE status IN ('open','waiting')) support_open,(SELECT COUNT(*) FROM ratings) ratings,(SELECT COUNT(*) FROM rating_seals) sealed_ratings`).first();
    const members = await env.DB.prepare(`SELECT u.id,u.name,u.phone,u.area,u.created_at,COALESCE(m.status,'active') moderation_status,COALESCE(m.reason,'') moderation_reason,COALESCE(m.until_at,'') moderation_until,COALESCE(r.role,'') role,(SELECT COUNT(*) FROM posts p WHERE p.author_id=u.id AND p.status<>'deleted') posts,(SELECT ROUND(AVG(rt.score),1) FROM ratings rt WHERE rt.ratee_id=u.id) rating FROM users u LEFT JOIN user_moderation m ON m.user_id=u.id LEFT JOIN user_roles r ON r.user_id=u.id ORDER BY u.created_at DESC LIMIT 100`).all();
    const tickets = await env.DB.prepare(`SELECT t.id,t.category,t.subject,t.status,t.priority,t.updated_at,u.id user_id,u.name,u.phone FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE t.status IN ('open','waiting') ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,t.updated_at ASC LIMIT 60`).all();
    const postReports = await env.DB.prepare(`SELECT r.id,r.reason,r.created_at,p.id post_id,p.title,p.category,p.author_id,u.name reporter_name,a.name author_name FROM reports r JOIN posts p ON p.id=r.post_id JOIN users u ON u.id=r.reporter_id JOIN users a ON a.id=p.author_id WHERE p.status='active' ORDER BY r.created_at DESC LIMIT 60`).all();
    const memberReports = await env.DB.prepare(`SELECT mr.id,mr.reason,mr.status,mr.updated_at,ru.name reporter_name,tu.id target_id,tu.name target_name,tu.phone target_phone FROM member_reports mr JOIN users ru ON ru.id=mr.reporter_id JOIN users tu ON tu.id=mr.reported_user_id WHERE mr.status='open' ORDER BY mr.updated_at DESC LIMIT 60`).all();
    const recentPosts = await env.DB.prepare(`SELECT p.id,p.category,p.title,p.status,p.created_at,u.name author_name,u.phone author_phone FROM posts p JOIN users u ON u.id=p.author_id WHERE p.status<>'deleted' ORDER BY p.created_at DESC LIMIT 80`).all();
    const recentBookings = await env.DB.prepare(`SELECT rr.id,rr.status,rr.seats_requested,rr.created_at,p.origin,p.destination,p.journey_date,p.journey_time,du.name driver_name,ru.name rider_name FROM ride_requests rr JOIN posts p ON p.id=rr.ride_offer_post_id JOIN users du ON du.id=rr.driver_id JOIN users ru ON ru.id=rr.rider_id ORDER BY rr.created_at DESC LIMIT 80`).all();
    const audit = await env.DB.prepare(`SELECT a.*,u.name admin_name FROM admin_audit_log a LEFT JOIN users u ON u.id=a.admin_user_id ORDER BY a.created_at DESC LIMIT 60`).all();
    const head = await env.DB.prepare("SELECT seq,head_hash,updated_at FROM integrity_head WHERE singleton=1").first();
    return json({ ok: true, role: auth.role, stats, members: members.results || [], tickets: tickets.results || [], postReports: postReports.results || [], memberReports: memberReports.results || [], recentPosts: recentPosts.results || [], recentBookings: recentBookings.results || [], audit: audit.results || [], integrityHead: head });
  }
  const adminUserAction = path.match(/^\/api\/admin\/users\/([^/]+)\/moderate$/);
  if (adminUserAction && request.method === "POST") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const targetId = adminUserAction[1];
    if (targetId === auth.user.id) return fail("For safety, you cannot moderate your own admin account.", 409);
    const target = await env.DB.prepare("SELECT id,name FROM users WHERE id=?").bind(targetId).first();
    if (!target) return fail("Member not found.", 404);
    const targetRole = await env.DB.prepare("SELECT role FROM user_roles WHERE user_id=?").bind(targetId).first();
    if (targetRole?.role === "superadmin") return fail("A superadmin cannot be suspended or banned from this screen.", 403);
    const data = await request.json().catch(() => ({}));
    const action = clean(data.action, 20), reason = cleanBody(data.reason, 500);
    if (!["suspend", "ban", "unban"].includes(action)) return fail("Invalid moderation action.");
    if (action !== "unban" && reason.length < 3) return fail("Add a reason for this action.");
    let status = "active", until = "";
    if (action === "ban") status = "banned";
    if (action === "suspend") {
      status = "suspended";
      const days = clampInt(data.days, 1, 90, 7);
      until = new Date(Date.now() + days * 864e5).toISOString().slice(0, 19).replace("T", " ");
    }
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO user_moderation(user_id,status,reason,until_at,updated_by,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,reason=excluded.reason,until_at=excluded.until_at,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).bind(targetId, status, action === "unban" ? "" : reason, until, auth.user.id),
      ...action === "unban" ? [] : [env.DB.prepare("DELETE FROM user_sessions WHERE user_id=?").bind(targetId)]
    ]);
    const cancelledBookings = action === "unban" ? 0 : await deactivateMemberSafety(env, targetId, auth.user.id, reason);
    await env.DB.prepare("UPDATE member_reports SET status='resolved',updated_at=CURRENT_TIMESTAMP WHERE reported_user_id=? AND status='open'").bind(targetId).run();
    await adminAudit(env, auth.user.id, action, "user", targetId, reason, { until, cancelledBookings });
    return json({ ok: true, status, until, cancelledBookings });
  }
  const adminPostAction = path.match(/^\/api\/admin\/posts\/([^/]+)\/remove$/);
  if (adminPostAction && request.method === "POST") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const data = await request.json().catch(() => ({}));
    const reason = cleanBody(data.reason, 500);
    if (reason.length < 3) return fail("Add a reason for removing the post.");
    const post = await env.DB.prepare("SELECT id,author_id,title,category FROM posts WHERE id=? AND status<>'deleted'").bind(adminPostAction[1]).first();
    if (!post) return fail("Post not found.", 404);
    const cancelledBookings = await removePostSafety(env, post, auth.user.id, reason);
    await adminAudit(env, auth.user.id, "remove_post", "post", post.id, reason, { title: post.title, cancelledBookings });
    await createNotification(env, post.author_id, "moderation", "Your post was removed by Carpool Network", reason, post.id);
    return json({ ok: true, cancelledBookings });
  }
  const adminTicket = path.match(/^\/api\/admin\/support\/([^/]+)$/);
  if (adminTicket && request.method === "GET") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const t = await env.DB.prepare(`SELECT t.*,u.name,u.phone,u.area FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE t.id=?`).bind(adminTicket[1]).first();
    if (!t) return fail("Ticket not found.", 404);
    const msgs = await env.DB.prepare("SELECT id,sender_role,body,created_at FROM support_messages WHERE ticket_id=? ORDER BY created_at ASC").bind(t.id).all();
    return json({ ok: true, ticket: t, messages: msgs.results || [] });
  }
  if (adminTicket && request.method === "POST") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const t = await env.DB.prepare("SELECT id,user_id,status FROM support_tickets WHERE id=?").bind(adminTicket[1]).first();
    if (!t) return fail("Ticket not found.", 404);
    const data = await request.json().catch(() => ({}));
    const message = cleanBody(data.message, 1800), status = clean(data.status, 20) || "waiting";
    if (message.length < 2) return fail("Write a reply first.");
    if (!["open", "waiting", "resolved", "closed"].includes(status)) return fail("Invalid ticket status.");
    await env.DB.batch([
      env.DB.prepare("INSERT INTO support_messages(id,ticket_id,sender_user_id,sender_role,body) VALUES(?,?,?,'admin',?)").bind(crypto.randomUUID(), t.id, auth.user.id, message),
      env.DB.prepare("UPDATE support_tickets SET status=?,assigned_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, auth.user.id, t.id)
    ]);
    await adminAudit(env, auth.user.id, "support_reply", "ticket", t.id, "", { status });
    await createNotification(env, t.user_id, "support", "Support replied to your request", message.slice(0, 180), "");
    return json({ ok: true });
  }
  if (path === "/api/notifications" && request.method === "GET") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const rows = await env.DB.prepare("SELECT id,kind,title,body,post_id,is_read,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 80").bind(auth.user.id).all();
    const unread = (rows.results || []).filter((n) => !n.is_read).length;
    return json({ ok: true, notifications: rows.results || [], unread });
  }
  if (path === "/api/notifications/read" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    await env.DB.prepare("UPDATE notifications SET is_read=1 WHERE user_id=?").bind(auth.user.id).run();
    return json({ ok: true });
  }
  if (path === "/api/push/public-key" && request.method === "GET") {
    const keys = await getVapid(env);
    return json({ ok: true, publicKey: keys.vapid_public });
  }
  if (path === "/api/push/subscribe" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const data = await request.json().catch(() => ({}));
    const endpoint = clean(data.endpoint, 1800);
    if (!validPushEndpoint(endpoint)) return fail("Invalid push subscription.");
    await env.DB.prepare(`INSERT INTO push_subscriptions(id,user_id,endpoint,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,updated_at=CURRENT_TIMESTAMP`).bind(crypto.randomUUID(), auth.user.id, endpoint).run();
    return json({ ok: true });
  }
  if (path === "/api/push/unsubscribe" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const data = await request.json().catch(() => ({}));
    const endpoint = clean(data.endpoint, 1800);
    if (endpoint) await env.DB.prepare("DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?").bind(auth.user.id, endpoint).run();
    return json({ ok: true });
  }
  if (path === "/api/live" && request.method === "GET") {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return fail("WebSocket required.", 426);
    const requestedProtocol = (request.headers.get("Sec-WebSocket-Protocol") || "").split(",")[0].trim();
    const candidates = [];
    if (requestedProtocol) candidates.push({ token: requestedProtocol, source: "protocol" });
    const cookieToken = cookieValue(request, SESSION_COOKIE);
    if (cookieToken && cookieToken !== requestedProtocol) candidates.push({ token: cookieToken, source: "cookie" });
    let user = null, acceptedProtocol = "";
    for (const candidate of candidates) {
      const hash = await sha256(candidate.token);
      user = await env.DB.prepare(`SELECT u.id,COALESCE(m.status,'active') moderation_status,COALESCE(m.until_at,'') moderation_until FROM user_sessions s JOIN users u ON u.id=s.user_id LEFT JOIN user_moderation m ON m.user_id=u.id WHERE s.token_hash=?`).bind(hash).first();
      if (user) {
        acceptedProtocol = candidate.source === "protocol" ? requestedProtocol : "";
        break;
      }
    }
    if (!user) return fail("Session not connected.", 401);
    if (user.moderation_status === "banned" || user.moderation_status === "suspended" && (!user.moderation_until || user.moderation_until > sqlNow())) return fail("Account access is restricted.", 403);
    const hub = env.LIVE_HUB.get(env.LIVE_HUB.idFromName(user.id));
    const headers = new Headers(request.headers);
    headers.set("x-user-id", user.id);
    headers.set("x-ws-protocol", acceptedProtocol);
    return hub.fetch(new Request("https://live.internal/connect", { method: "GET", headers }));
  }
  if (path === "/api/report" && request.method === "POST") {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;
    const data = await request.json().catch(() => ({}));
    const postId = clean(data.postId, 80), reason = cleanBody(data.reason, 400);
    if (!postId || reason.length < 3) return fail("Tell us why you are reporting this post.");
    const reportPost = await env.DB.prepare("SELECT id FROM posts WHERE id=? AND status='active'").bind(postId).first();
    if (!reportPost) return fail("Post is not available.", 404);
    await env.DB.prepare(`INSERT INTO reports(id,reporter_id,post_id,reason) VALUES(?,?,?,?) ON CONFLICT(reporter_id,post_id) DO UPDATE SET reason=excluded.reason,created_at=CURRENT_TIMESTAMP`).bind(crypto.randomUUID(), auth.user.id, postId, reason).run();
    return json({ ok: true });
  }
  return fail("Not found.", 404);
}
__name(handleApi, "handleApi");
async function cleanupOldContent(env) {
  await env.DB.prepare(`UPDATE ride_requests SET status='completed',updated_at=CURRENT_TIMESTAMP WHERE status='accepted' AND ride_offer_post_id IN (SELECT id FROM posts WHERE journey_date<>'' AND journey_date < date('now'))`).run();
  await env.DB.prepare(`UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE status='pending' AND ride_offer_post_id IN (SELECT id FROM posts WHERE journey_date<>'' AND journey_date < date('now'))`).run();
  await env.DB.prepare(`
    UPDATE posts SET status='closed', updated_at=CURRENT_TIMESTAMP
    WHERE status='active'
      AND category IN ('ride_offer','ride_wanted')
      AND journey_date <> ''
      AND journey_date < date('now')
  `).run();
  await env.DB.prepare(`
    UPDATE posts SET status='closed', updated_at=CURRENT_TIMESTAMP
    WHERE status='active'
      AND category IN ('marketplace','job','accommodation')
      AND created_at < datetime('now','-45 days')
  `).run();
  await env.DB.prepare(`
    UPDATE posts SET status='closed', updated_at=CURRENT_TIMESTAMP
    WHERE status='active'
      AND category IN ('service','community')
      AND created_at < datetime('now','-90 days')
  `).run();
  await env.DB.prepare(`DELETE FROM posts WHERE status='deleted' AND updated_at < datetime('now','-30 days')`).run();
  await env.DB.prepare(`DELETE FROM posts WHERE status='closed' AND updated_at < datetime('now','-180 days')`).run();
  await env.DB.prepare(`DELETE FROM notifications WHERE is_read=1 AND created_at < datetime('now','-90 days')`).run();
  await env.DB.prepare(`DELETE FROM security_rate_limits WHERE reset_at < datetime('now','-1 day')`).run();
}
__name(cleanupOldContent, "cleanupOldContent");
var index_default = {
  async fetch(request, env, ctx) {
    const requestId = crypto.randomUUID();
    const path = new URL(request.url).pathname;
    let response;
    try {
      if (path.startsWith("/api/")) {
        const guarded = await guardRequest(request, fail);
        response = guarded instanceof Response ? guarded : await handleApi(guarded, env);
      } else response = await env.ASSETS.fetch(request);
    } catch (err) {
      if (String(err).includes("REQUEST_ALREADY_PENDING")) response = fail("A request for this driver is already pending. Check My rides.",409);
      else if (String(err).includes("PENDING_LIMIT")) response = fail("You already have 3 pending requests for this journey. Withdraw one before requesting another.", 409);
      else {
        ctx.waitUntil(captureFailure(env, err, path, requestId));
        response = json({ok:false, error:"Something went wrong. Please try again or report the problem.", reference:requestId},500);
      }
    }
    if (response.status === 101) return response;
    response = withSecurityHeaders(response);
    response.headers.set("x-request-id", requestId);
    return response;
  },
  async scheduled(controller, env, ctx) {
    try {
      await cleanupOldContent(env);
      await env.DB.prepare("DELETE FROM diagnostic_issues WHERE status IN ('resolved','ignored') AND last_seen < datetime('now','-90 days')").run();
      console.log(JSON.stringify({ event: "content_cleanup", scheduledTime: controller.scheduledTime, status: "ok" }));
    } catch (err) {
      await captureFailure(env, err, '/scheduled', crypto.randomUUID(), 'scheduled');
      throw err;
    }
  }
};
export {
  LiveHub,
  index_default as default
};
