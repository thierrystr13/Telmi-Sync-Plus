# TELMI Sync+ — reprise du développement

## Livraison Windows vérifiée : 0.20.1 — 2026-10-12

Commit applicatif : e2af165becf92b42f5d1aaab551513fb76f57a30.
CI push réussie : https://github.com/thierrystr13/Telmi-Sync-Plus/actions/runs/38281121445.
CI PR réussie : https://github.com/thierrystr13/Telmi-Sync-Plus/actions/runs/38281130094.
Release : https://github.com/thierrystr13/Telmi-Sync-Plus/releases/tag/v0.20.1-test-e2af165.
EXE : 300 598 298 octets ; SHA-256
9355b408944f58bb813078072ec0f74d978e2cefb1c92f44d6509d90bc037339.
60 tests réussis, build Windows x64, outils empaquetés, modèle storyFolders
présent dans app.asar, rendu Electron réel avec fixtures, installation propre
et mise à jour 0.20.0 → 0.20.1 préservant les réglages. Captures et rapport
RENDERER_TEST.json dans l'artifact multimedia-renderer-verification du run.
Le test d'upgrade utilise le code actuel avec métadonnées de version 0.20.0.
La fixture ne prétend pas reproduire toutes les données du PC réel.

Demande utilisateur : classement RSS par histoire et épisodes, écran MP3
lisible, onglet YouTube Music séparé, pochettes et passage direct à Musique.
Implémentation : routes YouTubeMusic/StoryLibrary, thème partagé sombre,
éditeur d'album inline, bouton MP3 sticky, Router params tab=music et Tabs
initialTab. LocalMusicProvider et le signal existant local-musics-data reçoivent
les MP3 terminés ; aucun nouveau stockage ni déplacement personnel.
storyFolders.js partagé entre React et backend, regroupement explicitement
numéroté ou collection nommée, sources séparées, tri saison/épisode, sélection
entière ; mode IPC story-import='by-story'. ExportCollection utilise le vrai
titre et écrit episodes.json ; exportByStory publie des packs séparés et
rapporte les échecs par dossier. Anciens packs conservés. Catalogue réel
vérifié en lecture seule : 3312 épisodes, 2715 dossiers, 138 multiparties,
aucun groupe mélangeant plusieurs sources.

scripts/test-renderer.cjs charge le build réel dans une fenêtre Electron cachée,
avec test/fixtures/media-preview.cjs et profil .tools isolé, sans données réelles.
Test local et CI : bouton visible avec 30 pistes à 1280 et 1000 pixels,
champs sombres lisibles, pochette appliquée, album présent dans Musique,
épisodes 1 à 12 dans l'ordre. La capture native de l'application personnelle
n'est pas revendiquée : l'accès Sky avait expiré, l'IAB ne joignait pas localhost.
La vérification visuelle utilise le rendu réel isolé avec données synthétiques.

Le titre de la release a été corrigé en 0.20.1 via GitHub, sans changer les
assets ni le tag. Le titre des futures releases utilise package.version ;
syntaxe PowerShell vérifiée. Ce changement de titre et les comptes rendus
ne modifient pas le code applicatif de l'installateur testé ci-dessus.

## Installation réelle de 0.20.1

Mise à jour directe 0.20.0 → 0.20.1 terminée sur le PC utilisateur.
EXE ProductVersion 0.20.1.0 et entrée HKCU DisplayVersion 0.20.1 vérifiés.
Chemin stable : %LOCALAPPDATA%/Programs/TELMI Sync Plus/TELMI Sync Plus.exe.
Sauvegarde complète des paramètres et userData : 238 fichiers, environ 1193 Mio,
empreintes SHA-256 identiques avant/après mise à jour. Les 20494 fichiers
personnels histoires/musiques conservent leurs tailles et dates de modification.
Aucune modification de la carte SD dans cette session. Rapport local
cache/telmi-sync-before-update-0.20.1-20261012-190138/result.json, dans le dépôt
parent, ignoré par Git. L'ancienne copie machine dev.1 décrite plus bas n'a pas
été désinstallée ; aucune nouvelle demande de nettoyage administrateur.

## Livraison précédente vérifiée : 0.20.0

