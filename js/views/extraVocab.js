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
      attachCardListeners();
    });

    attachCardListeners();
  }

  function openMazii(word) {
    if (!word) return;
    const cleanWord = word.split('＝')[0].replace(/[（(][^）)]*[）)]/g, '').trim();
    if (!cleanWord) return;
    const url = `https://mazii.net/vi-VN/search/word/javi/${encodeURIComponent(cleanWord)}`;
    window.open(url, '_blank');
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
          <div class="prefix-group-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
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
                    ${exampleWords.map(w => {
                      const cleanWord = (w.word || '').split('＝')[0].replace(/[（(][^）)]*[）)]/g, '').trim();
                      const maziiUrl = cleanWord ? `https://mazii.net/vi-VN/search/word/javi/${encodeURIComponent(cleanWord)}` : '#';
                      return `
                      <div class="extra-word-row" data-search="${cleanWord}" title="Bấm để tra cứu '${cleanWord}' trên Mazii" style="background:rgba(255, 255, 255, 0.75); border:1px solid var(--glass-border-subtle); border-radius:var(--radius-sm); padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                        <div style="flex:1; min-width:0;">
                          <!-- Dòng 1: Kanji -->
                          <div style="font-family:var(--font-japanese); font-weight:800; font-size:1.15rem; color:var(--text-title); line-height:1.2;">${w.word || ''}</div>
                          <!-- Dòng 2: Hiragana -->
                          ${w.reading ? `<div style="font-size:0.86rem; color:var(--fuji-blue-primary); font-weight:700; margin-top:3px; line-height:1.2;">${w.reading}</div>` : ''}
                          <!-- Dòng 3: Nghĩa -->
                          <div style="font-size:0.9rem; color:var(--text-secondary); margin-top:4px; line-height:1.4; word-break:break-word;">${w.meaning || ''}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                          <a href="${maziiUrl}" target="_blank" rel="noopener noreferrer" class="btn-mazii-icon" title="Tra cứu '${cleanWord}' trên từ điển Mazii">
                            🔍
                          </a>
                          <button class="icon-btn btn-audio" data-speak="${w.reading || cleanWord}" title="Nghe phát âm '${cleanWord}'" style="width:34px; height:34px; font-size:0.9rem;">🔊</button>
                        </div>
                      </div>
                    `;
                    }).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    return items.map((it, idx) => {
      const searchTarget = it.word ? it.word.split('＝')[0].replace(/[（(][^）)]*[）)]/g, '').trim() : '';
      const maziiUrl = searchTarget ? `https://mazii.net/vi-VN/search/word/javi/${encodeURIComponent(searchTarget)}` : '#';
      return `
        <div class="word-item-card" data-search="${searchTarget}" title="Bấm để tra cứu '${searchTarget}' trên Mazii" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px; cursor:pointer;">
          <div>
            <div class="word-header" style="align-items:flex-start; margin-bottom:8px;">
              <div style="flex:1; min-width:0;">
                <div class="word-kanji" style="font-size:1.45rem; color:var(--text-title); font-family:var(--font-japanese); line-height:1.3; word-break:break-word;">${it.word || ''}</div>
                ${it.reading ? `<div class="word-reading" style="font-size:0.92rem; color:var(--fuji-blue-primary); font-weight:700; margin-top:4px;">${it.reading}</div>` : ''}
              </div>
              <div style="display:flex; align-items:center; gap:6px; flex-shrink:0; margin-left:8px;">
                ${searchTarget ? `
                  <a href="${maziiUrl}" target="_blank" rel="noopener noreferrer" class="btn-mazii-icon" title="Tra cứu '${searchTarget}' trên Mazii">
                    🔍
                  </a>
                ` : ''}
                <button class="icon-btn btn-audio" data-speak="${it.reading || searchTarget}" title="Nghe phát âm" style="width:34px; height:34px; font-size:0.95rem;">🔊</button>
              </div>
            </div>
            <div class="word-meaning" style="white-space: pre-line; line-height:1.6; font-size:0.95rem; color:var(--text-secondary); margin-top:8px;">${it.meaning || ''}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function attachCardListeners() {
    container.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) SpeechHelper.speak(text);
      });
    });

    // Từ ghép minh họa trong Tiền tố/Hậu tố
    container.querySelectorAll('.extra-word-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-audio') || e.target.closest('a')) return;
        e.stopPropagation();
        const searchWord = row.getAttribute('data-search');
        if (searchWord) {
          openMazii(searchWord);
        }
      });
    });

    // Thẻ từ trong Từ tượng thanh, tượng hình & Từ đồng nghĩa
    container.querySelectorAll('.word-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-audio') || e.target.closest('a')) return;
        const searchWord = card.getAttribute('data-search');
        if (searchWord) {
          openMazii(searchWord);
        }
      });
    });
  }

  render();
}
