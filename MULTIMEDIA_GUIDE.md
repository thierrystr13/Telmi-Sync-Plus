# TELMI Sync Plus 0.20.0

## Utilisation

- Films & Vidéos : ajouter un fichier local ou une URL YouTube autorisée,
  choisir Économique / Équilibré / Qualité, corriger les informations et la
  pochette, puis envoyer les films prêts sur la carte TELMI+. Les fichiers
  déjà compatibles sont remuxés sans réencodage. La variation de taille est
  mesurée après préparation ; une conversion indispensable peut agrandir un
  petit fichier. Les originaux locaux et NAS restent à leur emplacement.
- Synchroniser musique : ouvrir « Importer depuis YouTube », analyser une
  vidéo ou une playlist (500 pistes maximum), sélectionner les pistes et
  vérifier les droits. Corriger titre, artiste, album, piste, année, genre.
  MusicBrainz propose des correspondances et leurs éditions pour Cover Art
  Archive ; une image JPG/PNG locale est toujours possible. Les champs artiste,
  album, année et genre peuvent être appliqués à une sélection. La file importe
  chaque piste et permet annulation/reprise, sans considérer une playlist comme
  un album. MP3 192 kb/s par défaut, 128/256 proposés ; un MP3 déjà compatible
  est conservé sans gonfler son débit. Tags ID3 et pochette intégrée.
- Story : onglet « Littérature audio ». Recherche commune dans les onze flux,
  résumés et thèmes, catégories estimées, filtres d'âge et durée, favoris,
  sélection de résultats/collection, suivi des imports. « Écouter chez
  l'éditeur » ouvre le lecteur officiel. Aucun audio n'est téléchargé lors du
  chargement des catalogues ; cache de métadonnées de 24 heures. Les imports
  explicitement autorisés deviennent des packs compatibles avec la liste et
  la synchronisation d'histoires existantes. Le regroupement crée un menu
  d'épisodes ordonnés par numéro ou date. Le titre est inscrit dans chaque
  illustration de sélection. Aucun flux France Inter ajouté.
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
des trois chemins connus, sauvegarde `.telmi` et les trois dossiers utilisateur
connus, compare les empreintes, utilise leurs désinstalleurs, retire leurs
raccourcis/entrées devenus obsolètes, installe et exige une seule entrée finale.
Les bibliothèques personnalisées ne sont pas effacées. Un résultat déjà vérifié
avec les mêmes paramètres ne relance pas le nettoyage.

CI : médias synthétiques, compilation Windows, vérification PE x64 et outils,
ancienne version simulée avec le même identifiant NSIS, mise à jour en 0.20.0,
préservation d'un réglage, désinstallation et installation propre, vérification
du raccourci unique. Le rapport `INSTALLATION_TEST.json` accompagne l'exécutable.
La fixture teste les métadonnées/identifiants d'installation de 0.19.0-dev.2 ;
elle contient le code actuel. Le nettoyage du PC réel est vérifié séparément.
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
