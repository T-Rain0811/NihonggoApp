"""
grammar_session_view.py – Màn hình Học Ngữ Pháp theo bài.
Layout: sidebar trái (danh sách bài + Quiz button) + nội dung ngữ pháp phải.
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QListWidget, QListWidgetItem, QStackedWidget, QMessageBox
)
from PyQt6.QtCore import Qt, pyqtSignal
from backend.services.data_manager import DataManager
from frontend.views.session_view import GrammarOnlyWidget
from frontend.views.quiz_view import QuizPracticeWidget


class GrammarSessionView(QWidget):
    go_back = pyqtSignal()            # Quay về GrammarHub

    def __init__(self, parent=None):
        super().__init__(parent)
        self.session_keys = DataManager.get_grammar_session_keys()
        self._grammar_widgets = {}     # lazy cache: {key: GrammarOnlyWidget}
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

        btn_back = QPushButton("← Ngữ Pháp")
        btn_back.setObjectName("BtnBack")
        btn_back.clicked.connect(self.go_back.emit)

        hdr_lay.addWidget(btn_back)
        hdr_lay.addStretch()
        sb.addWidget(hdr)

        # Danh sách bài có checkbox
        self.sidebar_list = QListWidget()
        self.sidebar_list.setObjectName("GrammarSidebarList")
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

        # Nút Quiz (duy nhất bên dưới)
        btn_quiz = QPushButton("🎯  Ôn Ngữ Pháp")
        btn_quiz.setObjectName("BtnAction")
        btn_quiz.setMinimumHeight(50)
        btn_quiz.clicked.connect(self._on_quiz)
        sb.addWidget(btn_quiz)

        root.addWidget(sidebar)

        # ── Content area ─────────────────────────────────────────────────────
        self.content_stack = QStackedWidget()

        welcome = QWidget()
        wl = QVBoxLayout(welcome)
        wl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl_w = QLabel("← Click vào bài để xem kiến thức ngữ pháp")
        lbl_w.setStyleSheet("font-size:15px;color:#9CA3AF;")
        lbl_w.setAlignment(Qt.AlignmentFlag.AlignCenter)
        wl.addWidget(lbl_w)
        self.content_stack.addWidget(welcome)
        
        self.quiz_view = QuizPracticeWidget()
        self.content_stack.addWidget(self.quiz_view)

        root.addWidget(self.content_stack, 1)

        # Chọn bài đầu tiên mặc định
        if self.sidebar_list.count() > 0:
            self.sidebar_list.setCurrentRow(0)

    # ─── Lazy load ───────────────────────────────────────────────────────────
    def _get_or_create(self, key):
        if key not in self._grammar_widgets:
            _, grammar = DataManager.get_session_data(key)
            w = GrammarOnlyWidget(grammar)
            self._grammar_widgets[key] = w
            self.content_stack.addWidget(w)
        return self._grammar_widgets[key]

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

    def _on_quiz(self):
        selected = self._get_checked_sessions()
        if not selected:
            QMessageBox.warning(
                self, "Cảnh báo",
                "Vui lòng tick ✔ ít nhất một bài để ôn trắc nghiệm!"
            )
            return
            
        self.quiz_view.load_questions(selected)
        if not self.quiz_view.questions:
            QMessageBox.information(
                self, "Thông báo",
                "Không tìm thấy câu hỏi cho bài đã chọn."
            )
            return
            
        self.content_stack.setCurrentWidget(self.quiz_view)
