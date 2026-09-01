// ============================================================
//  QT新月 作品集 — main.js
// ============================================================

import { bindCardFx, bindGlowFocus } from './card-fx.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ═══ TURBO TOP LOADER (毫秒级顶部极速光感进度条) ═══
function getOrCreateTurboLoader() {
  let loader = document.getElementById('turbo-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'turbo-loader';
    document.body.appendChild(loader);
  }
  return loader;
}

document.addEventListener('astro:before-preparation', () => {
  const loader = getOrCreateTurboLoader();
  loader.className = 'loading';
});

document.addEventListener('astro:page-load', () => {
  const loader = getOrCreateTurboLoader();
  loader.className = 'completed';
  setTimeout(() => {
    loader.className = '';
  }, 380);
});

// ═══ MOBILE DRAWER ═══
(function initDrawer() {
  const hamburger = document.getElementById('hamburger');
  const drawer = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const closeBtn = document.getElementById('drawerClose');
  if (!hamburger || !drawer) return;

  let scrollY = 0;

  function openDrawer() {
    scrollY = window.scrollY;
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (drawer.classList.contains('open')) closeDrawer();
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
      hamburger.focus();
    }
  });
})();

// ═══ ENTRANCE ANIMATION ═══
(function initEntrance() {
  function runEntrance() {
    document.querySelectorAll('.load-reveal').forEach((el, i) => {
      const delay = Number(el.dataset.loadDelay || i * 100);
      window.setTimeout(() => el.classList.add('entered'), 180 + delay);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(runEntrance));
  } else {
    requestAnimationFrame(runEntrance);
  }
  window.addEventListener('pageshow', () => {
    document.querySelectorAll('.load-reveal').forEach(el => el.classList.add('entered'));
  });
})();

// ═══ SCROLL PROGRESS + COMPACT HEADER ═══
const CSS_SCROLL_DRIVEN = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('animation-timeline: scroll()');
const progressBar = document.getElementById('scrollProgress');
const siteHeader = document.getElementById('siteHeader');
const heroVisual = document.querySelector('.hero-visual');

function updateScroll() {
  const scrollTop = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  // 支持 CSS scroll-driven 的浏览器由样式表 scaleX 驱动(合成器线程),JS 不再写 width
  if (progressBar && !CSS_SCROLL_DRIVEN) progressBar.style.width = `${scrollable > 0 ? Math.min((scrollTop / scrollable) * 100, 100) : 0}%`;
  if (siteHeader) siteHeader.classList.toggle('scrolled', scrollTop > 80);
  if (!prefersReducedMotion && scrollTop < window.innerHeight && heroVisual) {
    heroVisual.style.transform = `translateY(${scrollTop * -0.08}px)`;
  }
}
window.addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

// ═══ REVEAL ON SCROLL (IntersectionObserver — reliable mechanism) ═══
function initReveal() {
  const revealElements = document.querySelectorAll('.reveal, [data-reveal]');

  if (prefersReducedMotion) {
    revealElements.forEach(el => {
      if (!el.closest('.projects-stack')) el.classList.add('visible');
    });
    document.querySelectorAll('.project-card').forEach(card => card.classList.add('visible'));
    return;
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseInt(el.dataset.revealDelay || '0');
        setTimeout(() => {
          el.classList.add('visible');
          el.style.opacity = '';
          el.style.transform = '';
          el.style.filter = '';
        }, delay);
        revealObserver.unobserve(el);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  revealElements.forEach(el => {
    if (!el.closest('.projects-stack')) {
      revealObserver.observe(el);
    }
  });

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const cards = Array.from(document.querySelectorAll('.projects-stack .project-card'));
        const idx = cards.indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('visible');
          entry.target.style.opacity = '';
          entry.target.style.transform = '';
          entry.target.style.filter = '';
        }, Math.min(idx * 80, 400));
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.project-card').forEach(card => cardObserver.observe(card));

  // Stat number count-up animation
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const numEl = entry.target.querySelector('.stat-number');
        if (numEl && !numEl.dataset.counted) {
          countUp(numEl);
          numEl.dataset.counted = '1';
        }
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.stat-card').forEach(card => statObserver.observe(card));
}

