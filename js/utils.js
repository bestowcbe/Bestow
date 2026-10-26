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

    /* legacy-friendly globals */
    window.escapeHTML = Utils.esc;
    window.showToast = UI.toast;
    window.openModal = UI.openModal;
    window.closeModal = UI.closeModal;
})();
