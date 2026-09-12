# libpq pour Psycopg dans zsh, sans nix-shell.
# Usage : dans ~/.zshrc
#   [[ -f /home/necsus/dev/overlays/scripts/zsh-libpq.zsh ]] && source /home/necsus/dev/overlays/scripts/zsh-libpq.zsh
#
# Reprend LD_LIBRARY_PATH de overlays.service (même bibliothèque que la release).

_overlays_pg_lib=$(
  systemctl show overlays.service -p Environment --value 2>/dev/null \
    | tr ' ' '\n' \
    | sed -n 's/^LD_LIBRARY_PATH=//p'
)
if [[ -n ${_overlays_pg_lib} ]]; then
  case ":${LD_LIBRARY_PATH:-}:" in
    *":${_overlays_pg_lib}:"*) ;;
    *) export LD_LIBRARY_PATH="${_overlays_pg_lib}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" ;;
  esac
fi
unset _overlays_pg_lib
