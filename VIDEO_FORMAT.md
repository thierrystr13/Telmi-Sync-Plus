# Format vidéo commun TELMI Sync+ / TELMI+

## Contrat v1

La proposition `/Videos/<id>/video.mp4` n'est pas compatible avec le scanner
actuel TELMI+ : il lit uniquement les fichiers au premier niveau de
`/mnt/SDCARD/Media/Videos/`, maximum 256 fichiers, tri alphabétique. On conserve
donc ce chemin et des sidecars ; aucune réécriture du lecteur n'est nécessaire.

```text
Media/Videos/
  Titre-<uuid>.mp4
  Titre-<uuid>.mp4.movie.json
  Titre-<uuid>.poster.png
  Titre-<uuid>.backdrop.png
```

Le titre de fichier ASCII sans caractères FAT32 interdits et l'UUID stable
évitent les collisions. Taille vidéo maximale : 4 294 967 295 octets. Une
estimation n'est pas une garantie. L'encodage dépassant la limite n'est pas
publié ni transféré. Pas de manifeste requis pour scanner ou lire les films.

Le JSON UTF-8 (64 Kio maximum) est un objet `schemaVersion: 1`. Champs du lecteur :

| Champ | Format / limite |
| --- | --- |
| title | 191 octets UTF-8 |
| synopsis | 4095 octets UTF-8, facultatif / vide accepté |
| genre | 95 octets UTF-8, facultatif |
| rating | 31 octets UTF-8, classification facultative |
| year | entier 1888..9999, facultatif |
| durationSeconds | secondes positives, maximum 604800 |
| poster / backdrop | noms PNG du même dossier, jamais chemin/URL |

Champs Sync+ ignorés par le lecteur : `id` UUID v4, `originalTitle`, `videoFile`,
`syncPlus: true`, `sha256`, `source` (URL publique éventuelle), `tmdbId`,
`attribution`. Ne jamais inclure de jeton, source PC absolue ou état de reprise.

Affiche : PNG 300×450. Fond : PNG 640×360. Ajustement proportionnel avec fond
noir, pas de déformation. Limites lecteur : 1024×1024 et 2 Mio/image. Les textes
sont limités en octets, à une frontière de caractère UTF-8. Le lecteur tolère
un sidecar absent, corrompu, une version inconnue et des images manquantes.

## Lecture, aperçus et reprise

Le lecteur existant lance FFplay 4.4.5 (Cortex-A7, décodage logiciel), réinitialise
SDL/audio à son retour, propose la reprise et conserve la navigation de sa
bibliothèque. Il prend en charge H.264 et AAC, sans HEVC, AV1, VP9 ni DTS.
H.264 Baseline/yuv420p, maximum 640×480, AAC-LC stéréo 44100 Hz est le format
préparé. Compact descend à 480×360/20 fps/450 kbit/s + audio 80 kbit/s ;
Équilibré : 640×480/24 fps/800+112 kbit/s ; Qualité : 640×480/25 fps/1200+128.
Ces valeurs sont des plafonds ; ni l'image ni le framerate ne sont agrandis.
Les pixels anamorphiques et la rotation sont normalisés. Un 16:9 devient
640×360 au profil équilibré ; FFplay assure le fond noir à l'écran.

La reprise reste dans `TELMI_PLUS/video_progress/<identité>.txt` ; l'identité
dépend du chemin, de la taille et de la date vidéo. Les mises à jour de
métadonnées n'écrivent pas la vidéo, pour préserver cette identité. Sync+ ne
modifie jamais la progression ni le cache d'aperçus. Remplacer une vidéo exige
une suppression explicite de la copie SD.

## Écriture et suppression

Détection : autorun TelmiOS officiel et dossier TELMI_PLUS. Les lecteurs sont
revérifiés avant écriture. Refus des symlinks/junctions et collisions étrangères.
Avant copie : hash de la source préparée, FAT32, nombre de films, espace libre
avec réserve 16 Mio. Chaque film est copié dans `.syncplus-<uuid>/`, vérifié par
SHA256 et FFprobe, puis publié avec la vidéo en dernier. Un journal et des
sauvegardes permettent le rollback d'une transaction interrompue au prochain
rafraîchissement. Une perte d'alimentation matérielle peut affecter le système
de fichiers FAT32 : la transaction ne remplace pas une sauvegarde de la carte.

Les films étrangers sont affichés mais protégés contre suppression/écrasement.
Les films Sync+ supprimés sont déplacés dans `.syncplus-trash-<uuid>/` ; ils ne
sont plus scannés, restent récupérables et occupent encore de la place.
Aucun dossier Stories, Music, Roms, Saves, cache ou système n'est modifié.

## État réel de compatibilité

Le 11 octobre 2026, la branche GitHub TELMI+ `main`
(`465fdb41bc83d628266e3e349ca2686ff0d301a6`) ne contient pas le lecteur vidéo.
Les sources locales de l'utilisateur contiennent `video_player.h`,
`movie_library.h`, `video_preview.h` et le moteur dans `src/videoPlayer/`.
Le contrat ci-dessus est extrait de ces sources et de `TELMIPLUS_VIDEO.md`.
Le dépôt TELMI+ n'a pas été modifié ni ses changements locaux incorporés à
cette PR indépendante. Une carte équipée du lecteur local est nécessaire.
La publication/compilation des ajouts existants TELMI+ et la validation physique
sur Miyoo sont encore nécessaires avant de revendiquer une compatibilité
matérielle de bout en bout avec la branche publique.
