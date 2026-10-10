#!/usr/bin/env python3
"""Verify five missing 2026 action CP rows against original LFI PDF pages 83/84/502/503.

Usage: python scripts/verify_lfi_action_complements_2026.py Loi-de-Finances-2026.pdf
"""
import hashlib
import json
from pathlib import Path
import re
import sys
import fitz

REGISTER = (Path(__file__).resolve().parent.parent /
            "docs/references/2026/ministry-reconciliation/LFI_2026_ACTION_COMPLEMENTS_4_PROGRAMMES.json")
AMOUNT_PAIR = re.compile(r"^(\d{1,3}(?:\.\d{3})+)\s+(\d{1,3}(?:\.\d{3})+)$")

def extract_action(pdf, code, pdf_page):
    blocks = pdf[pdf_page - 1].get_text("blocks")
    labels = [b for b in blocks if b[4].strip().startswith(code + " ")]
    assert len(labels) == 1, (code, pdf_page, "action code not unique")
    monetary = []
    for block in blocks:
        value = AMOUNT_PAIR.match(block[4].strip())
        if not value:
            continue
        if abs(block[0] - labels[0][0]) < 5:
            ae = int(value[1].replace(".", ""))
            cp = int(value[2].replace(".", ""))
            monetary.append((ae, cp))
    assert len(monetary) == 1, (code, pdf_page, monetary)
    ae, cp = monetary[0]
    assert ae == cp, (code, ae, cp)
    return cp

def main(pdf_path):
    doc = json.loads(REGISTER.read_text(encoding="utf-8"))
    assert hashlib.sha256(Path(pdf_path).read_bytes()).hexdigest() == doc["source_pdf_sha256"]
    d = fitz.open(pdf_path)
    assert len(doc["records"]) == 4
    count = 0
    for programme in doc["records"]:
        values = [extract_action(d, row["code"], row["lfi_pdf_page"])
                  for row in programme["actions"]]
        assert values == [row["cp_fcfa"] for row in programme["actions"]]
        assert sum(values) == programme["program_total_cp_fcfa"]
        count += len(values)
    assert count == 5
    print("PASS: 4 programmes, 5 independently sourced official LFI actions, all programme CP sums exact")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_lfi_action_complements_2026.py Loi-de-Finances-2026.pdf")
    main(sys.argv[1])
