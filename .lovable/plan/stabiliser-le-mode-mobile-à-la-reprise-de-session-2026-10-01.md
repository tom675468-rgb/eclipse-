# Stabiliser le mode Mobile à la reprise de session

## Résultat attendu
- Une session déjà connectée démarre directement avec la bonne largeur mobile, sans flash de vue bureau.
- Le choix Mobile est appliqué avant l’affichage du contenu principal et reste stable après rechargement.
- Le choix manuel Ordinateur reste disponible depuis Réglages.

## Modifications
- Séparer la préférence enregistrée du mode effectivement appliqué au premier rendu.
- Détecter immédiatement un téléphone à partir de plusieurs signaux fiables, sans attendre un effet après affichage.
- Mémoriser localement le choix manuel Mobile/Ordinateur afin de l’appliquer avant la restauration distante du compte.
- Piloter le viewport, les classes et la navigation depuis une seule valeur d’affichage résolue.

## Vérification
- Recharger plusieurs fois une session active sur une largeur téléphone.
- Confirmer que le viewport, le conteneur et la grille restent mobiles dès le premier rendu.
- Confirmer que le basculement manuel Ordinateur puis Mobile fonctionne toujours.
