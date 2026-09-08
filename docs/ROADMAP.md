# NecsusDevOverlays — Roadmap

Ce fichier contient uniquement le travail restant. L'existant est décrit dans [l'architecture](ARCHITECTURE.md) ; les commandes et l'installation dans le [README](../README.md).

Travailler sur une seule tâche à la fois, avec un critère de fin vérifiable. Après validation, actualiser la documentation concernée et retirer les détails devenus inutiles de cette roadmap. Les consignes de contribution restent dans `AGENTS.md`.

## 1. Prochaine étape : valider le giveaway chronométré dans OBS

- [ ] Vérifier l'affichage et la disparition du compteur avec le CSS personnalisé.
- [ ] Vérifier le tirage à échéance, les gagnants supplémentaires et le cas sans participant.
- [ ] Vérifier l'annulation par tirage manuel ou arrêt, puis un nouveau lot sans minuteur.
- [ ] Vérifier la reprise après redémarrage, y compris une échéance dépassée.

**Terminé quand :** ces scénarios passent de bout en bout Twitch → serveur → OBS. Le contrôle isolé du mode manuel ne remplace pas cette validation.

## 2. Stabilisation sous charge

Ordre proposé, à ajuster aux mesures :

1. Mesurer le parcours message → commande → transaction → OBS sur une base temporaire sur disque, jamais sur les données réelles.
2. Indexer les participants par identifiant Twitch pour éviter les recherches linéaires.
3. Garantir la cohérence mémoire/base pour toutes les transitions ; sortir SQLite de la boucle événementielle et activer WAL avec `busy_timeout`.
4. Sortir les diffusions du verrou sans inverser l'ordre des états ; utiliser des files bornées et conserver le dernier état du giveaway.
5. Borner les délais d'envoi, déconnecter les clients lents, limiter les connexions et les messages entrants.
6. Superviser TwitchIO, ajouter `live`/`ready` et une reconnexion progressive avec jitter.

**Critères :** 10 000 inscriptions uniques persistées sans divergence ni doublon ; un OBS lent ne bloque pas les commandes ; files et mémoire bornées. Les spectateurs Twitch ne sont pas des connexions directes au serveur : mesurer messages/s, inscriptions/s et nombre de sources OBS séparément.

Ne pas ajouter Redis, microservices ou plusieurs workers sans besoin mesuré. Toute création de fichiers de tests ou scripts de charge nécessite l'accord de l'utilisateur.

## 3. Plugin Chat

### Périmètre retenu

Une source OBS indépendante sous `/plugins/chat/overlay#<clé-chat>`, avec sa propre clé et son propre WebSocket. Pas d'overlay composite ni de framework générique de plugins à ce stade.

```text
Message Twitch du streamer actif
    ├── commandes Giveaway
    └── service Chat → WebSocket Chat → OBS
```

Le connecteur reçoit déjà les messages : pas de second bot nécessaire. Une erreur ou une lenteur du rendu Chat ne doit pas interrompre les commandes. Ne pas persister l'historique du chat en V1 ; conserver une fenêtre bornée dans le navigateur, vide au rechargement.

### Choix produit à confirmer

Les valeurs suivantes sont des propositions, pas des décisions validées :

| Choix | Proposition initiale |
|---|---|
| Commandes et messages du bot | Affichés comme les autres messages |
| Nombre maximal visible | 30 messages |
| Durée d'affichage | 60 secondes |
| Disposition | Nouveaux messages en bas |
| Contenu | Pseudo et texte ; couleur à décider |

### Progression

1. Définir un message indépendant de TwitchIO : identifiant du message, identifiant auteur, login, nom affiché, texte et date de réception UTC.
2. Distribuer les événements vers les commandes et le Chat sans blocage réseau dans le chemin des commandes.
3. Créer un gestionnaire Chat distinct avec files bornées, délais d'envoi et déconnexions ciblées. Contrairement au giveaway, l'affichage peut abandonner des messages trop anciens en surcharge, sans perdre les commandes associées.
4. Ajouter `/plugins/chat/ws` et réutiliser le protocole d'authentification, en exigeant le slug `chat`. Refuser les clés Giveaway et ne rien diffuser avant validation.
5. Créer la page transparente : rendu textuel sûr, DOM borné, expiration, reconnexion progressive et déduplication par identifiant si disponible.
6. Ajouter dans `/admin` l'état et la rotation de clé sous `/api/admin/plugins/chat/overlay-access` et `/rotate`. Une rotation Chat ne doit pas fermer Giveaway, et inversement.
7. Valider les deux plugins ensemble avec plusieurs clients et un client lent.

**Première tranche vérifiable :** un message Twitch apparaît dans une source Chat authentifiée sans régression des commandes Giveaway.

**Critère final :** deux sources OBS indépendantes, clés non interchangeables et rotations isolées ; contenu HTML du chat rendu comme du texte ; consommation mémoire bornée.

### Après la V1

Badges, emotes, réponses, Cheers et réglages visuels sont reportés. Prévoir le traitement des suppressions et effacements de chat avant un usage public. Une scène composite pourra être étudiée ultérieurement sans supprimer les sources indépendantes.

## 4. Multi-streamer simultané

Le socle OAuth et la table `streamers` existent déjà. Il reste à :

