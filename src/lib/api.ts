/**
 * 类型安全的 API 客户端。
 * 类型来自后端 OpenAPI：`npm run types:api` 重新生成 src/types/api.ts。
 * 改动接口后先跑一次生成，再跑 `astro check`，字段漂移会在编译期报错。
 */
import type { components } from '../types/api';

export type ArticleSummary = components['schemas']['ArticleSummary'];
export type ArticleDetail = components['schemas']['ArticleDetail'];
export type ChatReply = components['schemas']['ChatReply'];

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: JSON_HEADERS, ...init });
  if (!res.ok) {
    throw new Error(`API ${res.status} ${url}`);
  }
  return (await res.json()) as T;
}

export const api = {
  /** 已发布文章列表 */
  articles: () => request<ArticleSummary[]>('/api/articles'),

  /** 文章详情 */
  article: (slug: string) => request<ArticleDetail>(`/api/articles/${encodeURIComponent(slug)}`),

  /** 一次性问答（流式接口不可用时的降级路径） */
  chat: (prompt: string) =>
    request<ChatReply>('/api/chat/assistant', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  /** 访问打点 */
  hit: (path: string) =>
    request<{ ok: boolean }>('/api/analytics/hit', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
};
