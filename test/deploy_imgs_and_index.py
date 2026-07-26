#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""补传 industrial-imgs / omr-imgs 图片目录 + 新首页与 _astro，走既有 crontab 保护流程。
   顺带把这两个目录加进保护分支，避免下次 merge 被清。纯 ASCII/UTF-8 输出。"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

HOST = "47.89.230.167"; USER = "root"; PASSWORD = "123456@nM"
TEST = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(os.path.dirname(TEST), 'dist')
REMOTE = "/var/www/portfolio"
CRON_LINE = ("* * * * * cd /var/www/portfolio && git fetch origin main && "
             "git reset --hard origin/main > /dev/null 2>&1 && "
             "git merge astro-refactor -X theirs > /dev/null 2>&1 && "
             "chown -R www-data:www-data /var/www/portfolio > /dev/null 2>&1")

ssh = paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)
if ssh.get_transport(): ssh.get_transport().set_keepalive(5)

def run(cmd, timeout=60):
    print(f'>>> {cmd}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').rstrip()
    err = stderr.read().decode('utf-8', errors='replace').rstrip()
    if out: print(out)
    if err: print(f'[stderr] {err}')

def sftp_mkdirs(sftp, d):
    parts = d.strip('/').split('/'); p = ''
    for seg in parts:
        p += '/' + seg
        try: sftp.stat(p)
        except FileNotFoundError: sftp.mkdir(p)

print('--- 1. disable crontab ---')
run("crontab -l | sed 's/^\\* \\* \\* \\* \\* cd/# * * * * * cd/' | crontab -")

print('\n--- 2. upload ---')
sftp = ssh.open_sftp()
def put(local, remote):
    sftp_mkdirs(sftp, os.path.dirname(remote))
    print(f'  put {remote.replace(REMOTE + "/", ""):46s} {os.path.getsize(local):>9,} B')
    sftp.put(local, remote)

put(os.path.join(DIST, 'index.html'), f'{REMOTE}/index.html')
for d in ('industrial-imgs', 'omr-imgs'):
    src = os.path.join(DIST, 'projects', d)
    for f in os.listdir(src):
        put(os.path.join(src, f), f'{REMOTE}/projects/{d}/{f}')
for f in os.listdir(os.path.join(DIST, '_astro')):
    p = os.path.join(DIST, '_astro', f)
    if os.path.isfile(p):
        put(p, f'{REMOTE}/_astro/{f}')
sftp.close()

print('\n--- 3. protection branch ---')
run(f'cd {REMOTE} && git checkout main 2>&1 | tail -1')
run(f'cd {REMOTE} && git branch -D astro-refactor 2>/dev/null; git checkout -b astro-refactor 2>&1 | tail -1')
run(f'cd {REMOTE} && git add -A index.html _astro projects && git status --short | head -8')
run(f'cd {REMOTE} && git commit -m "fix: remove scroll progress widget, add missing project images" 2>&1 | tail -1 || echo no-changes')
run(f'cd {REMOTE} && git checkout main 2>&1 | tail -1')

print('\n--- 4. restore crontab + merge ---')
run(f"echo '{CRON_LINE}' | crontab -")
run(f'cd {REMOTE} && git fetch origin main 2>&1 | tail -1', timeout=120)
run(f'cd {REMOTE} && git reset --hard origin/main 2>&1 | tail -1')
run(f'cd {REMOTE} && git merge astro-refactor -X theirs 2>&1 | tail -1')
run(f'chown -R www-data:www-data {REMOTE}')

print('\n--- 5. verify ---')
run('curl -sI https://qtxingyue.me/projects/industrial-imgs/industrial-camera.webp --max-time 15 | head -1')
run('curl -sI https://qtxingyue.me/projects/omr-imgs/omr-results.webp --max-time 15 | head -1')
run('curl -s https://qtxingyue.me/ --max-time 15 | grep -c projectProgress; echo "(0 = widget gone)"')
ssh.close()
print('\n--- done ---')
