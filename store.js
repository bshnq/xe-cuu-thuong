/* =========================================================================
   LỚP DỮ LIỆU (store) — che giấu Firebase, cho phép chạy demo offline.
   Cả 2 backend cùng một giao diện:
     Store.subscribeAll(cb)            -> cb(mapTrạngThái) mỗi khi có thay đổi
     Store.startTrip(id, minutes, dest)
     Store.extendTrip(id, minutes)
     Store.endTrip(id)
   Trạng thái mỗi xe:
     { status:"available"|"busy", departAt, etaMinutes, returnAt, destination }
   ========================================================================= */
(function () {
  "use strict";
  var CFG = window.APP_CONFIG;

  function nowMs() { return Date.now(); }

  function blankState() {
    var map = {};
    CFG.vehicles.forEach(function (v) {
      map[v.id] = { status: "available", departAt: 0, etaMinutes: 0, returnAt: 0, destination: "" };
    });
    return map;
  }

  /* ---------------------- Backend Firebase ---------------------- */
  function FirebaseStore() {
    firebase.initializeApp(CFG.firebase);
    this.db = firebase.database();
    this.ref = this.db.ref("vehicles");
  }
  FirebaseStore.prototype.subscribeAll = function (cb) {
    this.ref.on("value", function (snap) {
      var val = snap.val() || {};
      var map = blankState();
      Object.keys(map).forEach(function (id) {
        if (val[id]) map[id] = Object.assign(map[id], val[id]);
      });
      cb(map);
    });
  };
  FirebaseStore.prototype.startTrip = function (id, minutes, dest) {
    var depart = nowMs();
    this.ref.child(id).set({
      status: "busy",
      departAt: depart,
      etaMinutes: minutes,
      returnAt: depart + minutes * 60000,
      destination: dest || "",
      updatedAt: depart
    });
  };
  FirebaseStore.prototype.extendTrip = function (id, minutes) {
    var r = this.ref.child(id);
    r.once("value", function (snap) {
      var v = snap.val(); if (!v || v.status !== "busy") return;
      var eta = (v.etaMinutes || 0) + minutes;
      r.update({
        etaMinutes: eta,
        returnAt: (v.departAt || nowMs()) + eta * 60000,
        updatedAt: nowMs()
      });
    });
  };
  FirebaseStore.prototype.endTrip = function (id) {
    var db = this.db, r = this.ref.child(id);
    r.once("value", function (snap) {
      var v = snap.val();
      if (v && v.status === "busy") {
        db.ref("history").push({
          vehicle: id, departAt: v.departAt, etaMinutes: v.etaMinutes,
          returnAt: v.returnAt, actualReturnAt: nowMs(), destination: v.destination || ""
        });
      }
      r.set({ status: "available", departAt: 0, etaMinutes: 0, returnAt: 0, destination: "", updatedAt: nowMs() });
    });
  };

  /* ---------------------- Backend Demo (localStorage) ----------------------
     Dùng để xem thử khi chưa gắn Firebase. Nhiều tab cùng trình duyệt sẽ
     đồng bộ qua sự kiện 'storage', đủ để thử tài xế + dashboard cạnh nhau. */
  var KEY = "ambulance_demo_v1";
  function DemoStore() {
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, JSON.stringify(blankState()));
    }
    this.cbs = [];
    var self = this;
    window.addEventListener("storage", function (e) {
      if (e.key === KEY) self._emit();
    });
  }
  DemoStore.prototype._read = function () {
    try { return Object.assign(blankState(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (e) { return blankState(); }
  };
  DemoStore.prototype._write = function (map) {
    localStorage.setItem(KEY, JSON.stringify(map));
    this._emit();
  };
  DemoStore.prototype._emit = function () {
    var map = this._read();
    this.cbs.forEach(function (cb) { cb(map); });
  };
  DemoStore.prototype.subscribeAll = function (cb) {
    this.cbs.push(cb);
    cb(this._read());
  };
  DemoStore.prototype.startTrip = function (id, minutes, dest) {
    var map = this._read(), depart = nowMs();
    map[id] = { status: "busy", departAt: depart, etaMinutes: minutes,
                returnAt: depart + minutes * 60000, destination: dest || "" };
    this._write(map);
  };
  DemoStore.prototype.extendTrip = function (id, minutes) {
    var map = this._read(), v = map[id];
    if (!v || v.status !== "busy") return;
    v.etaMinutes += minutes;
    v.returnAt = v.departAt + v.etaMinutes * 60000;
    this._write(map);
  };
  DemoStore.prototype.endTrip = function (id) {
    var map = this._read();
    map[id] = { status: "available", departAt: 0, etaMinutes: 0, returnAt: 0, destination: "" };
    this._write(map);
  };

  /* ---------------------- Chọn backend ---------------------- */
  window.Store = CFG.isDemo ? new DemoStore() : new FirebaseStore();
  window.STORE_MODE = CFG.isDemo ? "demo" : "firebase";
})();
