// GitHub Sync Service
// Handles committing data files (data/personal_vocab.json, data/vocab_data.json) directly to GitHub repository

export const GITHUB_CONFIG = {
  owner: 'T-Rain0811',
  repo: 'NihonggoApp',
  branch: 'main'
};

export const GitHubSync = {
  getToken() {
    let token = '';
    try {
      token = localStorage.getItem('jlpt_github_pat') || '';
    } catch (e) {}

    // Fallback sang cookie dự phòng nếu localStorage trên iOS PWA bị reset
    if (!token) {
      try {
        const match = document.cookie.match(/(?:^|; )jlpt_github_pat=([^;]*)/);
        if (match && match[1]) token = decodeURIComponent(match[1]);
      } catch (e) {}
    }
    return token.trim();
  },

  setToken(token) {
    const clean = (token || '').trim();
    try {
      if (clean) {
        localStorage.setItem('jlpt_github_pat', clean);
        // Lưu backup vào cookie 1 năm (SameSite=Lax)
        document.cookie = `jlpt_github_pat=${encodeURIComponent(clean)}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        localStorage.removeItem('jlpt_github_pat');
        document.cookie = `jlpt_github_pat=; path=/; max-age=0; SameSite=Lax`;
      }
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  },

  hasToken() {
    return Boolean(this.getToken());
  },

  // Kiểm tra kết nối trực tiếp đến GitHub API
  async testConnection(tokenToCheck) {
    const token = (tokenToCheck !== undefined ? tokenToCheck : this.getToken()).trim();
    if (!token) {
      return { success: false, error: 'Chưa nhập mã GitHub Token' };
    }

    try {
      // 1. Kiểm tra xác thực tài khoản user
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!userRes.ok) {
        if (userRes.status === 401) {
          return { success: false, error: 'Mã Token không đúng hoặc đã hết hạn.' };
        }
        return { success: false, error: `GitHub trả về lỗi xác thực (${userRes.status})` };
      }

      const userData = await userRes.json();

      // 2. Kiểm tra quyền truy cập kho lưu trữ
      const repoRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          return { 
            success: false, 
            error: `Không tìm thấy repository ${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo} hoặc Token chưa được tick quyền 'repo'.` 
          };
        }
        return { success: false, error: `Không thể truy cập kho dữ liệu (${repoRes.status})` };
      }

      const repoData = await repoRes.json();
      const canPush = repoData.permissions ? Boolean(repoData.permissions.push) : true;

      return {
        success: true,
        user: userData.login,
        avatar: userData.avatar_url,
        repo: repoData.full_name,
        canPush
      };
    } catch (err) {
      return { success: false, error: 'Lỗi mạng: Không thể kết nối tới GitHub. Vui lòng kiểm tra Internet.' };
    }
  },

  async commitFile(filePath, dataObj, commitMessage) {
    let token = this.getToken();
    if (!token) {
      return { 
        success: false, 
        error: 'Chưa có GitHub Token. Vui lòng mở Cài đặt ⚙️ trên góc trên để nhập Token đồng bộ.' 
      };
    }

    return await this.doCommit(filePath, dataObj, commitMessage, token);
  },

  async doCommit(filePath, dataObj, commitMessage, token) {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

    try {
      // 1. Lấy SHA hiện tại nếu file đã tồn tại trên repo
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
          return { success: false, error: 'GitHub Token không đúng hoặc hết hạn. Vui lòng kiểm tra lại trong Cài đặt ⚙️.' };
        }
      } catch (e) {
        console.warn('File does not exist yet on repo, will create new file:', e);
      }

      // 2. Chuẩn bị chuỗi JSON UTF-8 an toàn cho tiếng Nhật và tiếng Việt
      const jsonString = JSON.stringify(dataObj, null, 2);
      const base64Content = window.btoa(unescape(encodeURIComponent(jsonString)));

      // 3. Gửi PUT request để tạo commit trực tiếp
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
        if (putRes.status === 401 || putRes.status === 403) {
          return { success: false, error: 'Token không có quyền ghi repository (cần quyền repo) hoặc đã hết hạn.' };
        }
        return { success: false, error: errData.message || `Lỗi HTTP ${putRes.status}` };
      }

      const resData = await putRes.json();
      return { success: true, data: resData };
    } catch (err) {
      console.error('Commit file to GitHub error:', err);
      return { success: false, error: err.message || 'Lỗi mạng khi kết nối GitHub' };
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
