"""
vocab_session_view.py – Màn hình Ôn Từ Vựng theo bài.
Layout: sidebar trái (danh sách bài + Flashcard button) + nội dung từ vựng phải.
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QListWidget, QListWidgetItem, QStackedWidget, QMessageBox
)
from PyQt6.QtCore import Qt, pyqtSignal
from backend.services.data_manager import DataManager
from frontend.views.session_view import VocabOnlyWidget
from frontend.views.flashcard_view import FlashcardPracticeWidget


class VocabSessionView(QWidget):
    go_back = pyqtSignal()               # Quay về VocabHub

    def __init__(self, parent=None):
        super().__init__(parent)
        self.session_keys = DataManager.get_session_keys()
        self._vocab_widgets = {}          # lazy cache: {key: VocabOnlyWidget}
        self._build_ui()

    def _build_ui(self):
        root = QHBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Sidebar ──────────────────────────────────────────────────────────
        sidebar = QWidget()
        sidebar.setObjectName("Sidebar")
        sidebar.setFixedWidth(160)
        sb = QVBoxLayout(sidebar)
        sb.setContentsMargins(0, 0, 0, 0)
        sb.setSpacing(0)

        # Header
        hdr = QWidget()
        hdr.setObjectName("HubHeader")
        hdr.setFixedHeight(56)
        hdr_lay = QHBoxLayout(hdr)
        hdr_lay.setContentsMargins(12, 0, 12, 0)

        btn_back = QPushButton("← Từ Vựng")
        btn_back.setObjectName("BtnBack")
        btn_back.clicked.connect(self.go_back.emit)

        hdr_lay.addWidget(btn_back)
        hdr_lay.addStretch()
        sb.addWidget(hdr)

        # Danh sách bài có checkbox
        self.sidebar_list = QListWidget()
        self.sidebar_list.setSelectionMode(QListWidget.SelectionMode.SingleSelection)
        for key in self.session_keys:
            item = QListWidgetItem(f"Bài {key}")
            item.setFlags(item.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            item.setCheckState(Qt.CheckState.Unchecked)
            self.sidebar_list.addItem(item)
        self.sidebar_list.currentRowChanged.connect(self._on_session_click)
        sb.addWidget(self.sidebar_list, 1)

        # Separator
        sep = QWidget()
        sep.setFixedHeight(1)
        sep.setStyleSheet("background-color:#E5E7EB;")
        sb.addWidget(sep)

        # Nút Flashcard (duy nhất bên dưới)
        btn_fc = QPushButton("🃏  Flashcard")
        btn_fc.setObjectName("BtnAction")
        btn_fc.setMinimumHeight(50)
        btn_fc.clicked.connect(self._on_flashcard)
        sb.addWidget(btn_fc)

        root.addWidget(sidebar)

        # ── Content area ─────────────────────────────────────────────────────
        self.content_stack = QStackedWidget()

        welcome = QWidget()
        wl = QVBoxLayout(welcome)
        wl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl_w = QLabel("← Click vào bài để xem từ vựng")
        lbl_w.setStyleSheet("font-size:15px;color:#9CA3AF;")
        lbl_w.setAlignment(Qt.AlignmentFlag.AlignCenter)
        wl.addWidget(lbl_w)
        self.content_stack.addWidget(welcome)
        
        self.flashcard_view = FlashcardPracticeWidget()
        self.content_stack.addWidget(self.flashcard_view)

        root.addWidget(self.content_stack, 1)

        # Chọn bài đầu tiên mặc định
        if self.sidebar_list.count() > 0:
            self.sidebar_list.setCurrentRow(0)

    # ─── Lazy load ───────────────────────────────────────────────────────────
    def _get_or_create(self, key):
        if key not in self._vocab_widgets:
            vocab, _ = DataManager.get_session_data(key)
            w = VocabOnlyWidget(vocab)
            self._vocab_widgets[key] = w
            self.content_stack.addWidget(w)
        return self._vocab_widgets[key]

    def _on_session_click(self, row):
        if row < 0:
            return
        key = self.session_keys[row]
        self.content_stack.setCurrentWidget(self._get_or_create(key))

    def _get_checked_sessions(self):
        return [
            self.session_keys[i]
            for i in range(self.sidebar_list.count())
            if self.sidebar_list.item(i).checkState() == Qt.CheckState.Checked
        ]

    def _on_flashcard(self):
        selected = self._get_checked_sessions()
        if not selected:
            QMessageBox.warning(
                self, "Cảnh báo",
                "Vui lòng tick ✔ ít nhất một bài để học Flashcard!"
            )
            return
            
        vocab = DataManager.get_vocab_for_sessions(selected)
        if not vocab:
            QMessageBox.information(self, "Thông báo", "Không có từ vựng nào!")
            return
            
        self.flashcard_view.load_vocab(vocab)
        self.content_stack.setCurrentWidget(self.flashcard_view)
