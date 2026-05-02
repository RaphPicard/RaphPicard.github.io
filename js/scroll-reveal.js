// ===== SCROLL REVEAL =====
// IntersectionObserver surveille la visibilité des éléments dans le viewport
// et déclenche l'animation CSS (opacity + translateY) au bon moment
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    // isIntersecting : true dès que l'élément entre dans la zone de détection
    if (entry.isIntersecting) entry.target.classList.add('visible'); // ajoute 'visible' → déclenche la transition CSS définie dans .reveal
  });
}, {
  threshold: 0.08,                    // l'observer se déclenche dès que 8% de l'élément est visible à l'écran
  rootMargin: '0px 0px -30px 0px'    // réduit la zone de détection de 30px en bas — évite les animations trop précoces avant que l'élément soit vraiment perceptible
});
// Attache l'observer à chaque élément ayant la classe "reveal"
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
