{ pkgs ? import <nixpkgs> { } }:

# Environnement de développement : libpq + ld pour Psycopg, sans flakes.
# Usage : nix-shell  puis  source .venv/bin/activate
pkgs.mkShell {
  packages = [ pkgs.binutils ];
  LD_LIBRARY_PATH = "${pkgs.postgresql_18.lib}/lib";
}
