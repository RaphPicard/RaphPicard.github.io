// ===== FILTRE PROJETS PAR TECHNOLOGIE =====
// IIFE (Immediately Invoked Function Expression) : encapsule le code dans une portée privée
// pour ne polluer aucune variable globale (window.* reste propre)
(function () {
  'use strict'; // active le mode strict : interdit les variables non déclarées, lève des erreurs plus tôt

  function init() {
    const filtersEl = document.querySelector('.project-filters');
    const grid = document.querySelector('.projects-grid');
    if (!filtersEl || !grid) return; // sécurité : sort si la section n'existe pas sur la page

    // Délégation d'événement : on écoute sur le conteneur parent plutôt que sur chaque bouton
    // → un seul listener suffit, même si des boutons sont ajoutés dynamiquement plus tard
    filtersEl.addEventListener('click', e => {
      // closest('[data-filter]') remonte l'arbre DOM depuis la cible du clic
      // → gère le cas où l'utilisateur clique sur un enfant du bouton (ex. texte interne)
      const btn = e.target.closest('[data-filter]');
      if (!btn) return; // clic sur le conteneur lui-même (pas sur un bouton) : on ignore

      // Réinitialise tous les boutons puis active uniquement celui cliqué
      filtersEl.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('pf-active'));
      btn.classList.add('pf-active');
      applyFilter(btn.dataset.filter, grid); // dataset.filter lit l'attribut data-filter="..."
    });
  }

  function applyFilter(filter, grid) { // retourne les cartes à afficher selon le filtre sélectionné (appel les fonctions showCard/hideCard)
    grid.querySelectorAll('.project-card').forEach(card => {    // Parcourt toutes les cartes de projet
      // data-tech="python ai data" → split(' ') → ['python', 'ai', 'data']
      // Le fallback '' évite une erreur si l'attribut data-tech est absent
      const tags = (card.dataset.tech || '').split(' ');
      const matches = filter === 'all' || tags.includes(filter);
      matches ? showCard(card) : hideCard(card);
    });
  }

  function hideCard(card) {
    if (card.classList.contains('pf-hidden')) return; // déjà caché : évite de relancer la transition
    card.classList.add('pf-hidden'); // déclenche le fondu/scale via CSS (transition: all sur .project-card)

    // { once: true } : le listener se supprime automatiquement après le premier déclenchement
    // La vérification guards contre un clic rapide qui aurait retiré pf-hidden entre-temps
    card.addEventListener('transitionend', () => {
      if (card.classList.contains('pf-hidden')) card.style.display = 'none'; // retire la carte du flux CSS grid → supprime le gap vide
    }, { once: true });
  }

  function showCard(card) {
    if (!card.classList.contains('pf-hidden')) return; // déjà visible : rien à faire
    card.style.display = ''; // remet la carte dans le flux (display: flex via .project-card)
    void card.offsetHeight;  // accès à offsetHeight force le navigateur à recalculer le layout (reflow)
                             // sans ça, le navigateur fusionnerait display='' et classList.remove en un seul rendu
                             // → la transition ne jouerait pas (état initial et final identiques du point de vue du moteur CSS)
    card.classList.remove('pf-hidden'); // déclenche le fondu inverse : opacity 0→1, scale 0.93→1
  }

  // Gère les deux cas de chargement :
  // - script chargé avant que le DOM soit prêt (readyState === 'loading') → on attend DOMContentLoaded
  // - script chargé après (defer) → le DOM est déjà prêt, on appelle init() directement
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
