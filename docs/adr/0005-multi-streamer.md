# ADR-0005 — Isolation multi-streamer

[← Roadmap](../ROADMAP.md)

**Statut :** évolution prévue ; validation simultanée restante.

## Contexte

Le socle OAuth existe, mais les ressources doivent être isolées pour plusieurs
chaînes actives.

## Décision ou orientation

Rattacher les données et les ressources actives à chaque streamer, avec contrôle
systématique de l’identité de session.

## Conséquences

Adapter les migrations, unicités et cycles de vie ; vérifier l’absence de
croisements après redémarrage.

## Travail associé et validation

À partir du socle OAuth et PostgreSQL existant :

- ajouter une migration versionnée pour rattacher les giveaways à un
  propriétaire sans perdre les données présentes à cette étape, puis remplacer
  l'unicité globale par une unicité par streamer ;
- créer les moteurs, services, minuteurs et connexions isolés par
  streamer/plugin ;
- maintenir plusieurs abonnements EventSub avec le même bot, restaurer chacun et
  isoler les révocations ;
- ajouter les préférences par streamer et l'historique administratif paginé,
  participants compris ;
- filtrer chaque accès aux données par l'identité de session et retourner `404`
  pour les ressources d'un autre streamer.

**Terminé quand :** deux chaînes utilisent simultanément des giveaways
indépendants, y compris après redémarrage, sans commandes, données ou
révocations croisées.
