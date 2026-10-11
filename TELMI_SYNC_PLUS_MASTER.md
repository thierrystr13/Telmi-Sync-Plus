# TELMI Sync+ — reprise du développement

## Références

- Dépôt indépendant : https://github.com/thierrystr13/Telmi-Sync-Plus
- Upstream : https://github.com/DantSu/Telmi-Sync
- Branche de développement : `dev/films-videos`, base officielle 0.18.0.
- TELMI+ : https://github.com/thierrystr13/Telmi-plus
- Contrat : VIDEO_FORMAT.md. Attribution : NOTICE.md. Journal : CHANGELOG_WORK.md.

## Architecture

`src/App/Modules/Videos/` est une route principale du routeur React officiel.
Elle réutilise TopBar, AppContainer, DropFiles, Table et le gestionnaire de
modales. `public/MainEvents/Videos.js` gère les dialogues natifs et IPC bornés
au renderer principal. Modules Node testables dans `public/MainEvents/Videos/` :
contract, process, library, card, network. Un seul encodage à la fois, une seule
opération réseau/transfert à la fois, annulation des processus enfants.

La bibliothèque PC est dans le userData Electron de Sync+, sous `videos/<uuid>`.
Les originaux ne sont jamais supprimés. Téléchargements autorisés YouTube dans
`video-downloads/<id>` pour permettre reprise du téléchargement et reconversion.
Les données historiques histoires/musiques restent dans `.telmi` comme upstream.
Une copie Sync+ et l'application officielle peuvent coexister (appId distinct).

Windows : le paquet drivelist 11.2.0 ne publie pas le binaire N-API nécessaire ;
DriveList.js utilise DriveInfo .NET via une commande PowerShell fixe, sans shell
construit à partir de données utilisateur. Linux/macOS gardent drivelist officiel.
Le build Windows désactive npmRebuild et installe sans scripts natifs, puis
installe Electron explicitement. Aucun Visual Studio n'est nécessaire.

## Vérification et build

GitHub Actions `.github/workflows/windows.yml` installe Yarn 1.22.22 et les
dépendances de yarn.lock, télécharge les outils épinglés/checksums, exécute
`yarn test:videos`, `yarn build:win`, `yarn verify:windows`, publie l'installateur
dans un artifact 30 jours. Pas de signature/certificat requis. Les trois warnings
de hooks CRA préexistants sont conservés ; CI=false uniquement à l'étape build
permet les warnings, les erreurs ESLint/compilation échouent toujours.

Le nom attendu est `TELMI-Sync-Plus-Windows-x64.exe`. SmartScreen peut signaler
l'application non signée. Ne jamais annoncer une exécution Actions réussie sans
consulter le résultat réel. Le test verify:windows vérifie PE x64, présence et
exécution des outils empaquetés ; les tests média génèrent leurs sources libres.

## Limites à suivre

Livraison initiale vérifiée : 22 tests et build Windows réussis au commit d774084,
run https://github.com/thierrystr13/Telmi-Sync-Plus/actions/runs/38135692111.
Artifact téléchargeable depuis la page du run, conservé 30 jours. PR en brouillon :
https://github.com/thierrystr13/Telmi-Sync-Plus/pull/1. Toute correction ultérieure
doit passer à nouveau ce workflow ; consulter le dernier run de la branche.

- Les sources vidéo TELMI+ existent localement mais ne sont pas dans main
  GitHub : voir VIDEO_FORMAT.md. Aucun matériel Miyoo testé dans cette session.
- YouTube dépend du service et de yt-dlp ; pas de cookies/authentification ni
  DRM. URL publique/unlisted vérifiée + déclaration utilisateur des droits.
  Ni la disponibilité technique ni la case cochée ne prouvent les droits.
- TMDb nécessite un jeton de lecture personnel et ses conditions d'utilisation.
  La saisie manuelle et les affiches locales n'ont pas besoin d'Internet.
- La corbeille SD reste sur carte et occupe de l'espace ; récupération en déplaçant
  ses fichiers à la racine Media/Videos. Pas de purge automatique.
- Confirmer les obligations de source des builds FFmpeg tiers avant release
  publique stable ; conserver tous les notices/licences du distributeur.
- La recherche YouTube officielle n'est pas implémentée (aucune clé obligatoire).

## Suite autonome

Consulter le journal pour les résultats exacts. Corriger toute exécution CI
échouée avec ses logs. Ne pas fusionner automatiquement. Ne jamais reprendre
les modifications locales TELMI+ sans isoler et revoir les dépendances de leurs
modules vidéo ; elles incluent également Spotify et rétro gaming.
