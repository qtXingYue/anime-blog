# 樱之日记 — Sakura Diary

> 个人动漫博客 · 暗夜日系美学 · Apple 玻璃质感

一个纯手写的前端博客项目，服务于动漫影评、创作记录和日语学习分享。

## 设计理念

- **苹果风格玻璃效果**: 全站 `backdrop-filter` 毛玻璃 + 多层渐变背景
- **冷蓝紫色调**: OKLCH 色彩空间，零纯黑零纯白
- **日系杂志排版**: Zen Old Mincho + M PLUS Rounded 1c 字体组合
- **暗色/亮色双主题**: localStorage 记忆，一键切换
- **零依赖**: 单文件 HTML + CSS + 少量原生 JS

## 快速开始

直接用浏览器打开 `index.html`，或挂到任意静态服务器：

```bash
# Python 简单服务器
python -m http.server 8080

# 或 Node.js
npx serve .
```

## 功能特性

| 功能 | 说明 |
|------|------|
| 响应式布局 | 桌面双列 / 移动单列自适应 |
| 滚动渐入动画 | Intersection Observer 驱动的文章卡片入场 |
| 毛玻璃卡片 | 侧栏 + 文章卡片 hover 玻璃效果 |
| 暗色/亮色切换 | 右上角按钮一键切换，记忆选择 |
| 减动适配 | `prefers-reduced-motion` 完整支持 |
| 无障碍 | `aria-label`、`focus-visible`、语义化 HTML |
| 樱花粒子 | 纯 CSS 花瓣飘落动画（暗色模式） |

## 项目结构

```
anime-blog/
└── index.html    # 全站单文件（HTML + CSS + JS）
```

## License

MIT
