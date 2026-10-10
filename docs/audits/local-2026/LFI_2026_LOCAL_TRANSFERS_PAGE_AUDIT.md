# Audit des transferts aux collectivités — LFI 2026 — contrôle initial exhaustif du texte
Date : 10 octobre 2026

## Champ
201 communes, 31 conseils régionaux, 2 districts autonomes. Sources originelles remises par le porteur : Loi de finances 2026 (583 pages), Annexe 4 DPPD-PAP 2026–2028 (1 229 pages), Annexe 7 dotations des institutions (89 pages). **1 901 pages traversées automatiquement** pour analyser le texte extractible et détecter les mentions pertinentes. Ceci n'est **pas** une validation visuelle individuelle de toutes les pages ni une extraction exhaustive des investissements.

## Preuve légale globale
LFI 2026, **article 21, page physique PDF 29** : crédits de paiement aux collectivités et districts de **224 690 561 296 FCFA**, soit **52 290 561 296 FCFA en fonctionnement**, personnel compris, et **172 400 000 000 FCFA en investissement**. Ne jamais traiter ce total global comme un montant disponible individuel ou comme un budget primitif.

## Première extraction nominative vérifiable
LFI 2026, **pages physiques 200 à 207** : 225 lignes d'activités « Assurer le fonctionnement des services ... », code source de 11 chiffres, avec AE et CP visibles :
- **192 communes** — CP **26 753 694 756 FCFA** ;
- **31 conseils régionaux** — CP **10 049 267 343 FCFA** ;
- **2 districts** — CP **4 585 000 000 FCFA** ;
- Somme de ces **225 lignes identifiées** : **41 387 962 099 FCFA**.

Les CP et AE concordent sur ces 225 lignes ; aucune ligne n'est dupliquée par son code activité dans l'extraction. Le reste par rapport aux **52 290 561 296 FCFA** de l'article 21 est de **10 902 599 197 FCFA** : **NE PAS** le qualifier d'erreur ou de manque, il peut couvrir d'autres lignes, structures ou mécanismes. Les neuf communes absentes de ce seul bloc ne sont pas présumées sans dotation.

Exemples de lignes confirmées dans le PDF original :
- Commune de Yamoussoukro — activité 11016001387, p.200 — fonctionnement **1 000 000 000 FCFA** ;
- Conseil régional du Bélier — 11016002144, p.200 — **287 884 405 FCFA** ;
- Conseil régional du Gbêkê — 17016001433, p.201 — **395 880 419 FCFA** ;
- District de Yamoussoukro — 11016001699, p.200 — **1 585 000 000 FCFA** ;
- District autonome d'Abidjan — 78016001719, p.207 — **3 000 000 000 FCFA**.

## Prudence sur les lignes de dépenses sectorielles
Une activité ministérielle « construire, équiper, réhabiliter dans la commune X » ou « coordonner dans la région Y » n'est pas par elle-même une **dotation transférée à cette collectivité**. Le texte de la LFI contient **3 314 lignes d'activités mentionnant potentiellement une commune/région/district**, dans 245 pages ; ce sont des **candidates de revue**, pas 3 314 dotations confirmées. Les investissements relevant des 172,4 milliards doivent encore être vérifiés contre la nomenclature des transferts, les sous-sections et les bénéficiaires juridiques.

## Pages à contrôle visuel supplémentaire (texte très faible)
Les pages suivantes ont été **parcourues** par le traitement mais ne sont **pas certifiées lisibles par extraction textuelle** ; elles doivent être inspectées visuellement avant d'affirmer qu'aucune page n'a été laissée inexploitable :
- **LFI 2026 — 22 pages** : 2, 4, 31, 32, 38, 39, 40, 42, 43, 44, 55, 56, 68, 69, 70, 74, 76, 563, 564, 570, 571, 572.
- **Annexe 4 — 2 pages** : 2, 4.
- **Annexe 7 — 40 pages** : 2, 4, 6, 7, 8, 14, 17, 18, 25, 26, 31, 32, 43, 44, 48, 49, 50, 52, 53, 54, 57, 58, 61, 62, 65, 66, 70, 71, 72, 74, 75, 76, 78, 79, 80, 83, 84, 86, 87, 88.

Le critère « texte très faible » signifie moins de 80 caractères de texte extractible ; certaines peuvent être des pages blanches ou de garde. **Cela ne constitue pas une preuve qu'elles contiennent des données illisibles**.

