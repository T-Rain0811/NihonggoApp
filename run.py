import sys
import os
from PyQt6.QtWidgets import QApplication
from frontend.main_window import MainWindow

# Tắt GPU Acceleration cho Chromium để tránh tràn VRAM
os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-gpu --log-level=3"

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
