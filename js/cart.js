/* ==========================================================================
   BESTOW - SHOPPING CART
   Persistent, tab-synchronised, stock-aware cart with a free-shipping progress bar.
   ========================================================================== */
(function () {
    'use strict';

    var KEY = 'bestow_cart_v2';
    var T = function (k, v) { return Bestow.t(k, v); };

    Bestow.define({
        'cart.title': 'Your Cart',
        'cart.empty': 'Your cart is empty',
        'cart.empty_text': 'Add something memorable to get started.',
        'cart.empty_cta': 'Start Shopping',
        'cart.subtotal': 'Subtotal',
        'cart.note': 'Taxes and shipping are calculated at checkout',
        'cart.checkout': 'Proceed to Checkout',
        'cart.whatsapp': 'Order on WhatsApp',
        'cart.free_more': 'Add {amount} more for free shipping',
        'cart.free_done': 'You have unlocked free shipping',
        'cart.remove': 'Remove',
        'cart.personalised': 'Personalised',
        'cart.photo_attached': 'Photo attached',
        'cart.added': '{name} added to your cart',
        'cart.max_stock': 'Only {n} unit(s) available',
        'cart.out_of_stock': 'This product is out of stock',
        'cart.updated': 'Some items in your cart were updated to match current stock and prices',
        'cart.removed': 'Item removed from your cart',
        'cart.view': 'View cart'
    }, 'cart');

    function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return Math.abs(h).toString(36); }
    function lineKey(pid, cz) { return pid + (cz ? '|' + hash(JSON.stringify(cz)) : ''); }

    var items = Utils.storage.get(KEY, []);
    if (!Array.isArray(items)) items = [];

    function save() {
        Utils.storage.set(KEY, items);
        document.dispatchEvent(new CustomEvent('cart:change'));
    }

    function totals() {
        var sub = 0, count = 0;
        items.forEach(function (i) { sub += i.price * i.quantity; count += i.quantity; });
        var th = Number(Bestow.settings.free_shipping_threshold) || 0;
        return {
            subtotal: Math.round(sub * 100) / 100, count: count, lines: items.length,
            threshold: th, remaining: Math.max(th - sub, 0), progress: th > 0 ? Math.min(sub / th, 1) : 1
        };
    }

    function qtyOfProduct(pid) { var n = 0; items.forEach(function (i) { if (i.product_id === pid) n += i.quantity; }); return n; }

    var Cart = {
        items: function () { return items.slice(); },
        count: function () { return totals().count; },
        totals: totals,

        add: function (product, qty, customization) {
            qty = Math.max(1, parseInt(qty, 10) || 1);
            if (!product || !product.id) return false;
            if (product.stock_quantity <= 0) { UI.toast(T('cart.out_of_stock'), 'warning'); return false; }
            var hasCz = customization && ((customization.fields && Object.keys(customization.fields).length) || customization.photo_path);
            var cz = hasCz ? customization : null;
            var key = lineKey(product.id, cz);
            var existing = items.find(function (i) { return i.key === key; });
            var others = qtyOfProduct(product.id) - (existing ? existing.quantity : 0);
            var allowed = product.stock_quantity - others;
            var want = (existing ? existing.quantity : 0) + qty;
            if (want > allowed) {
                UI.toast(T('cart.max_stock', { n: product.stock_quantity }), 'warning');
                want = allowed;
                if (want <= 0) return false;
            }
            if (existing) { existing.quantity = want; existing.stock = product.stock_quantity; existing.price = Number(product.price); }
            else {
                items.push({
                    key: key, product_id: product.id, name: product.name, price: Number(product.price),
                    image: Utils.productImage(product), quantity: want, stock: product.stock_quantity,
                    customization: cz, category: product.categories ? product.categories.name : ''
                });
            }
            save();
            UI.toast(T('cart.added', { name: Utils.truncate(product.name, 40) }), 'success', 2200);
            var badge = document.querySelectorAll('.js-cart-btn');
            badge.forEach(function (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
            return true;
        },

        setQty: function (key, qty) {
            var it = items.find(function (i) { return i.key === key; });
            if (!it) return;
            qty = parseInt(qty, 10) || 0;
            if (qty <= 0) return Cart.remove(key);
            var others = qtyOfProduct(it.product_id) - it.quantity;
            var allowed = it.stock - others;
            if (qty > allowed) { UI.toast(T('cart.max_stock', { n: it.stock }), 'warning'); qty = Math.max(allowed, 1); }
            it.quantity = qty;
            save();
        },

        remove: function (key) { items = items.filter(function (i) { return i.key !== key; }); save(); },
        clear: function () { items = []; save(); },

        /* re-check price, stock and availability against the database */
        sync: async function () {
            if (!items.length) return;
            var ids = items.map(function (i) { return i.product_id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
            var r = await API.products.byIds(ids);
            if (!r.data) return;
            var map = {}; r.data.forEach(function (p) { map[p.id] = p; });
            var changed = false;
            items = items.filter(function (i) {
                var p = map[i.product_id];
                if (!p || !p.is_active || p.stock_quantity <= 0) { changed = true; return false; }
                if (Number(p.price) !== i.price) { i.price = Number(p.price); changed = true; }
                if (p.stock_quantity !== i.stock) { i.stock = p.stock_quantity; changed = true; }
                if (i.quantity > p.stock_quantity) { i.quantity = p.stock_quantity; changed = true; }
                i.name = p.name; i.image = Utils.productImage(p);
                return true;
            });
            if (changed) { save(); UI.toast(T('cart.updated'), 'info', 5000); }
        },

        open: function () {
            document.getElementById('cartSidebar').classList.add('open');
            document.getElementById('cartOverlay').classList.add('open');
            document.body.classList.add('no-scroll');
            Cart.render();
            Cart.sync();
            var c = document.getElementById('cartCloseBtn'); if (c) setTimeout(function () { c.focus(); }, 120);
        },
        close: function () {
            document.getElementById('cartSidebar').classList.remove('open');
            document.getElementById('cartOverlay').classList.remove('open');
            if (!document.querySelector('.modal-overlay.active')) document.body.classList.remove('no-scroll');
        },
        isOpen: function () { var s = document.getElementById('cartSidebar'); return !!(s && s.classList.contains('open')); },

        badge: function () {
            var n = totals().count;
            document.querySelectorAll('.js-cart-count').forEach(function (b) { b.textContent = n > 99 ? '99+' : n; b.classList.toggle('visible', n > 0); b.classList.remove('bump'); void b.offsetWidth; if (n > 0) b.classList.add('bump'); });
        },

        czSummary: function (cz) {
            if (!cz) return '';
            var out = [];
            Object.keys(cz.fields || {}).forEach(function (k) { if (cz.fields[k]) out.push(Utils.esc(k) + ': ' + Utils.esc(Utils.truncate(cz.fields[k], 60))); });
            if (cz.photo_path) out.push(Bestow.tx('cart.photo_attached'));
            return out.join(' &middot; ');
        },

        render: function () {
            var list = document.getElementById('cartItemsList');
            var empty = document.getElementById('cartEmpty');
            var footer = document.getElementById('cartSidebarFooter');
            if (!list) return;
            var t = totals();
            if (!items.length) {
                list.innerHTML = ''; empty.style.display = ''; footer.style.display = 'none';
                document.getElementById('cartShipBar').style.display = 'none';
                return;
            }
            empty.style.display = 'none'; footer.style.display = '';
            list.innerHTML = items.map(function (i) {
                var sum = Cart.czSummary(i.customization);
                return '<article class="cart-item" data-key="' + Utils.esc(i.key) + '">' +
                    '<a class="cart-item-img" href="#product/' + encodeURIComponent(i.product_id) + '" data-route="product" data-param="' + Utils.esc(i.product_id) + '"><img src="' + Utils.esc(i.image) + '" alt="' + Utils.esc(i.name) + '" loading="lazy"></a>' +
                    '<div class="cart-item-info">' +
                    '<a class="cart-item-name" href="#product/' + encodeURIComponent(i.product_id) + '" data-route="product" data-param="' + Utils.esc(i.product_id) + '">' + Utils.esc(i.name) + '</a>' +
                    (sum ? '<p class="cart-item-custom">' + UI.icon('sparkles', 'icon-xs') + ' ' + sum + '</p>' : '') +
                    '<p class="cart-item-price">' + Utils.price(i.price) + '</p>' +
                    '<div class="cart-item-actions">' +
                    '<div class="qty-stepper" role="group" aria-label="Quantity">' +
                    '<button type="button" data-cart-action="dec" aria-label="Decrease quantity">' + UI.icon('minus') + '</button>' +
                    '<span aria-live="polite">' + i.quantity + '</span>' +
                    '<button type="button" data-cart-action="inc" aria-label="Increase quantity">' + UI.icon('plus') + '</button></div>' +
                    '<button type="button" class="link-btn cart-item-remove" data-cart-action="remove">' + UI.icon('trash-2', 'icon-xs') + ' ' + Bestow.tx('cart.remove') + '</button>' +
                    '</div></div>' +
                    '<div class="cart-item-total">' + Utils.price(i.price * i.quantity) + '</div></article>';
            }).join('');

            document.getElementById('cartSubtotal').textContent = Utils.price(t.subtotal);
            var bar = document.getElementById('cartShipBar');
            if (t.threshold > 0) {
                bar.style.display = '';
                document.getElementById('cartShipText').innerHTML = t.remaining > 0
                    ? Bestow.tx('cart.free_more', { amount: Utils.price(t.remaining) })
                    : Bestow.tx('cart.free_done');
                document.getElementById('cartShipFill').style.width = (t.progress * 100) + '%';
                bar.classList.toggle('done', t.remaining <= 0);
            } else bar.style.display = 'none';
            refreshIcons();
        },

        bind: function () {
            var s = document.getElementById('cartSidebar');
            s.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-cart-action]');
                if (btn) {
                    var row = btn.closest('.cart-item'); if (!row) return;
                    var key = row.getAttribute('data-key');
                    var it = items.find(function (i) { return i.key === key; });
                    var a = btn.getAttribute('data-cart-action');
                    if (a === 'inc') Cart.setQty(key, it.quantity + 1);
                    else if (a === 'dec') Cart.setQty(key, it.quantity - 1);
                    else if (a === 'remove') { Cart.remove(key); UI.toast(T('cart.removed'), 'info', 1800); }
                    return;
                }
                if (e.target.closest('.cart-item-img, .cart-item-name')) Cart.close();
                if (e.target.closest('#cartEmpty [data-route]')) Cart.close();
            });
            document.getElementById('cartOverlay').addEventListener('click', Cart.close);
            document.getElementById('cartCloseBtn').addEventListener('click', Cart.close);
            document.getElementById('checkoutBtn').addEventListener('click', function () { Cart.close(); Router.go('checkout'); });
            document.getElementById('cartWhatsAppBtn').addEventListener('click', function () { WhatsApp.orderCart(); });
            document.querySelectorAll('.js-cart-btn').forEach(function (b) { b.addEventListener('click', function () { Cart.isOpen() ? Cart.close() : Cart.open(); }); });
            document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && Cart.isOpen()) Cart.close(); });
            document.addEventListener('cart:change', function () { Cart.badge(); if (Cart.isOpen()) Cart.render(); });
            window.addEventListener('storage', function (e) {
                if (e.key === KEY) { items = Utils.storage.get(KEY, []); Cart.badge(); if (Cart.isOpen()) Cart.render(); }
            });
            Cart.badge();
        }
    };
    window.Cart = Cart;
})();
