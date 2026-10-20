/* =========================================================================
   LỚP DỮ LIỆU (store) - che giấu Firebase, cho phép chạy demo offline.
   Cả 2 backend cùng một giao diện:
     Store.subscribeAll(cb)                    -> cb(mapTrạngThái) mỗi khi có thay đổi
     Store.startTrip(id, minutes, dest, driver)
     Store.extendTrip(id, minutes)             -> cộng thêm phút (tính từ giờ về dự kiến,
                                                  hoặc từ "bây giờ" nếu đã quá giờ)
     Store.shortenTrip(id, minutes)            -> bớt phút (không về trước "bây giờ")
     Store.endTrip(id)
     Store.setDriver(id, driver)
     Store.logOpen(id)                         -> ghi nhật ký "mở trang xe"
     Store.subscribeLogs(fromMs, toMs, cb)     -> cb(mảngNhậtKý), trả về hàm hủy theo dõi

   Cài đặt (xe, tài xế, điểm đến) lưu trên Firebase, chỉ chủ project sửa được:
     Store.onSettings(cb)                      -> cb() khi cài đặt tải xong / thay đổi
     Store.saveSettings({vehicles, drivers, destinations})
   Đăng nhập / phân quyền (trang log.html dùng Google):
     Store.onUser(cb), Store.signInGoogle(), Store.signOut(), Store.isOwner()
     Store.subscribeViewers(cb), Store.addViewer(email), Store.removeViewer(email)
   Thùng rác nhật ký (chỉ ẩn khỏi giao diện, dữ liệu trên Firebase không bị xóa):
     Store.subscribeTrash(cb), Store.trashLogs(fromMs, toMs, count), Store.restoreTrash(id)

   Trạng thái mỗi xe:
     { status:"available"|"busy", departAt, etaMinutes, returnAt, destination,
       driver, tripId, extendCount, updatedAt }

   Mỗi thao tác đều ghi 1 dòng NHẬT KÝ (logs) chỉ-thêm-không-sửa:
     { ts, serverTs, action, vehicle, label, plate, driver, tripId,
       destination, etaMinutes, departAt, returnAt, ...chi tiết riêng của hành động,
       page, device, ua, session, uid }
   action: "open" | "start" | "extend" | "shorten" | "end" | "driver"
   ========================================================================= */
