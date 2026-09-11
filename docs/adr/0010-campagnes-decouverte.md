# ADR-0010 — Campagnes entreprise — découverte et parcours métier

[← Roadmap](../ROADMAP.md)

**Statut :** hypothèses produit à valider, sauf besoins explicitement exprimés.

## Contexte

Les collaborations accessibles via le manager permettent une exploration, pas
une validation générale du marché.

## Décision ou orientation

Choisir un pilote sur des besoins et données réels ; garder les cinq parcours
comme pistes, sans les développer tous.

## Conséquences

La découverte guide les extensions du [MVP](0008-campagnes-mvp.md). Offre,
tarification et promesses commerciales restent à valider.

## Travail associé et validation

### Découverte métier avec le manager — avant développement

Le manager et ses collaborations donnent accès à des retours terrain pour
explorer une offre commerciale, sans démontrer une demande ni une volonté de
payer.

1. Reconstituer avec le manager une ancienne collaboration à partir d'un brief
   et d'un bilan anonymisés : objectif de l'entreprise, engagements du streamer,
   outils utilisés, données obtenues, travail manuel et décision finale. Ne pas
   copier de contrats, secrets ou données personnelles dans le dépôt.
2. Interroger progressivement les interlocuteurs des cinq catégories ci-dessous
   à partir d'une campagne réelle : « Quel résultat vouliez-vous ? », «
   Qu'avez-vous pu mesurer ? », « Qu'est-ce qui vous a manqué ? », « Qui peut
   donner accès aux données et avec quel effort ? ». Distinguer entreprise
   acheteuse, manager opérateur, développeur intégrateur et streamer
   utilisateur.
3. Pour chaque catégorie, consigner les besoins comme **hypothèses / confirmés /
   non prioritaires**, avec le contexte anonymisé et les contradictions
   rencontrées. Un seul pilote ne valide pas tout un segment.
4. Choisir une collaboration pilote selon le besoin concret, les données
   accessibles, l'effort d'intégration et le calendrier. Les cinq parcours
   restent ouverts ; leur ordre ci-dessous n'est ni une priorité de
   développement ni un classement des usages du marché. L'exploration des
   extensions ne bloque pas le MVP par événements entrants.
5. Faire valider un exemple fictif de bilan et d'objectifs OBS avant de
   construire les connecteurs. Séparer ce qui aide l'entreprise à décider de ce
   qui anime la communauté à l'écran.

**Terminé quand :** le manager et une entreprise pilote ont défini les
objectifs, les déclencheurs, l'attribution, les périodes, l'unicité et l'effort
d'appel de notre API. Si l'entreprise ne peut pas envoyer d'événements, explorer
un import comme extension et demander confirmation avant de changer le MVP ; ne
pas élargir silencieusement son périmètre.

### Parcours A — Studios indépendants sur Steam

**Hypothèse à vérifier :** montrer l'intérêt généré par une collaboration
(wishlists, démos lorsque mesurables, achats) sans demander une intégration dans
le jeu.

1. Identifier la phase du jeu : annonce, pré-lancement, démo ou lancement ;
   choisir un indicateur principal et vérifier sa disponibilité réelle dans les
   rapports du studio.
2. Préparer des liens UTM cohérents par campagne, streamer et emplacement.
   Explorer l'import d'un export CSV Steamworks avec aperçu, validation des
   colonnes et réimport sans double comptage ; ne pas supposer l'existence d'une
   API adaptée ni demander les identifiants Steam du studio.
3. Produire un bilan séparant clics de nos liens, visites et conversions
   attribuées par Steam. Afficher les objectifs autorisés avec la date de mise à
   jour ; ne pas faire passer les données différées pour du temps réel.
4. Étendre aux comparaisons entre campagnes et aux coûts par résultat seulement
   si les coûts et dénominateurs nécessaires sont disponibles et comparables. Ne
   pas déduire automatiquement les ventes futures des wishlists.

