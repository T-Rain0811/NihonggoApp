import re
from PyQt6.QtWidgets import QFrame, QVBoxLayout, QHBoxLayout, QLabel, QGraphicsDropShadowEffect
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QColor, QPainter, QBrush, QCursor

class ShadowWidget(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
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

        # Cursor bàn tay
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

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

        # Label hiển thị khi hover (thay thế cho tooltip để mượt hơn khi cuộn)
        self.hover_label = make_label("Xem chi tiết hơn", style="color: #4F46E5; font-size: 11px; font-weight: bold; margin-top: 4px;")
        self.hover_label.setAlignment(Qt.AlignmentFlag.AlignRight)
        self.hover_label.hide()
        layout.addWidget(self.hover_label)

    def enterEvent(self, event):
        self.hover_label.show()
        super().enterEvent(event)

    def leaveEvent(self, event):
        self.hover_label.hide()
        super().leaveEvent(event)

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit(self._word)
        super().mousePressEvent(event)



from PyQt6.QtWidgets import QWidget
class ClickableWordWidget(QWidget):
    clicked = pyqtSignal(str)
    def __init__(self, w_data, parent=None):
        super().__init__(parent)
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        self.word = w_data.get('word', '')
        
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 4, 0, 4)
        
        col1 = QVBoxLayout()
        read_lbl = QLabel(w_data.get('reading', ''))
        read_lbl.setStyleSheet("font-size: 12px; color: #4338CA;")
        word_lbl = QLabel(self.word)
        word_lbl.setStyleSheet("font-size: 18px; font-weight: bold; color: #111827;")
        col1.addWidget(read_lbl)
        col1.addWidget(word_lbl)
        
        col2 = QVBoxLayout()
        mean_lbl = QLabel(w_data.get('meaning', ''))
        mean_lbl.setStyleSheet("font-size: 14px; color: #374151;")
        col2.setAlignment(Qt.AlignmentFlag.AlignVCenter)
        col2.addWidget(mean_lbl)
        
        lay.addLayout(col1, 1)
        lay.addLayout(col2, 2)
        
    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit(self.word)
        super().mousePressEvent(event)

class PrefixCard(ShadowWidget):
    clicked = pyqtSignal(str)
    def __init__(self, item, parent=None):
        super().__init__(parent)
        layout = QHBoxLayout(self)
        
        left_layout = QVBoxLayout()
        prefix_title = QLabel(item.get('prefix', ''))
        prefix_title.setObjectName("CardTitle")
        
        prefix_meaning = QLabel(item.get('meaning', ''))
        prefix_meaning.setObjectName("CardMeaning")
        prefix_meaning.setWordWrap(True)
        
        left_layout.addWidget(prefix_title)
        left_layout.addWidget(prefix_meaning)
        left_layout.addStretch()
        
        right_layout = QVBoxLayout()
        words = item.get('words', [])
        for w in words:
            w_widget = ClickableWordWidget(w)
            w_widget.clicked.connect(self.clicked.emit)
            right_layout.addWidget(w_widget)
            
            line = QFrame()
            line.setFrameShape(QFrame.Shape.HLine)
            line.setStyleSheet("background-color: #F3F4F6;")
            right_layout.addWidget(line)
        
        left_widget = QWidget()
        left_widget.setLayout(left_layout)
        left_widget.setFixedWidth(250)
        
        layout.addWidget(left_widget)
        
        vline = QFrame()
        vline.setFrameShape(QFrame.Shape.VLine)
        vline.setStyleSheet("background-color: #E5E7EB;")
        layout.addWidget(vline)
        
        layout.addLayout(right_layout)
        layout.addStretch()

class GrammarCard(ShadowWidget):
    def __init__(self, item, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setSpacing(6)

        # ── Header: pattern + badge ──────────────────────────────────
        header_layout = QHBoxLayout()
        title = QLabel(item.get('pattern', ''))
        title.setObjectName("CardTitle")

        header_layout.addWidget(title)
        header_layout.addStretch()
        layout.addLayout(header_layout)

        # ── Cấu trúc (usage) ────────────────────────────────────────
        usage = item.get('usage', '')
        if usage:
            usage_lbl = QLabel(f"📐 {usage}")
            usage_lbl.setStyleSheet(
                "font-size: 13px; color: #4338CA; font-weight: bold; "
                "background: #EEF2FF; border-radius: 6px; padding: 4px 8px; margin-top: 2px;"
            )
            usage_lbl.setWordWrap(True)
            layout.addWidget(usage_lbl)

        # ── Ý nghĩa ─────────────────────────────────────────────────
        # Ưu tiên full_meaning từ txt, fallback về meaning ngắn
        full_meaning = item.get('full_meaning', '') or item.get('meaning', '')
        # Chỉ lấy phần ý nghĩa tiếng Việt (bỏ các dòng JP lẫn vào)
        if full_meaning:
            viet_lines = [
                l for l in full_meaning.split('\n')
                if l.strip() and not re.search(r'[ぁ-んァ-ヶ一-龥]', l)
            ]
            meaning_text = '\n'.join(viet_lines).strip() or item.get('meaning', '')
            if meaning_text:
                meaning_lbl = QLabel(f"💡 {meaning_text}")
                meaning_lbl.setObjectName("CardMeaning")
                meaning_lbl.setWordWrap(True)
                layout.addWidget(meaning_lbl)

        # ── Ghi chú (notes) ─────────────────────────────────────────
        notes = item.get('notes', '')
        if notes:
            notes_lbl = QLabel(f"📝 {notes}")
            notes_lbl.setStyleSheet(
                "font-size: 13px; color: #92400E; background: #FFFBEB; "
                "border-left: 3px solid #F59E0B; padding: 6px 8px; border-radius: 4px; margin-top: 4px;"
            )
            notes_lbl.setWordWrap(True)
            layout.addWidget(notes_lbl)

        # ── Ví dụ ───────────────────────────────────────────────────
        examples = item.get('examples', [])
        if examples:
            sep = QFrame()
            sep.setFrameShape(QFrame.Shape.HLine)
            sep.setStyleSheet("color: #E5E7EB; margin-top: 6px; margin-bottom: 2px;")
            layout.addWidget(sep)

            ex_label = QLabel("✦ Ví dụ:")
            ex_label.setStyleSheet(
                "font-weight: bold; color: #059669; font-size: 13px; margin-bottom: 4px;"
            )
            layout.addWidget(ex_label)

            for ex in examples:
                jp = QLabel(f"　{ex.get('jp', '')}")
                jp.setStyleSheet(
                    "color: #111827; font-size: 15px; margin-top: 4px; "
                    "background: #F9FAFB; border-radius: 4px; padding: 4px 8px;"
                )
                jp.setWordWrap(True)

                vi = QLabel(f"　{ex.get('vi', '')}")
                vi.setStyleSheet(
                    "color: #6B7280; font-size: 13px; font-style: italic; "
                    "margin-bottom: 8px; padding-left: 8px;"
                )
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
        self.card_text.setWordWrap(True)
        
        self.card_subtext = QLabel()
        self.card_subtext.setObjectName("CardMeaning")
        self.card_subtext.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.card_subtext.setWordWrap(True)
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
