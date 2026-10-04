# Corriger la largeur mobile

## Résultat attendu
- Le mode Mobile utilise toute la largeur réellement disponible, sans colonne artificiellement limitée ni bandes latérales.
- Le contenu conserve des marges intérieures propres et les cartes restent lisibles bord à bord.
- Le mode Ordinateur reste inchangé.

## Modifications
- Retirer la limite fixe de 430 px et le centrage du conteneur principal en mode Mobile.
- Forcer le conteneur et le contenu principal à `100%`, avec une largeur minimale nulle et des marges latérales adaptées.
- Aligner également l’en-tête et la barre de navigation inférieure sur toute la largeur mobile.
- Neutraliser, uniquement en mode Mobile, les limites `max-width` des conteneurs de page principaux qui rétrécissent inutilement le contenu.

## Vérification
- Tester avec une session active en mode Mobile sur un écran étroit et sur une fenêtre large forcée en Mobile.
- Vérifier l’absence de bandes latérales, de contenu coupé et de défilement horizontal.
