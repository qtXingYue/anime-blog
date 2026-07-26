#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""应用 test/changed/ 里的 P0 优化改动:先备份原文件到 test/backup_original/,再覆盖。
可重复运行(幂等);回滚请运行 revert_changes.py。"""
import json
import shutil
import sys
from pathlib import Path

TEST = Path(__file__).resolve().parent
ROOT = TEST.parent                      # portfolio-astro/
CHANGED = TEST / 'changed'
BACKUP = TEST / 'backup_original'
MANIFEST = TEST / 'apply_manifest.json'

# 应用后需要重命名的文件:750KB 的 720p 视频顶替 35MB 原视频
RENAMES = [('public/desktop-bg-720.mp4', 'public/desktop-bg.mp4')]
# 移入备份的冗余大文件(不再被引用)
REDUNDANT = ['public/bg-video.orig.mp4', 'public/bg-video.mp4',
             'public/sakura-bg.mp4', 'public/_bg-720.mp4']


def main():
    if not CHANGED.is_dir():
        sys.exit('未找到 test/changed/ 目录,包不完整。')

    manifest = {'backed_up': [], 'added': [], 'moved_redundant': []}
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))

    files = [p for p in CHANGED.rglob('*') if p.is_file()]
    print(f'待应用文件:{len(files)} 个')

    for src in files:
        rel = src.relative_to(CHANGED)
        dst = ROOT / rel
        bak = BACKUP / rel
        if dst.exists():
            if not bak.exists():                       # 只备份第一次看到的原版
                bak.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(dst, bak)
                manifest['backed_up'].append(str(rel).replace('\\', '/'))
        else:
            r = str(rel).replace('\\', '/')
            if r not in manifest['added']:
                manifest['added'].append(r)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    # 重命名:desktop-bg-720.mp4 → desktop-bg.mp4(35MB 原版已在上面备份逻辑外,单独备份)
    for src_rel, dst_rel in RENAMES:
        src, dst = ROOT / src_rel, ROOT / dst_rel
        bak = BACKUP / dst_rel
        if src.exists():
            if dst.exists() and not bak.exists():
                bak.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(dst), str(bak))        # 35MB 移走,不留副本
                manifest['backed_up'].append(dst_rel)
            shutil.move(str(src), str(dst))
            r = src_rel
            if r in manifest['added']:
                manifest['added'].remove(r)
            if dst_rel not in manifest['added']:
                manifest['added'].append(dst_rel)

    # 冗余视频移入备份
    for rel in REDUNDANT:
        f = ROOT / rel
        bak = BACKUP / rel
        if f.exists() and not bak.exists():
            bak.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(f), str(bak))
            manifest['moved_redundant'].append(rel)
            print(f'  冗余文件移入备份:{rel}')

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'完成:备份 {len(manifest["backed_up"])} 个,新增 {len(manifest["added"])} 个,'
          f'移除冗余 {len(manifest["moved_redundant"])} 个。')
    print('下一步:npm run dev 本地核验;回滚:python test/revert_changes.py')


if __name__ == '__main__':
    main()
