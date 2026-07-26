# test/ — P0 优化改动包

本目录包含作品集 P0 轮优化的全部改动文件,**不会自动生效**:先应用 → 本地核验 → 再上传服务器。

## 这轮改了什么

1. **真实截图替换 emoji 占位**:12 张项目卡 + featured 卡全部换上封面(6 张真实截图 + 6 张统一风格 SVG 线稿封面 + featured 用新版首页截图);`projects.ts` 增加 `cover` 字段,`ProjectCard.astro` 渲染 `<img>` + 项目色蒙版。
2. **字体自托管**:移除 Google Fonts(国内不可达),标题改为思源宋体子集(`public/fonts/noto-serif-sc-{700,900}.woff`,各约 215KB,已按站点用字子集化),正文用系统字体栈。首页与详情页标题字体统一。
3. **节奏收紧**:section 边距 8rem→5rem、堆叠区底部空白 42vh→18vh、hero 100vh→88vh、非当前卡压暗 0.68→0.85、reveal 兜底 2.5s→1.2s。桌面整页高度约 14000px→约 12500px。
4. **视频瘦身**:`desktop-bg` 由 35MB 换成 750KB 的 720p mp4 + 779KB webm(webm 优先),`preload="none"` + 首帧 poster;移动端 / 省流模式 / prefers-reduced-motion 不加载视频。
5. **分享与图标**:og:image 换成 1200×630 PNG(SVG 微信/X 不识别);🎬📍🌐↑🌙 等 emoji 控件全部换成内联 SVG。
6. **亮色主题快修**:hero 圆环改浅色玻璃质感,漂浮标签提高对比度。
7. 顺带修正:Footer 里 `blog.html`/相对路径链接改为根路径。

## 如何应用(先备份,可回滚)

```bash
cd portfolio-astro
python test/apply_changes.py    # 自动备份原文件到 test/backup_original/ 再覆盖
npm run dev                     # 本地核验 http://localhost:4321
```

核验要点:首页标题应显示**衬线字体**(思源宋体);12 张项目卡应显示封面图而非 emoji;滚动明显变短;亮色主题 hero 不再是实心紫圆;移动端(DevTools 模拟)不加载背景视频。

## 如何回滚

```bash
python test/revert_changes.py   # 从 test/backup_original/ 还原,并删除新增文件
```

## 核验通过后上传服务器

用你现有的部署流程即可(`npm run build` 后按原 deploy 脚本上传 dist)。
apply 时会把 `public/` 里 4 份冗余视频(bg-video.orig.mp4 35MB、bg-video.mp4 9.5MB、sakura-bg.mp4、_bg-720.mp4)移入备份目录,dist 部署包会瘦约 84MB → 剩余大头是 `projects/ai-videos/`(55MB)与原图,属 P2 图片管线的活。

## 说明与后续

- `09-meizhou.svg` 是绘制封面——如果你想用真实运行截图,本机打开 `public/projects/meizhou-demo.html` 截一张 880×550 存为 `public/projects/covers/09-meizhou.webp`,并把 `projects.ts` 里 09 的 cover 后缀改为 `.webp` 即可。
- 站点文案新增生僻字后若衬线字体缺字,会回退到系统宋体;需要重新子集化时告诉我即可(生成脚本在我这边,传入新增文字重新生成 woff)。
- preview/ 目录是本轮改动的前后对比截图。
- P1(项目区大改版:大/中/紧凑卡片层级 + Hero 右侧重构 + 博客并入统一壳)待你确认本轮效果后继续。
