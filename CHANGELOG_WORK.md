# Journal TELMI Sync+

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
