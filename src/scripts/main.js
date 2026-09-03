// ============================================================
//  QT新月 作品集 — main.js
//  全面适配 Astro 5 ClientRouter (View Transitions SPA 路由生命周期)
// ============================================================

import { bindCardFx, bindGlowFocus } from './card-fx.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CSS_SCROLL_DRIVEN = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('animation-timeline: scroll()');

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

// ═══ MOBILE DRAWER (移动端汉堡菜单) ═══
function initDrawer() {
  const hamburger = document.getElementById('hamburger');
  const drawer = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const closeBtn = document.getElementById('drawerClose');
  if (!hamburger || !drawer) return;

  function openDrawer() {
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

  hamburger.onclick = () => {
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  };
  if (closeBtn) closeBtn.onclick = closeDrawer;
  if (backdrop) backdrop.onclick = closeDrawer;

  drawer.querySelectorAll('a').forEach(link => {
    link.onclick = () => {
      if (drawer.classList.contains('open')) closeDrawer();
    };
  });
}

// ═══ ENTRANCE ANIMATION (首屏文字逐行浮现) ═══
function runEntrance() {
  const elements = document.querySelectorAll('.load-reveal');
  if (!elements.length) return;
  elements.forEach((el, i) => {
    const delay = Number(el.dataset.loadDelay || i * 80);
    window.setTimeout(() => el.classList.add('entered'), 50 + delay);
  });
}

// ═══ SCROLL PROGRESS + COMPACT HEADER ═══
function updateScroll() {
  const scrollTop = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progressBar = document.getElementById('scrollProgress');
  const siteHeader = document.getElementById('siteHeader');
  const heroVisual = document.querySelector('.hero-visual');

  if (progressBar && !CSS_SCROLL_DRIVEN) {
    progressBar.style.width = `${scrollable > 0 ? Math.min((scrollTop / scrollable) * 100, 100) : 0}%`;
  }
  if (siteHeader) {
    siteHeader.classList.toggle('scrolled', scrollTop > 80);
  }
  if (!prefersReducedMotion && scrollTop < window.innerHeight && heroVisual) {
    heroVisual.style.transform = `translateY(${scrollTop * -0.08}px)`;
  }
}
window.addEventListener('scroll', updateScroll, { passive: true });

// ═══ REVEAL ON SCROLL (IntersectionObserver 滚动视差显现) ═══
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
  const match = target.match(/^(\d+)(.*)$/);
  if (!match) return;
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
let titleMaskObserver = null;
function initTitleMasks() {
  if (prefersReducedMotion || !('IntersectionObserver' in window)) return;
  if (!titleMaskObserver) {
    titleMaskObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('lm-in');
          titleMaskObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
  }

  document.querySelectorAll('.section-title').forEach(el => {
    if (el.dataset.maskDone) return;
    const text = (el.textContent || '').trim();
    if (!text || el.querySelector('.lm-inner')) { el.dataset.maskDone = '1'; return; }
    el.classList.remove('reveal', 'visible');
    el.classList.add('lm-title');
    el.innerHTML = `<span class="lm-wrap"><span class="lm-inner">${text}</span></span>`;
    el.dataset.maskDone = '1';
    titleMaskObserver.observe(el);
  });
}

// ═══ GSAP + ScrollTrigger (粘性卡片堆叠与进度追踪) ═══
const hasGsap = !!(window.gsap && window.ScrollTrigger);
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);
}

function getShouldStack() {
  return !window.matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches;
}

const stickyTopOf = el => parseFloat(getComputedStyle(el).top) || 0;

let velocityTrigger = null;
const managedTriggers = [];
let stackCards = [];
let progressAnchors = [];
let projectProgress = null;
let projectProgressCount = null;
let projectProgressName = null;
let projectProgressType = null;
let projectProgressDots = null;
let currentProjectIdx = -1;

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

