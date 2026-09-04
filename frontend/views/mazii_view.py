import socket
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QPushButton,
    QLabel, QWidget, QSizePolicy
)
from PyQt6.QtCore import Qt, QUrl
from PyQt6.QtGui import QFont


def is_connected(host="mazii.net", port=443, timeout=3):
    """Kiểm tra kết nối Internet bằng cách thử kết nối đến máy chủ."""
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
        return True
    except (socket.error, OSError):
        return False


class MaziiWebDialog(QDialog):
    def __init__(self, word: str, parent=None):
        super().__init__(parent)
        self.word = word
        self.setWindowTitle(f"Mazii — {word}")
        self.setMinimumSize(1050, 720)
        self.setModal(True)

        self.main_layout = QVBoxLayout(self)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(0)

        # --- Thanh tiêu đề tùy chỉnh ---
        header = QWidget()
        header.setStyleSheet("background-color: #4F46E5;")
        header.setFixedHeight(48)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(16, 0, 16, 0)

        lbl_title = QLabel(f"🔍  Tra cứu Mazii: {word}")
        lbl_title.setFont(QFont("Arial", 13, QFont.Weight.Bold))
        lbl_title.setStyleSheet("color: white;")

        btn_close = QPushButton("✕  Đóng")
        btn_close.setFixedSize(90, 32)
        btn_close.setStyleSheet("""
            QPushButton {
                background-color: rgba(255,255,255,0.2);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: rgba(255,255,255,0.35);
            }
        """)
        btn_close.clicked.connect(self.accept)

        header_layout.addWidget(lbl_title)
        header_layout.addStretch()
        header_layout.addWidget(btn_close)
        self.main_layout.addWidget(header)

        # --- Kiểm tra kết nối mạng ---
        if not is_connected():
            self._show_offline_screen()
        else:
            self._show_web_content()

    def _show_web_content(self):
        """Hiển thị WebView khi có mạng."""
        from PyQt6.QtWebEngineWidgets import QWebEngineView
        from PyQt6.QtWebEngineCore import QWebEngineSettings

        self.web_view = QWebEngineView()
        self.web_view.settings().setAttribute(
            QWebEngineSettings.WebAttribute.PlaybackRequiresUserGesture, False
        )
        self.web_view.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding
        )

        url = f"https://mazii.net/vi-VN/search/word/javi/{self.word}"
        self.web_view.setUrl(QUrl(url))
        self.main_layout.addWidget(self.web_view)

    def _show_offline_screen(self):
        """Hiển thị màn hình cảnh báo khi không có mạng."""
        offline_widget = QWidget()
        offline_widget.setStyleSheet("background-color: #F9FAFB;")
        layout = QVBoxLayout(offline_widget)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.setSpacing(16)

        lbl_icon = QLabel("📡")
        lbl_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl_icon.setFont(QFont("Arial", 64))

        lbl_title = QLabel("Không có kết nối mạng")
        lbl_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl_title.setFont(QFont("Arial", 20, QFont.Weight.Bold))
        lbl_title.setStyleSheet("color: #111827;")

        lbl_sub = QLabel(
            "Tính năng tra cứu Mazii yêu cầu kết nối Internet.\n"
            "Vui lòng kiểm tra lại Wi-Fi hoặc mạng của bạn, sau đó thử lại."
        )
        lbl_sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lbl_sub.setFont(QFont("Arial", 13))
        lbl_sub.setStyleSheet("color: #6B7280;")

        btn_retry = QPushButton("  Thử lại")
        btn_retry.setFixedSize(160, 44)
        btn_retry.setStyleSheet("""
            QPushButton {
                background-color: #4F46E5;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #4338CA;
            }
        """)
        btn_retry.clicked.connect(self._retry)

        layout.addWidget(lbl_icon)
        layout.addWidget(lbl_title)
        layout.addWidget(lbl_sub)
        layout.addSpacing(10)

        btn_wrapper = QHBoxLayout()
        btn_wrapper.addStretch()
        btn_wrapper.addWidget(btn_retry)
        btn_wrapper.addStretch()
        layout.addLayout(btn_wrapper)

        self.main_layout.addWidget(offline_widget)
        self._offline_widget = offline_widget

    def _retry(self):
        """Thử kết nối lại và xóa màn hình offline nếu có mạng."""
        if is_connected():
            self._offline_widget.setParent(None)
            self._offline_widget.deleteLater()
            self._show_web_content()
