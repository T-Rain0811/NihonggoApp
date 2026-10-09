# 🌸 JLPT N2 Mastery (Web & Mobile PWA)

Ứng dụng học và luyện thi tiếng Nhật **JLPT N2** toàn diện, hỗ trợ trải nghiệm tối ưu trên cả **Điện thoại (iPhone / Android)** và **Máy tính (PC / Mac)**.

---

## 🌐 Trải nghiệm trực tiếp trên Web / iPhone

Ứng dụng được triển khai sẵn trên **GitHub Pages**:
👉 **[https://t-rain0811.github.io/NihonggoApp/](https://t-rain0811.github.io/NihonggoApp/)**

### 📱 Hướng dẫn cài đặt lên màn hình chính iPhone (Add to Home Screen):
1. Mở trình duyệt **Safari** trên iPhone và truy cập link trên.
2. Nhấn nút **Chia sẻ (Share)** (biểu tượng ô vuông có mũi tên trỏ lên ở thanh công cụ Safari).
3. Chọn **Thêm vào MH chính (Add to Home Screen)** ➔ Nhấn **Thêm**.
4. Ứng dụng sẽ có biểu tượng app **JLPT N2** trên màn hình chính, mở lên chạy toàn màn hình và hỗ trợ học offline ngay cả khi mất mạng!

---

## 🚀 Các tính năng chính

### 1. 📚 Học Từ Vựng N2 (58 Bài)
- Danh sách từ vựng chi tiết: Kanji, Furigana, âm Hán Việt, nghĩa tiếng Việt, ví dụ.
- **Phát âm chuẩn tiếng Nhật**: Tích hợp công nghệ giọng đọc bản ngữ (Web Speech API).
- **Thẻ Flashcard 3D**: Lật thẻ mượt mà, xáo trộn (shuffle), theo dõi tiến độ học.
- **Trắc nghiệm ôn tập (Quiz)**: Tự tạo bài kiểm tra ghi nhớ nhanh.

### 2. ✍️ Học Ngữ Pháp N2 (8 Bài / 150 Mẫu)
- 150 mẫu ngữ pháp phân chia theo bài video bài bản.
- Giải thích cấu trúc ngữ pháp, lưu ý và ví dụ song ngữ Nhật - Việt.
- Xem trực tiếp video bài giảng Cloudinary.
- Bài tập trắc nghiệm ngữ pháp kèm đáp án và dịch nghĩa chi tiết.

### 3. 📝 Sổ Tay Từ Vựng Cá Nhân (Custom Vocab)
- Tự thêm từ vựng mới bất kỳ lúc nào ngay trên điện thoại hoặc máy tính.
- Dữ liệu lưu trữ an toàn trong bộ nhớ thiết bị (`localStorage`).
- **Ôn tập Flashcard & Trắc nghiệm** riêng cho danh sách từ bạn tự tạo.
- **Xuất / Nhập file JSON (Export & Import)**: Dễ dàng sao lưu dữ liệu hoặc chuyển qua lại giữa các máy.

### 4. ⚡ Luyện Power Drill N2 (60 Đề thi)
- 30 đề thi Power Drill Từ vựng & 30 đề thi Power Drill Ngữ pháp.
- Giả lập phòng thi với đồng hồ đếm ngược 20 phút.
- Tự động chấm điểm, tính tỷ lệ % chính xác và giải thích đáp án chi tiết từng câu.

### 5. 🌟 Chuyên đề mở rộng
- Ôn tập chuyên sâu: Tiền tố (Prefix), Từ tượng thanh / tượng hình (Mimetic), 220 cặp từ đồng nghĩa.

---

## 💻 Hướng dẫn chạy thử trên máy tính (Local)

Ứng dụng được xây dựng hoàn toàn bằng công nghệ Web hiện đại (HTML5, Modern CSS, ES Modules) nên **không cần cài đặt thêm bất kỳ thư viện bên ngoài nào**.

Bạn có thể chạy bằng một trong các cách sau:
1. **Cách 1:** Nhấp đúp chuột vào file `run.bat` (trên Windows).
2. **Cách 2:** Chạy lệnh:
   ```bash
   python run.py
   ```
   *Trình duyệt sẽ tự động mở trang web tại địa chỉ `http://localhost:8080/index.html`.*
3. **Cách 3:** Mở trực tiếp file `index.html` bằng trình duyệt web.

---

## 🛠️ Cấu trúc thư mục

```text
NihonggoApp/
├── assets/             # Icon ứng dụng (PWA, Apple touch icon)
├── css/                # Hệ thống giao diện hiện đại, Dark/Light mode, Responsive
├── js/                 # Logic ứng dụng, Router, Web Speech API, các View
│   ├── views/          # Màn hình Home, Vocab, Grammar, Drill, CustomVocab...
│   └── speech.js       # Hỗ trợ phát âm giọng Nhật bản ngữ
├── data/               # Dữ liệu JSON (Từ vựng, Ngữ pháp, Drills)
├── index.html          # Điểm vào chính của ứng dụng web
├── manifest.json       # Cấu hình PWA Web App Manifest
├── sw.js               # Service Worker hỗ trợ Offline cache
├── run.bat             # Script khởi động nhanh trên máy tính
└── run.py              # Script khởi động local web server
```
