#!/usr/bin/env bash
# Met à jour la release déjà installée dans /srv/overlays.
# Ne copie pas .env ni .tio.tokens.json, ne touche pas à Nginx, SSH ni Tailscale.
set -euo pipefail

RELEASE_DIR=/srv/overlays
SERVICE=overlays.service
DEV_ROOT=$(cd "$(dirname "$0")/.." && pwd)

usage() {
  cat <<'EOF'
Usage: scripts/update-release.sh [-y] <commit>

Déploie le commit indiqué (présent dans ce dépôt) vers /srv/overlays, installe
les dépendances, applique les migrations, puis redémarre overlays.service.

  -y    Ne pas demander confirmation

Le commit doit déjà exister localement (git commit). Les fichiers non suivis
ne sont pas déployés. Les secrets de /srv/overlays sont conservés.
EOF
}

assume_yes=0
while getopts ':yh' opt; do
  case "$opt" in
    y) assume_yes=1 ;;
    h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done
shift $((OPTIND - 1))

if [[ $# -ne 1 ]]; then
  usage >&2
  exit 2
fi

if [[ ! -d $DEV_ROOT/.git ]]; then
  echo "Dépôt de développement introuvable: $DEV_ROOT" >&2
  exit 1
fi

commit=$(git -C "$DEV_ROOT" rev-parse --verify "${1}^{commit}")

if [[ -n $(git -C "$DEV_ROOT" status --porcelain) ]]; then
  echo "Attention: le dépôt de développement a des changements non commités ; ils ne seront pas déployés." >&2
fi

if [[ $EUID -eq 0 ]]; then
  echo "Exécuter ce script en tant qu'utilisateur normal (sudo sera demandé)." >&2
  exit 1
fi

if ! command -v sudo >/dev/null; then
  echo "sudo est requis pour agir sur /srv/overlays et le service." >&2
  exit 1
fi

if ! sudo -u overlays test -d "$RELEASE_DIR/.git"; then
  echo "Release introuvable ou inaccessible: $RELEASE_DIR" >&2
  exit 1
fi

current=$(sudo -u overlays git -C "$RELEASE_DIR" rev-parse HEAD)

echo "Dépôt source : $DEV_ROOT"
echo "Release      : $RELEASE_DIR"
echo "Actuel       : $current"
echo "Cible        : $commit"

if [[ $current == "$commit" ]]; then
  echo "La release pointe déjà sur ce commit."
fi

if [[ $assume_yes -eq 0 ]]; then
  read -r -p "Mettre à jour et redémarrer $SERVICE ? [y/N] " answer
  case $answer in
    y | Y | yes | YES) ;;
    *)
      echo "Annulé."
      exit 0
      ;;
  esac
fi

bundle=$(mktemp /tmp/overlays-update.XXXXXX.bundle)
cleanup() {
  rm -f "$bundle"
}
trap cleanup EXIT

git -C "$DEV_ROOT" bundle create "$bundle" "$commit"
chmod a+r "$bundle"

sudo -u overlays git -C "$RELEASE_DIR" fetch --quiet "$bundle" "$commit:refs/tmp/update"
sudo -u overlays git -C "$RELEASE_DIR" checkout --detach --quiet "$commit"

deployed=$(sudo -u overlays git -C "$RELEASE_DIR" rev-parse HEAD)
if [[ $deployed != "$commit" ]]; then
  echo "Le checkout n'a pas atteint le commit demandé." >&2
  exit 1
fi

sudo -u overlays "$RELEASE_DIR/.venv/bin/python" -m pip install -r "$RELEASE_DIR/requirements.txt"

ld_library_path=$(
  systemctl show "$SERVICE" -p Environment --value \
    | tr ' ' '\n' \
    | sed -n 's/^LD_LIBRARY_PATH=//p'
)
if [[ -z $ld_library_path ]]; then
  echo "LD_LIBRARY_PATH absent du service $SERVICE (libpq)." >&2
  exit 1
fi

sudo -u overlays env -C "$RELEASE_DIR" \
  LD_LIBRARY_PATH="$ld_library_path" \
  "$RELEASE_DIR/.venv/bin/python" -m app.infrastructure.database

sudo systemctl restart "$SERVICE"

health_ok=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if [[ $(systemctl is-active "$SERVICE") == active ]]; then
    code=$(
      curl --noproxy '*' --connect-timeout 5 --max-time 10 -sS -o /dev/null \
        -w '%{http_code}' http://127.0.0.1:8000/health || true
    )
    if [[ $code == 200 ]]; then
      health_ok=1
      break
    fi
  fi
  sleep 1
done

if [[ $health_ok -ne 1 ]]; then
  echo "Échec: $SERVICE inactif ou /health n'a pas répondu 200." >&2
  echo "Journal: journalctl -u $SERVICE -e" >&2
  exit 1
fi

https_code=$(
  curl --noproxy '*' --connect-timeout 5 --max-time 10 -sS -o /dev/null \
    -w '%{http_code}' https://overlay.necsus.dev/health || true
)

echo "Service : $(systemctl is-active "$SERVICE")"
echo "Local   : http://127.0.0.1:8000/health → 200"
echo "HTTPS   : https://overlay.necsus.dev/health → ${https_code:-erreur}"
echo "Commit  : $deployed"

if [[ $https_code != 200 ]]; then
  echo "Le contrôle HTTPS n'a pas répondu 200. Nginx n'a pas été modifié." >&2
  exit 1
fi
