# NecsusDevOverlays — Architecture

Ce document décrit **l'implémentation actuelle**. Les évolutions sont dans la [roadmap](ROADMAP.md), l'installation et les commandes dans le [README](../README.md).

## Structure et flux

Python, FastAPI, TwitchIO 3/EventSub, SQLite et frontend HTML/JavaScript natif, sans framework.

```text
Chat du streamer actif → TwitchIO → commandes → service → moteur + SQLite
                                                  │
                                                  └── WebSocket → OBS
/admin → OAuth Twitch → identité du streamer → abonnement du bot global
```

| Répertoire | Responsabilité |
|---|---|
| `app/main.py` | Assemblage FastAPI et cycle de vie des composants |
| `app/core/` | Configuration et environnement |
| `app/domain/` | Règles du giveaway, indépendantes des transports |
| `app/application/` | Commandes, permissions, orchestration et minuteur |
| `app/infrastructure/` | SQLite, stockage et intégration Twitch |
| `app/web/` | Routes, WebSockets et assets administratifs/plugins |

Le service est la source de vérité. Un moteur global et un verrou asynchrone sérialisent les opérations ; OBS affiche les données mais ne choisit jamais les gagnants.

## Giveaway et échéance

```text
HIDDEN → WAITING → OPEN → WINNER
   ↑        │        │       │
   └────────┴─ arrêt ┴───────┘
```

Les participants sont conservés dans une liste ; l'unicité est vérifiée en mémoire et garantie en SQL. Le tirage utilise `secrets.choice` parmi les participants n'ayant pas encore gagné. Les gagnants sont ordonnés et persistés.

Une durée d'inscription définit `closes_at`, échéance UTC persistée. La tâche automatique et les commandes prennent le même verrou. Chaque inscription vérifie aussi l'échéance avant admission. À expiration : tirage vers `WINNER`, ou archivage `CANCELLED` puis `HIDDEN` sans participant.

Le minuteur reprend à la restauration et est annulé proprement à l'arrêt du service. Une erreur de persistance du tirage restaure l'état mémoire précédent ; la tâche automatique journalise l'erreur et réessaie après une seconde. Cette protection ne couvre pas encore toutes les mutations métier.

## Données et configuration

| Stockage | Contenu |
|---|---|
| `.env` | Secrets et bootstrap, modèle partageable dans `.env.example` uniquement |
| `data/settings.json` | Configuration globale non secrète, validée avec Pydantic et écrite atomiquement |
| `.tio.tokens.json` | Tokens OAuth gérés par TwitchIO ; ne jamais lire, afficher ou partager |
| `data/giveaway.sqlite3` | Identités, giveaway actif, historique et empreintes des clés OBS |

Tables principales :

- `streamers` : identité Twitch stable, profil et indicateur d'activité ; un seul streamer actif autorisé.
- `giveaways` : lot, statut, dates et échéance ; un seul giveaway actif global, pas encore de propriétaire `broadcaster_id`.
- `participants` : unicité `(giveaway_id, twitch_user_id)`.
- `winners` : gagnants uniques par giveaway et ordre de tirage unique.
- `overlay_access_keys` : clé composée `(streamer_id, plugin_slug)`, empreinte unique et dates de rotation.

L'arrêt archive en `COMPLETED` après un tirage, sinon en `CANCELLED`. Le démarrage restaure l'état actif, les participants, les gagnants et l'échéance. Les clés étrangères sont activées ; WAL et migrations versionnées restent à faire. Les ajouts de colonnes actuels sont idempotents.

## Authentification et isolation

Trois identités distinctes : application Twitch (Client ID/Secret), compte bot fixe et streamer actif validé par OAuth. Les commandes de gestion utilisent l'identifiant Twitch stable, jamais le nom affiché ni un identifiant fourni par le navigateur.

La session administrative est signée, expirante et portée par un cookie `HttpOnly`, `SameSite=Lax`, sécurisé en HTTPS. Les états OAuth sont courts et à usage unique. Les tokens OAuth restent côté serveur, hors des tables métier. Toute personne ayant accès au réseau peut tenter de se connecter : ce n'est pas une isolation SaaS multi-client.

