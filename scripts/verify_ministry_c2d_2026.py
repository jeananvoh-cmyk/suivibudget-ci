#!/usr/bin/env python3
"""Verify official 2026 C2D table and historical differences, without remote writes.

Usage: python scripts/verify_ministry_c2d_2026.py /path/to/Loi-de-Finances-2026.pdf
Requires PyMuPDF. Uses the PDF's text coordinates; no OCR or approximate matching.
"""
import fitz
import hashlib
import json
import re
import sys
from pathlib import Path

REGISTER = (Path(__file__).resolve().parent.parent
            / "docs/references/2026/ministry-reconciliation/PR31_C2D_2026_DISCREPANCY_PROVENANCE.json")
SECTION_RE = re.compile(r"^(\d{3})\s+(Minist[èe]re|Primature)", re.I)
MONEY_RE = re.compile(r"\d{1,3}(?:\.\d{3})+")
TOTAL = 74_400_000_000

def get_sha256(path):
    sha = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1_048_576), b""):
            sha.update(chunk)
    return sha.hexdigest()

def read_rows(pdf):
    rows = []
    for physical_page in range(565, 570):
        blocks = pdf[physical_page - 1].get_text("blocks")
        monetary_blocks = []
        for block in blocks:
            text = block[4].strip()
            values = MONEY_RE.findall(text)
            if (len(values) == 2 and
                    re.fullmatch(r"\d{1,3}(?:\.\d{3})+\s+\d{1,3}(?:\.\d{3})+", text)):
                ae, cp = [int(v.replace(".", "")) for v in values]
                if ae != cp:
                    raise AssertionError(f"AE/CP conflict on page {physical_page}")
                monetary_blocks.append((block[0], cp))
        for block in blocks:
            match = SECTION_RE.match(block[4].strip())
            if not match:
                continue
            nearest = [(abs(block[0] - x), value) for x, value in monetary_blocks
                       if 0 < x - block[0] < 6]
            if len(nearest) != 1:
                raise AssertionError(f"Ambiguous CP cell on page {physical_page}: {match[1]}")
            rows.append({
                "section_code": match[1],
                "c2d_cp_2026_fcfa": nearest[0][1],
                "lfi_pdf_page": physical_page,
            })
    return rows

def main(path):
    evidence = json.loads(REGISTER.read_text(encoding="utf-8"))
    if get_sha256(path) != evidence["official_pdf_sha256"]:
        raise AssertionError("Official LFI source SHA256 differs from the registered PDF")
    with fitz.open(path) as pdf:
        if len(pdf) < 569:
            raise AssertionError("Incomplete budget PDF")
        rows = read_rows(pdf)
        final_page = pdf[568].get_text()
        assert "Total Général" in final_page and "74.400.000.000" in final_page
    assert len(rows) == 14, len(rows)
    assert rows == evidence["sections"], "C2D section CP values or page references changed"
    assert sum(x["c2d_cp_2026_fcfa"] for x in rows) == TOTAL
    assert evidence["total_official_C2D_cp_fcfa"] == TOTAL
    by_section = {row["section_code"]: row["c2d_cp_2026_fcfa"] for row in rows}
    categories = {}
    for audit in evidence["historical_discrepancy_audit"]:
        assert audit["original_discrepancy_fcfa"] == (
            audit["legacy_directory_fcfa"] - audit["lfi_general_section_cp_2026_fcfa"])
        amount = by_section.get(audit["lfi_section"])
        assert audit["c2d_section_cp_2026_fcfa"] == amount
        residual = None if amount is None else audit["original_discrepancy_fcfa"] - amount
        assert audit["discrepancy_minus_c2d_fcfa"] == residual
        category = ("NO_C2D_SECTION_ENTRY" if amount is None else
                    "EXACTLY_EXPLAINED_BY_C2D" if residual == 0 else
                    "C2D_CLOSE_WITH_RESIDUAL_UNEXPLAINED")
        assert audit["classification"] == category
        categories[category] = categories.get(category, 0) + 1
    assert categories == {
        "EXACTLY_EXPLAINED_BY_C2D": 9,
        "C2D_CLOSE_WITH_RESIDUAL_UNEXPLAINED": 3,
        "NO_C2D_SECTION_ENTRY": 3,
    }
    print("PASS: 14 C2D sections, 74,400,000,000 FCFA, 9 exact historical differences, 3 residuals, 3 non-C2D cases")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_ministry_c2d_2026.py Loi-de-Finances-2026.pdf")
    main(sys.argv[1])
