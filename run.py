import sys
import os

# QWebEngineWidgets phải được import TRƯỚC khi QApplication được tạo (yêu cầu của Qt6)
os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-gpu --log-level=3"

from PyQt6.QtWidgets import QApplication
from PyQt6.QtWebEngineWidgets import QWebEngineView  # noqa: F401 – pre-import required
from frontend.main_window import MainWindow

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

