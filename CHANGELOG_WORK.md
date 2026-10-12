# Journal TELMI Sync+

## 2026-10-12 — 0.20.2 : défilement des fiches longues

- Les panneaux latéraux peuvent dépasser la hauteur disponible avec de longues
  playlists ou de nombreuses sources. Ajout d’un défilement indépendant pour
  la fiche d’album et la colonne des collections ; repli en flux normal en
  dessous de 850 pixels. Le bouton MP3 reste accessible.
- Test Electron complété : dernier champ de la fiche et dernier bouton de
  collection atteignables sans parcourir toute la liste. CI et installation
  du complément restent à vérifier.


## 2026-10-12 — 0.20.1 : bibliothèque par histoire et YouTube Music

- Cause du contraste : champs MP3 hors du sélecteur de thème, panneau réduit à
  330 pixels masquant la conversion. Remplacement par un onglet principal,
  fiche latérale sans modale, thème sombre et action MP3 toujours accessible.
- Choix JPG/PNG et recherche MusicBrainz dans la fiche ; application album et
  pochette à la sélection en conservant titres/artistes/numéros.
- MP3 terminés réutilisent la bibliothèque/synchronisation existante. Raccourci
  ouvre directement Synchroniser Musique ; analyses conservées dans la session.
- Livres audio : collections, dossiers par récit/série, épisodes triés, saisons,
  sélection dossier/saison et filtres âge/type/thème/durée/favoris.
- Import par histoire : plusieurs dossiers donnent plusieurs packs bien nommés,
  avec index hors ligne ; aucune suppression/migration des anciens imports.
- 60 tests locaux réussis ; build React réussi. Nouveau test Electron de rendu
  réel réussi localement (1280 et 1000 pixels, 30 pistes, album et 12 épisodes).
  Captures CI, outils empaquetés et upgrade 0.20.0 → 0.20.1 réussis.
- CI push 38281121445 et PR 38281130094 réussies, commit e2af165.
- Release v0.20.1-test-e2af165, EXE 300598298 octets, empreinte SHA-256
  9355b408944f58bb813078072ec0f74d978e2cefb1c92f44d6509d90bc037339.
- Titre de release corrigé ; futurs titres fondés sur package.version.
- Installation directe réussie sur le PC : ProductVersion 0.20.1.0, HKCU
  0.20.1. Sauvegarde de 238 fichiers, SHA-256 vérifiés ; 20494 fichiers
  personnels inchangés (taille/date). Carte SD laissée intacte.
- Compte rendu local sous cache/telmi-sync-before-update-0.20.1-20261012-190138
  du dépôt parent. Aucune fusion et aucune modification du projet TELMI+.


## 2026-10-11 — correctif DEV2 : détection Windows / TELMI+ DEV11

- Signalement utilisateur : aucune carte et erreur PowerShell dans Films & Vidéos.
- Lecture seule de la SD E: : autorun TelmiOS-v1.10.4, version système
  v1.10.4-TELMIPLUS-DEV11-RETROGAMING-VISUEL, TELMI_PLUS et paramètres valides.
