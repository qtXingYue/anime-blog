// ═══ 卡片交互特效：3D 倾斜 + 鼠标光晕 + 键盘 focus 态 ═══
// 从 main.js 抽出，供首页与博客共用。博客的文章卡是 fetch 后动态生成的，
// 每次重渲染都要重新绑定，所以这里做成可重复调用的函数而非一次性 IIFE。

const DISABLED = window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches;

const ACCENT_SHADOW =
  '0 24px 64px oklch(0% 0 0 / 0.3), 0 0 0 1px var(--project-accent, var(--accent))';

/**
 * @param {ParentNode} root          绑定范围，默认整个文档
 * @param {object}   opts
 * @param {string}   opts.tiltSelector   参与 3D 倾斜的元素
 * @param {string}   opts.glowSelector   参与鼠标光晕（--gx/--gy）的元素
 * @param {string?}  opts.skipWithin     命中该选择器祖先的元素跳过倾斜
 * @param {number}   opts.tiltMax        最大倾斜角度
 * @param {boolean}  opts.accentShadow   倾斜时是否同时打项目色描边阴影
 */
export function bindCardFx(root = document, {
  tiltSelector = '.project-card',
  glowSelector = '.project-card, .stat-card, .contact-item',
  skipWithin = null,
  tiltMax = 7,
  accentShadow = true,
} = {}) {
  if (DISABLED) return;

  const shadow = accentShadow ? ACCENT_SHADOW : '';

  root.querySelectorAll(tiltSelector).forEach(card => {
    if (skipWithin && card.closest(skipWithin)) return;
    if (card.dataset.cardFxTilt) return;   // 幂等：博客列表会反复重渲染
    card.dataset.cardFxTilt = '1';

    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rotY = (px - 0.5) * tiltMax * 2;
      const rotX = -(py - 0.5) * tiltMax * 2;
      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.01)`;
      if (shadow) card.style.boxShadow = shadow;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });

  root.querySelectorAll(glowSelector).forEach(card => {
    if (card.dataset.cardFxGlow) return;
    card.dataset.cardFxGlow = '1';
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });

  // 键盘导航时给卡片同样的高亮，保证 focus 可见
  root.querySelectorAll(tiltSelector).forEach(card => {
    if (skipWithin && card.closest(skipWithin)) return;
    if (card.dataset.cardFxFocus) return;
    card.dataset.cardFxFocus = '1';
    const focusable = card.matches('a, button') ? card : card.querySelector('a, button');
    if (!focusable) return;
    focusable.addEventListener('focus', () => {
      card.style.transform = 'perspective(1000px) rotateX(1.5deg) rotateY(1.5deg) scale(1.008)';
      if (shadow) card.style.boxShadow = shadow;
      card.style.setProperty('--gx', '50%');
      card.style.setProperty('--gy', '50%');
    });
    focusable.addEventListener('blur', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
      card.style.setProperty('--gx', '14%');
      card.style.setProperty('--gy', '0%');
    });
  });
}

/** 统计卡与联系卡只需要 focus 时把光晕居中，没有倾斜 */
export function bindGlowFocus(root = document, selector = '.stat-card, .contact-item') {
  if (DISABLED) return;
  root.querySelectorAll(selector).forEach(card => {
    if (card.dataset.cardFxGlowFocus) return;
    card.dataset.cardFxGlowFocus = '1';
    const focusable = card.querySelector('a, button, input, textarea');
    if (!focusable) return;
    focusable.addEventListener('focus', () => {
      card.style.setProperty('--gx', '50%');
      card.style.setProperty('--gy', '50%');
    });
    focusable.addEventListener('blur', () => {
      card.style.setProperty('--gx', '');
      card.style.setProperty('--gy', '');
    });
  });
}
