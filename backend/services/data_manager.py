import random
import os
import json
from backend.data.vocabs.vocab_data import VOCABULARY
from backend.data.grammas.grammar_data import GRAMMAR

DRILLS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "grammas", "drillsGrammas")
LOCAL_VIDEOS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "grammas", "videos")

# Mapping bài học → URL video giảng dạy
VIDEO_URLS = {
    "1":  "https://videothaolejp.com/video-player/875d5de6-102f-4f8a-87a1-f46ac67d3ed8?theme=fantasy",
    "2":  "https://videothaolejp.com/video-player/e6b9f907-27fc-4732-a897-2196e10f8e5c?theme=fantasy",
    "3":  "https://videothaolejp.com/video-player/0e55d306-c98b-4a92-8ebc-0b942b3cd1aa?theme=fantasy",
    "4":  "https://videothaolejp.com/video-player/76c3efed-de3d-4013-a5a3-14d80e082fc3?theme=fantasy",
    "5":  "https://videothaolejp.com/video-player/bd8f6efc-e2c1-4ec0-a838-c71307a412a3?theme=fantasy",
    "6":  "https://videothaolejp.com/video-player/139d1184-aecf-4170-baec-09de34de4d4c?theme=fantasy",
    "7":  "https://videothaolejp.com/video-player/da3c1b84-9528-429f-9b62-fd86c21f063b?theme=fantasy",
    "8":  "https://videothaolejp.com/video-player/caa06777-6682-47a3-9230-85055ea18313?theme=fantasy",
}

# Nhãn bài học cho sidebar
LESSON_LABELS = {
    "1": "Bài 1 (1–20)",
    "2": "Bài 2 (21–40)",
    "3": "Bài 3 (41–60)",
    "4": "Bài 4 (61–80)",
    "5": "Bài 5 (81–90)",
    "6": "Bài 6 (91–111)",
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
    def get_local_video_path(session_id: str) -> str:
        """Trả về đường dẫn video cục bộ nếu có, ngược lại trả về None."""
        path = os.path.join(LOCAL_VIDEOS_DIR, f"lesson_{session_id}.mp4")
        if os.path.exists(path):
            return os.path.abspath(path)
        return None

    @staticmethod
    def get_lesson_label(session_id: str) -> str:
        """Trả về nhãn hiển thị cho bài học."""
        return LESSON_LABELS.get(str(session_id), f"Bài {session_id}")

    @staticmethod
    def get_drill_lesson_list():
        """Liệt kê các bài Drill có sẵn từ thư mục drills/."""
        lessons = []
        if not os.path.isdir(DRILLS_DIR):
            return lessons
        for fname in sorted(os.listdir(DRILLS_DIR)):
            if fname.endswith(".json"):
                fpath = os.path.join(DRILLS_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    lessons.append({
                        "filename": fname,
                        "lesson": data.get("lesson", 0),
                        "title": data.get("title", fname),
                        "time_limit_minutes": data.get("time_limit_minutes", 10),
                    })
                except Exception as e:
                    print(f"Error loading drill {fname}: {e}")
        return lessons

    @staticmethod
    def load_drill_lesson(filename):
        """Đọc nội dung bài Drill từ file JSON."""
        fpath = os.path.join(DRILLS_DIR, filename)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading drill file {filename}: {e}")
            return None
