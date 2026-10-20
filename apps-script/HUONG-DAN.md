# Gắn GPS từ quanlyxe.vn vào dashboard

Apps Script mỗi phút lấy vị trí 3 xe từ tính năng **chia sẻ vị trí** của quanlyxe.vn
rồi ghi vào Firebase nhánh `gps/`. Dashboard đọc nhánh này và hiện 1 dòng vị trí trên mỗi thẻ xe
(bấm vào mở Google Maps).

> Link chia sẻ có chứa token: ai có link là xem được vị trí xe.
> **Không dán link vào repo, config.js hay chat.** Chỉ dán vào Script Properties (bước 3).

## 1. Thêm quyền đọc `gps` vào Firebase Rules

Firebase Console → Realtime Database → Rules → thêm khối này vào trong `"rules": { ... }`
(cạnh `vehicles`, `history`...), rồi **Publish**:

```json
"gps": {
  ".read": "auth != null",
  ".write": false
},
```

Trình duyệt chỉ được đọc; Apps Script ghi bằng quyền chủ project nên không bị chặn.

## 2. Tạo Apps Script

1. Đăng nhập Google bằng **tài khoản chủ project Firebase** ((email đã ẩn)), mở https://script.google.com → **Dự án mới**, đặt tên "GPS xe cứu thương".
2. Dán nội dung `Code.gs` vào file Code.gs.
3. Project Settings (bánh răng) → bật **Show "appsscript.json" manifest file in editor** → mở `appsscript.json`, dán nội dung file `appsscript.json` trong thư mục này.

## 3. Lấy link chia sẻ và điền Script Properties

Mở https://quanlyxe.vn, đăng nhập, ở trang theo dõi xe bấm **F12 → Console**, dán đoạn sau rồi Enter:

```js
fetch('/Monitor.aspx/RefreshVehicle',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
.then(r=>r.json()).then(j=>{const h=j.Data[0],M={'50A-012.14':'xe1','50A-018.11':'xe2','50A-018.48':'xe3'};
j.Data.slice(1).forEach(v=>{const p=v[h.indexOf('Plate')],u=v[h.indexOf('LocationShareUrl')];
if(M[p]&&u)console.log('GPS_LINK_'+M[p]+'\n'+location.origin+u)})})
```

Console in ra 3 cặp tên + link. Trong Apps Script → Project Settings → **Script Properties** → thêm:

| Property | Value |
|---|---|
| `FIREBASE_DB_URL` | `https://xe-cuu-thuong-default-rtdb.asia-southeast1.firebasedatabase.app` |
| `GPS_LINK_xe1` | link của 50A-012.14 |
| `GPS_LINK_xe2` | link của 50A-018.11 |
| `GPS_LINK_xe3` | link của 50A-018.48 |

(Nếu đổi xe trong trang Nhật ký, tên sau `GPS_LINK_` phải trùng **id xe** ở đó.)

## 4. Chạy

Trong trình soạn thảo chọn hàm **`setup`** → **Run** → cấp quyền khi Google hỏi.
Execution log hiện vị trí 3 xe là xong; từ đó script tự chạy mỗi phút. Mở dashboard để xem.

- Tạm dừng: chạy hàm `stop`.
- Xem lỗi: menu **Executions** trong Apps Script.

## Ghi chú

- Vị trí cập nhật **mỗi 1 phút** (giới hạn lịch chạy miễn phí của Apps Script).
- Xe trong bán kính 150 m quanh bệnh viện và đứng yên thì hiện "Tại BV" (chỉnh `hospital` trong `config.js`).
- Quá 5 phút không có vị trí mới thì dòng vị trí mờ đi và báo "mất tín hiệu" (chỉnh `gpsStaleMinutes`).
- Cách này dùng API nội bộ của quanlyxe.vn: nếu Vietmap đổi giao diện hoặc thu hồi link chia sẻ thì cần sửa lại. Về lâu dài nên xin Vietmap API chính thức.
