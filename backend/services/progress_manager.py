import os
import json

PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "progress.json")

class ProgressManager:
    @staticmethod
    def load_progress():
        if not os.path.exists(PROGRESS_FILE):
            return {}
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    @staticmethod
    def save_progress(data):
        os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)
        with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

    @staticmethod
    def mark_drill_completed(drill_type, filename):
        data = ProgressManager.load_progress()
        if "completed_drills" not in data:
            data["completed_drills"] = {}
        if drill_type not in data["completed_drills"]:
            data["completed_drills"][drill_type] = []
            
        if filename not in data["completed_drills"][drill_type]:
            data["completed_drills"][drill_type].append(filename)
            ProgressManager.save_progress(data)

    @staticmethod
    def is_drill_completed(drill_type, filename):
        data = ProgressManager.load_progress()
        return filename in data.get("completed_drills", {}).get(drill_type, [])
