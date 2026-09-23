"""
reading_view.py - Màn hình làm bài tập Đọc Hiểu N2
Hiển thị đoạn văn nửa trên, câu hỏi nửa dưới.
Tự động chuyển tiếp giữa các test trong một day.
"""
import os
import json
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QScrollArea, QFrame, QGridLayout, QProgressBar, QMessageBox, QSplitter, QTextEdit
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QFont
from backend.services.data_manager import DataManager
from backend.services.progress_manager import ProgressManager

class ReadingPracticeWidget(QWidget):
    navigate_back = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.drill_type = "reading"
        self.lesson_list = []
        self.current_data = None
        
        self.tests = [] # List of parts (tests)
        self.current_test_idx = 0
        self.current_q_idx = 0 # within current test
        
        self.correct_count = 0
        self.total_questions = 0
        self.wrong_questions = []
        
        self.timer_seconds = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._answered = False

        self._build_ui()
        self._load_lesson_list()

    def _build_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # Header
        header = QWidget()
        header.setObjectName("DrillHeader")
        header.setFixedHeight(60)
        h_lay = QHBoxLayout(header)
        h_lay.setContentsMargins(16, 0, 16, 0)

        btn_back = QPushButton("← Quay lại")
        btn_back.setObjectName("BtnBack")
        btn_back.clicked.connect(self._on_back_clicked)

        self.lbl_title = QLabel("Bài Tập Đọc Hiểu N2")
        self.lbl_title.setObjectName("DrillTitle")
        self.lbl_title.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.lbl_timer = QLabel("⏱ --:--")
        self.lbl_timer.setObjectName("DrillTimer")
        self.lbl_timer.hide()

        h_lay.addWidget(btn_back)
        h_lay.addStretch()
        h_lay.addWidget(self.lbl_title)
        h_lay.addStretch()
        h_lay.addWidget(self.lbl_timer)
        root.addWidget(header)

        # Stacked pages
        self.page_select = self._build_select_page()
        self.page_quiz = self._build_quiz_page()
        self.page_result = self._build_result_page()

        for p in [self.page_select, self.page_quiz, self.page_result]:
            root.addWidget(p, 1)

        self._show_page(self.page_select)

    def reset_view(self):
        self._timer.stop()
        self._show_page(self.page_select)

    def _on_back_clicked(self):
        if self.page_quiz.isVisible():
            reply = QMessageBox.question(
                self, "Xác nhận thoát", "Bạn có chắc chắn muốn thoát khỏi bài làm? Tiến trình sẽ không được lưu.",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No, QMessageBox.StandardButton.No
            )
            if reply == QMessageBox.StandardButton.No:
                return
        self.reset_view()
        self.navigate_back.emit()

    def _build_select_page(self):
        page = QWidget()
        lay = QVBoxLayout(page)
        lay.setSpacing(20)

        lbl = QLabel("📖 Chọn bài Đọc Hiểu để làm:")
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl.setStyleSheet("font-size:22px;font-weight:bold;color:#1E293B; margin-bottom: 20px;")
        lay.addWidget(lbl)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")

        container = QWidget()
        container_lay = QVBoxLayout(container)
        container_lay.setAlignment(Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignTop)

        self.grid_widget = QWidget()
        self.grid_layout = QGridLayout(self.grid_widget)
        self.grid_layout.setSpacing(16)
        
        container_lay.addWidget(self.grid_widget)
        scroll.setWidget(container)

        lay.addWidget(scroll, 1)
        return page

    def _build_quiz_page(self):
        page = QWidget()
        lay = QVBoxLayout(page)
        lay.setContentsMargins(16, 16, 16, 16)
        lay.setSpacing(12)

        # Progress
        prog_row = QHBoxLayout()
        self.lbl_progress = QLabel("Câu 1")
        self.lbl_progress.setStyleSheet("font-size:13px;font-weight:bold;color:#64748B;")
        self.lbl_stats = QLabel("✅ 0  ❌ 0")
        self.lbl_stats.setStyleSheet("font-size:13px;font-weight:bold;color:#64748B;")
        
        # Test instruction label
        self.lbl_instruction = QLabel("")
        self.lbl_instruction.setStyleSheet("font-size:14px;font-weight:bold;color:#4338CA;")
        
        prog_row.addWidget(self.lbl_instruction)
        prog_row.addStretch()
        prog_row.addWidget(self.lbl_progress)
        prog_row.addSpacing(20)
        prog_row.addWidget(self.lbl_stats)
        lay.addLayout(prog_row)

        self.progress_bar = QProgressBar()
        self.progress_bar.setObjectName("DrillProgressBar")
        self.progress_bar.setFixedHeight(8)
        self.progress_bar.setTextVisible(False)
        lay.addWidget(self.progress_bar)

        # Main Splitter (Left / Right)
        self.main_splitter = QSplitter(Qt.Orientation.Horizontal)
        lay.addWidget(self.main_splitter, 1)

        # Left Splitter for top(passage)/bottom(questions)
        self.left_splitter = QSplitter(Qt.Orientation.Vertical)
        self.main_splitter.addWidget(self.left_splitter)
        
        # Top: Passage
        self.lbl_passage = QTextEdit()
        self.lbl_passage.setReadOnly(True)
        self.lbl_passage.setStyleSheet("QTextEdit { font-family: 'Noto Sans JP', 'Noto Serif JP', 'Meiryo', sans-serif; font-size: 18px; color: #1E293B; padding: 20px; background-color: #FAFAF9; border-radius: 8px; border: 1px solid #E5E7EB; }")
        self.left_splitter.addWidget(self.lbl_passage)
        
        # Bottom: Questions
        self.q_scroll = QScrollArea()
        self.q_scroll.setWidgetResizable(True)
        self.q_scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        self.q_container = QWidget()
        self.q_layout = QVBoxLayout(self.q_container)
        self.q_layout.setContentsMargins(0, 10, 0, 0)
        
        self.q_scroll.setWidget(self.q_container)
        self.left_splitter.addWidget(self.q_scroll)
        
        # Default sizes for left splitter (50/50)
        self.left_splitter.setSizes([300, 300])

        # Right: Explanation
        self.exp_scroll = QScrollArea()
        self.exp_scroll.setWidgetResizable(True)
        self.exp_scroll.setStyleSheet("QScrollArea { border: 1px solid #FCD34D; border-radius: 8px; background: #FEF3C7; } QWidget#ExpContainer { background: transparent; }")
        
        exp_container = QWidget()
        exp_container.setObjectName("ExpContainer")
        exp_lay = QVBoxLayout(exp_container)
        
        self.lbl_explanation = QLabel("")
        self.lbl_explanation.setObjectName("DrillExplanation")
        self.lbl_explanation.setStyleSheet("color: #92400E; font-size: 16px; padding: 10px;")
        self.lbl_explanation.setWordWrap(True)
        self.lbl_explanation.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        
        exp_lay.addWidget(self.lbl_explanation)
        exp_lay.addStretch()
        self.exp_scroll.setWidget(exp_container)
        
        self.main_splitter.addWidget(self.exp_scroll)
        self.exp_scroll.hide()
        
        self.main_splitter.setSizes([700, 300])

        # Footer
        footer = QHBoxLayout()
        self.btn_next = QPushButton("Câu tiếp theo →")
        self.btn_next.setObjectName("BtnStart")
        self.btn_next.setMinimumHeight(48)
        self.btn_next.setMinimumWidth(160)
        self.btn_next.clicked.connect(self._next_question)
        self.btn_next.hide()

        footer.addStretch()
        footer.addWidget(self.btn_next)
        footer.addStretch()
        lay.addLayout(footer)

        return page

    def _build_result_page(self):
        page = QWidget()
        lay = QVBoxLayout(page)
        lay.setContentsMargins(30, 20, 30, 20)
        
        self.lbl_result_title = QLabel("🎉 Hoàn thành!")
        self.lbl_result_title.setFont(QFont("Segoe UI", 22, QFont.Weight.Bold))
        self.lbl_result_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lay.addWidget(self.lbl_result_title)

        self.lbl_result_score = QLabel()
        self.lbl_result_score.setFont(QFont("Segoe UI", 14))
        self.lbl_result_score.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lay.addWidget(self.lbl_result_score)
        
        lay.addStretch()
        
        btn_row = QHBoxLayout()
        btn_home = QPushButton("← Chọn bài khác")
        btn_home.setObjectName("BtnStart")
        btn_home.setMinimumHeight(48)
        btn_home.clicked.connect(lambda: self._show_page(self.page_select))
        btn_row.addStretch()
        btn_row.addWidget(btn_home)
        btn_row.addStretch()
        lay.addLayout(btn_row)
        return page

    def _load_lesson_list(self):
        self.lesson_list = DataManager.get_drill_lesson_list(self.drill_type)
        
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
                
        for i, les in enumerate(self.lesson_list):
            btn_title = f"Bài {les.get('lesson', i+1)}"
            btn = QPushButton(btn_title)
            filename = les["filename"]
            
            is_completed = ProgressManager.is_drill_completed(self.drill_type, filename)
            is_perfect = ProgressManager.is_drill_perfect(self.drill_type, filename)
            
            if is_perfect:
                btn.setObjectName("BtnEasy")
            elif is_completed:
                btn.setObjectName("BtnHard")
            else:
                btn.setObjectName("BtnStart")
                
            btn.setFixedSize(140, 60)
            btn.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
            btn.clicked.connect(lambda _, f=filename: self._start_drill_from_filename(f))
            self.grid_layout.addWidget(btn, i // 4, i % 4)

    def _show_page(self, page):
        for p in [self.page_select, self.page_quiz, self.page_result]:
            p.setVisible(p is page)
        if page is self.page_quiz:
            self.lbl_timer.show()
        else:
            self.lbl_timer.hide()

    def _start_drill_from_filename(self, filename):
        self.current_data = DataManager.load_drill_lesson(filename, self.drill_type)
        if not self.current_data:
            return
        self.current_filename = filename

        self.tests = self.current_data.get("parts", [])
        self.total_questions = sum(len(t.get("questions", [])) for t in self.tests)
        
        self.current_test_idx = 0
        self.current_q_idx = 0
        self.correct_count = 0
        self.wrong_questions = []
        self._current_test_num_for_timer = None
        self.timer_seconds = 0
        self._timer.start(1000)

        lesson_num = self.current_data.get("lesson", 1)
        self.lbl_title.setText(f"Đọc Hiểu - Bài {lesson_num}")
        self.progress_bar.setMaximum(self.total_questions)
        self.progress_bar.setValue(0)

        self._show_page(self.page_quiz)
        self._show_question()

    def _tick(self):
        self.timer_seconds -= 1
        if self.timer_seconds <= 0:
            self._timer.stop()
            self.lbl_timer.setText("⏱ 00:00")
            self._show_results()
        else:
            m, s = divmod(self.timer_seconds, 60)
            self.lbl_timer.setText(f"⏱ {m:02d}:{s:02d}")
            if self.timer_seconds <= 60:
                self.lbl_timer.setStyleSheet("color:#EF4444;font-weight:bold;")
            else:
                self.lbl_timer.setStyleSheet("color:#4338CA;")

    def _clear_q_layout(self):
        while self.q_layout.count():
            item = self.q_layout.takeAt(0)
            w = item.widget()
            if w: w.deleteLater()

    def _show_question(self):
        if self.current_test_idx >= len(self.tests):
            self._show_results()
            return
            
        test_data = self.tests[self.current_test_idx]
        questions = test_data.get("questions", [])
        
        if self.current_q_idx >= len(questions):
            self.current_test_idx += 1
            self.current_q_idx = 0
            self._show_question()
            return

        self._answered = False
        q = questions[self.current_q_idx]
        
        # Check if we need to reset timer for a new Test
        instruction = test_data.get("instruction", "")
        import re
        match = re.search(r'Test\s*(\d+)\s*\((\d+)\s*phút\)', instruction, re.IGNORECASE)
        if match:
            test_num = match.group(1)
            test_mins = int(match.group(2))
            if getattr(self, '_current_test_num_for_timer', None) != test_num:
                self._current_test_num_for_timer = test_num
                self.timer_seconds = test_mins * 60
                if not self._timer.isActive():
                    self._timer.start(1000)
        
        # Calculate current global question number
        global_idx = sum(len(self.tests[i].get("questions", [])) for i in range(self.current_test_idx)) + self.current_q_idx
        
        self.lbl_progress.setText(f"Câu {global_idx + 1} / {self.total_questions}")
        self.lbl_stats.setText(f"✅ {self.correct_count}  ❌ {len(self.wrong_questions)}")
        self.progress_bar.setValue(global_idx)
        self.lbl_explanation.hide()
        self.btn_next.hide()

        self.lbl_instruction.setText(test_data.get("instruction", f"Test {self.current_test_idx + 1}"))
        self.lbl_passage.setPlainText(test_data.get("passage", ""))
        
        self._clear_q_layout()
        self.exp_scroll.hide()

        lbl_q = QLabel(f"Câu {self.current_q_idx + 1}: {q['text']}")
        lbl_q.setStyleSheet("font-family: 'Noto Sans JP', 'Noto Serif JP', 'Meiryo', sans-serif; font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 12px;")
        lbl_q.setWordWrap(True)
        self.q_layout.addWidget(lbl_q)

        self._mc_btns = []
        for i, opt in enumerate(q["options"]):
            btn = QPushButton(opt)
            btn.setObjectName("QuizOptionBtn")
            btn.setStyleSheet("font-family: 'Noto Sans JP', 'Noto Serif JP', 'Meiryo', sans-serif; font-size: 16px; padding: 16px; text-align: left;")
            btn.clicked.connect(lambda _, idx=i: self._check_answer(idx))
            self._mc_btns.append(btn)
            self.q_layout.addWidget(btn)
        
        self.q_layout.addStretch()
        # Scroll to top of passage
        self.lbl_passage.verticalScrollBar().setValue(0)

    def _check_answer(self, chosen_idx):
        if self._answered: return
        self._answered = True
        
        q = self.tests[self.current_test_idx]["questions"][self.current_q_idx]
        correct_idx = q["correct_answer"] - 1
        
        for i, btn in enumerate(self._mc_btns):
            btn.setEnabled(False)
            if i == correct_idx:
                btn.setStyleSheet("background-color:#10B981;color:white;border-radius:8px;font-family: 'Noto Sans JP', 'Noto Serif JP', 'Meiryo', sans-serif; font-size: 16px; padding: 16px; text-align: left;")
            elif i == chosen_idx:
                btn.setStyleSheet("background-color:#EF4444;color:white;border-radius:8px;font-family: 'Noto Sans JP', 'Noto Serif JP', 'Meiryo', sans-serif; font-size: 16px; padding: 16px; text-align: left;")
            else:
                btn.setStyleSheet("background-color:#F3F4F6;color:#9CA3AF;border-radius:8px;font-family: 'Noto Sans JP', 'Noto Serif JP', 'Meiryo', sans-serif; font-size: 16px; padding: 16px; text-align: left;")

        if chosen_idx == correct_idx:
            self.correct_count += 1
        else:
            self.wrong_questions.append(q)

        self.lbl_stats.setText(f"✅ {self.correct_count}  ❌ {len(self.wrong_questions)}")
        
        exp = q.get("explanation_vi") or q.get("explanation")
        if exp:
            self.lbl_explanation.setText(f"<b>💡 Giải thích:</b><br><br>{exp.replace(chr(10), '<br>')}")
            self.lbl_explanation.show()
            self.exp_scroll.widget().show()
            self.exp_scroll.show()
            self.main_splitter.setSizes([600, 400])
        
        is_last = (self.current_test_idx == len(self.tests) - 1 and self.current_q_idx == len(self.tests[-1]["questions"]) - 1)
        if is_last:
            self.btn_next.setText("🏁 Kết thúc")
        else:
            self.btn_next.setText("Câu tiếp theo →")
        self.btn_next.show()

    def _next_question(self):
        self.current_q_idx += 1
        self._show_question()

    def _show_results(self):
        self._timer.stop()
        score = self.correct_count
        pct = int(score / max(1, self.total_questions) * 100) if self.total_questions > 0 else 0

        if pct >= 80: grade = "🌟 Xuất sắc!"
        elif pct >= 60: grade = "👍 Khá tốt!"
        else: grade = "📚 Cần cố gắng hơn!"
            
        if pct >= 60 and hasattr(self, 'current_filename') and self.current_filename:
            is_perfect = (pct == 100)
            ProgressManager.mark_drill_completed(self.drill_type, self.current_filename, is_perfect=is_perfect)
            self._load_lesson_list()

        self.lbl_result_title.setText(grade)
        self.lbl_result_score.setText(f"Kết quả: {score} / {self.total_questions} câu đúng ({pct}%)")
        self._show_page(self.page_result)
