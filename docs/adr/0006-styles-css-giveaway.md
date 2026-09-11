# ADR-0006 — Bibliothèque de styles CSS Giveaway

[← Roadmap](../ROADMAP.md)

**Statut :** fonctionnalité prévue, non implémentée ; limites à définir.

## Contexte

Sauvegarder, partager et prévisualiser des styles sans piloter OBS à distance.

## Décision ou orientation

Limiter la bibliothèque au Giveaway : styles privés par défaut, partage
explicite, copie manuelle et aperçu isolé.

## Conséquences

Dépend de PostgreSQL et des contrôles de propriété du
[chantier multi-streamer](0005-multi-streamer.md). Les copies déjà sauvegardées
ou collées dans OBS ne peuvent pas être révoquées à distance.

## Travail associé et validation

Sauvegarder des blocs CSS nommés depuis `/admin`, les retrouver et les copier
dans le champ **CSS personnalisé** de la source navigateur OBS, sans
synchronisation automatique.

### Visibilité et propriété

- Chaque style appartient à un streamer identifié par son identité Twitch stable
  et reste **privé par défaut**.
- Le propriétaire peut créer, consulter, modifier, supprimer son style et
  changer sa visibilité.
- Un style **partagé** est consultable et copiable par tous les streamers
  authentifiés ayant accès au service, mais modifiable uniquement par son
  propriétaire. Aucun catalogue anonyme ni changement d'exposition réseau n'est
  prévu.
- Un streamer peut dupliquer un style partagé dans sa bibliothèque : la copie
  lui appartient, démarre privée et évolue indépendamment de l'original.
- Repasser un style en privé ou le supprimer retire son accès partagé, mais ne
  peut pas révoquer les copies déjà sauvegardées ou collées dans OBS.
  L'interface doit annoncer cette limite avant publication.

### Flux et limites de la V1

```text
/admin → bibliothèque personnelle ou partagée → copier le CSS → coller dans OBS
                         └── dupliquer un style partagé → copie personnelle privée
```

- Prévoir un nom, une description facultative, le contenu CSS, le propriétaire,
  la visibilité et les dates de création/modification. Ajouter ces données à
  PostgreSQL par une migration versionnée, sans les mêler aux secrets ou aux
  clés d'accès OBS.
- Distinguer « Mes styles » et « Styles partagés » ; identifier l'auteur des
  styles partagés avec les seules informations publiques nécessaires.
- Une modification ou suppression dans la bibliothèque ne modifie jamais le CSS
  déjà collé dans OBS. Pour actualiser le rendu, l'utilisateur copie puis colle
  à nouveau le bloc.
- La compatibilité repose sur les sélecteurs Giveaway documentés dans le
  [README](../../README.md#connecter-twitch-et-obs), compteur compris. Définir
  leur stabilité avant l'ouverture du partage ; ne pas promettre une
  compatibilité avec toutes les futures versions.
- Ajouter une prévisualisation du CSS avec un sélecteur couvrant chaque état
  réel : `HIDDEN` (masqué), `WAITING` (en attente), `OPEN` (ouvert) et `WINNER`
  (gagnant). Utiliser uniquement des valeurs fictives : lot, nombre de
  participants et noms des gagnants. Prévoir les variantes avec/sans compteur et
  avec un ou plusieurs gagnants, ainsi que des textes longs pour contrôler les
  débordements. Pour `HIDDEN`, l'overlay reste invisible ; une indication hors
  aperçu explique cet état.
- L'aperçu utilise le même contrat de DOM et de rendu que l'overlay OBS, sans
  connexion Twitch/WebSocket, sans clé OBS et sans lecture ni modification du
  giveaway réel. Le temps simulé doit rester reproductible, sans dépendre d'une
  échéance réelle périmée.
- Reporter l'application distante, l'historique de versions, les notes et les
  commentaires. Aucun framework de thèmes ou nouveau plugin n'est nécessaire à
  cette étape.

### Isolation et sécurité

- S'appuyer sur l'identité de session et les migrations versionnées du chantier
  multi-streamer. La propriété et les contrôles d'accès sont requis dès la
  première sauvegarde, même avec une seule chaîne active.
- Vérifier les droits côté serveur pour chaque liste, lecture, copie et
  mutation. Ne jamais faire confiance à un propriétaire fourni par le
  navigateur.
  Retourner `404` pour le style privé d'un autre streamer ; refuser toute
  modification d'un style partagé par un non-propriétaire.
- Protéger les mutations contre les requêtes intersites (CSRF). Définir des
  limites de taille, de nombre de styles par propriétaire et une pagination
  avant implémentation.
- Traiter noms, descriptions et CSS comme du contenu non fiable : afficher les
  métadonnées et le code comme du texte, sans injection HTML. Exécuter le CSS
  uniquement dans un aperçu isolé (iframe sandboxée sans accès à l'origine de
  l'administration), jamais dans le document de l'administration. Restreindre
  les capacités de l'iframe et bloquer ses requêtes réseau par une CSP adaptée,
  y compris les imports, images et polices externes ; signaler que ces
  ressources ne seront pas prévisualisées. Ne pas récupérer côté serveur les
  ressources référencées par un style.
- Avertir que le CSS collé dans OBS peut masquer des éléments et charger des
  ressources externes (`url()`, `@import`, polices), donc provoquer des requêtes
  vers des tiers. Ne pas présenter un style partagé comme sûr sans contrôle ;
  inviter à relire le bloc avant utilisation.
- Exclure du partage les liens OBS authentifiés, tokens et autres secrets ; ne
  jamais les ajouter automatiquement au CSS ou aux métadonnées. Rappeler cette
  interdiction avant publication et ne pas journaliser le contenu des blocs.

### Progression et critères de fin

1. Définir les limites et le contrat des sélecteurs ; préparer la persistance et
   les autorisations par propriétaire.
2. Livrer la bibliothèque privée : création, édition, suppression et copie du
   CSS ; vérifier sa conservation après redémarrage.
3. Ajouter la publication explicite, le catalogue partagé et la duplication
   indépendante.
4. Contrôler avec deux identités et des styles fictifs : isolation des styles
   privés, refus des accès anonymes, lecture partagée sans droit d'édition,
   copie privée indépendante, retrait du partage et suppression. Vérifier les
   accès directs à l'API, pas seulement les boutons de l'interface.
5. Ajouter et contrôler l'aperçu isolé sur chaque état, avec des données
   fictives : compteur avec/sans durée, gagnants multiples, textes longs et
   overlay masqué. Vérifier que le CSS ne peut ni affecter l'administration ni charger
   de ressources externes, et que les changements de scénario ne touchent pas au
   giveaway réel.
6. Valider réellement dans OBS le bloc copié : transparence, états du giveaway,
   gagnants et compteur avec/sans durée. Vérifier qu'une modification du style
   d'origine n'affecte pas la copie ni le rendu déjà configuré dans OBS.

**Terminé quand :** les styles persistent, les droits ci-dessus sont vérifiés,
la prévisualisation isolée couvre chaque état avec des données fictives et le
parcours sauvegarde → partage → copie → OBS fonctionne sans exposer de secrets
ni modifier les giveaways. Distinguer contrôles d'API et validation visuelle
OBS. Les autorisations de tests/scripts restent celles
d'[AGENTS.md](../../AGENTS.md).
