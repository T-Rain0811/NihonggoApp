// Settings Modal Component
// Provides a unified, elegant settings panel for Cloud Sync (GitHub), PWA Cache Refresh, and Backup

import { GitHubSync, GITHUB_CONFIG, showToast } from './githubSync.js';

export const SettingsModal = {
  show(onUpdated) {
    let modal = document.getElementById('settings-system-modal');
    if (modal) modal.remove();

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const currentToken = GitHubSync.getToken();
    const hasToken = Boolean(currentToken);

    modal = document.createElement('div');
    modal.id = 'settings-system-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal-box settings-modal-box" style="max-width: 540px; max-height: 90vh; overflow-y: auto; padding: 22px 24px;">
        <!-- Modal Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px; border-bottom: 1px solid rgba(20,43,73,0.08); padding-bottom: 12px;">
          <h3 style="font-size:1.3rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:10px; margin:0;">
            <span style="font-size:1.4rem;">⚙️</span>
            <span>Cài Đặt Hệ Thống</span>
          </h3>
          <button id="btn-close-settings-modal" class="btn-icon-close" style="background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--text-muted); line-height:1; padding:4px;" title="Đóng">✕</button>
        </div>

        <!-- 1. GITHUB CLOUD SYNC SECTION -->
        <div class="settings-card" style="background:rgba(255,255,255,0.7); border:1px solid rgba(20,43,73,0.09); border-radius:var(--radius-lg); padding:16px 18px; margin-bottom:16px; box-shadow:0 2px 10px rgba(10,36,68,0.03);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-size:0.95rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:8px;">
              <span>☁️</span>
              <span>Đồng Bộ Đám Mây (GitHub)</span>
            </div>
            <span id="sync-status-badge" class="badge" style="padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:700; ${hasToken ? 'background:rgba(16,185,129,0.12); color:#059669;' : 'background:rgba(100,116,139,0.12); color:#64748b;'}">
              ${hasToken ? '🟢 Đã kết nối' : '⚪ Chưa kết nối'}
            </span>
          </div>

          <p style="font-size:0.83rem; color:var(--text-secondary); line-height:1.5; margin-bottom:12px;">
            Kết nối với kho GitHub <strong>${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}</strong> giúp tự động đồng bộ từ vựng cá nhân và các chỉnh sửa của bạn giữa máy tính và điện thoại (kể cả khi dùng Web App ngoài màn hình chính).
          </p>

          <!-- Input Token -->
          <div style="margin-bottom:12px;">
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-title); margin-bottom:5px;">
              Mã GitHub Personal Access Token (PAT):
            </label>
            <div style="position:relative; display:flex; align-items:center;">
              <input type="password" id="input-settings-token" class="form-input" placeholder="Dán mã ghp_... vào đây" value="${currentToken}" style="width:100%; font-family:monospace; font-size:0.85rem; padding-right:42px;">
              <button type="button" id="btn-toggle-token-eye" style="position:absolute; right:10px; background:none; border:none; cursor:pointer; font-size:1.1rem; color:var(--text-muted); padding:4px;" title="Xem/Ẩn mã token">👁️</button>
            </div>
          </div>

          <!-- Test & Action Result Feedback Box -->
          <div id="token-test-feedback" style="display:none; font-size:0.82rem; padding:8px 12px; border-radius:var(--radius-sm); margin-bottom:12px; line-height:1.45;"></div>

          <!-- Buttons Row -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:space-between;">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-sm" id="btn-test-and-save-token" style="font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                <span>💾</span>
                <span>Kiểm tra & Lưu Token</span>
              </button>
              ${hasToken ? `
                <button type="button" class="btn btn-secondary btn-sm" id="btn-disconnect-token" style="color:var(--accent-rose); font-weight:600;">
                  🗑️ Xóa Token
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Expandable Guide -->
          <details style="margin-top:14px; font-size:0.8rem; color:var(--text-secondary); background:rgba(37,99,235,0.04); border-radius:var(--radius-sm); border:1px solid rgba(37,99,235,0.1); padding:8px 12px;">
            <summary style="font-weight:700; cursor:pointer; color:var(--fuji-blue-deep);">💡 Cách lấy mã Token miễn phí trong 1 phút (Bấm để xem)</summary>
            <div style="margin-top:8px; line-height:1.6; border-top:1px dashed rgba(37,99,235,0.15); padding-top:8px;">
              1. Đăng nhập GitHub, vào <strong>github.com/settings/tokens</strong>.<br>
              2. Chọn <strong>Generate new token (classic)</strong>.<br>
              3. Đặt tên (ví dụ: <code>NihonggoApp</code>), chọn thời hạn (ví dụ: 90 ngày hoặc No expiration).<br>
              4. <strong>Quan trọng:</strong> Tick chọn quyền <strong>[x] repo</strong> (Full control of private repositories).<br>
              5. Bấm Generate token, copy mã (dạng <code>ghp_...</code>) rồi dán vào ô trên và bấm <em>Kiểm tra & Lưu Token</em>.
            </div>
          </details>
        </div>

        <!-- 2. PWA & CACHE REFRESH SECTION -->
        <div class="settings-card" style="background:rgba(255,255,255,0.7); border:1px solid rgba(20,43,73,0.09); border-radius:var(--radius-lg); padding:16px 18px; margin-bottom:16px; box-shadow:0 2px 10px rgba(10,36,68,0.03);">
          <div style="font-size:0.95rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span>📱</span>
            <span>Môi Trường & Bộ Nhớ Tạm (Cache)</span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:0.83rem; color:var(--text-secondary);">
            <span>Chế độ chạy:</span>
            <span class="badge" style="background:rgba(37,99,235,0.09); color:var(--fuji-blue-deep); padding:3px 10px; border-radius:12px; font-weight:700;">
              ${isStandalone ? '📱 Web App (Màn hình chính)' : '🌐 Trình duyệt Web'}
            </span>
          </div>

          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px; line-height:1.45;">
            Khi vừa thêm từ mới hoặc sửa đổi code trên máy tính, nếu trên điện thoại chưa thấy cập nhật, bạn có thể xóa cache ứng dụng để nạp phiên bản mới nhất ngay lập tức.
          </p>

          <button type="button" class="btn btn-secondary btn-sm" id="btn-clear-cache-reload" style="font-weight:700; width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px;">
            <span>🔄</span>
            <span>Làm Mới & Tải Lại Dữ Liệu Mới Nhất</span>
          </button>
        </div>

        <!-- 3. BACKUP & EXPORT SECTION -->
        <div class="settings-card" style="background:rgba(255,255,255,0.7); border:1px solid rgba(20,43,73,0.09); border-radius:var(--radius-lg); padding:16px 18px; margin-bottom:16px; box-shadow:0 2px 10px rgba(10,36,68,0.03);">
          <div style="font-size:0.95rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span>💾</span>
            <span>Sao Lưu Dữ Liệu Sổ Tay Cá Nhân</span>
          </div>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px; line-height:1.45;">
            Tải bản sao lưu toàn bộ từ vựng trong Sổ tay cá nhân về máy tính hoặc điện thoại dưới định dạng file JSON dự phòng.
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-export-personal-vocab" style="font-weight:600; display:inline-flex; align-items:center; gap:6px;">
              <span>📥</span>
              <span>Xuất file JSON sao lưu</span>
            </button>
          </div>
        </div>

        <!-- 4. APP FOOTER INFO -->
        <div style="text-align:center; font-size:0.75rem; color:var(--text-muted); padding-top:4px;">
          TŌあN - JLPT N2 合格祈願 • Phiên bản 2026 • Phát triển bởi Quốc Toàn
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      modal.remove();
      if (onUpdated) onUpdated();
    };

    document.getElementById('btn-close-settings-modal')?.addEventListener('click', close);

    // Toggle Eye view password
    const tokenInput = document.getElementById('input-settings-token');
    const eyeBtn = document.getElementById('btn-toggle-token-eye');
    eyeBtn?.addEventListener('click', () => {
      if (tokenInput.type === 'password') {
        tokenInput.type = 'text';
        eyeBtn.textContent = '🙈';
      } else {
        tokenInput.type = 'password';
        eyeBtn.textContent = '👁️';
      }
    });

    // Test & Save Token
    const testFeedback = document.getElementById('token-test-feedback');
    document.getElementById('btn-test-and-save-token')?.addEventListener('click', async () => {
      const val = tokenInput.value.trim();
      if (!val) {
        testFeedback.style.display = 'block';
        testFeedback.style.background = 'rgba(239, 68, 68, 0.1)';
        testFeedback.style.color = '#b91c1c';
        testFeedback.style.border = '1px solid rgba(239, 68, 68, 0.2)';
        testFeedback.innerHTML = '❌ Vui lòng dán mã GitHub Personal Access Token (PAT).';
        return;
      }

      testFeedback.style.display = 'block';
      testFeedback.style.background = 'rgba(37, 99, 235, 0.08)';
      testFeedback.style.color = 'var(--fuji-blue-deep)';
      testFeedback.style.border = '1px solid rgba(37, 99, 235, 0.2)';
      testFeedback.innerHTML = '⏳ Đang kiểm tra kết nối tới GitHub API...';

      const check = await GitHubSync.testConnection(val);
      if (check.success) {
        GitHubSync.setToken(val);
        testFeedback.style.background = 'rgba(16, 185, 129, 0.1)';
        testFeedback.style.color = '#047857';
        testFeedback.style.border = '1px solid rgba(16, 185, 129, 0.25)';
        testFeedback.innerHTML = `
          <strong>✅ Kết nối thành công!</strong><br>
          • Tài khoản: <strong>${check.user}</strong><br>
          • Kho lưu trữ: <strong>${check.repo}</strong><br>
          • Quyền ghi file: <strong>${check.canPush ? 'Đầy đủ (Push OK)' : 'Cảnh báo: Thiếu quyền ghi'}</strong><br>
          <em>Mã Token đã được lưu an toàn trên thiết bị của bạn.</em>
        `;
        showToast('✅ Đã lưu và kết nối GitHub thành công!');
        // Update header settings dot
        document.querySelector('.settings-dot')?.classList.add('connected');
        // Re-render modal state after short delay
        setTimeout(() => {
          SettingsModal.show(onUpdated);
        }, 1600);
      } else {
        testFeedback.style.background = 'rgba(239, 68, 68, 0.1)';
        testFeedback.style.color = '#b91c1c';
        testFeedback.style.border = '1px solid rgba(239, 68, 68, 0.2)';
        testFeedback.innerHTML = `<strong>❌ Kết nối thất bại:</strong> ${check.error}`;
      }
    });

    // Disconnect Token
    document.getElementById('btn-disconnect-token')?.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn ngắt kết nối và xóa GitHub Token trên thiết bị này?')) {
        GitHubSync.setToken('');
        document.querySelector('.settings-dot')?.classList.remove('connected');
        showToast('Đã xóa mã Token khỏi thiết bị');
        SettingsModal.show(onUpdated);
      }
    });

    // Clear cache & Reload
    document.getElementById('btn-clear-cache-reload')?.addEventListener('click', async () => {
      showToast('⏳ Đang xóa cache và tải lại dữ liệu mới nhất...');
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        if (navigator.serviceWorker) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let reg of registrations) {
            await reg.unregister();
          }
        }
      } catch (e) {}

      setTimeout(() => {
        window.location.reload(true);
      }, 500);
    });

    // Export Personal Vocab
    document.getElementById('btn-export-personal-vocab')?.addEventListener('click', () => {
      try {
        const vocab = JSON.parse(localStorage.getItem('jlpt_custom_vocab') || '[]');
        if (vocab.length === 0) {
          alert('Sổ tay cá nhân của bạn hiện đang trống.');
          return;
        }
        const blob = new Blob([JSON.stringify(vocab, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `personal_vocab_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Đã tải về file sao lưu gồm ${vocab.length} từ!`);
      } catch (err) {
        alert('Lỗi xuất dữ liệu: ' + err.message);
      }
    });
  }
};
