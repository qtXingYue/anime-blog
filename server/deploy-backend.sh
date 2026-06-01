#!/bin/bash
# Sakura Backend 一键部署/更新
# 在服务器上运行: sudo bash deploy-backend.sh

set -e
echo "=== Sakura Backend Deploy ==="

# 1. 安装 Python3 和 pip3
echo "[1/5] Checking Python..."
if ! command -v pip3 &>/dev/null; then
    apt update -qq && apt install -y -qq python3-pip python3-venv
fi

# 2. 安装 Python 依赖
echo "[2/5] Installing Python deps..."
pip3 install fastapi uvicorn python-multipart -q

# 3. 配置 Nginx (代理 /api /admin /uploads 到后端)
echo "[3/5] Updating Nginx config..."
cp "$(dirname "$0")/nginx-portfolio.conf" /etc/nginx/sites-available/portfolio
nginx -t && systemctl reload nginx

# 4. 安装 systemd 服务 (自动启动 + 崩溃重启)
echo "[4/5] Installing systemd service..."
cp "$(dirname "$0")/sakura-backend.service" /etc/systemd/system/sakura-backend.service
systemctl daemon-reload
systemctl enable sakura-backend

# 5. 重启后端服务
echo "[5/5] Starting backend..."
systemctl restart sakura-backend
sleep 2
systemctl status sakura-backend --no-pager

echo ""
echo "=== Done! ==="
echo "  Site:     http://www.qtxingyue.me"
echo "  Admin:    http://www.qtxingyue.me/admin (密码: sakura2026)"
echo "  Status:   sudo systemctl status sakura-backend"
echo "  Logs:     sudo journalctl -u sakura-backend -f"
