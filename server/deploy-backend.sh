#!/bin/bash
# 一键部署/更新后端服务

set -e

echo "=== Updating backend ==="

# 安装 Python 依赖
pip3 install fastapi uvicorn python-multipart -q

# 停止旧服务
pkill -f "uvicorn main:app" 2>/dev/null || true

# 启动后端 (后台运行)
cd /var/www/portfolio/server
ADMIN_PASS=sakura2026 nohup python3 main.py > /var/log/sakura.log 2>&1 &

echo "=== Backend running on :8000 ==="
echo ""
echo "Next: update Nginx config to add /api and /admin proxy"
echo "Then: sudo nginx -t && sudo systemctl reload nginx"
