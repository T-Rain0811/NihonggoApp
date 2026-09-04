import random
from backend.data.vocab_data import VOCABULARY
from backend.data.grammar_data import GRAMMAR

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
    def get_session_data(session_id):
        """Lấy dữ liệu từ vựng và ngữ pháp cho một bài cụ thể."""
        vocab = VOCABULARY.get(str(session_id), [])
        grammar = GRAMMAR.get(str(session_id), [])
        return vocab, grammar