// ═══ COUNT-UP for stat numbers ═══
function countUp(el) {
  const target = el.dataset.countTarget || el.textContent;
  // 提取数字部分和后缀
  const match = target.match(/^(\d+)(.*)$/);
  if (!match) return; // 非纯数字（如"省二等"、"HCCDA"）不动画
  const end = parseInt(match[1], 10);
  const suffix = match[2];
  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(end * ease) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ═══ SKILL TAGS STAGGER ═══
function initSkillTags() {
  // 只处理技能区自己的标签。早先这里选的是全站 .skill-tag，
  // 而下面的 observer 只观察 .skill-category——项目卡里的技术标签
  // 被设成透明后永远没人恢复，线上一直处于隐形状态。
  const staggerTags = document.querySelectorAll('.skill-category .skill-tag');

  if (prefersReducedMotion) {
    staggerTags.forEach(tag => {
      tag.style.opacity = '1';
      tag.style.transform = 'translateY(0)';
    });
    return;
  }

  staggerTags.forEach(tag => {
    tag.style.opacity = '0';
    tag.style.transform = 'translateY(8px)';
  });

  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const tags = entry.target.querySelectorAll('.skill-tag');
        tags.forEach((tag, i) => {
          setTimeout(() => {
            tag.style.transition = 'all 0.4s var(--ease-out-expo)';
            tag.style.opacity = '1';
            tag.style.transform = 'translateY(0)';
          }, i * 40);
        });
        skillObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.skill-category').forEach(g => skillObserver.observe(g));
}

// ═══ LINE-MASK TITLE REVEAL (行遮罩式标题入场) ═══
// 把 .section-title 的文字包进 overflow:hidden 遮罩,入视口时整行从下方滑入。
// 与 .reveal 整块淡入互斥:被处理的标题摘掉 reveal 类,由遮罩接管入场。
const titleMaskObserver = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('lm-in');
      titleMaskObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 }) : null;

function initTitleMasks() {
  if (prefersReducedMotion || !titleMaskObserver) return;
  document.querySelectorAll('.section-title').forEach(el => {
    if (el.dataset.maskDone) return;
    const text = (el.textContent || '').trim();
    if (!text || el.querySelector('.lm-inner')) { el.dataset.maskDone = '1'; return; }
    // 标题都是纯文本模板输出,这里才敢回填 innerHTML
    el.classList.remove('reveal', 'visible');
    el.classList.add('lm-title');
    el.innerHTML = `<span class="lm-wrap"><span class="lm-inner">${text}</span></span>`;
    el.dataset.maskDone = '1';
    titleMaskObserver.observe(el);
  });
}

// ═══ INITIALIZE AFTER LAYOUT IS READY ═══
// ES modules execute after DOM parsing, but we need 2 rAFs to ensure layout is complete
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    initTitleMasks();
    initReveal();
    initSkillTags();
  });
});

// Safety net: if still not visible after 2s, force show all reveal elements
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.visible), [data-reveal]:not(.visible)').forEach(el => {
    if (!el.closest('.projects-stack')) {
      el.classList.add('visible');
      el.style.opacity = '';
      el.style.transform = '';
      el.style.filter = '';
    }
  });
}, 2000);

// ═══ GSAP + ScrollTrigger (for advanced animations only) ═══
const hasGsap = !!(window.gsap && window.ScrollTrigger);
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);
}

function getShouldStack() {
  return !window.matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches;
}

// sticky 卡片吸顶后停在视口的哪个高度（CSS 里按 --card-i 逐层错开），
// 堆叠动画的起止点要拿它对齐，写死百分比在不同视口高度下会错位
const stickyTopOf = el => parseFloat(getComputedStyle(el).top) || 0;

