#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""补验：reload nginx 使 301 生效 + 重连检查 crontab 未回滚"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

HOST = "47.89.230.167"; USER = "root"; PASSWORD = "123456@nM"

def connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=20,
                allow_agent=False, look_for_keys=False)
    if ssh.get_transport(): ssh.get_transport().set_keepalive(5)
    return ssh

def run(ssh, cmd, timeout=60):
    print(f'>>> {cmd}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').rstrip()
    err = stderr.read().decode('utf-8', errors='replace').rstrip()
    if out: print(out)
    if err: print(f'[stderr] {err}')

ssh = connect()
print('--- reload nginx, retest 301 ---')
run(ssh, 'nginx -t && nginx -s reload && echo RELOADED')
run(ssh, 'sleep 1; curl -sI https://qtxingyue.me/blog --max-time 15 | head -2')
run(ssh, 'curl -sI https://qtxingyue.me/blog/ --max-time 15 | head -2')

print('\n--- crontab rollback check (deploy finished several minutes ago, cron has run) ---')
run(ssh, 'crontab -l | head -1')
run(ssh, 'cd /var/www/portfolio && git log --oneline -2')
run(ssh, 'curl -s https://qtxingyue.me/ --max-time 15 | grep -c "nav-gh"')
run(ssh, 'curl -sI https://qtxingyue.me/blog.html --max-time 15 | head -1')
run(ssh, 'ls -la /var/www/portfolio/blog.html /var/www/portfolio/blog/index.html | head -3')
ssh.close()
print('\n--- done ---')
