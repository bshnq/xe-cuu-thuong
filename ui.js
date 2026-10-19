/* =========================================================================
   Tiện ích giao diện dùng chung: biển số, tài xế/điện thoại, giờ, thông báo
   ========================================================================= */
(function () {
  "use strict";
  var CFG = window.APP_CONFIG;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ----- biển số: "50A-01214" -> "50A-012.14" ----- */
  function formatPlate(p) {
    var s = String(p || "").toUpperCase().replace(/\s+/g, "");
    var m = s.match(/^(\d{2}[A-Z]{1,2}\d?)-?(\d{3})\.?(\d{2})$/);
    return m ? m[1] + "-" + m[2] + "." + m[3] : s;
  }
  function plateHTML(p, size) {
    if (!p) return "";
    var style = CFG.plateStyle === "blue" ? "blue" : "white";
    return '<span class="plate ' + style + (size ? " " + size : "") + '">'
      + '<span class="plate-in">' + esc(formatPlate(p)) + '</span></span>';
  }

  /* ----- tài xế ----- */
  function drivers() {
    return (CFG.drivers || []).map(function (d) { return typeof d === "string" ? { name: d, phone: "" } : d; });
  }
  function driverPhone(name) {
    var d = drivers().filter(function (x) { return x.name === name; })[0];
    return d ? String(d.phone || "").replace(/\D/g, "") : "";
  }
  function fmtPhone(p) {
    p = String(p || "").replace(/\D/g, "");
    return p.length === 10 ? p.slice(0, 4) + " " + p.slice(4, 7) + " " + p.slice(7) : p;
  }
  var PHONE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>';
  function phoneHTML(name, cls) {
    var p = driverPhone(name);
    if (!p) return "";
    return '<a class="phone' + (cls ? " " + cls : "") + '" href="tel:' + p + '" data-phone="' + p + '">'
      + PHONE_ICON + '<span>' + fmtPhone(p) + '</span></a>';
  }

  /* bấm số điện thoại: sao chép số + mở trình gọi (trên điện thoại) */
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(t).catch(function () { legacyCopy(t); });
    }
    legacyCopy(t); return Promise.resolve();
  }
  function legacyCopy(t) {
    var ta = document.createElement("textarea");
    ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a.phone");
    if (!a) return;
    var num = a.getAttribute("data-phone");
    copyText(num);
    toast("Đã sao chép " + fmtPhone(num));
    // href="tel:" tự mở trình gọi trên điện thoại
  });

  /* ----- giờ ----- */
  function hm(ms) { var d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function hms(ms) { var d = new Date(ms); return hm(ms) + ":" + pad(d.getSeconds()); }
  function dmy(ms) { var d = new Date(ms); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function countdown(ms) {
    var late = ms < 0, s = Math.floor(Math.abs(ms) / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (late ? "+" : "") + (h ? h + ":" + pad(m) : pad(m)) + ":" + pad(ss);
  }

  /* ----- thông báo ngắn ----- */
  var toastEl = null, toastT = null;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  window.UI = { esc: esc, pad: pad, formatPlate: formatPlate, plateHTML: plateHTML,
    drivers: drivers, driverPhone: driverPhone, fmtPhone: fmtPhone, phoneHTML: phoneHTML,
    hm: hm, hms: hms, dmy: dmy, countdown: countdown, toast: toast };
})();
