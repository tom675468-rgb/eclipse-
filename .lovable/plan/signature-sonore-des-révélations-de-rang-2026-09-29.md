# Signature sonore des révélations de rang

## Objectif
Accompagner chaque animation plein écran d’une courte signature sonore cinématique cohérente avec son rythme et immédiatement interrompue si l’utilisateur passe l’animation.

## Mise en œuvre
- Déclencher un impact grave, une montée brillante et un accord de victoire au moment de la révélation de l’emblème.
- Faire évoluer la richesse et la hauteur du son selon le rang atteint, de Bronze à Olympien.
- Synchroniser la séquence sur les 3,8 secondes existantes, sans téléchargement ni attente réseau.
- Arrêter instantanément tout son lors d’un clic, toucher, appui clavier ou fermeture automatique.
- Ne rien jouer si le navigateur bloque le son ou si la préférence de réduction des animations est activée.

## Vérification
- Enregistrer une performance et confirmer le démarrage et l’arrêt du son avec l’animation.
- Passer l’animation immédiatement et vérifier que le son s’arrête sans continuer en arrière-plan.
