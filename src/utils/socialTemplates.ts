import { BudgetProject } from '../types';
import { formatFCFA, formatAmountInWords, getStatusConfig } from './formatters';

export function generateWhatsAppMessage(project: BudgetProject): string {
  const status = getStatusConfig(project.current_status);
  return ` *SUIVI CITOYEN - SUIVI BUDGET CÔTE D'IVOIRE (2026)* 

 *Projet :* ${project.title}
 *Localisation :* ${project.commune_name} (Région : ${project.region_name})
 *Budget Voté :* *${formatFCFA(project.budget_amount_fcfa)} (${formatAmountInWords(project.budget_amount_fcfa)} FCFA)*
${status.icon} *Statut :* ${status.label}
 *Source :* Loi de Finances / Dotation des Collectivités 2026

 _Vérifiez les chantiers et envoyez vos photos de preuves citoyennes sur la plateforme :_
 https://suivibudget.ci/projets/${project.id}

#SuiviBudgetCI #ControleCitoyen #TransparenceCI #CIV225`;
}

export function generateFacebookPost(project: BudgetProject): string {
  const status = getStatusConfig(project.current_status);
  return ` [TRANSPARENCE & SUIVI CITOYEN] 

Où va l'argent public dans nos communes et régions ?
Voici la fiche officielle d'un projet d'investissement local financé en 2026 :

 Projet : ${project.title}
 Commune / Collectivité : ${project.commune_name} (${project.region_name})
 Budget Alloué : ${formatFCFA(project.budget_amount_fcfa)} (${formatAmountInWords(project.budget_amount_fcfa)} FCFA)
${status.icon} Statut officiel : ${status.label}
 Détails : ${project.details || 'Travaux d\'infrastructures publiques locales.'}

 Habitants de ${project.commune_name}, avez-vous constaté le chantier sur le terrain ?
Prenez une photo et partagez votre témoignage sur SuiviBudget Côte d'Ivoire pour un contrôle citoyen effectif !

 Consulter la fiche complète et envoyer une preuve : https://suivibudget.ci/projets/${project.id}

#SuiviBudgetCI #ControleCitoyenCI #TransparencePublique #CotedIvoire #Budget2026`;
}

export function generateTwitterPost(project: BudgetProject): string {
  const status = getStatusConfig(project.current_status);
  return ` Suivi citoyen du budget 2026 :

 ${project.title}
 ${project.commune_name} (${project.region_name})
 Budget : ${formatFCFA(project.budget_amount_fcfa)} (${formatAmountInWords(project.budget_amount_fcfa)} FCFA)
${status.icon} Statut : ${status.label}

Vérifiez et envoyez des preuves terrain 
https://suivibudget.ci/projets/${project.id}

#SuiviBudgetCI #CIV225`;
}

export function generateLinkedInPost(project: BudgetProject): string {
  const status = getStatusConfig(project.current_status);
  return ` Transparence budgétaire et suivi des investissements publics locaux en Côte d'Ivoire.

Dans le cadre du suivi citoyen et de la redevabilité locale :
• Collectivité : ${project.commune_name} (${project.region_name})
• Intitulé du Projet : ${project.title}
• Montant Voté : ${formatFCFA(project.budget_amount_fcfa)} (${formatAmountInWords(project.budget_amount_fcfa)} FCFA)
• Statut d'Exécution : ${status.label} (${project.progress_percentage}%)
• Source des Données : Dotation des Collectivités Locales - Loi de Finances 2026

La plateforme SuiviBudget Côte d'Ivoire permet aux citoyens et observateurs de confronter les données officielles aux réalités du terrain grâce à un observatoire participatif géolocalisé.

Découvrez la fiche détaillée : https://suivibudget.ci/projets/${project.id}

#SuiviBudgetCI #CivicTech #OpenData #PublicFinance #Governance #CotedIvoire`;
}
