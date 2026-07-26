#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
重新生成标题用的思源宋体子集。

用法：
    python scripts/make-font-subset.py

做的事：
    1. 扫描 src/ 与 public/ 里所有会显示给用户的文案，收集实际用到的字符
    2. 从系统安装的可变字体 NotoSerifSC-VF.ttf 抽出 wght=700 / 900 两个静态实例
    3. 按收集到的字符子集化，写入 public/fonts/noto-serif-sc-{700,900}.woff

改了站点文案（尤其是新增标题）之后重跑一次，避免出现子集缺字、
个别字静默回退成系统宋体的情况（P0 那版子集就漏了「室」，导致
实验室页面的标题一个字和其它字不同粗细）。

依赖：pip install fonttools brotli
"""
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.subset import Subsetter, Options

ROOT = Path(__file__).resolve().parent.parent
VF_CANDIDATES = [
    Path(r"C:\Windows\Fonts\NotoSerifSC-VF.ttf"),
    ROOT / "scripts" / "NotoSerifSC-VF.ttf",
]
OUT_DIR = ROOT / "public" / "fonts"
WEIGHTS = [700, 900]

# 扫描这些文件里的文案
SCAN_GLOBS = [
    "src/**/*.astro",
    "src/**/*.ts",
    "src/**/*.vue",
    "src/**/*.js",
    "public/*.html",
]

# 兜底字符：标点、数字、拉丁字母，以及后端动态内容可能出现的常用字
ALWAYS = (
    "0123456789"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    " ·—－-–—…、。，！？；：（）()《》〈〉「」『』【】"
    "\"'“”‘’/\\|+=*&%#@~^_<>[]{}$￥°"
    "年月日时分秒周今昨明第共个的了在和与及或"
)


def collect_chars() -> set:
    chars = set(ALWAYS)
    files = []
    for pattern in SCAN_GLOBS:
        files.extend(ROOT.glob(pattern))
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        # 只保留 CJK、日文假名与全角标点；ASCII 已在 ALWAYS 里覆盖
        for ch in text:
            if "\u4e00" <= ch <= "\u9fff" or "\u3040" <= ch <= "\u30ff" or "\u3000" <= ch <= "\u303f" or "\uff00" <= ch <= "\uffef":
                chars.add(ch)
    print(f"扫描 {len(files)} 个文件，收集到 {len(chars)} 个字符")
    return chars


def find_vf() -> Path:
    for p in VF_CANDIDATES:
        if p.exists():
            return p
    sys.exit(
        "找不到 NotoSerifSC-VF.ttf。\n"
        "请安装思源宋体可变字体，或把 NotoSerifSC-VF.ttf 放到 scripts/ 目录下。"
    )


def build(vf_path: Path, chars: set) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = "".join(sorted(chars))

    for weight in WEIGHTS:
        base = TTFont(str(vf_path))
        instantiateVariableFont(base, {"wght": weight}, inplace=True, updateFontNames=False)

        options = Options()
        options.desubroutinize = True
        # 标题用字，只需要基本的字形替换与字距，不保留全部 OpenType 特性
        options.layout_features = ["kern", "liga", "locl", "vert", "vrt2", "ccmp"]
        options.name_IDs = [1, 2, 3, 4, 6]
        options.notdef_outline = True
        options.recalc_bounds = True
        options.drop_tables += ["DSIG"]

        subsetter = Subsetter(options=options)
        subsetter.populate(text=text)
        subsetter.subset(base)

        # woff2 给现代浏览器（体积约为 woff 的一半），woff 兜底
        sizes = []
        for flavor in ("woff2", "woff"):
            base.flavor = flavor
            out = OUT_DIR / f"noto-serif-sc-{weight}.{flavor}"
            base.save(str(out))
            sizes.append(f"{flavor} {out.stat().st_size / 1024:.0f}KB")
        print(f"  noto-serif-sc-{weight}: {' + '.join(sizes)}  ({len(chars)} 字)")


def verify(chars: set) -> None:
    print("\n校验:")
    ok = True
    for weight in WEIGHTS:
        for flavor in ("woff2", "woff"):
            path = OUT_DIR / f"noto-serif-sc-{weight}.{flavor}"
            cmap = TTFont(str(path)).getBestCmap()
            missing = [c for c in chars if ord(c) not in cmap]
            if missing:
                ok = False
                print(f"  {path.name}: 缺 {len(missing)} 字 -> {''.join(missing[:40])}")
            else:
                print(f"  {path.name}: 全部覆盖 ✓")
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    vf = find_vf()
    print(f"源字体: {vf}")
    chars = collect_chars()
    build(vf, chars)
    verify(chars)
    print("\n完成。记得 npm run build 后重新部署 public/fonts/。")