**Contrainte documentée :** Steam fournit des résultats UTM agrégés et un export
CSV, avec visites actualisées à l'heure et conversions finalisées quatre jours
après la visite. Certaines données sont exclues pour confidentialité ou seuils ;
les conversions UTM sont attribuées dans une fenêtre de 72 heures. Vérifier ces
conditions au moment du pilote dans la
[documentation Steamworks](https://partner.steamgames.com/doc/marketing/utm_analytics?l=english).

**Première valeur vérifiable :** le studio et le manager peuvent lire un bilan
réconcilié avec un export autorisé et comprendre ce qui est attribué, manquant
ou encore provisoire, sans intégration dans le jeu.

### Parcours B — Éditeurs de jeux avec backend

**Hypothèse à vérifier :** mesurer des joueurs qualifiés plutôt que de simples
clics, et animer la campagne avec des objectifs alimentés par des actions dans
le jeu.

1. Choisir avec l'entreprise une action utile : compte créé, tutoriel terminé,
   première partie ou niveau atteint. Définir précisément si l'on compte des
   actions ou des joueurs uniques, et comment le lien est relié à l'action.
2. Réaliser la première tranche commune avec événements entrants authentifiés et
   plusieurs objectifs OBS ; l'entreprise conserve son système comme source de
   référence.
3. Comparer les résultats avec un extrait agrégé autorisé de son backend.
   Traiter événements répétés, annulations, pertes d'attribution et délais ;
   afficher séparément données reçues et confirmées selon les statuts
   effectivement fournis.
4. Ajouter un parcours de conversion et des indicateurs de retour des joueurs
   seulement si cela répond à une décision client et si les données nécessaires
   sont disponibles. Ne pas créer un SDK multi-moteurs avant un besoin démontré.

**Première valeur vérifiable :** une action confirmée alimente le bon objectif
et un bilan cohérent avec la source de l'entreprise, avec effort d'intégration
mesuré et absence de double comptage.

### Parcours C — Éditeurs de jeux mobiles

**Hypothèse à vérifier :** exploiter les outils d'attribution déjà installés
pour comparer acquisition et qualité des joueurs, sans imposer un second SDK.

1. Identifier l'outil existant (par exemple AppsFlyer ou Adjust), les
   accès/exportations réellement autorisés et les dimensions disponibles par
   campagne/créateur. Vérifier les contraintes contractuelles, de coût et de
   confidentialité avant de promettre un connecteur.
2. Conserver si possible leurs liens et identifiants de campagne. Valider toute
   redirection supplémentaire pour ne pas casser l'ouverture de l'application,
   le passage par la boutique ou l'attribution.
3. Importer d'abord les résultats autorisés les plus simples, par fichier ou API
   selon le pilote : installations attribuées et une action qualifiante.
   Préserver les règles et fenêtres de la source, les délais et les données
   indisponibles ; aucune tentative de contournement des protections des
   plateformes.
4. Étendre à la rétention par cohorte et au retour sur dépenses publicitaires
   (ROAS) si demandés : définir période, coût inclus, revenus, devise et
   maturité des cohortes. Ne pas confondre revenus attribués, bénéfice et impact
   causal de la campagne.

**Première valeur vérifiable :** le manager obtient un bilan compatible avec les
rapports de l'outil existant, sans nouveau SDK, et les objectifs OBS ne publient
que des agrégats approuvés avec leur fraîcheur.

### Parcours D — Agences et managers de campagnes

**Hypothèse à vérifier :** réduire la préparation et la consolidation des bilans
de plusieurs streamers, puis fournir au client un résultat compréhensible et
partageable.

1. Décrire le travail actuel du manager : préparation du brief, création des
   liens, suivi des engagements et collecte des résultats. Mesurer le temps
   passé et les erreurs récurrentes avant de proposer une automatisation.
2. Préparer une vue par campagne et streamer, réunissant liens, objectifs
   convenus, résultats sourcés et liens vers les preuves de réalisation
   autorisées (replay, extrait ou bilan de diffusion). Séparer réalisation
   contractuelle, exposition et conversion ; ne pas annoncer une vérification
   automatique du contenu.
3. Prévoir un bilan exportable et un accès client limité. Définir les
   délégations agence → entreprise → campagne sans donner à une agence un accès
   global à toutes les entreprises ; protéger aussi budgets et conditions
   individuelles des streamers.
4. Comparer les résultats seulement lorsque définitions, périodes et sources
   sont compatibles ; signaler les données manquantes plutôt que fabriquer un
   classement. Prioriser ensuite les modèles de campagne et l'automatisation des
   collectes réellement répétitives.

**Première valeur vérifiable :** le manager prépare un bilan multi-streamer
accepté par un client avec moins de travail manuel, mesuré par rapport à sa
méthode actuelle, sans mélange entre clients ni divulgation des conditions
privées.

### Parcours E — Sites marchands et collaborations mensuelles

**Besoin exprimé :** couvrir aussi les partenariats hors jeu vidéo, notamment
les collaborations mensuelles avec des boutiques. Objectifs retenus : commandes
payées, clients acheteurs uniques, montants cumulés et actions personnalisées.
Le mécanisme réel d'attribution reste à confirmer pour chaque partenaire ;
accepter code promotionnel, lien de suivi ou règle interne sans en imposer un.

1. Identifier dans le système du partenaire le moment qui confirme l'action,
   puis brancher un appel serveur vers notre API. Un webhook existant ou un
   outil d'automatisation peut convenir s'il respecte le contrat et les règles
   d'authentification ; ne pas promettre un connecteur natif Shopify/WooCommerce
   sans besoin confirmé.
2. Commencer par les commandes payées avec une référence opaque de commande :
   plusieurs notifications de la même commande ne doivent pas créer plusieurs
   ventes, même avec des identifiants d'événements différents. Pour les clients
   uniques, définir l'identifiant opaque ou la garantie de déduplication
   entreprise prévue par le MVP, sans envoyer de coordonnées client ni le détail
   du panier.
3. Définir les périodes mensuelles avant automatisation : mois civil ou dates
   contractuelles, fuseau horaire et bornes non chevauchantes. Créer une
   nouvelle période avec ses objectifs sans effacer l'ancienne ; figer les
   définitions et cibles historiques. Rattacher les événements à leur date
   métier convenue plutôt qu'à leur seule date de réception, avec une règle
   explicite pour les retards et la clôture.
4. Ajouter les montants cumulés : convenir HT/TTC, frais de port, remises,
   statut de paiement et devise. Utiliser une représentation monétaire exacte ;
   ne jamais additionner des devises différentes sans règle de conversion
   explicite. Ne pas confondre montant brut de commandes, ventes nettes et
   bénéfice.
5. Définir annulations et remboursements partiels/complets avec référence à la
   commande d'origine, déduplication et historique des ajustements. Décider si
   un remboursement tardif corrige la période d'origine ou produit un ajustement
   dans la période courante, et de son effet sur commandes/clients uniques ; ne
   pas déduire aveuglément une commande entière pour chaque remboursement
   partiel.
6. Valider une transition de mois, une commande attribuée par code et lien à la
   fois, une notification répétée, un client ayant plusieurs commandes, un
   événement tardif et un remboursement sur la période précédente. Distinguer
   montant public autorisé dans OBS et données commerciales réservées au
   partenaire/manager.

**Première valeur vérifiable :** une commande confirmée alimente une seule fois
le bon objectif du bon streamer et de la bonne période ; le changement de mois
préserve l'historique. **Extension validée quand :** clients uniques et montants
se réconcilient avec les résultats autorisés de la boutique, y compris les
ajustements selon la règle convenue, sans divulguer de données client.

### Offre commerciale — hypothèses à valider

- Proposition de socle : cadrage des objectifs, liens de campagne et bilan
  sourcé. Options possibles : objectifs OBS, intégration des conversions,
  consolidation multi-streamer et suivi différé. Ce découpage n'est ni une offre
  ni une tarification validée.
- Définir avec le manager ce qui est inclus, optionnel ou sur devis :
  configuration, création/adaptation CSS, intégration, accompagnement, fréquence
  des résultats et durée du suivi après campagne. Mesurer le coût opérationnel
  avant de fixer un prix.
- Afficher les prérequis de chaque option et l'effort demandé à l'entreprise. Ne
  pas vendre une conversion mesurée en direct si la source n'en fournit qu'un
  relevé différé.
- Valider l'intérêt de l'overlay séparément de celui du bilan : une entreprise
  peut vouloir l'un sans l'autre. Ne pas promettre un nombre de ventes, une
  attribution exhaustive ou un retour sur investissement garanti.
- Déterminer si le pilote est une démonstration, une option incluse ou une
  prestation payante ; recueillir ensuite un retour sur l'utilité et une
  décision de renouvellement. Ne pas engager de conditions commerciales sans
  accord explicite.
