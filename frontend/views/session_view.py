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
        dialog.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose)
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


class VocabOnlyWidget(QWidget):
    """Chỉ hiển thị thẻ từ vựng (không có tab, không có ngữ pháp)."""
    def __init__(self, vocab_data, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(8)

        self.search_bar = QLineEdit()
        self.search_bar.setPlaceholderText("🔍 Tìm kiếm từ vựng ...")
        self.search_bar.setStyleSheet("""
            QLineEdit {
                padding: 10px 15px;
                border: 1px solid #D1D5DB;
                border-radius: 8px;
                font-size: 14px;
                background-color: white;
            }
            QLineEdit:focus { border: 1px solid #4F46E5; }
        """)
        self.search_bar.textChanged.connect(self._filter_vocab)
        layout.addWidget(self.search_bar)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        content = QWidget()
        inner = QVBoxLayout(content)
        inner.setSpacing(6)

        self.vocab_cards = []
        for item in vocab_data:
            from frontend.components.cards import VocabCard
            card = VocabCard(item)
            card.clicked.connect(self._open_mazii)
            inner.addWidget(card)
            self.vocab_cards.append((card, item))

        inner.addStretch()
        scroll.setWidget(content)
        layout.addWidget(scroll)

    def _open_mazii(self, word: str):
        dialog = MaziiWebDialog(word, parent=self)
        dialog.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose)
        dialog.exec()

    def _filter_vocab(self, text):
        query = text.lower()
        for card, item in self.vocab_cards:
            searchable = f"{item.get('word','')} {item.get('reading','')} {item.get('meaning','')} {item.get('kanji_meaning','')}".lower()
            card.setVisible(query in searchable)

    def reload(self, vocab_data):
        """Tải lại nội dung từ vựng mới."""
        # Xóa cards cũ
        for card, _ in self.vocab_cards:
            card.setParent(None)
            card.deleteLater()
        self.vocab_cards = []
        # Tìm inner layout
        scroll = self.findChild(QScrollArea)
        if scroll:
            content = scroll.widget()
            inner = content.layout()
            # Xóa stretch
            while inner.count():
                item = inner.takeAt(0)
                w = item.widget()
                if w:
                    w.setParent(None)
            from frontend.components.cards import VocabCard
            for item in vocab_data:
                card = VocabCard(item)
                card.clicked.connect(self._open_mazii)
                inner.addWidget(card)
                self.vocab_cards.append((card, item))
            inner.addStretch()


class GrammarOnlyWidget(QWidget):
    """Chỉ hiển thị thẻ ngữ pháp (không có tab, không có từ vựng)."""
    def __init__(self, grammar_data, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        content = QWidget()
        inner = QVBoxLayout(content)
        inner.setSpacing(6)

        from frontend.components.cards import GrammarCard
        for item in grammar_data:
            inner.addWidget(GrammarCard(item))
        inner.addStretch()
        scroll.setWidget(content)
        layout.addWidget(scroll)
