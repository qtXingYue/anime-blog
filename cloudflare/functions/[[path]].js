// Sakura Backend 的 Cloudflare 版：Pages Functions + D1 + R2 + DeepSeek 直连。
// 接口与原 FastAPI 版保持一致（路径、字段、错误形状 {"detail":...}），前端与后台页无需改动。
// 原 Hermes 的两个后台功能（助手、代写留言回复）改为同步调用 DeepSeek，回复仍存 hermes_replies 表。
import { KB_DATA} from "./_lib/kb-data.js";

const COOKIE_MAX_AGE = 86400;

// ---------- 基础工具 ----------
function json(data, status = 200, headers = {}) {
return new Response(JSON.stringify(data), {
status,
headers: { "Content-Type": "application/json; charset=utf-8",...headers},
});
}
function err(status, detail) {
return json({ detail}, status);
}
function clientIP(request) {
return (
request.headers.get("cf-connecting-ip") ||
(request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
"unknown"
);
}
async function sha256hex(text) {
const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function parseCookies(request) {
const out = {};
for (const part of (request.headers.get("cookie") || "").split(";")) {
const i = part.indexOf("=");
if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
}
return out;
}
async function checkAuth(request, env) {
if (!env.ADMIN_PASS) return false;
const token = parseCookies(request)["admin_token"] || "";
const expected = await sha256hex(env.ADMIN_PASS);
if (token.length!== expected.length) return false;
let diff = 0;
for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
return diff === 0;
}

// ---------- 限流（内存版，与原版语义一致：窗口内计数） ----------
const _buckets = new Map();
function rateLimited(key, limit, windowSec = 60) {
const now = Date.now() / 1000;
const hits = (_buckets.get(key) || []).filter((t) => t > now - windowSec);
if (hits.length >= limit) return true;
hits.push(now);
_buckets.set(key, hits);
if (_buckets.size > 10000) {
for (const [k, v] of _buckets) if (!v.some((t) => t > now - windowSec)) _buckets.delete(k);
}
return false;
}
const RATE_MSG = "请求过于频繁，请稍后再试";

// ---------- AI（DeepSeek 直连，OpenAI 兼容） ----------
function aiConfig(env) {
let extra = {};
try {
extra = JSON.parse(env.AI_EXTRA_PARAMS || "{}") || {};
} catch {}
return {
base: (env.AI_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, ""),
model: env.AI_MODEL || "deepseek-flash",
key: env.AI_API_KEY || "",
extra,
};
}
async function callAI(env, { system, user, maxTokens = 2000, timeoutMs = 55000}) {
const cfg = aiConfig(env);
const resp = await fetch(`${cfg.base}/chat/completions`, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${cfg.key}`,
"User-Agent": "curl/8.5.0",
"X-Client-Name": "Sakura-Admin",
},
body: JSON.stringify({
model: cfg.model,
messages: [
{ role: "system", content: system},
{ role: "user", content: user},
],
max_tokens: maxTokens,
...cfg.extra,
}),
signal: AbortSignal.timeout(timeoutMs),
});
if (!resp.ok) throw new Error(`AI HTTP ${resp.status}`);
const data = await resp.json();
return data?.choices?.[0]?.message?.content || "";
}

// ---------- RAG 检索（与原版 BM25 + 同义词扩展等价移植） ----------
function tokenize(text) {
text = (text || "").toLowerCase();
const tokens = text.match(/[a-z0-9_+#.]{2,}/g) || [];
for (const seg of text.match(/[\u4e00-\u9fff]+/g) || []) {
if (seg.length === 1) tokens.push(seg);
else for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i + 2));
}
return tokens;
}
function expandQuery(query) {
const out = [...tokenize(query)];
const q = (query || "").toLowerCase();
for (const [key, syns] of Object.entries(KB_DATA.SYNONYMS)) {
if (q.includes(key)) for (const s of syns) out.push(...tokenize(s));
}
return out;
}
let _kb = null;
let _kbBuiltAt = 0;
async function buildKB(env) {
if (_kb && Date.now() - _kbBuiltAt < 5 * 60 * 1000) return _kb;
const docs = [...KB_DATA.KB_DOCS];
docs.push({
id: "profile-skills",
kind: "profile",
title: "技能与能力概览",
url: "/#skills",
text: KB_DATA.PROFILE_SKILLS_TEXT,
});
try {
const { results} = await env.DB.prepare(
"SELECT slug, title, COALESCE(excerpt,'') AS ex, COALESCE(content,'') AS ct FROM articles WHERE COALESCE(published,1)=1 ORDER BY id DESC LIMIT 60"
).all();
for (const row of results || []) {
const body = `${row.ex} ${row.ct.slice(0, 1500)}`.trim();
if (body.length < 40) continue;
docs.push({ id: `article-${row.slug}`, kind: "article", title: `文章：${row.title}`, url: `/blog/${row.slug}`, text: body});
}
} catch {}
const TF = [], titleTF = [], LEN = [], DF = {};
for (const d of docs) {
const tf = {};
for (const t of tokenize(`${d.title || ""} ${d.text || ""}`)) tf[t] = (tf[t] || 0) + 1;
TF.push(tf);
titleTF.push(new Set(tokenize(d.title || "")));
LEN.push(Object.values(tf).reduce((a, b) => a + b, 0));
for (const t of Object.keys(tf)) DF[t] = (DF[t] || 0) + 1;
}
const avgdl = LEN.length? LEN.reduce((a, b) => a + b, 0) / LEN.length: 1;
_kb = { docs, TF, titleTF, LEN, DF, avgdl};
_kbBuiltAt = Date.now();
return _kb;
}
async function retrieve(env, query, k = 4) {
const kb = await buildKB(env);
if (!kb.docs.length) return [];
const q = expandQuery(query);
if (!q.length) return [];
const n = kb.docs.length;
const scored = [];
for (let i = 0; i < n; i++) {
const tf = kb.TF[i];
const dl = kb.LEN[i] || 1;
let score = 0;
for (const t of q) {
const f = tf[t];
if (!f) continue;
const df = kb.DF[t] || 0;
const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
let part = (idf * (f * 2.2)) / (f + 1.2 * (0.25 + (0.75 * dl) / kb.avgdl));
if (kb.titleTF[i].has(t)) part *= 1.8;
score += part;
}
if (score > 0) scored.push([score, i]);
}
scored.sort((a, b) => b[0] - a[0]);
if (!scored.length) return [];
const floor = Math.max(1.5, scored[0][0] * 0.3);
return scored
.slice(0, k)
.filter(([s]) => s >= floor)
.map(([s, i]) => ({
title: kb.docs[i].title || "",
url: kb.docs[i].url || "",
text: (kb.docs[i].text || "").slice(0, 600),
score: Math.round(s * 100) / 100,
}));
}
async function buildSystemPrompt(env, question) {
const hits = await retrieve(env, question, 4);
if (!hits.length) return { prompt: KB_DATA.RESUME_ASSISTANT_PROMPT, sources: []};
const ctx = hits.map((h) => `- [${h.title}](${h.url})：${h.text}`).join("\n");
const prompt =
KB_DATA.RESUME_ASSISTANT_PROMPT +
"\n\n\n" +
ctx +
"\n\n用到某条资料时在句末附上 markdown 链接，例如（[项目 01](/projects/data-crawler-report)）。";
return { prompt, sources: hits};
}

// ---------- Analytics ----------
async function analyticsHit(request, env) {
  if (rateLimited(`hit:${clientIP(request)}`, 120)) return json({ ok: true });
  try {
    const data = await request.json().catch(() => ({}));
    await env.DB.prepare("INSERT INTO visits (path, ip, ua, referer, country) VALUES (?,?,?,?,?)")
      .bind(
        String(data.path || "/").slice(0, 500),
        clientIP(request),
        (request.headers.get("user-agent") || "").slice(0, 500),
        String(data.ref || "").slice(0, 500),
        request.cf?.country || null
      )
      .run();
  } catch {}
  return json({ ok: true });
}
async function analyticsSummary(env) {
  const db = env.DB;
  const one = async (sql, ...args) => (await db.prepare(sql).bind(...args).first()) || {};
  const total = await one("SELECT COUNT(*) AS c FROM visits");
  const today = await one("SELECT COUNT(*) AS c FROM visits WHERE date(created_at)=date('now')");
  const totalUv = await one("SELECT COUNT(DISTINCT ip) AS c FROM visits");
  const todayUv = await one("SELECT COUNT(DISTINCT ip) AS c FROM visits WHERE date(created_at)=date('now')");
  const top = await db
    .prepare("SELECT path, COUNT(*) AS views FROM visits GROUP BY path ORDER BY views DESC LIMIT 10")
    .all();
  const hourly = await db
    .prepare(
      "SELECT strftime('%H', created_at) AS hour, COUNT(*) AS views FROM visits WHERE date(created_at)=date('now') GROUP BY hour ORDER BY hour"
    )
    .all();
  return json({
    total_pv: total.c || 0,
    today_pv: today.c || 0,
    total_uv: totalUv.c || 0,
    today_uv: todayUv.c || 0,
    top_pages: top.results || [],
    hourly: hourly.results || [],
  });
}
async function recentAnalyticsContext(env) {
  try {
    const db = env.DB;
    const tp = await db.prepare("SELECT COUNT(*) AS c FROM visits").first();
    const tu = await db.prepare("SELECT COUNT(DISTINCT ip) AS c FROM visits").first();
    const top = await db
      .prepare("SELECT path, COUNT(*) AS views FROM visits GROUP BY path ORDER BY views DESC LIMIT 10")
      .all();
    const contacts = await db
      .prepare("SELECT name, email, message, created_at FROM contacts ORDER BY id DESC LIMIT 5")
      .all();
    return {
      total_pv: tp?.c || 0,
      total_uv: tu?.c || 0,
      top_pages: top.results || [],
      recent_contacts: contacts.results || [],
    };
  } catch {
    return {};
  }
}

// ---------- Articles ----------
async function listArticles(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, slug, excerpt, created_at FROM articles WHERE published=1 ORDER BY created_at DESC"
  ).all();
  return json(results || []);
}
async function getArticle(env, slug) {
  const row = await env.DB.prepare("SELECT * FROM articles WHERE slug=? AND published=1").bind(slug).first();
  if (!row) return err(404, "Not found");
  return json(row);
}

// ---------- Admin ----------
async function adminLogin(request, env) {
  if (rateLimited(`login:${clientIP(request)}`, 5)) return err(429, RATE_MSG);
  const data = await request.json().catch(() => ({}));
  if (env.ADMIN_PASS && data.password === env.ADMIN_PASS) {
    const token = await sha256hex(env.ADMIN_PASS);
    return json(
      { ok: true },
      200,
      {
        "Set-Cookie": `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`,
      }
    );
  }
  return err(401, "Wrong password");
}
async function adminArticles(env) {
  const { results } = await env.DB.prepare("SELECT * FROM articles ORDER BY id DESC").all();
  return json(results || []);
}
async function createArticle(request, env) {
  const data = await request.json().catch(() => ({}));
  try {
    await env.DB.prepare("INSERT INTO articles (title, slug, excerpt, content) VALUES (?,?,?,?)")
      .bind(data.title, data.slug, data.excerpt || "", data.content)
      .run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return err(400, "Slug already exists");
    throw e;
  }
  _kb = null; // 文章变了，RAG 索引失效
  return json({ ok: true });
}
async function updateArticle(request, env, id) {
  const data = await request.json().catch(() => ({}));
  await env.DB.prepare(
    "UPDATE articles SET title=?, slug=?, excerpt=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  )
    .bind(data.title, data.slug, data.excerpt || "", data.content, id)
    .run();
  _kb = null;
  return json({ ok: true });
}
async function deleteArticle(env, id) {
  await env.DB.prepare("DELETE FROM articles WHERE id=?").bind(id).run();
  _kb = null;
  return json({ ok: true });
}

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "pdf", "mp4"]);
const EXT_MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", pdf: "application/pdf", mp4: "video/mp4",
};
async function adminUpload(request, env) {
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return err(400, "没有收到文件");
  const origName = file.name || "";
  const extension = origName.includes(".") ? origName.slice(origName.lastIndexOf(".") + 1).toLowerCase() : "";
  if (!ALLOWED_EXT.has(extension)) {
    return err(400, `不支持的文件类型: .${extension}，仅允许: ${[...ALLOWED_EXT].sort().join(", ")}`);
  }
  if (file.size > 200 * 1024 * 1024) return err(413, "文件超过 200MB 限制");
  const safeName = `${crypto.randomUUID().replace(/-/g, "")}.${extension}`;
  await env.UPLOADS.put(safeName, file.stream(), {
    httpMetadata: { contentType: file.type || EXT_MIME[extension] || "application/octet-stream" },
  });
  await env.DB.prepare("INSERT INTO files (filename, original_name, size) VALUES (?,?,?)")
    .bind(safeName, origName, file.size)
    .run();
  return json({ url: `/uploads/${safeName}` });
}
async function adminFiles(env) {
  const { results } = await env.DB.prepare("SELECT * FROM files ORDER BY id DESC").all();
  return json(results || []);
}
async function adminDeleteFile(env, fid) {
  const row = await env.DB.prepare("SELECT filename FROM files WHERE id=?").bind(fid).first();
  if (!row) return err(404, "文件不存在");
  await env.DB.prepare("DELETE FROM files WHERE id=?").bind(fid).run();
  await env.UPLOADS.delete(row.filename);
  return json({ ok: true });
}
async function serveUpload(request, env, name) {
  // 手动解析 Range 并以 {offset, length} 形式传给 R2（不依赖 Headers 形式的 range 参数）
  const rangeHeader = request.headers.get("range");
  let obj = null;
  if (rangeHeader) {
    const m = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
    if (m) {
      const head = await env.UPLOADS.head(name);
      if (!head) return new Response("Not Found", { status: 404 });
      const total = head.size;
      let offset, length;
      if (m[1] === "") {
        const suffix = parseInt(m[2], 10);
        offset = Math.max(0, total - suffix);
        length = total - offset;
      } else {
        offset = parseInt(m[1], 10);
        const end = m[2] === "" ? total - 1 : Math.min(parseInt(m[2], 10), total - 1);
        length = Math.max(0, end - offset + 1);
      }
      if (length > 0) obj = await env.UPLOADS.get(name, { range: { offset, length } });
    }
  }
  if (!obj) obj = await env.UPLOADS.get(name);
  if (!obj) return new Response("Not Found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("ETag", obj.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  if (!headers.get("Content-Type")) {
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
    headers.set("Content-Type", EXT_MIME[ext] || "application/octet-stream");
  }
  if (obj.range) {
    const total = obj.size;
    const offset = obj.range.offset || 0;
    const length = obj.range.length ?? total - offset;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${total}`);
    headers.set("Content-Length", String(length));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(obj.size));
  return new Response(obj.body, { headers });
}

// ---------- Contacts ----------
async function submitContact(request, env) {
  if (rateLimited(`contact:${clientIP(request)}`, 5)) return err(429, RATE_MSG);
  try {
    const data = await request.json();
    await env.DB.prepare("INSERT INTO contacts (name, email, message) VALUES (?,?,?)")
      .bind(
        String(data.name || "").slice(0, 100),
        String(data.email || "").slice(0, 200),
        String(data.message || "").slice(0, 2000)
      )
      .run();
    return json({ ok: true });
  } catch {
    return err(400, "提交失败，请稍后再试");
  }
}
async function adminContacts(env) {
  const { results } = await env.DB.prepare("SELECT * FROM contacts ORDER BY id DESC").all();
  return json(results || []);
}
async function adminDeleteContact(env, id) {
  await env.DB.prepare("DELETE FROM contacts WHERE id=?").bind(id).run();
  return json({ ok: true });
}

// ---------- 前台 AI 问答 ----------
let _chatInFlight = 0;
const CHAT_FALLBACK =
  "你好！我是钟文清的 AI 助手 Hermes。当前智能回复正在维护中，你可以直接浏览页面上的 15 个实战项目，或者在页面下方留言联系文清！";
const CHAT_GREETING =
  "你好！我是钟文清的 AI 助手 Hermes。关于文清的技术栈（Python/PyTorch/爬虫/全栈）、实战项目或获奖经历，欢迎随时向我提问！";
const CHAT_BUSY = "当前提问的小伙伴有点多，AI 正在努力回答，请稍等半分钟再试一次 🫖";

async function parsePrompt(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return { error: err(400, "Invalid JSON") };
  }
  const prompt = String(data.prompt || "").trim();
  if (!prompt) return { error: err(400, "提问内容不能为空") };
  return { prompt: prompt.slice(0, 150) };
}
async function chatAssistant(request, env) {
  if (rateLimited(`chat:${clientIP(request)}`, 5)) return err(429, RATE_MSG);
  const { prompt, error } = await parsePrompt(request);
  if (error) return error;
  if (_chatInFlight >= 5) return json({ ok: true, reply: CHAT_BUSY });
  _chatInFlight++;
  try {
    const { prompt: system } = await buildSystemPrompt(env, prompt);
    let reply = "";
    try {
      reply = await callAI(env, { system, user: prompt, maxTokens: 600, timeoutMs: 30000 });
    } catch {}
    return json({ ok: true, reply: reply || CHAT_GREETING });
  } catch {
    return json({ ok: true, reply: CHAT_FALLBACK });
  } finally {
    _chatInFlight--;
  }
}
async function chatAssistantStream(request, env) {
  if (rateLimited(`chat:${clientIP(request)}`, 5)) return err(429, RATE_MSG);
  const { prompt, error } = await parsePrompt(request);
  if (error) return error;
  const { prompt: system, sources } = await buildSystemPrompt(env, prompt);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      send({ type: "sources", sources: sources.map((s) => ({ title: s.title, url: s.url })) });
      if (_chatInFlight >= 5) {
        send({ type: "delta", text: CHAT_BUSY });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      _chatInFlight++;
      let emitted = false;
      try {
        const cfg = aiConfig(env);
        const resp = await fetch(`${cfg.base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.key}`,
            "User-Agent": "curl/8.5.0",
            "X-Client-Name": "Sakura-Admin",
          },
          body: JSON.stringify({
            model: cfg.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ],
            max_tokens: 700,
            stream: true,
            ...cfg.extra,
          }),
          signal: AbortSignal.timeout(40000),
        });
        if (!resp.ok || !resp.body) throw new Error(`AI HTTP ${resp.status}`);
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") break;
            try {
              const obj = JSON.parse(data);
              const delta = obj?.choices?.[0]?.delta?.content;
              if (delta) {
                emitted = true;
                send({ type: "delta", text: delta });
              }
            } catch {}
          }
        }
      } catch {
        if (!emitted) send({ type: "delta", text: CHAT_FALLBACK });
      } finally {
        _chatInFlight--;
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

// ---------- 后台 AI 助手（原 Hermes，改 DeepSeek 直连） ----------
const ADMIN_AI_SYSTEM =
  "你是作品集后台助手。请用中文给出可直接执行/复制的结果。如果是生成博客，请给标题、slug、摘要和 HTML 正文；如果是优化项目介绍，请给修改建议和可替换文案；如果是访问数据总结，请根据数据总结；如果是 SEO 检查，请给优先级排序的检查清单。";
const ACTION_LABELS = {
  blog: "生成一篇博客",
  project_copy: "优化项目介绍",
  analytics_summary: "总结最近访问数据",
  seo_check: "检查站点 SEO",
  custom: "自定义请求",
};
async function adminAssistant(request, env) {
  const data = await request.json().catch(() => ({}));
  const action = String(data.action || "custom").trim().slice(0, 80);
  const prompt = String(data.prompt || "").trim().slice(0, 4000);
  if (!prompt && !["analytics_summary", "seo_check"].includes(action)) {
    return err(400, "请输入要交给 AI 助手的内容");
  }
  const label = ACTION_LABELS[action] || action;
  const context = {
    site: "QT新月 / 钟文清个人作品集",
    domain: "https://qtxingyue.me/",
    backend: "Cloudflare Pages Functions + D1（Sakura Backend 云端版）",
    analytics: ["analytics_summary", "seo_check"].includes(action) ? await recentAnalyticsContext(env) : {},
  };
  const user = `请求类型：${label}\n管理员输入：${prompt}\n站点上下文：${JSON.stringify(context)}`;
  let reply;
  try {
    reply = await callAI(env, { system: ADMIN_AI_SYSTEM, user, maxTokens: 2000, timeoutMs: 55000 });
  } catch (e) {
    return err(502, `AI 调用失败：${e.message || e}`);
  }
  if (!reply) return err(502, "AI 没有返回内容，请稍后重试");
  await env.DB.prepare("INSERT INTO hermes_replies (action, content, raw) VALUES (?,?,?)")
    .bind(label, reply.slice(0, 4000), JSON.stringify({ via: "deepseek" }))
    .run();
  return json({ ok: true, reply, message: "AI 已回复" });
}
async function adminAssistantReplies(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, action, content, created_at FROM hermes_replies ORDER BY id DESC LIMIT 50"
  ).all();
  return json(results || []);
}
async function adminDeleteReply(env, rid) {
  await env.DB.prepare("DELETE FROM hermes_replies WHERE id=?").bind(rid).run();
  return json({ ok: true });
}
async function adminReplyContact(request, env, contactId) {
  const contact = await env.DB.prepare("SELECT * FROM contacts WHERE id=?").bind(contactId).first();
  if (!contact) return err(404, "留言不存在");
  const user = `访客 ${contact.name} 发来留言：\n${contact.message}\n\n请以 QT新月（钟文清）的口吻，写一封友好、真诚的回复邮件，150字以内，包含感谢、回应留言要点、以及欢迎进一步交流。`;
  let reply;
  try {
    reply = await callAI(env, {
      system: "你是作品集站长的邮件助理。只输出可直接发送的邮件正文，不要加任何解释或说明。",
      user,
      maxTokens: 800,
      timeoutMs: 55000,
    });
  } catch (e) {
    return err(502, `AI 调用失败：${e.message || e}`);
  }
  if (reply) {
    await env.DB.prepare("UPDATE contacts SET hermes_reply=? WHERE id=?")
      .bind(reply.slice(0, 2000), contactId)
      .run();
  }
  return json({ ok: true, reply: reply || "" });
}

