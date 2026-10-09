// Home View Component
export function renderHome(container, state, navigate) {
  // Compute some quick stats
  const customCount = (state.customVocab || []).length;
  const streak = localStorage.getItem('jlpt_streak') || '1';

  container.innerHTML = `
    <div class="hero-section">
      <div class="hero-badge" style="display:inline-block; padding: 4px 12px; background: rgba(99,102,241,0.2); color: var(--accent-primary); border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 700; margin-bottom: 12px;">
        JLPT N2 MASTERY WEB
      </div>
      <h1 class="hero-title">Chinh phục JLPT N2</h1>
      <p class="hero-subtitle">Học từ vựng, ngữ pháp, luyện Power Drill và tạo sổ tay từ vựng cá nhân trực quan trên cả điện thoại và máy tính.</p>

      <div class="quick-stats-row">
        <div class="stat-chip">
          <span class="stat-value">58</span>
          <span class="stat-label">Bài Từ Vựng</span>
        </div>
        <div class="stat-chip">
          <span class="stat-value">150+</span>
          <span class="stat-label">Mẫu Ngữ Pháp</span>
        </div>
        <div class="stat-chip">
          <span class="stat-value">60</span>
          <span class="stat-label">Bài Power Drill</span>
        </div>
        <div class="stat-chip">
          <span class="stat-value" id="home-custom-count">${customCount}</span>
          <span class="stat-label">Từ Cá Nhân</span>
        </div>
      </div>
    </div>

    <div class="card-grid">
      <!-- Card 1: Học từ vựng -->
      <div class="action-card" id="card-vocab">
        <div>
          <div class="card-icon-wrapper" style="background: rgba(99, 102, 241, 0.15); color: #818cf8;">
            📚
          </div>
          <h2 class="card-title">Học Từ Vựng</h2>
          <p class="card-desc">58 bài từ vựng chuẩn N2 kèm cách đọc, âm Hán Việt, flashcard 3D lật thẻ và trắc nghiệm ghi nhớ.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn">Vào học ngay →</span>
        </div>
      </div>

      <!-- Card 2: Học ngữ pháp -->
      <div class="action-card" id="card-grammar">
        <div>
          <div class="card-icon-wrapper" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">
            ✍️
          </div>
          <h2 class="card-title">Học Ngữ Pháp</h2>
          <p class="card-desc">150 mẫu ngữ pháp N2 theo 8 bài video giảng dạy, đầy đủ ví dụ song ngữ Nhật - Việt và bài tập.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn">Xem ngữ pháp →</span>
        </div>
      </div>

      <!-- Card 3: Sổ tay từ vựng tự tạo (Custom Vocab) -->
      <div class="action-card" id="card-custom" style="border-color: rgba(6, 182, 212, 0.3);">
        <div>
          <div class="card-icon-wrapper" style="background: rgba(6, 182, 212, 0.15); color: #22d3ee;">
            📝
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h2 class="card-title">Từ Vựng Cá Nhân</h2>
            <span style="background: var(--accent-cyan); color: #000; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">MỚI</span>
          </div>
          <p class="card-desc">Tự thêm danh sách từ vựng của riêng bạn, ôn flashcard, làm quiz và xuất/nhập file JSON dễ dàng.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn" style="color: var(--accent-cyan);">Mở sổ tay →</span>
        </div>
      </div>

      <!-- Card 4: Luyện đề Drill N2 -->
      <div class="action-card" id="card-drill">
        <div>
          <div class="card-icon-wrapper" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">
            ⚡
          </div>
          <h2 class="card-title">Luyện Power Drill</h2>
          <p class="card-desc">60 đề thi Power Drill (30 đề từ vựng & 30 đề ngữ pháp), bấm giờ 20 phút và chấm điểm tức thì.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn" style="color: var(--accent-amber);">Luyện đề ngay →</span>
        </div>
      </div>

      <!-- Card 5: Tài liệu mở rộng -->
      <div class="action-card" id="card-extra">
        <div>
          <div class="card-icon-wrapper" style="background: rgba(16, 185, 129, 0.15); color: #34d399;">
            🌟
          </div>
          <h2 class="card-title">Từ Vựng Mở Rộng</h2>
          <p class="card-desc">Chuyên đề Tiền tố N2, Từ tượng thanh / tượng hình và 220 cặp từ đồng nghĩa hay gặp.</p>
        </div>
        <div class="card-footer">
          <span class="card-btn" style="color: var(--accent-emerald);">Khám phá →</span>
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
