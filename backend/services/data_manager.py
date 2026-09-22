import random
import os
import json
from backend.data.vocabs.vocab_data import VOCABULARY
from backend.data.grammas.grammar_data import GRAMMAR

DRILLS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "grammas", "drillsGrammas")
VOCAB_DRILLS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "vocabs", "drillsVocabs")

# Mapping bài học → URL video giảng dạy
VIDEO_URLS = {
    "1":  "https://res.cloudinary.com/ustliutq/video/upload/v1789351058/lesson_1.mp4",
    "2":  "https://res.cloudinary.com/ustliutq/video/upload/v1789351105/lesson_2.mp4",
    "3":  "https://res.cloudinary.com/ustliutq/video/upload/v1789350758/lesson_3.mp4",
    "4":  "https://res.cloudinary.com/ustliutq/video/upload/v1789351204/lesson_4.mp4",
    "5":  "https://res.cloudinary.com/ustliutq/video/upload/v1789350721/lesson_5.mp4",
    "6":  "https://res.cloudinary.com/ustliutq/video/upload/v1789351317/lesson_6.mp4",
    "7":  "https://res.cloudinary.com/ustliutq/video/upload/v1789351366/lesson_7.mp4",
    "8":  "https://res.cloudinary.com/ustliutq/video/upload/v1789350854/lesson_8.mp4",
}

# Nhãn bài học cho sidebar
LESSON_LABELS = {
    "1": "Bài 1 (1–20)",
    "2": "Bài 2 (21–40)",
    "3": "Bài 3 (41–60)",
    "4": "Bài 4 (61–80)",
    "5": "Bài 5 (81–89)",
    "6": "Bài 6 (90–111)",
    "7": "Bài 7 (112–130)",
    "8": "Bài 8 (131–150)",
}

class DataManager:
    @staticmethod
    def get_vocab_for_sessions(session_ids):
        """Lấy danh sách từ vựng cho các bài học được chọn."""
        combined_vocab = []
        for s_id in session_ids:
            # VOCABULARY keys might be strings due to JSON conversion
            combined_vocab.extend(VOCABULARY.get(str(s_id), []))
        return combined_vocab

    @staticmethod
    def get_grammar_quiz_for_sessions(session_ids):
        """Lấy danh sách câu hỏi trắc nghiệm từ ngữ pháp của các bài học được chọn."""
        valid_grammar_items = []
        for s_id in session_ids:
            grammar_items = GRAMMAR.get(str(s_id), [])
            for item in grammar_items:
                if item.get("quizzes"):
                    valid_grammar_items.append((str(s_id), item))
                    
        # Trộn ngẫu nhiên các mẫu ngữ pháp
        random.shuffle(valid_grammar_items)
        
        questions_pool = []
        for s_id, item in valid_grammar_items:
            # Chọn ngẫu nhiên 1 câu hỏi từ mẫu ngữ pháp này
            q = random.choice(item["quizzes"])
            q_copy = q.copy()
            q_copy["session"] = s_id
            q_copy["pattern"] = item.get("pattern", "")
            q_copy["meaning"] = item.get("meaning", "")
            questions_pool.append(q_copy)
            
        random.shuffle(questions_pool)
        return questions_pool

    @staticmethod
    def get_session_keys():
        """Lấy danh sách các bài học có sẵn (từ vựng)."""
        keys = list(VOCABULARY.keys())
        # Sắp xếp số học nếu có thể
        try:
            keys.sort(key=int)
        except ValueError:
            keys.sort()
        return keys

    @staticmethod
    def get_grammar_session_keys():
        """Lấy danh sách các bài học có sẵn (ngữ pháp)."""
        keys = list(GRAMMAR.keys())
        try:
            keys.sort(key=int)
        except ValueError:
            keys.sort()
        return keys

    @staticmethod
    def get_session_data(session_id):
        """Lấy dữ liệu từ vựng và ngữ pháp cho một bài cụ thể."""
        vocab = VOCABULARY.get(str(session_id), [])
        grammar = GRAMMAR.get(str(session_id), [])
        return vocab, grammar

    @staticmethod
    def get_video_url(session_id: str) -> str:
        """Trả về URL video cho bài học."""
        return VIDEO_URLS.get(str(session_id), "")

    @staticmethod
    def get_lesson_label(session_id: str) -> str:
        """Trả về nhãn hiển thị cho bài học."""
        return LESSON_LABELS.get(str(session_id), f"Bài {session_id}")

    @staticmethod
    def get_drill_lesson_list(drill_type="grammar"):
        """Liệt kê các bài Drill có sẵn từ thư mục drills/."""
        lessons = []
        target_dir = DRILLS_DIR if drill_type == "grammar" else VOCAB_DRILLS_DIR
        if not os.path.isdir(target_dir):
            return lessons
        for fname in sorted(os.listdir(target_dir)):
            if fname.endswith(".json"):
                fpath = os.path.join(target_dir, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    lessons.append({
                        "filename": fname,
                        "lesson": data.get("lesson", 0),
                        "title": data.get("title", fname),
                        "time_limit_minutes": data.get("time_limit_minutes", 20),
                    })
                except Exception as e:
                    print(f"Error loading drill {fname}: {e}")
        return lessons

    @staticmethod
    def load_drill_lesson(filename, drill_type="grammar"):
        """Đọc nội dung bài Drill từ file JSON."""
        target_dir = DRILLS_DIR if drill_type == "grammar" else VOCAB_DRILLS_DIR
        fpath = os.path.join(target_dir, filename)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading drill file {filename}: {e}")
            return None