// ═══ STICKY PROJECT CARD STACKING + PROGRESS WIDGET ═══
// 参与粘性堆叠的只有特写级大卡；进度器的锚点还额外包含两条 band-rule，
// 这样滚过专题区与索引区时挂件不会空转。DOM 顺序即锚点顺序，天然单调。
const stackCards = Array.from(document.querySelectorAll('.projects-stack .project-card'));
const progressAnchors = Array.from(document.querySelectorAll('[data-pp]'));

const projectProgress = document.getElementById('projectProgress');
const projectProgressCount = document.getElementById('projectProgressCount');
const projectProgressName = document.getElementById('projectProgressName');
const projectProgressType = document.getElementById('projectProgressType');
const projectProgressDots = document.getElementById('projectProgressDots');

let currentProjectIdx = -1;

if (projectProgressDots && progressAnchors.length) {
  // 特写与后面两个 band 之间插一条短横线，暗示它们不是同一量级
  projectProgressDots.innerHTML = progressAnchors.map((_, i) =>
    (i === 3 ? '<span class="project-progress-sep" aria-hidden="true"></span>' : '') +
    `<span class="project-progress-dot${i === 0 ? ' active' : ''}" data-project-dot="${i}"></span>`
  ).join('');
}

function setCurrentProjectByIndex(index) {
  if (!progressAnchors.length || index === currentProjectIdx) return;
  if (index < 0 || index >= progressAnchors.length) return;
  currentProjectIdx = index;
  const el = progressAnchors[index];

  stackCards.forEach(card => card.classList.toggle('is-current', card === el));
  const current = String(index + 1).padStart(2, '0');
  const total = String(progressAnchors.length).padStart(2, '0');
  if (projectProgress) {
    const progress = progressAnchors.length > 1 ? index / (progressAnchors.length - 1) : 1;
    projectProgress.style.setProperty('--project-progress-fill', progress.toFixed(3));
  }
  if (projectProgressCount) projectProgressCount.innerHTML = `<b>${current}</b><small>/ ${total}</small>`;
  // 类型与名称直接读 data 属性，不再靠解析 .project-number 的文本
  if (projectProgressType) projectProgressType.textContent = el.dataset.ppType || '项目';
  if (projectProgressName) projectProgressName.textContent = el.dataset.ppName || '项目作品';
  if (projectProgressDots) {
    projectProgressDots.querySelectorAll('.project-progress-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.classList.toggle('completed', i < index);
    });
  }
}

function setProjectsProgressVisible(visible) {
  if (projectProgress) projectProgress.classList.toggle('active', visible);
}

let velocityTrigger = null;
let pageshowBound = false;
// initStacking 会在每次 resize 时重建 trigger，不回收的话数量会随 resize 次数线性增长。
// 压缩补间和它的 trigger 也要登记进来：漏掉的话，桌面拖到手机宽度后旧 trigger 还活着，
// 会把 transform 重新写回已经解除堆叠的卡片上
const managedTriggers = [];

