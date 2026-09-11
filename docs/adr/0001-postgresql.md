# ADR-0001 — Migration PostgreSQL

[← Roadmap](../ROADMAP.md)

**Statut :** code migré et schéma version 1 prêt, confirmé par l'utilisateur ;
validation applicative à poursuivre.

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

- [ ] Suivre le [plan de migration SQLite → PostgreSQL](../MIGRATE_TO_PG.md),
      qui centralise les décisions, tâches et critères de validation de ce
      chantier.

Les [contrôles effectués](../MIGRATE_TO_PG.md#contrôles-déjà-effectués) ne
remplacent pas la validation métier SQL et Twitch/OBS, dont celle du
[giveaway chronométré](0002-giveaway-chronometre.md).