Une clé OBS donne uniquement un accès de lecture au plugin ciblé, indépendamment de la session web. Elle possède 256 bits d'entropie et seule son empreinte SHA-256 est persistée. Le plugin et le streamer actif sont vérifiés avant diffusion. Sa valeur en clair n'est retournée qu'à la génération, avec `Cache-Control: no-store`.

Le gestionnaire actuel associe les connexions au streamer et ne sert que Giveaway. L'isolation des déconnexions entre plusieurs plugins devra être implémentée à l'arrivée du Chat ; la table de clés seule ne suffit pas.

## Routes et protocole OBS

| Route | Fonction |
|---|---|
| `/admin`, `/api/admin/session` | Interface et état administratif |
| `/auth/twitch/login`, `/auth/twitch/bot/login` | OAuth streamer et bot |
| `/auth/twitch/callback`, `/auth/logout` | Retour OAuth et déconnexion |
| `/api/admin/plugins/giveaway/overlay-access` | État de la clé, sans sa valeur |
| `/api/admin/plugins/giveaway/overlay-access/rotate` | Rotation authentifiée par `POST` |
| `/plugins/giveaway/overlay`, `/plugins/giveaway/static` | Page et assets OBS |
| `/plugins/giveaway/ws` | WebSocket authentifié |
| `/health` | Réponse du service, pas une disponibilité complète |

La clé est placée dans le fragment de l'URL, absent de la requête HTTP initiale. Le navigateur l'envoie comme premier message WebSocket :

```json
{"type": "overlay.authenticate", "token": "clé-fictive"}
```

Sans authentification valide sous cinq secondes, la connexion ferme avec `1008`, sans données. Une rotation ou un remplacement du streamer actif ferme les connexions concernées. Les pages et scripts seuls ne contiennent aucune donnée métier.

L'état initial et les diffusions ont la même enveloppe :

```json
{
  "type": "giveaway.state",
  "data": {
    "state": "OPEN",
    "giveaway_id": "identifiant-fictif",
    "lot": "Clavier",
    "closes_at": null,
    "participant_count": 42,
    "winners": []
  }
}
```

`closes_at` vaut une date ISO 8601 ou `null`. Un gagnant contient `twitch_user_id` et `display_name`. `overlay_snapshot()` exclut la liste des participants ; `snapshot()` conserve l'instantané complet interne. Le compteur OBS est calculé localement, sans diffusion chaque seconde. Les textes utilisent `textContent`.

Les anciennes routes `/overlay`, `/api/state` et `/ws/overlay` sont supprimées. Les assets administratifs et ceux du plugin ont des montages distincts.

## Réseau et exploitation

Le domaine `overlay.necsus.dev` résout vers l'adresse LAN privée `192.168.1.112`. Nginx relaie HTTPS et WebSocket vers Uvicorn sur `127.0.0.1:8000`. Le certificat Let's Encrypt utilise ACME DNS-01 Cloudflare sous NixOS. Tailscale Serve reste séparé sur son adresse privée ; aucun port Internet n'est redirigé et Funnel ne doit pas être activé.

Le service applicatif systemd et les sauvegardes automatisées restent à préparer. Conserver **un seul worker Uvicorn** tant que les moteurs, le bot et les connexions résident en mémoire.

## Limites connues

- SQLite est synchrone dans la boucle asynchrone, avec un commit par inscription.
- Les diffusions WebSocket sont séquentielles et attendues sous verrou métier ; un client lent peut retarder les commandes.
- La recherche des doublons parcourt la liste des participants.
- La cohérence mémoire/base n'est pas garantie sur toutes les erreurs.
- Supervision TwitchIO, reconnexion progressive et contrôle `ready` sont incomplets.
- Aucun test de charge du parcours complet ne garantit actuellement une capacité pour 10 000 spectateurs ; les anciens essais HTTP simples ne la démontrent pas.

Les validations sont actuellement ponctuelles et manuelles. Le mode `!gastart` sans durée a été vérifié sans échéance ni tâche minuteur ; la validation visuelle complète du mode chronométré reste à confirmer. Aucun nouveau fichier de tests ne doit être ajouté sans accord de l'utilisateur.
