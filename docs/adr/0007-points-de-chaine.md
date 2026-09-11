# ADR-0007 — Alertes Points de chaîne

[← Roadmap](../ROADMAP.md)

**Statut :** idée prévue, non implémentée ; affichage à confirmer.

## Contexte

Afficher l’utilisation d’une récompense personnalisée Twitch sans agir sur son
traitement métier.

## Décision ou orientation

Prévoir un plugin OBS indépendant en lecture seule, alimenté par EventSub avec
le consentement du streamer.

## Conséquences

Exiger des accès isolés ; ne pas promettre de rattrapage ni d’historique
persistant en V1.

## Travail associé et validation

Afficher une alerte lorsqu'un spectateur utilise une récompense personnalisée
Twitch : **pseudo, titre de la récompense (« lot ») et coût en points de cette
utilisation**. Ce coût n'est ni un solde ni un cumul ; la récompense est
indépendante du lot Giveaway.

### Périmètre de la V1

- Source navigateur OBS indépendante, proposée sous
  `/plugins/channel-points/overlay#<clé-points>`, avec sa propre clé et son
  WebSocket. Réutiliser le protocole d'accès existant, pas la clé Giveaway ou
  Chat.
- Page transparente et éléments à sélecteurs stables pour le pseudo, la
  récompense et les points. Personnalisation par copier-coller dans le champ
  **CSS personnalisé** d'OBS, comme Giveaway ; aucune application distante du
  style.
- Déclenchement à la réception de l'utilisation de la récompense, sans attendre
  sa validation manuelle par le streamer. L'alerte ne prouve pas que la
  récompense a été honorée ; une annulation ultérieure ne retire pas une alerte
  déjà vue.
- Lecture seule : pas de création de récompenses, validation, remboursement,
  son, animation avancée ou action sur le giveaway. Récompenses automatiques
  Twitch et gestion des changements de statut hors V1.
- Pas d'historique persistant ni de rattrapage des événements manqués pendant un
  arrêt ; source vide au chargement. Ne pas étendre la bibliothèque de styles
  Giveaway à ce plugin dans cette tranche.

### Intégration Twitch et flux

```text
Utilisation d'une récompense personnalisée Twitch
    → EventSub → service Points de chaîne → WebSocket authentifié → OBS
```

- Prérequis : points de chaîne disponibles et activés sur la chaîne, récompense
  personnalisée et consentement OAuth du streamer pour
  `channel:read:redemptions`. Les permissions actuelles du bot de chat ne
  suffisent pas ; ne pas demander le droit de gestion pour un simple affichage.
- Écouter `channel.channel_points_custom_reward_redemption.add` version `1`,
  filtré par `broadcaster_user_id`. Sans filtre `reward_id`, recevoir toutes les
  récompenses personnalisées de cette chaîne ; pas de sélection par récompense
  en V1.
- L'événement fournit notamment `user_name`, `reward.title` et `reward.cost`.
  Conserver aussi l'identifiant de l'utilisation, l'identifiant du streamer,
  celui de la récompense et `redeemed_at` pour le routage et une déduplication
  bornée en mémoire.
- Vérifier la prise en charge dans la version de TwitchIO utilisée et intégrer
  l'abonnement au cycle OAuth/EventSub existant, avec reprise et révocation
  isolées par streamer. Ne pas ajouter un second bot ni exposer un webhook
  public par défaut.

Référence de faisabilité :
[événement EventSub et autorisations Twitch](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchannel_points_custom_reward_redemptionadd).
Cette vérification documentaire ne remplace pas un essai avec une vraie
récompense Twitch.

### Choix d'affichage à confirmer avant implémentation

- **Durée :** proposition de huit secondes, puis masquage complet.
- **Utilisations rapprochées :** proposition minimale où la dernière remplace la
  précédente et relance la durée. Si chaque alerte doit être visible, décider
  plutôt d'une file bornée, de sa limite et de la politique de débordement avant
  de coder.

### Progression et critères de fin

1. Confirmer les choix d'affichage, puis vérifier l'autorisation et la réception
   d'une utilisation de récompense personnalisée ; distinguer événement fictif
   et validation Twitch réelle.
2. Définir un événement interne minimal indépendant de TwitchIO et le router
   exclusivement vers le streamer/plugin concerné. Ignorer les doublons connus
   dans une fenêtre bornée ; ne pas promettre une livraison exactement une fois
   après redémarrage.
3. Ajouter la source, le WebSocket et la gestion de clé dans `/admin`. Refuser
   les clés des autres plugins et ne rien diffuser avant authentification ; une
   rotation ou révocation ne doit pas couper les autres plugins.
4. Rendre pseudo et titre comme du texte, jamais comme du HTML ; ne pas
   transmettre la saisie libre éventuelle du spectateur, inutile pour cette V1.
   Borner les envois et isoler les clients lents pour ne pas bloquer Chat ou
   Giveaway.
5. Vérifier avec des données fictives les doublons, utilisations rapprochées,
   reconnexions, clés incorrectes et isolation entre deux streamers. Valider
   ensuite Twitch → serveur → OBS : bonnes valeurs, CSS personnalisé, masquage,
   et absence de régression des autres plugins.

**Terminé quand :** une utilisation réelle affiche le bon pseudo, la bonne
récompense et son coût dans une source OBS authentifiée et stylable, selon la
règle d'affichage retenue, sans action métier sur la récompense ni diffusion
croisée. Les autorisations de tests/scripts restent celles
d'[AGENTS.md](../../AGENTS.md).
