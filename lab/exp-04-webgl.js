/**
 * 实验品四 · 水珠实验室 (纯 2D,零依赖)
 * 9 个项目化作通透水珠漂浮,点击泛起涟漪查看详情
 */
(function () {
'use strict';

var stage = document.getElementById('stage');
var isMobile = matchMedia('(max-width: 768px)').matches;
var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

var PROJECTS = [
  { name: '多平台广告数据系统', en: 'ADS DATA PIPELINE', color: '#e8b93c',
    desc: '海客熵连实习项目。Playwright 驱动浏览器 + Token 双重认证采集多平台广告数据，Streamlit 仪表盘一键生成报表，日常监控 300+ 广告账号消耗。',
    tags: ['Playwright', 'Streamlit', 'Python'] },
  { name: '手势控制 PPT', en: 'GESTURE PPT', color: '#5fb8ec',
    desc: '毕业设计。MediaPipe 追踪 21 个手部关键点，识别 6 种手势，滑动窗口防抖，720P 下稳定 20+ FPS，挥手翻页、捏合缩放。',
    tags: ['MediaPipe', 'OpenCV', 'Python'] },
  { name: '卡通风格迁移', en: 'CARTOONGAN', color: '#d68bf2',
    desc: 'AnimeGAN2 + ArcaneGAN 多模型风格迁移，图片视频双模式，支持新海诚、宫崎骏等多种画风，一键二次元化。',
    tags: ['PyTorch', 'AnimeGAN2', 'CV'] },
  { name: '日语假名识别', en: 'KANA OCR', color: '#f0979f',
    desc: 'CNN 识别 49 类日语假名草书字符，BatchNorm + Dropout + 早停，测试集准确率 88.2%，N2 备考时的练手之作。',
    tags: ['CNN', 'PyTorch', 'OCR'] },
  { name: '动漫商城管理', en: 'ANIME MALL', color: '#6fd598',
    desc: 'Java Servlet MVC + 微信小程序全栈：7 个 API、图片上传、批量操作，6 个小程序页面走通下单全流程。',
    tags: ['Java', '微信小程序', 'MySQL'] },
  { name: 'AI 生图作品集', en: 'AI GALLERY', color: '#a89cf5',
    desc: 'ChatGPT / Gemini / SD WebUI / ComfyUI 四类工具作品合集：产品广告、海报设计、风格迁移，提示词工程实战。',
    tags: ['Stable Diffusion', 'ComfyUI', 'Prompt'] },
  { name: '梅州美食地图', en: 'MEIZHOU FOOD MAP', color: '#f5a95e',
    desc: 'Pyecharts 地图 + 柱状图交互可视化，呈现客家美食与水果的地理分布，一次数据可视化的小品。',
    tags: ['Pyecharts', '数据可视化'] },
  { name: '浏览器 RPA', en: 'BROWSER RPA', color: '#7ba7f0',
    desc: 'Selenium + ixBrowser Profile 调度，批量流程的隔离执行、并发控制与日志回写，解放重复性网页操作。',
    tags: ['Selenium', 'RPA', 'Python'] },
  { name: '作品集网站', en: 'PORTFOLIO', color: '#4ed3b6',
    desc: '就是你现在看到的这个站。Astro 5 + Vue 岛屿架构 + GSAP 动效系统，自托管字体，Nginx 部署在阿里云。',
    tags: ['Astro', 'Vue', 'GSAP'] }
];

/* ---------- 水珠布局:叶序螺旋 ---------- */
var W = window.innerWidth, H = window.innerHeight;
function layout() {
  W = window.innerWidth; H = window.innerHeight;
  var cx = W / 2, cy = H * (isMobile ? 0.44 : 0.48);
  var R = Math.min(W, H) * (isMobile ? 0.40 : 0.36);
  PROJECTS.forEach(function (p, i) {
    var a = i * 2.399963 + 0.7;
    var r = R * Math.sqrt((i + 0.6) / PROJECTS.length);
    p.fx = cx + Math.cos(a) * r * 1.28;
    p.fy = cy + Math.sin(a) * r * 0.92;
    p.size = Math.round((isMobile ? 64 : 76) + ((i * 37) % 34) + (i === 0 ? 14 : 0));
    p.depth = 0.25 + (r / R) * 0.55;
    if (p.el) { p.el.style.left = p.fx + 'px'; p.el.style.top = p.fy + 'px'; }
  });
}

/* ---------- 生成水珠 ---------- */
PROJECTS.forEach(function (p, i) {
  var d = document.createElement('div');
  d.className = 'drop';
  d.style.setProperty('--d', (0.3 + (i % 5) * 0.16).toFixed(2));
  d.innerHTML = '<div class="bob" style="animation-duration:' + (5.5 + (i % 4) * 1.3).toFixed(1) +
    's;animation-delay:-' + (i * 1.7).toFixed(1) + 's">' +
    '<div class="orb"></div>' +
    '<div class="dlabel">' + p.name + '<small>' + p.en + '</small></div></div>';
  d.addEventListener('click', function (e) {
    e.stopPropagation();
    ripple(p.fx, p.fy, p.size);
    openPanel(i);
  });
  stage.appendChild(d);
  p.el = d;
  p.orbEl = d.querySelector('.orb');
});
function applySizes() {
  PROJECTS.forEach(function (p) {
    p.orbEl.style.width = p.size + 'px';
    p.orbEl.style.height = p.size + 'px';
  });
}

/* ---------- 涟漪 ---------- */
function ripple(x, y, size) {
  for (var k = 0; k < 2; k++) {
    (function (k) {
      var s = document.createElement('span');
      s.className = 'ripple';
      var sz = size * (1 + k * 0.35);
      s.style.width = sz + 'px'; s.style.height = sz + 'px';
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.animationDelay = (k * 0.18) + 's';
      document.body.appendChild(s);
      setTimeout(function () { s.remove(); }, 1400 + k * 180);
    })(k);
  }
}

/* ---------- 上升气泡 ---------- */
(function bubbles() {
  var box = document.getElementById('bubbles');
  var n = isMobile ? 10 : 16;
  for (var i = 0; i < n; i++) {
    var b = document.createElement('span');
    b.className = 'bubble';
    var sz = 4 + Math.random() * 12;
    b.style.width = sz + 'px'; b.style.height = sz + 'px';
    b.style.left = (Math.random() * 100) + 'vw';
    b.style.animationDuration = (9 + Math.random() * 10) + 's';
    b.style.animationDelay = (-Math.random() * 14) + 's';
    b.style.opacity = 0.35 + Math.random() * 0.45;
    box.appendChild(b);
  }
})();

/* ---------- 鼠标视差 ---------- */
if (!isMobile && !reduceMotion) {
  window.addEventListener('pointermove', function (e) {
    var nx = (e.clientX / W - 0.5), ny = (e.clientY / H - 0.5);
    stage.style.setProperty('--px', (-nx * 26).toFixed(1) + 'px');
    stage.style.setProperty('--py', (-ny * 20).toFixed(1) + 'px');
  }, { passive: true });
}

/* ---------- 详情面板 ---------- */
var panel = document.getElementById('panel');
var cur = -1;
function openPanel(i) {
  cur = (i + PROJECTS.length) % PROJECTS.length;
  var p = PROJECTS[cur];
  document.getElementById('pNo').textContent = ('0' + (cur + 1)).slice(-2) + ' / 09';
  document.getElementById('pName').textContent = p.name;
  document.getElementById('pEn').textContent = p.en;
  document.getElementById('pDesc').textContent = p.desc;
  document.getElementById('pTags').innerHTML = p.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('');
  document.getElementById('pDrop').style.setProperty('--pc', p.color);
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  PROJECTS.forEach(function (q, j) { q.el.classList.toggle('active', j === cur); });
}
function closePanel() {
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  PROJECTS.forEach(function (q) { q.el.classList.remove('active'); });
  cur = -1;
}
document.getElementById('panelClose').addEventListener('click', closePanel);
document.getElementById('prevBtn').addEventListener('click', function () { openPanel(cur - 1); });
document.getElementById('nextBtn').addEventListener('click', function () { openPanel(cur + 1); });
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closePanel();
  if (panel.classList.contains('open')) {
    if (e.key === 'ArrowLeft') openPanel(cur - 1);
    if (e.key === 'ArrowRight') openPanel(cur + 1);
  }
});
document.getElementById('stage').addEventListener('click', function () { closePanel(); });

/* ---------- 启动 ---------- */
layout();
applySizes();
var rT = null;
window.addEventListener('resize', function () {
  clearTimeout(rT);
  rT = setTimeout(function () { layout(); }, 200);
});
if (reduceMotion) {
  document.getElementById('hint').textContent = '点击水珠 · 查看项目';
  var st = document.createElement('style');
  st.textContent = '.bob,.blob,.bubble{animation:none!important}';
  document.head.appendChild(st);
}

})();
