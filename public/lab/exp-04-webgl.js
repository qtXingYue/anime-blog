/**
 * 实验品四 · WebGL 星云 (raw WebGL, 零依赖)
 * 粒子星系:螺旋星云 + 自定义 GLSL 着色器
 * 交互:鼠标扰动星尘 / 点击释放冲击波 / 三种配色主题
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

/* ---------------- mat4 helpers ---------------- */
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

/* ---------------- gl setup ---------------- */
var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
if (!gl) { document.getElementById('nogl').style.display = 'flex'; return; }

function compile(type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    document.getElementById('nogl').style.display = 'flex';
    throw new Error('shader compile failed');
  }
  return s;
}
function program(vs, fs) {
  var p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); throw new Error('link failed'); }
  return p;
}

gl.disable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive

/* ---------------- galaxy ---------------- */
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
  '  float ang = uTime * (0.28 / (0.35 + r));', // 差速旋转:内快外慢
  '  float ca = cos(ang), sa = sin(ang);',
  '  p.xz = mat2(ca, -sa, sa, ca) * p.xz;',
  '  vec2 toM = uMouse.xz - p.xz;',              // 鼠标扰动
  '  float md = length(toM);',
  '  float infl = exp(-md * md * 0.32) * uMouseActive;',
  '  vec2 perp = vec2(-toM.y, toM.x) / (md + 0.0001);',
  '  p.xz += perp * infl * 0.7;',
  '  p.y += infl * 0.4;',
  '  float age = uTime - uBurstTime;',            // 点击冲击波
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

var galaxyProg = program(GALAXY_VS, GALAXY_FS);
var gA = {
  position: gl.getAttribLocation(galaxyProg, 'position'),
  aMix: gl.getAttribLocation(galaxyProg, 'aMix'),
  aScale: gl.getAttribLocation(galaxyProg, 'aScale'),
  aPhase: gl.getAttribLocation(galaxyProg, 'aPhase')
};
var gU = {};
['uView','uProj','uTime','uMouse','uMouseActive','uBurstTime','uBurstPos','uSize','uPixelRatio','uCore','uMid','uOuter']
  .forEach(function (n) { gU[n] = gl.getUniformLocation(galaxyProg, n); });

function buildGalaxy(count) {
  var pos = new Float32Array(count * 3);
  var aMix = new Float32Array(count);
  var aScale = new Float32Array(count);
  var aPhase = new Float32Array(count);
  var R = 5.2;
  for (var i = 0; i < count; i++) {
    var branch = i % 3;
    var radius = Math.pow(Math.random(), 0.75) * R;
    var branchAngle = (branch / 3) * Math.PI * 2 + radius * 0.55;
    var flat = 1 - (radius / R) * 0.55;
    var rx = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * 0.7 * flat;
    var ry = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * 0.38 * flat;
    var rz = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * 0.7 * flat;
    pos[i*3]   = Math.cos(branchAngle) * radius + rx;
    pos[i*3+1] = ry;
    pos[i*3+2] = Math.sin(branchAngle) * radius + rz;
    aMix[i] = radius / R;
    aScale[i] = Math.random();
    aPhase[i] = Math.random() * Math.PI * 2;
  }
  function buf(data, size) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  }
  return { pos: buf(pos, 3), aMix: buf(aMix, 1), aScale: buf(aScale, 1), aPhase: buf(aPhase, 1), count: count };
}
var galaxy = buildGalaxy(COUNT);
function bindAttr(prog, loc, buffer, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}

/* ---------------- background stars ---------------- */
var STAR_VS = [
  'attribute vec3 position;',
  'uniform mat4 uVP;',
  'uniform float uPixelRatio;',
  'varying float vA;',
  'void main() {',
  '  gl_Position = uVP * vec4(position, 1.0);',
  '  gl_PointSize = 2.0 * uPixelRatio;',
  '  vA = 0.25 + 0.35 * fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);',
  '}'
].join('\n');
var STAR_FS = [
  'precision mediump float;',
  'varying float vA;',
  'void main() {',
  '  float d = length(gl_PointCoord - vec2(0.5));',
  '  float a = smoothstep(0.5, 0.1, d) * vA;',
  '  gl_FragColor = vec4(0.54, 0.53, 0.72, a);',
  '}'
].join('\n');
var starProg = program(STAR_VS, STAR_FS);
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

/* ---------------- state & interaction ---------------- */
var mouseNdc = [0, 0];
var mouseWorld = [0, -100, 0];
var camOff = [0, 0];
var mouseActive = 0;
var burstTime = -10;
var burstPos = [0, 0, 0];
var autoRotate = !reduceMotion;
var startT = performance.now();

