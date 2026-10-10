// Vocab View Component (Multi-lesson Selection, Mazii Integration, Flashcard 3D & Quiz)
import { SpeechHelper } from '../speech.js';
import { GitHubSync, showToast } from '../services/githubSync.js';

export function renderVocab(container, state, navigate) {
  // Support multi-lesson selection
  const lessonKeys = state.vocabData ? Object.keys(state.vocabData).sort((a, b) => parseInt(a) - parseInt(b)) : [];

  if (!state.selectedVocabLessons || state.selectedVocabLessons.length === 0) {
    state.selectedVocabLessons = [state.selectedVocabLesson || '1'];
  }
  let selectedLessons = new Set(state.selectedVocabLessons);

  let currentTab = state.vocabTab || 'list'; // 'list', 'flashcard', 'quiz'
  let flashcardIndex = 0;
  let isCardFlipped = false;
  let quizIndex = 0;
  let quizScore = 0;
  let quizQuestions = [];
  let quizQuestionCount = 'all'; // Default to ALL words of the selected lessons!
  let activeKeyHandler = null;
  let lastClickedLessonIndex = -1;
  let isMobileSheetOpen = false;

  function cleanupKeyHandler() {
    if (activeKeyHandler) {
      window.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
  }

  function getSelectedWords() {
    if (!state.vocabData) return [];
    const lessons = Array.from(selectedLessons).sort((a, b) => parseInt(a) - parseInt(b));
    const words = [];
    lessons.forEach(l => {
      const list = state.vocabData[l] || [];
      list.forEach(w => {
        words.push({ ...w, _lesson: l });
      });
    });
    return words;
  }

  function getSelectedSummaryText() {
    const arr = Array.from(selectedLessons).sort((a, b) => parseInt(a) - parseInt(b));
    if (arr.length === 0) return 'Chưa chọn bài';
    if (arr.length === 1) return `Bài ${arr[0]}`;
    if (arr.length === lessonKeys.length) return `Tất cả 58 bài`;
    if (arr.length <= 4) return `Bài ${arr.join(', ')}`;
    return `${arr.length} bài (${arr[0]}...${arr[arr.length - 1]})`;
  }

  function applyPreset(type) {
    if (type === 'all') {
      lessonKeys.forEach(k => selectedLessons.add(k));
    } else if (type === 'clear') {
      selectedLessons.clear();
      selectedLessons.add('1');
    } else if (type === '1-10') {
      selectedLessons.clear();
      lessonKeys.slice(0, 10).forEach(k => selectedLessons.add(k));
    } else if (type === '11-20') {
      selectedLessons.clear();
      lessonKeys.slice(10, 20).forEach(k => selectedLessons.add(k));
    } else if (type === '21-30') {
      selectedLessons.clear();
      lessonKeys.slice(20, 30).forEach(k => selectedLessons.add(k));
    } else if (type === '31-40') {
      selectedLessons.clear();
      lessonKeys.slice(30, 40).forEach(k => selectedLessons.add(k));
    } else if (type === '41-50') {
      selectedLessons.clear();
      lessonKeys.slice(40, 50).forEach(k => selectedLessons.add(k));
    } else if (type === '51-58') {
      selectedLessons.clear();
      lessonKeys.slice(50, 58).forEach(k => selectedLessons.add(k));
    }
    syncStateAndRerender();
  }

  function handleLessonClick(lessonKey, isShiftKey) {
    const currentIndex = lessonKeys.indexOf(lessonKey);
    if (isShiftKey && lastClickedLessonIndex !== -1) {
      const start = Math.min(lastClickedLessonIndex, currentIndex);
      const end = Math.max(lastClickedLessonIndex, currentIndex);
      const willSelect = !selectedLessons.has(lessonKey);
      for (let i = start; i <= end; i++) {
        const k = lessonKeys[i];
        if (willSelect) {
          selectedLessons.add(k);
        } else {
          selectedLessons.delete(k);
        }
      }
    } else {
      if (selectedLessons.has(lessonKey)) {
        if (selectedLessons.size > 1) {
          selectedLessons.delete(lessonKey);
        }
      } else {
        selectedLessons.add(lessonKey);
      }
      lastClickedLessonIndex = currentIndex;
    }
    syncStateAndRerender();
  }

  function saveLastStudied() {
    try {
      localStorage.setItem('jlpt_last_studied', JSON.stringify({
        type: 'vocab',
        lessons: Array.from(selectedLessons),
        label: getSelectedSummaryText(),
        tab: currentTab
      }));
    } catch (e) {}
  }

  function syncStateAndRerender() {
    state.selectedVocabLessons = Array.from(selectedLessons);
    state.selectedVocabLesson = Array.from(selectedLessons)[0] || '1';
    flashcardIndex = 0;
    isCardFlipped = false;
    updateSidebarItems();
    saveLastStudied();
    if (currentTab === 'quiz') {
      initQuiz();
    }
    renderContent();
  }

  function openMazii(word) {
    if (!word) return;
    const url = `https://mazii.net/vi-VN/search/word/javi/${encodeURIComponent(word.trim())}`;
    window.open(url, '_blank');
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
    const words = getSelectedWords();

    container.innerHTML = `
      <!-- Top Action Bar -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 16px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:700;">Học Từ Vựng N2</h2>
        </div>
      </div>

      <!-- Mobile Lesson Selector Bar (Hiển thị nổi bật trên điện thoại) -->
      <div class="mobile-lesson-bar">
        <button class="btn-mobile-select-lessons" id="btn-open-mobile-lessons">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.3rem;">📚</span>
            <div style="text-align:left;">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">BÀI HỌC ĐANG CHỌN</div>
              <div id="mobile-lesson-label" style="font-size:0.95rem; font-weight:800; color:var(--text-title);">${getSelectedSummaryText()} (${words.length} từ)</div>
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
        <aside class="vocab-sidebar" id="vocab-sidebar">
          <div class="vocab-sidebar-header">
            <div class="vocab-sidebar-title">
              <span>📚</span>
              <span>Danh sách bài (1-58)</span>
            </div>
          </div>

          <!-- Quick Presets -->
          <div class="vocab-presets-grid">
            <button class="btn-preset" data-preset="all">Tất cả</button>
            <button class="btn-preset" data-preset="clear">Bỏ chọn</button>
            <button class="btn-preset" data-preset="1-10">1-10</button>
            <button class="btn-preset" data-preset="11-20">11-20</button>
            <button class="btn-preset" data-preset="21-30">21-30</button>
            <button class="btn-preset" data-preset="31-40">31-40</button>
            <button class="btn-preset" data-preset="41-50">41-50</button>
            <button class="btn-preset" data-preset="51-58">51-58</button>
          </div>

          <div class="vocab-shift-hint">
            <span>💡 Giữ phím <strong>Shift</strong> để chọn dải bài như Excel</span>
          </div>

          <!-- Scrollable Lesson Checkbox List -->
          <div class="vocab-lessons-list" id="sidebar-lessons-list">
            ${renderLessonListHtml()}
          </div>

          <!-- Sidebar Footer Summary -->
          <div class="vocab-sidebar-footer">
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-title);" id="sidebar-summary-text">
              Đã chọn: ${selectedLessons.size} bài (${words.length} từ)
            </div>
            <button class="btn btn-primary btn-sm" id="sidebar-btn-flashcard" style="width:100%; margin-top:4px;">
              🎴 Học Flashcard gộp
            </button>
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="vocab-main-area">
          <!-- Mode Tabs -->
          <div class="tab-row">
            <button class="tab-pill ${currentTab === 'list' ? 'active' : ''}" id="tab-list">📖 Danh sách từ (<span id="tab-word-count">${words.length}</span>)</button>
            <button class="tab-pill ${currentTab === 'flashcard' ? 'active' : ''}" id="tab-flashcard">🎴 Thẻ Flashcard 3D</button>
            <button class="tab-pill ${currentTab === 'quiz' ? 'active' : ''}" id="tab-quiz">🎯 Trắc nghiệm ôn tập</button>
          </div>

          <div id="vocab-tab-content"></div>
        </div>
      </div>

      <!-- Mobile Bottom Sheet Drawer -->
      <div class="sheet-overlay ${isMobileSheetOpen ? 'open' : ''}" id="sheet-overlay"></div>
      <div class="bottom-sheet ${isMobileSheetOpen ? 'open' : ''}" id="mobile-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3>Chọn bài học N2 (${lessonKeys.length} bài)</h3>
          <button class="btn-close-sheet" id="btn-close-sheet">✕</button>
        </div>

        <!-- Presets inside sheet -->
        <div class="vocab-presets-grid" style="margin-bottom:8px;">
          <button class="btn-preset" data-preset="all">Tất cả</button>
          <button class="btn-preset" data-preset="clear">Bỏ chọn</button>
          <button class="btn-preset" data-preset="1-10">1-10</button>
          <button class="btn-preset" data-preset="11-20">11-20</button>
          <button class="btn-preset" data-preset="21-30">21-30</button>
          <button class="btn-preset" data-preset="31-40">31-40</button>
          <button class="btn-preset" data-preset="41-50">41-50</button>
          <button class="btn-preset" data-preset="51-58">51-58</button>
        </div>

        <div class="sheet-content" id="mobile-sheet-lessons-list">
          ${renderLessonListHtml()}
        </div>

        <div class="sheet-footer">
          <button class="btn btn-primary" id="btn-apply-sheet" style="width:100%; padding:13px; font-weight:700;">
            🚀 Áp dụng & Học ngay (<span id="sheet-word-count">${words.length}</span> từ)
          </button>
        </div>
      </div>
    `;

    setupMainEventListeners();
    attachLessonListEvents();
    saveLastStudied();
    renderContent();
  }

  function renderLessonListHtml() {
    return lessonKeys.map(k => {
      const isSelected = selectedLessons.has(k);
      const count = (state.vocabData[k] || []).length;
      return `
        <div class="vocab-lesson-item ${isSelected ? 'selected' : ''}" data-lesson="${k}">
          <div class="vocab-lesson-item-title">
            <input type="checkbox" data-lesson="${k}" ${isSelected ? 'checked' : ''}>
            <span>Bài ${k}</span>
          </div>
          <span class="vocab-lesson-count">(${count} từ)</span>
        </div>
      `;
    }).join('');
  }

  function updateSidebarItems() {
    const words = getSelectedWords();
    const summaryText = `Đã chọn: ${selectedLessons.size} bài (${words.length} từ)`;
    const sideSum = document.getElementById('sidebar-summary-text');
    if (sideSum) sideSum.textContent = summaryText;

    const mobLabel = document.getElementById('mobile-lesson-label');
    if (mobLabel) mobLabel.textContent = `${getSelectedSummaryText()} (${words.length} từ)`;

    const tabCount = document.getElementById('tab-word-count');
    if (tabCount) tabCount.textContent = words.length;

    const sheetCount = document.getElementById('sheet-word-count');
    if (sheetCount) sheetCount.textContent = words.length;

    document.querySelectorAll('.vocab-lesson-item').forEach(item => {
      const k = item.getAttribute('data-lesson');
      const isSel = selectedLessons.has(k);
      item.classList.toggle('selected', isSel);
      const chk = item.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = isSel;
    });
  }

  function setupMainEventListeners() {
    document.getElementById('btn-back-home').addEventListener('click', () => {
      cleanupKeyHandler();
      navigate('home');
    });

    const openSheetBtn = document.getElementById('btn-open-mobile-lessons');
    const closeSheetBtn = document.getElementById('btn-close-sheet');
    const sheetOverlay = document.getElementById('sheet-overlay');
    const applySheetBtn = document.getElementById('btn-apply-sheet');

    openSheetBtn?.addEventListener('click', openSheet);
    closeSheetBtn?.addEventListener('click', closeSheet);
    sheetOverlay?.addEventListener('click', closeSheet);
    applySheetBtn?.addEventListener('click', () => {
      closeSheet();
      renderContent();
    });

    // Preset buttons (works for both desktop and mobile drawer)
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-preset');
        applyPreset(type);
      });
    });

    // Sidebar go to flashcard directly
    document.getElementById('sidebar-btn-flashcard')?.addEventListener('click', () => {
      currentTab = 'flashcard';
      state.vocabTab = 'flashcard';
      renderContent();
    });

    // Tab navigation
    document.getElementById('tab-list').addEventListener('click', () => {
      cleanupKeyHandler();
      currentTab = 'list';
      state.vocabTab = 'list';
      renderContent();
    });
    document.getElementById('tab-flashcard').addEventListener('click', () => {
      cleanupKeyHandler();
      currentTab = 'flashcard';
      state.vocabTab = 'flashcard';
      renderContent();
    });
    document.getElementById('tab-quiz').addEventListener('click', () => {
      cleanupKeyHandler();
      currentTab = 'quiz';
      state.vocabTab = 'quiz';
      initQuiz();
      renderContent();
    });
  }

  function attachLessonListEvents() {
    document.querySelectorAll('.vocab-lesson-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const k = item.getAttribute('data-lesson');
        handleLessonClick(k, e.shiftKey);
      });
    });
  }

  function renderContent() {
    const content = document.getElementById('vocab-tab-content');
    if (!content) return;

    // Update active tab styles
    document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
    if (currentTab === 'list') document.getElementById('tab-list')?.classList.add('active');
    if (currentTab === 'flashcard') document.getElementById('tab-flashcard')?.classList.add('active');
    if (currentTab === 'quiz') document.getElementById('tab-quiz')?.classList.add('active');

    const words = getSelectedWords();

    if (currentTab === 'list') {
      cleanupKeyHandler();
      renderListView(content, words);
    } else if (currentTab === 'flashcard') {
      renderFlashcardView(content, words);
    } else if (currentTab === 'quiz') {
      cleanupKeyHandler();
      renderQuizView(content, words);
    }
  }

  // ─── 1. LIST VIEW ────────────────────────────────────────────────────────────
  function renderListView(content, words) {
    content.innerHTML = `
      <div class="search-bar-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" id="vocab-search" class="search-input" placeholder="Tìm kiếm theo từ vựng, cách đọc, nghĩa hoặc hán việt...">
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
      return `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Không có từ vựng nào trong các bài đã chọn.</div>`;
    }
    return items.map((w) => `
      <div class="word-item-card" data-search="${w.word || w.reading}" title="Bấm để tra cứu Mazii" style="display:flex; flex-direction:column; justify-content:space-between; min-height:160px;">
        <div>
          <div class="word-header">
            <div>
              <div class="word-kanji">${w.word || ''}</div>
              <div class="word-reading">${w.reading || ''}</div>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <button class="icon-btn btn-edit-meaning" data-lesson="${w._lesson}" data-word="${w.word}" title="Chỉnh sửa nghĩa tiếng Việt" style="color:var(--fuji-blue-primary); width:34px; height:34px; font-size:0.9rem;">✏️</button>
              <button class="icon-btn btn-audio" data-speak="${w.word || w.reading}" title="Nghe phát âm" style="width:34px; height:34px; font-size:0.95rem;">🔊</button>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
            ${w.kanji_meaning ? `<span class="word-hanviet">${w.kanji_meaning}</span>` : ''}
            ${w._lesson ? `<span class="word-hanviet" style="background:rgba(56,151,216,0.1); color:var(--fuji-blue-deep); border-color:rgba(56,151,216,0.25);">Bài ${w._lesson}</span>` : ''}
          </div>
          <div class="word-meaning">${w.meaning || ''}</div>
          ${w.example ? `<div class="word-example">${w.example}</div>` : ''}
        </div>
        <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:10px;">
          <span class="word-mazii-badge" title="Tra cứu '${w.word || w.reading}' trên Mazii">Mazii ↗</span>
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

    document.querySelectorAll('.word-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-audio') || e.target.closest('.btn-edit-meaning')) return;
        const searchWord = card.getAttribute('data-search');
        if (searchWord) openMazii(searchWord);
      });
    });
  }

  function openEditMeaningModal(w, lesson) {
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
            <span>Chỉnh Sửa Nghĩa Tiếng Việt</span>
          </h3>
          <button id="btn-close-edit-modal" style="background:none; border:none; font-size:1.3rem; cursor:pointer; color:var(--text-muted); line-height:1;">✕</button>
        </div>

        <div style="background: rgba(37,99,235,0.06); padding: 12px 14px; border-radius: var(--radius-sm); margin-bottom: 14px; border-left: 3px solid var(--fuji-blue-primary);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-family:var(--font-japanese); font-size:1.5rem; font-weight:800; color:var(--fuji-blue-deep);">${w.word}</span>
              ${w.reading ? `<span style="font-size:0.95rem; font-weight:700; color:var(--fuji-blue-primary); margin-left:8px;">(${w.reading})</span>` : ''}
            </div>
            <span style="font-size:0.8rem; font-weight:700; background:rgba(37,99,235,0.1); color:var(--fuji-blue-deep); padding:2px 8px; border-radius:12px;">Bài ${lesson}</span>
          </div>
          ${w.kanji_meaning ? `<div style="font-size:0.84rem; color:var(--text-secondary); margin-top:4px;">Âm Hán: <strong>${w.kanji_meaning}</strong></div>` : ''}
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display:block; font-size:0.88rem; font-weight:700; color:var(--text-title); margin-bottom:6px;">
            Nghĩa tiếng Việt mới:
          </label>
          <textarea id="input-edit-meaning-text" class="form-textarea" rows="3" style="width:100%; border-radius:10px; padding:10px 12px; font-size:0.95rem;" placeholder="Nhập nghĩa tiếng Việt...">${w.meaning || ''}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-edit-meaning">Hủy</button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-edit-meaning" style="font-weight:700;">💾 Lưu</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('btn-close-edit-modal')?.addEventListener('click', close);
    document.getElementById('btn-cancel-edit-meaning')?.addEventListener('click', close);

    document.getElementById('btn-save-edit-meaning')?.addEventListener('click', async () => {
      const newMeaning = document.getElementById('input-edit-meaning-text')?.value.trim();
      if (!newMeaning) {
        alert('Nghĩa tiếng Việt không được để trống!');
        return;
      }

      // Update in memory
      w.meaning = newMeaning;
      if (state.vocabData[lesson]) {
        const item = state.vocabData[lesson].find(it => it.word === w.word);
        if (item) item.meaning = newMeaning;
      }

      // Save to localStorage overrides
      const overrides = JSON.parse(localStorage.getItem('jlpt_vocab_overrides') || '{}');
      overrides[`${lesson}:::${w.word}`] = newMeaning;
      localStorage.setItem('jlpt_vocab_overrides', JSON.stringify(overrides));

      close();
      renderContent();

      showToast(`⏳ Đang cập nhật nghĩa từ '${w.word}' lên GitHub...`);
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

    if (!words || words.length === 0) {
      content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Vui lòng chọn ít nhất 1 bài để học Flashcard.</div>`;
      return;
    }

    if (flashcardIndex >= words.length) flashcardIndex = 0;
    const currentWord = words[flashcardIndex];
    const progressPercent = Math.round(((flashcardIndex + 1) / words.length) * 100);

    content.innerHTML = `
      <div class="flashcard-container">
        <!-- Progress bar -->
        <div class="flashcard-progress">
          <span>Tiến độ: ${flashcardIndex + 1} / ${words.length} (${selectedLessons.size} bài)</span>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <span>${progressPercent}%</span>
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

            <!-- Back Face: Đầy đủ thông tin VÀ nút Tra Mazii ở góc -->
            <div class="flashcard-face flashcard-back">
              <div class="fc-back-topbar">
                <span class="fc-lesson-badge">Bài ${currentWord._lesson || state.selectedVocabLesson || '1'}</span>
                <button class="btn-fc-mazii" id="fc-btn-mazii" title="Tra cứu trên Mazii">🔍 Tra Mazii ↗</button>
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

        <!-- Controls -->
        <div class="flashcard-controls">
          <button class="btn btn-fc-review" id="btn-fc-review" title="Phím Mũi tên trái (←)">✗ Chưa thuộc</button>
          <button class="btn btn-fc-flip" id="btn-fc-flip" title="Phím Enter hoặc Space">🔄 Lật thẻ</button>
          <button class="btn btn-fc-mastered" id="btn-fc-mastered" title="Phím Mũi tên phải (→)">✓ Đã thuộc</button>
          <button class="btn btn-secondary btn-sm" id="fc-shuffle" style="margin-left:8px;" title="Xáo trộn ngẫu nhiên tất cả từ của các bài đã chọn">🔀 Xáo trộn</button>
        </div>
      </div>
    `;

    const cardBox = document.getElementById('flashcard-box');
    const stampMastered = document.getElementById('fc-stamp-mastered');
    const stampReview = document.getElementById('fc-stamp-review');

    function flipCard() {
      isCardFlipped = !isCardFlipped;
      cardBox.classList.toggle('is-flipped', isCardFlipped);
    }

    function advanceCard() {
      if (flashcardIndex < words.length - 1) {
        flashcardIndex++;
      } else {
        flashcardIndex = 0;
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
            advanceCard();
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
            advanceCard();
          }, 380);
        }, 550);
      }
    }

    // Touch & Mouse Drag Handling
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;

    function onPointerDown(e) {
      if (isAnimating) return;
      if (e.target.closest('.btn-audio') || e.target.closest('#fc-btn-mazii')) return;
      isDragging = true;
      hasMoved = false;
      const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      cardBox.style.transition = 'none';
    }

    function onPointerMove(e) {
      if (!isDragging || isAnimating) return;
      const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        hasMoved = true;
      }

      if (hasMoved) {
        const rot = dx * 0.08;
        cardBox.style.transform = `translate(${dx}px, ${dy * 0.3}px) rotate(${rot}deg) ${isCardFlipped ? 'rotateY(180deg)' : ''}`;

        if (dx > 15) {
          stampMastered.style.opacity = Math.min(1, (dx - 15) / 80).toString();
          stampReview.style.opacity = '0';
        } else if (dx < -15) {
          stampReview.style.opacity = Math.min(1, (Math.abs(dx) - 15) / 80).toString();
          stampMastered.style.opacity = '0';
        } else {
          stampMastered.style.opacity = '0';
          stampReview.style.opacity = '0';
        }
      }
    }

    function onPointerUp(e) {
      if (!isDragging || isAnimating) return;
      isDragging = false;
      const endX = (e.type.startsWith('touch') && e.changedTouches) ? e.changedTouches[0].clientX : e.clientX;
      const dx = endX !== undefined ? (endX - startX) : 0;

      if (!hasMoved || Math.abs(dx) < 12) {
        cardBox.style.transition = 'transform 0.4s ease';
        cardBox.style.transform = isCardFlipped ? '' : 'rotateY(180deg)';
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
        stampMastered.style.opacity = '0';
        stampReview.style.opacity = '0';
      }
    }

    const sceneEl = document.getElementById('fc-scene');
    sceneEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    sceneEl.addEventListener('touchstart', onPointerDown, { passive: true });
    sceneEl.addEventListener('touchmove', onPointerMove, { passive: true });
    sceneEl.addEventListener('touchend', onPointerUp, { passive: true });

    // Buttons
    document.getElementById('btn-fc-review').addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSwipeAnimation('left');
    });

    document.getElementById('btn-fc-flip').addEventListener('click', (e) => {
      e.stopPropagation();
      flipCard();
    });

    document.getElementById('btn-fc-mastered').addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSwipeAnimation('right');
    });

    document.getElementById('fc-shuffle').addEventListener('click', (e) => {
      e.stopPropagation();
      words.sort(() => Math.random() - 0.5);
      flashcardIndex = 0;
      isCardFlipped = false;
      renderFlashcardView(content, words);
    });

    // Mazii Button on back face
    document.getElementById('fc-btn-mazii')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const searchWord = currentWord.word || currentWord.reading;
      if (searchWord) openMazii(searchWord);
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

  // ─── 3. QUIZ VIEW (Full Multi-Lesson Support for PC & Mobile) ────────────────
  function initQuiz() {
    const words = getSelectedWords();
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
      const others = words.filter(w => w.word !== target.word).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [target, ...others].sort(() => Math.random() - 0.5);
      return {
        target,
        options,
        userAnswer: null
      };
    });
  }

  function renderQuizView(content, words) {
    if (!quizQuestions || quizQuestions.length === 0) {
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.4rem; margin-bottom:12px; color:var(--text-title);">Trắc nghiệm ôn tập</h3>
          <p style="color:var(--text-muted); margin-bottom: 20px;">Cần ít nhất 4 từ vựng trong các bài đã chọn để tạo bài trắc nghiệm.</p>
          <button class="btn btn-primary" id="btn-quiz-open-lessons-empty">📚 Chọn bài học ngay</button>
        </div>
      `;
      document.getElementById('btn-quiz-open-lessons-empty')?.addEventListener('click', openSheet);
      return;
    }

    if (quizIndex >= quizQuestions.length) {
      const percent = Math.round((quizScore / quizQuestions.length) * 100);
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.8rem; margin-bottom:12px; color:var(--text-title);">🎉 Kết Quả Ôn Tập</h3>
          <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom: 8px;">Bạn đã trả lời đúng <strong>${quizScore}/${quizQuestions.length}</strong> câu (${percent}%)</p>
          <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom: 24px;">Bài học: ${getSelectedSummaryText()} (${selectedLessons.size} bài)</p>
          <div style="font-size: 3.5rem; margin-bottom: 24px;">${percent >= 80 ? '🏆' : percent >= 50 ? '👍' : '💪'}</div>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-restart-quiz">Làm lại bài thi ↺</button>
            <button class="btn btn-secondary" id="btn-quiz-change-lessons-res">📚 Đổi bài học khác ▾</button>
          </div>
        </div>
      `;
      document.getElementById('btn-restart-quiz').addEventListener('click', () => {
        initQuiz();
        renderContent();
      });
      document.getElementById('btn-quiz-change-lessons-res')?.addEventListener('click', openSheet);
      return;
    }

    const currentQ = quizQuestions[quizIndex];
    content.innerHTML = `
      <div class="quiz-box">
        <!-- Quiz Multi-Lesson Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px; padding-bottom:10px; border-bottom:1px solid var(--glass-border-subtle);">
          <div>
            <div style="font-size:0.85rem; color:var(--fuji-blue-deep); font-weight:800;">ĐANG ÔN ${selectedLessons.size} BÀI: ${getSelectedSummaryText()}</div>
            <div style="font-size:0.78rem; color:var(--text-muted);">Tổng kho từ: ${words.length} từ</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
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
        <div style="display:flex; justify-content:space-between; margin-bottom: 16px; font-weight:700; color:var(--text-muted); font-size:0.9rem;">
          <span>Câu hỏi ${quizIndex + 1} / ${quizQuestions.length}</span>
          <span>Điểm: ${quizScore}</span>
        </div>

        <div class="quiz-question">
          Từ sau đây có nghĩa là gì?<br>
          <span style="font-size:2rem; font-weight:800; color:var(--text-title); display:block; margin-top:8px;">${currentQ.target.word}</span>
          <span style="font-size:1.1rem; color:var(--fuji-blue-deep); font-weight:700;">${currentQ.target.reading || ''}</span>
          ${currentQ.target._lesson ? `<span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:4px;">(Bài ${currentQ.target._lesson})</span>` : ''}
        </div>

        <div class="quiz-options">
          ${currentQ.options.map((opt, i) => {
      const letter = ['A', 'B', 'C', 'D'][i];
      let cls = '';
      if (currentQ.userAnswer !== null) {
        if (opt.word === currentQ.target.word) cls = 'correct';
        else if (opt.word === currentQ.userAnswer) cls = 'wrong';
      }
      return `
              <button class="quiz-opt-btn ${cls}" data-word="${opt.word}" ${currentQ.userAnswer !== null ? 'disabled' : ''}>
                <span class="quiz-opt-key">${letter}</span>
                <span>${opt.meaning}</span>
              </button>
            `;
    }).join('')}
        </div>

        ${currentQ.userAnswer !== null ? `
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
        renderQuizView(content, words);
      });
    });

    content.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-word');
        currentQ.userAnswer = selected;
        if (selected === currentQ.target.word) {
          quizScore++;
        }
        renderQuizView(content, words);
      });
    });

    document.getElementById('btn-next-quiz')?.addEventListener('click', () => {
      quizIndex++;
      renderQuizView(content, words);
    });
  }

  render();
}
