from PyQt6.QtWidgets import QWidget, QVBoxLayout, QTabWidget, QScrollArea
from frontend.components.cards import VocabCard, GrammarCard

class SessionWidget(QWidget):
    def __init__(self, vocab_data, grammar_data, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        
        vocab_tab = QWidget()
        vocab_layout = QVBoxLayout(vocab_tab)
        scroll_v = QScrollArea()
        scroll_v.setWidgetResizable(True)
        content_v = QWidget()
        layout_v = QVBoxLayout(content_v)
        for item in vocab_data:
            layout_v.addWidget(VocabCard(item))
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
