// Main Application Controller & Router
import { renderHome } from './views/home.js?v=35';
import { renderVocab } from './views/vocab.js?v=35';
import { renderGrammar } from './views/grammar.js?v=35';
import { renderCustomVocab } from './views/customVocab.js?v=28';
import { renderDrill } from './views/drill.js?v=30';
import { renderExtraVocab } from './views/extraVocab.js?v=24';

class App {
  constructor() {
    this.state = {
      currentView: 'home',
      vocabData: null,
      grammarData: null,
      extraVocabData: null,
      meta: null,
      drillsVocabList: [],
      drillsGrammarList: [],
      customVocab: JSON.parse(localStorage.getItem('jlpt_custom_vocab') || '[]'),
      selectedVocabLesson: '1',
      selectedGrammarSession: '1'
    };

    this.container = document.getElementById('view-container');
    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupPWA();

    // Render home view immediately
    this.navigate('home');

    // Load data in background
    await this.loadAllData();
  }

  async loadAllData() {
    try {
      const [vocabRes, grammarRes, extraRes, metaRes, drillsVocabRes, drillsGrammarRes, personalRes] = await Promise.all([
        fetch('data/vocab_data.json?_t=' + Date.now()).then(r => r.json()).catch(() => null),
        fetch('data/grammar_data.json').then(r => r.json()).catch(() => null),
        fetch('data/extra_vocab_data.json').then(r => r.json()).catch(() => null),
        fetch('data/meta.json').then(r => r.json()).catch(() => null),
        fetch('data/drills_vocab_list.json').then(r => r.json()).catch(() => []),
        fetch('data/drills_grammar_list.json').then(r => r.json()).catch(() => []),
        fetch('data/personal_vocab.json?_t=' + Date.now()).then(r => r.json()).catch(() => null)
      ]);

      // Apply overrides to vocab_data if any
      const overrides = JSON.parse(localStorage.getItem('jlpt_vocab_overrides') || '{}');
      if (vocabRes && Object.keys(overrides).length > 0) {
        for (const [key, newMeaning] of Object.entries(overrides)) {
          const [lesson, word] = key.split(':::');
          if (vocabRes[lesson]) {
            const item = vocabRes[lesson].find(w => w.word === word);
            if (item) item.meaning = newMeaning;
          }
        }
      }

      this.state.vocabData = vocabRes;
      this.state.grammarData = grammarRes;
      this.state.extraVocabData = extraRes;
      this.state.meta = metaRes;
      this.state.drillsVocabList = drillsVocabRes;
      this.state.drillsGrammarList = drillsGrammarRes;

      // Personal vocab: use personal_vocab.json if available
      if (Array.isArray(personalRes) && personalRes.length > 0) {
        this.state.customVocab = personalRes;
        localStorage.setItem('jlpt_custom_vocab', JSON.stringify(personalRes));
      } else {
        this.state.customVocab = JSON.parse(localStorage.getItem('jlpt_custom_vocab') || '[]');
      }

      // Re-render current view with data loaded
      this.renderCurrentView();
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }

  navigate(viewName) {
    this.state.currentView = viewName;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update active state in top & bottom nav
    document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(el => {
      const target = el.getAttribute('data-target');
      if (target === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    this.renderCurrentView();
  }

  renderCurrentView() {
    if (!this.container) return;

    switch (this.state.currentView) {
      case 'home':
        renderHome(this.container, this.state, (v) => this.navigate(v));
        break;
      case 'vocab':
        renderVocab(this.container, this.state, (v) => this.navigate(v));
        break;
      case 'grammar':
        renderGrammar(this.container, this.state, (v) => this.navigate(v));
        break;
      case 'custom':
        renderCustomVocab(this.container, this.state, (v) => this.navigate(v));
        break;
      case 'drill':
        renderDrill(this.container, this.state, (v) => this.navigate(v));
        break;
      case 'extra':
        renderExtraVocab(this.container, this.state, (v) => this.navigate(v));
        break;
      default:
        renderHome(this.container, this.state, (v) => this.navigate(v));
    }
  }

  setupNavigation() {
    // Top brand link
    document.getElementById('brand-link')?.addEventListener('click', () => this.navigate('home'));

    // Desktop nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        if (target) this.navigate(target);
      });
    });

    // Mobile nav links
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-target');
        if (target) this.navigate(target);
      });
    });
  }

  setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registered.'))
        .catch(err => console.log('Service Worker registration failed:', err));
    }
  }
}

// Start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.jlptApp = new App();
});
