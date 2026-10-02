// =========================================================================
// RÉFÉRENTIEL DES BUDGETS LOCAUX — SUIVIBUDGET CÔTE D'IVOIRE
// Architecture Multi-Exercices, Multi-Versions et Traçabilité des Sources
// Périmètre : 201 Communes, 31 Conseils Régionaux, 2 Districts Autonomes
// =========================================================================

/**
 * Type d'institution pour le référentiel des budgets locaux
 * Strictement distinct :
 * - COMMUNE (201 communes)
 * - REGIONAL_COUNCIL (31 conseils régionaux)
 * - AUTONOMOUS_DISTRICT (Districts Autonomes d'Abidjan et de Yamoussoukro)
 */
export type LocalInstitutionType = 'COMMUNE' | 'REGIONAL_COUNCIL' | 'AUTONOMOUS_DISTRICT';

/**
 * Cycle et étapes d'un budget local
 * ATTENTION : COMPTE_ADMINISTRATIF n'est PAS un budget primitif.
 * Il retrace l'exécution financière en clôture d'exercice.
 */
export type BudgetEventType = 
  | 'PRIMITIF_ADOPTE'             // Budget initial adopté par l'organe délibérant (Conseil)
  | 'PRIMITIF_APRES_TUTELLE'       // Budget après révision / intervention de la Commission d'approbation (Tutelle DGDDL)
  | 'AUTORISATION_EXECUTION'       // Budget arrêté et autorisé pour exécution (exécutoire)
  | 'BUDGET_SUPPLEMENTAIRE'        // Budget supplémentaire adopté en cours d'exercice (BS)
  | 'MODIFICATIF_1'               // Décision modificative n°1 (BM1)
  | 'MODIFICATIF_2'               // Décision modificative n°2 (BM2)
  | 'AUTRE_MODIFICATIF'           // Autre réaménagement budgétaire
  | 'DECISION_MODIFICATIVE'        // Décision modificative / délibération de tutelle
  | 'VIREMENT_CREDITS'            // Virement de crédits entre chapitres / programmes
  | 'EXECUTION_TRIMESTRIELLE'      // Point d'exécution en cours d'année
  | 'COMPTE_ADMINISTRATIF';        // Reddition des comptes / exécution réelle clôturée

/**
 * Précision du montant
 * RÈGLE D'OR : Ne jamais transformer une mention comme "plus de 1,3 milliard"
 * en un faux montant exact (1 300 000 000 FCFA).
 */
export type AmountPrecision = 
  | 'EXACT'         // Chiffré au franc près (ex: 4 046 222 000 FCFA)
  | 'APPROXIMATE'   // Chiffre arrondi officiel (ex: ≈ 8,87 Md FCFA)
  | 'LOWER_BOUND'   // Borne minimale mentionnée (ex: "plus de 17 milliards" -> 17 000 000 000)
  | 'UPPER_BOUND'   // Borne maximale mentionnée
  | 'UNKNOWN';      // Précision indéterminée

/**
 * Statut éditorial / workflow de publication interne
 */
export type BudgetRecordStatus = 'DRAFT' | 'REVIEW' | 'VERIFIED' | 'PUBLISHED';

/**
 * Typologie des sources d'information
 */
export type LocalSourceType = 
  | 'OFFICIAL_COLLECTIVITY_DOCUMENT'   // Délibération certifiée, extrait du registre, procès-verbal
  | 'OFFICIAL_COLLECTIVITY_WEBSITE'    // Portail officiel de la mairie / conseil régional
  | 'DGDDL'                            // Direction Générale de la Décentralisation et du Développement Local
  | 'PREFECTURE_OR_TUTELLE'            // Arrêté préfectoral ou décision de tutelle
  | 'AIP'                              // Dépêche Agence Ivoirienne de Presse (source d'agence publique de référence)
  | 'OTHER_PUBLIC_INSTITUTION'         // Trésor Public, DGI, Ministère du Budget, Cour des Comptes
  | 'PRESS'                            // Presse nationale d'information (Fraternité Matin, Abidjan.net, KOACI...)
  | 'SECONDARY_SOURCE';                // Autre source secondaire à corroborer

/**
 * Hiérarchie de confiance et statut de vérification
 */
export type LocalVerificationStatus = 
  | 'OFFICIAL_DOCUMENT'         // ✓ Source officielle (document visé / délibération)
  | 'OFFICIAL_INSTITUTION'      // ✓ Source institutionnelle vérifiée
  | 'AIP_VERIFIED'              // ✓ Dépêche AIP vérifiée
  | 'SECONDARY_TO_CORROBORATE'  // ⚠ À corroborer (source secondaire en attente d'attestation)
  | 'CALCULATED_TO_VERIFY'      // À vérifier par recalcul
  | 'SOURCE_ANOMALY'            // ⚠ Anomalie détectée dans les chiffres sources
  | 'DOCUMENT_TO_EXTRACT'       // Document disponible à dépouiller
  | 'NOT_FOUND'                 // Non retrouvé publiquement (NE PAS confondre avec "inexistant")
  | 'SOURCE_CONFLICT';          // Conflit entre deux sources nécessitant un arbitrage

/**
 * Rôle de la source pour un budget
 */
export type SourceRole = 'PRIMARY' | 'CORROBORATION' | 'CONTEXT' | 'SUPERSEDED';

