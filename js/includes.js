// ===== HTML INCLUDES (header + footer) =====
// Fetche en parallèle les deux partials HTML et les injecte dans les placeholders,
// puis initialise les comportements qui dépendent du DOM de la nav.

(function () {
  const headerPromise = fetch('html/header.html').then(r => r.text());
  const footerPromise = fetch('html/footer.html').then(r => r.text());

  Promise.all([headerPromise, footerPromise]).then(([headerHTML, footerHTML]) => {
    // Injection des partials dans les placeholders
    const navPlaceholder = document.getElementById('nav-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (navPlaceholder) navPlaceholder.innerHTML = headerHTML;
    if (footerPlaceholder) footerPlaceholder.innerHTML = footerHTML;

    // Ferme le menu mobile quand on clique sur un lien
    document.querySelectorAll('.nav-links a').forEach(link => {
      // nav-links a : tous les liens de navigation (par ex. <a href="#projets">Projets</a>)
      link.addEventListener('click', () => {
        document.getElementById('navLinks').classList.remove('open'); // ferme le menu en retirant la classe "open" qui affiche le menu sur mobile
      });
    });


    

    // ===== SURBRILLANCE DU LIEN NAV ACTIF AU SCROLL =====
    const sections = document.querySelectorAll('section[id]');          // toutes les sections avec un id (ancres de navigation)
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]'); // liens dont le href commence par "#" (ancres internes uniquement)

    window.addEventListener('scroll', () => {
      let current = ''; // id de la section actuellement en vue
      sections.forEach(s => {
        // offsetTop - 130 : compense la hauteur de la navbar fixe (68px) + marge visuelle de confort
        if (window.scrollY >= s.offsetTop - 130) current = s.id;
      });
      navLinks.forEach(a => {
        // Compare href="#monId" avec "#" + current pour colorer uniquement le lien de la section visible
        a.style.color = a.getAttribute('href') === '#' + current ? 'var(--accent)' : '';
      });
    }, { passive: true }); // passive: true — signale au navigateur que cet event ne bloquera jamais le scroll → meilleure performance

    // Sync de l'icône de thème après injection (thème déjà appliqué par theme-init.js)
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon && document.documentElement.getAttribute('data-theme') === 'dark') {
      themeIcon.textContent = '☀️';
    }
  });
})();
