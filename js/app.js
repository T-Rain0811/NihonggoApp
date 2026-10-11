// Main Application Controller & Router
import { renderHome } from './views/home.js?v=52';
import { renderVocab } from './views/vocab.js?v=52';
import { renderGrammar } from './views/grammar.js?v=52';
import { renderCustomVocab } from './views/customVocab.js?v=52';
import { renderDrill } from './views/drill.js?v=52';
import { renderExtraVocab } from './views/extraVocab.js?v=52';
import { SettingsModal } from './services/settingsModal.js?v=52';
import { GitHubSync } from './services/githubSync.js?v=52';

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
    if (viewName === 'custom') {
      this.state.vocabCategory = 'custom';
      this.state.selectedVocabLesson = 'custom';
      viewName = 'vocab';
    }

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
        this.state.vocabCategory = 'custom';
        this.state.selectedVocabLesson = 'custom';
        renderVocab(this.container, this.state, (v) => this.navigate(v));
        break;
      case 'drill':
        renderDrill(this.container, this.state, (v) => this.navigate(v));
        break;
      case 'extra':
        this.state.vocabCategory = 'prefix';
        renderVocab(this.container, this.state, (v) => this.navigate(v));
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

    // Settings modal button
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      SettingsModal.show(() => {
        this.updateSettingsIndicator();
        // Re-render current view if in custom or vocab to sync indicator
        if (['custom', 'vocab'].includes(this.state.currentView)) {
          this.renderCurrentView();
        }
      });
    });

    this.updateSettingsIndicator();
  }

  updateSettingsIndicator() {
    const hasToken = GitHubSync.hasToken();
    const dot = document.getElementById('header-settings-dot');
    if (dot) {
      if (hasToken) dot.classList.add('connected');
      else dot.classList.remove('connected');
    }
  }

  setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js?v=52')
        .then(() => console.log('Service Worker registered.'))
        .catch(err => console.log('Service Worker registration failed:', err));
    }
  }
}

// Start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.jlptApp = new App();
});
