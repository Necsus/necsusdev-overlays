# ADR-0004 — Plugin Chat indépendant

[← Roadmap](../ROADMAP.md)

**Statut :** périmètre retenu ; choix produit à confirmer ; développement prévu.

## Contexte

Afficher le chat sans perturber les commandes Giveaway.

## Décision ou orientation

Prévoir une source OBS, une clé et un WebSocket propres au Chat, sans second bot
ni historique persistant en V1.

## Conséquences

Isoler les diffusions et borner la fenêtre de messages ; reporter les
enrichissements après la V1.

## Travail associé et validation

### Périmètre retenu

Source prévue : `/plugins/chat/overlay#<clé-chat>`. Pas d'overlay composite ni
de framework générique de plugins à ce stade.

```text
Message Twitch du streamer actif
    ├── commandes Giveaway
    └── service Chat → WebSocket Chat → OBS
```

Réutiliser les messages reçus par le connecteur. Une erreur ou une lenteur du
Chat ne doit pas interrompre les commandes ; la fenêtre du navigateur reste
bornée et vide au rechargement.

### Choix produit à confirmer

Les valeurs suivantes sont des propositions, pas des décisions validées :

| Choix | Proposition initiale |
| --- | --- |
| Commandes et messages du bot | Affichés comme les autres messages |
| Nombre maximal visible | 30 messages |
| Durée d'affichage | 60 secondes |
| Disposition | Nouveaux messages en bas |
| Contenu | Pseudo et texte ; couleur à décider |

### Progression

1. Définir un message indépendant de TwitchIO : identifiant du message,
   identifiant auteur, login, nom affiché, texte et date de réception UTC.
2. Distribuer les événements vers les commandes et le Chat sans blocage réseau
   dans le chemin des commandes.
3. Créer un gestionnaire Chat distinct avec files bornées, délais d'envoi et
   déconnexions ciblées. Contrairement au giveaway, l'affichage peut abandonner
   des messages trop anciens en surcharge, sans perdre les commandes associées.
4. Ajouter `/plugins/chat/ws` et réutiliser le protocole d'authentification, en
   exigeant le slug `chat`. Refuser les clés Giveaway et ne rien diffuser avant
   validation.
5. Créer la page transparente : rendu textuel sûr, DOM borné, expiration,
   reconnexion progressive et déduplication par identifiant si disponible.
6. Ajouter dans `/admin` l'état et la rotation de clé sous
   `/api/admin/plugins/chat/overlay-access` et `/rotate`. Une rotation Chat ne
   doit pas fermer Giveaway, et inversement.
7. Valider les deux plugins ensemble avec plusieurs clients et un client lent.

**Première tranche vérifiable :** un message Twitch apparaît dans une source
Chat authentifiée sans régression des commandes Giveaway.

**Critère final :** deux sources OBS indépendantes, clés non interchangeables et
rotations isolées ; contenu HTML du chat rendu comme du texte ; consommation
mémoire bornée.

### Après la V1

Badges, emotes, réponses, Cheers et réglages visuels sont reportés. Prévoir le
traitement des suppressions et effacements de chat avant un usage public. Une
scène composite pourra être étudiée ultérieurement sans supprimer les sources
indépendantes.
