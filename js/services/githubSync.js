// GitHub Sync Service
// Handles committing data files (data/personal_vocab.json, data/vocab_data.json) directly to GitHub repository

const GITHUB_CONFIG = {
  owner: 'T-Rain0811',
  repo: 'NihonggoApp',
  branch: 'main'
};

export const GitHubSync = {
  getToken() {
    return localStorage.getItem('jlpt_github_pat') || '';
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('jlpt_github_pat', token.trim());
    } else {
      localStorage.removeItem('jlpt_github_pat');
    }
  },

  hasToken() {
    return Boolean(this.getToken());
  },

  showTokenModal(onSaved) {
    let modal = document.getElementById('github-token-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'github-token-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 520px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
          <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-title); display:flex; align-items:center; gap:8px;">
            <span>🔐</span>
            <span>Cài Đặt Đồng Bộ GitHub</span>
          </h3>
          <button id="btn-close-token-modal" style="background:none; border:none; font-size:1.3rem; cursor:pointer; color:var(--text-muted); line-height:1;">✕</button>
        </div>

        <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom: 12px; line-height:1.5;">
          Để chỉnh sửa và thêm từ vựng trực tiếp vào file JSON trên kho GitHub (giúp cả điện thoại và máy tính đều cập nhật), bạn chỉ cần nhập <strong>GitHub Token</strong> một lần duy nhất trên thiết bị này.
        </p>

        <div style="background: rgba(37,99,235,0.06); border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 16px; border-left: 3px solid var(--fuji-blue-primary); font-size: 0.82rem; color: var(--text-secondary); line-height: 1.55;">
          <strong style="color:var(--text-title);">Cách lấy Token miễn phí trong 1 phút:</strong><br>
          1. Truy cập <strong>github.com/settings/tokens</strong> (hoặc Settings → Developer settings → Personal access tokens → Tokens classic).<br>
          2. Bấm <strong>Generate new token (classic)</strong>, tick chọn quyền <strong>repo</strong>.<br>
          3. Copy mã token vừa tạo (dạng <code>ghp_...</code>) rồi dán vào ô bên dưới:
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display:block; font-size:0.85rem; font-weight:700; color:var(--text-title); margin-bottom:6px;">
            GitHub Personal Access Token (PAT):
          </label>
          <input type="password" id="input-github-token" class="form-input" placeholder="Dán mã ghp_... vào đây" value="${this.getToken()}" style="width:100%; font-family:monospace; font-size:0.9rem;">
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          ${this.hasToken() ? `
            <button type="button" class="btn btn-secondary btn-sm" id="btn-clear-token" style="color:var(--accent-rose);">Xóa token</button>
          ` : `<div></div>`}
          <div style="display:flex; gap:10px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-token">Hủy</button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-save-token" style="font-weight:700;">💾 Lưu Token</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('btn-close-token-modal')?.addEventListener('click', close);
    document.getElementById('btn-cancel-token')?.addEventListener('click', close);

    document.getElementById('btn-clear-token')?.addEventListener('click', () => {
      this.setToken('');
      close();
      if (onSaved) onSaved('');
    });

    document.getElementById('btn-save-token')?.addEventListener('click', () => {
      const val = document.getElementById('input-github-token')?.value.trim();
      if (!val) {
        alert('Vui lòng nhập mã token GitHub!');
        return;
      }
      this.setToken(val);
      close();
      if (onSaved) onSaved(val);
    });
  },

  async commitFile(filePath, dataObj, commitMessage) {
    let token = this.getToken();
    if (!token) {
      return new Promise((resolve) => {
        this.showTokenModal(async (newToken) => {
          if (!newToken) {
            resolve({ success: false, error: 'Chưa nhập GitHub Token' });
            return;
          }
          const res = await this.doCommit(filePath, dataObj, commitMessage, newToken);
          resolve(res);
        });
      });
    }

    return await this.doCommit(filePath, dataObj, commitMessage, token);
  },

  async doCommit(filePath, dataObj, commitMessage, token) {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

    try {
      // 1. Get current SHA if file exists
      let sha = null;
      try {
        const getRes = await fetch(`${url}?ref=${GITHUB_CONFIG.branch}&_t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json'
          }
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          sha = getData.sha;
        } else if (getRes.status === 401) {
          this.setToken('');
          return { success: false, error: 'GitHub Token không đúng hoặc hết hạn. Vui lòng nhập lại.' };
        }
      } catch (e) {
        console.warn('File does not exist yet on repo, will create new file:', e);
      }

      // 2. Prepare JSON string and Base64 encode (safe for UTF-8 Japanese & Vietnamese)
      const jsonString = JSON.stringify(dataObj, null, 2);
      const base64Content = window.btoa(unescape(encodeURIComponent(jsonString)));

      // 3. Send PUT request
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: commitMessage || `Update ${filePath} via App`,
          content: base64Content,
          branch: GITHUB_CONFIG.branch,
          ...(sha ? { sha } : {})
        })
      });

      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        if (putRes.status === 401) {
          this.setToken('');
          return { success: false, error: 'Token không có quyền ghi repository hoặc không hợp lệ.' };
        }
        return { success: false, error: errData.message || `Lỗi HTTP ${putRes.status}` };
      }

      const resData = await putRes.json();
      return { success: true, data: resData };
    } catch (err) {
      console.error('Commit file to GitHub error:', err);
      return { success: false, error: err.message };
    }
  }
};

export function showToast(msg) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}
