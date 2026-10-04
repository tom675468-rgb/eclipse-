# Stabiliser la coque et la navigation mobile

## Objectif
Empêcher tout étirement horizontal au premier rendu, après rechargement ou reprise de session, sans modifier l’affichage ordinateur.

## Modifications
- Verrouiller la coque mobile et son contenu à la largeur disponible avec `w-full`, `max-w-full`, `min-w-0` et `box-border`.
- Recaler la barre inférieure avec des marges tenant compte des zones sûres gauche, droite et basse, sans calcul centré fragile.
- Contraindre la grille à cinq colonnes égales et chaque bouton à `min-w-0`, avec libellés tronqués sans agrandir la barre.
- Conserver un espace bas calculé sur la barre et l’encoche pour que le contenu reste visible.

## Validation
- Tester avec une session active sur un écran téléphone après plusieurs rechargements.
- Vérifier que la coque, le contenu et la barre restent dans le viewport, sans défilement horizontal.
- Contrôler que les cinq boutons restent alignés et que l’affichage ordinateur demeure inchangé.
