// ============================================================
//  QT新月 作品集 — main.js (bug-fixed)
// ============================================================

// ═══ ENTRANCE ANIMATION ═══
function runEntrance() {
  document.querySelectorAll('.load-reveal').forEach((el, i) => {
    const delay = Number(el.dataset.loadDelay || i * 100);
    window.setTimeout(() => el.classList.add('entered'), 180 + delay);
  });
}
// BUG FIX #5: check readyState to avoid missing DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(runEntrance));
} else {
  requestAnimationFrame(runEntrance);
}
window.addEventListener('pageshow', () => {
  document.querySelectorAll('.load-reveal').forEach(el => el.classList.add('entered'));
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
});

// ═══ SCROLL PROGRESS + COMPACT HEADER ═══
const progressBar = document.getElementById('scrollProgress');
const siteHeader = document.getElementById('siteHeader');
const heroVisual = document.querySelector('.hero-visual');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function updateScroll() {
  const scrollTop = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (progressBar) progressBar.style.width = `${scrollable > 0 ? Math.min((scrollTop / scrollable) * 100, 100) : 0}%`;
  if (siteHeader) siteHeader.classList.toggle('scrolled', scrollTop > 80);
  if (!prefersReducedMotion && scrollTop < window.innerHeight && heroVisual) {
    heroVisual.style.transform = `translateY(${scrollTop * -0.08}px)`;
  }
}
updateScroll();
window.addEventListener('scroll', updateScroll, { passive: true });

// BUG FIX #4: dynamic shouldStackProjects — re-evaluates on each access
function getShouldStack() {
  return !window.matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches;
}

// ═══ GSAP + ScrollTrigger ═══
const hasGsap = !!(window.gsap && window.ScrollTrigger);

if (!hasGsap) {
  // Fallback: no GSAP, just reveal everything
  document.querySelectorAll('[data-reveal], .project-card, .reveal').forEach(el => el.classList.add('visible'));
  document.querySelectorAll('.timeline-track-fill').forEach(fill => { fill.style.height = '100%'; });
  document.querySelectorAll('.timeline-dot').forEach(dot => { dot.classList.add('active'); });
  document.querySelectorAll('.timeline-content').forEach(content => content.classList.add('active'));
  document.querySelectorAll('.projects-stack').forEach(stack => {
    const cards = stack.querySelectorAll('.project-card');
    cards.forEach((card, i) => {
      card.style.zIndex = `${i + 1}`;
      card.classList.toggle('is-current', i === 0);
    });
  });
} else {
  gsap.registerPlugin(ScrollTrigger);

  // Section heading reveal
  gsap.utils.toArray('.section').forEach(section => {
    const headingParts = section.querySelectorAll('.section-label, .section-title, .section-divider');
    if (!headingParts.length) return;
    gsap.from(headingParts, {
      y: 30, opacity: 0, filter: 'blur(5px)',
      duration: 0.8, stagger: 0.09, ease: 'back.out(1.2)',
      scrollTrigger: { trigger: section, start: 'top 82%', once: true }
    });
  });

  // Generic reveal
  gsap.utils.toArray('[data-reveal], .reveal')
    .filter(el => !el.closest('.projects-stack'))
    .forEach((el, i) => {
      gsap.from(el, {
        y: 50, opacity: 0, duration: 0.6, delay: i * 0.05,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });
}

// ═══ SCROLL REVEAL (IntersectionObserver fallback) ═══
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal, [data-reveal]').forEach(el => {
  if (!el.closest('.projects-stack')) revealObserver.observe(el);
});

