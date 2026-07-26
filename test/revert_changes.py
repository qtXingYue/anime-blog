#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""回滚 apply_changes.py 的全部改动:还原备份文件,删除新增文件。"""
import json
import shutil
import sys
from pathlib import Path

TEST = Path(__file__).resolve().parent
ROOT = TEST.parent
BACKUP = TEST / 'backup_original'
MANIFEST = TEST / 'apply_manifest.json'


def main():
    if not MANIFEST.exists():
        sys.exit('未找到 apply_manifest.json——尚未应用过,无需回滚。')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))

    # 删除新增文件
    for rel in manifest.get('added', []):
        f = ROOT / rel
        if f.exists():
            f.unlink()
    # 清理可能残留的空目录
    for rel in ('public/projects/covers', 'public/fonts'):
        d = ROOT / rel
        if d.is_dir() and not any(d.iterdir()):
            d.rmdir()

    # 还原备份(含被移走的冗余视频)
    restored = 0
    for rel in manifest.get('backed_up', []) + manifest.get('moved_redundant', []):
        bak = BACKUP / rel
        if bak.exists():
            dst = ROOT / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(bak, dst)
            restored += 1

    MANIFEST.unlink()
    print(f'回滚完成:还原 {restored} 个文件,删除新增 {len(manifest.get("added", []))} 个。'
          f'备份仍保留在 test/backup_original/,确认无误后可手动删除。')


if __name__ == '__main__':
    main()