- versionner les migrations, rattacher les giveaways existants à un propriétaire sans perdre l'historique et remplacer l'unicité globale par une unicité par streamer ;
- créer les moteurs, services, minuteurs et connexions isolés par streamer/plugin ;
- maintenir plusieurs abonnements EventSub avec le même bot, restaurer chacun et isoler les révocations ;
- ajouter les préférences par streamer et l'historique administratif paginé, participants compris ;
- filtrer chaque accès aux données par l'identité de session et retourner `404` pour les ressources d'un autre streamer.

**Terminé quand :** deux chaînes utilisent simultanément des giveaways indépendants, y compris après redémarrage, sans commandes, données ou révocations croisées.

## 5. Bibliothèque de styles CSS Giveaway

**Fonctionnalité prévue, non implémentée.** Sauvegarder des blocs CSS nommés depuis `/admin`, les retrouver et les copier dans le champ **CSS personnalisé** de la source navigateur OBS. Périmètre limité au Giveaway, sans application automatique ni synchronisation avec OBS.

### Visibilité et propriété

- Chaque style appartient à un streamer identifié par son identité Twitch stable et reste **privé par défaut**.
- Le propriétaire peut créer, consulter, modifier, supprimer son style et changer sa visibilité.
- Un style **partagé** est consultable et copiable par tous les streamers authentifiés ayant accès au service, mais modifiable uniquement par son propriétaire. Aucun catalogue anonyme ni changement d'exposition réseau n'est prévu.
- Un streamer peut dupliquer un style partagé dans sa bibliothèque : la copie lui appartient, démarre privée et évolue indépendamment de l'original.
- Repasser un style en privé ou le supprimer retire son accès partagé, mais ne peut pas révoquer les copies déjà sauvegardées ou collées dans OBS. L'interface doit annoncer cette limite avant publication.

### Flux et limites de la V1

```text
/admin → bibliothèque personnelle ou partagée → copier le CSS → coller dans OBS
                         └── dupliquer un style partagé → copie personnelle privée
```