// ═══ PROJECT CARDS SCROLL ENTRANCE (staggered) ═══
// BUG FIX #3: exclude stacking cards from reveal-card to avoid CSS/GSAP conflict
const projectCards = document.querySelectorAll('.project-card');
if (!prefersReducedMotion) {
  projectCards.forEach(card => {
    if (!card.closest('.projects-stack')) card.classList.add('reveal-card');
  });
}
const projectObserver = new IntersectionObserver((entries) => {
  const visible = entries.filter(e => e.isIntersecting);
  visible.forEach((e, i) => {
    setTimeout(() => {
      e.target.classList.add('visible');
      projectObserver.unobserve(e.target);
    }, i * 120);
  });
}, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
projectCards.forEach(card => projectObserver.observe(card));

// ═══ STICKY PROJECT CARD STACKING + PROGRESS WIDGET ═══
// BUG FIX #1: track only the first .projects-stack (core projects) for the widget,
// since the widget is placed only in the #projects section.
const allStackCards = Array.from(document.querySelectorAll('.projects-stack .project-card'));
const firstStackCards = Array.from(
  document.querySelector('.projects-stack')?.querySelectorAll('.project-card') || []
);

const projectProgress = document.getElementById('projectProgress');
const projectProgressCount = document.getElementById('projectProgressCount');
const projectProgressName = document.getElementById('projectProgressName');
const projectProgressType = document.getElementById('projectProgressType');
const projectProgressDots = document.getElementById('projectProgressDots');

// Build progress dots — use first stack count to match widget location
if (projectProgressDots && firstStackCards.length) {
  projectProgressDots.innerHTML = firstStackCards.map((_, i) =>
    `<span class="project-progress-dot${i === 0 ? ' active' : ''}" data-project-dot="${i}"></span>`
  ).join('');
}

function setCurrentProject(card) {
  if (!card || !firstStackCards.length) return;
  // BUG FIX #11: handle case where card is not found
  const idx = firstStackCards.indexOf(card);
  if (idx === -1) return;
  const index = idx;
  firstStackCards.forEach((item, i) => item.classList.toggle('is-current', i === index));
  const current = String(index + 1).padStart(2, '0');
  const total = String(firstStackCards.length).padStart(2, '0');
  if (projectProgress) {
    const progress = firstStackCards.length > 1 ? index / (firstStackCards.length - 1) : 1;
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

function getMostVisibleProjectCard() {
  if (!firstStackCards.length) return null;
  let bestCard = firstStackCards[0];
  let bestScore = -Infinity;
  let fallbackCard = firstStackCards[0];
  let fallbackScore = -Infinity;
  firstStackCards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const centerOffset = Math.abs((rect.top + rect.bottom) / 2 - window.innerHeight * 0.5);
    const fallback = visible - centerOffset * 0.18;
    if (fallback > fallbackScore) { fallbackScore = fallback; fallbackCard = card; }
    const inStackFocus = visible > 0 && rect.top <= window.innerHeight * 0.42 && rect.bottom >= window.innerHeight * 0.18;
    if (!inStackFocus) return;
    const zIndex = Number.parseInt(window.getComputedStyle(card).zIndex, 10) || 0;
    const score = zIndex * 100 + index * 0.01 - Math.abs(rect.top - 96) * 0.02;
    if (score > bestScore) { bestScore = score; bestCard = card; }
  });
  return bestScore > -Infinity ? bestCard : fallbackCard;
}

function syncCurrentProject() {
  if (!getShouldStack() || !firstStackCards.length) return;
  setCurrentProject(getMostVisibleProjectCard());
}

function isProjectsSectionVisible() {
  const section = document.getElementById('projects');
  if (!section) return false;
  const rect = section.getBoundingClientRect();
  return rect.top <= window.innerHeight * 0.68 && rect.bottom >= window.innerHeight * 0.34;
}

let projectProgressRaf = 0;
function updateProjectProgressState() {
  projectProgressRaf = 0;
  if (!getShouldStack() || !projectProgress) return;
  const isActive = isProjectsSectionVisible();
  projectProgress.classList.toggle('active', isActive);
  if (isActive) syncCurrentProject();
}

function requestProjectProgressState() {
  if (projectProgressRaf) return;
  projectProgressRaf = requestAnimationFrame(updateProjectProgressState);
}

if (firstStackCards.length) setCurrentProject(firstStackCards[0]);

// Initialize stacking or disable it
function initStacking() {
  const shouldStack = getShouldStack();

  if (!shouldStack) {
    allStackCards.forEach((card, i) => {
      card.style.top = '';
      card.style.zIndex = `${i + 1}`;
      card.style.transform = '';
      card.classList.remove('is-current');
    });
    return;
  }

  // ScrollTrigger for progress widget
  if (hasGsap && projectProgress) {
    ScrollTrigger.create({
      trigger: '#projects',
      start: 'top 45%',
      end: 'bottom 55%',
      onEnter: updateProjectProgressState,
      onEnterBack: updateProjectProgressState,
      onLeave: updateProjectProgressState,
      onLeaveBack: updateProjectProgressState,
      onRefresh: updateProjectProgressState,
      onUpdate: requestProjectProgressState
    });
  }

  // Card stacking — apply per-stack
  const STACK_OFFSET = 64;
  document.querySelectorAll('.projects-stack').forEach(stack => {
    const cards = stack.querySelectorAll('.project-card');
    cards.forEach((card, i) => {
      card.style.top = `${96 + i * STACK_OFFSET}px`;
      card.style.zIndex = `${i + 1}`;

      if (i < cards.length - 1 && hasGsap) {
        gsap.to(card, {
          scale: 0.965 - i * 0.018,
          y: 16 + i * 10,
          force3D: true, overwrite: 'auto', ease: 'none',
          scrollTrigger: {
            trigger: cards[i + 1],
            start: 'top 84%',
            end: 'top 48%',
            scrub: 0.6,
          }
        });
      }

      if (hasGsap) {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 58%',
          end: 'bottom 42%',
          onEnter: () => setCurrentProject(card),
          onEnterBack: () => setCurrentProject(card)
        });
      }
    });
  });

  if (hasGsap) {
    ScrollTrigger.addEventListener('refresh', requestProjectProgressState);
    requestAnimationFrame(updateProjectProgressState);
  }
  window.addEventListener('scroll', requestProjectProgressState, { passive: true });
  window.addEventListener('pageshow', () => requestAnimationFrame(updateProjectProgressState));
}

