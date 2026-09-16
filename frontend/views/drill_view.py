"""
drill_view.py - Màn hình làm bài tập Drill (Power Drill N2 Ngữ pháp)
Hỗ trợ 3 loại câu hỏi:
  - multiple_choice: Trắc nghiệm 4 đáp án
  - star_ordering: Xếp từ vào ô, click vào nút từ để điền/hoàn trả
  - reading_fill_in_blank: Đọc đoạn văn, điền vào chỗ trống
"""
import random
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QScrollArea, QComboBox, QFrame, QGridLayout, QSizePolicy, QProgressBar,
    QMessageBox
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QFont
from backend.services.data_manager import DataManager


# ─────────────────────────────────────────────────────────────────────────────
# Star Ordering Widget
# ─────────────────────────────────────────────────────────────────────────────
class StarOrderWidget(QWidget):
    """Widget tương tác cho câu hỏi xếp sao: click từ → điền vào slot."""

    answer_filled = pyqtSignal()  # Phát khi cả 4 slot đã điền đủ

    def __init__(self, question_data, parent=None):
        super().__init__(parent)
        self.q = question_data
        self.options = self.q["options"]          # list 4 str (thứ tự gốc 1-indexed)
        self.star_pos = self.q.get("star_position", 3) - 1  # 0-indexed
        self.correct_order = self.q["correct_order"]  # list of 1-indexed option positions

        # slots[i] = index vào self.options (0-indexed), hoặc None nếu chưa điền
        self.slots = [None, None, None, None]
        self._build_ui()

    def _build_ui(self):
        main = QVBoxLayout(self)
        main.setSpacing(12)

        # Câu hỏi gốc
        lbl_q = QLabel(self.q["text"])
        lbl_q.setObjectName("DrillQuestion")
        lbl_q.setStyleSheet("font-family: 'Yu Gothic', Meiryo, sans-serif;")
        lbl_q.setWordWrap(True)
        lbl_q.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main.addWidget(lbl_q)

        main.addSpacing(10)

        lbl_hint = QLabel("👇 Chọn các từ dưới đây để xếp vào ô trống:")
        lbl_hint.setStyleSheet("color: #4338CA; font-size: 14px; font-weight: bold; font-style: italic;")
        lbl_hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main.addWidget(lbl_hint)

        # ── Hàng nút từ (4 lựa chọn) ──────────────────────────────────
        word_row = QHBoxLayout()
        word_row.setSpacing(10)
        word_row.addStretch()
        self.word_btns = []
        for i, text in enumerate(self.options):
            btn = QPushButton(text)
            btn.setObjectName("StarWordBtn")
            btn.setMinimumWidth(100)
            btn.setMinimumHeight(48)
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.clicked.connect(lambda _, idx=i: self._fill_slot(idx))
            self.word_btns.append(btn)
            word_row.addWidget(btn)
        word_row.addStretch()
        main.addLayout(word_row)

        main.addSpacing(20)

        # ── Hàng slot (4 ô điền) ──────────────────────────────────────
        slot_row = QHBoxLayout()
        slot_row.setSpacing(10)
        slot_row.addStretch()
        self.slot_btns = []
        for i in range(4):
            btn = QPushButton("　　")
            btn.setObjectName("StarSlot")
            if i == self.star_pos:
                btn.setObjectName("StarSlotStar")
                btn.setText("★")
            btn.setStyleSheet("font-family: 'Yu Gothic', Meiryo, sans-serif; font-size: 16px;")
            btn.setMinimumWidth(100)
            btn.setMinimumHeight(48)
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.clicked.connect(lambda _, idx=i: self._remove_from_slot(idx))
            self.slot_btns.append(btn)
            slot_row.addWidget(btn)
        slot_row.addStretch()
        main.addLayout(slot_row)

        # Label số thứ tự bên dưới slot
        num_row = QHBoxLayout()
        num_row.setSpacing(10)
        num_row.addStretch()
        for i in range(4):
            lbl = QLabel(f"({i+1})")
            lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            lbl.setMinimumWidth(100)
            lbl.setStyleSheet("color: #9CA3AF; font-size: 13px; font-weight: bold;")
            num_row.addWidget(lbl)
        num_row.addStretch()
        main.addLayout(num_row)

    def _fill_slot(self, word_idx):
        """Điền từ word_idx vào slot trống đầu tiên."""
        # Tìm slot trống đầu tiên
        for i in range(4):
            if self.slots[i] is None:
                self.slots[i] = word_idx
                self.slot_btns[i].setText(self.options[word_idx])
                self.slot_btns[i].setEnabled(True)
                self.word_btns[word_idx].setEnabled(False)
                break
        if all(s is not None for s in self.slots):
            self.answer_filled.emit()

    def _remove_from_slot(self, slot_idx):
        """Hoàn trả từ từ slot về nút từ."""
        word_idx = self.slots[slot_idx]
        if word_idx is None:
            return
        self.slots[slot_idx] = None
        # Khôi phục slot về trạng thái trống
        if slot_idx == self.star_pos:
            self.slot_btns[slot_idx].setText("★")
        else:
            self.slot_btns[slot_idx].setText("　　")
        self.word_btns[word_idx].setEnabled(True)

    def get_user_order(self):
        """Trả về thứ tự người dùng điền dưới dạng list 1-indexed (như correct_order)."""
        return [s + 1 if s is not None else None for s in self.slots]

    def lock_and_show_result(self, is_correct):
        """Khóa tất cả nút và hiển thị màu đúng/sai."""
        correct_colors = {True: "background-color:#10B981;color:white;border-radius:8px;",
                          False: "background-color:#EF4444;color:white;border-radius:8px;"}
        for btn in self.word_btns:
            btn.setEnabled(False)
        for i, slot_btn in enumerate(self.slot_btns):
            slot_btn.setEnabled(False)
            slot_btn.setStyleSheet(correct_colors[is_correct])

        # Nếu sai → hiển thị thứ tự đúng trên các slot
        if not is_correct:
            for i, correct_idx_1based in enumerate(self.correct_order):
                correct_text = self.options[correct_idx_1based - 1]
                self.slot_btns[i].setText(correct_text)
                self.slot_btns[i].setStyleSheet(
                    "background-color:#10B981;color:white;border-radius:8px;"
                )


