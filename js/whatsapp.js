/* ==========================================================================
   BESTOW - WHATSAPP INTEGRATION (wa.me deep links, plain text messages)
   The number is editable by the admin under Settings.
   ========================================================================== */
(function () {
    'use strict';

    function number() { return String(Bestow.settings.whatsapp || '916382052530').replace(/\D/g, ''); }
    function link(message) { return 'https://wa.me/' + number() + (message ? '?text=' + encodeURIComponent(message) : ''); }
    function open(message) { window.open(link(message), '_blank', 'noopener'); }
    function site() { return location.href.split('#')[0]; }

    var WhatsApp = {
        link: link,
        open: open,
        chat: function () { open(Bestow.t('wa.greeting')); },

        orderProduct: function (p, qty, cz) {
            var lines = [Bestow.t('wa.product_intro'), '', 'Product: ' + p.name, 'Price: ' + Utils.price(p.price), 'Quantity: ' + (qty || 1)];
            if (cz && cz.fields) Object.keys(cz.fields).forEach(function (k) { if (cz.fields[k]) lines.push(k + ': ' + cz.fields[k]); });
            lines.push('', 'Link: ' + site() + '#product/' + p.id);
            open(lines.join('\n'));
        },

        orderCart: function () {
            var items = Cart.items();
            if (!items.length) { UI.toast(Bestow.t('cart.empty'), 'info'); return; }
            var t = Cart.totals();
            var lines = [Bestow.t('wa.cart_intro'), ''];
            items.forEach(function (i, n) {
                lines.push((n + 1) + '. ' + i.name + ' x ' + i.quantity + ' - ' + Utils.price(i.price * i.quantity));
                if (i.customization && i.customization.fields) Object.keys(i.customization.fields).forEach(function (k) { if (i.customization.fields[k]) lines.push('   ' + k + ': ' + i.customization.fields[k]); });
            });
            lines.push('', 'Subtotal: ' + Utils.price(t.subtotal));
            if (window.AppState && AppState.profile && AppState.profile.full_name) lines.push('Name: ' + AppState.profile.full_name);
            open(lines.join('\n'));
        },

        shareOrder: function (order) {
            var lines = [Bestow.t('wa.order_intro'), '', 'Order number: ' + order.order_number, 'Total: ' + Utils.price(order.total_amount), 'Status: ' + Utils.titleCase(order.order_status)];
            lines.push('', 'Track: ' + site() + '#track-order');
            open(lines.join('\n'));
        }
    };
    window.WhatsApp = WhatsApp;

    Bestow.define({
        'wa.greeting': 'Hello, I would like to know more about your customized gifts.',
        'wa.product_intro': 'Hello, I am interested in this product:',
        'wa.cart_intro': 'Hello, I would like to place this order:',
        'wa.order_intro': 'Hello, I have a question about my order.'
    }, 'whatsapp');

    document.addEventListener('DOMContentLoaded', function () {
        var f = document.getElementById('whatsappFloat');
        if (f) f.addEventListener('click', function (e) { e.preventDefault(); WhatsApp.chat(); });
    });
})();
