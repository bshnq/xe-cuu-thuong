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

  // Email chủ project: đăng nhập trang Nhật ký bằng email này để sửa xe, tài xế,
  // điểm đến và cấp quyền xem nhật ký. Phải trùng với email trong database.rules.json.
  ownerEmail: "(email đã ẩn)",

  // --- Giá trị MẶC ĐỊNH (chỉ dùng khi chưa lưu cài đặt trên trang Nhật ký) ---
  vehicles: [
    { id: "xe1", label: "Xe 1", plate: "50A-01214" },
    { id: "xe2", label: "Xe 2", plate: "50A-01811" },
    { id: "xe3", label: "Xe 3", plate: "50A-01848" }
  ],

  // --- GPS (đồng bộ từ quanlyxe.vn qua Apps Script, xem apps-script/HUONG-DAN.md) ---
  // Xe nằm trong bán kính này quanh bệnh viện thì hiện "Tại BV" thay cho địa chỉ.
  hospital: { lat: 10.76070, lng: 106.64815, radius: 150 },
  // Quá số phút này không có vị trí mới thì báo "mất tín hiệu".
  gpsStaleMinutes: 5,

  // Màu biển số: "white" (nền trắng, chữ đen) | "blue" (nền xanh, chữ trắng)
  plateStyle: "white",

  // --- Tài xế: tên + số điện thoại ---
  drivers: [
    { name: "Lê Nguyễn Hoàng Vũ",       phone: "(đã ẩn)" },
    { name: "Nguyễn Lương Hoàng Chung", phone: "(đã ẩn)" },
    { name: "Nguyễn Văn Nhu",           phone: "(đã ẩn)" },
    { name: "Trương Công Khanh",        phone: "(đã ẩn)" },
    { name: "Trần Minh Tân",            phone: "(đã ẩn)" }
  ],

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
