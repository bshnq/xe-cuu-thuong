/* =========================================================================
   CẤU HÌNH - chỉ cần sửa file này.
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

  // Mã tài khoản (uid) của chủ project trên Firebase. Chủ project sửa được xe, tài xế,
  // điểm đến, cấp quyền xem và in/đổi mã QR. Phải trùng với uid trong database.rules.json.
  // (uid không phải thông tin bí mật; email chủ project không ghi ở đây vì repo công khai.)
  ownerUid: "Ejd08GXR2zP7mo3OqNzba91QA8J2",

  // --- Giá trị MẶC ĐỊNH (chỉ dùng khi chưa lưu cài đặt trên trang Nhật ký) ---
  vehicles: [
    { id: "xe1", label: "Xe 1", plate: "50A-01214" },
    { id: "xe2", label: "Xe 2", plate: "50A-01811" },
    { id: "xe3", label: "Xe 3", plate: "50A-01848" }
  ],

  // --- GPS (đồng bộ từ quanlyxe.vn qua Apps Script, xem apps-script/HUONG-DAN.md) ---
  // Xe nằm trong bán kính này quanh bệnh viện thì hiện "Tại BV" thay cho địa chỉ.
  hospital: { lat: 10.76070, lng: 106.64815, radius: 150 },
  // Vị trí lấy từ quanlyxe.vn mỗi 10 phút (Apps Script). Báo "mất tín hiệu" khi:
  //  - thiết bị trên xe không gửi vị trí mới quá gpsStaleMinutes phút, hoặc
  //  - Apps Script không cập nhật quá gpsSyncStaleMinutes phút.
  gpsStaleMinutes: 30,
  gpsSyncStaleMinutes: 25,
  // Nút ↻ trên dashboard: URL Web App của Apps Script GPS (xem apps-script/HUONG-DAN.md).
  // Không phải bí mật: Web App chỉ chạy cho tài khoản được duyệt, tối đa 1 lần / 10 giây.
  gpsRefreshUrl: "https://script.google.com/macros/s/AKfycbwm320m3Lwk-6HRv7sD4ErlV5Y6clvk5DsnL63mT8Jyg6AJ5ACjGppYViAVVY_5Wz9Q/exec",

  // Màu biển số: "white" (nền trắng, chữ đen) | "blue" (nền xanh, chữ trắng)
  plateStyle: "white",

  // --- Tài xế: KHÔNG ghi ở đây (repo công khai). ---
  // Danh sách tên + số điện thoại lưu trên Firebase, sửa ở trang Nhật ký -> Cài đặt.
  drivers: [],

  // Số phút mỗi lần bấm +/− trên trang tài xế
  extendStep: 10,

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