// ---------- 路由 ----------
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const p = url.pathname;
  const m = request.method;

  try {
    // 公开接口
    if (p === "/api/analytics/hit" && m === "POST") return await analyticsHit(request, env);
    if (p === "/api/articles" && m === "GET") return await listArticles(env);
    if (p.startsWith("/api/articles/") && m === "GET")
      return await getArticle(env, decodeURIComponent(p.slice("/api/articles/".length)));
    if (p === "/api/chat/assistant" && m === "POST") return await chatAssistant(request, env);
    if (p === "/api/chat/assistant/stream" && m === "POST") return await chatAssistantStream(request, env);
    if (p === "/api/contact" && m === "POST") return await submitContact(request, env);
    if (p.startsWith("/uploads/") && m === "GET")
      return await serveUpload(request, env, decodeURIComponent(p.slice("/uploads/".length)));

    // 后台登录（不需要已有会话）
    if (p === "/api/admin/login" && m === "POST") return await adminLogin(request, env);

    // 后台接口（统一鉴权）
    if (p.startsWith("/api/admin/") || p === "/api/analytics/summary") {
      if (!(await checkAuth(request, env))) return err(401, "Unauthorized");
      if (p === "/api/analytics/summary" && m === "GET") return await analyticsSummary(env);
      if (p === "/api/admin/session" && m === "GET") return json({ ok: true, expires_in: COOKIE_MAX_AGE });
      if (p === "/api/admin/articles" && m === "GET") return await adminArticles(env);
      if (p === "/api/admin/articles" && m === "POST") return await createArticle(request, env);
      const artMatch = p.match(/^\/api\/admin\/articles\/(\d+)$/);
      if (artMatch && m === "PUT") return await updateArticle(request, env, Number(artMatch[1]));
      if (artMatch && m === "DELETE") return await deleteArticle(env, Number(artMatch[1]));
      if (p === "/api/admin/upload" && m === "POST") return await adminUpload(request, env);
      if (p === "/api/admin/files" && m === "GET") return await adminFiles(env);
      const fileMatch = p.match(/^\/api\/admin\/files\/(\d+)$/);
      if (fileMatch && m === "DELETE") return await adminDeleteFile(env, Number(fileMatch[1]));
      if (p === "/api/admin/hermes" && m === "POST") return await adminAssistant(request, env);
      if (p === "/api/admin/hermes-replies" && m === "GET") return await adminAssistantReplies(env);
      const repMatch = p.match(/^\/api\/admin\/hermes-replies\/(\d+)$/);
      if (repMatch && m === "DELETE") return await adminDeleteReply(env, Number(repMatch[1]));
      const rcMatch = p.match(/^\/api\/admin\/hermes\/reply-contact\/(\d+)$/);
      if (rcMatch && m === "POST") return await adminReplyContact(request, env, Number(rcMatch[1]));
      if (p === "/api/admin/contacts" && m === "GET") return await adminContacts(env);
      const conMatch = p.match(/^\/api\/admin\/contacts\/(\d+)$/);
      if (conMatch && m === "DELETE") return await adminDeleteContact(env, Number(conMatch[1]));
      return err(404, "Not Found");
    }

    if (p.startsWith("/api/")) return err(404, "Not Found");
    // 配置文件不对外暴露（wrangler.toml 会被 Pages 当静态文件吐出来）
    if (p === "/wrangler.toml" || p === "/.wranglerignore") return new Response("Not Found", { status: 404 });
    // Pages 默认把 /x.html 308 跳到 /x；拦截下来直接以 200 返回对应页面内容，保持 .html 地址不变
    if ((m === "GET" || m === "HEAD") && p.endsWith(".html")) {
      const clean = p.slice(0, -".html".length) || "/";
      const assetUrl = new URL(clean, url);
      assetUrl.search = url.search;
      try {
        const resp = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
        if (resp.status === 200) {
          return new Response(m === "HEAD" ? null : resp.body, { status: 200, headers: resp.headers });
        }
      } catch {}
    }
    // 其余路径（静态页、/admin 等）交给 Pages 静态资源
    return context.next();
  } catch (e) {
    return err(500, `Internal Error: ${e.message || e}`);
  }
}
