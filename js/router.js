/* ==========================================================================
   BESTOW - HASH ROUTER
   #shop?cat=awards&page=2   #product/<id>   #policy/shipping   #order-success/<number>
   Pages are <section class="page" id="..."> elements; handlers load their data.
   ========================================================================== */
(function () {
    'use strict';

    var ROUTES = {
        'home':          { page: 'pageHome',      title: 'Home' },
        'shop':          { page: 'pageShop',      title: 'Shop' },
        'product':       { page: 'pageProduct',   title: 'Product' },
        'categories':    { page: 'pageCategories', title: 'Categories' },
        'about':         { page: 'pageAbout',     title: 'About' },
        'contact':       { page: 'pageContact',   title: 'Contact' },
        'track-order':   { page: 'pageTrackOrder', title: 'Track Order' },
        'wishlist':      { page: 'pageWishlist',  title: 'Wishlist' },
        'checkout':      { page: 'pageCheckout',  title: 'Checkout' },
        'order-success': { page: 'pageSuccess',   title: 'Order Confirmed' },
        'account':       { page: 'pageAccount',   title: 'My Account', auth: true },
        'faq':           { page: 'pageFaq',       title: 'FAQ' },
        'policy':        { page: 'pagePolicy',    title: 'Policy' },
        'unsubscribe':   { page: 'pageUnsubscribe', title: 'Unsubscribe' },
        'admin-login':   { page: 'pageAdminLogin', title: 'Admin Sign In', bare: true },
        'admin':         { page: 'pageAdmin',     title: 'Admin', admin: true, bare: true }
    };

    var handlers = {};
    var current = { name: 'home', param: '', query: {} };
    var previous = null;
    var token = 0;
    var booted = false;

    function parse(hash) {
        var h = String(hash || '').replace(/^#\/?/, '');
        var qi = h.indexOf('?');
        var qs = qi > -1 ? h.slice(qi + 1) : '';
        var path = qi > -1 ? h.slice(0, qi) : h;
        var parts = path.split('/').filter(Boolean);
        var name = parts[0] || 'home';
        var param = parts.slice(1).map(decodeURIComponent).join('/');
        var query = {};
        new URLSearchParams(qs).forEach(function (v, k) { query[k] = v; });
        return { name: name, param: param, query: query };
    }

    function build(name, param, query) {
        var h = '#' + name + (param ? '/' + encodeURIComponent(param) : '');
        var qs = Utils.param(query || {});
        return qs ? h + '?' + qs : h;
    }

    async function resolve() {
        var my = ++token;
        var r = parse(location.hash);
        if (!ROUTES[r.name]) r = { name: 'home', param: '', query: {} };
        var def = ROUTES[r.name];

        if (window.Bestow && Bestow.ready) { try { await Bestow.ready; } catch (e) { /* continue */ } }
        if (my !== token) return;

        if (def.auth && !(window.AppState && AppState.user)) {
            UI.toast(Bestow.t('toast.signin_required'), 'info');
            location.replace('#home');
            if (window.App && App.showAuth) App.showAuth('login'); else UI.openModal('authModal');
            return;
        }
        if (def.admin && !(window.AppState && AppState.isAdmin)) {
            if (!(window.AppState && AppState.user)) { location.replace('#admin-login'); }
            else { location.replace('#home'); UI.toast(Bestow.t('toast.admin_only'), 'warning'); }
            return;
        }
        if (r.name === 'admin-login' && window.AppState && AppState.isAdmin) { location.replace('#admin'); return; }

        var moved = !booted || r.name !== current.name || r.param !== current.param;
        previous = current;
        current = r;
        document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
        var page = document.getElementById(def.page);
        if (page) { page.classList.add('active'); page.classList.remove('page-enter'); void page.offsetWidth; page.classList.add('page-enter'); }
        document.body.classList.toggle('is-admin-page', !!def.bare);
        document.body.setAttribute('data-current', r.name);
        Bestow._routeTitle = null;
        if (r.name !== 'home') { Bestow._routeTitle = def.title; document.title = def.title + ' | ' + Bestow.branding.brand_name; }
        else if (Bestow.applyMeta) Bestow.applyMeta();

        document.querySelectorAll('[data-route]').forEach(function (a) {
            if (a.classList.contains('nav-link') || a.closest('.mobile-nav-links') || a.classList.contains('bottom-nav-item')) {
                a.classList.toggle('active', a.getAttribute('data-route') === r.name);
            }
        });
        var announcer = document.getElementById('routeAnnouncer');
        if (announcer) announcer.textContent = def.title;

        if (moved && !(r.name === 'shop' && previous && previous.name === 'shop')) window.scrollTo({ top: 0, behavior: 'auto' });
        if (booted && moved) closeOverlays();
        booted = true;

        var h = handlers[r.name];
        if (h) {
            try { await h({ name: r.name, param: r.param, query: r.query }); }
            catch (e) { console.error('[Router] handler error for ' + r.name, e); UI.toast(Bestow.t('toast.page_error'), 'error'); }
        }
        if (my !== token) return;
        Bestow.apply(page || document);
        refreshIcons();
        document.dispatchEvent(new CustomEvent('route:change', { detail: r }));
    }

    function closeOverlays() {
        document.body.classList.remove('nav-open', 'search-open');
        var mn = document.getElementById('mobileNav'); if (mn) mn.classList.remove('open');
        var mo = document.getElementById('mobileNavOverlay'); if (mo) mo.classList.remove('open');
        var sb = document.getElementById('searchOverlay'); if (sb) sb.classList.remove('open');
        var ud = document.getElementById('userDropdown'); if (ud) ud.classList.remove('open');
    }

    var Router = {
        routes: ROUTES,
        on: function (name, fn) { handlers[name] = fn; },
        go: function (name, param, query) {
            var h = build(name, param, query);
            if (location.hash === h) resolve(); else location.hash = h;
        },
        replace: function (name, param, query) { history.replaceState(null, '', build(name, param, query)); current = { name: name, param: param || '', query: query || {} }; },
        setQuery: function (query) { history.replaceState(null, '', build(current.name, current.param, query)); current.query = query; },
        refresh: function () { return resolve(); },
        current: function () { return current; },
        previous: function () { return previous; },
        back: function () { if (previous && previous.name !== current.name) history.back(); else Router.go('home'); },
        url: build,
        start: function () {
            window.addEventListener('hashchange', resolve);
            if (!location.hash || location.hash === '#') location.replace('#home'); else resolve();
        }
    };
    window.Router = Router;

    /* data-route elements navigate; <a href="#"> never jumps */
    document.addEventListener('click', function (e) {
        var el = e.target.closest ? e.target.closest('[data-route]') : null;
        if (el === document.body || el === document.documentElement) return;
        if (!el || (window.Bestow && Bestow.editing && el.closest('[data-cms]'))) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        var q = {};
        var qs = el.getAttribute('data-query');
        if (qs) new URLSearchParams(qs).forEach(function (v, k) { q[k] = v; });
        Router.go(el.getAttribute('data-route'), el.getAttribute('data-param') || el.getAttribute('data-id') || '', q);
    });
})();