## Décisions de sûreté
1. **Aucun montant de budget primitif ne doit être écrasé** avec le CP de fonctionnement de la seule activité : les concepts ne sont pas équivalents.
2. Conserver AE, CP, fonctionnement, investissement, fiscalité rétrocédée, budget primitif et compte administratif comme **mesures distinctes**.
3. Aucun montant absent de ce bloc ne doit être traité comme zéro.
4. Avant correction d'une fiche existante : correspondance nominative déterministe + code activité officiel + page + vérification des autres volets attribués à la collectivité + comparaison de l'assiette exacte.
5. **Exhaustivité financière de toutes les pages et de tous les transferts : NON ACQUISE à ce stade**. Le présent rapport est un jalon vérifiable, non une clôture.

## Suite indispensable à la clôture de cette priorité
Extraction et réconciliation **des CP d'investissement individuels**, identification des neuf communes sans ligne nominative de fonctionnement dans le bloc, examen visuel des pages ci-dessus, recherche des éventuels transferts sous d'autres formulations, puis matrice finale 234 collectivités avec statut documenté. Ne modifier les données applicatives qu'après correspondance d'assiette et preuve officielle.

**Restrictions :** pas de fusion, d'écriture Supabase ou de déploiement intentionnel.

## Complément de réconciliation arithmétique du programme 2204040

**La ventilation source a désormais été recalculée sur les lignes individuelles**, sans additionner les rubriques-titres avec leurs enfants :
- 32 activités de **personnel** (31 conseils régionaux + 1 district de Yamoussoukro), **6 202 599 197 FCFA**. Les autres dépenses salariales extérieures au programme, en amont du code `2204040`, ne sont pas intégrées.
- 233 activités classées en **transferts**, **46 087 962 099 FCFA** : 225 lignes nominatives de fonctionnement (**41 387 962 099 FCFA**), 6 lignes de cantines scolaires régionales à **600 000 000 FCFA** chacune, 1 ligne de cantines scolaires du district d'Abidjan à **400 000 000 FCFA**, et 1 provision de fonctionnement à **700 000 000 FCFA**. Contrôle : 41 387 962 099 + 3 600 000 000 + 400 000 000 + 700 000 000 = **46 087 962 099 FCFA**.
- 2 115 activités d'**investissement**, total exact **172 531 000 000 FCFA**. Parmi elles, `90016000010` (PAMREC, PDF p.271) est de **131 000 000 FCFA**. Les autres totalisent **172 400 000 000 FCFA**, montant de l'article 21. Il s'agit d'une identité arithmétique ; l'interprétation juridique du rattachement de PAMREC doit être documentée séparément.

Donc **6 202 599 197 + 46 087 962 099 + 172 531 000 000 = 224 821 561 296 FCFA** (total affiché du programme LFI), et **224 821 561 296 − 131 000 000 = 224 690 561 296 FCFA** (article 21). **Zéro différence arithmétique dans ces blocs.**

### Affectation nominative des investissements : réserve indispensable

- Parmi les 2 115 activités, **2 069** ont un rapprochement nominatif automatique univoque avec une collectivité du registre des 225 lignes de fonctionnement : **167 249 027 012 FCFA** en investissement.
- **37 activités** avec nom de lieu mais sans identité rattachable sans réserve par l'algorithme : **1 995 810 183 FCFA**.
- **9 activités** sans bénéficiaire local nominatif dans le libellé : **3 286 162 805 FCFA**, comprenant la provision pour investissement de **3 000 000 000 FCFA** et le programme PAMREC de **131 000 000 FCFA**.
- Total contrôlé : **167 249 027 012 + 1 995 810 183 + 3 286 162 805 = 172 531 000 000 FCFA**.

La correspondance automatique ne signifie **pas** certification de l'identité administrative : plusieurs libellés présentent des fautes ou variantes orthographiques (ex. `Napieledougou` dans la LFI vs `napie` dans le répertoire des 201 mairies). Les neuf grandes communes du noyau urbain d'Abidjan, à l'exception d'Attécoubé, ne disposent pas de ligne sous le libellé nominatif « Assurer le fonctionnement des services » : **ce constat n'est pas une attestation d'absence de dotation**.

**Aucune mutation des budgets de collectivités** avant le rapprochement complet montant-par-type, la vérification du périmètre nominatif et la levée des réserves de lecture.


## Clôture du rapprochement nominatif LFI + Annexe 4

Après examen des deux versions officielles de chaque activité orpheline, **46/46 codes d'activités** et leurs **montants CP 2026 exacts** ont été retrouvés indépendamment dans l'Annexe 4, à la page PDF renseignée dans `46_ACTIVITES_LFI_ANNEX4_PREUVES.csv`.