- Ancien détecteur reproduit en échec ; même avec 60 s, PowerShell expire sur ce PC.
  fs.statfs accède correctement à E:. Détection courante désormais native Node,
  partagée entre modules, cache court et 3 s maximum par lecteur illisible.
  PowerShell n'est utilisé que par le dialogue historique de création/formatage,
  où le type physique amovible reste obligatoire (jamais déduit d'une lettre).
- Reconnaissance par runtime + storyTeller sans dépendre d'autorun ; version DEV
  lue dans .tmp_update/telmiVersion/version.txt. Paramètres manquants/corrompus
  tolérés en mémoire, aucune écriture à la détection.
- Mise à jour OS officielle désactivée pour les cartes TELMI+, afin de conserver
  les ajouts personnalisés. Erreurs SD séparées des erreurs import/YouTube.
- 28 tests synthétiques/détection réussis localement avant remplacement natif ;
  un 29e test vérifie les lecteurs natifs et délais. Nouveau build CI à vérifier.


## 2026-10-11 — développement initial

- Vérification upstream master/tag/latest release : 0.18.0, commit 8406b72.
- Clone indépendant, remote upstream, branche dev/films-videos.
- Création du dépôt GitHub indépendant par import, historique conservé.
- Audit TELMI+ : lecteur local FFplay/SDL et sidecars Media/Videos ; absent
  du main GitHub publié. Aucun changement au projet TELMI+ existant.
- Route principale Films & Vidéos, réemploi des tableaux, modales, glisser-déposer.
- Import multi-fichiers, FFprobe, profils Baseline/AAC, file d'attente, progression,
  annulation, nettoyage work, validation FFprobe et décodage complet.
- Métadonnées UTF-8 limitées, pochettes PNG, JPG importable, images automatiques,
  synopsis hors ligne. TMDb optionnel, jeton chiffré Electron safeStorage.
- YouTube via yt-dlp épinglé, URL filtrée, contenus publics/unlisted non DRM,
  déclaration des droits, reprise --continue, conversion automatique.
- Carte : reconnaissance existante, place libre/FAT32, hash/copie vérifiée,
  publication vidéo en dernier, journal/rollback, doublons sans réécriture de
  vidéo, suppression récupérable limitée aux films Sync+.
- Installation initiale échouée sur drivelist : pas de prebuild Windows upstream.
  Correction : API CIM Windows, dépendances officielles conservées.
- Premier build React en CI échoué uniquement sur trois warnings de hooks upstream.
  Correction : autoriser warnings à l'étape build, sans changer les hooks Studio.
- Tests synthétiques et chaîne Windows écrits. Résultats à compléter après
  exécution ; aucun succès CI ou matériel revendiqué à ce stade.

### Vérifications et corrections

- 21 tests synthétiques réussis localement et sur le premier runner GitHub.
- Build React réussi ; trois warnings upstream du Studio conservés.
- Premier workflow 38135105984 : échec NSIS/7zip sur les symlinks macOS de
  Piper embarqués par upstream. Correction : filtrage par plateforme à l'aide
  du même electron-builder, sans retirer les ressources Windows ni les sources
  macOS/Linux du dépôt.
- Reconnaissance des lecteurs Windows vérifiée en lecture seule. Les requêtes
  CIM lentes ont été remplacées par DriveInfo .NET dans le helper Windows.
- Annulation renforcée pour tuer également les enfants yt-dlp/FFmpeg/JS.
- Vérification réelle des arguments yt-dlp : suppression d'une option inexistante,
  ajout d'un test du binaire embarqué sans téléchargement de contenu tiers.
- Deuxième workflow 38135515010 : échec de copie EBUSY. L'override inline de
  electron-builder concaténait les ressources avec celles de package.json.
  Correction : configuration Windows complète générée dans un fichier séparé,
  sans ressources en double. 22 tests locaux réussis.

### Livraison GitHub vérifiée

- Workflow 38135692111 au commit d774084 : succès confirmé, 22 tests média/SD,
  compilation NSIS Windows x64 et vérification des binaires/outils embarqués.
- Artifact : https://github.com/thierrystr13/Telmi-Sync-Plus/actions/runs/38135692111/artifacts/11700529025
  (archive contenant TELMI-Sync-Plus-Windows-x64.exe, expiration 10 novembre 2026).
- PR de développement en brouillon : https://github.com/thierrystr13/Telmi-Sync-Plus/pull/1
  Aucun merge et aucune modification du dépôt officiel ou du main TELMI+.
- Correction finale de l'affichage de la case d'autorisation YouTube et du
  rechargement d'une pochette après une image initialement absente.
- Aperçu navigateur local inaccessible dans cet environnement : aucune validation
  visuelle complète du renderer ni exécution interactive de l'installateur annoncée.
- Import YouTube réel, TMDb avec jeton et lecture sur console restent non validés.


### 11 octobre 2026 — mission multimédia 0.20.0

- Stockage configurable : six chemins, droits/écriture/espace libre, UNC,
  délai réseau, aucune migration/suppression implicite.
- Vidéo : remux sans réencodage si compatible, débits plafonnés à la source,
  variation de taille mesurée, travaux séparés et téléchargements propres
  supprimés uniquement après validation et sauvegarde. Profils Économique,
  Équilibré, Qualité ; format TELMI+ inchangé.
- Musique : YouTube individuel/playlist, sélection, file persistante, reprise,
  annulation et doublons ; MP3 128/192/256, conservation des MP3 compatibles,
  ID3 et pochette, MusicBrainz/CAA/image locale, modifications groupées.
- Littérature audio : onze RSS validés, grille commune, recherche, filtres,
  favoris, cache 24 h, import choisi et collections, titre visible sur l'image,
  packs compatibles avec le lecteur/synchroniseur historique. Droits requis,
  épisodes abonnés repérés bloqués, aucun France Inter ajouté.
- Protection : le scanner musical ne supprime plus les MP3 sans pochette ;
  le scanner d'histoires ne supprime plus les dossiers incomplets ou collisions.
- Windows : trois installations identifiées (0.18.0, dev.1, dev.2). Script
  borné aux trois chemins connus, sauvegarde avec empreintes, désinstalleurs,
  identité et chemin fixes par utilisateur. Nettoyage réel attend l'EXE vérifié.
- 49 tests synthétiques réussis sous Windows ; compilation React réussie avec
  uniquement les trois avertissements de hooks déjà présents dans l'amont.
- CI étendue : test d'installation propre et mise à jour avec fixture de
  version précédente. Compilation/livraison CI encore à confirmer dans ce
  point d'étape. Audit réseau détaillé : FEED_AUDIT.json.
- Guide d'utilisation et limites : MULTIMEDIA_GUIDE.md. Aucun test physique
  Miyoo, aucun NAS réel ni jeton TMDb validé ; aucune fusion automatique.


### Contrôles complémentaires et première CI multimédia

- Audit HTTP de tous les liens audio : 3 312 réponses audio confirmées sur
  3 312 enclosures. HEAD ou en-têtes GET Range, aucun corps audio lu. Voir
  RSS_AUDIT.md et FEED_AUDIT.json. Liens éditeurs mis à jour depuis les RSS.
- Lecture du code stories_reader.h TELMI+ : en fin de récit indépendant, une
  transition null retourne à la bibliothèque. Correctif du pack pour éviter
  de rejouer le récit en boucle ; assertion de compatibilité ajoutée.
- Workflow 38169772069 : compilation et binaires x64 réussis, 49 tests média
  réussis, test installation échoué car son filtre cherchait DisplayName
  sans version. Correction du filtre ; aucun installateur annoncé comme
  entièrement validé à ce stade. Nouvelle CI déclenchée par le correctif.
- Contrôle visuel Windows indisponible : initialisation Computer Use échoue
  deux fois « failed to write kernel assets » / chemin introuvable. Aucun
  test visuel natif annoncé. Les opérations CLI restent accessibles.


### Corrections des contrôles Windows

- CI 38170288343 : un échec audio intermittent (48/49) non reproduit localement ;
  le run PR du même commit passe 49/49. Messages d'erreur de piste ajoutés aux
  assertions. Filtres et encodage des images bornés à un thread pour éviter
  des pools de traitement disproportionnés sur les machines de CI.
- CI PR 38170292007 : tests et compilations réussis, upgrade passé jusqu'au
  contrôle du désinstalleur, qui révèle un vrai changement de chemin NSIS.
  Le mode oneClick utilisait package.name au lieu de productName. Ajout d'un
  include NSIS fixant APP_FILENAME à TELMI Sync Plus, identique aux versions
  déjà installées. Nouvelle compilation nécessaire avant installation.
- PC : 5 235 552 256 octets libres sur C:, session non administrateur. La
  bibliothèque .telmi représente 43 583 991 583 octets / 20 506 fichiers.
  Copie intégrale impossible sur C:. Maintenance sauvegarde réglages et
  données Roaming avec empreintes, conserve/inventorie les bibliothèques sur
  place. Ne prétend pas en avoir réalisé une copie intégrale. Installation
  Program Files conservée tant que l'élévation Windows reste indisponible.

### File persistante et recherche jeunesse

- Le diagnostic CI 38171190299 identifie l'erreur audio intermittente : EPERM
  lors de deux remplacements simultanés du JSON de la file. Les écritures sont
  désormais sérialisées par fichier, avec instantané JSON, synchronisation disque,
  reprise limitée des verrous Windows et nettoyage du seul temporaire créé.
  Test ajouté : 100 sauvegardes concurrentes, dernier état complet et aucun résidu.
  Les 50 tests média/détection passent sur le PC Windows.
- CI 38171194350 : compilation, outils, upgrade et désinstallation passent ;
  la vérification finale utilisait InstallLocation, absent du registre NSIS.
  Elle vérifie maintenant le chemin réel via le désinstalleur connu et l'exécutable.
- Recherche jeunesse commune extraite et testée : accents, mots du résumé/thèmes,
  âges connus, limites de durée, catégories, sources, favoris et absence de mutation
  du catalogue. Les récits indépendants précèdent les feuilletons dans les résultats.
  CI 38171996644 réussie : 51/51 tests, compilation, vérification des exécutables,
  mise à jour depuis la fixture 0.19.0-dev.2, réglage conservé, désinstallation,
  installation propre, une entrée Windows et un raccourci. Release de test
  v0.20.0-test-610f9de publiée avec rapport et SHA-256 ; installateur 300 576 346 octets.
  Empreinte : b46adde247c2decae49a972261eb19eee5256b1ac2ab4680b1259b414c87a002.

### Installation sur le PC réel

- EXE 0.20.0 téléchargé depuis cette release et empreinte SHA-256 comparée
  au fichier publié et au digest GitHub, avant toute désinstallation.
- La maintenance s'est bloquée avant désinstallation sur CIM, puis taskkill.
  Arrêt de ces tentatives ; détection et arrêt directs via Get-Process/Stop-Process
  limités aux exécutables TELMI des trois dossiers connus. Syntaxe PowerShell validée.
- Maintenance réelle terminée : 1 832 fichiers de réglages/données sauvegardés
  avec SHA-256 ; 20 494 fichiers personnels musique/histoires conservés et vérifiés
  par taille/date. Pas de copie intégrale des 43,6 Go de .telmi sur C: trop petit.
- Les versions utilisateur Telmi Sync 0.18.0 et Sync Plus 0.19.0-dev.2 sont
  réellement désinstallées ; Sync Plus 0.20.0 est installé, une entrée utilisateur.
- Ancienne version machine 0.19.0-dev.1 dans Program Files conservée : le jeton
  Windows n'a pas les droits administrateur. Deux entrées globales restent donc
  présentes. Le résultat local porte pending-administrator, pas verified.
  Manifeste et sauvegarde sous cache/telmi-sync-before-install-20261011-2247,
  exclus de Git. Aucun secret/configuration personnelle publié.
- Contrôle de l'installation réelle : exécutable version 0.20.0.0,
  FFmpeg/FFprobe/yt-dlp présents. Relance de la maintenance avec le même SHA
  et la même sauvegarde : aucune opération répétée (idempotence vérifiée).
- Conversion supplémentaire avec les outils du dossier installé, sur média
  synthétique 1280x720 : sortie 640x360, 20 fps, H.264 Constrained Baseline,
  audio AAC, durée 1 s, 133 447 octets, variation -75,4 %. Décodage complet
  et hash validés par le moteur de conversion. Aucun film personnel utilisé.
- CI finale après correctif de maintenance be08faf : workflow 38173645111
  entièrement réussi, 51 tests et contrôles Windows. Release de test be08faf
  publiée ; le code applicatif reste celui du binaire 610f9de installé et vérifié.
