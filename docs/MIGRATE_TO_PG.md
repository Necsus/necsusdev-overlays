# Migration de SQLite vers PostgreSQL

## État actuel

**Implémentation et schéma version 1 clôturés.** PostgreSQL est le stockage SQL
de la release, confirmé par l'utilisateur. Restent des validations métier
isolées, le minuteur OBS et les sauvegardes.

Choix : [ADR-0001](adr/0001-postgresql.md). Stockage :
[architecture](ARCHITECTURE.md#données-et-configuration). Commandes :
[README](../README.md#installation-et-lancement).

Départ à vide : fichier SQLite de test supprimé avec accord, sans reprise de
l'historique ni des liens OBS. `.env` et `.tio.tokens.json` hors transfert.

## Contrôles techniques (cette revue)

Vérifié dans le code, NixOS et les commandes `psql` de l'utilisateur, **sans**
lire `.env` :

| Point | Résultat |
| --- | --- |
| Psycopg 3 asynchrone, `PSQL_*`, schéma versionné | Présent (`database.py`, `environment.py`, `requirements.txt`) |
| Une connexion par transaction, pas de pool, pas de SQLite applicatif | Présent (lifespan + `check_schema`) |
| Migration initiale + no-op si version = 1 | Confirmé : seconde exécution → `PostgreSQL schema version 1 ready.` |
| `libpq` release | Déclaré dans `/etc/nixos/overlays.nix` (`LD_LIBRARY_PATH` + `binutils`) |
| `libpq` dev | `scripts/zsh-libpq.zsh` sourcé depuis `~/.zshrc` (confirmation utilisateur) |
| Rôle `overlays-usr` | Pas d'attribut Superuser ; propriétaire de la base `overlays` et des 6 tables métier (`schema_migrations` comprise) |
| Schéma réel | Utilisateur : `PostgreSQL schema version 1 ready.` |
| Application sur PostgreSQL | Utilisateur : première release opérationnelle |

Contrôles ponctuels antérieurs (SQL **simulé**, pas de fichier de tests) :
syntaxe, Ruff, Pyright, `pip check`, import Psycopg avec `libpq`, Settings
fictives, cycle giveaway / doublon / commit incertain.

## 1. Mise en service

- [x] Schéma version 1 appliqué (confirmation utilisateur).
- [x] Release démarrée avec PostgreSQL (confirmation utilisateur).
- [x] `libpq` pérenne pour `overlays.service` (NixOS).
- [x] `libpq` en **zsh** via `scripts/zsh-libpq.zsh` sourcé depuis `~/.zshrc`
      (confirmation utilisateur).
- [x] Droits SQL : `overlays-usr` sans Superuser, propriétaire de la base
      dédiée et des tables (modèle prévu pour un seul rôle migration+app).
- [x] Seconde exécution de la migration : `PostgreSQL schema version 1 ready.`
      (no-op, confirmation utilisateur).

**Section 1 terminée.** Restent les sections 2 et 3.

## 2. Stockage et erreurs — à valider sur PostgreSQL réel

**Aucune case à cocher pour l'instant.** Le code est en place ; une simulation
Python (SQL mocké) a couvert une partie du service. Ça ne remplace pas un
passage sur la base. Pas de fichier de tests. « Release opérationnelle » ne
prouve pas ces scénarios.

| Point | Code | Simulé (mock) | PostgreSQL réel |
| --- | --- | --- | --- |
| Lot, ouverture, inscriptions, refus des doublons | oui | oui | non |
| Plusieurs gagnants ordonnés ; fin et annulation | oui | tirage + arrêt, pas 2 gagnants SQL | non |
| Contraintes : un streamer actif, un giveaway actif, cascades | oui (index/FK) | non | non (`\dt+` ne les exerce pas) |
| Redémarrage `WAITING` / `OPEN` / `WINNER` | oui (`restore_active_giveaway`) | non | non |
| Minuteur ([ADR-0002](adr/0002-giveaway-chronometre.md)) | oui | partiel (rechargement minuteur) | non |
| Clés OBS : accès, refus, rotation, changement de streamer | oui | non | non |
| Coupure SQL : rollback, pas de second tirage, OAuth/clé | oui (rechargement) | second tirage évité en mock | non |

## 3. Usage et exploitation — non clos

- [ ] Parcours Twitch → serveur → OBS (hors simple « release up »).
- [ ] Sauvegarde `pg_dump` / restauration sur une autre base vide.
- [ ] Sauvegardes régulières (hors dépôt).

**Retour arrière :** pas de dump SQLite de test. Un retour à l'ancien code
recréerait une SQLite vide.

**Section 1 close.** Validation complète = exercer la section 2 sur PostgreSQL
(base isolée de préférence) puis la section 3.
