#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Portfolio-Astro 服务器部署脚本
# 在服务器上运行: sudo bash server-deploy.sh
# 域名: www.qtxingyue.me / qtxingyue.me
# ═══════════════════════════════════════════════════════════
set -e

REPO="https://github.com/qtXingYue/anime-blog.git"
BRANCH="astro"
SRC_DIR="/var/www/portfolio-src"
WEB_ROOT="/var/www/portfolio"
BACKEND_DIR="/var/www/sakura-backend"
NODE_VERSION="20"

echo "🚀 Portfolio-Astro 部署开始..."

# ── 1. 安装 Node.js ──
echo "[1/7] 检查 Node.js..."
if ! command -v node &>/dev/null; then
    echo "  安装 Node.js $NODE_VERSION..."
    curl -fsSL "https://deb.nodesource.com/setup_$NODE_VERSION.x" | bash -
    apt install -y -qq nodejs
fi
echo "  Node: $(node -v)  npm: $(npm -v)"

# ── 2. 拉取最新源码 ──
echo "[2/7] 拉取源码 ($BRANCH 分支)..."
if [ -d "$SRC_DIR/.git" ]; then
    cd "$SRC_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    rm -rf "$SRC_DIR"
    git clone --branch "$BRANCH" --single-branch "$REPO" "$SRC_DIR"
    cd "$SRC_DIR"
fi

# ── 3. 安装依赖 ──
echo "[3/7] 安装 npm 依赖..."
npm ci --production=false 2>/dev/null || npm install

# ── 4. 构建 ──
echo "[4/7] 构建静态站点..."
npm run build

# ── 5. 部署到 Web 根目录 ──
echo "[5/7] 同步到 $WEB_ROOT..."
mkdir -p "$WEB_ROOT"
# 保留旧站点备份
if [ -d "$WEB_ROOT" ] && [ "$(ls -A $WEB_ROOT 2>/dev/null)" ]; then
    cp -r "$WEB_ROOT" "${WEB_ROOT}.bak.$(date +%Y%m%d%H%M%S)"
fi
rsync -a --delete "$SRC_DIR/dist/" "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"

# ── 6. 配置 Nginx ──
echo "[6/7] 配置 Nginx..."
cat > /etc/nginx/sites-available/portfolio << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name www.qtxingyue.me qtxingyue.me;
    root /var/www/portfolio;
    index index.html;

    # 旧博客路径 301 到并壳后的新页面（/blog/index.html 里还有跳转桩兜底）
    location = /blog { return 301 /blog.html; }
    location = /blog/ { return 301 /blog.html; }

    # 静态文件（Astro 构建产物）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理 → FastAPI 后端
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 管理后台 → FastAPI 后端
    location /admin {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 上传文件 → FastAPI StaticFiles
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host $host;
    }

    # gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # 静态资源长缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|webp|avif)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # HTML 不缓存（确保更新即时生效）
    location ~* \.html$ {
        add_header Cache-Control "no-cache, must-revalidate";
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 7. 确保后端运行 ──
echo "[7/7] 检查后端服务..."
if [ -d "$BACKEND_DIR" ]; then
    systemctl restart sakura-backend 2>/dev/null || echo "  后端服务未安装，请运行 deploy-backend.sh"
else
    echo "  后端目录 $BACKEND_DIR 不存在"
    echo "  如需后端功能，请从 anime-blog/server/ 部署"
fi

echo ""
echo "✅ 部署完成！"
echo "   站点:   http://www.qtxingyue.me"
echo "   后台:   http://www.qtxingyue.me/admin"
echo "   源码:   $SRC_DIR ($BRANCH 分支)"
echo "   产物:   $WEB_ROOT"
echo ""
echo "后续更新只需重新运行: sudo bash server-deploy.sh"
