export interface SkillTag {
  label: string;
  primary?: boolean;
}

export interface SkillCategory {
  title: string;
  tags: SkillTag[];
}

export const skillCategories: SkillCategory[] = [
  {
    title: '主力技术',
    tags: [
      { label: 'Python', primary: true },
      { label: 'Java', primary: true },
      { label: 'SQL' },
      { label: 'HTML/CSS' },
      { label: 'JavaScript' }
    ]
  },
  {
    title: 'AI 视觉实践',
    tags: [
      { label: 'TensorFlow', primary: true },
      { label: 'PyTorch', primary: true },
      { label: 'MediaPipe', primary: true },
      { label: 'OpenCV', primary: true },
      { label: 'Keras' },
      { label: 'GAN' },
      { label: 'CNN' },
      { label: 'NLP' },
      { label: 'Jieba' },
      { label: 'Computer Vision' }
    ]
  },
  {
    title: '数据与自动化',
    tags: [
      { label: 'Playwright', primary: true },
      { label: 'Streamlit' },
      { label: 'Pyecharts' },
      { label: 'Pandas' },
      { label: 'REST API' },
      { label: 'Excel/CSV' }
    ]
  },
  {
    title: '框架与部署',
    tags: [
      { label: 'FastAPI' },
      { label: 'Gradio' },
      { label: '微信小程序' },
      { label: 'CustomTkinter' },
      { label: 'MySQL' },
      { label: 'Nginx' },
      { label: 'Linux' },
      { label: 'Git/GitHub' }
    ]
  }
];

export const stats = [
  { number: '12', label: '实战项目' },
  { number: '5+', label: '数据平台集成' },
  { number: '300+', label: '活跃广告账号' },
  { number: '省二等', label: '蓝桥杯 Python' },
  { number: 'N2', label: '日语能力' },
  { number: 'HCCDA', label: '华为云 AI 认证' }
];
