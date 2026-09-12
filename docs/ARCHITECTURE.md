# NecsusDevOverlays — Architecture

Ce document décrit **l'implémentation actuelle**. Les évolutions sont dans la
[roadmap](ROADMAP.md), l'installation et les commandes dans le
[README](../README.md).

## Structure et flux

Python, FastAPI, TwitchIO 3/EventSub, PostgreSQL via Psycopg 3 asynchrone et
frontend HTML/JavaScript natif. Le schéma PostgreSQL version 1 est prêt. Le
parcours giveaway Twitch → OBS, y compris le minuteur, est validé. Les
contrôles SQL isolés, les clés OBS, les coupures SQL et les sauvegardes
restent dans [ADR-0011](adr/0011-exploitation-durable.md).

```text
Chat du streamer actif → TwitchIO → commandes → service → moteur + PostgreSQL
                                                  │
                                                  └── WebSocket → OBS
/admin → OAuth Twitch → identité du streamer → abonnement du bot global
```

| Répertoire | Responsabilité |
| --- | --- |
| `app/main.py` | Assemblage FastAPI et cycle de vie des composants |
| `app/core/` | Configuration et environnement |
| `app/domain/` | Règles du giveaway, indépendantes des transports |
| `app/application/` | Commandes, permissions, orchestration et minuteur |
| `app/infrastructure/` | PostgreSQL, stockage et intégration Twitch |
| `app/web/` | Routes, WebSockets et assets administratifs/plugins |

Le service est la source de vérité. Un moteur global et un verrou asynchrone
sérialisent les opérations ; OBS affiche les données mais ne choisit jamais les
gagnants.

## Giveaway et échéance

```text
HIDDEN → WAITING → OPEN → WINNER
   ↑        │        │       │
   └────────┴─ arrêt ┴───────┘
```

Les participants sont conservés dans une liste ; l'unicité est vérifiée en
mémoire et garantie en SQL. Le tirage utilise `secrets.choice` parmi les
participants n'ayant pas encore gagné. Les gagnants sont ordonnés et persistés.

Une durée d'inscription définit `closes_at`, échéance UTC persistée. La tâche
automatique et les commandes prennent le même verrou. Chaque inscription vérifie
aussi l'échéance avant admission. À expiration : tirage vers `WINNER`, ou
archivage `CANCELLED` puis `HIDDEN` sans participant.

Le minuteur reprend à la restauration et est annulé proprement à l'arrêt du
service. Les mutations du moteur sont publiées en mémoire après le commit SQL.
En cas d'erreur ou d'annulation pendant une écriture, le service recharge l'état
persistant avant la prochaine mutation : une connexion perdue pendant le commit
ne prouve pas son échec. Le minuteur réessaie après une seconde, mais recharge
d'abord la base pour éviter de refaire un tirage déjà validé. Tant que ce
rechargement échoue, aucune nouvelle mutation n'est autorisée.

## Données et configuration

| Stockage | Contenu |
| --- | --- |
| `.env` | Secrets et bootstrap, modèle partageable dans `.env.example` uniquement |
| `data/settings.json` | Configuration globale non secrète, validée avec Pydantic et écrite atomiquement |
| `.tio.tokens.json` | Tokens OAuth gérés par TwitchIO ; ne jamais lire, afficher ou partager |
| PostgreSQL | Identités, giveaway actif, historique et empreintes des clés OBS |

Tables principales :

- `streamers` : identité Twitch stable, profil et indicateur d'activité ; un
  seul streamer actif autorisé.
- `giveaways` : lot, statut, dates et échéance ; un seul giveaway actif global,
  pas encore de propriétaire `broadcaster_id`.
- `participants` : unicité `(giveaway_id, twitch_user_id)`.
- `winners` : gagnants uniques par giveaway et ordre de tirage unique.
- `overlay_access_keys` : clé composée `(streamer_id, plugin_slug)`, empreinte
  unique et dates de rotation.

L'arrêt archive en `COMPLETED` après un tirage, sinon en `CANCELLED`. Le
démarrage restaure l'état actif, les participants, les gagnants et l'échéance ;
les lectures de restauration utilisent une transaction `REPEATABLE READ`. Les
dates SQL sont des `TIMESTAMPTZ` en UTC, l'activité du streamer un `BOOLEAN`, et
`participants.id` une identité générée. Les réponses web conservent leurs dates
ISO 8601.

`Database` ouvre une connexion asynchrone par transaction, sans pool ni
connexion partagée. Chaque opération valide ou annule sa transaction et ferme sa
connexion, y compris après une lecture. Les délais de connexion, de requête et
d'attente de verrou sont bornés ; les erreurs du pilote sont remplacées par un
message sans données de connexion ni valeurs SQL.

