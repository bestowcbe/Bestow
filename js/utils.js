/* ==========================================================================
   BESTOW - UTILITIES AND SHARED UI HELPERS
   Utils : formatting, validation, storage, images
   UI    : toast, modal, confirm, prompt, loading buttons, icons
   ========================================================================== */
(function () {
    'use strict';

    var INR = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f6"/><stop offset="1" stop-color="#e4e4e8"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><g fill="none" stroke="#b9b9c0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><rect x="120" y="130" width="160" height="140" rx="18"/><circle cx="165" cy="175" r="14"/><path d="m130 255 52-52 40 40 22-22 36 36"/></g></svg>');

    var STAR_PATH = 'M12 2.5l2.95 6.06 6.55.95-4.75 4.62 1.14 6.52L12 17.55l-5.89 3.1 1.14-6.52L2.5 9.51l6.55-.95L12 2.5z';
    var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '"/></svg>';

    var Utils = {
        PLACEHOLDER: PLACEHOLDER,

        esc: function (v) {
            return String(v === undefined || v === null ? '' : v)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },
        /* escape then convert line breaks */
        multiline: function (v) { return Utils.esc(v).replace(/\r?\n/g, '<br>'); },

        price: function (n) {
            n = Number(n) || 0;
            return '₹' + INR.format(Math.round(n * 100) / 100);
        },
        date: function (v) {
            if (!v) return '-';
            var d = new Date(v);
            return isNaN(d) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        },
        dateTime: function (v) {
            if (!v) return '-';
            var d = new Date(v);
            return isNaN(d) ? '-' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        },
        timeAgo: function (v) {
            var s = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
            if (isNaN(s)) return '';
            if (s < 60) return 'just now';
            var m = Math.floor(s / 60); if (m < 60) return m + ' min ago';
            var h = Math.floor(m / 60); if (h < 24) return h + ' hr ago';
            var d = Math.floor(h / 24); if (d < 30) return d + ' day' + (d > 1 ? 's' : '') + ' ago';
            return Utils.date(v);
        },
        slug: function (t) {
            return String(t || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
        },
        truncate: function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; },
        titleCase: function (s) { return String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); },
        discountPct: function (compare, price) {
            compare = Number(compare); price = Number(price);
            return compare > price && compare > 0 ? Math.round((1 - price / compare) * 100) : 0;
        },

        isEmail: function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '').trim()); },
        isPhone: function (v) { return /^(\+?91)?[6-9]\d{9}$/.test(String(v || '').replace(/[\s-]/g, '')); },
        isPincode: function (v) { return /^\d{6}$/.test(String(v || '').trim()); },

        debounce: function (fn, ms) {
            var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
        },
        throttle: function (fn, ms) {
            var last = 0; return function () { var n = Date.now(); if (n - last >= ms) { last = n; fn.apply(this, arguments); } };
        },

        storage: {
            get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
            set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
            remove: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
        },

        productImage: function (p) {
            if (!p) return PLACEHOLDER;
            return p.thumbnail || (p.images && p.images[0]) || PLACEHOLDER;
        },

        stars: function (rating, cls) {
            var r = Math.max(0, Math.min(5, Number(rating) || 0));
            var five = STAR_SVG + STAR_SVG + STAR_SVG + STAR_SVG + STAR_SVG;
            return '<span class="stars ' + (cls || '') + '" role="img" aria-label="' + r.toFixed(1) + ' out of 5 stars"><span class="stars-base">' + five +
                '</span><span class="stars-fill" style="width:' + (r / 5 * 100).toFixed(1) + '%">' + five + '</span></span>';
        },

        /* downscale + re-encode an image file before uploading */
        compressImage: function (file, maxW, quality) {
            return new Promise(function (resolve) {
                if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 150 * 1024) return resolve(file);
                var url = URL.createObjectURL(file);
                var img = new Image();
                img.onload = function () {
                    URL.revokeObjectURL(url);
                    var w = img.width, h = img.height, max = maxW || 1600;
                    if (w > max) { h = Math.round(h * max / w); w = max; }
                    var c = document.createElement('canvas'); c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    var type = file.type === 'image/png' && file.size < 600 * 1024 ? 'image/png' : 'image/jpeg';
                    c.toBlob(function (blob) {
                        if (!blob || blob.size >= file.size) return resolve(file);
                        var name = file.name.replace(/\.\w+$/, '') + (type === 'image/png' ? '.png' : '.jpg');
                        resolve(new File([blob], name, { type: type }));
                    }, type, quality || 0.85);
                };
                img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
                img.src = url;
            });
        },

        copy: async function (text) {
            try { await navigator.clipboard.writeText(text); return true; } catch (e) {
                try {
                    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
                    document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
                } catch (e2) { return false; }
            }
        },

        downloadCSV: function (rows, columns, filename) {
            var esc = function (v) { v = v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v)); return '"' + v.replace(/"/g, '""') + '"'; };
            var lines = [columns.map(function (c) { return esc(c.label); }).join(',')];
            rows.forEach(function (r) { lines.push(columns.map(function (c) { return esc(typeof c.value === 'function' ? c.value(r) : r[c.key]); }).join(',')); });
            var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        },

        param: function (obj) {
            var p = new URLSearchParams();
            Object.keys(obj || {}).forEach(function (k) { if (obj[k] !== '' && obj[k] !== null && obj[k] !== undefined && obj[k] !== false) p.set(k, obj[k]); });
            return p.toString();
        },
        uid: function () { return Math.random().toString(36).slice(2, 10); }
    };
    window.Utils = Utils;

    /* ======================================================================
       ICONS
       ====================================================================== */
    var ALIASES = {
        'check-circle': 'circle-check', 'x-circle': 'circle-x', 'alert-triangle': 'triangle-alert', 'home': 'house',
        'help-circle': 'circle-help', 'edit-3': 'pen-line', 'file-edit': 'file-pen', 'grid-3x3': 'grid-3x3',
        'bar-chart-3': 'chart-column', 'alert-circle': 'circle-alert', 'check-square': 'square-check', 'upload-cloud': 'cloud-upload',
        'user-circle': 'circle-user', 'edit': 'square-pen', 'trash': 'trash-2'
    };
    var REVERSE = {};
    Object.keys(ALIASES).forEach(function (k) { REVERSE[ALIASES[k]] = k; });

    function refreshIcons() {
        if (!window.lucide || !window.lucide.createIcons) return;
        try {
            window.lucide.createIcons();
            var left = document.querySelectorAll('i[data-lucide]');
            if (left.length) {
                var changed = false;
                left.forEach(function (el) {
                    var n = el.getAttribute('data-lucide');
                    var alt = ALIASES[n] || REVERSE[n];
                    if (alt && alt !== n) { el.setAttribute('data-lucide', alt); changed = true; }
                });
                if (changed) window.lucide.createIcons();
            }
        } catch (e) { /* icon library problems must never break the app */ }
    }
    window.refreshIcons = refreshIcons;

    /* ======================================================================
       UI HELPERS
       ====================================================================== */
    var openCount = 0;
    var lastFocus = {};

    var UI = {
        icon: function (name, cls) { return '<i data-lucide="' + name + '"' + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true"></i>'; },

        toast: function (message, type, ms) {
            var box = document.getElementById('toastContainer');
            if (!box) return;
            type = type || 'info';
            var icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
            var t = document.createElement('div');
            t.className = 'toast toast-' + type;
            t.setAttribute('role', type === 'error' ? 'alert' : 'status');
            t.innerHTML = '<span class="toast-icon">' + UI.icon(icons[type] || 'info') + '</span><span class="toast-msg"></span>' +
                '<button class="toast-close" type="button" aria-label="Dismiss">' + UI.icon('x') + '</button>';
            t.querySelector('.toast-msg').textContent = message;
            box.appendChild(t);
            while (box.children.length > 4) box.removeChild(box.firstChild);
            refreshIcons();
            requestAnimationFrame(function () { t.classList.add('show'); });
            var remove = function () { t.classList.remove('show'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 350); };
            t.querySelector('.toast-close').addEventListener('click', remove);
            setTimeout(remove, ms || (type === 'error' ? 6000 : 3800));
        },

        openModal: function (id) {
            var m = document.getElementById(id);
            if (!m || m.classList.contains('active')) return;
            lastFocus[id] = document.activeElement;
            m.classList.add('active');
            m.setAttribute('aria-hidden', 'false');
            openCount++;
            document.body.classList.add('no-scroll');
            refreshIcons();
            setTimeout(function () {
                var f = m.querySelector('[autofocus],input:not([type=hidden]):not([disabled]),textarea,select,button:not(.modal-close)') || m.querySelector('.modal');
                if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
            }, 60);
        },
        closeModal: function (id) {
            var m = document.getElementById(id);
            if (!m || !m.classList.contains('active')) return;
            m.classList.remove('active');
            m.setAttribute('aria-hidden', 'true');
            openCount = Math.max(0, openCount - 1);
            if (!openCount) document.body.classList.remove('no-scroll');
            var f = lastFocus[id];
            if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        },
        closeAllModals: function () {
            document.querySelectorAll('.modal-overlay.active').forEach(function (m) { UI.closeModal(m.id); });
        },

        confirm: function (o) {
            o = o || {};
            return new Promise(function (resolve) {
                var m = document.getElementById('confirmModal');
                if (!m) return resolve(window.confirm(o.message || 'Are you sure?'));
                document.getElementById('confirmTitle').textContent = o.title || 'Are you sure?';
                document.getElementById('confirmMessage').textContent = o.message || 'This action cannot be undone.';
                var ok = document.getElementById('confirmOk'), cancel = document.getElementById('confirmCancel');
                ok.textContent = o.confirmText || 'Confirm';
                ok.className = 'btn ' + (o.danger === false ? 'btn-primary' : 'btn-danger');
                var done = function (v) {
                    ok.removeEventListener('click', yes); cancel.removeEventListener('click', no); m.removeEventListener('modal:dismiss', no);
                    UI.closeModal('confirmModal'); resolve(v);
                };
                var yes = function () { done(true); }, no = function () { done(false); };
                ok.addEventListener('click', yes); cancel.addEventListener('click', no); m.addEventListener('modal:dismiss', no);
                UI.openModal('confirmModal');
            });
        },

        prompt: function (o) {
            o = o || {};
            return new Promise(function (resolve) {
                var m = document.getElementById('promptModal');
                if (!m) return resolve(window.prompt(o.title || '', o.value || ''));
                document.getElementById('promptTitle').textContent = o.title || 'Edit';
                var hint = document.getElementById('promptHint'); hint.textContent = o.hint || ''; hint.style.display = o.hint ? '' : 'none';
                var wrap = document.getElementById('promptFieldWrap');
                var field = o.multiline
                    ? '<textarea id="promptField" rows="' + (o.rows || 5) + '" maxlength="' + (o.max || 4000) + '"></textarea>'
                    : '<input id="promptField" type="' + (o.type || 'text') + '" maxlength="' + (o.max || 500) + '">';
                wrap.innerHTML = '<label for="promptField">' + Utils.esc(o.label || '') + '</label>' + field;
                var input = document.getElementById('promptField');
                input.value = o.value || '';
                if (o.placeholder) input.placeholder = o.placeholder;
                var form = document.getElementById('promptForm');
                document.getElementById('promptOk').textContent = o.confirmText || 'Save';
                var done = function (v) {
                    form.removeEventListener('submit', submit); document.getElementById('promptCancel').removeEventListener('click', cancel); m.removeEventListener('modal:dismiss', cancel);
                    UI.closeModal('promptModal'); resolve(v);
                };
                var submit = function (e) { e.preventDefault(); var v = input.value.trim(); if (o.required && !v) { input.focus(); return; } done(v); };
                var cancel = function () { done(null); };
                form.addEventListener('submit', submit); document.getElementById('promptCancel').addEventListener('click', cancel); m.addEventListener('modal:dismiss', cancel);
                UI.openModal('promptModal');
                setTimeout(function () { input.focus(); input.select && input.select(); }, 80);
            });
        },

        setLoading: function (btn, loading, label) {
            if (!btn) return;
            if (loading) {
                if (!btn.dataset.label) btn.dataset.label = btn.innerHTML;
                btn.disabled = true; btn.classList.add('is-loading');
                btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>' + Utils.esc(label || 'Please wait') + '</span>';
            } else {
                btn.disabled = false; btn.classList.remove('is-loading');
                if (btn.dataset.label) { btn.innerHTML = btn.dataset.label; delete btn.dataset.label; refreshIcons(); }
            }
        },

        skeletonCards: function (n) {
            var h = ''; for (var i = 0; i < (n || 4); i++) h += '<div class="skeleton-card" aria-hidden="true"><div class="sk sk-img"></div><div class="sk sk-line"></div><div class="sk sk-line sk-short"></div></div>';
            return h;
        },

        empty: function (icon, title, text, actionHtml) {
            return '<div class="empty-state">' + UI.icon(icon, 'empty-icon') + '<h3>' + Utils.esc(title) + '</h3>' + (text ? '<p>' + Utils.esc(text) + '</p>' : '') + (actionHtml || '') + '</div>';
        }
    };
    window.UI = UI;

    /* backdrop click + ESC + close buttons for every modal (delegated once) */
    document.addEventListener('click', function (e) {
        var overlay = e.target.classList && e.target.classList.contains('modal-overlay') ? e.target : null;
        if (overlay && overlay.id !== 'lightbox') { overlay.dispatchEvent(new Event('modal:dismiss')); UI.closeModal(overlay.id); return; }
        var closer = e.target.closest ? e.target.closest('[data-close-modal]') : null;
        if (closer) { var id = closer.getAttribute('data-close-modal'); if (!id) { var ov = closer.closest('.modal-overlay'); id = ov ? ov.id : ''; } var m = document.getElementById(id); if (m) m.dispatchEvent(new Event('modal:dismiss')); UI.closeModal(id); }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            var open = document.querySelectorAll('.modal-overlay.active');
            if (open.length) { var top = open[open.length - 1]; top.dispatchEvent(new Event('modal:dismiss')); UI.closeModal(top.id); }
        }
        if (e.key === 'Tab') {
            var m = document.querySelector('.modal-overlay.active:last-of-type') || document.querySelector('.modal-overlay.active');
            if (!m) return;
            var f = m.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
            if (!f.length) return;
            var first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    /* ======================================================================
       COSTING ENGINE (admin Costing Calculator)
       The same calculation also runs inside the generate-invoice edge function, so the
       PDF always matches the screen. Rates come from the rate card, never from this code.
       ====================================================================== */
    "use strict";
    /* COSTING-ENGINE-START (shared verbatim by the admin panel and the edge function) */
    var COST_UNITS = { mm: 1 / 304.8, cm: 1 / 30.48, m: 1 / 0.3048, inch: 1 / 12, ft: 1 };
    var COST_UNIT_ALIAS = {
        mm: "mm", millimeter: "mm", millimeters: "mm", millimetre: "mm", millimetres: "mm",
        cm: "cm", centimeter: "cm", centimeters: "cm", centimetre: "cm", centimetres: "cm",
        m: "m", meter: "m", meters: "m", metre: "m", metres: "m",
        "in": "inch", inch: "inch", inches: "inch",
        ft: "ft", feet: "ft", foot: "ft"
    };
    function costUnit(u) {
        var k = String(u === null || u === undefined ? "" : u).trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(COST_UNIT_ALIAS, k) ? COST_UNIT_ALIAS[k] : "";
    }
    /** Rounds like a spreadsheet: half away from zero, working on the decimal text so 1.005 becomes 1.01. */
    function costRound(x, d) {
        x = Number(x);
        if (!isFinite(x))
            return 0;
        var neg = x < 0, a = Math.abs(x), s = String(a), r;
        if (s.indexOf("e") >= 0)
            r = Math.round(a * Math.pow(10, d)) / Math.pow(10, d);
        else
            r = Number(Math.round(Number(s + "e" + d)) + "e-" + d);
        return neg ? -r : r;
    }
    function costR2(x) { return costRound(x, 2); }
    function costR6(x) { return costRound(x, 6); }
    /** Reads a typed number. blank = nothing typed, ok = a usable finite number. */
    function costNum(v) {
        if (v === null || v === undefined)
            return { blank: true, ok: false, v: 0 };
        if (typeof v === "number")
            return isFinite(v) ? { blank: false, ok: true, v: v } : { blank: false, ok: false, v: 0 };
        var s = String(v).trim().replace(/,/g, "");
        if (s === "")
            return { blank: true, ok: false, v: 0 };
        if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s))
            return { blank: false, ok: false, v: 0 };
        return { blank: false, ok: true, v: Number(s) };
    }
    function costingDefaults() {
        var m = [
            ["acrylic", "Clear Acrylic", 2, 80, 5], ["acrylic", "Clear Acrylic", 3, 180, 20], ["acrylic", "Clear Acrylic", 5, 200, 30],
            ["acrylic", "Clear Acrylic", 8, 315, 60], ["acrylic", "Clear Acrylic", 12, 470, 80],
            ["acrylic", "White Acrylic", 2, 70, 5], ["acrylic", "White Acrylic", 3, 168, 20], ["acrylic", "White Acrylic", 5, 180, 30],
            ["acrylic", "Gold/Silver Acrylic", 1, 70, 50],
            ["acrylic", "Black Acrylic", 2, 80, 5], ["acrylic", "Black Acrylic", 3, 120, 20], ["acrylic", "Black Acrylic", 5, 200, 30],
            ["acrylic", "Black Acrylic", 8, 315, 60], ["acrylic", "Black Acrylic", 12, 470, 80],
            ["wood", "Rubber Wood", 12, 120, 15], ["wood", "Rubber Wood", 18, 140, 15]
        ];
        var rows = [];
        for (var i = 0; i < m.length; i++)
            rows.push({ category: m[i][0], material: m[i][1], thickness: m[i][2], rate: m[i][3], cut: m[i][4] });
        return {
            version: 1,
            materials: rows,
            uv: { with_white: 200, without_white: 100, always_without_white: ["White Acrylic"] },
            margins: [20, 25, 40],
            default_margin: 40,
            qty_breaks: [1, 10, 25, 50, 100]
        };
    }
    function costClamp(v, lo, hi, dflt) {
        var n = costNum(v);
        return n.ok && n.v >= lo && n.v <= hi ? costRound(n.v, 2) : dflt;
    }
    /** Cleans a rate card so that bad data can never reach the calculation. */
    function normalizeCostingConfig(cfg) {
        var d = costingDefaults();
        if (!cfg || typeof cfg !== "object")
            return d;
        var out = { version: 1, materials: [], uv: {}, margins: [], default_margin: 0, qty_breaks: [] };
        var seen = {}, src = Array.isArray(cfg.materials) ? cfg.materials : [];
        for (var i = 0; i < src.length; i++) {
            var r = src[i] || {}, cat = r.category === "wood" ? "wood" : r.category === "acrylic" ? "acrylic" : "";
            var name = String(r.material === undefined || r.material === null ? "" : r.material).trim().slice(0, 60);
            var t = costNum(r.thickness), rate = costNum(r.rate), cut = costNum(r.cut);
            if (!cat || !name || !t.ok || !(t.v > 0) || t.v > 1000 || !rate.ok || rate.v < 0 || rate.v > 1000000 || !cut.ok || cut.v < 0 || cut.v > 1000000)
                continue;
            var key = cat + "|" + name.toLowerCase() + "|" + t.v;
            if (seen[key])
                continue;
            seen[key] = 1;
            out.materials.push({ category: cat, material: name, thickness: t.v, rate: costRound(rate.v, 2), cut: costRound(cut.v, 2) });
        }
        if (!out.materials.length)
            out.materials = d.materials;
        var uv = cfg.uv || {};
        out.uv.with_white = costClamp(uv.with_white, 0, 1000000, d.uv.with_white);
        out.uv.without_white = costClamp(uv.without_white, 0, 1000000, d.uv.without_white);
        var aw = Array.isArray(uv.always_without_white) ? uv.always_without_white : d.uv.always_without_white;
        out.uv.always_without_white = [];
        for (var a = 0; a < aw.length; a++) {
            var an = String(aw[a] || "").trim();
            if (an)
                out.uv.always_without_white.push(an);
        }
        var mg = Array.isArray(cfg.margins) ? cfg.margins : d.margins, ms = {};
        for (var j = 0; j < mg.length && out.margins.length < 8; j++) {
            var mv = costNum(mg[j]);
            if (mv.ok && mv.v >= 0 && mv.v <= 1000 && !ms[mv.v]) {
                ms[mv.v] = 1;
                out.margins.push(costRound(mv.v, 2));
            }
        }
        if (!out.margins.length)
            out.margins = d.margins;
        out.margins.sort(function (x, y) { return x - y; });
        out.default_margin = costClamp(cfg.default_margin, 0, 1000, d.default_margin);
        var qb = Array.isArray(cfg.qty_breaks) ? cfg.qty_breaks : d.qty_breaks, qs = {};
        for (var k = 0; k < qb.length && out.qty_breaks.length < 8; k++) {
            var qv = costNum(qb[k]);
            if (qv.ok && qv.v >= 1 && qv.v <= 100000 && Math.floor(qv.v) === qv.v && !qs[qv.v]) {
                qs[qv.v] = 1;
                out.qty_breaks.push(qv.v);
            }
        }
        if (!out.qty_breaks.length)
            out.qty_breaks = d.qty_breaks;
        out.qty_breaks.sort(function (x, y) { return x - y; });
        return out;
    }
    function costFindMaterial(cfg, cat, name, thickness) {
        var n = String(name || "").trim().toLowerCase();
        for (var i = 0; i < cfg.materials.length; i++) {
            var m = cfg.materials[i];
            if (m.category === cat && m.material.toLowerCase() === n && m.thickness === thickness)
                return m;
        }
        return null;
    }
    function costUnique(list) {
        var out = [], seen = {};
        for (var i = 0; i < list.length; i++)
            if (!seen[list[i]]) {
                seen[list[i]] = 1;
                out.push(list[i]);
            }
        return out;
    }
    /** Names of every material of a category, in rate-card order. */
    function costMaterialNames(cfg, cat) {
        var l = [];
        for (var i = 0; i < cfg.materials.length; i++)
            if (cfg.materials[i].category === cat)
                l.push(cfg.materials[i].material);
        return costUnique(l);
    }
    function costArea(h, hu, w, wu) {
        return h * COST_UNITS[hu] * w * COST_UNITS[wu];
    }
    function costClone(o, over) {
        var c = {}, k;
        for (k in o)
            if (Object.prototype.hasOwnProperty.call(o, k))
                c[k] = o[k];
        for (k in over)
            if (Object.prototype.hasOwnProperty.call(over, k))
                c[k] = over[k];
        return c;
    }
    /**
     * The costing calculation. Mirrors the Bestow costing workbook:
     *  - area of every part = height x width converted to sq ft, x pieces per product
     *  - whole-order area of each material+thickness = area x order quantity, rounded to 6 decimals, then rounded UP
     *    to the next whole sq ft (wastage). Material is charged on that rounded area.
     *  - cutting = pieces for the whole order x cutting charge per piece
     *  - UV printing = printed area x rate (white acrylic is always printed without white)
     *  - designing, labour, transport and extra charges are entered per product (or per order)
     *  - selling price per product = manufacturing cost per product x (1 + margin %), total = price x quantity
     */
    function calcCosting(inp, cfgIn) {
        var cfg = normalizeCostingConfig(cfgIn);
        inp = inp || {};
        var errors = [];
        function err(section, row, code, field) { errors.push({ section: section, row: row, code: code, field: field || "" }); }
        var qn = costNum(inp.qty), qty = 0;
        if (!qn.ok || qn.v < 1 || Math.floor(qn.v) !== qn.v || qn.v > 1000000)
            err("order", 0, "qty", "qty");
        else
            qty = qn.v;
        var mn = costNum(inp.margin), margin = 0;
        if (!mn.ok || mn.v < 0 || mn.v > 1000)
            err("order", 0, "margin", "margin");
        else
            margin = mn.v;
        function charge(field) {
            var n = costNum(inp[field]);
            if (n.blank)
                return 0;
            if (!n.ok || n.v < 0 || n.v > 100000000) {
                err("order", 0, "charge", field);
                return 0;
            }
            return n.v;
        }
        var design = charge("design"), labour = charge("labour"), transport = charge("transport");
        var gstn = costNum(inp.gst), gst = 0;
        if (!gstn.blank) {
            if (!gstn.ok || gstn.v < 0 || gstn.v > 100)
                err("order", 0, "gst", "gst");
            else
                gst = gstn.v;
        }
        var stepn = costNum(inp.round_to), step = 0;
        if (!stepn.blank) {
            if (!stepn.ok || stepn.v < 0 || stepn.v > 10000)
                err("order", 0, "round_to", "round_to");
            else
                step = stepn.v;
        }
        // ---- acrylic and wood parts
        function parts(rows, cat, section) {
            var lines = [];
            rows = Array.isArray(rows) ? rows : [];
            for (var i = 0; i < rows.length; i++) {
                var r = rows[i] || {}, name = String(r.name || "").trim(), mat = String(r.material || "").trim();
                var h = costNum(r.h), w = costNum(r.w), n = costNum(r.qty), t = costNum(r.thickness);
                if (!name && !mat && h.blank && w.blank && n.blank && t.blank)
                    continue;
                var hu = costUnit(r.hu), wu = costUnit(r.wu);
                var line = { row: i, name: name, material: mat, thickness: t.ok ? t.v : 0, h: h.v, hu: hu, w: w.v, wu: wu, qty: n.v, status: "OK",
                    area_piece: 0, area_product: 0, rate: 0, cut: 0, mat_cost: 0, cut_cost: 0 };
                if (!mat || t.blank || !t.ok || !h.ok || !w.ok || !n.ok || !hu || !wu)
                    line.status = "incomplete";
                else if (h.v <= 0 || w.v <= 0 || n.v <= 0)
                    line.status = "zero";
                else if (Math.floor(n.v) !== n.v || n.v > 100000)
                    line.status = "qty";
                else if (h.v > 100000 || w.v > 100000)
                    line.status = "size";
                else {
                    var m = costFindMaterial(cfg, cat, mat, t.v);
                    if (!m)
                        line.status = "unavailable";
                    else {
                        line.material = m.material;
                        line.rate = m.rate;
                        line.cut = m.cut;
                        line.area_piece = costArea(h.v, hu, w.v, wu);
                        line.area_product = line.area_piece * n.v;
                        line.mat_cost = costR2(line.area_product * m.rate);
                        line.cut_cost = n.v * m.cut;
                    }
                }
                if (line.status !== "OK")
                    err(section, i, line.status);
                lines.push(line);
            }
            return lines;
        }
        var ac = parts(inp.acrylic, "acrylic", "acrylic");
        var wd = parts(inp.wood, "wood", "wood");
        // ---- whole order: wastage rounding by material + thickness
        function groups(lines, cat) {
            var out = [];
            for (var i = 0; i < cfg.materials.length; i++) {
                var m = cfg.materials[i];
                if (m.category !== cat)
                    continue;
                var sum = 0, pcs = 0, used = false;
                for (var j = 0; j < lines.length; j++) {
                    var l = lines[j];
                    if (l.status === "OK" && l.material === m.material && l.thickness === m.thickness) {
                        sum += l.area_product;
                        pcs += l.qty;
                        used = true;
                    }
                }
                if (!used)
                    continue;
                var actual = costR6(sum * qty);
                var rounded = actual > 0 ? Math.ceil(actual) : 0;
                var mat = costR2(rounded * m.rate), cut = costR2(pcs * qty * m.cut);
                out.push({ material: m.material, thickness: m.thickness, actual: actual, rounded: rounded, wastage: costR6(rounded - actual),
                    rate: m.rate, pieces: pcs * qty, cut: m.cut, mat_cost: mat, cut_cost: cut, total: costR2(mat + cut) });
            }
            return out;
        }
        var gAc = groups(ac, "acrylic"), gWd = groups(wd, "wood");
        function sumOf(list, f) { var s = 0; for (var i = 0; i < list.length; i++)
            s += list[i][f]; return s; }
        // acrylic used for each acrylic type (all thicknesses together)
        var types = [], tn = costMaterialNames(cfg, "acrylic");
        for (var ti = 0; ti < tn.length; ti++) {
            var ta = 0, tr = 0, tp = 0, tc = 0;
            for (var gi = 0; gi < gAc.length; gi++)
                if (gAc[gi].material === tn[ti]) {
                    ta += gAc[gi].actual;
                    tr += gAc[gi].rounded;
                    tp += gAc[gi].pieces;
                    tc += gAc[gi].total;
                }
            types.push({ material: tn[ti], actual: costR6(ta), rounded: tr, pieces: tp, total: costR2(tc) });
        }
        // ---- UV printing
        var uvLines = [], uvRows = Array.isArray(inp.uv) ? inp.uv : [];
        for (var ui = 0; ui < uvRows.length; ui++) {
            var u = uvRows[ui] || {}, uname = String(u.name || "").trim(), on = String(u.on || "").trim(), pt = String(u.print || "").trim();
            var uh = costNum(u.h), uw = costNum(u.w), un = costNum(u.qty);
            if (!uname && !on && !pt && uh.blank && uw.blank && un.blank)
                continue;
            var uhu = costUnit(u.hu), uwu = costUnit(u.wu);
            var forced = false;
            for (var fi = 0; fi < cfg.uv.always_without_white.length; fi++)
                if (cfg.uv.always_without_white[fi].toLowerCase() === on.toLowerCase())
                    forced = true;
            var applied = forced ? "without_white" : pt;
            var ul = { row: ui, name: uname, on: on, print: applied, forced: forced, h: uh.v, hu: uhu, w: uw.v, wu: uwu, qty: un.v, status: "OK",
                area_piece: 0, area_product: 0, rate: 0, cost: 0 };
            if (!on || !applied || !uh.ok || !uw.ok || !un.ok || !uhu || !uwu)
                ul.status = "incomplete";
            else if (uh.v <= 0 || uw.v <= 0 || un.v <= 0)
                ul.status = "zero";
            else if (Math.floor(un.v) !== un.v || un.v > 100000)
                ul.status = "qty";
            else if (uh.v > 100000 || uw.v > 100000)
                ul.status = "size";
            else if (applied !== "with_white" && applied !== "without_white")
                ul.status = "print";
            else {
                ul.rate = cfg.uv[applied];
                ul.area_piece = costArea(uh.v, uhu, uw.v, uwu);
                ul.area_product = ul.area_piece * un.v;
                ul.cost = costR2(ul.area_product * ul.rate);
            }
            if (ul.status !== "OK")
                err("uv", ui, ul.status);
            uvLines.push(ul);
        }
        var uvAreaPp = 0, uvPp = 0;
        for (var vi = 0; vi < uvLines.length; vi++)
            if (uvLines[vi].status === "OK") {
                uvAreaPp += uvLines[vi].area_product;
                uvPp += uvLines[vi].cost;
            }
        var uvWhole = costR2(uvPp * qty);
        var anyOk = false, li;
        for (li = 0; li < ac.length; li++)
            if (ac[li].status === "OK")
                anyOk = true;
        for (li = 0; li < wd.length; li++)
            if (wd[li].status === "OK")
                anyOk = true;
        if (!anyOk && !errors.length)
            err("order", 0, "no_parts");
        // ---- cost items
        function perProduct(whole) { return qty > 0 ? costR2(whole / qty) : 0; }
        var items = [];
        function addItem(key, label, ppActual, whole) {
            items.push({ key: key, label: label, pp_actual: ppActual, whole: whole, per_product: perProduct(whole), share: 0 });
        }
        var acMatPp = 0, acCutPp = 0, wdMatPp = 0, wdCutPp = 0;
        for (li = 0; li < ac.length; li++) {
            acMatPp += ac[li].mat_cost;
            acCutPp += ac[li].cut_cost;
        }
        for (li = 0; li < wd.length; li++) {
            wdMatPp += wd[li].mat_cost;
            wdCutPp += wd[li].cut_cost;
        }
        addItem("acrylic_material", "", costR2(acMatPp), costR2(sumOf(gAc, "mat_cost")));
        addItem("acrylic_cutting", "", costR2(acCutPp), costR2(sumOf(gAc, "cut_cost")));
        addItem("wood_material", "", costR2(wdMatPp), costR2(sumOf(gWd, "mat_cost")));
        addItem("wood_cutting", "", costR2(wdCutPp), costR2(sumOf(gWd, "cut_cost")));
        addItem("uv", "", costR2(uvPp), uvWhole);
        addItem("design", "", design, costR2(design * qty));
        addItem("labour", "", labour, costR2(labour * qty));
        addItem("transport", "", transport, costR2(transport * qty));
        var exRows = Array.isArray(inp.extras) ? inp.extras : [];
        for (var ei = 0; ei < exRows.length; ei++) {
            var ex = exRows[ei] || {}, ename = String(ex.name || "").trim(), ea = costNum(ex.amount);
            if (!ename && ea.blank)
                continue;
            if (!ea.ok || ea.v < 0 || ea.v > 100000000 || !ename) {
                err("extras", ei, "extra");
                continue;
            }
            var perOrder = ex.per === "order";
            var ew = perOrder ? costR2(ea.v) : costR2(ea.v * qty);
            items.push({ key: "extra", label: ename.slice(0, 60), per: perOrder ? "order" : "product", pp_actual: perOrder ? perProduct(ew) : ea.v, whole: ew, per_product: perProduct(ew), share: 0 });
        }
        var wholeCost = 0, mfgPp = 0, mfgActual = 0, ii;
        for (ii = 0; ii < items.length; ii++) {
            wholeCost += items[ii].whole;
            mfgPp += items[ii].per_product;
            mfgActual += items[ii].pp_actual;
        }
        wholeCost = costR2(wholeCost);
        mfgPp = costR2(mfgPp);
        mfgActual = costR2(mfgActual);
        for (ii = 0; ii < items.length; ii++)
            items[ii].share = wholeCost > 0 ? items[ii].whole / wholeCost : 0;
        // ---- pricing
        var sellRaw = costR2(mfgPp * (1 + margin / 100));
        var sell = step > 0 ? costR2(Math.ceil(sellRaw / step - 1e-9) * step) : sellRaw;
        var profitPp = costR2(sell - mfgPp);
        var orderSales = costR2(sell * qty);
        var orderProfit = costR2(orderSales - wholeCost);
        var gstPp = gst > 0 ? costR2(sell * gst / 100) : 0;
        var totals = {
            whole_cost: wholeCost, mfg_pp: mfgPp, mfg_pp_actual: mfgActual, margin: margin,
            sell_raw: sellRaw, sell_pp: sell, profit_pp: profitPp, order_sales: orderSales, order_profit: orderProfit,
            gst: gst, gst_pp: gstPp, sell_incl_gst_pp: costR2(sell + gstPp), order_gst: costR2(gstPp * qty), order_total_incl_gst: costR2((sell + gstPp) * qty),
            acrylic_actual: costR6(sumOf(gAc, "actual")), acrylic_rounded: sumOf(gAc, "rounded"),
            wood_actual: costR6(sumOf(gWd, "actual")), wood_rounded: sumOf(gWd, "rounded"),
            uv_area_pp: costR6(uvAreaPp), uv_area_order: costR6(uvAreaPp * qty),
            acrylic_area_pp: costR6(ac.reduce(function (s, l) { return s + (l.status === "OK" ? l.area_product : 0); }, 0)),
            wood_area_pp: costR6(wd.reduce(function (s, l) { return s + (l.status === "OK" ? l.area_product : 0); }, 0)),
            acrylic_pieces: sumOf(gAc, "pieces"), wood_pieces: sumOf(gWd, "pieces")
        };
        return { ok: errors.length === 0, errors: errors, qty: qty, margin: margin, design: design, labour: labour, transport: transport, gst: gst, round_to: step,
            acrylic: ac, wood: wd, uv: uvLines, groups: { acrylic: gAc, wood: gWd }, types: types, items: items, totals: totals };
    }
    /** Same order at other margins and other quantities, to compare price points. */
    function calcScenarios(inp, cfgIn) {
        var cfg = normalizeCostingConfig(cfgIn), base = calcCosting(inp, cfg);
        var ml = cfg.margins.slice(0), mv = costNum(inp && inp.margin);
        if (mv.ok && mv.v >= 0 && mv.v <= 1000 && ml.indexOf(mv.v) < 0)
            ml.push(mv.v);
        ml.sort(function (a, b) { return a - b; });
        var margins = [], i;
        for (i = 0; i < ml.length; i++) {
            var r = calcCosting(costClone(inp, { margin: ml[i] }), cfg);
            margins.push({ margin: ml[i], sell_pp: r.totals.sell_pp, profit_pp: r.totals.profit_pp, order_sales: r.totals.order_sales, order_profit: r.totals.order_profit });
        }
        var ql = cfg.qty_breaks.slice(0);
        if (base.qty >= 1 && ql.indexOf(base.qty) < 0)
            ql.push(base.qty);
        ql.sort(function (a, b) { return a - b; });
        var qtys = [];
        for (i = 0; i < ql.length; i++) {
            var q = calcCosting(costClone(inp, { qty: ql[i] }), cfg);
            qtys.push({ qty: ql[i], mfg_pp: q.totals.mfg_pp, sell_pp: q.totals.sell_pp, order_sales: q.totals.order_sales,
                acrylic_rounded: q.totals.acrylic_rounded, wood_rounded: q.totals.wood_rounded, current: ql[i] === base.qty });
        }
        return { margins: margins, qtys: qtys };
    }
    /* COSTING-ENGINE-END */

    /* COSTING-I18N-START (document wording in English, Tamil, Hindi, Telugu, Malayalam and Kannada) */
    var COST_I18N = {
        "en": {
            "doc_internal": "Costing Sheet",
            "doc_customer": "Quotation",
            "quote_no": "Quote no.",
            "date": "Date",
            "product": "Product",
            "customer": "Customer",
            "order_qty": "Order quantity",
            "margin": "Profit margin",
            "summary": "Summary",
            "mfg_pp": "Manufacturing cost per product",
            "sell_pp": "Selling price per product",
            "order_sales": "Total order sales value",
            "order_profit": "Total profit (whole order)",
            "profit_pp": "Profit per product",
            "cost_summary": "Cost summary",
            "item": "Cost item",
            "per_product": "Per product",
            "whole_order": "Whole order",
            "share": "Share",
            "total_mfg": "Total manufacturing cost",
            "pricing": "Pricing",
            "gst": "GST",
            "sell_incl_gst": "Selling price incl. GST",
            "order_total_incl": "Total order value incl. GST",
            "order_gst": "GST on whole order",
            "subtotal": "Subtotal",
            "mat_used": "Material used for the whole order",
            "col_material": "Material",
            "actual_area": "Actual area (sq ft)",
            "rounded_area": "Rounded up (sq ft)",
            "rate_sqft": "Rate / sq ft",
            "pieces": "Pieces",
            "mat_cost": "Material",
            "cut_cost": "Cutting",
            "total": "Total",
            "acrylic_by_type": "Acrylic used by type",
            "type": "Acrylic type",
            "total_acrylic": "Total acrylic",
            "total_wood": "Total wood",
            "uv_area": "UV print area, whole order (sq ft)",
            "parts_acrylic": "Acrylic parts",
            "parts_wood": "Wood parts",
            "parts_uv": "UV printing",
            "col_part": "Part",
            "col_thickness": "Thickness",
            "col_size": "Size (H x W)",
            "col_pcs": "Pcs / product",
            "col_area": "Area / product (sq ft)",
            "col_cost": "Cost / product",
            "col_printed_on": "Printed on",
            "col_print_type": "Print type",
            "col_rate": "Rate",
            "print_with": "With white",
            "print_without": "Without white",
            "scenarios_margin": "Price at other margins",
            "scenarios_qty": "Price at other quantities",
            "col_margin": "Margin",
            "col_qty": "Quantity",
            "col_mfg_pp": "Cost / product",
            "col_sell_pp": "Price / product",
            "col_order": "Order value",
            "col_profit": "Profit",
            "current": "current",
            "notes": "Notes",
            "quote_desc": "Description",
            "quote_rate": "Rate",
            "quote_amount": "Amount",
            "generated": "Generated on",
            "page": "Page",
            "currency": "Rs.",
            "unit_sqft": "sq ft",
            "it_acrylic_material": "Acrylic - material",
            "it_acrylic_cutting": "Acrylic - cutting",
            "it_wood_material": "Wood - material",
            "it_wood_cutting": "Wood - cutting",
            "it_uv": "UV printing",
            "it_design": "Designing charge",
            "it_labour": "Labour and assembling",
            "it_transport": "Transportation",
            "per_order": "per order",
            "unit_mm": "mm",
            "of": "of",
            "spec": "Specification",
            "materials": {
                "Clear Acrylic": "Clear Acrylic",
                "White Acrylic": "White Acrylic",
                "Gold/Silver Acrylic": "Gold/Silver Acrylic",
                "Black Acrylic": "Black Acrylic",
                "Rubber Wood": "Rubber Wood"
            }
        },
        "ta": {
            "doc_internal": "செலவுக் கணக்கீட்டுத் தாள்",
            "doc_customer": "விலைப்புள்ளி",
            "quote_no": "விலைப்புள்ளி எண்",
            "date": "தேதி",
            "product": "பொருள்",
            "customer": "வாடிக்கையாளர்",
            "order_qty": "ஆர்டர் எண்ணிக்கை",
            "margin": "இலாப விகிதம்",
            "summary": "சுருக்கம்",
            "mfg_pp": "ஒரு பொருளுக்கான உற்பத்திச் செலவு",
            "sell_pp": "ஒரு பொருளுக்கான விற்பனை விலை",
            "order_sales": "மொத்த ஆர்டர் விற்பனை மதிப்பு",
            "order_profit": "மொத்த இலாபம் (முழு ஆர்டர்)",
            "profit_pp": "ஒரு பொருளுக்கான இலாபம்",
            "cost_summary": "செலவு சுருக்கம்",
            "item": "செலவு இனம்",
            "per_product": "ஒரு பொருளுக்கு",
            "whole_order": "முழு ஆர்டர்",
            "share": "பங்கு",
            "total_mfg": "மொத்த உற்பத்திச் செலவு",
            "pricing": "விலை நிர்ணயம்",
            "gst": "ஜிஎஸ்டி",
            "sell_incl_gst": "ஜிஎஸ்டி உட்பட விற்பனை விலை",
            "order_total_incl": "ஜிஎஸ்டி உட்பட மொத்த ஆர்டர் மதிப்பு",
            "order_gst": "முழு ஆர்டருக்கான ஜிஎஸ்டி",
            "subtotal": "கூட்டுத்தொகை",
            "mat_used": "முழு ஆர்டருக்கான பயன்படுத்திய பொருள்",
            "col_material": "பொருள் வகை",
            "actual_area": "உண்மை பரப்பு (ச.அடி)",
            "rounded_area": "மேல்நோக்கி முழுமை (ச.அடி)",
            "rate_sqft": "விலை / ச.அடி",
            "pieces": "துண்டுகள்",
            "mat_cost": "பொருள்",
            "cut_cost": "வெட்டுதல்",
            "total": "மொத்தம்",
            "acrylic_by_type": "வகைவாரியாக அக்ரிலிக் பயன்பாடு",
            "type": "அக்ரிலிக் வகை",
            "total_acrylic": "மொத்த அக்ரிலிக்",
            "total_wood": "மொத்த மரம்",
            "uv_area": "யூவி அச்சுப் பரப்பு, முழு ஆர்டர் (ச.அடி)",
            "parts_acrylic": "அக்ரிலிக் பாகங்கள்",
            "parts_wood": "மரப் பாகங்கள்",
            "parts_uv": "யூவி அச்சிடல்",
            "col_part": "பாகம்",
            "col_thickness": "தடிமன்",
            "col_size": "அளவு (உ x அ)",
            "col_pcs": "எண் / பொருள்",
            "col_area": "பரப்பு / பொருள் (ச.அடி)",
            "col_cost": "செலவு / பொருள்",
            "col_printed_on": "அச்சிடப்படும் பொருள்",
            "col_print_type": "அச்சு வகை",
            "col_rate": "விலை",
            "print_with": "வெள்ளையுடன்",
            "print_without": "வெள்ளை இல்லாமல்",
            "scenarios_margin": "மற்ற இலாப விகிதங்களில் விலை",
            "scenarios_qty": "மற்ற எண்ணிக்கைகளில் விலை",
            "col_margin": "இலாப விகிதம்",
            "col_qty": "எண்ணிக்கை",
            "col_mfg_pp": "செலவு / பொருள்",
            "col_sell_pp": "விலை / பொருள்",
            "col_order": "ஆர்டர் மதிப்பு",
            "col_profit": "இலாபம்",
            "current": "தற்போதைய",
            "notes": "குறிப்புகள்",
            "quote_desc": "விவரம்",
            "quote_rate": "விலை",
            "quote_amount": "தொகை",
            "generated": "உருவாக்கிய தேதி",
            "page": "பக்கம்",
            "currency": "ரூ.",
            "unit_sqft": "ச.அடி",
            "it_acrylic_material": "அக்ரிலிக் - பொருள்",
            "it_acrylic_cutting": "அக்ரிலிக் - வெட்டுதல்",
            "it_wood_material": "மரம் - பொருள்",
            "it_wood_cutting": "மரம் - வெட்டுதல்",
            "it_uv": "யூவி அச்சிடல்",
            "it_design": "வடிவமைப்புக் கட்டணம்",
            "it_labour": "உழைப்பு மற்றும் இணைப்புக் கட்டணம்",
            "it_transport": "போக்குவரத்து",
            "per_order": "ஆர்டருக்கு",
            "unit_mm": "மி.மீ",
            "of": "/",
            "spec": "விவரக்குறிப்பு",
            "materials": {
                "Clear Acrylic": "தெளிவான அக்ரிலிக்",
                "White Acrylic": "வெள்ளை அக்ரிலிக்",
                "Gold/Silver Acrylic": "தங்கம்/வெள்ளி அக்ரிலிக்",
                "Black Acrylic": "கருப்பு அக்ரிலிக்",
                "Rubber Wood": "ரப்பர் மரம்"
            }
        },
        "hi": {
            "doc_internal": "लागत पत्रक",
            "doc_customer": "कोटेशन",
            "quote_no": "कोटेशन संख्या",
            "date": "दिनांक",
            "product": "उत्पाद",
            "customer": "ग्राहक",
            "order_qty": "ऑर्डर मात्रा",
            "margin": "लाभ मार्जिन",
            "summary": "सारांश",
            "mfg_pp": "प्रति उत्पाद निर्माण लागत",
            "sell_pp": "प्रति उत्पाद बिक्री मूल्य",
            "order_sales": "कुल ऑर्डर बिक्री मूल्य",
            "order_profit": "कुल लाभ (पूरा ऑर्डर)",
            "profit_pp": "प्रति उत्पाद लाभ",
            "cost_summary": "लागत सारांश",
            "item": "लागत मद",
            "per_product": "प्रति उत्पाद",
            "whole_order": "पूरा ऑर्डर",
            "share": "हिस्सा",
            "total_mfg": "कुल निर्माण लागत",
            "pricing": "मूल्य निर्धारण",
            "gst": "जीएसटी",
            "sell_incl_gst": "जीएसटी सहित बिक्री मूल्य",
            "order_total_incl": "जीएसटी सहित कुल ऑर्डर मूल्य",
            "order_gst": "पूरे ऑर्डर पर जीएसटी",
            "subtotal": "उप-योग",
            "mat_used": "पूरे ऑर्डर में उपयोग की गई सामग्री",
            "col_material": "सामग्री",
            "actual_area": "वास्तविक क्षेत्रफल (वर्ग फुट)",
            "rounded_area": "ऊपर पूर्णांकित (वर्ग फुट)",
            "rate_sqft": "दर / वर्ग फुट",
            "pieces": "टुकड़े",
            "mat_cost": "सामग्री",
            "cut_cost": "कटाई",
            "total": "कुल",
            "acrylic_by_type": "प्रकार के अनुसार एक्रेलिक उपयोग",
            "type": "एक्रेलिक प्रकार",
            "total_acrylic": "कुल एक्रेलिक",
            "total_wood": "कुल लकड़ी",
            "uv_area": "यूवी प्रिंट क्षेत्रफल, पूरा ऑर्डर (वर्ग फुट)",
            "parts_acrylic": "एक्रेलिक भाग",
            "parts_wood": "लकड़ी के भाग",
            "parts_uv": "यूवी प्रिंटिंग",
            "col_part": "भाग",
            "col_thickness": "मोटाई",
            "col_size": "आकार (ऊ x चौ)",
            "col_pcs": "संख्या / उत्पाद",
            "col_area": "क्षेत्रफल / उत्पाद (वर्ग फुट)",
            "col_cost": "लागत / उत्पाद",
            "col_printed_on": "प्रिंट की सतह",
            "col_print_type": "प्रिंट प्रकार",
            "col_rate": "दर",
            "print_with": "सफेद के साथ",
            "print_without": "सफेद के बिना",
            "scenarios_margin": "अन्य मार्जिन पर मूल्य",
            "scenarios_qty": "अन्य मात्राओं पर मूल्य",
            "col_margin": "मार्जिन",
            "col_qty": "मात्रा",
            "col_mfg_pp": "लागत / उत्पाद",
            "col_sell_pp": "मूल्य / उत्पाद",
            "col_order": "ऑर्डर मूल्य",
            "col_profit": "लाभ",
            "current": "वर्तमान",
            "notes": "टिप्पणियाँ",
            "quote_desc": "विवरण",
            "quote_rate": "दर",
            "quote_amount": "राशि",
            "generated": "बनाने की तिथि",
            "page": "पृष्ठ",
            "currency": "रु.",
            "unit_sqft": "वर्ग फुट",
            "it_acrylic_material": "एक्रेलिक - सामग्री",
            "it_acrylic_cutting": "एक्रेलिक - कटाई",
            "it_wood_material": "लकड़ी - सामग्री",
            "it_wood_cutting": "लकड़ी - कटाई",
            "it_uv": "यूवी प्रिंटिंग",
            "it_design": "डिज़ाइन शुल्क",
            "it_labour": "श्रम और असेंबली शुल्क",
            "it_transport": "परिवहन",
            "per_order": "प्रति ऑर्डर",
            "unit_mm": "मिमी",
            "of": "/",
            "spec": "विनिर्देश",
            "materials": {
                "Clear Acrylic": "क्लियर एक्रेलिक",
                "White Acrylic": "सफेद एक्रेलिक",
                "Gold/Silver Acrylic": "गोल्ड/सिल्वर एक्रेलिक",
                "Black Acrylic": "ब्लैक एक्रेलिक",
                "Rubber Wood": "रबर वुड"
            }
        },
        "te": {
            "doc_internal": "ఖర్చు పత్రం",
            "doc_customer": "కోటేషన్",
            "quote_no": "కోటేషన్ సంఖ్య",
            "date": "తేదీ",
            "product": "ఉత్పత్తి",
            "customer": "కస్టమర్",
            "order_qty": "ఆర్డర్ పరిమాణం",
            "margin": "లాభ శాతం",
            "summary": "సారాంశం",
            "mfg_pp": "ఒక్కో ఉత్పత్తికి తయారీ ఖర్చు",
            "sell_pp": "ఒక్కో ఉత్పత్తికి అమ్మకపు ధర",
            "order_sales": "మొత్తం ఆర్డర్ అమ్మకపు విలువ",
            "order_profit": "మొత్తం లాభం (పూర్తి ఆర్డర్)",
            "profit_pp": "ఒక్కో ఉత్పత్తికి లాభం",
            "cost_summary": "ఖర్చుల సారాంశం",
            "item": "ఖర్చు అంశం",
            "per_product": "ఒక్కో ఉత్పత్తికి",
            "whole_order": "పూర్తి ఆర్డర్",
            "share": "వాటా",
            "total_mfg": "మొత్తం తయారీ ఖర్చు",
            "pricing": "ధర నిర్ణయం",
            "gst": "జీఎస్టీ",
            "sell_incl_gst": "జీఎస్టీతో కలిపి అమ్మకపు ధర",
            "order_total_incl": "జీఎస్టీతో కలిపి మొత్తం ఆర్డర్ విలువ",
            "order_gst": "పూర్తి ఆర్డర్‌పై జీఎస్టీ",
            "subtotal": "ఉప మొత్తం",
            "mat_used": "పూర్తి ఆర్డర్‌కు వాడిన పదార్థం",
            "col_material": "పదార్థం",
            "actual_area": "అసలు వైశాల్యం (చ.అ.)",
            "rounded_area": "పైకి రౌండ్ చేసినది (చ.అ.)",
            "rate_sqft": "ధర / చ.అ.",
            "pieces": "ముక్కలు",
            "mat_cost": "పదార్థం",
            "cut_cost": "కటింగ్",
            "total": "మొత్తం",
            "acrylic_by_type": "రకాల వారీగా యాక్రిలిక్ వినియోగం",
            "type": "యాక్రిలిక్ రకం",
            "total_acrylic": "మొత్తం యాక్రిలిక్",
            "total_wood": "మొత్తం కలప",
            "uv_area": "యూవీ ప్రింట్ వైశాల్యం, పూర్తి ఆర్డర్ (చ.అ.)",
            "parts_acrylic": "యాక్రిలిక్ భాగాలు",
            "parts_wood": "కలప భాగాలు",
            "parts_uv": "యూవీ ప్రింటింగ్",
            "col_part": "భాగం",
            "col_thickness": "మందం",
            "col_size": "పరిమాణం (ఎ x వె)",
            "col_pcs": "సంఖ్య / ఉత్పత్తి",
            "col_area": "వైశాల్యం / ఉత్పత్తి (చ.అ.)",
            "col_cost": "ఖర్చు / ఉత్పత్తి",
            "col_printed_on": "ప్రింట్ చేసే ఉపరితలం",
            "col_print_type": "ప్రింట్ రకం",
            "col_rate": "ధర",
            "print_with": "తెలుపుతో",
            "print_without": "తెలుపు లేకుండా",
            "scenarios_margin": "ఇతర లాభ శాతాల వద్ద ధర",
            "scenarios_qty": "ఇతర పరిమాణాల వద్ద ధర",
            "col_margin": "లాభ శాతం",
            "col_qty": "పరిమాణం",
            "col_mfg_pp": "ఖర్చు / ఉత్పత్తి",
            "col_sell_pp": "ధర / ఉత్పత్తి",
            "col_order": "ఆర్డర్ విలువ",
            "col_profit": "లాభం",
            "current": "ప్రస్తుతం",
            "notes": "గమనికలు",
            "quote_desc": "వివరణ",
            "quote_rate": "ధర",
            "quote_amount": "మొత్తం",
            "generated": "తయారు చేసిన తేదీ",
            "page": "పేజీ",
            "currency": "రూ.",
            "unit_sqft": "చ.అ.",
            "it_acrylic_material": "యాక్రిలిక్ - పదార్థం",
            "it_acrylic_cutting": "యాక్రిలిక్ - కటింగ్",
            "it_wood_material": "కలప - పదార్థం",
            "it_wood_cutting": "కలప - కటింగ్",
            "it_uv": "యూవీ ప్రింటింగ్",
            "it_design": "డిజైన్ ఛార్జీ",
            "it_labour": "శ్రమ మరియు అసెంబ్లింగ్ ఛార్జీ",
            "it_transport": "రవాణా",
            "per_order": "ఆర్డర్‌కు",
            "unit_mm": "మి.మీ",
            "of": "/",
            "spec": "స్పెసిఫికేషన్",
            "materials": {
                "Clear Acrylic": "క్లియర్ యాక్రిలిక్",
                "White Acrylic": "వైట్ యాక్రిలిక్",
                "Gold/Silver Acrylic": "గోల్డ్/సిల్వర్ యాక్రిలిక్",
                "Black Acrylic": "బ్లాక్ యాక్రిలిక్",
                "Rubber Wood": "రబ్బర్ వుడ్"
            }
        },
        "ml": {
            "doc_internal": "ചെലവ് ഷീറ്റ്",
            "doc_customer": "ക്വട്ടേഷൻ",
            "quote_no": "ക്വട്ടേഷൻ നമ്പർ",
            "date": "തീയതി",
            "product": "ഉൽപ്പന്നം",
            "customer": "ഉപഭോക്താവ്",
            "order_qty": "ഓർഡർ അളവ്",
            "margin": "ലാഭ ശതമാനം",
            "summary": "സംഗ്രഹം",
            "mfg_pp": "ഒരു ഉൽപ്പന്നത്തിന്റെ നിർമ്മാണ ചെലവ്",
            "sell_pp": "ഒരു ഉൽപ്പന്നത്തിന്റെ വിൽപ്പന വില",
            "order_sales": "ആകെ ഓർഡർ വിൽപ്പന മൂല്യം",
            "order_profit": "ആകെ ലാഭം (മുഴുവൻ ഓർഡർ)",
            "profit_pp": "ഒരു ഉൽപ്പന്നത്തിന്റെ ലാഭം",
            "cost_summary": "ചെലവ് സംഗ്രഹം",
            "item": "ചെലവ് ഇനം",
            "per_product": "ഒരു ഉൽപ്പന്നത്തിന്",
            "whole_order": "മുഴുവൻ ഓർഡർ",
            "share": "പങ്ക്",
            "total_mfg": "ആകെ നിർമ്മാണ ചെലവ്",
            "pricing": "വില നിർണ്ണയം",
            "gst": "ജിഎസ്ടി",
            "sell_incl_gst": "ജിഎസ്ടി ഉൾപ്പെടെ വിൽപ്പന വില",
            "order_total_incl": "ജിഎസ്ടി ഉൾപ്പെടെ ആകെ ഓർഡർ മൂല്യം",
            "order_gst": "മുഴുവൻ ഓർഡറിനുമുള്ള ജിഎസ്ടി",
            "subtotal": "ഉപ-ആകെ",
            "mat_used": "മുഴുവൻ ഓർഡറിനും ഉപയോഗിച്ച സാമഗ്രി",
            "col_material": "സാമഗ്രി",
            "actual_area": "യഥാർത്ഥ വിസ്തീർണ്ണം (ച.അടി)",
            "rounded_area": "മുകളിലേക്ക് റൗണ്ട് ചെയ്തത് (ച.അടി)",
            "rate_sqft": "നിരക്ക് / ച.അടി",
            "pieces": "കഷണങ്ങൾ",
            "mat_cost": "സാമഗ്രി",
            "cut_cost": "കട്ടിംഗ്",
            "total": "ആകെ",
            "acrylic_by_type": "തരം അനുസരിച്ച് അക്രിലിക് ഉപയോഗം",
            "type": "അക്രിലിക് തരം",
            "total_acrylic": "ആകെ അക്രിലിക്",
            "total_wood": "ആകെ മരം",
            "uv_area": "യുവി പ്രിന്റ് വിസ്തീർണ്ണം, മുഴുവൻ ഓർഡർ (ച.അടി)",
            "parts_acrylic": "അക്രിലിക് ഭാഗങ്ങൾ",
            "parts_wood": "മര ഭാഗങ്ങൾ",
            "parts_uv": "യുവി പ്രിന്റിംഗ്",
            "col_part": "ഭാഗം",
            "col_thickness": "കനം",
            "col_size": "വലിപ്പം (ഉ x വീ)",
            "col_pcs": "എണ്ണം / ഉൽപ്പന്നം",
            "col_area": "വിസ്തീർണ്ണം / ഉൽപ്പന്നം (ച.അടി)",
            "col_cost": "ചെലവ് / ഉൽപ്പന്നം",
            "col_printed_on": "പ്രിന്റ് ചെയ്യുന്ന പ്രതലം",
            "col_print_type": "പ്രിന്റ് തരം",
            "col_rate": "നിരക്ക്",
            "print_with": "വെള്ളയോടെ",
            "print_without": "വെള്ള ഇല്ലാതെ",
            "scenarios_margin": "മറ്റ് ലാഭ ശതമാനങ്ങളിലെ വില",
            "scenarios_qty": "മറ്റ് അളവുകളിലെ വില",
            "col_margin": "ലാഭ ശതമാനം",
            "col_qty": "അളവ്",
            "col_mfg_pp": "ചെലവ് / ഉൽപ്പന്നം",
            "col_sell_pp": "വില / ഉൽപ്പന്നം",
            "col_order": "ഓർഡർ മൂല്യം",
            "col_profit": "ലാഭം",
            "current": "നിലവിലെ",
            "notes": "കുറിപ്പുകൾ",
            "quote_desc": "വിവരണം",
            "quote_rate": "നിരക്ക്",
            "quote_amount": "തുക",
            "generated": "തയ്യാറാക്കിയ തീയതി",
            "page": "പേജ്",
            "currency": "രൂ.",
            "unit_sqft": "ച.അടി",
            "it_acrylic_material": "അക്രിലിക് - സാമഗ്രി",
            "it_acrylic_cutting": "അക്രിലിക് - കട്ടിംഗ്",
            "it_wood_material": "മരം - സാമഗ്രി",
            "it_wood_cutting": "മരം - കട്ടിംഗ്",
            "it_uv": "യുവി പ്രിന്റിംഗ്",
            "it_design": "ഡിസൈൻ ചാർജ്",
            "it_labour": "തൊഴിലും അസംബ്ലിംഗ് ചാർജും",
            "it_transport": "ഗതാഗതം",
            "per_order": "ഓർഡറിന്",
            "unit_mm": "മി.മീ",
            "of": "/",
            "spec": "സ്പെസിഫിക്കേഷൻ",
            "materials": {
                "Clear Acrylic": "ക്ലിയർ അക്രിലിക്",
                "White Acrylic": "വൈറ്റ് അക്രിലിക്",
                "Gold/Silver Acrylic": "ഗോൾഡ്/സിൽവർ അക്രിലിക്",
                "Black Acrylic": "ബ്ലാക്ക് അക്രിലിക്",
                "Rubber Wood": "റബ്ബർ വുഡ്"
            }
        },
        "kn": {
            "doc_internal": "ವೆಚ್ಚ ಪತ್ರ",
            "doc_customer": "ಕೊಟೇಶನ್",
            "quote_no": "ಕೊಟೇಶನ್ ಸಂಖ್ಯೆ",
            "date": "ದಿನಾಂಕ",
            "product": "ಉತ್ಪನ್ನ",
            "customer": "ಗ್ರಾಹಕ",
            "order_qty": "ಆರ್ಡರ್ ಪ್ರಮಾಣ",
            "margin": "ಲಾಭ ಶೇಕಡಾ",
            "summary": "ಸಾರಾಂಶ",
            "mfg_pp": "ಒಂದು ಉತ್ಪನ್ನದ ತಯಾರಿಕಾ ವೆಚ್ಚ",
            "sell_pp": "ಒಂದು ಉತ್ಪನ್ನದ ಮಾರಾಟ ಬೆಲೆ",
            "order_sales": "ಒಟ್ಟು ಆರ್ಡರ್ ಮಾರಾಟ ಮೌಲ್ಯ",
            "order_profit": "ಒಟ್ಟು ಲಾಭ (ಪೂರ್ಣ ಆರ್ಡರ್)",
            "profit_pp": "ಒಂದು ಉತ್ಪನ್ನದ ಲಾಭ",
            "cost_summary": "ವೆಚ್ಚದ ಸಾರಾಂಶ",
            "item": "ವೆಚ್ಚದ ಅಂಶ",
            "per_product": "ಒಂದು ಉತ್ಪನ್ನಕ್ಕೆ",
            "whole_order": "ಪೂರ್ಣ ಆರ್ಡರ್",
            "share": "ಪಾಲು",
            "total_mfg": "ಒಟ್ಟು ತಯಾರಿಕಾ ವೆಚ್ಚ",
            "pricing": "ಬೆಲೆ ನಿರ್ಧಾರ",
            "gst": "ಜಿಎಸ್‌ಟಿ",
            "sell_incl_gst": "ಜಿಎಸ್‌ಟಿ ಸೇರಿ ಮಾರಾಟ ಬೆಲೆ",
            "order_total_incl": "ಜಿಎಸ್‌ಟಿ ಸೇರಿ ಒಟ್ಟು ಆರ್ಡರ್ ಮೌಲ್ಯ",
            "order_gst": "ಪೂರ್ಣ ಆರ್ಡರ್‌ನ ಜಿಎಸ್‌ಟಿ",
            "subtotal": "ಉಪ ಮೊತ್ತ",
            "mat_used": "ಪೂರ್ಣ ಆರ್ಡರ್‌ಗೆ ಬಳಸಿದ ವಸ್ತು",
            "col_material": "ವಸ್ತು",
            "actual_area": "ನಿಜವಾದ ವಿಸ್ತೀರ್ಣ (ಚ.ಅ.)",
            "rounded_area": "ಮೇಲಕ್ಕೆ ಪೂರ್ಣಗೊಳಿಸಿದ್ದು (ಚ.ಅ.)",
            "rate_sqft": "ದರ / ಚ.ಅ.",
            "pieces": "ತುಂಡುಗಳು",
            "mat_cost": "ವಸ್ತು",
            "cut_cost": "ಕತ್ತರಿಸುವಿಕೆ",
            "total": "ಒಟ್ಟು",
            "acrylic_by_type": "ಪ್ರಕಾರದ ಪ್ರಕಾರ ಅಕ್ರಿಲಿಕ್ ಬಳಕೆ",
            "type": "ಅಕ್ರಿಲಿಕ್ ಪ್ರಕಾರ",
            "total_acrylic": "ಒಟ್ಟು ಅಕ್ರಿಲಿಕ್",
            "total_wood": "ಒಟ್ಟು ಮರ",
            "uv_area": "ಯುವಿ ಮುದ್ರಣ ವಿಸ್ತೀರ್ಣ, ಪೂರ್ಣ ಆರ್ಡರ್ (ಚ.ಅ.)",
            "parts_acrylic": "ಅಕ್ರಿಲಿಕ್ ಭಾಗಗಳು",
            "parts_wood": "ಮರದ ಭಾಗಗಳು",
            "parts_uv": "ಯುವಿ ಮುದ್ರಣ",
            "col_part": "ಭಾಗ",
            "col_thickness": "ದಪ್ಪ",
            "col_size": "ಗಾತ್ರ (ಎ x ಅ)",
            "col_pcs": "ಸಂಖ್ಯೆ / ಉತ್ಪನ್ನ",
            "col_area": "ವಿಸ್ತೀರ್ಣ / ಉತ್ಪನ್ನ (ಚ.ಅ.)",
            "col_cost": "ವೆಚ್ಚ / ಉತ್ಪನ್ನ",
            "col_printed_on": "ಮುದ್ರಿಸುವ ಮೇಲ್ಮೈ",
            "col_print_type": "ಮುದ್ರಣ ಪ್ರಕಾರ",
            "col_rate": "ದರ",
            "print_with": "ಬಿಳಿಯೊಂದಿಗೆ",
            "print_without": "ಬಿಳಿ ಇಲ್ಲದೆ",
            "scenarios_margin": "ಇತರ ಲಾಭ ಶೇಕಡಾಗಳಲ್ಲಿ ಬೆಲೆ",
            "scenarios_qty": "ಇತರ ಪ್ರಮಾಣಗಳಲ್ಲಿ ಬೆಲೆ",
            "col_margin": "ಲಾಭ ಶೇಕಡಾ",
            "col_qty": "ಪ್ರಮಾಣ",
            "col_mfg_pp": "ವೆಚ್ಚ / ಉತ್ಪನ್ನ",
            "col_sell_pp": "ಬೆಲೆ / ಉತ್ಪನ್ನ",
            "col_order": "ಆರ್ಡರ್ ಮೌಲ್ಯ",
            "col_profit": "ಲಾಭ",
            "current": "ಪ್ರಸ್ತುತ",
            "notes": "ಟಿಪ್ಪಣಿಗಳು",
            "quote_desc": "ವಿವರಣೆ",
            "quote_rate": "ದರ",
            "quote_amount": "ಮೊತ್ತ",
            "generated": "ತಯಾರಿಸಿದ ದಿನಾಂಕ",
            "page": "ಪುಟ",
            "currency": "ರೂ.",
            "unit_sqft": "ಚ.ಅ.",
            "it_acrylic_material": "ಅಕ್ರಿಲಿಕ್ - ವಸ್ತು",
            "it_acrylic_cutting": "ಅಕ್ರಿಲಿಕ್ - ಕತ್ತರಿಸುವಿಕೆ",
            "it_wood_material": "ಮರ - ವಸ್ತು",
            "it_wood_cutting": "ಮರ - ಕತ್ತರಿಸುವಿಕೆ",
            "it_uv": "ಯುವಿ ಮುದ್ರಣ",
            "it_design": "ವಿನ್ಯಾಸ ಶುಲ್ಕ",
            "it_labour": "ಕೂಲಿ ಮತ್ತು ಜೋಡಣೆ ಶುಲ್ಕ",
            "it_transport": "ಸಾರಿಗೆ",
            "per_order": "ಆರ್ಡರ್‌ಗೆ",
            "unit_mm": "ಮಿ.ಮೀ",
            "of": "/",
            "spec": "ವಿಶೇಷಣ",
            "materials": {
                "Clear Acrylic": "ಕ್ಲಿಯರ್ ಅಕ್ರಿಲಿಕ್",
                "White Acrylic": "ವೈಟ್ ಅಕ್ರಿಲಿಕ್",
                "Gold/Silver Acrylic": "ಗೋಲ್ಡ್/ಸಿಲ್ವರ್ ಅಕ್ರಿಲಿಕ್",
                "Black Acrylic": "ಬ್ಲಾಕ್ ಅಕ್ರಿಲಿಕ್",
                "Rubber Wood": "ರಬ್ಬರ್ ವುಡ್"
            }
        }
    };
    var COST_LANGS = { "en": "English", "ta": "தமிழ் (Tamil)", "hi": "हिन्दी (Hindi)", "te": "తెలుగు (Telugu)", "ml": "മലയാളം (Malayalam)", "kn": "ಕನ್ನಡ (Kannada)" };
    /* COSTING-I18N-END */

    /* COSTING-DOC-START (shared verbatim by the admin panel and the edge function) */
    /** Number with Indian digit grouping (12,34,567.50) and a fixed number of decimals. */
    function costFmt(n, d) {
        var v = costRound(Number(n) || 0, d), neg = v < 0, s = Math.abs(v).toFixed(d), p = s.split("."), ip = p[0], out = "";
        if (ip.length > 3) {
            var last3 = ip.slice(ip.length - 3), rest = ip.slice(0, ip.length - 3);
            out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
        }
        else
            out = ip;
        return (neg && v !== 0 ? "-" : "") + out + (p.length > 1 ? "." + p[1] : "");
    }
    /** Typed numbers shown the way they were entered, without trailing zeros (max 4 decimals). */
    function costFmtIn(n) {
        var v = costRound(Number(n) || 0, 4), s = String(v);
        return s.indexOf("e") >= 0 ? v.toFixed(4) : s;
    }
    function costFmtArea(n) { return costFmt(n, 4); }
    function costPct(x) { return costRound((Number(x) || 0) * 100, 1).toFixed(1) + "%"; }
    function costDocModel(r, meta, lang, mode, sc) {
        var L = COST_I18N[lang] || COST_I18N.en, T = r.totals, i;
        meta = meta || {};
        function money(n) { return L.currency + " " + costFmt(n, 2); }
        function mat(n) { return (L.materials && L.materials[n]) || n; }
        function pn(l) { var n = String(l.name || "").trim(); return n || (L.col_part + " " + (l.row + 1)); }
        function unitName(u) { return u === "inch" ? "in" : u; }
        function size(l) { return costFmtIn(l.h) + " " + unitName(l.hu) + " x " + costFmtIn(l.w) + " " + unitName(l.wu); }
        var customer = mode === "customer";
        var model = {
            lang: lang, mode: mode, title: customer ? L.doc_customer : L.doc_internal,
            product: String(meta.title || "").trim(), customer: String(meta.customer || "").trim(),
            quote_no: String(meta.quote_no || "").trim(), date: String(meta.date || "").trim(),
            brand: String(meta.brand || "Bestow"), tagline: String(meta.tagline || ""), contact: String(meta.contact || ""),
            info: [], kpis: [], sections: [], notes: String(meta.notes || "").trim(), L: L
        };
        if (model.quote_no)
            model.info.push([L.quote_no, model.quote_no]);
        if (model.date)
            model.info.push([L.date, model.date]);
        if (model.product)
            model.info.push([L.product, model.product]);
        if (model.customer)
            model.info.push([L.customer, model.customer]);
        model.info.push([L.order_qty, costFmt(r.qty, 0)]);
        if (!customer)
            model.info.push([L.margin, costFmt(r.margin, 2) + "%"]);
        var rowsOf = function (lines) { var o = []; for (var k = 0; k < lines.length; k++)
            if (lines[k].status === "OK")
                o.push(lines[k]); return o; };
        if (customer) {
            var desc = model.product || L.product;
            var rows = [[desc, costFmt(r.qty, 0), money(T.sell_pp), money(T.order_sales)]];
            var foot = null;
            if (T.gst > 0) {
                rows.push([L.gst + " " + costFmt(T.gst, 2) + "%", "", money(T.gst_pp), money(T.order_gst)]);
                foot = [L.order_total_incl, "", "", money(T.order_total_incl_gst)];
            }
            else
                foot = [L.total, "", "", money(T.order_sales)];
            model.sections.push({ key: "quote", title: L.quote_desc, head: [L.quote_desc, L.col_qty, L.quote_rate, L.quote_amount], rows: rows, foot: foot, align: ["l", "r", "r", "r"], widths: [5, 1.3, 2.2, 2.4] });
            var spec = [], ac = rowsOf(r.acrylic), wd = rowsOf(r.wood), uv = rowsOf(r.uv);
            for (i = 0; i < ac.length; i++)
                spec.push([pn(ac[i]), mat(ac[i].material), costFmtIn(ac[i].thickness) + " " + L.unit_mm, size(ac[i]), costFmt(ac[i].qty, 0)]);
            for (i = 0; i < wd.length; i++)
                spec.push([pn(wd[i]), mat(wd[i].material), costFmtIn(wd[i].thickness) + " " + L.unit_mm, size(wd[i]), costFmt(wd[i].qty, 0)]);
            if (spec.length)
                model.sections.push({ key: "spec", title: L.spec, head: [L.col_part, L.col_material, L.col_thickness, L.col_size, L.col_pcs], rows: spec, foot: null, align: ["l", "l", "r", "l", "r"], widths: [3, 3, 1.8, 3.4, 1.5] });
            var uvr = [];
            for (i = 0; i < uv.length; i++)
                uvr.push([pn(uv[i]), mat(uv[i].on), uv[i].print === "with_white" ? L.print_with : L.print_without, size(uv[i]), costFmt(uv[i].qty, 0)]);
            if (uvr.length)
                model.sections.push({ key: "uvspec", title: L.parts_uv, head: [L.col_part, L.col_printed_on, L.col_print_type, L.col_size, L.col_pcs], rows: uvr, foot: null, align: ["l", "l", "l", "l", "r"], widths: [3, 3, 2.4, 3.4, 1.5] });
            return model;
        }
        // ---- internal costing sheet
        model.kpis = [[L.mfg_pp, money(T.mfg_pp)], [L.sell_pp, money(T.sell_pp)], [L.order_sales, money(T.order_sales)], [L.order_profit, money(T.order_profit)]];
        function partTable(key, title, lines) {
            var ok = rowsOf(lines);
            if (!ok.length)
                return;
            var rows = [], sumA = 0, sumC = 0;
            for (var k = 0; k < ok.length; k++) {
                var l = ok[k], c = costR2(l.mat_cost + l.cut_cost);
                sumA += l.area_product;
                sumC += c;
                rows.push([pn(l), mat(l.material), costFmtIn(l.thickness) + " " + L.unit_mm, size(l), costFmt(l.qty, 0), costFmtArea(l.area_product), money(c)]);
            }
            model.sections.push({ key: key, title: title, head: [L.col_part, L.col_material, L.col_thickness, L.col_size, L.col_pcs, L.col_area, L.col_cost], rows: rows,
                foot: [L.total, "", "", "", "", costFmtArea(sumA), money(costR2(sumC))], align: ["l", "l", "r", "l", "r", "r", "r"], widths: [3, 2.4, 1.6, 2.7, 1.5, 1.9, 2.1] });
        }
        partTable("acrylic_parts", L.parts_acrylic, r.acrylic);
        partTable("wood_parts", L.parts_wood, r.wood);
        var uvOk = rowsOf(r.uv);
        if (uvOk.length) {
            var ur = [], us = 0, uc = 0;
            for (i = 0; i < uvOk.length; i++) {
                var u = uvOk[i];
                us += u.area_product;
                uc += u.cost;
                ur.push([pn(u), mat(u.on), u.print === "with_white" ? L.print_with : L.print_without, size(u), costFmt(u.qty, 0), costFmtArea(u.area_product), money(u.rate), money(u.cost)]);
            }
            model.sections.push({ key: "uv_parts", title: L.parts_uv, head: [L.col_part, L.col_printed_on, L.col_print_type, L.col_size, L.col_pcs, L.col_area, L.col_rate, L.col_cost], rows: ur,
                foot: [L.total, "", "", "", "", costFmtArea(us), "", money(costR2(uc))], align: ["l", "l", "l", "l", "r", "r", "r", "r"], widths: [2, 2.2, 2, 2.7, 1.5, 1.8, 1.7, 2] });
        }
        function groupTable(key, title, groups, totalLabel) {
            if (!groups.length)
                return;
            var rows = [], a = 0, ro = 0, p = 0, m = 0, c = 0, t = 0;
            for (var k = 0; k < groups.length; k++) {
                var g = groups[k];
                a += g.actual;
                ro += g.rounded;
                p += g.pieces;
                m += g.mat_cost;
                c += g.cut_cost;
                t += g.total;
                rows.push([mat(g.material), costFmtIn(g.thickness) + " " + L.unit_mm, costFmtArea(g.actual), costFmt(g.rounded, 0), money(g.rate), costFmt(g.pieces, 0), money(g.mat_cost), money(g.cut_cost), money(g.total)]);
            }
            model.sections.push({ key: key, title: title, head: [L.col_material, L.col_thickness, L.actual_area, L.rounded_area, L.rate_sqft, L.pieces, L.mat_cost, L.cut_cost, L.total], rows: rows,
                foot: [totalLabel, "", costFmtArea(costR6(a)), costFmt(ro, 0), "", costFmt(p, 0), money(costR2(m)), money(costR2(c)), money(costR2(t))],
                align: ["l", "r", "r", "r", "r", "r", "r", "r", "r"], widths: [2.3, 1.5, 1.8, 1.7, 1.7, 1.2, 2, 1.8, 2] });
        }
        groupTable("acrylic_used", L.mat_used + " - " + L.parts_acrylic, r.groups.acrylic, L.total_acrylic);
        groupTable("wood_used", L.mat_used + " - " + L.parts_wood, r.groups.wood, L.total_wood);
        var ty = [], ta = 0, tr = 0, tp = 0, tt = 0;
        for (i = 0; i < r.types.length; i++) {
            var y = r.types[i];
            if (y.rounded <= 0 && y.actual <= 0)
                continue;
            ta += y.actual;
            tr += y.rounded;
            tp += y.pieces;
            tt += y.total;
            ty.push([mat(y.material), costFmtArea(y.actual), costFmt(y.rounded, 0), costFmt(y.pieces, 0), money(y.total)]);
        }
        if (ty.length)
            model.sections.push({ key: "acrylic_types", title: L.acrylic_by_type, head: [L.type, L.actual_area, L.rounded_area, L.pieces, L.total], rows: ty,
                foot: [L.total_acrylic, costFmtArea(costR6(ta)), costFmt(tr, 0), costFmt(tp, 0), money(costR2(tt))], align: ["l", "r", "r", "r", "r"], widths: [4, 2.4, 2.4, 1.6, 2.4] });
        if (T.uv_area_order > 0)
            model.info.push([L.uv_area, costFmtArea(T.uv_area_order)]);
        var ci = [];
        for (i = 0; i < r.items.length; i++) {
            var it = r.items[i];
            var nm = it.key === "extra" ? it.label + (it.per === "order" ? " (" + L.per_order + ")" : "") : L["it_" + it.key];
            ci.push([nm, money(it.per_product), money(it.whole), costPct(it.share)]);
        }
        model.sections.push({ key: "cost_summary", title: L.cost_summary, head: [L.item, L.per_product, L.whole_order, L.share], rows: ci,
            foot: [L.total_mfg, money(T.mfg_pp), money(T.whole_cost), costPct(T.whole_cost > 0 ? 1 : 0)], align: ["l", "r", "r", "r"], widths: [5, 2.4, 2.6, 1.4] });
        var pk = [[L.margin, costFmt(T.margin, 2) + "%"], [L.mfg_pp, money(T.mfg_pp)]];
        if (T.sell_raw !== T.sell_pp)
            pk.push([L.sell_pp + " (" + L.margin + ")", money(T.sell_raw)]);
        pk.push([L.sell_pp, money(T.sell_pp)], [L.profit_pp, money(T.profit_pp)], [L.order_qty, costFmt(r.qty, 0)], [L.order_sales, money(T.order_sales)], [L.order_profit, money(T.order_profit)]);
        if (T.gst > 0)
            pk.push([L.gst + " " + costFmt(T.gst, 2) + "%", money(T.gst_pp)], [L.sell_incl_gst, money(T.sell_incl_gst_pp)], [L.order_gst, money(T.order_gst)], [L.order_total_incl, money(T.order_total_incl_gst)]);
        model.sections.push({ key: "pricing", title: L.pricing, kv: pk });
        if (sc) {
            var mr = [];
            for (i = 0; i < sc.margins.length; i++) {
                var m2 = sc.margins[i];
                mr.push([costFmt(m2.margin, 2) + "%" + (m2.margin === r.margin ? " (" + L.current + ")" : ""), money(m2.sell_pp), money(m2.profit_pp), money(m2.order_sales), money(m2.order_profit)]);
            }
            model.sections.push({ key: "sc_margin", title: L.scenarios_margin, head: [L.col_margin, L.col_sell_pp, L.profit_pp, L.col_order, L.col_profit], rows: mr, foot: null, align: ["l", "r", "r", "r", "r"], widths: [2.6, 2.4, 2.4, 2.6, 2.4] });
            var qr = [];
            for (i = 0; i < sc.qtys.length; i++) {
                var q2 = sc.qtys[i];
                qr.push([costFmt(q2.qty, 0) + (q2.current ? " (" + L.current + ")" : ""), money(q2.mfg_pp), money(q2.sell_pp), money(q2.order_sales)]);
            }
            model.sections.push({ key: "sc_qty", title: L.scenarios_qty, head: [L.col_qty, L.col_mfg_pp, L.col_sell_pp, L.col_order], rows: qr, foot: null, align: ["l", "r", "r", "r"], widths: [2.6, 2.6, 2.6, 2.8] });
        }
        return model;
    }
    /* COSTING-DOC-END */

    window.BestowCost = {
        calc: calcCosting, scenarios: calcScenarios, defaults: costingDefaults, normalize: normalizeCostingConfig,
        names: costMaterialNames, find: costFindMaterial, unit: costUnit, round: costRound, num: costNum, area: costArea,
        i18n: COST_I18N, langs: COST_LANGS, doc: costDocModel, fmt: costFmt, fmtIn: costFmtIn, fmtArea: costFmtArea, pct: costPct
    };

    /* legacy-friendly globals */
    window.escapeHTML = Utils.esc;
    window.showToast = UI.toast;
    window.openModal = UI.openModal;
    window.closeModal = UI.closeModal;
})();