(function () {
  "use strict";
  var CFG = window.APP_CONFIG;

  function nowMs() { return Date.now(); }

  function blankVehicle() {
    return { status: "available", departAt: 0, etaMinutes: 0, returnAt: 0,
             destination: "", driver: "", tripId: "", extendCount: 0 };
  }
  function blankState() {
    var map = {};
    CFG.vehicles.forEach(function (v) { map[v.id] = blankVehicle(); });
    return map;
  }
  function vehMeta(id) {
    return CFG.vehicles.filter(function (v) { return v.id === id; })[0] || { id: id, label: id, plate: "" };
  }
  function clean(o) {           // Firebase không nhận giá trị undefined
    var r = {};
    Object.keys(o).forEach(function (k) { if (o[k] !== undefined && o[k] !== null) r[k] = o[k]; });
    return r;
  }
  function newId() {
    return nowMs().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  /* ----- thông tin thiết bị / phiên (để biết ai, máy nào bấm) ----- */
  var SESSION = newId();
  var PAGE = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  function deviceName() {
    var ua = navigator.userAgent || "", os = "Khác", br = "";
    if (/iPhone/.test(ua)) os = "iPhone";
    else if (/iPad/.test(ua)) os = "iPad";
    else if (/Android/.test(ua)) {
      var m = ua.match(/Android [\d.]+; ([^;)]+)/);
      os = "Android" + (m && m[1] && !/^(K|wv)$/.test(m[1].trim()) ? " (" + m[1].trim() + ")" : "");
    }
    else if (/Windows/.test(ua)) os = "Windows";
    else if (/Mac OS X/.test(ua)) os = "Mac";
    else if (/Linux/.test(ua)) os = "Linux";
    if (/Zalo/i.test(ua)) br = "Zalo";
    else if (/FBAN|FBAV/.test(ua)) br = "Facebook";
    else if (/Edg\//.test(ua)) br = "Edge";
    else if (/CriOS|Chrome\//.test(ua)) br = "Chrome";
    else if (/FxiOS|Firefox\//.test(ua)) br = "Firefox";
    else if (/Safari\//.test(ua)) br = "Safari";
    return os + (br ? " · " + br : "");
  }
  var DEVICE = deviceName();

  /* ----- các phép biến đổi trạng thái (dùng chung cho cả 2 backend) -----
     Trả về trạng thái mới, hoặc undefined nếu thao tác không hợp lệ. */
  var OPS = {
    start: function (cur, a) {
      if (cur.status === "busy") return undefined;           // xe đã đi rồi
      var t = nowMs();
      return { status: "busy", departAt: t, etaMinutes: a.minutes,
               returnAt: t + a.minutes * 60000, destination: a.dest || "",
               driver: a.driver || cur.driver || "", tripId: a.tripId,
               extendCount: 0, updatedAt: t };
    },
    extend: function (cur, a) {
      if (cur.status !== "busy") return undefined;
      var t = nowMs();
      var base = Math.max(cur.returnAt || t, t);              // đã trễ thì cộng từ "bây giờ"
      var ret = base + a.minutes * 60000;
      return Object.assign({}, cur, {
        returnAt: ret,
        etaMinutes: Math.round((ret - (cur.departAt || t)) / 60000),
        extendCount: (cur.extendCount || 0) + 1,
        updatedAt: t
      });
    },
    shorten: function (cur, a) {
      if (cur.status !== "busy") return undefined;
      var t = nowMs();
      if ((cur.returnAt || 0) <= t) return undefined;          // đã quá giờ: không rút ngắn
      var ret = Math.max(cur.returnAt - a.minutes * 60000, t, (cur.departAt || t) + 5 * 60000);
      if (ret >= cur.returnAt) return undefined;
      return Object.assign({}, cur, {
        returnAt: ret,
        etaMinutes: Math.round((ret - (cur.departAt || t)) / 60000),
        updatedAt: t
      });
    },
    end: function (cur) {
      if (cur.status !== "busy") return undefined;
      var b = blankVehicle();
      b.driver = cur.driver || "";                            // giữ tài xế cho chuyến sau
      b.updatedAt = nowMs();
      return b;
    },
    driver: function (cur, a) {
      if ((cur.driver || "") === (a.driver || "")) return undefined;
      return Object.assign({}, cur, { driver: a.driver || "", updatedAt: nowMs() });
    }
  };

  /* ----- dựng dòng nhật ký từ trạng thái trước/sau ----- */
  function buildLog(id, action, prev, next) {
    var m = vehMeta(id), t = nowMs();
    var trip = action === "end" ? prev : next;
    var e = {
      ts: t, action: action,
      vehicle: id, label: m.label, plate: m.plate || "",
      driver: (next && next.driver) || (prev && prev.driver) || "",
      tripId: trip.tripId || "",
      destination: trip.destination || "",
      etaMinutes: trip.etaMinutes || 0,
      departAt: trip.departAt || 0,
      returnAt: trip.returnAt || 0,
      page: PAGE, device: DEVICE, ua: (navigator.userAgent || "").slice(0, 300),
      session: SESSION
    };
    if (action === "extend" || action === "shorten") {
      e.addMinutes = Math.round((next.returnAt - prev.returnAt) / 60000);
      e.prevReturnAt = prev.returnAt;
      e.extendCount = next.extendCount;
      e.wasLate = t > prev.returnAt;
    }
    if (action === "end") {
      e.actualReturnAt = t;
      e.durationMin = Math.round((t - prev.departAt) / 60000);
      e.lateMin = Math.max(0, Math.round((t - prev.returnAt) / 60000));
      e.extendCount = prev.extendCount || 0;
    }
    if (action === "driver") {
      e.prevDriver = prev.driver || "";
      e.wasBusy = prev.status === "busy";
    }
    return e;
  }
  function historyFromLog(e) {           // bản tóm tắt chuyến (giữ tương thích nhánh "history" cũ)
    return {
      vehicle: e.vehicle, plate: e.plate, driver: e.driver, tripId: e.tripId,
      departAt: e.departAt, etaMinutes: e.etaMinutes, returnAt: e.returnAt,
      actualReturnAt: e.actualReturnAt, destination: e.destination,
      durationMin: e.durationMin, lateMin: e.lateMin, extendCount: e.extendCount
    };
  }

  /* ---------------------- Cài đặt dùng chung ---------------------- */
  var DEFAULTS = JSON.parse(JSON.stringify({
    vehicles: CFG.vehicles, drivers: CFG.drivers || [], destinations: CFG.destinations || []
  }));
  function toArr(v) {               // Firebase có thể trả mảng dạng object {0:..,1:..}
    if (!v) return [];
    return Array.isArray(v) ? v.filter(Boolean) : Object.keys(v).sort(function (a, b) { return a - b; }).map(function (k) { return v[k]; }).filter(Boolean);
  }
  function applySettings(val) {
    val = val || {};
    var veh = toArr(val.vehicles), drv = toArr(val.drivers), dst = toArr(val.destinations);
    CFG.vehicles = veh.length ? veh : JSON.parse(JSON.stringify(DEFAULTS.vehicles));
    CFG.drivers = val.drivers !== undefined ? drv : JSON.parse(JSON.stringify(DEFAULTS.drivers));
    CFG.destinations = val.destinations !== undefined ? dst : DEFAULTS.destinations.slice();
  }
  function emailKey(email) { return String(email || "").trim().toLowerCase().replace(/\./g, ","); }
  function cleanSettings(o) {
    return {
      vehicles: (o.vehicles || []).map(function (v) {
        return { id: String(v.id), label: String(v.label || "").trim().slice(0, 30), plate: String(v.plate || "").trim().toUpperCase().slice(0, 15) };
      }).filter(function (v) { return v.id && v.label; }),
      drivers: (o.drivers || []).map(function (d) {
        return { name: String(d.name || "").trim().slice(0, 60), phone: String(d.phone || "").replace(/[^\d+]/g, "").slice(0, 15) };
      }).filter(function (d) { return d.name; }),
      destinations: (o.destinations || []).map(function (x) { return String(x || "").trim().slice(0, 40); }).filter(Boolean)
    };
  }
  function adminLog(action, note) {
    return { ts: nowMs(), action: action, vehicle: "admin", label: "Quản trị", note: String(note || "").slice(0, 300),
             page: PAGE, device: DEVICE, ua: (navigator.userAgent || "").slice(0, 300), session: SESSION };
  }
  function diffNote(oldS, newS) {
    var parts = [];
    function cmp(name, a, b, keyf) {
      var A = a.map(keyf), B = b.map(keyf);
      var add = B.filter(function (x) { return A.indexOf(x) < 0; }), del = A.filter(function (x) { return B.indexOf(x) < 0; });
      if (add.length) parts.push("thêm " + name + ": " + add.join(", "));
      if (del.length) parts.push("bỏ " + name + ": " + del.join(", "));
    }
    cmp("xe", oldS.vehicles, newS.vehicles, function (v) { return v.label + (v.plate ? " " + v.plate : ""); });
    cmp("tài xế", oldS.drivers, newS.drivers, function (d) { return d.name + (d.phone ? " " + d.phone : ""); });
    cmp("điểm đến", oldS.destinations, newS.destinations, function (x) { return x; });
    return parts.join(" · ") || "lưu cài đặt (không đổi)";
  }
  function currentSettings() {
    return cleanSettings({ vehicles: CFG.vehicles, drivers: CFG.drivers, destinations: CFG.destinations });
  }

  /* ---------------------- Backend Firebase ----------------------
     Trang thường (tài xế, dashboard, QR): đăng nhập ẩn danh, tài xế không thấy gì.
     Trang log.html (window.APP_AUTH = "google"): phải đăng nhập Google.
     Mỗi thao tác xe dùng transaction để 2 điện thoại bấm cùng lúc không đè nhau. */
  var GOOGLE = window.APP_AUTH === "google";
  function FirebaseStore() {
    var self = this;
    firebase.initializeApp(CFG.firebase);
    this.db = firebase.database();
    this.auth = firebase.auth();
    this.ref = this.db.ref("vehicles");
    this.user = null; this.userCbs = []; this.settingsCbs = []; this.vehCbs = [];
    this.settingsLoaded = false; this._lastVeh = null;
    if (GOOGLE) this.auth.getRedirectResult().catch(function (e) { console.error(e && e.message); });
    this.ready = new Promise(function (resolve) {
      self.auth.onAuthStateChanged(function (u) {
        var ok = u && (!GOOGLE || !u.isAnonymous);
        self.user = ok ? u : null; self.authKnown = true;
        self.userCbs.forEach(function (cb) { cb(self.user); });
        if (ok) resolve(u);
        else if (!GOOGLE && !u) self.auth.signInAnonymously().catch(function (e) {
          console.error("Đăng nhập ẩn danh lỗi:", e && e.message);
        });
      });
    });
    this.settingsReady = this.ready.then(function () {
      return new Promise(function (resolve) {
        self.db.ref("settings").on("value", function (snap) {
          applySettings(snap.val());
          self.settingsLoaded = true;
          resolve();
          self.settingsCbs.forEach(function (cb) { cb(); });
          self._emitVeh();
        }, function (err) { console.error("Đọc cài đặt lỗi:", err && err.message); applySettings(null); resolve(); });
      });
    });
  }
  FirebaseStore.prototype.onUser = function (cb) { this.userCbs.push(cb); if (this.authKnown) cb(this.user); };
  FirebaseStore.prototype.isOwner = function () {
    var u = this.user;
    return !!(u && u.email && u.emailVerified && u.email.toLowerCase() === String(CFG.ownerEmail || "").toLowerCase());
  };
  FirebaseStore.prototype.signInGoogle = function () {
    var self = this, provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return this.auth.signInWithPopup(provider).catch(function (e) {
      if (e && /popup|operation-not-supported|cancelled-popup/.test(e.code || "")) return self.auth.signInWithRedirect(provider);
      alert("Đăng nhập không thành công: " + (e && e.message));
    });
  };
  FirebaseStore.prototype.signOut = function () { return this.auth.signOut(); };

  FirebaseStore.prototype.onSettings = function (cb) {
    this.settingsCbs.push(cb);
    if (this.settingsLoaded) cb();
  };
  FirebaseStore.prototype.saveSettings = function (obj) {
    var self = this, next = cleanSettings(obj), note = diffNote(currentSettings(), next);
    return this.ready.then(function (user) {
      return self.db.ref("settings").set(next).then(function () {
        var e = adminLog("settings", note); e.uid = user.uid; e.by = user.email || "";
        e.serverTs = firebase.database.ServerValue.TIMESTAMP;
        self.db.ref("logs").push(clean(e));
        return true;
      });
    });
  };
  FirebaseStore.prototype.subscribeViewers = function (cb) {
    var self = this, r = null;
    this.ready.then(function () {
      r = self.db.ref("access/viewers");
      r.on("value", function (snap) {
        var arr = []; snap.forEach(function (c) { arr.push(c.val()); });
        cb(arr.sort(function (a, b) { return (a.email || "").localeCompare(b.email || ""); }));
      }, function (err) { cb([], err); });
    });
    return function () { if (r) r.off(); };
  };
  FirebaseStore.prototype._access = function (action, email, val) {
    var self = this, k = emailKey(email);
    return this.ready.then(function (user) {
      return self.db.ref("access/viewers/" + k).set(val).then(function () {
        var e = adminLog("access", (val ? "cấp quyền xem nhật ký: " : "thu hồi quyền: ") + String(email).trim().toLowerCase());
        e.uid = user.uid; e.by = user.email || "";
        e.serverTs = firebase.database.ServerValue.TIMESTAMP;
        self.db.ref("logs").push(clean(e));
      });
    });
  };
  FirebaseStore.prototype.addViewer = function (email) {
    return this._access("add", email, { email: String(email).trim().toLowerCase(), addedAt: firebase.database.ServerValue.TIMESTAMP });
  };
  FirebaseStore.prototype.removeViewer = function (email) { return this._access("remove", email, null); };

  FirebaseStore.prototype._emitVeh = function () {
    if (this._lastVeh === null) return;
    var val = this._lastVeh, map = blankState();
    Object.keys(map).forEach(function (id) { if (val[id]) map[id] = Object.assign(map[id], val[id]); });
    this.vehCbs.forEach(function (cb) { cb(map); });
  };
  FirebaseStore.prototype.subscribeAll = function (cb) {
    var self = this;
    this.vehCbs.push(cb);
    if (this.vehCbs.length > 1) { this._emitVeh(); return; }
    this.settingsReady.then(function () {
      self.ref.on("value", function (snap) { self._lastVeh = snap.val() || {}; self._emitVeh(); });
    });
  };
  FirebaseStore.prototype._mutate = function (id, action, args) {
    var self = this;
    return this.ready.then(function (user) {
      var prev = null;
      return self.ref.child(id).transaction(function (cur) {
        prev = Object.assign(blankVehicle(), cur || {});
        var next = OPS[action](prev, args || {});
        return next === undefined ? undefined : clean(next);
      }).then(function (res) {
        if (!res.committed) return false;
        var next = Object.assign(blankVehicle(), res.snapshot.val() || {});
        var e = buildLog(id, action, prev, next);
        e.uid = user && user.uid;
        if (user && user.email) e.by = user.email;
        e.serverTs = firebase.database.ServerValue.TIMESTAMP;
        self.db.ref("logs").push(clean(e));
        if (action === "end") self.db.ref("history").push(clean(historyFromLog(e)));
        return true;
      });
    }).catch(function (err) {
      console.error("Lỗi ghi dữ liệu:", err && err.message);
      alert("Không ghi được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.\n(" + (err && err.message) + ")");
      return false;
    });
  };
  FirebaseStore.prototype.logOpen = function (id) {
    var self = this;
    this.settingsReady.then(function () {
      var user = self.user;
      self.ref.child(id).once("value", function (snap) {
        var cur = Object.assign(blankVehicle(), snap.val() || {});
        var e = buildLog(id, "open", cur, cur);
        e.status = cur.status;
        e.uid = user && user.uid;
        e.serverTs = firebase.database.ServerValue.TIMESTAMP;
        self.db.ref("logs").push(clean(e));
      });
    });
  };
  FirebaseStore.prototype.subscribeLogs = function (fromMs, toMs, cb) {
    var self = this, q = null, handler = null, cancelled = false;
    this.ready.then(function () {
      if (cancelled) return;
      q = self.db.ref("logs").orderByChild("ts").startAt(fromMs).endAt(toMs);
      handler = q.on("value", function (snap) {
        var arr = [];
        snap.forEach(function (c) { var v = c.val(); v._key = c.key; arr.push(v); });
        cb(arr);
      }, function (err) {
        console.error("Đọc nhật ký lỗi:", err && err.message);
        cb([], err);
      });
    });
    return function () { cancelled = true; if (q && handler) q.off("value", handler); };
  };


  /* ----- thùng rác nhật ký: chỉ ẨN trên giao diện, dữ liệu gốc vẫn còn ----- */
  FirebaseStore.prototype.subscribeTrash = function (cb) {
    var self = this, r = null;
    this.ready.then(function () {
      r = self.db.ref("logView/trash");
      r.on("value", function (snap) {
        var arr = []; snap.forEach(function (c) { var v = c.val(); v.id = c.key; arr.push(v); });
        cb(arr.sort(function (a, b) { return b.at - a.at; }));
      }, function () { cb([]); });
    });
    return function () { if (r) r.off(); };
  };
  FirebaseStore.prototype.trashLogs = function (fromMs, toMs, count) {
    var self = this;
    return this.ready.then(function (user) {
      return self.db.ref("logView/trash").push({ from: fromMs, to: toMs, count: count || 0,
        at: firebase.database.ServerValue.TIMESTAMP, by: user.email || "" });
    });
  };
  FirebaseStore.prototype.restoreTrash = function (id) {
    return this.db.ref("logView/trash/" + id).remove();
  };

  /* ---------------------- Backend Demo (localStorage) ----------------------
     Dùng để xem thử khi chưa gắn Firebase. Nhiều tab cùng trình duyệt sẽ
     đồng bộ qua sự kiện 'storage'. Ở demo luôn coi như đã đăng nhập chủ project. */
  var KEY = "ambulance_demo_v1", LOGKEY = "ambulance_demo_logs_v1",
      SETKEY = "ambulance_demo_settings_v1", ACCKEY = "ambulance_demo_viewers_v1";
  function DemoStore() {
    if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, "{}");
    this.cbs = []; this.logCbs = []; this.settingsCbs = []; this.viewerCbs = [];
    this.user = { uid: "demo", email: CFG.ownerEmail, emailVerified: true };
    this._loadSettings();
    var self = this;
    window.addEventListener("storage", function (e) {
      if (e.key === KEY) self._emit();
      if (e.key === LOGKEY) self._emitLogs();
      if (e.key === SETKEY) { self._loadSettings(); self.settingsCbs.forEach(function (cb) { cb(); }); self._emit(); }
      if (e.key === ACCKEY) self._emitViewers();
    });
  }
  DemoStore.prototype._loadSettings = function () {
    try { applySettings(JSON.parse(localStorage.getItem(SETKEY) || "null")); } catch (e) { applySettings(null); }
  };
  DemoStore.prototype.onUser = function (cb) { cb(this.user); };
  DemoStore.prototype.isOwner = function () { return true; };
  DemoStore.prototype.signInGoogle = function () { return Promise.resolve(); };
  DemoStore.prototype.signOut = function () { alert("Chế độ demo: không có đăng xuất."); return Promise.resolve(); };
  DemoStore.prototype.onSettings = function (cb) { this.settingsCbs.push(cb); cb(); };
  DemoStore.prototype.saveSettings = function (obj) {
    var next = cleanSettings(obj), note = diffNote(currentSettings(), next);
    localStorage.setItem(SETKEY, JSON.stringify(next));
    this._loadSettings();
    this.settingsCbs.forEach(function (cb) { cb(); });
    this._emit();
    var e = adminLog("settings", note); e.by = this.user.email; this._pushLog(e);
    return Promise.resolve(true);
  };
  DemoStore.prototype._viewers = function () {
    try { return JSON.parse(localStorage.getItem(ACCKEY) || "{}"); } catch (e) { return {}; }
  };
  DemoStore.prototype._emitViewers = function () {
    var v = this._viewers(), arr = Object.keys(v).map(function (k) { return v[k]; });
    this.viewerCbs.forEach(function (cb) { cb(arr); });
  };
  DemoStore.prototype.subscribeViewers = function (cb) { this.viewerCbs.push(cb); this._emitViewers(); return function () {}; };
  DemoStore.prototype.addViewer = function (email) {
    var v = this._viewers(); email = String(email).trim().toLowerCase();
    v[emailKey(email)] = { email: email, addedAt: nowMs() };
    localStorage.setItem(ACCKEY, JSON.stringify(v)); this._emitViewers();
    var e = adminLog("access", "cấp quyền xem nhật ký: " + email); e.by = this.user.email; this._pushLog(e);
    return Promise.resolve();
  };
  DemoStore.prototype.removeViewer = function (email) {
    var v = this._viewers(); delete v[emailKey(email)];
    localStorage.setItem(ACCKEY, JSON.stringify(v)); this._emitViewers();
    var e = adminLog("access", "thu hồi quyền: " + String(email).toLowerCase()); e.by = this.user.email; this._pushLog(e);
    return Promise.resolve();
  };
  DemoStore.prototype._read = function () {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "{}"), map = blankState();
      Object.keys(map).forEach(function (id) { if (raw[id]) map[id] = Object.assign(map[id], raw[id]); });
      return map;
    } catch (e) { return blankState(); }
  };
  DemoStore.prototype._readRaw = function () {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; }
  };
  DemoStore.prototype._emit = function () {
    var map = this._read();
    this.cbs.forEach(function (cb) { cb(map); });
  };
  DemoStore.prototype._logs = function () {
    try { return JSON.parse(localStorage.getItem(LOGKEY) || "[]"); } catch (e) { return []; }
  };
  DemoStore.prototype._pushLog = function (e) {
    var arr = this._logs();
    e.serverTs = e.ts; e.uid = e.uid || "demo"; e._key = newId();
    arr.push(clean(e));
    if (arr.length > 5000) arr = arr.slice(arr.length - 5000);
    localStorage.setItem(LOGKEY, JSON.stringify(arr));
    this._emitLogs();
  };
  DemoStore.prototype._emitLogs = function () {
    var arr = this._logs();
    this.logCbs.forEach(function (s) {
      s.cb(arr.filter(function (e) { return e.ts >= s.from && e.ts <= s.to; }));
    });
  };
  DemoStore.prototype.subscribeAll = function (cb) {
    this.cbs.push(cb);
    cb(this._read());
  };
  DemoStore.prototype._mutate = function (id, action, args) {
    var raw = this._readRaw(), prev = Object.assign(blankVehicle(), raw[id] || {});
    var next = OPS[action](prev, args || {});
    if (next === undefined) return Promise.resolve(false);
    raw[id] = next;
    localStorage.setItem(KEY, JSON.stringify(raw));
    this._emit();
    this._pushLog(buildLog(id, action, prev, next));
    return Promise.resolve(true);
  };
  DemoStore.prototype.logOpen = function (id) {
    var cur = this._read()[id] || blankVehicle();
    var e = buildLog(id, "open", cur, cur); e.status = cur.status;
    this._pushLog(e);
  };
  DemoStore.prototype.subscribeLogs = function (fromMs, toMs, cb) {
    var s = { from: fromMs, to: toMs, cb: cb }, self = this;
    this.logCbs.push(s);
    cb(this._logs().filter(function (e) { return e.ts >= fromMs && e.ts <= toMs; }));
    return function () { self.logCbs = self.logCbs.filter(function (x) { return x !== s; }); };
  };


  var TRASHKEY = "ambulance_demo_trash_v1";
  DemoStore.prototype._trash = function () {
    try { return JSON.parse(localStorage.getItem(TRASHKEY) || "{}"); } catch (e) { return {}; }
  };
  DemoStore.prototype._emitTrash = function () {
    var t = this._trash(), arr = Object.keys(t).map(function (k) { var v = t[k]; v.id = k; return v; });
    arr.sort(function (a, b) { return b.at - a.at; });
    (this.trashCbs || []).forEach(function (cb) { cb(arr); });
  };
  DemoStore.prototype.subscribeTrash = function (cb) {
    var self = this; this.trashCbs = (this.trashCbs || []).concat([cb]); this._emitTrash();
    if (!this._trashListen) { this._trashListen = true;
      window.addEventListener("storage", function (e) { if (e.key === TRASHKEY) self._emitTrash(); }); }
    return function () {};
  };
  DemoStore.prototype.trashLogs = function (fromMs, toMs, count) {
    var t = this._trash();
    t[newId()] = { from: fromMs, to: toMs, count: count || 0, at: nowMs(), by: this.user.email };
    localStorage.setItem(TRASHKEY, JSON.stringify(t)); this._emitTrash();
    return Promise.resolve();
  };
  DemoStore.prototype.restoreTrash = function (id) {
    var t = this._trash(); delete t[id];
    localStorage.setItem(TRASHKEY, JSON.stringify(t)); this._emitTrash();
    return Promise.resolve();
  };

  /* ---------------------- API chung ---------------------- */
  [FirebaseStore, DemoStore].forEach(function (C) {
    C.prototype.startTrip = function (id, minutes, dest, driver) {
      return this._mutate(id, "start", { minutes: minutes, dest: dest, driver: driver, tripId: newId() });
    };
    C.prototype.extendTrip = function (id, minutes) { return this._mutate(id, "extend", { minutes: minutes }); };
    C.prototype.shortenTrip = function (id, minutes) { return this._mutate(id, "shorten", { minutes: minutes }); };
    C.prototype.endTrip = function (id) { return this._mutate(id, "end"); };
    C.prototype.setDriver = function (id, driver) { return this._mutate(id, "driver", { driver: driver }); };
  });

  /* ---------------------- Chọn backend ---------------------- */
  window.Store = CFG.isDemo ? new DemoStore() : new FirebaseStore();
  window.STORE_MODE = CFG.isDemo ? "demo" : "firebase";
})();
