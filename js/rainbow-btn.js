// Inclinaison 3D du bouton arc-en-ciel : il "regarde" vers le curseur
document.querySelectorAll('.btn-rainbow').forEach(btn => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const MAX = 25; // angle max en degrés

  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    btn.style.setProperty('--ry', `${x * MAX}deg`);
    btn.style.setProperty('--rx', `${-y * MAX}deg`);
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.setProperty('--rx', '0deg');
    btn.style.setProperty('--ry', '0deg');
  });
});
