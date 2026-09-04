import random
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QGridLayout, QScrollArea
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont
from backend.services.data_manager import DataManager

class QuizPracticeWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.questions = []
        self.wrong_questions = []
        self.original_sessions = []
        self.current_idx = 0
        self.correct_count = 0
        self.wrong_count = 0
        
        self.setup_ui()

    def setup_ui(self):
        self.layout = QVBoxLayout(self)
        
        # Header
        header_layout = QHBoxLayout()
        self.lbl_progress = QLabel("Câu: 0/0")
        self.lbl_progress.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        self.lbl_stats = QLabel("Đúng: 0 | Sai: 0")
        self.lbl_stats.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        self.lbl_stats.setStyleSheet("color: #6B7280;")
        
        header_layout.addWidget(self.lbl_progress)
        header_layout.addStretch()
        header_layout.addWidget(self.lbl_stats)
        
        self.layout.addLayout(header_layout)
        
        # Center Area
        self.center_widget = QWidget()
        center_layout = QVBoxLayout(self.center_widget)
        center_layout.addStretch()
        
        # Question area
        self.lbl_question = QLabel("Đang tải câu hỏi...")
        self.lbl_question.setObjectName("QuizQuestion")
        self.lbl_question.setWordWrap(True)
        self.lbl_question.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.lbl_question.setMinimumHeight(120)
        center_layout.addWidget(self.lbl_question)
        
        # Hiragana area
        self.lbl_hiragana = QLabel("")
        self.lbl_hiragana.setWordWrap(True)
        self.lbl_hiragana.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.lbl_hiragana.setStyleSheet("color: #0F766E; font-size: 16px; font-weight: bold; margin-bottom: 5px;")
        self.lbl_hiragana.hide()
        center_layout.addWidget(self.lbl_hiragana)
        
        # Translation area
        self.lbl_translation = QLabel("")
        self.lbl_translation.setWordWrap(True)
        self.lbl_translation.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.lbl_translation.setStyleSheet("color: #4B5563; font-style: italic; margin-bottom: 20px;")
        self.lbl_translation.hide()
        center_layout.addWidget(self.lbl_translation)
        
        # Options area (Grid 2x2)
        self.grid_options = QGridLayout()
        self.btn_options = {}
        for idx, key in enumerate(["A", "B", "C", "D"]):
            btn = QPushButton()
            btn.setObjectName("QuizOptionBtn")
            btn.setMinimumHeight(60)
            btn.clicked.connect(lambda checked, k=key: self.check_answer(k))
            self.btn_options[key] = btn
            self.grid_options.addWidget(btn, idx // 2, idx % 2)
            
        center_layout.addLayout(self.grid_options)
        
        # Grammar explanation area
        self.lbl_explanation = QLabel("")
        self.lbl_explanation.setWordWrap(True)
        self.lbl_explanation.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.lbl_explanation.setStyleSheet("color: #1D4ED8; font-weight: bold; margin-top: 20px;")
        self.lbl_explanation.hide()
        center_layout.addWidget(self.lbl_explanation)
        
        center_layout.addStretch()
        self.layout.addWidget(self.center_widget, 1)
        
        # Result Area
        self.result_widget = QWidget()
        result_layout = QVBoxLayout(self.result_widget)
        
        self.lbl_result_title = QLabel("🎉 HOÀN THÀNH!")
        self.lbl_result_title.setFont(QFont("Arial", 24, QFont.Weight.Bold))
        self.lbl_result_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        result_layout.addWidget(self.lbl_result_title)
        
        self.lbl_result_summary = QLabel()
        self.lbl_result_summary.setFont(QFont("Arial", 14))
        self.lbl_result_summary.setAlignment(Qt.AlignmentFlag.AlignCenter)
        result_layout.addWidget(self.lbl_result_summary)
        
        self.scroll_result = QScrollArea()
        self.scroll_result.setWidgetResizable(True)
        self.scroll_result.setStyleSheet("QScrollArea { border: none; background-color: transparent; }")
        self.content_result = QWidget()
        self.content_result.setStyleSheet("background-color: transparent;")
        self.layout_result = QVBoxLayout(self.content_result)
        self.scroll_result.setWidget(self.content_result)
        result_layout.addWidget(self.scroll_result, 1)
        
        btn_layout_result = QHBoxLayout()
        self.btn_retry_all = QPushButton("Làm lại từ đầu")
        self.btn_retry_all.setObjectName("BtnStart")
        self.btn_retry_all.clicked.connect(self.retry_all)
        self.btn_retry_wrong = QPushButton("Làm lại câu sai")
        self.btn_retry_wrong.setObjectName("BtnHard")
        self.btn_retry_wrong.clicked.connect(self.retry_wrong)
        btn_layout_result.addStretch()
        btn_layout_result.addWidget(self.btn_retry_all)
        btn_layout_result.addWidget(self.btn_retry_wrong)
        btn_layout_result.addStretch()
        result_layout.addLayout(btn_layout_result)
        
        self.layout.addWidget(self.result_widget, 1)
        self.result_widget.hide()
        
        # Next & Finish buttons
        self.btn_next = QPushButton("Câu tiếp theo")
        self.btn_next.setObjectName("BtnStart")
        self.btn_next.setMinimumHeight(50)
        self.btn_next.clicked.connect(self.next_question)
        self.btn_next.hide()
        
        self.btn_finish = QPushButton("Kết thúc")
        self.btn_finish.setObjectName("BtnForget")
        self.btn_finish.setMinimumHeight(50)
        self.btn_finish.clicked.connect(self.finish_quiz)
        self.btn_finish.hide()
        
        footer = QHBoxLayout()
        footer.addStretch()
        footer.addWidget(self.btn_next)
        footer.addWidget(self.btn_finish)
        footer.addStretch()
        self.layout.addLayout(footer)

    def load_questions(self, sessions):
        self.original_sessions = sessions
        questions_pool = DataManager.get_grammar_quiz_for_sessions(sessions)
        self.start_quiz_with_pool(questions_pool)

    def start_quiz_with_pool(self, questions_pool):
        self.questions = questions_pool
        self.wrong_questions = []
        self.current_idx = 0
        self.correct_count = 0
        self.wrong_count = 0
        
        self.result_widget.hide()
        self.center_widget.show()
        self.show_question()

    def show_question(self):
        if self.current_idx >= len(self.questions):
            self.show_result()
            return
            
        q = self.questions[self.current_idx]
        self.lbl_progress.setText(f"Câu: {self.current_idx + 1}/{len(self.questions)}")
        self.lbl_stats.setText(f"Đúng: {self.correct_count} | Sai: {self.wrong_count}")
        
        self.lbl_question.setText(q.get("question", ""))
        self.lbl_translation.hide()
        self.lbl_hiragana.hide()
        self.lbl_explanation.hide()
        
        options = q.get("options", {})
        for key in ["A", "B", "C", "D"]:
            self.btn_options[key].setText(f"{key}. {options.get(key, '')}")
            self.btn_options[key].setEnabled(True)
            self.btn_options[key].setStyleSheet("") # Reset style
            
        self.btn_next.hide()

    def check_answer(self, selected_key):
        q = self.questions[self.current_idx]
        correct_key = q.get("answer", "")
        
        for key in ["A", "B", "C", "D"]:
            self.btn_options[key].setEnabled(False)
            
        if selected_key == correct_key:
            self.correct_count += 1
            self.btn_options[selected_key].setStyleSheet("background-color: #10B981; color: white;")
        else:
            self.wrong_count += 1
            self.wrong_questions.append(q)
            self.btn_options[selected_key].setStyleSheet("background-color: #EF4444; color: white;")
            if correct_key in self.btn_options:
                self.btn_options[correct_key].setStyleSheet("background-color: #10B981; color: white;")
                
        self.lbl_stats.setText(f"Đúng: {self.correct_count} | Sai: {self.wrong_count}")
        
        translation = q.get("translation", "")
        if translation:
            self.lbl_translation.setText(translation)
            self.lbl_translation.show()
            
        hiragana = q.get("hiragana", "")
        if hiragana:
            self.lbl_hiragana.setText(hiragana)
            self.lbl_hiragana.show()
            
        pattern = q.get("pattern", "")
        meaning = q.get("meaning", "Không có giải thích")
        if meaning:
            self.lbl_explanation.setText(f"Ngữ pháp: {pattern}\nGiải thích: {meaning}")
            self.lbl_explanation.show()
        
        if self.current_idx == len(self.questions) - 1:
            self.btn_finish.show()
        else:
            self.btn_next.show()

    def next_question(self):
        self.current_idx += 1
        self.show_question()
        
    def show_result(self):
        self.center_widget.hide()
        self.result_widget.show()
        self.lbl_result_summary.setText(f"Số điểm của bạn: {self.correct_count} / {len(self.questions)}")
        
        if not self.wrong_questions:
            self.btn_retry_wrong.hide()
        else:
            self.btn_retry_wrong.show()
            
        for i in reversed(range(self.layout_result.count())): 
            w = self.layout_result.itemAt(i).widget()
            if w:
                w.setParent(None)
                
        for q in self.wrong_questions:
            w = QWidget()
            w.setStyleSheet("background-color: #FEE2E2; border-radius: 8px; margin: 4px; padding: 10px;")
            w_layout = QVBoxLayout(w)
            
            lbl_q = QLabel(q.get("question", ""))
            lbl_q.setFont(QFont("Arial", 12, QFont.Weight.Bold))
            w_layout.addWidget(lbl_q)
            
            pattern = q.get("pattern", "")
            meaning = q.get("meaning", "Không có giải thích")
            
            lbl_exp = QLabel(f"Ngữ pháp: {pattern}\nGiải thích: {meaning}")
            lbl_exp.setStyleSheet("color: #DC2626; margin-bottom: 5px;")
            w_layout.addWidget(lbl_exp)
            
            # Show hiragana and translation on the result screen too
            hira = q.get("hiragana", "")
            if hira:
                lbl_hira = QLabel(f"Phát âm: {hira}")
                lbl_hira.setStyleSheet("color: #0F766E; font-size: 14px; font-weight: bold;")
                w_layout.addWidget(lbl_hira)
                
            trans = q.get("translation", "")
            if trans:
                lbl_trans = QLabel(f"Nghĩa: {trans}")
                lbl_trans.setStyleSheet("color: #4B5563; font-style: italic;")
                w_layout.addWidget(lbl_trans)
            
            self.layout_result.addWidget(w)
            
        self.layout_result.addStretch()
        
        self.btn_finish.show()

    def retry_all(self):
        self.load_questions(self.original_sessions)
        
    def retry_wrong(self):
        random.shuffle(self.wrong_questions)
        self.start_quiz_with_pool(self.wrong_questions.copy())

    def finish_quiz(self):
        for key in ["A", "B", "C", "D"]:
            self.btn_options[key].show()
            self.btn_options[key].setEnabled(True)
            self.btn_options[key].setStyleSheet("")
            
        self.btn_finish.hide()
        self.center_widget.show()
        self.result_widget.hide()
        if self.parentWidget() and hasattr(self.parentWidget(), 'setCurrentIndex'):
            self.parentWidget().setCurrentIndex(0)
