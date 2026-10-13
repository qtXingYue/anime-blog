/**
 * 实验品四 · WebGL 星云
 * Three.js 粒子星系:螺旋星云 + 自定义 GLSL 着色器
 * 交互:鼠标扰动星尘 / 点击释放冲击波 / 三种配色主题
 */
import * as THREE from 'three';

const canvas = document.getElementById('scene');
const isMobile = matchMedia('(max-width: 768px)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COUNT = isMobile ? 12000 : 26000;

const THEMES = {
  violet:  { core: '#fff6d8', mid: '#a855f7', outer: '#2a1a5e', bg: '#060310', name: '紫金星云' },
  ice:     { core: '#e8fbff', mid: '#38bdf8', outer: '#0e2140', bg: '#030710', name: '冰蓝星云' },
  crimson: { core: '#ffe9ec', mid: '#fb7185', outer: '#47101c', bg: '#0e0408', name: '绯红星云' },
};
const themeKeys = Object.keys(THEMES);
let themeIdx = 0;

/* ---------- renderer / scene ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  document.getElementById('nogl').style.display = 'flex';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 2.4, 9.2);
camera.lookAt(0, 0, 0);

/* ---------- galaxy particles ---------- */
function buildGalaxy(count) {
  const pos = new Float32Array(count * 3);
  const aMix = new Float32Array(count);
  const aScale = new Float32Array(count);
  const aPhase = new Float32Array(count);
  const R = 5.2;
  for (let i = 0; i < count; i++) {
    const branch = i % 3;
    const radius = Math.pow(Math.random(), 0.75) * R;
    const branchAngle = (branch / 3) * Math.PI * 2 + radius * 0.55;
    const flat = 1 - (radius / R) * 0.55;
    const rx = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * 0.7 * flat;
    const ry = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * 0.38 * flat;
    const rz = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * 0.7 * flat;
    pos[i * 3] = Math.cos(branchAngle) * radius + rx;
    pos[i * 3 + 1] = ry;
    pos[i * 3 + 2] = Math.sin(branchAngle) * radius + rz;
    aMix[i] = radius / R;
    aScale[i] = Math.random();
    aPhase[i] = Math.random() * Math.PI * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aMix', new THREE.BufferAttribute(aMix, 1));
  g.setAttribute('aScale', new THREE.BufferAttribute(aScale, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  return g;
}

const uniforms = {
  uTime: { value: 0 },
  uSize: { value: 42.0 },
  uMouse: { value: new THREE.Vector3(0, -100, 0) },
  uMouseActive: { value: 0 },
  uBurstTime: { value: -10 },
  uBurstPos: { value: new THREE.Vector3() },
  uCore: { value: new THREE.Color(THEMES.violet.core) },
  uMid: { value: new THREE.Color(THEMES.violet.mid) },
  uOuter: { value: new THREE.Color(THEMES.violet.outer) },
};

const galaxyMat = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    uniform float uTime;
    uniform vec3 uMouse;
    uniform float uMouseActive;
    uniform float uBurstTime;
    uniform vec3 uBurstPos;
    uniform float uSize;
    attribute float aMix;
    attribute float aScale;
    attribute float aPhase;
    varying float vMix;
    varying float vTwinkle;
    void main() {
      vec3 p = position;
      float r = length(p.xz) + 0.0001;
      // 差速旋转:内快外慢
      float ang = uTime * (0.28 / (0.35 + r));
      float ca = cos(ang), sa = sin(ang);
      p.xz = mat2(ca, -sa, sa, ca) * p.xz;
      // 鼠标扰动:切向涡流 + 上浮
      vec2 toM = uMouse.xz - p.xz;
      float md = length(toM);
      float infl = exp(-md * md * 0.32) * uMouseActive;
      vec2 perp = vec2(-toM.y, toM.x) / (md + 0.0001);
      p.xz += perp * infl * 0.7;
      p.y += infl * 0.4;
      // 点击冲击波
      float age = uTime - uBurstTime;
      if (uBurstTime > 0.0 && age > 0.0 && age < 4.0) {
        vec3 toP = p - uBurstPos;
        float d = length(toP);
        float front = age * 7.0;
        float band = exp(-pow(d - front, 2.0) / 2.2) * exp(-age * 1.15);
        p += (toP / (d + 0.0001)) * band * 1.7;
      }
      vMix = aMix;
      vTwinkle = 0.72 + 0.28 * sin(uTime * 2.2 + aPhase);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = uSize * (0.32 + aScale * 0.95) * vTwinkle * (1.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uCore;
    uniform vec3 uMid;
    uniform vec3 uOuter;
    varying float vMix;
    varying float vTwinkle;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      float a = pow(smoothstep(0.5, 0.04, d), 1.7);
      vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.45, vMix));
      col = mix(col, uOuter, smoothstep(0.4, 1.0, vMix));
      col *= 0.72 + 0.5 * vTwinkle;
      gl_FragColor = vec4(col, a);
    }
  `,
});
scene.add(new THREE.Points(buildGalaxy(COUNT), galaxyMat));

/* ---------- background stars ---------- */
{
  const n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(28 + Math.random() * 40);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0x8a86b8, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0.55, depthWrite: false,
  }));
  stars.name = 'stars';
  scene.add(stars);
}

/* ---------- interaction ---------- */
const mouseNdc = new THREE.Vector2(0, 0);
const mouseWorld = new THREE.Vector3(0, -100, 0);
const camTarget = new THREE.Vector2(0, 0);
let autoRotate = !reduceMotion;
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ray = new THREE.Raycaster();

addEventListener('pointermove', (e) => {
  mouseNdc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  uniforms.uMouseActive.value = 1;
}, { passive: true });

addEventListener('pointerdown', (e) => {
  mouseNdc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouseNdc, camera);
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(plane, hit)) {
    uniforms.uBurstPos.value.copy(hit);
    uniforms.uBurstTime.value = uniforms.uTime.value;
  }
});

addEventListener('pointerleave', () => { uniforms.uMouseActive.value = 0; });
document.addEventListener('mouseleave', () => { uniforms.uMouseActive.value = 0; });

/* ---------- ui ---------- */
const themeName = document.getElementById('themeName');
const countLabel = document.getElementById('countLabel');
countLabel.textContent = COUNT.toLocaleString('en-US') + ' 粒子';
document.getElementById('themeBtn').addEventListener('click', () => {
  themeIdx = (themeIdx + 1) % themeKeys.length;
  const t = THEMES[themeKeys[themeIdx]];
  uniforms.uCore.value.set(t.core);
  uniforms.uMid.value.set(t.mid);
  uniforms.uOuter.value.set(t.outer);
  document.body.style.background = t.bg;
  themeName.textContent = t.name;
});
const rotBtn = document.getElementById('rotBtn');
function syncRotBtn() { rotBtn.textContent = autoRotate ? '自动旋转 · 开' : '自动旋转 · 关'; rotBtn.classList.toggle('off', !autoRotate); }
rotBtn.addEventListener('click', () => { autoRotate = !autoRotate; syncRotBtn(); });
syncRotBtn();

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

/* ---------- loop ---------- */
const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  uniforms.uTime.value = t;
  // mouse -> world (lerped)
  ray.setFromCamera(mouseNdc, camera);
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(plane, hit)) {
    mouseWorld.lerp(hit, 0.12);
    uniforms.uMouse.value.copy(mouseWorld);
  }
  // camera parallax + slow orbit
  camTarget.lerp(new THREE.Vector2(mouseNdc.x * 0.9, mouseNdc.y * 0.5), 0.04);
  const orb = autoRotate ? t * 0.06 : 0;
  camera.position.x = Math.sin(orb) * 1.4 + camTarget.x;
  camera.position.y = 2.4 + camTarget.y;
  camera.position.z = Math.cos(orb) * 1.4 + 9.2 - 1.4;
  camera.lookAt(0, 0, 0);
  const stars = scene.getObjectByName('stars');
  if (stars) stars.rotation.y = t * 0.004;
  renderer.render(scene, camera);
  if (!reduceMotion) requestAnimationFrame(tick);
}
if (reduceMotion) {
  uniforms.uTime.value = 8.0;
  renderer.render(scene, camera);
  document.getElementById('hint').textContent = '已为减少动态效果偏好渲染静态星云';
} else {
  tick();
}
