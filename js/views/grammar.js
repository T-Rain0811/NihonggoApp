// Grammar View Component (Embedded Video, Split Layout, Multi-session Selection & Quizzes)
import { SpeechHelper } from '../speech.js';

export function renderGrammar(container, state, navigate) {
  const sessionKeys = state.grammarData ? Object.keys(state.grammarData).sort((a, b) => parseInt(a) - parseInt(b)) : [];

  let currentSession = state.selectedGrammarSession || '1';
  if (!sessionKeys.includes(currentSession) && sessionKeys.length > 0) {
    currentSession = sessionKeys[0];
  }

  let quizSessions = new Set(
    (state.selectedGrammarSessions && state.selectedGrammarSessions.length > 0)
      ? state.selectedGrammarSessions
      : [currentSession]
  );

  let currentTab = state.grammarTab || 'study'; // 'study' (Video + Patterns) or 'quiz'
  let quizIndex = 0;
  let quizScore = 0;
  let quizList = [];
  let quizQuestionCount = 20; // Default to 20 questions
  let isMobileSheetOpen = false;

  const labels = (state.meta && state.meta.lesson_labels) || {
    "1": "Bài 1 (1–20)", "2": "Bài 2 (21–40)", "3": "Bài 3 (41–60)", "4": "Bài 4 (61–80)",
    "5": "Bài 5 (81–89)", "6": "Bài 6 (90–111)", "7": "Bài 7 (112–130)", "8": "Bài 8 (131–150)"
  };

  const videoUrls = (state.meta && state.meta.video_urls) || {
    "1": "https://res.cloudinary.com/ustliutq/video/upload/v1789351058/lesson_1.mp4",
    "2": "https://res.cloudinary.com/ustliutq/video/upload/v1789351105/lesson_2.mp4",
    "3": "https://res.cloudinary.com/ustliutq/video/upload/v1789350758/lesson_3.mp4",
    "4": "https://res.cloudinary.com/ustliutq/video/upload/v1789351204/lesson_4.mp4",
    "5": "https://res.cloudinary.com/ustliutq/video/upload/v1789350721/lesson_5.mp4",
    "6": "https://res.cloudinary.com/ustliutq/video/upload/v1789351317/lesson_6.mp4",
    "7": "https://res.cloudinary.com/ustliutq/video/upload/v1789351366/lesson_7.mp4",
    "8": "https://res.cloudinary.com/ustliutq/video/upload/v1789350854/lesson_8.mp4"
  };

  function getGrammarItems(sessionKey) {
    if (!state.grammarData) return [];
    return state.grammarData[sessionKey || currentSession] || [];
  }

  function getAllSelectedQuizzes() {
    if (!state.grammarData) return [];
    const sessions = Array.from(quizSessions).sort((a, b) => parseInt(a) - parseInt(b));
    const all = [];
    sessions.forEach(s => {
      const patterns = state.grammarData[s] || [];
      patterns.forEach(p => {
        if (p.quizzes && Array.isArray(p.quizzes)) {
          p.quizzes.forEach(q => {
            all.push({ ...q, _session: s, _pattern: p.pattern });
          });
        }
      });
    });
    return all;
  }

  function getSelectedSummaryText() {
    const arr = Array.from(quizSessions).sort((a, b) => parseInt(a) - parseInt(b));
    if (arr.length === 0) return 'Chưa chọn bài';
    if (arr.length === 1) return labels[arr[0]] || `Bài ${arr[0]}`;
    if (arr.length === sessionKeys.length) return `Tất cả 8 bài`;
    return `${arr.length} bài (Bài ${arr.join(', ')})`;
  }

  function selectSession(sessionKey) {
    currentSession = sessionKey;
    state.selectedGrammarSession = currentSession;
    closeSheet();
    saveLastStudied();
    updateSidebarItems();
    renderContent();
  }

  function saveLastStudied() {
    try {
      localStorage.setItem('jlpt_last_studied', JSON.stringify({
        type: 'grammar',
        session: currentSession,
        sessions: Array.from(quizSessions),
        label: `Ngữ pháp ${labels[currentSession] || 'Bài ' + currentSession}`,
        tab: currentTab
      }));
    } catch (e) { }
  }

  function openSheet() {
    isMobileSheetOpen = true;
    const overlay = document.getElementById('sheet-overlay-grammar');
    const sheet = document.getElementById('mobile-sheet-grammar');
    if (overlay) overlay.classList.add('open');
    if (sheet) sheet.classList.add('open');
  }

  function closeSheet() {
    isMobileSheetOpen = false;
    const overlay = document.getElementById('sheet-overlay-grammar');
    const sheet = document.getElementById('mobile-sheet-grammar');
    if (overlay) overlay.classList.remove('open');
    if (sheet) sheet.classList.remove('open');
  }

  // ─── QUIZ MULTI-LESSON SELECTION MODAL ──────────────────────────────────────
  function showGrammarQuizSelectionModal() {
    const existing = document.getElementById('modal-grammar-quiz-picker');
    if (existing) existing.remove();

    let tempSelected = new Set(quizSessions);
    if (tempSelected.size === 0) tempSelected.add(currentSession);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'modal-grammar-quiz-picker';

    function updateModalUI() {
      const counter = modal.querySelector('#modal-quiz-counter');
      if (counter) {
        counter.textContent = `Đã chọn: ${tempSelected.size} bài`;
      }

      const confirmBtn = modal.querySelector('#btn-confirm-grammar-quiz');
      if (confirmBtn) {
        confirmBtn.disabled = tempSelected.size === 0;
      }

      modal.querySelectorAll('[data-modal-session]').forEach(cb => {
        const k = cb.getAttribute('data-modal-session');
        const isChecked = tempSelected.has(k);
        cb.checked = isChecked;
        const parentLabel = cb.closest('label');
        if (parentLabel) {
          parentLabel.style.background = isChecked ? 'var(--toan-light-blue)' : '#fff';
          parentLabel.style.borderColor = isChecked ? 'var(--fuji-blue-lake)' : 'var(--glass-border-subtle)';
          parentLabel.style.color = isChecked ? 'var(--toan-navy)' : 'var(--text-primary)';
          parentLabel.style.fontWeight = isChecked ? '700' : '500';
        }
      });
    }

    modal.innerHTML = `
      <div class="modal-box" style="max-width:520px; max-height:88vh; display:flex; flex-direction:column; padding:20px; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--glass-border-subtle);">
          <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-title); margin:0;">🎯 Quizzes Ngữ Pháp</h3>
          <button type="button" class="btn-close-sheet" id="btn-close-quiz-modal" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:var(--text-muted);">✕</button>
        </div>

        <div style="overflow-y:auto; flex:1; padding-right:4px;">
          <!-- Lựa chọn 1: Làm nhanh bài đang xem -->
          <div id="btn-quick-quiz-current" style="background:var(--toan-light-blue); border:1.5px solid var(--fuji-blue-lake); border-radius:var(--radius-md); padding:10px 14px; cursor:pointer; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; transition:all 0.15s ease;">
            <div>
              <div style="font-weight:800; color:var(--toan-navy); font-size:0.95rem;">
                ⚡ Quizzes ${labels[currentSession] || 'Bài ' + currentSession}
              </div>
            </div>
            <button class="btn btn-primary btn-sm" style="font-size:0.8rem; padding:6px 12px; pointer-events:none; flex-shrink:0;">Làm ngay →</button>
          </div>

          <!-- Lựa chọn 2: Chọn gộp nhiều bài -->
          <div style="font-size:0.88rem; font-weight:800; color:var(--text-title); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <span>Chọn gộp bài:</span>
            <span id="modal-quiz-counter" style="color:var(--fuji-blue-deep); font-size:0.84rem;">Đã chọn: ${tempSelected.size} bài</span>
          </div>

          <!-- Presets -->
          <div class="vocab-presets-grid" style="margin-bottom:10px;">
            <button class="btn-preset" data-qpreset="all">Tất cả 8 bài</button>
            <button class="btn-preset" data-qpreset="clear">Bỏ chọn</button>
            <button class="btn-preset" data-qpreset="1-4">Bài 1-4</button>
            <button class="btn-preset" data-qpreset="5-8">Bài 5-8</button>
          </div>

          <!-- Checkboxes bài học -->
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:8px; max-height:220px; overflow-y:auto; padding:8px 4px;" id="modal-quiz-grid">
            ${sessionKeys.map(k => {
      const isChecked = tempSelected.has(k);
      return `
                <label style="display:flex; align-items:center; gap:6px; padding:8px 10px; border-radius:6px; background:${isChecked ? 'var(--toan-light-blue)' : '#fff'}; border:1px solid ${isChecked ? 'var(--fuji-blue-lake)' : 'var(--glass-border-subtle)'}; cursor:pointer; font-size:0.85rem; font-weight:${isChecked ? '700' : '500'}; color:${isChecked ? 'var(--toan-navy)' : 'var(--text-primary)'}; user-select:none;">
                  <input type="checkbox" data-modal-session="${k}" ${isChecked ? 'checked' : ''} style="accent-color:var(--toan-navy); width:15px; height:15px; cursor:pointer;">
                  <span>${labels[k] || 'Bài ' + k}</span>
                </label>
              `;
    }).join('')}
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--glass-border-subtle); display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <button class="btn btn-secondary btn-sm" id="btn-cancel-quiz-modal">Hủy</button>
          <button class="btn btn-primary btn-sm" id="btn-confirm-grammar-quiz" style="font-weight:700;">
            🚀 Bắt đầu Quizzes
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-close-quiz-modal')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#btn-cancel-quiz-modal')?.addEventListener('click', () => modal.remove());

    modal.querySelector('#btn-quick-quiz-current')?.addEventListener('click', () => {
      quizSessions = new Set([currentSession]);
      state.selectedGrammarSessions = Array.from(quizSessions);
      modal.remove();
      currentTab = 'quiz';
      state.grammarTab = 'quiz';
      initQuiz();
      updateSidebarItems();
      renderContent();
    });

    modal.querySelectorAll('[data-qpreset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-qpreset');
        if (type === 'all') {
          tempSelected = new Set(sessionKeys);
        } else if (type === 'clear') {
          tempSelected.clear();
        } else if (type === '1-4') {
          tempSelected = new Set(['1', '2', '3', '4']);
        } else if (type === '5-8') {
          tempSelected = new Set(['5', '6', '7', '8']);
        }
        updateModalUI();
      });
    });

    modal.querySelectorAll('[data-modal-session]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const k = e.target.getAttribute('data-modal-session');
        if (e.target.checked) tempSelected.add(k);
        else tempSelected.delete(k);
        updateModalUI();
      });
    });

    modal.querySelector('#btn-confirm-grammar-quiz')?.addEventListener('click', () => {
      if (tempSelected.size === 0) return;
      quizSessions = new Set(tempSelected);
      state.selectedGrammarSessions = Array.from(quizSessions);
      modal.remove();
      currentTab = 'quiz';
      state.grammarTab = 'quiz';
      initQuiz();
      updateSidebarItems();
      renderContent();
    });
  }

  function render() {
    container.innerHTML = `
      <!-- Top Action Bar -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.35rem; font-weight:800; color:var(--text-title); margin:0;">Học Ngữ Pháp N2</h2>
        </div>
      </div>

      <!-- Mobile Lesson Selector Bar (Chỉ 1 hàng chọn bài + 1 hàng 2 nút học/quiz trên điện thoại) -->
      <div class="mobile-lesson-bar">
        <button class="btn-mobile-select-lessons" id="btn-open-mobile-grammar-lessons">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.3rem;">✍️</span>
            <div style="text-align:left;">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">BÀI HỌC ĐANG XEM</div>
              <div id="mobile-grammar-label" style="font-size:0.95rem; font-weight:800; color:var(--text-title);">
                ${labels[currentSession] || 'Bài ' + currentSession}
              </div>
            </div>
          </div>
          <div class="badge-change-lesson">
            <span>Đổi bài ▾</span>
          </div>
        </button>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:8px;">
          <button class="btn ${currentTab === 'study' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="btn-mobile-grammar-study" style="font-weight:700;">📖 Bài học & Video</button>
          <button class="btn ${currentTab === 'quiz' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="btn-mobile-grammar-quiz" style="font-weight:700;">🎯 Quizzes</button>
        </div>
      </div>

      <!-- Main Layout: Sidebar (Desktop) + Content -->
      <div class="vocab-layout">
        <!-- Desktop Sidebar -->
        <aside class="vocab-sidebar" id="grammar-sidebar" style="width:260px;">
          <div class="vocab-sidebar-header">
            <div class="vocab-sidebar-title">
              <span>✍️</span>
              <span>Danh sách bài (1-8)</span>
            </div>
          </div>

          <!-- Scrollable Lesson List (Click là nhảy bài ngay lập tức) -->
          <div class="vocab-lessons-list" id="sidebar-grammar-list" style="max-height:380px;">
            ${renderSessionListHtml()}
          </div>

          <!-- Sidebar Footer: Chế độ ôn luyện -->
          <div class="vocab-sidebar-footer">
            <div style="font-size:0.88rem; font-weight:800; color:var(--text-title);">
              <span id="sidebar-grammar-info">${labels[currentSession] || 'Bài ' + currentSession}</span>
            </div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-top:4px;">
              CHỌN CHẾ ĐỘ HỌC:
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <button class="btn ${currentTab === 'study' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="sidebar-btn-grammar-study" style="width:100%; justify-content:flex-start; font-weight:700;">
                📖 Bài học & Video
              </button>
              <button class="btn ${currentTab === 'quiz' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="sidebar-btn-grammar-quiz" style="width:100%; justify-content:flex-start; font-weight:700;">
                🎯 Quizzes
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="vocab-main-area">
          <!-- Desktop Mode Tabs (Ẩn trên điện thoại vì điện thoại đã có nút ở mobile-lesson-bar) -->
          <div class="tab-row desktop-only" style="margin-bottom:14px;">
            <button class="tab-pill ${currentTab === 'study' ? 'active' : ''}" id="tab-desktop-study">📖 Bài học & Video</button>
            <button class="tab-pill ${currentTab === 'quiz' ? 'active' : ''}" id="tab-desktop-quiz">🎯 Quizzes</button>
          </div>

          <div id="grammar-tab-content"></div>
        </div>
      </div>

      <!-- Mobile Bottom Sheet Drawer để đổi bài trên điện thoại -->
      <div class="sheet-overlay ${isMobileSheetOpen ? 'open' : ''}" id="sheet-overlay-grammar"></div>
      <div class="bottom-sheet ${isMobileSheetOpen ? 'open' : ''}" id="mobile-sheet-grammar">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3>Chọn bài học Ngữ Pháp N2</h3>
          <button class="btn-close-sheet" id="btn-close-sheet-grammar">✕</button>
        </div>

        <div class="sheet-content" id="mobile-sheet-grammar-list" style="max-height:60vh; overflow-y:auto; padding:8px 4px;">
          ${renderSessionListHtml()}
        </div>
      </div>
    `;

    setupMainEventListeners();
    attachSessionListEvents();
    saveLastStudied();
    renderContent();
  }

  function renderSessionListHtml() {
    return sessionKeys.map(k => {
      const isCurrent = k === currentSession;
      const label = labels[k] || `Bài ${k}`;
      return `
        <div class="vocab-lesson-item ${isCurrent ? 'selected' : ''}" data-session="${k}" title="Bấm vào để xem video và nội dung ${label}" style="cursor:pointer;">
          <div class="vocab-lesson-item-title">
            <span style="font-weight:${isCurrent ? '800' : '600'};">${label}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateSidebarItems() {
    const sideInfo = document.getElementById('sidebar-grammar-info');
    if (sideInfo) sideInfo.textContent = labels[currentSession] || `Bài ${currentSession}`;

    const sideStudyBtn = document.getElementById('sidebar-btn-grammar-study');
    if (sideStudyBtn) {
      sideStudyBtn.className = `btn ${currentTab === 'study' ? 'btn-primary' : 'btn-secondary'} btn-sm`;
    }

    const sideQuizBtn = document.getElementById('sidebar-btn-grammar-quiz');
    if (sideQuizBtn) {
      sideQuizBtn.className = `btn ${currentTab === 'quiz' ? 'btn-primary' : 'btn-secondary'} btn-sm`;
    }

    const mobLabel = document.getElementById('mobile-grammar-label');
    if (mobLabel) {
      mobLabel.textContent = labels[currentSession] || `Bài ${currentSession}`;
    }

    const mobStudyBtn = document.getElementById('btn-mobile-grammar-study');
    if (mobStudyBtn) {
      mobStudyBtn.className = `btn ${currentTab === 'study' ? 'btn-primary' : 'btn-secondary'} btn-sm`;
    }

    const mobQuizBtn = document.getElementById('btn-mobile-grammar-quiz');
    if (mobQuizBtn) {
      mobQuizBtn.className = `btn ${currentTab === 'quiz' ? 'btn-primary' : 'btn-secondary'} btn-sm`;
    }

    const deskStudyTab = document.getElementById('tab-desktop-study');
    if (deskStudyTab) {
      deskStudyTab.className = `tab-pill ${currentTab === 'study' ? 'active' : ''}`;
    }

    const deskQuizTab = document.getElementById('tab-desktop-quiz');
    if (deskQuizTab) {
      deskQuizTab.className = `tab-pill ${currentTab === 'quiz' ? 'active' : ''}`;
    }

    document.querySelectorAll('.vocab-lesson-item[data-session]').forEach(item => {
      const k = item.getAttribute('data-session');
      if (!k) return;
      item.classList.toggle('selected', k === currentSession);
    });
  }

  function setupMainEventListeners() {
    document.getElementById('btn-back-home')?.addEventListener('click', () => navigate('home'));

    const openSheetBtn = document.getElementById('btn-open-mobile-grammar-lessons');
    const closeSheetBtn = document.getElementById('btn-close-sheet-grammar');
    const sheetOverlay = document.getElementById('sheet-overlay-grammar');

    openSheetBtn?.addEventListener('click', openSheet);
    closeSheetBtn?.addEventListener('click', closeSheet);
    sheetOverlay?.addEventListener('click', closeSheet);

    document.getElementById('tab-desktop-study')?.addEventListener('click', () => {
      currentTab = 'study';
      state.grammarTab = 'study';
      updateSidebarItems();
      renderContent();
    });

    document.getElementById('tab-desktop-quiz')?.addEventListener('click', () => {
      showGrammarQuizSelectionModal();
    });

    document.getElementById('sidebar-btn-grammar-study')?.addEventListener('click', () => {
      currentTab = 'study';
      state.grammarTab = 'study';
      updateSidebarItems();
      renderContent();
    });

    document.getElementById('sidebar-btn-grammar-quiz')?.addEventListener('click', () => {
      showGrammarQuizSelectionModal();
    });

    document.getElementById('btn-mobile-grammar-study')?.addEventListener('click', () => {
      currentTab = 'study';
      state.grammarTab = 'study';
      updateSidebarItems();
      renderContent();
    });

    document.getElementById('btn-mobile-grammar-quiz')?.addEventListener('click', () => {
      showGrammarQuizSelectionModal();
    });
  }

  function attachSessionListEvents() {
    document.querySelectorAll('.vocab-lesson-item[data-session]').forEach(item => {
      item.addEventListener('click', () => {
        const k = item.getAttribute('data-session');
        if (!k) return;
        selectSession(k);
      });
    });
  }

  function renderContent() {
    const content = document.getElementById('grammar-tab-content');
    if (!content) return;

    if (currentTab === 'study') {
      renderStudySplitView(content);
    } else {
      renderQuizView(content);
    }
  }

  // ─── 1. STUDY VIEW (SPLIT LAYOUT: VIDEO + GRAMMAR PATTERNS) ─────────────────
  function renderStudySplitView(content) {
    const items = getGrammarItems(currentSession);
    const videoUrl = videoUrls[currentSession];
    const sessionLabel = labels[currentSession] || `Bài ${currentSession}`;

    content.innerHTML = `
      <div class="grammar-split-layout">
        <!-- Left: Embedded Cloudinary Video Player (Không có tab thừa bên dưới!) -->
        <div class="grammar-left-column">
          <div class="grammar-video-panel">
            <div class="grammar-video-wrapper">
              ${videoUrl ? `
                <video id="grammar-player" controls playsinline preload="metadata">
                  <source src="${videoUrl}" type="video/mp4">
                  Trình duyệt của bạn không hỗ trợ phát video MP4.
                </video>
              ` : `
                <div style="color:#fff; text-align:center; padding:30px;">
                  <div style="font-size:2rem; margin-bottom:8px;">⚠️</div>
                  <div>Chưa có video cho bài này</div>
                </div>
              `}
            </div>

            <div class="video-info-bar">
              <span>🎬 Video Giảng Dạy: ${sessionLabel}</span>
            </div>
          </div>
        </div>

        <!-- Right: Scrollable Grammar Knowledge Column -->
        <div class="grammar-content-panel">
          <div class="grammar-search-header">
            <div class="search-bar-wrapper" style="margin-bottom:0;">
              <span class="search-icon">🔍</span>
              <input type="text" id="grammar-search" class="search-input" placeholder="Tìm kiếm mẫu câu, ý nghĩa hoặc ví dụ...">
            </div>
          </div>

          <div id="grammar-items-container" class="grammar-items-scroll">
            ${renderGrammarCards(items)}
          </div>
        </div>
      </div>
    `;

    document.getElementById('grammar-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = items.filter(it =>
        (it.pattern && it.pattern.toLowerCase().includes(q)) ||
        (it.meaning && it.meaning.toLowerCase().includes(q)) ||
        (it.full_meaning && it.full_meaning.toLowerCase().includes(q)) ||
        (it.examples && it.examples.some(ex => (ex.jp && ex.jp.toLowerCase().includes(q)) || (ex.vi && ex.vi.toLowerCase().includes(q))))
      );
      const containerEl = document.getElementById('grammar-items-container');
      if (containerEl) containerEl.innerHTML = renderGrammarCards(filtered);
      attachAudioListeners();
    });

    attachAudioListeners();
  }

  function renderGrammarCards(items) {
    if (!items || items.length === 0) {
      return `<div class="grammar-card" style="text-align:center; padding: 40px; color: var(--text-muted); box-sizing:border-box;">Không tìm thấy mẫu ngữ pháp nào.</div>`;
    }
    return items.map((item, idx) => `
      <div class="grammar-card" style="margin-bottom:0; padding:16px; box-sizing:border-box; width:100%; max-width:100%; overflow:hidden;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 10px; gap:8px;">
          <h3 style="font-size:1.25rem; font-weight:800; color:var(--fuji-blue-deep); letter-spacing:0.3px; flex:1; min-width:0; word-break:break-word; overflow-wrap:break-word; margin:0;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600; margin-right:6px;">#${idx + 1}</span>
            <span class="grammar-pattern">${item.pattern || ''}</span>
          </h3>
          <button class="icon-btn btn-audio" data-speak="${item.pattern || ''}" title="Nghe phát âm mẫu câu" style="width:34px; height:34px; font-size:1rem; flex-shrink:0;">🔊</button>
        </div>

        <div style="font-size:1rem; font-weight:700; color:var(--text-title); margin-bottom: 12px; line-height:1.5; word-break:break-word; overflow-wrap:break-word;">
          💡 ${item.meaning || ''}
        </div>

        ${item.full_meaning ? `
          <div style="background: rgba(37, 99, 235, 0.08); border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 14px; font-size: 0.9rem; color: var(--text-primary); white-space: pre-line; border-left: 3px solid var(--fuji-blue-primary); word-break:break-word; overflow-wrap:break-word; box-sizing:border-box; max-width:100%;">
            ${item.full_meaning}
          </div>
        ` : ''}

        ${item.examples && item.examples.length > 0 ? `
          <div style="border-top: 1px solid rgba(15, 39, 68, 0.1); padding-top: 12px; max-width:100%; box-sizing:border-box;">
            <div style="font-size: 0.82rem; font-weight:800; color: var(--fuji-blue-deep); margin-bottom: 8px; text-transform:uppercase; letter-spacing:0.5px;">Ví dụ minh họa:</div>
            <div style="display:flex; flex-direction:column; gap:10px; max-width:100%;">
              ${item.examples.map(ex => `
                <div style="background: rgba(255, 255, 255, 0.92); padding: 10px 12px; border-radius: var(--radius-sm); border-left: 3px solid var(--fuji-blue-lake); box-shadow: 0 2px 6px rgba(10,36,68,0.04); max-width:100%; box-sizing:border-box; overflow:hidden;">
                  <div style="font-size:0.96rem; font-weight:700; color:var(--text-title); margin-bottom:4px; font-family:var(--font-japanese); display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <span style="flex:1; min-width:0; word-break:break-word; overflow-wrap:break-word;">${ex.jp || ''}</span>
                    <button class="icon-btn btn-audio" data-speak="${ex.jp || ''}" title="Nghe phát âm câu ví dụ" style="width:28px; height:28px; font-size:0.85rem; flex-shrink:0;">🔊</button>
                  </div>
                  <div style="font-size:0.88rem; color:var(--text-secondary); word-break:break-word; overflow-wrap:break-word;">${ex.vi || ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  function attachAudioListeners() {
    document.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });
  }

  // ─── 2. QUIZ VIEW ────────────────────────────────────────────────────────────
  function initQuiz() {
    const allQuizzes = getAllSelectedQuizzes();
    if (allQuizzes.length === 0) {
      quizList = [];
      return;
    }

    quizIndex = 0;
    quizScore = 0;
    const shuffled = [...allQuizzes].sort(() => Math.random() - 0.5);
    const count = quizQuestionCount === 'all'
      ? shuffled.length
      : Math.min(shuffled.length, parseInt(quizQuestionCount));

    quizList = shuffled.slice(0, count).map(q => ({
      ...q,
      userAnswer: null
    }));
  }

  function renderQuizView(content) {
    const allQuizzes = getAllSelectedQuizzes();

    if (!quizList || quizList.length === 0) {
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center; box-sizing:border-box; width:100%;">
          <h3 style="font-size:1.4rem; margin-bottom:12px; color:var(--text-title);">Quizzes Ngữ Pháp</h3>
          <p style="color:var(--text-muted); margin-bottom: 20px;">Vui lòng chọn ít nhất một bài để ôn Quizzes.</p>
          <button class="btn btn-primary" id="btn-quiz-open-lessons-empty">✍️ Chọn bài học Quizzes</button>
        </div>
      `;
      document.getElementById('btn-quiz-open-lessons-empty')?.addEventListener('click', showGrammarQuizSelectionModal);
      return;
    }

    if (quizIndex >= quizList.length) {
      const percent = Math.round((quizScore / quizList.length) * 100);
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center; box-sizing:border-box; width:100%;">
          <h3 style="font-size:1.8rem; margin-bottom:12px; color:var(--text-title);">🎉 Kết Quả Quizzes Ngữ Pháp</h3>
          <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom: 8px;">
            Bạn đã trả lời đúng <strong>${quizScore}/${quizList.length}</strong> câu (${percent}%)
          </p>
          <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom: 24px;">
            Bài học đã ôn: ${getSelectedSummaryText()}
          </p>
          <div style="font-size: 3.5rem; margin-bottom: 24px;">${percent >= 80 ? '🏆' : percent >= 50 ? '👍' : '💪'}</div>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-restart-quiz">Làm lại bài thi ↺</button>
            <button class="btn btn-secondary" id="btn-quiz-change-lessons-res">✍️ Đổi bài học khác ▾</button>
          </div>
        </div>
      `;
      document.getElementById('btn-restart-quiz').addEventListener('click', () => {
        initQuiz();
        renderContent();
      });
      document.getElementById('btn-quiz-change-lessons-res')?.addEventListener('click', showGrammarQuizSelectionModal);
      return;
    }

    const currentQ = quizList[quizIndex];
    const optionsObj = currentQ.options || {};
    const optionKeys = Object.keys(optionsObj);

    content.innerHTML = `
      <div class="quiz-box" style="box-sizing:border-box; width:100%; overflow:hidden;">
        <!-- Quiz Multi-Lesson Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px; padding-bottom:10px; border-bottom:1px solid var(--glass-border-subtle);">
          <div>
            <div style="font-size:0.88rem; color:var(--fuji-blue-deep); font-weight:800;">
              ĐANG ÔN ${quizSessions.size} BÀI: ${getSelectedSummaryText()}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-secondary btn-sm" id="btn-quiz-change-lessons" style="padding:5px 12px; font-size:0.8rem;">
              ✍️ Đổi bài học ▾
            </button>
          </div>
        </div>

        <!-- Question Count Selector -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px; font-size:0.82rem; background:rgba(255,255,255,0.5); padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--glass-border-subtle);">
          <span style="color:var(--text-secondary); font-weight:700;">Số câu ôn tập:</span>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn-preset ${quizQuestionCount === 10 ? 'active' : ''}" data-quiz-count="10">10 câu</button>
            <button class="btn-preset ${quizQuestionCount === 20 ? 'active' : ''}" data-quiz-count="20">20 câu</button>
            <button class="btn-preset ${quizQuestionCount === 30 ? 'active' : ''}" data-quiz-count="30">30 câu</button>
            <button class="btn-preset ${quizQuestionCount === 'all' ? 'active' : ''}" data-quiz-count="all">Tất cả</button>
          </div>
        </div>

        <!-- Counter & Score -->
        <div style="display:flex; justify-content:space-between; margin-bottom: 16px; font-weight:700; color:var(--text-muted); font-size:0.9rem;">
          <span>Câu hỏi ${quizIndex + 1} / ${quizList.length} ${currentQ._pattern ? `(Mẫu: ${currentQ._pattern})` : ''}</span>
          <span>Điểm: ${quizScore}</span>
        </div>
        
        <div class="quiz-question" style="word-break:break-word; overflow-wrap:break-word;">
          ${currentQ.question || ''}
        </div>

        <div class="quiz-options">
          ${optionKeys.map(k => {
      let cls = '';
      if (currentQ.userAnswer !== null) {
        if (k === currentQ.answer) cls = 'correct';
        else if (k === currentQ.userAnswer) cls = 'wrong';
      }
      return `
              <button class="quiz-opt-btn ${cls}" data-opt="${k}" ${currentQ.userAnswer !== null ? 'disabled' : ''}>
                <span class="quiz-opt-key">${k}</span>
                <span style="word-break:break-word; overflow-wrap:break-word; text-align:left;">${optionsObj[k]}</span>
              </button>
            `;
    }).join('')}
        </div>

        ${currentQ.userAnswer !== null ? `
          <div class="quiz-explanation" style="box-sizing:border-box; word-break:break-word;">
            <div style="font-weight:700; margin-bottom:4px; color:var(--text-title);">Dịch nghĩa: ${currentQ.translation || ''}</div>
            ${currentQ.hiragana ? `<div style="font-size:0.9rem; color:var(--text-muted); font-family:var(--font-japanese);">${currentQ.hiragana}</div>` : ''}
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top: 20px;">
            <button class="btn btn-primary" id="btn-next-quiz">Câu tiếp theo →</button>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('btn-quiz-change-lessons')?.addEventListener('click', showGrammarQuizSelectionModal);

    content.querySelectorAll('[data-quiz-count]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-quiz-count');
        quizQuestionCount = val === 'all' ? 'all' : parseInt(val);
        initQuiz();
        renderQuizView(content);
      });
    });

    content.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-opt');
        currentQ.userAnswer = selected;
        if (selected === currentQ.answer) {
          quizScore++;
        }
        renderQuizView(content);
      });
    });

    document.getElementById('btn-next-quiz')?.addEventListener('click', () => {
      quizIndex++;
      renderQuizView(content);
    });
  }

  render();
}