La migration initiale est définie dans `app/infrastructure/database.py`,
appliquée explicitement et enregistrée dans `schema_migrations` (version 1). Un
verrou PostgreSQL sérialise les migrations ; une nouvelle exécution n'applique
pas à nouveau la version enregistrée. L'application contrôle cette version au
démarrage. Les commandes sont dans le
[README](../README.md#installation-et-lancement).

Un verrou applicatif commun sérialise les changements d'identité et de clés avec
l'authentification/enregistrement des WebSockets, pour ne pas laisser un accès
s'enregistrer entre une vérification et une révocation. Il est distinct du
verrou métier du giveaway.

## Authentification et isolation

Trois identités distinctes : application Twitch (Client ID/Secret), compte bot
fixe et streamer actif validé par OAuth. Les commandes de gestion utilisent
l'identifiant Twitch stable, jamais le nom affiché ni un identifiant fourni par
le navigateur.

La session administrative est signée, expirante et portée par un cookie
`HttpOnly`, `SameSite=Lax`, sécurisé en HTTPS. Les états OAuth sont courts et à
usage unique. Les tokens OAuth restent côté serveur, hors des tables métier.
Toute personne ayant accès au réseau peut tenter de se connecter : ce n'est pas
une isolation SaaS multi-client.

Une clé OBS donne uniquement un accès de lecture au plugin ciblé, indépendamment
de la session web. Elle possède 256 bits d'entropie et seule son empreinte
SHA-256 est persistée. Le plugin et le streamer actif sont vérifiés avant
diffusion. Sa valeur en clair n'est retournée qu'à la génération, avec
`Cache-Control: no-store`.

Le gestionnaire actuel associe les connexions au streamer et ne sert que
Giveaway. L'isolation des déconnexions entre plusieurs plugins devra être
implémentée à l'arrivée du Chat ; la table de clés seule ne suffit pas.

## Routes et protocole OBS

| Route | Fonction |
| --- | --- |
| `/admin`, `/api/admin/session` | Interface et état administratif |
| `/auth/twitch/login`, `/auth/twitch/bot/login` | OAuth streamer et bot |
| `/auth/twitch/callback`, `/auth/logout` | Retour OAuth et déconnexion |
| `/api/admin/plugins/giveaway/overlay-access` | État de la clé, sans sa valeur |
| `/api/admin/plugins/giveaway/overlay-access/rotate` | Rotation authentifiée par `POST` |
| `/plugins/giveaway/overlay`, `/plugins/giveaway/static` | Page et assets OBS |
| `/plugins/giveaway/ws` | WebSocket authentifié |
| `/health` | Réponse du service, pas une disponibilité complète |

La clé est placée dans le fragment de l'URL, absent de la requête HTTP initiale.
Le navigateur l'envoie comme premier message WebSocket :

```json
{"type": "overlay.authenticate", "token": "clé-fictive"}
```

Sans authentification valide sous cinq secondes, la connexion ferme avec `1008`,
sans données. Une rotation ou un remplacement du streamer actif ferme les
connexions concernées. Les pages et scripts seuls ne contiennent aucune donnée
métier.

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

`closes_at` vaut une date ISO 8601 ou `null`. Un gagnant contient
`twitch_user_id` et `display_name`. `overlay_snapshot()` exclut la liste des
participants ; `snapshot()` conserve l'instantané complet interne. Le compteur
OBS est calculé localement (`Math.ceil`), sans diffusion chaque seconde : le
premier tick peut afficher `durée + 1` sans allonger l'échéance serveur. Les
textes utilisent `textContent`.

Les assets administratifs et ceux du plugin ont des montages distincts. Les
anciennes routes `/overlay`, `/api/state` et `/ws/overlay` ne sont plus
disponibles.

## Administration et aperçus

`/admin` sépare le compte et la connexion Twitch des espaces de plugins. Une
navigation locale par fragments d’URL sélectionne une seule vue à la fois :
`#account`, `#giveaway-preview`, `#giveaway-obs` et `#chat`. Les boutons
précédent/suivant du navigateur sont pris en charge ; les vues restent dans le
DOM afin de conserver le brouillon CSS lors d’un changement d’espace.

Giveaway propose un aperçu et une vue de connexion OBS, utilisant les mêmes API
que précédemment. L’entrée Chat est uniquement une présentation « prévu » :
aucun aperçu, accès OBS ou appel d’API Chat n’est implémenté. Ajouter un plugin
implique sa navigation et ses vues propres, sans framework de plugins générique.

L’aperçu Giveaway utilise les données fictives et le renderer commun dans une
iframe `sandbox="allow-scripts"`, sans origine partagée avec l’administration.
Son viewport reste à 900 × 500 pixels ; un conteneur défilant l’accueille sur les
petits écrans sans changer les dimensions de rendu. La navigation ne reconstruit
pas l’iframe ; appliquer du CSS ou changer de scénario reconstruit son `srcdoc`.
Le CSS n’est ni persisté ni envoyé à OBS. La CSP bloque les ressources externes.

La structure HTML, les références DOM et la navigation ont fait l’objet de
contrôles ponctuels, dont une simulation DOM. Le rendu responsive et les
interactions réelles dans le navigateur restent à valider après cette refonte.

## Limites connues

- Une connexion et un commit par inscription : l'accès SQL est asynchrone, mais
  son coût reste à mesurer avant de décider d'un pool.
- Les diffusions WebSocket sont séquentielles et attendues sous verrou métier ;
  un client lent peut retarder les commandes.
- La recherche des doublons parcourt la liste des participants.
- Après une écriture incertaine, OBS peut afficher le dernier état connu
  jusqu'au rechargement ; les scénarios de coupure PostgreSQL et de changement
  d'identité restent à valider réellement.
- Supervision TwitchIO, reconnexion progressive et contrôle `ready` sont
  incomplets.
- Aucun test de charge du parcours complet ne garantit actuellement une capacité
  pour 10 000 spectateurs ; les anciens essais HTTP simples ne la démontrent
  pas.

Les contrôles restent ponctuels et manuels, sans suite de tests ajoutée. Les
validations SQL isolées, clés OBS, coupures SQL et sauvegardes restent dans
[ADR-0011](adr/0011-exploitation-durable.md).
