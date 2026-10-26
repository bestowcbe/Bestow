/* ==========================================================================
   BESTOW - CHECKOUT AND RAZORPAY PAYMENTS
   Flow:  create-payment-order (server prices everything)  ->  Razorpay Checkout
          ->  verify-payment (HMAC signature check, invoice PDF, email)  ->  success page
   The browser never decides the amount and never sees the Razorpay secret.
   ========================================================================== */
(function () {
    'use strict';

    var T = function (k, v) { return Bestow.t(k, v); };
    var TX = function (k, v) { return Bestow.tx(k, v); };
    var $ = function (id) { return document.getElementById(id); };

    Bestow.define({
        'checkout.empty_title': 'Your cart is empty',
        'checkout.empty_text': 'Add a few items before you check out.',
        'checkout.empty_cta': 'Browse Products',
        'checkout.coupon_empty': 'Enter a coupon code',
        'checkout.coupon_ok': 'Coupon applied. You save {amount}',
        'checkout.coupon_remove': 'Remove',
        'checkout.coupon_bad': 'This coupon is not valid',
        'checkout.points_label': 'Use {n} loyalty points (saves {amount})',
        'checkout.points_none': 'You have no loyalty points yet. Every paid order earns points.',
        'checkout.guest_note': 'You are checking out as a guest. Sign in to save your address, earn loyalty points and upload photos.',
        'checkout.fix_form': 'Please complete all required fields correctly',
        'checkout.phone_invalid': 'Enter a valid 10 digit mobile number',
        'checkout.pin_invalid': 'Enter a valid 6 digit pincode',
        'checkout.pay': 'Pay Securely with Razorpay',
        'checkout.pay_amount': 'Pay {amount} Securely',
        'checkout.preparing': 'Preparing your order',
        'checkout.confirming': 'Confirming your payment',
        'checkout.confirming_text': 'Please do not close this window.',
        'checkout.no_gateway': 'The payment window could not load. Please disable any blocker and refresh.',
        'checkout.cancelled': 'Payment was cancelled. Your cart is still saved.',
        'checkout.failed': 'Payment failed: {reason}',
        'checkout.verify_failed': 'We could not confirm your payment yet. If money was deducted it will be confirmed automatically and you will receive an email. Contact us if you do not hear from us within an hour.',
        'checkout.free': 'Free',
        'checkout.saved_address': 'Use my saved address',
        'checkout.address_filled': 'Saved address filled in',
        'success.processing_title': 'Payment received',
        'success.title': 'Thank you for your order',
        'success.subtitle': 'Your payment was successful and your order is confirmed.',
        'success.number': 'Order number',
        'success.total': 'Amount paid',
        'success.eta': 'Estimated delivery',
        'success.email_note': 'A confirmation email with your PDF invoice has been sent to {email}.',
        'success.points': 'You earned {n} loyalty points with this order.',
        'success.track': 'Track Order',
        'success.invoice': 'Download Invoice',
        'success.continue': 'Continue Shopping',
        'success.whatsapp': 'Share on WhatsApp',
        'success.invoice_wait': 'Your invoice is being prepared. It will be in your email shortly.'
    }, 'checkout');

    var coupon = null;          // { code, discount }
    var paying = false;
    var balance = 0;

    function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

    function compute() {
        var s = Bestow.settings, t = Cart.totals();
        var subtotal = t.subtotal;
        var discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
        var pts = 0;
        var chk = $('usePointsCheck');
        if (chk && chk.checked && balance > 0) {
            var cap = Math.floor((subtotal - discount) * Number(s.loyalty_redeem_max_percent) / 100);
            pts = Math.max(0, Math.min(balance, cap));
        }
        var after = Math.max(subtotal - discount - pts, 0);
        var gift = $('giftWrapCheck') && $('giftWrapCheck').checked ? Number(s.gift_wrap_fee) || 0 : 0;
        var shipping = after === 0 || after >= Number(s.free_shipping_threshold) ? 0 : Number(s.shipping_fee) || 0;
        var tax = round2((after + gift) * Number(s.gst_percent) / 100);
        return { subtotal: subtotal, discount: discount, points: pts, gift: gift, shipping: shipping, tax: tax, total: round2(after + gift + shipping + tax) };
    }

    function renderSummary() {
        var items = Cart.items();
        $('checkoutItems').innerHTML = items.map(function (i) {
            var cz = Cart.czSummary(i.customization);
            return '<div class="checkout-item"><div class="checkout-item-img"><img src="' + Utils.esc(i.image) + '" alt="" loading="lazy"><span class="checkout-item-qty">' + i.quantity + '</span></div>' +
                '<div class="checkout-item-info"><p class="checkout-item-name">' + Utils.esc(i.name) + '</p>' + (cz ? '<p class="checkout-item-custom">' + cz + '</p>' : '') + '</div>' +
                '<span class="checkout-item-price">' + Utils.price(i.price * i.quantity) + '</span></div>';
        }).join('');
        var c = compute();
        $('checkoutSubtotal').textContent = Utils.price(c.subtotal);
        $('checkoutDiscountRow').style.display = c.discount > 0 ? '' : 'none';
        $('checkoutDiscount').textContent = '- ' + Utils.price(c.discount);
        $('checkoutPointsRow').style.display = c.points > 0 ? '' : 'none';
        $('checkoutPoints').textContent = '- ' + Utils.price(c.points);
        $('checkoutGiftRow').style.display = c.gift > 0 ? '' : 'none';
        $('checkoutGift').textContent = Utils.price(c.gift);
        $('checkoutShipping').textContent = c.shipping > 0 ? Utils.price(c.shipping) : T('checkout.free');
        $('checkoutTax').textContent = Utils.price(c.tax);
        $('checkoutTaxLabel').textContent = Bestow.settings.gst_percent;
        $('checkoutTotal').textContent = Utils.price(c.total);
        if (!paying) $('payNowBtn').innerHTML = UI.icon('shield-check', 'icon-sm') + ' <span>' + Utils.esc(T('checkout.pay_amount', { amount: Utils.price(c.total) })) + '</span>';
        var th = Number(Bestow.settings.free_shipping_threshold);
        var after = Math.max(c.subtotal - c.discount - c.points, 0);
        var note = $('checkoutShipNote');
        if (note) note.textContent = th > 0 && after < th && after > 0 ? T('cart.free_more', { amount: Utils.price(th - after) }) : '';
        refreshIcons();
    }

    function setCouponStatus(msg, kind) {
        var el = $('couponStatus'); el.textContent = msg || ''; el.className = 'coupon-status' + (kind ? ' ' + kind : '');
        $('removeCouponBtn').style.display = coupon ? '' : 'none';
    }

    async function applyCoupon() {
        var code = $('couponCodeInput').value.trim().toUpperCase();
        if (!code) { setCouponStatus(T('checkout.coupon_empty'), 'bad'); return; }
        var btn = $('applyCouponBtn'); UI.setLoading(btn, true, '');
        var r = await API.coupons.validate(code, Cart.totals().subtotal);
        UI.setLoading(btn, false);
        var d = r.data;
        if (!d || !d.valid) { coupon = null; setCouponStatus((d && d.message) || T('checkout.coupon_bad'), 'bad'); renderSummary(); return; }
        coupon = { code: d.code, discount: Number(d.discount) };
        setCouponStatus(T('checkout.coupon_ok', { amount: Utils.price(d.discount) }), 'good');
        renderSummary();
    }

    function removeCoupon() { coupon = null; $('couponCodeInput').value = ''; setCouponStatus('', ''); renderSummary(); }

    async function revalidateCoupon() {
        if (!coupon) return;
        var r = await API.coupons.validate(coupon.code, Cart.totals().subtotal);
        if (!r.data || !r.data.valid) { coupon = null; setCouponStatus((r.data && r.data.message) || '', 'bad'); }
        else coupon.discount = Number(r.data.discount);
        renderSummary();
    }

    function fillFromProfile(force) {
        var p = window.AppState && AppState.profile; if (!p) return;
        var set = function (id, v) { var el = $(id); if (el && v && (force || !el.value)) el.value = v; };
        set('checkoutName', p.full_name); set('checkoutEmail', p.email); set('checkoutPhone', p.phone);
        set('checkoutAddress1', p.address_line1); set('checkoutAddress2', p.address_line2);
        set('checkoutCity', p.city); set('checkoutState', p.state); set('checkoutPincode', p.pincode);
    }

    function validate() {
        var form = $('checkoutForm');
        if (!form.checkValidity()) { form.reportValidity(); UI.toast(T('checkout.fix_form'), 'warning'); return false; }
        if (!Utils.isPhone($('checkoutPhone').value)) { UI.toast(T('checkout.phone_invalid'), 'warning'); $('checkoutPhone').focus(); return false; }
        if (!Utils.isPincode($('checkoutPincode').value)) { UI.toast(T('checkout.pin_invalid'), 'warning'); $('checkoutPincode').focus(); return false; }
        return true;
    }

    function overlay(show, title, text) {
        var o = $('payingOverlay'); o.classList.toggle('active', !!show);
        if (show) { $('payingTitle').textContent = title || ''; $('payingText').textContent = text || ''; }
        document.body.classList.toggle('no-scroll', !!show || !!document.querySelector('.modal-overlay.active'));
    }

    function stop() { paying = false; overlay(false); UI.setLoading($('payNowBtn'), false); renderSummary(); }

    async function pay() {
        if (paying) return;
        if (!Cart.items().length) { UI.toast(T('checkout.empty_title'), 'warning'); return; }
        if (!validate()) return;
        if (!window.Razorpay) { UI.toast(T('checkout.no_gateway'), 'error', 7000); return; }
        paying = true;
        var btn = $('payNowBtn'); UI.setLoading(btn, true, T('checkout.preparing'));

        var c = compute();
        var body = {
            items: Cart.items().map(function (i) { return { product_id: i.product_id, quantity: i.quantity, customization: i.customization || undefined }; }),
            customer: { name: $('checkoutName').value.trim(), email: $('checkoutEmail').value.trim().toLowerCase(), phone: $('checkoutPhone').value.trim() },
            shipping_address: {
                address_line1: $('checkoutAddress1').value.trim(), address_line2: $('checkoutAddress2').value.trim(),
                city: $('checkoutCity').value.trim(), state: $('checkoutState').value.trim(), pincode: $('checkoutPincode').value.trim()
            },
            coupon_code: coupon ? coupon.code : '',
            notes: $('checkoutNotes').value.trim(),
            gift_wrap: !!($('giftWrapCheck') && $('giftWrapCheck').checked),
            gift_message: $('giftMessage') ? $('giftMessage').value.trim() : '',
            points_to_use: c.points
        };

        var r = await API.fn('create-payment-order', body);
        if (r.error || !r.data || !r.data.ok) {
            stop();
            UI.toast((r.error && r.error.message) || (r.data && r.data.message) || T('shop.load_error'), 'error', 6500);
            if (r.error && /stock|available/i.test(r.error.message)) Cart.sync();
            return;
        }
        var o = r.data;
        var rzp;
        try {
            rzp = new window.Razorpay({
                key: o.key_id, amount: o.amount, currency: o.currency, order_id: o.razorpay_order_id,
                name: Bestow.branding.brand_name, description: 'Order ' + o.order_number,
                image: Bestow.branding.logo_colour,
                prefill: { name: body.customer.name, email: body.customer.email, contact: body.customer.phone },
                notes: { order_number: o.order_number },
                theme: { color: '#de2128' },
                modal: { ondismiss: function () { if (paying && !$('payingOverlay').classList.contains('active')) { stop(); UI.toast(T('checkout.cancelled'), 'info', 5000); } }, confirm_close: true },
                handler: function (resp) { onPaid(resp, o, body); }
            });
            rzp.on('payment.failed', function (resp) {
                var reason = resp && resp.error && resp.error.description ? resp.error.description : 'Please try another method';
                stop(); UI.toast(T('checkout.failed', { reason: reason }), 'error', 7000);
            });
            rzp.open();
        } catch (e) {
            stop(); UI.toast(T('checkout.no_gateway'), 'error', 7000);
        }
    }

    async function onPaid(resp, order, body) {
        overlay(true, T('checkout.confirming'), T('checkout.confirming_text'));
        var v = await API.fn('verify-payment', {
            razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature
        });
        if (v.error || !v.data || !v.data.ok) {
            overlay(false); paying = false; UI.setLoading($('payNowBtn'), false);
            UI.toast(T('checkout.verify_failed'), 'warning', 12000);
            Utils.storage.set('bestow_last_order', { order_number: order.order_number, email: body.customer.email, total: order.breakdown.total, pending: true });
            Cart.clear();
            Router.go('order-success', order.order_number);
            return;
        }
        Utils.storage.set('bestow_last_order', { order_number: v.data.order_number, email: body.customer.email, total: order.breakdown.total, order_id: v.data.order_id });
        Cart.clear(); coupon = null;
        paying = false; overlay(false);
        UI.setLoading($('payNowBtn'), false);
        Router.go('order-success', v.data.order_number);
        if (window.Features && Features.confetti) Features.confetti();
    }

    /* ---------- page loaders ---------- */
    var Checkout = {
        load: async function () {
            var empty = !Cart.items().length;
            $('checkoutEmpty').style.display = empty ? '' : 'none';
            $('checkoutLayout').style.display = empty ? 'none' : '';
            if (empty) return;
            await Cart.sync();
            if (!Cart.items().length) { $('checkoutEmpty').style.display = ''; $('checkoutLayout').style.display = 'none'; return; }

            var user = window.AppState && AppState.user;
            $('checkoutGuestNote').style.display = user ? 'none' : '';
            $('savedAddressBtn').style.display = user ? '' : 'none';
            balance = user && AppState.profile ? Number(AppState.profile.loyalty_points) || 0 : 0;
            var wrap = $('pointsWrap');
            if (user && balance > 0) {
                wrap.style.display = '';
                var cap = Math.floor(Cart.totals().subtotal * Number(Bestow.settings.loyalty_redeem_max_percent) / 100);
                var usable = Math.min(balance, cap);
                $('pointsLabel').textContent = T('checkout.points_label', { n: usable, amount: Utils.price(usable) });
            } else wrap.style.display = 'none';
            $('usePointsCheck').checked = false;
            fillFromProfile(false);
            await revalidateCoupon();
            renderSummary();
        },

        loadSuccess: async function (ctx) {
            var num = ctx.param, box = $('successContent');
            var last = Utils.storage.get('bestow_last_order', null);
            var order = null;
            if (window.AppState && AppState.user) {
                var r = await API.orders.mine(AppState.user.id);
                order = (r.data || []).find(function (o) { return o.order_number === num; }) || null;
            }
            var pending = last && last.order_number === num && last.pending;
            var email = (order && order.customer_email) || (last && last.email) || '';
            var total = order ? order.total_amount : (last && last.total) || 0;
            var eta = order && order.estimated_delivery ? Utils.date(order.estimated_delivery) : (function () { var e = Shop.etaRange(); return e.from + ' - ' + e.to; })();
            box.innerHTML =
                '<div class="success-card glass"><div class="success-badge">' + UI.icon('check', 'success-check') + '</div>' +
                '<h2>' + TX(pending ? 'success.processing_title' : 'success.title') + '</h2>' +
                '<p class="success-sub">' + TX('success.subtitle') + '</p>' +
                '<div class="success-grid"><div><span class="k">' + TX('success.number') + '</span><strong class="v">' + Utils.esc(num) + '</strong></div>' +
                '<div><span class="k">' + TX('success.total') + '</span><strong class="v">' + Utils.price(total) + '</strong></div>' +
                '<div><span class="k">' + TX('success.eta') + '</span><strong class="v">' + Utils.esc(eta) + '</strong></div></div>' +
                (email ? '<p class="success-note">' + UI.icon('mail-check', 'icon-sm') + ' ' + TX('success.email_note', { email: email }) + '</p>' : '') +
                (order && order.points_earned ? '<p class="success-note">' + UI.icon('star', 'icon-sm') + ' ' + TX('success.points', { n: order.points_earned }) + '</p>' : '') +
                '<div class="success-actions">' +
                '<button class="btn btn-primary" data-route="track-order">' + UI.icon('map-pin', 'icon-sm') + ' ' + TX('success.track') + '</button>' +
                (order ? '<button class="btn btn-outline" id="successInvoiceBtn">' + UI.icon('file-text', 'icon-sm') + ' ' + TX('success.invoice') + '</button>' : '') +
                '<button class="btn btn-ghost" id="successWaBtn">' + UI.icon('message-circle', 'icon-sm') + ' ' + TX('success.whatsapp') + '</button>' +
                '<button class="btn btn-ghost" data-route="shop">' + TX('success.continue') + '</button></div></div>';
            var inv = $('successInvoiceBtn');
            if (inv) inv.addEventListener('click', function () { Orders.downloadInvoice(order, inv); });
            $('successWaBtn').addEventListener('click', function () { WhatsApp.shareOrder(order || { order_number: num, total_amount: total, order_status: 'confirmed' }); });
            refreshIcons();
        },

        bind: function () {
            $('applyCouponBtn').addEventListener('click', applyCoupon);
            $('removeCouponBtn').addEventListener('click', removeCoupon);
            $('couponCodeInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } });
            $('payNowBtn').addEventListener('click', pay);
            $('checkoutForm').addEventListener('submit', function (e) { e.preventDefault(); pay(); });
            $('giftWrapCheck').addEventListener('change', function () { $('giftMessageWrap').style.display = this.checked ? '' : 'none'; renderSummary(); });
            $('usePointsCheck').addEventListener('change', renderSummary);
            $('savedAddressBtn').addEventListener('click', function () { fillFromProfile(true); UI.toast(T('checkout.address_filled'), 'success', 1800); });
            $('checkoutPincode').addEventListener('input', async function () {
                var v = this.value.replace(/\D/g, '').slice(0, 6); this.value = v;
                if (v.length === 6) {
                    var place = await Shop.lookupPincode(v);
                    if (place) { if (!$('checkoutCity').value) $('checkoutCity').value = place.city; if (!$('checkoutState').value) $('checkoutState').value = place.state; }
                }
            });
            document.addEventListener('cart:change', function () {
                if (Router.current().name === 'checkout' && !paying) { $('checkoutEmpty').style.display = Cart.items().length ? 'none' : ''; $('checkoutLayout').style.display = Cart.items().length ? '' : 'none'; renderSummary(); revalidateCoupon(); }
            });
        }
    };
    window.Checkout = Checkout;
})();
