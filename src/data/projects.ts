export interface ProjectLink {
  href: string;
  label: string;
}

/** 卡片强调色。取值对应 global.css 里 5 条 [data-accent] 规则,不要新增值。 */
export type Accent = 'violet' | 'azure' | 'magenta' | 'teal' | 'jade';

export interface Project {
  num: string;
  category: string;
  title: string;
  desc: string;
  metrics: string[];
  tech: string[];
  emoji: string;
  gradient: string;
  accent: Accent;
  /** 卡片封面图(真实截图或统一风格 SVG),为空时回退到 emoji+渐变 */
  cover?: string;
  /** 一句话硬指标,只给特写级大卡填,是"这个项目真跑起来了"的证据 */
  highlight?: { value: string; label: string };
  link?: ProjectLink;
}

export const featured = {
  emoji: '🌙',
  cover: '/projects/covers/00-featured.webp',
  label: 'COVER STORY · 00',
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
  href: 'projects/portfolio-report'
};

// 核心工程组
export const projectsMain: Project[] = [
  {
    num: '01', category: '核心工程', emoji: '🕷️',
    gradient: 'linear-gradient(135deg,#1a0533,#2d1b69)',
    accent: 'violet',
    cover: '/projects/covers/01-data-crawler.webp',
    title: '多平台广告数据爬取系统',
    highlight: { value: '328+', label: '活跃广告账号在跑 · 覆盖 5 个平台' },
    desc: '一套覆盖五大广告平台的自动化数据采集系统。Playwright 驱动浏览器、Token 双重认证，Streamlit 仪表盘一键生成报表，日常监控 300+ 广告账号的消耗数据。',
    metrics: ['5 个广告平台', '328+ 活跃账号', 'CSV/Excel 自动报表'],
    tech: ['Python', 'Playwright', 'Streamlit', 'REST API'],
    link: { href: 'projects/data-crawler-report', label: '查看数据看板 →' }
  },
  {
    num: '02', category: '核心工程', emoji: '🇧🇷',
    gradient: 'linear-gradient(135deg,#1a1a3e,#0d0d2b)',
    accent: 'violet',
    cover: '/projects/covers/02-brazil-cnpj.svg',
    title: '巴西 CNPJ 企业信息批量查询',
    desc: '从 Excel 批量提取 CNPJ，调用 BrasilAPI 补全企业注册、经营、地址与联系方式，并导出 CSV/JSON 结果。',
    metrics: ['200 条输入记录', '199 条成功查询', 'CSV/JSON 导出'],
    tech: ['Python', 'Pandas', 'requests', 'BrasilAPI'],
    link: { href: 'projects/brazil-cnpj-report', label: '查看技术拆解 →' }
  },
  {
    num: '03', category: '核心工程', emoji: '🤖',
    gradient: 'linear-gradient(135deg,#14143a,#4b2aa8)',
    accent: 'azure',
    cover: '/projects/covers/03-rpa.svg',
    title: '批量账号注册与浏览器 RPA 自动化系统',
    desc: 'Python + Selenium + ixBrowser Profile 调度，处理批量网页流程中的隔离、并发、日志和结果回写。',
    metrics: ['浏览器隔离', '并发调度', '日志回写'],
    tech: ['Python', 'Selenium', 'ixBrowser', 'RPA'],
    link: { href: 'projects/rpa-registration-system', label: '查看技术拆解 →' }
  },
  {
    num: '04', category: '核心工程', emoji: '📡',
    gradient: 'linear-gradient(135deg,#073042,#0f766e)',
    accent: 'teal',
    cover: '/projects/covers/04-android-network.svg',
    title: 'MuMu 安卓网络调试与协议分析',
    desc: '基于 MuMu 模拟器、mitmproxy、Frida 17 与 ADB 构建授权测试流程，沉淀测试 APK 请求链路、Native 观测和调试报告。',
    metrics: ['mitmproxy 抓包', 'Frida Hook', 'ADB 调试'],
    tech: ['Python', 'mitmproxy', 'Frida', 'ADB'],
    link: { href: 'projects/android-network-analysis', label: '查看技术拆解 →' }
  }
];

