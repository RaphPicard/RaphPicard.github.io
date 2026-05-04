// ===== LIKE BUTTON =====
// Persistance via localStorage : le like et le compteur survivent aux rechargements de page.
// Chaque navigateur a son propre compteur — une persistance globale (visible par tous)
// nécessiterait un service externe (Firebase, Supabase…).
(function () {
  'use strict';

  const KEY_LIKED = 'portfolio_has_liked'; // '1' si ce navigateur a déjà liké
  const KEY_COUNT = 'portfolio_like_count'; // nombre de likes stocké localement

  // Valeur de départ affichée à la première visite — donne une impression d'activité initiale
  const BASE_COUNT = 42;

  function init() {
    const btn     = document.getElementById('likeBtn');
    const countEl = document.getElementById('likeCount');
    const iconEl  = btn ? btn.querySelector('.like-icon') : null;
    if (!btn || !countEl || !iconEl) return;

    // Lit l'état persisté (ou initialise à la valeur de base)
    let count    = parseInt(localStorage.getItem(KEY_COUNT) ?? BASE_COUNT, 10);
    let hasLiked = localStorage.getItem(KEY_LIKED) === '1';

    countEl.textContent = count;
    if (hasLiked) {
      btn.classList.add('liked');
      iconEl.textContent = '♥'; // cœur plein si déjà liké
    }

    btn.addEventListener('click', () => {
      if (hasLiked) {
        // Délike : revient à l'état initial
        count--;
        hasLiked = false;
        localStorage.setItem(KEY_COUNT, count);
        localStorage.removeItem(KEY_LIKED);

        countEl.textContent = count;
        iconEl.textContent  = '♡';
        btn.classList.remove('liked');
      } else {
        // Like
        count++;
        hasLiked = true;
        localStorage.setItem(KEY_COUNT, count);
        localStorage.setItem(KEY_LIKED, '1');

        countEl.textContent = count;
        iconEl.textContent  = '♥';
        btn.classList.add('liked');

        // Animation pop uniquement au like (pas au délike)
        btn.classList.add('like-pop');
        btn.addEventListener('animationend', () => btn.classList.remove('like-pop'), { once: true });
      }
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();