function initStacking() {
  const shouldStack = getShouldStack();

  if (velocityTrigger) {
    velocityTrigger.kill();
    velocityTrigger = null;
  }
  managedTriggers.forEach(t => t.kill());
  managedTriggers.length = 0;

  if (!shouldStack) {
    stackCards.forEach((card, i) => {
      card.style.top = '';
      card.style.zIndex = `${i + 1}`;
      card.style.transform = '';
      card.classList.remove('is-current');
    });
    if (projectProgress) projectProgress.classList.remove('active');
    currentProjectIdx = -1;
    return;
  }

  currentProjectIdx = -1;
  if (progressAnchors.length) setCurrentProjectByIndex(0);

  document.querySelectorAll('.projects-stack').forEach(stack => {
    const cards = stack.querySelectorAll('.project-card');
    cards.forEach((card, i) => {
      card.style.setProperty('--card-i', i);
      card.style.zIndex = `${i + 1}`;

      if (i < cards.length - 1 && hasGsap) {
        const next = cards[i + 1];
        // 越靠下层压得越狠。原来是 0.955 - i*0.02，也就是最底下那张反而最大，
        // 层次是反的；每张卡只被触发一次，所以终值要直接按「离最上层几层」给
        const depth = cards.length - 1 - i;
        const tween = gsap.to(card, {
          scale: 1 - depth * 0.05,
          y: depth * 8,
          // 从顶边缩：卡片露在上面的那道边不会被缩没，三张卡的露边等宽
          transformOrigin: '50% 0%',
          force3D: true, overwrite: 'auto', ease: 'none',
          scrollTrigger: {
            // 本卡一吸顶就开始缩，一直缩到下一张卡吸顶盖满为止——整段「在位」时间
            // 都在动，所以从第一张卡起就能看到缩放。早先起点挂在下一张卡身上
            // （顶边够到本卡底边才开始），前面那截是完全静止的
            trigger: card,
            start: () => `top ${Math.round(stickyTopOf(card))}px`,
            endTrigger: next,
            end: () => `top ${Math.round(stickyTopOf(next))}px`,
            scrub: 0.4,
            fastScrollEnd: true,
            invalidateOnRefresh: true,
          }
        });
        if (tween.scrollTrigger) managedTriggers.push(tween.scrollTrigger);
        managedTriggers.push(tween);
      }
    });
  });

  progressAnchors.forEach((el, globalIdx) => {
    if (hasGsap) {
      managedTriggers.push(ScrollTrigger.create({
        trigger: el,
        start: 'top 42%',
        end: 'bottom 58%',
        onEnter: () => setCurrentProjectByIndex(globalIdx),
        onEnterBack: () => setCurrentProjectByIndex(globalIdx),
      }));
    }
  });

  if (hasGsap) {
    // 回退链是追加而非替换：万一哪天 id 改了，挂件不会静默提前消失
    const lastProjectSection =
      document.getElementById('projects-more') ||
      document.getElementById('projects-web') ||
      document.getElementById('projects-ai') ||
      document.getElementById('projects');

    managedTriggers.push(ScrollTrigger.create({
      trigger: '#projects',
      start: 'top 35%',
      endTrigger: lastProjectSection,
      end: 'bottom 65%',
      onEnter: () => setProjectsProgressVisible(true),
      onEnterBack: () => setProjectsProgressVisible(true),
      onLeave: () => setProjectsProgressVisible(false),
      onLeaveBack: () => setProjectsProgressVisible(false),
    }));
  }

  // Spring physics stacking skew on scroll velocity
  if (hasGsap && stackCards.length) {
    velocityTrigger = ScrollTrigger.create({
      onUpdate: (self) => {
        const vel = self.getVelocity();
        let skew = vel / 2500;
        if (Math.abs(skew) > 0.06) skew = Math.sign(skew) * 0.06;
        stackCards.forEach((card) => {
          if (!card.classList.contains('visible')) return;
          // 这里只动 skewY。原来还写 scaleY 和 y：它们和堆叠压缩动的是同一批属性，
          // 而这个 tween 每帧重建且 overwrite:'auto'，等于每帧把压缩的缩放按回 1
          // （慢滚时 skew≈0 → scaleY≈1），压缩因此几乎看不见；y 用 '+=' 还会逐帧累积漂移
          gsap.to(card, {
            skewY: skew * 6,
            duration: 0.5,
            ease: "power3.out",
            overwrite: "auto",
            force3D: true
          });
        });
      }
    });
  }

  // bfcache 恢复后 ScrollTrigger 的状态可能失效，重算一次由它自己决定显隐；
  // 早先这里无条件设为可见，导致刚进首页（还没滚到项目区）挂件就浮在右侧
  if (!pageshowBound) {
    pageshowBound = true;
    window.addEventListener('pageshow', () => requestAnimationFrame(() => {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }));
  }
}

