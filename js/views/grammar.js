// Grammar View Component (Embedded Video, Split Layout, Multi-session Selection & Quiz)
import { SpeechHelper } from '../speech.js';

export function renderGrammar(container, state, navigate) {
  const sessionKeys = state.grammarData ? Object.keys(state.grammarData).sort((a, b) => parseInt(a) - parseInt(b)) : [];

  if (!state.selectedGrammarSessions || state.selectedGrammarSessions.length === 0) {
    state.selectedGrammarSessions = [state.selectedGrammarSession || '1'];
  }
  let selectedSessions = new Set(state.selectedGrammarSessions);
  let currentSession = state.selectedGrammarSession || '1';

  let currentTab = state.grammarTab || 'study'; // 'study' (Video + Patterns) or 'quiz'
  let quizIndex = 0;
  let quizScore = 0;
  let quizList = [];
  let quizQuestionCount = 'all';
  let lastClickedSessionIndex = -1;
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
    const sessions = Array.from(selectedSessions).sort((a, b) => parseInt(a) - parseInt(b));
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
    const arr = Array.from(selectedSessions).sort((a, b) => parseInt(a) - parseInt(b));
    if (arr.length === 0) return 'Chưa chọn bài';
    if (arr.length === 1) return labels[arr[0]] || `Bài ${arr[0]}`;
    if (arr.length === sessionKeys.length) return `Tất cả 8 bài`;
    return `${arr.length} bài (Bài ${arr.join(', ')})`;
  }

  function applyPreset(type) {
    if (type === 'all') {
      sessionKeys.forEach(k => selectedSessions.add(k));
    } else if (type === 'clear') {
      selectedSessions.clear();
      selectedSessions.add(currentSession);
    }
    syncStateAndRerender();
  }

  function handleSessionClick(sessionKey, isShiftKey, isCheckboxClick) {
    const currentIndex = sessionKeys.indexOf(sessionKey);

    if (isCheckboxClick) {
      if (isShiftKey && lastClickedSessionIndex !== -1) {
        const start = Math.min(lastClickedSessionIndex, currentIndex);
        const end = Math.max(lastClickedSessionIndex, currentIndex);
        const willSelect = !selectedSessions.has(sessionKey);
        for (let i = start; i <= end; i++) {
          const k = sessionKeys[i];
          if (willSelect) selectedSessions.add(k);
          else selectedSessions.delete(k);
        }
      } else {
        if (selectedSessions.has(sessionKey)) {
          if (selectedSessions.size > 1) selectedSessions.delete(sessionKey);
        } else {
          selectedSessions.add(sessionKey);
        }
        lastClickedSessionIndex = currentIndex;
      }
    } else {
      // Direct click on lesson row: switch current lesson view
      currentSession = sessionKey;
      state.selectedGrammarSession = currentSession;
      if (!selectedSessions.has(sessionKey)) {
        selectedSessions.add(sessionKey);
      }
    }

    syncStateAndRerender();
  }

  function saveLastStudied() {
    try {
      localStorage.setItem('jlpt_last_studied', JSON.stringify({
        type: 'grammar',
        session: currentSession,
        sessions: Array.from(selectedSessions),
        label: `Ngữ pháp ${labels[currentSession] || 'Bài ' + currentSession}`,
        tab: currentTab
      }));
    } catch (e) {}
  }

  function syncStateAndRerender() {
    state.selectedGrammarSessions = Array.from(selectedSessions);
    state.selectedGrammarSession = currentSession;
    updateSidebarItems();
    saveLastStudied();
    if (currentTab === 'quiz') {
      initQuiz();
    }
    renderContent();
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

  function render() {
    const currentItems = getGrammarItems(currentSession);

    container.innerHTML = `
      <!-- Top Action Bar -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 16px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-title);">Học Ngữ Pháp N2</h2>
        </div>
      </div>

      <!-- Mobile Lesson Selector Bar -->
      <div class="mobile-lesson-bar">
        <button class="btn-mobile-select-lessons" id="btn-open-mobile-grammar-lessons">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.3rem;">✍️</span>
            <div style="text-align:left;">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">BÀI ĐANG CHỌN</div>
              <div id="mobile-grammar-label" style="font-size:0.95rem; font-weight:800; color:var(--text-title);">
                ${labels[currentSession] || 'Bài ' + currentSession} (Đã tick ${selectedSessions.size} bài)
              </div>
            </div>
          </div>
          <div class="badge-change-lesson">
            <span>Chọn bài</span>
            <span>▾</span>
          </div>
        </button>
      </div>

      <!-- Main Layout: Sidebar (Desktop) + Content -->
      <div class="vocab-layout">
        <!-- Desktop Sidebar -->
        <aside class="vocab-sidebar" id="grammar-sidebar" style="width:250px;">
          <div class="vocab-sidebar-header">
            <div class="vocab-sidebar-title">
              <span>✍️</span>
              <span>8 Bài Ngữ Pháp N2</span>
            </div>
          </div>

          <!-- Quick Presets -->
          <div class="vocab-presets-grid">
            <button class="btn-preset" data-preset="all">Tất cả (8 bài)</button>
            <button class="btn-preset" data-preset="clear">Bỏ chọn</button>
          </div>

          <div class="vocab-shift-hint">
            <span>💡 Tick chọn nhiều bài để ôn trắc nghiệm gộp</span>
          </div>

          <!-- Scrollable Lesson Checkbox List -->
          <div class="vocab-lessons-list" id="sidebar-grammar-list" style="max-height:360px;">
            ${renderSessionListHtml()}
          </div>

          <!-- Sidebar Footer Summary -->
          <div class="vocab-sidebar-footer">
            <div style="font-size:0.84rem; font-weight:700; color:var(--text-title);" id="sidebar-grammar-summary">
              Đã tick: ${selectedSessions.size} bài
            </div>
            <button class="btn btn-primary btn-sm" id="sidebar-btn-grammar-quiz" style="width:100%; margin-top:4px;">
              🎯 Ôn Trắc Nghiệm Gộp
            </button>
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="vocab-main-area">
          <div id="grammar-tab-content"></div>
        </div>
      </div>

      <!-- Mobile Bottom Sheet Drawer -->
      <div class="sheet-overlay ${isMobileSheetOpen ? 'open' : ''}" id="sheet-overlay-grammar"></div>
      <div class="bottom-sheet ${isMobileSheetOpen ? 'open' : ''}" id="mobile-sheet-grammar">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3>Chọn bài học Ngữ Pháp N2</h3>
          <button class="btn-close-sheet" id="btn-close-sheet-grammar">✕</button>
        </div>

        <div class="vocab-presets-grid" style="margin-bottom:8px;">
          <button class="btn-preset" data-preset="all">Tất cả (8 bài)</button>
          <button class="btn-preset" data-preset="clear">Bỏ chọn</button>
        </div>

        <div class="sheet-content" id="mobile-sheet-grammar-list">
          ${renderSessionListHtml()}
        </div>

        <div class="sheet-footer">
          <button class="btn btn-primary" id="btn-apply-sheet-grammar" style="width:100%; padding:13px; font-weight:700;">
            🚀 Áp dụng & Học ngay
          </button>
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
      const isChecked = selectedSessions.has(k);
      const label = labels[k] || `Bài ${k}`;
      const count = (state.grammarData[k] || []).length;
      return `
        <div class="vocab-lesson-item ${isCurrent ? 'selected' : ''}" data-session="${k}" title="Bấm vào để xem video và nội dung Bài ${k}">
          <div class="vocab-lesson-item-title">
            <input type="checkbox" data-session="${k}" ${isChecked ? 'checked' : ''} title="Tick để ôn trắc nghiệm gộp bài này">
            <span>${label}</span>
          </div>
          <span class="vocab-lesson-count">(${count} mẫu)</span>
        </div>
      `;
    }).join('');
  }

  function updateSidebarItems() {
    const sideSum = document.getElementById('sidebar-grammar-summary');
    if (sideSum) sideSum.textContent = `Đã tick: ${selectedSessions.size} bài`;

    const mobLabel = document.getElementById('mobile-grammar-label');
    if (mobLabel) {
      mobLabel.textContent = `${labels[currentSession] || 'Bài ' + currentSession} (Đã tick ${selectedSessions.size} bài)`;
    }

    document.querySelectorAll('.vocab-lesson-item').forEach(item => {
      const k = item.getAttribute('data-session');
      if (!k) return;
      const isCur = k === currentSession;
      item.classList.toggle('selected', isCur);
      const chk = item.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = selectedSessions.has(k);
    });
  }

  function setupMainEventListeners() {
    document.getElementById('btn-back-home').addEventListener('click', () => navigate('home'));

    const openSheetBtn = document.getElementById('btn-open-mobile-grammar-lessons');
    const closeSheetBtn = document.getElementById('btn-close-sheet-grammar');
    const sheetOverlay = document.getElementById('sheet-overlay-grammar');
    const applySheetBtn = document.getElementById('btn-apply-sheet-grammar');

    openSheetBtn?.addEventListener('click', openSheet);
    closeSheetBtn?.addEventListener('click', closeSheet);
    sheetOverlay?.addEventListener('click', closeSheet);
    applySheetBtn?.addEventListener('click', () => {
      closeSheet();
      renderContent();
    });

    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-preset');
        applyPreset(type);
      });
    });

    document.getElementById('sidebar-btn-grammar-quiz')?.addEventListener('click', () => {
      currentTab = 'quiz';
      state.grammarTab = 'quiz';
      initQuiz();
      renderContent();
    });

    document.getElementById('tab-study')?.addEventListener('click', () => {
      currentTab = 'study';
      state.grammarTab = 'study';
      renderContent();
    });

    document.getElementById('tab-quiz')?.addEventListener('click', () => {
      currentTab = 'quiz';
      state.grammarTab = 'quiz';
      initQuiz();
      renderContent();
    });
  }

  function attachSessionListEvents() {
    document.querySelectorAll('.vocab-lesson-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const k = item.getAttribute('data-session');
        if (!k) return;
        const isCheckbox = e.target.type === 'checkbox';
        handleSessionClick(k, e.shiftKey, isCheckbox);
      });
    });
  }

  function renderContent() {
    const content = document.getElementById('grammar-tab-content');
    if (!content) return;

    document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
    if (currentTab === 'study') document.getElementById('tab-study')?.classList.add('active');
    if (currentTab === 'quiz') document.getElementById('tab-quiz')?.classList.add('active');

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
        <!-- Left: Mode Tabs + Embedded Cloudinary Video Player -->
        <div class="grammar-left-column">
          <div class="tab-row" style="margin-bottom:0;">
            <button class="tab-pill active" id="tab-study">
              📖 Bài Học & Video (${items.length} mẫu)
            </button>
            <button class="tab-pill" id="tab-quiz">
              🎯 Trắc Nghiệm Ngữ Pháp
            </button>
          </div>

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

        <!-- Right: Scrollable Grammar Knowledge Column (Starts flush at top!) -->
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

    document.getElementById('tab-quiz')?.addEventListener('click', () => {
      currentTab = 'quiz';
      state.grammarTab = 'quiz';
      initQuiz();
      renderContent();
    });

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
      return `<div class="grammar-card" style="text-align:center; padding: 40px; color: var(--text-muted);">Không tìm thấy mẫu ngữ pháp nào.</div>`;
    }
    return items.map((item, idx) => `
      <div class="grammar-card" style="margin-bottom:0; padding:18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; flex-wrap:wrap; gap:8px;">
          <h3 style="font-size:1.35rem; font-weight:800; color:var(--fuji-blue-deep); letter-spacing:0.3px;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600; margin-right:6px;">#${idx + 1}</span>
            <span class="grammar-pattern">${item.pattern || ''}</span>
          </h3>
          <button class="icon-btn btn-audio" data-speak="${item.pattern || ''}" title="Nghe phát âm mẫu câu" style="width:34px; height:34px; font-size:1rem;">🔊</button>
        </div>

        <div style="font-size:1.02rem; font-weight:700; color:var(--text-title); margin-bottom: 12px; line-height:1.5;">
          💡 ${item.meaning || ''}
        </div>

        ${item.full_meaning ? `
          <div style="background: rgba(37, 99, 235, 0.08); border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 14px; font-size: 0.9rem; color: var(--text-primary); white-space: pre-line; border-left: 3px solid var(--fuji-blue-primary);">
            ${item.full_meaning}
          </div>
        ` : ''}

        ${item.examples && item.examples.length > 0 ? `
          <div style="border-top: 1px solid rgba(15, 39, 68, 0.1); padding-top: 12px;">
            <div style="font-size: 0.82rem; font-weight:800; color: var(--fuji-blue-deep); margin-bottom: 8px; text-transform:uppercase; letter-spacing:0.5px;">Ví dụ minh họa:</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${item.examples.map(ex => `
                <div style="background: rgba(255, 255, 255, 0.85); padding: 10px 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--fuji-blue-lake); box-shadow: 0 2px 6px rgba(10,36,68,0.04);">
                  <div style="font-size:0.98rem; font-weight:700; color:var(--text-title); margin-bottom:4px; font-family:var(--font-japanese); display:flex; justify-content:space-between; align-items:center;">
                    <span>${ex.jp || ''}</span>
                    <button class="icon-btn btn-audio" data-speak="${ex.jp || ''}" title="Nghe phát âm câu ví dụ" style="width:28px; height:28px; font-size:0.85rem; flex-shrink:0;">🔊</button>
                  </div>
                  <div style="font-size:0.88rem; color:var(--text-secondary);">${ex.vi || ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  function attachAudioListeners() {
    container.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });
  }

  // ─── 2. QUIZ VIEW (MULTI-SESSION GRAMMAR QUIZ) ──────────────────────────────
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
        <div class="tab-row" style="margin-bottom:16px;">
          <button class="tab-pill" id="tab-study-from-quiz">
            📖 Bài Học & Video (${getGrammarItems(currentSession).length} mẫu)
          </button>
          <button class="tab-pill active" id="tab-quiz-from-quiz">
            🎯 Trắc Nghiệm Ngữ Pháp
          </button>
        </div>
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.4rem; margin-bottom:12px; color:var(--text-title);">Trắc nghiệm ngữ pháp</h3>
          <p style="color:var(--text-muted); margin-bottom: 20px;">Vui lòng tick chọn ít nhất một bài để ôn trắc nghiệm.</p>
          <button class="btn btn-primary" id="btn-quiz-open-lessons-empty">✍️ Chọn bài học ngay</button>
        </div>
      `;
      document.getElementById('tab-study-from-quiz')?.addEventListener('click', () => {
        currentTab = 'study';
        state.grammarTab = 'study';
        renderContent();
      });
      document.getElementById('btn-quiz-open-lessons-empty')?.addEventListener('click', openSheet);
      return;
    }

    if (quizIndex >= quizList.length) {
      const percent = Math.round((quizScore / quizList.length) * 100);
      content.innerHTML = `
        <div class="tab-row" style="margin-bottom:16px;">
          <button class="tab-pill" id="tab-study-from-quiz">
            📖 Bài Học & Video (${getGrammarItems(currentSession).length} mẫu)
          </button>
          <button class="tab-pill active" id="tab-quiz-from-quiz">
            🎯 Trắc Nghiệm Ngữ Pháp
          </button>
        </div>
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.8rem; margin-bottom:12px; color:var(--text-title);">🎉 Kết Quả Trắc Nghiệm Ngữ Pháp</h3>
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
      document.getElementById('tab-study-from-quiz')?.addEventListener('click', () => {
        currentTab = 'study';
        state.grammarTab = 'study';
        renderContent();
      });
      document.getElementById('btn-restart-quiz').addEventListener('click', () => {
        initQuiz();
        renderContent();
      });
      document.getElementById('btn-quiz-change-lessons-res')?.addEventListener('click', openSheet);
      return;
    }

    const currentQ = quizList[quizIndex];
    const optionsObj = currentQ.options || {};
    const optionKeys = Object.keys(optionsObj);

    content.innerHTML = `
      <div class="tab-row" style="margin-bottom:16px;">
        <button class="tab-pill" id="tab-study-from-quiz">
          📖 Bài Học & Video (${getGrammarItems(currentSession).length} mẫu)
        </button>
        <button class="tab-pill active" id="tab-quiz-from-quiz">
          🎯 Trắc Nghiệm Ngữ Pháp
        </button>
      </div>

      <div class="quiz-box">
        <!-- Quiz Multi-Lesson Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px; padding-bottom:10px; border-bottom:1px solid var(--glass-border-subtle);">
          <div>
            <div style="font-size:0.85rem; color:var(--fuji-blue-deep); font-weight:800;">
              ĐANG ÔN ${selectedSessions.size} BÀI: ${getSelectedSummaryText()}
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted);">
              Tổng kho câu hỏi: ${allQuizzes.length} câu
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
            <button class="btn-preset ${quizQuestionCount === 'all' ? 'active' : ''}" data-quiz-count="all">Tất cả (${allQuizzes.length} câu)</button>
            ${allQuizzes.length > 15 ? `<button class="btn-preset ${quizQuestionCount === 15 ? 'active' : ''}" data-quiz-count="15">15 câu</button>` : ''}
            ${allQuizzes.length > 30 ? `<button class="btn-preset ${quizQuestionCount === 30 ? 'active' : ''}" data-quiz-count="30">30 câu</button>` : ''}
            ${allQuizzes.length > 50 ? `<button class="btn-preset ${quizQuestionCount === 50 ? 'active' : ''}" data-quiz-count="50">50 câu</button>` : ''}
          </div>
        </div>

        <!-- Counter & Score -->
        <div style="display:flex; justify-content:space-between; margin-bottom: 16px; font-weight:700; color:var(--text-muted); font-size:0.9rem;">
          <span>Câu hỏi ${quizIndex + 1} / ${quizList.length} ${currentQ._pattern ? `(Mẫu: ${currentQ._pattern})` : ''}</span>
          <span>Điểm: ${quizScore}</span>
        </div>
        
        <div class="quiz-question">
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
                <span>${optionsObj[k]}</span>
              </button>
            `;
    }).join('')}
        </div>

        ${currentQ.userAnswer !== null ? `
          <div class="quiz-explanation">
            <div style="font-weight:700; margin-bottom:4px; color:var(--text-title);">Dịch nghĩa: ${currentQ.translation || ''}</div>
            ${currentQ.hiragana ? `<div style="font-size:0.9rem; color:var(--text-muted); font-family:var(--font-japanese);">${currentQ.hiragana}</div>` : ''}
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top: 20px;">
            <button class="btn btn-primary" id="btn-next-quiz">Câu tiếp theo →</button>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('btn-quiz-change-lessons')?.addEventListener('click', openSheet);

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

    document.getElementById('tab-study-from-quiz')?.addEventListener('click', () => {
      currentTab = 'study';
      state.grammarTab = 'study';
      renderContent();
    });

    document.getElementById('btn-next-quiz')?.addEventListener('click', () => {
      quizIndex++;
      renderQuizView(content);
    });
  }

  render();
}
