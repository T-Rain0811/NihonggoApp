"""
vocab_hub_view.py – Menu hub Từ Vựng (chỉ gồm 4 nút chức năng).
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton
)
from PyQt6.QtCore import Qt, pyqtSignal


class VocabHubView(QWidget):
    go_home = pyqtSignal()
    go_vocab_session = pyqtSignal()       # → VocabSessionView
    go_prefix = pyqtSignal()              # placeholder
    go_mimetic = pyqtSignal()             # placeholder
    go_synonym = pyqtSignal()             # Thêm từ đồng nghĩa
    go_vocab_drill = pyqtSignal()         # placeholder

    def __init__(self, parent=None):
        super().__init__(parent)
        self._build_ui()

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

        btn_back = QPushButton("← Trang chủ")
        btn_back.setObjectName("BtnBack")
        btn_back.clicked.connect(self.go_home.emit)

        lbl = QLabel("📚  Học Từ Vựng")
        lbl.setObjectName("HubHeaderTitle")
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)

        h_lay.addWidget(btn_back)
        h_lay.addStretch()
        h_lay.addWidget(lbl)
        h_lay.addStretch()
        root.addWidget(header)

        # ── Nội dung: 5 nút chức năng ────────────────────────────────────────
        center = QWidget()
        c_lay = QVBoxLayout(center)
        c_lay.setAlignment(Qt.AlignmentFlag.AlignCenter)
        c_lay.setSpacing(16)
        c_lay.setContentsMargins(60, 50, 60, 50)

        lbl_hint = QLabel("Chọn chức năng bạn muốn luyện tập:")
        lbl_hint.setObjectName("HubHint")
        lbl_hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        c_lay.addWidget(lbl_hint)

        buttons = [
            ("📚  Ôn từ vựng theo bài", "BtnStart",          self.go_vocab_session),
            ("📝  Ôn tiền tố JLPT N2",  "BtnHubPlaceholder", self.go_prefix),
            ("🎨  Tượng hình, tượng thanh", "BtnHubPlaceholder", self.go_mimetic),
            ("📖  Học Từ Đồng Nghĩa N2", "BtnHubPlaceholder", self.go_synonym),
            ("📋  Làm bài tập Drills từ vựng", "BtnHubPlaceholder", self.go_vocab_drill),
        ]
        for text, obj, sig in buttons:
            btn = QPushButton(text)
            btn.setObjectName(obj)
            btn.setMinimumHeight(56)
            btn.setMinimumWidth(380)
            btn.clicked.connect(sig.emit)
            c_lay.addWidget(btn, 0, Qt.AlignmentFlag.AlignHCenter)

        root.addWidget(center, 1)
