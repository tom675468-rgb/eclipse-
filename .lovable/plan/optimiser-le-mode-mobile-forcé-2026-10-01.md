# Optimiser le mode Mobile forcé

## Résultat attendu
- Le choix « Mobile » affiche une vraie interface téléphone, même sur un écran large.
- Le tableau de bord et les modules principaux restent en colonne unique.
- Les textes, espacements et largeurs restent lisibles sans zoom ni débordement.

## Mise en œuvre
- Donner au mode Mobile une largeur d’interface téléphone fluide et centrée, indépendante de la largeur de l’appareil.
- Neutraliser dans ce mode les grilles multi-colonnes et les espacements réservés au bureau.
- Conserver les zones naturellement larges (agenda, tableaux, onglets) dans des conteneurs à défilement tactile plutôt que de comprimer leur contenu.
- Garder la navigation mobile et masquer complètement le rail ordinateur.

## Vérification
- Tester avec une session active sur un téléphone de 390 px et sur un écran large avec le mode Mobile forcé.
- Vérifier le tableau de bord, Deep Work, Objectifs, Entraînement & Force et Nutrition.
- Confirmer l’absence de débordement horizontal global et d’erreur d’affichage.
