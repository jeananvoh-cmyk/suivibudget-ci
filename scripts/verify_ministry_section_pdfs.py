#!/usr/bin/env python3
"""Read-only verification of section/programme CP against original 2026 DGBF PDFs.

Usage: python scripts/verify_ministry_section_pdfs.py LFI.pdf Annex4.pdf
Requires pymupdf (fitz). Do not substitute an OCR transcription for these PDFs.
"""
from pathlib import Path
import hashlib
import json
import re
import sys
import fitz

EVIDENCE = Path(__file__).resolve().parent.parent / 'docs/references/2026/ministry-reconciliation/SECTION_PROGRAM_CROSSCHECK_22_2026.json'

def digest(path):
    sha = hashlib.sha256()
    with open(path, 'rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            sha.update(block)
    return sha.hexdigest()

def extract_lfi_sections(pdf):
    rows = []
    for page_no in range(45, 55):
        labels, amounts = [], []
        for b in pdf[page_no - 1].get_text('blocks'):
            value = b[4].strip()
            if re.match(r'^\d{3}(?:\s|$)|^\d{5}\s', value) and b[1] > 210:
                labels.append((b[0], value.replace('\n', ' ')))
            elif re.match(r'^\d{1,3}(?:\.\d{3})+', value) and b[1] < 200:
                amounts.append((b[0], re.findall(r'(?<!\d)\d{1,3}(?:\.\d{3}){1,5}(?!\d)', value)))
        for x, label in labels:
            nearest = min(amounts, key=lambda a: abs(a[0] - x), default=None)
            if nearest is None or abs(x - nearest[0]) > 8:
                continue
            match = re.match(r'^(\d{3}|\d{5})\s+(.*)', label)
            if not match:
                continue
            values = [int(v.replace('.', '')) for v in nearest[1]]
            if len(values) != 2:
                raise ValueError('Cannot distinguish AE/CP for: ' + label)
            rows.append(dict(code=match[1], page=page_no, ae=values[0], cp=values[1]))
    sections = []
    for row in rows:
        if len(row['code']) == 3:
            sections.append({'section': row, 'programs': []})
        elif sections:
            sections[-1]['programs'].append(row)
    return sections

def amount_is_present(text, amount):
    chunks = f'{amount:,}'.replace(',', ' ').split(' ')
    return re.search(r'(?<!\d)' + r'\s+'.join(map(re.escape, chunks)) + r'(?!\d)', text) is not None

def main(lfi_path, annex_path):
    evidence = json.loads(EVIDENCE.read_text(encoding='utf-8'))
    if digest(lfi_path) != evidence['source_documents'][0]['sha256']:
        raise AssertionError('LFI source PDF SHA-256 mismatch')
    if digest(annex_path) != evidence['source_documents'][1]['sha256']:
        raise AssertionError('Annex 4 source PDF SHA-256 mismatch')
    lfi, annex = fitz.open(lfi_path), fitz.open(annex_path)
    sections = extract_lfi_sections(lfi)
    verified = 0
    for expected in evidence['sections']:
        matches = [s for s in sections if s['section']['code'] == expected['section_code']
                   and s['section']['page'] == expected['lfi_2026_pdf_page']]
        assert len(matches) == 1, 'Section not unique: ' + expected['section_code']
        found = matches[0]
        assert found['section']['cp'] == expected['section_cp_2026_fcfa']
        assert found['section']['ae'] == found['section']['cp']
        assert len(found['programs']) == len(expected['programs'])
        for actual, programme in zip(found['programs'], expected['programs']):
            assert actual['code'] == programme['official_code']
            assert actual['cp'] == programme['cp_2026_fcfa']
            assert actual['ae'] == actual['cp']
            page = programme['annex4_pdf_page']
            start, end = expected['annex4_pdf_page_range']
            assert start <= page <= end
            assert amount_is_present(annex[page - 1].get_text(), actual['cp'])
            code_found = any(programme['official_code'] in annex[n - 1].get_text()
                             for n in range(start, end + 1))
            assert code_found == programme['annex4_program_code_found']
            verified += 1
        assert sum(p['cp'] for p in found['programs']) == found['section']['cp']
    assert len(evidence['sections']) == 22 and verified == 112
    print('PASS: 22 LFI sections, 112 programme CP lines, matching Annex 4, source hashes valid')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('usage: verify_ministry_section_pdfs.py LFI.pdf Annex4.pdf')
    main(sys.argv[1], sys.argv[2])
