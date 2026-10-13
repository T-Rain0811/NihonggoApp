// Text-to-Speech Helper for Japanese Pronunciation (Web Speech API)
let cachedVoices = [];

function loadVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export const SpeechHelper = {
  /**
   * Làm sạch chuỗi trước khi đọc:
   * 1. Ưu tiên lấy phần phiên âm Hiragana/Katakana nếu có nằm trong ngoặc (ví dụ: '大家（おおや）' -> 'おおや')
   * 2. Loại bỏ các ký tự đặc biệt, dấu lượn sóng ngữ pháp (～, 〜), gạch chéo (/), dấu chấm tròn (・),...
   */
  cleanText(input) {
    if (!input) return '';
    let text = String(input).trim();

    // Nếu có dạng "Kanji（Kana）", ưu tiên trích xuất phần Kana chuẩn xác để phát âm
    const kanaParenMatch = text.match(/[（(]([\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\s]+)[）)]/);
    if (kanaParenMatch && kanaParenMatch[1]) {
      text = kanaParenMatch[1].trim();
    } else {
      // Loại bỏ các ghi chú trong ngoặc đơn thông thường (ví dụ: "(tự V)", "(adj)")
      text = text.replace(/[（(][^）)]*[）)]/g, ' ');
    }

    // Loại bỏ các ký tự dấu câu / ký tự nối ngữ pháp không phải âm đọc
    text = text.replace(/[〜～~・/＝=［］\[\]「」]/g, ' ').replace(/\s+/g, ' ').trim();
    return text;
  },

  /**
   * Chọn giọng đọc tiếng Nhật tự nhiên nhất có sẵn trên thiết bị/trình duyệt
   */
  getBestVoice() {
    if (!('speechSynthesis' in window)) return null;
    if (cachedVoices.length === 0) {
      loadVoices();
    }
    const jaVoices = cachedVoices.filter(v =>
      v.lang && (v.lang.toLowerCase().startsWith('ja') || v.lang.toLowerCase().includes('jp'))
    );
    if (jaVoices.length === 0) return null;

    // Ưu tiên các giọng Online / Natural / Google / Premium tự nhiên
    const naturalVoice = jaVoices.find(v =>
      /natural|online|google|premium|enhanced|nanami|keita/i.test(v.name)
    );
    return naturalVoice || jaVoices[0];
  },

  /**
   * Phát âm từ hoặc câu tiếng Nhật:
   * - Hỗ trợ truyền vào String hoặc Object có { reading, word }
   * - Luôn ưu tiên reading (Hiragana/Katakana) để tránh TTS đọc sai âm On/Kun của Kanji
   */
  speak(target, options = {}) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    let rawText = '';
    if (typeof target === 'object' && target !== null) {
      // ƯU TIÊN READING (Hiragana/Katakana) trước để phát âm chính xác 100%
      rawText = target.reading || target.word || '';
    } else {
      rawText = target || '';
    }

    const textToSpeak = this.cleanText(rawText);
    if (!textToSpeak) return;

    // Huỷ các âm thanh đang đọc dở để tránh xếp hàng trễ
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ja-JP';
    utterance.rate = options.rate || 0.9; // Tốc độ vừa phải, chuẩn học tập

    const bestVoice = this.getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
};
