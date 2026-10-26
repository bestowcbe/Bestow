/* ==========================================================================
   BESTOW - ADMIN PANEL
   Dashboard, orders, catalogue, customers, reviews, coupons, inquiries, newsletter,
   Site Text Manager, branding, settings, contact, SEO, FAQ, policies, email log, activity log.
   Everything goes through API.* (RLS enforces admin rights on the server) and the
   edge functions (invoices and e-mail). No secret ever lives in this file.
   ========================================================================== */
(function () {
    'use strict';

    var esc = Utils.esc;
    function $(id) { return document.getElementById(id); }

    var TABS = [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', group: 'Overview' },
        { id: 'orders', label: 'Orders', icon: 'package', group: 'Sales' },
        { id: 'products', label: 'Products', icon: 'gift', group: 'Sales' },
        { id: 'categories', label: 'Categories', icon: 'layers', group: 'Sales' },
        { id: 'coupons', label: 'Coupons', icon: 'ticket', group: 'Sales' },
        { id: 'returns', label: 'Returns and Exchanges', icon: 'rotate-ccw', group: 'Sales' },
        { id: 'customers', label: 'Customers', icon: 'users', group: 'Sales' },
        { id: 'reviews', label: 'Reviews', icon: 'star', group: 'Engage' },
        { id: 'inquiries', label: 'Inquiries', icon: 'inbox', group: 'Engage' },
        { id: 'newsletter', label: 'Newsletter', icon: 'mail', group: 'Engage' },
        { id: 'content', label: 'Site Text', icon: 'type', group: 'Site' },
        { id: 'branding', label: 'Logo and Brand', icon: 'badge-check', group: 'Site' },
        { id: 'settings', label: 'Store Settings', icon: 'sliders-horizontal', group: 'Site' },
        { id: 'contact', label: 'Contact and Social', icon: 'phone', group: 'Site' },
        { id: 'seo', label: 'SEO', icon: 'search', group: 'Site' },
        { id: 'faq', label: 'FAQ', icon: 'help-circle', group: 'Site' },
        { id: 'policies', label: 'Policies', icon: 'file-text', group: 'Site' },
        { id: 'emails', label: 'Email Centre', icon: 'send', group: 'System' },
        { id: 'activity', label: 'Activity Log', icon: 'history', group: 'System' }
    ];

    var ORDER_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned'];
    var S = { tab: 'dashboard', token: 0, rt: null, sound: true, newCount: 0, ready: false, orderPage: 1, orderFilter: { status: 'all', payment: 'all', search: '' },
              productPage: 1, productFilter: { search: '', category: '' }, customerPage: 1, customerSearch: '', range: 30, bound: false, cats: [] };
    try { S.sound = localStorage.getItem('bestow_admin_sound') !== '0'; } catch (e) { /* ignore */ }

    /* ---------- helpers ---------- */
    function uid() { return window.AppState && AppState.user ? AppState.user.id : null; }
    function log(action, type, id, details) { API.activity.log(uid(), action, type, id, details); }
    function label(s) { return Utils.titleCase(s); }
    function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
    function int(v) { var n = parseInt(v, 10); return isFinite(n) ? n : 0; }
    function content() { return $('adminContent'); }
    function stale(t) { return t !== S.token; }
    function busy(msg) { return '<div class="admin-loading"><span class="spinner" aria-hidden="true"></span><span>' + esc(msg || 'Loading') + '</span></div>'; }
    function fail(el, err) { el.innerHTML = UI.empty('alert-triangle', 'Could not load this section', (err && err.message) || 'Please try again.', '<button type="button" class="btn btn-outline btn-sm" data-admin-refresh>Retry</button>'); refreshIcons(); }

    function fld(lab, name, val, o) {
        o = o || {};
        var id = 'af_' + name + '_' + Utils.uid();
        var attrs = (o.req ? ' required' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.min !== undefined ? ' min="' + o.min + '"' : '') + (o.step ? ' step="' + o.step + '"' : '') + (o.pattern ? ' pattern="' + o.pattern + '"' : '');
        var input = o.rows
            ? '<textarea id="' + id + '" name="' + name + '" rows="' + o.rows + '"' + attrs + '>' + esc(val === null || val === undefined ? '' : val) + '</textarea>'
            : '<input id="' + id + '" name="' + name + '" type="' + (o.type || 'text') + '" value="' + esc(val === null || val === undefined ? '' : val) + '"' + attrs + '>';
        return '<div class="form-group' + (o.half ? ' half' : '') + '"><label for="' + id + '">' + esc(lab) + (o.req ? ' <span class="req">*</span>' : '') + '</label>' + input + (o.hint ? '<small class="form-hint">' + esc(o.hint) + '</small>' : '') + '</div>';
    }
    function sel(lab, name, options, val, o) {
        o = o || {};
        var id = 'as_' + name + '_' + Utils.uid();
        return '<div class="form-group' + (o.half ? ' half' : '') + '"><label for="' + id + '">' + esc(lab) + '</label><select id="' + id + '" name="' + name + '">' +
            options.map(function (x) { var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : label(x); return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select></div>';
    }
    function chk(lab, name, on, hint) {
        return '<label class="check-row"><input type="checkbox" name="' + name + '"' + (on ? ' checked' : '') + '><span class="check-box"></span><span class="check-text"><strong>' + esc(lab) + '</strong>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span></label>';
    }
    function readForm(form) {
        var o = {};
        Array.prototype.forEach.call(form.elements, function (el) {
            if (!el.name) return;
            if (el.type === 'checkbox') o[el.name] = el.checked;
            else if (el.type !== 'file' && el.type !== 'button' && el.type !== 'submit') o[el.name] = el.value;
        });
        return o;
    }
    function fmtDate(v) { return v ? Utils.dateTime(v) : '-'; }
    function dateInput(v) { return v ? new Date(v).toISOString().slice(0, 10) : ''; }
    function localInput(v) { if (!v) return ''; var d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }

    function modal(title, html, wide) {
        $('adminModalTitle').textContent = title;
        $('adminModalBody').innerHTML = html;
        var box = $('adminModal').querySelector('.modal');
        if (box) box.classList.toggle('modal-wide', !!wide);
        UI.openModal('adminModal');
        refreshIcons();
        return $('adminModalBody');
    }
    function closeModal() { UI.closeModal('adminModal'); }

    function pager(page, total, limit, attr) {
        var pages = Math.max(1, Math.ceil(total / limit));
        if (pages <= 1) return '';
        return '<div class="pagination admin-pager"><button type="button" class="page-btn" data-' + attr + '="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' + UI.icon('chevron-left') + '</button>' +
            '<span class="page-info">Page ' + page + ' of ' + pages + ' &middot; ' + total + ' records</span>' +
            '<button type="button" class="page-btn" data-' + attr + '="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + ' aria-label="Next page">' + UI.icon('chevron-right') + '</button></div>';
    }
    function badge(text, kind) { return '<span class="badge badge-' + (kind || 'neutral') + '">' + esc(text) + '</span>'; }
    function toolbar(left, right) { return '<div class="admin-toolbar"><div class="admin-toolbar-left">' + (left || '') + '</div><div class="admin-toolbar-right">' + (right || '') + '</div></div>'; }
    function head(title, sub, actions) { return '<header class="admin-head"><div><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div><div class="admin-head-actions">' + (actions || '') + '</div></header>'; }
    function btn(text, act, icon, cls, extra) { return '<button type="button" class="btn ' + (cls || 'btn-outline') + ' btn-sm" data-act="' + act + '"' + (extra || '') + '>' + (icon ? UI.icon(icon, 'icon-xs') + ' ' : '') + esc(text) + '</button>'; }
    function iconBtn(act, icon, title, id, cls) { return '<button type="button" class="icon-btn icon-btn-sm ' + (cls || '') + '" data-act="' + act + '" data-id="' + esc(id) + '" aria-label="' + esc(title) + '" title="' + esc(title) + '">' + UI.icon(icon) + '</button>'; }

    async function uploadImage(bucket, folder, file) {
        var f = await Utils.compressImage(file, 1800, 0.86);
        return API.storage.upload(bucket, folder, f);
    }

    async function sendMail(body, okMsg) {
        var r = await API.fn('send-email', body);
        if (r.error || (r.data && r.data.ok === false)) {
            var why = String((r.error && r.error.message) || (r.data && (r.data.message || r.data.detail)) || 'unknown error');
            if (/GAS_WEBAPP_URL|GAS_SECRET/.test(why)) why = 'The email service is not connected yet. Add the GAS_WEBAPP_URL and GAS_SECRET secrets in Supabase, then try again.';
            UI.toast('Email not sent: ' + why, 'error', 7000); return false;
        }
        if (okMsg) UI.toast(okMsg, 'success');
        return r.data || true;
    }

    /* ======================================================================
       NAVIGATION SHELL
       ====================================================================== */
    function renderNav() {
        var nav = $('adminNav'); if (!nav) return;
        var group = '', h = '';
        TABS.forEach(function (t) {
            if (t.group !== group) { group = t.group; h += '<p class="admin-nav-group">' + esc(group) + '</p>'; }
            h += '<a href="#admin/' + t.id + '" class="admin-nav-item' + (S.tab === t.id ? ' active' : '') + '" data-route="admin" data-param="' + t.id + '"' + (S.tab === t.id ? ' aria-current="page"' : '') + '>' +
                UI.icon(t.icon) + '<span>' + esc(t.label) + '</span>' + (t.id === 'orders' && S.newCount ? '<em class="admin-nav-badge">' + S.newCount + '</em>' : '') + '</a>';
        });
        nav.innerHTML = h;
        refreshIcons();
        var snd = $('adminSoundBtn');
        if (snd) { snd.setAttribute('aria-pressed', S.sound ? 'true' : 'false'); snd.innerHTML = UI.icon(S.sound ? 'bell-ring' : 'bell-off'); refreshIcons(); }
    }
    function closeSidebar() { document.body.classList.remove('admin-nav-open'); }

    /* ---------- realtime new-order alerts ---------- */
    function beep() {
        if (!S.sound) return;
        try {
            var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
            var ctx = new C(), o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.setValueAtTime(1175, ctx.currentTime + 0.12);
            g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
            o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.42);
            setTimeout(function () { try { ctx.close(); } catch (e) { /* ignore */ } }, 700);
        } catch (e) { /* audio is optional */ }
    }
    function startRealtime() {
        stopRealtime();
        S.rt = API.realtime.orders(null, function (p) {
            var n = p.new || {}, o = p.old || {};
            if (p.eventType === 'UPDATE' && n.payment_status === 'paid' && o.payment_status !== 'paid') {
                S.newCount++; beep();
                UI.toast('New paid order ' + (n.order_number || '') + ' for ' + Utils.price(n.total_amount), 'success', 6000);
                renderNav();
                if (S.tab === 'orders' || S.tab === 'dashboard') Admin.refresh();
            }
        });
    }
    function stopRealtime() { if (S.rt) { API.realtime.stop(S.rt); S.rt = null; } }

    /* ======================================================================
       DASHBOARD
       ====================================================================== */
    function dayKey(d) { return new Date(d).toISOString().slice(0, 10); }

    function revenueChart(orders, days) {
        var map = {}, i, now = new Date();
        for (i = days - 1; i >= 0; i--) { var d = new Date(now.getTime() - i * 86400000); map[dayKey(d)] = { rev: 0, n: 0 }; }
        orders.forEach(function (o) { if (o.payment_status !== 'paid') return; var k = dayKey(o.created_at); if (map[k]) { map[k].rev += Number(o.total_amount) || 0; map[k].n++; } });
        var keys = Object.keys(map), vals = keys.map(function (k) { return map[k].rev; });
        var max = Math.max.apply(null, vals.concat([1]));
        var W = 720, H = 240, pl = 44, pr = 12, pt = 14, pb = 28, iw = W - pl - pr, ih = H - pt - pb;
        var bw = iw / keys.length;
        var svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Revenue per day for the last ' + days + ' days" preserveAspectRatio="none"><defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#de2128"/><stop offset="1" stop-color="#de2128" stop-opacity=".35"/></linearGradient></defs>';
        for (i = 0; i <= 4; i++) {
            var y = pt + ih - (ih * i / 4);
            svg += '<line class="chart-grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '"/><text class="chart-axis" x="' + (pl - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + (max * i / 4 >= 1000 ? Math.round(max * i / 4 / 1000) + 'k' : Math.round(max * i / 4)) + '</text>';
        }
        keys.forEach(function (k, idx) {
            var v = map[k].rev, h = Math.max(v > 0 ? 3 : 0, v / max * ih), x = pl + idx * bw + bw * 0.14;
            svg += '<rect class="chart-bar" x="' + x.toFixed(1) + '" y="' + (pt + ih - h).toFixed(1) + '" width="' + (bw * 0.72).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="url(#barGrad)"><title>' + k + ': ' + Utils.price(v) + ' (' + map[k].n + ' orders)</title></rect>';
            if (days <= 14 || idx % Math.ceil(days / 8) === 0) svg += '<text class="chart-axis" x="' + (x + bw * 0.36).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + k.slice(8) + '/' + k.slice(5, 7) + '</text>';
        });
        return svg + '</svg>';
    }

    function statusBars(orders) {
        var c = {}; orders.forEach(function (o) { var s = o.payment_status === 'pending' ? 'unpaid' : o.order_status; c[s] = (c[s] || 0) + 1; });
        var keys = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }), total = orders.length || 1;
        if (!keys.length) return '<p class="text-muted">No orders in this period.</p>';
        return '<ul class="bar-list">' + keys.map(function (k) {
            return '<li><span class="bar-label">' + esc(label(k)) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + (c[k] / total * 100).toFixed(1) + '%"></span></span><strong>' + c[k] + '</strong></li>';
        }).join('') + '</ul>';
    }

    async function loadDashboard(t) {
        var el = content(); el.innerHTML = head('Dashboard', 'A live view of your store', '<div class="seg" role="group" aria-label="Date range">' + [7, 30, 90].map(function (d) { return '<button type="button" class="seg-btn' + (S.range === d ? ' active' : '') + '" data-range="' + d + '">' + d + ' days</button>'; }).join('') + '</div>' + btn('Refresh', 'refresh', 'refresh-cw')) + busy();
        var res = await Promise.all([API.orders.analytics(S.range), API.orders.totals(), API.profile.count(), API.products.count(), API.products.topSellers(5), API.products.lowStock(8), API.inquiries.all('new'), API.reviews.all('pending')]);
        if (stale(t)) return;
        var orders = (res[0].data || []), totals = res[1].data || { count: 0, revenue: 0, paid: 0 };
        var paid = orders.filter(function (o) { return o.payment_status === 'paid'; });
        var periodRev = paid.reduce(function (s, o) { return s + Number(o.total_amount || 0); }, 0);
        var aov = paid.length ? periodRev / paid.length : 0;
        var toShip = orders.filter(function (o) { return o.payment_status === 'paid' && (o.order_status === 'placed' || o.order_status === 'confirmed' || o.order_status === 'processing'); }).length;
        var kpi = function (icon, lab, val, sub) { return '<article class="kpi glass"><span class="kpi-icon">' + UI.icon(icon) + '</span><div><p>' + esc(lab) + '</p><strong>' + val + '</strong>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></article>'; };
        var recent = orders.slice(-8).reverse();
        var low = res[5].data || [], top = res[4].data || [];
        el.innerHTML = head('Dashboard', 'A live view of your store', '<div class="seg" role="group" aria-label="Date range">' + [7, 30, 90].map(function (d) { return '<button type="button" class="seg-btn' + (S.range === d ? ' active' : '') + '" data-range="' + d + '">' + d + ' days</button>'; }).join('') + '</div>' + btn('Refresh', 'refresh', 'refresh-cw')) +
            '<div class="kpi-grid">' +
            kpi('indian-rupee', 'Revenue (' + S.range + ' days)', Utils.price(periodRev), 'Lifetime ' + Utils.price(totals.revenue)) +
            kpi('shopping-bag', 'Paid orders', String(paid.length), totals.count + ' orders in total') +
            kpi('truck', 'Waiting to ship', String(toShip), 'Paid, not yet shipped') +
            kpi('trending-up', 'Average order value', Utils.price(aov), '') +
            kpi('users', 'Customers', String(res[2].count || 0), '') +
            kpi('gift', 'Products', String(res[3].count || 0), low.length + ' low on stock') +
            kpi('inbox', 'New inquiries', String((res[6].data || []).length), '') +
            kpi('star', 'Reviews to approve', String((res[7].data || []).length), '') + '</div>' +
            '<div class="admin-grid-2"><section class="admin-card glass"><h3>Revenue per day</h3>' + revenueChart(orders, S.range) + '</section>' +
            '<section class="admin-card glass"><h3>Order status</h3>' + statusBars(orders) + '</section></div>' +
            '<div class="admin-grid-3"><section class="admin-card glass"><h3>Recent orders</h3>' + (recent.length ? '<ul class="mini-list">' + recent.map(function (o) {
                return '<li><button type="button" class="mini-row" data-act="open-order" data-id="' + esc(o.id) + '"><span><strong>' + esc(o.order_number) + '</strong><small>' + esc(o.customer_name) + ' &middot; ' + Utils.timeAgo(o.created_at) + '</small></span><span>' + Utils.price(o.total_amount) + '</span></button></li>';
            }).join('') + '</ul>' : '<p class="text-muted">No orders yet.</p>') + '</section>' +
            '<section class="admin-card glass"><h3>Best sellers</h3>' + (top.length ? '<ul class="mini-list">' + top.map(function (p) {
                return '<li><div class="mini-row static"><img src="' + esc(Utils.productImage(p)) + '" alt="" loading="lazy"><span><strong>' + esc(p.name) + '</strong><small>' + (p.sold_count || 0) + ' sold</small></span><span>' + Utils.price(p.price) + '</span></div></li>';
            }).join('') + '</ul>' : '<p class="text-muted">No sales yet.</p>') + '</section>' +
            '<section class="admin-card glass"><h3>Low stock</h3>' + (low.length ? '<ul class="mini-list">' + low.map(function (p) {
                return '<li><button type="button" class="mini-row" data-act="edit-product" data-id="' + esc(p.id) + '"><span><strong>' + esc(p.name) + '</strong><small>' + esc(p.sku || '') + '</small></span>' + badge(p.stock_quantity + ' left', p.stock_quantity === 0 ? 'danger' : 'warning') + '</button></li>';
            }).join('') + '</ul>' : '<p class="text-muted">All products are well stocked.</p>') + '</section></div>';
        refreshIcons();
    }

    /* ======================================================================
       ORDERS
       ====================================================================== */
    var ORDER_LIMIT = 20;
    var orderRows = [];

    async function loadOrders(t) {
        var el = content(), f = S.orderFilter;
        if (!$('orderSearch')) {
            el.innerHTML = head('Orders', 'Track, update and fulfil customer orders', btn('Export CSV', 'export-orders', 'download')) +
                toolbar('<div class="search-field">' + UI.icon('search', 'icon-sm') + '<input id="orderSearch" type="search" placeholder="Order number, name, email or phone" value="' + esc(f.search) + '" aria-label="Search orders"></div>' +
                    '<select id="orderStatusFilter" aria-label="Order status">' + [['all', 'All statuses']].concat(ORDER_STATUSES.map(function (s) { return [s, label(s)]; })).map(function (x) { return '<option value="' + x[0] + '"' + (f.status === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
                    '<select id="orderPayFilter" aria-label="Payment status">' + [['all', 'All payments'], ['paid', 'Paid'], ['pending', 'Pending'], ['failed', 'Failed'], ['refunded', 'Refunded']].map(function (x) { return '<option value="' + x[0] + '"' + (f.payment === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>') +
                '<div id="orderTable">' + busy() + '</div>';
            refreshIcons();
        }
        var box = $('orderTable'); box.innerHTML = busy();
        var r = await API.orders.all({ page: S.orderPage, limit: ORDER_LIMIT, status: f.status, payment: f.payment, search: f.search });
        if (stale(t)) return;
        if (r.error) return fail(box, r.error);
        orderRows = r.data || [];
        if (!orderRows.length) { box.innerHTML = UI.empty('package', 'No orders found', 'Try a different filter.'); refreshIcons(); return; }
        box.innerHTML = '<div class="table-wrap glass"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>' +
            orderRows.map(function (o) {
                return '<tr><td data-label="Order"><button type="button" class="link-btn" data-act="open-order" data-id="' + esc(o.id) + '"><strong>' + esc(o.order_number) + '</strong></button></td>' +
                    '<td data-label="Customer">' + esc(o.customer_name) + '<small class="cell-sub">' + esc(o.customer_email) + '</small></td>' +
                    '<td data-label="Date">' + Utils.dateTime(o.created_at) + '</td><td data-label="Total"><strong>' + Utils.price(o.total_amount) + '</strong></td>' +
                    '<td data-label="Payment">' + badge(label(o.payment_status), o.payment_status === 'paid' ? 'success' : o.payment_status === 'pending' ? 'warning' : o.payment_status === 'refunded' ? 'info' : 'danger') + '</td>' +
                    '<td data-label="Status">' + badge(label(o.order_status), o.order_status === 'delivered' ? 'success' : (o.order_status === 'cancelled' || o.order_status === 'returned') ? 'danger' : 'brand') + '</td>' +
                    '<td class="cell-actions">' + iconBtn('open-order', 'eye', 'View order', o.id) + '</td></tr>';
            }).join('') + '</tbody></table></div>' + pager(S.orderPage, r.count || 0, ORDER_LIMIT, 'order-page');
        refreshIcons();
    }

    function orderModalHtml(o) {
        var paid = o.payment_status === 'paid' || o.payment_status === 'refunded';
        var photoBtns = (o.items || []).map(function (i, idx) {
            return i.customization && i.customization.photo_path ? '<button type="button" class="btn btn-outline btn-sm" data-act="view-photo" data-path="' + esc(i.customization.photo_path) + '">' + UI.icon('image', 'icon-xs') + ' Customer photo for ' + esc(Utils.truncate(i.name, 24)) + '</button>' : '';
        }).join('');
        return '<div class="order-admin" data-order-id="' + esc(o.id) + '">' +
            '<div class="order-admin-top"><div><h3>' + esc(o.order_number) + '</h3><p class="text-muted">' + Utils.dateTime(o.created_at) + (o.invoice_number ? ' &middot; ' + esc(o.invoice_number) : '') + '</p></div><div>' + Orders.pill(o) + '</div></div>' +
            Orders.timeline(o) +
            '<div class="order-lines">' + Orders.itemsHtml(o, false) + '</div>' +
            '<div class="order-sum-grid">' +
            '<div><h5>Customer</h5><p>' + esc(o.customer_name) + '<br><a href="mailto:' + esc(o.customer_email) + '">' + esc(o.customer_email) + '</a><br><a href="tel:' + esc(o.customer_phone) + '">' + esc(o.customer_phone) + '</a></p></div>' +
            '<div><h5>Ship to</h5><p>' + Orders.addressHtml(o.shipping_address) + '</p></div>' +
            '<div><h5>Amounts</h5><p>Subtotal ' + Utils.price(o.subtotal) + '<br>Discount -' + Utils.price(o.discount_amount) + (o.points_used ? ' (points ' + o.points_used + ')' : '') + '<br>Shipping ' + Utils.price(o.shipping_cost) + (o.gift_wrap ? '<br>Gift wrap ' + Utils.price(o.gift_wrap_fee) : '') + '<br>GST ' + Utils.price(o.tax_amount) + '<br><strong>Total ' + Utils.price(o.total_amount) + '</strong>' + (o.coupon_code ? '<br>Coupon ' + esc(o.coupon_code) : '') + '</p></div>' +
            '<div><h5>Payment</h5><p>' + esc(label(o.payment_status)) + '<br><small class="text-muted">' + esc(o.razorpay_payment_id || 'No payment id') + '</small></p></div></div>' +
            (o.special_instructions ? '<div class="note-box"><h5>Customer notes</h5><p>' + Utils.multiline(o.special_instructions) + '</p></div>' : '') +
            (o.gift_message ? '<div class="note-box"><h5>Gift message</h5><p>' + Utils.multiline(o.gift_message) + '</p></div>' : '') +
            '<form id="orderUpdateForm" class="admin-form" novalidate><h4>Update order</h4><div class="form-row">' +
            sel('Order status', 'order_status', ORDER_STATUSES, o.order_status, { half: true }) +
            fld('Expected delivery', 'estimated_delivery', dateInput(o.estimated_delivery), { type: 'date', half: true }) + '</div><div class="form-row">' +
            fld('Tracking number', 'tracking_number', o.tracking_number, { half: true, max: 80 }) +
            fld('Tracking link', 'tracking_url', o.tracking_url, { half: true, type: 'url', ph: 'https://', max: 400 }) + '</div>' +
            fld('Cancellation reason', 'cancellation_reason', o.cancellation_reason, { max: 300, hint: 'Shown to the customer when the order is cancelled.' }) +
            chk('Email the customer about this change', 'notify', true, 'A branded status email is sent through Google Apps Script. Duplicates are skipped automatically.') +
            '<div class="modal-actions"><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save changes</button></div></form>' +
            '<div class="order-admin-actions">' +
            (paid ? btn('Download invoice', 'invoice-dl', 'file-down') + btn('Resend invoice email', 'invoice-send', 'send') + btn('Regenerate invoice', 'invoice-regen', 'refresh-cw') : '') +
            (o.payment_status === 'paid' ? btn('Mark refunded and email', 'refund', 'undo-2', 'btn-outline danger') : '') +
            btn('Print packing slip', 'packing-slip', 'printer') + btn('WhatsApp customer', 'wa-customer', 'message-circle') + photoBtns + '</div></div>';
    }

    async function openOrder(id) {
        var local = orderRows.filter(function (x) { return x.id === id; })[0];
        var o = local;
        var r = await API.orders.byId(id);
        if (r.data) o = r.data;
        if (!o) { UI.toast('Order not found', 'error'); return; }
        modal('Order ' + o.order_number, orderModalHtml(o), true);
        $('adminModalBody').__order = o;
    }

    async function saveOrder(form) {
        var o = $('adminModalBody').__order, v = readForm(form);
        var submit = form.querySelector('[type=submit]');
        var patch = { order_status: v.order_status, tracking_number: v.tracking_number.trim(), tracking_url: v.tracking_url.trim(), estimated_delivery: v.estimated_delivery || null, cancellation_reason: v.cancellation_reason.trim() };
        if (patch.tracking_url && !/^https?:\/\//i.test(patch.tracking_url)) { UI.toast('Tracking link must start with https://', 'warning'); return; }
        if ((v.order_status === 'shipped' || v.order_status === 'in_transit') && !patch.tracking_number) {
            var go = await UI.confirm({ title: 'No tracking number', message: 'This order is being marked as shipped without a tracking number. Continue?', confirmText: 'Continue' });
            if (!go) return;
        }
        if (v.order_status === 'cancelled' && !patch.cancellation_reason) patch.cancellation_reason = 'Cancelled by store';
        UI.setLoading(submit, true, 'Saving');
        var r = await API.orders.update(o.id, patch);
        if (r.error) { UI.setLoading(submit, false); UI.toast('Update failed: ' + r.error.message, 'error'); return; }
        log('update', 'order', o.id, { status: patch.order_status });
        var statusChanged = patch.order_status !== o.order_status;
        if (v.notify && (statusChanged || patch.tracking_number !== (o.tracking_number || ''))) {
            await sendMail({ type: 'order_status', order_id: o.id, force: !statusChanged }, 'Customer notified');
        }
        UI.setLoading(submit, false);
        UI.toast('Order updated', 'success');
        $('adminModalBody').__order = r.data;
        modal('Order ' + r.data.order_number, orderModalHtml(r.data), true); $('adminModalBody').__order = r.data;
        if (S.tab === 'orders') loadOrders(S.token); else if (S.tab === 'dashboard') Admin.refresh();
    }

    async function invoiceUrl(order, action) {
        var r = await API.fn('generate-invoice', { order_id: order.id, action: action || 'url' });
        if (r.error || !r.data || !r.data.url) { UI.toast('Invoice unavailable: ' + ((r.error && r.error.message) || (r.data && r.data.message) || 'try again'), 'error'); return null; }
        return r.data.url;
    }

    function packingSlip(o) {
        var w = window.open('', '_blank', 'width=820,height=900'); if (!w) { UI.toast('Allow pop-ups to print the packing slip', 'warning'); return; }
        var rows = (o.items || []).map(function (i) {
            var cz = i.customization && i.customization.fields ? Object.keys(i.customization.fields).map(function (k) { return esc(k) + ': ' + esc(i.customization.fields[k]); }).join('<br>') : '';
            return '<tr><td>' + esc(i.name) + (cz ? '<br><small>' + cz + '</small>' : '') + '</td><td style="text-align:center">' + i.quantity + '</td></tr>';
        }).join('');
        var a = o.shipping_address || {};
        w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Packing slip ' + esc(o.order_number) + '</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border-bottom:1px solid #ddd;padding:10px;text-align:left;font-size:14px}small{color:#555}.box{margin-top:18px;font-size:14px;line-height:1.6}</style></head><body><h1>' + esc(Bestow.branding.brand_name) + ' - Packing slip</h1><div>' + esc(o.order_number) + ' &middot; ' + Utils.dateTime(o.created_at) + '</div><div class="box"><strong>Ship to</strong><br>' + esc(o.customer_name) + '<br>' + [a.address_line1, a.address_line2, a.city, a.state, a.pincode].filter(Boolean).map(esc).join(', ') + '<br>' + esc(o.customer_phone) + '</div><table><thead><tr><th>Item</th><th style="text-align:center">Qty</th></tr></thead><tbody>' + rows + '</tbody></table>' + (o.gift_message ? '<div class="box"><strong>Gift message</strong><br>' + esc(o.gift_message) + '</div>' : '') + (o.special_instructions ? '<div class="box"><strong>Notes</strong><br>' + esc(o.special_instructions) + '</div>' : '') + '<script>window.onload=function(){window.print()}<\/script></body></html>');
        w.document.close();
    }

    async function exportOrders() {
        var r = await API.orders.all({ page: 1, limit: 1000, status: S.orderFilter.status, payment: S.orderFilter.payment, search: S.orderFilter.search });
        if (!r.data || !r.data.length) { UI.toast('Nothing to export', 'info'); return; }
        Utils.downloadCSV(r.data, [
            { label: 'Order', key: 'order_number' }, { label: 'Date', value: function (o) { return o.created_at; } }, { label: 'Customer', key: 'customer_name' }, { label: 'Email', key: 'customer_email' },
            { label: 'Phone', key: 'customer_phone' }, { label: 'Items', value: function (o) { return (o.items || []).map(function (i) { return i.name + ' x' + i.quantity; }).join('; '); } },
            { label: 'Subtotal', key: 'subtotal' }, { label: 'Discount', key: 'discount_amount' }, { label: 'Shipping', key: 'shipping_cost' }, { label: 'GST', key: 'tax_amount' }, { label: 'Total', key: 'total_amount' },
            { label: 'Payment', key: 'payment_status' }, { label: 'Status', key: 'order_status' }, { label: 'Tracking', key: 'tracking_number' }, { label: 'Invoice', key: 'invoice_number' }
        ], 'bestow-orders-' + dayKey(new Date()) + '.csv');
    }

    /* ======================================================================
       PRODUCTS
       ====================================================================== */
    var PRODUCT_LIMIT = 15;
    var productRows = [];

    async function ensureCats() {
        var r = await API.categories.all(false);
        S.cats = r.data || [];
        return S.cats;
    }

    async function loadProducts(t) {
        var el = content(), f = S.productFilter;
        if (!$('productSearch')) {
            await ensureCats();
            if (stale(t)) return;
            el.innerHTML = head('Products', 'Manage your catalogue, stock and personalisation fields', btn('Export CSV', 'export-products', 'download') + btn('Add product', 'new-product', 'plus', 'btn-primary')) +
                toolbar('<div class="search-field">' + UI.icon('search', 'icon-sm') + '<input id="productSearch" type="search" placeholder="Name, SKU or keyword" value="' + esc(f.search) + '" aria-label="Search products"></div>' +
                    '<select id="productCatFilter" aria-label="Category"><option value="">All categories</option>' + S.cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (f.category === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>') +
                '<div id="productTable">' + busy() + '</div>';
            refreshIcons();
        }
        var box = $('productTable'); box.innerHTML = busy();
        var r = await API.products.list({ page: S.productPage, limit: PRODUCT_LIMIT, includeInactive: true, search: f.search, categoryId: f.category, sort: 'newest' });
        if (stale(t)) return;
        if (r.error) return fail(box, r.error);
        productRows = r.data || [];
        if (!productRows.length) { box.innerHTML = UI.empty('gift', 'No products yet', 'Add your first product to start selling.', btn('Add product', 'new-product', 'plus', 'btn-primary')); refreshIcons(); return; }
        box.innerHTML = '<div class="table-wrap glass"><table class="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>' +
            productRows.map(function (p) {
                var low = p.stock_quantity <= (p.low_stock_threshold == null ? 5 : p.low_stock_threshold);
                return '<tr><td data-label="Product"><div class="cell-product"><img src="' + esc(Utils.productImage(p)) + '" alt="" loading="lazy"><div><strong>' + esc(p.name) + '</strong><small class="cell-sub">' + esc(p.sku || 'No SKU') + '</small></div></div></td>' +
                    '<td data-label="Category">' + esc(p.categories ? p.categories.name : '-') + '</td>' +
                    '<td data-label="Price">' + Utils.price(p.price) + (p.compare_price > p.price ? '<small class="cell-sub strike">' + Utils.price(p.compare_price) + '</small>' : '') + '</td>' +
                    '<td data-label="Stock">' + badge(String(p.stock_quantity), p.stock_quantity === 0 ? 'danger' : low ? 'warning' : 'success') + '</td>' +
                    '<td data-label="Status">' + (p.is_active ? badge('Live', 'success') : badge('Hidden', 'neutral')) + (p.is_featured ? ' ' + badge('Featured', 'brand') : '') + (p.is_customizable ? ' ' + badge('Custom', 'info') : '') + '</td>' +
                    '<td class="cell-actions">' + iconBtn('edit-product', 'pencil', 'Edit', p.id) + iconBtn('dup-product', 'copy', 'Duplicate', p.id) + iconBtn('toggle-product', p.is_active ? 'eye-off' : 'eye', p.is_active ? 'Hide' : 'Publish', p.id) + iconBtn('del-product', 'trash-2', 'Delete', p.id, 'danger') + '</td></tr>';
            }).join('') + '</tbody></table></div>' + pager(S.productPage, r.count || 0, PRODUCT_LIMIT, 'product-page');
        refreshIcons();
    }

    function czRowHtml(o) {
        o = o || { label: '', type: 'text', required: false, placeholder: '', options: [] };
        return '<div class="cz-row glass-soft" data-cz-row><div class="form-row">' +
            '<div class="form-group half"><label>Field label</label><input type="text" data-cz="label" value="' + esc(o.label) + '" maxlength="60" placeholder="e.g. Name on the award"></div>' +
            '<div class="form-group half"><label>Type</label><select data-cz="type">' + [['text', 'Short text'], ['textarea', 'Long text'], ['select', 'Dropdown'], ['photo', 'Photo upload']].map(function (x) { return '<option value="' + x[0] + '"' + (o.type === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div></div>' +
            '<div class="form-row"><div class="form-group half"><label>Hint shown to customer</label><input type="text" data-cz="placeholder" value="' + esc(o.placeholder || '') + '" maxlength="120"></div>' +
            '<div class="form-group half"><label>Dropdown choices (comma separated)</label><input type="text" data-cz="options" value="' + esc((o.options || []).join(', ')) + '" maxlength="400"></div></div>' +
            '<div class="cz-row-foot"><label class="check-inline"><input type="checkbox" data-cz="required"' + (o.required ? ' checked' : '') + '> Required</label><button type="button" class="btn btn-ghost btn-sm danger" data-act="cz-remove">' + UI.icon('trash-2', 'icon-xs') + ' Remove</button></div></div>';
    }

    function readCz(root) {
        var out = [];
        root.querySelectorAll('[data-cz-row]').forEach(function (row) {
            var g = function (k) { var e = row.querySelector('[data-cz="' + k + '"]'); return e ? (e.type === 'checkbox' ? e.checked : e.value.trim()) : ''; };
            var label = g('label'); if (!label) return;
            var type = g('type'), item = { label: label, type: type, required: !!g('required') };
            if (g('placeholder')) item.placeholder = g('placeholder');
            if (type === 'select') item.options = String(g('options')).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            out.push(item);
        });
        return out;
    }

    function imagesHtml(urls) {
        return urls.map(function (u, i) {
            return '<div class="thumb-item" data-url="' + esc(u) + '"><img src="' + esc(u) + '" alt=""><span class="thumb-badge">' + (i === 0 ? 'Cover' : '') + '</span><div class="thumb-tools">' +
                (i > 0 ? '<button type="button" data-act="img-cover" aria-label="Make cover">' + UI.icon('star', 'icon-xs') + '</button>' : '') + '<button type="button" data-act="img-remove" aria-label="Remove image">' + UI.icon('x', 'icon-xs') + '</button></div></div>';
        }).join('');
    }

    async function openProduct(id, dup) {
        await ensureCats();
        var p = null;
        if (id) {
            var r = await API.products.byId(id); p = r.data;
            if (!p) { UI.toast('Product not found', 'error'); return; }
        }
        var isNew = !p || dup;
        p = p || { name: '', description: '', short_description: '', category_id: '', price: '', compare_price: '', cost_price: '', sku: '', stock_quantity: 10, low_stock_threshold: 5, images: [], is_active: true, is_featured: false, is_customizable: false, customization_options: [], tags: [], weight: 0, meta_title: '', meta_description: '' };
        if (dup) { p = Object.assign({}, p, { name: p.name + ' (Copy)', sku: '' }); }
        var body = modal(isNew ? (dup ? 'Duplicate product' : 'Add product') : 'Edit product',
            '<form id="productForm" class="admin-form" novalidate>' +
            '<div class="form-row">' + fld('Product name', 'name', p.name, { req: true, max: 140, half: true }) + sel('Category', 'category_id', [['', 'No category']].concat(S.cats.map(function (c) { return [c.id, c.name]; })), p.category_id || '', { half: true }) + '</div>' +
            fld('Short description', 'short_description', p.short_description, { max: 200, hint: 'Shown on product cards.' }) +
            fld('Full description', 'description', p.description, { rows: 5, max: 5000 }) +
            '<div class="form-row three">' + fld('Price (Rs.)', 'price', p.price, { type: 'number', req: true, min: 0, step: '0.01', half: true }) + fld('Compare at price', 'compare_price', p.compare_price || '', { type: 'number', min: 0, step: '0.01', half: true, hint: 'Original price shown struck out.' }) + fld('Cost price', 'cost_price', p.cost_price || '', { type: 'number', min: 0, step: '0.01', half: true }) + '</div>' +
            '<div class="form-row three">' + fld('SKU', 'sku', p.sku || '', { max: 40, half: true }) + fld('Stock quantity', 'stock_quantity', p.stock_quantity, { type: 'number', min: 0, half: true, req: true }) + fld('Low stock alert at', 'low_stock_threshold', p.low_stock_threshold, { type: 'number', min: 0, half: true }) + '</div>' +
            fld('Tags (comma separated)', 'tags', (p.tags || []).join(', '), { max: 300 }) +
            '<div class="form-group"><label>Images</label><div class="thumb-grid" id="productImages">' + imagesHtml(p.images || []) + '</div>' +
            '<label class="file-drop" for="productImageInput">' + UI.icon('upload-cloud', 'icon-md') + '<span>Click to upload images. The first image is the cover.</span></label><input type="file" id="productImageInput" accept="image/*" multiple class="file-input-hidden"></div>' +
            '<div class="check-grid">' + chk('Visible in store', 'is_active', p.is_active) + chk('Featured on home page', 'is_featured', p.is_featured) + chk('Customer can personalise', 'is_customizable', p.is_customizable, 'Adds a personalisation form on the product page.') + '</div>' +
            '<div id="czBuilder" class="cz-builder"' + (p.is_customizable ? '' : ' hidden') + '><h4>Personalisation fields</h4><p class="text-muted">Leave empty to use the default fields: name, message and photo.</p><div id="czRows">' + (p.customization_options || []).map(czRowHtml).join('') + '</div>' + btn('Add field', 'cz-add', 'plus') + '</div>' +
            '<details class="admin-details"><summary>Search engine details and shipping weight</summary>' + fld('Meta title', 'meta_title', p.meta_title, { max: 70 }) + fld('Meta description', 'meta_description', p.meta_description, { max: 170 }) + fld('Weight (grams)', 'weight', p.weight || '', { type: 'number', min: 0, step: '1' }) + '</details>' +
            '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' ' + (isNew ? 'Create product' : 'Save product') + '</button></div></form>', true);
        body.__product = dup ? null : (id ? p : null);
        var form = $('productForm');
        form.querySelector('[name=is_customizable]').addEventListener('change', function (e) { $('czBuilder').hidden = !e.target.checked; });
        $('productImageInput').addEventListener('change', async function (e) {
            var files = Array.prototype.slice.call(e.target.files || []); if (!files.length) return;
            var grid = $('productImages'); UI.toast('Uploading ' + files.length + ' image(s)', 'info', 1500);
            for (var i = 0; i < files.length; i++) {
                if (files[i].size > 15 * 1024 * 1024) { UI.toast(files[i].name + ' is larger than 15 MB', 'warning'); continue; }
                var up = await uploadImage('products', 'catalogue', files[i]);
                if (up.error) { UI.toast('Upload failed: ' + up.error.message, 'error'); continue; }
                var urls = currentImages(); urls.push(up.data.url); grid.innerHTML = imagesHtml(urls);
            }
            e.target.value = ''; refreshIcons();
        });
        refreshIcons();
    }
    function currentImages() { return Array.prototype.map.call(document.querySelectorAll('#productImages .thumb-item'), function (n) { return n.getAttribute('data-url'); }); }

    async function saveProduct(form) {
        var orig = $('adminModalBody').__product, v = readForm(form);
        var name = v.name.trim();
        if (!name) { UI.toast('Product name is required', 'warning'); return; }
        var price = num(v.price); if (price < 0 || v.price === '') { UI.toast('Enter a valid price', 'warning'); return; }
        var images = currentImages();
        var row = {
            name: name, short_description: v.short_description.trim(), description: v.description.trim(),
            category_id: v.category_id || null, price: price, compare_price: num(v.compare_price), cost_price: num(v.cost_price),
            sku: v.sku.trim() || null, stock_quantity: Math.max(0, int(v.stock_quantity)), low_stock_threshold: Math.max(0, int(v.low_stock_threshold)),
            images: images, thumbnail: images[0] || '', is_active: !!v.is_active, is_featured: !!v.is_featured, is_customizable: !!v.is_customizable,
            customization_options: v.is_customizable ? readCz($('czRows')) : [],
            tags: v.tags.split(',').map(function (s) { return s.trim(); }).filter(Boolean), weight: num(v.weight), meta_title: v.meta_title.trim(), meta_description: v.meta_description.trim()
        };
        if (row.compare_price && row.compare_price <= row.price) row.compare_price = 0;
        var submit = form.querySelector('[type=submit]'); UI.setLoading(submit, true, 'Saving');
        var r;
        if (orig) { r = await API.products.update(orig.id, row); }
        else {
            row.slug = Utils.slug(name) + '-' + Math.random().toString(36).slice(2, 6);
            r = await API.products.create(row);
        }
        UI.setLoading(submit, false);
        if (r.error) { UI.toast(/duplicate|unique/i.test(r.error.message) ? 'That SKU or name is already used' : 'Could not save: ' + r.error.message, 'error'); return; }
        log(orig ? 'update' : 'create', 'product', r.data.id, { name: name });
        UI.toast(orig ? 'Product saved' : 'Product created', 'success');
        if (orig && orig.stock_quantity < 1 && row.stock_quantity > 0 && row.is_active) {
            var n = await sendMail({ type: 'back_in_stock', product_id: r.data.id });
            if (n && n.notified) UI.toast(n.notified + ' customer(s) notified that it is back in stock', 'info', 4000);
        }
        closeModal(); if (S.tab === 'products') loadProducts(S.token);
    }

    async function exportProducts() {
        var r = await API.products.list({ page: 1, limit: 1000, includeInactive: true });
        Utils.downloadCSV(r.data || [], [{ label: 'Name', key: 'name' }, { label: 'SKU', key: 'sku' }, { label: 'Category', value: function (p) { return p.categories ? p.categories.name : ''; } }, { label: 'Price', key: 'price' }, { label: 'Stock', key: 'stock_quantity' }, { label: 'Sold', key: 'sold_count' }, { label: 'Active', key: 'is_active' }], 'bestow-products-' + dayKey(new Date()) + '.csv');
    }

    /* ======================================================================
       CATEGORIES
       ====================================================================== */
    var CAT_ICONS = ['grid', 'award', 'key-round', 'frame', 'badge', 'layout-panel-top', 'palette', 'gift', 'heart', 'trophy', 'sparkles', 'gem', 'crown', 'cake', 'briefcase', 'camera'];
    async function loadCategories(t) {
        var el = content(); el.innerHTML = head('Categories', 'Group your products', btn('Add category', 'new-category', 'plus', 'btn-primary')) + busy();
        var r = await API.categories.all(false);
        if (stale(t)) return;
        if (r.error) return fail(el, r.error);
        S.cats = r.data || [];
        el.innerHTML = head('Categories', 'Group your products', btn('Add category', 'new-category', 'plus', 'btn-primary')) +
            (S.cats.length ? '<div class="table-wrap glass"><table class="admin-table"><thead><tr><th>Category</th><th>Order</th><th>Status</th><th></th></tr></thead><tbody>' + S.cats.map(function (c) {
                return '<tr><td data-label="Category"><div class="cell-product"><img src="' + esc(c.image_url || Utils.PLACEHOLDER) + '" alt="" loading="lazy"><div><strong>' + esc(c.name) + '</strong><small class="cell-sub">' + esc(Utils.truncate(c.description, 70)) + '</small></div></div></td><td data-label="Order">' + (c.display_order || 0) + '</td><td data-label="Status">' + (c.is_active ? badge('Visible', 'success') : badge('Hidden', 'neutral')) + '</td><td class="cell-actions">' + iconBtn('edit-category', 'pencil', 'Edit', c.id) + iconBtn('del-category', 'trash-2', 'Delete', c.id, 'danger') + '</td></tr>';
            }).join('') + '</tbody></table></div>' : UI.empty('layers', 'No categories yet', 'Create one to organise your shop.'));
        refreshIcons();
    }
    function openCategory(id) {
        var c = S.cats.filter(function (x) { return x.id === id; })[0] || { name: '', description: '', image_url: '', icon: 'grid', display_order: S.cats.length + 1, is_active: true };
        var body = modal(id ? 'Edit category' : 'Add category',
            '<form id="categoryForm" class="admin-form" novalidate>' + fld('Name', 'name', c.name, { req: true, max: 60 }) + fld('Description', 'description', c.description, { rows: 3, max: 300 }) +
            '<div class="form-row">' + sel('Icon', 'icon', CAT_ICONS, c.icon || 'grid', { half: true }) + fld('Display order', 'display_order', c.display_order || 0, { type: 'number', half: true }) + '</div>' +
            '<div class="form-group"><label>Image</label><div class="thumb-grid" id="catImage">' + (c.image_url ? imagesHtml([c.image_url]) : '') + '</div><label class="file-drop" for="catImageInput">' + UI.icon('upload-cloud', 'icon-md') + '<span>Upload category image</span></label><input type="file" id="catImageInput" accept="image/*" class="file-input-hidden"></div>' +
            chk('Visible in store', 'is_active', c.is_active) + '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save category</button></div></form>');
        body.__cat = id ? c : null;
        $('catImageInput').addEventListener('change', async function (e) {
            var f = e.target.files && e.target.files[0]; if (!f) return;
            var up = await uploadImage('products', 'categories', f);
            if (up.error) return UI.toast('Upload failed: ' + up.error.message, 'error');
            $('catImage').innerHTML = imagesHtml([up.data.url]); refreshIcons();
        });
    }
    async function saveCategory(form) {
        var orig = $('adminModalBody').__cat, v = readForm(form), name = v.name.trim();
        if (!name) return UI.toast('Name is required', 'warning');
        var img = document.querySelector('#catImage .thumb-item');
        var row = { name: name, description: v.description.trim(), icon: v.icon, display_order: int(v.display_order), is_active: !!v.is_active, image_url: img ? img.getAttribute('data-url') : '' };
        var submit = form.querySelector('[type=submit]'); UI.setLoading(submit, true, 'Saving');
        var r;
        if (orig) r = await API.categories.update(orig.id, row);
        else { row.slug = Utils.slug(name); r = await API.categories.create(row); }
        UI.setLoading(submit, false);
        if (r.error) return UI.toast(/duplicate|unique/i.test(r.error.message) ? 'A category with this name already exists' : 'Could not save: ' + r.error.message, 'error');
        log(orig ? 'update' : 'create', 'category', r.data.id, { name: name });
        UI.toast('Category saved', 'success'); closeModal(); if (S.tab === 'categories') loadCategories(S.token);
    }

    /* ======================================================================
       COUPONS
       ====================================================================== */
    var couponRows = [];
    async function loadCoupons(t) {
        var el = content(); el.innerHTML = head('Coupons', 'Discount codes for your customers', btn('New coupon', 'new-coupon', 'plus', 'btn-primary')) + busy();
        var r = await API.coupons.all(); if (stale(t)) return; if (r.error) return fail(el, r.error);
        couponRows = r.data || [];
        el.innerHTML = head('Coupons', 'Discount codes for your customers', btn('New coupon', 'new-coupon', 'plus', 'btn-primary')) +
            (couponRows.length ? '<div class="table-wrap glass"><table class="admin-table"><thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>' + couponRows.map(function (c) {
                var expired = c.expires_at && new Date(c.expires_at) < new Date();
                return '<tr><td data-label="Code"><strong class="mono">' + esc(c.code) + '</strong><small class="cell-sub">' + esc(c.description || '') + '</small></td><td data-label="Discount">' + (c.discount_type === 'percentage' ? c.discount_value + '%' + (c.max_discount_amount > 0 ? ' (max ' + Utils.price(c.max_discount_amount) + ')' : '') : Utils.price(c.discount_value)) + '</td><td data-label="Min order">' + Utils.price(c.min_order_amount) + '</td><td data-label="Used">' + (c.used_count || 0) + (c.usage_limit > 0 ? ' / ' + c.usage_limit : '') + '</td><td data-label="Expires">' + (c.expires_at ? Utils.date(c.expires_at) : 'Never') + '</td><td data-label="Status">' + (expired ? badge('Expired', 'danger') : c.is_active ? badge('Active', 'success') : badge('Paused', 'neutral')) + '</td><td class="cell-actions">' + iconBtn('edit-coupon', 'pencil', 'Edit', c.id) + iconBtn('del-coupon', 'trash-2', 'Delete', c.id, 'danger') + '</td></tr>';
            }).join('') + '</tbody></table></div>' : UI.empty('ticket', 'No coupons yet', 'Create a code to reward your customers.'));
        refreshIcons();
    }
    function openCoupon(id) {
        var c = couponRows.filter(function (x) { return x.id === id; })[0] || { code: '', description: '', discount_type: 'percentage', discount_value: 10, min_order_amount: 0, max_discount_amount: 0, usage_limit: 0, per_user_limit: 1, is_active: true, expires_at: null };
        var body = modal(id ? 'Edit coupon' : 'New coupon', '<form id="couponForm" class="admin-form" novalidate>' +
            '<div class="form-row">' + fld('Code', 'code', c.code, { req: true, max: 24, half: true, pattern: '[A-Za-z0-9_-]+', hint: 'Letters, numbers, dash or underscore.' }) + sel('Type', 'discount_type', [['percentage', 'Percentage off'], ['fixed', 'Fixed amount off']], c.discount_type, { half: true }) + '</div>' +
            fld('Description', 'description', c.description, { max: 140 }) +
            '<div class="form-row three">' + fld('Value', 'discount_value', c.discount_value, { type: 'number', min: 0, step: '0.01', req: true, half: true }) + fld('Minimum order (Rs.)', 'min_order_amount', c.min_order_amount || 0, { type: 'number', min: 0, half: true }) + fld('Max discount (Rs.)', 'max_discount_amount', c.max_discount_amount || 0, { type: 'number', min: 0, half: true, hint: '0 = no cap. Percentage only.' }) + '</div>' +
            '<div class="form-row three">' + fld('Total uses', 'usage_limit', c.usage_limit || 0, { type: 'number', min: 0, half: true, hint: '0 = unlimited' }) + fld('Uses per customer', 'per_user_limit', c.per_user_limit == null ? 1 : c.per_user_limit, { type: 'number', min: 0, half: true }) + fld('Expires', 'expires_at', localInput(c.expires_at), { type: 'datetime-local', half: true }) + '</div>' +
            chk('Coupon is active', 'is_active', c.is_active) + '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save coupon</button></div></form>');
        body.__coupon = id ? c : null;
    }
    async function saveCoupon(form) {
        var orig = $('adminModalBody').__coupon, v = readForm(form), code = v.code.trim().toUpperCase();
        if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return UI.toast('Code must be 3 to 24 letters or numbers', 'warning');
        var val = num(v.discount_value); if (val <= 0) return UI.toast('Enter a discount value', 'warning');
        if (v.discount_type === 'percentage' && val > 100) return UI.toast('A percentage cannot exceed 100', 'warning');
        var row = { code: code, description: v.description.trim(), discount_type: v.discount_type, discount_value: val, min_order_amount: num(v.min_order_amount), max_discount_amount: v.discount_type === 'percentage' ? num(v.max_discount_amount) : 0, usage_limit: int(v.usage_limit), per_user_limit: int(v.per_user_limit), is_active: !!v.is_active, expires_at: v.expires_at ? new Date(v.expires_at).toISOString() : null };
        var submit = form.querySelector('[type=submit]'); UI.setLoading(submit, true, 'Saving');
        var r = orig ? await API.coupons.update(orig.id, row) : await API.coupons.create(row);
        UI.setLoading(submit, false);
        if (r.error) return UI.toast(/duplicate|unique/i.test(r.error.message) ? 'That code already exists' : 'Could not save: ' + r.error.message, 'error');
        log(orig ? 'update' : 'create', 'coupon', r.data.id, { code: code });
        UI.toast('Coupon saved', 'success'); closeModal(); loadCoupons(S.token);
    }

    /* ======================================================================
       CUSTOMERS
       ====================================================================== */
    var CUSTOMER_LIMIT = 20, customerRows = [];
    async function loadCustomers(t) {
        var el = content();
        if (!$('customerSearch')) {
            el.innerHTML = head('Customers', 'People who have created an account', btn('Export CSV', 'export-customers', 'download')) +
                toolbar('<div class="search-field">' + UI.icon('search', 'icon-sm') + '<input id="customerSearch" type="search" placeholder="Name, email or phone" value="' + esc(S.customerSearch) + '" aria-label="Search customers"></div>') + '<div id="customerTable">' + busy() + '</div>';
            refreshIcons();
        }
        var box = $('customerTable');
        var r = await API.profile.customers({ page: S.customerPage, limit: CUSTOMER_LIMIT, search: S.customerSearch });
        if (stale(t)) return; if (r.error) return fail(box, r.error);
        customerRows = r.data || [];
        if (!customerRows.length) { box.innerHTML = UI.empty('users', 'No customers found', ''); refreshIcons(); return; }
        box.innerHTML = '<div class="table-wrap glass"><table class="admin-table"><thead><tr><th>Customer</th><th>Phone</th><th>Points</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>' + customerRows.map(function (c) {
            return '<tr><td data-label="Customer"><strong>' + esc(c.full_name || 'Unnamed') + '</strong><small class="cell-sub">' + esc(c.email) + '</small></td><td data-label="Phone">' + esc(c.phone || '-') + '</td><td data-label="Points">' + (c.loyalty_points || 0) + '</td><td data-label="Joined">' + Utils.date(c.created_at) + '</td><td data-label="Status">' + (c.is_active === false ? badge('Blocked', 'danger') : badge('Active', 'success')) + '</td><td class="cell-actions">' + iconBtn('edit-customer', 'pencil', 'Manage', c.id) + '</td></tr>';
        }).join('') + '</tbody></table></div>' + pager(S.customerPage, r.count || 0, CUSTOMER_LIMIT, 'customer-page');
        refreshIcons();
    }
    function openCustomer(id) {
        var c = customerRows.filter(function (x) { return x.id === id; })[0]; if (!c) return;
        var body = modal('Manage customer', '<form id="customerForm" class="admin-form" novalidate><div class="cust-head"><strong>' + esc(c.full_name || 'Unnamed') + '</strong><span>' + esc(c.email) + '</span><span>' + esc(c.phone || '') + '</span></div>' +
            fld('Loyalty points', 'loyalty_points', c.loyalty_points || 0, { type: 'number', min: 0, hint: 'Each point is worth Rs. 1 at checkout.' }) +
            chk('Account active', 'is_active', c.is_active !== false, 'Turn off to block this account from placing orders.') +
            '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save</button></div></form>');
        body.__customer = c;
    }
    async function saveCustomer(form) {
        var c = $('adminModalBody').__customer, v = readForm(form);
        var r = await API.profile.update(c.id, { loyalty_points: Math.max(0, int(v.loyalty_points)), is_active: !!v.is_active });
        if (r.error) return UI.toast('Could not save: ' + r.error.message, 'error');
        log('update', 'customer', c.id, { points: v.loyalty_points, active: v.is_active });
        UI.toast('Customer updated', 'success'); closeModal(); loadCustomers(S.token);
    }

    /* ======================================================================
       REVIEWS
       ====================================================================== */
    var reviewRows = [], reviewFilter = 'pending';
    async function loadReviews(t) {
        var el = content();
        var r = await API.reviews.all(reviewFilter); if (stale(t)) return; if (r.error) return fail(el, r.error);
        reviewRows = r.data || [];
        el.innerHTML = head('Reviews', 'Approve, reply to and moderate customer reviews') +
            '<div class="seg" role="group" aria-label="Filter reviews">' + ['pending', 'approved', 'all'].map(function (f) { return '<button type="button" class="seg-btn' + (reviewFilter === f ? ' active' : '') + '" data-review-filter="' + f + '">' + label(f) + '</button>'; }).join('') + '</div>' +
            (reviewRows.length ? '<div class="review-admin-list">' + reviewRows.map(function (rv) {
                return '<article class="admin-card glass review-admin"><header><div><strong>' + esc(rv.customer_name) + '</strong> ' + (rv.is_verified ? badge('Verified buyer', 'success') : '') + '<small class="cell-sub">' + esc(rv.products ? rv.products.name : 'Product') + ' &middot; ' + Utils.date(rv.created_at) + '</small></div>' + Utils.stars(rv.rating) + '</header>' +
                    (rv.title ? '<h4>' + esc(rv.title) + '</h4>' : '') + '<p>' + Utils.multiline(rv.comment) + '</p>' +
                    ((rv.images || []).length ? '<div class="review-thumbs">' + rv.images.map(function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy">'; }).join('') + '</div>' : '') +
                    (rv.admin_reply ? '<div class="note-box"><h5>Your reply</h5><p>' + Utils.multiline(rv.admin_reply) + '</p></div>' : '') +
                    '<footer>' + (rv.is_approved ? btn('Unpublish', 'review-unapprove', 'eye-off', 'btn-outline', ' data-id="' + esc(rv.id) + '"') : btn('Approve and publish', 'review-approve', 'check', 'btn-primary', ' data-id="' + esc(rv.id) + '"')) + btn(rv.admin_reply ? 'Edit reply' : 'Reply', 'review-reply', 'message-square', 'btn-outline', ' data-id="' + esc(rv.id) + '"') + btn('Delete', 'review-delete', 'trash-2', 'btn-ghost danger', ' data-id="' + esc(rv.id) + '"') + '</footer></article>';
            }).join('') + '</div>' : UI.empty('star', 'No reviews here', reviewFilter === 'pending' ? 'You are all caught up.' : ''));
        refreshIcons();
    }

    /* ======================================================================
       INQUIRIES
       ====================================================================== */
    var inquiryRows = [], inquiryFilter = 'all';
    async function loadInquiries(t) {
        var el = content();
        var r = await API.inquiries.all(inquiryFilter); if (stale(t)) return; if (r.error) return fail(el, r.error);
        inquiryRows = r.data || [];
        el.innerHTML = head('Inquiries', 'Messages from the contact form', btn('Export CSV', 'export-inquiries', 'download')) +
            '<div class="seg" role="group" aria-label="Filter inquiries">' + ['all', 'new', 'read', 'replied', 'closed'].map(function (f) { return '<button type="button" class="seg-btn' + (inquiryFilter === f ? ' active' : '') + '" data-inquiry-filter="' + f + '">' + label(f) + '</button>'; }).join('') + '</div>' +
            (inquiryRows.length ? '<div class="table-wrap glass"><table class="admin-table"><thead><tr><th>From</th><th>Subject</th><th>Type</th><th>Received</th><th>Status</th><th></th></tr></thead><tbody>' + inquiryRows.map(function (q) {
                return '<tr><td data-label="From"><strong>' + esc(q.name) + '</strong><small class="cell-sub">' + esc(q.email) + '</small></td><td data-label="Subject">' + esc(Utils.truncate(q.subject || q.message, 60)) + '</td><td data-label="Type">' + badge(label(q.inquiry_type), 'info') + '</td><td data-label="Received">' + Utils.timeAgo(q.created_at) + '</td><td data-label="Status">' + badge(label(q.status), q.status === 'new' ? 'brand' : q.status === 'replied' ? 'success' : 'neutral') + '</td><td class="cell-actions">' + iconBtn('open-inquiry', 'eye', 'Open', q.id) + iconBtn('del-inquiry', 'trash-2', 'Delete', q.id, 'danger') + '</td></tr>';
            }).join('') + '</tbody></table></div>' : UI.empty('inbox', 'No inquiries', ''));
        refreshIcons();
    }
    async function openInquiry(id) {
        var q = inquiryRows.filter(function (x) { return x.id === id; })[0]; if (!q) return;
        if (q.status === 'new') { await API.inquiries.update(id, { status: 'read' }); q.status = 'read'; }
        var body = modal('Inquiry from ' + q.name,
            '<div class="inquiry-view"><p class="text-muted">' + esc(q.email) + (q.phone ? ' &middot; ' + esc(q.phone) : '') + ' &middot; ' + fmtDate(q.created_at) + '</p><h4>' + esc(q.subject || 'No subject') + '</h4><div class="note-box"><p>' + Utils.multiline(q.message) + '</p></div></div>' +
            '<form id="inquiryForm" class="admin-form" novalidate>' + fld('Reply to ' + q.email, 'reply', '', { rows: 5, max: 4000, ph: 'Write your reply. It is sent as a branded email.' }) + fld('Internal notes', 'admin_notes', q.admin_notes || '', { rows: 2, max: 1000 }) +
            sel('Status', 'status', ['new', 'read', 'replied', 'closed'], q.status) +
            '<div class="modal-actions"><button type="button" class="btn btn-outline" data-act="inquiry-save">Save notes</button><button type="submit" class="btn btn-primary">' + UI.icon('send', 'icon-sm') + ' Send reply</button></div></form>');
        body.__inquiry = q; refreshIcons();
    }

    /* ======================================================================
       NEWSLETTER
       ====================================================================== */
    var subscriberRows = [];
    async function loadNewsletter(t) {
        var el = content();
        var r = await API.newsletter.all(); if (stale(t)) return; if (r.error) return fail(el, r.error);
        subscriberRows = r.data || [];
        var active = subscriberRows.filter(function (s) { return s.is_active; });
        el.innerHTML = head('Newsletter', active.length + ' active subscribers', btn('Export CSV', 'export-subs', 'download')) +
            '<div class="admin-grid-2"><section class="admin-card glass"><h3>Send a campaign</h3><form id="campaignForm" class="admin-form" novalidate>' +
            fld('Email subject', 'subject', '', { req: true, max: 150 }) + fld('Headline', 'headline', '', { max: 150 }) + fld('Message', 'body', '', { rows: 6, req: true, max: 5000 }) +
            '<div class="form-row">' + fld('Button label', 'cta_label', '', { max: 40, half: true, ph: 'Shop now' }) + fld('Button link', 'cta_url', '', { type: 'url', max: 400, half: true, ph: 'https://' }) + '</div>' +
            '<button type="submit" class="btn btn-primary"' + (active.length ? '' : ' disabled') + '>' + UI.icon('send', 'icon-sm') + ' Send to ' + active.length + ' subscribers</button></form></section>' +
            '<section class="admin-card glass"><h3>Subscribers</h3>' + (subscriberRows.length ? '<ul class="mini-list scroll-list">' + subscriberRows.slice(0, 300).map(function (s) {
                return '<li><div class="mini-row static"><span><strong>' + esc(s.email) + '</strong><small>' + Utils.date(s.subscribed_at) + '</small></span>' + (s.is_active ? badge('Active', 'success') : badge('Unsubscribed', 'neutral')) + '<button type="button" class="icon-btn icon-btn-sm danger" data-act="del-sub" data-id="' + esc(s.id) + '" aria-label="Remove subscriber">' + UI.icon('trash-2') + '</button></div></li>';
            }).join('') + '</ul>' : '<p class="text-muted">No subscribers yet.</p>') + '</section></div>';
        refreshIcons();
    }

    /* ======================================================================
       SITE TEXT MANAGER
       ====================================================================== */
    var textState = { q: '', group: '' };
    function loadContent() {
        var el = content();
        var all = Bestow.listKeys();
        var groups = {}; all.forEach(function (k) { groups[k.group] = (groups[k.group] || 0) + 1; });
        var gnames = Object.keys(groups).sort();
        el.innerHTML = head('Site Text', 'Every word on the website can be changed here or directly on the page', btn(Bestow.editing ? 'Live editing is on' : 'Edit on the page', 'live-edit', 'pencil', 'btn-primary')) +
            toolbar('<div class="search-field">' + UI.icon('search', 'icon-sm') + '<input id="textSearch" type="search" placeholder="Search text or key" value="' + esc(textState.q) + '" aria-label="Search site text"></div><select id="textGroup" aria-label="Section"><option value="">All sections (' + all.length + ')</option>' + gnames.map(function (g) { return '<option value="' + esc(g) + '"' + (textState.group === g ? ' selected' : '') + '>' + esc(label(g)) + ' (' + groups[g] + ')</option>'; }).join('') + '</select>', btn('Reset all edits', 'texts-reset-all', 'rotate-ccw', 'btn-ghost danger')) +
            '<div id="textList"></div>';
        renderTextList(); refreshIcons();
    }
    function renderTextList() {
        var box = $('textList'); if (!box) return;
        var q = textState.q.toLowerCase(), g = textState.group;
        var rows = Bestow.listKeys().filter(function (k) { return (!g || k.group === g) && (!q || k.key.toLowerCase().indexOf(q) > -1 || String(k.value).toLowerCase().indexOf(q) > -1); });
        var shown = rows.slice(0, 120);
        box.innerHTML = shown.length ? '<div class="text-list">' + shown.map(function (k) {
            return '<div class="text-row glass-soft' + (k.edited ? ' edited' : '') + '"><div class="text-row-main"><code>' + esc(k.key) + '</code>' + (k.attr ? badge('Placeholder or label', 'neutral') : '') + (k.edited ? badge('Edited', 'brand') : '') + '<p>' + esc(Utils.truncate(Bestow.fill(k.value), 200)) + '</p></div><div class="text-row-actions">' + iconBtn('text-edit', 'pencil', 'Edit text', k.key) + (k.edited ? iconBtn('text-reset', 'rotate-ccw', 'Restore original', k.key) : '') + '</div></div>';
        }).join('') + '</div>' + (rows.length > shown.length ? '<p class="text-muted center">Showing ' + shown.length + ' of ' + rows.length + '. Narrow your search to see more.</p>' : '') : UI.empty('type', 'No text found', 'Try a different search.');
        refreshIcons();
    }

    /* ======================================================================
       BRANDING
       ====================================================================== */
    function logoCard(key, title, desc, bg) {
        var url = Bestow.branding[key] || '';
        return '<div class="logo-card glass-soft"><div class="logo-preview ' + bg + '"><img src="' + esc(url) + '" alt="' + esc(title) + '" data-logo-preview="' + key + '"' + (url ? '' : ' hidden') + '></div><h4>' + esc(title) + '</h4><p class="text-muted">' + esc(desc) + '</p>' +
            '<div class="logo-card-actions"><label class="btn btn-outline btn-sm" for="logoFile_' + key + '">' + UI.icon('upload', 'icon-xs') + ' Upload</label><input type="file" id="logoFile_' + key + '" data-logo-file="' + key + '" accept="image/png,image/svg+xml,image/webp,image/jpeg" class="file-input-hidden"></div>' +
            '<input type="url" name="' + key + '" value="' + esc(url) + '" placeholder="Or paste an image link" aria-label="' + esc(title) + ' link"></div>';
    }
    function loadBranding() {
        var b = Bestow.branding;
        content().innerHTML = head('Logo and Brand', 'Change the logo, name and tagline everywhere: website, emails and invoices') +
            '<form id="brandingForm" class="admin-form" novalidate><div class="admin-grid-2">' + fld('Brand name', 'brand_name', b.brand_name, { req: true, max: 40 }) + fld('Tagline', 'tagline', b.tagline, { max: 80 }) + '</div>' +
            '<div class="logo-grid">' + logoCard('logo_colour', 'Colour logo', 'Used on light backgrounds, emails and invoices.', 'bg-light') + logoCard('logo_white', 'White logo', 'Used on dark and red backgrounds.', 'bg-dark') + logoCard('logo_black', 'Black logo', 'Used for print and monochrome areas.', 'bg-light') + logoCard('favicon', 'Browser icon', 'Square image shown in the browser tab.', 'bg-light') + '</div>' +
            '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="branding-reset">Restore original logos</button><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save branding</button></div></form>';
        refreshIcons();
    }

    /* ======================================================================
       SETTINGS / CONTACT / SEO
       ====================================================================== */
    function loadSettings() {
        var s = Bestow.settings;
        content().innerHTML = head('Store Settings', 'Shipping, tax, loyalty and business details') +
            '<form id="settingsForm" class="admin-form" novalidate><section class="admin-card glass"><h3>Shipping and tax</h3><div class="form-row three">' +
            fld('Free shipping above (Rs.)', 'free_shipping_threshold', s.free_shipping_threshold, { type: 'number', min: 0, half: true }) + fld('Shipping fee (Rs.)', 'shipping_fee', s.shipping_fee, { type: 'number', min: 0, half: true }) + fld('GST percent', 'gst_percent', s.gst_percent, { type: 'number', min: 0, max: 100, step: '0.01', half: true }) + '</div>' +
            '<div class="form-row three">' + fld('Gift wrap fee (Rs.)', 'gift_wrap_fee', s.gift_wrap_fee, { type: 'number', min: 0, half: true }) + fld('Delivery from (days)', 'estimated_days_min', s.estimated_days_min, { type: 'number', min: 1, half: true }) + fld('Delivery to (days)', 'estimated_days_max', s.estimated_days_max, { type: 'number', min: 1, half: true }) + '</div></section>' +
            '<section class="admin-card glass"><h3>Loyalty points</h3><div class="form-row">' + fld('Points earned per Rs. 100', 'loyalty_rate', s.loyalty_rate, { type: 'number', min: 0, step: '0.1', half: true }) + fld('Max percent of order payable with points', 'loyalty_redeem_max_percent', s.loyalty_redeem_max_percent, { type: 'number', min: 0, max: 100, half: true }) + '</div></section>' +
            '<section class="admin-card glass"><h3>Announcement bar</h3>' + chk('Show announcement bar', 'announcement_enabled', s.announcement_enabled) + fld('Announcement text', 'announcement', s.announcement, { max: 200 }) + '</section>' +
            '<section class="admin-card glass"><h3>Business details (printed on invoices)</h3><div class="form-row">' + fld('Legal business name', 'legal_name', s.legal_name, { max: 120, half: true }) + fld('GSTIN', 'gstin', s.gstin, { max: 20, half: true, pattern: '[0-9A-Za-z]*' }) + '</div>' + fld('Registered address', 'business_address', s.business_address, { rows: 2, max: 300 }) +
            '<div class="form-row">' + fld('WhatsApp number (with country code)', 'whatsapp', s.whatsapp, { max: 20, half: true, pattern: '[0-9]*', hint: 'Digits only, for example 916382052530.' }) + fld('Website address', 'site_url', s.site_url, { type: 'url', max: 200, half: true, ph: 'https://yourdomain.com', hint: 'Used for links inside emails.' }) + '</div></section>' +
            '<div class="modal-actions"><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save settings</button></div></form>';
        refreshIcons();
    }
    function loadContact() {
        var c = Bestow.contact, so = Bestow.social;
        content().innerHTML = head('Contact and Social', 'Shown in the header, footer, contact page and emails') +
            '<form id="contactSettingsForm" class="admin-form" novalidate><section class="admin-card glass"><h3>Contact details</h3><div class="form-row">' + fld('Phone', 'phone', c.phone, { max: 30, half: true }) + fld('Email', 'email', c.email, { type: 'email', max: 120, half: true }) + '</div>' + fld('Address', 'address', c.address, { max: 250 }) + fld('Business hours', 'business_hours', c.business_hours, { max: 120 }) + '</section>' +
            '<section class="admin-card glass"><h3>Social profiles</h3>' + ['facebook', 'instagram', 'twitter', 'youtube'].map(function (k) { return fld(label(k) + ' link', 'social_' + k, so[k], { type: 'url', max: 250, ph: 'https://' }); }).join('') + '</section>' +
            '<div class="modal-actions"><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save</button></div></form>';
    }
    function loadSeo() {
        var s = Bestow.seo;
        content().innerHTML = head('SEO', 'How the site appears in Google and when shared') +
            '<form id="seoForm" class="admin-form" novalidate><section class="admin-card glass">' + fld('Page title', 'title', s.title, { max: 70, hint: 'Keep it under 60 characters.' }) + fld('Description', 'description', s.description, { rows: 3, max: 170, hint: 'Keep it under 160 characters.' }) + fld('Keywords', 'keywords', s.keywords, { max: 300 }) + '</section>' +
            '<div class="modal-actions"><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save SEO</button></div></form>';
    }

    /* ======================================================================
       FAQ and POLICIES
       ====================================================================== */
    function faqRow(f) { f = f || { q: '', a: '' }; return '<div class="faq-edit glass-soft" data-faq-row><div class="form-group"><label>Question</label><input type="text" data-faq="q" value="' + esc(f.q) + '" maxlength="200"></div><div class="form-group"><label>Answer</label><textarea data-faq="a" rows="3" maxlength="1500">' + esc(f.a) + '</textarea></div><div class="cz-row-foot"><span></span><button type="button" class="btn btn-ghost btn-sm danger" data-act="faq-remove">' + UI.icon('trash-2', 'icon-xs') + ' Remove</button></div></div>'; }
    function loadFaq() {
        content().innerHTML = head('FAQ', 'Questions shown on the FAQ page and home page', btn('Add question', 'faq-add', 'plus')) + '<form id="faqForm" class="admin-form" novalidate><div id="faqRows">' + Bestow.faq.map(faqRow).join('') + '</div><div class="modal-actions">' + btn('Restore defaults', 'faq-reset', 'rotate-ccw', 'btn-ghost') + '<button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save FAQ</button></div></form>';
        refreshIcons();
    }
    function loadPolicies() {
        var p = Bestow.policies;
        content().innerHTML = head('Policies', 'Shipping, returns, privacy and terms. Separate paragraphs with a blank line.') + '<form id="policiesForm" class="admin-form" novalidate>' + ['shipping', 'returns', 'privacy', 'terms'].map(function (k) {
            var x = p[k] || { title: label(k), body: '' };
            return '<section class="admin-card glass"><h3>' + esc(label(k)) + '</h3>' + fld('Title', k + '_title', x.title, { max: 80 }) + fld('Content', k + '_body', x.body, { rows: 8, max: 10000 }) + '</section>';
        }).join('') + '<div class="modal-actions"><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save policies</button></div></form>';
    }

    /* ======================================================================
       EMAIL CENTRE / ACTIVITY
       ====================================================================== */
    async function loadEmails(t) {
        var el = content();
        var r = await API.emailLog.all(150); if (stale(t)) return; if (r.error) return fail(el, r.error);
        var alerts = await API.stockAlerts.all();
        var rows = r.data || [];
        el.innerHTML = head('Email Centre', 'Every email the store sends is recorded here') +
            '<section class="admin-card glass setup-note"><h3>Connect your email service</h3><ol class="setup-steps"><li>Open your Google Apps Script project and run <strong>setup()</strong> once. Copy the WEBHOOK_SECRET it prints.</li><li>Deploy it as a Web app (Execute as: Me, Access: Anyone) and copy the /exec address.</li><li>In Supabase, set the secrets <strong>GAS_WEBAPP_URL</strong> and <strong>GAS_SECRET</strong>, then send a test email below.</li></ol></section>' +
            '<div class="admin-grid-2"><section class="admin-card glass"><h3>Send a test email</h3><p class="text-muted">Checks that your Google Apps Script web app is connected and the template design is correct.</p><form id="testEmailForm" class="admin-form" novalidate>' + fld('Send to', 'to', (AppState.user && AppState.user.email) || Bestow.contact.email, { type: 'email', req: true }) + '<button type="submit" class="btn btn-primary">' + UI.icon('send', 'icon-sm') + ' Send test</button></form></section>' +
            '<section class="admin-card glass"><h3>Back in stock requests</h3>' + ((alerts.data || []).length ? '<ul class="mini-list scroll-list">' + alerts.data.slice(0, 40).map(function (a) { return '<li><div class="mini-row static"><span><strong>' + esc(a.email) + '</strong><small>' + esc(a.products ? a.products.name : '') + '</small></span>' + (a.notified ? badge('Notified', 'success') : badge('Waiting', 'warning')) + '</div></li>'; }).join('') + '</ul>' : '<p class="text-muted">No requests yet.</p>') + '</section></div>' +
            '<section class="admin-card glass"><h3>Recent emails</h3>' + (rows.length ? '<div class="table-wrap"><table class="admin-table"><thead><tr><th>When</th><th>To</th><th>Type</th><th>Result</th></tr></thead><tbody>' + rows.map(function (m) {
                var ok = m.status === 'sent' || /^sent/.test(m.detail || '');
                return '<tr><td data-label="When">' + Utils.dateTime(m.created_at) + '</td><td data-label="To">' + esc(m.recipient) + '</td><td data-label="Type">' + esc(label(m.email_type)) + '</td><td data-label="Result">' + (m.status === 'failed' ? badge('Failed', 'danger') : ok ? badge('Sent', 'success') : badge(label(m.status), 'neutral')) + (m.status === 'failed' && m.detail ? '<small class="cell-sub">' + esc(Utils.truncate(m.detail, 90)) + '</small>' : '') + '</td></tr>';
            }).join('') + '</tbody></table></div>' : '<p class="text-muted">Nothing sent yet.</p>') + '</section>';
        refreshIcons();
    }
    var returnRows = [], returnFilter = 'all';
    async function loadReturns(t) {
        var el = content();
        var r = await API.returns.all(returnFilter); if (stale(t)) return; if (r.error) return fail(el, r.error);
        returnRows = r.data || [];
        var tone = { requested: 'warning', approved: 'info', rejected: 'danger', completed: 'success' };
        el.innerHTML = head('Returns and Exchanges', 'Requests from customers on delivered orders') +
            '<div class="seg" role="group" aria-label="Filter requests">' + ['all', 'requested', 'approved', 'rejected', 'completed'].map(function (f) { return '<button type="button" class="seg-btn' + (returnFilter === f ? ' active' : '') + '" data-return-filter="' + f + '">' + label(f) + '</button>'; }).join('') + '</div>' +
            (returnRows.length ? '<div class="table-wrap glass"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Reason</th><th>Requested</th><th>Status</th><th></th></tr></thead><tbody>' + returnRows.map(function (q) {
                var o = q.orders || {};
                return '<tr><td data-label="Order"><strong>' + esc(o.order_number || '-') + '</strong></td><td data-label="Customer">' + esc(o.customer_name || '-') + '<small class="cell-sub">' + esc(o.customer_email || '') + '</small></td><td data-label="Type">' + badge(label(q.request_type), 'info') + '</td><td data-label="Reason">' + esc(Utils.truncate(q.reason, 50)) + '</td><td data-label="Requested">' + Utils.timeAgo(q.created_at) + '</td><td data-label="Status">' + badge(label(q.status), tone[q.status] || 'neutral') + '</td><td class="cell-actions">' + iconBtn('open-return', 'eye', 'Open', q.id) + '</td></tr>';
            }).join('') + '</tbody></table></div>' : UI.empty('rotate-ccw', 'No requests', 'Return and exchange requests will appear here.'));
        refreshIcons();
    }
    function openReturn(id) {
        var q = returnRows.filter(function (x) { return x.id === id; })[0]; if (!q) return;
        var o = q.orders || {};
        var body = modal(label(q.request_type) + ' request ' + (o.order_number || ''),
            '<p class="text-muted">' + esc(o.customer_name || '') + ' &middot; ' + esc(o.customer_email || '') + ' &middot; ' + fmtDate(q.created_at) + '</p><h4>' + esc(q.reason) + '</h4>' + (q.details ? '<div class="note-box"><p>' + Utils.multiline(q.details) + '</p></div>' : '') +
            '<form id="returnAdminForm" class="admin-form" novalidate>' + sel('Status', 'status', ['requested', 'approved', 'rejected', 'completed'], q.status) + fld('Message shown to the customer', 'admin_note', q.admin_note || '', { rows: 3, max: 600 }) +
            '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-close-modal>Cancel</button><button type="submit" class="btn btn-primary">' + UI.icon('save', 'icon-sm') + ' Save</button></div></form>');
        body.__return = q; refreshIcons();
    }

    async function loadActivity(t) {
        var el = content();
        var r = await API.activity.all(150); if (stale(t)) return; if (r.error) return fail(el, r.error);
        var rows = r.data || [];
        el.innerHTML = head('Activity Log', 'Who changed what in the admin panel') + (rows.length ? '<div class="table-wrap glass"><table class="admin-table"><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Area</th><th>Details</th></tr></thead><tbody>' + rows.map(function (a) {
            return '<tr><td data-label="When">' + Utils.dateTime(a.created_at) + '</td><td data-label="Admin">' + esc(a.profiles ? (a.profiles.full_name || a.profiles.email) : '-') + '</td><td data-label="Action">' + badge(label(a.action), 'brand') + '</td><td data-label="Area">' + esc(label(a.entity_type)) + '</td><td data-label="Details"><small>' + esc(Utils.truncate(JSON.stringify(a.details || {}), 110)) + '</small></td></tr>';
        }).join('') + '</tbody></table></div>' : UI.empty('history', 'No activity recorded yet', ''));
        refreshIcons();
    }

    /* ======================================================================
       GLOBAL SEARCH
       ====================================================================== */
    async function globalSearch(q) {
        q = String(q || '').trim(); if (q.length < 2) return;
        var res = await Promise.all([API.orders.all({ search: q, limit: 6 }), API.products.list({ search: q, limit: 6, includeInactive: true }), API.profile.customers({ search: q, limit: 6 })]);
        var o = res[0].data || [], p = res[1].data || [], c = res[2].data || [];
        var sec = function (title, items) { return items.length ? '<h4 class="search-group">' + title + '</h4><ul class="mini-list">' + items.join('') + '</ul>' : ''; };
        var html = sec('Orders', o.map(function (x) { return '<li><button type="button" class="mini-row" data-act="open-order" data-id="' + esc(x.id) + '"><span><strong>' + esc(x.order_number) + '</strong><small>' + esc(x.customer_name) + '</small></span><span>' + Utils.price(x.total_amount) + '</span></button></li>'; })) +
            sec('Products', p.map(function (x) { return '<li><button type="button" class="mini-row" data-act="edit-product" data-id="' + esc(x.id) + '"><span><strong>' + esc(x.name) + '</strong><small>' + esc(x.sku || '') + '</small></span><span>' + Utils.price(x.price) + '</span></button></li>'; })) +
            sec('Customers', c.map(function (x) { customerRows.push(x); return '<li><button type="button" class="mini-row" data-act="edit-customer" data-id="' + esc(x.id) + '"><span><strong>' + esc(x.full_name || 'Unnamed') + '</strong><small>' + esc(x.email) + '</small></span></button></li>'; }));
        modal('Results for "' + q + '"', html || UI.empty('search', 'Nothing found', 'Try another word.'));
    }

    /* ======================================================================
       ACTIONS (delegated)
       ====================================================================== */
    async function onAction(act, el, e) {
        var id = el.getAttribute('data-id');
        switch (act) {
            case 'refresh': return Admin.refresh();
            case 'open-order': if ($('adminModal').classList.contains('active')) closeModal(); return openOrder(id);
            case 'export-orders': return exportOrders();
            case 'invoice-dl': { var o = $('adminModalBody').__order; UI.setLoading(el, true, 'Preparing'); var u = await invoiceUrl(o, 'url'); UI.setLoading(el, false); if (u) window.open(u, '_blank', 'noopener'); return; }
            case 'invoice-regen': { var o2 = $('adminModalBody').__order; UI.setLoading(el, true, 'Generating'); var u2 = await invoiceUrl(o2, 'regenerate'); UI.setLoading(el, false); if (u2) { UI.toast('Invoice regenerated', 'success'); log('regenerate', 'invoice', o2.id, {}); } return; }
            case 'invoice-send': { var o3 = $('adminModalBody').__order; UI.setLoading(el, true, 'Sending'); await sendMail({ type: 'invoice_resend', order_id: o3.id }, 'Invoice emailed to ' + o3.customer_email); UI.setLoading(el, false); return; }
            case 'refund': {
                var o4 = $('adminModalBody').__order;
                var ok = await UI.confirm({ title: 'Mark as refunded', message: 'Record this order as refunded and email the customer? Issue the actual refund in your Razorpay dashboard.', confirmText: 'Mark refunded' });
                if (!ok) return;
                var rr = await API.orders.update(o4.id, { payment_status: 'refunded' });
                if (rr.error) return UI.toast('Could not update: ' + rr.error.message, 'error');
                log('refund', 'order', o4.id, {}); await sendMail({ type: 'order_refund', order_id: o4.id }, 'Refund email sent');
                modal('Order ' + rr.data.order_number, orderModalHtml(rr.data), true); $('adminModalBody').__order = rr.data; if (S.tab === 'orders') loadOrders(S.token); return;
            }
            case 'packing-slip': return packingSlip($('adminModalBody').__order);
            case 'wa-customer': { var o5 = $('adminModalBody').__order, ph = String(o5.customer_phone).replace(/\D/g, ''); if (ph.length === 10) ph = '91' + ph; window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent('Hello ' + o5.customer_name + ', this is ' + Bestow.branding.brand_name + ' regarding your order ' + o5.order_number + '.'), '_blank', 'noopener'); return; }
            case 'view-photo': { var pu = await API.storage.signed('customizations', el.getAttribute('data-path'), 300); if (pu.data) window.open(pu.data, '_blank', 'noopener'); else UI.toast('Photo not available', 'error'); return; }

            case 'new-product': return openProduct(null);
            case 'edit-product': if ($('adminModal').classList.contains('active')) closeModal(); return openProduct(id);
            case 'dup-product': return openProduct(id, true);
            case 'toggle-product': { var p = productRows.filter(function (x) { return x.id === id; })[0]; if (!p) return; var rt = await API.products.update(id, { is_active: !p.is_active }); if (rt.error) return UI.toast(rt.error.message, 'error'); log('update', 'product', id, { active: !p.is_active }); return loadProducts(S.token); }
            case 'del-product': { var pr = productRows.filter(function (x) { return x.id === id; })[0]; var yes = await UI.confirm({ title: 'Delete product', message: 'Permanently delete "' + (pr ? pr.name : 'this product') + '"? Past orders keep their own copy of the details.', confirmText: 'Delete' }); if (!yes) return; var rd = await API.products.remove(id); if (rd.error) return UI.toast('Could not delete: ' + rd.error.message, 'error'); log('delete', 'product', id, { name: pr && pr.name }); UI.toast('Product deleted', 'success'); return loadProducts(S.token); }
            case 'export-products': return exportProducts();
            case 'cz-add': { var rows = $('czRows'); rows.insertAdjacentHTML('beforeend', czRowHtml()); refreshIcons(); return; }
            case 'cz-remove': { var row = el.closest('[data-cz-row]'); if (row) row.remove(); return; }
            case 'img-remove': { var t1 = el.closest('.thumb-item'); var grid = t1.parentNode; t1.remove(); if (grid.id === 'productImages') { grid.innerHTML = imagesHtml(currentImages()); refreshIcons(); } return; }
            case 'img-cover': { var t2 = el.closest('.thumb-item'); var urls = currentImages(); var u3 = t2.getAttribute('data-url'); urls = [u3].concat(urls.filter(function (x) { return x !== u3; })); $('productImages').innerHTML = imagesHtml(urls); refreshIcons(); return; }

            case 'new-category': return openCategory(null);
            case 'edit-category': return openCategory(id);
            case 'del-category': { var yc = await UI.confirm({ title: 'Delete category', message: 'Products in this category will become uncategorised.', confirmText: 'Delete' }); if (!yc) return; var rc = await API.categories.remove(id); if (rc.error) return UI.toast(rc.error.message, 'error'); log('delete', 'category', id, {}); UI.toast('Category deleted', 'success'); return loadCategories(S.token); }

            case 'new-coupon': return openCoupon(null);
            case 'edit-coupon': return openCoupon(id);
            case 'del-coupon': { var yk = await UI.confirm({ title: 'Delete coupon', message: 'This coupon will stop working immediately.', confirmText: 'Delete' }); if (!yk) return; var rk = await API.coupons.remove(id); if (rk.error) return UI.toast(rk.error.message, 'error'); log('delete', 'coupon', id, {}); UI.toast('Coupon deleted', 'success'); return loadCoupons(S.token); }

            case 'edit-customer': if ($('adminModal').classList.contains('active')) closeModal(); return openCustomer(id);
            case 'export-customers': { var rcu = await API.profile.customers({ page: 1, limit: 1000, search: S.customerSearch }); return Utils.downloadCSV(rcu.data || [], [{ label: 'Name', key: 'full_name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Points', key: 'loyalty_points' }, { label: 'Joined', key: 'created_at' }], 'bestow-customers-' + dayKey(new Date()) + '.csv'); }

            case 'review-approve': case 'review-unapprove': {
                var ap = act === 'review-approve';
                var rv = await API.reviews.update(id, { is_approved: ap }); if (rv.error) return UI.toast(rv.error.message, 'error');
                log(ap ? 'approve' : 'unpublish', 'review', id, {});
                UI.toast(ap ? 'Review published' : 'Review hidden', 'success');
                if (ap) sendMail({ type: 'review', kind: 'approved', review_id: id });
                return loadReviews(S.token);
            }
            case 'review-reply': {
                var rev = reviewRows.filter(function (x) { return x.id === id; })[0];
                var txt = await UI.prompt({ title: 'Reply to ' + (rev ? rev.customer_name : 'customer'), label: 'Your public reply', value: (rev && rev.admin_reply) || '', multiline: true, required: true, confirmText: 'Publish reply', hint: 'Shown under the review and emailed to the customer.' });
                if (txt === null) return;
                var rr2 = await API.reviews.update(id, { admin_reply: txt, admin_reply_at: new Date().toISOString(), is_approved: true });
                if (rr2.error) return UI.toast(rr2.error.message, 'error');
                log('reply', 'review', id, {}); UI.toast('Reply published', 'success'); sendMail({ type: 'review', kind: 'reply', review_id: id }); return loadReviews(S.token);
            }
            case 'review-delete': { var yr = await UI.confirm({ title: 'Delete review', message: 'This cannot be undone.', confirmText: 'Delete' }); if (!yr) return; var rdl = await API.reviews.remove(id); if (rdl.error) return UI.toast(rdl.error.message, 'error'); log('delete', 'review', id, {}); return loadReviews(S.token); }

            case 'open-inquiry': return openInquiry(id);
            case 'open-return': return openReturn(id);
            case 'del-inquiry': { var yi = await UI.confirm({ title: 'Delete inquiry', message: 'This cannot be undone.', confirmText: 'Delete' }); if (!yi) return; await API.inquiries.remove(id); log('delete', 'inquiry', id, {}); return loadInquiries(S.token); }
            case 'inquiry-save': { var q = $('adminModalBody').__inquiry, f = readForm($('inquiryForm')); var ri = await API.inquiries.update(q.id, { admin_notes: f.admin_notes, status: f.status }); if (ri.error) return UI.toast(ri.error.message, 'error'); UI.toast('Saved', 'success'); closeModal(); return loadInquiries(S.token); }
            case 'export-inquiries': return Utils.downloadCSV(inquiryRows, [{ label: 'Date', key: 'created_at' }, { label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Type', key: 'inquiry_type' }, { label: 'Subject', key: 'subject' }, { label: 'Message', key: 'message' }, { label: 'Status', key: 'status' }], 'bestow-inquiries-' + dayKey(new Date()) + '.csv');

            case 'export-subs': return Utils.downloadCSV(subscriberRows, [{ label: 'Email', key: 'email' }, { label: 'Active', key: 'is_active' }, { label: 'Subscribed', key: 'subscribed_at' }], 'bestow-subscribers-' + dayKey(new Date()) + '.csv');
            case 'del-sub': { var ys = await UI.confirm({ title: 'Remove subscriber', message: 'Remove this email address from the list?', confirmText: 'Remove' }); if (!ys) return; await API.newsletter.remove(id); return loadNewsletter(S.token); }

            case 'live-edit': Bestow.liveEdit(true); Router.go('home'); UI.toast('Live editing on. Click any text or logo to change it.', 'info', 3500); return;
            case 'text-edit': {
                var cur = Bestow.listKeys().filter(function (k) { return k.key === id; })[0]; if (!cur) return;
                var nv = await UI.prompt({ title: 'Edit text', label: id, value: cur.value, multiline: cur.value.length > 60 || cur.value.indexOf('\n') > -1, confirmText: 'Save text', hint: 'Leave empty to restore the original. Tokens like {brand}, {year}, {phone} are filled automatically.' });
                if (nv === null) return; var ch = {}; ch[id] = nv; if (await Bestow.saveTexts(ch)) { UI.toast('Text updated', 'success', 1600); renderTextList(); } return;
            }
            case 'text-reset': { var c2 = {}; c2[id] = null; if (await Bestow.saveTexts(c2)) { UI.toast('Original text restored', 'success', 1600); renderTextList(); } return; }
            case 'texts-reset-all': { var ya = await UI.confirm({ title: 'Reset all text', message: 'Every text edit will be removed and the original wording restored. Logos and settings are not affected.', confirmText: 'Reset everything' }); if (!ya) return; if (await Bestow.saveSection('texts', {})) { UI.toast('All text restored', 'success'); loadContent(); } return; }

            case 'branding-reset': { var D = Bestow.DEFAULTS.branding; ['logo_colour', 'logo_white', 'logo_black', 'favicon'].forEach(function (k) { var inp = document.querySelector('#brandingForm input[name="' + k + '"]'); if (inp) inp.value = D[k] || ''; var im = document.querySelector('[data-logo-preview="' + k + '"]'); if (im) { im.src = D[k] || ''; im.hidden = !D[k]; } }); return UI.toast('Original logos loaded. Press Save to apply.', 'info'); }

            case 'faq-add': { var fr = $('faqRows'); if (fr) { fr.insertAdjacentHTML('beforeend', faqRow()); refreshIcons(); var last = fr.lastElementChild; if (last) last.querySelector('input').focus(); } return; }
            case 'faq-remove': { var frow = el.closest('[data-faq-row]'); if (frow) frow.remove(); return; }
            case 'faq-reset': { $('faqRows').innerHTML = Bestow.DEFAULT_FAQ.map(faqRow).join(''); refreshIcons(); return; }
            default: return;
        }
    }

    async function onSubmit(form) {
        switch (form.id) {
            case 'orderUpdateForm': return saveOrder(form);
            case 'productForm': return saveProduct(form);
            case 'categoryForm': return saveCategory(form);
            case 'couponForm': return saveCoupon(form);
            case 'customerForm': return saveCustomer(form);
            case 'returnAdminForm': {
                var rq = $('adminModalBody').__return, rv = readForm(form), rb = form.querySelector('[type=submit]');
                UI.setLoading(rb, true, 'Saving');
                var rres = await API.returns.update(rq.id, { status: rv.status, admin_note: rv.admin_note });
                UI.setLoading(rb, false);
                if (rres.error) return UI.toast(rres.error.message, 'error');
                log('update', 'return', rq.id, { status: rv.status }); UI.toast('Request updated', 'success'); closeModal(); return loadReturns(S.token);
            }
            case 'inquiryForm': {
                var q = $('adminModalBody').__inquiry, v = readForm(form), sub = form.querySelector('[type=submit]');
                if (!v.reply.trim()) return UI.toast('Write a reply first', 'warning');
                UI.setLoading(sub, true, 'Sending');
                var ok = await sendMail({ type: 'inquiry_reply', inquiry_id: q.id, message: v.reply.trim() }, 'Reply sent');
                UI.setLoading(sub, false);
                if (ok) { await API.inquiries.update(q.id, { admin_notes: v.admin_notes }); log('reply', 'inquiry', q.id, {}); closeModal(); loadInquiries(S.token); }
                return;
            }
            case 'campaignForm': {
                var c = readForm(form), sb2 = form.querySelector('[type=submit]');
                if (c.cta_url && !/^https?:\/\//i.test(c.cta_url)) return UI.toast('The button link must start with https://', 'warning');
                var go = await UI.confirm({ title: 'Send campaign', message: 'Send "' + c.subject + '" to all active subscribers now? This cannot be undone.', confirmText: 'Send now' });
                if (!go) return;
                UI.setLoading(sb2, true, 'Sending');
                var res = await sendMail({ type: 'newsletter_campaign', subject: c.subject, headline: c.headline, body: c.body, cta_label: c.cta_label, cta_url: c.cta_url }, null);
                UI.setLoading(sb2, false);
                if (res) { UI.toast('Campaign sent to ' + (res.recipients || 'your') + ' subscribers', 'success'); log('send', 'newsletter', null, { subject: c.subject }); form.reset(); }
                return;
            }
            case 'brandingForm': {
                var b = readForm(form), name = b.brand_name.trim(); if (!name) return UI.toast('Brand name is required', 'warning');
                var sbtn = form.querySelector('[type=submit]'); UI.setLoading(sbtn, true, 'Saving');
                var ok2 = await Bestow.saveSection('branding', { brand_name: name, tagline: b.tagline.trim(), logo_colour: b.logo_colour.trim(), logo_white: b.logo_white.trim(), logo_black: b.logo_black.trim(), favicon: b.favicon.trim() });
                UI.setLoading(sbtn, false); if (ok2) UI.toast('Branding saved. Emails and invoices will use it too.', 'success'); return;
            }
            case 'settingsForm': {
                var s = readForm(form);
                var nextSettings = {
                    free_shipping_threshold: num(s.free_shipping_threshold), shipping_fee: num(s.shipping_fee), gst_percent: Math.min(100, num(s.gst_percent)), gift_wrap_fee: num(s.gift_wrap_fee),
                    loyalty_rate: num(s.loyalty_rate), loyalty_redeem_max_percent: Math.min(100, num(s.loyalty_redeem_max_percent)), estimated_days_min: Math.max(1, int(s.estimated_days_min)), estimated_days_max: Math.max(1, int(s.estimated_days_max)),
                    whatsapp: s.whatsapp.replace(/\D/g, ''), announcement: s.announcement.trim(), announcement_enabled: !!s.announcement_enabled,
                    site_url: s.site_url.trim().replace(/\/+$/, ''), gstin: s.gstin.trim().toUpperCase(), legal_name: s.legal_name.trim(), business_address: s.business_address.trim()
                };
                if (nextSettings.estimated_days_max < nextSettings.estimated_days_min) nextSettings.estimated_days_max = nextSettings.estimated_days_min;
                var sb3 = form.querySelector('[type=submit]'); UI.setLoading(sb3, true, 'Saving');
                var ok3 = await Bestow.saveSection('settings', nextSettings); UI.setLoading(sb3, false);
                if (ok3) { UI.toast('Settings saved', 'success'); document.dispatchEvent(new CustomEvent('settings:changed')); if (window.Cart) Cart.render(); } return;
            }
            case 'contactSettingsForm': {
                var cs = readForm(form);
                var ok4 = await Bestow.saveSection('contact', { phone: cs.phone.trim(), email: cs.email.trim(), address: cs.address.trim(), business_hours: cs.business_hours.trim() });
                var ok5 = await Bestow.saveSection('social', { facebook: cs.social_facebook.trim(), instagram: cs.social_instagram.trim(), twitter: cs.social_twitter.trim(), youtube: cs.social_youtube.trim() });
                if (ok4 && ok5) UI.toast('Saved', 'success'); return;
            }
            case 'seoForm': { var se = readForm(form); if (await Bestow.saveSection('seo', { title: se.title.trim(), description: se.description.trim(), keywords: se.keywords.trim() })) UI.toast('SEO saved', 'success'); return; }
            case 'faqForm': {
                var items = [];
                form.querySelectorAll('[data-faq-row]').forEach(function (r) { var qq = r.querySelector('[data-faq=q]').value.trim(), aa = r.querySelector('[data-faq=a]').value.trim(); if (qq && aa) items.push({ q: qq, a: aa }); });
                if (!items.length) return UI.toast('Add at least one question with an answer', 'warning');
                if (await Bestow.saveSection('faq', items)) UI.toast('FAQ saved', 'success'); return;
            }
            case 'policiesForm': {
                var pv = readForm(form), pol = {};
                ['shipping', 'returns', 'privacy', 'terms'].forEach(function (k) { pol[k] = { title: pv[k + '_title'].trim() || label(k), body: pv[k + '_body'].trim() }; });
                if (await Bestow.saveSection('policies', pol)) UI.toast('Policies saved', 'success'); return;
            }
            case 'testEmailForm': {
                var tv = readForm(form), tb = form.querySelector('[type=submit]');
                UI.setLoading(tb, true, 'Sending'); var rr = await sendMail({ type: 'test_email', to: tv.to }, 'Test email sent to ' + tv.to); UI.setLoading(tb, false); if (rr) loadEmails(S.token); return;
            }
            default: return;
        }
    }

    async function onLogoFile(input) {
        var key = input.getAttribute('data-logo-file'), f = input.files && input.files[0]; if (!f) return;
        if (f.size > 5 * 1024 * 1024) return UI.toast('Please choose an image under 5 MB', 'warning');
        UI.toast('Uploading', 'info', 1200);
        var up = f.type === 'image/svg+xml' ? await API.storage.upload('site-assets', 'branding', f) : await uploadImage('site-assets', 'branding', f);
        if (up.error) return UI.toast('Upload failed: ' + up.error.message, 'error');
        var inp = document.querySelector('#brandingForm input[name="' + key + '"]'); if (inp) inp.value = up.data.url;
        var im = document.querySelector('[data-logo-preview="' + key + '"]'); if (im) { im.src = up.data.url; im.hidden = false; }
        UI.toast('Uploaded. Press Save branding to apply.', 'success');
    }

    function bindEvents() {
        if (S.bound) return; S.bound = true;
        var page = $('pageAdmin'), modalEl = $('adminModal');
        function click(e) {
            var r = e.target.closest('[data-admin-refresh]'); if (r) { Admin.refresh(); return; }
            var a = e.target.closest('[data-act]'); if (a) { e.preventDefault(); onAction(a.getAttribute('data-act'), a, e); return; }
            var rg = e.target.closest('[data-range]'); if (rg) { S.range = int(rg.getAttribute('data-range')); Admin.refresh(); return; }
            var op = e.target.closest('[data-order-page]'); if (op) { S.orderPage = int(op.getAttribute('data-order-page')); loadOrders(S.token); return; }
            var pp = e.target.closest('[data-product-page]'); if (pp) { S.productPage = int(pp.getAttribute('data-product-page')); loadProducts(S.token); return; }
            var cp = e.target.closest('[data-customer-page]'); if (cp) { S.customerPage = int(cp.getAttribute('data-customer-page')); loadCustomers(S.token); return; }
            var rf = e.target.closest('[data-review-filter]'); if (rf) { reviewFilter = rf.getAttribute('data-review-filter'); loadReviews(S.token); return; }
            var rtf = e.target.closest('[data-return-filter]'); if (rtf) { returnFilter = rtf.getAttribute('data-return-filter'); loadReturns(S.token); return; }
            var inf = e.target.closest('[data-inquiry-filter]'); if (inf) { inquiryFilter = inf.getAttribute('data-inquiry-filter'); loadInquiries(S.token); return; }
        }
        page.addEventListener('click', click);
        modalEl.addEventListener('click', function (e) { if (e.target.closest('[data-act]') || e.target.closest('[data-order-page]')) click(e); });

        function submit(e) {
            var form = e.target; if (!form || !form.id || !/Form$/.test(form.id)) return;
            if (!(page.contains(form) || modalEl.contains(form))) return;
            e.preventDefault();
            if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }
            onSubmit(form);
        }
        page.addEventListener('submit', submit); modalEl.addEventListener('submit', submit);

        page.addEventListener('change', function (e) {
            var t = e.target;
            if (t.id === 'orderStatusFilter') { S.orderFilter.status = t.value; S.orderPage = 1; loadOrders(S.token); }
            else if (t.id === 'orderPayFilter') { S.orderFilter.payment = t.value; S.orderPage = 1; loadOrders(S.token); }
            else if (t.id === 'productCatFilter') { S.productFilter.category = t.value; S.productPage = 1; loadProducts(S.token); }
            else if (t.id === 'textGroup') { textState.group = t.value; renderTextList(); }
            else if (t.hasAttribute && t.hasAttribute('data-logo-file')) onLogoFile(t);
        });
        var d = Utils.debounce;
        page.addEventListener('input', d(function (e) {
            var t = e.target;
            if (t.id === 'orderSearch') { S.orderFilter.search = t.value.trim(); S.orderPage = 1; loadOrders(S.token); }
            else if (t.id === 'productSearch') { S.productFilter.search = t.value.trim(); S.productPage = 1; loadProducts(S.token); }
            else if (t.id === 'customerSearch') { S.customerSearch = t.value.trim(); S.customerPage = 1; loadCustomers(S.token); }
            else if (t.id === 'textSearch') { textState.q = t.value.trim(); renderTextList(); }
        }, 320));
        /* paste a logo link: update the preview */
        page.addEventListener('input', function (e) {
            var t = e.target; if (t.closest && t.closest('.logo-card') && t.type === 'url') { var im = t.closest('.logo-card').querySelector('[data-logo-preview]'); if (im) { im.src = t.value; im.hidden = !t.value; } }
        });

        var gs = $('adminSearchForm');
        if (gs) gs.addEventListener('submit', function (e) { e.preventDefault(); globalSearch($('adminSearchInput').value); });
        var menu = $('adminMenuBtn'); if (menu) menu.addEventListener('click', function () { document.body.classList.toggle('admin-nav-open'); });
        var bd = $('adminBackdrop'); if (bd) bd.addEventListener('click', closeSidebar);
        var snd = $('adminSoundBtn'); if (snd) snd.addEventListener('click', function () { S.sound = !S.sound; try { localStorage.setItem('bestow_admin_sound', S.sound ? '1' : '0'); } catch (x) { /* ignore */ } renderNav(); if (S.sound) beep(); });
        var le = $('adminLiveEditBtn'); if (le) le.addEventListener('click', function () { Bestow.liveEdit(true); Router.go('home'); UI.toast('Live editing on. Click any text or logo to change it.', 'info', 3500); });
        var ex = $('adminExitBtn'); if (ex) ex.addEventListener('click', function () { Router.go('home'); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSidebar(); });
    }

    /* ======================================================================
       PUBLIC API
       ====================================================================== */
    var LOADERS = { dashboard: loadDashboard, orders: loadOrders, products: loadProducts, categories: loadCategories, coupons: loadCoupons, customers: loadCustomers, reviews: loadReviews, inquiries: loadInquiries, newsletter: loadNewsletter, content: loadContent, branding: loadBranding, settings: loadSettings, contact: loadContact, seo: loadSeo, faq: loadFaq, policies: loadPolicies, emails: loadEmails, activity: loadActivity, returns: loadReturns };

    var Admin = window.Admin = {
        init: function () { bindEvents(); },
        stop: function () { stopRealtime(); S.ready = false; closeSidebar(); },
        openBranding: function () { if (!(window.AppState && AppState.isAdmin)) return; Bestow.liveEdit(false); Router.go('admin', 'branding'); },
        refresh: function () { return Admin.load(S.tab); },
        load: async function (tab) {
            if (!LOADERS[tab]) tab = 'dashboard';
            S.tab = tab; var t = ++S.token;
            if (tab !== 'orders') { /* leaving orders resets the search box so it re-renders next time */ }
            renderNav();
            var titleEl = $('adminTitle'); var def = TABS.filter(function (x) { return x.id === tab; })[0]; if (titleEl && def) titleEl.textContent = def.label;
            if (tab === 'orders') S.newCount = 0;
            closeSidebar();
            try { await LOADERS[tab](t); } catch (e) { console.error('[Admin]', e); if (!stale(t)) fail(content(), e); }
            refreshIcons();
        },
        loadPage: async function (ctx) {
            bindEvents();
            if (!(window.AppState && AppState.isAdmin)) return;
            var tab = (ctx && ctx.param) || 'dashboard';
            var el = content(); if (el && S.tab !== tab) el.innerHTML = busy();
            if (!S.ready) { S.ready = true; startRealtime(); }
            /* search boxes are created once per tab visit */
            await Admin.load(tab);
        }
    };
})();
