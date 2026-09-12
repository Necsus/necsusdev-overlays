# ADR-0001 — Migration PostgreSQL

[← Roadmap](../../ROADMAP.md)

**Statut :** implémentation et schéma version 1 clôturés. Validations SQL
isolées, clés OBS, coupures SQL et sauvegardes reportées à
[ADR-0011](../0011-exploitation-durable.md).

## Contexte

Remplacer le stockage SQLite sans changer le comportement Twitch/Giveaway/OBS.

## Décision ou orientation

Retenir Psycopg 3 asynchrone, une connexion par transaction et des migrations
versionnées, sans ORM ni pool. L'utilisateur a autorisé un départ à vide et la
suppression du jeu de test SQLite, sans nouveaux fichiers de tests.

## Conséquences

Les anciens historiques et liens OBS ne sont pas repris. Conserver un seul
worker et séparer la migration du stockage de l'évolution multi-streamer.

## Travail associé et validation

- [x] Code, schéma version 1 et release sur PostgreSQL.
- [x] Mise en service confirmée par l'utilisateur : migration no-op en version
      1, `libpq` release (NixOS) et dev (zsh), rôle applicatif sans
      Superuser, propriétaire de la base dédiée.
- [x] [Giveaway chronométré](0002-giveaway-chronometre.md) : parcours Twitch →
      serveur → OBS.

Les contrôles SQL isolés et l'exploitation ne sont plus suivis ici.
