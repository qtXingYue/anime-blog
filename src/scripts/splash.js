/* 开屏加载（splash）
 * 只在本次会话第一次「全量进入」时出现；内部 ClientRouter 跳转不再重复。
 * 触发条件由 Base.astro 里的内联脚本提前写在 <html data-splash="1"> 上，
 * 这里只负责：跑进度 → 等字体/资源就绪 → 幕布上提 → 清标记。
 * 任何一步出错都必须让内容可见：3s 硬超时 + CSS 兜底动画。
 */

const KEY = 'qtx:splash-v1';
const root = document.documentElement;
const el = document.getElementById('splash');

function unlock() {
  root.classList.remove('is-splashing');
  root.removeAttribute('data-splash');
}

function dismiss(immediate) {
  if (!el || el.dataset.done) return;
  el.dataset.done = '1';
  try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* 隐私模式忽略 */ }

  if (immediate) {
    el.remove();
    unlock();
    return;
  }
  el.classList.add('is-out');
  window.setTimeout(() => {
    el.remove();
    unlock();
  }, 760);
}

if (el) {
  if (root.dataset.splash !== '1') {
    // 不是首次进入（比如 ClientRouter 换页带来了新的 splash 节点）：直接移除，不闪
    el.remove();
    unlock(); // 防止上一次开屏未收场时残留 is-splashing 把滚动锁死
  } else {
    const bar = el.querySelector('.splash-bar i');
    let ended = false;

    const end = () => {
      if (ended) return;
      ended = true;
      dismiss(false);
    };

    // 动画有「最短展示时长」：移动端资源和字体常命中缓存，若不设下限，
    // 从出现到退场可能只有 300ms，观感就是一眨眼没了。
    const startedAt = performance.now();
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const MIN_VISIBLE = isMobile ? 2000 : 1650;
    const HOLD_AFTER_FULL = 220;

    // 兜底：资源再慢也最多 4.2s 收场（需大于 MIN_VISIBLE + HOLD + 退场 750ms）
    const hardStop = window.setTimeout(end, 4200);

    // 进度条：先快速走到 82%，资源就绪后再补满
    requestAnimationFrame(() => {
      if (bar) bar.style.transform = 'scaleX(.18)';
    });
    window.setTimeout(() => {
      if (bar) bar.style.transform = 'scaleX(.82)';
    }, 120);

    const fontsReady = document.fonts && document.fonts.ready
      ? document.fonts.ready.catch(() => {})
      : Promise.resolve();

    const loaded = new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });

    // 字体 + load 都就绪，或最多等 1.4s，二者取先。
    // 就绪后补满进度，但退场还要等「最短展示时长」走完。
    Promise.race([
      Promise.all([fontsReady, loaded]),
      new Promise((r) => window.setTimeout(r, 1400)),
    ]).then(() => {
      if (ended) return;
      if (bar) bar.style.transform = 'scaleX(1)';
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, MIN_VISIBLE - elapsed) + HOLD_AFTER_FULL;
      window.setTimeout(() => {
        window.clearTimeout(hardStop);
        end();
      }, wait);
    });

    // 不耐烦的访客：点一下或按 Esc/Enter 直接跳过
    const skip = () => {
      window.clearTimeout(hardStop);
      dismiss(true);
    };
    el.addEventListener('click', skip, { once: true });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') skip();
    }, { once: true });
  }
}
