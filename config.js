/* =========================================================================
   CẤU HÌNH — chỉ cần sửa file này.
   Sau khi tạo project Firebase (xem README.md), dán khối firebaseConfig
   mà Firebase cho bạn vào đây, thay cho phần "PASTE_...".
   Khi chưa dán, hệ thống tự chạy CHẾ ĐỘ DEMO (lưu trên trình duyệt) để xem thử.
   ========================================================================= */

window.APP_CONFIG = {

  // --- Firebase (điền sau khi tạo project) ---
  firebase: {
    apiKey:            "AIzaSyBoXvZULGxVJd__2e4VVtkSahSBIdywMH8",
    authDomain:        "xe-cuu-thuong.firebaseapp.com",
    databaseURL:       "https://xe-cuu-thuong-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "xe-cuu-thuong",
    storageBucket:     "xe-cuu-thuong.firebasestorage.app",
    messagingSenderId: "530969217143",
    appId:             "1:530969217143:web:e6f33f98c590d0b8ed9e72",
    measurementId:     "G-MGPWCY7H0Q"
  },

  // --- Danh sách xe. Đổi nhãn/biển số theo thực tế. ---
  vehicles: [
    { id: "xe1", label: "Xe 1", plate: "" },
    { id: "xe2", label: "Xe 2", plate: "" }
  ],

  // --- Các mốc thời gian dự kiến (phút) hiện trên trang tài xế ---
  presets: [20, 30, 45, 60],

  // Giá trị mặc định của ô "Khác" (phút)
  customDefault: 90,

  // Gợi ý điểm đến nhanh trên trang tài xế
  destinations: ["Chợ Rẫy", "Trưng Vương", "BV 115", "Nguyễn Tri Phương"],

  // Đơn vị công tác (hiện ở chân trang)
  unit: "KHOA CẤP CỨU - BVĐK LÃNH BINH THĂNG"
};

/* Có phải đang ở chế độ demo không? (khi chưa dán khóa Firebase) */
window.APP_CONFIG.isDemo =
  window.APP_CONFIG.firebase.apiKey.indexOf("PASTE_") === 0;
