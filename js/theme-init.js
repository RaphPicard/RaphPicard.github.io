// Anti-flash dark mode : s'exécute de façon synchrone avant le CSS
// pour appliquer le bon thème dès le premier rendu et éviter un flash blanc→noir.
// Ce fichier est chargé SANS defer ni async dans le <head>.
(function () {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches))
    document.documentElement.setAttribute('data-theme', 'dark');
})();
