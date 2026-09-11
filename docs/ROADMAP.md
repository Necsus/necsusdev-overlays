# NecsusDevOverlays — Roadmap

Ce fichier est l’index du travail restant. L’existant est décrit dans
[l’architecture](ARCHITECTURE.md) ; l’installation et l’usage dans le
[README](../README.md).

## Étape en cours : première release

Préparer une version figée, distincte du développement, via un service NixOS. Le
[plan de publication](adr/0011-exploitation-durable.md#préparer-la-première-release)
reste ouvert ; les validations PostgreSQL et Twitch/OBS sont nécessaires avant
de valider la release.

## Priorités et dossiers ADR

La **validation applicative après migration PostgreSQL** reste prioritaire. Les
trois dossiers « Campagnes entreprise » forment un seul chantier ; leur
découverte métier peut avancer en parallèle, sans autoriser le développement des
extensions.

| Ordre | Dossier |
| --- | --- |
| **Priorité** | [Migration PostgreSQL](adr/0001-postgresql.md) |
| 1 | [Validation du giveaway chronométré](adr/0002-giveaway-chronometre.md) |
| 2 | [Stabilisation sous charge](adr/0003-stabilisation-charge.md) |
| 3 | [Plugin Chat indépendant](adr/0004-plugin-chat.md) |
| 4 | [Isolation multi-streamer](adr/0005-multi-streamer.md) |
| 5 | [Bibliothèque de styles CSS Giveaway](adr/0006-styles-css-giveaway.md) |
| 6 | [Alertes Points de chaîne](adr/0007-points-de-chaine.md) |
| 7 | [Campagnes entreprise — MVP et objectifs OBS](adr/0008-campagnes-mvp.md) |
| 8 | [Campagnes entreprise — intégrations, attribution et sécurité](adr/0009-campagnes-integrations.md) |
| 9 | [Campagnes entreprise — découverte et parcours métier](adr/0010-campagnes-decouverte.md) |
| 10 | [Exploitation durable](adr/0011-exploitation-durable.md) |

## Lire et actualiser les dossiers

- Les ADR précisent contexte, décision ou orientation, conséquences et statut.
  Certains suivent une validation plutôt qu'une nouvelle décision
  d'architecture.
- Les tâches et critères de fin restent dans le dossier concerné ou son plan
  lié, comme le [plan PostgreSQL](MIGRATE_TO_PG.md), sans duplication.
- Après validation, retirer les tâches terminées et fermer l'entrée de cet
  index. Conserver la décision et son statut dans l'ADR. Mettre à jour
  l'architecture ou le README selon l'information.
- Les règles de travail, de sécurité et d'autorisation restent dans
  [AGENTS.md](../AGENTS.md). Aucun plan ne vaut autorisation de coder, créer des
  tests/scripts ou modifier le réseau.
