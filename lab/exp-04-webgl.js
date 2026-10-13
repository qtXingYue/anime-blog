/**
 * 实验品四 · 星云项目宇宙 (raw WebGL, 零依赖)
 * 背景:26k 粒子星云 + 自定义 GLSL
 * 前景:9 个项目化作星球环绕运行,点击查看详情
 */
(function () {
'use strict';

var canvas = document.getElementById('scene');
var isMobile = matchMedia('(max-width: 768px)').matches;
var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
var COUNT = isMobile ? 12000 : 26000;
var DPR = Math.min(window.devicePixelRatio || 1, 1.75);

var THEMES = {
  violet:  { core: [1.0, 0.965, 0.85],  mid: [0.66, 0.33, 0.97],  outer: [0.16, 0.10, 0.37], bg: '#060310', css: [0.024, 0.012, 0.063], name: '紫金星云' },
  ice:     { core: [0.91, 0.98, 1.0],   mid: [0.22, 0.74, 0.97],  outer: [0.05, 0.13, 0.25], bg: '#030710', css: [0.012, 0.027, 0.063], name: '冰蓝星云' },
  crimson: { core: [1.0, 0.91, 0.925],  mid: [0.98, 0.44, 0.52],  outer: [0.28, 0.06, 0.11], bg: '#0e0408', css: [0.055, 0.016, 0.031], name: '绯红星云' }
};
var themeKeys = Object.keys(THEMES);
var themeIdx = 0;

/* 项目星球数据 */
var PROJECTS = [
  { name: '多平台广告数据系统', en: 'Ads Data Pipeline', color: '#f5c542',
    desc: '海客熵连实习项目。Playwright 驱动浏览器 + Token 双重认证采集多平台广告数据，Streamlit 仪表盘一键生成报表，日常监控 300+ 广告账号消耗。',
    tags: ['Playwright', 'Streamlit', 'Python'], orbitR: 6.4, orbitY: 1.1, speed: 0.055, size: 1.25 },
  { name: '手势控制 PPT 系统', en: 'Gesture PPT', color: '#7dd3fc',
    desc: '毕业设计。MediaPipe 追踪 21 个手部关键点，识别 6 种手势，滑动窗口防抖，720P 下稳定 20+ FPS，挥手翻页、捏合缩放。',
    tags: ['MediaPipe', 'OpenCV', 'Python'], orbitR: 5.2, orbitY: -0.7, speed: 0.075, size: 1.1 },
  { name: '卡通风格迁移', en: 'CartoonGAN', color: '#f0abfc',
    desc: 'AnimeGAN2 + ArcaneGAN 多模型风格迁移，图片视频双模式，支持新海诚、宫崎骏等多种画风，一键二次元化。',
    tags: ['PyTorch', 'AnimeGAN2', 'CV'], orbitR: 7.3, orbitY: 0.4, speed: 0.045, size: 1.2 },
  { name: '日语假名手写识别', en: 'Kana OCR', color: '#fda4af',
    desc: 'CNN 识别 49 类日语假名草书字符，BatchNorm + Dropout + 早停，测试集准确率 88.2%，N2 备考时的练手之作。',
    tags: ['CNN', 'PyTorch', 'OCR'], orbitR: 4.6, orbitY: 1.6, speed: 0.09, size: 0.95 },
  { name: '动漫商城管理系统', en: 'Anime Mall', color: '#86efac',
    desc: 'Java Servlet MVC + 微信小程序全栈：7 个 API、图片上传、批量操作，6 个小程序页面走通下单全流程。',
    tags: ['Java', '微信小程序', 'MySQL'], orbitR: 6.9, orbitY: -1.2, speed: 0.05, size: 1.05 },
  { name: 'AI 生图作品集', en: 'AI Gallery', color: '#c4b5fd',
    desc: 'ChatGPT / Gemini / SD WebUI / ComfyUI 四类工具作品合集：产品广告、海报设计、风格迁移，提示词工程实战。',
    tags: ['Stable Diffusion', 'ComfyUI', 'Prompt'], orbitR: 5.7, orbitY: 0.1, speed: 0.065, size: 1.0 },
  { name: '梅州美食地理可视化', en: 'Meizhou Food Map', color: '#fdba74',
    desc: 'Pyecharts 地图 + 柱状图交互可视化，呈现客家美食与水果的地理分布，一次数据可视化的小品。',
    tags: ['Pyecharts', '数据可视化'], orbitR: 4.9, orbitY: -1.7, speed: 0.085, size: 0.9 },
  { name: '浏览器 RPA 系统', en: 'Browser RPA', color: '#93c5fd',
    desc: 'Selenium + ixBrowser Profile 调度，批量流程的隔离执行、并发控制与日志回写，解放重复性网页操作。',
    tags: ['Selenium', 'RPA', 'Python'], orbitR: 7.8, orbitY: 1.8, speed: 0.04, size: 1.05 },
  { name: '全栈作品集网站', en: 'Portfolio', color: '#5eead4',
    desc: '就是你现在看到的这个站。Astro 5 + Vue 岛屿架构 + GSAP 动效系统，自托管字体，Nginx 部署在阿里云。',
    tags: ['Astro', 'Vue', 'GSAP'], orbitR: 6.0, orbitY: -0.2, speed: 0.06, size: 1.15 }
];

/* ---------------- mat4 ---------------- */
function mat4Perspective(fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0,  0, f, 0, 0,  0, 0, (far + near) * nf, -1,  0, 0, 2 * far * near * nf, 0];
}
function mat4LookAt(eye, center, up) {
  var zx = eye[0]-center[0], zy = eye[1]-center[1], zz = eye[2]-center[2];
  var l = Math.hypot(zx, zy, zz); zx/=l; zy/=l; zz/=l;
  var xx = up[1]*zz - up[2]*zy, xy = up[2]*zx - up[0]*zz, xz = up[0]*zy - up[1]*zx;
  l = Math.hypot(xx, xy, xz); xx/=l; xy/=l; xz/=l;
  var yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx;
  return [xx, yx, zx, 0,  xy, yy, zy, 0,  xz, yz, zz, 0,
    -(xx*eye[0]+xy*eye[1]+xz*eye[2]), -(yx*eye[0]+yy*eye[1]+yz*eye[2]), -(zx*eye[0]+zy*eye[1]+zz*eye[2]), 1];
}
function mat4Mul(a, b) {
  var o = new Array(16);
  for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
    o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
  }
  return o;
}
function mat4Invert(m) {
  var inv = new Array(16);
  inv[0]=m[5]*m[10]*m[15]-m[5]*m[11]*m[14]-m[9]*m[6]*m[15]+m[9]*m[7]*m[14]+m[13]*m[6]*m[11]-m[13]*m[7]*m[10];
  inv[4]=-m[4]*m[10]*m[15]+m[4]*m[11]*m[14]+m[8]*m[6]*m[15]-m[8]*m[7]*m[14]-m[12]*m[6]*m[11]+m[12]*m[7]*m[10];
  inv[8]=m[4]*m[9]*m[15]-m[4]*m[11]*m[13]-m[8]*m[5]*m[15]+m[8]*m[7]*m[13]+m[12]*m[5]*m[11]-m[12]*m[7]*m[9];
  inv[12]=-m[4]*m[9]*m[14]+m[4]*m[10]*m[13]+m[8]*m[5]*m[14]-m[8]*m[6]*m[13]-m[12]*m[5]*m[10]+m[12]*m[6]*m[9];
  inv[1]=-m[1]*m[10]*m[15]+m[1]*m[11]*m[14]+m[9]*m[2]*m[15]-m[9]*m[3]*m[14]-m[13]*m[2]*m[11]+m[13]*m[3]*m[10];
  inv[5]=m[0]*m[10]*m[15]-m[0]*m[11]*m[14]-m[8]*m[2]*m[15]+m[8]*m[3]*m[14]+m[12]*m[2]*m[11]-m[12]*m[3]*m[10];
  inv[9]=-m[0]*m[9]*m[15]+m[0]*m[11]*m[13]+m[8]*m[1]*m[15]-m[8]*m[3]*m[13]-m[12]*m[1]*m[11]+m[12]*m[3]*m[9];
  inv[13]=m[0]*m[9]*m[14]-m[0]*m[10]*m[13]-m[8]*m[1]*m[14]+m[8]*m[2]*m[13]+m[12]*m[1]*m[10]-m[12]*m[2]*m[9];
  inv[2]=m[1]*m[6]*m[15]-m[1]*m[7]*m[14]-m[5]*m[2]*m[15]+m[5]*m[3]*m[14]+m[13]*m[2]*m[7]-m[13]*m[3]*m[6];
  inv[6]=-m[0]*m[6]*m[15]+m[0]*m[7]*m[14]+m[4]*m[2]*m[15]-m[4]*m[3]*m[14]-m[12]*m[2]*m[7]+m[12]*m[3]*m[6];
  inv[10]=m[0]*m[5]*m[15]-m[0]*m[7]*m[13]-m[4]*m[1]*m[15]+m[4]*m[3]*m[13]+m[12]*m[1]*m[7]-m[12]*m[3]*m[5];
  inv[14]=-m[0]*m[5]*m[14]+m[0]*m[6]*m[13]+m[4]*m[1]*m[14]-m[4]*m[2]*m[13]-m[12]*m[1]*m[6]+m[12]*m[2]*m[5];
  inv[3]=-m[1]*m[6]*m[11]+m[1]*m[7]*m[10]+m[5]*m[2]*m[11]-m[5]*m[3]*m[10]-m[9]*m[2]*m[7]+m[9]*m[3]*m[6];
  inv[7]=m[0]*m[6]*m[11]-m[0]*m[7]*m[10]-m[4]*m[2]*m[11]+m[4]*m[3]*m[10]+m[8]*m[2]*m[7]-m[8]*m[3]*m[6];
  inv[11]=-m[0]*m[5]*m[11]+m[0]*m[7]*m[9]+m[4]*m[1]*m[11]-m[4]*m[3]*m[9]-m[8]*m[1]*m[7]+m[8]*m[3]*m[5];
  inv[15]=m[0]*m[5]*m[10]-m[0]*m[6]*m[9]-m[4]*m[1]*m[10]+m[4]*m[2]*m[9]+m[8]*m[1]*m[6]-m[8]*m[2]*m[5];
  var det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
  if (det === 0) return mat4Perspective(1, 1, 0.1, 100);
  for (var i = 0; i < 16; i++) inv[i] /= det;
  return inv;
}

