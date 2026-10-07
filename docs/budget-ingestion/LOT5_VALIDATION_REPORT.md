# LOT 5 — validation documentaire indépendante

```text
LOT=5
STATUS=VALIDATED
SECTIONS_VALIDATED=237,334,336,362,439,440,444
PROGRAMS_TOTAL=25
ACTIONS_TOTAL=66
SECTION_TOTALS_MATCH=7/7
PROGRAM_ACTION_SUMS_MATCH=25/25
DUPLICATE_PROGRAM_CODES=0
DUPLICATE_ACTION_CODES=0
TEST_TOTAL=423
TEST_PASS=423
TEST_FAIL=0
BUILD_PRODUCTION=PASS
BUILD_REVIEW=PASS
REMOTE_SUPABASE_WRITES=0
```

La validation porte sur les canoniques budgétaires 2026 du LOT 5 et leur provenance, pas sur une publication runtime. Les sources exclusives sont la LFI 2026 et l'Annexe 4 DPPD-PAP 2026-2028 publiées par la DGBF. Leurs empreintes SHA-256, pagination et URLs figurent dans [LOT5_DOCUMENT_MANIFEST.json](LOT5_DOCUMENT_MANIFEST.json).

Les six programmes omis ont été lus dans la LFI, puis leurs neuf actions ont été lues dans les « Tableau 7 : Budget détaillé du programme » du DPPD-PAP :

| Section | Programme | Montant CP 2026 (FCFA) | Page LFI | Pages PDF DPPD | Actions |
|---:|---|---:|---:|---|---|
| 334 | 23220 | 46 000 000 000 | 49 | 563 | 2322001, 2322002 |
| 336 | 23223 | 16 465 000 001 | 50 | 651–652 | 2322301 |
| 336 | 23224 | 2 035 000 000 | 50 | 653 | 2322401 |
| 336 | 23225 | 1 700 000 000 | 50 | 654 | 2322501 |
| 444 | 23241 | 10 900 000 000 | 54 | 1134 | 2324101, 2324102, 2324103 |
| 444 | 23249 | 1 720 000 000 | 54 | 1135 | 2324901 |

Le contrôle [verify-lot5-documents.mjs](../../scripts/verify-lot5-documents.mjs) vérifie les deux empreintes PDF, les lignes officielles code/libellé/montant/page, l'unicité des codes, la somme des actions par programme et la somme des programmes par section. Résultat : 2 sources, 3 sections corrigées, 6 programmes, 9 actions, zéro doublon et trois totaux de section concordants. [LOT5_INDEPENDENT_LFI_CONTROLS.json](LOT5_INDEPENDENT_LFI_CONTROLS.json) conserve la transcription indépendante complète.

Les trois totaux corrigés sont 182 301 855 312 FCFA (334), 39 806 735 298 FCFA (336) et 70 427 777 385 FCFA (444). L'écart historique de 78 820 000 001 FCFA est résolu par les lignes officielles, jamais par une différence calculée. Les détails d'activités ne sont pas additionnés aux actions ou programmes.

Les identités ministérielles proviennent des intitulés de section DGBF. Les titulaires et fonctions non établis par les deux sources sont `null`. Les chemins applicatifs inexistants ont été retirés. Les sept canoniques utilisent désormais l'intitulé officiel du tableau. Tous restent STAGED ; MMPE demeure l'unique ministère PUBLISHED dans le registre runtime.
