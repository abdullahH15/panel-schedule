#!/usr/bin/env python3
"""Build the single-file page: src/index.src.html + src/engine.js + src/app.js -> index.html"""
from pathlib import Path

root = Path(__file__).parent
src = (root / "src" / "index.src.html").read_text(encoding="utf-8")
engine = (root / "src" / "engine.js").read_text(encoding="utf-8")
app = (root / "src" / "app.js").read_text(encoding="utf-8")
out = src.replace("/*__ENGINE__*/", engine).replace("/*__APP__*/", app)
(root / "index.html").write_text(out, encoding="utf-8")
print(f"index.html written ({len(out):,} chars)")