- Prévoir un nom, une description facultative, le contenu CSS, le propriétaire, la visibilité et les dates de création/modification. Persister ces données en SQLite avec une migration versionnée, sans les mêler aux secrets ou aux clés d'accès OBS.
- Distinguer « Mes styles » et « Styles partagés » ; identifier l'auteur des styles partagés avec les seules informations publiques nécessaires.
- Une modification ou suppression dans la bibliothèque ne modifie jamais le CSS déjà collé dans OBS. Pour actualiser le rendu, l'utilisateur copie puis colle à nouveau le bloc.
- La compatibilité repose sur les sélecteurs Giveaway documentés dans le [README](../README.md#connecter-twitch-et-obs), compteur compris. Définir leur stabilité avant l'ouverture du partage ; ne pas promettre une compatibilité avec toutes les futures versions.
- Ajouter une prévisualisation du CSS avec un sélecteur couvrant chaque état réel : `HIDDEN` (masqué), `WAITING` (en attente), `OPEN` (ouvert) et `WINNER` (gagnant). Utiliser uniquement des valeurs fictives : lot, nombre de participants et noms des gagnants. Prévoir les variantes avec/sans compteur et avec un ou plusieurs gagnants, ainsi que des textes longs pour contrôler les débordements. Pour `HIDDEN`, l'overlay reste invisible ; une indication hors aperçu explique cet état.
- L'aperçu utilise le même contrat de DOM et de rendu que l'overlay OBS, sans connexion Twitch/WebSocket, sans clé OBS et sans lecture ni modification du giveaway réel. Le temps simulé doit rester reproductible, sans dépendre d'une échéance réelle périmée.
- Reporter l'application distante, l'historique de versions, les notes et les commentaires. Aucun framework de thèmes ou nouveau plugin n'est nécessaire à cette étape.

### Isolation et sécurité

- S'appuyer sur l'identité de session et les migrations versionnées du chantier multi-streamer. La propriété et les contrôles d'accès sont requis dès la première sauvegarde, même avec une seule chaîne active.
- Vérifier les droits côté serveur pour chaque liste, lecture, copie et mutation ; ne jamais faire confiance à un propriétaire fourni par le navigateur. Retourner `404` pour le style privé d'un autre streamer ; refuser toute modification d'un style partagé par un non-propriétaire.
- Protéger les mutations contre les requêtes intersites (CSRF). Définir des limites de taille, de nombre de styles par propriétaire et une pagination avant implémentation.
- Traiter noms, descriptions et CSS comme du contenu non fiable : afficher les métadonnées et le code comme du texte, sans injection HTML. Exécuter le CSS uniquement dans un aperçu isolé (iframe sandboxée sans accès à l'origine de l'administration), jamais dans le document de l'administration. Restreindre les capacités de l'iframe et bloquer ses requêtes réseau par une CSP adaptée, y compris les imports, images et polices externes ; signaler que ces ressources ne seront pas prévisualisées. Ne pas récupérer côté serveur les ressources référencées par un style.
- Avertir que le CSS collé dans OBS peut masquer des éléments et charger des ressources externes (`url()`, `@import`, polices), donc provoquer des requêtes vers des tiers. Ne pas présenter un style partagé comme sûr sans contrôle ; inviter à relire le bloc avant utilisation.
- Exclure du partage les liens OBS authentifiés, tokens et autres secrets ; ne jamais les ajouter automatiquement au CSS ou aux métadonnées. Rappeler cette interdiction avant publication et ne pas journaliser le contenu des blocs.

### Progression et critères de fin

1. Définir les limites et le contrat des sélecteurs ; préparer la persistance et les autorisations par propriétaire.
2. Livrer la bibliothèque privée : création, édition, suppression et copie du CSS ; vérifier sa conservation après redémarrage.
3. Ajouter la publication explicite, le catalogue partagé et la duplication indépendante.
4. Contrôler avec deux identités et des styles fictifs : isolation des styles privés, refus des accès anonymes, lecture partagée sans droit d'édition, copie privée indépendante, retrait du partage et suppression. Vérifier les accès directs à l'API, pas seulement les boutons de l'interface.
5. Ajouter et contrôler l'aperçu isolé sur chaque état avec des données fictives : compteur avec/sans durée, gagnants multiples, textes longs et overlay masqué. Vérifier que le CSS ne peut ni affecter l'administration ni charger de ressources externes, et que les changements de scénario ne touchent pas au giveaway réel.
6. Valider réellement dans OBS le bloc copié : transparence, états du giveaway, gagnants et compteur avec/sans durée. Vérifier qu'une modification du style d'origine n'affecte pas la copie ni le rendu déjà configuré dans OBS.

**Terminé quand :** les styles persistent, les droits ci-dessus sont vérifiés, la prévisualisation isolée couvre chaque état avec des données fictives et le parcours sauvegarde → partage → copie → OBS fonctionne sans exposer de secrets ni modifier les giveaways. Distinguer contrôles d'API et validation visuelle OBS ; tout nouveau fichier de tests ou script nécessite un accord spécifique.

## 6. Plugin Points de chaîne — squelette d'alerte OBS

**Idée prévue, non implémentée.** Afficher une alerte lorsqu'un spectateur utilise une récompense personnalisée Twitch : **pseudo, titre de la récompense (« lot ») et coût en points de cette utilisation**. Ce coût n'est ni un solde ni un cumul ; la récompense est indépendante du lot Giveaway.

### Périmètre de la V1

- Source navigateur OBS indépendante, proposée sous `/plugins/channel-points/overlay#<clé-points>`, avec sa propre clé et son WebSocket. Réutiliser le protocole d'accès existant, pas la clé Giveaway ou Chat.
- Page transparente et éléments à sélecteurs stables pour le pseudo, la récompense et les points. Personnalisation par copier-coller dans le champ **CSS personnalisé** d'OBS, comme Giveaway ; aucune application distante du style.
- Déclenchement à la réception de l'utilisation de la récompense, sans attendre sa validation manuelle par le streamer. L'alerte ne prouve pas que la récompense a été honorée ; une annulation ultérieure ne retire pas une alerte déjà vue.
- Lecture seule : pas de création de récompenses, validation, remboursement, son, animation avancée ou action sur le giveaway. Récompenses automatiques Twitch et gestion des changements de statut hors V1.
- Pas d'historique persistant ni de rattrapage des événements manqués pendant un arrêt ; source vide au chargement. Ne pas étendre la bibliothèque de styles Giveaway à ce plugin dans cette tranche.

### Intégration Twitch et flux

```text
Utilisation d'une récompense personnalisée Twitch
    → EventSub → service Points de chaîne → WebSocket authentifié → OBS
```

- Prérequis : points de chaîne disponibles et activés sur la chaîne, récompense personnalisée et consentement OAuth du streamer pour `channel:read:redemptions`. Les permissions actuelles du bot de chat ne suffisent pas ; ne pas demander le droit de gestion pour un simple affichage.
- Écouter `channel.channel_points_custom_reward_redemption.add` version `1`, filtré par `broadcaster_user_id`. Sans filtre `reward_id`, recevoir toutes les récompenses personnalisées de cette chaîne ; pas de sélection par récompense en V1.
- L'événement fournit notamment `user_name`, `reward.title` et `reward.cost`. Conserver aussi l'identifiant de l'utilisation, l'identifiant du streamer, celui de la récompense et `redeemed_at` pour le routage et une déduplication bornée en mémoire.
- Vérifier la prise en charge dans la version de TwitchIO utilisée et intégrer l'abonnement au cycle OAuth/EventSub existant, avec reprise et révocation isolées par streamer. Ne pas ajouter un second bot ni exposer un webhook public par défaut.

Référence de faisabilité : [événement EventSub et autorisations Twitch](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchannel_points_custom_reward_redemptionadd). Cette vérification documentaire ne remplace pas un essai avec une vraie récompense Twitch.

### Choix d'affichage à confirmer avant implémentation

- **Durée :** proposition de huit secondes, puis masquage complet.
- **Utilisations rapprochées :** proposition minimale où la dernière remplace la précédente et relance la durée. Si chaque alerte doit être visible, décider plutôt d'une file bornée, de sa limite et de la politique de débordement avant de coder.

### Progression et critères de fin

1. Confirmer les choix d'affichage, puis vérifier l'autorisation et la réception d'une utilisation de récompense personnalisée ; distinguer événement fictif et validation Twitch réelle.
2. Définir un événement interne minimal indépendant de TwitchIO et le router exclusivement vers le streamer/plugin concerné. Ignorer les doublons connus dans une fenêtre bornée ; ne pas promettre une livraison exactement une fois après redémarrage.
3. Ajouter la source, le WebSocket et la gestion de clé dans `/admin`. Refuser les clés des autres plugins et ne rien diffuser avant authentification ; une rotation ou révocation ne doit pas couper les autres plugins.
4. Rendre pseudo et titre comme du texte, jamais comme du HTML ; ne pas transmettre la saisie libre éventuelle du spectateur, inutile pour cette V1. Borner les envois et isoler les clients lents pour ne pas bloquer Chat ou Giveaway.
5. Vérifier avec des données fictives les doublons, utilisations rapprochées, reconnexions, clés incorrectes et isolation entre deux streamers. Valider ensuite Twitch → serveur → OBS : bonnes valeurs, CSS personnalisé, masquage, et absence de régression des autres plugins.

**Terminé quand :** une utilisation réelle affiche le bon pseudo, la bonne récompense et son coût dans une source OBS authentifiée et stylable, selon la règle d'affichage retenue, sans action métier sur la récompense ni diffusion croisée. Tout nouveau fichier de tests ou script nécessite un accord spécifique.

## 7. Collaborations entreprises — suivi de campagnes et objectifs OBS

**Idée prévue, non implémentée.** Fournir aux entreprises une API qu'elles appellent aux étapes choisies de leurs workflows pour faire progresser des objectifs dans OBS : jeu vidéo, site marchand ou autre collaboration, ponctuelle ou mensuelle. L'entreprise confirme et attribue l'action ; notre service traite sa déclaration et affiche les résultats. Il ne détecte pas lui-même tous les téléchargements ou achats.

### MVP prioritaire — événements entreprise et compteurs OBS

```text
Action confirmée par le système de l'entreprise
    → appel serveur authentifié vers notre API
    → validation et déduplication persistante
    → compteur de l'objectif pour la bonne période → OBS
```

- Configurer plusieurs objectifs : téléchargements, personnes ayant terminé un tutoriel, acheteurs d'un pack de bienvenue ou commandes payées. L'entreprise choisit le déclencheur ; libellé, cible et type d'événement sont configurables sans modifier notre code métier. Les montants cumulés sont prévus dans le parcours e-commerce, après validation des compteurs simples.
- **Contrat proposé :** un endpoint commun d'événements versionné plutôt qu'une route codée par entreprise ou objectif. Chaque événement porte un identifiant stable, un type configuré, sa date et les références convenues de campagne/streamer. La clé identifie l'intégration ; le serveur vérifie les références et refuse les types non configurés.
- Dans la première tranche, un événement accepté contribue de `+1` selon la règle de l'objectif, pas d'un incrément arbitraire fourni par le client. Distinguer le réessai d'un événement du retour d'une même personne : l'identifiant d'événement déduplique les réessais ; pour les personnes uniques, convenir d'un identifiant opaque stable limité à l'intégration ou d'une garantie d'unicité assurée par l'entreprise. L'unicité métier porte sur l'objectif et la période ; aucun email ou pseudo réel n'est requis.
- Enregistrer réception et effet sur le compteur dans une même transaction avant acquittement. Un réessai identique ne modifie rien ; le même identifiant avec un contenu différent est refusé. Documenter les réponses accepté/déjà traité/refusé et les conditions de réessai.
- Appels depuis le backend ou un outil serveur de l'entreprise ; aucune clé secrète dans le jeu distribué, le navigateur du client ou le CSS OBS. Réutiliser les garde-fous d'authentification et d'isolation décrits plus bas.
- L'entreprise transmet l'attribution convenue à partir d'un lien, d'un code promotionnel ou de son propre système. Notre service ne devine pas le streamer ; un événement sans attribution exploitable ne doit pas alimenter arbitrairement un objectif individuel.
- Définir précisément chaque action : téléchargement terminé, installation et premier lancement sont distincts ; panier créé, commande passée et paiement confirmé aussi. Convenir des corrections, remboursements et événements reçus après la fin de période avant un usage réel, sans construire un moteur de workflow générique.
- Conserver des compteurs par période, sans remise à zéro destructive. OBS reçoit l'état des objectifs autorisés au chargement et à la reconnexion, puis leurs mises à jour ; il ne calcule pas les totaux à partir d'événements bruts. Le CSS reste collé dans le champ personnalisé d'OBS comme Giveaway.
- Fournir au pilote un accès d'intégration confidentiel, la liste des événements/objectifs configurés, une documentation des appels et erreurs, un exemple fictif de payload et un moyen de validation isolé. Aucun SDK, connecteur Steam/mobile/e-commerce, portail complet ou bilan marketing avancé requis pour cette tranche.

**Critère du MVP :** une entreprise peut déclencher les compteurs depuis ses workflows, réessayer sans double comptage et retrouver les bonnes valeurs après redémarrage ou changement de période ; OBS ne reçoit que les objectifs autorisés. Notre garantie concerne le traitement des déclarations, pas la vérification indépendante de l'achat ou du téléchargement.

### Extensions et capacités transversales

Les capacités ci-dessous restent une direction produit, **pas encore des besoins clients validés**. Les cinq parcours métier servent à explorer les extensions ; il n'est pas nécessaire de les développer tous pour commencer avec une entreprise capable d'envoyer ses événements.

- Proposer des liens de campagne globaux et des liens propres à chaque streamer, redirigeant vers une destination configurée pour la campagne : site, boutique ou jeu.
- Accepter des métriques personnalisées : clics/visites, inscriptions, installations, actions dans le jeu et valeurs cumulées (temps de jeu, points, montants avec unité/devise explicite).
- Accepter soit des résultats agrégés par campagne/streamer, soit des événements associés à un identifiant de suivi pseudonyme. Ne pas imposer la collecte de l'identité réelle du joueur.
- Permettre plusieurs objectifs configurables : libellé, métrique, cible, unité, période et périmètre campagne ou streamer. Une entreprise ne peut partager un total global avec un streamer que de manière explicite.
- Prévoir une source OBS indépendante avec clé propre, lecture seule et isolation par streamer/campagne. Proposition de présentation : libellé, valeur, cible et barre de progression ; CSS personnalisé collé dans OBS, sans étendre automatiquement la bibliothèque Giveaway.

### Modes d'intégration — entrant d'abord, autres modes ultérieurs

| Mode | Fonction | Contraintes principales |
|---|---|---|
| Événements entrants | L'entreprise envoie les actions confirmées vers notre endpoint authentifié. | Identifiant d'événement stable, authentification, validation et déduplication persistante. |
| Interrogation de leur API | Notre service récupère les événements ou compteurs sur les endpoints de l'entreprise. | Authentification, pagination/curseur, fréquence, limites de débit et reprise. |
| Envois vers leur API | Notre service transmet les événements observés et résultats autorisés vers leurs endpoints. | Sélection des données, authentification, livraisons suivies et réessais bornés. |

- Définir un contrat interne versionné et une correspondance configurable des champs entrants/sortants : identifiants, type d'événement, date UTC, campagne, streamer facultatif, identifiant de suivi facultatif, valeur et unité. La configuration ne doit pas permettre d'exécuter du code arbitraire.
- Commencer par HTTPS et JSON avec des exemples documentés ; étendre formats et méthodes d'authentification à partir des besoins des entreprises pilotes. Distinguer ce qui est configurable sans code de ce qui exige un nouvel adaptateur ; ne pas construire un moteur d'intégration universel dès la première tranche.
- Fournir progressivement le nécessaire à l'intégration : contrat d'API, exemples fictifs de requêtes/réponses et d'erreurs, procédure de configuration des secrets, environnement de validation isolé et état des échanges sans secrets. Tout nouveau fichier de script, exemple exécutable ou test nécessite un accord spécifique.

### Mesure et attribution fiables

```text
Lien global ou streamer → redirection vers l'entreprise
                              └── action confirmée par son système
                                      → événement entrant / API interrogée
                                      → normalisation et attribution
                                      → résultats persistés → objectifs OBS
                                                           └── API de l'entreprise, si configurée
```

- Un accès au lien prouve au mieux une requête de redirection, pas une visite humaine, une installation ou une action dans le jeu. Distinguer clics bruts, clics filtrés et conversions déclarées par l'entreprise ; les robots et préchargements peuvent gonfler les clics. Une signature authentifie l'émetteur, pas la réalité commerciale de l'action.
- Pour le suivi individuel, transmettre un identifiant opaque à l'entreprise, qui le renvoie avec la conversion. Ne jamais y placer de clé OBS ou de secret. Les parcours boutique, installation et multi-appareils peuvent perdre cet identifiant : prévoir des événements non attribués plutôt qu'inventer une correspondance.
- Documenter avec l'entreprise la fenêtre et la règle d'attribution qu'elle applique (code promo, premier/dernier clic ou règle interne), ainsi que la priorité si plusieurs méthodes coexistent. Recevoir une attribution finale, sans compter deux fois une commande liée à un code et un lien. Définir le traitement des liens globaux sans streamer et l'unicité par métrique ; ne pas assimiler clic, personne unique et action répétable.
- Déclarer chaque métrique comme comptage d'événements, somme de valeurs ou instantané agrégé. Ne pas additionner les relevés successifs d'un compteur total, ni compter deux fois une conversion reçue par webhook et par interrogation API ; désigner une source de référence ou une clé de rapprochement fiable.
- Persister événements acceptés ou relevés nécessaires, clés de déduplication, résultats et curseurs avec migrations versionnées. Définir les règles pour événements tardifs/désordonnés, corrections, annulations et changements de configuration ; ne pas modifier silencieusement le sens des résultats passés.
- Les réessais doivent être idempotents, y compris après redémarrage. Pour les envois sortants, conserver un état de livraison et une clé stable ; le destinataire doit aussi dédupliquer. Ne pas promettre une livraison exactement une fois ni un rattrapage si la source ne le permet pas ; éviter les boucles de renvoi entre intégrations.

### Entreprises, permissions et sécurité

- Séparer entreprise, campagne, participation du streamer, intégration et objectif. Définir les droits de gestion, de consultation et d'association d'un streamer à une campagne ; vérifier chaque accès côté serveur. Une clé d'intégration entreprise n'est ni une session streamer ni une clé OBS.
- **Progression d'accès proposée, à valider avec les pilotes :** configuration accompagnée, puis espace entreprise autonome sur invitation, puis inscription libre si utile avec vérification et prévention des abus. Garder ces possibilités ouvertes sans affirmer connaître les modes les plus utilisés avant retour terrain.
- Fournir des résultats consultables/exportables limités aux campagnes autorisées, avec définition des métriques, source et fraîcheur des données. OBS ne reçoit que les objectifs et agrégats explicitement publiables, jamais les événements individuels ou les identifiants de suivi.
- Authentifier les événements entrants ; prévoir protection contre le rejeu, validation des dates et signatures lorsqu'elles sont utilisées, rotation/révocation des secrets et quotas. Les identifiants de campagne/streamer du payload doivent appartenir au périmètre autorisé de l'intégration.
- Pour les endpoints personnalisables, prévenir les requêtes vers le réseau interne (SSRF) : HTTPS, destinations autorisées, contrôle des résolutions DNS et redirections, exclusion des adresses privées/locales et services de métadonnées. Borner délais, taille des réponses, concurrence et réessais ; ne jamais relayer des secrets vers une autre destination.
- Les liens publics doivent pointer uniquement vers des destinations de campagne validées, sans paramètre permettant une redirection arbitraire. Séparer ces liens des accès administratifs et OBS.
- Minimiser les données et journaux ; aucun secret dans une URL, un export ou un événement OBS. Un identifiant pseudonyme reste potentiellement une donnée personnelle : cadrer information/consentement lorsque requis, responsabilités entreprise/service, conservation, suppression et accès avant un usage réel. Pas de fingerprinting ni de rapprochement interentreprises implicite.
- **Prérequis avant un pilote externe :** hébergement et exposition HTTPS adaptés, sauvegarde/restauration et étude de protection des données. Le service actuel est privé sur la DevBox ; cette roadmap n'autorise aucune modification réseau, ouverture publique ou activation de Funnel.

### Découverte métier avec le manager — avant développement

Un manager et des collaborations passées, en cours ou à venir sont disponibles pour explorer une option dans le package commercial. Cela donne accès à des retours terrain, mais ne démontre pas encore une demande ni une volonté de payer.

1. Reconstituer avec le manager une ancienne collaboration à partir d'un brief et d'un bilan anonymisés : objectif de l'entreprise, engagements du streamer, outils utilisés, données obtenues, travail manuel et décision finale. Ne pas copier de contrats, secrets ou données personnelles dans le dépôt.
2. Interroger progressivement les interlocuteurs des cinq catégories ci-dessous à partir d'une campagne réelle : « Quel résultat vouliez-vous ? », « Qu'avez-vous pu mesurer ? », « Qu'est-ce qui vous a manqué ? », « Qui peut donner accès aux données et avec quel effort ? ». Distinguer entreprise acheteuse, manager opérateur, développeur intégrateur et streamer utilisateur.
3. Pour chaque catégorie, consigner les besoins comme **hypothèses / confirmés / non prioritaires**, avec le contexte anonymisé et les contradictions rencontrées. Un seul pilote ne valide pas tout un segment.
4. Choisir une collaboration pilote selon le besoin concret, les données accessibles, l'effort d'intégration et le calendrier. Les cinq parcours restent ouverts ; leur ordre ci-dessous n'est ni une priorité de développement ni un classement des usages du marché. L'exploration des extensions ne bloque pas le MVP par événements entrants.
5. Faire valider un exemple fictif de bilan et d'objectifs OBS avant de construire les connecteurs. Séparer ce qui aide l'entreprise à décider de ce qui anime la communauté à l'écran.

**Terminé quand :** le manager et une entreprise pilote ont défini les objectifs, les déclencheurs, l'attribution, les périodes, l'unicité et l'effort d'appel de notre API. Si l'entreprise ne peut pas envoyer d'événements, explorer un import comme extension et demander confirmation avant de changer le MVP ; ne pas élargir silencieusement son périmètre.

### Parcours A — Studios indépendants sur Steam

**Hypothèse à vérifier :** montrer l'intérêt généré par une collaboration (wishlists, démos lorsque mesurables, achats) sans demander une intégration dans le jeu.

1. Identifier la phase du jeu : annonce, pré-lancement, démo ou lancement ; choisir un indicateur principal et vérifier sa disponibilité réelle dans les rapports du studio.
2. Préparer des liens UTM cohérents par campagne, streamer et emplacement. Explorer l'import d'un export CSV Steamworks avec aperçu, validation des colonnes et réimport sans double comptage ; ne pas supposer l'existence d'une API adaptée ni demander les identifiants Steam du studio.
3. Produire un bilan séparant clics de nos liens, visites et conversions attribuées par Steam. Afficher les objectifs autorisés avec la date de mise à jour ; ne pas faire passer les données différées pour du temps réel.
4. Étendre aux comparaisons entre campagnes et aux coûts par résultat seulement si les coûts et dénominateurs nécessaires sont disponibles et comparables. Ne pas déduire automatiquement les ventes futures des wishlists.

**Contrainte documentée :** Steam fournit des résultats UTM agrégés et un export CSV, avec visites actualisées à l'heure et conversions finalisées quatre jours après la visite. Certaines données sont exclues pour confidentialité ou seuils ; les conversions UTM sont attribuées dans une fenêtre de 72 heures. Vérifier ces conditions au moment du pilote dans la [documentation Steamworks](https://partner.steamgames.com/doc/marketing/utm_analytics?l=english).

**Première valeur vérifiable :** le studio et le manager peuvent lire un bilan réconcilié avec un export autorisé et comprendre ce qui est attribué, manquant ou encore provisoire, sans intégration dans le jeu.

### Parcours B — Éditeurs de jeux avec backend

**Hypothèse à vérifier :** mesurer des joueurs qualifiés plutôt que de simples clics, et animer la campagne avec des objectifs alimentés par des actions dans le jeu.

1. Choisir avec l'entreprise une action utile : compte créé, tutoriel terminé, première partie ou niveau atteint. Définir précisément si l'on compte des actions ou des joueurs uniques, et comment le lien est relié à l'action.
2. Réaliser la première tranche commune avec événements entrants authentifiés et plusieurs objectifs OBS ; l'entreprise conserve son système comme source de référence.
3. Comparer les résultats avec un extrait agrégé autorisé de son backend. Traiter événements répétés, annulations, pertes d'attribution et délais ; afficher séparément données reçues et confirmées selon les statuts effectivement fournis.
4. Ajouter un parcours de conversion et des indicateurs de retour des joueurs seulement si cela répond à une décision client et si les données nécessaires sont disponibles. Ne pas créer un SDK multi-moteurs avant un besoin démontré.

**Première valeur vérifiable :** une action confirmée alimente le bon objectif et un bilan cohérent avec la source de l'entreprise, avec effort d'intégration mesuré et absence de double comptage.

### Parcours C — Éditeurs de jeux mobiles

**Hypothèse à vérifier :** exploiter les outils d'attribution déjà installés pour comparer acquisition et qualité des joueurs, sans imposer un second SDK.

1. Identifier l'outil existant (par exemple AppsFlyer ou Adjust), les accès/exportations réellement autorisés et les dimensions disponibles par campagne/créateur. Vérifier les contraintes contractuelles, de coût et de confidentialité avant de promettre un connecteur.
2. Conserver si possible leurs liens et identifiants de campagne. Valider toute redirection supplémentaire pour ne pas casser l'ouverture de l'application, le passage par la boutique ou l'attribution.
3. Importer d'abord les résultats autorisés les plus simples, par fichier ou API selon le pilote : installations attribuées et une action qualifiante. Préserver les règles et fenêtres de la source, les délais et les données indisponibles ; aucune tentative de contournement des protections des plateformes.
4. Étendre à la rétention par cohorte et au retour sur dépenses publicitaires (ROAS) si demandés : définir période, coût inclus, revenus, devise et maturité des cohortes. Ne pas confondre revenus attribués, bénéfice et impact causal de la campagne.

**Première valeur vérifiable :** le manager obtient un bilan compatible avec les rapports de l'outil existant, sans nouveau SDK, et les objectifs OBS ne publient que des agrégats approuvés avec leur fraîcheur.

### Parcours D — Agences et managers de campagnes

**Hypothèse à vérifier :** réduire la préparation et la consolidation des bilans de plusieurs streamers, puis fournir au client un résultat compréhensible et partageable.

1. Décrire le travail actuel du manager : préparation du brief, création des liens, suivi des engagements et collecte des résultats. Mesurer le temps passé et les erreurs récurrentes avant de proposer une automatisation.
2. Préparer une vue par campagne et streamer, réunissant liens, objectifs convenus, résultats sourcés et liens vers les preuves de réalisation autorisées (replay, extrait ou bilan de diffusion). Séparer réalisation contractuelle, exposition et conversion ; ne pas annoncer une vérification automatique du contenu.
3. Prévoir un bilan exportable et un accès client limité. Définir les délégations agence → entreprise → campagne sans donner à une agence un accès global à toutes les entreprises ; protéger aussi budgets et conditions individuelles des streamers.
4. Comparer les résultats seulement lorsque définitions, périodes et sources sont compatibles ; signaler les données manquantes plutôt que fabriquer un classement. Prioriser ensuite les modèles de campagne et l'automatisation des collectes réellement répétitives.

**Première valeur vérifiable :** le manager prépare un bilan multi-streamer accepté par un client avec moins de travail manuel, mesuré par rapport à sa méthode actuelle, sans mélange entre clients ni divulgation des conditions privées.

### Parcours E — Sites marchands et collaborations mensuelles

**Besoin exprimé :** couvrir aussi les partenariats hors jeu vidéo, notamment les collaborations mensuelles avec des boutiques. Objectifs retenus : commandes payées, clients acheteurs uniques, montants cumulés et actions personnalisées. Le mécanisme réel d'attribution reste à confirmer pour chaque partenaire ; accepter code promotionnel, lien de suivi ou règle interne sans en imposer un.

1. Identifier dans le système du partenaire le moment qui confirme l'action, puis brancher un appel serveur vers notre API. Un webhook existant ou un outil d'automatisation peut convenir s'il respecte le contrat et les règles d'authentification ; ne pas promettre un connecteur natif Shopify/WooCommerce sans besoin confirmé.
2. Commencer par les commandes payées avec une référence opaque de commande : plusieurs notifications de la même commande ne doivent pas créer plusieurs ventes, même avec des identifiants d'événements différents. Pour les clients uniques, définir l'identifiant opaque ou la garantie de déduplication entreprise prévue par le MVP, sans envoyer de coordonnées client ni le détail du panier.
3. Définir les périodes mensuelles avant automatisation : mois civil ou dates contractuelles, fuseau horaire et bornes non chevauchantes. Créer une nouvelle période avec ses objectifs sans effacer l'ancienne ; figer les définitions et cibles historiques. Rattacher les événements à leur date métier convenue plutôt qu'à leur seule date de réception, avec une règle explicite pour les retards et la clôture.
4. Ajouter les montants cumulés : convenir HT/TTC, frais de port, remises, statut de paiement et devise. Utiliser une représentation monétaire exacte ; ne jamais additionner des devises différentes sans règle de conversion explicite. Ne pas confondre montant brut de commandes, ventes nettes et bénéfice.
5. Définir annulations et remboursements partiels/complets avec référence à la commande d'origine, déduplication et historique des ajustements. Décider si un remboursement tardif corrige la période d'origine ou produit un ajustement dans la période courante, et de son effet sur commandes/clients uniques ; ne pas déduire aveuglément une commande entière pour chaque remboursement partiel.
6. Valider une transition de mois, une commande attribuée par code et lien à la fois, une notification répétée, un client ayant plusieurs commandes, un événement tardif et un remboursement sur la période précédente. Distinguer montant public autorisé dans OBS et données commerciales réservées au partenaire/manager.

**Première valeur vérifiable :** une commande confirmée alimente une seule fois le bon objectif du bon streamer et de la bonne période ; le changement de mois préserve l'historique. **Extension validée quand :** clients uniques et montants se réconcilient avec les résultats autorisés de la boutique, y compris les ajustements selon la règle convenue, sans divulguer de données client.

### Package commercial — hypothèses à valider

- Proposition de socle : cadrage des objectifs, liens de campagne et bilan sourcé. Options possibles : objectifs OBS, intégration des conversions, consolidation multi-streamer et suivi différé. Ce découpage n'est ni une offre ni une tarification validée.
- Définir avec le manager ce qui est inclus, optionnel ou sur devis : configuration, création/adaptation CSS, intégration, accompagnement, fréquence des résultats et durée du suivi après campagne. Mesurer le coût opérationnel avant de fixer un prix.
- Afficher les prérequis de chaque option et l'effort demandé à l'entreprise. Ne pas vendre une conversion mesurée en direct si la source n'en fournit qu'un relevé différé.
- Valider l'intérêt de l'overlay séparément de celui du bilan : une entreprise peut vouloir l'un sans l'autre. Ne pas promettre un nombre de ventes, une attribution exhaustive ou un retour sur investissement garanti.
- Déterminer si le pilote est une démonstration, une option incluse ou une prestation payante ; recueillir ensuite un retour sur l'utilité et une décision de renouvellement. Ne pas engager de conditions commerciales sans accord explicite.

### Progression technique commune — guidée par les pilotes

Les parcours A à E partagent campagnes, droits, métriques, résultats, périodes et objectifs ; ils ne nécessitent pas de plugins ou moteurs de suivi distincts. Ils peuvent se recouper, notamment lorsqu'une agence accompagne un studio ou une boutique. Les entretiens peuvent commencer avant les autres chantiers, mais l'isolation multi-streamer et les prérequis d'exploitation restent nécessaires avant un usage externe.

1. Livrer le **MVP prioritaire** défini en tête de section sur données temporaires : configurer une campagne, ses références d'attribution et ses objectifs, recevoir les événements de l'entreprise, persister les compteurs et les afficher dans OBS. Garder les liens globaux/par streamer comme moyen d'attribution, sans obliger une boutique utilisant déjà ses codes promo à changer de mécanisme. Toute substitution du MVP par un import ou connecteur nécessite confirmation.
2. Contrôler doublons/rejeux, données invalides ou tardives, redémarrage, révocation et isolation entre deux entreprises et deux streamers. Les erreurs d'intégration ne doivent pas bloquer les autres plugins. Valider le rendu CSS dans OBS séparément des contrôles d'API.
3. Ajouter les imports de fichiers justifiés par les parcours métier : provenance, période, aperçu, validation bornée, version du format et réimport idempotent. Les imports et API d'une même source doivent partager les règles de rapprochement.
4. Ajouter interrogation API et envois sortants selon les pilotes, avec curseurs, état de livraison, réessais bornés, protection des destinations et gestion de leur indisponibilité. Les trois modes restent une cible, pas un préalable à la première valeur commerciale.
5. Faciliter configuration, consultation/export et diagnostic ; vérifier avec une seconde entreprise qu'une intégration compatible se configure sans modifier le code métier.
6. Valider un pilote externe autorisé, puis confronter le bilan aux données de référence et recueillir le retour du manager et du client. Documenter les limites constatées avant toute promesse commerciale.

**Première tranche terminée quand :** les critères du MVP en tête de section passent sur données fictives, puis le parcours entreprise → API → OBS est confirmé avec un pilote autorisé. **Validation produit :** chaque parcours garde son propre critère ; un succès technique ou un pilote dans une catégorie ne valide pas les autres. Tout nouveau fichier de tests ou script nécessite un accord spécifique.

## 8. Exploitation durable

- Déclarer l'environnement Python et le service applicatif systemd dans NixOS ; conserver un worker et prévoir une limite de fichiers ouverts adaptée.
- Automatiser les sauvegardes cohérentes des données et documenter leur restauration.
- Suivre latences, files, connexions, erreurs SQL et état Twitch ; réduire les journaux inutiles sans exposer de secrets.
- Vérifier les scénarios de panne et de récupération avec l'accord de l'utilisateur sur les moyens de validation.

**Terminé quand :** redémarrage et restauration sont reproductibles, les pannes détectables et les accès SSH/Tailscale préservés.

Une commercialisation demanderait en plus une étude distincte : hébergement client séparé de la DevBox, protection des données, conditions de service et validation du modèle économique.
