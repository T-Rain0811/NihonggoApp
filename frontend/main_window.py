import os
from PyQt6.QtWidgets import QMainWindow, QStackedWidget, QMessageBox
from backend.services.data_manager import DataManager
from frontend.views.home_view import HomeView
from frontend.views.vocab_hub_view import VocabHubView
from frontend.views.grammar_hub_view import GrammarHubView
from frontend.views.vocab_session_view import VocabSessionView
from frontend.views.grammar_session_view import GrammarSessionView
from frontend.views.drill_view import DrillPracticeWidget
from frontend.views.extra_vocab_view import ExtraVocabView


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("JLPT N2 Mastery")
        self.resize(800, 600)

        self.stack = QStackedWidget()
        self.setCentralWidget(self.stack)

        # ── 0: Home ──────────────────────────────────────────────────────────
        self.home_view = HomeView()
        self.home_view.go_vocab.connect(
            lambda: self.stack.setCurrentWidget(self.vocab_hub)
        )
        self.home_view.go_grammar.connect(
            lambda: self.stack.setCurrentWidget(self.grammar_hub)
        )
        self.stack.addWidget(self.home_view)

        # ── 1: Vocab Hub (menu) ──────────────────────────────────────────────
        self.vocab_hub = VocabHubView()
        self.vocab_hub.go_home.connect(
            lambda: self.stack.setCurrentWidget(self.home_view)
        )
        self.vocab_hub.go_vocab_session.connect(
            lambda: self.stack.setCurrentWidget(self.vocab_session)
        )
        
        # Thêm 3 view tài liệu mở rộng
        from backend.data.vocabs.extra_vocab_data import PREFIX_DATA, MIMETIC_DATA, SYNONYM_DATA
        
        self.view_prefix = ExtraVocabView("Ôn Tiền Tố JLPT N2", PREFIX_DATA)
        self.view_prefix.go_back.connect(lambda: self.stack.setCurrentWidget(self.vocab_hub))
        self.stack.addWidget(self.view_prefix)
        
        self.view_mimetic = ExtraVocabView("Tượng Hình, Tượng Thanh", MIMETIC_DATA)
        self.view_mimetic.go_back.connect(lambda: self.stack.setCurrentWidget(self.vocab_hub))
        self.stack.addWidget(self.view_mimetic)
        
        self.view_synonym = ExtraVocabView("220 Cặp Từ Đồng Nghĩa N2", SYNONYM_DATA)
        self.view_synonym.go_back.connect(lambda: self.stack.setCurrentWidget(self.vocab_hub))
        self.stack.addWidget(self.view_synonym)

        self.vocab_hub.go_prefix.connect(lambda: self.stack.setCurrentWidget(self.view_prefix))
        self.vocab_hub.go_mimetic.connect(lambda: self.stack.setCurrentWidget(self.view_mimetic))
        self.vocab_hub.go_synonym.connect(lambda: self.stack.setCurrentWidget(self.view_synonym))
        self.vocab_hub.go_vocab_drill.connect(lambda: self.stack.setCurrentWidget(self.vocab_drill_view))
        self.stack.addWidget(self.vocab_hub)

        # ── 2: Grammar Hub (menu) ────────────────────────────────────────────
        self.grammar_hub = GrammarHubView()
        self.grammar_hub.go_home.connect(
            lambda: self.stack.setCurrentWidget(self.home_view)
        )
        self.grammar_hub.go_grammar_session.connect(
            lambda: self.stack.setCurrentWidget(self.grammar_session)
        )
        self.grammar_hub.go_grammar_drill.connect(
            lambda: self.stack.setCurrentWidget(self.grammar_drill_view)
        )
        self.stack.addWidget(self.grammar_hub)

        # ── 3: Vocab Session (sidebar + vocab content + flashcard btn) ───────
        self.vocab_session = VocabSessionView()
        self.vocab_session.go_back.connect(
            lambda: self.stack.setCurrentWidget(self.vocab_hub)
        )
        self.stack.addWidget(self.vocab_session)

        # ── 4: Grammar Session (sidebar + grammar content + quiz btn) ─────────
        self.grammar_session = GrammarSessionView()
        self.grammar_session.go_back.connect(
            lambda: self.stack.setCurrentWidget(self.grammar_hub)
        )
        self.stack.addWidget(self.grammar_session)

        # ── 5: Grammar Drill ─────────────────────────────────────────────────
        self.grammar_drill_view = DrillPracticeWidget(drill_type="grammar")
        self.grammar_drill_view.navigate_back.connect(
            lambda: self.stack.setCurrentWidget(self.grammar_hub)
        )
        self.stack.addWidget(self.grammar_drill_view)

        # ── 6: Vocab Drill ─────────────────────────────────────────────────
        self.vocab_drill_view = DrillPracticeWidget(drill_type="vocab")
        self.vocab_drill_view.navigate_back.connect(
            lambda: self.stack.setCurrentWidget(self.vocab_hub)
        )
        self.stack.addWidget(self.vocab_drill_view)

        self.load_styles()
        self.stack.setCurrentWidget(self.home_view)

    # ─── Navigation handlers ─────────────────────────────────────────────────

    def _placeholder_msg(self):
        QMessageBox.information(
            self, "Sắp ra mắt",
            "Chức năng này đang được phát triển.\nHãy quay lại sau! 🚀"
        )

    # ─── Style ───────────────────────────────────────────────────────────────

    def load_styles(self):
        style_path = os.path.join(
            os.path.dirname(__file__), 'assets', 'styles', 'styles.qss'
        )
        try:
            with open(style_path, "r", encoding="utf-8") as f:
                self.setStyleSheet(f.read())
        except Exception as e:
            print(f"Cannot load styles: {e}")
