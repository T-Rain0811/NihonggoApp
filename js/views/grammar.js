// Grammar View Component
export function renderGrammar(container, state, navigate) {
  let currentSession = state.selectedGrammarSession || '1';
  let currentTab = 'list'; // 'list' or 'quiz'
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

  function render() {
    const items = getGrammarItems();
    const sessionKeys = state.grammarData ? Object.keys(state.grammarData).sort((a,b) => parseInt(a) - parseInt(b)) : [];
    const videoUrl = videoUrls[currentSession];

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:700;">Học Ngữ Pháp N2</h2>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Chọn bài:</label>
          <select id="select-session" class="form-input" style="padding: 6px 12px; width:auto; font-weight:600;">
            ${sessionKeys.map(k => `<option value="${k}" ${k === currentSession ? 'selected' : ''}>${labels[k] || 'Bài ' + k}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Mode Tabs -->
      <div class="tab-row">
        <button class="tab-pill ${currentTab === 'list' ? 'active' : ''}" id="tab-list">📖 Mẫu Ngữ Pháp (${items.length})</button>
        <button class="tab-pill ${currentTab === 'quiz' ? 'active' : ''}" id="tab-quiz">🎯 Trắc Nghiệm Ngữ Pháp</button>
        ${videoUrl ? `<a href="${videoUrl}" target="_blank" class="tab-pill" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; color:var(--accent-rose);">🎬 Xem Video Giảng Dạy</a>` : ''}
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
    document.getElementById('tab-quiz').addEventListener('click', () => { currentTab = 'quiz'; initQuiz(); renderContent(); });

    renderContent();
  }

  function renderContent() {
    const content = document.getElementById('grammar-tab-content');
    if (!content) return;

    document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
    if (currentTab === 'list') document.getElementById('tab-list')?.classList.add('active');
    if (currentTab === 'quiz') document.getElementById('tab-quiz')?.classList.add('active');

    const items = getGrammarItems();

    if (currentTab === 'list') {
      renderListView(content, items);
    } else {
      renderQuizView(content);
    }
  }

  function renderListView(content, items) {
    if (!items || items.length === 0) {
      content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Không có dữ liệu ngữ pháp cho bài này.</div>`;
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
      return `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Không tìm thấy mẫu ngữ pháp nào.</div>`;
    }
    return items.map((item, idx) => `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 22px; transition: var(--transition-fast);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; flex-wrap:wrap; gap:8px;">
          <h3 style="font-size:1.4rem; font-weight:800; color:var(--accent-primary); letter-spacing:0.3px;">
            <span style="font-size:0.9rem; color:var(--text-muted); font-weight:500; margin-right:8px;">#${idx + 1}</span>
            ${item.pattern || ''}
          </h3>
        </div>

        <div style="font-size:1.05rem; font-weight:600; color:var(--text-primary); margin-bottom: 14px; line-height:1.5;">
          💡 ${item.meaning || ''}
        </div>

        ${item.full_meaning ? `
          <div style="background: rgba(99, 102, 241, 0.06); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 16px; font-size: 0.9rem; color: var(--text-secondary); white-space: pre-line;">
            ${item.full_meaning}
          </div>
        ` : ''}

        ${item.examples && item.examples.length > 0 ? `
          <div style="border-top: 1px solid var(--border-color); padding-top: 14px;">
            <div style="font-size: 0.85rem; font-weight:700; color: var(--accent-cyan); margin-bottom: 10px; text-transform:uppercase; letter-spacing:0.5px;">Ví dụ minh họa:</div>
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${item.examples.map(ex => `
                <div style="background: rgba(255, 255, 255, 0.02); padding: 10px 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--border-highlight);">
                  <div style="font-size:1rem; font-weight:600; color:var(--text-primary); margin-bottom:4px;">${ex.jp || ''}</div>
                  <div style="font-size:0.9rem; color:var(--text-secondary);">${ex.vi || ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');
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
      content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Bài này chưa có câu hỏi trắc nghiệm.</div>`;
      return;
    }

    if (quizIndex >= quizList.length) {
      const percent = Math.round((quizScore / quizList.length) * 100);
      content.innerHTML = `
        <div class="quiz-box" style="text-align:center;">
          <h3 style="font-size:1.8rem; margin-bottom:12px;">🎉 Kết Quả Trắc Nghiệm Ngữ Pháp</h3>
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
        <div style="display:flex; justify-content:space-between; margin-bottom: 16px; font-weight:600; color:var(--text-muted); font-size:0.9rem;">
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
            <div style="font-weight:700; margin-bottom:4px; color:var(--text-primary);">Dịch nghĩa: ${currentQ.translation || ''}</div>
            ${currentQ.hiragana ? `<div style="font-size:0.9rem; color:var(--text-muted);">${currentQ.hiragana}</div>` : ''}
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