Commit applicatif : 610f9de066c93ac7752555557a9463d2d06f2316.
CI complète réussie : https://github.com/thierrystr13/Telmi-Sync-Plus/actions/runs/38171996644.
51 tests réussis, build Windows x64, outils embarqués, upgrade et installation propre.
Release de test : https://github.com/thierrystr13/Telmi-Sync-Plus/releases/tag/v0.20.0-test-610f9de.
EXE SHA-256 : b46adde247c2decae49a972261eb19eee5256b1ac2ab4680b1259b414c87a002.
Le rapport INSTALLATION_TEST.json accompagne l'EXE. Les chiffres et builds
ci-dessous retracent les livraisons antérieures. Lire aussi MULTIMEDIA_GUIDE.md.

PC réel : 0.20.0 installé pour l'utilisateur, anciennes versions utilisateur
0.18.0/dev.2 désinstallées. Sauvegarde 1 832 fichiers vérifiés SHA-256 et
20 494 fichiers personnels conservés. Rapport local sous
cache/telmi-sync-before-install-20261011-2247/result.json dans le dépôt parent.
Il reste dev.1 dans Program Files : droits administrateur Windows indisponibles.
Maintenance locale testée avec Get-Process/Stop-Process ; éviter CIM/taskkill
qui se bloquent sur ce PC. Ne pas annoncer une seule installation globale.
CI finale après le correctif de maintenance :
https://github.com/thierrystr13/Telmi-Sync-Plus/actions/runs/38173645111, réussie.
Release correspondante : v0.20.0-test-be08faf. Le binaire 610f9de déjà installé
conserve le même code applicatif ; pas de réinstallation nécessaire pour ce correctif externe.

## Références

- Dépôt indépendant : https://github.com/thierrystr13/Telmi-Sync-Plus
- Upstream : https://github.com/DantSu/Telmi-Sync
- Branche de développement : `dev/films-videos`, base officielle 0.18.0.
- TELMI+ : https://github.com/thierrystr13/Telmi-plus
- Contrat : VIDEO_FORMAT.md. Attribution : NOTICE.md. Journal : CHANGELOG_WORK.md.

## Architecture

DEV2 corrige la détection Windows signalée par l'utilisateur sur SD E: DEV11.
DriveList utilise fs.statfs sur les volumes montés Windows, cache partagé 3 s,
timeout 3 s par lecteur. PowerShell reste uniquement dans le dialogue de formatage
historique, afin d'exiger une classification physique amovible réelle.
InfFiles reconnaît aussi runtime + storyTeller sans autorun et lit la version
DEV installée ; le bouton de mise à jour upstream est masqué pour TELMI+.
Les paramètres absents/corrompus ne bloquent plus la détection (défauts en mémoire).
29 tests automatisés ; voir le dernier workflow avant de télécharger l'installateur.

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


## Reprise de la mission multimédia 0.20.0

Lire MULTIMEDIA_GUIDE.md et CHANGELOG_WORK.md. Modules ajoutés :
Helpers/Storage.js, Multimedia.js, Multimedia/audio.js, Multimedia/feeds.js,
Multimedia/sources.json, UI Modules/Multimedia. Tests : test/multimedia.test.js
(22 nouveaux tests, 51 au total avec vidéos/détection et recherche jeunesse). Les téléchargements
YouTube audio se reprennent après erreur ; les imports RSS échoués repartent
proprement. Les bibliothèques personnelles restent hors des nettoyages.

Le workflow Windows construit une fixture avec les métadonnées 0.19.0-dev.2
mais le code actuel, puis teste upgrade 0.20.0 et installation propre sur un
runner isolé. Publie un EXE de test seulement après tous les contrôles.
Consulter ses logs avant d'annoncer le succès. Nettoyage du PC réel séparé
via scripts/windows-maintenance.ps1, uniquement après téléchargement/empreinte
du nouvel EXE. Ne pas exécuter test-windows-install.ps1 sur un PC personnel.

Identité stable : fr.telmi.syncplus, produit TELMI Sync Plus, GUID NSIS
adefeceb-f6d0-5c3b-91bf-0ca69e035128, installation unique par utilisateur.
L'ancien TELMI Sync officiel et les anciennes installations tous-utilisateurs
nécessitent ce nettoyage initial ; les futurs installers gardent l'identité.
