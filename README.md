# NecsusDevOverlays

Plateforme d'overlays Twitch pour OBS, pilotés depuis le chat et regroupés dans une administration commune.

- **Giveaway** : tirages manuels ou chronométrés, inscriptions uniques et gagnants multiples.
- **Chat** : plugin en préparation, pas encore disponible.

L'application fonctionne actuellement avec **un seul streamer actif**, un bot global fixe et plusieurs sources OBS possibles. Se connecter avec un autre compte Twitch remplace le canal actif ; ce n'est pas encore un service multi-streamer simultané.

## Installation et lancement

Sur la DevBox NixOS, depuis `/home/necsus/dev/necsusdev-overlays`, avec Python 3.11 ou plus récent :

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
# Première installation seulement, si .env n'existe pas :
cp -n .env.example .env
# Compléter soi-même .env avec les valeurs nécessaires.
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Garder **un seul worker Uvicorn**. `--reload` est destiné au développement. Après un déplacement du dossier, recréer le virtualenv plutôt que réutiliser ses anciens chemins absolus.

L'installation locale utilise Nginx pour publier `https://overlay.necsus.dev` sur le LAN. L'accès Tailscale est séparé ; le service n'est pas exposé publiquement sur Internet. Le réseau est décrit dans [l'architecture](docs/ARCHITECTURE.md#réseau-et-exploitation).

| Chemin | Usage |
|---|---|
| `/admin` | Connexion Twitch et gestion du lien OBS |
| `/health` | Vérification que le service répond |
| `/docs` | Documentation OpenAPI |

## Connecter Twitch et OBS

1. Déclarer dans l'application Twitch le callback exact : `https://overlay.necsus.dev/auth/twitch/callback`.
2. Démarrer le service avec Twitch activé selon `.env.example`.
3. Ouvrir `/auth/twitch/bot/login` sur le domaine HTTPS et autoriser **le compte bot configuré**, avec `user:read:chat`, `user:write:chat` et `user:bot`.
4. Ouvrir `/admin` avec le compte streamer et accorder `channel:bot`.
5. Générer le lien du plugin Giveaway et le copier dans une **source navigateur OBS** :

```text
https://overlay.necsus.dev/plugins/giveaway/overlay#<clé-OBS>
```

Le lien est confidentiel et affiché une seule fois après génération. Le régénérer invalide l'ancien lien et déconnecte ses sources. Se déconnecter de l'administration ne coupe pas le giveaway ; changer de streamer actif déconnecte les sources de l'ancien streamer.

Le rendu se personnalise dans le champ **CSS personnalisé** d'OBS. Éléments disponibles : `#giveaway`, `#lot`, `#status`, `#participants`, `#winner`, `#countdown`. Le compteur est masqué sans durée ou après clôture.

## Commandes Giveaway

| Commande | Accès | Effet |
|---|---|---|
| `!galot <lot>` | Streamer | Prépare le lot et affiche l'overlay. |
| `!gastart [secondes]` | Streamer | Ouvre les inscriptions, avec une durée facultative. |
| `!join` | Viewer | Inscrit le viewer une seule fois. |
| `!gapull` | Streamer | Ferme les inscriptions et tire un gagnant, puis ajoute un gagnant inédit à chaque nouvel appel. |
| `!gastop` | Streamer | Termine le giveaway et masque l'overlay. |

Exemple : `!galot Clavier mécanique`, puis `!gastart 60`.

- La durée doit être un entier de **1 à 604800 secondes** (7 jours). `!gastart` seul n'active aucun minuteur.
- À l'échéance, un gagnant est tiré automatiquement. Sans participant, le giveaway est annulé et masqué.
- Un tirage manuel réussi ou `!gastop` annule le minuteur.
- Après le premier tirage, les inscriptions restent fermées ; les tirages suivants excluent les gagnants précédents.
- L'échéance et les gagnants sont conservés après redémarrage. Une échéance dépassée est traitée à la reprise.
- Une inscription traitée après l'échéance est refusée. Le serveur décide du tirage ; garder l'horloge du PC OBS à l'heure pour un compteur visuel correct.

## Secrets et données

Ne jamais versionner, partager ni afficher le contenu de `.env` ou `.tio.tokens.json`. Seul `.env.example` sert de référence partageable pour les variables attendues. Les liens OBS sont également confidentiels.

Les données locales résident dans `data/` ; les noms historiques, dont `giveaway.sqlite3`, sont conservés. Ne pas les renommer pour adapter l'identité du produit.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) : fonctionnement actuel, stockage, sécurité et limites.
- [Roadmap](docs/ROADMAP.md) : prochaine étape, plugin Chat et évolutions prévues.
- [AGENTS.md](AGENTS.md) : consignes de travail pour les agents IA.

## Licence

[MIT](LICENSE) — dépôt [Necsus/necsusdev-overlays](https://github.com/Necsus/necsusdev-overlays).
