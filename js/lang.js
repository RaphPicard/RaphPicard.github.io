// ===== CHANGEMENT DE LANGUE (EN ↔ FR) =====
let currentLang = 'en'; // variable d'état qui mémorise la langue courante entre les appels

function toggleLang() {
  // Ternaire : inverse la langue courante à chaque appel
  currentLang = currentLang === 'en' ? 'fr' : 'en';

  // Met à jour le libellé du bouton pour indiquer la langue vers laquelle basculer
  document.getElementById('langLabel').textContent = currentLang === 'en' ? 'FR' : 'EN';

  // Sélectionne tous les éléments portant un attribut data-en (système bilingue HTML)
  document.querySelectorAll('[data-en]').forEach(el => {
    const content = el.getAttribute('data-' + currentLang); // lit dynamiquement data-en ou data-fr selon la langue
    // innerHTML (pas textContent) pour interpréter les balises <strong> (gras) présentes dans les traductions
    if (content) el.innerHTML = content;
  });
}
