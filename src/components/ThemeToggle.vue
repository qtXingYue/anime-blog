<template>
  <button class="theme-toggle" aria-label="切换主题" @click="toggle">{{ icon }}</button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const icon = ref('🌙');

onMounted(() => {
  icon.value = document.documentElement.dataset.theme === 'light' ? '☀️' : '🌙';
});

function toggle() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
  icon.value = next === 'light' ? '☀️' : '🌙';
}
</script>