function initStacking() {
  // 刷新当前页面 DOM 元素
  stackCards = Array.from(document.querySelectorAll('.projects-stack .project-card'));
  progressAnchors = Array.from(document.querySelectorAll('[data-pp]'));
  projectProgress = document.getElementById('projectProgress');
  projectProgressCount = document.getElementById('projectProgressCount');
  projectProgressName = document.getElementById('projectProgressName');
  projectProgressType = document.getElementById('projectProgressType');
  projectProgressDots = document.getElementById('projectProgressDots');

  if (velocityTrigger) {
    velocityTrigger.kill();
    velocityTrigger = null;
  }
  managedTriggers.forEach(t => t.kill());
  managedTriggers.length = 0;

  if (!stackCards.length) return;

  if (projectProgressDots && progressAnchors.length) {
    projectProgressDots.innerHTML = progressAnchors.map((_, i) =>
      (i === 3 ? '<span class="project-progress-sep" aria-hidden="true"></span>' : '') +
      `<span class="project-progress-dot${i === 0 ? ' active' : ''}" data-project-dot="${i}"></span>`
    ).join('');
  }

  const shouldStack = getShouldStack();

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
        const depth = cards.length - 1 - i;
        const tween = gsap.to(card, {
          scale: 1 - depth * 0.05,
          y: depth * 8,
          transformOrigin: '50% 0%',
          force3D: true, overwrite: 'auto', ease: 'none',
          scrollTrigger: {
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
}

// 键盘上下导航
window.addEventListener('keydown', (e) => {
  if (!projectProgress || !projectProgress.classList.contains('active')) return;
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const direction = e.key === 'ArrowDown' ? 1 : -1;
    const targetIdx = Math.min(Math.max(0, currentProjectIdx + direction), progressAnchors.length - 1);
    if (targetIdx !== currentProjectIdx && progressAnchors[targetIdx]) {
      e.preventDefault();
      const el = progressAnchors[targetIdx];
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

// ═══ VIDEO PAUSE OFFSCREEN (hero 滚出视口即暂停背景视频) ═══
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

// ═══ SMOOTH SCROLL & ANCHORS ═══
function initScrollAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.onclick = (e) => {
      const href = link.getAttribute('href');
      if (!href || href.length < 2) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    };
  });

  document.querySelectorAll('a.brand').forEach(brand => {
    brand.onclick = (e) => {
      if (window.location.pathname === '/' || window.location.pathname === '') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (window.location.hash) {
          history.pushState('', document.title, window.location.pathname + window.location.search);
        }
      }
    };
  });

  const btt = document.getElementById('backToTop');
  if (btt) {
    window.addEventListener('scroll', () => btt.classList.toggle('visible', window.scrollY > 600), { passive: true });
  }
}

// ═══ MOBILE PROJECT TABS ═══
function initMobileProjectTabs() {
  const tabsContainer = document.getElementById('mobileProjectTabs');
  if (!tabsContainer) return;
  const buttons = tabsContainer.querySelectorAll('.mobile-tab-btn');
  if (!buttons.length) return;
  
  buttons.forEach(btn => {
    btn.onclick = () => {
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
    };
  });

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

// ═══ ANALYTICS HIT ═══
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

// ═══ 字体回流兜底 ═══
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
}

// ═══ UNIFIED PAGE LOAD LIFECYCLE (Astro 5 ClientRouter 核心生命周期中枢) ═══
function initPageLifecycle() {
  runEntrance();
  initDrawer();
  initReveal();
  initSkillTags();
  initTitleMasks();
  initStacking();
  initTimelines();
  initVideoPause();
  initScrollAnchors();
  initMobileProjectTabs();
  bindCardFx(document, { skipWithin: '.projects-stack' });
  bindGlowFocus(document);
  updateScroll();
  reportAnalytics();

  if (window.ScrollTrigger) {
    setTimeout(() => {
      window.ScrollTrigger.refresh();
    }, 150);
  }
}

// 绑定 Astro 5 视图过渡生命周期
document.addEventListener('astro:page-load', initPageLifecycle);

// 首次 DOM 就绪兜底执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPageLifecycle);
} else {
  initPageLifecycle();
}
