// Custom Vocabulary Manager & Study View
import { SpeechHelper } from '../speech.js';

export function renderCustomVocab(container, state, navigate) {
  let mode = 'list'; // 'list', 'flashcard', 'quiz'
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

  function getCustomWords() {
    return state.customVocab || [];
  }

  function saveCustomWords(words) {
    state.customVocab = words;
    localStorage.setItem('jlpt_custom_vocab', JSON.stringify(words));
  }

  function render() {
    const words = getCustomWords();

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:700;">Sổ Tay Từ Vựng Cá Nhân</h2>
        </div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="btn-show-add">➕ Thêm Từ Mới</button>
          <button class="btn btn-secondary btn-sm" id="btn-export-json">📤 Xuất JSON</button>
          <label class="btn btn-secondary btn-sm" style="margin:0; cursor:pointer;">
            📥 Nhập JSON
            <input type="file" id="file-import-json" accept=".json" style="display:none;">
          </label>
        </div>
      </div>

      <!-- Mode Tabs -->
      <div class="tab-row">
        <button class="tab-pill ${mode === 'list' ? 'active' : ''}" id="tab-custom-list">📋 Danh sách (${words.length} từ)</button>
        <button class="tab-pill ${mode === 'flashcard' ? 'active' : ''}" id="tab-custom-flashcard" ${words.length === 0 ? 'disabled' : ''}>🎴 Ôn tập Flashcard</button>
        <button class="tab-pill ${mode === 'quiz' ? 'active' : ''}" id="tab-custom-quiz" ${words.length < 4 ? 'disabled' : ''}>🎯 Làm Trắc Nghiệm</button>
      </div>

      <!-- Add Word Form Box (Toggleable) -->
      <div id="add-word-container" style="display:none;">
        <form class="custom-form" id="form-add-word">
          <h3 style="font-size:1.15rem; font-weight:700; color:var(--accent-primary);">Thêm từ vựng mới vào sổ tay</h3>
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
            <button type="submit" class="btn btn-primary btn-sm">Lưu từ vựng</button>
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
    
    const addBox = document.getElementById('add-word-container');
    document.getElementById('btn-show-add').addEventListener('click', () => {
      addBox.style.display = addBox.style.display === 'none' ? 'block' : 'none';
      if (addBox.style.display === 'block') {
        document.getElementById('input-word').focus();
      }
    });

    document.getElementById('btn-cancel-add').addEventListener('click', () => {
      addBox.style.display = 'none';
    });

    // Form submit
    document.getElementById('form-add-word').addEventListener('submit', (e) => {
      e.preventDefault();
      const word = document.getElementById('input-word').value.trim();
      const reading = document.getElementById('input-reading').value.trim();
      const meaning = document.getElementById('input-meaning').value.trim();
      const kanji_meaning = document.getElementById('input-hanviet').value.trim();
      const example = document.getElementById('input-example').value.trim();

      if (!word || !meaning) return;

      const newWord = {
        id: Date.now().toString(),
        word,
        reading,
        meaning,
        kanji_meaning,
        example,
        createdAt: new Date().toISOString()
      };

      const updated = [newWord, ...getCustomWords()];
      saveCustomWords(updated);

      // Reset form
      e.target.reset();
      addBox.style.display = 'none';
      render();
      showToast('Đã thêm từ mới vào sổ tay thành công!');
    });

    // Export JSON
    document.getElementById('btn-export-json').addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getCustomWords(), null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `jlpt_custom_vocab_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Đã tải xuống file JSON từ vựng!');
    });

    // Import JSON
    document.getElementById('file-import-json').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            const current = getCustomWords();
            // Merge without duplicates by word
            const existingWords = new Set(current.map(w => w.word));
            const newItems = imported.filter(w => w && w.word && !existingWords.has(w.word));
            const merged = [...newItems, ...current];
            saveCustomWords(merged);
            render();
            showToast(`Đã nhập thành công ${newItems.length} từ mới!`);
          } else {
            alert('File JSON không đúng định dạng danh sách từ vựng.');
          }
        } catch (err) {
          alert('Lỗi đọc file JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
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
        <div style="text-align:center; padding: 60px 20px; background:var(--bg-card); border-radius:var(--radius-xl); border:1px solid var(--border-color);">
          <div style="font-size:3rem; margin-bottom:12px;">📝</div>
          <h3 style="font-size:1.3rem; margin-bottom:8px;">Sổ tay của bạn đang trống</h3>
          <p style="color:var(--text-secondary); margin-bottom:20px; max-width:400px; margin-inline:auto;">Bấm "➕ Thêm Từ Mới" hoặc "📥 Nhập JSON" để bắt đầu xây dựng bộ từ vựng cá nhân của bạn.</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="search-bar-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" id="custom-search" class="search-input" placeholder="Tìm kiếm từ trong sổ tay...">
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
      <div class="word-item-card" data-id="${w.id || w.word}">
        <div>
          <div class="word-header">
            <div>
              <div class="word-kanji">${w.word || ''}</div>
              <div class="word-reading">${w.reading || ''}</div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="icon-btn btn-audio" data-speak="${w.word || w.reading}" title="Nghe phát âm">🔊</button>
              <button class="icon-btn btn-delete-word" data-word="${w.word}" style="color:var(--accent-rose);" title="Xóa từ">🗑️</button>
            </div>
          </div>
          ${w.kanji_meaning ? `<span class="word-hanviet">${w.kanji_meaning}</span>` : ''}
          <div class="word-meaning">${w.meaning || ''}</div>
          ${w.example ? `<div class="word-example">${w.example}</div>` : ''}
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

    // Delete
    document.querySelectorAll('.btn-delete-word').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordText = btn.getAttribute('data-word');
        if (confirm(`Bạn có chắc muốn xóa từ "${wordText}" khỏi sổ tay?`)) {
          const updated = getCustomWords().filter(w => w.word !== wordText);
          saveCustomWords(updated);
          render();
          showToast(`Đã xóa từ "${wordText}".`);
        }
      });
    });
  }

  function renderFlashcardView(content, words) {
    cleanupKeyHandler();

    if (!words || words.length === 0) return;
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

        <div class="flashcard-scene" id="fc-custom-scene" style="touch-action: pan-y;">
          <div class="flashcard ${isCardFlipped ? 'is-flipped' : ''}" id="flashcard-custom-box">
            <!-- Stamps for swipe feedback -->
            <div class="fc-stamp fc-stamp-mastered" id="fc-custom-stamp-mastered">✓ ĐÃ THUỘC</div>
            <div class="fc-stamp fc-stamp-review" id="fc-custom-stamp-review">✗ CHƯA THUỘC</div>

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
          <button class="btn btn-fc-review" id="btn-fc-custom-review" title="Phím Mũi tên trái (←)">✗ Chưa thuộc (←)</button>
          <button class="btn btn-fc-flip" id="btn-fc-custom-flip" title="Phím Enter hoặc Space">🔄 Lật thẻ (Enter)</button>
          <button class="btn btn-fc-mastered" id="btn-fc-custom-mastered" title="Phím Mũi tên phải (→)">✓ Đã thuộc (→)</button>
          <button class="btn btn-secondary btn-sm" id="fc-custom-shuffle" style="margin-left:8px;">🔀 Xáo trộn</button>
        </div>

        <div style="margin-top:16px; font-size:0.86rem; color:var(--text-muted); text-align:center;">
          💡 Dùng chuột kéo thẻ sang trái/phải, hoặc dùng phím: <strong>←</strong> (Chưa thuộc), <strong>→</strong> (Đã thuộc), <strong>Enter/Space</strong> (Lật thẻ).
        </div>
      </div>
    `;

    const cardBox = document.getElementById('flashcard-custom-box');
    const stampMastered = document.getElementById('fc-custom-stamp-mastered');
    const stampReview = document.getElementById('fc-custom-stamp-review');

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

    const sceneEl = document.getElementById('fc-custom-scene');
    sceneEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    sceneEl.addEventListener('touchstart', onPointerDown, { passive: true });
    sceneEl.addEventListener('touchmove', onPointerMove, { passive: true });
    sceneEl.addEventListener('touchend', onPointerUp, { passive: true });

    // Buttons
    document.getElementById('btn-fc-custom-review').addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSwipeAnimation('left');
    });

    document.getElementById('btn-fc-custom-flip').addEventListener('click', (e) => {
      e.stopPropagation();
      flipCard();
    });

    document.getElementById('btn-fc-custom-mastered').addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSwipeAnimation('right');
    });

    document.getElementById('fc-custom-shuffle').addEventListener('click', (e) => {
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

    attachCardActions();
  }

  function initQuiz() {
    const words = getCustomWords();
    if (words.length < 4) return;
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
      content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Cần ít nhất 4 từ vựng trong sổ tay để tạo trắc nghiệm.</div>`;
      return;
    }

    if (quizIndex >= quizQuestions.length) {
      const percent = Math.round((quizScore / quizQuestions.length) * 100);
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.8rem; margin-bottom:12px;">🎉 Kết Quả Ôn Sổ Tay</h3>
          <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom: 24px;">Bạn đã trả lời đúng <strong>${quizScore}/${quizQuestions.length}</strong> câu (${percent}%)</p>
          <div style="font-size: 3.5rem; margin-bottom: 24px;">${percent >= 80 ? '🏆' : percent >= 50 ? '👍' : '💪'}</div>
          <button class="btn btn-primary" id="btn-restart-custom-quiz">Làm lại bài thi ↺</button>
        </div>
      `;
      document.getElementById('btn-restart-custom-quiz').addEventListener('click', () => {
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
            <button class="btn btn-primary" id="btn-next-custom-quiz">Câu tiếp theo →</button>
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

    document.getElementById('btn-next-custom-quiz')?.addEventListener('click', () => {
      quizIndex++;
      renderQuizView(content);
    });
  }

  function showToast(msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✨</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  render();
}
