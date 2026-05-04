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
  },
  contact: {
    en: ['YOU and ME !', 'for the FUTURE !', 'TOGETHER !'],
    fr: ['VOUS et MOI !', 'pour le FUTUR !', 'ensemble']
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

// Guard : currentLang est défini dans lang.js — ce fallback évite un crash si l'ordre de chargement change
function getLang() {
  return (typeof currentLang !== 'undefined') ? currentLang : 'en';
}

const twResets = []; // stocke les fonctions reset de chaque instance pour resetTypewriters()

function createInstance(wordEl, key, startDelay) {
  // ?? : fallback sur l'anglais si la langue courante n'a pas de liste déclarée pour cette clé
  const getList = () => WORDS[key][getLang()] ?? WORDS[key].en;
  let wordIndex = 0, charIndex = 0, isDeleting = false;
  let tid = null;    // référence au setTimeout courant, pour pouvoir l'annuler
  let active = true; // drapeau : false = la tick() en cours s'arrête proprement

  function tick() {
    if (!active) return; // annulation propre : ne replanifie pas si l'instance a été stoppée
    const list = getList();
    const word = list[wordIndex % list.length]; // % : boucle circulaire sur la liste de mots

    if (isDeleting) {
      wordEl.textContent = word.slice(0, --charIndex); // recule d'un caractère à chaque tick
      if (charIndex === 0) {                           // mot entièrement effacé → passe au suivant
        isDeleting = false;
        wordIndex = (wordIndex + 1) % list.length;     // avance et boucle sur la liste
        tid = setTimeout(tick, PAUSE_EMPTY);
        return;
      }
      tid = setTimeout(tick, DELETE_SPEED);
    } else {
      wordEl.textContent = word.slice(0, ++charIndex); // avance d'un caractère à chaque tick
      if (charIndex === word.length) {                 // mot entièrement tapé → pause puis efface
        isDeleting = true;
        tid = setTimeout(tick, PAUSE_FULL);
        return;
      }
      tid = setTimeout(tick, TYPE_SPEED);
    }
  }

  // Réinitialise l'instance : stoppe le cycle en cours et repart de zéro dans la langue courante
  function reset() {
    active = false;         // coupe le cycle : le prochain tick() sortira immédiatement
    clearTimeout(tid);      // annule le setTimeout déjà planifié pour ne pas avoir deux cycles en parallèle
    wordEl.textContent = '';
    wordIndex = 0; charIndex = 0; isDeleting = false;
    active = true;
    tid = setTimeout(tick, PAUSE_EMPTY);
  }

  twResets.push(reset); // enregistre le reset pour pouvoir l'appeler depuis toggleLang()
  tid = setTimeout(tick, startDelay);
}

// Appelé par toggleLang() pour redémarrer tous les typewriters dans la nouvelle langue
function resetTypewriters() {
  twResets.forEach(reset => reset());
}

document.querySelectorAll('[data-tw]').forEach((container, i) => {
  const key = container.getAttribute('data-tw');
  if (!WORDS[key]) return; // ignore les data-tw sans entrée dans WORDS
  const wordEl = container.querySelector('.tw-word');
  if (!wordEl) return;
  createInstance(wordEl, key, 900 + i * 200); // décalage de 200 ms entre chaque instance pour éviter la synchronisation
});
