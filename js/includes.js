// ===== HTML INCLUDES (header + footer) =====
// Fetche en parallèle les deux partials HTML et les injecte dans les placeholders,
// puis initialise les comportements qui dépendent du DOM de la nav.

(function () {
  // Détecte si la page courante est dans un sous-répertoire (ex : /html/projects.html)
  const inSubdir = window.location.pathname.includes('/html/');
  const base = inSubdir ? '../' : '';

  // r.ok vérifie que le statut HTTP est 2xx — fetch ne rejette pas sur un 404
  const headerPromise = fetch(base + 'html/header.html').then(r => { if (!r.ok) throw new Error('header'); return r.text(); });
  const footerPromise = fetch(base + 'html/footer.html').then(r => { if (!r.ok) throw new Error('footer'); return r.text(); });

  Promise.all([headerPromise, footerPromise]).then(([headerHTML, footerHTML]) => {
    const navPlaceholder = document.getElementById('nav-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (navPlaceholder) navPlaceholder.innerHTML = headerHTML;
    if (footerPlaceholder) footerPlaceholder.innerHTML = footerHTML;

    if (inSubdir) {
      // Ancres #section → ../index.html#section
      document.querySelectorAll('#nav-placeholder a[href^="#"]').forEach(a => {
        a.setAttribute('href', '../index.html' + a.getAttribute('href'));
      });
      // Liens relatifs (ex: html/projects.html) → ../html/projects.html
      document.querySelectorAll('#nav-placeholder a[href]:not([href^="#"]):not([href^="http"]):not([href^="/"])').forEach(a => {
        const href = a.getAttribute('href');
        if (!href.startsWith('..')) a.setAttribute('href', '../' + href);
      });
    }




    
    // Ferme le menu mobile quand on clique sur un lien
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        document.getElementById('navLinks').classList.remove('open');
      });
    });

    // ===== SURBRILLANCE DU LIEN NAV ACTIF AU SCROLL =====
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 130) current = s.id;
      });
      navLinks.forEach(a => {
        // classList.toggle(class, condition) : ajoute ou retire la classe selon la condition
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
    }, { passive: true });

    // Sync de l'icône de thème après injection
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon && document.documentElement.getAttribute('data-theme') === 'dark') {
      themeIcon.textContent = '☀️';
    }

    // Sync de la langue après injection du header (langLabel est dans le partial)
    if (typeof applyLang === 'function') applyLang();
  }).catch(() => {
    // Fallback minimal si le réseau bloque le chargement des partials
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (navPlaceholder) navPlaceholder.innerHTML = '<nav style="padding:1rem;text-align:center;color:var(--text)">Navigation indisponible</nav>';
  });
})();
