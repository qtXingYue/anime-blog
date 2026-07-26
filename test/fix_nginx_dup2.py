#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 /blog 301 写进真正被加载的 sites-enabled/portfolio；
   挪走 sites-enabled 里的 .bak（nginx 会加载该目录下所有文件，正是冲突警告来源）"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

HOST = "47.89.230.167"; USER = "root"; PASSWORD = "123456@nM"
LIVE = '/etc/nginx/sites-enabled/portfolio'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=20,
            allow_agent=False, look_for_keys=False)
if ssh.get_transport(): ssh.get_transport().set_keepalive(5)

def run(cmd, timeout=60):
    print(f'>>> {cmd}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').rstrip()
    err = stderr.read().decode('utf-8', errors='replace').rstrip()
    if out: print(out)
    if err: print(f'[stderr] {err}')
    return out

print('--- live config content ---')
run(f'cat -n {LIVE}')

print('\n--- backup then patch (idempotent) ---')
run(f'cp {LIVE} /root/portfolio.nginx.bak.$(date +%Y%m%d%H%M%S)')
run(f'grep -q "location = /blog " {LIVE} && echo ALREADY || '
    f"sed -i '0,/location \\/ {{/s||location = /blog {{ return 301 /blog.html; }}\\n    location = /blog/ {{ return 301 /blog.html; }}\\n\\n    location / {{|' {LIVE}")
run(f'grep -n "location = /blog" {LIVE}')

print('\n--- move stray .bak out of sites-enabled ---')
run('mv /etc/nginx/sites-enabled/portfolio.bak /etc/nginx/portfolio.bak.old 2>&1; ls /etc/nginx/sites-enabled/')

print('\n--- test + reload ---')
run('nginx -t 2>&1 | tail -1')
run('nginx -s reload 2>&1 | grep -c warn; echo reload-done')

print('\n--- verify 301 ---')
run('sleep 1; curl -sI https://qtxingyue.me/blog --max-time 15 | head -3')
run('curl -sI https://qtxingyue.me/blog/ --max-time 15 | head -3')
run('curl -sI https://qtxingyue.me/blog.html --max-time 15 | head -1')
run('curl -sI https://qtxingyue.me/ --max-time 15 | head -1')
ssh.close()
print('\n--- done ---')
