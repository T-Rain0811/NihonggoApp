"""
grammar_session_view.py – Màn hình Học Ngữ Pháp theo bài.
Layout mới:
  - Sidebar trái (160px): danh sách 8 bài + nút Quiz
  - Content phải: split dọc
      • Video player (QWebEngineView, ~55% width)  |  Kiến thức ngữ pháp (cuộn)
"""
import os
import webbrowser
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QScrollArea, QPushButton, QHBoxLayout, 
    QStackedWidget, QSizePolicy, QSlider, QGraphicsOpacityEffect, QStyle, QListWidget, QListWidgetItem, QMessageBox, QSplitter
)
from PyQt6.QtCore import Qt, pyqtSignal, QUrl, QTimer, QPropertyAnimation, QEasingCurve, QPointF, QSize
from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
from PyQt6.QtMultimediaWidgets import QVideoWidget
from PyQt6.QtGui import QCursor, QImage, QPixmap, QPainter, QIcon, QPolygonF, QPen, QFont

from backend.services.data_manager import DataManager

# Thử import cv2 (opencv-python) để trích xuất khung hình video
try:
    import cv2
    import numpy as np
    from PyQt6.QtGui import QImage, QPixmap
    _HAS_CV2 = True
except ImportError:
    _HAS_CV2 = False

from frontend.views.session_view import GrammarOnlyWidget
from frontend.views.quiz_view import QuizPracticeWidget

# ─────────────────────────────────────────────────────────────────────────────
from PyQt6.QtWidgets import QStackedLayout

class ClickableVideoWidget(QVideoWidget):
    """QVideoWidget chỉ hỗ trợ click để play/pause."""
    clicked = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

    def mousePressEvent(self, event):
        super().mousePressEvent(event)
        self.clicked.emit()

