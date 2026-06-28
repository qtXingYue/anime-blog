"""
Sakura Backend — 访问分析 + 轻量CMS + 文件托管
FastAPI + SQLite, 专为单服务器部署优化
"""

import sqlite3, os, time, hashlib, json, hmac, urllib.request, urllib.error, uuid
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI(title="Sakura Backend")

BASE = Path(__file__).parent
DB = BASE / "data.db"
UPLOADS = BASE / "uploads"
UPLOADS.mkdir(exist_ok=True)

ADMIN_PASSWORD = os.getenv("ADMIN_PASS")
if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASS environment variable must be set")
HERMES_WEBHOOK_URL = os.getenv("HERMES_WEBHOOK_URL", "http://127.0.0.1:8644/webhooks/portfolio-admin")
HERMES_WEBHOOK_SECRET = os.getenv("HERMES_WEBHOOK_SECRET", "")

# ==== Database ====

def get_db():
    db = sqlite3.connect(str(DB))
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT, ip TEXT, ua TEXT, referer TEXT,
            country TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT, slug TEXT UNIQUE, content TEXT, excerpt TEXT,
            published INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT, original_name TEXT, size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, email TEXT, message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);
        CREATE INDEX IF NOT EXISTS idx_visits_path ON visits(path);
    """)
    db.commit()
    db.close()

init_db()

# ==== Auth ====

def check_auth(request: Request):
    token = request.cookies.get("admin_token", "")
    return hashlib.sha256(ADMIN_PASSWORD.encode()).hexdigest() == token

# ==== Analytics Middleware ====

@app.middleware("http")
async def track_visit(request: Request, call_next):
    if not request.url.path.startswith("/api/") and not request.url.path.startswith("/admin/"):
        try:
            db = get_db()
            db.execute("INSERT INTO visits (path, ip, ua, referer) VALUES (?,?,?,?)",
                       (request.url.path,
                        request.client.host if request.client else "unknown",
                        request.headers.get("user-agent", "")[:500],
                        request.headers.get("referer", "")[:500]))
            db.commit()
            db.close()
        except:
            pass
    response = await call_next(request)
    return response

# ==== Static Files ====
app.mount("/uploads", StaticFiles(directory=str(UPLOADS)), name="uploads")

# ==== Analytics API ====

@app.post("/api/analytics/hit")
async def record_hit(request: Request):
    """记录页面访问（前端 JS 主动上报）"""
    try:
        data = await request.json()
        db = get_db()
        db.execute("INSERT INTO visits (path, ip, ua, referer) VALUES (?,?,?,?)",
                   (data.get("path", "/"),
                    request.client.host if request.client else "unknown",
                    request.headers.get("user-agent", "")[:500],
                    data.get("ref", "")[:500]))
        db.commit()
        db.close()
    except:
        pass
    return {"ok": True}

@app.get("/api/analytics/summary")
def analytics_summary():
    db = get_db()
    today = datetime.now().strftime("%Y-%m-%d")
    
    total_pv = db.execute("SELECT COUNT(*) as c FROM visits").fetchone()["c"]
    today_pv = db.execute("SELECT COUNT(*) as c FROM visits WHERE date(created_at)=?", (today,)).fetchone()["c"]
    
    total_uv = db.execute("SELECT COUNT(DISTINCT ip) as c FROM visits").fetchone()["c"]
    today_uv = db.execute("SELECT COUNT(DISTINCT ip) as c FROM visits WHERE date(created_at)=?", (today,)).fetchone()["c"]
    
    top_pages = [dict(r) for r in db.execute(
        "SELECT path, COUNT(*) as views FROM visits GROUP BY path ORDER BY views DESC LIMIT 10"
    ).fetchall()]
    
    hourly = [dict(r) for r in db.execute("""
        SELECT strftime('%H', created_at) as hour, COUNT(*) as views
        FROM visits WHERE date(created_at)=?
        GROUP BY hour ORDER BY hour
    """, (today,)).fetchall()]
    
    db.close()
    return {"total_pv": total_pv, "today_pv": today_pv, "total_uv": total_uv, "today_uv": today_uv, "top_pages": top_pages, "hourly": hourly}

# ==== Articles API ====

@app.get("/api/articles")
def list_articles():
    db = get_db()
    rows = [dict(r) for r in db.execute(
        "SELECT id, title, slug, excerpt, created_at FROM articles WHERE published=1 ORDER BY created_at DESC"
    ).fetchall()]
    db.close()
    return rows

@app.get("/api/articles/{slug}")
def get_article(slug: str):
    db = get_db()
    row = db.execute("SELECT * FROM articles WHERE slug=? AND published=1", (slug,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Not found")
    return dict(row)

# ==== Admin API ====

def verify_admin(request: Request):
    if not check_auth(request):
        raise HTTPException(401, "Unauthorized")

@app.post("/api/admin/login")
async def admin_login(request: Request):
    data = await request.json()
    if data.get("password") == ADMIN_PASSWORD:
        token = hashlib.sha256(ADMIN_PASSWORD.encode()).hexdigest()
        resp = JSONResponse({"ok": True})
        resp.set_cookie("admin_token", token, httponly=True, secure=True, samesite="lax", max_age=86400*30)
        return resp
    raise HTTPException(401, "Wrong password")

@app.get("/api/admin/articles")
def admin_articles(request: Request):
    verify_admin(request)
    db = get_db()
    rows = [dict(r) for r in db.execute("SELECT * FROM articles ORDER BY id DESC").fetchall()]
    db.close()
    return rows

@app.post("/api/admin/articles")
async def create_article(request: Request):
    verify_admin(request)
    data = await request.json()
    db = get_db()
    try:
        db.execute("INSERT INTO articles (title, slug, excerpt, content) VALUES (?,?,?,?)",
                   (data["title"], data["slug"], data.get("excerpt", ""), data["content"]))
        db.commit()
        return {"ok": True}
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Slug already exists")
    finally:
        db.close()

@app.put("/api/admin/articles/{id}")
async def update_article(id: int, request: Request):
    verify_admin(request)
    data = await request.json()
    db = get_db()
    db.execute("UPDATE articles SET title=?, slug=?, excerpt=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
               (data["title"], data["slug"], data.get("excerpt", ""), data["content"], id))
    db.commit()
    db.close()
    return {"ok": True}

@app.delete("/api/admin/articles/{id}")
def delete_article(id: int, request: Request):
    verify_admin(request)
    db = get_db()
    db.execute("DELETE FROM articles WHERE id=?", (id,))
    db.commit()
    db.close()
    return {"ok": True}

@app.post("/api/admin/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    verify_admin(request)

    # Validate file type
    ALLOWED_EXT = {"jpg", "jpeg", "png", "webp", "gif", "pdf", "mp4"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"不支持的文件类型: .{ext}，仅允许: {', '.join(sorted(ALLOWED_EXT))}")

    # Read with size limit (max 200MB)
    content = b""
    max_size = 200 * 1024 * 1024
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        content += chunk
        if len(content) > max_size:
            raise HTTPException(413, "文件超过 200MB 限制")

    safe_name = f"{uuid.uuid4().hex}.{ext}"
    path = UPLOADS / safe_name
    path.write_bytes(content)

    db = get_db()
    db.execute("INSERT INTO files (filename, original_name, size) VALUES (?,?,?)",
               (safe_name, file.filename, len(content)))
    db.commit()
    db.close()
    return {"url": f"/uploads/{safe_name}"}

@app.get("/api/admin/files")
def list_files(request: Request):
    verify_admin(request)
    db = get_db()
    rows = [dict(r) for r in db.execute("SELECT * FROM files ORDER BY id DESC").fetchall()]
    db.close()
    return rows


# ==== Hermes Admin Assistant ====

def _recent_analytics_context():
    try:
        db = get_db()
        total_pv = db.execute("SELECT COUNT(*) as c FROM visits").fetchone()["c"]
        total_uv = db.execute("SELECT COUNT(DISTINCT ip) as c FROM visits").fetchone()["c"]
        top_pages = [dict(r) for r in db.execute(
            "SELECT path, COUNT(*) as views FROM visits GROUP BY path ORDER BY views DESC LIMIT 10"
        ).fetchall()]
        contacts = [dict(r) for r in db.execute(
            "SELECT name, email, message, created_at FROM contacts ORDER BY id DESC LIMIT 5"
        ).fetchall()]
        db.close()
        return {"total_pv": total_pv, "total_uv": total_uv, "top_pages": top_pages, "recent_contacts": contacts}
    except Exception:
        return {}


def _call_hermes_webhook(payload: dict):
    if not HERMES_WEBHOOK_SECRET:
        raise HTTPException(500, "HERMES_WEBHOOK_SECRET 未配置")
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    sig = hmac.new(HERMES_WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
    req = urllib.request.Request(
        HERMES_WEBHOOK_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": sig,
            "X-Request-ID": f"portfolio-admin-{int(time.time() * 1000)}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(raw)
            except Exception:
                data = {"raw": raw}
            return {"ok": True, "status": resp.status, "response": data}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        raise HTTPException(e.code, f"Hermes webhook error: {raw[:500]}")
    except Exception as e:
        raise HTTPException(502, f"无法连接 Hermes webhook: {e}")


@app.post("/api/admin/hermes")
async def ask_hermes(request: Request):
    verify_admin(request)
    data = await request.json()
    action = str(data.get("action", "custom")).strip()[:80]
    prompt = str(data.get("prompt", "")).strip()[:4000]
    if not prompt and action not in {"analytics_summary", "seo_check"}:
        raise HTTPException(400, "请输入要交给 Hermes 的内容")

    action_labels = {
        "blog": "生成一篇博客",
        "project_copy": "优化项目介绍",
        "analytics_summary": "总结最近访问数据",
        "seo_check": "检查站点 SEO",
        "custom": "自定义请求",
    }
    context = {
        "site": "QT新月 / 钟文清个人作品集",
        "domain": "https://qtxingyue.me/",
        "backend": "FastAPI + SQLite Sakura Backend",
        "analytics": _recent_analytics_context() if action in {"analytics_summary", "seo_check"} else {},
    }
    payload = {
        "event_type": "portfolio_admin",
        "action": action_labels.get(action, action),
        "prompt": prompt,
        "context": json.dumps(context, ensure_ascii=False),
    }
    result = _call_hermes_webhook(payload)
    return {"ok": True, "message": "已提交给 Hermes，结果会发送到飞书。", "hermes": result}

# ==== Contact API ====

@app.post("/api/contact")
async def submit_contact(request: Request):
    """提交联系表单留言"""
    try:
        data = await request.json()
        db = get_db()
        db.execute("INSERT INTO contacts (name, email, message) VALUES (?,?,?)",
                   (data.get("name", "")[:100],
                    data.get("email", "")[:200],
                    data.get("message", "")[:2000]))
        db.commit()
        db.close()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, "提交失败，请稍后再试")

@app.get("/api/admin/contacts")
def list_contacts(request: Request):
    verify_admin(request)
    db = get_db()
    rows = [dict(r) for r in db.execute("SELECT * FROM contacts ORDER BY id DESC").fetchall()]
    db.close()
    return rows

# ==== Admin HTML ====

@app.get("/admin", response_class=HTMLResponse)
def admin_page():
    return HTMLResponse("""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Sakura Admin · QT新月</title>
