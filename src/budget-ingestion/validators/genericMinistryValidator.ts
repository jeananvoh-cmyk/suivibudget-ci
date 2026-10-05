// Validateur générique de données budgétaires ministérielles (LOT 3)
// Contrôle déterministe, strict, 0 'any', sans inférence ni extrapolation arbitraire.
// Invariants : UNKNOWN != 0, UNKNOWN != estimation, UNKNOWN != fallback

import {
  CanonicalMinistryExtraction,
  ValidationError,
  ValidationWarning,
  ValidationResult,
} from '../types';

export function validateGenericMinistryData(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Validation de l'objet racine
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push({
      path: '$',
      rule: 'ROOT_NOT_OBJECT',
      message: 'Les données d\'ingestion doivent être un objet JSON non-null.',
      critical: true,
    });
    return { isValid: false, errors, warnings };
  }

  const root = data as Record<string, unknown>;

  // 2. Métadonnées institutionnelles
  if (typeof root.institution_code !== 'string' || !root.institution_code.trim()) {
    errors.push({
      path: '$.institution_code',
      rule: 'MISSING_INSTITUTION_CODE',
      message: 'Le code officiel du ministère (institution_code) est requis (ex: "348").',
      critical: true,
    });
  }

  if (typeof root.institution_name !== 'string' || !root.institution_name.trim()) {
    errors.push({
      path: '$.institution_name',
      rule: 'MISSING_INSTITUTION_NAME',
      message: 'Le libellé officiel du ministère (institution_name) est requis.',
      critical: true,
    });
  }

  if (typeof root.fiscal_year !== 'number' || root.fiscal_year < 2020 || root.fiscal_year > 2050) {
    errors.push({
      path: '$.fiscal_year',
      rule: 'INVALID_FISCAL_YEAR',
      message: `L'exercice budgétaire (fiscal_year) doit être une année valide, reçu: ${String(root.fiscal_year)}.`,
      critical: true,
    });
  }

  // 3. Provenance documentaire primaire obligatoire
  if (typeof root.source !== 'object' || root.source === null) {
    errors.push({
      path: '$.source',
      rule: 'PRIMARY_SOURCE_REQUIRED',
      message: 'Un bloc source primaire officiel est obligatoire.',
      critical: true,
    });
  } else {
    const src = root.source as Record<string, unknown>;
    if (typeof src.url !== 'string' || !src.url.startsWith('https://')) {
      errors.push({
        path: '$.source.url',
        rule: 'PRIMARY_SOURCE_HTTPS_URL_REQUIRED',
        message: 'L\'URL officielle de la source primaire doit être une URL HTTPS vérifiable.',
        critical: true,
      });
    }
    if (typeof src.document !== 'string' || !src.document.trim()) {
      errors.push({
        path: '$.source.document',
        rule: 'PRIMARY_SOURCE_DOCUMENT_NAME_REQUIRED',
        message: 'Le nom du document officiel source est requis.',
        critical: false,
      });
    }
  }

  // 4. Totaux ministériels
  if (typeof root.totals !== 'object' || root.totals === null) {
    errors.push({
      path: '$.totals',
      rule: 'TOTALS_OBJECT_REQUIRED',
      message: 'L\'objet totals est requis.',
      critical: true,
    });
  } else {
    const totals = root.totals as Record<string, unknown>;
    if (totals.total_ministry_2026_fcfa !== null && totals.total_ministry_2026_fcfa !== undefined) {
      if (typeof totals.total_ministry_2026_fcfa !== 'number') {
        errors.push({
          path: '$.totals.total_ministry_2026_fcfa',
          rule: 'TOTAL_MINISTRY_MUST_BE_NUMBER_OR_NULL',
          message: 'Le montant total ministériel doit être un nombre ou null.',
          critical: true,
        });
      } else if (totals.total_ministry_2026_fcfa < 0) {
        errors.push({
          path: '$.totals.total_ministry_2026_fcfa',
          rule: 'NEGATIVE_AMOUNT',
          message: 'Le montant total ministériel ne peut pas être négatif.',
          critical: true,
        });
      }
    }
  }

  // 5. Programmes budgétaires officiels
  if (!Array.isArray(root.programs) || root.programs.length === 0) {
    errors.push({
      path: '$.programs',
      rule: 'PROGRAMS_ARRAY_NON_EMPTY_REQUIRED',
      message: 'Le ministère doit comporter au moins un programme budgétaire officiel.',
      critical: true,
    });
    return { isValid: errors.length === 0, errors, warnings };
  }

  const seenProgramCodes = new Set<string>();
  const seenActionCodes = new Set<string>();
  const validProgramCodes = new Set<string>();
  const validActionCodes = new Set<string>();

  root.programs.forEach((rawProg, pIndex) => {
    const pPath = `$.programs[${pIndex}]`;
    if (typeof rawProg !== 'object' || rawProg === null) {
      errors.push({
        path: pPath,
        rule: 'PROGRAM_OBJECT_REQUIRED',
        message: `L'élément programme à l'index ${pIndex} doit être un objet.`,
        critical: true,
      });
      return;
    }

    const prog = rawProg as Record<string, unknown>;
    const progCode = typeof prog.program_code === 'string' ? prog.program_code.trim() : '';

    if (!progCode) {
      errors.push({
        path: `${pPath}.program_code`,
        rule: 'PROGRAM_CODE_REQUIRED',
        message: `Le code officiel du programme à l'index ${pIndex} est manquant.`,
        critical: true,
      });
    } else {
      // Vérification de doublons de programmes
      if (seenProgramCodes.has(progCode)) {
        errors.push({
          path: `${pPath}.program_code`,
          rule: 'DUPLICATE_PROGRAM_CODE',
          message: `Code de programme dupliqué détecté : "${progCode}".`,
          critical: true,
        });
      } else {
        seenProgramCodes.add(progCode);
        validProgramCodes.add(progCode);
      }
    }

    // Libellé de programme
    if (typeof prog.official_name !== 'string' || !prog.official_name.trim()) {
      errors.push({
        path: `${pPath}.official_name`,
        rule: 'PROGRAM_OFFICIAL_NAME_REQUIRED',
        message: `Nom officiel manquant pour le programme "${progCode || pIndex}".`,
        critical: true,
      });
    }

    // Montant de programme (doit être >= 0 ou null, jamais négatif)
    if (prog.program_amount_2026_fcfa !== null && prog.program_amount_2026_fcfa !== undefined) {
      if (typeof prog.program_amount_2026_fcfa !== 'number') {
        errors.push({
          path: `${pPath}.program_amount_2026_fcfa`,
          rule: 'PROGRAM_AMOUNT_MUST_BE_NUMBER_OR_NULL',
          message: `Le montant du programme "${progCode}" doit être un nombre ou null.`,
          critical: true,
        });
      } else if (prog.program_amount_2026_fcfa < 0) {
        errors.push({
          path: `${pPath}.program_amount_2026_fcfa`,
          rule: 'NEGATIVE_AMOUNT',
          message: `Montant négatif impossible pour le programme "${progCode}" : ${prog.program_amount_2026_fcfa}.`,
          critical: true,
        });
      }
    }

    // Référence de page du programme
    if (typeof prog.page_reference !== 'string' || !prog.page_reference.trim()) {
      warnings.push({
        path: `${pPath}.page_reference`,
        rule: 'MISSING_PAGE_REFERENCE',
        message: `Référence de page absente pour le programme "${progCode}".`,
      });
    }

    // Actions du programme
    if (!Array.isArray(prog.actions) || prog.actions.length === 0) {
      errors.push({
        path: `${pPath}.actions`,
        rule: 'EMPTY_PROGRAM',
        message: `Le programme "${progCode}" ne contient aucune action budgétaire.`,
        critical: true,
      });
    } else {
      prog.actions.forEach((rawAct, aIndex) => {
        const aPath = `${pPath}.actions[${aIndex}]`;
        if (typeof rawAct !== 'object' || rawAct === null) {
          errors.push({
            path: aPath,
            rule: 'ACTION_OBJECT_REQUIRED',
            message: `L'action à l'index ${aIndex} du programme "${progCode}" doit être un objet.`,
            critical: true,
          });
          return;
        }

        const act = rawAct as Record<string, unknown>;
        const actCode = typeof act.action_code === 'string' ? act.action_code.trim() : '';

        if (!actCode) {
          errors.push({
            path: `${aPath}.action_code`,
            rule: 'ACTION_CODE_REQUIRED',
            message: `Code d'action manquant à l'index ${aIndex} du programme "${progCode}".`,
            critical: true,
          });
        } else {
          // Unicité de l'action
          if (seenActionCodes.has(actCode)) {
            errors.push({
              path: `${aPath}.action_code`,
              rule: 'DUPLICATE_ACTION_CODE',
              message: `Code d'action dupliqué détecté : "${actCode}".`,
              critical: true,
            });
          } else {
            seenActionCodes.add(actCode);
            validActionCodes.add(actCode);
          }

          // Vérification que le code d'action se rattache au programme parent
          if (act.program_code && act.program_code !== progCode) {
            errors.push({
              path: `${aPath}.program_code`,
              rule: 'ORPHAN_ACTION',
              message: `L'action "${actCode}" déclare le programme "${String(act.program_code)}" mais est rattachée au programme "${progCode}".`,
              critical: true,
            });
          }
        }

        // Libellé officiel d'action
        if (typeof act.official_name !== 'string' || !act.official_name.trim()) {
          errors.push({
            path: `${aPath}.official_name`,
            rule: 'ACTION_OFFICIAL_NAME_REQUIRED',
            message: `Nom officiel manquant pour l'action "${actCode}".`,
            critical: true,
          });
        }

        // Montant d'action (doit être >= 0 ou null, jamais négatif)
        if (act.amount_2026_fcfa !== null && act.amount_2026_fcfa !== undefined) {
          if (typeof act.amount_2026_fcfa !== 'number') {
            errors.push({
              path: `${aPath}.amount_2026_fcfa`,
              rule: 'ACTION_AMOUNT_MUST_BE_NUMBER_OR_NULL',
              message: `Le montant de l'action "${actCode}" doit être un nombre ou null.`,
              critical: true,
            });
          } else if (act.amount_2026_fcfa < 0) {
            errors.push({
              path: `${aPath}.amount_2026_fcfa`,
              rule: 'NEGATIVE_AMOUNT',
              message: `Montant négatif impossible pour l'action "${actCode}" : ${act.amount_2026_fcfa}.`,
              critical: true,
            });
          }
        }

        // Référence de page d'action
        if (typeof act.page_reference !== 'string' || !act.page_reference.trim()) {
          warnings.push({
            path: `${aPath}.page_reference`,
            rule: 'MISSING_PAGE_REFERENCE',
            message: `Référence de page absente pour l'action "${actCode}".`,
          });
        }
      });
    }
  });

  // 6. Projets d'investissements rattachés (si présents)
  if (Array.isArray(root.projects)) {
    const seenProjectCodes = new Set<string>();

    root.projects.forEach((rawProj, prIndex) => {
      const prPath = `$.projects[${prIndex}]`;
      if (typeof rawProj !== 'object' || rawProj === null) {
        errors.push({
          path: prPath,
          rule: 'PROJECT_OBJECT_REQUIRED',
          message: `Le projet à l'index ${prIndex} doit être un objet.`,
          critical: true,
        });
        return;
      }

      const proj = rawProj as Record<string, unknown>;
      const projCode = typeof proj.official_code === 'string' ? proj.official_code.trim() : '';

      if (!projCode) {
        errors.push({
          path: `${prPath}.official_code`,
          rule: 'PROJECT_OFFICIAL_CODE_REQUIRED',
          message: `Code officiel manquant pour le projet à l'index ${prIndex}.`,
          critical: true,
        });
      } else {
        if (seenProjectCodes.has(projCode)) {
          errors.push({
            path: `${prPath}.official_code`,
            rule: 'DUPLICATE_PROJECT_CODE',
            message: `Code projet dupliqué détecté : "${projCode}".`,
            critical: true,
          });
        } else {
          seenProjectCodes.add(projCode);
        }

        // Rejet des codes synthétiques inventés dans le modèle officiel
        if (projCode.startsWith('PROJ-')) {
          errors.push({
            path: `${prPath}.official_code`,
            rule: 'SYNTHETIC_PROJECT_CODE_FORBIDDEN',
            message: `Le code officiel "${projCode}" est un code synthétique non officiel DGBF.`,
            critical: true,
          });
        }
      }

      // Rattachement programme (projet orphelin interdit)
      const pCode = typeof proj.program_code === 'string' ? proj.program_code.trim() : '';
      if (!pCode || !validProgramCodes.has(pCode)) {
        errors.push({
          path: `${prPath}.program_code`,
          rule: 'ORPHAN_PROJECT',
          message: `Le projet "${projCode}" référence un programme introuvable : "${pCode}".`,
          critical: true,
        });
      }

      // Rattachement action (projet orphelin interdit)
      const aCode = typeof proj.action_code === 'string' ? proj.action_code.trim() : '';
      if (!aCode || !validActionCodes.has(aCode)) {
        errors.push({
          path: `${prPath}.action_code`,
          rule: 'ORPHAN_PROJECT',
          message: `Le projet "${projCode}" référence une action introuvable : "${aCode}".`,
          critical: true,
        });
      }

      // Montant consolidé
      const amount = proj.consolidated_amount_2026_fcfa;
      if (typeof amount !== 'number' || amount < 0) {
        errors.push({
          path: `${prPath}.consolidated_amount_2026_fcfa`,
          rule: 'NEGATIVE_AMOUNT',
          message: `Montant de projet invalide pour "${projCode}" : ${String(amount)}.`,
          critical: true,
        });
      }

      // Lignes de sources budgétaires (source_lines)
      if (!Array.isArray(proj.source_lines) || proj.source_lines.length === 0) {
        errors.push({
          path: `${prPath}.source_lines`,
          rule: 'PROJECT_SOURCE_LINES_REQUIRED',
          message: `Le projet "${projCode}" doit comporter au moins une ligne budgétaire source.`,
          critical: true,
        });
      } else {
        const derivation = proj.amount_derivation;
        let sumSourceLines = 0;

        (proj.source_lines as Array<Record<string, unknown>>).forEach((line, slIdx) => {
          const rawLineAmount = line.amount_2026_fcfa ?? line.amount_fcfa;
          const lineAmount = typeof rawLineAmount === 'number' ? rawLineAmount : 0;

          if (lineAmount < 0) {
            errors.push({
              path: `${prPath}.source_lines[${slIdx}]`,
              rule: 'NEGATIVE_AMOUNT',
              message: `Montant négatif interdit dans la ligne source ${slIdx} du projet "${projCode}".`,
              critical: true,
            });
          }

          sumSourceLines += lineAmount;
        });

        // Si sommation déclarée, la somme des lignes doit correspondre au montant consolidé
        if (derivation === 'SUM_OF_OFFICIAL_SOURCE_LINES') {
          if (typeof amount === 'number' && sumSourceLines !== amount) {
            errors.push({
              path: `${prPath}.consolidated_amount_2026_fcfa`,
              rule: 'MULTI_LINE_SUM_MISMATCH',
              message: `Incohérence multi-lignes pour le projet "${projCode}" : somme des lignes (${sumSourceLines}) != montant consolidé (${amount}).`,
              critical: true,
            });
          }
        }
      }
    });
  }

  const isValid = errors.filter(e => e.critical).length === 0;
  return { isValid, errors, warnings };
}

export const validateGenericMinistryBudget = validateGenericMinistryData;
