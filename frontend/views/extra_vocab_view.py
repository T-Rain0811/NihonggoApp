from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel,
    QScrollArea, QGridLayout
)
from PyQt6.QtCore import Qt, pyqtSignal
from frontend.components.cards import VocabCard


class ExtraVocabView(QWidget):
    go_back = pyqtSignal()

    def __init__(self, title, data_list, parent=None):
        super().__init__(parent)
        self.title = title
        self.data_list = data_list
        self._build_ui()
        self._load_data()

    def _build_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Header ────────────────────────────────────────────────────────────
        header = QWidget()
        header.setObjectName("HubHeader")
        header.setFixedHeight(56)
        h_lay = QHBoxLayout(header)
        h_lay.setContentsMargins(16, 0, 16, 0)

        btn_back = QPushButton("← Trở lại")
        btn_back.setObjectName("BtnBack")
        btn_back.clicked.connect(self.go_back.emit)

        lbl = QLabel(self.title)
        lbl.setObjectName("HubHeaderTitle")
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)

        h_lay.addWidget(btn_back)
        h_lay.addStretch()
        h_lay.addWidget(lbl)
        h_lay.addStretch()
        # Cân bằng khoảng trống bên phải
        placeholder = QWidget()
        placeholder.setMinimumWidth(btn_back.sizeHint().width())
        h_lay.addWidget(placeholder)
        root.addWidget(header)

        # ── Content (QScrollArea) ─────────────────────────────────────────────
        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        self.content_container = QWidget()
        self.content_container.setObjectName("ExtraContentContainer")
        
        self.grid_layout = QVBoxLayout(self.content_container)
        self.grid_layout.setContentsMargins(16, 16, 16, 16)
        self.grid_layout.setSpacing(16)
        
        self.scroll.setWidget(self.content_container)
        root.addWidget(self.scroll, 1)

    def _load_data(self):
        if not self.data_list:
            lbl = QLabel("Không có dữ liệu.")
            lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.grid_layout.addWidget(lbl, 0, 0)
            return

        from frontend.components.cards import VocabCard, PrefixCard
        
        for idx, item in enumerate(self.data_list):
            if 'words' in item:
                card = PrefixCard(item)
            else:
                card = VocabCard(item)
            
            card.clicked.connect(self._on_card_clicked)
            self.grid_layout.addWidget(card)
        self.grid_layout.addStretch()

    def _on_card_clicked(self, word):
        from frontend.views.mazii_view import MaziiWebDialog
        dialog = MaziiWebDialog(word, parent=self)
        dialog.exec()
