"""home_view.py – Màn hình chính, chọn Từ Vựng hoặc Ngữ Pháp."""
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont


class HomeView(QWidget):
    go_vocab = pyqtSignal()
    go_grammar = pyqtSignal()
    go_reading = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._build_ui()

    def _build_ui(self):
        root = QVBoxLayout(self)
        root.setAlignment(Qt.AlignmentFlag.AlignCenter)
        root.setSpacing(0)
        root.setContentsMargins(0, 0, 0, 0)

        root.addStretch()

        # ── Banner ───────────────────────────────────────────────────────────
        banner = QWidget()
        banner.setObjectName("HomeBanner")
        banner.setFixedHeight(130)
        ban_lay = QVBoxLayout(banner)
        ban_lay.setAlignment(Qt.AlignmentFlag.AlignCenter)

        lbl_title = QLabel("JLPT N2 Mastery")
        lbl_title.setObjectName("HomeTitleMain")
        lbl_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        ban_lay.addWidget(lbl_title)

        lbl_sub = QLabel("Chọn chức năng bạn muốn học hôm nay")
        lbl_sub.setObjectName("HomeSubtitle")
        lbl_sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        ban_lay.addWidget(lbl_sub)

        root.addWidget(banner)

        # ── Card row ─────────────────────────────────────────────────────────
        card_row = QHBoxLayout()
        card_row.setAlignment(Qt.AlignmentFlag.AlignCenter)
        card_row.setSpacing(30)
        card_row.setContentsMargins(40, 30, 40, 30)

        card_vocab = self._make_card(
            icon="📚",
            title="Học Từ Vựng",
            desc="Flashcard, ôn theo bài,\ntiền tố, tượng hình tượng thanh",
            btn_text="Vào Từ Vựng",
            btn_obj="BtnStart",
            signal=self.go_vocab,
        )

        card_grammar = self._make_card(
            icon="✍️",
            title="Học Ngữ Pháp",
            desc="Học theo bài, ôn trắc nghiệm,\nlàm bài tập Drill N2",
            btn_text="Vào Ngữ Pháp",
            btn_obj="BtnEasy",
            signal=self.go_grammar,
        )

        card_reading = self._make_card(
            icon="📖",
            title="Đọc Hiểu",
            desc="Luyện 180 câu hỏi đọc hiểu,\nđoạn văn và trắc nghiệm",
            btn_text="Vào Đọc Hiểu",
            btn_obj="BtnHard",
            signal=self.go_reading,
        )

        card_row.addWidget(card_vocab)
        card_row.addWidget(card_grammar)
        card_row.addWidget(card_reading)
        root.addLayout(card_row)
        root.addStretch()

    def _make_card(self, icon, title, desc, btn_text, btn_obj, signal):
        card = QWidget()
        card.setObjectName("HomeCard")
        card.setFixedSize(280, 240)
        lay = QVBoxLayout(card)
        lay.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lay.setSpacing(12)

        lbl_icon = QLabel(icon)
        lbl_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl_icon.setStyleSheet("font-size:52px;")
        lay.addWidget(lbl_icon)

        lbl_title = QLabel(title)
        lbl_title.setObjectName("HomeCardTitle")
        lbl_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lay.addWidget(lbl_title)

        lbl_desc = QLabel(desc)
        lbl_desc.setObjectName("HomeCardDesc")
        lbl_desc.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl_desc.setWordWrap(True)
        lay.addWidget(lbl_desc)

        btn = QPushButton(btn_text)
        btn.setObjectName(btn_obj)
        btn.setMinimumHeight(44)
        btn.clicked.connect(signal.emit)
        lay.addWidget(btn)
        return card
