/* ==========================================================================
   BESTOW - CUSTOMER ORDERS
   Order history, live status timeline (realtime), invoice download, reorder,
   cancellation and public order tracking.
   ========================================================================== */
(function () {
    'use strict';

    var T = function (k, v) { return Bestow.t(k, v); };
    var TX = function (k, v) { return Bestow.tx(k, v); };
    var $ = function (id) { return document.getElementById(id); };

    Bestow.define({
        'status.placed': 'Order Placed',
        'status.confirmed': 'Confirmed',
        'status.processing': 'In Production',
        'status.shipped': 'Shipped',
        'status.in_transit': 'In Transit',
        'status.out_for_delivery': 'Out for Delivery',
        'status.delivered': 'Delivered',
        'status.cancelled': 'Cancelled',
        'status.returned': 'Returned',
        'status.pending_payment': 'Awaiting Payment',
        'status.refunded': 'Refunded',
        'orders.view': 'Details',
        'orders.items': 'Items',
        'orders.shipping_to': 'Delivering to',
        'orders.payment': 'Payment',
        'orders.tracking': 'Tracking number',
        'orders.track_shipment': 'Track shipment',
        'orders.invoice': 'Invoice',
        'orders.reorder': 'Reorder',
        'orders.cancel': 'Cancel order',
        'orders.review': 'Review',
        'orders.help': 'Need help',
        'orders.eta': 'Estimated delivery',
        'orders.total': 'Total',
        'orders.gift': 'Gift message',
        'orders.invoice_failed': 'We could not prepare your invoice. Please try again in a moment.',
        'orders.invoice_ready': 'Your invoice is downloading',
        'orders.reordered': 'Items added to your cart',
        'orders.reorder_none': 'These products are no longer available',
        'orders.cancel_title': 'Cancel this order?',
        'orders.cancel_text': 'Cancellation is possible until production starts. Refunds go back to your original payment method.',
        'orders.cancel_reason': 'Reason for cancelling (optional)',
        'orders.cancelled_ok': 'Your order has been cancelled',
        'orders.status_now': 'Order {num} is now {status}',
        'orders.refunded_note': 'This order has been refunded.',
        'orders.cancelled_note': 'This order was cancelled.',
        'orders.returned_note': 'This order has been returned.',
        'track.not_found': 'We could not find an order with that number and email. Please check both and try again.',
        'track.need_both': 'Enter your order number and the email used at checkout',
        'track.searching': 'Searching',
        'track.found_for': 'Order {num}'
    }, 'orders');

    var FLOW = ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
    var STATUS_ICON = { placed: 'receipt', confirmed: 'check-circle', processing: 'settings', shipped: 'truck', in_transit: 'truck', out_for_delivery: 'map-pin', delivered: 'package', cancelled: 'x-circle', returned: 'refresh-cw' };
    var known = {};      // order id -> last status (for realtime toast)
    var channel = null;

    function statusLabel(s) { return T('status.' + s) || Utils.titleCase(s); }
    function pill(order) {
        var s = order.order_status;
        if (order.payment_status === 'pending') s = 'pending_payment';
        else if (order.payment_status === 'refunded') s = 'refunded';
        else if (order.payment_status === 'failed') s = 'cancelled';
        return '<span class="status-pill st-' + s + '">' + UI.icon(STATUS_ICON[s] || 'info', 'icon-xs') + ' ' + TX('status.' + s) + '</span>';
    }

    function when(order, status) {
        var h = Array.isArray(order.status_history) ? order.status_history : [];
        for (var i = h.length - 1; i >= 0; i--) if (h[i].status === status) return h[i].timestamp;
        return null;
    }

    function timeline(order) {
        var s = order.order_status;
        if (s === 'cancelled' || s === 'returned') {
            return '<div class="order-banner banner-' + s + '">' + UI.icon(STATUS_ICON[s], 'icon-sm') + ' ' + TX('orders.' + s + '_note') + (order.cancellation_reason ? ' <em>' + Utils.esc(order.cancellation_reason) + '</em>' : '') + '</div>';
        }
        var idx = FLOW.indexOf(s === 'in_transit' ? 'shipped' : s);
        if (idx < 0) idx = 0;
        return '<ol class="timeline" aria-label="Order progress">' + FLOW.map(function (st, i) {
            var done = i < idx, now = i === idx, ts = when(order, st);
            var label = st === 'shipped' && s === 'in_transit' ? 'in_transit' : st;
            return '<li class="tl-step' + (done ? ' done' : '') + (now ? ' current' : '') + '"><span class="tl-dot">' + UI.icon(STATUS_ICON[st], 'icon-xs') + '</span>' +
                '<span class="tl-label">' + TX('status.' + label) + '</span>' + (ts && (done || now) ? '<span class="tl-time">' + Utils.date(ts) + '</span>' : '') + '</li>';
        }).join('') + '</ol>';
    }

    function itemsHtml(order, withReview) {
        return (order.items || []).map(function (i) {
            var cz = Cart.czSummary(i.customization);
            return '<div class="order-line"><div class="order-line-img"><img src="' + Utils.esc(i.image || Utils.PLACEHOLDER) + '" alt="" loading="lazy"></div>' +
                '<div class="order-line-info"><a class="order-line-name" href="#product/' + encodeURIComponent(i.product_id) + '" data-route="product" data-param="' + Utils.esc(i.product_id) + '">' + Utils.esc(i.name) + '</a>' +
                '<span class="order-line-meta">' + Utils.price(i.price) + ' x ' + i.quantity + '</span>' + (cz ? '<span class="order-line-custom">' + cz + '</span>' : '') + '</div>' +
                (withReview ? '<button type="button" class="btn btn-ghost btn-sm" data-review-order="' + Utils.esc(order.id) + '" data-review-product="' + Utils.esc(i.product_id) + '" data-review-name="' + Utils.esc(i.name) + '">' + UI.icon('star', 'icon-xs') + ' ' + TX('orders.review') + '</button>' : '') +
                '<strong class="order-line-total">' + Utils.price(i.price * i.quantity) + '</strong></div>';
        }).join('');
    }

    function addressHtml(a) {
        a = a || {};
        return [a.address_line1, a.address_line2, [a.city, a.state].filter(Boolean).join(', '), a.pincode].filter(Boolean).map(Utils.esc).join('<br>');
    }

    function orderCard(o, open) {
        var paid = o.payment_status === 'paid' || o.payment_status === 'refunded';
        var canCancel = o.payment_status === 'paid' && (o.order_status === 'placed' || o.order_status === 'confirmed');
        var delivered = o.order_status === 'delivered';
        return '<article class="order-card glass' + (open ? ' open' : '') + '" data-order="' + Utils.esc(o.id) + '">' +
            '<header class="order-card-head" data-toggle-order tabindex="0" role="button" aria-expanded="' + (open ? 'true' : 'false') + '">' +
            '<div class="order-card-id"><strong>' + Utils.esc(o.order_number) + '</strong><span>' + Utils.dateTime(o.created_at) + '</span></div>' +
            '<div class="order-card-sum">' + pill(o) + '<strong>' + Utils.price(o.total_amount) + '</strong>' + UI.icon('chevron-down', 'icon-sm order-chevron') + '</div></header>' +
            '<div class="order-card-body">' + timeline(o) +
            '<div class="order-lines">' + itemsHtml(o, delivered) + '</div>' +
            '<div class="order-meta-grid">' +
            '<div><h5>' + TX('orders.shipping_to') + '</h5><p>' + Utils.esc(o.customer_name) + '<br>' + addressHtml(o.shipping_address) + '</p></div>' +
            '<div><h5>' + TX('orders.payment') + '</h5><p>' + Utils.price(o.total_amount) + '<br><span class="text-muted">' + Utils.esc(o.razorpay_payment_id || '') + '</span></p>' + (o.estimated_delivery && !delivered && o.order_status !== 'cancelled' ? '<p><span class="text-muted">' + TX('orders.eta') + ':</span> ' + Utils.date(o.estimated_delivery) + '</p>' : '') + '</div>' +
            (o.tracking_number ? '<div><h5>' + TX('orders.tracking') + '</h5><p>' + Utils.esc(o.tracking_number) + '</p>' + (o.tracking_url ? '<a class="link-btn" href="' + Utils.esc(o.tracking_url) + '" target="_blank" rel="noopener">' + TX('orders.track_shipment') + '</a>' : '') + '</div>' : '') +
            (o.gift_message ? '<div><h5>' + TX('orders.gift') + '</h5><p>' + Utils.multiline(o.gift_message) + '</p></div>' : '') +
            '</div>' +
            '<div class="order-actions">' +
            (paid ? '<button type="button" class="btn btn-outline btn-sm" data-order-act="invoice">' + UI.icon('file-text', 'icon-xs') + ' ' + TX('orders.invoice') + '</button>' : '') +
            '<button type="button" class="btn btn-outline btn-sm" data-order-act="reorder">' + UI.icon('rotate-ccw', 'icon-xs') + ' ' + TX('orders.reorder') + '</button>' +
            (canCancel ? '<button type="button" class="btn btn-ghost btn-sm danger" data-order-act="cancel">' + UI.icon('x-circle', 'icon-xs') + ' ' + TX('orders.cancel') + '</button>' : '') +
            '<button type="button" class="btn btn-ghost btn-sm" data-order-act="help">' + UI.icon('message-circle', 'icon-xs') + ' ' + TX('orders.help') + '</button></div></div></article>';
    }

    var list = [];

    var Orders = {
        pill: pill, timeline: timeline, statusLabel: statusLabel, itemsHtml: itemsHtml, addressHtml: addressHtml,

        loadMine: async function () {
            var box = $('customerOrdersList'), empty = $('customerOrdersEmpty');
            if (!box || !(window.AppState && AppState.user)) return;
            box.innerHTML = UI.skeletonCards(2);
            var r = await API.orders.mine(AppState.user.id);
            list = r.data || [];
            list.forEach(function (o) { known[o.id] = o.order_status; });
            if (!list.length) { box.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            box.innerHTML = list.map(function (o, i) { return orderCard(o, i === 0); }).join('');
            refreshIcons();
        },

        downloadInvoice: async function (order, btn) {
            UI.setLoading(btn, true, '');
            var r = await API.fn('generate-invoice', { order_id: order.id });
            UI.setLoading(btn, false);
            if (r.error || !r.data || !r.data.ok) { UI.toast(T('orders.invoice_failed'), 'error'); return; }
            UI.toast(T('orders.invoice_ready'), 'success', 1800);
            var a = document.createElement('a'); a.href = r.data.url; a.download = r.data.file_name || 'invoice.pdf'; a.target = '_blank'; a.rel = 'noopener';
            document.body.appendChild(a); a.click(); a.remove();
        },

        reorder: async function (order) {
            var ids = (order.items || []).map(function (i) { return i.product_id; });
            var r = await API.products.byIds(ids);
            var map = {}; (r.data || []).forEach(function (p) { map[p.id] = p; });
            var added = 0;
            (order.items || []).forEach(function (i) {
                var p = map[i.product_id];
                if (p && p.is_active && p.stock_quantity > 0 && Cart.add(p, Math.min(i.quantity, p.stock_quantity), i.customization || null)) added++;
            });
            if (added) { UI.toast(T('orders.reordered'), 'success'); Cart.open(); } else UI.toast(T('orders.reorder_none'), 'warning');
        },

        cancel: async function (order) {
            var reason = await UI.prompt({ title: T('orders.cancel_title'), hint: T('orders.cancel_text'), label: T('orders.cancel_reason'), multiline: true, rows: 3, confirmText: T('orders.cancel') });
            if (reason === null) return;
            var r = await API.orders.cancelMine(order.id, reason);
            if (r.error || !r.data || !r.data.ok) { UI.toast((r.data && r.data.message) || (r.error && r.error.message) || T('shop.load_error'), 'error'); return; }
            UI.toast(T('orders.cancelled_ok'), 'success');
            API.fn('send-email', { type: 'order_status', order_id: order.id });
            Orders.loadMine();
        },

        subscribe: function (userId) {
            Orders.unsubscribe();
            channel = API.realtime.orders('customer_id=eq.' + userId, function (p) {
                var n = p.new; if (!n || !n.id) return;
                var prev = known[n.id]; known[n.id] = n.order_status;
                if (p.eventType === 'UPDATE' && prev && prev !== n.order_status && n.payment_status !== 'pending') {
                    UI.toast(T('orders.status_now', { num: n.order_number, status: statusLabel(n.order_status) }), 'info', 6000);
                    if (Router.current().name === 'account') Orders.loadMine();
                }
            });
        },
        unsubscribe: function () { if (channel) { API.realtime.stop(channel); channel = null; } },

        /* ---------- public tracking ---------- */
        loadTrack: function (ctx) {
            var n = $('trackOrderNumber'), e = $('trackOrderEmail');
            if (ctx && ctx.param && !n.value) n.value = ctx.param;
            if (window.AppState && AppState.profile && !e.value) e.value = AppState.profile.email || '';
            if (ctx && ctx.query && ctx.query.email && !e.value) e.value = ctx.query.email;
            if (!(ctx && ctx.param)) $('trackOrderResult').style.display = 'none';
            else if (n.value && e.value) Orders.track({ preventDefault: function () {}, target: $('trackOrderForm') });
        },

        track: async function (ev) {
            ev.preventDefault();
            var num = $('trackOrderNumber').value.trim(), email = $('trackOrderEmail').value.trim();
            if (!num || !email) { UI.toast(T('track.need_both'), 'warning'); return; }
            var btn = ev.target.querySelector('button[type="submit"]'); UI.setLoading(btn, true, T('track.searching'));
            var r = await API.orders.track(num, email);
            UI.setLoading(btn, false);
            var out = $('trackOrderResult'); out.style.display = '';
            var o = r.data;
            if (!o) { out.innerHTML = '<div class="track-card glass-soft empty-track">' + UI.icon('search-x', 'icon-lg') + '<p>' + TX('track.not_found') + '</p></div>'; refreshIcons(); return; }
            o.id = o.order_number;
            out.innerHTML = '<div class="track-card glass-soft"><header class="track-head"><div><span class="text-muted">' + TX('track.found_for', { num: '' }) + '</span><h3>' + Utils.esc(o.order_number) + '</h3><span class="text-muted">' + Utils.dateTime(o.created_at) + '</span></div>' + pill(o) + '</header>' +
                timeline(o) +
                (o.estimated_delivery && o.order_status !== 'delivered' && o.order_status !== 'cancelled' ? '<p class="track-eta">' + UI.icon('calendar', 'icon-sm') + ' ' + TX('orders.eta') + ': <strong>' + Utils.date(o.estimated_delivery) + '</strong></p>' : '') +
                (o.tracking_number ? '<p class="track-eta">' + UI.icon('truck', 'icon-sm') + ' ' + TX('orders.tracking') + ': <strong>' + Utils.esc(o.tracking_number) + '</strong> ' + (o.tracking_url ? '<a class="link-btn" href="' + Utils.esc(o.tracking_url) + '" target="_blank" rel="noopener">' + TX('orders.track_shipment') + '</a>' : '') + '</p>' : '') +
                '<div class="order-lines">' + itemsHtml(o, false) + '</div><p class="track-total"><span>' + TX('orders.total') + '</span><strong>' + Utils.price(o.total_amount) + '</strong></p></div>';
            refreshIcons();
        },

        bind: function () {
            $('trackOrderForm').addEventListener('submit', Orders.track);
            var box = $('customerOrdersList');
            box.addEventListener('click', function (e) {
                var cardEl = e.target.closest('.order-card'); if (!cardEl) return;
                var o = list.find(function (x) { return x.id === cardEl.getAttribute('data-order'); }); if (!o) return;
                var rv = e.target.closest('[data-review-product]');
                if (rv) { Reviews.openModal(rv.getAttribute('data-review-product'), rv.getAttribute('data-review-order'), rv.getAttribute('data-review-name')); return; }
                var b = e.target.closest('[data-order-act]');
                if (b) {
                    var a = b.getAttribute('data-order-act');
                    if (a === 'invoice') Orders.downloadInvoice(o, b);
                    else if (a === 'reorder') Orders.reorder(o);
                    else if (a === 'cancel') Orders.cancel(o);
                    else if (a === 'help') WhatsApp.shareOrder(o);
                    return;
                }
                if (e.target.closest('[data-toggle-order]')) { var open = cardEl.classList.toggle('open'); cardEl.querySelector('[data-toggle-order]').setAttribute('aria-expanded', open); }
            });
            box.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-toggle-order]')) { e.preventDefault(); e.target.click(); } });
        }
    };
    window.Orders = Orders;
    window.loadCustomerOrders = Orders.loadMine;
})();
