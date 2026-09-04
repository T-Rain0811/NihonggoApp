import re
from PyQt6.QtWidgets import QFrame, QVBoxLayout, QHBoxLayout, QLabel, QGraphicsDropShadowEffect
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QColor, QPainter, QBrush, QCursor

class ShadowWidget(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("CardWidget")
        
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(0, 0, 0, 30))
        shadow.setOffset(0, 4)
        self.setGraphicsEffect(shadow)

class VocabCard(ShadowWidget):
    clicked = pyqtSignal(str)  # Phát ra từ khi được click

    def __init__(self, item, parent=None):
        super().__init__(parent)
        self._word = item.get('word', '')

        # Cursor bàn tay và tooltip khi hover
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        self.setToolTip("Xem chi tiết hơn")

        layout = QVBoxLayout(self)

        def make_label(text, obj_name=None, style=None):
            lbl = QLabel(text)
            if obj_name:
                lbl.setObjectName(obj_name)
            if style:
                lbl.setStyleSheet(style)
            # Cho phép click xuyên qua label lên tới card
            lbl.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
            return lbl

        subtitle = make_label(item.get('reading', ''), "CardSubtitle")
        title    = make_label(item.get('word', ''), "CardTitle")
        meaning  = make_label(item.get('meaning', ''), "CardMeaning")

        layout.addWidget(subtitle)
        layout.addWidget(title)

        kanji_m = item.get('kanji_meaning', '')
        if kanji_m:
            lbl_kanji = make_label(
                f"Hán Việt: {kanji_m}",
                style="color: #D97706; font-size: 14px; font-weight: bold; margin-bottom: 2px;"
            )
            layout.addWidget(lbl_kanji)

        layout.addWidget(meaning)

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit(self._word)
        super().mousePressEvent(event)


class GrammarCard(ShadowWidget):
    def __init__(self, item, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        
        header_layout = QHBoxLayout()
        title = QLabel(item.get('pattern', ''))
        title.setObjectName("CardTitle")
        
        formula = QLabel("Cấu trúc ngữ pháp")
        formula.setObjectName("CardFormula")
        
        header_layout.addWidget(title)
        header_layout.addWidget(formula)
        header_layout.addStretch()
        
        raw_meaning = item.get('meaning', '')
        formatted_meaning = re.sub(r'\s*(\(\d+(?:\.\d+)?\))', r'\n\1', raw_meaning).strip()
        
        meaning = QLabel(f"[Ý nghĩa]\n{formatted_meaning}")
        meaning.setObjectName("CardMeaning")
        meaning.setWordWrap(True)
        
        layout.addLayout(header_layout)
        layout.addWidget(meaning)
        
        examples = item.get('examples', [])
        if examples:
            ex_label = QLabel("Ví dụ:")
            ex_label.setStyleSheet("font-weight: bold; color: #4338CA; margin-top: 15px; margin-bottom: 5px;")
            layout.addWidget(ex_label)
            for ex in examples:
                jp = QLabel(f"• {ex.get('jp', '')}")
                jp.setStyleSheet("color: #111827; font-size: 15px; margin-top: 5px;")
                jp.setWordWrap(True)
                
                vi = QLabel(f"  {ex.get('vi', '')}")
                vi.setStyleSheet("color: #6B7280; font-size: 14px; font-style: italic; margin-bottom: 15px;")
                vi.setWordWrap(True)
                
                layout.addWidget(jp)
                layout.addWidget(vi)

class DraggableCard(QFrame):
    swipedLeft = pyqtSignal()
    swipedRight = pyqtSignal()
    dragged = pyqtSignal(int)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("FlashcardWidget")
        self.setFixedSize(400, 300)
        
        self.layout = QVBoxLayout(self)
        self.layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.card_text = QLabel()
        self.card_text.setObjectName("FlashcardText")
        self.card_text.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.card_subtext = QLabel()
        self.card_subtext.setObjectName("CardMeaning")
        self.card_subtext.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.card_subtext.hide()
        
        self.layout.addWidget(self.card_text)
        self.layout.addWidget(self.card_subtext)
        
        self.start_pos = None
        self.current_item = None
        self.is_front = True
        self.drag_distance = 0
        self.threshold = 100

    def set_item(self, item):
        self.current_item = item
        self.is_front = True
        self.drag_distance = 0
        self.update_content()
        if self.parentWidget():
            self.move(self.parentWidget().width() // 2 - self.width() // 2, 
                      self.parentWidget().height() // 2 - self.height() // 2)
        self.update()

    def update_content(self):
        if not self.current_item:
            self.card_text.setText("Hoàn thành!")
            self.card_subtext.hide()
            return
            
        is_vocab = 'word' in self.current_item
            
        if self.is_front:
            text = self.current_item.get('word', '') if is_vocab else self.current_item.get('pattern', '')
            self.card_text.setText(text)
            self.card_subtext.hide()
        else:
            text = self.current_item.get('reading', '') if is_vocab else self.current_item.get('pattern', '')
            self.card_text.setText(text)
            
            meaning = self.current_item.get('meaning', '')
            if not is_vocab:
                meaning = re.sub(r'\s*(\(\d+(?:\.\d+)?\))', r'\n\1', meaning).strip()
                self.card_subtext.setText(f"[Nghĩa]\n{meaning}")
            else:
                kanji_m = self.current_item.get('kanji_meaning', '')
                if kanji_m:
                    self.card_subtext.setText(f"Hán Việt: {kanji_m}\n\n[Nghĩa]\n{meaning}")
                else:
                    self.card_subtext.setText(f"[Nghĩa]\n{meaning}")
                
            self.card_subtext.show()

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.start_pos = event.globalPosition().toPoint()
            self.orig_pos = self.pos()

    def mouseMoveEvent(self, event):
        if self.start_pos:
            delta = event.globalPosition().toPoint() - self.start_pos
            self.move(self.orig_pos + delta)
            self.drag_distance = delta.x()
            self.dragged.emit(self.drag_distance)
            self.update()

    def mouseReleaseEvent(self, event):
        if not self.start_pos or not self.current_item:
            return
            
        delta = event.globalPosition().toPoint() - self.start_pos
        
        if abs(delta.x()) < 5 and abs(delta.y()) < 5:
            self.is_front = not self.is_front
            self.update_content()
            self.drag_distance = 0
            self.dragged.emit(0)
            self.update()
        else:
            if delta.x() > self.threshold:
                self.drag_distance = 0
                self.dragged.emit(0)
                self.swipedRight.emit()
            elif delta.x() < -self.threshold:
                self.drag_distance = 0
                self.dragged.emit(0)
                self.swipedLeft.emit()
            else:
                self.drag_distance = 0
                self.dragged.emit(0)
                self.move(self.orig_pos)
                self.update()
                
        self.start_pos = None

    def paintEvent(self, event):
        super().paintEvent(event)
        if self.drag_distance != 0 and self.current_item:
            painter = QPainter(self)
            painter.setRenderHint(QPainter.RenderHint.Antialiasing)
            alpha = min(255, int(abs(self.drag_distance) / self.threshold * 100))
            if self.drag_distance > 0:
                color = QColor(16, 185, 129, alpha)
            else:
                color = QColor(239, 68, 68, alpha)
            painter.setBrush(QBrush(color))
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawRoundedRect(self.rect(), 16, 16)
