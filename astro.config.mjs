import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  site: 'https://qtxingyue.me',
  integrations: [vue()],
  build: {
    format: 'file'  // 生成 /projects/xxx.html 而非 /projects/xxx/index.html
  }
});
