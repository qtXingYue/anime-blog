/**
 * 实验品五 · 液态晨露 (零依赖)
 * 液态水滴导航 + 可交互水滴池塘 + 设计 Tokens 陈列
 */
(function () {
'use strict';

var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
var isMobile = matchMedia('(max-width: 768px)').matches;

/* ---------- 1. 液态水滴导航 ---------- */
var NAVS = ['首页','关于','技能','项目','教程','实验室','博客','联系'];
var nav = document.getElementById('dewNav');
NAVS.forEach(function (label, i) {
  var b = document.createElement('button');
  b.className = 'dew-drop' + (i === 5 ? ' active' : '');
  b.type = 'button';
  // 每颗水滴轮廓略有不同：有机不对称
  var a = 52 + (i * 37) % 14, c = 44 + (i * 53) % 12;
  b.style.setProperty('--r1', a + '% ' + (100 - a) + '% ' + c + '% ' + (100 - c) + '%');
  b.style.setProperty('--r2', (100 - c) + '% ' + c + '% ' + (100 - a) + '% ' + a + '%');
  b.innerHTML = '<span class="tip"></span>' + label;
  b.addEventListener('click', function () {
    nav.querySelectorAll('.dew-drop').forEach(function (x) { x.classList.remove('active'); });
    b.classList.add('active');
    // 表面张力：点击瞬间收缩再回弹
    b.animate(
      [{ transform: 'scale(.88)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1.06)' }],
      { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' }
    );
  });
  nav.appendChild(b);
});

/* ---------- 2. 设计 Tokens ---------- */
var TOKENS = [
  ['--dew-bg', '#F4F7F0', '雾白底'], ['--dew-mint', '#E7F1E6', '薄荷'],
  ['--dew-leaf', '#C7DDCB', '叶绿'], ['--dew-sage', '#8EAF99', '鼠尾草'],
  ['--dew-forest', '#385F4C', '森林'], ['--dew-text', '#304B3E', '正文'],
  ['--dew-muted', '#7F9787', '次要']
];
var grid = document.getElementById('tokenGrid');
TOKENS.forEach(function (t) {
  var d = document.createElement('div');
  d.className = 'token';
  d.innerHTML = '<i style="background:' + t[1] + '"></i><b>' + t[2] + '</b><span>' + t[0] + '<br>' + t[1] + '</span>';
  grid.appendChild(d);
});

/* ---------- 3. 水滴池塘 ---------- */
var pond = document.getElementById('pond');
var drops = [];

function ripple(x, y) {
  if (reduceMotion) return;
  var r = document.createElement('div');
  r.className = 'ripple';
  r.style.left = x + 'px'; r.style.top = y + 'px';
  pond.appendChild(r);
  setTimeout(function () { r.remove(); }, 1200);
}

function spawnDrop(x, y, big) {
  var s = document.createElement('div');
  s.className = 'spawn';
  var size = big ? 46 + Math.random() * 30 : 18 + Math.random() * 26;
  s.style.width = s.style.height = size + 'px';
  s.style.left = x + 'px'; s.style.top = y + 'px';
  pond.appendChild(s);
  var drop = { el: s, x: x, y: y, r: size / 2, vx: (Math.random() - .5) * .6,
    vy: (Math.random() - .5) * .6, wob: Math.random() * Math.PI * 2 };
  drops.push(drop);
  // 限制数量，防性能爆炸
  if (drops.length > 40) {
    var old = drops.shift();
    old.el.remove();
  }
  return drop;
}

pond.addEventListener('pointerdown', function (e) {
  var rect = pond.getBoundingClientRect();
  var x = e.clientX - rect.left, y = e.clientY - rect.top;
  ripple(x, y);
  spawnDrop(x, y, true);
  ripple(x, y);
});

// 初始几颗
function seed() {
  var w = pond.clientWidth, h = pond.clientHeight;
  for (var i = 0; i < (isMobile ? 4 : 7); i++) {
    spawnDrop(w * (.12 + Math.random() * .76), h * (.2 + Math.random() * .6), false);
  }
}
if (pond.clientWidth) seed();
else setTimeout(seed, 300);

// 物理：漂移 + 呼吸 + 合并
var last = performance.now();
function tick(now) {
  var dt = Math.min(50, now - last) / 16.7;
  last = now;
  var w = pond.clientWidth, h = pond.clientHeight;
  for (var i = drops.length - 1; i >= 0; i--) {
    var d = drops[i];
    if (!reduceMotion) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.wob += .05 * dt;
      // 池壁反弹
      if (d.x < d.r || d.x > w - d.r) d.vx *= -1;
      if (d.y < d.r || d.y > h - d.r) d.vy *= -1;
      d.x = Math.max(d.r, Math.min(w - d.r, d.x));
      d.y = Math.max(d.r, Math.min(h - d.r, d.y));
      // 呼吸
      var breathe = 1 + Math.sin(d.wob) * .06;
      d.el.style.transform = 'translate(-50%,-50%) scale(' + breathe.toFixed(3) + ')';
      d.el.style.left = d.x + 'px'; d.el.style.top = d.y + 'px';
    }
    // 合并：两颗相碰→大的吃小的
    for (var j = i - 1; j >= 0; j--) {
      var o = drops[j];
      var dx = d.x - o.x, dy = d.y - o.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < (d.r + o.r) * .72) {
        var big = d.r >= o.r ? d : o, small = d.r >= o.r ? o : d;
        big.r = Math.min(52, Math.sqrt(big.r * big.r + small.r * small.r * .6));
        big.el.style.width = big.el.style.height = (big.r * 2) + 'px';
        big.x = (big.x + small.x) / 2; big.y = (big.y + small.y) / 2;
        ripple(big.x, big.y);
        small.el.remove();
        drops.splice(drops.indexOf(small), 1);
        if (small === d) break;
      }
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

})();
