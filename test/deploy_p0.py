#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""P0 优化一键整合:应用改动 → 本地 git 提交 → npm build → 上传服务器 → 服务器分支保护提交 → 验证。
流程完全复刻 deploy_videobg.py 的既有模式(crontab 停启 + astro-refactor 保护分支)。
用法:在 portfolio-astro 目录运行  python test/deploy_p0.py
"""
import os
import subprocess
import sys
import time

try:
    import paramiko
except ImportError:
    sys.exit('缺少 paramiko:先执行  pip install paramiko')

HOST = "47.89.230.167"
USER = "root"
PASSWORD = "123456@nM"
PORT = 22

TEST = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(TEST)                    # portfolio-astro/
DIST = os.path.join(PROJECT, 'dist')
REMOTE = "/var/www/portfolio"

CRON_LINE = ("* * * * * cd /var/www/portfolio && git fetch origin main && "
             "git reset --hard origin/main > /dev/null 2>&1 && "
             "git merge astro-refactor -X theirs > /dev/null 2>&1 && "
             "chown -R www-data:www-data /var/www/portfolio > /dev/null 2>&1")


def local(cmd, cwd=PROJECT, check=True, timeout=600):
    print(f'\n$ {cmd}')
    r = subprocess.run(cmd, cwd=cwd, shell=True, timeout=timeout)
    if check and r.returncode != 0:
        sys.exit(f'命令失败(exit {r.returncode}),流程中止——尚未触碰服务器,可安全重试。')
    return r.returncode


def run(ssh, cmd, timeout=60):
    print(f'>>> {cmd}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').rstrip()
    err = stderr.read().decode('utf-8', errors='replace').rstrip()
    code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print(f'[stderr] {err}')
    return code, out, err


def create_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD,
                timeout=20, allow_agent=False, look_for_keys=False)
    if ssh.get_transport():
        ssh.get_transport().set_keepalive(5)
    return ssh


def sftp_mkdirs(sftp, remote_dir):
    parts = remote_dir.strip('/').split('/')
    path = ''
    for p in parts:
        path += '/' + p
        try:
            sftp.stat(path)
        except FileNotFoundError:
            sftp.mkdir(path)


def put(sftp, local_path, remote_path):
    sftp_mkdirs(sftp, os.path.dirname(remote_path))
    print(f'  上传 {os.path.basename(remote_path):40s} {os.path.getsize(local_path):>9,} B')
    sftp.put(local_path, remote_path)


def main():
    # ── 0. 应用改动(幂等)──
    print('=== 0. 应用 test/changed 改动 ===')
    local(f'"{sys.executable}" "{os.path.join(TEST, "apply_changes.py")}"')

    # ── 1. 本地 git 提交 ──
    print('\n=== 1. 本地 git 提交 ===')
    if os.path.isdir(os.path.join(PROJECT, '.git')):
        local('git add -A src public test astro.config.mjs', check=False)
        local('git commit -m "feat(P0): 真实封面替换emoji + 自托管思源宋体 + 节奏收紧 + 视频瘦身 + SVG图标 + 亮色修正"',
              check=False)  # 已提交过会返回非零,不中止
        local('git log --oneline -2', check=False)
    else:
        print('未发现 .git,跳过本地提交。')

    # ── 2. 本地构建 ──
    print('\n=== 2. npm run build ===')
    local('npm run build')
    if not os.path.exists(os.path.join(DIST, 'index.html')):
        sys.exit('构建产物缺失,中止。')

    # ── 3. 禁用服务器 crontab ──
    print('\n=== 3. 禁用服务器 crontab ===')
    ssh = create_ssh()
    print('连接成功!')
    run(ssh, "crontab -l | sed 's/^\\* \\* \\* \\* \\* cd/# * * * * * cd/' | crontab -")

    # ── 4. 上传 ──
    print('\n=== 4. 上传 dist ===')
    sftp = ssh.open_sftp()
    put(sftp, os.path.join(DIST, 'index.html'), f'{REMOTE}/index.html')
    astro_dir = os.path.join(DIST, '_astro')
    for f in os.listdir(astro_dir):
        p = os.path.join(astro_dir, f)
        if os.path.isfile(p):
            put(sftp, p, f'{REMOTE}/_astro/{f}')
    proj_dir = os.path.join(DIST, 'projects')
    for f in os.listdir(proj_dir):
        p = os.path.join(proj_dir, f)
        if os.path.isfile(p) and f.endswith('.html'):
            put(sftp, p, f'{REMOTE}/projects/{f}')
    for f in os.listdir(os.path.join(proj_dir, 'covers')):
        put(sftp, os.path.join(proj_dir, 'covers', f), f'{REMOTE}/projects/covers/{f}')
    for f in os.listdir(os.path.join(DIST, 'fonts')):
        put(sftp, os.path.join(DIST, 'fonts', f), f'{REMOTE}/fonts/{f}')
    for f in ('og-image.png', 'bg-poster.jpg', 'desktop-bg.webm', 'desktop-bg.mp4'):
        p = os.path.join(DIST, f)
        if os.path.exists(p):
            put(sftp, p, f'{REMOTE}/{f}')
    sftp.close()
    print('上传完成!')

    # ── 5. 服务器 git 保护分支提交 ──
    print('\n=== 5. 服务器 astro-refactor 保护分支 ===')
    run(ssh, f'cd {REMOTE} && git config user.email "qtXingYue@users.noreply.github.com" && git config user.name "qtXingYue"')
    run(ssh, f'cd {REMOTE} && git checkout main 2>&1 | tail -1')
    run(ssh, f'cd {REMOTE} && git branch -D astro-refactor 2>/dev/null; git checkout -b astro-refactor')
    run(ssh, f'cd {REMOTE} && git add -A index.html _astro projects/*.html projects/covers fonts og-image.png bg-poster.jpg desktop-bg.webm 2>&1')
    run(ssh, f'cd {REMOTE} && git status --short | head -12')
    run(ssh, f'cd {REMOTE} && git commit -m "feat(P0): real covers + self-hosted serif + tighter rhythm + light video + svg icons" 2>&1 | tail -2 || echo "no changes"')
    run(ssh, f'cd {REMOTE} && git checkout main 2>&1 | tail -1')

    # ── 6. 恢复 crontab 并手动执行一轮 merge ──
    print('\n=== 6. 恢复 crontab + 手动 merge ===')
    run(ssh, f"echo '{CRON_LINE}' | crontab -")
    run(ssh, 'crontab -l | head -2')
    run(ssh, f'cd {REMOTE} && git fetch origin main 2>&1 | tail -1', timeout=120)
    run(ssh, f'cd {REMOTE} && git reset --hard origin/main 2>&1 | tail -1')
    run(ssh, f'cd {REMOTE} && git merge astro-refactor -X theirs 2>&1 | tail -2')

    # ── 7. 权限 + nginx ──
    print('\n=== 7. 权限 + nginx reload ===')
    run(ssh, f'chown -R www-data:www-data {REMOTE}')
    run(ssh, f'find {REMOTE}/_astro {REMOTE}/fonts {REMOTE}/projects/covers -type f -exec chmod 644 {{}} \\; 2>/dev/null || true')
    run(ssh, 'nginx -t && nginx -s reload')

    # ── 8. 验证 ──
    print('\n=== 8. HTTP 验证 ===')
    checks = ['/', '/projects/data-crawler-report.html',
              '/fonts/noto-serif-sc-900.woff', '/projects/covers/01-data-crawler.webp',
              '/og-image.png', '/desktop-bg.webm']
    for c in checks:
        run(ssh, f'curl -sI https://qtxingyue.me{c} --max-time 15 | head -1')
    run(ssh, 'curl -s https://qtxingyue.me/ --max-time 15 | grep -c "noto-serif-sc" && echo "首页已引用新字体 ✓"')

    print('\n=== 9. 等待 65s 验证 crontab 不会回滚 ===')
    time.sleep(65)
    run(ssh, 'curl -sI https://qtxingyue.me/fonts/noto-serif-sc-900.woff --max-time 15 | head -1')
    run(ssh, f'ls -la {REMOTE}/projects/covers | head -5')

    ssh.close()
    print('\n=== 部署完成!浏览器强刷 https://qtxingyue.me/ 查看效果 ===')


if __name__ == '__main__':
    main()
