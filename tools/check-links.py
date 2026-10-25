#!/usr/bin/env python3
"""检查站点内所有本地引用是否指向真实存在的文件。

扫描 public/ 下的 HTML 与 CSS，提取 src / href / url() 里的本地路径，
按所在文件的位置解析后检查目标是否存在。外链、data URI、锚点会跳过。

HTML 里 <script> 的内部会被剥离（保留行号），避免压缩后的 JS 字符串
被误当成资源路径——这是最常见的误报来源。

用法：
    python tools/check-links.py
    python tools/check-links.py --root public

退出码 0 表示全部通过，1 表示有缺失引用。
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

HTML_ATTR = re.compile(r'(?:src|href)\s*=\s*"([^"]*)"', re.IGNORECASE)
CSS_URL = re.compile(r"""url\(\s*['"]?([^'")]+)['"]?\s*\)""", re.IGNORECASE)
SCRIPT_BLOCK = re.compile(r"(<script\b[^>]*>)(.*?)(</script\s*>)", re.IGNORECASE | re.DOTALL)

SKIP_PREFIXES = ("http://", "https://", "//", "data:", "mailto:", "tel:", "javascript:", "#")


def blank_out(text: str) -> str:
    """把内容替换为等长空白，保留换行以维持行号。"""
    return re.sub(r"[^\n]", " ", text)


def source_text(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix.lower() == ".css":
        return text
    return SCRIPT_BLOCK.sub(
        lambda m: m.group(1) + blank_out(m.group(2)) + m.group(3), text
    )


def extract_refs(path: Path) -> list[tuple[int, str]]:
    text = source_text(path)
    refs: list[tuple[int, str]] = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        if path.suffix.lower() != ".css":
            refs.extend((lineno, m.group(1)) for m in HTML_ATTR.finditer(line))
        refs.extend((lineno, m.group(1)) for m in CSS_URL.finditer(line))
    return refs


def resolve(root: Path, source: Path, raw: str) -> Path | None:
    ref = raw.strip()
    if not ref or ref.lower().startswith(SKIP_PREFIXES):
        return None
    ref = urlsplit(ref).path
    if not ref:
        return None
    ref = unquote(ref)
    if ref.startswith("/"):
        return (root / ref.lstrip("/")).resolve()
    return (source.parent / ref).resolve()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="public", help="站点根目录（默认 public）")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"找不到站点根目录：{root}")
        return 1

    files = [p for p in root.rglob("*") if p.suffix.lower() in {".html", ".htm", ".css"}]
    missing: list[tuple[Path, int, str, Path]] = []
    checked = 0

    for path in sorted(files):
        for lineno, raw in extract_refs(path):
            target = resolve(root, path, raw)
            if target is None:
                continue
            checked += 1
            if target.is_dir():
                if (target / "index.html").is_file():
                    continue
                missing.append((path, lineno, raw, target))
            elif not target.exists():
                missing.append((path, lineno, raw, target))

    print(f"扫描 {len(files)} 个文件，检查 {checked} 处本地引用")
    if not missing:
        print("全部引用有效")
        return 0

    print(f"\n{len(missing)} 处引用失效：")
    for path, lineno, raw, target in missing:
        rel = path.relative_to(root)
        try:
            shown = target.relative_to(root)
        except ValueError:
            shown = target
        print(f"  {rel}:{lineno}  ->  {raw}   (解析为 {shown})")
    return 1


if __name__ == "__main__":
    sys.exit(main())
