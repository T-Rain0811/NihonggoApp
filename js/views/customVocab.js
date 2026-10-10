// Custom Vocabulary Manager & Study View (Personal Vocab)
import { SpeechHelper } from '../speech.js';
import { GitHubSync, showToast } from '../services/githubSync.js';

export function renderCustomVocab(container, state, navigate) {
  let mode = 'list'; // 'list', 'flashcard', 'quiz'
  let flashcardIndex = 0;
  let isCardFlipped = false;
  let quizIndex = 0;
  let quizScore = 0;
  let quizQuestions = [];
  let activeKeyHandler = null;
  let editingWordId = null;

  function cleanupKeyHandler() {
    if (activeKeyHandler) {
      window.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
  }

  function getCustomWords() {
    return state.customVocab || [];
  }

  function saveCustomWords(words) {
    state.customVocab = words;
    localStorage.setItem('jlpt_custom_vocab', JSON.stringify(words));
  }

  function render() {
    const words = getCustomWords();
    const hasToken = GitHubSync.hasToken();

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-title);">Sổ Tay Từ Vựng Cá Nhân</h2>
        </div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="btn-show-add">➕ Thêm Từ Mới</button>
          <button class="btn btn-secondary btn-sm" id="btn-github-sync" title="Cài đặt mã token để đồng bộ lên GitHub">
            ${hasToken ? '✅ Đã kết nối GitHub' : '🔗 Kết nối GitHub'}
          </button>
        </div>
      </div>

      <!-- Mode Tabs -->
      <div class="tab-row">
        <button class="tab-pill ${mode === 'list' ? 'active' : ''}" id="tab-custom-list">📋 Danh sách (${words.length} từ)</button>
        <button class="tab-pill ${mode === 'flashcard' ? 'active' : ''}" id="tab-custom-flashcard" ${words.length === 0 ? 'disabled' : ''}>🎴 Ôn tập Flashcard</button>
        <button class="tab-pill ${mode === 'quiz' ? 'active' : ''}" id="tab-custom-quiz" ${words.length < 4 ? 'disabled' : ''}>🎯 Làm Trắc Nghiệm</button>
      </div>

      <!-- Add/Edit Word Form Box (Toggleable) -->
      <div id="add-word-container" style="display:none; margin-bottom: 20px;">
        <form class="custom-form" id="form-add-word">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 id="form-add-title" style="font-size:1.15rem; font-weight:800; color:var(--fuji-blue-deep);">
              Thêm từ vựng mới vào sổ tay
            </h3>
            <span style="font-size:0.8rem; color:var(--text-muted);">Tự động lưu vào <code>data/personal_vocab.json</code></span>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
            <div class="form-group">
              <label class="form-label">Từ vựng (Kanji / Word) *</label>
              <input type="text" id="input-word" class="form-input" placeholder="Ví dụ: 握手" required>
            </div>
            <div class="form-group">
              <label class="form-label">Cách đọc (Furigana / Reading)</label>
              <input type="text" id="input-reading" class="form-input" placeholder="Ví dụ: あくしゅ">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
            <div class="form-group">
              <label class="form-label">Nghĩa tiếng Việt *</label>
              <input type="text" id="input-meaning" class="form-input" placeholder="Ví dụ: Bắt tay" required>
            </div>
            <div class="form-group">
              <label class="form-label">Âm Hán Việt (Tùy chọn)</label>
              <input type="text" id="input-hanviet" class="form-input" placeholder="Ví dụ: ÁC THỦ">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Ví dụ minh họa (Tùy chọn)</label>
            <textarea id="input-example" class="form-textarea" rows="2" placeholder="Ví dụ: 笑顔で握手する。 (Bắt tay với nụ cười tươi)"></textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-add">Hủy</button>
            <button type="submit" class="btn btn-primary btn-sm" id="btn-submit-word">💾 Lưu từ vựng & Đồng bộ</button>
          </div>
        </form>
      </div>

      <div id="custom-content"></div>
    `;

    // Event listeners
    document.getElementById('btn-back-home').addEventListener('click', () => {
      cleanupKeyHandler();
      navigate('home');
    });

    document.getElementById('btn-github-sync').addEventListener('click', () => {
      GitHubSync.showTokenModal((token) => {
        render();
        if (token) showToast('Đã lưu mã GitHub Token!');
      });
    });
    
    const addBox = document.getElementById('add-word-container');
    document.getElementById('btn-show-add').addEventListener('click', () => {
      editingWordId = null;
      document.getElementById('form-add-word').reset();
      document.getElementById('form-add-title').textContent = 'Thêm từ vựng mới vào sổ tay';
      document.getElementById('btn-submit-word').textContent = '💾 Lưu từ vựng & Đồng bộ';
      addBox.style.display = addBox.style.display === 'none' ? 'block' : 'none';
      if (addBox.style.display === 'block') {
        document.getElementById('input-word').focus();
      }
    });

    document.getElementById('btn-cancel-add').addEventListener('click', () => {
      editingWordId = null;
      addBox.style.display = 'none';
    });

    // Form submit
    document.getElementById('form-add-word').addEventListener('submit', async (e) => {
      e.preventDefault();
      const word = document.getElementById('input-word').value.trim();
      const reading = document.getElementById('input-reading').value.trim();
      const meaning = document.getElementById('input-meaning').value.trim();
      const kanji_meaning = document.getElementById('input-hanviet').value.trim();
      const example = document.getElementById('input-example').value.trim();

      if (!word || !meaning) return;

      let currentWords = [...getCustomWords()];
      let isEdit = Boolean(editingWordId);

      if (isEdit) {
        currentWords = currentWords.map(w => {
          if ((w.id && w.id === editingWordId) || (!w.id && w.word === editingWordId)) {
            return { ...w, word, reading, meaning, kanji_meaning, example, updatedAt: new Date().toISOString() };
          }
          return w;
        });
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
        currentWords = [newWord, ...currentWords];
      }

      saveCustomWords(currentWords);
      editingWordId = null;
      e.target.reset();
      addBox.style.display = 'none';
      render();

      showToast('⏳ Đang đồng bộ file personal_vocab.json lên GitHub...');
      const commitMsg = isEdit 
        ? `Cập nhật từ '${word}' trong personal_vocab.json` 
        : `Thêm từ '${word}' vào personal_vocab.json`;

      const syncRes = await GitHubSync.commitFile('data/personal_vocab.json', currentWords, commitMsg);
      if (syncRes.success) {
        showToast('✅ Đã lưu và đồng bộ lên GitHub thành công!');
      } else {
        showToast(`⚠️ Đã lưu trên thiết bị. ${syncRes.error || ''}`);
      }
    });

    // Tab buttons
    document.getElementById('tab-custom-list').addEventListener('click', () => { 
      cleanupKeyHandler();
      mode = 'list'; 
      renderContent(); 
    });
    document.getElementById('tab-custom-flashcard').addEventListener('click', () => { 
      mode = 'flashcard'; 
      flashcardIndex = 0; 
      isCardFlipped = false; 
      renderContent(); 
    });
    document.getElementById('tab-custom-quiz').addEventListener('click', () => { 
      cleanupKeyHandler();
      mode = 'quiz'; 
      initQuiz(); 
      renderContent(); 
    });

    renderContent();
  }

  function renderContent() {
    const content = document.getElementById('custom-content');
    if (!content) return;

    document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
    if (mode === 'list') document.getElementById('tab-custom-list')?.classList.add('active');
    if (mode === 'flashcard') document.getElementById('tab-custom-flashcard')?.classList.add('active');
    if (mode === 'quiz') document.getElementById('tab-custom-quiz')?.classList.add('active');

    const words = getCustomWords();

    if (mode === 'list') {
      cleanupKeyHandler();
      renderListView(content, words);
    } else if (mode === 'flashcard') {
      renderFlashcardView(content, words);
    } else if (mode === 'quiz') {
      cleanupKeyHandler();
      renderQuizView(content);
    }
  }

  function renderListView(content, words) {
    if (words.length === 0) {
      content.innerHTML = `
        <div style="text-align:center; padding: 60px 20px; background:var(--glass-bg); border-radius:var(--radius-xl); border:1px solid var(--glass-border); box-shadow:var(--shadow-glass);">
          <div style="font-size:3rem; margin-bottom:12px;">📝</div>
          <h3 style="font-size:1.3rem; margin-bottom:8px; font-weight:800; color:var(--text-title);">Sổ tay của bạn đang trống</h3>
          <p style="color:var(--text-secondary); margin-bottom:20px; max-width:440px; margin-inline:auto;">Bấm "➕ Thêm Từ Mới" để tạo từ vựng cá nhân. File <code>data/personal_vocab.json</code> sẽ tự động được tạo trên GitHub của bạn.</p>
          <button class="btn btn-primary" id="btn-empty-add-word">➕ Thêm từ đầu tiên</button>
        </div>
      `;
      document.getElementById('btn-empty-add-word')?.addEventListener('click', () => {
        const addBtn = document.getElementById('btn-show-add');
        if (addBtn) addBtn.click();
      });
      return;
    }

    content.innerHTML = `
      <div class="search-bar-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" id="custom-search" class="search-input" placeholder="Tìm kiếm từ trong sổ tay cá nhân...">
      </div>
      <div class="word-list" id="custom-words-grid">
        ${renderCustomWordCards(words)}
      </div>
    `;

    document.getElementById('custom-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = words.filter(w => 
        (w.word && w.word.toLowerCase().includes(q)) ||
        (w.reading && w.reading.toLowerCase().includes(q)) ||
        (w.meaning && w.meaning.toLowerCase().includes(q)) ||
        (w.kanji_meaning && w.kanji_meaning.toLowerCase().includes(q))
      );
      document.getElementById('custom-words-grid').innerHTML = renderCustomWordCards(filtered);
      attachCardActions();
    });

    attachCardActions();
  }

  function renderCustomWordCards(items) {
    return items.map(w => `
      <div class="word-item-card" data-id="${w.id || w.word}" style="display:flex; flex-direction:column; justify-content:space-between; min-height:160px;">
        <div>
          <div class="word-header">
            <div>
              <div class="word-kanji">${w.word || ''}</div>
              <div class="word-reading">${w.reading || ''}</div>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <button class="icon-btn btn-audio" data-speak="${w.reading || w.word}" title="Nghe phát âm" style="width:34px; height:34px; font-size:0.95rem;">🔊</button>
              <button class="icon-btn btn-edit-custom-word" data-id="${w.id || w.word}" style="color:var(--fuji-blue-primary); width:34px; height:34px; font-size:0.9rem;" title="Sửa từ này">✏️</button>
              <button class="icon-btn btn-delete-word" data-id="${w.id || w.word}" data-word="${w.word}" style="color:var(--accent-rose); width:34px; height:34px; font-size:0.9rem;" title="Xóa từ">🗑️</button>
            </div>
          </div>
          ${w.kanji_meaning ? `<span class="word-hanviet">${w.kanji_meaning}</span>` : ''}
          <div class="word-meaning" style="margin-top:6px;">${w.meaning || ''}</div>
          ${w.example ? `<div class="word-example" style="margin-top:8px;">${w.example}</div>` : ''}
        </div>
        <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:10px;">
          <a href="https://mazii.net/vi/search/word/ja-vi/${encodeURIComponent(w.word || '')}" target="_blank" rel="noopener noreferrer" class="word-mazii-badge" title="Tra cứu Mazii" style="text-decoration:none;">
            Mazii ↗
          </a>
        </div>
      </div>
    `).join('');
  }

  function attachCardActions() {
    // Audio
    document.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });

    // Edit
    document.querySelectorAll('.btn-edit-custom-word').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-id');
        const words = getCustomWords();
        const target = words.find(w => (w.id && w.id === targetId) || (!w.id && w.word === targetId));
        if (!target) return;

        editingWordId = target.id || target.word;
        document.getElementById('input-word').value = target.word || '';
        document.getElementById('input-reading').value = target.reading || '';
        document.getElementById('input-meaning').value = target.meaning || '';
        document.getElementById('input-hanviet').value = target.kanji_meaning || '';
        document.getElementById('input-example').value = target.example || '';

        document.getElementById('form-add-title').textContent = `✏️ Chỉnh sửa từ: ${target.word}`;
        document.getElementById('btn-submit-word').textContent = '💾 Cập nhật & Đồng bộ';

        const addBox = document.getElementById('add-word-container');
        addBox.style.display = 'block';
        addBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('input-meaning').focus();
      });
    });

    // Delete
    document.querySelectorAll('.btn-delete-word').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-id');
        const wordText = btn.getAttribute('data-word');
        if (confirm(`Bạn có chắc muốn xóa từ "${wordText}" khỏi sổ tay và file GitHub?`)) {
          const updated = getCustomWords().filter(w => (w.id ? w.id !== targetId : w.word !== wordText));
          saveCustomWords(updated);
          render();
          showToast(`⏳ Đang xóa từ "${wordText}" trên GitHub...`);
          const syncRes = await GitHubSync.commitFile('data/personal_vocab.json', updated, `Xóa từ '${wordText}' khỏi personal_vocab.json`);
          if (syncRes.success) {
            showToast(`✅ Đã xóa từ "${wordText}" trên GitHub!`);
          } else {
            showToast(`⚠️ Đã xóa trên thiết bị. ${syncRes.error || ''}`);
          }
        }
      });
    });
  }

  // Flashcard View
  function renderFlashcardView(content, words) {
    cleanupKeyHandler();

    if (!words || words.length === 0) return;
    const currentWord = words[flashcardIndex];
    const progressPercent = Math.round(((flashcardIndex + 1) / words.length) * 100);

    content.innerHTML = `
      <div class="flashcard-container">
        <div class="flashcard-progress">
          <span>${flashcardIndex + 1} / ${words.length}</span>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <span>${progressPercent}%</span>
        </div>

        <div class="flashcard-scene" id="fc-scene">
          <div class="flashcard ${isCardFlipped ? 'flipped' : ''}" id="fc-card">
            <!-- Front Face: Word + Furigana Only -->
            <div class="flashcard-face flashcard-front">
              <div class="fc-word">${currentWord.word || ''}</div>
              ${currentWord.reading ? `<div class="fc-reading">${currentWord.reading}</div>` : ''}
              <button class="icon-btn btn-audio" data-speak="${currentWord.reading || currentWord.word}" title="Nghe phát âm" style="margin-top:16px;">🔊</button>
            </div>

            <!-- Back Face: Meaning + Hanviet + Example + Mazii link -->
            <div class="flashcard-face flashcard-back">
              <div class="fc-back-topbar">
                <span class="fc-lesson-badge">Sổ tay cá nhân</span>
                <a href="https://mazii.net/vi/search/word/ja-vi/${encodeURIComponent(currentWord.word || '')}" target="_blank" rel="noopener noreferrer" class="btn-fc-mazii" id="btn-fc-mazii" title="Tra cứu nhanh trên từ điển Mazii" style="text-decoration:none;">
                  <span>🔍</span>
                  <span>Mazii</span>
                </a>
              </div>

              ${currentWord.kanji_meaning ? `<div class="fc-hanviet" style="margin-top:20px;">${currentWord.kanji_meaning}</div>` : ''}
              <div class="fc-meaning" style="${!currentWord.kanji_meaning ? 'margin-top:20px;' : ''}">${currentWord.meaning || ''}</div>
              ${currentWord.example ? `<div class="fc-example">${currentWord.example}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="flashcard-controls">
          <button class="btn btn-secondary btn-icon" id="fc-prev" ${flashcardIndex === 0 ? 'disabled' : ''}>←</button>
          <button class="btn btn-primary" id="fc-flip">Lật thẻ ↺</button>
          <button class="btn btn-secondary btn-icon" id="fc-next" ${flashcardIndex === words.length - 1 ? 'disabled' : ''}>→</button>
        </div>
      </div>
    `;

    document.getElementById('fc-scene')?.addEventListener('click', (e) => {
      if (e.target.closest('.btn-audio') || e.target.closest('#btn-fc-mazii')) return;
      isCardFlipped = !isCardFlipped;
      document.getElementById('fc-card')?.classList.toggle('flipped', isCardFlipped);
    });

    document.getElementById('fc-flip')?.addEventListener('click', () => {
      isCardFlipped = !isCardFlipped;
      document.getElementById('fc-card')?.classList.toggle('flipped', isCardFlipped);
    });

    document.getElementById('fc-prev')?.addEventListener('click', () => {
      if (flashcardIndex > 0) {
        flashcardIndex--;
        isCardFlipped = false;
        renderFlashcardView(content, words);
      }
    });

    document.getElementById('fc-next')?.addEventListener('click', () => {
      if (flashcardIndex < words.length - 1) {
        flashcardIndex++;
        isCardFlipped = false;
        renderFlashcardView(content, words);
      }
    });

    document.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });
  }

  // Quiz View
  function initQuiz() {
    const words = getCustomWords();
    if (words.length < 4) return;

    quizIndex = 0;
    quizScore = 0;
    const shuffled = [...words].sort(() => Math.random() - 0.5);

    quizQuestions = shuffled.slice(0, Math.min(20, shuffled.length)).map(target => {
      const wrongPool = words.filter(w => w.word !== target.word).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [target, ...wrongPool].sort(() => Math.random() - 0.5);
      return {
        word: target.word,
        reading: target.reading,
        correctMeaning: target.meaning,
        options: options.map(o => o.meaning),
        userAnswer: null
      };
    });
  }

  function renderQuizView(content) {
    if (!quizQuestions || quizQuestions.length === 0) return;

    if (quizIndex >= quizQuestions.length) {
      const percent = Math.round((quizScore / quizQuestions.length) * 100);
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.8rem; margin-bottom:12px; color:var(--text-title);">🎉 Kết Quả Trắc Nghiệm</h3>
          <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom: 24px;">
            Bạn đã trả lời đúng <strong>${quizScore}/${quizQuestions.length}</strong> câu (${percent}%)
          </p>
          <div style="font-size: 3.5rem; margin-bottom: 24px;">${percent >= 80 ? '🏆' : percent >= 50 ? '👍' : '💪'}</div>
          <button class="btn btn-primary" id="btn-restart-custom-quiz">Làm lại trắc nghiệm ↺</button>
        </div>
      `;
      document.getElementById('btn-restart-custom-quiz')?.addEventListener('click', () => {
        initQuiz();
        renderQuizView(content);
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
          ${currentQ.word}
          ${currentQ.reading ? `<span style="font-size:1.2rem; font-weight:500; color:var(--text-secondary); margin-left:8px;">(${currentQ.reading})</span>` : ''}
        </div>

        <div class="quiz-options">
          ${currentQ.options.map((opt, idx) => {
            let cls = '';
            if (currentQ.userAnswer) {
              if (opt === currentQ.correctMeaning) cls = 'correct';
              else if (opt === currentQ.userAnswer) cls = 'wrong';
            }
            return `
              <button class="quiz-opt-btn ${cls}" data-opt="${opt}" ${currentQ.userAnswer ? 'disabled' : ''}>
                <span class="quiz-opt-key">${idx + 1}</span>
                <span>${opt}</span>
              </button>
            `;
          }).join('')}
        </div>

        ${currentQ.userAnswer ? `
          <div style="display:flex; justify-content:flex-end; margin-top: 20px;">
            <button class="btn btn-primary" id="btn-next-custom-quiz">Câu tiếp theo →</button>
          </div>
        ` : ''}
      </div>
    `;

    content.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-opt');
        currentQ.userAnswer = selected;
        if (selected === currentQ.correctMeaning) {
          quizScore++;
        }
        renderQuizView(content);
      });
    });

    document.getElementById('btn-next-custom-quiz')?.addEventListener('click', () => {
      quizIndex++;
      renderQuizView(content);
    });
  }

  render();
}
