// Settings Modal Component
// Compact, Mobile-Friendly Settings panel with Fixed Header, Scrollable Body, and Backdrop Dismiss

import { GitHubSync, GITHUB_CONFIG, showToast } from './githubSync.js';

export const SettingsModal = {
  show(onUpdated) {
    let modal = document.getElementById('settings-system-modal');
    if (modal) modal.remove();

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const currentToken = GitHubSync.getToken();
    const hasToken = Boolean(currentToken);

    // Lock background scrolling on mobile
    document.body.style.overflow = 'hidden';

    modal = document.createElement('div');
    modal.id = 'settings-system-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal-box settings-modal-box">
        <!-- 1. FIXED HEADER (Luôn cố định, nút X to rõ ràng không bao giờ trôi) -->
        <div class="settings-modal-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.3rem;">⚙️</span>
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-title); margin:0;">Cài Đặt Hệ Thống</h3>
          </div>
          <button id="btn-close-settings-modal" class="btn-close-circle" title="Đóng">✕</button>
        </div>

        <!-- 2. SCROLLABLE BODY (Chỉ cuộn nội dung bên trong, overscroll-behavior: contain) -->
        <div class="settings-modal-body">
          <!-- CARD 1: GITHUB CLOUD SYNC -->
          <div class="settings-card" style="background:#f8fafc; border:1px solid rgba(20,43,73,0.08); border-radius:14px; padding:12px 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:0.9rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:6px;">
                <span>☁️</span>
                <span>Đồng bộ GitHub</span>
              </span>
              <span id="sync-status-badge" class="badge" style="padding:2px 8px; border-radius:10px; font-size:0.72rem; font-weight:700; ${hasToken ? 'background:rgba(16,185,129,0.15); color:#047857;' : 'background:rgba(100,116,139,0.12); color:#64748b;'}">
                ${hasToken ? '🟢 Đã kết nối' : '⚪ Chưa kết nối'}
              </span>
            </div>

            <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:10px; line-height:1.4;">
              Đồng bộ từ vựng trực tiếp với kho lưu trữ <code>${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}</code>.
            </div>

            <!-- Input Token with Paste button -->
            <div style="display:flex; gap:6px; margin-bottom:6px;">
              <div style="position:relative; flex:1;">
                <input type="text" id="input-settings-token" class="form-input" placeholder="Dán mã Token (ghp_...)" value="${currentToken}" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" style="width:100%; font-family:monospace; font-size:0.82rem; padding:8px 36px 8px 10px; border-radius:8px;">
                <button type="button" id="btn-toggle-token-eye" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:1rem; padding:2px;" title="Xem/Ẩn">👁️</button>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-paste-token" style="font-size:0.78rem; padding:6px 10px; white-space:nowrap; border-radius:8px;" title="Dán mã từ bộ nhớ tạm">📋 Dán</button>
            </div>
            <div style="font-size:0.74rem; color:var(--text-muted); margin-bottom:10px; line-height:1.35;">
              💡 <em>Lưu ý iPhone: Nhập mã và bấm Lưu 1 lần duy nhất trên App, hệ thống sẽ nhớ mãi trên máy.</em>
            </div>

            <!-- Test & Action Result Feedback Box -->
            <div id="token-test-feedback" style="display:none; font-size:0.8rem; padding:8px 10px; border-radius:8px; margin-bottom:10px; line-height:1.4;"></div>

            <!-- Buttons Row -->
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-sm" id="btn-test-and-save-token" style="font-weight:700; font-size:0.82rem; padding:6px 12px;">
                💾 Lưu & Kết nối
              </button>
              ${hasToken ? `
                <button type="button" class="btn btn-secondary btn-sm" id="btn-disconnect-token" style="color:#dc2626; font-size:0.82rem; padding:6px 10px;">
                  Xóa Token
                </button>
              ` : ''}
            </div>

            <!-- Expandable Guide -->
            <details style="margin-top:10px; font-size:0.76rem; color:var(--text-secondary);">
              <summary style="font-weight:700; cursor:pointer; color:var(--fuji-blue-deep);">💡 Cách lấy mã Token (1 phút)</summary>
              <div style="margin-top:6px; line-height:1.55; padding:6px 10px; background:rgba(37,99,235,0.04); border-radius:6px; border:1px solid rgba(37,99,235,0.1);">
                1. Đăng nhập GitHub, vào <strong>github.com/settings/tokens</strong><br>
                2. Bấm <strong>Generate new token (classic)</strong><br>
                3. Tick chọn quyền <strong>[x] repo</strong><br>
                4. Copy mã token (ghp_...) dán vào đây và bấm <em>Lưu & Kết nối</em>.
              </div>
            </details>
          </div>

          <!-- CARD 2: PWA & CACHE REFRESH -->
          <div class="settings-card" style="background:#f8fafc; border:1px solid rgba(20,43,73,0.08); border-radius:14px; padding:12px 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:0.88rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:6px;">
                <span>📱</span>
                <span>Bộ nhớ & Dữ liệu</span>
              </span>
              <span style="font-size:0.72rem; color:var(--text-muted); font-weight:600;">${isStandalone ? 'PWA Web App' : 'Trình duyệt Web'}</span>
            </div>
            <p style="font-size:0.76rem; color:var(--text-muted); margin-bottom:8px; line-height:1.4;">
              Nếu vừa cập nhật từ máy tính mà điện thoại chưa thấy thay đổi, bấm nút bên dưới để tải lại dữ liệu mới nhất:
            </p>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-clear-cache-reload" style="width:100%; font-size:0.82rem; padding:7px 10px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;">
              <span>🔄</span>
              <span>Làm Mới & Tải Lại Dữ Liệu</span>
            </button>
          </div>

          <!-- CARD 3: BACKUP PERSONAL VOCAB -->
          <div class="settings-card" style="background:#f8fafc; border:1px solid rgba(20,43,73,0.08); border-radius:14px; padding:12px 14px;">
            <div style="font-size:0.88rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:6px; margin-bottom:6px;">
              <span>💾</span>
              <span>Sao lưu Sổ tay cá nhân</span>
            </div>
            <p style="font-size:0.76rem; color:var(--text-muted); margin-bottom:8px; line-height:1.4;">
              Tải toàn bộ từ vựng trong Sổ tay cá nhân về máy dưới dạng file JSON dự phòng:
            </p>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-export-personal-vocab" style="width:100%; font-size:0.82rem; padding:7px 10px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px;">
              <span>📥</span>
              <span>Xuất file sao lưu (.JSON)</span>
            </button>
          </div>
        </div>

        <!-- 3. FIXED FOOTER (Đáy modal: Nút đóng to dễ bấm không bao giờ trôi) -->
        <div class="settings-modal-footer">
          <span style="font-size:0.72rem; color:var(--text-muted);">TŌあN JLPT N2 </span>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-bottom-close-settings" style="font-weight:700; padding:6px 16px; border-radius:8px;">
            Đóng lại
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      document.body.style.overflow = '';
      modal.remove();
      if (onUpdated) onUpdated();
    };

    // Đóng bằng nút X cố định ở Header
    document.getElementById('btn-close-settings-modal')?.addEventListener('click', close);
    // Đóng bằng nút ở Footer dưới cùng
    document.getElementById('btn-bottom-close-settings')?.addEventListener('click', close);

    // Đóng bằng cách chạm vào vùng tối xung quanh (Backdrop click)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    // Đóng bằng phím Escape
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        close();
        window.removeEventListener('keydown', onEsc);
      }
    };
    window.addEventListener('keydown', onEsc);

    // Toggle Eye view password
    const tokenInput = document.getElementById('input-settings-token');
    const eyeBtn = document.getElementById('btn-toggle-token-eye');
    eyeBtn?.addEventListener('click', () => {
      if (tokenInput.type === 'password') {
        tokenInput.type = 'text';
        eyeBtn.textContent = '👁️';
      } else {
        tokenInput.type = 'password';
        eyeBtn.textContent = '🙈';
      }
    });

    // Paste from Clipboard
    document.getElementById('btn-paste-token')?.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            tokenInput.value = text.trim();
            showToast('Đã dán mã Token từ Clipboard!');
            return;
          }
        }
      } catch (err) {
        console.warn('Clipboard error:', err);
      }
      tokenInput.focus();
      tokenInput.select();
      showToast('Chạm giữ vào ô rồi chọn "Dán" (Paste).');
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
        // Tự động ghim token vào URL hash để khi người dùng Share -> Thêm vào MH chính sẽ tự động mang token sang PWA
        try {
          history.replaceState(null, '', '#token=' + encodeURIComponent(val));
        } catch (e) { }

        testFeedback.style.background = 'rgba(16, 185, 129, 0.1)';
        testFeedback.style.color = '#047857';
        testFeedback.style.border = '1px solid rgba(16, 185, 129, 0.25)';
        testFeedback.innerHTML = `
          <strong>✅ Kết nối thành công!</strong><br>
          • Tài khoản: <strong>${check.user}</strong><br>
          • Quyền ghi repo: <strong>${check.canPush ? 'Đầy đủ (OK)' : 'Cảnh báo: Thiếu quyền ghi'}</strong>
        `;
        showToast('✅ Đã lưu và kết nối GitHub thành công!');
        document.querySelector('.settings-dot')?.classList.add('connected');
        setTimeout(() => {
          SettingsModal.show(onUpdated);
        }, 1200);
      } else {
        testFeedback.style.background = 'rgba(239, 68, 68, 0.1)';
        testFeedback.style.color = '#b91c1c';
        testFeedback.style.border = '1px solid rgba(239, 68, 68, 0.2)';
        testFeedback.innerHTML = `<strong>❌ Kết nối thất bại:</strong> ${check.error}`;
      }
    });

    // Disconnect Token
    document.getElementById('btn-disconnect-token')?.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn xóa GitHub Token trên thiết bị này?')) {
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
      } catch (e) { }

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
