/* =========================================================================
   ĐỒNG BỘ GPS: quanlyxe.vn (Vietmap) -> Firebase "gps/<id xe>"
   Chạy trên Google Apps Script, bằng tài khoản CHỦ project Firebase.

   Không có bí mật nào trong file này. Link chia sẻ vị trí của từng xe
   (chứa token) để trong Project Settings -> Script Properties:
     FIREBASE_DB_URL  = https://xe-cuu-thuong-default-rtdb.asia-southeast1.firebasedatabase.app
     GPS_LINK_xe1     = link "Chia sẻ vị trí" của xe 1 trên quanlyxe.vn
     GPS_LINK_xe2     = ...
     GPS_LINK_xe3     = ...
   (tên sau GPS_LINK_ phải trùng id xe trong config.js / trang Nhật ký)

   Cài đặt: chạy hàm setup() một lần, cấp quyền khi Google hỏi.
   ========================================================================= */

var QLX = "https://quanlyxe.vn";
var EPOCH_2010_VN = Date.UTC(2010, 0, 1) - 7 * 3600 * 1000;   // GpsTime = giây từ 01/01/2010 giờ VN

/** Chạy 1 lần: kiểm tra cấu hình, đồng bộ thử, tạo lịch chạy mỗi phút. */
function setup() {
  Logger.log("Rules Firebase: " + ensureGpsRule());
  var res = syncGps();
  Logger.log("Đồng bộ thử: " + JSON.stringify(res, null, 1));
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "syncGps") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncGps").timeBased().everyMinutes(1).create();
  Logger.log("Đã tạo lịch chạy mỗi 1 phút.");
}

/** Gỡ lịch chạy (khi muốn tạm dừng). */
function stop() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "syncGps") ScriptApp.deleteTrigger(t);
  });
  Logger.log("Đã dừng đồng bộ GPS.");
}

/** Lấy vị trí mọi xe đã cấu hình và ghi lên Firebase. */
function syncGps() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var dbUrl = String(props.FIREBASE_DB_URL || "").replace(/\/+$/, "");
  if (!dbUrl) throw new Error("Thiếu Script Property FIREBASE_DB_URL");

  var cars = Object.keys(props)
    .filter(function (k) { return k.indexOf("GPS_LINK_") === 0 && props[k]; })
    .map(function (k) {
      var link = parseShareLink(props[k]);
      if (!link) throw new Error(k + " không phải link chia sẻ vị trí hợp lệ của quanlyxe.vn");
      return { id: k.slice(9), vehicleId: link.vehicleId, token: link.token };
    });
  if (!cars.length) throw new Error("Chưa có Script Property GPS_LINK_<id xe> nào");

  var reqs = cars.map(function (c) {
    return {
      url: QLX + "/Online.aspx/Refresh",
      method: "post",
      contentType: "application/json; charset=utf-8",
      payload: JSON.stringify({ id: c.vehicleId, token: c.token, time: 0 }),
      muteHttpExceptions: true
    };
  });
  var resps = UrlFetchApp.fetchAll(reqs);

  var now = Date.now(), patch = {}, report = {};
  cars.forEach(function (c, i) {
    var r = resps[i], code = r.getResponseCode();
    try {
      if (code !== 200) throw new Error("HTTP " + code);
      var g = parseRefresh(JSON.parse(r.getContentText("UTF-8")));
      g.fetchedAt = now;
      patch[c.id] = g;
      report[c.id] = g.plate + " " + g.lat + "," + g.lng + " " + g.speed + "km/h";
    } catch (e) {
      // giữ vị trí cũ, chỉ ghi lỗi để dashboard biết đang mất kết nối
      patch[c.id + "/error"] = String(e.message || e).slice(0, 120);
      patch[c.id + "/errorAt"] = now;
      report[c.id] = "LỖI: " + (e.message || e);
    }
  });

  var w = UrlFetchApp.fetch(dbUrl + "/gps.json?access_token=" + ScriptApp.getOAuthToken(), {
    method: "patch",
    contentType: "application/json",
    payload: JSON.stringify(patch),
    muteHttpExceptions: true
  });
  if (w.getResponseCode() !== 200) {
    throw new Error("Ghi Firebase lỗi HTTP " + w.getResponseCode() + ": " + w.getContentText().slice(0, 200));
  }
  return report;
}

/** Thêm khối "gps" (chỉ đọc) vào Rules của Firebase nếu chưa có.
    Rules cũ được sao lưu vào Script Property RULES_BACKUP trước khi sửa. */
function ensureGpsRule() {
  var dbUrl = String(PropertiesService.getScriptProperties().getProperty("FIREBASE_DB_URL") || "").replace(/\/+$/, "");
  if (!dbUrl) throw new Error("Thiếu Script Property FIREBASE_DB_URL");
  var url = dbUrl + "/.settings/rules.json?access_token=" + ScriptApp.getOAuthToken();
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error("Đọc Rules lỗi HTTP " + r.getResponseCode() + ": " + r.getContentText().slice(0, 200));
  var txt = r.getContentText(), rules;
  try { rules = JSON.parse(txt); } catch (e) {
    return "Rules có chú thích nên không tự sửa được, hãy thêm khối gps bằng tay (xem HUONG-DAN.md)";
  }
  if (!rules || !rules.rules) return "Rules không đúng dạng, hãy thêm khối gps bằng tay";
  if (rules.rules.gps) return "đã có khối gps, giữ nguyên";
  PropertiesService.getScriptProperties().setProperty("RULES_BACKUP", txt.slice(0, 9000));
  rules.rules.gps = { ".read": "auth != null", ".write": false };
  var w = UrlFetchApp.fetch(url, { method: "put", contentType: "application/json",
    payload: JSON.stringify(rules, null, 2), muteHttpExceptions: true });
  if (w.getResponseCode() !== 200) throw new Error("Ghi Rules lỗi HTTP " + w.getResponseCode() + ": " + w.getContentText().slice(0, 200));
  return "đã thêm khối gps (rules cũ sao lưu ở Script Property RULES_BACKUP)";
}

/* ---------- tiện ích ---------- */

function parseShareLink(s) {
  var m = String(s).match(/vehicleId=(\d+)/i), t = String(s).match(/token=([0-9A-Fa-f]+)/);
  return m && t ? { vehicleId: m[1], token: t[1] } : null;
}

/** Dữ liệu dạng bảng: Data[0] là tên cột, Data[1] là xe. */
function parseRefresh(j) {
  if (!j || !j.Data || j.Data.length < 2) throw new Error("Không có dữ liệu xe (token sai hoặc đã bị thu hồi?)");
  var h = j.Data[0], v = j.Data[1];
  function col(name) { var i = h.indexOf(name); return i < 0 ? null : v[i]; }
  var x = col("X"), y = col("Y");
  if (typeof x !== "number" || typeof y !== "number" || !x || !y) throw new Error("Không có tọa độ");
  var gps = col("GpsTime");
  return {
    lat: y / 1e6,
    lng: x / 1e6,
    speed: Math.round((col("Speed") || 0) / 100),   // quanlyxe lưu km/h x 100
    heading: col("Heading") || 0,
    gpsTime: typeof gps === "number" ? EPOCH_2010_VN + gps * 1000 : 0,
    address: String(col("Location") || "").trim(),
    plate: String(col("Plate") || ""),
    error: null, errorAt: null          // xóa lỗi cũ nếu có
  };
}
