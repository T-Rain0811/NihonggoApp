// Main Application Controller & Router
import { renderHome } from './views/home.js?v=63';
import { renderVocab } from './views/vocab.js?v=63';
import { renderGrammar } from './views/grammar.js?v=63';
import { renderCustomVocab } from './views/customVocab.js?v=63';
import { renderDrill } from './views/drill.js?v=63';
import { renderExtraVocab } from './views/extraVocab.js?v=63';
import { SettingsModal } from './services/settingsModal.js?v=63';
import { GitHubSync } from './services/githubSync.js?v=63';

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
    this.checkUrlTokenSync();
    this.setupNavigation();
    this.setupScrollToTop();
    this.setupPWA();

    // Render home view immediately
    this.navigate('home');

    // Load data in background
    await this.loadAllData();
  }

  checkUrlTokenSync() {
    try {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      let incomingToken = '';
      if (hash.includes('token=')) {
        incomingToken = decodeURIComponent(hash.split('token=')[1].split('&')[0]);
      } else if (search.includes('token=')) {
        const params = new URLSearchParams(search);
        incomingToken = params.get('token') || '';
      } else if (hash.includes('sync=')) {
        incomingToken = atob(decodeURIComponent(hash.split('sync=')[1].split('&')[0]));
      }

      if (incomingToken && (incomingToken.startsWith('ghp_') || incomingToken.startsWith('github_pat_'))) {
        GitHubSync.setToken(incomingToken);
        history.replaceState(null, '', window.location.pathname);
        this.updateSettingsIndicator();
      }
    } catch (e) {
      console.warn('URL token sync check error:', e);
    }
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

    // Nếu đang trong bài thi Drill chưa nộp mà người dùng bấm chuyển trang/tab khác
    if (window.__isDrillActive && window.__isDrillActive() && viewName !== 'drill') {
      if (window.__showDrillQuitModal) {
        window.__showDrillQuitModal(() => {
          if (window.__drillCleanup) {
            window.__drillCleanup();
          }
          this.executeNavigate(viewName);
        });
        return;
      }
    }

    this.executeNavigate(viewName);
  }

  executeNavigate(viewName) {
    // Dọn dẹp timer bài thi Drill nếu người dùng chuyển tab/rời khỏi màn Drill
    if (window.__drillCleanup) {
      try {
        window.__drillCleanup();
      } catch (e) {
        console.error('Error in drill cleanup:', e);
      }
    }

    this.state.currentView = viewName;

    // Reset cuộn trang ngay lập tức về đỉnh trang (xóa vị trí cuộn của trang trước)
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

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

    // Ẩn nút cuộn lên khi vừa chuyển sang trang mới
    const btnScrollTop = document.getElementById('btn-scroll-top');
    if (btnScrollTop) btnScrollTop.classList.remove('visible');

    // Reset cuộn lại một lần nữa sau khi DOM render xong để chắc chắn không bị dính vị trí cũ
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
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

  setupScrollToTop() {
    const btnScrollTop = document.getElementById('btn-scroll-top');
    if (!btnScrollTop) return;

    window.addEventListener('scroll', () => {
      const top = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (top > 250) {
        btnScrollTop.classList.add('visible');
      } else {
        btnScrollTop.classList.remove('visible');
      }
    }, { passive: true });

    btnScrollTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.scrollTop = 0;
    });
  }

  setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js?v=62')
        .then(() => console.log('Service Worker registered.'))
        .catch(err => console.log('Service Worker registration failed:', err));
    }
  }
}

// Start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.jlptApp = new App();
});
