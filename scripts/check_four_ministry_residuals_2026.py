#!/usr/bin/env python3
"""Recheck four historical residuals in all three official PDFs, without OCR.

Usage:
  python scripts/check_four_ministry_residuals_2026.py LFI.pdf Annex4.pdf Annex7.pdf
Text absence is NEVER evidence that a residual is invalid or a transfer impossible.
Requires pymupdf. Checks official source SHA-256 before searching.
"""
import hashlib
import json
import re
import sys
from pathlib import Path
import fitz

REGISTRY = Path(__file__).resolve().parent.parent / (
    "docs/references/2026/ministry-reconciliation/"
    "PR31_FOUR_UNEXPLAINED_LEGACY_RESIDUALS_2026.json"
)

def main(paths):
    report = json.loads(REGISTRY.read_text(encoding="utf-8"))
    assert len(paths) == 3
    expected = report["source_documents"]
    assert len(expected) == 3
    found = {int(x["residual_fcfa"]): [] for x in report["residuals"]}
    scanned = 0
    for pdf_path, evidence in zip(paths, expected):
        actual_hash = hashlib.sha256(Path(pdf_path).read_bytes()).hexdigest()
        assert actual_hash == evidence["sha256"], (pdf_path, "SHA256 mismatch")
        with fitz.open(pdf_path) as pdf:
            assert len(pdf) == evidence["physical_pages"]
            for i, page in enumerate(pdf):
                text = page.get_text()
                for number in found:
                    numeral = str(abs(number))
                    # Match a single 6-digit number with a thousands separator, but
                    # never embedded in a larger number. The scan is of PDF text, not OCR.
                    expr = (r"(?<!\d)" + re.escape(numeral[:-3])
                            + r"[.\u00a0\u202f ]" + re.escape(numeral[-3:]) + r"(?!\d)")
                    if re.search(expr, text):
                        found[number].append((evidence["name"], i + 1))
                scanned += 1
    assert scanned == report["pages_checked"] == 1901
    assert not any(found.values()), f"An exact numeric amount was found: {found}"
    for row in report["residuals"]:
        expected_legacy = row["voted"] + (row["c2d"] or 0) + row["residual_fcfa"]
        assert expected_legacy == row["legacy"]
    print("PASS: four residuals recalculated; no exact stand-alone formatted tokens in 1901 source pages")
    print("Caution: these negative matches do not certify or invalidate any historical amount.")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Usage: check_four_ministry_residuals_2026.py LFI.pdf Annex4.pdf Annex7.pdf")
    main(sys.argv[1:])
