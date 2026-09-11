# ADR-0002 — Validation du giveaway chronométré

[← Roadmap](../ROADMAP.md)

**Statut :** validation réelle Twitch/OBS restante.

## Contexte

Le [minuteur est implémenté](../ARCHITECTURE.md#giveaway-et-échéance), mais le
contrôle isolé du mode manuel ne couvre pas le parcours chronométré.

## Décision ou orientation

Conserver une validation réelle des échéances, annulations et reprises dans OBS.

## Conséquences

Ce dossier suit une validation, sans introduire de nouvelle décision
d’architecture.

## Travail associé et validation

- [ ] Vérifier l'affichage et la disparition du compteur avec le CSS
      personnalisé.
- [ ] Vérifier le tirage à échéance, les gagnants supplémentaires et le cas sans
      participant.
- [ ] Vérifier l'annulation par tirage manuel ou arrêt, puis un nouveau lot sans
      minuteur.
- [ ] Vérifier la reprise après redémarrage, y compris une échéance dépassée.

**Terminé quand :** ces scénarios passent de bout en bout Twitch → serveur →
OBS.
