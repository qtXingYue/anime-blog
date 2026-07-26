#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""找出真正在服务 qtxingyue.me 的 nginx 配置，把 /blog 301 加到那份里"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

HOST = "47.89.230.167"; USER = "root"; PASSWORD = "123456@nM"

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

print('--- which configs claim qtxingyue.me ---')
run('ls -la /etc/nginx/sites-enabled/')
run('grep -rn "server_name" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | grep -i qtxingyue')
print('\n--- effective config for the 443 server (first wins) ---')
run("nginx -T 2>/dev/null | awk '/# configuration file/{f=$4} /listen 443/{print f}' | head -5")
ssh.close()
