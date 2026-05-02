// ===== DARK MODE =====
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeIcon').textContent = '🌙';
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeIcon').textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  }
}
// Sync de l'icône au chargement (le thème est déjà appliqué par le script inline du <head>)
if (document.documentElement.getAttribute('data-theme') === 'dark')
  document.getElementById('themeIcon').textContent = '☀️';
