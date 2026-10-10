// Extra Vocab View Component (Prefixes, Mimetic words, Synonyms)
import { SpeechHelper } from '../speech.js';

export function renderExtraVocab(container, state, navigate) {
  let activeTab = 'prefix'; // 'prefix', 'mimetic', 'synonym'

  const tabLabels = {
    'prefix': 'Ôn Tiền Tố N2 (98 tiền tố)',
    'mimetic': 'Từ Tượng Hình, Tượng Thanh (100 từ)',
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
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-title);">Từ Vựng Mở Rộng N2</h2>
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="tab-row" style="margin-bottom: 16px;">
        <button class="tab-pill ${activeTab === 'prefix' ? 'active' : ''}" id="tab-prefix">🔖 Ôn Tiền Tố (98 tiền tố)</button>
        <button class="tab-pill ${activeTab === 'mimetic' ? 'active' : ''}" id="tab-mimetic">✨ Tượng Hình, Tượng Thanh (100 từ)</button>
        <button class="tab-pill ${activeTab === 'synonym' ? 'active' : ''}" id="tab-synonym">🔄 220 Cặp Từ Đồng Nghĩa</button>
      </div>

      <div class="search-bar-wrapper" style="margin-bottom: 18px;">
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

    document.getElementById('extra-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = items.filter(it => {
        if (it.prefix) {
          const matchPrefix = it.prefix.toLowerCase().includes(q) ||
                              (it.meaning && it.meaning.toLowerCase().includes(q));
          const matchWords = it.words && it.words.some(w => 
            (w.word && w.word.toLowerCase().includes(q)) ||
            (w.reading && w.reading.toLowerCase().includes(q)) ||
            (w.meaning && w.meaning.toLowerCase().includes(q))
          );
          return matchPrefix || matchWords;
        }
        return (it.word && it.word.toLowerCase().includes(q)) ||
               (it.reading && it.reading.toLowerCase().includes(q)) ||
               (it.meaning && it.meaning.toLowerCase().includes(q));
      });
      document.getElementById('extra-list-grid').innerHTML = renderCards(filtered);
      attachAudioListeners();
    });

    attachAudioListeners();
  }

  function renderCards(items) {
    if (!items || items.length === 0) {
      return `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Không tìm thấy dữ liệu phù hợp.</div>`;
    }

    if (activeTab === 'prefix') {
      return items.map((it, idx) => {
        const prefixClean = (it.prefix || '').replace(/[～~]/g, '');
        const exampleWords = it.words || [];
        return `
          <div class="word-item-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
            <div>
              <div class="word-header" style="align-items:flex-start; margin-bottom:8px;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div class="word-kanji" style="font-size:1.75rem; color:var(--fuji-blue-deep); font-weight:800; font-family:var(--font-japanese);">${it.prefix || ''}</div>
                    <span style="font-size:0.75rem; background:rgba(37,99,235,0.1); color:var(--fuji-blue-primary); padding:3px 9px; border-radius:var(--radius-full); font-weight:700;">#${idx + 1} Tiền tố</span>
                  </div>
                  <div class="word-meaning" style="font-size:1.02rem; font-weight:700; color:var(--text-title); margin-top:6px;">
                    💡 ${it.meaning || ''}
                  </div>
                </div>
                <button class="icon-btn btn-audio" data-speak="${prefixClean}" title="Nghe phát âm tiền tố ${it.prefix}">🔊</button>
              </div>

              ${exampleWords.length > 0 ? `
                <div style="border-top: 1px solid var(--glass-border-subtle); padding-top: 10px; margin-top: 10px;">
                  <div style="font-size:0.78rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px; letter-spacing:0.5px;">
                    Từ ghép minh họa (${exampleWords.length}):
                  </div>
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${exampleWords.map(w => `
                      <div style="background:rgba(255, 255, 255, 0.7); border:1px solid var(--glass-border-subtle); border-radius:var(--radius-sm); padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                          <div style="display:flex; align-items:baseline; gap:8px;">
                            <span style="font-family:var(--font-japanese); font-weight:800; font-size:1.08rem; color:var(--text-title);">${w.word || ''}</span>
                            ${w.reading ? `<span style="font-size:0.82rem; color:var(--fuji-blue-primary); font-weight:700;">(${w.reading})</span>` : ''}
                          </div>
                          <div style="font-size:0.88rem; color:var(--text-secondary); margin-top:2px;">${w.meaning || ''}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                          <a href="https://mazii.net/vi/search/word/ja-vi/${encodeURIComponent(w.word || '')}" target="_blank" rel="noopener noreferrer" class="word-mazii-badge" title="Tra cứu '${w.word}' trên từ điển Mazii" style="text-decoration:none;">
                            🔍 Mazii
                          </a>
                          <button class="icon-btn btn-audio" data-speak="${w.reading || w.word || ''}" title="Nghe phát âm '${w.word}'" style="width:30px; height:30px; font-size:0.85rem;">🔊</button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    return items.map((it, idx) => `
      <div class="word-item-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
        <div>
          <div class="word-header" style="align-items:flex-start; margin-bottom:8px;">
            <div>
              <div class="word-kanji" style="font-size:1.55rem; color:var(--text-title); font-family:var(--font-japanese);">${it.word || ''}</div>
              ${it.reading ? `<div class="word-reading" style="font-size:0.92rem; color:var(--fuji-blue-primary); font-weight:700; margin-top:2px;">${it.reading}</div>` : ''}
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              ${it.word ? `
                <a href="https://mazii.net/vi/search/word/ja-vi/${encodeURIComponent(it.word.split('＝')[0].replace(/[（(][^）)]*[）)]/g, '').trim())}" target="_blank" rel="noopener noreferrer" class="word-mazii-badge" title="Tra cứu trên Mazii" style="text-decoration:none;">
                  🔍 Mazii
                </a>
              ` : ''}
              <button class="icon-btn btn-audio" data-speak="${it.reading || (it.word ? it.word.split('＝')[0].replace(/[（(][^）)]*[）)]/g, '').trim() : '')}" title="Nghe phát âm">🔊</button>
            </div>
          </div>
          <div class="word-meaning" style="white-space: pre-line; line-height:1.6; font-size:0.95rem; color:var(--text-secondary); margin-top:6px;">${it.meaning || ''}</div>
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