class HoverTooltip(QWidget):
    def __init__(self, parent=None):
        super().__init__(None, Qt.WindowType.ToolTip | Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(2, 2, 2, 2)
        layout.setSpacing(0)
        self.setStyleSheet("background-color: white; border: 1px solid #D1D5DB; border-radius: 4px;")
        
        self.img_label = QLabel()
        self.img_label.setFixedSize(160, 90)
        self.img_label.setStyleSheet("background-color: black; border-radius: 0px;")
        layout.addWidget(self.img_label)
        
        self.time_label = QLabel()
        self.time_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.time_label.setStyleSheet("background-color: black; color: white; font-weight: bold; font-size: 13px; padding: 2px;")
        layout.addWidget(self.time_label)

class HoverSlider(QSlider):
    def __init__(self, parent=None):
        super().__init__(Qt.Orientation.Horizontal, parent)
        self.setMouseTracking(True)
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        
        self.tooltip_widget = HoverTooltip()
        self.video_path = None
        self.cap = None
        
        self.setStyleSheet("""
            QSlider::groove:horizontal {
                height: 3px;
                margin: 0px;
                background-color: rgba(255, 255, 255, 0.4);
            }
            QSlider::sub-page:horizontal {
                background-color: #FF0000;
            }
            QSlider::handle:horizontal {
                background-color: #FF0000;
                border: none;
                height: 12px;
                width: 12px;
                margin: -4px 0;
                border-radius: 6px;
                /* Ẩn handle lúc bình thường bằng cách làm nó trong suốt, thay vì size 0x0 */
                background-color: transparent;
            }
            QSlider::handle:horizontal:hover {
                background-color: #FF0000;
            }
            QSlider:hover::groove:horizontal {
                height: 5px;
            }
        """)
        self.setFixedHeight(16)
        
        self.hover_timer = QTimer()
        self.hover_timer.setSingleShot(True)
        self.hover_timer.timeout.connect(self._fetch_frame)
        self.last_hover_time_ms = 0

    def set_video_path(self, path):
        self.video_path = path
        if _HAS_CV2:
            if self.cap:
                self.cap.release()
            self.cap = cv2.VideoCapture(path)

    def mouseMoveEvent(self, event):
        super().mouseMoveEvent(event)
        if not self.cap or self.maximum() == 0:
            return
            
        x = event.pos().x()
        val = self.minimum() + (self.maximum() - self.minimum()) * x / self.width()
        self.last_hover_time_ms = int(val)
        
        seconds = self.last_hover_time_ms // 1000
        m, s = divmod(seconds, 60)
        self.tooltip_widget.time_label.setText(f"{m:02d}:{s:02d}")
        
        global_pos = self.mapToGlobal(event.pos())
        self.tooltip_widget.move(global_pos.x() - 80, global_pos.y() - 130)
        self.tooltip_widget.show()
        
        self.hover_timer.start(100)

    def _fetch_frame(self):
        if not self.cap:
            return
        self.cap.set(cv2.CAP_PROP_POS_MSEC, self.last_hover_time_ms)
        ret, frame = self.cap.read()
        if ret:
            frame = cv2.resize(frame, (160, 90))
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            h, w, ch = frame.shape
            bytes_per_line = ch * w
            qimg = QImage(frame.data, w, h, bytes_per_line, QImage.Format.Format_RGB888)
            self.tooltip_widget.img_label.setPixmap(QPixmap.fromImage(qimg.copy()))

    def leaveEvent(self, event):
        self.tooltip_widget.hide()
        self.hover_timer.stop()
        super().leaveEvent(event)

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            val = self.minimum() + (self.maximum() - self.minimum()) * event.pos().x() / self.width()
            self.setValue(int(val))
            self.sliderMoved.emit(int(val))
        super().mousePressEvent(event)

class PlayerControls(QWidget):
    """Thanh điều khiển video."""
    clicked = pyqtSignal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Nền của toàn bộ thanh điều khiển (Xám đậm)
        self.setStyleSheet("background-color: #1F1F1F;")
        
        # Slider ở trên cùng của thanh điều khiển
        self.slider = HoverSlider()
        layout.addWidget(self.slider)
        
        # Vùng chứa nút bấm
        self.bottom_bar = QWidget()
        bottom_layout = QHBoxLayout(self.bottom_bar)
        bottom_layout.setContentsMargins(16, 8, 16, 16)
        bottom_layout.setSpacing(12)
        
        btn_css = """
            QPushButton {
                background-color: rgba(255, 255, 255, 0.15);
                border-radius: 20px;
                color: white;
            }
            QPushButton:hover {
                background-color: rgba(255, 255, 255, 0.3);
            }
        """
        
        # Play/Pause (Hình tròn 40x40, tự vẽ Icon trắng 100% không lỗi)
        self.btn_play = QPushButton("")
        self.btn_play.setFixedSize(40, 40)
        self.btn_play.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
        self.btn_play.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        self.btn_play.setStyleSheet(btn_css)
        self.btn_play.setIcon(self.create_play_icon())
        self.btn_play.setIconSize(QSize(20, 20))
        bottom_layout.addWidget(self.btn_play)
        
        # Cụm Âm lượng
        self.volume_group = QWidget()
        self.volume_group.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
        self.volume_group.setStyleSheet("background: transparent;")
        vol_layout = QHBoxLayout(self.volume_group)
        vol_layout.setContentsMargins(0, 0, 0, 0)
        vol_layout.setSpacing(8)
        
        # Nút Loa (Hình tròn 40x40, tự vẽ Icon)
        self.btn_volume = QPushButton("")
        self.btn_volume.setFixedSize(40, 40)
        self.btn_volume.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
        self.btn_volume.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        self.btn_volume.setStyleSheet(btn_css)
        self.btn_volume.setIcon(self.create_volume_icon())
        self.btn_volume.setIconSize(QSize(20, 20))
        vol_layout.addWidget(self.btn_volume)
        
        # Thanh trượt âm lượng
        self.volume_slider = QSlider(Qt.Orientation.Horizontal)
        self.volume_slider.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
        self.volume_slider.setRange(0, 100)
        self.volume_slider.setValue(100)
        self.volume_slider.setMaximumWidth(0) # Ẩn lúc đầu
        self.volume_slider.setStyleSheet("""
            QSlider::groove:horizontal { border-radius: 2px; height: 4px; background: rgba(255,255,255,0.3); }
            QSlider::sub-page:horizontal { background: white; border-radius: 2px; }
            QSlider::handle:horizontal { background: white; width: 12px; margin: -4px 0; border-radius: 6px; }
        """)
        vol_layout.addWidget(self.volume_slider)
        bottom_layout.addWidget(self.volume_group)
        
        self.vol_anim = QPropertyAnimation(self.volume_slider, b"maximumWidth")
        self.vol_anim.setDuration(250)
        self.vol_anim.setEasingCurve(QEasingCurve.Type.OutCubic)
        self.volume_group.installEventFilter(self)
        
        # Nhãn thời gian (VD: 5:32 / 11:10)
        self.time_label = QLabel("0:00 / 0:00")
        self.time_label.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
        self.time_label.setStyleSheet("""
            background-color: rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            color: white;
            font-weight: bold;
            font-size: 14px;
            padding: 4px 16px;
        """)
        self.time_label.setFixedHeight(32)
        bottom_layout.addWidget(self.time_label)
        
        bottom_layout.addStretch(1)
        layout.addWidget(self.bottom_bar)

    def eventFilter(self, obj, event):
        if obj == self.volume_group:
            if event.type() == event.Type.Enter:
                self.vol_anim.stop()
                self.vol_anim.setEndValue(80)
                self.vol_anim.start()
            elif event.type() == event.Type.Leave:
                self.vol_anim.stop()
                self.vol_anim.setEndValue(0)
                self.vol_anim.start()
        return super().eventFilter(obj, event)

    def mousePressEvent(self, event):
        self.clicked.emit()
        super().mousePressEvent(event)

    def create_play_icon(self):
        pixmap = QPixmap(24, 24)
        pixmap.fill(Qt.GlobalColor.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setBrush(Qt.GlobalColor.white)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawPolygon(QPolygonF([QPointF(8, 5), QPointF(19, 12), QPointF(8, 19)]))
        painter.end()
        return QIcon(pixmap)

    def create_pause_icon(self):
        pixmap = QPixmap(24, 24)
        pixmap.fill(Qt.GlobalColor.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setBrush(Qt.GlobalColor.white)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawRect(7, 5, 3, 14)
        painter.drawRect(14, 5, 3, 14)
        painter.end()
        return QIcon(pixmap)

    def create_volume_icon(self):
        pixmap = QPixmap(24, 24)
        pixmap.fill(Qt.GlobalColor.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setBrush(Qt.GlobalColor.white)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawPolygon(QPolygonF([QPointF(3, 9), QPointF(7, 9), QPointF(12, 4), QPointF(12, 20), QPointF(7, 15), QPointF(3, 15)]))
        pen = QPen(Qt.GlobalColor.white, 2)
        pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(pen)
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawArc(9, 7, 8, 10, -45 * 16, 90 * 16)
        painter.drawArc(6, 3, 14, 18, -45 * 16, 90 * 16)
        painter.end()
        return QIcon(pixmap)

    def create_mute_icon(self):
        pixmap = QPixmap(24, 24)
        pixmap.fill(Qt.GlobalColor.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setBrush(Qt.GlobalColor.white)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawPolygon(QPolygonF([QPointF(3, 9), QPointF(7, 9), QPointF(12, 4), QPointF(12, 20), QPointF(7, 15), QPointF(3, 15)]))
        pen = QPen(Qt.GlobalColor.white, 2)
        pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(pen)
        painter.drawLine(15, 9, 21, 15)
        painter.drawLine(21, 9, 15, 15)
        painter.end()
        return QIcon(pixmap)

# ─────────────────────────────────────────────────────────────────────────────
class SimpleVideoPlayer(QWidget):
    """Trình phát video cục bộ bằng QMediaPlayer."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.setSpacing(0)
        
        # 1. Lớp Trên: Video
        self.video_widget = ClickableVideoWidget()
        self.video_widget.setStyleSheet("background-color: black;")
        self.layout.addWidget(self.video_widget, 1)
        
        # 2. Lớp Dưới: Controls
        self.controls = PlayerControls()
        self.layout.addWidget(self.controls, 0)

        # Backend player
        self.audio_output = QAudioOutput()
        self.player = QMediaPlayer()
        self.player.setAudioOutput(self.audio_output)
        self.player.setVideoOutput(self.video_widget)

        # Kết nối sự kiện Click để Play/Pause
        self.controls.clicked.connect(self.toggle_playback)
        self.video_widget.clicked.connect(self.toggle_playback)
        
        # Kết nối sự kiện của thanh điều khiển
        self.controls.btn_play.clicked.connect(self.toggle_playback)
        self.controls.btn_volume.clicked.connect(self.toggle_mute)
        self.controls.volume_slider.valueChanged.connect(self.set_volume)
        self.controls.slider.sliderMoved.connect(self.set_position)

        # Kết nối sự kiện của player
        self.player.playbackStateChanged.connect(self.update_state)
        self.player.positionChanged.connect(self.update_position)
        self.player.durationChanged.connect(self.update_duration)
        
        self._initial_load = False

    def load_video(self, local_path):
        """Tải video từ file hệ thống."""
        self.controls.slider.set_video_path(local_path)
        self.player.setSource(QUrl.fromLocalFile(local_path))
        
        # Hiện frame đầu tiên
        self._initial_load = True
        self.player.play()

    def toggle_mute(self):
        is_muted = self.audio_output.isMuted()
        self.audio_output.setMuted(not is_muted)
        if not is_muted:
            self.controls.btn_volume.setIcon(self.controls.create_mute_icon())
        else:
            self.controls.btn_volume.setIcon(self.controls.create_volume_icon())

    def set_volume(self, value):
        self.audio_output.setVolume(value / 100.0)
        if value == 0:
            self.controls.btn_volume.setIcon(self.controls.create_mute_icon())
        else:
            self.controls.btn_volume.setIcon(self.controls.create_volume_icon())
            self.audio_output.setMuted(False)

    def toggle_playback(self):
        if self.player.playbackState() == QMediaPlayer.PlaybackState.PlayingState:
            self.player.pause()
        else:
            self.player.play()

    def update_state(self, state):
        if state == QMediaPlayer.PlaybackState.PlayingState:
            self.controls.btn_play.setIcon(self.controls.create_pause_icon())
            if self._initial_load:
                self._initial_load = False
                QTimer.singleShot(50, self.player.pause)
        else:
            self.controls.btn_play.setIcon(self.controls.create_play_icon())

    def format_time(self, ms):
        seconds = ms // 1000
        m, s = divmod(seconds, 60)
        return f"{m}:{s:02d}"

    def update_position(self, position):
        self.controls.slider.blockSignals(True)
        self.controls.slider.setValue(position)
        self.controls.slider.blockSignals(False)
        self._update_time_label()

    def update_duration(self, duration):
        self.controls.slider.setRange(0, duration)
        self._update_time_label()

    def _update_time_label(self):
        pos = self.format_time(self.player.position())
        dur = self.format_time(self.player.duration())
        self.controls.time_label.setText(f"{pos} / {dur}")

    def set_position(self, position):
        self.player.setPosition(position)


# ─────────────────────────────────────────────────────────────────────────────
class LessonContentWidget(QWidget):
    """
    Widget hiển thị một bài học: Video bên trái + Danh sách ngữ pháp bên phải.
    Layout: QSplitter nằm ngang (left=video, right=scroll ngữ pháp).
    """
    def __init__(self, session_key: str, grammar_data: list, parent=None):
        super().__init__(parent)
        self.session_key = session_key

        root = QHBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setHandleWidth(6)
        splitter.setStyleSheet("QSplitter::handle { background: #E5E7EB; }")

        # ── Phần trái: Video player ───────────────────────────────────
        video_container = QWidget()
        video_container.setObjectName("VideoContainer")
        vc_lay = QVBoxLayout(video_container)
        vc_lay.setContentsMargins(12, 12, 6, 12)
        vc_lay.setSpacing(8)

        # Video embed logic
        local_path = DataManager.get_local_video_path(session_key)
        video_url = DataManager.get_video_url(session_key)

        # Header video & Nút mở ngoài / tải video
        v_header_layout = QHBoxLayout()
        video_header = QLabel(f"📹  Video bài giảng – Bài {session_key}")
        video_header.setStyleSheet(
            "font-size: 14px; font-weight: bold; color: #374151; padding: 4px 0;"
        )
        v_header_layout.addWidget(video_header)
        v_header_layout.addStretch()

        if local_path:
            # Video đã được tải
            status_lbl = QLabel("✅ Local Video")
            status_lbl.setStyleSheet("color: #059669; font-size: 12px; font-weight: bold;")
            v_header_layout.addWidget(status_lbl)
        else:
            # Video chưa được tải
            status_lbl = QLabel("⚠️ Video chưa được tải!")
            status_lbl.setStyleSheet("color: #DC2626; font-size: 12px; font-weight: bold;")
            v_header_layout.addWidget(status_lbl)
            
            if video_url:
                btn_browser = QPushButton("🌐 Mở web xem tạm")
                btn_browser.setStyleSheet(
                    "background-color: #3B82F6; color: white; padding: 4px 8px; "
                    "border-radius: 4px; font-weight: bold; font-size: 11px;"
                )
                btn_browser.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
                btn_browser.clicked.connect(lambda _, u=video_url: webbrowser.open(u))
                v_header_layout.addWidget(btn_browser)
            
        vc_lay.addLayout(v_header_layout)

        # Nội dung Video Player
        if local_path:
            # Dùng QMediaPlayer phát video MP4
            self.player_widget = SimpleVideoPlayer()
            self.player_widget.load_video(local_path)
            vc_lay.addWidget(self.player_widget, 1)
        else:
            # Báo lỗi và hướng dẫn tải
            fallback = QLabel()
            msg = (
                "⚠️  Không tìm thấy file video cục bộ.\n\n"
                "Video của bài học này chưa được tải về máy.\n"
                "Hãy chạy lệnh tải video (hoặc script `download_videos.py`) "
                "để có thể xem video mượt mà ngay trong app!"
            )
            fallback.setText(msg)
            fallback.setStyleSheet(
                "background: #F3F4F6; border-radius: 8px; padding: 20px; "
                "color: #6B7280; font-size: 14px;"
            )
            fallback.setAlignment(Qt.AlignmentFlag.AlignCenter)
            fallback.setWordWrap(True)
            vc_lay.addWidget(fallback, 1)

        # ── Phần phải: Kiến thức ngữ pháp ───────────────────────────
        grammar_container = QWidget()
        gc_lay = QVBoxLayout(grammar_container)
        gc_lay.setContentsMargins(6, 12, 12, 12)
        gc_lay.setSpacing(8)

        # Header ngữ pháp
        lesson_label = DataManager.get_lesson_label(session_key)
        grammar_header = QLabel(f"📖  Kiến thức – {lesson_label}")
        grammar_header.setStyleSheet(
            "font-size: 14px; font-weight: bold; color: #374151; padding: 4px 0;"
        )
        gc_lay.addWidget(grammar_header)

        # Scroll area chứa các GrammarCard
        grammar_widget = GrammarOnlyWidget(grammar_data)
        gc_lay.addWidget(grammar_widget, 1)

        # ── Gắn vào splitter ─────────────────────────────────────────
        splitter.addWidget(video_container)
        splitter.addWidget(grammar_container)
        # Tăng tỷ lệ video (làm khung video dài ngang ra)
        splitter.setSizes([650, 400])

        root.addWidget(splitter)

    def pause_video(self):
        """Dừng video nếu đang phát."""
        if hasattr(self, "player_widget") and self.player_widget:
            if self.player_widget.player.playbackState() == QMediaPlayer.PlaybackState.PlayingState:
                self.player_widget.player.pause()

    def hideEvent(self, event):
        """Tự động pause video khi widget bị ẩn (chuyển bài khác)."""
        self.pause_video()
        super().hideEvent(event)


# ─────────────────────────────────────────────────────────────────────────────
class GrammarSessionView(QWidget):
    go_back = pyqtSignal()            # Quay về GrammarHub

    def __init__(self, parent=None):
        super().__init__(parent)
        self.session_keys = DataManager.get_grammar_session_keys()
        self._lesson_widgets = {}     # lazy cache: {key: LessonContentWidget}
        self._build_ui()

    def _build_ui(self):
        root = QHBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Sidebar ──────────────────────────────────────────────────
        sidebar = QWidget()
        sidebar.setObjectName("Sidebar")
        sidebar.setFixedWidth(180)
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

        # Label gợi ý
        hint = QLabel("Chọn bài học:")
        hint.setStyleSheet("font-size: 12px; color: #9CA3AF; padding: 8px 12px 4px 12px;")
        sb.addWidget(hint)

        # Danh sách bài có checkbox
        self.sidebar_list = QListWidget()
        self.sidebar_list.setObjectName("GrammarSidebarList")
        self.sidebar_list.setSelectionMode(QListWidget.SelectionMode.SingleSelection)
        for key in self.session_keys:
            label = DataManager.get_lesson_label(key)
            item = QListWidgetItem(label)
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

        # Nút Quiz
        btn_quiz = QPushButton("🎯  Ôn Ngữ Pháp")
        btn_quiz.setObjectName("BtnAction")
        btn_quiz.setMinimumHeight(50)
        btn_quiz.clicked.connect(self._on_quiz)
        sb.addWidget(btn_quiz)

        root.addWidget(sidebar)

        # ── Content area ─────────────────────────────────────────────
        self.content_stack = QStackedWidget()

        # Màn hình welcome
        welcome = QWidget()
        wl = QVBoxLayout(welcome)
        wl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl_w = QLabel("← Chọn bài học để xem video giảng dạy và kiến thức ngữ pháp")
        lbl_w.setStyleSheet("font-size: 15px; color: #9CA3AF;")
        lbl_w.setAlignment(Qt.AlignmentFlag.AlignCenter)
        wl.addWidget(lbl_w)
        self.content_stack.addWidget(welcome)

        # Quiz view
        self.quiz_view = QuizPracticeWidget()
        self.content_stack.addWidget(self.quiz_view)

        root.addWidget(self.content_stack, 1)

        # Chọn bài đầu tiên mặc định
        if self.sidebar_list.count() > 0:
            self.sidebar_list.setCurrentRow(0)

    # ─── Lazy load ───────────────────────────────────────────────────
    def _get_or_create(self, key):
        if key not in self._lesson_widgets:
            _, grammar = DataManager.get_session_data(key)
            w = LessonContentWidget(key, grammar)
            self._lesson_widgets[key] = w
            self.content_stack.addWidget(w)
        return self._lesson_widgets[key]

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

    def hideEvent(self, event):
        """Tự động pause video đang phát khi thoát khỏi màn hình Grammar Session."""
        current_widget = self.content_stack.currentWidget()
        if hasattr(current_widget, "pause_video"):
            current_widget.pause_video()
        super().hideEvent(event)

    def showEvent(self, event):
        """Khi quay lại màn hình học ngữ pháp, tự động chuyển về video nếu đang bị kẹt ở màn quiz."""
        super().showEvent(event)
        if self.content_stack.currentWidget() == getattr(self, 'quiz_view', None):
            row = self.sidebar_list.currentRow()
            if row >= 0:
                self._on_session_click(row)

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