// ═══ INIT STACKING after layout ═══
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    initStacking();
  });
});

// ═══ KEYBOARD ARROW NAVIGATION FOR CARDS ═══
window.addEventListener('keydown', (e) => {
  if (!projectProgress || !projectProgress.classList.contains('active')) return;
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const direction = e.key === 'ArrowDown' ? 1 : -1;
    const targetIdx = Math.min(Math.max(0, currentProjectIdx + direction), progressAnchors.length - 1);
    if (targetIdx !== currentProjectIdx && progressAnchors[targetIdx]) {
      e.preventDefault();
      const el = progressAnchors[targetIdx];
      // band-rule 是一条细线，居中滚会把它下面的内容推出视口
      el.scrollIntoView({
        behavior: 'smooth',
        block: el.classList.contains('project-card') ? 'center' : 'start',
      });
    }
  }
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    initStacking();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }, 300);
});

// ═══ TIMELINE DRAWING ═══
function initTimelines() {
  document.querySelectorAll('.timeline').forEach(tl => {
    const fill = tl.querySelector('.timeline-track-fill');
    const dots = tl.querySelectorAll('.timeline-dot');
    const contents = tl.querySelectorAll('.timeline-content');

    if (fill) {
      if (hasGsap) {
        gsap.to(fill, {
          height: '100%', ease: 'none',
          scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: 0.8 }
        });
      } else {
        fill.style.height = '100%';
      }
    }

    tl.querySelectorAll('.timeline-item').forEach((item, i) => {
      const activateItem = () => {
        if (dots[i]) dots[i].classList.add('active');
        setTimeout(() => { if (contents[i]) contents[i].classList.add('active'); }, 150);
      };

      if (hasGsap) {
        ScrollTrigger.create({
          trigger: item, start: 'top 82%',
          onEnter: activateItem, onEnterBack: activateItem,
          onLeaveBack: () => {
            if (dots[i]) dots[i].classList.remove('active');
            if (contents[i]) contents[i].classList.remove('active');
          }
        });
      } else {
        const tlObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              activateItem();
              tlObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.2 });
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) {
          activateItem();
        } else {
          tlObserver.observe(item);
        }
      }
    });
  });
}

// ═══ INIT TIMELINES after layout ═══
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    initTimelines();
  });
});

// ═══ VIDEO PAUSE OFFSCREEN (hero 滚出视口即暂停背景视频) ═══
// 只在"本来就在播"时恢复,不抢 VideoBg 自身的启停逻辑(省流模式/reduced-motion 不受影响)
function initVideoPause() {
  const hero = document.querySelector('.hero');
  if (!hero || hero.dataset.videoPauseInit || !('IntersectionObserver' in window)) return;
  hero.dataset.videoPauseInit = '1';
  const layers = () => document.querySelectorAll('.bg-video-layer');
  let wasPlaying = false;
  new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (wasPlaying) {
          const active = document.querySelector('.bg-video-layer.active') || layers()[0];
          if (active) active.play().catch(() => {});
        }
      } else {
        wasPlaying = Array.from(layers()).some(v => !v.paused && !v.ended);
        if (wasPlaying) layers().forEach(v => v.pause());
      }
    });
  }, { threshold: 0.05 }).observe(hero);
}

// ═══ SMOOTH SCROLL ═══
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || href.length < 2) return;
    const target = document.querySelector(href);
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ═══ BACK TO TOP ═══
const btt = document.getElementById('backToTop');
if (btt) {
  window.addEventListener('scroll', () => btt.classList.toggle('visible', window.scrollY > 600), { passive: true });
}