// AI / 视觉组
export const projectsAI: Project[] = [
  {
    num: '05', category: 'AI · 毕设', emoji: '✋',
    gradient: 'linear-gradient(135deg,#0f0c29,#302260)',
    accent: 'azure',
    cover: '/projects/covers/05-gesture-ppt.svg',
    title: '手势控制 PPT 系统',
    highlight: { value: '20+ FPS', label: '720P 实时手势追踪 · 21 点关键点' },
    desc: '用手势操控 PPT 翻页——MediaPipe 实时追踪 21 个手部关键点，识别 6 种手势。滑动窗口防抖 + 握拳锁死安全机制，720P 下稳定 20+ FPS。',
    metrics: ['21 点关键点', '6 种手势', '720P 20+ FPS'],
    tech: ['Python', 'MediaPipe', 'OpenCV', 'CustomTkinter'],
    link: { href: 'projects/gesture-ppt-report', label: '查看技术拆解 →' }
  },
  {
    num: '06', category: '深度学习', emoji: '🎨',
    gradient: 'linear-gradient(135deg,#0a1628,#1a3a5c)',
    accent: 'magenta',
    cover: '/projects/covers/06-cartoon-gan.webp',
    title: '卡通风格迁移系统 (CartoonGAN)',
    highlight: { value: '5 种风格', label: '图片 / 视频双模式 · Gradio 一键分享' },
    desc: 'AnimeGAN2 + ArcaneGAN 多模型风格迁移，图片 / 视频双模式。新海诚、宫崎骏到《双城之战》五种风格，含人脸检测裁剪与平滑后处理，Gradio 一键分享。',
    metrics: ['新海诚 / 宫崎骏 / Arcane', '图片+视频双模式', 'Gradio Web 界面'],
    tech: ['Python', 'TensorFlow', 'GAN', 'Gradio'],
    link: { href: 'projects/cartoon-gan-report', label: '查看技术拆解 →' }
  },
  {
    num: '07', category: 'NLP', emoji: '📰',
    gradient: 'linear-gradient(135deg,#1c1c4a,#2a5298)',
    accent: 'violet',
    cover: '/projects/covers/07-news-classification.svg',
    title: '多模型新闻文本分类系统',
    desc: 'TextCNN / TextRNN / 朴素贝叶斯三架构横向对比，头条新闻 6 分类。加载腾讯 AILab 中文预训练词向量微调，自动输出准确率 / F1 / 混淆矩阵对比报告。',
    metrics: ['TextCNN F1 0.91', '腾讯预训练词向量', '三模型对比评估'],
    tech: ['TensorFlow', 'TextCNN', 'NLP', 'Jieba'],
    link: { href: 'projects/news-classification-report', label: '查看技术拆解 →' }
  },
  {
    num: '08', category: '深度学习', emoji: '✍️',
    gradient: 'linear-gradient(135deg,#2e1a3e,#5a1a6e)',
    accent: 'magenta',
    cover: '/projects/covers/08-japanese-ocr.webp',
    title: '日语假名手写识别系统',
    desc: '基于 Kuzushiji-49（27 万张古典草书假名）训练 CNN——三层卷积 + BatchNorm/Dropout，早停 + 学习率调度，测试集 88.2%。Tkinter 手写板实时识别，含黑白反转与截图偏移两个实战踩坑修复。',
    metrics: ['Kuzushiji-49 · 27 万张', '88.2% 准确率', '手写板实时识别'],
    tech: ['TensorFlow', 'CNN', 'Tkinter', 'Keras', 'OpenCV'],
    link: { href: 'projects/japanese-ocr-report', label: '查看技术拆解 →' }
  },
  {
    num: '09', category: '计算机视觉', emoji: '📝',
    gradient: 'linear-gradient(135deg,#1c2733,#33475c)',
    accent: 'azure',
    cover: '/projects/covers/omr-grader.webp',
    title: '答题卡智能批改系统',
    desc: '纯 OpenCV 图像处理流水线实现自动阅卷：Canny 边缘检测 + 轮廓四顶点定位答题卡，透视变换校正为正视图，Otsu 二值化后霍夫圆检测选项，按填涂灰度判定答案并与标准答案比对判分标注。',
    metrics: ['全传统 CV 流水线', '透视校正 + 霍夫圆', '自动判分标注'],
    tech: ['Python', 'OpenCV', 'NumPy', 'Matplotlib'],
    link: { href: 'projects/omr-grader-report', label: '查看技术拆解 →' }
  },
  {
    num: '10', category: '工业视觉', emoji: '🏭',
    gradient: 'linear-gradient(135deg,#1a2129,#2e3d4d)',
    accent: 'teal',
    cover: '/projects/covers/industrial-vision.webp',
    title: '工业零件质检系统（ResNet18）',
    desc: '面向产线的合格 / 不合格自动判定：工业相机采图 + labelme 标注管线，ResNet18 迁移学习（ImageNet 权重）+ BCE 二分类，train/val/test 全流程评估，Gradio 检测台上传即判。实训覆盖亚克力板、纽扣、垫片、电阻、电池等十类零件检测课题。',
    metrics: ['ResNet18 迁移学习', '十类工业零件', 'Gradio 检测台'],
    tech: ['PyTorch', 'ResNet18', 'Gradio', 'labelme'],
    link: { href: 'projects/industrial-vision-report', label: '查看技术拆解 →' }
  }
];