/* ---------------- gl ---------------- */
var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
if (!gl) { document.getElementById('nogl').style.display = 'flex'; return; }

function compile(type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    document.getElementById('nogl').style.display = 'flex';
    throw new Error('shader compile failed');
  }
  return s;
}
function makeProgram(vs, fs) {
  var p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); throw new Error('link failed'); }
  return p;
}
gl.disable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

/* ---------------- 星云 ---------------- */
var GALAXY_VS = [
  'attribute vec3 position;',
  'attribute float aMix;',
  'attribute float aScale;',
  'attribute float aPhase;',
  'uniform mat4 uView;',
  'uniform mat4 uProj;',
  'uniform float uTime;',
  'uniform vec3 uMouse;',
  'uniform float uMouseActive;',
  'uniform float uBurstTime;',
  'uniform vec3 uBurstPos;',
  'uniform float uSize;',
  'uniform float uPixelRatio;',
  'varying float vMix;',
  'varying float vTwinkle;',
  'void main() {',
  '  vec3 p = position;',
  '  float r = length(p.xz) + 0.0001;',
  '  float ang = uTime * (0.28 / (0.35 + r));',
  '  float ca = cos(ang), sa = sin(ang);',
  '  p.xz = mat2(ca, -sa, sa, ca) * p.xz;',
  '  vec2 toM = uMouse.xz - p.xz;',
  '  float md = length(toM);',
  '  float infl = exp(-md * md * 0.32) * uMouseActive;',
  '  vec2 perp = vec2(-toM.y, toM.x) / (md + 0.0001);',
  '  p.xz += perp * infl * 0.7;',
  '  p.y += infl * 0.4;',
  '  float age = uTime - uBurstTime;',
  '  if (uBurstTime > 0.0 && age > 0.0 && age < 4.0) {',
  '    vec3 toP = p - uBurstPos;',
  '    float d = length(toP);',
  '    float front = age * 7.0;',
  '    float df = d - front;',
  '    float band = exp(-(df * df) / 2.2) * exp(-age * 1.15);',
  '    p += (toP / (d + 0.0001)) * band * 1.7;',
  '  }',
  '  vMix = aMix;',
  '  vTwinkle = 0.72 + 0.28 * sin(uTime * 2.2 + aPhase);',
  '  vec4 mv = uView * vec4(p, 1.0);',
  '  float dist = max(0.1, -mv.z);',
  '  gl_PointSize = uSize * (0.32 + aScale * 0.95) * vTwinkle * uPixelRatio / dist;',
  '  gl_Position = uProj * mv;',
  '}'
].join('\n');
var GALAXY_FS = [
  'precision mediump float;',
  'uniform vec3 uCore;',
  'uniform vec3 uMid;',
  'uniform vec3 uOuter;',
  'varying float vMix;',
  'varying float vTwinkle;',
  'void main() {',
  '  float d = length(gl_PointCoord - vec2(0.5));',
  '  float a = pow(smoothstep(0.5, 0.04, d), 1.7);',
  '  vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.45, vMix));',
  '  col = mix(col, uOuter, smoothstep(0.4, 1.0, vMix));',
  '  col *= 0.72 + 0.5 * vTwinkle;',
  '  gl_FragColor = vec4(col, a);',
  '}'
].join('\n');
var galaxyProg = makeProgram(GALAXY_VS, GALAXY_FS);
var gA = {
  position: gl.getAttribLocation(galaxyProg, 'position'),
  aMix: gl.getAttribLocation(galaxyProg, 'aMix'),
  aScale: gl.getAttribLocation(galaxyProg, 'aScale'),
  aPhase: gl.getAttribLocation(galaxyProg, 'aPhase')
};
var gU = {};
['uView','uProj','uTime','uMouse','uMouseActive','uBurstTime','uBurstPos','uSize','uPixelRatio','uCore','uMid','uOuter']
  .forEach(function (n) { gU[n] = gl.getUniformLocation(galaxyProg, n); });

