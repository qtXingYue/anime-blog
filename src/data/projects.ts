export interface ProjectLink {
  href: string;
  label: string;
}

export interface Project {
  num: string;
  category: string;
  title: string;
  desc: string;
  metrics: string[];
  tech: string[];
  emoji: string;
  gradient: string;
  link?: ProjectLink;
}

export const featured = {
  emoji: '🌙',
  label: 'FEATURED PROJECT',
  title: '全栈作品集网站',
  titleSub: 'Astro + Vue 岛 + GSAP 动效系统',
  desc: '用 Astro 5 组件化重构的暗色杂志风作品集，集成视频背景、GSAP 滚动堆叠、右侧项目进度导航、明暗主题切换与 Nginx 部署。',
  tags: [
    { label: 'Astro 5', primary: true },
    { label: 'GSAP', primary: true },
    { label: 'Vue 岛', primary: false },
    { label: 'Nginx', primary: false }
  ],
  cta: '📄 详解 →',
  href: 'projects/portfolio-report.html'
};

// 核心工程组
export const projectsMain: Project[] = [
  {
    num: '01', category: '核心工程', emoji: '🕷️',
    gradient: 'linear-gradient(135deg,#1a0533,#2d1b69)',
    title: '多平台广告数据爬取系统',
    desc: '一套覆盖五大广告平台的自动化数据采集系统。Playwright 驱动浏览器、Token 双重认证，Streamlit 仪表盘一键生成报表，日常监控 300+ 广告账号的消耗数据。',
    metrics: ['5 个广告平台', '328+ 活跃账号', 'CSV/Excel 自动报表'],
    tech: ['Python', 'Playwright', 'Streamlit', 'REST API'],
    link: { href: 'projects/data-crawler-report.html', label: '查看数据看板 →' }
  },
  {
    num: '02', category: '核心工程', emoji: '🇧🇷',
    gradient: 'linear-gradient(135deg,#1a1a3e,#0d0d2b)',
    title: '巴西 CNPJ 企业信息批量查询',
    desc: '从 Excel 批量提取 CNPJ，调用 BrasilAPI 补全企业注册、经营、地址与联系方式，并导出 CSV/JSON 结果。',
    metrics: ['200 条输入记录', '199 条成功查询', 'CSV/JSON 导出'],
    tech: ['Python', 'Pandas', 'requests', 'BrasilAPI'],
    link: { href: 'projects/brazil-cnpj-report.html', label: '查看技术拆解 →' }
  },
  {
    num: '03', category: '核心工程', emoji: '🤖',
    gradient: 'linear-gradient(135deg,#14143a,#4b2aa8)',
    title: '批量账号注册与浏览器 RPA 自动化系统',
    desc: 'Python + Selenium + ixBrowser Profile 调度，处理批量网页流程中的隔离、并发、日志和结果回写。',
    metrics: ['浏览器隔离', '并发调度', '日志回写'],
    tech: ['Python', 'Selenium', 'ixBrowser', 'RPA'],
    link: { href: 'projects/rpa-registration-system.html', label: '查看技术拆解 →' }
  },
  {
    num: '04', category: '核心工程', emoji: '📡',
    gradient: 'linear-gradient(135deg,#073042,#0f766e)',
    title: 'MuMu 安卓网络调试与协议分析',
    desc: '基于 MuMu 模拟器、mitmproxy、Frida 17 与 ADB 构建授权测试流程，沉淀测试 APK 请求链路、Native 观测和调试报告。',
    metrics: ['mitmproxy 抓包', 'Frida Hook', 'ADB 调试'],
    tech: ['Python', 'mitmproxy', 'Frida', 'ADB'],
    link: { href: 'projects/android-network-analysis.html', label: '查看技术拆解 →' }
  }
];