# ─────────────────────────────────────────────────────────────────────────────
# Main Drill View
# ─────────────────────────────────────────────────────────────────────────────
class DrillPracticeWidget(QWidget):
    navigate_back = pyqtSignal()

    def __init__(self, drill_type="grammar", parent=None):
        super().__init__(parent)
        self.drill_type = drill_type
        self.lesson_list = []
        self.current_data = None
        self.flat_questions = []   # danh sách câu hỏi phẳng kèm part_type
        self.current_idx = 0
        self.correct_count = 0
        self.wrong_questions = []
        self.timer_seconds = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._current_star_widget = None
        self._answered = False

        self._build_ui()
        self._load_lesson_list()

    # ─── UI Setup ──────────────────────────────────────────────────────────
    def _build_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Header ──────────────────────────────────────────────────────────
        header = QWidget()
        header.setObjectName("DrillHeader")
        header.setFixedHeight(60)
        h_lay = QHBoxLayout(header)
        h_lay.setContentsMargins(16, 0, 16, 0)

        btn_back = QPushButton("← Quay lại")
        btn_back.setObjectName("BtnBack")
        btn_back.clicked.connect(self._on_back_clicked)

        title_text = "Bài Tập Drill Ngữ Pháp N2" if self.drill_type == "grammar" else "Bài Tập Drill Từ Vựng N2"
        self.lbl_title = QLabel(title_text)
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

        # ── Stacked pages ────────────────────────────────────────────────────
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
                self,
                "Xác nhận thoát",
                "Bạn có chắc chắn muốn thoát khỏi bài làm? Tiến trình sẽ không được lưu.",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                QMessageBox.StandardButton.No
            )
            if reply == QMessageBox.StandardButton.No:
                return
        
        self.reset_view()
        self.navigate_back.emit()

    def _build_select_page(self):
        page = QWidget()
        lay = QVBoxLayout(page)
        lay.setSpacing(20)

        lbl = QLabel("📖 Chọn bài Drill để làm:")
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl.setStyleSheet("font-size:22px;font-weight:bold;color:#1E293B; margin-bottom: 20px;")
        lay.addWidget(lbl)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")

        container = QWidget()
        container.setObjectName("DrillSelectContainer")
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
        lay.setContentsMargins(30, 16, 30, 16)
        lay.setSpacing(12)

        # Progress
        prog_row = QHBoxLayout()
        self.lbl_progress = QLabel("Câu 1 / 17")
        self.lbl_progress.setStyleSheet("font-size:13px;font-weight:bold;color:#64748B;")
        self.lbl_stats = QLabel("✅ 0  ❌ 0")
        self.lbl_stats.setStyleSheet("font-size:13px;font-weight:bold;color:#64748B;")
        prog_row.addWidget(self.lbl_progress)
        prog_row.addStretch()
        prog_row.addWidget(self.lbl_stats)
        lay.addLayout(prog_row)

        self.progress_bar = QProgressBar()
        self.progress_bar.setObjectName("DrillProgressBar")
        self.progress_bar.setFixedHeight(8)
        self.progress_bar.setTextVisible(False)
        lay.addWidget(self.progress_bar)

        # Part instruction
        self.lbl_instruction = QLabel("")
        self.lbl_instruction.setObjectName("DrillInstruction")
        self.lbl_instruction.setWordWrap(True)
        self.lbl_instruction.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lay.addWidget(self.lbl_instruction)

        # Scrollable question area
        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setStyleSheet("QScrollArea{border:none;background:transparent;}")
        self.q_container = QWidget()
        self.q_container.setStyleSheet("background:transparent;")
        self.q_layout = QVBoxLayout(self.q_container)
        self.q_layout.setContentsMargins(0, 0, 0, 0)
        self.scroll.setWidget(self.q_container)
        lay.addWidget(self.scroll, 1)

        # Explanation (shown after answering)
        self.lbl_explanation = QLabel("")
        self.lbl_explanation.setObjectName("DrillExplanation")
        self.lbl_explanation.setWordWrap(True)
        self.lbl_explanation.setAlignment(Qt.AlignmentFlag.AlignLeft)
        self.lbl_explanation.hide()
        lay.addWidget(self.lbl_explanation)

        # Footer buttons
        footer = QHBoxLayout()
        self.btn_check = QPushButton("✔  Kiểm tra")
        self.btn_check.setObjectName("BtnEasy")
        self.btn_check.setMinimumHeight(48)
        self.btn_check.setMinimumWidth(160)
        self.btn_check.clicked.connect(self._check_star_answer)
        self.btn_check.hide()

        self.btn_next = QPushButton("Câu tiếp theo →")
        self.btn_next.setObjectName("BtnStart")
        self.btn_next.setMinimumHeight(48)
        self.btn_next.setMinimumWidth(160)
        self.btn_next.clicked.connect(self._next_question)
        self.btn_next.hide()

        self.btn_finish_quiz = QPushButton("🏁  Kết thúc bài")
        self.btn_finish_quiz.setObjectName("BtnForget")
        self.btn_finish_quiz.setMinimumHeight(48)
        self.btn_finish_quiz.setMinimumWidth(160)
        self.btn_finish_quiz.clicked.connect(self._show_results)
        self.btn_finish_quiz.hide()

        footer.addStretch()
        footer.addWidget(self.btn_check)
        footer.addWidget(self.btn_next)
        footer.addWidget(self.btn_finish_quiz)
        footer.addStretch()
        lay.addLayout(footer)
        return page

    def _build_result_page(self):
        page = QWidget()
        lay = QVBoxLayout(page)
        lay.setContentsMargins(30, 20, 30, 20)
        lay.setSpacing(16)

        self.lbl_result_title = QLabel("🎉 Hoàn thành!")
        self.lbl_result_title.setFont(QFont("Segoe UI", 22, QFont.Weight.Bold))
        self.lbl_result_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lay.addWidget(self.lbl_result_title)

        self.lbl_result_score = QLabel()
        self.lbl_result_score.setFont(QFont("Segoe UI", 14))
        self.lbl_result_score.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lay.addWidget(self.lbl_result_score)

        # Wrong questions review
        scroll_r = QScrollArea()
        scroll_r.setWidgetResizable(True)
        scroll_r.setStyleSheet("QScrollArea{border:none;background:transparent;}")
        self.result_content = QWidget()
        self.result_content.setStyleSheet("background:transparent;")
        self.result_layout = QVBoxLayout(self.result_content)
        scroll_r.setWidget(self.result_content)
        lay.addWidget(scroll_r, 1)

        btn_row = QHBoxLayout()
        btn_retry = QPushButton("🔄  Làm lại từ đầu")
        btn_retry.setObjectName("BtnStart")
        btn_retry.setMinimumHeight(48)
        btn_retry.clicked.connect(self._retry_drill)
        btn_home = QPushButton("← Chọn bài khác")
        btn_home.setObjectName("BtnHard")
        btn_home.setMinimumHeight(48)
        btn_home.clicked.connect(lambda: self._show_page(self.page_select))
        btn_row.addStretch()
        btn_row.addWidget(btn_retry)
        btn_row.addWidget(btn_home)
        btn_row.addStretch()
        lay.addLayout(btn_row)
        return page

    # ─── Lesson list ────────────────────────────────────────────────────────
    def _load_lesson_list(self):
        self.lesson_list = DataManager.get_drill_lesson_list(self.drill_type)
        
        # Clear existing buttons
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
                
        for i, les in enumerate(self.lesson_list):
            btn = QPushButton(f"第{les['lesson']:02d}回")
            btn.setObjectName("BtnStart")
            btn.setFixedSize(120, 60)
            btn.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
            filename = les["filename"]
            btn.clicked.connect(lambda _, f=filename: self._start_drill_from_filename(f))
            self.grid_layout.addWidget(btn, i // 4, i % 4)

        if not self.lesson_list:
            lbl = QLabel("(Không tìm thấy bài nào)")
            self.grid_layout.addWidget(lbl, 0, 0)

    # ─── Page management ────────────────────────────────────────────────────
    def _show_page(self, page):
        for p in [self.page_select, self.page_quiz, self.page_result]:
            p.setVisible(p is page)
        
        # Chỉ hiện bộ đếm thời gian khi đang làm quiz
        if page is self.page_quiz:
            self.lbl_timer.show()
        else:
            self.lbl_timer.hide()

    # ─── Start drill ────────────────────────────────────────────────────────
    def _start_drill_from_filename(self, filename):
        self.current_data = DataManager.load_drill_lesson(filename, self.drill_type)
        if not self.current_data:
            return

        # Flatten questions with part metadata
        self.flat_questions = []
        for part in self.current_data.get("parts", []):
            pt = part["part_type"]
            # For reading, attach passage to each question
            passage = part.get("passage", "")
            instruction = part.get("instruction", "")
            for q in part.get("questions", []):
                self.flat_questions.append({
                    **q,
                    "part_type": pt,
                    "passage": passage,
                    "instruction": instruction,
                })

        self.current_idx = 0
        self.correct_count = 0
        self.wrong_questions = []
        total_q = len(self.flat_questions)

        # Timer
        mins = self.current_data.get("time_limit_minutes", 10)
        self.timer_seconds = mins * 60
        self._timer.start(1000)

        title = self.current_data.get("title", "")
        self.lbl_title.setText(f"Drill {title}")
        self.progress_bar.setMaximum(total_q)
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
                self.lbl_timer.setStyleSheet("")

    # ─── Render question ─────────────────────────────────────────────────────
    def _clear_q_layout(self):
        def clear_layout(layout):
            if layout is not None:
                while layout.count():
                    item = layout.takeAt(0)
                    widget = item.widget()
                    if widget is not None:
                        widget.deleteLater()
                    else:
                        clear_layout(item.layout())
        clear_layout(self.q_layout)

    def _show_question(self):
        if self.current_idx >= len(self.flat_questions):
            self._show_results()
            return

        self._answered = False
        self._current_star_widget = None
        q = self.flat_questions[self.current_idx]
        total = len(self.flat_questions)

        self.lbl_progress.setText(f"Câu {self.current_idx + 1} / {total}")
        self.lbl_stats.setText(f"✅ {self.correct_count}  ❌ {len(self.wrong_questions)}")
        self.progress_bar.setValue(self.current_idx)
        self.lbl_explanation.hide()
        self.btn_check.hide()
        self.btn_next.hide()
        self.btn_finish_quiz.hide()

        pt = q["part_type"]
        self.lbl_instruction.setText(q.get("instruction", ""))
        self._clear_q_layout()

        if pt == "multiple_choice":
            self._render_mc(q)
        elif pt == "star_ordering":
            self._render_star(q)
        elif pt == "reading_fill_in_blank":
            self._render_reading(q)

    # ── Multiple Choice ───────────────────────────────────────────────────────
    def _render_mc(self, q):
        lbl_q = QLabel(q["text"])
        lbl_q.setObjectName("DrillQuestion")
        lbl_q.setStyleSheet("font-family: 'Yu Gothic', Meiryo, sans-serif;")
        lbl_q.setWordWrap(True)
        lbl_q.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.q_layout.addWidget(lbl_q)

        self._mc_btns = []
        grid = QGridLayout()
        grid.setSpacing(10)
        for i, opt in enumerate(q["options"]):
            btn = QPushButton(f"{i+1}.  {opt}")
            btn.setObjectName("QuizOptionBtn")
            btn.setStyleSheet("font-family: 'Yu Gothic', Meiryo, sans-serif; font-size: 16px;")
            btn.setMinimumHeight(56)
            btn.clicked.connect(lambda _, idx=i: self._check_mc_answer(idx))
            self._mc_btns.append(btn)
            grid.addWidget(btn, i // 2, i % 2)
        self.q_layout.addLayout(grid)
        self.q_layout.addStretch()

    def _check_mc_answer(self, chosen_idx):
        if self._answered:
            return
        self._answered = True
        q = self.flat_questions[self.current_idx]
        correct_idx = q["correct_answer"] - 1  # 1-indexed → 0-indexed
        for i, btn in enumerate(self._mc_btns):
            btn.setEnabled(False)
            if i == correct_idx:
                btn.setStyleSheet("background-color:#10B981;color:white;border-radius:12px;")
            elif i == chosen_idx:
                btn.setStyleSheet("background-color:#EF4444;color:white;border-radius:12px;")

        is_correct = (chosen_idx == correct_idx)
        if is_correct:
            self.correct_count += 1
        else:
            self.wrong_questions.append(q)

        self._show_explanation_block(q)
        self._show_nav_buttons()

    def _show_explanation_block(self, q):
        explanation = q.get("explanation", "")
        explanation_vi = q.get("explanation_vi", "")
        furigana = q.get("sentence_furigana", "")
        sentence_vi = q.get("sentence_vi", "")
        
        detail = ""
        if furigana:
            detail += f"<span style='color:#6B7280; font-size:14px;'>Cách đọc: {furigana}</span><br>"
        if sentence_vi:
            detail += f"<span style='color:#059669; font-size:15px; font-weight:bold;'>Dịch câu: {sentence_vi}</span><br><br>"
            
        if explanation:
            detail += f"<span style='font-size:15px;'>💡 <b>Giải thích:</b> {explanation}</span><br>"
        if explanation_vi:
            detail += f"<span style='color:#4338CA; font-size:15px;'>👉 <b>Tiếng Việt:</b> {explanation_vi}</span>"

        if detail:
            self.lbl_explanation.setText(detail)
            self.lbl_explanation.show()

    # ── Star Ordering ─────────────────────────────────────────────────────────
    def _render_star(self, q):
        sw = StarOrderWidget(q)
        sw.answer_filled.connect(self._on_star_filled)
        self._current_star_widget = sw
        self.q_layout.addWidget(sw)
        self.q_layout.addStretch()

    def _on_star_filled(self):
        """Khi cả 4 slot đã điền → hiện nút Kiểm tra."""
        self.btn_check.show()

    def _check_star_answer(self):
        if self._answered or self._current_star_widget is None:
            return
        self._answered = True
        self.btn_check.hide()

        q = self.flat_questions[self.current_idx]
        user_order = self._current_star_widget.get_user_order()
        correct_order = q["correct_order"]
        is_correct = (user_order == correct_order)

        self._current_star_widget.lock_and_show_result(is_correct)

        if is_correct:
            self.correct_count += 1
            result_msg = "<span style='color:#10B981;font-weight:bold;font-size:16px;'>✅ Chính xác!</span><br><br>"
        else:
            self.wrong_questions.append(q)
            correct_words = [q["options"][i - 1] for i in correct_order]
            correct_str = "  →  ".join(correct_words)
            star_word = q["options"][correct_order[q.get("star_position", 3) - 1] - 1]
            result_msg = (
                f"<span style='color:#EF4444;font-weight:bold;font-size:15px;'>❌ Sai rồi!</span><br>"
                f"<span style='font-size:14px;'>Thứ tự đúng: {correct_str}<br>"
                f"Từ ở vị trí ★: {star_word}</span><br><br>"
            )

        explanation = q.get("explanation", "")
        explanation_vi = q.get("explanation_vi", "")
        furigana = q.get("sentence_furigana", "")
        sentence_vi = q.get("sentence_vi", "")
        
        detail = result_msg
        
        if furigana:
            detail += f"<span style='color:#6B7280; font-size:14px;'>Cách đọc: {furigana}</span><br>"
        if sentence_vi:
            detail += f"<span style='color:#059669; font-size:15px; font-weight:bold;'>Dịch câu: {sentence_vi}</span><br><br>"
            
        if explanation:
            detail += f"<span style='font-size:15px;'>💡 <b>Giải thích:</b> {explanation}</span><br>"
        if explanation_vi:
            detail += f"<span style='color:#4338CA; font-size:15px;'>👉 <b>Tiếng Việt:</b> {explanation_vi}</span>"

        self.lbl_explanation.setText(detail)
        self.lbl_explanation.show()
        self._show_nav_buttons()

    # ── Reading Fill-in-Blank ─────────────────────────────────────────────────
    def _render_reading(self, q):
        # Passage box
        passage_box = QWidget()
        passage_box.setObjectName("PassageBox")
        pb_lay = QVBoxLayout(passage_box)
        pb_lay.setContentsMargins(16, 12, 16, 12)
        lbl_passage = QLabel(q.get("passage", ""))
        lbl_passage.setObjectName("PassageText")
        lbl_passage.setWordWrap(True)
        pb_lay.addWidget(lbl_passage)
        self.q_layout.addWidget(passage_box)

        # Blank sub-question
        blank_id = q.get("blank_id", 1)
        lbl_q = QLabel(f"【{blank_id}】に入れる最もよいものを選びなさい。")
        lbl_q.setObjectName("DrillQuestion")
        lbl_q.setStyleSheet("font-family: 'Yu Gothic', Meiryo, sans-serif;")
        lbl_q.setWordWrap(True)
        lbl_q.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.q_layout.addWidget(lbl_q)

        self._mc_btns = []
        grid = QGridLayout()
        grid.setSpacing(10)
        for i, opt in enumerate(q["options"]):
            btn = QPushButton(f"{i+1}.  {opt}")
            btn.setObjectName("QuizOptionBtn")
            btn.setMinimumHeight(52)
            btn.clicked.connect(lambda _, idx=i: self._check_mc_answer(idx))
            self._mc_btns.append(btn)
            grid.addWidget(btn, i // 2, i % 2)
        self.q_layout.addLayout(grid)
        self.q_layout.addStretch()

    # ─── Navigation ───────────────────────────────────────────────────────────
    def _show_nav_buttons(self):
        self.lbl_stats.setText(f"✅ {self.correct_count}  ❌ {len(self.wrong_questions)}")
        is_last = (self.current_idx == len(self.flat_questions) - 1)
        if is_last:
            self.btn_finish_quiz.show()
        else:
            self.btn_next.show()

    def _next_question(self):
        self.current_idx += 1
        self._show_question()

    # ─── Results ────────────────────────────────────────────────────────────
    def _show_results(self):
        self._timer.stop()
        total = len(self.flat_questions)
        score = self.correct_count
        pct = int(score / total * 100) if total > 0 else 0

        if pct >= 80:
            grade = "🌟 Xuất sắc!"
        elif pct >= 60:
            grade = "👍 Khá tốt!"
        else:
            grade = "📚 Cần ôn luyện thêm!"

        self.lbl_result_title.setText(grade)
        self.lbl_result_score.setText(f"Kết quả: {score} / {total} câu đúng ({pct}%)")

        # Clear old result content
        while self.result_layout.count():
            item = self.result_layout.takeAt(0)
            w = item.widget()
            if w:
                w.setParent(None)

        if self.wrong_questions:
            lbl_w = QLabel(f"❌ Các câu sai ({len(self.wrong_questions)} câu) – Xem lại giải thích:")
            lbl_w.setStyleSheet("font-size:15px;font-weight:bold;color:#DC2626;margin-top:10px;")
            self.result_layout.addWidget(lbl_w)
            for wq in self.wrong_questions:
                self._add_wrong_card(wq)
        else:
            lbl_ok = QLabel("🎉 Tuyệt vời! Bạn trả lời đúng tất cả các câu!")
            lbl_ok.setAlignment(Qt.AlignmentFlag.AlignCenter)
            lbl_ok.setStyleSheet("font-size:16px;color:#10B981;font-weight:bold;")
            self.result_layout.addWidget(lbl_ok)

        self.result_layout.addStretch()
        self._show_page(self.page_result)

    def _add_wrong_card(self, q):
        card = QWidget()
        card.setObjectName("WrongCard")
        cl = QVBoxLayout(card)
        cl.setContentsMargins(16, 12, 16, 12)
        cl.setSpacing(6)

        # Question text
        lbl_q = QLabel(q.get("text", ""))
        lbl_q.setWordWrap(True)
        lbl_q.setStyleSheet("font-size:14px;font-weight:bold;color:#1E293B;")
        cl.addWidget(lbl_q)

        pt = q.get("part_type", "")
        if pt == "multiple_choice" or pt == "reading_fill_in_blank":
            correct_idx = q["correct_answer"] - 1
            correct_opt = q["options"][correct_idx]
            lbl_ans = QLabel(f"✅ Đáp án đúng: {correct_idx+1}. {correct_opt}")
            lbl_ans.setStyleSheet("font-size:13px;color:#10B981;font-weight:bold;")
            cl.addWidget(lbl_ans)
        elif pt == "star_ordering":
            correct_order = q["correct_order"]
            correct_words = "  →  ".join([q["options"][i-1] for i in correct_order])
            lbl_ans = QLabel(f"✅ Thứ tự đúng: {correct_words}")
            lbl_ans.setWordWrap(True)
            lbl_ans.setStyleSheet("font-size:13px;color:#10B981;font-weight:bold;")
            cl.addWidget(lbl_ans)
            fs = q.get("full_sentence", "")
            if fs:
                lbl_fs = QLabel(f"📝 {fs}")
                lbl_fs.setWordWrap(True)
                lbl_fs.setStyleSheet("font-size:12px;color:#4B5563;")
                cl.addWidget(lbl_fs)

        exp = q.get("explanation", "")
        if exp:
            lbl_exp = QLabel(f"💡 {exp}")
            lbl_exp.setWordWrap(True)
            lbl_exp.setStyleSheet("font-size:13px;color:#4338CA;")
            cl.addWidget(lbl_exp)

        self.result_layout.addWidget(card)

    def _retry_drill(self):
        if self.current_data:
            self._start_drill_with_data(self.current_data)

    def _start_drill_with_data(self, data):
        self.current_data = data
        self.flat_questions = []
        for part in data.get("parts", []):
            pt = part["part_type"]
            passage = part.get("passage", "")
            instruction = part.get("instruction", "")
            for q in part.get("questions", []):
                self.flat_questions.append({**q, "part_type": pt,
                                             "passage": passage, "instruction": instruction})
        self.current_idx = 0
        self.correct_count = 0
        self.wrong_questions = []
        mins = data.get("time_limit_minutes", 10)
        self.timer_seconds = mins * 60
        self.lbl_timer.setStyleSheet("")
        self._timer.start(1000)
        self.progress_bar.setMaximum(len(self.flat_questions))
        self.progress_bar.setValue(0)
        self._show_page(self.page_quiz)
        self._show_question()
