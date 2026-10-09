import os
import sys
import json
sys.path.insert(0, os.path.abspath("."))
from backend.data.vocabs.vocab_data import VOCABULARY
from backend.data.vocabs.extra_vocab_data import PREFIX_DATA, MIMETIC_DATA, SYNONYM_DATA
from backend.data.grammas.grammar_data import GRAMMAR
from backend.services.data_manager import VIDEO_URLS, LESSON_LABELS

output_dir = "data"
os.makedirs(output_dir, exist_ok=True)

# 1. Export VOCABULARY
with open(os.path.join(output_dir, "vocab_data.json"), "w", encoding="utf-8") as f:
    json.dump(VOCABULARY, f, ensure_ascii=False, indent=2)
print("Exported vocab_data.json. Keys:", list(VOCABULARY.keys()))

# 2. Export EXTRA VOCAB
extra_vocab = {
    "prefix": PREFIX_DATA,
    "mimetic": MIMETIC_DATA,
    "synonym": SYNONYM_DATA
}
with open(os.path.join(output_dir, "extra_vocab_data.json"), "w", encoding="utf-8") as f:
    json.dump(extra_vocab, f, ensure_ascii=False, indent=2)
print("Exported extra_vocab_data.json")

# 3. Export GRAMMAR
with open(os.path.join(output_dir, "grammar_data.json"), "w", encoding="utf-8") as f:
    json.dump(GRAMMAR, f, ensure_ascii=False, indent=2)
print("Exported grammar_data.json. Keys:", list(GRAMMAR.keys()))

# 4. Export METADATA (VIDEO_URLS, LESSON_LABELS)
meta = {
    "video_urls": VIDEO_URLS,
    "lesson_labels": LESSON_LABELS
}
with open(os.path.join(output_dir, "meta.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)
print("Exported meta.json")

# 5. Copy or link drills
# Drills for Vocab
vocab_drills_src = os.path.join("backend", "data", "vocabs", "drillsVocabs")
vocab_drills_dest = os.path.join(output_dir, "drillsVocab")
os.makedirs(vocab_drills_dest, exist_ok=True)
vocab_drill_list = []
for fname in sorted(os.listdir(vocab_drills_src)):
    if fname.endswith(".json"):
        src_path = os.path.join(vocab_drills_src, fname)
        dest_path = os.path.join(vocab_drills_dest, fname)
        with open(src_path, "r", encoding="utf-8") as rf:
            d = json.load(rf)
            vocab_drill_list.append({
                "filename": fname,
                "lesson": d.get("lesson", 0),
                "title": d.get("title", fname),
                "time_limit_minutes": d.get("time_limit_minutes", 20)
            })
        with open(dest_path, "w", encoding="utf-8") as wf:
            json.dump(d, wf, ensure_ascii=False)

vocab_drill_list.sort(key=lambda x: x["lesson"])
with open(os.path.join(output_dir, "drills_vocab_list.json"), "w", encoding="utf-8") as f:
    json.dump(vocab_drill_list, f, ensure_ascii=False, indent=2)
print(f"Exported {len(vocab_drill_list)} vocab drill files.")

# Drills for Grammar
grammar_drills_src = os.path.join("backend", "data", "grammas", "drillsGrammas")
grammar_drills_dest = os.path.join(output_dir, "drillsGrammar")
os.makedirs(grammar_drills_dest, exist_ok=True)
grammar_drill_list = []
for fname in sorted(os.listdir(grammar_drills_src)):
    if fname.endswith(".json"):
        src_path = os.path.join(grammar_drills_src, fname)
        dest_path = os.path.join(grammar_drills_dest, fname)
        with open(src_path, "r", encoding="utf-8") as rf:
            d = json.load(rf)
            grammar_drill_list.append({
                "filename": fname,
                "lesson": d.get("lesson", 0),
                "title": d.get("title", fname),
                "time_limit_minutes": d.get("time_limit_minutes", 20)
            })
        with open(dest_path, "w", encoding="utf-8") as wf:
            json.dump(d, wf, ensure_ascii=False)

grammar_drill_list.sort(key=lambda x: x["lesson"])
with open(os.path.join(output_dir, "drills_grammar_list.json"), "w", encoding="utf-8") as f:
    json.dump(grammar_drill_list, f, ensure_ascii=False, indent=2)
print(f"Exported {len(grammar_drill_list)} grammar drill files.")
print("All exports completed successfully!")