// Web / 小程序组
export const projectsWeb: Project[] = [
  {
    num: '11', category: '数据可视化', emoji: '🗺️',
    gradient: 'linear-gradient(135deg,#1a3a1a,#2d5a1e)',
    accent: 'jade',
    cover: '/projects/covers/09-meizhou.svg',
    title: '梅州美食地理可视化系统',
    desc: 'Pyecharts 构建客家美食与水果地理分布交互可视化，包含地图、柱状图和推荐信息。',
    metrics: ['9 道菜品', '5 种水果', '多维交互图表'],
    tech: ['Python', 'Pyecharts', 'Geo', 'HTML'],
    link: { href: 'projects/meizhou-demo', label: '查看运行截图 →' }
  },
  {
    num: '12', category: '全栈开发', emoji: '🛒',
    gradient: 'linear-gradient(135deg,#1a3a2e,#0d4a3e)',
    accent: 'jade',
    cover: '/projects/covers/10-wx-store.webp',
    title: '动漫商城管理系统',
    desc: 'Java Servlet MVC 后端 + 微信小程序前端的完整电商应用——7 个 API 接口、图片上传、批量操作、Jackson JSON 序列化。小程序 6 个页面覆盖浏览、搜索、详情、管理全流程。',
    metrics: ['7 个 Servlet API', '6 个小程序页面', 'MySQL 数据存储'],
    tech: ['Java', 'Servlet', 'MySQL', '微信小程序', 'JSP'],
    link: { href: 'projects/wx-store-report', label: '查看项目详解 →' }
  },
  {
    num: '13', category: 'AI 生图', emoji: '✨',
    gradient: 'linear-gradient(135deg,#2b1645,#7c3aed)',
    accent: 'magenta',
    cover: '/projects/covers/11-ai-gallery.webp',
    title: 'AI 生图作品集',
    desc: 'ChatGPT、Gemini、Stable Diffusion WebUI、ComfyUI 四类 AI 工具生成的图片合集。产品广告、创意海报、风格迁移，探索 AI 在视觉创作中的实际应用。',
    metrics: ['4 类 AI 工具', '产品/海报/风格迁移', '完整画廊展示'],
    tech: ['ChatGPT', 'Gemini', 'SD WebUI', 'ComfyUI'],
    link: { href: 'projects/ai-gallery', label: '🖼️ 查看完整画廊' }
  },
  {
    num: '14', category: 'AI 视频', emoji: '🎬',
    gradient: 'linear-gradient(135deg,#0d1b2a,#1b2838)',
    accent: 'teal',
    cover: '/projects/covers/12-ai-video.webp',
    title: 'AI 视频作品',
    desc: 'AI 工具生成的视频内容——从画面生成到场景合成，探索人工智能在动态视觉和视频创作领域的可能性。',
    metrics: ['动态视觉生成', '场景合成探索', '视频作品页'],
    tech: ['AI视频', '视频生成', 'AI创作'],
    link: { href: 'projects/ai-video', label: '🎬 观看视频' }
  }
];

