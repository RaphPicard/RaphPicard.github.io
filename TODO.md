Tu vas améliorer mon portfolio personnel (fichier index.html déjà existant).

## Contexte
Je suis Raphaël Picard, étudiant ingénieur en 4ème année à CPE Lyon, spécialisation Conception Logicielle et Big Data. Je suis passionné d'IA (agents, MCP, A2A, orchestrateurs), je maîtrise Python, Docker, SQL, Java, AWS (certification en cours). Mon prochain stage : Mitsubishi Fuso Truck and Bus Corporation à Kawasaki, Japon (juil 2026 – fév 2027), ingénieur software dans l'équipe digitalisation.

## Liens importants
- GitHub : https://github.com/Raphouman
- LinkedIn : https://www.linkedin.com/in/raphael-picard-/
- Email : raphael.picard@cpe.fr

## Style & Design attendu
- Style Apple/Linear : épuré, moderne, propre
- Typographies : Sora (body) + Lora (titres) + JetBrains Mono (code/labels)
- Palette : fond off-white #F7F6F3, accents bleu #1D4ED8, texte #0D1117
- Animations subtiles au scroll (déjà en place), pas d'effets trop agressifs
- Bilingue EN/FR avec switch fonctionnel (déjà en place via data-en / data-fr)

## Ce que tu dois améliorer / ajouter

1. **Responsive mobile** : vérifier et corriger tous les breakpoints, la navbar mobile, les grilles de projets et de compétences sur petit écran
(FAIT : a tester sur mon tel)

2. **Photo de profil** : prévoir un emplacement propre dans le hero et dans la navbar (avatar rond), avec un placeholder élégant en attendant que je fournisse la photo (initiales RP dans un cercle dégradé)

3. **Performance** : vérifier qu'aucune ressource bloque le rendu, que les Google Fonts sont chargées de manière optimale (font-display: swap)


4. **Dark mode** : ajouter un toggle light (actual)/dark mode discret dans la navbar (sans casser le design actuel).
Essayes de réutiliser le CSS existant au maximum pour éviter de dupliquer les styles, et de faire en sorte que le dark mode soit une simple inversion des couleurs (fond sombre #0D1117, texte clair #F7F6F3, accents plus doux #3B82F6) , l'esthetique Apple/Linear doit être préservée dans les deux modes, mais le mode dark peut faire penser un peu au **hacking**. 
FAIT ==> Appuyé sur le côté hacking (animation de glitch, vert fluo pour les accents, font JetBrains Mono pour tout le texte, etc.) ?

5. **SEO basique** : ajouter les balises meta (description, og:title, og:image, og:description, twitter:card) pour que le portfolio soit bien partageable sur LinkedIn notamment


6. **Section "Projets" améliorée** : ajouter un système de filtres par technologie (Python, Docker, AI, Web...) qui filtre les cards dynamiquement avec une animation fluide. Ce qui veut dire que chaque projet doit être taggé avec des data-tech="python docker ai" par exemple, et que les boutons de filtre déclenchent une fonction JavaScript qui affiche/masque les projets correspondants.

## Ce qu'il ne faut PAS toucher

- Le système de switch de langue EN/FR (data-en / data-fr)
- Les liens GitHub, LinkedIn, email (si tu peux modifier en raphael.picard@cpe.fr)
- Le style général Apple/Linear

## Contraintes techniques
- Il faudra tout séparer en plusieurs dossiers (html, css, js, assets) pour une meilleure organisation. Pourquoi pas MVC, SEP si cela te semble nécessaire et utile ?
- Compatible GitHub Pages (static HTML pur)
- Doit fonctionner sans serveur backend 

# TODO

Lis d'abord l'intégralité du fichier index.html avant de commencer.
- Procèdes améliorations par améliorations, que je puisse valider le résultat avant de passer à la suivante.
- Avant de commencer, assure-toi que tu as une copie de sauvegarde du fichier original (index.html) au cas où tu devrais revenir en arrière.

- Avant la 1ère amélioration, tu vas d'abord réorganiser le projet en créant les dossiers suivants à la racine du projet :
  - `html/` : pour le fichier index.html (ou plusieurs fichiers HTML si besoin)
  - `css/` : pour les fichiers CSS
  - `js/` : pour les fichiers JavaScript
  - `assets/` : pour les images, icônes, etc.
Et séparer le contenu du fichier index.html en conséquence (déplacer les styles CSS dans un fichier css/style.css, les scripts JavaScript dans js/script.js, et les images dans assets/). Assure-toi que les liens dans index.html sont mis à jour pour refléter cette nouvelle organisation.