function unproject(nx, ny, invVP) {
  function xform(x, y, z) {
    var w = invVP[3]*x + invVP[7]*y + invVP[11]*z + invVP[15];
    return [(invVP[0]*x + invVP[4]*y + invVP[8]*z + invVP[12]) / w,
            (invVP[1]*x + invVP[5]*y + invVP[9]*z + invVP[13]) / w,
            (invVP[2]*x + invVP[6]*y + invVP[10]*z + invVP[14]) / w];
  }
  var p1 = xform(nx, ny, -1), p2 = xform(nx, ny, 1);
  var dx = p2[0]-p1[0], dy = p2[1]-p1[1], dz = p2[2]-p1[2];
  var t = -p1[1] / dy;
  return [p1[0] + dx*t, 0, p1[2] + dz*t];
}

var invVP = null;
window.addEventListener('pointermove', function (e) {
  mouseNdc = [(e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)];
  mouseActive = 1;
}, { passive: true });
window.addEventListener('pointerdown', function (e) {
  if (e.target !== canvas) return; // 只响应画布上的点击,不干扰 UI 按钮
  var nx = (e.clientX / window.innerWidth) * 2 - 1;
  var ny = -((e.clientY / window.innerHeight) * 2 - 1);
  if (invVP) {
    burstPos = unproject(nx, ny, invVP);
    burstTime = (performance.now() - startT) / 1000;
  }
});
document.addEventListener('mouseleave', function () { mouseActive = 0; });

/* ---------------- ui ---------------- */
var themeName = document.getElementById('themeName');
document.getElementById('countLabel').textContent = COUNT.toLocaleString('en-US') + ' 粒子';
document.getElementById('themeBtn').addEventListener('click', function () {
  themeIdx = (themeIdx + 1) % themeKeys.length;
  var t = THEMES[themeKeys[themeIdx]];
  document.body.style.background = t.bg;
  themeName.textContent = t.name;
  applyTheme(t);
});
var rotBtn = document.getElementById('rotBtn');
function syncRotBtn() {
  rotBtn.textContent = autoRotate ? '自动旋转 · 开' : '自动旋转 · 关';
  rotBtn.classList.toggle('off', !autoRotate);
}
rotBtn.addEventListener('click', function () { autoRotate = !autoRotate; syncRotBtn(); });
syncRotBtn();
function applyTheme(t) {
  gl.useProgram(galaxyProg);
  gl.uniform3fv(gU.uCore, t.core);
  gl.uniform3fv(gU.uMid, t.mid);
  gl.uniform3fv(gU.uOuter, t.outer);
  bgColor = t.css;
}
var bgColor = THEMES.violet.css;

function resize() {
  canvas.width = Math.floor(window.innerWidth * DPR);
  canvas.height = Math.floor(window.innerHeight * DPR);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

/* ---------------- main loop ---------------- */
var proj = mat4Perspective(58 * Math.PI / 180, window.innerWidth / window.innerHeight, 0.1, 200);

function frame() {
  var t = (performance.now() - startT) / 1000;
  var orb = autoRotate ? t * 0.06 : 0;
  camOff[0] += (mouseNdc[0] * 0.9 - camOff[0]) * 0.04;
  camOff[1] += (mouseNdc[1] * 0.5 - camOff[1]) * 0.04;
  var eye = [Math.sin(orb) * 1.4 + camOff[0], 2.4 + camOff[1], Math.cos(orb) * 1.4 + 7.8];
  var view = mat4LookAt(eye, [0, 0, 0], [0, 1, 0]);
  var vp = mat4Mul(proj, view);
  invVP = mat4Invert(vp);

  // mouse -> world (lerped)
  var hit = unproject(mouseNdc[0], mouseNdc[1], invVP);
  mouseWorld[0] += (hit[0] - mouseWorld[0]) * 0.12;
  mouseWorld[2] += (hit[2] - mouseWorld[2]) * 0.12;

  gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // stars
  gl.useProgram(starProg);
  gl.uniformMatrix4fv(sU.uVP, false, new Float32Array(vp));
  gl.uniform1f(sU.uPixelRatio, DPR);
  bindAttr(starProg, sA.position, starBuf.buf, 3);
  gl.drawArrays(gl.POINTS, 0, starBuf.count);

  // galaxy
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
  bindAttr(galaxyProg, gA.position, galaxy.pos, 3);
  bindAttr(galaxyProg, gA.aMix, galaxy.aMix, 1);
  bindAttr(galaxyProg, gA.aScale, galaxy.aScale, 1);
  bindAttr(galaxyProg, gA.aPhase, galaxy.aPhase, 1);
  gl.drawArrays(gl.POINTS, 0, galaxy.count);

  if (!reduceMotion) requestAnimationFrame(frame);
}

applyTheme(THEMES.violet);
if (reduceMotion) {
  // 静态渲染一帧
  var t0 = 8.0;
  var _now = performance.now;
  performance.now = function () { return startT + t0 * 1000; };
  frame();
  performance.now = _now;
  document.getElementById('hint').textContent = '已为减少动态效果偏好渲染静态星云';
} else {
  frame();
}

})();
