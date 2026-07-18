<template>
  <button class="theme-toggle" aria-label="切换主题" @click="toggle">{{ icon }}</button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const icon = ref('🌙');

onMounted(() => {
  icon.value = document.documentElement.dataset.theme === 'light' ? '☀️' : '🌙';
});

function toggle(event: MouseEvent) {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';

  // 圆形扩散过渡（View Transitions API）
  const doc: any = document;
  if (doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );
    const transition = doc.startViewTransition(() => {
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      icon.value = next === 'light' ? '☀️' : '🌙';
    });
    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];
      doc.documentElement.animate(
        { clipPath: next === 'light' ? clipPath : clipPath.reverse() },
        { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  } else {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    icon.value = next === 'light' ? '☀️' : '🌙';
  }
}
</script>