<style>
:root{
  color-scheme:dark;
  --bg:#08090a;--bg2:#0f1011;--surface:rgba(255,255,255,.035);--surface2:rgba(255,255,255,.055);
  --line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.13);--text:#f7f8f8;--sub:#d0d6e0;--muted:#8a8f98;
  --dim:#62666d;--brand:#6d5dfc;--brand2:#8b5cf6;--danger:#ef4444;--ok:#10b981;--shadow:0 24px 80px rgba(0,0,0,.38);
}
*{box-sizing:border-box}html{min-height:100%;background:var(--bg)}body{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 15% 0%,rgba(109,93,252,.22),transparent 34rem),radial-gradient(circle at 92% 12%,rgba(139,92,246,.16),transparent 28rem),linear-gradient(180deg,#08090a,#0b0b11 45%,#08090a);color:var(--text);padding:clamp(16px,3vw,32px);font-feature-settings:"cv01","ss03"}
a{color:#9ca3ff}.shell{max-width:1180px;margin:0 auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}.brand{display:flex;gap:12px;align-items:center}.logo{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,var(--brand),var(--brand2));display:grid;place-items:center;box-shadow:0 12px 30px rgba(109,93,252,.35);font-weight:700}.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}.topbar h1{font-size:clamp(24px,4vw,36px);letter-spacing:-.04em;line-height:1;margin:0;font-weight:620}.status-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:rgba(255,255,255,.03);border-radius:999px;padding:8px 12px;color:var(--sub);font-size:13px;white-space:nowrap}.dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 5px rgba(16,185,129,.12)}
.login{width:min(420px,100%);margin:10vh auto 0;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.035));border:1px solid var(--line);border-radius:28px;padding:28px;box-shadow:var(--shadow);position:relative;overflow:hidden}.login:before{content:"";position:absolute;inset:-1px;background:radial-gradient(circle at 20% 0%,rgba(139,92,246,.2),transparent 16rem);pointer-events:none}.login>*{position:relative}.login h1{margin:0 0 8px;font-size:30px;letter-spacing:-.04em}.login p{margin:0 0 22px;color:var(--muted);font-size:14px}.login input{width:100%;padding:14px 15px;margin:0 0 14px;background:rgba(0,0,0,.28);border:1px solid var(--line);border-radius:14px;color:var(--text);outline:none;font-size:16px}.login input:focus,textarea:focus,input:focus{border-color:rgba(139,92,246,.65);box-shadow:0 0 0 4px rgba(139,92,246,.14)}button,.btn,.tab{appearance:none;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.035);color:var(--sub);cursor:pointer;transition:.18s ease;min-height:40px}button:hover,.btn:hover,.tab:hover{background:rgba(255,255,255,.07);border-color:var(--line2);color:var(--text);transform:translateY(-1px)}.login button,form button,.primary{background:linear-gradient(135deg,var(--brand),var(--brand2));border-color:transparent;color:#fff;font-weight:620;padding:12px 18px;box-shadow:0 10px 30px rgba(109,93,252,.24)}.login button{width:100%;font-size:15px}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:20px}.sidebar{position:sticky;top:18px;align-self:start;background:rgba(255,255,255,.026);border:1px solid var(--line);border-radius:24px;padding:12px;box-shadow:0 12px 50px rgba(0,0,0,.22)}.tabs{display:flex;flex-direction:column;gap:8px}.tab{text-align:left;padding:11px 13px;font-size:14px}.tab.active{background:rgba(109,93,252,.18);border-color:rgba(139,92,246,.5);color:#fff}.content{min-width:0}.panel{display:none;background:rgba(255,255,255,.026);border:1px solid var(--line);border-radius:28px;padding:clamp(16px,2.4vw,26px);box-shadow:var(--shadow)}.panel.active{display:block}.panel h3{margin:0 0 14px;font-size:22px;letter-spacing:-.03em}.hint{color:var(--muted);font-size:14px;margin:0 0 16px}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.stat{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025));border:1px solid var(--line);border-radius:20px;padding:18px;min-height:116px}.stat .num{font-size:clamp(26px,5vw,38px);letter-spacing:-.05em;color:var(--text);font-weight:650}.stat .label{font-size:13px;color:var(--muted);margin-top:6px}.table-wrap{width:100%;overflow:auto;border:1px solid var(--line);border-radius:18px;background:rgba(0,0,0,.18)}table{width:100%;border-collapse:collapse;min-width:520px}th,td{padding:13px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,.055);font-size:14px;vertical-align:top}th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;background:rgba(255,255,255,.025)}tr:last-child td{border-bottom:none}.btn{padding:8px 11px;margin:2px 4px 2px 0}.btn.danger:hover{border-color:rgba(239,68,68,.6);color:#fecaca}form label{display:block;margin:13px 0 6px;color:var(--muted);font-size:13px}form input,form textarea,#hermesPrompt{width:100%;padding:12px 14px;background:rgba(0,0,0,.24);border:1px solid var(--line);border-radius:14px;color:var(--text);font-size:14px;outline:none}form textarea{min-height:240px;resize:vertical}.actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.hermes-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.hermes-grid button{padding:14px 12px;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.025));font-weight:560}#hermesPrompt{min-height:180px;resize:vertical}#hermesResult{white-space:pre-wrap;background:rgba(0,0,0,.26);border:1px solid var(--line);border-radius:18px;padding:14px;margin-top:14px;color:var(--sub);font-size:13px;line-height:1.65;overflow:auto}.filebox{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}input[type=file]{max-width:100%;color:var(--muted)}
@media(max-width:860px){body{padding:14px}.topbar{align-items:flex-start;flex-direction:column}.layout{grid-template-columns:1fr}.sidebar{position:static;border-radius:20px;overflow:auto;padding:10px}.tabs{flex-direction:row;overflow-x:auto;padding-bottom:2px;scroll-snap-type:x mandatory}.tab{white-space:nowrap;scroll-snap-align:start}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hermes-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.panel{border-radius:22px}.status-pill{font-size:12px}}
@media(max-width:520px){.login{margin-top:6vh;padding:22px;border-radius:24px}.stats-grid,.hermes-grid{grid-template-columns:1fr}.brand{width:100%}.topbar h1{font-size:26px}th,td{padding:11px 12px}.panel{padding:15px}.filebox{display:block}.filebox button{margin-top:10px;width:100%}form button,.primary{width:100%}}
</style></head><body>
<div class="login" id="login"><div class="logo">月</div><h1>Sakura Admin</h1><p>登录作品集后台，管理文章、数据和 Hermes 助手。</p><input type="password" id="pass" placeholder="输入后台密码" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()"><button onclick="login()">登录后台</button></div>
<div class="shell" id="app" style="display:none">
<div class="topbar"><div class="brand"><div class="logo">月</div><div><div class="eyebrow">QT新月 Portfolio</div><h1>Sakura Admin</h1></div></div><div class="status-pill"><span class="dot"></span>Backend Online · Hermes Ready</div></div>
<div class="layout"><aside class="sidebar"><div class="tabs"><button class="tab active" onclick="switchTab('analytics',event)">数据分析</button><button class="tab" onclick="switchTab('articles',event)">文章管理</button><button class="tab" onclick="switchTab('new',event)">新建文章</button><button class="tab" onclick="switchTab('files',event)">文件管理</button><button class="tab" onclick="switchTab('hermes',event)">Hermes 助手</button></div></aside>
<main class="content"><div class="panel active" id="analytics"><h3>数据分析</h3><p class="hint">站点访问概览与热门页面。</p><div class="stats-grid" id="stats"></div><h3>热门页面</h3><div class="table-wrap"><table id="toppages"><tbody></tbody></table></div></div>
<div class="panel" id="articles"><h3>文章管理</h3><p class="hint">编辑、删除或查看后台文章。</p><div class="table-wrap"><table id="articleTable"><thead><tr><th>编号</th><th>标题</th><th>日期</th><th>操作</th></tr></thead><tbody></tbody></table></div></div>
<div class="panel" id="new"><h3 id="editTitle">新建文章</h3><p class="hint">支持 HTML 正文，可配合 Hermes 生成初稿。</p><form id="articleForm"><input type="hidden" id="editId"><label>标题</label><input id="title" required><label>别名 / Slug</label><input id="slug" required><label>摘要</label><input id="excerpt"><label>内容 (HTML)</label><textarea id="content" required></textarea><button type="submit">保存文章</button></form></div>
<div class="panel" id="files"><h3>文件管理</h3><p class="hint">上传并管理后台文件。</p><div class="filebox"><input type="file" id="fileInput"><button class="primary" onclick="uploadFile()">上传文件</button></div><div class="table-wrap"><table id="fileTable"><thead><tr><th>文件名</th><th>大小</th><th>链接</th></tr></thead><tbody></tbody></table></div></div>
<div class="panel" id="hermes"><h3>Hermes 助手</h3><p class="hint">向 Hermes 提交任务，结果会发送到你的飞书对话。</p><div class="hermes-grid"><button onclick="runHermes('blog')">生成博客</button><button onclick="runHermes('project_copy')">优化项目介绍</button><button onclick="runHermes('analytics_summary')">总结访问数据</button><button onclick="runHermes('seo_check')">检查 SEO</button></div><textarea id="hermesPrompt" placeholder="输入你的要求，例如：帮我写一篇关于日本 OCR 项目的技术博客"></textarea><button class="primary" style="margin-top:12px" onclick="runHermes('custom')">发送自定义请求</button><div id="hermesResult">等待提交...</div></div></main></div></div>
<script>
let TOKEN="";
function api(path,opt={}){return fetch(path,{...opt,credentials:'same-origin'}).then(r=>r.ok?r.json():r.json().then(e=>{throw e})).catch(e=>{if(e&&e.error)alert(e.error);if(e&&('Unauthorized'===e.detail||401===e.statusCode)){document.getElementById('login').style.display='block';document.getElementById('app').style.display='none'}throw e})}
async function login(){let r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pass').value}),credentials:'same-origin'});if(r.ok){document.getElementById('login').style.display='none';document.getElementById('app').style.display='block';loadAll()}else alert('密码错误')}
function loadAll(){loadAnalytics();loadArticles();loadFiles()}
async function loadAnalytics(){let d=await api('/api/analytics/summary');document.getElementById('stats').innerHTML=`<div class="stat"><div class="num">${d.total_pv}</div><div class="label">总浏览量</div></div><div class="stat"><div class="num">${d.total_uv}</div><div class="label">总访客</div></div><div class="stat"><div class="num">${d.today_pv}</div><div class="label">今日浏览</div></div><div class="stat"><div class="num">${d.today_uv}</div><div class="label">今日访客</div></div>`;document.getElementById('toppages').innerHTML=d.top_pages.map(p=>`<tr><td>${p.path}</td><td>${p.views}</td></tr>`).join('')||'<tr><td colspan="2">暂无数据</td></tr>'}
async function loadArticles(){let rows=await api('/api/admin/articles');document.querySelector('#articleTable tbody').innerHTML=rows.map(r=>`<tr><td>${r.id}</td><td>${r.title}</td><td>${r.created_at?.slice(0,10)||''}</td><td><button class="btn" onclick="editArticle(${r.id})">编辑</button><button class="btn danger" onclick="delArticle(${r.id})">删除</button></td></tr>`).join('')||'<tr><td colspan="4">暂无文章</td></tr>'}
async function editArticle(id){let rows=await api('/api/admin/articles');let r=rows.find(x=>x.id===id);if(!r)return;switchTab('new');document.getElementById('editTitle').textContent='编辑文章';document.getElementById('editId').value=r.id;document.getElementById('title').value=r.title;document.getElementById('slug').value=r.slug;document.getElementById('excerpt').value=r.excerpt||'';document.getElementById('content').value=r.content}
async function delArticle(id){if(!confirm('确认删除？'))return;await api('/api/admin/articles/'+id,{method:'DELETE'});loadArticles()}
document.getElementById('articleForm').onsubmit=async function(e){e.preventDefault();let id=document.getElementById('editId').value;let body={title:document.getElementById('title').value,slug:document.getElementById('slug').value,excerpt:document.getElementById('excerpt').value,content:document.getElementById('content').value};if(id)await api('/api/admin/articles/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});else await api('/api/admin/articles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});this.reset();document.getElementById('editId').value='';document.getElementById('editTitle').textContent='新建文章';switchTab('articles');loadArticles()}
async function uploadFile(){let f=document.getElementById('fileInput').files[0];if(!f)return;let fd=new FormData();fd.append('file',f);let r=await api('/api/admin/upload',{method:'POST',body:fd});loadFiles();alert('链接: '+r.url)}
async function loadFiles(){let rows=await api('/api/admin/files');document.querySelector('#fileTable tbody').innerHTML=rows.map(r=>`<tr><td>${r.original_name}</td><td>${(r.size/1024).toFixed(1)}KB</td><td><a href="${'/uploads/'+r.filename}" target="_blank">${'/uploads/'+r.filename}</a></td></tr>`).join('')||'<tr><td colspan="3">暂无文件</td></tr>'}
async function runHermes(action){let el=document.getElementById('hermesResult');let prompt=document.getElementById('hermesPrompt').value;el.textContent='提交中...';try{let r=await api('/api/admin/hermes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,prompt})});el.textContent=(r&&r.message?r.message:'已提交')+'\\n\\n'+JSON.stringify(r,null,2)}catch(e){el.textContent='提交失败：'+JSON.stringify(e)}}
function switchTab(name,ev){document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));if(ev&&ev.target)ev.target.classList.add('active');else{let btn=[...document.querySelectorAll('.tab')].find(b=>b.getAttribute('onclick')?.includes("'"+name+"'"));if(btn)btn.classList.add('active')}document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById(name).classList.add('active');if(name==='articles')loadArticles();if(name==='files')loadFiles();if(name==='analytics')loadAnalytics()}
</script></body></html>
""")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
