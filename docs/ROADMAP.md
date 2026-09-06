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
- Reporter l'aperçu exécutant le CSS, l'application distante, l'historique de versions, les notes et les commentaires. Aucun framework de thèmes ou nouveau plugin n'est nécessaire à cette étape.

### Isolation et sécurité

- S'appuyer sur l'identité de session et les migrations versionnées du chantier multi-streamer. La propriété et les contrôles d'accès sont requis dès la première sauvegarde, même avec une seule chaîne active.
- Vérifier les droits côté serveur pour chaque liste, lecture, copie et mutation ; ne jamais faire confiance à un propriétaire fourni par le navigateur. Retourner `404` pour le style privé d'un autre streamer ; refuser toute modification d'un style partagé par un non-propriétaire.
- Protéger les mutations contre les requêtes intersites (CSRF). Définir des limites de taille, de nombre de styles par propriétaire et une pagination avant implémentation.
- Traiter noms, descriptions et CSS comme du contenu non fiable : affichage textuel, sans injection HTML ni exécution du CSS dans l'administration. Ne pas récupérer côté serveur les ressources référencées par un style.
- Avertir que le CSS collé dans OBS peut masquer des éléments et charger des ressources externes (`url()`, `@import`, polices), donc provoquer des requêtes vers des tiers. Ne pas présenter un style partagé comme sûr sans contrôle ; inviter à relire le bloc avant utilisation.
- Exclure du partage les liens OBS authentifiés, tokens et autres secrets ; ne jamais les ajouter automatiquement au CSS ou aux métadonnées. Rappeler cette interdiction avant publication et ne pas journaliser le contenu des blocs.

### Progression et critères de fin

1. Définir les limites et le contrat des sélecteurs ; préparer la persistance et les autorisations par propriétaire.
2. Livrer la bibliothèque privée : création, édition, suppression et copie du CSS ; vérifier sa conservation après redémarrage.
3. Ajouter la publication explicite, le catalogue partagé et la duplication indépendante.
4. Contrôler avec deux identités et des styles fictifs : isolation des styles privés, refus des accès anonymes, lecture partagée sans droit d'édition, copie privée indépendante, retrait du partage et suppression. Vérifier les accès directs à l'API, pas seulement les boutons de l'interface.
5. Valider réellement dans OBS le bloc copié : transparence, états du giveaway, gagnants et compteur avec/sans durée. Vérifier qu'une modification du style d'origine n'affecte pas la copie ni le rendu déjà configuré dans OBS.

**Terminé quand :** les styles persistent, les droits ci-dessus sont vérifiés et le parcours sauvegarde → partage → copie → OBS fonctionne sans exposer de secrets ni modifier les giveaways. Distinguer contrôles d'API et validation visuelle OBS ; tout nouveau fichier de tests ou script nécessite un accord spécifique.

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

**Idée prévue, non implémentée.** Permettre à une entreprise de mesurer une collaboration autour d'un jeu, puis d'afficher des objectifs dans OBS. Le suivi est un service de campagnes ; le plugin OBS n'en est que la vue. Viser une intégration simple et extensible, sans promettre une compatibilité universelle : les conversions mesurables dépendent des interfaces et données fournies par l'entreprise.

### Cible retenue

- Proposer des liens de campagne globaux et des liens propres à chaque streamer, redirigeant vers une destination configurée pour la campagne : site, boutique ou jeu.
- Accepter des métriques personnalisées : clics/visites, inscriptions, installations, actions dans le jeu et valeurs cumulées (temps de jeu, points, montants avec unité/devise explicite).
- Accepter soit des résultats agrégés par campagne/streamer, soit des événements associés à un identifiant de suivi pseudonyme. Ne pas imposer la collecte de l'identité réelle du joueur.
- Permettre plusieurs objectifs configurables : libellé, métrique, cible, unité, période et périmètre campagne ou streamer. Une entreprise ne peut partager un total global avec un streamer que de manière explicite.
- Prévoir une source OBS indépendante avec clé propre, lecture seule et isolation par streamer/campagne. Proposition de présentation : libellé, valeur, cible et barre de progression ; CSS personnalisé collé dans OBS, sans étendre automatiquement la bibliothèque Giveaway.

### Trois modes d'intégration à proposer

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
- Définir avant implémentation la fenêtre et la règle d'attribution (premier/dernier clic, par exemple), le traitement des liens globaux sans streamer et l'unicité attendue par métrique. Ne pas assimiler clic, joueur unique et action répétable.
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

### Progression

1. Recueillir un exemple fictif d'événement et un parcours de conversion auprès d'une entreprise pilote ; préciser métriques, attribution, droits et limites. Utiliser un format interne commun, pas des tables ou routes métier entièrement différentes par entreprise.
2. **Première tranche retenue : lien → événements entrants → objectifs OBS.** Sur données temporaires, configurer une entreprise et une campagne, produire un lien global et un lien streamer, recevoir une conversion authentifiée, la persister une seule fois et actualiser plusieurs objectifs. Aucun SDK, portail complet ni connecteur universel requis pour cette tranche.
3. Contrôler les doublons et rejeux, événements invalides/tardifs, redémarrage, révocation, isolation entre deux entreprises et deux streamers, destinations interdites et indisponibilité d'un destinataire. Vérifier que les erreurs d'intégration ne bloquent pas Giveaway, Chat ou Points de chaîne.
4. Ajouter l'interrogation API puis les envois sortants avec état de synchronisation/livraison, en validant aussi les compteurs agrégés et les corrections. L'ordre entre ces deux modes pourra être ajusté au besoin pilote.
5. Faciliter la configuration autonome, la consultation/export des résultats et le diagnostic ; confirmer avec une seconde entreprise qu'une intégration compatible se configure sans modifier le code métier.
6. Valider réellement le parcours entreprise → service → OBS et son CSS ; distinguer simulation locale, contrôle d'API et pilote externe autorisé. Documenter les métriques non disponibles ou les limites d'attribution constatées.

**Première tranche terminée quand :** une conversion fictive attribuée au bon lien fait progresser les bons objectifs OBS, sans double comptage après réessai/redémarrage ni accès croisé. **Cible validée quand :** les trois modes fonctionnent sur des scénarios convenus, les résultats sont explicables et exportables, et un pilote réel confirme le parcours sans promettre un suivi que l'entreprise ne peut fournir.

## 8. Exploitation durable

- Déclarer l'environnement Python et le service applicatif systemd dans NixOS ; conserver un worker et prévoir une limite de fichiers ouverts adaptée.
- Automatiser les sauvegardes cohérentes des données et documenter leur restauration.
- Suivre latences, files, connexions, erreurs SQL et état Twitch ; réduire les journaux inutiles sans exposer de secrets.
- Vérifier les scénarios de panne et de récupération avec l'accord de l'utilisateur sur les moyens de validation.

**Terminé quand :** redémarrage et restauration sont reproductibles, les pannes détectables et les accès SSH/Tailscale préservés.

Une commercialisation demanderait en plus une étude distincte : hébergement client séparé de la DevBox, protection des données, conditions de service et validation du modèle économique.
