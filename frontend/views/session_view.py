from PyQt6.QtWidgets import QWidget, QVBoxLayout, QTabWidget, QScrollArea, QLineEdit
from PyQt6.QtCore import Qt
from frontend.components.cards import VocabCard, GrammarCard
from frontend.views.mazii_view import MaziiWebDialog

class SessionWidget(QWidget):
    def __init__(self, vocab_data, grammar_data, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        
        vocab_tab = QWidget()
        vocab_layout = QVBoxLayout(vocab_tab)
        
        # Thanh tìm kiếm
        self.search_bar = QLineEdit()
        self.search_bar.setPlaceholderText("🔍 Tìm kiếm từ vựng ...")
        self.search_bar.setStyleSheet("""
            QLineEdit {
                padding: 10px 15px;
                border: 1px solid #D1D5DB;
                border-radius: 8px;
                font-size: 14px;
                background-color: white;
                margin-bottom: 5px;
            }
            QLineEdit:focus {
                border: 1px solid #4F46E5;
            }
        """)
        self.search_bar.textChanged.connect(self._filter_vocab)
        vocab_layout.addWidget(self.search_bar)
        
        scroll_v = QScrollArea()
        scroll_v.setWidgetResizable(True)
        content_v = QWidget()
        layout_v = QVBoxLayout(content_v)
        
        self.vocab_cards = []
        for item in vocab_data:
            card = VocabCard(item)
            card.clicked.connect(self._open_mazii)
            layout_v.addWidget(card)
            self.vocab_cards.append((card, item))
            
        layout_v.addStretch()
        scroll_v.setWidget(content_v)
        vocab_layout.addWidget(scroll_v)
        
        grammar_tab = QWidget()
        grammar_layout = QVBoxLayout(grammar_tab)
        scroll_g = QScrollArea()
        scroll_g.setWidgetResizable(True)
        content_g = QWidget()
        layout_g = QVBoxLayout(content_g)
        for item in grammar_data:
            layout_g.addWidget(GrammarCard(item))
        layout_g.addStretch()
        scroll_g.setWidget(content_g)
        grammar_layout.addWidget(scroll_g)
        
        self.tabs.addTab(vocab_tab, "Kiến thức Từ vựng")
        self.tabs.addTab(grammar_tab, "Kiến thức Ngữ pháp")
        
        layout.addWidget(self.tabs)

    def _open_mazii(self, word: str):
        """Mở Popup Mazii khi người dùng click vào thẻ từ vựng."""
        dialog = MaziiWebDialog(word, parent=self)
        dialog.exec()

    def _filter_vocab(self, text):
        """Lọc danh sách từ vựng theo từ khóa tìm kiếm."""
        query = text.lower()
        for card, item in self.vocab_cards:
            searchable_text = f"{item.get('word', '')} {item.get('reading', '')} {item.get('meaning', '')} {item.get('kanji_meaning', '')}".lower()
            if query in searchable_text:
                card.show()
            else:
                card.hide()
