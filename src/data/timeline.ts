export interface TimelineEntry {
  date: string;
  title: string;
  org?: string;
  desc: string;
}

export const honors: TimelineEntry[] = [
  {
    date: '2025',
    title: '蓝桥杯 Python 赛道 广东省二等奖',
    desc: '省级竞赛获奖，验证 Python 编程、算法实现和现场问题拆解能力。'
  },
  {
    date: '2025',
    title: '华为云 HCCDA-AI 认证',
    desc: '覆盖 AI 基础、云上模型应用与工程化部署认知。'
  },
  {
    date: '2025',
    title: '日语能力测试 JLPT N2',
    desc: '具备日语资料阅读和工具文档理解能力，持续冲刺 N1。'
  },
  {
    date: '2023-2025',
    title: '校级三等奖学金 · 优秀学生干部',
    desc: '连续学习表现和组织协作经历，兼顾项目开发、运营与课程成绩。'
  }
];

export const experience: TimelineEntry[] = [
  {
    date: '2026.04 — 2026.07',
    title: '广告运营 · 多平台数据系统负责人',
    org: '海客熵连科技',
    desc: '负责跨境广告投放账户日常运营，独立设计并开发多平台广告消耗数据聚合监控系统（5800 行代码 / 39 模块），一键自动抓取与看板展示，日均处理 300+ 账号数据。'
  },
  {
    date: '2023.09 — 2026.07',
    title: '人工智能技术应用 · 专科毕业',
    org: '深圳职业技术大学',
    desc: '主修 Python/Java 编程、深度学习、NLP、网页与小程序开发。毕业设计：计算机视觉人机交互（手势控制 PPT 系统）。'
  },
  {
    date: '2023.11 — 2025.09',
    title: '学院公众号运营负责人',
    org: '深圳职业技术大学',
    desc: '统筹选题、撰写、发布与多渠道传播，公众号粉丝过万；单篇推文最高阅读量 7,000+。'
  },
  {
    date: '持续',
    title: '产品体验 · 数码测评',
    org: 'ColorOS 共创成员',
    desc: '参与 OPPO 产品体验反馈、英雄联盟手游功能评估，持续输出改进建议。通过动漫、日剧和原版教材系统学习日语，目标 N1。'
  }
];
