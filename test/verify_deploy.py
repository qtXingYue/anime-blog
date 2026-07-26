#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""部署后验证（纯 ASCII 输出，避免 GBK 控制台编码崩溃）"""
import sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import paramiko

HOST = "47.89.230.167"
USER = "root"
PASSWORD = "123456@nM"

def run(ssh, cmd, timeout=60):
    print(f'>>> {cmd}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').rstrip()
    err = stderr.read().decode('utf-8', errors='replace').rstrip()
    if out: print(out)
    if err: print(f'[stderr] {err}')
    return out

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=20,
            allow_agent=False, look_for_keys=False)

print('--- 1. nginx /blog 301 config ---')
run(ssh, 'grep -n "location = /blog" /etc/nginx/sites-available/portfolio || echo "[MISSING] no 301 rules"')
run(ssh, 'nginx -t 2>&1 | tail -1')

print('\n--- 2. page content checks ---')
run(ssh, 'curl -s https://qtxingyue.me/blog.html --max-time 15 | grep -c "articleList"')
run(ssh, 'curl -s https://qtxingyue.me/ --max-time 15 | grep -c "nav-gh"')
run(ssh, 'curl -s https://qtxingyue.me/ --max-time 15 | grep -c "bg-lab"')
run(ssh, 'curl -s https://qtxingyue.me/ --max-time 15 | grep -o "开放工作机会[^<]*" | head -1')
run(ssh, 'curl -sI https://qtxingyue.me/blog --max-time 15 | head -1')
run(ssh, 'curl -sI https://qtxingyue.me/blog/ --max-time 15 | head -1')

print('\n--- 3. wait 70s, confirm crontab merge does not roll back ---')
time.sleep(70)
run(ssh, 'curl -s https://qtxingyue.me/ --max-time 15 | grep -c "nav-gh"')
run(ssh, 'curl -sI https://qtxingyue.me/blog.html --max-time 15 | head -1')
run(ssh, 'cd /var/www/portfolio && git log --oneline -2')

ssh.close()
print('\n--- verify done ---')
