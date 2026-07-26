// ═══ 博客页：文章列表 + 详情（数据来自 Sakura Backend /api/articles）═══
// 从旧 public/blog.html 迁入。escapeHtml / slug 编码 / content 清理三段
// 是安全边界，逐字保留；tilt 光晕换用与主站共用的 card-fx。
import { bindCardFx } from './card-fx.js';

// HTML 转义：防止文章标题/摘要里的特殊字符破坏结构或触发 XSS
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const list = document.getElementById('articleList');
const detail = document.getElementById('articleDetail');
const content = document.getElementById('articleContent');

async function loadArticles() {
  if (!list) return;
  try {
    const resp = await fetch('/api/articles');
    const articles = await resp.json();

    if (!articles.length) {
      list.innerHTML = `
        <div class="blog-empty reveal visible">
          <div class="blog-empty-icon">📝</div>
          <h3>还没有文章</h3>
          <p>去 <a href="/admin">管理后台</a> 写第一篇文章吧</p>
        </div>`;
      return;
    }

    // 用 DOM API 创建卡片，避免 onclick 拼接 slug 的注入风险
    list.innerHTML = '';
    articles.forEach(a => {
      const card = document.createElement('article');
      card.className = 'article-card';
      card.dataset.slug = a.slug;   // slug 存在属性里，不拼进 HTML
      card.innerHTML =
        `<div class="article-date">${escapeHtml(a.created_at?.slice(0, 10))}</div>` +
        `<h2 class="article-title">${escapeHtml(a.title)}</h2>` +
        (a.excerpt ? `<p class="article-excerpt">${escapeHtml(a.excerpt)}</p>` : '') +
        `<div class="article-readmore">阅读全文 →</div>`;
      list.appendChild(card);
    });
    bindCardFx(list, { tiltSelector: '.article-card', glowSelector: '.article-card', tiltMax: 6, accentShadow: false });
  } catch (e) {
    list.innerHTML = `<div class="blog-empty"><div class="blog-empty-icon">⚠️</div><h3>加载失败</h3><p>后端服务可能未启动</p></div>`;
  }
}

async function loadArticle(slug) {
  try {
    // encodeURIComponent 防止 slug 被构造为路径穿越
    const resp = await fetch('/api/articles/' + encodeURIComponent(slug));
    if (!resp.ok) throw new Error(String(resp.status));
    const a = await resp.json();
    list.style.display = 'none';
    detail.classList.add('open');
    content.innerHTML =
      `<h1>${escapeHtml(a.title)}</h1>` +
      `<div class="meta">${escapeHtml(a.created_at?.slice(0, 10))} · ${escapeHtml(a.created_at?.slice(11, 16) || '')}</div>`;
    // content 为受信任的 HTML（仅管理员可发布），用 DOMPurify-style 清理过于重；
    // 这里采用 sandbox：关闭 script/事件处理。如需更强约束可在后端入库时 sanitize。
    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = a.content;
    body.querySelectorAll('script, iframe, object, embed, [onload], [onerror], [onclick]').forEach(el => el.remove());
    content.appendChild(body);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    alert('文章加载失败');
  }
}

function backToList() {
  detail.classList.remove('open');
  list.style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

if (list && detail && content) {
  // 事件委托：列表点击统一处理，避免给每张卡绑 onclick
  list.addEventListener('click', e => {
    const card = e.target.closest('.article-card');
    if (card) loadArticle(card.dataset.slug);
  });
  detail.addEventListener('click', e => {
    if (e.target.closest('.back-btn')) backToList();
  });
  loadArticles();
}
