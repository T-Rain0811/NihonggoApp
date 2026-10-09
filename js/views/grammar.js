// Grammar View Component with Vocabulary Tab
import { SpeechHelper } from '../speech.js';

export function renderGrammar(container, state, navigate) {
  let currentSession = state.selectedGrammarSession || '1';
  let currentTab = 'list'; // 'list', 'vocab', or 'quiz'
  let quizIndex = 0;
  let quizScore = 0;
  let quizList = [];

  const labels = (state.meta && state.meta.lesson_labels) || {
    "1": "Bài 1 (1–20)", "2": "Bài 2 (21–40)", "3": "Bài 3 (41–60)", "4": "Bài 4 (61–80)",
    "5": "Bài 5 (81–89)", "6": "Bài 6 (90–111)", "7": "Bài 7 (112–130)", "8": "Bài 8 (131–150)"
  };

  const videoUrls = (state.meta && state.meta.video_urls) || {};

  function getGrammarItems() {
    if (!state.grammarData) return [];
    return state.grammarData[currentSession] || [];
  }

  function getSessionVocab() {
    if (!state.vocabData) return [];
    return state.vocabData[currentSession] || [];
  }

  function render() {
    const items = getGrammarItems();
    const vocabItems = getSessionVocab();
    const sessionKeys = state.grammarData ? Object.keys(state.grammarData).sort((a,b) => parseInt(a) - parseInt(b)) : [];
    const videoUrl = videoUrls[currentSession];

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-title);">Học Ngữ Pháp N2</h2>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:0.88rem; color:var(--text-title); font-weight:700;">Chọn bài:</label>
          <select id="select-session" class="form-input" style="padding: 7px 14px; width:auto; font-weight:700;">
            ${sessionKeys.map(k => `<option value="${k}" ${k === currentSession ? 'selected' : ''}>${labels[k] || 'Bài ' + k}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Mode Tabs (Including Vocabulary Tab for this Lesson) -->
      <div class="tab-row">
        <button class="tab-pill ${currentTab === 'list' ? 'active' : ''}" id="tab-list">📖 Mẫu Ngữ Pháp (${items.length})</button>
        <button class="tab-pill ${currentTab === 'vocab' ? 'active' : ''}" id="tab-vocab">📚 Từ Vựng Bài Này (${vocabItems.length})</button>
        <button class="tab-pill ${currentTab === 'quiz' ? 'active' : ''}" id="tab-quiz">🎯 Trắc Nghiệm Ngữ Pháp</button>
        ${videoUrl ? `<a href="${videoUrl}" target="_blank" class="tab-pill" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; color:var(--sakura-pink); font-weight:700;">🎬 Xem Video Giảng Dạy</a>` : ''}
      </div>

      <div id="grammar-tab-content"></div>
    `;

    document.getElementById('btn-back-home').addEventListener('click', () => navigate('home'));
    document.getElementById('select-session').addEventListener('change', (e) => {
      currentSession = e.target.value;
      state.selectedGrammarSession = currentSession;
      render();
    });

    document.getElementById('tab-list').addEventListener('click', () => { currentTab = 'list'; renderContent(); });
    document.getElementById('tab-vocab').addEventListener('click', () => { currentTab = 'vocab'; renderContent(); });
    document.getElementById('tab-quiz').addEventListener('click', () => { currentTab = 'quiz'; initQuiz(); renderContent(); });

    renderContent();
  }

  function renderContent() {
    const content = document.getElementById('grammar-tab-content');
    if (!content) return;

    document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
    if (currentTab === 'list') document.getElementById('tab-list')?.classList.add('active');
    if (currentTab === 'vocab') document.getElementById('tab-vocab')?.classList.add('active');
    if (currentTab === 'quiz') document.getElementById('tab-quiz')?.classList.add('active');

    const items = getGrammarItems();
    const vocabItems = getSessionVocab();

    if (currentTab === 'list') {
      renderListView(content, items);
    } else if (currentTab === 'vocab') {
      renderVocabView(content, vocabItems);
    } else {
      renderQuizView(content);
    }
  }

  function renderListView(content, items) {
    if (!items || items.length === 0) {
      content.innerHTML = `<div class="grammar-card" style="text-align:center; padding: 40px; color: var(--text-muted);">Không có dữ liệu ngữ pháp cho bài này.</div>`;
      return;
    }

    content.innerHTML = `
      <div class="search-bar-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" id="grammar-search" class="search-input" placeholder="Tìm kiếm mẫu câu, ý nghĩa hoặc ví dụ...">
      </div>
      <div style="display:flex; flex-direction:column; gap: 18px;" id="grammar-items-list">
        ${renderGrammarCards(items)}
      </div>
    `;

    document.getElementById('grammar-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = items.filter(it => 
        (it.pattern && it.pattern.toLowerCase().includes(q)) ||
        (it.meaning && it.meaning.toLowerCase().includes(q)) ||
        (it.full_meaning && it.full_meaning.toLowerCase().includes(q)) ||
        (it.examples && it.examples.some(ex => (ex.jp && ex.jp.toLowerCase().includes(q)) || (ex.vi && ex.vi.toLowerCase().includes(q))))
      );
      document.getElementById('grammar-items-list').innerHTML = renderGrammarCards(filtered);
    });
  }

  function renderGrammarCards(items) {
    if (!items || items.length === 0) {
      return `<div class="grammar-card" style="text-align:center; padding: 40px; color: var(--text-muted);">Không tìm thấy mẫu ngữ pháp nào.</div>`;
    }
    return items.map((item, idx) => `
      <div class="grammar-card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; flex-wrap:wrap; gap:8px;">
          <h3 style="font-size:1.45rem; font-weight:800; color:var(--fuji-blue-deep); letter-spacing:0.3px;">
            <span style="font-size:0.9rem; color:var(--text-muted); font-weight:500; margin-right:8px;">#${idx + 1}</span>
            <span class="grammar-pattern">${item.pattern || ''}</span>
          </h3>
        </div>

        <div style="font-size:1.1rem; font-weight:700; color:var(--text-title); margin-bottom: 14px; line-height:1.5;">
          💡 ${item.meaning || ''}
        </div>

        ${item.full_meaning ? `
          <div style="background: rgba(37, 99, 235, 0.08); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 16px; font-size: 0.94rem; color: var(--text-primary); white-space: pre-line; border-left: 3px solid var(--fuji-blue-primary);">
            ${item.full_meaning}
          </div>
        ` : ''}

        ${item.examples && item.examples.length > 0 ? `
          <div style="border-top: 1px solid rgba(15, 39, 68, 0.12); padding-top: 14px;">
            <div style="font-size: 0.88rem; font-weight:800; color: var(--fuji-blue-deep); margin-bottom: 10px; text-transform:uppercase; letter-spacing:0.5px;">Ví dụ minh họa:</div>
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${item.examples.map(ex => `
                <div style="background: rgba(255, 255, 255, 0.82); padding: 12px 16px; border-radius: var(--radius-sm); border-left: 3px solid var(--fuji-blue-lake); box-shadow: 0 2px 6px rgba(10,36,68,0.04);">
                  <div style="font-size:1.05rem; font-weight:700; color:var(--text-title); margin-bottom:4px; font-family:var(--font-japanese);">${ex.jp || ''}</div>
                  <div style="font-size:0.92rem; color:var(--text-secondary);">${ex.vi || ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  function renderVocabView(content, words) {
    if (!words || words.length === 0) {
      content.innerHTML = `<div class="grammar-card" style="text-align:center; padding: 40px; color: var(--text-muted);">Bài này chưa có dữ liệu từ vựng.</div>`;
      return;
    }

    content.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
        <div style="font-size:1.1rem; font-weight:700; color:var(--text-title);">
          Danh sách ${words.length} từ vựng thuộc ${labels[currentSession] || 'Bài ' + currentSession}
        </div>
        <button class="btn btn-primary btn-sm" id="btn-goto-vocab-flashcard">🎴 Ôn Flashcard Bài Này →</button>
      </div>

      <div class="search-bar-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" id="session-vocab-search" class="search-input" placeholder="Tìm kiếm từ vựng trong bài này...">
      </div>

      <div class="word-list" id="session-words-grid">
        ${renderWordCards(words)}
      </div>
    `;

    document.getElementById('btn-goto-vocab-flashcard')?.addEventListener('click', () => {
      state.selectedVocabLesson = currentSession;
      state.vocabTab = 'flashcard';
      navigate('vocab');
    });

    document.getElementById('session-vocab-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = words.filter(w => 
        (w.word && w.word.toLowerCase().includes(q)) ||
        (w.reading && w.reading.toLowerCase().includes(q)) ||
        (w.meaning && w.meaning.toLowerCase().includes(q)) ||
        (w.kanji_meaning && w.kanji_meaning.toLowerCase().includes(q))
      );
      document.getElementById('session-words-grid').innerHTML = renderWordCards(filtered);
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
    container.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });
  }

  function initQuiz() {
    const items = getGrammarItems();
    const allQuizzes = [];
    items.forEach(it => {
      if (it.quizzes && Array.isArray(it.quizzes)) {
        it.quizzes.forEach(q => allQuizzes.push(q));
      }
    });

    if (allQuizzes.length === 0) {
      quizList = [];
      return;
    }

    quizIndex = 0;
    quizScore = 0;
    quizList = [...allQuizzes].sort(() => Math.random() - 0.5).slice(0, 15).map(q => ({
      ...q,
      userAnswer: null
    }));
  }

  function renderQuizView(content) {
    if (!quizList || quizList.length === 0) {
      content.innerHTML = `<div class="quiz-box" style="text-align:center; padding: 40px; color: var(--text-muted);">Bài này chưa có câu hỏi trắc nghiệm.</div>`;
      return;
    }

    if (quizIndex >= quizList.length) {
      const percent = Math.round((quizScore / quizList.length) * 100);
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.8rem; margin-bottom:12px; color:var(--text-title);">🎉 Kết Quả Trắc Nghiệm Ngữ Pháp</h3>
          <p style="font-size:1.1rem; color:var(--text-secondary); margin-bottom: 24px;">Bạn đã trả lời đúng <strong>${quizScore}/${quizList.length}</strong> câu (${percent}%)</p>
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

    const currentQ = quizList[quizIndex];
    const optionsObj = currentQ.options || {};
    const optionKeys = Object.keys(optionsObj);

    content.innerHTML = `
      <div class="quiz-box">
        <div style="display:flex; justify-content:space-between; margin-bottom: 16px; font-weight:700; color:var(--text-muted); font-size:0.9rem;">
          <span>Câu hỏi ${quizIndex + 1} / ${quizList.length} (Mẫu: ${currentQ.pattern || ''})</span>
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
