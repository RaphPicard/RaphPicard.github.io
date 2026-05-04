// ===== CHANGEMENT DE LANGUE (EN ↔ FR) =====
// Lit la langue persistée en localStorage, sinon 'en' par défaut
let currentLang = localStorage.getItem('lang') || 'en';

// Applique la langue courante à tous les éléments bilingues du DOM
function applyLang() {
  // Met à jour le libellé du bouton pour indiquer la langue vers laquelle basculer
  const label = document.getElementById('langLabel');
  if (label) label.textContent = currentLang === 'en' ? 'FR' : 'EN'; // guard : le header est injecté en async

  // Sélectionne tous les éléments portant un attribut data-en (système bilingue HTML)
  document.querySelectorAll('[data-en]').forEach(el => {
    const content = el.getAttribute('data-' + currentLang); // lit dynamiquement data-en ou data-fr selon la langue
    // innerHTML (pas textContent) pour interpréter les balises <strong> (gras) présentes dans les traductions
    if (content) el.innerHTML = content;
  });
}

function toggleLang() {
  // Ternaire : inverse la langue courante à chaque appel
  currentLang = currentLang === 'en' ? 'fr' : 'en';
  localStorage.setItem('lang', currentLang); // persiste le choix entre les pages
  applyLang();
  // Réinitialise les typewriters pour qu'ils basculent immédiatement dans la nouvelle langue
  if (typeof resetTypewriters === 'function') resetTypewriters();
}

// Applique la langue sauvegardée dès que le DOM statique est prêt
// (le header injecté en async appelle applyLang() une seconde fois via includes.js)
document.addEventListener('DOMContentLoaded', applyLang);
