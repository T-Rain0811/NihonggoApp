// Home View Component - TOAN Minimal Japanese Learning Dashboard
export function renderHome(container, state, navigate) {
  const customCount = (state.customVocab || []).length;

  let lastStudied = null;
  try {
    lastStudied = JSON.parse(localStorage.getItem('jlpt_last_studied'));
  } catch (e) {}

  const resumeLabel = (lastStudied && lastStudied.label) ? `Học tiếp: ${lastStudied.label}` : 'Học tiếp bài cũ';

  container.innerHTML = `
    <div class="hero-section">
      <div class="hero-mobile-art">
        <img src="assets/background_web.png" alt="Núi Phú Sĩ và Hoa Anh Đào" class="hero-mobile-art-img">
      </div>

      <div class="hero-content">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px; flex-wrap:wrap;">
          <span class="brand-badge">合格祈願</span>
          <span style="padding: 4px 12px; background: #fff; color: var(--toan-navy); border: 1px solid rgba(20, 43, 73, 0.12); border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 700; box-shadow: 0 1px 4px rgba(20, 43, 73, 0.04);">
            N2 JLPT
          </span>
          <span style="padding: 4px 12px; background: rgba(217, 111, 97, 0.1); color: var(--toan-japan-red); border: 1px solid rgba(217, 111, 97, 0.25); border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 700;">
            Quốc Toàn
          </span>
        </div>

        <h1 class="hero-title jp-font">Chinh phục tiếng Nhật mỗi ngày</h1>
        <p class="hero-subtitle">
          Không gian ôn luyện tiếng Nhật N2 được thiết kế riêng bởi <strong>Quốc Toàn</strong>.<br>
          Ôn tập từ vựng, ngữ pháp, flashcard 3D và 60 đề thi Power Drill.
        </p>

        <div style="margin-top: 18px; margin-bottom: 4px;">
          <button class="btn btn-primary" id="btn-hero-resume" title="Bấm để học tiếp bài đang học dở">
            <span>${resumeLabel}</span>
            <span style="font-size: 1.1rem; line-height: 1;">→</span>
          </button>
        </div>

        <div class="quick-stats-row">
          <div class="stat-chip">
            <span class="stat-value">58</span>
            <span class="stat-label">Bài Từ Vựng N2</span>
          </div>
          <div class="stat-chip">
            <span class="stat-value">150+</span>
            <span class="stat-label">Mẫu Ngữ Pháp</span>
          </div>
          <div class="stat-chip">
            <span class="stat-value">60</span>
            <span class="stat-label">Đề Power Drill</span>
          </div>
          <div class="stat-chip">
            <span class="stat-value" id="home-custom-count">${customCount}</span>
            <span class="stat-label">Từ Của Quốc Toàn</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card-grid">
      <!-- Card 1: Học từ vựng -->
      <div class="action-card" id="card-vocab">
        <div>
          <div class="card-icon-wrapper">
            📚
          </div>
          <h2 class="card-title">Học Từ Vựng N2</h2>
          <p class="card-desc">58 bài từ vựng trọng tâm kèm phát âm chuẩn Nhật, Hán tự, Furigana, Flashcard 3D và trắc nghiệm.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn">Vào học ngay →</span>
        </div>
      </div>

      <!-- Card 2: Học ngữ pháp -->
      <div class="action-card" id="card-grammar">
        <div>
          <div class="card-icon-wrapper">
            ✍️
          </div>
          <h2 class="card-title">Học Ngữ Pháp N2</h2>
          <p class="card-desc">150 mẫu ngữ pháp thiết yếu theo 8 bài giảng, đầy đủ giải thích và ví dụ song ngữ Nhật - Việt.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn">Xem ngữ pháp →</span>
        </div>
      </div>

      <!-- Card 3: Sổ tay từ vựng tự tạo (Custom Vocab) -->
      <div class="action-card" id="card-custom">
        <div>
          <div class="card-icon-wrapper">
            📝
          </div>
          <h2 class="card-title">Sổ Tay Cá Nhân</h2>
          <p class="card-desc">Thêm từ mới bất kỳ lúc nào, ôn Flashcard 3D riêng, làm Quiz và lưu đồng bộ trực tiếp thuận tiện.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn">Mở sổ tay →</span>
        </div>
      </div>

      <!-- Card 4: Luyện đề Drill N2 -->
      <div class="action-card" id="card-drill">
        <div>
          <div class="card-icon-wrapper">
            ⚡
          </div>
          <h2 class="card-title">Luyện Power Drill</h2>
          <p class="card-desc">60 đề thi Power Drill (30 từ vựng & 30 ngữ pháp), bấm giờ 20 phút và chấm điểm tức thì.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn">Luyện đề ngay →</span>
        </div>
      </div>

      <!-- Card 5: Tài liệu mở rộng -->
      <div class="action-card" id="card-extra">
        <div>
          <div class="card-icon-wrapper">
            🌸
          </div>
          <h2 class="card-title">Từ Vựng Mở Rộng</h2>
          <p class="card-desc">Chuyên đề Tiền tố, Tượng thanh / tượng hình và 220 cặp từ đồng nghĩa hay xuất hiện trong kỳ thi N2.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn">Khám phá →</span>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  document.getElementById('btn-hero-resume').addEventListener('click', () => {
    if (lastStudied) {
      if (lastStudied.type === 'grammar') {
        state.selectedGrammarSession = lastStudied.session || '1';
        if (lastStudied.sessions) state.selectedGrammarSessions = lastStudied.sessions;
        if (lastStudied.tab) state.grammarTab = lastStudied.tab;
        navigate('grammar');
        return;
      } else if (lastStudied.type === 'vocab') {
        if (lastStudied.lessons) state.selectedVocabLessons = lastStudied.lessons;
        if (lastStudied.tab) state.vocabTab = lastStudied.tab;
        navigate('vocab');
        return;
      }
    }
    navigate('vocab');
  });
  document.getElementById('card-vocab').addEventListener('click', () => navigate('vocab'));
  document.getElementById('card-grammar').addEventListener('click', () => navigate('grammar'));
  document.getElementById('card-custom').addEventListener('click', () => navigate('custom'));
  document.getElementById('card-drill').addEventListener('click', () => navigate('drill'));
  document.getElementById('card-extra').addEventListener('click', () => navigate('extra'));
}
