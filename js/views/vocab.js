// Vocab View Component (List, Flashcard 3D with Swipe & Keyboard, and Quiz)
import { SpeechHelper } from '../speech.js';

export function renderVocab(container, state, navigate) {
  let currentLesson = state.selectedVocabLesson || '1';
  let currentTab = state.vocabTab || 'list'; // 'list', 'flashcard', 'quiz'
  let flashcardIndex = 0;
  let isCardFlipped = false;
  let quizIndex = 0;
  let quizScore = 0;
  let quizQuestions = [];
  let activeKeyHandler = null;

  function cleanupKeyHandler() {
    if (activeKeyHandler) {
      window.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
  }

  function getWords() {
    if (!state.vocabData) return [];
    return state.vocabData[currentLesson] || [];
  }

  function render() {
    cleanupKeyHandler();
    const words = getWords();
    const lessonKeys = state.vocabData ? Object.keys(state.vocabData).sort((a,b) => parseInt(a) - parseInt(b)) : [];

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:700;">Học Từ Vựng N2</h2>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Chọn bài:</label>
          <select id="select-lesson" class="form-input" style="padding: 6px 12px; width:auto; font-weight:600;">
            ${lessonKeys.map(k => `<option value="${k}" ${k === currentLesson ? 'selected' : ''}>Bài ${k} (${(state.vocabData[k] || []).length} từ)</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Mode Tabs -->
      <div class="tab-row">
        <button class="tab-pill ${currentTab === 'list' ? 'active' : ''}" id="tab-list">📖 Danh sách từ (${words.length})</button>
        <button class="tab-pill ${currentTab === 'flashcard' ? 'active' : ''}" id="tab-flashcard">🎴 Thẻ Flashcard 3D</button>
        <button class="tab-pill ${currentTab === 'quiz' ? 'active' : ''}" id="tab-quiz">🎯 Trắc nghiệm ôn tập</button>
      </div>

      <div id="vocab-tab-content"></div>
    `;

    // Event listeners
    document.getElementById('btn-back-home').addEventListener('click', () => {
      cleanupKeyHandler();
      navigate('home');
    });

    document.getElementById('select-lesson').addEventListener('change', (e) => {
      currentLesson = e.target.value;
      state.selectedVocabLesson = currentLesson;
      flashcardIndex = 0;
      isCardFlipped = false;
      render();
    });

    document.getElementById('tab-list').addEventListener('click', () => { 
      cleanupKeyHandler();
      currentTab = 'list'; 
      renderContent(); 
    });
    document.getElementById('tab-flashcard').addEventListener('click', () => { 
      currentTab = 'flashcard'; 
      renderContent(); 
    });
    document.getElementById('tab-quiz').addEventListener('click', () => { 
      cleanupKeyHandler();
      currentTab = 'quiz'; 
      initQuiz(); 
      renderContent(); 
    });

    renderContent();
  }

  function renderContent() {
    const content = document.getElementById('vocab-tab-content');
    if (!content) return;

    // Update active tab styles
    document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
    if (currentTab === 'list') document.getElementById('tab-list')?.classList.add('active');
    if (currentTab === 'flashcard') document.getElementById('tab-flashcard')?.classList.add('active');
    if (currentTab === 'quiz') document.getElementById('tab-quiz')?.classList.add('active');

    const words = getWords();

    if (currentTab === 'list') {
      cleanupKeyHandler();
      renderListView(content, words);
    } else if (currentTab === 'flashcard') {
      renderFlashcardView(content, words);
    } else if (currentTab === 'quiz') {
      cleanupKeyHandler();
      renderQuizView(content);
    }
  }

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
      attachAudioListeners();
    });

    attachAudioListeners();
  }

  function renderWordCards(items) {
    if (!items || items.length === 0) {
      return `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Không tìm thấy từ vựng nào.</div>`;
    }
    return items.map((w) => `
      <div class="word-item-card">
        <div>
          <div class="word-header">
            <div>
              <div class="word-kanji">${w.word || ''}</div>
              <div class="word-reading">${w.reading || ''}</div>
            </div>
            <button class="icon-btn btn-audio" data-speak="${w.word || w.reading}" title="Nghe phát âm">🔊</button>
          </div>
          ${w.kanji_meaning ? `<span class="word-hanviet">${w.kanji_meaning}</span>` : ''}
          <div class="word-meaning">${w.meaning || ''}</div>
          ${w.example ? `<div class="word-example">${w.example}</div>` : ''}
        </div>
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

  function renderFlashcardView(content, words) {
    cleanupKeyHandler();

    if (!words || words.length === 0) {
      content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Bài này chưa có dữ liệu từ vựng.</div>`;
      return;
    }

    const currentWord = words[flashcardIndex];
    const progressPercent = Math.round(((flashcardIndex + 1) / words.length) * 100);

    content.innerHTML = `
      <div class="flashcard-container">
        <div class="flashcard-progress">
          <span>Tiến độ: ${flashcardIndex + 1} / ${words.length}</span>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <span>${progressPercent}%</span>
        </div>

        <div class="flashcard-scene" id="fc-scene" style="touch-action: pan-y;">
          <div class="flashcard ${isCardFlipped ? 'is-flipped' : ''}" id="flashcard-box">
            <!-- Stamps for swipe feedback -->
            <div class="fc-stamp fc-stamp-mastered" id="fc-stamp-mastered">✓ ĐÃ THUỘC</div>
            <div class="fc-stamp fc-stamp-review" id="fc-stamp-review">✗ CHƯA THUỘC</div>

            <!-- Front Face -->
            <div class="flashcard-face flashcard-front">
              <div class="fc-word">${currentWord.word || ''}</div>
              ${currentWord.reading ? `<div class="fc-reading">${currentWord.reading}</div>` : ''}
              ${currentWord.kanji_meaning ? `<div class="fc-hanviet">[${currentWord.kanji_meaning}]</div>` : ''}
              <button class="icon-btn btn-audio" data-speak="${currentWord.word || currentWord.reading}" style="margin-top:16px;">🔊 Nghe</button>
              <div class="fc-hint">💡 Chạm/Enter để lật • Kéo thẻ hoặc dùng phím ← / →</div>
            </div>

            <!-- Back Face -->
            <div class="flashcard-face flashcard-back">
              <div class="fc-reading" style="font-size:1.25rem; color:var(--fuji-blue-deep); margin-bottom:8px; font-weight:700;">${currentWord.word} (${currentWord.reading || ''})</div>
              <div class="fc-meaning">${currentWord.meaning || ''}</div>
              ${currentWord.example ? `<div class="word-example" style="width:100%; text-align:left;">${currentWord.example}</div>` : ''}
              <div class="fc-hint">💡 Chạm/Enter để lật lại • Kéo thẻ hoặc dùng phím ← / →</div>
            </div>
          </div>
        </div>

        <div class="flashcard-controls">
          <button class="btn btn-fc-review" id="btn-fc-review" title="Phím Mũi tên trái (←)">✗ Chưa thuộc (←)</button>
          <button class="btn btn-fc-flip" id="btn-fc-flip" title="Phím Enter hoặc Space">🔄 Lật thẻ (Enter)</button>
          <button class="btn btn-fc-mastered" id="btn-fc-mastered" title="Phím Mũi tên phải (→)">✓ Đã thuộc (→)</button>
          <button class="btn btn-secondary btn-sm" id="fc-shuffle" style="margin-left:8px;">🔀 Xáo trộn</button>
        </div>

        <div style="margin-top:16px; font-size:0.86rem; color:var(--text-muted); text-align:center;">
          💡 Dùng chuột kéo thẻ sang trái/phải, hoặc dùng phím: <strong>←</strong> (Chưa thuộc), <strong>→</strong> (Đã thuộc), <strong>Enter/Space</strong> (Lật thẻ).
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

    let isAnimating = false;

    function triggerSwipeAnimation(direction) {
      if (isAnimating) return;
      isAnimating = true;

      cardBox.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease';
      if (direction === 'right') {
        if (stampMastered) stampMastered.style.opacity = '1';
        if (stampReview) stampReview.style.opacity = '0';
        cardBox.style.transform = `translate(120vw, 20px) rotate(32deg) ${isCardFlipped ? 'rotateY(180deg)' : ''}`;
        cardBox.style.opacity = '0';
      } else {
        if (stampReview) stampReview.style.opacity = '1';
        if (stampMastered) stampMastered.style.opacity = '0';
        cardBox.style.transform = `translate(-120vw, 20px) rotate(-32deg) ${isCardFlipped ? 'rotateY(180deg)' : ''}`;
        cardBox.style.opacity = '0';
      }

      setTimeout(() => {
        isAnimating = false;
        advanceCard();
      }, 280);
    }

    // Touch & Mouse Drag Handling
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;

    function onPointerDown(e) {
      if (isAnimating) return;
      if (e.target.closest('.btn-audio')) return;
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
        // Just a tap/click -> flip card
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
        // Snap back to center
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

    // Action Buttons
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

    // Keyboard Shortcuts
    activeKeyHandler = function(e) {
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

    attachAudioListeners();
  }

  function initQuiz() {
    const words = getWords();
    if (words.length < 4) {
      quizQuestions = [];
      return;
    }
    quizIndex = 0;
    quizScore = 0;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const count = Math.min(shuffled.length, 10);
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

  function renderQuizView(content) {
    if (!quizQuestions || quizQuestions.length === 0) {
      content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Cần ít nhất 4 từ vựng trong bài để tạo trắc nghiệm.</div>`;
      return;
    }

    if (quizIndex >= quizQuestions.length) {
      const percent = Math.round((quizScore / quizQuestions.length) * 100);
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.8rem; margin-bottom:12px; color:var(--text-title);">🎉 Kết Quả Ôn Tập</h3>
          <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom: 24px;">Bạn đã trả lời đúng <strong>${quizScore}/${quizQuestions.length}</strong> câu (${percent}%)</p>
          <div style="font-size: 3.5rem; margin-bottom: 24px;">${percent >= 80 ? '🏆' : percent >= 50 ? '👍' : '💪'}</div>
          <button class="btn btn-primary" id="btn-restart-quiz">Làm lại bài thi ↺</button>
        </div>
      `;
      document.getElementById('btn-restart-quiz').addEventListener('click', () => {
        initQuiz();
        renderContent();
      });
      return;
    }

    const currentQ = quizQuestions[quizIndex];
    content.innerHTML = `
      <div class="quiz-box">
        <div style="display:flex; justify-content:space-between; margin-bottom: 16px; font-weight:700; color:var(--text-muted); font-size:0.9rem;">
          <span>Câu hỏi ${quizIndex + 1} / ${quizQuestions.length}</span>
          <span>Điểm: ${quizScore}</span>
        </div>
        <div class="quiz-question">
          Từ sau đây có nghĩa là gì?<br>
          <span style="font-size:2rem; font-weight:800; color:var(--text-title); display:block; margin-top:8px;">${currentQ.target.word}</span>
          <span style="font-size:1.1rem; color:var(--fuji-blue-deep); font-weight:700;">${currentQ.target.reading || ''}</span>
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

    content.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-word');
        currentQ.userAnswer = selected;
        if (selected === currentQ.target.word) {
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
