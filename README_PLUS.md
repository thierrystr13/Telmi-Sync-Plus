# TELMI Sync+

Évolution indépendante de [Telmi Sync de DantSu](https://github.com/DantSu/Telmi-Sync),
avec un onglet Films & Vidéos pour TELMI+. Histoires, musique, installation et
Studio restent accessibles dans leurs écrans d'origine.

Ajouter des vidéos → préparation automatique en Équilibré → choisir la pochette
et corriger le synopsis → sélectionner → Envoyer sur TELMI+.

Une connexion Internet est nécessaire uniquement pour YouTube et la recherche
TMDb. La préparation de fichiers locaux et le transfert SD fonctionnent hors
ligne : FFmpeg, FFprobe et yt-dlp sont inclus dans le build Windows.

Voir [VIDEO_FORMAT.md](VIDEO_FORMAT.md) pour le contrat TELMI+,
[NOTICE.md](NOTICE.md) pour les attributions,
[CHANGELOG_WORK.md](CHANGELOG_WORK.md) pour les résultats exacts et
[TELMI_SYNC_PLUS_MASTER.md](TELMI_SYNC_PLUS_MASTER.md) pour reprendre le travail.

## Télécharger le build de test

Ouvrir [Actions](https://github.com/thierrystr13/Telmi-Sync-Plus/actions), choisir
une exécution **Windows x64** terminée avec succès, puis télécharger l'artifact
**TELMI-Sync-Plus-Windows-x64** et extraire l'installateur `.exe`. Un compte GitHub
connecté peut être nécessaire. Aucun ordinateur personnel n'est nécessaire pour
construire : les runners GitHub font le travail. Le workflow est également
exécutable manuellement. Une version de test n'est pas signée ; Windows peut
afficher un avertissement SmartScreen.

## Précautions fonctionnelles

- Le lecteur vidéo TELMI+ doit être installé : il existe dans les sources locales
  mais n'était pas dans la branche GitHub main lors de l'analyse.
- Les performances matérielles Miyoo ne sont pas validées.
- Compact réduit aussi le travail de décodage ; à essayer si Équilibré est trop
  lourd sur console. Aucun profil H.264 n'est annoncé garanti fluide.
- Les tailles affichées avant conversion sont des estimations.
- Les vidéos PC originales ne sont jamais supprimées par ce module.
- Les fichiers SD préexistants non créés par Sync+ sont affichés et protégés.
- La suppression SD place les copies dans une corbeille cachée, sans libérer
  immédiatement l'espace. Les sauvegardes/aperçus restent intacts.
- Les vidéos YouTube publiques ne sont pas nécessairement autorisées au
  téléchargement : importer uniquement un contenu que l'on possède ou est
  autorisé à télécharger conformément aux conditions applicables.
- TMDb est optionnel ; saisir manuellement et importer une pochette JPG/PNG
  reste disponible sans compte ni clé.