- **37 activités supplémentaires** possèdent un libellé permettant d'identifier nominativement un bénéficiaire, pour **1 950 010 183 FCFA**, concernant 17 collectivités. Pour **16** collectivités cela réconcilie intégralement le montant initialement manquant ; la 17e garde un reliquat constitué d'une autre activité non nominative.
- **7 activités**, pour **200 962 805 FCFA**, restent sans collectivité nommée dans leurs libellés LFI **et** Annexe 4. Les anciens budgets présents dans le code semblent arithmétiquement en tenir compte, mais **l'égalité numérique ou la proximité des codes ne prouve pas leur bénéficiaire**.
- Les **2 autres activités non nominatives** sont la provision générale investissement **3 000 000 000 FCFA** et PAMREC **131 000 000 FCFA** : ne pas imputer arbitrairement à une mairie.

### Résultat de la matrice exhaustive des 234 fiches locales

Voir `MATRICE_234_APRES_CONTRE_VERIFICATION_ANNEXE4.csv` :

| Qualification | Effectif | Décision |
|---|---:|---|
| Concordance arithmétique directement à la LFI | 203 | Montant de dotation recoupé, sans l'assimiler au budget primitif |
| Concordance après complément de libellé Annexe 4 | 16 | Montant de dotation recoupé, code activité et pages en annexe |
| Résidus de bénéficiaire d'activité non nommé | 5 | Montants existants préservés, **allocation non certifiée** |
| Activité nominative LFI, budget applicatif encore inconnu | 1 (Attécoubé) | Ne pas écraser le champ « budget primitif inconnu » ; enregistrer la dotation d'État séparément |
| Pas de ligne de fonctionnement nominative dans le programme | 9 communes d'Abidjan | **Conserver null** et attendre les budgets primitifs ; ne signifie pas absence de financement |
| **Total** | **234** | Aucune fausse attribution ni valeur zéro ajoutée |

### Les sept activités nécessitant la lecture contextualisée ou une pièce d'affectation

| Code activité | CP (FCFA) | Pages PDF (LFI / Annexe 4) | Intitulé non nominatif |
|---|---:|---|---|
| 14016001054 | 29 000 000 | 211 / 336 | Développer la pêche et la chasse |
| 14016001055 | 15 000 000 | 211 / 336 | Préservation de la diversité biologique |
| 14016001056 | 50 689 805 | 211 / 336 | Enseignement pré-élémentaire |
| 18016002784 | 50 500 000 | 221 / 328 | Prise en charge des personnes âgées |
| 25016002927 | 21 473 000 | 231 / 318 | Matériel thérapeutique |
| 35016001565 | 25 300 000 | 242 / 308 | Radiodiffusion, télévision, édition |
| 41016002390 | 9 000 000 | 249 / 302 | Équipements collectifs |

**Five provisional recipient hypotheses** may be derived from groupings and reconciliation of application balances, but are NOT official allocations: Kouassi-Kouassikro (three actions of 94 689 805), Tafiré (50 500 000), Komborodougou (21 473 000), Gohitafla (25 300 000), and Logoualé (9 000 000). They remain **non attribuées officiellement** pending evidence. These are suggestions for field/page review ONLY, not facts.

### Couverture des pages à faible texte

Les 64 pages signalées à moins de 80 caractères (22 LFI, 2 Annexe 4, 40 Annexe 7) ont ensuite été soumises à un second tri par contenu visuel et densité de tracés : **42 quasi blanches et 22 pages intercalaires/titres** (montage de vérification `low_text_nonblank_contact.png`). Aucune de ces pages n'a été identifiée comme un tableau budgétaire illisible ; aucune page n'a été écartée silencieusement du parcours des **1 901 pages**. Cela ne signifie pas que chaque chiffre du reste des PDF a été vérifié visuellement indépendamment ; la réconciliation ciblée des dotations locales se fonde sur les codes et CP complets du programme, corroborés par l'Annexe 4.

**Conclusion :** **219/234** dossiers arithmétiquement rapprochés pour leurs dotations nominatives ; **5** appellent une attribution bénéficiaire non disponible dans le libellé d'activité ; **1** dispose d'un transfert nominatif alors que la fiche ne possède pas de budget primitif, et **9** restent sans ligne nominative dans ce programme. **Ce n'est pas une certification de budget primitif.** Aucun montant municipal/régional n'a été corrigé sans justification ; ne pas fusionner, migrer ni déployer.
