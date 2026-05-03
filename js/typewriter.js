// ===== TYPEWRITER — Multi-instance =====
//
// Pour ajouter un typewriter n'importe où :
//   1. Déclarer les mots dans WORDS avec un identifiant unique
//   2. Dans le HTML, ajouter :
//        <p class="hero-typewriter" data-tw="monId">
//          <span class="tw-prefix" data-en="..." data-fr="...">...</span>
//          <span class="tw-word"></span>
//          <span class="tw-cursor" aria-hidden="true">|</span>
//        </p>

const WORDS = {
  hero: {
    en: ['AI agents', 'data pipelines', 'ML systems', 'agentic workflows', 'web tools'],
    fr: ['des agents IA', 'des pipelines data', 'des systèmes ML', 'des workflows agentiques', 'des outils web']
  },
  good_practices: {
    en:['clean code', 'MVC' ,'RESTful APIs', 'SOLID', 'design patterns', 'SEP', 'clear & complete README', 'unit testing'],
    fr: ['du code propre', 'MVC', 'API REST', 'SOLID', 'modèles de conception', 'SEP', 'README clair et complet', 'test unitaire']
  }
  // Exemple pour un deuxième typewriter :
  // about: {
  //   en: ['curious', 'motivated', 'adaptable'],
  //   fr: ['curieux', 'motivé', 'adaptable']
  // },
};

const TYPE_SPEED   = 80;
const DELETE_SPEED = 45;
const PAUSE_FULL   = 1800; // pause après mot complet
const PAUSE_EMPTY  = 350;  // pause avant le mot suivant

function getLang() {
  return (typeof currentLang !== 'undefined') ? currentLang : 'en';
}

function createInstance(wordEl, key, startDelay) {
  const getList = () => WORDS[key][getLang()] ?? WORDS[key].en;
  let wordIndex = 0, charIndex = 0, isDeleting = false;

  function tick() {
    const list = getList();
    const word = list[wordIndex % list.length];

    if (isDeleting) {
      wordEl.textContent = word.slice(0, --charIndex);
      if (charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % list.length;
        setTimeout(tick, PAUSE_EMPTY);
        return;
      }
      setTimeout(tick, DELETE_SPEED);
    } else {
      wordEl.textContent = word.slice(0, ++charIndex);
      if (charIndex === word.length) {
        isDeleting = true;
        setTimeout(tick, PAUSE_FULL);
        return;
      }
      setTimeout(tick, TYPE_SPEED);
    }
  }

  setTimeout(tick, startDelay);
}

document.querySelectorAll('[data-tw]').forEach((container, i) => {
  const key = container.getAttribute('data-tw');
  if (!WORDS[key]) return;
  const wordEl = container.querySelector('.tw-word');
  if (!wordEl) return;
  createInstance(wordEl, key, 900 + i * 200);
});
