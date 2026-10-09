// Home View Component - N2 合格 Theme
export function renderHome(container, state, navigate) {
  const customCount = (state.customVocab || []).length;

  container.innerHTML = `
    <div class="hero-section">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px; flex-wrap:wrap;">
        <span class="brand-badge">合格祈願</span>
        <span style="padding: 4px 12px; background: rgba(56, 189, 248, 0.15); color: var(--accent-primary); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 700;">
          JLPT N2 MASTERY
        </span>
        <span style="padding: 4px 12px; background: rgba(244, 114, 182, 0.15); color: var(--accent-pink); border: 1px solid rgba(244, 114, 182, 0.3); border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 700;">
          Quốc Toàn
        </span>
      </div>

      <h1 class="hero-title jp-font">N2 合格への道</h1>
      <p class="hero-subtitle">
        Không gian luyện thi tiếng Nhật N2 cá nhân hóa được thiết kế riêng cho <strong>Quốc Toàn</strong>. Ôn tập từ vựng, ngữ pháp, flashcard 3D và 60 đề thi Power Drill chuẩn format kỳ thi.
      </p>

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

    <div class="card-grid">
      <!-- Card 1: Học từ vựng -->
      <div class="action-card" id="card-vocab">
        <div>
          <div class="card-icon-wrapper" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">
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
          <div class="card-icon-wrapper" style="background: rgba(96, 165, 250, 0.15); color: #60a5fa;">
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
      <div class="action-card" id="card-custom" style="border-color: rgba(56, 189, 248, 0.35);">
        <div>
          <div class="card-icon-wrapper" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">
            📝
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h2 class="card-title">Sổ Tay Của Quốc Toàn</h2>
            <span style="background: var(--accent-primary); color: #000; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">RIÊNG TÔI</span>
          </div>
          <p class="card-desc">Thêm từ mới bất kỳ lúc nào, ôn Flashcard 3D riêng, làm Quiz và xuất/nhập file JSON lưu trữ tiện lợi.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn" style="color: var(--accent-primary);">Mở sổ tay →</span>
        </div>
      </div>

      <!-- Card 4: Luyện đề Drill N2 -->
      <div class="action-card" id="card-drill">
        <div>
          <div class="card-icon-wrapper" style="background: rgba(251, 191, 36, 0.15); color: #fbbf24;">
            ⚡
          </div>
          <h2 class="card-title">Luyện Power Drill</h2>
          <p class="card-desc">60 đề thi Power Drill (30 từ vựng & 30 ngữ pháp), bấm giờ 20 phút và chấm điểm tức thì.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn" style="color: var(--accent-amber);">Luyện đề ngay →</span>
        </div>
      </div>

      <!-- Card 5: Tài liệu mở rộng -->
      <div class="action-card" id="card-extra">
        <div>
          <div class="card-icon-wrapper" style="background: rgba(244, 114, 182, 0.15); color: #f472b6;">
            🌸
          </div>
          <h2 class="card-title">Từ Vựng Mở Rộng</h2>
          <p class="card-desc">Chuyên đề Tiền tố, Tượng thanh / tượng hình và 220 cặp từ đồng nghĩa hay xuất hiện trong kỳ thi N2.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn" style="color: var(--accent-pink);">Khám phá →</span>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  document.getElementById('card-vocab').addEventListener('click', () => navigate('vocab'));
  document.getElementById('card-grammar').addEventListener('click', () => navigate('grammar'));
  document.getElementById('card-custom').addEventListener('click', () => navigate('custom'));
  document.getElementById('card-drill').addEventListener('click', () => navigate('drill'));
  document.getElementById('card-extra').addEventListener('click', () => navigate('extra'));
}
