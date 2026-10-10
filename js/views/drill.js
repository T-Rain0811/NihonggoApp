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

  function getAllQuestions() {
    if (!drillData) return [];
    if (drillData.parts && Array.isArray(drillData.parts)) {
      const qs = [];
      drillData.parts.forEach(p => {
        if (p.questions && Array.isArray(p.questions)) {
          qs.push(...p.questions);
        }
      });
      return qs;
    }
    return drillData.questions || [];
  }

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
        <button class="tab-pill ${drillType === 'vocabulary' ? 'active' : ''}" id="tab-drill-vocab">📚 Drill Từ Vựng (${(state.drillsVocabList || []).length} bài)</button>
        <button class="tab-pill ${drillType === 'grammar' ? 'active' : ''}" id="tab-drill-grammar">✍️ Drill Ngữ Pháp (${(state.drillsGrammarList || []).length} bài)</button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:18px;">
        ${drillList.map(item => `
          <div class="action-card drill-item-card" data-file="${item.filename}">
            <div>
              <div style="font-size:0.8rem; font-weight:800; color:var(--accent-amber); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">
                Bài ${item.lesson || ''}
              </div>
              <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-title); margin-bottom:8px;">
                ${item.title || item.filename}
              </h3>
              <div style="font-size:0.88rem; color:var(--text-secondary);">
                ⏱️ Thời gian: ${item.time_limit_minutes || 20} phút
              </div>
            </div>
            <div class="card-footer" style="margin-top:16px;">
              <span class="card-btn" style="color:var(--fuji-blue-lake); font-weight:700;">Bắt đầu làm bài →</span>
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const allQuestions = getAllQuestions();
    const totalQ = allQuestions.length;
    let correctCount = 0;

    if (isSubmitted) {
      allQuestions.forEach(q => {
        if (Number(userAnswers[q.id]) === Number(q.correct_answer)) {
          correctCount++;
        }
      });
    }

    const m = Math.floor(timeLeftSeconds / 60);
    const s = timeLeftSeconds % 60;
    const timeDisplay = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    // Check how many questions answered
    const answeredCount = Object.keys(userAnswers).length;

    const parts = (drillData.parts && Array.isArray(drillData.parts)) 
      ? drillData.parts 
      : [{ part_type: 'multiple_choice', instruction: '', questions: drillData.questions || [] }];

    container.innerHTML = `
      <div style="position:sticky; top:var(--nav-height); z-index:90; background:rgba(255, 255, 255, 0.88); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); padding: 14px 18px; margin-bottom: 24px; border-radius: var(--radius-lg); border:1px solid var(--glass-border); box-shadow: var(--shadow-glass);">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn btn-secondary btn-sm" id="btn-quit-drill">← Thoát đề thi</button>
            <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-title);">${drillData.title || 'Power Drill'} (Bài ${drillData.lesson || ''})</h3>
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Đã làm: ${answeredCount}/${totalQ}</span>
          </div>
          <div style="display:flex; align-items:center; gap:16px;">
            <div id="drill-timer" style="font-size:1.25rem; font-weight:800; color:var(--accent-amber); font-variant-numeric:tabular-nums;">
              ⏱️ ${timeDisplay}
            </div>
            ${!isSubmitted ? `
              <button class="btn btn-primary btn-sm" id="btn-submit-drill">Nộp bài thi</button>
            ` : `
              <div style="font-weight:800; font-size:1.1rem; color:var(--accent-emerald);">Đúng: ${correctCount}/${totalQ}</div>
            `}
          </div>
        </div>
      </div>

      ${isSubmitted ? `
        <div class="quiz-box" style="text-align:center; margin-bottom:28px;">
          <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:8px; color:var(--text-title);">Kết Quả Bài Làm</h2>
          <div style="font-size:3rem; font-weight:900; color:var(--fuji-blue-deep); margin: 12px 0;">
            ${correctCount} / ${totalQ} câu đúng
          </div>
          <p style="color:var(--text-secondary); font-size:1.1rem; margin-bottom:16px;">Tỷ lệ chính xác: <strong>${Math.round((correctCount / totalQ) * 100)}%</strong></p>
          <div style="display:flex; justify-content:center; gap:12px;">
            <button class="btn btn-secondary btn-sm" id="btn-redo-drill">Làm lại đề này ↺</button>
            <button class="btn btn-primary btn-sm" id="btn-back-drill-list">Chọn đề khác →</button>
          </div>
        </div>
      ` : ''}

      <div style="display:flex; flex-direction:column; gap:28px;">
        ${parts.map((part, partIdx) => `
          <div class="drill-part-card" style="background:var(--glass-bg); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:var(--radius-xl); padding:24px; box-shadow:var(--shadow-glass);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
              <span style="background:var(--toan-navy); color:#fff; font-size:0.8rem; font-weight:800; padding:4px 12px; border-radius:var(--radius-full);">
                PHẦN ${partIdx + 1}
              </span>
              <span style="font-size:0.95rem; font-weight:700; color:var(--text-primary);">${part.instruction || ''}</span>
            </div>

            ${part.passage ? `
              <div style="background:rgba(255, 255, 255, 0.7); border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:16px 20px; margin-bottom:20px; line-height:1.75; font-size:1rem; color:var(--text-primary); font-family:var(--font-japanese); white-space:pre-line;">
                ${part.passage}
              </div>
            ` : ''}

            <div style="display:flex; flex-direction:column; gap:20px;">
              ${(part.questions || []).map((q) => {
                const userAns = userAnswers[q.id];
                const isCorrect = isSubmitted && Number(userAns) === Number(q.correct_answer);
                return `
                  <div style="background:rgba(255, 255, 255, 0.65); border:1px solid ${isSubmitted ? (isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)') : 'var(--glass-border)'}; border-radius:var(--radius-lg); padding:20px; transition:all 0.2s ease;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:800; color:var(--fuji-blue-deep); font-size:0.95rem;">Câu ${q.id}</span>
                        ${q.blank_id ? `<span style="font-size:0.8rem; background:rgba(37, 99, 235, 0.1); color:var(--fuji-blue-deep); padding:2px 8px; border-radius:var(--radius-sm); font-weight:700;">Ô trống 【${q.blank_id}】</span>` : ''}
                        ${q.target_word ? `<span style="font-size:0.85rem; background:rgba(236, 72, 153, 0.1); color:var(--sakura-pink); padding:2px 10px; border-radius:var(--radius-sm); font-weight:800;">【 ${q.target_word} 】</span>` : ''}
                      </div>
                      ${isSubmitted ? (isCorrect ? '<span style="color:var(--accent-emerald); font-weight:800; font-size:0.9rem;">✓ Chính xác</span>' : '<span style="color:var(--accent-rose); font-weight:800; font-size:0.9rem;">✗ Sai</span>') : ''}
                    </div>

                    ${q.text ? `
                      <div style="font-size:1.15rem; font-weight:700; margin-bottom:16px; line-height:1.6; color:var(--text-title); font-family:var(--font-japanese);">
                        ${q.text.replace(/__([^_]+)__/g, '<span style="text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:4px; font-weight:800; color:var(--fuji-blue-deep);">$1</span>')}
                      </div>
                    ` : ''}

                    <div class="quiz-options">
                      ${(q.options || []).map((opt, optIdx) => {
                        const optKey = optIdx + 1;
                        let cls = '';
                        if (isSubmitted) {
                          if (optKey === Number(q.correct_answer)) cls = 'correct';
                          else if (optKey === Number(userAns)) cls = 'wrong';
                        } else if (Number(userAns) === optKey) {
                          cls = 'correct';
                        }
                        return `
                          <button class="quiz-opt-btn ${cls}" data-qid="${q.id}" data-opt="${optKey}" ${isSubmitted ? 'disabled' : ''}>
                            <span class="quiz-opt-key">${optKey}</span>
                            <span style="font-family:var(--font-japanese); font-size:1.05rem;">${opt}</span>
                          </button>
                        `;
                      }).join('')}
                    </div>

                    ${isSubmitted ? `
                      <div class="quiz-explanation" style="margin-top:16px; padding:16px; background:rgba(255, 255, 255, 0.85); border-left:4px solid var(--fuji-blue-primary); border-radius:var(--radius-sm);">
                        ${q.full_sentence ? `
                          <div style="margin-bottom:8px; font-weight:700; color:var(--fuji-blue-deep); font-family:var(--font-japanese);">
                            ★ Câu hoàn chỉnh: <span style="font-weight:600; color:var(--text-primary);">${q.full_sentence}</span>
                          </div>
                        ` : ''}
                        ${q.explanation_vi ? `
                          <div style="margin-bottom:6px; font-size:0.95rem; color:var(--text-primary);">
                            <strong>Giải thích (Việt):</strong> ${q.explanation_vi}
                          </div>
                        ` : ''}
                        ${q.explanation ? `
                          <div style="margin-bottom:6px; font-size:0.9rem; color:var(--text-secondary); font-family:var(--font-japanese);">
                            <strong>解説 (Nhật):</strong> ${q.explanation}
                          </div>
                        ` : ''}
                        ${q.sentence_vi ? `
                          <div style="font-size:0.9rem; color:var(--text-muted); font-style:italic;">
                            <strong>Dịch nghĩa:</strong> "${q.sentence_vi}"
                          </div>
                        ` : ''}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
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

    if (document.getElementById('btn-back-drill-list')) {
      document.getElementById('btn-back-drill-list').addEventListener('click', () => {
        clearInterval(timerInterval);
        drillData = null;
        render();
      });
    }

    container.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.getAttribute('data-qid');
        const opt = btn.getAttribute('data-opt');
        userAnswers[qid] = opt;
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
