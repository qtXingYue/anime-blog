// ============================================================
//  QT新月 作品集 — main.js
// ============================================================

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
const progressBar = document.getElementById('scrollProgress');
const siteHeader = document.getElementById('siteHeader');
const heroVisual = document.querySelector('.hero-visual');

function updateScroll() {
  const scrollTop = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (progressBar) progressBar.style.width = `${scrollable > 0 ? Math.min((scrollTop / scrollable) * 100, 100) : 0}%`;
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
  if (prefersReducedMotion) {
    document.querySelectorAll('.skill-tag').forEach(tag => {
      tag.style.opacity = '1';
      tag.style.transform = 'translateY(0)';
    });
    return;
  }

  document.querySelectorAll('.skill-tag').forEach(tag => {
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

// ═══ INITIALIZE AFTER LAYOUT IS READY ═══
// ES modules execute after DOM parsing, but we need 2 rAFs to ensure layout is complete
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
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

// ═══ STICKY PROJECT CARD STACKING + PROGRESS WIDGET ═══
const allStackCards = Array.from(document.querySelectorAll('.projects-stack .project-card'));

const projectProgress = document.getElementById('projectProgress');
const projectProgressCount = document.getElementById('projectProgressCount');
const projectProgressName = document.getElementById('projectProgressName');
const projectProgressType = document.getElementById('projectProgressType');
const projectProgressDots = document.getElementById('projectProgressDots');

let currentProjectIdx = -1;

if (projectProgressDots && allStackCards.length) {
  projectProgressDots.innerHTML = allStackCards.map((_, i) =>
    `<span class="project-progress-dot${i === 0 ? ' active' : ''}" data-project-dot="${i}"></span>`
  ).join('');
}

function setCurrentProjectByIndex(index) {
  if (!allStackCards.length || index === currentProjectIdx) return;
  if (index < 0 || index >= allStackCards.length) return;
  currentProjectIdx = index;
  const card = allStackCards[index];

  allStackCards.forEach((item, i) => item.classList.toggle('is-current', i === index));
  const current = String(index + 1).padStart(2, '0');
  const total = String(allStackCards.length).padStart(2, '0');
  if (projectProgress) {
    const progress = allStackCards.length > 1 ? index / (allStackCards.length - 1) : 1;
    projectProgress.style.setProperty('--project-progress-fill', progress.toFixed(3));
  }
  if (projectProgressCount) projectProgressCount.innerHTML = `<b>${current}</b><small>/ ${total}</small>`;
  if (projectProgressType) {
    const number = card.querySelector('.project-number');
    const type = number ? number.textContent.split('/').pop().trim() : '项目';
    projectProgressType.textContent = type;
  }
  if (projectProgressName) {
    const title = card.querySelector('.project-title');
    projectProgressName.textContent = title ? title.textContent.trim() : '项目作品';
  }
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
  const shouldStack = getShouldStack();

  if (!shouldStack) {
    allStackCards.forEach((card, i) => {
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
  if (allStackCards.length) setCurrentProjectByIndex(0);

  const STACK_OFFSET = 64;
  
  document.querySelectorAll('.projects-stack').forEach(stack => {
    const cards = stack.querySelectorAll('.project-card');
    cards.forEach((card, i) => {
      card.style.top = `${96 + i * STACK_OFFSET}px`;
      card.style.zIndex = `${i + 1}`;

      if (i < cards.length - 1 && hasGsap) {
        gsap.to(card, {
          scale: 0.965 - i * 0.015,
          y: 14 + i * 8,
          force3D: true, overwrite: 'auto', ease: 'none',
          scrollTrigger: {
            trigger: cards[i + 1],
            start: 'top 88%',
            end: 'top 48%',
            scrub: 0.4,
            fastScrollEnd: true,
          }
        });
      }
    });
  });

  allStackCards.forEach((card, globalIdx) => {
    if (hasGsap) {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 42%',
        end: 'bottom 58%',
        onEnter: () => setCurrentProjectByIndex(globalIdx),
        onEnterBack: () => setCurrentProjectByIndex(globalIdx),
      });
    }
  });

  if (hasGsap) {
    const lastProjectSection = document.getElementById('projects-web') || document.getElementById('projects-ai') || document.getElementById('projects');
    
    ScrollTrigger.create({
      trigger: '#projects',
      start: 'top 35%',
      endTrigger: lastProjectSection,
      end: 'bottom 65%',
      onEnter: () => setProjectsProgressVisible(true),
      onEnterBack: () => setProjectsProgressVisible(true),
      onLeave: () => setProjectsProgressVisible(false),
      onLeaveBack: () => setProjectsProgressVisible(false),
    });
  }

  window.addEventListener('pageshow', () => requestAnimationFrame(() => setProjectsProgressVisible(true)));
}

// ═══ INIT STACKING after layout ═══
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    initStacking();
  });
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

// ═══ 3D TILT on project cards + GLOW on stat/contact cards ═══
(function initTiltAndGlow() {
  if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
  const TILT_MAX = 7;

  document.querySelectorAll('.project-card').forEach(card => {
    if (card.closest('.projects-stack')) return;
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rotY = (px - 0.5) * TILT_MAX * 2;
      const rotX = -(py - 0.5) * TILT_MAX * 2;
      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.01)`;
      card.style.boxShadow = `0 24px 64px oklch(0% 0 0 / 0.3), 0 0 0 1px var(--project-accent, var(--accent))`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });

  document.querySelectorAll('.stat-card, .contact-item').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });
})();

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
(function reportAnalytics() {
  try {
    fetch('/api/analytics/hit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: location.pathname, ref: document.referrer || '' }),
      keepalive: true
    }).catch(() => {});
  } catch (e) {}
})();
