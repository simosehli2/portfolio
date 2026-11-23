#!/usr/bin/env python3
"""Bundle index.html and demo.html into standalone Cloudflare Worker script worker.js."""

from __future__ import annotations

import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> None:
    template = (ROOT / "worker_template.js").read_text(encoding="utf-8")
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    demo_html = (ROOT / "demo.html").read_text(encoding="utf-8")
    avatar_b64 = base64.b64encode((ROOT / "avatar.jpg").read_bytes()).decode("ascii")

    output = template.replace('"__PORTFOLIO_HTML__"', json.dumps(index_html), 1)
    output = output.replace('"__DEMO_HTML__"', json.dumps(demo_html), 1)
    output = output.replace('"__AVATAR_B64__"', json.dumps(avatar_b64), 1)

    target = ROOT / "worker.js"
    target.write_text(output, encoding="utf-8")
    print(f"Built {target} ({target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
