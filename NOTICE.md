# Attribution et licences

TELMI Sync+ est une évolution indépendante de **Telmi Sync** par Franck ALARY
(DantSu), https://github.com/DantSu/Telmi-Sync. Base : branche `master`, commit
`8406b72c36ff8cdb740ae5ff01041d1cdedac694`, tag/release `0.18.0` vérifiés le
11 octobre 2026. L'historique et les attributions des auteurs sont conservés.

Le fichier LICENSE officiel est **GNU GPL v3**. Le champ `license: MIT` du
package.json officiel était incohérent avec LICENSE : Sync+ indique GPL-3.0-only.
Les fonctions historiques (histoires, musique, Studio, installation, pochettes,
synchronisation, paramètres) sont conservées. La mise à jour OS est désormais
une action explicite, afin de ne pas remplacer TELMI+ à la détection d'une SD.

FFmpeg et FFprobe Windows : 6.1.1 essentials, GyanD/codexffmpeg. FFmpeg est
GPL v3 dans cette distribution avec libx264. Licences, configuration et URL du
code source sont incluses dans `extraResources/video-tools/FFmpeg-LICENSE.txt`
et `FFmpeg-BUILD.txt`, installés à côté des binaires. Source FFmpeg référencée
par le distributeur : https://github.com/FFmpeg/FFmpeg/commit/e38092ef93.
Distribution et documentation des builds : https://www.gyan.dev/ffmpeg/builds/.
Avant une distribution publique stable, vérifier l'accès au code source
correspondant de toutes les bibliothèques liées chez le distributeur.

yt-dlp : release 2026.08.19, https://github.com/yt-dlp/yt-dlp, code Unlicense.
L'exécutable inclut des composants tiers avec leurs propres licences ;
LICENSE et THIRD_PARTY_LICENSES.txt de cette release sont joints à l'application.
URL des sources : https://github.com/yt-dlp/yt-dlp/tree/2026.08.19.

Electron, React, drivelist et autres dépendances gardent leurs licences dans
les paquets et ressources de l'application. Aucun certificat ni secret n'est
nécessaire pour construire une version de test non signée.

TMDb : cette application utilise l'API TMDB mais n'est ni approuvée ni certifiée
par TMDB. L'utilisateur configure son propre jeton de lecture, conservé avec
Electron safeStorage. Les images et informations restent soumises aux conditions
TMDb et aux droits des ayants droit. https://developer.themoviedb.org/docs/faq.
Pas de clé partagée, pas de recherche YouTube nécessitant une clé API.


MusicBrainz : https://musicbrainz.org/doc/About/Data_License (licences des
métadonnées selon leur nature). Cover Art Archive : https://coverartarchive.org ;
les pochettes gardent leurs droits. Les onze RSS sont des sources éditoriales
externes consultées pour leurs métadonnées ; aucun droit de redistribution
des histoires ou illustrations n'est affirmé. Import réservé aux contenus
accessibles dont l'utilisateur détient les droits d'import et transfert.
