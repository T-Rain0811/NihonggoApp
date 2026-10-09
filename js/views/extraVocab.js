// Extra Vocab View Component (Prefixes, Mimetic words, Synonyms)
import { SpeechHelper } from '../speech.js';

export function renderExtraVocab(container, state, navigate) {
  let activeTab = 'prefix'; // 'prefix', 'mimetic', 'synonym'

  const tabLabels = {
    'prefix': 'Ôn Tiền Tố N2',
    'mimetic': 'Tượng Hình, Tượng Thanh',
    'synonym': '220 Cặp Từ Đồng Nghĩa'
  };

  function getItems() {
    if (!state.extraVocabData) return [];
    return state.extraVocabData[activeTab] || [];
  }

  function render() {
    const items = getItems();

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-home">← Trang chủ</button>
          <h2 style="font-size:1.4rem; font-weight:700;">Từ Vựng Mở Rộng N2</h2>
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="tab-row">
        <button class="tab-pill ${activeTab === 'prefix' ? 'active' : ''}" id="tab-prefix">🔖 Ôn Tiền Tố</button>
        <button class="tab-pill ${activeTab === 'mimetic' ? 'active' : ''}" id="tab-mimetic">✨ Tượng Hình, Tượng Thanh</button>
        <button class="tab-pill ${activeTab === 'synonym' ? 'active' : ''}" id="tab-synonym">🔄 220 Cặp Từ Đồng Nghĩa</button>
      </div>

      <div class="search-bar-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" id="extra-search" class="search-input" placeholder="Tìm kiếm trong mục ${tabLabels[activeTab]}...">
      </div>

      <div class="word-list" id="extra-list-grid">
        ${renderCards(items)}
      </div>
    `;

    document.getElementById('btn-back-home').addEventListener('click', () => navigate('home'));
    
    document.getElementById('tab-prefix').addEventListener('click', () => { activeTab = 'prefix'; render(); });
    document.getElementById('tab-mimetic').addEventListener('click', () => { activeTab = 'mimetic'; render(); });
    document.getElementById('tab-synonym').addEventListener('click', () => { activeTab = 'synonym'; render(); });

    document.getElementById('extra-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = items.filter(it => 
        (it.word && it.word.toLowerCase().includes(q)) ||
        (it.reading && it.reading.toLowerCase().includes(q)) ||
        (it.meaning && it.meaning.toLowerCase().includes(q))
      );
      document.getElementById('extra-list-grid').innerHTML = renderCards(filtered);
      attachAudioListeners();
    });

    attachAudioListeners();
  }

  function renderCards(items) {
    if (!items || items.length === 0) {
      return `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Không tìm thấy dữ liệu phù hợp.</div>`;
    }
    return items.map(it => `
      <div class="word-item-card">
        <div>
          <div class="word-header">
            <div>
              <div class="word-kanji">${it.word || ''}</div>
              ${it.reading ? `<div class="word-reading">${it.reading}</div>` : ''}
            </div>
            <button class="icon-btn btn-audio" data-speak="${it.word || it.reading}" title="Nghe phát âm">🔊</button>
          </div>
          <div class="word-meaning" style="white-space: pre-line; line-height:1.6;">${it.meaning || ''}</div>
        </div>
      </div>
    `).join('');
  }

  function attachAudioListeners() {
    container.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });
  }

  render();
}
