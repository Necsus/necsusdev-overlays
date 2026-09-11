# Migration de SQLite vers PostgreSQL

## État actuel

**Schéma version 1 prêt sur la base cible, confirmé par l'utilisateur.
Validation applicative en cours.**

Ce plan centralise les validations restantes de la [roadmap](ROADMAP.md). Les
choix sont dans [ADR-0001](adr/0001-postgresql.md), le stockage implémenté dans
[l'architecture](ARCHITECTURE.md#données-et-configuration), les commandes et le
dépannage dans le [README](../README.md#installation-et-lancement).

Le départ à vide est confirmé : l'ancien fichier SQLite de test a été supprimé
avec accord, sans reprise de l'historique ni des liens OBS. Les fichiers locaux
de configuration et de tokens ne font pas partie du transfert.

## Contrôles déjà effectués

Contrôles ponctuels, sans nouveaux fichiers de tests :

- Syntaxe Python, Ruff, Pyright et cohérence des dépendances (`pip check`) : OK.
- Import de Psycopg et FastAPI avec la bibliothèque `libpq` de la DevBox : OK.
- Configuration fictive, sans fichier d'environnement : refus des ports
  invalides, du mot de passe vide, de l'hôte blanc et d'un mode TLS inconnu.
- Service avec appels SQL simulés : cycle manuel, refus des doublons et échec de
  création sans mutation mémoire.
- Simulation d'un commit incertain : rechargement d'un gagnant déjà persisté
  sans second tirage automatique ; annulation d'un ancien minuteur lors de la
  reprise.
- Diagnostics simulés : noms de champs et catégories d'erreur sans valeurs
  confidentielles.

### Confirmation sur la base réelle

L'utilisateur a confirmé l'import de Psycopg, puis ce résultat de migration :

```text
PostgreSQL schema version 1 ready.
```

Cela confirme une connexion utilisable par la commande et un schéma version 1
prêt, pas une validation des requêtes métier, des privilèges minimaux ou de
Twitch/OBS. Les secrets n'ont pas été consultés par l'agent.

## 1. Finaliser la mise en service

Ne pas recréer la base ni supprimer ses tables.

- [ ] Pérenniser l'accès à `libpq` dans l'environnement Nix ; l'export de
      dépannage ne concerne que le terminal courant.
- [ ] Vérifier les droits applicatifs et le principe du moindre privilège.
- [ ] Réexécuter la migration : la seconde exécution doit conserver le schéma et
      sa version sans modification supplémentaire.
- [ ] Démarrer une seule instance et vérifier le refus d'une base inaccessible
      ou d'un schéma absent/incompatible.
- [ ] Se reconnecter dans `/admin`, générer un nouveau lien OBS et vérifier la
      conservation de l'identité après redémarrage.

**Terminé quand :** l'application démarre avec PostgreSQL et les nouveaux accès
fonctionnent.

## 2. Valider le stockage et les erreurs

Utiliser une base isolée et des données fictives pour les contrôles d'erreur,
jamais la base en usage. Les autorisations de tests/scripts restent celles
d'[AGENTS.md](../AGENTS.md).

- [ ] Créer un lot, ouvrir, inscrire plusieurs participants et refuser les
      doublons.
- [ ] Tirer plusieurs gagnants distincts dans le bon ordre ; terminer et annuler
      des giveaways.
- [ ] Vérifier les contraintes : streamer actif unique, giveaway actif unique,
      relations et cascades.
- [ ] Redémarrer dans `WAITING`, `OPEN` et `WINNER` ; retrouver participants,
      gagnants et dates.
- [ ] Contrôler le minuteur et sa reprise selon les scénarios
      d'[ADR-0002](adr/0002-giveaway-chronometre.md).
- [ ] Vérifier les clés OBS : accès valide, refus d'une clé invalide, rotation,
      changement de streamer et déconnexion des anciens accès.
- [ ] Exécuter des opérations rapprochées du chat, de l'administration et du
      minuteur sans mélange de transactions.
- [ ] Simuler une erreur SQL et une coupure PostgreSQL : rollback, fermeture des
      connexions, refus de nouvelle mutation tant que le rechargement échoue,
      puis récupération sans double tirage automatique.
- [ ] Vérifier la cohérence de l'identité et des accès après une coupure pendant
      OAuth ou une rotation de clé.
- [ ] Comparer les réponses HTTP/WebSocket : mêmes champs, types et dates ISO
      8601.

**Terminé quand :** les résultats SQL réels sont consignés séparément des
simulations.

## 3. Valider l'usage et l'exploitation

- [ ] Confirmer Twitch → serveur → OBS, y compris minuteur et redémarrage.
- [ ] Surveiller erreurs et connexions ; mesurer avant d'ajouter un pool ou de
      promettre une capacité de charge.
- [ ] Vérifier une sauvegarde et sa restauration dans une autre base vide selon
      le [README](../README.md#sauvegarde-postgresql).
- [ ] Définir les sauvegardes régulières, leurs permissions et leur
      conservation, fichiers locaux compris.
- [ ] Actualiser l'architecture et l'ADR, retirer les tâches terminées et fermer
      le chantier dans la roadmap.

**Retour arrière :** aucune sauvegarde de l'ancien jeu de test SQLite n'a été
créée pour cette migration. Revenir à l'ancien code recréerait une base SQLite
vide, sans les écritures PostgreSQL. En cas de problème, sauvegarder PostgreSQL
avant toute décision de reprise ou d'abandon.

**Migration terminée quand :** PostgreSQL est validé comme unique stockage SQL,
le parcours Twitch/OBS fonctionne et une restauration a été vérifiée.
