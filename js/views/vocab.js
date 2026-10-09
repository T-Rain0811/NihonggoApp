// Vocab View Component (List, Flashcard 3D, and Quiz)
import { SpeechHelper } from '../speech.js';

export function renderVocab(container, state, navigate) {
  let currentLesson = state.selectedVocabLesson || '1';
  let currentTab = state.vocabTab || 'list'; // 'list', 'flashcard', 'quiz'
  let flashcardIndex = 0;
  let isCardFlipped = false;
  let quizIndex = 0;
  let quizScore = 0;
  let quizQuestions = [];

  function getWords() {
    if (!state.vocabData) return [];
    return state.vocabData[currentLesson] || [];
  }

  function render() {
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
    document.getElementById('btn-back-home').addEventListener('click', () => navigate('home'));
    document.getElementById('select-lesson').addEventListener('change', (e) => {
      currentLesson = e.target.value;
      state.selectedVocabLesson = currentLesson;
      flashcardIndex = 0;
      isCardFlipped = false;
      render();
    });

    document.getElementById('tab-list').addEventListener('click', () => { currentTab = 'list'; renderContent(); });
    document.getElementById('tab-flashcard').addEventListener('click', () => { currentTab = 'flashcard'; renderContent(); });
    document.getElementById('tab-quiz').addEventListener('click', () => { currentTab = 'quiz'; initQuiz(); renderContent(); });

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
      renderListView(content, words);
    } else if (currentTab === 'flashcard') {
      renderFlashcardView(content, words);
    } else if (currentTab === 'quiz') {
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
    return items.map((w, idx) => `
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

        <div class="flashcard-scene" id="fc-scene">
          <div class="flashcard ${isCardFlipped ? 'is-flipped' : ''}" id="flashcard-box">
            <!-- Front Face -->
            <div class="flashcard-face flashcard-front">
              <div class="fc-word">${currentWord.word || ''}</div>
              ${currentWord.reading ? `<div class="fc-reading">${currentWord.reading}</div>` : ''}
              ${currentWord.kanji_meaning ? `<div class="fc-hanviet">[${currentWord.kanji_meaning}]</div>` : ''}
              <button class="icon-btn btn-audio" data-speak="${currentWord.word || currentWord.reading}" style="margin-top:16px;">🔊 Nghe</button>
              <div class="fc-hint">💡 Chạm vào thẻ để lật mặt sau</div>
            </div>

            <!-- Back Face -->
            <div class="flashcard-face flashcard-back">
              <div class="fc-reading" style="font-size:1.1rem; color:var(--text-muted);">${currentWord.word} (${currentWord.reading || ''})</div>
              <div class="fc-meaning">${currentWord.meaning || ''}</div>
              ${currentWord.example ? `<div class="word-example" style="width:100%; text-align:left;">${currentWord.example}</div>` : ''}
              <div class="fc-hint">💡 Chạm vào thẻ để lật lại</div>
            </div>
          </div>
        </div>

        <div class="flashcard-controls">
          <button class="btn btn-secondary" id="fc-prev" ${flashcardIndex === 0 ? 'disabled' : ''}>← Trước</button>
          <button class="btn btn-secondary" id="fc-shuffle">🔀 Xáo trộn</button>
          <button class="btn btn-primary" id="fc-next">${flashcardIndex === words.length - 1 ? 'Làm lại ↺' : 'Tiếp theo →'}</button>
        </div>
      </div>
    `;

    document.getElementById('fc-scene').addEventListener('click', () => {
      isCardFlipped = !isCardFlipped;
      document.getElementById('flashcard-box').classList.toggle('is-flipped', isCardFlipped);
    });

    document.getElementById('fc-prev').addEventListener('click', () => {
      if (flashcardIndex > 0) {
        flashcardIndex--;
        isCardFlipped = false;
        renderFlashcardView(content, words);
      }
    });

    document.getElementById('fc-next').addEventListener('click', () => {
      if (flashcardIndex < words.length - 1) {
        flashcardIndex++;
      } else {
        flashcardIndex = 0;
      }
      isCardFlipped = false;
      renderFlashcardView(content, words);
    });

    document.getElementById('fc-shuffle').addEventListener('click', () => {
      words.sort(() => Math.random() - 0.5);
      flashcardIndex = 0;
      isCardFlipped = false;
      renderFlashcardView(content, words);
    });

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
      // Pick 3 wrong options
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
      // Finished
      const percent = Math.round((quizScore / quizQuestions.length) * 100);
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.8rem; margin-bottom:12px;">🎉 Kết Quả Ôn Tập</h3>
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
        <div style="display:flex; justify-content:space-between; margin-bottom: 16px; font-weight:600; color:var(--text-muted); font-size:0.9rem;">
          <span>Câu hỏi ${quizIndex + 1} / ${quizQuestions.length}</span>
          <span>Điểm: ${quizScore}</span>
        </div>
        <div class="quiz-question">
          Từ sau đây có nghĩa là gì?<br>
          <span style="font-size:2rem; font-weight:800; color:var(--text-primary); display:block; margin-top:8px;">${currentQ.target.word}</span>
          <span style="font-size:1.1rem; color:var(--accent-cyan);">${currentQ.target.reading || ''}</span>
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
