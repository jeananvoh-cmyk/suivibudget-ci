#!/usr/bin/env python3
"""Validate legally voted 2026 CP totals by LFI Articles 14/15.

Usage:
  python scripts/verify_lfi_articles_14_15_2026.py Loi-de-Finances-2026.pdf
Requires pymupdf; validates SHA256 before extracting. Read-only.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import fitz

BASELINE = Path(__file__).resolve().parent.parent / (
    "docs/references/2026/ministry-reconciliation/LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json"
)

def digits_only(line):
    # Source uses thin non-breaking spaces, regular spaces and sometimes narrow NBSP.
    return re.sub(r"[^0-9]", "", line)

def main(pdf_path):
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    digest = hashlib.sha256(Path(pdf_path).read_bytes()).hexdigest()
    assert digest == baseline["source_pdf_sha256"], "Official LFI PDF SHA256 differs"
    rows = baseline["rows"]
    assert len(rows) == 35, len(rows)
    independent = {}
    for record in rows:
        code = record["section_code"]
        prior = independent.get(code)
        if prior is not None:
            assert code == "229", "Unexpected repeated CP section"
            assert prior["voted_section_cp_2026_fcfa"] == record["voted_section_cp_2026_fcfa"]
            continue
        independent[code] = record
    assert len(independent) == 34
    with fitz.open(pdf_path) as pdf:
        for code, record in independent.items():
            page = record["official_lfi_pdf_page"]
            article = record["legal_article"]
            assert (article == "14" and page == 12) if code == "108" else (
                article == "15" and 14 <= page <= 20
            )
            text = pdf[page - 1].get_text()
            assert "Article 14" in text if code == "108" else True
            target = str(record["voted_section_cp_2026_fcfa"])
            matches = [line for line in text.splitlines() if digits_only(line) == target]
            assert len(matches) == 1, (
                code, page, target, "voted section CP missing or ambiguously repeated"
            )
    print("PASS: 34 legally voted sections under Articles 14 and 15, 35 references including one shared")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_lfi_articles_14_15_2026.py LFI.pdf")
    main(sys.argv[1])