var galaxy = (function (count) {
  var pos = new Float32Array(count * 3);
  var aMix = new Float32Array(count), aScale = new Float32Array(count), aPhase = new Float32Array(count);
  var R = 5.2;
  for (var i = 0; i < count; i++) {
    var branch = i % 3;
    var radius = Math.pow(Math.random(), 0.75) * R;
    var branchAngle = (branch / 3) * Math.PI * 2 + radius * 0.55;
    var flat = 1 - (radius / R) * 0.55;
    var rx = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * 0.7 * flat;
    var ry = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * 0.38 * flat;
    var rz = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * 0.7 * flat;
    pos[i*3] = Math.cos(branchAngle) * radius + rx;
    pos[i*3+1] = ry;
    pos[i*3+2] = Math.sin(branchAngle) * radius + rz;
    aMix[i] = radius / R; aScale[i] = Math.random(); aPhase[i] = Math.random() * Math.PI * 2;
  }
  function buf(data) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  }
  return { pos: buf(pos), aMix: buf(aMix), aScale: buf(aScale), aPhase: buf(aPhase), count: count };
})(COUNT);

function bindAttr(loc, buffer, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}

/* ---------------- 背景星 ---------------- */
var starProg = makeProgram(
  ['attribute vec3 position;',
   'uniform mat4 uVP;',
   'uniform float uPixelRatio;',
   'varying float vA;',
   'void main() {',
   '  gl_Position = uVP * vec4(position, 1.0);',
   '  gl_PointSize = 2.0 * uPixelRatio;',
   '  vA = 0.25 + 0.35 * fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);',
   '}'].join('\n'),
  ['precision mediump float;',
   'varying float vA;',
   'void main() {',
   '  float d = length(gl_PointCoord - vec2(0.5));',
   '  float a = smoothstep(0.5, 0.1, d) * vA;',
   '  gl_FragColor = vec4(0.54, 0.53, 0.72, a);',
   '}'].join('\n'));
