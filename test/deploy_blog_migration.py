#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""博客并壳部署:上传新 blog.html/跳转桩/全站 HTML+_astro → nginx 加 301 → 保护分支提交 → 验证。
流程复刻 deploy_p0.py(crontab 停启 + astro-refactor 保护分支)。
用法:在 portfolio-astro 目录运行  python test/deploy_blog_migration.py
"""
import os
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
PROJECT = os.path.dirname(TEST)
DIST = os.path.join(PROJECT, 'dist')
REMOTE = "/var/www/portfolio"
NGINX_CONF = "/etc/nginx/sites-available/portfolio"

CRON_LINE = ("* * * * * cd /var/www/portfolio && git fetch origin main && "
             "git reset --hard origin/main > /dev/null 2>&1 && "
             "git merge astro-refactor -X theirs > /dev/null 2>&1 && "
             "chown -R www-data:www-data /var/www/portfolio > /dev/null 2>&1")


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
    print(f'  上传 {remote_path.replace(REMOTE + "/", ""):44s} {os.path.getsize(local_path):>9,} B')
    sftp.put(local_path, remote_path)


def main():
    if not os.path.exists(os.path.join(DIST, 'blog.html')):
        sys.exit('dist/blog.html 缺失 — 先 npm run build。')

    ssh = create_ssh()
    print('连接成功!')

    # ── 1. 禁用 crontab ──
    print('\n=== 1. 禁用 crontab ===')
    run(ssh, "crontab -l | sed 's/^\\* \\* \\* \\* \\* cd/# * * * * * cd/' | crontab -")

    # ── 2. 上传 ──
    print('\n=== 2. 上传 dist(全站 HTML + _astro + blog)===')
    sftp = ssh.open_sftp()
    for f in ('index.html', 'blog.html', '404.html', 'sitemap.xml'):
        p = os.path.join(DIST, f)
        if os.path.exists(p):
            put(sftp, p, f'{REMOTE}/{f}')
    put(sftp, os.path.join(DIST, 'blog', 'index.html'), f'{REMOTE}/blog/index.html')
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
    sftp.close()
    print('上传完成!')

    # ── 3. 清理旧博客残留 ──
    print('\n=== 3. 清理 assets/common.css(旧博客样式,已并入构建产物)===')
    run(ssh, f'rm -f {REMOTE}/assets/common.css && rmdir {REMOTE}/assets 2>/dev/null; ls {REMOTE}/assets 2>&1 | head -3')

    # ── 4. nginx 追加 /blog 301(幂等:已有则跳过;只插入,不覆盖线上配置)──
    print('\n=== 4. nginx /blog 301 ===')
    run(ssh, f'grep -n "location = /blog" {NGINX_CONF} || echo "NOT_PRESENT"')
    code, out, _ = run(ssh, f'grep -c "location = /blog " {NGINX_CONF} 2>/dev/null; true')
    if 'location = /blog' not in out or out.strip() == '0':
        sed = (r"sed -i '0,/location \/ {/s||location = /blog { return 301 /blog.html; }\n"
               r"    location = /blog/ { return 301 /blog.html; }\n\n    location / {|' " + NGINX_CONF)
        run(ssh, sed)
    run(ssh, f'grep -n -A1 "location = /blog" {NGINX_CONF} | head -6')
    run(ssh, 'nginx -t && nginx -s reload')

    # ── 5. 服务器 astro-refactor 保护分支 ──
    print('\n=== 5. 服务器保护分支提交 ===')
    run(ssh, f'cd {REMOTE} && git config user.email "qtXingYue@users.noreply.github.com" && git config user.name "qtXingYue"')
    run(ssh, f'cd {REMOTE} && git checkout main 2>&1 | tail -1')
    run(ssh, f'cd {REMOTE} && git branch -D astro-refactor 2>/dev/null; git checkout -b astro-refactor')
    run(ssh, f'cd {REMOTE} && git add -A index.html blog.html blog 404.html sitemap.xml assets _astro projects 2>/dev/null; git add -A index.html blog.html blog _astro projects')
    run(ssh, f'cd {REMOTE} && git status --short | head -12')
    run(ssh, f'cd {REMOTE} && git commit -m "feat: blog merged into astro shell, old /blog/ 301 stub" 2>&1 | tail -2 || echo "no changes"')
    run(ssh, f'cd {REMOTE} && git checkout main 2>&1 | tail -1')

    # ── 6. 恢复 crontab + 手动 merge 一轮 ──
    print('\n=== 6. 恢复 crontab + merge ===')
    run(ssh, f"echo '{CRON_LINE}' | crontab -")
    run(ssh, 'crontab -l | head -2')
    run(ssh, f'cd {REMOTE} && git fetch origin main 2>&1 | tail -1', timeout=120)
    run(ssh, f'cd {REMOTE} && git reset --hard origin/main 2>&1 | tail -1')
    run(ssh, f'cd {REMOTE} && git merge astro-refactor -X theirs 2>&1 | tail -2')
    run(ssh, f'chown -R www-data:www-data {REMOTE}')

    # ── 7. 验证 ──
    print('\n=== 7. HTTP 验证 ===')
    for c in ('/blog.html', '/blog', '/blog/', '/', '/sitemap.xml'):
        run(ssh, f'curl -sI https://qtxingyue.me{c} --max-time 15 | head -2')
    run(ssh, 'curl -s https://qtxingyue.me/blog.html --max-time 15 | grep -c "articleList" && echo "blog.html 挂载点 ✓"')
    run(ssh, 'curl -s https://qtxingyue.me/ --max-time 15 | grep -c "blog.html" && echo "首页导航已指向 blog.html ✓"')
    run(ssh, 'curl -s https://qtxingyue.me/api/articles --max-time 15 | head -c 200; echo')

    print('\n=== 8. 等待 65s 验证 crontab merge 不回滚 ===')
    time.sleep(65)
    run(ssh, 'curl -sI https://qtxingyue.me/blog.html --max-time 15 | head -1')
    run(ssh, 'curl -sI https://qtxingyue.me/blog/ --max-time 15 | head -1')

    ssh.close()
    print('\n=== 部署完成!===')


if __name__ == '__main__':
    main()
