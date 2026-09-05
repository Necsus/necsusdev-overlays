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

## 5. Exploitation durable

- Déclarer l'environnement Python et le service applicatif systemd dans NixOS ; conserver un worker et prévoir une limite de fichiers ouverts adaptée.
- Automatiser les sauvegardes cohérentes des données et documenter leur restauration.
- Suivre latences, files, connexions, erreurs SQL et état Twitch ; réduire les journaux inutiles sans exposer de secrets.
- Vérifier les scénarios de panne et de récupération avec l'accord de l'utilisateur sur les moyens de validation.

**Terminé quand :** redémarrage et restauration sont reproductibles, les pannes détectables et les accès SSH/Tailscale préservés.

Une commercialisation demanderait en plus une étude distincte : hébergement client séparé de la DevBox, protection des données, conditions de service et validation du modèle économique.