var sA = { position: gl.getAttribLocation(starProg, 'position') };
var sU = { uVP: gl.getUniformLocation(starProg, 'uVP'), uPixelRatio: gl.getUniformLocation(starProg, 'uPixelRatio') };
var starBuf = (function () {
  var n = 700, pos = new Float32Array(n * 3);
  for (var i = 0; i < n; i++) {
    var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), rr = 28 + Math.random() * 40;
    pos[i*3] = rr * Math.sin(ph) * Math.cos(th);
    pos[i*3+1] = rr * Math.cos(ph) * 0.6;
    pos[i*3+2] = rr * Math.sin(ph) * Math.sin(th);
  }
  var b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  return { buf: b, count: n };
})();

/* ---------------- 轨道环 ---------------- */
var ringProg = makeProgram(
  'attribute vec3 position; uniform mat4 uVP; void main() { gl_Position = uVP * vec4(position, 1.0); }',
  'precision mediump float; uniform vec4 uColor; void main() { gl_FragColor = uColor; }');
var rA = { position: gl.getAttribLocation(ringProg, 'position') };
var rU = { uVP: gl.getUniformLocation(ringProg, 'uVP'), uColor: gl.getUniformLocation(ringProg, 'uColor') };
var rings = [];
function buildRings() {
  rings.forEach(function (rg) { gl.deleteBuffer(rg.buf); });
  rings = [];
  var seen = {};
  PROJECTS.forEach(function (p) {
    var key = p.orbitR.toFixed(2) + '|' + p.orbitY.toFixed(2);
    if (seen[key]) return; seen[key] = 1;
    var seg = 96, pos = new Float32Array(seg * 3);
    for (var i = 0; i < seg; i++) {
      var a = i / seg * Math.PI * 2;
      pos[i*3] = Math.cos(a) * p.orbitR * ORBIT_SCALE;
      pos[i*3+1] = p.orbitY;
      pos[i*3+2] = Math.sin(a) * p.orbitR * ORBIT_SCALE;
    }
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    rings.push({ buf: b, seg: seg });
  });
}

