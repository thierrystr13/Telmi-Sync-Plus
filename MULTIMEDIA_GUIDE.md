# TELMI Sync Plus 0.20.1

## Utilisation

- Films & Vidéos : ajouter un fichier local ou une URL YouTube autorisée,
  choisir Économique / Équilibré / Qualité, corriger les informations et la
  pochette, puis envoyer les films prêts sur la carte TELMI+. Les fichiers
  déjà compatibles sont remuxés sans réencodage. La variation de taille est
  mesurée après préparation ; une conversion indispensable peut agrandir un
  petit fichier. Les originaux locaux et NAS restent à leur emplacement.
- YouTube Music : onglet principal séparé. Coller une URL de vidéo ou playlist,
  analyser, sélectionner les pistes puis compléter la fiche d'album à droite.
  Le choix JPG/PNG et la recherche MusicBrainz restent dans cet écran. Le bouton
  « Appliquer l'album et la pochette à la sélection » conserve les titres,
  artistes et numéros ; les autres modifications groupées restent possibles.
  Confirmer les droits, puis « Convertir en MP3 ». Le bouton reste visible en
  bas, y compris pour une longue playlist. Les conversions terminées sont
  ajoutées automatiquement à la bibliothèque de Synchroniser → Musique.
  « Ouvrir Synchroniser musique » ouvre directement le bon sous-onglet.
  MP3 192 kb/s recommandé, 128/256 proposés, tags ID3 et pochette intégrée.
  Les analyses en cours d'édition restent en mémoire en changeant d'onglet ;
  les tâches de conversion sont persistantes entre les démarrages.
- Livres audio : onglet principal, aussi accessible depuis Littérature audio
  dans Stores. Collections RSS à gauche, puis dossiers par histoire. Ouvrir
  un dossier affiche tous ses épisodes et leurs résumés, numéros et saisons.
  Cocher le dossier ou la saison sélectionne tous ses épisodes accessibles.
  Les marqueurs Épisode/EP/Partie/Chapitre, fractions 1/6 et S07E09 du titre
  déterminent les séries ; le numéro global d'un podcast ne mélange pas des
  récits indépendants. Les titres de collections nommées sont aussi regroupés.
  Les épisodes sont triés par saison puis numéro, avec date/titre en repli.
  Les sources restent séparées. Filtres d'âge, type, durée, thème et favoris.
  « Importer par histoire » crée un pack nommé par histoire, avec son menu
  d'épisodes compatible avec le lecteur TELMI+ ; une sélection de plusieurs
  dossiers produit plusieurs packs. L'index episodes.json conserve numéros,
  saisons, titres, source et résumés hors ligne. Les anciens packs ne sont
  ni déplacés ni supprimés. Maximum 100 épisodes par import.
  Les dossiers sont un classement du catalogue : on conserve les répertoires
  de packs attendus par le lecteur et la synchronisation existants.
- Paramètres > Stockage : six dossiers, bouton Parcourir, test de lecture,
  écriture et espace libre. Chemins locaux, lecteurs réseau et UNC acceptés.
  Un serveur indisponible est signalé. Les mots de passe Windows/NAS ne sont
  pas enregistrés. Modifier un chemin ne déplace aucune bibliothèque.
  Redémarrer après un changement pour recharger la bibliothèque vidéo.

## Données et nettoyage

Configuration `~/.telmi/parameters/storage.json`. Musiques et histoires gardent
leurs dossiers historiques par défaut. Les vidéos gardent le dossier utilisateur
Electron de la version installée ; aucune migration implicite. État des imports
audio et catalogues dans le même dossier utilisateur. Les fichiers téléchargés
par l'application sont distincts des sources personnelles.

Vidéo : validation FFprobe, décodage complet et contrôle des copies avant
publication. Travaux supprimés en fin de conversion ; téléchargement propre
supprimé après succès et sauvegarde de l'entrée. Échec/annulation : téléchargements
conservés pour reprise explicite, travaux nettoyés. Audio : validation MP3,
durée et décodage, copie contrôlée avant publication, travaux supprimés après
succès ; téléchargement conservé si interruption. RSS : échec nettoyé, nouvel
import relance le téléchargement. Histoires et collections publiées depuis un
dossier caché, jamais affichées à moitié. La lecture d'une bibliothèque ne
supprime plus un MP3 sans image ou une histoire incomplète.

