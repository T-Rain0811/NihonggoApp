// Power Drill Practice View Component (Vocab & Grammar Drills)
export function renderDrill(container, state, navigate) {
  let drillType = state.drillType || 'vocabulary'; // 'vocabulary' or 'grammar'
  let currentDrillFile = null;
  let drillData = null;
  let userAnswers = {};
  let timerInterval = null;
  let timeLeftSeconds = 20 * 60;
  let isSubmitted = false;
  let showResultModal = false;
  let lastSubmitStats = null;
  let currentWrongJumpIndex = 0;

  const drillList = drillType === 'vocabulary'
    ? (state.drillsVocabList || [])
    : (state.drillsGrammarList || []);

  function getDrillHistory() {
    try {
      return JSON.parse(localStorage.getItem('jlpt_drill_results') || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveDrillHistory(key, result) {
    try {
      const hist = getDrillHistory();
      hist[key] = result;
      localStorage.setItem('jlpt_drill_results', JSON.stringify(hist));
    } catch (e) { }
  }

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

    const drillHistory = getDrillHistory();

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-title);">Luyện Power Drill</h2>
        </div>
      </div>

      <!-- Type switch tabs -->
      <div class="tab-row">
        <button class="tab-pill ${drillType === 'vocabulary' ? 'active' : ''}" id="tab-drill-vocab">📚 Drill Từ Vựng (${(state.drillsVocabList || []).length} bài)</button>
        <button class="tab-pill ${drillType === 'grammar' ? 'active' : ''}" id="tab-drill-grammar">✍️ Drill Ngữ Pháp (${(state.drillsGrammarList || []).length} bài)</button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:18px;">
        ${drillList.map(item => {
      const drillKey = `${drillType}_${item.filename}`;
      const hist = drillHistory[drillKey];
      let cardStatusClass = '';
      let badgeHtml = '';

      if (hist) {
        if (hist.percent === 100) {
          cardStatusClass = 'drill-status-full';
          badgeHtml = `<span style="font-size:0.75rem; font-weight:800; background:rgba(16,185,129,0.18); color:#047857; padding:2px 8px; border-radius:12px;">✓ Đạt 100% (${hist.score}/${hist.total})</span>`;
        } else {
          cardStatusClass = 'drill-status-partial';
          badgeHtml = `<span style="font-size:0.75rem; font-weight:800; background:rgba(245,158,11,0.18); color:#b45309; padding:2px 8px; border-radius:12px;">⚠️ Đã làm (${hist.score}/${hist.total} - ${hist.percent}%)</span>`;
        }
      }

      return `
            <div class="action-card drill-item-card ${cardStatusClass}" data-file="${item.filename}">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:0.8rem; font-weight:800; color:${hist ? (hist.percent === 100 ? '#15803d' : '#b45309') : 'var(--accent-amber)'}; text-transform:uppercase; letter-spacing:0.5px;">
                    Bài ${item.lesson || ''}
                  </span>
                  ${badgeHtml}
                </div>
                <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-title); margin-bottom:8px;">
                  ${item.title || item.filename}
                </h3>
                <div style="font-size:0.88rem; color:var(--text-secondary);">
                  ⏱️ Thời gian: ${item.time_limit_minutes || 20} phút
                  ${hist && hist.timeSpentText ? `<div style="margin-top:3px; font-size:0.82rem; font-weight:600; color:var(--text-muted);">Lần trước: ${hist.timeSpentText}</div>` : ''}
                </div>
              </div>
              <div class="card-footer" style="margin-top:16px;">
                <span class="card-btn" style="color:var(--fuji-blue-lake); font-weight:700;">${hist ? 'Làm lại bài thi →' : 'Bắt đầu làm bài →'}</span>
              </div>
            </div>
          `;
    }).join('')}
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
      showResultModal = false;
      lastSubmitStats = null;
      currentWrongJumpIndex = 0;
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
        timerInterval = null;
        if (drillData && !isSubmitted) {
          submitTest();
        }
      }
    }, 1000);
  }

  function renderDrillTest() {
    const allQuestions = getAllQuestions();
    const totalQ = allQuestions.length;
    let correctCount = 0;
    const wrongQuestionIds = [];

    if (isSubmitted) {
      allQuestions.forEach(q => {
        if (Number(userAnswers[q.id]) === Number(q.correct_answer)) {
          correctCount++;
        } else {
          wrongQuestionIds.push(q.id);
        }
      });
    }

    const wrongCount = totalQ - correctCount;
    const m = Math.floor(timeLeftSeconds / 60);
    const s = timeLeftSeconds % 60;
    const timeDisplay = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const answeredCount = Object.keys(userAnswers).length;

    const parts = (drillData.parts && Array.isArray(drillData.parts))
      ? drillData.parts
      : [{ part_type: 'multiple_choice', instruction: '', questions: drillData.questions || [] }];

    container.innerHTML = `
      <!-- Sticky Navigation Bar -->
      <div style="position:sticky; top:var(--nav-height); z-index:90; background:rgba(255, 255, 255, 0.92); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); padding: 14px 18px; margin-bottom: 20px; border-radius: var(--radius-lg); border:1px solid var(--glass-border); box-shadow: var(--shadow-glass);">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn btn-secondary btn-sm" id="btn-quit-drill">← Thoát đề thi</button>
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-title);">${drillData.title || 'Power Drill'}</h3>
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Đã làm: ${answeredCount}/${totalQ}</span>
          </div>
          <div style="display:flex; align-items:center; gap:16px;">
            ${!isSubmitted ? `
              <div id="drill-timer" style="font-size:1.25rem; font-weight:800; color:var(--accent-amber); font-variant-numeric:tabular-nums;">
                ⏱️ ${timeDisplay}
              </div>
              <button class="btn btn-primary btn-sm" id="btn-submit-drill">Nộp bài thi</button>
            ` : `
              <div style="font-weight:800; font-size:1.1rem; color:${correctCount === totalQ ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
                Kết quả: ${correctCount}/${totalQ} đúng
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Review Summary Bar -->
      ${isSubmitted ? `
        <div class="quiz-box" style="text-align:center; margin-bottom:20px; padding: 24px;">
          <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:6px; color:var(--text-title);">Kết Quả Bài Làm</h2>
          <div style="font-size:2.6rem; font-weight:900; color:var(--fuji-blue-deep); margin: 6px 0;">
            ${correctCount} / ${totalQ} câu đúng
          </div>
          <p style="color:var(--text-secondary); font-size:1rem; margin-bottom:14px;">
            Thời gian: <strong>${lastSubmitStats ? lastSubmitStats.timeSpentText : ''}</strong> | Tỷ lệ chính xác: <strong>${Math.round((correctCount / totalQ) * 100)}%</strong>
          </p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-redo-drill">Làm lại đề này ↺</button>
            <button class="btn btn-primary btn-sm" id="btn-back-drill-list">Chọn đề khác →</button>
          </div>
        </div>

        ${wrongCount > 0 ? `
          <!-- Sticky Jump to Wrong Question Helper Bar -->
          <div style="background: #fff5f5; border: 1.5px solid #fca5a5; border-radius: var(--radius-md); padding: 12px 18px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">⚠️</span>
              <span style="font-weight: 700; color: #b91c1c; font-size: 0.95rem;">
                Bài thi có <strong>${wrongCount}</strong> câu trả lời sai (được tô nền đỏ nhạt)
              </span>
            </div>
            <button class="btn btn-sm" id="btn-jump-next-wrong" style="background: #ef4444; color: #fff; font-weight: 800; border-radius: var(--radius-full); padding: 7px 16px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(239,68,68,0.25); border: none; cursor: pointer;">
              <span>👉 Nhảy tới câu sai tiếp theo</span>
              <span id="wrong-jump-indicator" style="background: rgba(0,0,0,0.2); padding: 1px 8px; border-radius: 10px; font-size: 0.8rem;">1/${wrongCount}</span>
            </button>
          </div>
        ` : ''}
      ` : ''}

      <!-- Questions List -->
      <div style="display:flex; flex-direction:column; gap:28px;">
        ${parts.map((part, partIdx) => `
          <div class="drill-part-card" style="background:var(--glass-bg); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:var(--radius-xl); padding:24px; box-shadow:var(--shadow-glass);">
            <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:14px;">
              <span style="background:var(--toan-navy); color:#fff; font-size:0.82rem; font-weight:800; padding:5px 14px; border-radius:var(--radius-full); white-space:nowrap; flex-shrink:0; letter-spacing:0.4px; line-height:1.3; box-shadow:0 2px 6px rgba(20,43,73,0.18);">
                PHẦN ${partIdx + 1}
              </span>
              <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary); line-height:1.5; flex:1; min-width:0; padding-top:2px;">
                ${part.instruction || ''}
              </div>
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
                  <div class="drill-question-card ${isSubmitted ? (isCorrect ? 'is-correct' : 'is-wrong') : ''}" id="drill-q-${q.id}" style="border-radius:var(--radius-lg); padding:20px; transition:all 0.25s ease; ${!isSubmitted ? 'background:rgba(255, 255, 255, 0.65); border:1px solid var(--glass-border);' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:800; color:var(--fuji-blue-deep); font-size:0.95rem;">Câu ${q.id}</span>
                        ${q.blank_id ? `<span style="font-size:0.8rem; background:rgba(37, 99, 235, 0.1); color:var(--fuji-blue-deep); padding:2px 8px; border-radius:var(--radius-sm); font-weight:700;">Ô trống 【${q.blank_id}】</span>` : ''}
                        ${q.target_word ? `<span style="font-size:0.85rem; background:rgba(236, 72, 153, 0.1); color:var(--sakura-pink); padding:2px 10px; border-radius:var(--radius-sm); font-weight:800;">【 ${q.target_word} 】</span>` : ''}
                      </div>
                      ${isSubmitted ? (isCorrect ? '<span style="color:var(--accent-emerald); font-weight:800; font-size:0.9rem;">✓ Chính xác</span>' : '<span style="color:var(--accent-rose); font-weight:800; font-size:0.9rem;">✗ Trả lời sai</span>') : ''}
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

      <!-- Celebratory Completion Modal -->
      ${(isSubmitted && showResultModal && lastSubmitStats) ? `
        <div id="drill-result-modal" class="modal-overlay open">
          <div class="modal-box" style="text-align:center; max-width: 520px; padding: 32px 24px;">
            <div style="font-size: 3.5rem; margin-bottom: 8px;">🎉</div>
            <h2 style="font-size: 1.65rem; font-weight: 800; color: var(--text-title); margin-bottom: 8px;">
              Chúc Mừng Đã Hoàn Thành!
            </h2>
            <div style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 20px;">
              Bạn đã nộp bài thành công: <strong>${drillData.title || 'Power Drill'} (Bài ${drillData.lesson || ''})</strong>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
              <div style="background: rgba(37,99,235,0.06); padding: 14px; border-radius: var(--radius-md); border: 1px solid rgba(37,99,235,0.12);">
                <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">⏱️ Thời gian làm bài</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--toan-navy); margin-top: 4px;">${lastSubmitStats.timeSpentText}</div>
              </div>
              <div style="background: ${lastSubmitStats.percent === 100 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'}; padding: 14px; border-radius: var(--radius-md); border: 1px solid ${lastSubmitStats.percent === 100 ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'};">
                <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">🎯 Điểm chính xác</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: ${lastSubmitStats.percent === 100 ? '#047857' : '#b45309'}; margin-top: 4px;">${lastSubmitStats.percent}% (${lastSubmitStats.correctCount}/${lastSubmitStats.totalQ})</div>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.85); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 12px; margin-bottom: 24px; font-size: 0.95rem; font-weight: 700; display: flex; justify-content: space-around;">
              <span style="color: var(--accent-emerald);">✅ Đúng: <strong>${lastSubmitStats.correctCount}</strong> câu</span>
              <span style="color: var(--accent-rose);">❌ Sai: <strong>${lastSubmitStats.wrongCount}</strong> câu</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-primary" id="btn-modal-review" style="width: 100%; font-weight: 800; padding: 12px;">
                🔍 Xem lại bài vừa làm
              </button>
              <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary" id="btn-modal-redo" style="flex: 1;">
                  ↺ Làm lại đề này
                </button>
                <button class="btn btn-secondary" id="btn-modal-choose-other" style="flex: 1;">
                  📋 Chọn đề khác
                </button>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    document.getElementById('btn-quit-drill')?.addEventListener('click', () => {
      if (!isSubmitted) {
        showQuitConfirmationModal(() => {
          clearInterval(timerInterval);
          timerInterval = null;
          drillData = null;
          isSubmitted = false;
          userAnswers = {};
          currentDrillFile = null;
          render();
          window.scrollTo(0, 0);
        });
      } else {
        clearInterval(timerInterval);
        timerInterval = null;
        drillData = null;
        render();
        window.scrollTo(0, 0);
      }
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
        timerInterval = null;
        drillData = null;
        render();
        window.scrollTo(0, 0);
      });
    }

    // Modal buttons
    document.getElementById('btn-modal-review')?.addEventListener('click', () => {
      showResultModal = false;
      const modal = document.getElementById('drill-result-modal');
      if (modal) modal.remove();
      const firstWrong = container.querySelector('.drill-question-card.is-wrong');
      if (firstWrong) {
        firstWrong.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstWrong.classList.add('drill-question-focus');
      }
    });

    document.getElementById('btn-modal-redo')?.addEventListener('click', () => {
      loadDrill(currentDrillFile);
    });

    document.getElementById('btn-modal-choose-other')?.addEventListener('click', () => {
      clearInterval(timerInterval);
      drillData = null;
      render();
    });

    // Jump to wrong questions sequentially
    const jumpBtn = document.getElementById('btn-jump-next-wrong');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        const wrongEls = container.querySelectorAll('.drill-question-card.is-wrong');
        if (wrongEls.length === 0) return;
        const targetEl = wrongEls[currentWrongJumpIndex];
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.remove('drill-question-focus');
          void targetEl.offsetWidth; // re-flow
          targetEl.classList.add('drill-question-focus');
        }
        currentWrongJumpIndex = (currentWrongJumpIndex + 1) % wrongEls.length;
        const indicator = document.getElementById('wrong-jump-indicator');
        if (indicator) {
          indicator.textContent = `${currentWrongJumpIndex + 1}/${wrongEls.length}`;
        }
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

  function showQuitConfirmationModal(onConfirm) {
    const existingModal = document.getElementById('drill-quit-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'drill-quit-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal-box" style="text-align:center; max-width: 420px; padding: 28px 22px; box-sizing:border-box;">
        <div style="font-size: 2.8rem; margin-bottom: 8px;">⚠️</div>
        <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-title); margin-bottom: 8px;">
          Xác nhận thoát bài thi?
        </h3>
        <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 22px; line-height: 1.5;">
          Bạn có chắc muốn thoát bài thi này không?<br>
          <strong style="color: #dc2626;">Tiến trình bài làm hiện tại sẽ không được lưu</strong> và bài thi sẽ bị hủy bỏ hoàn toàn.
        </p>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-secondary" id="btn-cancel-quit-drill" style="flex: 1; font-weight: 700; padding: 12px 16px;">
            Tiếp tục làm
          </button>
          <button class="btn btn-danger" id="btn-confirm-quit-drill" style="flex: 1; font-weight: 800; background: #dc2626 !important; color: #ffffff !important; border: 1px solid #b91c1c !important; padding: 12px 16px; box-shadow: 0 4px 14px rgba(220,38,38,0.4); text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
            Thoát bài thi
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btn-cancel-quit-drill')?.addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#btn-confirm-quit-drill')?.addEventListener('click', () => {
      modal.remove();
      onConfirm();
    });
  }

  function submitTest() {
    if (!drillData) return;
    clearInterval(timerInterval);
    timerInterval = null;
    isSubmitted = true;
    showResultModal = true;
    currentWrongJumpIndex = 0;

    const allQuestions = getAllQuestions();
    const totalQ = allQuestions.length;
    let correctCount = 0;
    const wrongQuestionIds = [];
    allQuestions.forEach(q => {
      if (Number(userAnswers[q.id]) === Number(q.correct_answer)) {
        correctCount++;
      } else {
        wrongQuestionIds.push(q.id);
      }
    });

    const totalSec = (drillData.time_limit_minutes || 20) * 60;
    const timeSpentSeconds = Math.max(0, totalSec - timeLeftSeconds);
    const mSpent = Math.floor(timeSpentSeconds / 60);
    const sSpent = timeSpentSeconds % 60;
    const timeSpentText = mSpent > 0 ? `${mSpent} phút ${sSpent} giây` : `${sSpent} giây`;
    const percent = Math.round((correctCount / totalQ) * 100);

    lastSubmitStats = {
      correctCount,
      wrongCount: totalQ - correctCount,
      totalQ,
      percent,
      timeSpentText,
      timeSpentSeconds,
      wrongQuestionIds
    };

    saveDrillHistory(`${drillType}_${currentDrillFile}`, {
      score: correctCount,
      total: totalQ,
      percent,
      timeSpentText,
      timeSpentSeconds,
      date: new Date().toISOString(),
      wrongIds: wrongQuestionIds
    });

    renderDrillTest();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Đăng ký kiểm tra trạng thái đang làm bài thi hay không
  window.__isDrillActive = () => {
    return !!(drillData && !isSubmitted);
  };

  // Đăng ký mở modal xác nhận thoát từ bên ngoài (ví dụ khi bấm chuyển tab navbar)
  window.__showDrillQuitModal = (onConfirm) => {
    showQuitConfirmationModal(onConfirm);
  };

  // Đăng ký dọn dẹp toàn cục để ngắt hẳn timer và hủy trạng thái khi chuyển view
  window.__drillCleanup = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const quitModal = document.getElementById('drill-quit-modal');
    if (quitModal) quitModal.remove();
    const resModal = document.getElementById('drill-result-modal');
    if (resModal) resModal.remove();
    drillData = null;
    isSubmitted = false;
    userAnswers = {};
    currentDrillFile = null;
  };

  render();
}