/* ---------------- 星球 DOM ---------------- */
var planetLayer = document.getElementById('planets');
var tip = document.getElementById('tip');
PROJECTS.forEach(function (pr, i) {
  pr.baseAngle = (i / PROJECTS.length) * Math.PI * 2 + Math.random() * 0.6;
  var d = document.createElement('div');
  d.className = 'planet';
  d.style.setProperty('--c', pr.color);
  d.innerHTML = '<span class="halo"></span><span class="orb"></span><span class="plabel">' + pr.name + '</span>';
  d.addEventListener('click', function (e) { e.stopPropagation(); openPanel(i); });
  if (!isMobile) {
    d.addEventListener('mouseenter', function () {
      tip.innerHTML = pr.name + '<small>' + pr.en + ' · 点击查看</small>';
      tip.style.display = 'block'; tipFor = i;
    });
    d.addEventListener('mouseleave', function () { tip.style.display = 'none'; tipFor = -1; });
  }
  planetLayer.appendChild(d);
  pr.el = d; pr.orbEl = d.querySelector('.orb');
  pr.sx = -100; pr.sy = -100; pr.vis = false;
});
var tipFor = -1;

/* ---------------- 详情面板 ---------------- */
var panel = document.getElementById('panel');
var cur = -1;
function openPanel(i) {
  cur = (i + PROJECTS.length) % PROJECTS.length;
  var pr = PROJECTS[cur];
  document.getElementById('pNo').textContent = ('0' + (cur + 1)).slice(-2) + ' / 09';
  document.getElementById('pName').textContent = pr.name;
  document.getElementById('pDesc').textContent = pr.desc;
  document.getElementById('pTags').innerHTML = pr.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('');
  panel.style.setProperty('--pc', pr.color);
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  PROJECTS.forEach(function (p, j) { p.el.classList.toggle('active', j === cur); });
}
function closePanel() {
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  PROJECTS.forEach(function (p) { p.el.classList.remove('active'); });
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

/* ---------------- 交互:拖拽旋转 / 点击冲击波 ---------------- */
var mouseNdc = [0, 0];
var mouseWorld = [0, -100, 0];
var camOff = [0, 0];
var mouseActive = 0;
var burstTime = -10;
var burstPos = [0, 0, 0];
var autoRotate = !reduceMotion;
var userAz = 0;
var invVP = null;
var dragging = false, dragMoved = 0, lastX = 0, downX = 0, downY = 0;

function unproject(nx, ny, inv) {
  function xf(x, y, z) {
    var w = inv[3]*x + inv[7]*y + inv[11]*z + inv[15];
    return [(inv[0]*x + inv[4]*y + inv[8]*z + inv[12]) / w,
            (inv[1]*x + inv[5]*y + inv[9]*z + inv[13]) / w,
            (inv[2]*x + inv[6]*y + inv[10]*z + inv[14]) / w];
  }
  var p1 = xf(nx, ny, -1), p2 = xf(nx, ny, 1);
  var t = -p1[1] / (p2[1] - p1[1]);
  return [p1[0] + (p2[0]-p1[0])*t, 0, p1[2] + (p2[2]-p1[2])*t];
}
canvas.addEventListener('pointerdown', function (e) {
  dragging = true; dragMoved = 0; lastX = e.clientX; downX = e.clientX; downY = e.clientY;
  canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
});
window.addEventListener('pointermove', function (e) {
  mouseNdc = [(e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)];
  mouseActive = 1;
  if (dragging) {
    var dx = e.clientX - lastX; lastX = e.clientX;
    dragMoved += Math.abs(dx);
    userAz += dx * 0.0045;
  }
}, { passive: true });
window.addEventListener('pointerup', function (e) {
  if (dragging && dragMoved < 6 && invVP) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = -((e.clientY / window.innerHeight) * 2 - 1);
    burstPos = unproject(nx, ny, invVP);
    burstTime = (performance.now() - startT) / 1000;
  }
  dragging = false;
});
document.addEventListener('mouseleave', function () { mouseActive = 0; });