initStacking();

// BUG FIX #4: re-init stacking on resize (debounced)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    // Re-run stacking logic if window crossed the 768px threshold
    initStacking();
  }, 300);
});

// ═══ TIMELINE DRAWING ═══
document.querySelectorAll('.timeline').forEach(tl => {
  const fill = tl.querySelector('.timeline-track-fill');
  const dots = tl.querySelectorAll('.timeline-dot');
  const contents = tl.querySelectorAll('.timeline-content');

  if (fill && hasGsap) {
    gsap.to(fill, {
      height: '100%', ease: 'none',
      scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: 0.8 }
    });
  } else if (fill) {
    fill.style.height = '100%';
  }

  tl.querySelectorAll('.timeline-item').forEach((item, i) => {
    const activateItem = () => {
      if (dots[i]) { dots[i].classList.add('active'); }
      setTimeout(() => { if (contents[i]) contents[i].classList.add('active'); }, 150);
    };

    if (hasGsap) {
      ScrollTrigger.create({
        trigger: item, start: 'top 82%',
        onEnter: activateItem, onEnterBack: activateItem,
        onLeaveBack: () => {
          if (dots[i]) { dots[i].classList.remove('active'); }
          if (contents[i]) contents[i].classList.remove('active');
        }
      });
    } else {
      activateItem();
    }
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
// BUG FIX #2: exclude stacking cards from tilt to avoid GSAP transform conflict
(function initTiltAndGlow() {
  if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
  const TILT_MAX = 7;

  document.querySelectorAll('.project-card').forEach(card => {
    // Skip cards inside .projects-stack — GSAP manages their transforms
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

// ═══ SKILL TAGS STAGGER ═══
if (!prefersReducedMotion) {
  document.querySelectorAll('.skill-tag').forEach(tag => {
    tag.style.opacity = '0';
    tag.style.transform = 'translateY(8px)';
  });
}
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
}, { threshold: 0.3 });
document.querySelectorAll('.skill-category').forEach(g => skillObserver.observe(g));

// ═══ CONTACT FORM ═══
// BUG FIX #7: use default contact address for mailto fallback
async function handleContactSubmit(e) {
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
    // 静态部署环境没有后端 endpoint，fallback 到本地邮件客户端
    window.location.href = 'mailto:' + mailto;
    msg.textContent = '已唤起邮件客户端，请手动发送；或尝试通过 GitHub 联系。';
  }
}
window.handleContactSubmit = handleContactSubmit;