## Installation Windows

Application `fr.telmi.syncplus`, nom `telmi-sync-plus`, produit `TELMI Sync Plus`,
GUID NSIS `adefeceb-f6d0-5c3b-91bf-0ca69e035128`. Installation par utilisateur,
chemin fixe `%LOCALAPPDATA%/Programs/TELMI Sync Plus`, sans choix de mode
administrateur. Les futures versions gardent cet identifiant et ce chemin.
Le désinstalleur conserve les données utilisateur.

`scripts/windows-maintenance.ps1` est en mode inventaire par défaut. Le mode
CleanInstall exige un installateur déjà présent avec SHA-256 correct et un
dossier de sauvegarde explicite. Il arrête uniquement les applications TELMI
des trois chemins connus, sauvegarde les réglages/catalogues `.telmi` et les trois dossiers utilisateur
connus, compare les empreintes, inventorie les bibliothèques personnelles
conservées sur place, utilise leurs désinstalleurs, retire leurs
raccourcis/entrées devenus obsolètes, installe et exige une seule entrée finale.
Les bibliothèques personnalisées ne sont pas effacées. Une copie complète de
`.telmi` est facultative avec FullLibraryBackup et exige assez d’espace. Sans
droits administrateur, le script laisse l’ancienne installation machine intacte
et indique pending-administrator ; il peut installer la version utilisateur.
Un résultat déjà vérifié
avec les mêmes paramètres ne relance pas le nettoyage.

CI : médias synthétiques, compilation Windows, vérification PE x64 et outils,
ancienne version simulée avec le même identifiant NSIS, mise à jour en 0.20.1,
préservation d'un réglage, désinstallation et installation propre, vérification
du raccourci unique. Le rapport `INSTALLATION_TEST.json` accompagne l'exécutable.
La fixture teste les métadonnées/identifiants d'installation de 0.20.0 ;
elle contient le code actuel. Le nettoyage du PC réel est vérifié séparément. Le rendu Electron du build React
est également testé avec 30 pistes synthétiques : contraste, bouton MP3 dans
la fenêtre, pochette/album, ouverture Musique, dossiers et ordre des épisodes.
Les captures et RENDERER_TEST.json sont publiés dans un artifact distinct.
Installateur non signé : Windows peut afficher un avertissement de provenance.

## Sources et droits

`FEED_AUDIT.json` donne les résultats réseau exacts et leurs dates. Le compteur
RSS inclut des bandes-annonces et épisodes divers, et ne signifie pas que tous
les contenus sont adaptés à l'âge de l'enfant. Un lien public ou une écoute
gratuite ne prouve pas un droit de copie ou transfert. Les cas abonnés connus
sont bloqués ; les autres imports exigent une déclaration explicite de droits.
Sans autorisation, utiliser le lecteur de l'éditeur. Aucun cookie,
authentification, DRM ou protection d'accès contourné.

Les classements thématiques/types sont estimés. Un âge explicitement trouvé
dans un résumé est indiqué comme tel ; sinon l'âge reste inconnu.
MusicBrainz et Cover Art Archive : https://musicbrainz.org et
https://coverartarchive.org ; conserver les droits des images choisies.
Attributions DantSu, FFmpeg, yt-dlp et TMDb : `NOTICE.md`.

## Limites de validation

Les tests de playlist utilisent 30 pistes synthétiques, sans téléchargement de
musique protégée. YouTube, MusicBrainz, affiches et RSS restent dépendants de
leurs services. Aucun jeton TMDb fourni. Aucun NAS Synology réel disponible
pour valider ses droits SMB : chemin UNC inaccessible testé sous Windows.
La lecture et la navigation sur une Miyoo physique ne sont pas validées.
Le format vidéo est celui du lecteur TELMI+ local existant (`VIDEO_FORMAT.md`).
