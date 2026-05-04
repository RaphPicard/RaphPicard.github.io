(function () {
  const root = document.documentElement;

  // Position hors écran par défaut (pas de halo avant le premier mouvement)
  root.style.setProperty('--mx', '-9999px');
  root.style.setProperty('--my', '-9999px');

  let rafId = null;
  let cx = -9999, cy = -9999;

  document.addEventListener('mousemove', e => {
    cx = e.clientX;
    cy = e.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        root.style.setProperty('--mx', cx + 'px');
        root.style.setProperty('--my', cy + 'px');
        rafId = null;
      });
    }
  });

  // Masquer le halo quand le curseur quitte la fenêtre
  document.addEventListener('mouseleave', () => {
    root.style.setProperty('--mx', '-9999px');
    root.style.setProperty('--my', '-9999px');
  });
})();