// ═══ 首页项目区的三级层级 ═══
// projectsMain / projectsAI / projectsWeb 仍是数据之源（按技术栈分组，详情页也在用）；
// 下面三个数组只表达"首页怎么排"——按分量而非按技术栈，所以顺序是手工定的。
const allProjects = [...projectsMain, ...projectsAI, ...projectsWeb];
const byNum = (n: string): Project => {
  const p = allProjects.find(x => x.num === n);
  if (!p) throw new Error(`projects.ts: 找不到编号 ${n} 的项目`);
  return p;
};

/** 特写级：真正跑在生产里、有硬指标的三个。01 稳 → 06 亮 → 05 实 */
export const projectsFeature: Project[] = ['01', '06', '05'].map(byNum);
/** 专题级：有完整技术拆解、但没有生产体量的六个 */
export const projectsDepth: Project[] = ['03', '04', '08', '07', '10', '12'].map(byNum);
/** 索引级：小品与作品合集，一行一条即可 */
export const projectsIndex: Project[] = ['02', '09', '11', '13', '14'].map(byNum);

// 项目详情页导航顺序（用于详情页上一个/下一个按钮）
export interface ProjectNavEntry {
  slug: string;        // URL slug（不含 .html 后缀）
  href: string;        // 完整相对路径
  num: string;         // 编号
  title: string;       // 短标题
  emoji: string;       // 图标
}

export const projectNav: ProjectNavEntry[] = [
  { slug: 'portfolio-report', href: 'projects/portfolio-report', num: '00', title: '全栈作品集网站', emoji: '🌙' },
  { slug: 'data-crawler-report', href: 'projects/data-crawler-report', num: '01', title: '多平台广告数据爬取', emoji: '🕷️' },
  { slug: 'brazil-cnpj-report', href: 'projects/brazil-cnpj-report', num: '02', title: '巴西 CNPJ 批量查询', emoji: '🇧🇷' },
  { slug: 'rpa-registration-system', href: 'projects/rpa-registration-system', num: '03', title: 'RPA 自动化系统', emoji: '🤖' },
  { slug: 'android-network-analysis', href: 'projects/android-network-analysis', num: '04', title: '安卓网络调试分析', emoji: '📡' },
  { slug: 'gesture-ppt-report', href: 'projects/gesture-ppt-report', num: '05', title: '手势控制 PPT', emoji: '✋' },
  { slug: 'cartoon-gan-report', href: 'projects/cartoon-gan-report', num: '06', title: '卡通风格迁移', emoji: '🎨' },
  { slug: 'news-classification-report', href: 'projects/news-classification-report', num: '07', title: '新闻文本分类', emoji: '📰' },
  { slug: 'japanese-ocr-report', href: 'projects/japanese-ocr-report', num: '08', title: '日语假名手写识别', emoji: '🇯🇵' },
  { slug: 'omr-grader-report', href: 'projects/omr-grader-report', num: '09', title: '答题卡智能批改', emoji: '📝' },
  { slug: 'industrial-vision-report', href: 'projects/industrial-vision-report', num: '10', title: '工业零件质检', emoji: '🏭' },
  { slug: 'meizhou-demo', href: 'projects/meizhou-demo', num: '11', title: '梅州美食可视化', emoji: '🗺️' },
  { slug: 'wx-store-report', href: 'projects/wx-store-report', num: '12', title: '动漫商城管理', emoji: '🛒' },
  { slug: 'ai-gallery', href: 'projects/ai-gallery', num: '13', title: 'AI 生图作品集', emoji: '✨' },
  { slug: 'ai-video', href: 'projects/ai-video', num: '14', title: 'AI 视频作品', emoji: '🎬' },
];
