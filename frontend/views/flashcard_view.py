import random
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, 
    QScrollArea
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont
from frontend.components.cards import DraggableCard

class FlashcardPracticeWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.original_queue = []
        self.queue = []
        self.struggled_items = []
        self.learned_count = 0
        self.unlearned_count = 0
        
        layout = QVBoxLayout(self)
        
        toolbar = QHBoxLayout()
        
        status_layout = QVBoxLayout()
        self.lbl_status = QLabel()
        self.lbl_status.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        
        self.lbl_stats = QLabel()
        self.lbl_stats.setFont(QFont("Arial", 10))
        self.lbl_stats.setStyleSheet("color: #9CA3AF;")
        
        status_layout.addWidget(self.lbl_status)
        status_layout.addWidget(self.lbl_stats)
        
        self.btn_shuffle = QPushButton("Trộn thẻ (Shuffle)")
        self.btn_shuffle.setObjectName("BtnStart")
        self.btn_shuffle.clicked.connect(self.shuffle_cards)
        
        toolbar.addLayout(status_layout)
        toolbar.addStretch()
        toolbar.addWidget(self.btn_shuffle)
        layout.addLayout(toolbar)
        
        self.card_area = QWidget()
        layout.addWidget(self.card_area, 1)
        
        self.lbl_feedback = QLabel("", self.card_area)
        self.lbl_feedback.setFont(QFont("Arial", 20, QFont.Weight.Bold))
        self.lbl_feedback.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.card = DraggableCard(self.card_area)
        self.card.swipedLeft.connect(self.handle_unlearned)
        self.card.swipedRight.connect(self.handle_learned)
        self.card.dragged.connect(self.update_feedback)
        
        # Result widget
        self.result_widget = QWidget()
        result_layout = QVBoxLayout(self.result_widget)
        
        lbl_finish = QLabel("🎉 Hoàn thành!")
        lbl_finish.setFont(QFont("Arial", 24, QFont.Weight.Bold))
        lbl_finish.setAlignment(Qt.AlignmentFlag.AlignCenter)
        result_layout.addWidget(lbl_finish)
        
        self.lbl_result_summary = QLabel()
        self.lbl_result_summary.setFont(QFont("Arial", 12))
        self.lbl_result_summary.setAlignment(Qt.AlignmentFlag.AlignCenter)
        result_layout.addWidget(self.lbl_result_summary)
        
        # Scroll area for struggled words
        self.scroll_struggled = QScrollArea()
        self.scroll_struggled.setWidgetResizable(True)
        self.scroll_struggled.setStyleSheet("QScrollArea { border: none; background-color: transparent; }")
        self.content_struggled = QWidget()
        self.content_struggled.setStyleSheet("background-color: transparent;")
        self.layout_struggled = QVBoxLayout(self.content_struggled)
        self.scroll_struggled.setWidget(self.content_struggled)
        result_layout.addWidget(self.scroll_struggled, 1)
        
        # Buttons
        btn_layout = QHBoxLayout()
        self.btn_retry_all = QPushButton("Học lại từ đầu")
        self.btn_retry_all.setObjectName("BtnStart")
        self.btn_retry_all.clicked.connect(self.retry_all)
        
        self.btn_retry_struggled = QPushButton("Chỉ học các thẻ chưa thuộc")
        self.btn_retry_struggled.setObjectName("BtnHard")
        self.btn_retry_struggled.clicked.connect(self.retry_struggled)
        
        btn_layout.addStretch()
        btn_layout.addWidget(self.btn_retry_all)
        btn_layout.addWidget(self.btn_retry_struggled)
        btn_layout.addStretch()
        
        result_layout.addLayout(btn_layout)
        
        layout.addWidget(self.result_widget, 1)
        self.result_widget.hide()

    def resizeEvent(self, event):
        super().resizeEvent(event)
        if hasattr(self, 'card') and self.card:
            card_x = self.card_area.width() // 2 - self.card.width() // 2
            card_y = self.card_area.height() // 2 - self.card.height() // 2
            self.card.move(card_x, card_y)
            
            lbl_w = 300
            lbl_h = 50
            self.lbl_feedback.setGeometry(
                self.card_area.width() // 2 - lbl_w // 2,
                card_y + self.card.height() + 20,
                lbl_w,
                lbl_h
            )

    def load_vocab(self, vocab_list):
        self.original_queue = vocab_list.copy()
        self.queue = vocab_list.copy()
        self.struggled_items = []
        self.learned_count = 0
        self.unlearned_count = 0
        self.update_ui()

    def shuffle_cards(self):
        random.shuffle(self.queue)
        self.update_ui()

    def update_feedback(self, distance):
        if distance == 0:
            self.lbl_feedback.setText("")
            return
            
        alpha = min(255, int((abs(distance) / 100.0) * 255))
        if distance > 0:
            self.lbl_feedback.setText("Đã thuộc")
            self.lbl_feedback.setStyleSheet(f"color: rgba(16, 185, 129, {alpha});")
        else:
            self.lbl_feedback.setText("Chưa thuộc")
            self.lbl_feedback.setStyleSheet(f"color: rgba(239, 68, 68, {alpha});")

    def update_ui(self):
        self.lbl_status.setText(f"Số thẻ cần học: {len(self.queue)}")
        self.lbl_stats.setText(f"Đã thuộc: {self.learned_count}  |  Chưa thuộc (đã lướt qua): {self.unlearned_count}")
        self.lbl_feedback.setText("")
        if self.queue:
            self.result_widget.hide()
            self.card_area.show()
            self.card.set_item(self.queue[0])
            self.card.show()
        else:
            self.card_area.hide()
            self.show_results()

    def handle_unlearned(self):
        if self.queue:
            item = self.queue.pop(0)
            self.queue.append(item)
            self.unlearned_count += 1
            if item not in self.struggled_items:
                self.struggled_items.append(item)
        self.update_ui()

    def handle_learned(self):
        if self.queue:
            self.queue.pop(0)
            self.learned_count += 1
        self.update_ui()

    def show_results(self):
        self.result_widget.show()
        
        if not self.struggled_items:
            self.lbl_result_summary.setText("Tuyệt vời! Bạn đã thuộc tất cả các thẻ ngay trong lần đầu tiên.")
            self.btn_retry_struggled.hide()
        else:
            self.lbl_result_summary.setText(f"Bạn đã chưa thuộc {len(self.struggled_items)} thẻ sau đây (hãy xem lại nhé):")
            self.btn_retry_struggled.show()
            
        # Xóa nội dung cũ
        for i in reversed(range(self.layout_struggled.count())): 
            widgetToRemove = self.layout_struggled.itemAt(i).widget()
            if widgetToRemove:
                widgetToRemove.setParent(None)
                
        vocab_items = [item for item in self.struggled_items if 'word' in item]
        grammar_items = [item for item in self.struggled_items if 'pattern' in item]
        
        import re
        
        if vocab_items:
            lbl_v = QLabel("📚 Từ vựng")
            lbl_v.setFont(QFont("Arial", 16, QFont.Weight.Bold))
            self.layout_struggled.addWidget(lbl_v)
            
            for item in vocab_items:
                w = QWidget()
                w.setStyleSheet("background-color: #FEE2E2; border-radius: 8px; margin: 4px; padding: 10px;")
                w_layout = QHBoxLayout(w)
                w_layout.setContentsMargins(10, 10, 10, 10)
                
                word = item.get('word', '')
                reading = item.get('reading', '')
                kanji_m = item.get('kanji_meaning', '')
                
                jp_text = f"{word} ({reading})" if reading and reading != word else word
                if kanji_m:
                    jp_text += f"\n[{kanji_m}]"
                
                lbl_jp = QLabel(jp_text)
                lbl_jp.setFont(QFont("Arial", 16, QFont.Weight.Bold))
                lbl_jp.setStyleSheet("color: #DC2626;") # Màu đỏ nổi bật
                
                lbl_vi = QLabel(item.get('meaning', ''))
                lbl_vi.setFont(QFont("Arial", 14))
                lbl_vi.setStyleSheet("color: #374151;")
                
                w_layout.addWidget(lbl_jp)
                w_layout.addSpacing(20)
                w_layout.addWidget(lbl_vi)
                w_layout.addStretch()
                
                self.layout_struggled.addWidget(w)
                
        if grammar_items:
            lbl_g = QLabel("✍️ Ngữ pháp")
            lbl_g.setFont(QFont("Arial", 16, QFont.Weight.Bold))
            lbl_g.setStyleSheet("margin-top: 20px; margin-bottom: 5px;")
            self.layout_struggled.addWidget(lbl_g)
            
            for item in grammar_items:
                w = QWidget()
                w.setStyleSheet("background-color: #E0E7FF; border-radius: 8px; margin: 4px; padding: 10px;")
                w_layout = QVBoxLayout(w)
                w_layout.setContentsMargins(10, 10, 10, 10)
                
                lbl_jp = QLabel(item.get('pattern', ''))
                lbl_jp.setFont(QFont("Arial", 16, QFont.Weight.Bold))
                lbl_jp.setStyleSheet("color: #4338CA;")
                
                meaning = item.get('meaning', '')
                meaning = re.sub(r'\s*(\(\d+(?:\.\d+)?\))', r'\n\1', meaning).strip()
                lbl_vi = QLabel(meaning)
                lbl_vi.setFont(QFont("Arial", 14))
                lbl_vi.setStyleSheet("color: #374151;")
                lbl_vi.setWordWrap(True)
                
                w_layout.addWidget(lbl_jp)
                w_layout.addWidget(lbl_vi)
                
                self.layout_struggled.addWidget(w)
            
        self.layout_struggled.addStretch()

    def retry_all(self):
        self.load_vocab(self.original_queue)
        
    def retry_struggled(self):
        self.load_vocab(self.struggled_items)
