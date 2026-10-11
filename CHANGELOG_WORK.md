# Journal TELMI Sync+

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
