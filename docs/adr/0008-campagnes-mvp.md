# ADR-0008 — Campagnes entreprise — MVP et objectifs OBS

[← Roadmap](../ROADMAP.md)

**Statut :** MVP prioritaire défini ; idée non implémentée ; pilote à valider.

## Contexte

Permettre à une entreprise de faire progresser des objectifs OBS depuis ses
workflows.

## Décision ou orientation

Commencer par des événements entrants authentifiés, dédupliqués durablement, et
des compteurs par période.

## Conséquences

Appliquer les
[contraintes d’intégration et de sécurité](0009-campagnes-integrations.md). Les
[parcours métier](0010-campagnes-decouverte.md) explorent les extensions sans
remplacer le MVP.

## Travail associé et validation

Fournir une API appelée depuis les workflows de l'entreprise pour faire
progresser des objectifs OBS : jeu vidéo, commerce ou autre collaboration,
ponctuelle ou mensuelle. L'entreprise confirme et attribue l'action ; notre
service traite sa déclaration, sans détecter lui-même les achats ou
téléchargements.

### MVP prioritaire — événements entreprise et compteurs OBS

```text
Action confirmée par le système de l'entreprise
    → appel serveur authentifié vers notre API
    → validation et déduplication persistante
    → compteur de l'objectif pour la bonne période → OBS
```

- Configurer plusieurs objectifs : téléchargements, personnes ayant terminé un
  tutoriel, acheteurs d'un pack de bienvenue ou commandes payées. L'entreprise
  choisit le déclencheur ; libellé, cible et type d'événement sont configurables
  sans modifier notre code métier. Les montants cumulés sont prévus dans le
  parcours e-commerce, après validation des compteurs simples.
- **Contrat proposé :** un endpoint commun d'événements versionné plutôt qu'une
  route codée par entreprise ou objectif. Chaque événement porte un identifiant
  stable, un type configuré, sa date et les références convenues de
  campagne/streamer. La clé identifie l'intégration ; le serveur vérifie les
  références et refuse les types non configurés.
- Dans la première tranche, un événement accepté contribue de `+1` selon la
  règle de l'objectif, pas d'un incrément arbitraire fourni par le client.
  Distinguer le réessai d'un événement du retour d'une même personne :
  l'identifiant d'événement déduplique les réessais ; pour les personnes
  uniques, convenir d'un identifiant opaque stable limité à l'intégration ou
  d'une garantie d'unicité assurée par l'entreprise. L'unicité métier porte sur
  l'objectif et la période ; aucun email ou pseudo réel n'est requis.
- Enregistrer réception et effet sur le compteur dans une même transaction avant
  acquittement. Un réessai identique ne modifie rien ; le même identifiant avec
  un contenu différent est refusé. Documenter les réponses accepté/déjà
  traité/refusé et les conditions de réessai.
- Appels depuis le backend ou un outil serveur de l'entreprise ; aucune clé
  secrète dans le jeu distribué, le navigateur du client ou le CSS OBS.
  Réutiliser les
  [garde-fous d'authentification et d'isolation](0009-campagnes-integrations.md).
- L'entreprise transmet l'attribution convenue à partir d'un lien, d'un code
  promotionnel ou de son propre système. Notre service ne devine pas le
  streamer. Un événement sans attribution exploitable ne doit pas alimenter
  arbitrairement un objectif individuel.
- Définir précisément chaque action : téléchargement terminé, installation et
  premier lancement sont distincts ; panier créé, commande passée et paiement
  confirmé aussi. Convenir des corrections, remboursements et événements reçus
  après la fin de période avant un usage réel, sans construire un moteur de
  workflow générique.
- Conserver des compteurs par période, sans remise à zéro destructive. OBS
  reçoit l'état des objectifs autorisés au chargement et à la reconnexion, puis
  leurs mises à jour ; il ne calcule pas les totaux à partir d'événements bruts.
  Le CSS reste collé dans le champ personnalisé d'OBS comme Giveaway.
- Fournir au pilote un accès d'intégration confidentiel, la liste des
  événements/objectifs configurés, une documentation des appels et erreurs, un
  exemple fictif de payload et un moyen de validation isolé. Aucun SDK,
  connecteur Steam/mobile/e-commerce, portail complet ou bilan marketing avancé
  requis pour cette tranche.

