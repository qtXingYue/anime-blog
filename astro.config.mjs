import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://qtxingyue.me',
  build: {
    format: 'file'  // 生成 /projects/xxx.html 而非 /projects/xxx/index.html
  }
});
