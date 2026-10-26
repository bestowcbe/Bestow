/* ==========================================================================
   BESTOW - SHOP: listing, filters, product page, quick view, wishlist,
   recently viewed, lightbox, pincode delivery check, stock alerts
   ========================================================================== */
(function () {
    'use strict';

    var T = function (k, v) { return Bestow.t(k, v); };
    var TX = function (k, v) { return Bestow.tx(k, v); };

    Bestow.define({
        'shop.results': '{n} Products',
        'shop.result_one': '1 Product',
        'shop.add': 'Add',
        'shop.view_options': 'Customize',
        'shop.out': 'Out of stock',
        'shop.sale': '{pct}% off',
        'shop.featured': 'Featured',
        'shop.customizable': 'Customizable',
        'shop.quick_view': 'Quick view',
        'shop.wishlist_add': 'Add to wishlist',
        'shop.wishlist_remove': 'Remove from wishlist',
        'shop.compare': 'Compare',
        'shop.wish_added': 'Saved to your wishlist',
        'shop.wish_removed': 'Removed from your wishlist',
        'shop.filter_chip_cat': 'Category: {v}',
        'shop.filter_chip_price': 'Price: {v}',
        'shop.filter_chip_rating': '{v}+ stars',
        'shop.filter_chip_stock': 'In stock',
        'shop.filter_chip_custom': 'Customizable',
        'shop.filter_chip_search': 'Search: {v}',
        'shop.load_error': 'We could not load products. Please try again.',
        'product.not_found': 'Product not found',
        'product.not_found_text': 'This product may have been removed or is no longer available.',
        'product.back_shop': 'Back to Shop',
        'product.in_stock': 'In stock',
        'product.low_stock': 'Only {n} left',
        'product.out_stock': 'Out of stock',
        'product.add_cart': 'Add to Cart',
        'product.buy_now': 'Buy Now',
        'product.qty': 'Quantity',
        'product.personalise': 'Personalise your gift',
        'product.personalise_hint': 'Your details are printed or engraved exactly as typed. Please check spelling carefully.',
        'product.required': 'Please fill in: {field}',
        'product.sign_in_photo': 'Please sign in to upload a photo for personalisation',
        'product.uploading': 'Uploading your photo',
        'product.upload_failed': 'Photo upload failed. Please try again.',
        'product.field_name': 'Name or text',
        'product.field_name_ph': 'For example, the name to engrave',
        'product.field_message': 'Message',
        'product.field_message_ph': 'Optional personal message',
        'product.field_photo': 'Photo',
        'product.photo_help': 'JPG or PNG. We will use it for your design.',
        'product.sku': 'SKU',
        'product.category': 'Category',
        'product.weight': 'Weight',
        'product.dimensions': 'Dimensions',
        'product.tags': 'Tags',
        'product.tab_desc': 'Description',
        'product.tab_reviews': 'Reviews',
        'product.tab_shipping': 'Shipping Info',
        'product.reviews_count': '{n} reviews',
        'product.no_reviews_yet': 'No reviews yet',
        'product.related': 'You May Also Like',
        'product.recent': 'Recently Viewed',
        'product.share': 'Share',
        'product.copied': 'Link copied to clipboard',
        'product.whatsapp': 'Order on WhatsApp',
        'product.delivery_title': 'Check delivery',
        'product.pincode_ph': 'Enter pincode',
        'product.check': 'Check',
        'product.delivery_ok': 'Delivering to {place}. Estimated arrival between {from} and {to}.',
        'product.delivery_generic': 'Estimated arrival between {from} and {to}.',
        'product.pincode_invalid': 'Enter a valid 6 digit pincode',
        'product.notify_title': 'Notify me when available',
        'product.notify_ph': 'Your email address',
        'product.notify_btn': 'Notify me',
        'product.notify_ok': 'We will email you as soon as it is back in stock',
        'product.notify_dup': 'You are already on the list for this product',
        'product.trust_pay': 'Secure payments by Razorpay',
        'product.trust_return': '7 day easy returns on eligible items',
        'product.trust_pack': 'Premium protective packaging',
        'product.save': 'You save {amount}',
        'wishlist.synced': 'Wishlist synced to your account'
    }, 'shop');

    /* ====================================================================
       WISHLIST
       ==================================================================== */
    var WL_KEY = 'bestow_wishlist';
    var wish = Utils.storage.get(WL_KEY, []);
    if (!Array.isArray(wish)) wish = [];

    var Wishlist = {
        ids: function () { return wish.slice(); },
        has: function (id) { return wish.indexOf(id) > -1; },
        count: function () { return wish.length; },
        toggle: function (id) {
            var i = wish.indexOf(id), added = i < 0;
            if (added) wish.push(id); else wish.splice(i, 1);
            Utils.storage.set(WL_KEY, wish);
            Wishlist.paint();
            Wishlist.push();
            UI.toast(T(added ? 'shop.wish_added' : 'shop.wish_removed'), added ? 'success' : 'info', 1800);
            if (Router.current().name === 'wishlist') Shop.loadWishlist();
            return added;
        },
        paint: function () {
            document.querySelectorAll('.js-wish-count').forEach(function (b) { b.textContent = wish.length; b.classList.toggle('visible', wish.length > 0); });
            document.querySelectorAll('[data-wish-id]').forEach(function (b) {
                var on = wish.indexOf(b.getAttribute('data-wish-id')) > -1;
                b.classList.toggle('active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
                b.setAttribute('title', T(on ? 'shop.wishlist_remove' : 'shop.wishlist_add'));
            });
        },
        push: Utils.debounce(function () {
            if (window.AppState && AppState.user) API.profile.update(AppState.user.id, { wishlist: wish });
        }, 900),
        /* called after sign-in: merge local and account wishlists */
        merge: async function (profile) {
            if (!profile) return;
            var remote = Array.isArray(profile.wishlist) ? profile.wishlist : [];
            var merged = remote.slice();
            wish.forEach(function (id) { if (merged.indexOf(id) < 0) merged.push(id); });
            var changed = merged.length !== remote.length;
            wish = merged;
            Utils.storage.set(WL_KEY, wish);
            Wishlist.paint();
            if (changed && AppState.user) await API.profile.update(AppState.user.id, { wishlist: wish });
        }
    };
    window.Wishlist = Wishlist;

    /* ====================================================================
       RECENTLY VIEWED
       ==================================================================== */
    var RV_KEY = 'bestow_recent';
    var Recent = {
        get: function () { var r = Utils.storage.get(RV_KEY, []); return Array.isArray(r) ? r : []; },
        add: function (p) {
            var list = Recent.get().filter(function (x) { return x.id !== p.id; });
            list.unshift({ id: p.id, name: p.name, price: p.price, image: Utils.productImage(p) });
            Utils.storage.set(RV_KEY, list.slice(0, 10));
        },
        render: function (containerId, excludeId) {
            var box = document.getElementById(containerId); if (!box) return;
            var list = Recent.get().filter(function (x) { return x.id !== excludeId; }).slice(0, 6);
            var wrap = box.closest('.recent-section');
            if (!list.length) { if (wrap) wrap.style.display = 'none'; return; }
            if (wrap) wrap.style.display = '';
            box.innerHTML = list.map(function (x) {
                return '<a class="recent-card glass" href="#product/' + encodeURIComponent(x.id) + '" data-route="product" data-param="' + Utils.esc(x.id) + '">' +
                    '<img src="' + Utils.esc(x.image) + '" alt="' + Utils.esc(x.name) + '" loading="lazy"><span class="recent-name">' + Utils.esc(Utils.truncate(x.name, 34)) + '</span><span class="recent-price">' + Utils.price(x.price) + '</span></a>';
            }).join('');
        }
    };
    window.Recent = Recent;

    /* ====================================================================
       LIGHTBOX
       ==================================================================== */
    var LB = { list: [], i: 0 };
    var Lightbox = {
        open: function (src, list) {
            LB.list = list && list.length ? list : [src];
            LB.i = Math.max(0, LB.list.indexOf(src));
            Lightbox.show();
            document.getElementById('lightbox').classList.add('active');
            document.body.classList.add('no-scroll');
        },
        show: function () {
            var img = document.getElementById('lightboxImg');
            img.src = LB.list[LB.i];
            var multi = LB.list.length > 1;
            document.getElementById('lightboxPrev').style.display = multi ? '' : 'none';
            document.getElementById('lightboxNext').style.display = multi ? '' : 'none';
        },
        step: function (d) { LB.i = (LB.i + d + LB.list.length) % LB.list.length; Lightbox.show(); },
        close: function () {
            document.getElementById('lightbox').classList.remove('active');
            if (!document.querySelector('.modal-overlay.active') && !Cart.isOpen()) document.body.classList.remove('no-scroll');
        },
        bind: function () {
            var lb = document.getElementById('lightbox'); if (!lb) return;
            document.getElementById('lightboxClose').addEventListener('click', Lightbox.close);
            document.getElementById('lightboxPrev').addEventListener('click', function () { Lightbox.step(-1); });
            document.getElementById('lightboxNext').addEventListener('click', function () { Lightbox.step(1); });
            lb.addEventListener('click', function (e) { if (e.target === lb) Lightbox.close(); });
            document.addEventListener('keydown', function (e) {
                if (!lb.classList.contains('active')) return;
                if (e.key === 'Escape') Lightbox.close();
                if (e.key === 'ArrowLeft') Lightbox.step(-1);
                if (e.key === 'ArrowRight') Lightbox.step(1);
            });
            var sx = 0;
            lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
            lb.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50 && LB.list.length > 1) Lightbox.step(dx > 0 ? -1 : 1); });
        }
    };
    window.Lightbox = Lightbox;

    /* ====================================================================
       SHOP
       ==================================================================== */
    var PAGE_SIZE = 12;
    var state = { search: '', cat: '', min: 0, max: 0, rating: 0, stock: false, custom: false, sort: 'newest', page: 1, view: Utils.storage.get('bestow_view', 'grid') };
    var reqId = 0;
    var cache = {};
    var viewedThisSession = {};

    function money(n) { return Utils.price(n); }

    function remember(list) { (list || []).forEach(function (p) { cache[p.id] = p; }); }

    function skeleton(box, n) { if (box) box.innerHTML = UI.skeletonCards(n || 6); }

    /* ---------- product card ---------- */
    function card(p) {
        var out = p.stock_quantity <= 0;
        var pct = Utils.discountPct(p.compare_price, p.price);
        var catName = p.categories ? p.categories.name : '';
        var href = '#product/' + encodeURIComponent(p.id);
        var badges = '';
        if (out) badges += '<span class="badge-pill badge-dark">' + TX('shop.out') + '</span>';
        else if (pct) badges += '<span class="badge-pill badge-red">' + TX('shop.sale', { pct: pct }) + '</span>';
        if (!out && p.is_featured) badges += '<span class="badge-pill badge-glass">' + TX('shop.featured') + '</span>';
        var action = out
            ? '<button type="button" class="btn btn-outline btn-sm" data-act="view">' + TX('shop.quick_view') + '</button>'
            : (p.is_customizable
                ? '<button type="button" class="btn btn-primary btn-sm" data-act="customize">' + UI.icon('sparkles', 'icon-xs') + ' ' + TX('shop.view_options') + '</button>'
                : '<button type="button" class="btn btn-primary btn-sm" data-act="add">' + UI.icon('shopping-bag', 'icon-xs') + ' ' + TX('shop.add') + '</button>');
        return '<article class="product-card' + (out ? ' is-out' : '') + '" data-id="' + Utils.esc(p.id) + '">' +
            '<div class="product-card-media">' +
            '<a href="' + href + '" data-route="product" data-param="' + Utils.esc(p.id) + '" tabindex="-1" aria-hidden="true"><img src="' + Utils.esc(Utils.productImage(p)) + '" alt="' + Utils.esc(p.name) + '" loading="lazy" decoding="async"></a>' +
            '<div class="product-card-badges">' + badges + '</div>' +
            '<div class="product-card-tools">' +
            '<button type="button" class="tool-btn" data-act="wish" data-wish-id="' + Utils.esc(p.id) + '" aria-label="' + Utils.esc(T('shop.wishlist_add')) + '">' + UI.icon('heart') + '</button>' +
            '<button type="button" class="tool-btn" data-act="quick" aria-label="' + Utils.esc(T('shop.quick_view')) + '" title="' + Utils.esc(T('shop.quick_view')) + '">' + UI.icon('eye') + '</button>' +
            '<button type="button" class="tool-btn" data-act="compare" data-compare-id="' + Utils.esc(p.id) + '" aria-label="' + Utils.esc(T('shop.compare')) + '" title="' + Utils.esc(T('shop.compare')) + '">' + UI.icon('scale') + '</button>' +
            '</div></div>' +
            '<div class="product-card-body">' +
            (catName ? '<span class="product-card-cat">' + Utils.esc(catName) + '</span>' : '') +
            '<h3 class="product-card-title"><a href="' + href + '" data-route="product" data-param="' + Utils.esc(p.id) + '">' + Utils.esc(p.name) + '</a></h3>' +
            '<div class="product-card-rating">' + Utils.stars(p.avg_rating) + '<span class="rating-count">(' + (p.review_count || 0) + ')</span></div>' +
            (p.short_description ? '<p class="product-card-desc">' + Utils.esc(Utils.truncate(p.short_description, 120)) + '</p>' : '') +
            '<div class="product-card-foot"><div class="price-wrap"><span class="price">' + money(p.price) + '</span>' +
            (pct ? '<del class="price-compare">' + money(p.compare_price) + '</del>' : '') + '</div>' + action + '</div></div></article>';
    }

    function renderGrid(box, list) {
        if (!box) return;
        remember(list);
        box.innerHTML = list.map(card).join('');
        Wishlist.paint();
        if (window.Compare) Compare.paint();
        refreshIcons();
    }

    /* ---------- delegated card actions ---------- */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.product-card [data-act]');
        if (!btn) return;
        var cardEl = btn.closest('.product-card'); var id = cardEl.getAttribute('data-id');
        var act = btn.getAttribute('data-act');
        e.preventDefault(); e.stopPropagation();
        if (act === 'wish') Wishlist.toggle(id);
        else if (act === 'quick') Shop.quickView(id);
        else if (act === 'compare') { if (window.Compare) Compare.toggle(id, cache[id]); }
        else if (act === 'customize' || act === 'view') Router.go('product', id);
        else if (act === 'add') { var p = cache[id]; if (p) Cart.add(p, 1); }
    });

    /* ---------- pagination ---------- */
    function renderPagination(total) {
        var box = document.getElementById('shopPagination');
        var pages = Math.ceil(total / PAGE_SIZE);
        if (pages <= 1) { box.innerHTML = ''; return; }
        var p = state.page, h = '';
        var btn = function (n, label, cls, disabled) { return '<button type="button" class="page-btn ' + (cls || '') + '" data-page="' + n + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>'; };
        h += btn(p - 1, UI.icon('chevron-left'), '', p === 1);
        var nums = [];
        for (var i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - p) <= 1) nums.push(i);
        var last = 0;
        nums.forEach(function (n) {
            if (last && n - last > 1) h += '<span class="page-gap">&hellip;</span>';
            h += btn(n, n, n === p ? 'active' : '');
            last = n;
        });
        h += btn(p + 1, UI.icon('chevron-right'), '', p === pages);
        box.innerHTML = h;
        refreshIcons();
    }

    /* ---------- filters ---------- */
    function syncControls() {
        var setVal = function (id, v) { var el = document.getElementById(id); if (el) el.value = v; };
        setVal('priceMin', state.min || ''); setVal('priceMax', state.max || '');
        setVal('shopSortSelect', state.sort);
        var s = document.getElementById('filterInStock'); if (s) s.checked = state.stock;
        var c = document.getElementById('filterCustomizable'); if (c) c.checked = state.custom;
        document.querySelectorAll('input[name="category"]').forEach(function (r) { r.checked = (r.value || '') === (state.cat || ''); });
        document.querySelectorAll('input[name="rating"]').forEach(function (r) { r.checked = Number(r.value) === Number(state.rating || 0); });
        document.querySelectorAll('.view-toggle-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === state.view); });
        var g = document.getElementById('shopProductsGrid'); if (g) g.classList.toggle('list-view', state.view === 'list');
    }

    function chips() {
        var box = document.getElementById('shopActiveFilters'); if (!box) return;
        var list = [];
        var add = function (key, text) { list.push('<button type="button" class="chip" data-clear="' + key + '">' + text + UI.icon('x', 'icon-xs') + '</button>'); };
        if (state.search) add('search', TX('shop.filter_chip_search', { v: Utils.esc(state.search) }));
        if (state.cat) { var c = (Shop.categories || []).find(function (x) { return x.slug === state.cat; }); add('cat', TX('shop.filter_chip_cat', { v: c ? c.name : state.cat })); }
        if (state.min || state.max) add('price', TX('shop.filter_chip_price', { v: (state.min ? money(state.min) : '0') + ' - ' + (state.max ? money(state.max) : 'Any') }));
        if (state.rating) add('rating', TX('shop.filter_chip_rating', { v: state.rating }));
        if (state.stock) add('stock', TX('shop.filter_chip_stock'));
        if (state.custom) add('custom', TX('shop.filter_chip_custom'));
        box.innerHTML = list.join('');
        box.style.display = list.length ? '' : 'none';
        refreshIcons();
    }

    function writeUrl() {
        Router.setQuery({
            q: state.search, cat: state.cat, min: state.min || '', max: state.max || '', rating: state.rating || '',
            stock: state.stock ? 1 : '', custom: state.custom ? 1 : '', sort: state.sort !== 'newest' ? state.sort : '', page: state.page > 1 ? state.page : ''
        });
    }

    async function loadProducts(scroll) {
        var box = document.getElementById('shopProductsGrid');
        var empty = document.getElementById('shopEmpty');
        var my = ++reqId;
        skeleton(box, 6); empty.style.display = 'none';
        var cat = state.cat ? (Shop.categories || []).find(function (c) { return c.slug === state.cat; }) : null;
        var r = await API.products.list({
            page: state.page, limit: PAGE_SIZE, search: state.search, categoryId: cat ? cat.id : '', minPrice: state.min, maxPrice: state.max,
            minRating: state.rating, inStock: state.stock, customizable: state.custom, sort: state.sort
        });
        if (my !== reqId) return;
        chips();
        var countEl = document.getElementById('shopResultCount');
        if (r.error) {
            box.innerHTML = ''; empty.style.display = '';
            empty.querySelector('[data-role="text"]').textContent = T('shop.load_error');
            countEl.textContent = '';
            return;
        }
        var total = r.count || 0;
        countEl.textContent = total === 1 ? T('shop.result_one') : T('shop.results', { n: total });
        if (!r.data.length) { box.innerHTML = ''; empty.style.display = ''; empty.querySelector('[data-role="text"]').textContent = Bestow.t('shop.empty_text'); document.getElementById('shopPagination').innerHTML = ''; return; }
        renderGrid(box, r.data);
        renderPagination(total);
        if (scroll) { var top = document.getElementById('shopToolbar'); if (top) window.scrollTo({ top: top.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' }); }
    }

    function resetFilters() {
        state.search = ''; state.cat = ''; state.min = 0; state.max = 0; state.rating = 0; state.stock = false; state.custom = false; state.page = 1;
        var si = document.getElementById('searchInput'); if (si) si.value = '';
        syncControls(); writeUrl(); loadProducts();
    }

    function bindShop() {
        var on = function (id, ev, fn) { var el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
        on('shopSortSelect', 'change', function (e) { state.sort = e.target.value; state.page = 1; writeUrl(); loadProducts(); });
        on('applyPriceFilter', 'click', function () {
            state.min = Math.max(0, parseFloat(document.getElementById('priceMin').value) || 0);
            state.max = Math.max(0, parseFloat(document.getElementById('priceMax').value) || 0);
            if (state.max && state.min > state.max) { var t = state.min; state.min = state.max; state.max = t; syncControls(); }
            state.page = 1; writeUrl(); loadProducts();
        });
        on('filterInStock', 'change', function (e) { state.stock = e.target.checked; state.page = 1; writeUrl(); loadProducts(); });
        on('filterCustomizable', 'change', function (e) { state.custom = e.target.checked; state.page = 1; writeUrl(); loadProducts(); });
        on('clearFiltersBtn', 'click', resetFilters);
        on('resetShopBtn', 'click', resetFilters);
        document.getElementById('shopSidebar').addEventListener('change', function (e) {
            if (e.target.name === 'category') { state.cat = e.target.value || ''; state.page = 1; writeUrl(); loadProducts(); closeFilterDrawer(); }
            if (e.target.name === 'rating') { state.rating = Number(e.target.value) || 0; state.page = 1; writeUrl(); loadProducts(); }
        });
        document.getElementById('shopSidebar').addEventListener('click', function (e) {
            var h = e.target.closest('[data-collapse]');
            if (h) { var body = document.getElementById(h.getAttribute('data-collapse')); var open = body.classList.toggle('collapsed'); h.classList.toggle('collapsed', open); }
        });
        document.querySelectorAll('.view-toggle-btn').forEach(function (b) {
            b.addEventListener('click', function () { state.view = b.getAttribute('data-view'); Utils.storage.set('bestow_view', state.view); syncControls(); });
        });
        document.getElementById('shopPagination').addEventListener('click', function (e) {
            var b = e.target.closest('[data-page]'); if (!b || b.disabled) return;
            state.page = parseInt(b.getAttribute('data-page'), 10) || 1; writeUrl(); loadProducts(true);
        });
        document.getElementById('shopActiveFilters').addEventListener('click', function (e) {
            var c = e.target.closest('[data-clear]'); if (!c) return;
            var k = c.getAttribute('data-clear');
            if (k === 'search') { state.search = ''; var si = document.getElementById('searchInput'); if (si) si.value = ''; }
            if (k === 'cat') state.cat = '';
            if (k === 'price') { state.min = 0; state.max = 0; }
            if (k === 'rating') state.rating = 0;
            if (k === 'stock') state.stock = false;
            if (k === 'custom') state.custom = false;
            state.page = 1; syncControls(); writeUrl(); loadProducts();
        });
        on('mobileFilterBtn', 'click', function () { document.getElementById('shopSidebar').classList.add('open'); document.getElementById('filterBackdrop').classList.add('open'); document.body.classList.add('no-scroll'); });
        on('filterCloseBtn', 'click', closeFilterDrawer);
        on('filterBackdrop', 'click', closeFilterDrawer);
    }
    function closeFilterDrawer() {
        document.getElementById('shopSidebar').classList.remove('open');
        document.getElementById('filterBackdrop').classList.remove('open');
        if (!document.querySelector('.modal-overlay.active') && !Cart.isOpen()) document.body.classList.remove('no-scroll');
    }

    /* ---------- delivery estimate ---------- */
    function etaRange() {
        var s = Bestow.settings, d = new Date(), a = new Date(d.getTime() + s.estimated_days_min * 86400000), b = new Date(d.getTime() + s.estimated_days_max * 86400000);
        var f = function (x) { return x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
        return { from: f(a), to: f(b) };
    }

    var pinCache = {};
    async function lookupPincode(pin) {
        if (!Utils.isPincode(pin)) return null;
        if (pinCache[pin] !== undefined) return pinCache[pin];
        try {
            var ctl = new AbortController(); var to = setTimeout(function () { ctl.abort(); }, 5000);
            var res = await fetch('https://api.postalpincode.in/pincode/' + pin, { signal: ctl.signal });
            clearTimeout(to);
            var j = await res.json();
            var po = j && j[0] && j[0].Status === 'Success' && j[0].PostOffice && j[0].PostOffice[0];
            pinCache[pin] = po ? { city: po.District, state: po.State, area: po.Name } : null;
        } catch (e) { pinCache[pin] = null; }
        return pinCache[pin];
    }

    /* ---------- customization ---------- */
    function czFields(p) {
        if (!p.is_customizable) return [];
        var o = Array.isArray(p.customization_options) ? p.customization_options.filter(function (x) { return x && x.label; }) : [];
        if (!o.length) o = [
            { label: T('product.field_name'), type: 'text', required: true, placeholder: T('product.field_name_ph'), max: 60 },
            { label: T('product.field_message'), type: 'textarea', required: false, placeholder: T('product.field_message_ph'), max: 200 },
            { label: T('product.field_photo'), type: 'photo', required: false }
        ];
        return o;
    }

    function czForm(p) {
        var f = czFields(p); if (!f.length) return '';
        var h = '<fieldset class="cz-box glass-soft" id="czBox"><legend>' + UI.icon('sparkles', 'icon-sm') + ' ' + TX('product.personalise') + '</legend><p class="cz-hint">' + TX('product.personalise_hint') + '</p>';
        f.forEach(function (o, i) {
            var id = 'cz_' + i, req = o.required ? ' required' : '', lab = '<label for="' + id + '">' + Utils.esc(o.label) + (o.required ? ' <span class="req">*</span>' : '') + '</label>';
            if (o.type === 'textarea') h += '<div class="form-group">' + lab + '<textarea id="' + id + '" rows="3" maxlength="' + (o.max || 300) + '" placeholder="' + Utils.esc(o.placeholder || '') + '"' + req + '></textarea></div>';
            else if (o.type === 'select') h += '<div class="form-group">' + lab + '<select id="' + id + '"' + req + '><option value="">Select</option>' + (o.options || []).map(function (x) { return '<option>' + Utils.esc(x) + '</option>'; }).join('') + '</select></div>';
            else if (o.type === 'photo') h += '<div class="form-group">' + lab + '<label class="file-drop" for="' + id + '">' + UI.icon('upload-cloud', 'icon-md') + '<span id="' + id + '_name">' + TX('product.photo_help') + '</span></label><input type="file" id="' + id + '" accept="image/*" class="file-input-hidden"' + req + '></div>';
            else h += '<div class="form-group">' + lab + '<input type="text" id="' + id + '" maxlength="' + (o.max || 100) + '" placeholder="' + Utils.esc(o.placeholder || '') + '"' + req + '></div>';
        });
        return h + '</fieldset>';
    }

    /* returns { fields, photo_path } or null when validation fails */
    async function collectCustomization(p, btn) {
        var f = czFields(p); if (!f.length) return {};
        var fields = {}, photo = '';
        for (var i = 0; i < f.length; i++) {
            var o = f[i], el = document.getElementById('cz_' + i); if (!el) continue;
            if (o.type === 'photo') {
                var file = el.files && el.files[0];
                if (!file && o.required) { UI.toast(T('product.required', { field: o.label }), 'warning'); el.closest('.form-group').scrollIntoView({ behavior: 'smooth', block: 'center' }); return null; }
                if (file) {
                    if (!(window.AppState && AppState.user)) { UI.toast(T('product.sign_in_photo'), 'warning'); UI.openModal('authModal'); return null; }
                    if (file.size > 12 * 1024 * 1024) { UI.toast('Please choose an image under 12 MB', 'warning'); return null; }
                    UI.setLoading(btn, true, T('product.uploading'));
                    var small = await Utils.compressImage(file, 1800, 0.88);
                    var up = await API.storage.upload('customizations', AppState.user.id, small);
                    UI.setLoading(btn, false);
                    if (up.error) { UI.toast(T('product.upload_failed'), 'error'); return null; }
                    photo = up.data.path;
                }
            } else {
                var v = (el.value || '').trim();
                if (!v && o.required) { UI.toast(T('product.required', { field: o.label }), 'warning'); el.focus(); return null; }
                if (v) fields[o.label] = v;
            }
        }
        return { fields: fields, photo_path: photo || undefined };
    }

    /* ---------- product page ---------- */
    var cur = { product: null, images: [], idx: 0, qty: 1 };

    function stockBadge(p) {
        if (p.stock_quantity <= 0) return '<span class="stock-tag stock-out">' + UI.icon('x-circle', 'icon-xs') + ' ' + TX('product.out_stock') + '</span>';
        if (p.stock_quantity <= (p.low_stock_threshold || 5)) return '<span class="stock-tag stock-low">' + UI.icon('alert-triangle', 'icon-xs') + ' ' + TX('product.low_stock', { n: p.stock_quantity }) + '</span>';
        return '<span class="stock-tag stock-ok">' + UI.icon('check-circle', 'icon-xs') + ' ' + TX('product.in_stock') + '</span>';
    }

    function renderProduct(p) {
        var imgs = (p.images && p.images.length ? p.images : (p.thumbnail ? [p.thumbnail] : [])).filter(Boolean);
        if (!imgs.length) imgs = [Utils.PLACEHOLDER];
        cur = { product: p, images: imgs, idx: 0, qty: 1 };
        var pct = Utils.discountPct(p.compare_price, p.price);
        var out = p.stock_quantity <= 0;
        var eta = etaRange();
        var h = '<div class="pd-gallery">' +
            '<div class="pd-main glass" id="pdMain"><img id="pdMainImg" src="' + Utils.esc(imgs[0]) + '" alt="' + Utils.esc(p.name) + '" decoding="async">' +
            (pct ? '<span class="badge-pill badge-red pd-badge">' + TX('shop.sale', { pct: pct }) + '</span>' : '') +
            (imgs.length > 1 ? '<button type="button" class="pd-nav pd-prev" data-pd="prev" aria-label="Previous image">' + UI.icon('chevron-left') + '</button><button type="button" class="pd-nav pd-next" data-pd="next" aria-label="Next image">' + UI.icon('chevron-right') + '</button>' : '') +
            '<button type="button" class="pd-zoom" data-pd="zoom" aria-label="Enlarge image">' + UI.icon('maximize-2') + '</button></div>' +
            (imgs.length > 1 ? '<div class="pd-thumbs">' + imgs.map(function (s, i) { return '<button type="button" class="pd-thumb' + (i === 0 ? ' active' : '') + '" data-thumb="' + i + '" aria-label="Image ' + (i + 1) + '"><img src="' + Utils.esc(s) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '') +
            '</div>' +
            '<div class="pd-info">' +
            (p.categories ? '<a class="pd-cat" href="#shop" data-route="shop" data-query="cat=' + Utils.esc(p.categories.slug) + '">' + Utils.esc(p.categories.name) + '</a>' : '') +
            '<h1 class="pd-title">' + Utils.esc(p.name) + '</h1>' +
            '<div class="pd-rating">' + Utils.stars(p.avg_rating) + '<a href="#" class="pd-rating-link" data-pd="reviews">' + (p.review_count ? TX('product.reviews_count', { n: p.review_count }) : TX('product.no_reviews_yet')) + '</a></div>' +
            '<div class="pd-price-row"><span class="pd-price">' + money(p.price) + '</span>' + (pct ? '<del class="price-compare">' + money(p.compare_price) + '</del><span class="pd-save">' + TX('product.save', { amount: money(p.compare_price - p.price) }) + '</span>' : '') + '</div>' +
            '<div class="pd-stock">' + stockBadge(p) + '</div>' +
            (p.short_description ? '<p class="pd-short">' + Utils.esc(p.short_description) + '</p>' : '') +
            (out ? notifyForm(p) : czForm(p) +
                '<div class="pd-buy"><div class="pd-qty"><span class="pd-qty-label">' + TX('product.qty') + '</span><div class="qty-stepper qty-lg"><button type="button" data-pd="qminus" aria-label="Decrease quantity">' + UI.icon('minus') + '</button><span id="pdQty" aria-live="polite">1</span><button type="button" data-pd="qplus" aria-label="Increase quantity">' + UI.icon('plus') + '</button></div></div>' +
                '<div class="pd-buttons"><button type="button" class="btn btn-primary btn-lg" id="pdAdd" data-pd="add">' + UI.icon('shopping-bag', 'icon-sm') + ' ' + TX('product.add_cart') + '</button>' +
                '<button type="button" class="btn btn-dark btn-lg" id="pdBuy" data-pd="buy">' + UI.icon('zap', 'icon-sm') + ' ' + TX('product.buy_now') + '</button></div></div>') +
            '<div class="pd-secondary">' +
            '<button type="button" class="btn btn-ghost" data-wish-id="' + Utils.esc(p.id) + '" data-pd="wish">' + UI.icon('heart', 'icon-sm') + '</button>' +
            '<button type="button" class="btn btn-ghost" data-pd="compare" data-compare-id="' + Utils.esc(p.id) + '">' + UI.icon('scale', 'icon-sm') + ' ' + TX('shop.compare') + '</button>' +
            '<button type="button" class="btn btn-ghost" data-pd="share">' + UI.icon('share-2', 'icon-sm') + ' ' + TX('product.share') + '</button>' +
            '<button type="button" class="btn btn-ghost" data-pd="whatsapp">' + UI.icon('message-circle', 'icon-sm') + ' ' + TX('product.whatsapp') + '</button></div>' +
            '<div class="pd-delivery glass-soft"><h4>' + UI.icon('truck', 'icon-sm') + ' ' + TX('product.delivery_title') + '</h4>' +
            '<form class="pin-form" id="pinForm"><input type="text" id="pinInput" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="' + Utils.esc(T('product.pincode_ph')) + '" aria-label="Pincode"><button class="btn btn-outline btn-sm" type="submit">' + TX('product.check') + '</button></form>' +
            '<p class="pin-result" id="pinResult">' + TX('product.delivery_generic', eta) + '</p></div>' +
            '<ul class="pd-trust"><li>' + UI.icon('shield-check', 'icon-sm') + ' ' + TX('product.trust_pay') + '</li><li>' + UI.icon('refresh-cw', 'icon-sm') + ' ' + TX('product.trust_return') + '</li><li>' + UI.icon('package', 'icon-sm') + ' ' + TX('product.trust_pack') + '</li></ul>' +
            '</div>';
        document.getElementById('productDetail').innerHTML = h;
        document.getElementById('productBreadcrumbName').textContent = p.name;

        /* description + specs tab */
        var specs = [];
        if (p.sku) specs.push([T('product.sku'), p.sku]);
        if (p.categories) specs.push([T('product.category'), p.categories.name]);
        if (Number(p.weight) > 0) specs.push([T('product.weight'), p.weight + ' g']);
        var d = p.dimensions || {};
        if (d.length || d.width || d.height) specs.push([T('product.dimensions'), [d.length, d.width, d.height].filter(Boolean).join(' x ') + ' cm']);
        if (p.tags && p.tags.length) specs.push([T('product.tags'), p.tags.join(', ')]);
        document.getElementById('tabDescription').innerHTML =
            '<div class="prose">' + (p.description ? Utils.multiline(p.description) : '<p>' + Utils.esc(p.short_description || '') + '</p>') + '</div>' +
            (specs.length ? '<table class="spec-table">' + specs.map(function (s) { return '<tr><th>' + Utils.esc(s[0]) + '</th><td>' + Utils.esc(s[1]) + '</td></tr>'; }).join('') + '</table>' : '');

        Wishlist.paint(); if (window.Compare) Compare.paint();
        refreshIcons();
        jsonLd(p);
    }

    function notifyForm(p) {
        var email = window.AppState && AppState.profile ? AppState.profile.email : '';
        return '<form class="notify-box glass-soft" id="notifyForm" data-id="' + Utils.esc(p.id) + '"><h4>' + UI.icon('bell', 'icon-sm') + ' ' + TX('product.notify_title') + '</h4>' +
            '<div class="input-with-btn"><input type="email" id="notifyEmail" required value="' + Utils.esc(email) + '" placeholder="' + Utils.esc(T('product.notify_ph')) + '" aria-label="Email"><button class="btn btn-primary" type="submit">' + TX('product.notify_btn') + '</button></div></form>';
    }

    function jsonLd(p) {
        var old = document.getElementById('ldProduct'); if (old) old.remove();
        var s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ldProduct';
        var data = {
            '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: p.images && p.images.length ? p.images : undefined,
            description: p.short_description || p.description || undefined, sku: p.sku || undefined,
            brand: { '@type': 'Brand', name: Bestow.branding.brand_name },
            offers: { '@type': 'Offer', priceCurrency: 'INR', price: String(p.price), availability: p.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: location.href }
        };
        if (p.review_count > 0) data.aggregateRating = { '@type': 'AggregateRating', ratingValue: String(p.avg_rating), reviewCount: String(p.review_count) };
        s.textContent = JSON.stringify(data); document.head.appendChild(s);
    }

    function setImage(i) {
        cur.idx = (i + cur.images.length) % cur.images.length;
        var img = document.getElementById('pdMainImg'); if (img) img.src = cur.images[cur.idx];
        document.querySelectorAll('.pd-thumb').forEach(function (t, n) { t.classList.toggle('active', n === cur.idx); });
    }

    function bindProductPage() {
        var det = document.getElementById('productDetail');
        det.addEventListener('click', async function (e) {
            var th = e.target.closest('[data-thumb]'); if (th) { setImage(parseInt(th.getAttribute('data-thumb'), 10)); return; }
            var b = e.target.closest('[data-pd]'); if (!b) return;
            var a = b.getAttribute('data-pd'), p = cur.product; if (!p) return;
            if (a === 'prev') setImage(cur.idx - 1);
            else if (a === 'next') setImage(cur.idx + 1);
            else if (a === 'zoom') Lightbox.open(cur.images[cur.idx], cur.images);
            else if (a === 'reviews') { e.preventDefault(); switchTab('reviews'); document.querySelector('.product-tabs').scrollIntoView({ behavior: 'smooth' }); }
            else if (a === 'qminus') { cur.qty = Math.max(1, cur.qty - 1); document.getElementById('pdQty').textContent = cur.qty; }
            else if (a === 'qplus') { if (cur.qty >= p.stock_quantity) UI.toast(T('cart.max_stock', { n: p.stock_quantity }), 'warning'); else { cur.qty++; document.getElementById('pdQty').textContent = cur.qty; } }
            else if (a === 'add' || a === 'buy') {
                var cz = await collectCustomization(p, b); if (cz === null) return;
                if (Cart.add(p, cur.qty, cz.fields && (Object.keys(cz.fields).length || cz.photo_path) ? cz : null) && a === 'buy') Router.go('checkout');
            }
            else if (a === 'wish') Wishlist.toggle(p.id);
            else if (a === 'compare') { if (window.Compare) Compare.toggle(p.id, p); }
            else if (a === 'share') Shop.share(p);
            else if (a === 'whatsapp') { var c2 = await collectCustomization(p, b); if (c2 === null) return; WhatsApp.orderProduct(p, cur.qty, c2); }
        });
        det.addEventListener('submit', async function (e) {
            if (e.target.id === 'pinForm') {
                e.preventDefault();
                var pin = document.getElementById('pinInput').value.trim(), out = document.getElementById('pinResult'), eta = etaRange();
                if (!Utils.isPincode(pin)) { out.textContent = T('product.pincode_invalid'); out.className = 'pin-result bad'; return; }
                out.textContent = '...'; var place = await lookupPincode(pin);
                out.className = 'pin-result good';
                out.textContent = place ? T('product.delivery_ok', { place: place.city + ', ' + place.state, from: eta.from, to: eta.to }) : T('product.delivery_generic', eta);
            }
            if (e.target.id === 'notifyForm') {
                e.preventDefault();
                var r = await API.products.alertMe(e.target.getAttribute('data-id'), document.getElementById('notifyEmail').value.trim());
                if (r.error && /duplicate|23505/i.test(r.error.message + (r.error.code || ''))) UI.toast(T('product.notify_dup'), 'info');
                else if (r.error) UI.toast(r.error.message, 'error');
                else UI.toast(T('product.notify_ok'), 'success');
            }
        });
        det.addEventListener('change', function (e) {
            if (e.target.type === 'file' && e.target.id.indexOf('cz_') === 0) {
                var n = document.getElementById(e.target.id + '_name'); if (n && e.target.files[0]) n.textContent = e.target.files[0].name;
            }
        });
        /* swipe + hover zoom on the main image */
        var sx = 0;
        det.addEventListener('touchstart', function (e) { if (e.target.closest('#pdMain')) sx = e.touches[0].clientX; }, { passive: true });
        det.addEventListener('touchend', function (e) {
            if (!e.target.closest('#pdMain') || cur.images.length < 2) return;
            var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 45) setImage(cur.idx + (dx < 0 ? 1 : -1));
        });
        det.addEventListener('mousemove', function (e) {
            var m = e.target.closest('#pdMain'); if (!m || window.matchMedia('(hover: none)').matches) return;
            var r = m.getBoundingClientRect(); var img = document.getElementById('pdMainImg');
            img.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%';
        });

        document.querySelectorAll('.product-tab-btn').forEach(function (b) { b.addEventListener('click', function () { switchTab(b.getAttribute('data-tab')); }); });
    }

    function switchTab(name) {
        document.querySelectorAll('.product-tab-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === name); });
        document.querySelectorAll('.product-tab-content').forEach(function (c) { c.classList.toggle('active', c.id === 'tab' + name.charAt(0).toUpperCase() + name.slice(1)); });
    }

    /* ---------- quick view ---------- */
    async function quickView(id) {
        var p = cache[id];
        if (!p) { var r = await API.products.byId(id); p = r.data; if (p) cache[id] = p; }
        if (!p) return;
        var out = p.stock_quantity <= 0, pct = Utils.discountPct(p.compare_price, p.price);
        document.getElementById('quickViewContent').innerHTML =
            '<div class="qv-grid"><div class="qv-media"><img src="' + Utils.esc(Utils.productImage(p)) + '" alt="' + Utils.esc(p.name) + '"></div><div class="qv-info">' +
            (p.categories ? '<span class="product-card-cat">' + Utils.esc(p.categories.name) + '</span>' : '') +
            '<h2>' + Utils.esc(p.name) + '</h2><div class="product-card-rating">' + Utils.stars(p.avg_rating) + '<span class="rating-count">(' + (p.review_count || 0) + ')</span></div>' +
            '<div class="pd-price-row"><span class="pd-price">' + money(p.price) + '</span>' + (pct ? '<del class="price-compare">' + money(p.compare_price) + '</del>' : '') + '</div>' +
            '<div class="pd-stock">' + stockBadge(p) + '</div>' +
            '<p class="pd-short">' + Utils.esc(Utils.truncate(p.short_description || p.description || '', 220)) + '</p>' +
            '<div class="qv-actions">' +
            (out ? '' : (p.is_customizable
                ? '<button class="btn btn-primary" data-qv="customize">' + UI.icon('sparkles', 'icon-sm') + ' ' + TX('shop.view_options') + '</button>'
                : '<button class="btn btn-primary" data-qv="add">' + UI.icon('shopping-bag', 'icon-sm') + ' ' + TX('product.add_cart') + '</button>')) +
            '<button class="btn btn-outline" data-qv="details">' + TX('product.view_details') + '</button></div></div></div>';
        var m = document.getElementById('quickViewContent');
        m.onclick = function (e) {
            var b = e.target.closest('[data-qv]'); if (!b) return;
            var a = b.getAttribute('data-qv');
            if (a === 'add') { Cart.add(p, 1); UI.closeModal('quickViewModal'); }
            else { UI.closeModal('quickViewModal'); Router.go('product', p.id); }
        };
        UI.openModal('quickViewModal');
    }
    Bestow.define({ 'product.view_details': 'View full details' }, 'shop');

    /* ====================================================================
       PUBLIC API
       ==================================================================== */
    var Shop = {
        categories: [],
        cache: cache,
        card: card,
        renderGrid: renderGrid,
        lookupPincode: lookupPincode,
        etaRange: etaRange,
        quickView: quickView,

        ensureCategories: async function () {
            if (Shop.categories.length) return Shop.categories;
            var r = await API.categories.all(true);
            Shop.categories = r.data || [];
            return Shop.categories;
        },

        renderCategoryFilter: function () {
            var box = document.getElementById('filterCat'); if (!box) return;
            box.innerHTML = '<label class="filter-option"><input type="radio" name="category" value=""' + (state.cat ? '' : ' checked') + '><span>' + TX('shop.all_categories') + '</span></label>' +
                Shop.categories.map(function (c) { return '<label class="filter-option"><input type="radio" name="category" value="' + Utils.esc(c.slug) + '"' + (state.cat === c.slug ? ' checked' : '') + '><span>' + Utils.esc(c.name) + '</span></label>'; }).join('');
        },

        load: async function (ctx) {
            var q = (ctx && ctx.query) || {};
            state.search = q.q || ''; state.cat = q.cat || ''; state.min = parseFloat(q.min) || 0; state.max = parseFloat(q.max) || 0;
            state.rating = parseFloat(q.rating) || 0; state.stock = q.stock === '1'; state.custom = q.custom === '1';
            state.sort = SORT_OK[q.sort] ? q.sort : 'newest'; state.page = Math.max(1, parseInt(q.page, 10) || 1);
            await Shop.ensureCategories();
            Shop.renderCategoryFilter();
            syncControls();
            await loadProducts();
        },

        loadHome: async function () {
            var cats = await Shop.ensureCategories();
            var g = document.getElementById('homeCategoriesGrid');
            if (g) g.innerHTML = cats.map(Shop.categoryCard).join('');
            var fb = document.getElementById('featuredProductsGrid'); skeleton(fb, 4);
            var r = await API.products.list({ featured: true, limit: 8, sort: 'popular' });
            var list = r.data || [];
            if (!list.length) { var r2 = await API.products.list({ limit: 8, sort: 'newest' }); list = r2.data || []; }
            if (fb) { if (list.length) renderGrid(fb, list); else fb.innerHTML = UI.empty('package-x', T('shop.none_yet'), ''); }
            Recent.render('recentGrid');
            refreshIcons();
        },

        categoryCard: function (c) {
            return '<a class="category-card" href="#shop" data-route="shop" data-query="cat=' + Utils.esc(c.slug) + '">' +
                (c.image_url ? '<img class="category-card-img" src="' + Utils.esc(c.image_url) + '" alt="" loading="lazy">' : '') +
                '<span class="category-card-icon">' + UI.icon(c.icon || 'gift') + '</span>' +
                '<h3>' + Utils.esc(c.name) + '</h3>' + (c.description ? '<p>' + Utils.esc(Utils.truncate(c.description, 80)) + '</p>' : '') +
                '<span class="category-card-link">' + TX('shop.explore') + UI.icon('arrow-right', 'icon-xs') + '</span></a>';
        },

        loadCategoriesPage: async function () {
            var cats = await Shop.ensureCategories();
            document.getElementById('categoriesPageGrid').innerHTML = cats.length ? cats.map(Shop.categoryCard).join('') : UI.empty('grid-3x3', T('shop.none_yet'), '');
            refreshIcons();
        },

        loadWishlist: async function () {
            var grid = document.getElementById('wishlistGrid'), empty = document.getElementById('wishlistEmpty');
            var ids = Wishlist.ids();
            if (!ids.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none'; skeleton(grid, Math.min(ids.length, 4));
            var r = await API.products.byIds(ids);
            var list = (r.data || []).filter(function (p) { return p.is_active; });
            if (!list.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
            renderGrid(grid, list);
        },

        loadProduct: async function (ctx) {
            var id = ctx.param;
            var det = document.getElementById('productDetail');
            det.innerHTML = '<div class="pd-skeleton"><div class="sk sk-img"></div><div><div class="sk sk-line"></div><div class="sk sk-line sk-short"></div><div class="sk sk-line"></div></div></div>';
            document.getElementById('tabReviews').innerHTML = '';
            switchTab('description');
            var r = await API.products.byId(id);
            var p = r.data;
            if (!p || (!p.is_active && !(window.AppState && AppState.isAdmin))) {
                det.innerHTML = UI.empty('package-x', T('product.not_found'), T('product.not_found_text'), '<button class="btn btn-primary" data-route="shop">' + Utils.esc(T('product.back_shop')) + '</button>');
                refreshIcons(); return;
            }
            cache[p.id] = p;
            renderProduct(p);
            document.title = p.name + ' | ' + Bestow.branding.brand_name;
            Bestow._routeTitle = p.name;
            if (!viewedThisSession[p.id]) { viewedThisSession[p.id] = 1; API.products.view(p.id); }
            Recent.add(p);
            if (window.Reviews) Reviews.loadProduct(p.id);
            var rel = document.getElementById('relatedProductsGrid'); skeleton(rel, 4);
            API.products.related(p.category_id, p.id, 4).then(function (x) {
                var list = x.data || [];
                var wrap = rel.closest('.related-section');
                if (!list.length) { if (wrap) wrap.style.display = 'none'; rel.innerHTML = ''; } else { if (wrap) wrap.style.display = ''; renderGrid(rel, list); }
            });
            Recent.render('recentGridProduct', p.id);
            refreshIcons();
        },

        share: async function (p) {
            var url = location.origin + location.pathname + '#product/' + p.id;
            if (navigator.share) { try { await navigator.share({ title: p.name, text: p.short_description || p.name, url: url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
            if (await Utils.copy(url)) UI.toast(T('product.copied'), 'success');
        },

        init: function () {
            bindShop(); bindProductPage(); Lightbox.bind();
            document.addEventListener('click', function (e) {
                var gl = e.target.closest('[data-lightbox]');
                if (gl) { e.preventDefault(); Lightbox.open(gl.getAttribute('data-lightbox'), (gl.getAttribute('data-lightbox-set') || '').split('|').filter(Boolean)); }
            });
            Wishlist.paint();
        },
        setSearch: function (q) { state.search = q; state.page = 1; }
    };
    var SORT_OK = { 'newest': 1, 'price-asc': 1, 'price-desc': 1, 'name-asc': 1, 'name-desc': 1, 'popular': 1, 'rating': 1 };
    Bestow.define({ 'shop.all_categories': 'All Categories', 'shop.empty_text': 'Try adjusting your filters or search.', 'shop.none_yet': 'Nothing here yet', 'shop.explore': 'Explore' }, 'shop');

    window.Shop = Shop;
})();