**Critère du MVP :** une entreprise peut déclencher les compteurs depuis ses
workflows, réessayer sans double comptage et retrouver les bonnes valeurs après
redémarrage ou changement de période ; OBS ne reçoit que les objectifs
autorisés. Notre garantie concerne le traitement des déclarations, pas la
vérification indépendante de l'achat ou du téléchargement.

### Extensions et capacités transversales

Les capacités ci-dessous restent une direction produit, **pas encore des besoins
clients validés**. Les cinq parcours métier servent à explorer les extensions ;
il n'est pas nécessaire de les développer tous pour commencer avec une
entreprise capable d'envoyer ses événements.

- Proposer des liens de campagne globaux et des liens propres à chaque streamer,
  redirigeant vers une destination configurée pour la campagne : site, boutique
  ou jeu.
- Accepter des métriques personnalisées : clics/visites, inscriptions,
  installations, actions dans le jeu et valeurs cumulées (temps de jeu, points,
  montants avec unité/devise explicite).
- Accepter soit des résultats agrégés par campagne/streamer, soit des événements
  associés à un identifiant de suivi pseudonyme. Ne pas imposer la collecte de
  l'identité réelle du joueur.
- Permettre plusieurs objectifs configurables : libellé, métrique, cible, unité,
  période et périmètre campagne ou streamer. Une entreprise ne peut partager un
  total global avec un streamer que de manière explicite.
- Prévoir une source OBS indépendante avec clé propre, lecture seule et
  isolation par streamer/campagne. Proposition de présentation : libellé,
  valeur, cible et barre de progression ; CSS personnalisé collé dans OBS, sans
  étendre automatiquement la bibliothèque Giveaway.

### Progression technique commune — guidée par les pilotes

Les [parcours A à E](0010-campagnes-decouverte.md) partagent campagnes, droits,
métriques, résultats, périodes et objectifs ; ils ne nécessitent pas de plugins
ou moteurs de suivi distincts. Ils peuvent se recouper, notamment lorsqu'une
agence accompagne un studio ou une boutique. Les entretiens peuvent commencer
avant les autres chantiers, mais l'isolation multi-streamer et les prérequis
d'exploitation restent nécessaires avant un usage externe.

1. Livrer le **MVP prioritaire** défini en tête de section sur données
   temporaires : configurer une campagne, ses références d'attribution et ses
   objectifs, recevoir les événements de l'entreprise, persister les compteurs
   et les afficher dans OBS. Garder les liens globaux/par streamer comme moyen
   d'attribution, sans obliger une boutique utilisant déjà ses codes promo à
   changer de mécanisme. Toute substitution du MVP par un import ou connecteur
   nécessite confirmation.
2. Contrôler doublons/rejeux, données invalides ou tardives, redémarrage,
   révocation et isolation entre deux entreprises et deux streamers. Les erreurs
   d'intégration ne doivent pas bloquer les autres plugins. Valider le rendu CSS
   dans OBS séparément des contrôles d'API.
3. Ajouter les imports de fichiers justifiés par les parcours métier :
   provenance, période, aperçu, validation bornée, version du format et réimport
   idempotent. Les imports et API d'une même source doivent partager les règles
   de rapprochement.
4. Ajouter interrogation API et envois sortants selon les pilotes, avec
   curseurs, état de livraison, réessais bornés, protection des destinations et
   gestion de leur indisponibilité. Les trois modes restent une cible, pas un
   préalable à la première valeur commerciale.
5. Faciliter configuration, consultation/export et diagnostic ; vérifier avec
   une seconde entreprise qu'une intégration compatible se configure sans
   modifier le code métier.
6. Valider un pilote externe autorisé, puis confronter le bilan aux données de
   référence et recueillir le retour du manager et du client. Documenter les
   limites constatées avant toute promesse commerciale.

**Première tranche terminée quand :** les critères du MVP en tête de section
passent sur données fictives, puis le parcours entreprise → API → OBS est
confirmé avec un pilote autorisé. **Validation produit :** chaque parcours garde
son propre critère ; un succès technique ou un pilote dans une catégorie ne
valide pas les autres. Les autorisations de tests/scripts restent celles
d'[AGENTS.md](../../AGENTS.md).