/* ---------------- UI ---------------- */
var themeName = document.getElementById('themeName');
document.getElementById('themeBtn').addEventListener('click', function () {
  themeIdx = (themeIdx + 1) % themeKeys.length;
  var t = THEMES[themeKeys[themeIdx]];
  document.body.style.background = t.bg;
  themeName.textContent = t.name;
  applyTheme(t);
});
var rotBtn = document.getElementById('rotBtn');
function syncRotBtn() {
  rotBtn.textContent = autoRotate ? '视角旋转 · 开' : '视角旋转 · 关';
  rotBtn.classList.toggle('off', !autoRotate);
}
rotBtn.addEventListener('click', function () { autoRotate = !autoRotate; syncRotBtn(); });
syncRotBtn();

var bgColor = THEMES.violet.css;
function applyTheme(t) {
  gl.useProgram(galaxyProg);
  gl.uniform3fv(gU.uCore, t.core);
  gl.uniform3fv(gU.uMid, t.mid);
  gl.uniform3fv(gU.uOuter, t.outer);
  bgColor = t.css;
}

var aspect = 1, FOV = 58, camBoost = 1, ORBIT_SCALE = 0.92;
function resize() {
  canvas.width = Math.floor(window.innerWidth * DPR);
  canvas.height = Math.floor(window.innerHeight * DPR);
  gl.viewport(0, 0, canvas.width, canvas.height);
  aspect = window.innerWidth / window.innerHeight;
  FOV = aspect < 0.85 ? 68 : 58;
  camBoost = aspect < 0.85 ? (1 + (0.85 - aspect) * 1.6) : 1;
  ORBIT_SCALE = aspect < 0.85 ? 0.78 : 0.92;
  proj = mat4Perspective(FOV * Math.PI / 180, aspect, 0.1, 200);
  buildRings();
}
var resizeTimer = null;
window.addEventListener('resize', function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 200);
});

/* ---------------- 主循环 ---------------- */
var proj = mat4Perspective(58 * Math.PI / 180, window.innerWidth / window.innerHeight, 0.1, 200);
var startT = performance.now();
var W = 0, H = 0;

