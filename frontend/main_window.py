import os
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QListWidget, QStackedWidget, QPushButton, QListWidgetItem, QMessageBox
)
from PyQt6.QtCore import Qt
from backend.services.data_manager import DataManager
from frontend.views.session_view import SessionWidget
from frontend.views.flashcard_view import FlashcardPracticeWidget
from frontend.views.quiz_view import QuizPracticeWidget

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("JLPT N2 Mastery")
        self.resize(1024, 768)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # Sidebar
        sidebar_widget = QWidget()
        sidebar_widget.setObjectName("Sidebar")
        sidebar_widget.setFixedWidth(250)
        sidebar_layout = QVBoxLayout(sidebar_widget)
        
        self.sidebar_list = QListWidget()
        self.sidebar_list.setSelectionMode(QListWidget.SelectionMode.SingleSelection)
        
        self.session_keys = DataManager.get_session_keys()
        
        for key in self.session_keys:
            item = QListWidgetItem(f"Bài {key}")
            item.setFlags(item.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            item.setCheckState(Qt.CheckState.Unchecked)
            self.sidebar_list.addItem(item)
            
        self.sidebar_list.currentRowChanged.connect(self.change_session)
        
        self.btn_practice = QPushButton("Flashcards")
        self.btn_practice.setObjectName("BtnStart")
        self.btn_practice.clicked.connect(self.start_practice)
        
        self.btn_quiz = QPushButton("Ôn Ngữ pháp")
        self.btn_quiz.setObjectName("BtnHard") 
        self.btn_quiz.clicked.connect(self.start_quiz)
        
        sidebar_layout.addWidget(self.sidebar_list)
        sidebar_layout.addWidget(self.btn_practice)
        sidebar_layout.addWidget(self.btn_quiz)
        
        # Main Content
        self.content_stack = QStackedWidget()
        
        for key in self.session_keys:
            vocab, grammar = DataManager.get_session_data(key)
            self.content_stack.addWidget(SessionWidget(vocab, grammar))
            
        self.flashcard_view = FlashcardPracticeWidget()
        self.flashcard_view_idx = self.content_stack.addWidget(self.flashcard_view)
        
        self.quiz_view = QuizPracticeWidget()
        self.quiz_view_idx = self.content_stack.addWidget(self.quiz_view)
        
        main_layout.addWidget(sidebar_widget)
        main_layout.addWidget(self.content_stack)
        
        self.load_styles()
        
        if self.sidebar_list.count() > 0:
            self.sidebar_list.setCurrentRow(0)

    def change_session(self, idx):
        if idx >= 0:
            self.content_stack.setCurrentIndex(idx)

    def start_practice(self):
        selected_sessions = []
        for i in range(self.sidebar_list.count()):
            item = self.sidebar_list.item(i)
            if item.checkState() == Qt.CheckState.Checked:
                selected_sessions.append(self.session_keys[i])
                
        if not selected_sessions:
            QMessageBox.warning(self, "Cảnh báo", "Vui lòng tick chọn ít nhất một bài học để ôn tập Flashcard!")
            return
                
        combined_vocab = DataManager.get_vocab_for_sessions(selected_sessions)
        self.flashcard_view.load_vocab(combined_vocab)
        self.content_stack.setCurrentIndex(self.flashcard_view_idx)
        self.sidebar_list.clearSelection()

    def start_quiz(self):
        selected_sessions = []
        for i in range(self.sidebar_list.count()):
            item = self.sidebar_list.item(i)
            if item.checkState() == Qt.CheckState.Checked:
                selected_sessions.append(self.session_keys[i])
                
        if not selected_sessions:
            QMessageBox.warning(self, "Cảnh báo", "Vui lòng tick chọn ít nhất một bài học để làm trắc nghiệm!")
            return
            
        self.quiz_view.load_questions(selected_sessions)
        
        if not self.quiz_view.questions:
            QMessageBox.information(self, "Thông báo", "Không tìm thấy câu hỏi trắc nghiệm nào cho bài đã chọn.")
            return
            
        self.content_stack.setCurrentIndex(self.quiz_view_idx)
        self.sidebar_list.clearSelection()

    def load_styles(self):
        style_path = os.path.join(os.path.dirname(__file__), 'assets', 'styles', 'styles.qss')
        try:
            with open(style_path, "r", encoding="utf-8") as f:
                self.setStyleSheet(f.read())
        except Exception as e:
            print(f"Cannot load styles from {style_path}: {e}")
