# Vérification RSS du 11 octobre 2026

Les onze flux candidats répondent HTTP 200 et contiennent un RSS valide.
KIDSTORY est confirmé par le titre du flux : « KIDSTORY : Les meilleurs contes
pour enfants ». Les liens éditeurs proviennent des flux, et sont utilisés pour
la consultation officielle. Aucun flux France Inter ajouté.

| Source | Entrées RSS | Liens audio HTTP vérifiés |
|---|---:|---:|
| Les P'tites Histoires | 846 | 846 |
| Encore une histoire | 599 | 599 |
| Histoires magiques | 385 | 385 |
| Des histoires en musique | 296 | 296 |
| Contes en liberté | 177 | 177 |
| Mille et une histoires | 137 | 137 |
| Au pays des histoires | 95 | 95 |
| Conte-moi l'aventure ! | 141 | 141 |
| Les histoires pas-sages de la Baba Yaga | 159 | 159 |
| KIDSTORY | 262 | 262 |
| Envolées contées | 215 | 215 |
| **Total** | **3 312** | **3 312** |

Vérification des en-têtes HTTP et types MIME audio par HEAD. Acast renvoie
une réponse texte de santé pour HEAD ; les en-têtes de GET avec Range 0–0
ont alors été vérifiés, puis la connexion fermée sans lire le corps audio.
Résultats détaillés et dates par source dans `FEED_AUDIT.json` ; procédure
reproductible : `scripts/audit-feeds.py --check-audio`.

Ce total inclut les bandes-annonces et autres entrées présentes dans les flux.
Il confirme la disponibilité technique au moment du contrôle, pas les droits,
la qualité, l'âge, ni la pérennité des fichiers. Aucun de ces fichiers audio
complets n'a été téléchargé pour l'audit.

Les flux ne fournissent pas une licence générale démontrant un droit de copie
et transfert de tout leur catalogue. Par défaut, consultation des métadonnées
et lecteur de l'éditeur. L'import demande une autorisation détenue et déclarée
par l'utilisateur ; les mentions abonnés identifiables sont bloquées. La présence
d'un enclosure gratuit ne suffit pas à établir ces droits. Radio Classique
décrit un téléchargement depuis son lecteur, sans que cela constitue une
autorisation générale de redistribution :
https://www.radioclassique.fr/podcasts-et-emissions/histoires-en-musique/.