function frame() {
  var t = (performance.now() - startT) / 1000;
  W = window.innerWidth; H = window.innerHeight;
  var az = (autoRotate ? t * 0.06 : 0) + userAz;
  camOff[0] += (mouseNdc[0] * 0.9 - camOff[0]) * 0.04;
  camOff[1] += (mouseNdc[1] * 0.5 - camOff[1]) * 0.04;
  var eye = [Math.sin(az) * 1.4 + camOff[0], 2.4 + camOff[1], Math.cos(az) * 1.4 + 7.8 * camBoost];
  var view = mat4LookAt(eye, [0, 0, 0], [0, 1, 0]);
  var vp = mat4Mul(proj, view);
  invVP = mat4Invert(vp);

  var hit = unproject(mouseNdc[0], mouseNdc[1], invVP);
  mouseWorld[0] += (hit[0] - mouseWorld[0]) * 0.12;
  mouseWorld[2] += (hit[2] - mouseWorld[2]) * 0.12;

  gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  var fvp = new Float32Array(vp);

  // 背景星
  gl.useProgram(starProg);
  gl.uniformMatrix4fv(sU.uVP, false, fvp);
  gl.uniform1f(sU.uPixelRatio, DPR);
  bindAttr(sA.position, starBuf.buf, 3);
  gl.drawArrays(gl.POINTS, 0, starBuf.count);

  // 轨道环
  gl.useProgram(ringProg);
  gl.uniformMatrix4fv(rU.uVP, false, fvp);
  gl.uniform4f(rU.uColor, 0.75, 0.7, 1.0, 0.055);
  rings.forEach(function (rg) {
    bindAttr(rA.position, rg.buf, 3);
    gl.drawArrays(gl.LINE_LOOP, 0, rg.seg);
  });

  // 星云
  gl.useProgram(galaxyProg);
  gl.uniformMatrix4fv(gU.uView, false, new Float32Array(view));
  gl.uniformMatrix4fv(gU.uProj, false, new Float32Array(proj));
  gl.uniform1f(gU.uTime, t);
  gl.uniform3fv(gU.uMouse, mouseWorld);
  gl.uniform1f(gU.uMouseActive, mouseActive);
  gl.uniform1f(gU.uBurstTime, burstTime);
  gl.uniform3fv(gU.uBurstPos, burstPos);
  gl.uniform1f(gU.uSize, 42.0);
  gl.uniform1f(gU.uPixelRatio, DPR);
  bindAttr(gA.position, galaxy.pos, 3);
  bindAttr(gA.aMix, galaxy.aMix, 1);
  bindAttr(gA.aScale, galaxy.aScale, 1);
  bindAttr(gA.aPhase, galaxy.aPhase, 1);
  gl.drawArrays(gl.POINTS, 0, galaxy.count);

  // 星球投影
  var p0 = proj[0], p5 = proj[5];
  for (var i = 0; i < PROJECTS.length; i++) {
    var pr = PROJECTS[i];
    var a = pr.baseAngle + t * pr.speed;
    var wx = Math.cos(a) * pr.orbitR * ORBIT_SCALE, wy = pr.orbitY, wz = Math.sin(a) * pr.orbitR * ORBIT_SCALE;
    var vx = view[0]*wx + view[4]*wy + view[8]*wz + view[12];
    var vy = view[1]*wx + view[5]*wy + view[9]*wz + view[13];
    var vz = view[2]*wx + view[6]*wy + view[10]*wz + view[14];
    var dist = -vz;
    if (dist < 0.6) { pr.el.style.display = 'none'; pr.vis = false; continue; }
    var cw = dist; // clip.w = -vz
    var nx = (p0 * vx) / cw, ny = (p5 * vy) / cw;
    if (nx < -1.35 || nx > 1.35 || ny < -1.35 || ny > 1.35) { pr.el.style.display = 'none'; pr.vis = false; continue; }
    var sx = (nx + 1) / 2 * W, sy = (1 - ny) / 2 * H;
    var s = Math.min(1.8, Math.max(0.42, 8.5 / dist));
    var fade = Math.min(1, Math.max(0.22, (15 - dist) / 8));
    pr.el.style.display = 'block';
    pr.el.style.left = sx.toFixed(1) + 'px';
    pr.el.style.top = sy.toFixed(1) + 'px';
    pr.el.style.opacity = fade.toFixed(2);
    pr.el.style.zIndex = Math.round(1000 - dist * 40);
    var osz = Math.round(24 * pr.size * s);
    pr.orbEl.style.width = osz + 'px';
    pr.orbEl.style.height = osz + 'px';
    pr.sx = sx; pr.sy = sy; pr.vis = true;
  }
  if (tipFor >= 0 && PROJECTS[tipFor].vis) {
    tip.style.left = PROJECTS[tipFor].sx.toFixed(1) + 'px';
    tip.style.top = PROJECTS[tipFor].sy.toFixed(1) + 'px';
  }

  if (!reduceMotion) requestAnimationFrame(frame);
}

resize();
applyTheme(THEMES.violet);
if (reduceMotion) {
  var t0 = 8.0, _now = performance.now;
  performance.now = function () { return startT + t0 * 1000; };
  frame();
  performance.now = _now;
  document.getElementById('hint').textContent = '已为减少动态效果偏好渲染静态星云 · 点击星球查看项目';
} else {
  frame();
}

})();