/**
 * Modèle d'une source documentaire
 */
export interface LocalBudgetSource {
  id: string;
  source_type: LocalSourceType;
  publisher: string;
  title: string;
  url?: string;
  document_url?: string;
  publication_date?: string;
  accessed_at?: string;
  source_year?: number;
  notes?: string;
}

/**
 * Catégories de recettes budgétaires
 */
export type RevenueCategory = 
  | 'OWN_REVENUE'       // Recettes fiscales et non-fiscales propres de la collectivité
  | 'STATE_TRANSFER'    // Dotation Globale de Fonctionnement (DGF)
  | 'STATE_GRANT'       // Subventions ministérielles ou d'organismes publics
  | 'DGE'               // Dotation Globale d'Équipement (Investissement État)
  | 'CARRY_FORWARD'     // Report d'exercice antérieur (Excédent budgétaire réinjecté)
  | 'OTHER';            // Emprunt, dons et legs, coopérations décentralisées

/**
 * Recette ou source de financement détaillée
 */
export interface LocalBudgetRevenueSource {
  id: string;
  budget_id: string;
  category: RevenueCategory;
  label: string;
  original_label?: string;      // Vocabulaire officiel original préservé
  amount: number;
  percentage?: number;          // Calculé automatiquement si montants disponibles
  source_reference?: string;
  verification_status?: LocalVerificationStatus;
}

/**
 * Ligne de dépense ou programme budgétaire
 */
export interface LocalBudgetLine {
  id: string;
  budget_id: string;
  program_name?: string;
  line_label: string;
  original_label?: string;
  category?: 'FONCTIONNEMENT' | 'INVESTISSEMENT';
  amount: number;
  sector?: string;              // Santé, Éducation, Hydraulique, Voirie, Éclairage, Administration...
  normalized_sector?: string;   // Classification standard SuiviBudget
  source_page?: number;
  source_reference?: string;
  linked_project_id?: string;   // Liaison optionnelle avec un projet d'investissement physique
}

/**
 * Traçabilité des corrections et révisions manuelles
 */
export interface BudgetRevisionHistoryItem {
  id: string;
  budget_id: string;
  old_value: any;
  new_value: any;
  reason: string;
  source?: string;
  changed_by: string;
  changed_at: string;
}

/**
 * Modèle pivot : Liaison Budget <-> Sources multiples
 */
export interface LocalBudgetSourceRef {
  source: LocalBudgetSource;
  role: SourceRole;
  notes?: string;
}

/**
 * ENTITÉ CENTRALE : Budget d'une collectivité locale
 * Supporte :
 * - Le multi-exercices (2024, 2025, 2026...)
 * - Le multi-versions (ex: Bingerville : voté 4,144 Md -> tutelle 4,046 Md)
 * - La double ventilation (Fonctionnement / Investissement)
 * - La précision rigoureuse (sans invention de centimes)
 */
export interface LocalBudget {
  import_provenance?: ImportProvenance;
  id: string;
  institution_id: string;
  institution_type: LocalInstitutionType;
  institution_name: string;
  fiscal_year: number;
  budget_type: BudgetEventType;
  status: BudgetRecordStatus;
  is_current_version: boolean;    // Version active actuellement retenue
  version_number: number;         // 1, 2, 3...
  
  // Montants consolidés
  total_amount: number | null;
  operating_amount: number | null;       // Dépenses de fonctionnement
  investment_amount: number | null;      // Dépenses d'investissement
  operating_percentage: number | null;   // Calculé dynamiquement (operating_amount / total_amount * 100)
  investment_percentage: number | null;  // Calculé dynamiquement (investment_amount / total_amount * 100)
  amount_precision: AmountPrecision;

  // Dates clés du cycle budgétaire
  adoption_date?: string;                  // Date de vote par le Conseil
  tutelle_approval_date?: string;          // Date de validation par la tutelle (Préfet / DGDDL)
  execution_authorization_date?: string;   // Date de mise en exécution
  publication_date?: string;               // Date de publication dans la presse ou au recueil
  source_access_date?: string;             // Date de consultation par l'équipe SuiviBudget

  // Provenance et traçabilité
  verification_status: LocalVerificationStatus;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
  session_notes?: string;
  projects_count?: number;                 // Nombre d'opérations physiques inscrites

  // Sources multiples rattachées
  sources: LocalBudgetSourceRef[];
  primary_source_label?: string;
  primary_source_url?: string;
  document_url?: string;                   // Lien direct vers le document officiel PDF / Délibération
  document_name?: string;

  // Détails facultatifs (dépouillement exhaustif)
  revenue_sources?: LocalBudgetRevenueSource[];
  lines?: LocalBudgetLine[];
  revision_history?: BudgetRevisionHistoryItem[];

  // Métadonnées
  created_at: string;
  updated_at: string;
}

/**
 * Anomalie ou alerte de cohérence détectée par les contrôles automatiques
 */
export interface BudgetCoherenceIssue {
  code: string;
  severity: 'ERROR' | 'REVIEW' | 'INFO';
  message: string;
  budget_id?: string;
  institution_id?: string;
  fiscal_year?: number;
  details?: Record<string, any>;
}

export interface ImportProvenance {
  precision: Partial<Record<string, AmountPrecision>>;
  source?: { name: string; reference: string; date: string; date_kind: string; url?: string };
  import_id?: string;
  match_evidence?: string;
}