// Power Drill Practice View Component (Vocab & Grammar Drills)
export function renderDrill(container, state, navigate) {
  let drillType = state.drillType || 'vocabulary'; // 'vocabulary' or 'grammar'
  let currentDrillFile = null;
  let drillData = null;
  let userAnswers = {};
  let timerInterval = null;
  let timeLeftSeconds = 20 * 60;
  let isSubmitted = false;

  const drillList = drillType === 'vocabulary' 
    ? (state.drillsVocabList || []) 
    : (state.drillsGrammarList || []);

  function render() {
    if (drillData) {
      renderDrillTest();
      return;
    }

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:700;">Luyện Power Drill N2</h2>
        </div>
      </div>

      <!-- Type switch tabs -->
      <div class="tab-row">
        <button class="tab-pill ${drillType === 'vocabulary' ? 'active' : ''}" id="tab-drill-vocab">📚 Drill Từ Vựng (30 bài)</button>
        <button class="tab-pill ${drillType === 'grammar' ? 'active' : ''}" id="tab-drill-grammar">✍️ Drill Ngữ Pháp (30 bài)</button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:16px;">
        ${drillList.map(item => `
          <div class="action-card drill-item-card" data-file="${item.filename}">
            <div>
              <div style="font-size:0.8rem; font-weight:700; color:var(--accent-amber); margin-bottom:6px; text-transform:uppercase;">
                Bài ${item.lesson || ''}
              </div>
              <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
                ${item.title || item.filename}
              </h3>
              <div style="font-size:0.85rem; color:var(--text-muted);">
                ⏱️ Thời gian: ${item.time_limit_minutes || 20} phút
              </div>
            </div>
            <div class="card-footer" style="margin-top:16px;">
              <span class="card-btn" style="color:var(--accent-amber);">Bắt đầu làm bài →</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('btn-back-home').addEventListener('click', () => navigate('home'));
    
    document.getElementById('tab-drill-vocab').addEventListener('click', () => {
      drillType = 'vocabulary';
      state.drillType = 'vocabulary';
      render();
    });

    document.getElementById('tab-drill-grammar').addEventListener('click', () => {
      drillType = 'grammar';
      state.drillType = 'grammar';
      render();
    });

    container.querySelectorAll('.drill-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const file = card.getAttribute('data-file');
        loadDrill(file);
      });
    });
  }

  async function loadDrill(filename) {
    const subDir = drillType === 'vocabulary' ? 'drillsVocab' : 'drillsGrammar';
    try {
      const res = await fetch(`data/${subDir}/${filename}`);
      drillData = await res.json();
      currentDrillFile = filename;
      userAnswers = {};
      isSubmitted = false;
      timeLeftSeconds = (drillData.time_limit_minutes || 20) * 60;
      startTimer();
      renderDrillTest();
    } catch (e) {
      alert('Không thể tải file bài thi: ' + e.message);
    }
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (timeLeftSeconds > 0) {
        timeLeftSeconds--;
        const timerEl = document.getElementById('drill-timer');
        if (timerEl) {
          const m = Math.floor(timeLeftSeconds / 60);
          const s = timeLeftSeconds % 60;
          timerEl.textContent = `⏱️ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          if (timeLeftSeconds < 180) {
            timerEl.style.color = 'var(--accent-rose)';
          }
        }
      } else {
        clearInterval(timerInterval);
        submitTest();
      }
    }, 1000);
  }

  function renderDrillTest() {
    const questions = drillData.questions || [];
    const totalQ = questions.length;
    let correctCount = 0;

    if (isSubmitted) {
      questions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correct_answer) {
          correctCount++;
        }
      });
    }

    const m = Math.floor(timeLeftSeconds / 60);
    const s = timeLeftSeconds % 60;
    const timeDisplay = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    container.innerHTML = `
      <div style="position:sticky; top:var(--nav-height); z-index:90; background:var(--bg-glass); backdrop-filter:blur(16px); padding: 14px 0; margin-bottom: 20px; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="btn btn-secondary btn-sm" id="btn-quit-drill">← Thoát đề thi</button>
            <h3 style="font-size:1.2rem; font-weight:700;">${drillData.title || 'Power Drill'}</h3>
          </div>
          <div style="display:flex; align-items:center; gap:16px;">
            <div id="drill-timer" style="font-size:1.15rem; font-weight:800; color:var(--accent-amber); font-variant-numeric:tabular-nums;">
              ⏱️ ${timeDisplay}
            </div>
            ${!isSubmitted ? `
              <button class="btn btn-primary btn-sm" id="btn-submit-drill">Nộp bài thi</button>
            ` : `
              <div style="font-weight:700; color:var(--accent-emerald);">Đúng: ${correctCount}/${totalQ}</div>
            `}
          </div>
        </div>
      </div>

      ${isSubmitted ? `
        <div class="quiz-box" style="text-align:center; margin-bottom:28px;">
          <h2 style="font-size:1.8rem; margin-bottom:8px;">Kết Quả Bài Làm</h2>
          <div style="font-size:2.8rem; font-weight:800; color:var(--accent-primary); margin: 12px 0;">
            ${correctCount} / ${totalQ} câu đúng
          </div>
          <p style="color:var(--text-secondary); margin-bottom:16px;">Tỷ lệ chính xác: ${Math.round((correctCount / totalQ) * 100)}%</p>
          <button class="btn btn-secondary btn-sm" id="btn-redo-drill">Làm lại đề này ↺</button>
        </div>
      ` : ''}

      <div style="display:flex; flex-direction:column; gap:20px;">
        ${questions.map((q, idx) => {
          const userAns = userAnswers[idx];
          const isCorrect = userAns === q.correct_answer;
          return `
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:20px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:700; color:var(--text-muted); font-size:0.85rem;">
                <span>Câu ${idx + 1}</span>
                ${isSubmitted ? (isCorrect ? '<span style="color:var(--accent-emerald);">✓ Chính xác</span>' : '<span style="color:var(--accent-rose);">✗ Sai</span>') : ''}
              </div>
              <div style="font-size:1.1rem; font-weight:600; margin-bottom:16px; line-height:1.6;">
                ${q.question}
              </div>
              <div class="quiz-options">
                ${(q.options || []).map((opt, optIdx) => {
                  const key = String(optIdx + 1);
                  let cls = '';
                  if (isSubmitted) {
                    if (key === String(q.correct_answer)) cls = 'correct';
                    else if (key === String(userAns)) cls = 'wrong';
                  } else if (userAns === key) {
                    cls = 'correct';
                  }
                  return `
                    <button class="quiz-opt-btn ${cls}" data-q="${idx}" data-key="${key}" ${isSubmitted ? 'disabled' : ''}>
                      <span class="quiz-opt-key">${key}</span>
                      <span>${opt}</span>
                    </button>
                  `;
                }).join('')}
              </div>
              ${isSubmitted && q.explanation ? `
                <div class="quiz-explanation">
                  <strong>Giải thích:</strong> ${q.explanation}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.getElementById('btn-quit-drill').addEventListener('click', () => {
      clearInterval(timerInterval);
      drillData = null;
      render();
    });

    if (document.getElementById('btn-submit-drill')) {
      document.getElementById('btn-submit-drill').addEventListener('click', submitTest);
    }

    if (document.getElementById('btn-redo-drill')) {
      document.getElementById('btn-redo-drill').addEventListener('click', () => {
        loadDrill(currentDrillFile);
      });
    }

    container.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = btn.getAttribute('data-q');
        const key = btn.getAttribute('data-key');
        userAnswers[qIdx] = key;
        renderDrillTest();
      });
    });
  }

  function submitTest() {
    clearInterval(timerInterval);
    isSubmitted = true;
    renderDrillTest();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  render();
}
