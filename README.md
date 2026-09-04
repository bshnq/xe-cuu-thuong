# 🚑 Quản lý xe cứu thương realtime

Web theo dõi tình trạng 2 xe cứu thương của bệnh viện theo thời gian thực.
Tài xế quét mã QR trên xe → chọn thời gian dự kiến → hệ thống báo xe đang đi và
đếm ngược giờ về. Bấm **“ĐÃ VỀ”** là xe trở lại **sẵn sàng**. Phòng điều hành mở
một đường link dashboard để xem tình hình cả 2 xe, tự cập nhật.

## Các trang

| File | Dùng cho | Mở khi |
|------|----------|--------|
| `index.html` | **Dashboard** phòng điều hành | Mở/treo trên màn hình, tự cập nhật |
| `xe.html?id=xe1` | **Trang tài xế** xe 1 | Tài xế quét QR |
| `xe.html?id=xe2` | **Trang tài xế** xe 2 | Tài xế quét QR |
| `qr.html` | Sinh & in mã QR dán lên xe | In một lần |

---

## 1) Xem thử ngay (chưa cần Firebase)

Khi chưa gắn Firebase, hệ thống chạy **chế độ demo** (lưu tạm trên trình duyệt).
Mở `index.html` và `xe.html?id=xe1` ở **hai tab của cùng một trình duyệt**: bấm nút
ở tab tài xế sẽ thấy dashboard đổi theo. (Demo chỉ đồng bộ trong một máy — muốn
đồng bộ giữa các thiết bị thật thì cần bước 2.)

---

## 2) Tạo Firebase (miễn phí, ~5 phút)

1. Vào **https://console.firebase.google.com** → **Add project** → đặt tên (vd
   `xe-cuu-thuong`) → tạo (có thể tắt Google Analytics).
2. Menu trái → **Build → Realtime Database** → **Create Database**.
   - Location: chọn **Singapore (asia-southeast1)** cho gần Việt Nam.
   - Chọn **Start in test mode** → Enable.
3. Sang tab **Rules** của Realtime Database, dán nội dung file
   [`database.rules.json`](database.rules.json) rồi **Publish**.
4. Lấy khóa cấu hình: bấm ⚙️ **Project settings** → kéo xuống **Your apps** →
   bấm biểu tượng **</>** (Web) → đặt nickname → **Register app**. Firebase hiện
   một khối `const firebaseConfig = { ... }`.
5. Mở file **`config.js`** trong dự án, chép các giá trị tương ứng vào (apiKey,
   authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId).
   > Quan trọng: phải có dòng **`databaseURL`** (dạng
   > `https://...asia-southeast1.firebasedatabase.app`). Nếu khối config không có,
   > copy từ trang Realtime Database.
6. Chỉnh danh sách xe / biển số / mốc thời gian trong `config.js` nếu cần.

Xong bước này, mở lại các trang là dữ liệu đồng bộ realtime giữa mọi thiết bị.

> **Về bảo mật:** rule yêu cầu đăng nhập ẩn danh (auth != null) - web tự đăng nhập
> ngầm, tài xế không thấy gì. Người ngoài gọi thẳng link database sẽ bị từ chối.
> Kèm kiểm tra định dạng dữ liệu để không ai ghi bậy. Cần bật Anonymous Auth trong
> Firebase (Build/Authentication -> Sign-in method -> Anonymous -> Enable).

---

## 3) Đưa lên mạng bằng GitHub Pages

1. Tạo repo mới trên GitHub (vd `xe-cuu-thuong`), **Public**.
2. Tải toàn bộ file trong thư mục này lên repo (kéo–thả ở nút **Add file → Upload
   files**, hoặc dùng git).
3. Vào **Settings → Pages** → mục **Build and deployment**: Source = **Deploy from
   a branch**, Branch = **main**, thư mục **/ (root)** → **Save**.
4. Đợi ~1 phút, GitHub cho đường link dạng
   `https://<tài-khoản>.github.io/xe-cuu-thuong/`.
   - **Dashboard** (gửi phòng điều hành): chính đường link trên (mở `index.html`).
   - Trang tài xế: `.../xe.html?id=xe1` và `.../xe.html?id=xe2`.

---

## 4) In mã QR dán lên xe

Mở `.../qr.html` **từ đường link GitHub Pages** (không phải file cục bộ) → bấm
**In**. Mã QR tự trỏ đúng về trang tài xế của từng xe. Cắt và dán lên mỗi xe.

---

## 5) Dùng hằng ngày

- **Tài xế** lên xe → quét QR → bấm mốc thời gian dự kiến (20/30/45/60 phút hoặc
  nhập tay). Về tới nơi bấm **ĐÃ VỀ**. Đi lâu hơn dự kiến thì bấm **+10 / +15 phút**.
- **Phòng điều hành** mở dashboard: xanh = sẵn sàng, vàng = đang đi (kèm đếm
  ngược), đỏ = đã quá giờ dự kiến về.
- Mỗi chuyến được lưu vào mục `history` trên Firebase để sau này làm báo cáo.

---
*KHOA CẤP CỨU — BVĐK LÃNH BINH THĂNG*