// ═══ MOBILE PROJECT TABS (移动端分类吸顶筛选与平滑滚动定位) ═══
function initMobileProjectTabs() {
  const tabsContainer = document.getElementById('mobileProjectTabs');
  if (!tabsContainer) return;
  const buttons = tabsContainer.querySelectorAll('.mobile-tab-btn');
  if (!buttons.length) return;
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSelector = btn.getAttribute('data-target');
      if (!targetSelector) return;
      const targetEl = document.querySelector(targetSelector);
      if (targetEl) {
        const headerOffset = 110;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // 滚动监听高亮
  const sections = [
    { target: document.getElementById('projects'), btn: buttons[0] },
    { target: document.querySelector('.projects-stack--feature'), btn: buttons[1] },
    { target: document.getElementById('bandDepth'), btn: buttons[2] },
    { target: document.getElementById('bandIndex'), btn: buttons[3] },
  ].filter(item => item.target && item.btn);

  let tabScrollTimer = null;
  window.addEventListener('scroll', () => {
    if (window.innerWidth > 768) return;
    if (tabScrollTimer) return;
    tabScrollTimer = requestAnimationFrame(() => {
      const scrollPos = window.scrollY + 180;
      let activeIndex = 0;
      sections.forEach((s, idx) => {
        if (s.target.offsetTop <= scrollPos) {
          activeIndex = idx;
        }
      });
      buttons.forEach((b, idx) => {
        b.classList.toggle('active', idx === activeIndex);
      });
      tabScrollTimer = null;
    });
  }, { passive: true });
}

requestAnimationFrame(() => {
  initMobileProjectTabs();
});

// ═══ 3D TILT on project cards + GLOW on stat/contact/project cards + A11y Focus ═══
// 实现在 card-fx.js，博客页复用同一套（那边的文章卡是动态渲染，需要重复绑定）
// 中卡与索引行刻意不参与倾斜：它们靠平移+描边表达可点，倾斜是大卡量级的语言
bindCardFx(document, { skipWithin: '.projects-stack' });
bindGlowFocus(document);

// ═══ CONTACT FORM ═══
window.handleContactSubmit = async function(e) {
  e.preventDefault();
  const form = document.getElementById('contactForm');
  const msg = document.getElementById('formMsg');
  if (!form || !msg) return;
  msg.className = 'form-msg'; msg.textContent = '发送中...';

  const payload = { name: form.name.value, email: form.email.value, message: form.message.value };
  const bodyText = `来自 ${payload.name} (${payload.email})\n\n${payload.message}`;
  const mailto = `contact@qtxingyue.me?subject=${encodeURIComponent(`QT新月 作品集留言 - ${payload.name}`)}&body=${encodeURIComponent(bodyText)}`;

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) { msg.textContent = '发送成功！感谢你的留言 ✦'; form.reset(); }
    else { const err = await res.json(); msg.className = 'form-msg error'; msg.textContent = err.detail || '发送失败'; }
  } catch(e) {
    window.location.href = 'mailto:' + mailto;
    msg.textContent = '已唤起邮件客户端，请手动发送；或尝试通过 GitHub 联系。';
  }
};

// ═══ ANALYTICS HIT (Sakura Backend) ═══
// sendBeacon 不阻塞、页面卸载也可靠送达;挂在 astro:page-load 上,
// 首次加载与 SPA 路由切换都会上报(旧实现只在整页加载时上报,SPA 内导航漏计)
function reportAnalytics() {
  try {
    const payload = JSON.stringify({ path: location.pathname, ref: document.referrer || '' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/hit', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/hit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  } catch (e) {}
}
document.addEventListener('astro:page-load', reportAnalytics);

// ═══ 字体回流兜底：思源宋体加载完成后标题高度会变，重算 ScrollTrigger 位置 ═══
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
}

// ═══ 路由页面切换安全重新绑定 (SPA 无缝流体路由) ═══
document.addEventListener('astro:page-load', () => {
  initTitleMasks();
  initVideoPause();
  bindCardFx(document, { skipWithin: '.projects-stack' });
  bindGlowFocus(document);
  initMobileProjectTabs();
  updateScroll();
  if (window.ScrollTrigger) {
    window.ScrollTrigger.refresh();
  }
});
