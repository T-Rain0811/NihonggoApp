// Vocab View Component (Multi-lesson Selection, Mazii Integration, Flashcard 3D & Quiz)
import { SpeechHelper } from '../speech.js';
import { GitHubSync, showToast } from '../services/githubSync.js';

export function renderVocab(container, state, navigate) {
  const lessonKeys = state.vocabData ? Object.keys(state.vocabData).sort((a, b) => parseInt(a) - parseInt(b)) : [];

  let selectedLesson = state.selectedVocabLesson || '1';
  if (lessonKeys.length > 0 && !lessonKeys.includes(selectedLesson)) {
    selectedLesson = lessonKeys[0];
  }
  let studyLessons = new Set(
    state.selectedVocabLessons && state.selectedVocabLessons.length > 0
      ? state.selectedVocabLessons
      : [selectedLesson]
  );

  let activeCategory = state.vocabCategory || 'lesson'; // 'lesson', 'prefix', 'mimetic', 'synonym'
  let currentTab = state.vocabTab || 'list'; // 'list', 'flashcard', 'quiz', 'match'
  let flashcardIndex = 0;
  let isRepeatQueueMode = true;
  let flashcardQueue = [];
  let flashcardQueueIndex = 0;
  let flashcardMasteredSet = new Set();
  let flashcardOriginalLength = 0;
  let isFlashcardFinished = false;
  let isCardFlipped = false;
  let quizIndex = 0;
  let quizScore = 0;
  let quizQuestions = [];
  let quizQuestionCount = 'all';
  let activeKeyHandler = null;
  let activeFlashcardCleanups = null;
  let isMobileSheetOpen = false;

  // Matching Game state
  let matchGameTimer = null;
  let matchTimeRemaining = 30;
  let matchTiles = [];
  let selectedTile1 = null;
  let selectedTile2 = null;
  let matchedPairsCount = 0;
  let totalMatchPairs = 6;
  let isMatchGameFinished = false;
  let isMatchGameOver = false;
  let isProcessingMatch = false;

  function cleanupMatchGame() {
    if (matchGameTimer) {
      clearInterval(matchGameTimer);
      matchGameTimer = null;
    }
  }

  function cleanupKeyHandler() {
    if (activeKeyHandler) {
      window.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
  }

  function cleanupFlashcardHandlers() {
    if (activeFlashcardCleanups) {
      activeFlashcardCleanups();
      activeFlashcardCleanups = null;
    }
  }

  function getCustomWords() {
    return state.customVocab || [];
  }

  function saveCustomWords(words) {
    state.customVocab = words;
    localStorage.setItem('jlpt_custom_vocab', JSON.stringify(words));
  }

  function getCurrentLessonWords() {
    if (selectedLesson === 'custom' || activeCategory === 'custom') {
      return getCustomWords().map(w => ({ ...w, _lesson: 'Sổ tay', _isCustom: true }));
    }
    if (!state.vocabData) return [];
    const list = state.vocabData[selectedLesson] || [];
    return list.map(w => ({ ...w, _lesson: selectedLesson }));
  }

  function getStudyWords() {
    const words = [];
    const customWords = getCustomWords();

    if (studyLessons.has('custom')) {
      customWords.forEach(w => {
        words.push({ ...w, _lesson: 'Sổ tay', _isCustom: true });
      });
    }

    if (state.vocabData) {
      const lessons = Array.from(studyLessons).filter(l => l !== 'custom').sort((a, b) => parseInt(a) - parseInt(b));
      lessons.forEach(l => {
        const list = state.vocabData[l] || [];
        list.forEach(w => {
          words.push({ ...w, _lesson: l });
        });
      });
    }
    return words;
  }

  function getStudySummaryText() {
    const hasCustom = studyLessons.has('custom');
    const regularLessons = Array.from(studyLessons).filter(l => l !== 'custom').sort((a, b) => parseInt(a) - parseInt(b));

    const parts = [];
    if (regularLessons.length === lessonKeys.length && lessonKeys.length > 0) {
      parts.push('Tất cả 58 bài');
    } else if (regularLessons.length > 0) {
      if (regularLessons.length <= 4) {
        parts.push(`Bài ${regularLessons.join(', ')}`);
      } else {
        parts.push(`${regularLessons.length} bài (${regularLessons[0]}...${regularLessons[regularLessons.length - 1]})`);
      }
    }

    if (hasCustom) {
      parts.push('Sổ tay cá nhân');
    }

    if (parts.length === 0) return 'Chưa chọn bài';
    return parts.join(' + ');
  }

  function handleLessonClick(lessonKey) {
    selectedLesson = lessonKey;
    state.selectedVocabLesson = lessonKey;
    studyLessons = new Set([lessonKey]);
    state.selectedVocabLessons = [lessonKey];
    currentTab = 'list';
    state.vocabTab = 'list';

    if (lessonKey === 'custom') {
      activeCategory = 'custom';
      state.vocabCategory = 'custom';
    } else {
      activeCategory = 'lesson';
      state.vocabCategory = 'lesson';
    }

    // Show sidebar
    const sidebar = document.getElementById('vocab-sidebar');
    if (sidebar) sidebar.style.display = '';
    const mobBar = document.querySelector('.mobile-lesson-bar');
    if (mobBar) mobBar.style.display = '';

    // Highlight selected item in sidebar
    document.querySelectorAll('.vocab-lesson-item').forEach(item => {
      item.classList.toggle('selected', item.getAttribute('data-lesson') === lessonKey);
    });

    // Update pill text on the right
    document.querySelectorAll('#vocab-category-tabs .tab-pill').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-cat') === activeCategory);
    });
    const lessonPill = document.querySelector('#vocab-category-tabs .tab-pill[data-cat="lesson"]');
    if (lessonPill) lessonPill.textContent = `📖 Từ vựng bài học`;

    const isCustom = lessonKey === 'custom';
    const currentWords = getCurrentLessonWords();

    // Update sidebar footer
    const sideInfo = document.getElementById('sidebar-view-info');
    if (sideInfo) sideInfo.textContent = isCustom ? 'Sổ tay cá nhân' : `Bài ${lessonKey}`;
    const sideBadge = document.getElementById('sidebar-view-badge');
    if (sideBadge) sideBadge.textContent = `${currentWords.length} từ`;

    const mobLabel = document.getElementById('mobile-lesson-label');
    if (mobLabel) mobLabel.textContent = isCustom ? `Sổ tay cá nhân` : `Bài ${lessonKey}`;

    closeSheet();
    saveLastStudied();
    renderContent();
  }

  function saveLastStudied() {
    try {
      localStorage.setItem('jlpt_last_studied', JSON.stringify({
        type: 'vocab',
        lesson: selectedLesson,
        studyLessons: Array.from(studyLessons),
        label: `Bài ${selectedLesson}`,
        tab: currentTab
      }));
    } catch (e) { }
  }

  function openMazii(word) {
    if (!word) return;
    const cleanWord = word.split('＝')[0].replace(/[（(][^）)]*[）)]/g, '').trim();
    if (!cleanWord) return;
    const url = `https://mazii.net/vi-VN/search/word/javi/${encodeURIComponent(cleanWord)}`;
    window.open(url, '_blank');
  }

  const extraTabLabels = {
    'prefix': 'Ôn Tiền Tố N2 (98 tiền tố)',
    'mimetic': 'Từ Tượng Hình, Tượng Thanh (100 từ)',
    'synonym': '220 Cặp Từ Đồng Nghĩa'
  };

  function getExtraItems(cat) {
    if (!state.extraVocabData) return [];
    return state.extraVocabData[cat] || [];
  }

  function openSheet() {
    isMobileSheetOpen = true;
    const overlay = document.getElementById('sheet-overlay');
    const sheet = document.getElementById('mobile-sheet');
    if (overlay) overlay.classList.add('open');
    if (sheet) sheet.classList.add('open');
  }

  function closeSheet() {
    isMobileSheetOpen = false;
    const overlay = document.getElementById('sheet-overlay');
    const sheet = document.getElementById('mobile-sheet');
    if (overlay) overlay.classList.remove('open');
    if (sheet) sheet.classList.remove('open');
  }

  function render() {
    cleanupKeyHandler();
    cleanupFlashcardHandlers();
    const currentWords = getCurrentLessonWords();
    const customWords = getCustomWords();
    const isLessonOrCustom = activeCategory === 'lesson' || activeCategory === 'custom';
    const isCustom = selectedLesson === 'custom' || activeCategory === 'custom';

    container.innerHTML = `
      <!-- Top Action Bar -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.35rem; font-weight:800; color:var(--text-title); margin:0;">Học Từ Vựng N2</h2>
        </div>
      </div>

      <!-- Main Layout: Sidebar (Desktop) + Content -->
      <div class="vocab-layout">
        <!-- Desktop Sidebar (hiển thị khi học bài học hoặc sổ tay cá nhân) -->
        <aside class="vocab-sidebar" id="vocab-sidebar" style="${isLessonOrCustom ? '' : 'display:none;'}">
          <div class="vocab-sidebar-header">
            <div class="vocab-sidebar-title">
              <span>📚</span>
              <span>Danh sách bài (1-58)</span>
            </div>
          </div>

          <!-- Scrollable Lesson List (bao gồm Sổ tay cá nhân ở trên cùng) -->
          <div class="vocab-lessons-list" id="sidebar-lessons-list">
            ${renderLessonListHtml()}
          </div>

          <!-- Sidebar Footer: Chế độ ôn luyện -->
          <div class="vocab-sidebar-footer">
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-title); display:flex; justify-content:space-between; align-items:center;">
              <span id="sidebar-view-info">${isCustom ? 'Sổ tay cá nhân' : `Bài ${selectedLesson}`}</span>
              <span class="badge" id="sidebar-view-badge" style="background:rgba(37,99,235,0.1); color:var(--fuji-blue-primary); padding:2px 8px; border-radius:12px; font-weight:800;">${currentWords.length} từ</span>
            </div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-top:4px;">
              CHỌN CHẾ ĐỘ HỌC:
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <button class="btn ${currentTab === 'list' && isLessonOrCustom ? 'btn-primary' : 'btn-secondary'} btn-sm" id="sidebar-btn-list" style="width:100%; justify-content:flex-start; font-weight:700;">
                📖 Danh sách từ (${isCustom ? 'Sổ tay' : `Bài ${selectedLesson}`})
              </button>
              <button class="btn ${currentTab === 'flashcard' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="sidebar-btn-flashcard" style="width:100%; justify-content:flex-start; font-weight:700;">
                🎴 Flashcards
              </button>
              <button class="btn ${currentTab === 'quiz' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="sidebar-btn-quiz" style="width:100%; justify-content:flex-start; font-weight:700;">
                🎯 Quizzes (JLPT)
              </button>
              <button class="btn ${currentTab === 'match' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="sidebar-btn-match" style="width:100%; justify-content:flex-start; font-weight:700;">
                🧩 Ghép Thẻ (Game 30s)
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Content Area: Bên phải đến các chế độ từ vựng -->
        <div class="vocab-main-area">
          <!-- Hàng ngang chuyển toàn bộ các chế độ từ vựng cần học -->
          <div class="tab-row" id="vocab-category-tabs" style="margin-bottom: 10px;">
            <button class="tab-pill ${activeCategory === 'lesson' ? 'active' : ''}" data-cat="lesson">📖 Từ vựng bài học</button>
            <button class="tab-pill ${activeCategory === 'custom' ? 'active' : ''}" data-cat="custom">📝 Từ vựng cá nhân</button>
            <button class="tab-pill ${activeCategory === 'prefix' ? 'active' : ''}" data-cat="prefix">🔖 Ôn Tiền tố N2</button>
            <button class="tab-pill ${activeCategory === 'mimetic' ? 'active' : ''}" data-cat="mimetic">✨ Tượng hình, Tượng thanh</button>
            <button class="tab-pill ${activeCategory === 'synonym' ? 'active' : ''}" data-cat="synonym">🔄 Cặp Từ đồng nghĩa</button>
          </div>

          <!-- Mobile Lesson Selector Bar -->
          <div class="mobile-lesson-bar" style="${isLessonOrCustom ? '' : 'display:none;'}">
            <button class="btn-mobile-select-lessons" id="btn-open-mobile-lessons">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.3rem;">${isCustom ? '📝' : '📚'}</span>
                <div style="text-align:left;">
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">BÀI HỌC ĐANG XEM</div>
                  <div id="mobile-lesson-label" style="font-size:0.95rem; font-weight:800; color:var(--text-title);">${isCustom ? `Sổ tay cá nhân (${currentWords.length} từ)` : `Bài ${selectedLesson} (${currentWords.length} từ)`}</div>
                </div>
              </div>
              <div class="badge-change-lesson">
                <span>Đổi bài ▾</span>
              </div>
            </button>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px; margin-top:8px;">
              <button class="btn btn-secondary btn-sm" id="btn-mobile-fc" style="font-weight:700; padding:6px 2px; font-size:0.8rem;">🎴 Flashcards</button>
              <button class="btn btn-secondary btn-sm" id="btn-mobile-quiz" style="font-weight:700; padding:6px 2px; font-size:0.8rem;">🎯 Quizzes</button>
              <button class="btn btn-secondary btn-sm" id="btn-mobile-match" style="font-weight:700; padding:6px 2px; font-size:0.8rem;">🧩 Ghép Thẻ</button>
            </div>
          </div>

          <!-- Nội dung chính -->
          <div id="vocab-tab-content"></div>
        </div>
      </div>

      <!-- Mobile Bottom Sheet Drawer để đổi bài trên điện thoại -->
      <div class="sheet-overlay ${isMobileSheetOpen ? 'open' : ''}" id="sheet-overlay"></div>
      <div class="bottom-sheet ${isMobileSheetOpen ? 'open' : ''}" id="mobile-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3>Chọn bài học N2 (${lessonKeys.length} bài)</h3>
          <button class="btn-close-sheet" id="btn-close-sheet">✕</button>
        </div>
        <div class="sheet-content" id="mobile-sheet-lessons-list" style="max-height:65vh; overflow-y:auto;">
          ${renderLessonListHtml()}
        </div>
      </div>
    `;

    setupMainEventListeners();
    attachLessonListEvents();
    saveLastStudied();
    renderContent();
  }

  function renderLessonListHtml() {
    const customWords = getCustomWords();
    const isCustomSelected = (selectedLesson === 'custom' || activeCategory === 'custom');
    const customItemHtml = `
      <div class="vocab-lesson-item vocab-lesson-item-custom ${isCustomSelected ? 'selected' : ''}" data-lesson="custom" style="margin-bottom:6px;">
        <span class="vocab-lesson-item-title" style="font-weight:800;">📝 Từ Vựng Cá Nhân</span>
        <span class="vocab-lesson-count">(${customWords.length} từ)</span>
      </div>
    `;

    const lessonsHtml = lessonKeys.map(k => {
      const isSelected = selectedLesson === k && activeCategory !== 'custom';
      const count = (state.vocabData[k] || []).length;
      return `
        <div class="vocab-lesson-item ${isSelected ? 'selected' : ''}" data-lesson="${k}">
          <span class="vocab-lesson-item-title">Bài ${k}</span>
          <span class="vocab-lesson-count">(${count} từ)</span>
        </div>
      `;
    }).join('');

    return customItemHtml + lessonsHtml;
  }

  function updateSidebarModeButtons() {
    const listBtn = document.getElementById('sidebar-btn-list');
    const fcBtn = document.getElementById('sidebar-btn-flashcard');
    const quizBtn = document.getElementById('sidebar-btn-quiz');
    const matchBtn = document.getElementById('sidebar-btn-match');
    const isLessonOrCustom = activeCategory === 'lesson' || activeCategory === 'custom';
    const isCustom = selectedLesson === 'custom' || activeCategory === 'custom';

    if (listBtn) {
      listBtn.className = `btn ${currentTab === 'list' && isLessonOrCustom ? 'btn-primary' : 'btn-secondary'} btn-sm`;
      listBtn.textContent = `📖 Danh sách từ (${isCustom ? 'Sổ tay' : `Bài ${selectedLesson}`})`;
    }
    if (fcBtn) fcBtn.className = `btn ${currentTab === 'flashcard' ? 'btn-primary' : 'btn-secondary'} btn-sm`;
    if (quizBtn) quizBtn.className = `btn ${currentTab === 'quiz' ? 'btn-primary' : 'btn-secondary'} btn-sm`;
    if (matchBtn) matchBtn.className = `btn ${currentTab === 'match' ? 'btn-primary' : 'btn-secondary'} btn-sm`;
  }

  // Modal cho phép chọn 1 bài hoặc nhiều bài khi vào Flashcard / Trắc nghiệm
  function openStudyLessonPickerModal(targetMode) {
    const isCurrentCustom = selectedLesson === 'custom';
    const currentCount = isCurrentCustom ? getCustomWords().length : (state.vocabData[selectedLesson] || []).length;
    const tempSelected = new Set(studyLessons.size > 0 ? studyLessons : [selectedLesson]);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'modal-study-picker';

    const titleText = targetMode === 'flashcard'
      ? '🎴 Flashcard 3D'
      : targetMode === 'match'
      ? '🧩 Game Ghép Thẻ Từ Vựng'
      : '🎯 Quizzes Ôn Tập (JLPT)';
    const startBtnText = targetMode === 'flashcard'
      ? 'Bắt đầu học Flashcard 🚀'
      : targetMode === 'match'
      ? 'Bắt đầu chơi game (30s) 🚀'
      : 'Bắt đầu làm Quizzes 🚀';

    function calcTotalWords() {
      let sum = 0;
      if (tempSelected.has('custom')) {
        sum += getCustomWords().length;
      }
      tempSelected.forEach(l => {
        if (l !== 'custom' && state.vocabData) {
          sum += (state.vocabData[l] || []).length;
        }
      });
      return sum;
    }

    function updateModalUI() {
      const counterEl = modal.querySelector('#modal-word-counter');
      if (counterEl) counterEl.textContent = `Đã chọn: ${tempSelected.size} bài`;

      const confirmBtn = modal.querySelector('#btn-confirm-multi-study');
      if (confirmBtn) {
        confirmBtn.textContent = startBtnText;
      }

      modal.querySelectorAll('[data-modal-lesson]').forEach(chk => {
        const k = chk.getAttribute('data-modal-lesson');
        const isChecked = tempSelected.has(k);
        chk.checked = isChecked;
        const parentLabel = chk.closest('label');
        if (parentLabel) {
          if (k === 'custom') {
            parentLabel.style.background = isChecked ? 'rgba(245,158,11,0.18)' : '#fff';
            parentLabel.style.borderColor = isChecked ? '#d97706' : 'var(--glass-border-subtle)';
            parentLabel.style.color = isChecked ? '#b45309' : 'var(--text-primary)';
          } else {
            parentLabel.style.background = isChecked ? 'var(--toan-light-blue)' : '#fff';
            parentLabel.style.borderColor = isChecked ? 'var(--fuji-blue-lake)' : 'var(--glass-border-subtle)';
            parentLabel.style.color = isChecked ? 'var(--toan-navy)' : 'var(--text-primary)';
            parentLabel.style.fontWeight = isChecked ? '700' : '500';
          }
        }
      });
    }

    modal.innerHTML = `
      <div class="modal-box" style="max-width:540px; max-height:88vh; display:flex; flex-direction:column; padding:20px; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--glass-border-subtle);">
          <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-title); margin:0;">${titleText}</h3>
          <button type="button" class="btn-close-sheet" id="btn-close-study-modal" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:var(--text-muted);">✕</button>
        </div>

        <div style="overflow-y:auto; flex:1; padding-right:4px;">
          <!-- Lựa chọn 1: Học ngay bài đang xem -->
          <div id="btn-quick-start-current" style="background:var(--toan-light-blue); border:1.5px solid var(--fuji-blue-lake); border-radius:var(--radius-md); padding:10px 14px; cursor:pointer; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; transition:all 0.15s ease;">
            <div>
              <div style="font-weight:800; color:var(--toan-navy); font-size:0.95rem;">
                ${isCurrentCustom ? '⚡ Học riêng Sổ tay cá nhân' : `⚡ Học riêng Bài ${selectedLesson}`}
              </div>
            </div>
            <button class="btn btn-primary btn-sm" style="font-size:0.8rem; padding:6px 12px; pointer-events:none; flex-shrink:0;">Học ngay →</button>
          </div>

          <!-- Lựa chọn 2: Chọn gộp nhiều bài -->
          <div style="font-size:0.88rem; font-weight:800; color:var(--text-title); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <span>Chọn gộp bài:</span>
            <span id="modal-word-counter" style="color:var(--fuji-blue-deep); font-size:0.84rem;">Đã chọn: ${tempSelected.size} bài</span>
          </div>

          <!-- Presets lọc nhanh -->
          <div class="vocab-presets-grid" style="margin-bottom:10px;">
            <button class="btn-preset" data-mpreset="all">Tất cả 58 bài</button>
            <button class="btn-preset" data-mpreset="custom-only" style="color:#b45309; font-weight:700;">⭐ Chỉ Sổ tay</button>
            <button class="btn-preset" data-mpreset="add-custom" style="color:#b45309;">+ Sổ tay</button>
            <button class="btn-preset" data-mpreset="clear">Bỏ chọn</button>
            <button class="btn-preset" data-mpreset="1-10">1-10</button>
            <button class="btn-preset" data-mpreset="11-20">11-20</button>
            <button class="btn-preset" data-mpreset="21-30">21-30</button>
            <button class="btn-preset" data-mpreset="31-40">31-40</button>
            <button class="btn-preset" data-mpreset="41-50">41-50</button>
            <button class="btn-preset" data-mpreset="51-58">51-58</button>
          </div>

          <!-- Danh sách Checkboxes bài học (bao gồm Sổ tay cá nhân ở trên) -->
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(105px, 1fr)); gap:6px; max-height:240px; overflow-y:auto; padding:8px 4px; background:rgba(255,255,255,0.4); border-radius:var(--radius-sm); border:1px solid var(--glass-border-subtle);" id="modal-lessons-grid">
            <label style="grid-column: 1 / -1; display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:6px; background:${tempSelected.has('custom') ? 'rgba(245,158,11,0.18)' : '#fff'}; border:1.5px solid ${tempSelected.has('custom') ? '#d97706' : 'var(--glass-border-subtle)'}; cursor:pointer; font-size:0.85rem; font-weight:700; color:${tempSelected.has('custom') ? '#b45309' : 'var(--text-primary)'}; user-select:none;">
              <input type="checkbox" data-modal-lesson="custom" ${tempSelected.has('custom') ? 'checked' : ''} style="accent-color:#d97706; width:15px; height:15px; cursor:pointer;">
              <span>📝 Từ Vựng Cá Nhân (${getCustomWords().length} từ)</span>
            </label>
            ${lessonKeys.map(k => {
      const isChecked = tempSelected.has(k);
      const count = (state.vocabData[k] || []).length;
      return `
                <label style="display:flex; align-items:center; gap:6px; padding:6px 8px; border-radius:6px; background:${isChecked ? 'var(--toan-light-blue)' : '#fff'}; border:1px solid ${isChecked ? 'var(--fuji-blue-lake)' : 'var(--glass-border-subtle)'}; cursor:pointer; font-size:0.8rem; font-weight:${isChecked ? '700' : '500'}; color:${isChecked ? 'var(--toan-navy)' : 'var(--text-primary)'}; user-select:none;">
                  <input type="checkbox" data-modal-lesson="${k}" ${isChecked ? 'checked' : ''} style="accent-color:var(--toan-navy); width:14px; height:14px; cursor:pointer;">
                  <span>Bài ${k} (${count})</span>
                </label>
              `;
    }).join('')}
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--glass-border-subtle); display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <button class="btn btn-secondary btn-sm" id="btn-cancel-study-modal" style="font-weight:600;">Hủy</button>
          <button class="btn btn-primary btn-sm" id="btn-confirm-multi-study" style="font-weight:700;">
            ${startBtnText} (${calcTotalWords()} từ)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#btn-close-study-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-cancel-study-modal')?.addEventListener('click', closeModal);

    // Click quick start current lesson
    modal.querySelector('#btn-quick-start-current')?.addEventListener('click', () => {
      studyLessons = new Set([selectedLesson]);
      state.selectedVocabLessons = [selectedLesson];
      currentTab = targetMode;
      state.vocabTab = targetMode;
      closeModal();
      flashcardIndex = 0;
      flashcardQueue = [];
      flashcardQueueIndex = 0;
      flashcardMasteredSet.clear();
      isFlashcardFinished = false;
      isCardFlipped = false;
      if (targetMode === 'quiz') initQuiz();
      if (targetMode === 'match') initMatchGame();
      updateSidebarModeButtons();
      renderContent();
    });

    // Checkbox changes
    modal.querySelectorAll('[data-modal-lesson]').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const k = chk.getAttribute('data-modal-lesson');
        if (e.target.checked) {
          tempSelected.add(k);
        } else {
          tempSelected.delete(k);
        }
        updateModalUI();
      });
    });

    // Presets inside modal
    modal.querySelectorAll('[data-mpreset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-mpreset');
        if (type === 'all') {
          lessonKeys.forEach(k => tempSelected.add(k));
        } else if (type === 'custom-only') {
          tempSelected.clear();
          tempSelected.add('custom');
        } else if (type === 'add-custom') {
          tempSelected.add('custom');
        } else if (type === 'clear') {
          tempSelected.clear();
        } else if (type === '1-10') {
          tempSelected.clear();
          lessonKeys.slice(0, 10).forEach(k => tempSelected.add(k));
        } else if (type === '11-20') {
          tempSelected.clear();
          lessonKeys.slice(10, 20).forEach(k => tempSelected.add(k));
        } else if (type === '21-30') {
          tempSelected.clear();
          lessonKeys.slice(20, 30).forEach(k => tempSelected.add(k));
        } else if (type === '31-40') {
          tempSelected.clear();
          lessonKeys.slice(30, 40).forEach(k => tempSelected.add(k));
        } else if (type === '41-50') {
          tempSelected.clear();
          lessonKeys.slice(40, 50).forEach(k => tempSelected.add(k));
        } else if (type === '51-58') {
          tempSelected.clear();
          lessonKeys.slice(50, 58).forEach(k => tempSelected.add(k));
        }
        updateModalUI();
      });
    });

    // Confirm multi-lesson
    modal.querySelector('#btn-confirm-multi-study')?.addEventListener('click', () => {
      if (tempSelected.size === 0) {
        showToast('⚠️ Vui lòng chọn ít nhất 1 bài để bắt đầu học!');
        return;
      }
      studyLessons = new Set(tempSelected);
      state.selectedVocabLessons = Array.from(studyLessons);
      currentTab = targetMode;
      state.vocabTab = targetMode;
      closeModal();
      flashcardIndex = 0;
      flashcardQueue = [];
      flashcardQueueIndex = 0;
      flashcardMasteredSet.clear();
      isFlashcardFinished = false;
      isCardFlipped = false;
      if (targetMode === 'quiz') initQuiz();
      if (targetMode === 'match') initMatchGame();
      updateSidebarModeButtons();
      renderContent();
    });
  }

  function setupMainEventListeners() {
    document.getElementById('btn-back-home')?.addEventListener('click', () => {
      cleanupKeyHandler();
      cleanupFlashcardHandlers();
      navigate('home');
    });

    // Category Tabs click (Chuyển giữa Từ vựng bài học, Sổ tay cá nhân & các chuyên đề)
    document.querySelectorAll('#vocab-category-tabs .tab-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        if (cat === activeCategory) return;
        cleanupKeyHandler();
        cleanupFlashcardHandlers();
        activeCategory = cat;
        state.vocabCategory = cat;
        currentTab = 'list';
        state.vocabTab = 'list';

        if (cat === 'custom') {
          selectedLesson = 'custom';
          state.selectedVocabLesson = 'custom';
          studyLessons = new Set(['custom']);
          state.selectedVocabLessons = ['custom'];
        } else if (cat === 'lesson') {
          if (selectedLesson === 'custom') selectedLesson = '1';
          state.selectedVocabLesson = selectedLesson;
          studyLessons = new Set([selectedLesson]);
          state.selectedVocabLessons = [selectedLesson];
        }

        // Update active class on pills
        document.querySelectorAll('#vocab-category-tabs .tab-pill').forEach(p => {
          p.classList.toggle('active', p.getAttribute('data-cat') === cat);
        });

        // Show/hide desktop sidebar
        const isLessonOrCustom = (cat === 'lesson' || cat === 'custom');
        const sidebar = document.getElementById('vocab-sidebar');
        if (sidebar) sidebar.style.display = isLessonOrCustom ? '' : 'none';

        // Show/hide mobile lesson bar
        const mobBar = document.querySelector('.mobile-lesson-bar');
        if (mobBar) mobBar.style.display = isLessonOrCustom ? '' : 'none';

        // Highlight selected item in sidebar
        document.querySelectorAll('.vocab-lesson-item').forEach(item => {
          item.classList.toggle('selected', item.getAttribute('data-lesson') === selectedLesson);
        });

        // Update footer info
        const isCustom = selectedLesson === 'custom' || cat === 'custom';
        const currentWords = getCurrentLessonWords();
        const sideInfo = document.getElementById('sidebar-view-info');
        if (sideInfo) sideInfo.textContent = isCustom ? 'Sổ tay cá nhân' : `Bài ${selectedLesson}`;
        const sideBadge = document.getElementById('sidebar-view-badge');
        if (sideBadge) sideBadge.textContent = `${currentWords.length} từ`;

        updateSidebarModeButtons();
        renderContent();
      });
    });

    // Mobile drawer trigger
    document.getElementById('btn-open-mobile-lessons')?.addEventListener('click', openSheet);
    document.getElementById('btn-close-sheet')?.addEventListener('click', closeSheet);
    document.getElementById('sheet-overlay')?.addEventListener('click', closeSheet);

    // Mobile bar study buttons
    document.getElementById('btn-mobile-fc')?.addEventListener('click', () => {
      openStudyLessonPickerModal('flashcard');
    });
    document.getElementById('btn-mobile-quiz')?.addEventListener('click', () => {
      openStudyLessonPickerModal('quiz');
    });
    document.getElementById('btn-mobile-match')?.addEventListener('click', () => {
      openStudyLessonPickerModal('match');
    });

    // Desktop Sidebar Mode buttons
    document.getElementById('sidebar-btn-list')?.addEventListener('click', () => {
      cleanupKeyHandler();
      cleanupFlashcardHandlers();
      cleanupMatchGame();
      currentTab = 'list';
      state.vocabTab = 'list';
      updateSidebarModeButtons();
      renderContent();
    });

    document.getElementById('sidebar-btn-flashcard')?.addEventListener('click', () => {
      openStudyLessonPickerModal('flashcard');
    });

    document.getElementById('sidebar-btn-quiz')?.addEventListener('click', () => {
      openStudyLessonPickerModal('quiz');
    });

    document.getElementById('sidebar-btn-match')?.addEventListener('click', () => {
      openStudyLessonPickerModal('match');
    });
  }

  function attachLessonListEvents() {
    document.querySelectorAll('.vocab-lesson-item').forEach(item => {
      item.addEventListener('click', () => {
        const k = item.getAttribute('data-lesson');
        if (k) handleLessonClick(k);
      });
    });
  }

  function renderExtraCards(items) {
    if (!items || items.length === 0) {
      return `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Không tìm thấy dữ liệu phù hợp.</div>`;
    }

    if (activeCategory === 'prefix') {
      return items.map((it, idx) => {
        const prefixClean = (it.prefix || '').replace(/[～~]/g, '');
        const exampleWords = it.words || [];
        return `
          <div class="prefix-group-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
            <div>
              <div class="word-header" style="align-items:flex-start; margin-bottom:8px;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div class="word-kanji" style="font-size:1.75rem; color:var(--fuji-blue-deep); font-weight:800; font-family:var(--font-japanese);">${it.prefix || ''}</div>
                    <span style="font-size:0.75rem; background:rgba(37,99,235,0.1); color:var(--fuji-blue-primary); padding:3px 9px; border-radius:var(--radius-full); font-weight:700;">#${idx + 1} Tiền tố</span>
                  </div>
                  <div class="word-meaning" style="font-size:1.02rem; font-weight:700; color:var(--text-title); margin-top:6px;">
                    💡 ${it.meaning || ''}
                  </div>
                </div>
                <button class="icon-btn btn-audio" data-speak="${prefixClean}" title="Nghe phát âm tiền tố ${it.prefix}">🔊</button>
              </div>

              ${exampleWords.length > 0 ? `
                <div style="border-top: 1px solid var(--glass-border-subtle); padding-top: 10px; margin-top: 10px;">
                  <div style="font-size:0.78rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px; letter-spacing:0.5px;">
                    Từ ghép minh họa (${exampleWords.length}):
                  </div>
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${exampleWords.map(w => {
          const cleanWord = (w.word || '').split('＝')[0].replace(/[（(][^）)]*[）)]/g, '').trim();
          const maziiUrl = cleanWord ? `https://mazii.net/vi-VN/search/word/javi/${encodeURIComponent(cleanWord)}` : '#';
          return `
                      <div class="extra-word-row" data-search="${cleanWord}" title="Bấm để tra cứu '${cleanWord}' trên Mazii" style="background:rgba(255, 255, 255, 0.75); border:1px solid var(--glass-border-subtle); border-radius:var(--radius-sm); padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                        <div style="flex:1; min-width:0;">
                          <!-- Dòng 1: Kanji -->
                          <div style="font-family:var(--font-japanese); font-weight:800; font-size:1.15rem; color:var(--text-title); line-height:1.2;">${w.word || ''}</div>
                          <!-- Dòng 2: Hiragana -->
                          ${w.reading ? `<div style="font-size:0.86rem; color:var(--fuji-blue-primary); font-weight:700; margin-top:3px; line-height:1.2;">${w.reading}</div>` : ''}
                          <!-- Dòng 3: Nghĩa -->
                          <div style="font-size:0.9rem; color:var(--text-secondary); margin-top:4px; line-height:1.4; word-break:break-word;">${w.meaning || ''}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                          <a href="${maziiUrl}" target="_blank" rel="noopener noreferrer" class="btn-mazii-icon" title="Tra cứu '${cleanWord}' trên từ điển Mazii">
                            🔍
                          </a>
                          <button class="icon-btn btn-audio" data-speak="${w.reading || cleanWord}" title="Nghe phát âm '${cleanWord}'" style="width:34px; height:34px; font-size:0.9rem;">🔊</button>
                        </div>
                      </div>
                    `;
        }).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    return items.map((it, idx) => {
      const searchTarget = it.word ? it.word.split('＝')[0].replace(/[（(][^）)]*[）)]/g, '').trim() : '';
      const maziiUrl = searchTarget ? `https://mazii.net/vi-VN/search/word/javi/${encodeURIComponent(searchTarget)}` : '#';
      return `
        <div class="word-item-card" data-search="${searchTarget}" title="Bấm để tra cứu '${searchTarget}' trên Mazii" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px; cursor:pointer;">
          <div>
            <div class="word-header" style="align-items:flex-start; margin-bottom:8px;">
              <div style="flex:1; min-width:0;">
                <div class="word-kanji" style="font-size:1.45rem; color:var(--text-title); font-family:var(--font-japanese); line-height:1.3; word-break:break-word;">${it.word || ''}</div>
                ${it.reading ? `<div class="word-reading" style="font-size:0.92rem; color:var(--fuji-blue-primary); font-weight:700; margin-top:4px;">${it.reading}</div>` : ''}
              </div>
              <div style="display:flex; align-items:center; gap:6px; flex-shrink:0; margin-left:8px;">
                ${searchTarget ? `
                  <a href="${maziiUrl}" target="_blank" rel="noopener noreferrer" class="btn-mazii-icon" title="Tra cứu '${searchTarget}' trên Mazii">
                    🔍
                  </a>
                ` : ''}
                <button class="icon-btn btn-audio" data-speak="${it.reading || searchTarget}" title="Nghe phát âm" style="width:34px; height:34px; font-size:0.95rem;">🔊</button>
              </div>
            </div>
            <div class="word-meaning" style="white-space: pre-line; line-height:1.6; font-size:0.95rem; color:var(--text-secondary); margin-top:8px;">${it.meaning || ''}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function attachExtraEventListeners() {
    const searchInput = document.getElementById('extra-search');
    const items = getExtraItems(activeCategory);

    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = items.filter(it => {
        if (it.prefix) {
          const matchPrefix = it.prefix.toLowerCase().includes(q) ||
            (it.meaning && it.meaning.toLowerCase().includes(q));
          const matchWords = it.words && it.words.some(w =>
            (w.word && w.word.toLowerCase().includes(q)) ||
            (w.reading && w.reading.toLowerCase().includes(q)) ||
            (w.meaning && w.meaning.toLowerCase().includes(q))
          );
          return matchPrefix || matchWords;
        }
        return (it.word && it.word.toLowerCase().includes(q)) ||
          (it.reading && it.reading.toLowerCase().includes(q)) ||
          (it.meaning && it.meaning.toLowerCase().includes(q));
      });
      const grid = document.getElementById('extra-list-grid');
      if (grid) {
        grid.innerHTML = renderExtraCards(filtered);
        attachExtraCardListeners();
      }
    });

    attachExtraCardListeners();
  }

  function attachExtraCardListeners() {
    container.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });

    // Row click in prefix
    container.querySelectorAll('.extra-word-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-audio') || e.target.closest('a')) return;
        e.stopPropagation();
        const searchWord = row.getAttribute('data-search');
        if (searchWord) openMazii(searchWord);
      });
    });

    // Card click in mimetic & synonym
    container.querySelectorAll('.extra-vocab-wrapper .word-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-audio') || e.target.closest('a')) return;
        const searchWord = card.getAttribute('data-search');
        if (searchWord) openMazii(searchWord);
      });
    });
  }

  function renderContent() {
    const content = document.getElementById('vocab-tab-content');
    if (!content) return;

    updateSidebarModeButtons();

    if (activeCategory === 'prefix' || activeCategory === 'mimetic' || activeCategory === 'synonym') {
      content.innerHTML = `
        <div class="extra-vocab-wrapper" style="width:100%;">
          <div class="search-bar-wrapper" style="margin-bottom: 18px;">
            <span class="search-icon">🔍</span>
            <input type="text" id="extra-search" class="search-input" placeholder="Tìm kiếm trong mục ${extraTabLabels[activeCategory]}...">
          </div>
          <div class="word-list" id="extra-list-grid">
            ${renderExtraCards(getExtraItems(activeCategory))}
          </div>
        </div>
      `;
      attachExtraEventListeners();
      return;
    }

    if (currentTab === 'list') {
      cleanupKeyHandler();
      cleanupFlashcardHandlers();
      cleanupMatchGame();
      if (activeCategory === 'custom' || selectedLesson === 'custom') {
        renderCustomVocabView(content);
      } else {
        const words = getCurrentLessonWords();
        renderListView(content, words);
      }
    } else if (currentTab === 'flashcard') {
      cleanupMatchGame();
      const words = getStudyWords();
      renderFlashcardView(content, words);
    } else if (currentTab === 'quiz') {
      cleanupKeyHandler();
      cleanupFlashcardHandlers();
      cleanupMatchGame();
      const words = getStudyWords();
      renderQuizView(content, words);
    } else if (currentTab === 'match') {
      cleanupKeyHandler();
      cleanupFlashcardHandlers();
      const words = getStudyWords();
      renderMatchGameView(content, words);
    }
  }

  let editingCustomWordId = null;

  function renderCustomVocabView(content) {
    cleanupKeyHandler();
    cleanupFlashcardHandlers();
    const words = getCustomWords();
    const hasToken = GitHubSync.hasToken();

    content.innerHTML = `
      <div class="custom-vocab-container" style="width:100%;">
        <!-- Action Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 16px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:8px;">
              <span>📝 Từ Vựng Cá Nhân</span>
              <span class="badge" style="background:rgba(245,158,11,0.15); color:#b45309; padding:3px 10px; border-radius:12px; font-size:0.82rem; font-weight:800;">${words.length} từ</span>
            </h3>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:3px;">
              Thêm từ mới, học Flashcard riêng hoặc gộp với các bài N2, và tự động đồng bộ lên GitHub
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" id="btn-show-add-custom" style="display:inline-flex; align-items:center; gap:6px; font-weight:700;">
              <span>➕ Thêm Từ Mới</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-github-sync-custom" title="Cài đặt mã token để đồng bộ lên GitHub" style="font-weight:600;">
              ${hasToken ? '✅ Đã kết nối GitHub' : '🔗 Kết nối GitHub'}
            </button>
          </div>
        </div>

        <!-- Add/Edit Word Form Box (Collapsible) -->
        <div id="add-custom-word-container" style="display:none; margin-bottom: 20px;">
          <form class="custom-form" id="form-add-custom-word">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h4 id="form-custom-title" style="font-size:1.1rem; font-weight:800; color:var(--toan-navy);">
                Thêm từ vựng mới vào sổ tay
              </h4>
              <span style="font-size:0.78rem; color:var(--text-muted);">Tự động lưu vào <code>data/personal_vocab.json</code></span>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
              <div class="form-group">
                <label class="form-label">Từ vựng (Kanji / Word) *</label>
                <input type="text" id="custom-input-word" class="form-input" placeholder="Ví dụ: 悪影響" required>
              </div>
              <div class="form-group">
                <label class="form-label">Cách đọc (Furigana / Reading)</label>
                <input type="text" id="custom-input-reading" class="form-input" placeholder="Ví dụ: あくえいきょう">
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
              <div class="form-group">
                <label class="form-label">Nghĩa tiếng Việt *</label>
                <input type="text" id="custom-input-meaning" class="form-input" placeholder="Ví dụ: Ảnh hưởng xấu" required>
              </div>
              <div class="form-group">
                <label class="form-label">Âm Hán Việt (Tùy chọn)</label>
                <input type="text" id="custom-input-hanviet" class="form-input" placeholder="Ví dụ: ÁC ẢNH HƯỞNG">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Ví dụ minh họa (Tùy chọn)</label>
              <textarea id="custom-input-example" class="form-textarea" rows="2" placeholder="Ví dụ: 環境に悪影響を与える。 (Gây ảnh hưởng xấu tới môi trường)"></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-custom-add">Hủy</button>
              <button type="submit" class="btn btn-primary btn-sm" id="btn-submit-custom-word">💾 Lưu từ vựng & Đồng bộ</button>
            </div>
          </form>
        </div>

        <!-- Search Bar -->
        <div class="search-bar-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" id="custom-vocab-search" class="search-input" placeholder="Tìm kiếm từ trong Sổ tay cá nhân...">
        </div>

        <!-- Word List Cards Grid -->
        <div class="word-list" id="custom-words-grid">
          ${renderCustomWordCards(words)}
        </div>
      </div>
    `;

    setupCustomVocabEventListeners(content);
  }

  function renderCustomWordCards(items) {
    if (!items || items.length === 0) {
      return `
        <div style="grid-column: 1/-1; text-align:center; padding: 48px 20px; background:var(--glass-bg); border-radius:var(--radius-xl); border:1px solid var(--glass-border);">
          <div style="font-size:2.8rem; margin-bottom:10px;">📝</div>
          <h4 style="font-size:1.2rem; font-weight:800; color:var(--text-title); margin-bottom:6px;">Chưa có từ vựng nào trong Sổ tay</h4>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:16px;">Bấm nút "+ Thêm Từ Mới" phía trên để thêm những từ cần ghi nhớ riêng nhé!</p>
        </div>
      `;
    }
    return items.map((w, idx) => `
      <div class="word-item-card" data-search="${w.word || w.reading}" title="Bấm để tra cứu '${w.word || w.reading}' trên Mazii" style="display:flex; flex-direction:column; justify-content:space-between; min-height:140px; cursor:pointer;">
        <div>
          <div class="word-header" style="align-items:flex-start; margin-bottom:8px;">
            <div>
              <div class="word-kanji">${w.word || ''}</div>
              <div class="word-reading" style="margin-top:2px;">${w.reading || ''}</div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
              <button class="icon-btn btn-mazii-card" data-search="${w.word || w.reading}" title="Tra cứu '${w.word || w.reading}' trên Mazii" style="width:34px; height:34px; font-size:0.92rem; color:var(--fuji-blue-primary);">🔍</button>
              <button class="icon-btn btn-audio" data-speak="${w.word || w.reading}" title="Nghe phát âm" style="width:34px; height:34px; font-size:0.95rem;">🔊</button>
              <button class="icon-btn btn-edit-custom-item" data-id="${w.id || idx}" title="Chỉnh sửa từ vựng này" style="color:var(--fuji-blue-primary); width:34px; height:34px; font-size:0.9rem;">✏️</button>
              <button class="icon-btn btn-del-custom-item" data-id="${w.id || idx}" data-word="${w.word || w.reading}" title="Xóa từ khỏi sổ tay" style="color:#ef4444; width:34px; height:34px; font-size:0.9rem;">🗑️</button>
            </div>
          </div>
          ${w.kanji_meaning ? `
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
            <span class="word-hanviet">${w.kanji_meaning}</span>
          </div>` : ''}
          <div class="word-meaning">${w.meaning || ''}</div>
          ${w.example ? `<div class="word-example" style="margin-top:6px;">${w.example}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  function setupCustomVocabEventListeners(content) {
    const addBox = document.getElementById('add-custom-word-container');
    const form = document.getElementById('form-add-custom-word');
    const titleEl = document.getElementById('form-custom-title');
    const submitBtn = document.getElementById('btn-submit-custom-word');
    const searchInput = document.getElementById('custom-vocab-search');
    const grid = document.getElementById('custom-words-grid');

    // Toggle add form
    document.getElementById('btn-show-add-custom')?.addEventListener('click', () => {
      editingCustomWordId = null;
      form.reset();
      titleEl.textContent = 'Thêm từ vựng mới vào sổ tay';
      submitBtn.textContent = '💾 Lưu từ vựng & Đồng bộ';
      addBox.style.display = addBox.style.display === 'none' ? 'block' : 'none';
      if (addBox.style.display === 'block') {
        document.getElementById('custom-input-word').focus();
      }
    });

    document.getElementById('btn-cancel-custom-add')?.addEventListener('click', () => {
      editingCustomWordId = null;
      addBox.style.display = 'none';
    });

    document.getElementById('btn-github-sync-custom')?.addEventListener('click', () => {
      GitHubSync.showTokenModal((token) => {
        render();
        if (token) showToast('Đã lưu mã GitHub Token!');
      });
    });

    // Form submit (Add or Edit)
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const word = document.getElementById('custom-input-word').value.trim();
      const reading = document.getElementById('custom-input-reading').value.trim();
      const meaning = document.getElementById('custom-input-meaning').value.trim();
      const kanji_meaning = document.getElementById('custom-input-hanviet').value.trim();
      const example = document.getElementById('custom-input-example').value.trim();

      if (!word || !meaning) return;

      let currentWords = [...getCustomWords()];
      const isEdit = editingCustomWordId !== null;

      if (isEdit) {
        currentWords = currentWords.map((item, idx) => {
          if ((item.id && item.id === editingCustomWordId) || idx.toString() === editingCustomWordId) {
            return {
              ...item,
              word,
              reading,
              meaning,
              kanji_meaning,
              example,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        });
        showToast(`Đã cập nhật từ '${word}'!`);
      } else {
        const newWord = {
          id: Date.now().toString(),
          word,
          reading,
          meaning,
          kanji_meaning,
          example,
          createdAt: new Date().toISOString()
        };
        currentWords.unshift(newWord);
        showToast(`Đã thêm từ '${word}' vào sổ tay!`);
      }

      saveCustomWords(currentWords);
      editingCustomWordId = null;
      form.reset();
      addBox.style.display = 'none';

      // Update counters
      const sideBadge = document.getElementById('sidebar-view-badge');
      if (sideBadge && selectedLesson === 'custom') sideBadge.textContent = `${currentWords.length} từ`;
      const customPill = document.querySelector('#vocab-category-tabs .tab-pill[data-cat="custom"]');
      if (customPill) customPill.textContent = `📝 Từ Vựng Cá Nhân (${currentWords.length})`;

      renderContent();

      // Sync to GitHub personal_vocab.json
      showToast('⏳ Đang đồng bộ sổ tay lên GitHub...');
      const syncRes = await GitHubSync.commitFile(
        'data/personal_vocab.json',
        currentWords,
        `${isEdit ? 'Cập nhật' : 'Thêm'} từ '${word}' trong sổ tay cá nhân`
      );
      if (syncRes.success) {
        showToast('✅ Đã đồng bộ lên GitHub thành công!');
      } else {
        showToast('⚠️ Đã lưu tại máy. ' + syncRes.message);
      }
    });

    // Search input
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const allWords = getCustomWords();
      const filtered = allWords.filter(w =>
        (w.word && w.word.toLowerCase().includes(q)) ||
        (w.reading && w.reading.toLowerCase().includes(q)) ||
        (w.meaning && w.meaning.toLowerCase().includes(q)) ||
        (w.kanji_meaning && w.kanji_meaning.toLowerCase().includes(q))
      );
      grid.innerHTML = renderCustomWordCards(filtered);
      attachCustomCardItemEvents();
    });

    attachCustomCardItemEvents();
  }

  function attachCustomCardItemEvents() {
    const addBox = document.getElementById('add-custom-word-container');
    const titleEl = document.getElementById('form-custom-title');
    const submitBtn = document.getElementById('btn-submit-custom-word');

    // Audio
    document.querySelectorAll('#custom-words-grid .btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });

    // Mazii
    document.querySelectorAll('#custom-words-grid .btn-mazii-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const searchWord = btn.getAttribute('data-search');
        if (searchWord) openMazii(searchWord);
      });
    });

    // Edit item
    document.querySelectorAll('.btn-edit-custom-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const words = getCustomWords();
        const target = words.find((item, idx) => (item.id && item.id === id) || idx.toString() === id);
        if (!target) return;

        editingCustomWordId = id;
        document.getElementById('custom-input-word').value = target.word || '';
        document.getElementById('custom-input-reading').value = target.reading || '';
        document.getElementById('custom-input-meaning').value = target.meaning || '';
        document.getElementById('custom-input-hanviet').value = target.kanji_meaning || '';
        document.getElementById('custom-input-example').value = target.example || '';

        titleEl.textContent = `Chỉnh sửa từ '${target.word}'`;
        submitBtn.textContent = '💾 Lưu thay đổi & Đồng bộ';
        addBox.style.display = 'block';
        window.scrollTo({ top: addBox.offsetTop - 80, behavior: 'smooth' });
      });
    });

    // Delete item
    document.querySelectorAll('.btn-del-custom-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const wordText = btn.getAttribute('data-word');
        if (!confirm(`Bạn có chắc chắn muốn xóa từ '${wordText}' khỏi sổ tay cá nhân?`)) return;

        let words = getCustomWords().filter((item, idx) => (item.id && item.id !== id) && idx.toString() !== id);
        saveCustomWords(words);
        showToast(`Đã xóa từ '${wordText}'!`);

        // Update counters
        const sideBadge = document.getElementById('sidebar-view-badge');
        if (sideBadge && selectedLesson === 'custom') sideBadge.textContent = `${words.length} từ`;
        const customPill = document.querySelector('#vocab-category-tabs .tab-pill[data-cat="custom"]');
        if (customPill) customPill.textContent = `📝 Từ Vựng Cá Nhân (${words.length})`;

        renderContent();

        // Sync to GitHub
        showToast('⏳ Đang đồng bộ sau khi xóa lên GitHub...');
        const syncRes = await GitHubSync.commitFile(
          'data/personal_vocab.json',
          words,
          `Xóa từ '${wordText}' khỏi sổ tay cá nhân`
        );
        if (syncRes.success) {
          showToast('✅ Đã đồng bộ lên GitHub thành công!');
        } else {
          showToast('⚠️ Đã lưu tại máy. ' + syncRes.message);
        }
      });
    });

    // Whole card click = Mazii
    document.querySelectorAll('#custom-words-grid .word-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-audio') || e.target.closest('.btn-edit-custom-item') || e.target.closest('.btn-del-custom-item')) return;
        const searchWord = card.getAttribute('data-search');
        if (searchWord) openMazii(searchWord);
      });
    });
  }

  function openEditCustomWordModal(currentWord, onSaved) {
    let modal = document.getElementById('modal-edit-custom-fc');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'modal-edit-custom-fc';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 480px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
          <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:8px;">
            <span>✏️</span>
            <span>Chỉnh Sửa Từ Trong Sổ Tay Cá Nhân</span>
          </h3>
          <button id="btn-close-edit-custom-modal" style="background:none; border:none; font-size:1.3rem; cursor:pointer; color:var(--text-muted); line-height:1;">✕</button>
        </div>

        <div style="grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 12px; display:grid;">
          <div class="form-group">
            <label style="display:block; font-size:0.84rem; font-weight:700; color:var(--text-title); margin-bottom:4px;">
              Từ vựng (Kanji):
            </label>
            <input type="text" id="input-edit-c-word" class="form-input" value="${currentWord.word || ''}">
          </div>
          <div class="form-group">
            <label style="display:block; font-size:0.84rem; font-weight:700; color:var(--text-title); margin-bottom:4px;">
              Cách đọc (Hiragana):
            </label>
            <input type="text" id="input-edit-c-reading" class="form-input" value="${currentWord.reading || ''}">
          </div>
        </div>

        <div style="grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 12px; display:grid;">
          <div class="form-group">
            <label style="display:block; font-size:0.84rem; font-weight:700; color:var(--text-title); margin-bottom:4px;">
              Âm Hán (Hán Việt):
            </label>
            <input type="text" id="input-edit-c-hanviet" class="form-input" value="${currentWord.kanji_meaning || ''}">
          </div>
          <div class="form-group">
            <label style="display:block; font-size:0.84rem; font-weight:700; color:var(--text-title); margin-bottom:4px;">
              Nghĩa tiếng Việt *:
            </label>
            <input type="text" id="input-edit-c-meaning" class="form-input" value="${currentWord.meaning || ''}">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display:block; font-size:0.88rem; font-weight:700; color:var(--text-title); margin-bottom:6px;">
            Ví dụ minh họa:
          </label>
          <textarea id="input-edit-c-example" class="form-textarea" rows="2" placeholder="Ví dụ câu minh họa...">${currentWord.example || ''}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-edit-custom-fc">Hủy</button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-edit-custom-fc" style="font-weight:700;">💾 Lưu & Đồng bộ</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const close = () => modal.remove();
    document.getElementById('btn-close-edit-custom-modal')?.addEventListener('click', close);
    document.getElementById('btn-cancel-edit-custom-fc')?.addEventListener('click', close);

    document.getElementById('btn-save-edit-custom-fc')?.addEventListener('click', async () => {
      const newWord = document.getElementById('input-edit-c-word')?.value.trim();
      const newReading = document.getElementById('input-edit-c-reading')?.value.trim();
      const newHanviet = document.getElementById('input-edit-c-hanviet')?.value.trim();
      const newMeaning = document.getElementById('input-edit-c-meaning')?.value.trim();
      const newExample = document.getElementById('input-edit-c-example')?.value.trim();

      if (!newMeaning) {
        alert('Nghĩa tiếng Việt không được để trống!');
        return;
      }

      currentWord.word = newWord || currentWord.word;
      currentWord.reading = newReading;
      currentWord.kanji_meaning = newHanviet;
      currentWord.meaning = newMeaning;
      currentWord.example = newExample;

      // Update in state.customVocab
      const list = getCustomWords();
      const target = list.find(w => (currentWord.id && w.id === currentWord.id) || w.word === currentWord.word);
      if (target) {
        target.word = currentWord.word;
        target.reading = currentWord.reading;
        target.kanji_meaning = currentWord.kanji_meaning;
        target.meaning = currentWord.meaning;
        target.example = currentWord.example;
        saveCustomWords(list);
      }

      close();
      if (onSaved) onSaved(currentWord);

      showToast(`⏳ Đang cập nhật '${currentWord.word}' lên GitHub...`);
      const syncRes = await GitHubSync.commitFile(
        'data/personal_vocab.json',
        getCustomWords(),
        `Cập nhật từ '${currentWord.word}' trong sổ tay cá nhân`
      );
      if (syncRes.success) {
        showToast('✅ Đã lưu và đồng bộ lên GitHub thành công!');
      } else {
        showToast('⚠️ Đã lưu tại máy. ' + syncRes.message);
      }
    });
  }

  // ─── 1. LIST VIEW ────────────────────────────────────────────────────────────
  function renderListView(content, words) {
    content.innerHTML = `
      <div class="search-bar-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" id="vocab-search" class="search-input" placeholder="Tìm kiếm từ vựng (Kanji, Hiragana, Nghĩa)...">
      </div>
      <div class="word-list" id="words-grid">
        ${renderWordCards(words)}
      </div>
    `;

    document.getElementById('vocab-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = words.filter(w =>
        (w.word && w.word.toLowerCase().includes(q)) ||
        (w.reading && w.reading.toLowerCase().includes(q)) ||
        (w.meaning && w.meaning.toLowerCase().includes(q)) ||
        (w.kanji_meaning && w.kanji_meaning.toLowerCase().includes(q))
      );
      document.getElementById('words-grid').innerHTML = renderWordCards(filtered);
      attachWordCardEvents();
    });

    attachWordCardEvents();
  }

  function renderWordCards(items) {
    if (!items || items.length === 0) {
      return `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Không tìm thấy từ vựng nào trong Bài ${selectedLesson}.</div>`;
    }
    return items.map((w) => `
      <div class="word-item-card" data-search="${w.word || w.reading}" title="Bấm để tra cứu '${w.word || w.reading}' trên Mazii" style="display:flex; flex-direction:column; justify-content:space-between; min-height:140px; cursor:pointer;">
        <div>
          <div class="word-header" style="align-items:flex-start; margin-bottom:8px;">
            <div>
              <div class="word-kanji">${w.word || ''}</div>
              <div class="word-reading" style="margin-top:2px;">${w.reading || ''}</div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
              <button class="icon-btn btn-mazii-card" data-search="${w.word || w.reading}" title="Tra cứu '${w.word || w.reading}' trên Mazii" style="width:34px; height:34px; font-size:0.92rem; color:var(--fuji-blue-primary);">🔍</button>
              <button class="icon-btn btn-audio" data-speak="${w.word || w.reading}" title="Nghe phát âm" style="width:34px; height:34px; font-size:0.95rem;">🔊</button>
              <button class="icon-btn btn-edit-meaning" data-lesson="${w._lesson}" data-word="${w.word}" title="Chỉnh sửa nghĩa tiếng Việt" style="color:var(--fuji-blue-primary); width:34px; height:34px; font-size:0.9rem;">✏️</button>
            </div>
          </div>
          ${w.kanji_meaning ? `
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
            <span class="word-hanviet">${w.kanji_meaning}</span>
          </div>` : ''}
          <div class="word-meaning">${w.meaning || ''}</div>
          ${w.example ? `<div class="word-example" style="margin-top:6px;">${w.example}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  function attachWordCardEvents() {
    document.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });

    document.querySelectorAll('.btn-mazii-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const searchWord = btn.getAttribute('data-search');
        if (searchWord) openMazii(searchWord);
      });
    });

    document.querySelectorAll('.btn-edit-meaning').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lesson = btn.getAttribute('data-lesson');
        const wordText = btn.getAttribute('data-word');
        if (!lesson || !wordText || !state.vocabData[lesson]) return;

        const target = state.vocabData[lesson].find(item => item.word === wordText);
        if (!target) return;

        openEditMeaningModal(target, lesson);
      });
    });

    // Bấm vào thẻ từ bất kỳ chỗ nào cũng tương đương ấn search Mazii
    document.querySelectorAll('.word-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-audio') || e.target.closest('.btn-edit-meaning')) return;
        const searchWord = card.getAttribute('data-search');
        if (searchWord) openMazii(searchWord);
      });
    });
  }

  function openEditMeaningModal(w, lesson, onSaved) {
    let modal = document.getElementById('modal-edit-meaning');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'modal-edit-meaning';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 480px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
          <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:8px;">
            <span>✏️</span>
            <span>Chỉnh Sửa Từ Vựng (Bài ${lesson})</span>
          </h3>
          <button id="btn-close-edit-modal" style="background:none; border:none; font-size:1.3rem; cursor:pointer; color:var(--text-muted); line-height:1;">✕</button>
        </div>

        <div style="background: rgba(37,99,235,0.06); padding: 12px 14px; border-radius: var(--radius-sm); margin-bottom: 14px; border-left: 3px solid var(--fuji-blue-primary);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-family:var(--font-japanese); font-size:1.55rem; font-weight:800; color:var(--fuji-blue-deep);">${w.word}</span>
            </div>
            <span style="font-size:0.8rem; font-weight:700; background:rgba(37,99,235,0.1); color:var(--fuji-blue-deep); padding:2px 8px; border-radius:12px;">Bài ${lesson}</span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 12px;">
          <div class="form-group">
            <label style="display:block; font-size:0.84rem; font-weight:700; color:var(--text-title); margin-bottom:4px;">
              Cách đọc (Hiragana):
            </label>
            <input type="text" id="input-edit-reading" class="form-input" value="${w.reading || ''}" style="width:100%; border-radius:8px; padding:8px 10px; font-size:0.92rem; border:1px solid var(--glass-border);">
          </div>
          <div class="form-group">
            <label style="display:block; font-size:0.84rem; font-weight:700; color:var(--text-title); margin-bottom:4px;">
              Âm Hán (Hán Việt):
            </label>
            <input type="text" id="input-edit-hanviet" class="form-input" value="${w.kanji_meaning || ''}" style="width:100%; border-radius:8px; padding:8px 10px; font-size:0.92rem; border:1px solid var(--glass-border);">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display:block; font-size:0.88rem; font-weight:700; color:var(--text-title); margin-bottom:6px;">
            Nghĩa tiếng Việt:
          </label>
          <textarea id="input-edit-meaning-text" class="form-textarea" rows="3" style="width:100%; border-radius:10px; padding:10px 12px; font-size:0.95rem; border:1px solid var(--glass-border);" placeholder="Nhập nghĩa tiếng Việt...">${w.meaning || ''}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-edit-meaning">Hủy</button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-edit-meaning" style="font-weight:700;">💾 Lưu & Đồng bộ</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('btn-close-edit-modal')?.addEventListener('click', close);
    document.getElementById('btn-cancel-edit-meaning')?.addEventListener('click', close);

    document.getElementById('btn-save-edit-meaning')?.addEventListener('click', async () => {
      const newReading = document.getElementById('input-edit-reading')?.value.trim();
      const newHanviet = document.getElementById('input-edit-hanviet')?.value.trim();
      const newMeaning = document.getElementById('input-edit-meaning-text')?.value.trim();
      if (!newMeaning) {
        alert('Nghĩa tiếng Việt không được để trống!');
        return;
      }

      // Update in memory
      w.reading = newReading || w.reading;
      w.kanji_meaning = newHanviet;
      w.meaning = newMeaning;
      if (state.vocabData[lesson]) {
        const item = state.vocabData[lesson].find(it => it.word === w.word);
        if (item) {
          item.reading = w.reading;
          item.kanji_meaning = w.kanji_meaning;
          item.meaning = w.meaning;
        }
      }

      // Save to localStorage overrides
      const overrides = JSON.parse(localStorage.getItem('jlpt_vocab_overrides') || '{}');
      overrides[`${lesson}:::${w.word}`] = newMeaning;
      localStorage.setItem('jlpt_vocab_overrides', JSON.stringify(overrides));

      close();

      if (onSaved) {
        onSaved(w);
      } else {
        renderContent();
      }

      showToast(`⏳ Đang cập nhật từ '${w.word}' lên GitHub...`);
      const syncRes = await GitHubSync.commitFile(
        'data/vocab_data.json',
        state.vocabData,
        `Cập nhật nghĩa tiếng Việt từ '${w.word}' (Bài ${lesson})`
      );

      if (syncRes.success) {
        showToast(`✅ Đã cập nhật và đồng bộ file vocab_data.json lên GitHub thành công!`);
      } else {
        showToast(`⚠️ Đã lưu trên thiết bị. ${syncRes.error || ''}`);
      }
    });
  }

  // ─── 2. FLASHCARD 3D (Slow-motion hold & clean card) ────────────────────────
  function renderFlashcardView(content, words) {
    cleanupKeyHandler();
    cleanupFlashcardHandlers();

    if (!words || words.length === 0) {
      content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Vui lòng chọn ít nhất 1 bài để học Flashcard.</div>`;
      return;
    }

    if (flashcardQueue.length === 0 || flashcardOriginalLength !== words.length) {
      flashcardQueue = [...words];
      flashcardQueueIndex = 0;
      flashcardMasteredSet.clear();
      flashcardOriginalLength = words.length;
      isFlashcardFinished = false;
      isCardFlipped = false;
    }

    if (isFlashcardFinished) {
      content.innerHTML = `
        <div class="flashcard-container" style="text-align:center; padding: 48px 20px; background:var(--glass-bg); border-radius:var(--radius-xl); border:1px solid var(--glass-border); box-shadow:var(--shadow-glass); max-width:560px; margin: 20px auto;">
          <div style="font-size:3.5rem; margin-bottom:12px;">🎉</div>
          <h2 style="font-size:1.8rem; font-weight:800; color:var(--text-title); margin-bottom:10px;">Hoàn Thành Flashcard!</h2>
          <p style="color:var(--text-secondary); font-size:1.05rem; margin-bottom:24px; line-height:1.6;">
            Bạn đã thuộc toàn bộ <strong>${words.length}</strong> từ vựng (${studyLessons.size} bài đã chọn). Tất cả từ chưa thuộc đều đã được ôn tập lại và hoàn thành!
          </p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-fc-restart">Học lại từ đầu ↺</button>
            <button class="btn btn-secondary" id="btn-fc-shuffle-restart">🔀 Xáo trộn & học lại</button>
            <button class="btn btn-secondary" id="btn-fc-change-lessons-fin">📚 Đổi bài học ▾</button>
            <button class="btn btn-secondary" id="btn-fc-back-list">Xem danh sách từ →</button>
          </div>
        </div>
      `;

      document.getElementById('btn-fc-restart')?.addEventListener('click', () => {
        flashcardQueue = [...words];
        flashcardQueueIndex = 0;
        flashcardMasteredSet.clear();
        isFlashcardFinished = false;
        isCardFlipped = false;
        renderFlashcardView(content, words);
      });

      document.getElementById('btn-fc-shuffle-restart')?.addEventListener('click', () => {
        words.sort(() => Math.random() - 0.5);
        flashcardQueue = [...words];
        flashcardQueueIndex = 0;
        flashcardMasteredSet.clear();
        isFlashcardFinished = false;
        isCardFlipped = false;
        renderFlashcardView(content, words);
      });

      document.getElementById('btn-fc-change-lessons-fin')?.addEventListener('click', () => {
        openStudyLessonPickerModal('flashcard');
      });

      document.getElementById('btn-fc-back-list')?.addEventListener('click', () => {
        currentTab = 'list';
        state.vocabTab = 'list';
        renderContent();
      });

      return;
    }

    if (flashcardQueueIndex >= flashcardQueue.length) {
      flashcardQueueIndex = 0;
    }
    const currentWord = flashcardQueue[flashcardQueueIndex];
    const progressPercent = Math.round((flashcardMasteredSet.size / words.length) * 100);

    content.innerHTML = `
      <div class="flashcard-container">
        <!-- Header 1 hàng duy nhất: Bên trái là nút, bên phải là tiến độ -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
          <!-- Cụm trái: Nút điều hướng & tuỳ chọn -->
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-fc-back-to-list" style="font-weight:700; padding:6px 10px; font-size:0.82rem;">← Danh sách từ</button>
            <button class="btn btn-secondary btn-sm" id="btn-fc-change-lessons" style="font-weight:700; padding:6px 10px; font-size:0.82rem;">📚 Đổi bài (${studyLessons.size} bài) ▾</button>
            <button class="btn btn-secondary btn-sm" id="fc-shuffle" style="font-weight:700; padding:6px 10px; font-size:0.82rem;" title="Xáo trộn thứ tự các từ còn lại">🔀 Xáo trộn</button>
          </div>

          <!-- Cụm phải: Toàn bộ tiến độ cùng 1 hàng bên phải -->
          <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:700; flex-wrap:wrap;">
            <span style="color:var(--text-title);">Tiến độ: <strong style="color:var(--toan-navy); font-size:0.92rem;">${flashcardQueueIndex + 1}/${flashcardQueue.length}</strong></span>
            <span style="color:var(--accent-emerald);">Thuộc: <strong>${flashcardMasteredSet.size}/${words.length}</strong></span>
            <span class="badge" style="background:rgba(37,99,235,0.1); color:var(--fuji-blue-deep); padding:2px 8px; border-radius:12px; font-size:0.78rem; font-weight:800;">Còn ${flashcardQueue.length - flashcardQueueIndex}</span>
            <span style="font-size:0.8rem; color:var(--text-muted);">${progressPercent}%</span>
          </div>
        </div>

        <!-- Vạch tiến độ mỏng 4px nằm ngay dưới -->
        <div class="progress-track" style="margin-bottom:14px; height:4px; border-radius:2px; background:rgba(20,43,73,0.08); overflow:hidden;">
          <div class="progress-fill" style="width: ${progressPercent}%; height:100%; transition:width 0.3s ease; background:linear-gradient(90deg, var(--fuji-blue-primary), var(--accent-emerald));"></div>
        </div>

        <!-- 3D Card Scene -->
        <div class="flashcard-scene" id="fc-scene" style="touch-action: pan-y;">
          <div class="flashcard ${isCardFlipped ? 'is-flipped' : ''}" id="flashcard-box">
            <!-- Stamps for swipe feedback -->
            <div class="fc-stamp fc-stamp-mastered" id="fc-stamp-mastered">✓ ĐÃ THUỘC</div>
            <div class="fc-stamp fc-stamp-review" id="fc-stamp-review">✗ CHƯA THUỘC</div>

            <!-- Front Face: CHỈ hiển thị từ vựng chính + nút loa 🔊 -->
            <div class="flashcard-face flashcard-front">
              <div class="fc-word">${currentWord.word || currentWord.reading}</div>
              <button class="icon-btn btn-audio" data-speak="${currentWord.word || currentWord.reading}" style="margin-top:20px;" title="Nghe phát âm">🔊</button>
            </div>

            <!-- Back Face: Tra cứu Mazii gọn gàng chỉ icon 🔍 & nút sửa ✏️ -->
            <div class="flashcard-face flashcard-back">
              <div class="fc-back-topbar">
                <span class="fc-lesson-badge" style="${currentWord._isCustom ? 'background:rgba(245,158,11,0.15); color:#b45309; border-color:#d97706;' : ''}">${currentWord._isCustom ? '📝 Từ Vựng Cá Nhân' : `Bài ${currentWord._lesson || state.selectedVocabLesson || '1'}`}</span>
                <div style="display:flex; align-items:center; gap:6px;">
                  <button class="btn-fc-mazii" id="fc-btn-mazii" title="Tra cứu '${currentWord.word || currentWord.reading}' trên Mazii">🔍</button>
                  <button class="btn-fc-mazii" id="fc-btn-edit" title="Chỉnh sửa từ '${currentWord.word || currentWord.reading}'" style="color:var(--fuji-blue-primary);">✏️</button>
                </div>
              </div>

              <div class="fc-reading" style="font-size:1.45rem; color:var(--fuji-blue-deep); margin-bottom:6px; font-weight:700;">
                ${currentWord.word ? `${currentWord.word} （${currentWord.reading || ''}）` : (currentWord.reading || '')}
              </div>

              ${currentWord.kanji_meaning ? `<div class="fc-hanviet" style="margin-bottom:8px;">[${currentWord.kanji_meaning}]</div>` : ''}
              
              <div class="fc-meaning" style="font-size:1.35rem; font-weight:700; color:var(--text-title); margin-bottom:12px;">
                ${currentWord.meaning || ''}
              </div>

              ${currentWord.example ? `<div class="word-example" style="width:100%; text-align:left; max-height:100px; overflow-y:auto; margin-bottom:14px;">${currentWord.example}</div>` : ''}

              <button class="icon-btn btn-audio" data-speak="${currentWord.word || currentWord.reading}" title="Nghe phát âm">🔊</button>
            </div>
          </div>
        </div>

      </div>
    `;

    const cardBox = document.getElementById('flashcard-box');
    const stampMastered = document.getElementById('fc-stamp-mastered');
    const stampReview = document.getElementById('fc-stamp-review');

    function flipCard() {
      if (isAnimating) return;
      isCardFlipped = !isCardFlipped;
      cardBox.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
      cardBox.classList.toggle('is-flipped', isCardFlipped);
      cardBox.style.transform = isCardFlipped ? 'rotateY(180deg)' : '';
    }

    function advanceCard(direction) {
      if (direction === 'mastered') {
        flashcardMasteredSet.add(currentWord.word || currentWord.reading);
        flashcardQueueIndex++;
      } else if (direction === 'review') {
        if (isRepeatQueueMode) {
          flashcardQueue.push(currentWord);
        }
        flashcardQueueIndex++;
      } else {
        flashcardQueueIndex++;
      }

      if (flashcardQueueIndex >= flashcardQueue.length) {
        if (isRepeatQueueMode && flashcardMasteredSet.size >= words.length) {
          isFlashcardFinished = true;
        } else if (!isRepeatQueueMode) {
          flashcardQueueIndex = 0;
        } else {
          flashcardQueueIndex = 0;
        }
      }
      isCardFlipped = false;
      renderFlashcardView(content, words);
    }

    // SLOW-MOTION animation holding stamp clearly visible on screen before gliding away
    let isAnimating = false;

    function triggerSwipeAnimation(direction) {
      if (isAnimating) return;
      isAnimating = true;

      if (direction === 'right') {
        if (stampMastered) {
          stampMastered.style.opacity = '1';
          stampMastered.style.transform = 'scale(1.15) rotate(14deg)';
        }
        if (stampReview) stampReview.style.opacity = '0';

        cardBox.style.transition = 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)';
        cardBox.style.transform = `translate(48px, -12px) rotate(14deg) ${isCardFlipped ? 'rotateY(180deg)' : ''}`;

        setTimeout(() => {
          cardBox.style.transition = 'transform 0.42s cubic-bezier(0.4, 0, 1, 1), opacity 0.38s ease';
          cardBox.style.transform = `translate(115vw, 30px) rotate(32deg) ${isCardFlipped ? 'rotateY(180deg)' : ''}`;
          cardBox.style.opacity = '0';

          setTimeout(() => {
            isAnimating = false;
            advanceCard('mastered');
          }, 380);
        }, 550);
      } else {
        if (stampReview) {
          stampReview.style.opacity = '1';
          stampReview.style.transform = 'scale(1.15) rotate(-14deg)';
        }
        if (stampMastered) stampMastered.style.opacity = '0';

        cardBox.style.transition = 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)';
        cardBox.style.transform = `translate(-48px, -12px) rotate(-14deg) ${isCardFlipped ? 'rotateY(180deg)' : ''}`;

        setTimeout(() => {
          cardBox.style.transition = 'transform 0.42s cubic-bezier(0.4, 0, 1, 1), opacity 0.38s ease';
          cardBox.style.transform = `translate(-115vw, 30px) rotate(-32deg) ${isCardFlipped ? 'rotateY(180deg)' : ''}`;
          cardBox.style.opacity = '0';

          setTimeout(() => {
            isAnimating = false;
            advanceCard('review');
          }, 380);
        }, 550);
      }
    }

    // Drag, Swipe & Tap Handling via Pointer Events (unifies Mouse & Touch, avoids double events on mobile)
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;
    let currentPointerId = null;

    function onPointerDown(e) {
      if (isAnimating) return;
      if (e.target.closest('.btn-audio') || e.target.closest('#fc-btn-mazii') || e.target.closest('button') || e.target.closest('a')) return;
      if (e.button !== undefined && e.button !== 0) return; // Only primary mouse button
      if (e.isPrimary === false) return;

      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      currentPointerId = e.pointerId;
      cardBox.style.transition = 'none';
    }

    function onPointerMove(e) {
      if (!isDragging || isAnimating) return;
      if (currentPointerId !== null && e.pointerId !== currentPointerId) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        hasMoved = true;
      }

      if (hasMoved) {
        const rot = dx * 0.08;
        cardBox.style.transform = `translate(${dx}px, ${dy * 0.3}px) rotate(${rot}deg) ${isCardFlipped ? 'rotateY(180deg)' : ''}`;

        if (dx > 15) {
          if (stampMastered) stampMastered.style.opacity = Math.min(1, (dx - 15) / 80).toString();
          if (stampReview) stampReview.style.opacity = '0';
        } else if (dx < -15) {
          if (stampReview) stampReview.style.opacity = Math.min(1, (Math.abs(dx) - 15) / 80).toString();
          if (stampMastered) stampMastered.style.opacity = '0';
        } else {
          if (stampMastered) stampMastered.style.opacity = '0';
          if (stampReview) stampReview.style.opacity = '0';
        }
      }
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      if (currentPointerId !== null && e.pointerId !== currentPointerId) return;
      isDragging = false;
      currentPointerId = null;

      if (isAnimating) return;

      const dx = e.clientX - startX;

      // Tap / Click to flip: if not moved or movement < 12px
      if (!hasMoved || Math.abs(dx) < 12) {
        flipCard();
        return;
      }

      if (dx > 75) {
        triggerSwipeAnimation('right');
      } else if (dx < -75) {
        triggerSwipeAnimation('left');
      } else {
        cardBox.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        cardBox.style.transform = isCardFlipped ? 'rotateY(180deg)' : '';
        if (stampMastered) stampMastered.style.opacity = '0';
        if (stampReview) stampReview.style.opacity = '0';
      }
    }

    function onPointerCancel(e) {
      if (isDragging && (currentPointerId === null || e.pointerId === currentPointerId)) {
        isDragging = false;
        currentPointerId = null;
        cardBox.style.transition = 'transform 0.3s ease';
        cardBox.style.transform = isCardFlipped ? 'rotateY(180deg)' : '';
        if (stampMastered) stampMastered.style.opacity = '0';
        if (stampReview) stampReview.style.opacity = '0';
      }
    }

    const sceneEl = document.getElementById('fc-scene');
    sceneEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    activeFlashcardCleanups = () => {
      sceneEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };

    // Shuffle action
    document.getElementById('fc-shuffle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const remaining = flashcardQueue.slice(flashcardQueueIndex);
      remaining.sort(() => Math.random() - 0.5);
      flashcardQueue = [...flashcardQueue.slice(0, flashcardQueueIndex), ...remaining];
      isCardFlipped = false;
      showToast('Đã xáo trộn danh sách từ! 🔀');
      renderFlashcardView(content, words);
    });

    // Back to list button
    document.getElementById('btn-fc-back-to-list')?.addEventListener('click', () => {
      cleanupKeyHandler();
      cleanupFlashcardHandlers();
      currentTab = 'list';
      state.vocabTab = 'list';
      updateSidebarModeButtons();
      renderContent();
    });

    document.getElementById('btn-fc-change-lessons')?.addEventListener('click', () => {
      openStudyLessonPickerModal('flashcard');
    });

    // Mazii Button on back face
    document.getElementById('fc-btn-mazii')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const searchWord = currentWord.word || currentWord.reading;
      if (searchWord) openMazii(searchWord);
    });

    // Edit Button on back face
    document.getElementById('fc-btn-edit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentWord._isCustom) {
        openEditCustomWordModal(currentWord, (updated) => {
          const readingEl = document.querySelector('.flashcard-back .fc-reading');
          if (readingEl) {
            readingEl.textContent = updated.word ? `${updated.word} （${updated.reading || ''}）` : (updated.reading || '');
          }
          const hanvietEl = document.querySelector('.flashcard-back .fc-hanviet');
          if (hanvietEl) {
            hanvietEl.textContent = updated.kanji_meaning ? `[${updated.kanji_meaning}]` : '';
          }
          const meaningEl = document.querySelector('.flashcard-back .fc-meaning');
          if (meaningEl) meaningEl.textContent = updated.meaning || '';
        });
      } else {
        const lesson = currentWord._lesson || state.selectedVocabLesson || '1';
        openEditMeaningModal(currentWord, lesson, (updated) => {
          const readingEl = document.querySelector('.flashcard-back .fc-reading');
          if (readingEl) {
            readingEl.textContent = updated.word ? `${updated.word} （${updated.reading || ''}）` : (updated.reading || '');
          }
          const hanvietEl = document.querySelector('.flashcard-back .fc-hanviet');
          if (hanvietEl) {
            hanvietEl.textContent = updated.kanji_meaning ? `[${updated.kanji_meaning}]` : '';
          }
          const meaningEl = document.querySelector('.flashcard-back .fc-meaning');
          if (meaningEl) meaningEl.textContent = updated.meaning || '';
        });
      }
    });

    // Keyboard Shortcuts
    activeKeyHandler = function (e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerSwipeAnimation('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerSwipeAnimation('right');
      } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        flipCard();
      }
    };
    window.addEventListener('keydown', activeKeyHandler);

    // Audio Buttons
    document.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });
  }

  // ─── 3. DISTRACTOR GENERATORS FOR JLPT QUIZZES ────────────────────────
  const DAKUON_MAP = {
    'か': 'が', 'が': 'か', 'き': 'ぎ', 'ぎ': 'き', 'く': 'ぐ', 'ぐ': 'く', 'け': 'げ', 'げ': 'け', 'こ': 'ご', 'ご': 'こ',
    'さ': 'ざ', 'ざ': 'さ', 'し': 'じ', 'じ': 'し', 'す': 'ず', 'ず': 'す', 'せ': 'ぜ', 'ぜ': 'せ', 'そ': 'ぞ', 'ぞ': 'そ',
    'た': 'だ', 'だ': 'た', 'ち': 'ぢ', 'ぢ': 'ち', 'つ': 'づ', 'づ': 'つ', 'て': 'で', 'で': 'て', 'と': 'ど', 'ど': 'と',
    'は': 'ば', 'ば': 'ぱ', 'ぱ': 'は', 'ひ': 'び', 'び': 'ぴ', 'ぴ': 'ひ', 'ふ': 'ぶ', 'ぶ': 'ぷ', 'ぷ': 'ふ',
    'へ': 'べ', 'べ': 'ぺ', 'ぺ': 'へ', 'ほ': 'ぼ', 'ぼ': 'ぽ', 'ぽ': 'ほ'
  };

  function generateHiraganaDistractors(targetReading, wordsPool) {
    if (!targetReading) return ['–', '–', '–'];
    const distractors = new Set();

    // 1. Dakuon / Voicing Trap (Tenten & Maru: か ↔ が, し ↔ じ, etc.)
    for (let i = 0; i < targetReading.length; i++) {
      const char = targetReading[i];
      if (DAKUON_MAP[char]) {
        const variant = targetReading.substring(0, i) + DAKUON_MAP[char] + targetReading.substring(i + 1);
        if (variant !== targetReading) distractors.add(variant);
      }
    }

    // 2. Long Vowel Trap (Trường âm: おう ↔ お, けい ↔ け)
    if (targetReading.includes('おう')) {
      distractors.add(targetReading.replace(/おう/g, 'お'));
      distractors.add(targetReading.replace(/おう/g, 'おお'));
    }
    if (targetReading.includes('こう')) distractors.add(targetReading.replace(/こう/g, 'こ'));
    if (targetReading.includes('とう')) distractors.add(targetReading.replace(/とう/g, 'と'));
    if (targetReading.includes('しょう')) distractors.add(targetReading.replace(/しょう/g, 'しょ'));
    if (targetReading.includes('じょう')) distractors.add(targetReading.replace(/じょう/g, 'じょ'));
    if (targetReading.includes('ちょう')) distractors.add(targetReading.replace(/ちょう/g, 'ちょ'));
    if (targetReading.includes('そう')) distractors.add(targetReading.replace(/そう/g, 'そ'));
    if (targetReading.includes('ろう')) distractors.add(targetReading.replace(/ろう/g, 'ろ'));
    if (targetReading.includes('えい')) distractors.add(targetReading.replace(/えい/g, 'え'));
    if (targetReading.includes('けい')) distractors.add(targetReading.replace(/けい/g, 'け'));
    if (targetReading.includes('せい')) distractors.add(targetReading.replace(/せい/g, 'せ'));

    if (!targetReading.includes('う') && targetReading.length >= 2) {
      distractors.add(targetReading + 'う');
      distractors.add(targetReading.slice(0, 2) + 'う' + targetReading.slice(2));
    }

    // 3. Sokuon Trap (Âm ngắt: thêm/bớt っ, hoặc thay bằng つ/く)
    if (targetReading.includes('っ')) {
      distractors.add(targetReading.replace(/っ/g, ''));
      distractors.add(targetReading.replace(/っ/g, 'つ'));
      distractors.add(targetReading.replace(/っ/g, 'く'));
    } else if (targetReading.length >= 3) {
      distractors.add(targetReading.slice(0, 1) + 'っ' + targetReading.slice(1));
      distractors.add(targetReading.slice(0, 2) + 'っ' + targetReading.slice(2));
    }

    // 4. Youon Trap (Âm ghép)
    if (targetReading.includes('しゃ')) distractors.add(targetReading.replace(/しゃ/g, 'じゃ'));
    if (targetReading.includes('じゃ')) distractors.add(targetReading.replace(/じゃ/g, 'しゃ'));
    if (targetReading.includes('ちゃ')) distractors.add(targetReading.replace(/ちゃ/g, 'さ'));

    // 5. Bổ sung từ kho từ vựng nếu chưa đủ
    const otherReadings = wordsPool
      .map(w => w.reading)
      .filter(r => r && r !== targetReading)
      .sort((a, b) => Math.abs(a.length - targetReading.length) - Math.abs(b.length - targetReading.length));

    for (const r of otherReadings) {
      if (distractors.size >= 3) break;
      distractors.add(r);
    }

    const arr = Array.from(distractors).filter(d => d && d !== targetReading);
    arr.sort(() => Math.random() - 0.5);
    while (arr.length < 3) {
      arr.push(targetReading + '–');
    }
    return arr.slice(0, 3);
  }

  function generateKanjiDistractors(targetWord, targetReading, wordsPool) {
    if (!targetWord) return ['–', '–', '–'];
    const distractors = new Set();

    // 1. Kanji compounds in pool sharing at least 1 character
    const targetChars = targetWord.split('');
    const sameKanjiWords = wordsPool.filter(w => {
      if (!w.word || w.word === targetWord) return false;
      return targetChars.some(c => w.word.includes(c));
    });

    sameKanjiWords.sort(() => Math.random() - 0.5).forEach(w => {
      distractors.add(w.word);
    });

    // 2. Hybrid swap: swap 1 Kanji char with a Kanji char from another word
    if (targetChars.length === 2 && wordsPool.length > 5) {
      const otherKanjis = [];
      wordsPool.forEach(w => {
        if (w.word && w.word !== targetWord) {
          w.word.split('').forEach(c => {
            if (/[\u4e00-\u9faf]/.test(c) && !targetChars.includes(c)) otherKanjis.push(c);
          });
        }
      });
      if (otherKanjis.length >= 2) {
        otherKanjis.sort(() => Math.random() - 0.5);
        distractors.add(targetChars[0] + otherKanjis[0]);
        distractors.add(otherKanjis[1] + targetChars[1]);
      }
    }

    // 3. Same length Kanji words from pool
    const sameLengthWords = wordsPool.filter(w => w.word && w.word !== targetWord && w.word.length === targetWord.length);
    sameLengthWords.sort(() => Math.random() - 0.5).forEach(w => {
      distractors.add(w.word);
    });

    // 4. Any other words from pool
    const otherWords = wordsPool.filter(w => w.word && w.word !== targetWord);
    otherWords.sort(() => Math.random() - 0.5).forEach(w => {
      distractors.add(w.word);
    });

    const arr = Array.from(distractors).filter(d => d && d !== targetWord);
    arr.sort(() => Math.random() - 0.5);
    while (arr.length < 3) {
      arr.push(targetWord + '–');
    }
    return arr.slice(0, 3);
  }

  // ─── 4. QUIZ VIEW (JLPT MONDAI 1 & MONDAI 2) ──────────────────────────
  function initQuiz() {
    const words = getStudyWords();
    if (words.length < 4) {
      quizQuestions = [];
      return;
    }
    quizIndex = 0;
    quizScore = 0;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const count = quizQuestionCount === 'all'
      ? shuffled.length
      : Math.min(shuffled.length, parseInt(quizQuestionCount));

    quizQuestions = shuffled.slice(0, count).map(target => {
      // Determine JLPT question type:
      // ~50% Mondai 1: Cho Kanji -> Chọn Hiragana
      // ~50% Mondai 2: Cho Hiragana -> Chọn Kanji
      const hasKanji = target.word && /[\u4e00-\u9faf]/.test(target.word) && target.reading && target.word !== target.reading;
      const type = hasKanji ? (Math.random() < 0.5 ? 'kanji_to_reading' : 'reading_to_kanji') : 'kanji_to_reading';

      let promptText = '';
      let correctAnswer = '';
      let distractorList = [];

      if (type === 'kanji_to_reading') {
        promptText = target.word || target.reading;
        correctAnswer = target.reading || target.word;
        distractorList = generateHiraganaDistractors(correctAnswer, words);
      } else {
        promptText = target.reading || target.word;
        correctAnswer = target.word || target.reading;
        distractorList = generateKanjiDistractors(correctAnswer, target.reading, words);
      }

      // Build 4 options and shuffle them so correct answer index is purely random every time!
      const rawOptions = [
        { text: correctAnswer, isCorrect: true },
        { text: distractorList[0], isCorrect: false },
        { text: distractorList[1], isCorrect: false },
        { text: distractorList[2], isCorrect: false }
      ];

      // Shuffle options randomly
      const options = rawOptions.sort(() => Math.random() - 0.5);

      return {
        target,
        type,
        promptText,
        correctAnswer,
        options,
        userAnswer: null
      };
    });
  }

  function renderQuizView(content, words) {
    if (!quizQuestions || quizQuestions.length === 0) {
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.4rem; margin-bottom:12px; color:var(--text-title);">Trắc nghiệm JLPT N2</h3>
          <p style="color:var(--text-muted); margin-bottom: 20px;">Cần ít nhất 4 từ vựng trong các bài đã chọn để tạo đề trắc nghiệm.</p>
          <button class="btn btn-primary" id="btn-quiz-open-lessons-empty">📚 Chọn bài học ngay</button>
        </div>
      `;
      document.getElementById('btn-quiz-open-lessons-empty')?.addEventListener('click', () => openStudyLessonPickerModal('quiz'));
      return;
    }

    if (quizIndex >= quizQuestions.length) {
      const percent = Math.round((quizScore / quizQuestions.length) * 100);
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.8rem; margin-bottom:12px; color:var(--text-title);">🎉 Kết Quả Thi Trắc Nghiệm JLPT</h3>
          <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom: 8px;">Bạn đã trả lời đúng <strong>${quizScore}/${quizQuestions.length}</strong> câu (${percent}%)</p>
          <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom: 24px;">Bài học: ${getStudySummaryText()} (${studyLessons.size} bài)</p>
          <div style="font-size: 3.5rem; margin-bottom: 24px;">${percent >= 80 ? '🏆' : percent >= 50 ? '👍' : '💪'}</div>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-restart-quiz">Làm lại bài thi (Đảo đề mới) ↺</button>
            <button class="btn btn-secondary" id="btn-quiz-back-list-res">📖 Xem danh sách từ</button>
            <button class="btn btn-secondary" id="btn-quiz-change-lessons-res">📚 Đổi bài học khác ▾</button>
          </div>
        </div>
      `;
      document.getElementById('btn-restart-quiz').addEventListener('click', () => {
        initQuiz();
        renderContent();
      });
      document.getElementById('btn-quiz-back-list-res')?.addEventListener('click', () => {
        cleanupKeyHandler();
        cleanupFlashcardHandlers();
        cleanupMatchGame();
        currentTab = 'list';
        state.vocabTab = 'list';
        updateSidebarModeButtons();
        renderContent();
      });
      document.getElementById('btn-quiz-change-lessons-res')?.addEventListener('click', () => openStudyLessonPickerModal('quiz'));
      return;
    }

    const currentQ = quizQuestions[quizIndex];
    content.innerHTML = `
      <div class="quiz-box">
        <!-- Quiz Multi-Lesson Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px; padding-bottom:10px; border-bottom:1px solid var(--glass-border-subtle);">
          <div>
            <div style="font-size:0.85rem; color:var(--fuji-blue-deep); font-weight:800;">ĐANG THI ${studyLessons.size} BÀI: ${getStudySummaryText()}</div>
            <div style="font-size:0.78rem; color:var(--text-muted);">Kho từ ôn luyện: ${words.length} từ</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-secondary btn-sm" id="btn-quiz-back-to-list" style="padding:5px 12px; font-size:0.8rem; font-weight:700;">
              📖 Xem danh sách
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-quiz-change-lessons" style="padding:5px 12px; font-size:0.8rem;">
              📚 Đổi bài học ▾
            </button>
          </div>
        </div>

        <!-- Question Count Selector -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px; font-size:0.82rem; background:rgba(255,255,255,0.5); padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--glass-border-subtle);">
          <span style="color:var(--text-secondary); font-weight:700;">Số câu ôn tập:</span>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn-preset ${quizQuestionCount === 'all' ? 'active' : ''}" data-quiz-count="all">Tất cả (${words.length} câu)</button>
            ${words.length > 20 ? `<button class="btn-preset ${quizQuestionCount === 20 ? 'active' : ''}" data-quiz-count="20">20 câu</button>` : ''}
            ${words.length > 40 ? `<button class="btn-preset ${quizQuestionCount === 40 ? 'active' : ''}" data-quiz-count="40">40 câu</button>` : ''}
            ${words.length > 80 ? `<button class="btn-preset ${quizQuestionCount === 80 ? 'active' : ''}" data-quiz-count="80">80 câu</button>` : ''}
          </div>
        </div>

        <!-- Question Counter & Score -->
        <div style="display:flex; justify-content:space-between; margin-bottom: 12px; font-weight:700; color:var(--text-muted); font-size:0.9rem;">
          <span>Câu hỏi ${quizIndex + 1} / ${quizQuestions.length}</span>
          <span style="color:var(--accent-emerald);">Đúng: ${quizScore} / ${quizIndex + (currentQ.userAnswer !== null ? 1 : 0)}</span>
        </div>

        <!-- JLPT Type Badge -->
        <div style="text-align:center; margin-bottom:12px;">
          <span style="display:inline-flex; align-items:center; gap:6px; background:rgba(37,99,235,0.1); color:var(--fuji-blue-deep); padding:5px 14px; border-radius:20px; font-size:0.82rem; font-weight:800; border:1px solid rgba(37,99,235,0.2);">
            <span>${currentQ.type === 'kanji_to_reading' ? '📖 JLPT Mondai 1: Chọn cách đọc Hiragana đúng' : '✍️ JLPT Mondai 2: Chọn chữ Hán (Kanji) đúng'}</span>
          </span>
        </div>

        <div class="quiz-question" style="text-align:center;">
          <div style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:6px;">
            ${currentQ.type === 'kanji_to_reading' ? 'Hãy chọn cách đọc đúng của từ gạch chân:' : 'Hãy chọn chữ Hán (Kanji) đúng tương ứng:'}
          </div>
          <div style="font-size:2.4rem; font-weight:900; color:var(--text-title); text-decoration: underline; text-decoration-color: var(--fuji-blue-lake); text-underline-offset: 8px; margin: 10px 0;">
            ${currentQ.promptText}
          </div>
          <div style="font-size:0.95rem; color:var(--text-muted); margin-top:8px;">
            Ý nghĩa: <strong style="color:var(--toan-navy);">${currentQ.target.meaning || ''}</strong>
            ${currentQ.target.kanji_meaning ? `<span style="color:var(--sakura-pink); margin-left:6px; font-weight:700;">[${currentQ.target.kanji_meaning}]</span>` : ''}
          </div>
        </div>

        <div class="quiz-options">
          ${currentQ.options.map((opt, i) => {
            const letter = ['A', 'B', 'C', 'D'][i];
            let cls = '';
            if (currentQ.userAnswer !== null) {
              if (opt.isCorrect) cls = 'correct';
              else if (opt.text === currentQ.userAnswer) cls = 'wrong';
            }
            return `
              <button class="quiz-opt-btn ${cls}" data-option="${opt.text}" ${currentQ.userAnswer !== null ? 'disabled' : ''} style="font-size:1.25rem; font-weight:700; padding:14px 18px;">
                <span class="quiz-opt-key">${letter}</span>
                <span>${opt.text}</span>
              </button>
            `;
          }).join('')}
        </div>

        ${currentQ.userAnswer !== null ? `
          <div class="quiz-explanation" style="margin-top:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-weight:800; color:var(--toan-navy); font-size:1.05rem;">
                ${currentQ.userAnswer === currentQ.correctAnswer ? '🎉 Chính xác!' : '❌ Chưa chính xác!'}
              </span>
              <button class="icon-btn btn-audio" data-speak="${currentQ.target.word || currentQ.target.reading}" title="Nghe phát âm">🔊</button>
            </div>
            <div><strong>Từ vựng:</strong> ${currentQ.target.word} （${currentQ.target.reading}）</div>
            ${currentQ.target.kanji_meaning ? `<div><strong>Hán Việt:</strong> [${currentQ.target.kanji_meaning}]</div>` : ''}
            <div><strong>Nghĩa:</strong> ${currentQ.target.meaning}</div>
            ${currentQ.target.example ? `<div style="margin-top:6px; font-size:0.88rem; color:var(--text-secondary);"><strong>Ví dụ:</strong> ${currentQ.target.example}</div>` : ''}
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top: 18px;">
            <button class="btn btn-primary" id="btn-next-quiz">Câu tiếp theo →</button>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('btn-quiz-change-lessons')?.addEventListener('click', () => openStudyLessonPickerModal('quiz'));
    document.getElementById('btn-quiz-back-to-list')?.addEventListener('click', () => {
      cleanupKeyHandler();
      cleanupFlashcardHandlers();
      cleanupMatchGame();
      currentTab = 'list';
      state.vocabTab = 'list';
      updateSidebarModeButtons();
      renderContent();
    });

    content.querySelectorAll('[data-quiz-count]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-quiz-count');
        quizQuestionCount = val === 'all' ? 'all' : parseInt(val);
        initQuiz();
        renderQuizView(content, words);
      });
    });

    content.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-option');
        currentQ.userAnswer = selected;
        if (selected === currentQ.correctAnswer) {
          quizScore++;
        }
        SpeechHelper.speak(currentQ.target.word || currentQ.target.reading);
        renderQuizView(content, words);
      });
    });

    document.getElementById('btn-next-quiz')?.addEventListener('click', () => {
      quizIndex++;
      renderQuizView(content, words);
    });
  }

  // ─── 5. MATCHING GAME (Trò chơi Ghép Cặp Kanji - Hiragana 30s) ────────
  function initMatchGame() {
    cleanupMatchGame();
    const words = getStudyWords();
    // Prefer words with Kanji and Hiragana reading
    let candidates = words.filter(w => w.word && w.reading && w.word !== w.reading);
    if (candidates.length < 6) {
      candidates = words.filter(w => w.word && (w.reading || w.meaning));
    }
    if (candidates.length < 4) {
      matchTiles = [];
      return;
    }

    const shuffledWords = [...candidates].sort(() => Math.random() - 0.5);
    totalMatchPairs = Math.min(6, shuffledWords.length);
    const chosenWords = shuffledWords.slice(0, totalMatchPairs);

    const tiles = [];
    chosenWords.forEach((w, idx) => {
      const pairId = `pair_${idx}_${w.word}`;
      // Kanji tile
      tiles.push({
        id: `tile_k_${idx}`,
        pairId,
        type: 'kanji',
        text: w.word,
        wordObj: w,
        isMatched: false,
        isSelected: false,
        isWrong: false
      });
      // Hiragana tile
      tiles.push({
        id: `tile_h_${idx}`,
        pairId,
        type: 'hiragana',
        text: w.reading || w.meaning,
        wordObj: w,
        isMatched: false,
        isSelected: false,
        isWrong: false
      });
    });

    matchTiles = tiles.sort(() => Math.random() - 0.5);
    selectedTile1 = null;
    selectedTile2 = null;
    matchedPairsCount = 0;
    matchTimeRemaining = 30;
    isMatchGameFinished = false;
    isMatchGameOver = false;
    isProcessingMatch = false;

    // Start 30s timer
    matchGameTimer = setInterval(() => {
      if (matchTimeRemaining > 0) {
        matchTimeRemaining--;
        updateMatchTimerUI();
        if (matchTimeRemaining <= 0) {
          clearInterval(matchGameTimer);
          matchGameTimer = null;
          isMatchGameOver = true;
          const container = document.getElementById('vocab-tab-content');
          if (container) renderMatchGameView(container, words);
        }
      }
    }, 1000);
  }

  function updateMatchTimerUI() {
    const badge = document.getElementById('match-timer-badge');
    const fill = document.getElementById('match-timer-fill');
    const container = document.getElementById('match-timer-container');
    const box = document.getElementById('match-game-box');
    const urgentBanner = document.getElementById('match-urgent-banner');

    const percent = Math.max(0, Math.min(100, (matchTimeRemaining / 30) * 100));
    if (fill) fill.style.width = `${percent}%`;

    if (badge) {
      badge.innerHTML = `⏱️ ${matchTimeRemaining}s`;
    }

    if (matchTimeRemaining <= 10) {
      if (container) container.classList.add('is-urgent');
      if (fill) fill.classList.add('is-urgent');
      if (badge) badge.classList.add('is-urgent');
      if (box) box.classList.add('is-urgent');
      if (urgentBanner) {
        urgentBanner.style.display = 'block';
        urgentBanner.textContent = `⚡ CÒN ${matchTimeRemaining} GIÂY! NHANH TAY LÊN!`;
      }
    } else {
      if (container) container.classList.remove('is-urgent');
      if (fill) fill.classList.remove('is-urgent');
      if (badge) badge.classList.remove('is-urgent');
      if (box) box.classList.remove('is-urgent');
      if (urgentBanner) urgentBanner.style.display = 'none';
    }
  }

  function renderMatchGameView(content, words) {
    if (!matchTiles || matchTiles.length === 0) {
      content.innerHTML = `
        <div class="match-game-box" style="text-align:center;">
          <h3 style="font-size:1.4rem; margin-bottom:12px; color:var(--text-title);">Trò Chơi Ghép Thẻ Từ Vựng</h3>
          <p style="color:var(--text-muted); margin-bottom: 20px;">Cần ít nhất 4 từ vựng trong các bài đã chọn để bắt đầu chơi trò chơi.</p>
          <button class="btn btn-primary" id="btn-match-open-lessons-empty">📚 Chọn bài học ngay</button>
        </div>
      `;
      document.getElementById('btn-match-open-lessons-empty')?.addEventListener('click', () => openStudyLessonPickerModal('match'));
      return;
    }

    // VICTORY SCREEN
    if (isMatchGameFinished) {
      const timeSpent = 30 - matchTimeRemaining;
      content.innerHTML = `
        <div class="match-game-box" style="text-align:center; padding: 40px 20px;">
          <div style="font-size:3.5rem; margin-bottom:12px;">🎉</div>
          <h2 style="font-size:1.8rem; font-weight:800; color:var(--text-title); margin-bottom:10px;">Xuất Sắc! Hoàn Thành!</h2>
          <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom: 8px;">
            Bạn đã ghép đúng toàn bộ <strong>${totalMatchPairs}</strong> cặp từ vựng!
          </p>
          <p style="font-size:0.95rem; color:var(--fuji-blue-deep); font-weight:700; margin-bottom: 24px;">
            ⚡ Thời gian: <strong>${timeSpent} giây</strong> (còn dư ${matchTimeRemaining}s)
          </p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-match-play-again">Chơi ván tiếp theo 🔀</button>
            <button class="btn btn-secondary" id="btn-match-back-list-fin">📖 Xem danh sách từ</button>
            <button class="btn btn-secondary" id="btn-match-change-lessons-fin">📚 Đổi bài học ▾</button>
          </div>
        </div>
      `;
      document.getElementById('btn-match-play-again')?.addEventListener('click', () => {
        initMatchGame();
        renderMatchGameView(content, words);
      });
      document.getElementById('btn-match-back-list-fin')?.addEventListener('click', () => {
        cleanupMatchGame();
        currentTab = 'list';
        state.vocabTab = 'list';
        updateSidebarModeButtons();
        renderContent();
      });
      document.getElementById('btn-match-change-lessons-fin')?.addEventListener('click', () => openStudyLessonPickerModal('match'));
      return;
    }

    // GAME OVER SCREEN (TIME OUT)
    if (isMatchGameOver) {
      content.innerHTML = `
        <div class="match-game-box" style="text-align:center; padding: 40px 20px;">
          <div style="font-size:3.5rem; margin-bottom:12px;">⏳</div>
          <h2 style="font-size:1.8rem; font-weight:800; color:#dc2626; margin-bottom:10px;">Hết Giờ Rồi!</h2>
          <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom: 8px;">
            Thời gian 30s đã kết thúc. Bạn đã ghép được <strong>${matchedPairsCount} / ${totalMatchPairs}</strong> cặp từ!
          </p>
          <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom: 24px;">
            Đừng nản lòng, hãy thử lại để rèn phản xạ nhanh hơn nhé!
          </p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-match-restart">Chơi lại ván này ↺</button>
            <button class="btn btn-secondary" id="btn-match-new-game">Ván mới 🔀</button>
            <button class="btn btn-secondary" id="btn-match-back-list-over">📖 Xem danh sách từ</button>
            <button class="btn btn-secondary" id="btn-match-change-lessons-over">📚 Đổi bài học ▾</button>
          </div>
        </div>
      `;
      document.getElementById('btn-match-restart')?.addEventListener('click', () => {
        initMatchGame();
        renderMatchGameView(content, words);
      });
      document.getElementById('btn-match-new-game')?.addEventListener('click', () => {
        initMatchGame();
        renderMatchGameView(content, words);
      });
      document.getElementById('btn-match-back-list-over')?.addEventListener('click', () => {
        cleanupMatchGame();
        currentTab = 'list';
        state.vocabTab = 'list';
        updateSidebarModeButtons();
        renderContent();
      });
      document.getElementById('btn-match-change-lessons-over')?.addEventListener('click', () => openStudyLessonPickerModal('match'));
      return;
    }

    // PLAYING STATE
    const percent = Math.max(0, Math.min(100, (matchTimeRemaining / 30) * 100));
    content.innerHTML = `
      <div class="match-game-box" id="match-game-box">
        <!-- Match Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px; padding-bottom:10px; border-bottom:1px solid var(--glass-border-subtle);">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-secondary btn-sm" id="btn-match-back-to-list" style="padding:5px 12px; font-size:0.8rem; font-weight:700;">
              📖 Xem danh sách
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-match-change-lessons" style="padding:5px 12px; font-size:0.8rem;">
              📚 Đổi bài (${studyLessons.size} bài) ▾
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-match-shuffle-new" style="padding:5px 12px; font-size:0.8rem;" title="Bắt đầu ván mới với các từ khác">
              🔀 Ván mới
            </button>
          </div>
          <div style="font-size:0.9rem; font-weight:800; color:var(--text-title);">
            Đã ghép: <span id="match-pairs-counter" style="color:var(--accent-emerald); font-size:1.05rem;">${matchedPairsCount}</span> / ${totalMatchPairs} cặp
          </div>
        </div>

        <!-- Timer Bar -->
        <div class="match-timer-container ${matchTimeRemaining <= 10 ? 'is-urgent' : ''}" id="match-timer-container">
          <div class="match-timer-badge ${matchTimeRemaining <= 10 ? 'is-urgent' : ''}" id="match-timer-badge">
            ⏱️ ${matchTimeRemaining}s
          </div>
          <div class="match-timer-bar">
            <div class="match-timer-fill ${matchTimeRemaining <= 10 ? 'is-urgent' : ''}" id="match-timer-fill" style="width: ${percent}%;"></div>
          </div>
        </div>

        <!-- Urgent Banner (Displayed when <= 10s) -->
        <div id="match-urgent-banner" style="display:${matchTimeRemaining <= 10 ? 'block' : 'none'}; background:#ef4444; color:#fff; text-align:center; padding:6px 12px; border-radius:8px; font-weight:800; font-size:0.88rem; margin-bottom:12px; animation:urgent-pulse 0.5s infinite alternate;">
          ⚡ CÒN ${matchTimeRemaining} GIÂY! NHANH TAY LÊN!
        </div>

        <!-- 12 Tiles Grid -->
        <div class="match-grid" id="match-grid">
          ${matchTiles.map(tile => {
            let cls = '';
            if (tile.isMatched) cls += ' matched';
            if (tile.isSelected) cls += ' selected';
            if (tile.isWrong) cls += ' wrong';
            return `
              <div class="match-tile type-${tile.type} ${cls}" data-tile-id="${tile.id}">
                <span class="match-tile-text">${tile.text}</span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Guide -->
        <div style="text-align:center; font-size:0.8rem; color:var(--text-muted); user-select:none;">
          💡 Chọn 2 thẻ tương ứng để ghép cặp. Đúng sẽ biến mất, sai sẽ báo đỏ!
        </div>
      </div>
    `;

    document.getElementById('btn-match-back-to-list')?.addEventListener('click', () => {
      cleanupMatchGame();
      currentTab = 'list';
      state.vocabTab = 'list';
      updateSidebarModeButtons();
      renderContent();
    });

    document.getElementById('btn-match-change-lessons')?.addEventListener('click', () => openStudyLessonPickerModal('match'));

    document.getElementById('btn-match-shuffle-new')?.addEventListener('click', () => {
      initMatchGame();
      renderMatchGameView(content, words);
    });

    function updateTilesDOM() {
      matchTiles.forEach(t => {
        const el = content.querySelector(`[data-tile-id="${t.id}"]`);
        if (el) {
          el.classList.toggle('selected', t.isSelected);
          el.classList.toggle('wrong', t.isWrong);
          el.classList.toggle('matched', t.isMatched);
        }
      });
      const counterEl = document.getElementById('match-pairs-counter');
      if (counterEl) counterEl.textContent = matchedPairsCount;
    }

    // Tile Click Handler
    content.querySelectorAll('.match-tile').forEach(el => {
      el.addEventListener('click', () => {
        const tileId = el.getAttribute('data-tile-id');
        const tile = matchTiles.find(t => t.id === tileId);

        if (!tile || tile.isMatched || isProcessingMatch) return;
        if (selectedTile1 && selectedTile1.id === tile.id) return; // clicked same tile

        if (!selectedTile1) {
          // Select 1st tile
          selectedTile1 = tile;
          tile.isSelected = true;
          updateTilesDOM();
        } else if (!selectedTile2) {
          // Select 2nd tile
          selectedTile2 = tile;
          tile.isSelected = true;
          isProcessingMatch = true;
          updateTilesDOM();

          // Check pair match
          if (selectedTile1.pairId === selectedTile2.pairId) {
            // MATCH SUCCESS!
            selectedTile1.isMatched = true;
            selectedTile2.isMatched = true;
            matchedPairsCount++;

            SpeechHelper.speak(tile.wordObj.word || tile.wordObj.reading);

            setTimeout(() => {
              updateTilesDOM();
              selectedTile1 = null;
              selectedTile2 = null;
              isProcessingMatch = false;

              // Check if all matched
              if (matchedPairsCount >= totalMatchPairs) {
                cleanupMatchGame();
                isMatchGameFinished = true;
                setTimeout(() => renderMatchGameView(content, words), 400);
              }
            }, 300);
          } else {
            // MATCH FAIL!
            selectedTile1.isWrong = true;
            selectedTile2.isWrong = true;
            updateTilesDOM();

            setTimeout(() => {
              selectedTile1.isSelected = false;
              selectedTile1.isWrong = false;
              selectedTile2.isSelected = false;
              selectedTile2.isWrong = false;
              selectedTile1 = null;
              selectedTile2 = null;
              isProcessingMatch = false;
              updateTilesDOM();
            }, 600);
          }
        }
      });
    });
  }

  render();
}
