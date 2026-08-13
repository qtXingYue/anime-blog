import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const site = 'https://qtxingyue.me';
const lastmod = new Date().toISOString().slice(0, 10);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === '.gitignore') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (name.endsWith('.html') && name !== '404.html') {
      const metaRobots = readFileSync(full, 'utf8').match(/<meta[^>]*robots[^>]*>/i)?.[0] ?? '';
      if (!metaRobots.toLowerCase().includes('noindex')) acc.push(full);
    }
  }
  return acc;
}

const urls = walk(dist).map((file) => {
  const rel = relative(dist, file).replace(/\\/g, '/');
  const rawLoc = rel === 'index.html' ? '/' : `/${rel}`;
  const loc = encodeURI(rawLoc);
  let changefreq = 'monthly';
  let priority = '0.5';
  if (loc === '/') {
    changefreq = 'weekly';
    priority = '1.0';
  } else if (loc === '/blog.html') {
    changefreq = 'weekly';
    priority = '0.8';
  } else if (loc === '/lab.html') {
    changefreq = 'monthly';
    priority = '0.5';
  } else if (loc.startsWith('/blog/')) {
    changefreq = 'monthly';
    priority = '0.6';
  } else if (loc.startsWith('/projects/')) {
    changefreq = 'yearly';
    priority = '0.7';
  } else if (loc.startsWith('/lab/')) {
    changefreq = 'monthly';
    priority = '0.4';
  }
  return (
    '  <url>\n' +
    `    <loc>${site}${loc}</loc>\n` +
    `    <lastmod>${lastmod}</lastmod>\n` +
    `    <changefreq>${changefreq}</changefreq>\n` +
    `    <priority>${priority}</priority>\n` +
    '  </url>'
  );
});

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.join('\n') +
  '\n</urlset>\n';
writeFileSync(join(dist, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml generated with ${urls.length} urls`);