// AI / 视觉组
export const projectsAI: Project[] = [
  {
    num: '05', category: 'AI · 毕设', emoji: '✋',
    gradient: 'linear-gradient(135deg,#0f0c29,#302260)',
    title: '手势控制 PPT 系统',
    desc: '用手势操控 PPT 翻页——MediaPipe 实时追踪 21 个手部关键点，识别 6 种手势。滑动窗口防抖 + 握拳锁死安全机制，720P 下稳定 20+ FPS。',
    metrics: ['21 点关键点', '6 种手势', '720P 20+ FPS'],
    tech: ['Python', 'MediaPipe', 'OpenCV', 'CustomTkinter'],
    link: { href: 'projects/gesture-ppt-report.html', label: '查看技术拆解 →' }
  },
  {
    num: '06', category: '深度学习', emoji: '🎨',
    gradient: 'linear-gradient(135deg,#0a1628,#1a3a5c)',
    title: '卡通风格迁移系统 (CartoonGAN)',
    desc: 'AnimeGAN2 + ArcaneGAN 多模型风格迁移，覆盖图片和视频双模式转换。支持新海诚、宫崎骏等风格。',
    metrics: ['3 种动漫风格', 'TensorFlow 训练', '实时预览'],
    tech: ['Python', 'TensorFlow', 'GAN', 'Gradio'],
    link: { href: 'projects/cartoon-gan-report.html', label: '查看技术拆解 →' }
  },
  {
    num: '07', category: 'NLP', emoji: '📰',
    gradient: 'linear-gradient(135deg,#1c1c4a,#2a5298)',
    title: '多模型新闻文本分类系统',
    desc: 'TextCNN / TextRNN / 朴素贝叶斯三种架构对比，完成头条新闻 6 分类流程。模块化 Config 统一管理超参数。',
    metrics: ['3 种分类架构', '6 类新闻标签', '模块化 Config'],
    tech: ['TensorFlow', 'TextCNN', 'NLP', 'Jieba'],
    link: { href: 'projects/news-classification-report.html', label: '查看技术拆解 →' }
  },
  {
    num: '08', category: '深度学习', emoji: '✍️',
    gradient: 'linear-gradient(135deg,#2e1a3e,#5a1a6e)',
    title: '日语假名手写识别系统',
    desc: 'CNN 识别 49 类日本草书字符——3 层卷积块 + BatchNorm + Dropout，早停法 + 学习率调度，测试集准确率 88.2%。Tkinter 手写板 GUI 实时识别。',
    metrics: ['49 类假名', '88.2% 准确率', '3 层卷积块'],
    tech: ['TensorFlow', 'CNN', 'Tkinter', 'Keras', 'OpenCV'],
    link: { href: 'projects/japanese-ocr-report.html', label: '查看技术拆解 →' }
  }
];

// Web / 小程序组
export const projectsWeb: Project[] = [
  {
    num: '09', category: '数据可视化', emoji: '🗺️',
    gradient: 'linear-gradient(135deg,#1a3a1a,#2d5a1e)',
    title: '梅州美食地理可视化系统',
    desc: 'Pyecharts 构建客家美食与水果地理分布交互可视化，包含地图、柱状图和推荐信息。',
    metrics: ['9 道菜品', '5 种水果', '多维交互图表'],
    tech: ['Python', 'Pyecharts', 'Geo', 'HTML'],
    link: { href: 'projects/meizhou-demo.html', label: '查看运行截图 →' }
  },
  {
    num: '10', category: '全栈开发', emoji: '🛒',
    gradient: 'linear-gradient(135deg,#1a3a2e,#0d4a3e)',
    title: '动漫商城管理系统',
    desc: 'Java Servlet MVC 后端 + 微信小程序前端的完整电商应用——7 个 API 接口、图片上传、批量操作、Jackson JSON 序列化。小程序 6 个页面覆盖浏览、搜索、详情、管理全流程。',
    metrics: ['7 个 Servlet API', '6 个小程序页面', 'MySQL 数据存储'],
    tech: ['Java', 'Servlet', 'MySQL', '微信小程序', 'JSP'],
    link: { href: 'projects/wx-store-report.html', label: '查看项目详解 →' }
  },
  {
    num: '11', category: 'AI 生图', emoji: '✨',
    gradient: 'linear-gradient(135deg,#2b1645,#7c3aed)',
    title: 'AI 生图作品集',
    desc: 'ChatGPT、Gemini、Stable Diffusion WebUI、ComfyUI 四类 AI 工具生成的图片合集。产品广告、创意海报、风格迁移，探索 AI 在视觉创作中的实际应用。',
    metrics: ['4 类 AI 工具', '产品/海报/风格迁移', '完整画廊展示'],
    tech: ['ChatGPT', 'Gemini', 'SD WebUI', 'ComfyUI'],
    link: { href: 'projects/ai-gallery.html', label: '🖼️ 查看完整画廊' }
  },
  {
    num: '12', category: 'AI 视频', emoji: '🎬',
    gradient: 'linear-gradient(135deg,#0d1b2a,#1b2838)',
    title: 'AI 视频作品',
    desc: 'AI 工具生成的视频内容——从画面生成到场景合成，探索人工智能在动态视觉和视频创作领域的可能性。',
    metrics: ['动态视觉生成', '场景合成探索', '视频作品页'],
    tech: ['AI视频', '视频生成', 'AI创作'],
    link: { href: 'projects/ai-video.html', label: '🎬 观看视频' }
  }
];
