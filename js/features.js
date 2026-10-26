/* ==========================================================================
   BESTOW - EXPERIENCE FEATURES
   Live search with suggestions + voice, product comparison, command palette (Ctrl/Cmd+K),
   announcement bar, scroll progress, reveal animations, animated counters, PWA install,
   offline banner, cookie notice, confetti, FAQ, policy pages, unsubscribe, SEO data.
   ========================================================================== */
(function () {
    'use strict';

    var T = function (k, v) { return Bestow.t(k, v); };
    var TX = function (k, v) { return Bestow.tx(k, v); };
    var $ = function (id) { return document.getElementById(id); };

    Bestow.define({
        'search.placeholder': 'Search gifts, categories, keywords',
        'search.recent': 'Recent searches',
        'search.products': 'Products',
        'search.categories': 'Categories',
        'search.see_all': 'See all results for "{q}"',
        'search.none': 'No matches for "{q}". Try a different word.',
        'search.voice_unsupported': 'Voice search is not supported in this browser',
        'search.listening': 'Listening',
        'search.clear_recent': 'Clear',
        'compare.title': 'Compare Products',
        'compare.tray': '{n} selected for comparison',
        'compare.open': 'Compare now',
        'compare.clear': 'Clear',
        'compare.max': 'You can compare up to 3 products',
        'compare.need_two': 'Select at least 2 products to compare',
        'compare.price': 'Price',
        'compare.rating': 'Rating',
        'compare.category': 'Category',
        'compare.stock': 'Availability',
        'compare.custom': 'Customizable',
        'compare.weight': 'Weight',
        'compare.sku': 'SKU',
        'compare.yes': 'Yes',
        'compare.no': 'No',
        'compare.remove': 'Remove',
        'cmd.placeholder': 'Type a command or page name',
        'cmd.none': 'No matching commands',
        'cmd.group_go': 'Go to',
        'cmd.group_actions': 'Actions',
        'cmd.group_admin': 'Admin',
        'cmd.home': 'Home', 'cmd.shop': 'Shop', 'cmd.categories': 'Categories', 'cmd.about': 'About us', 'cmd.contact': 'Contact',
        'cmd.track': 'Track an order', 'cmd.wishlist': 'Wishlist', 'cmd.cart': 'Open cart', 'cmd.account': 'My account', 'cmd.faq': 'Help and FAQ',
        'cmd.theme': 'Switch light or dark theme', 'cmd.install': 'Install the app', 'cmd.whatsapp': 'Chat on WhatsApp',
        'cmd.admin': 'Open admin panel', 'cmd.live_edit': 'Toggle live text editing',
        'pwa.installed': 'App installed. Find it on your home screen.',
        'offline.text': 'You are offline. Some features may not work until you reconnect.',
        'online.text': 'Back online',
        'cookie.text': 'We use essential cookies and local storage to keep your cart, wishlist and sign-in working. No tracking or advertising cookies are used.',
        'cookie.accept': 'Got it',
        'faq.empty': 'No questions yet.',
        'policy.not_found': 'This page does not exist.',
        'policy.other': 'More policies',
        'unsub.title': 'Unsubscribe from our newsletter',
        'unsub.text': 'Confirm that you no longer want to receive emails at {email}.',
        'unsub.confirm': 'Unsubscribe',
        'unsub.done': 'You have been unsubscribed. We are sorry to see you go.',
        'unsub.missing': 'No email address was provided in this link.'
    }, 'features');

    /* ====================================================================
       SEARCH
       ==================================================================== */
    var RS_KEY = 'bestow_recent_searches';
    var sIndex = -1, sToken = 0;

    function recentSearches() { var r = Utils.storage.get(RS_KEY, []); return Array.isArray(r) ? r : []; }
    function pushSearch(q) {
        q = q.trim(); if (!q) return;
        var l = recentSearches().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); }); l.unshift(q);
        Utils.storage.set(RS_KEY, l.slice(0, 6));
    }

    function openSearch() {
        $('searchOverlay').classList.add('open');
        document.body.classList.add('search-open');
        var f = function () { var i = $('searchInput'); if (document.activeElement !== i) { try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); } } };
        f(); setTimeout(f, 80); setTimeout(f, 300);
        renderSearch($('searchInput').value);
    }
    function closeSearch() { $('searchOverlay').classList.remove('open'); document.body.classList.remove('search-open'); sIndex = -1; }

    async function renderSearch(q) {
        var box = $('searchResults'); q = (q || '').trim(); var my = ++sToken; sIndex = -1;
        if (!q) {
            var rec = recentSearches();
            box.innerHTML = rec.length ? '<div class="search-group"><div class="search-group-head"><span>' + TX('search.recent') + '</span><button type="button" class="link-btn" data-clear-recent>' + TX('search.clear_recent') + '</button></div>' +
                rec.map(function (r) { return '<button type="button" class="search-row" data-q="' + Utils.esc(r) + '">' + UI.icon('history', 'icon-sm') + '<span>' + Utils.esc(r) + '</span></button>'; }).join('') + '</div>' : '';
            refreshIcons(); return;
        }
        box.innerHTML = '<div class="search-loading">' + UI.skeletonCards(1) + '</div>';
        var cats = (Shop.categories || []).filter(function (c) { return c.name.toLowerCase().indexOf(q.toLowerCase()) > -1; }).slice(0, 3);
        var r = await API.products.list({ search: q, limit: 6 });
        if (my !== sToken) return;
        var list = r.data || [], h = '';
        if (cats.length) h += '<div class="search-group"><div class="search-group-head"><span>' + TX('search.categories') + '</span></div>' + cats.map(function (c) { return '<a class="search-row" href="#shop" data-route="shop" data-query="cat=' + Utils.esc(c.slug) + '">' + UI.icon(c.icon || 'grid-3x3', 'icon-sm') + '<span>' + Utils.esc(c.name) + '</span></a>'; }).join('') + '</div>';
        if (list.length) {
            h += '<div class="search-group"><div class="search-group-head"><span>' + TX('search.products') + '</span></div>' + list.map(function (p) {
                return '<a class="search-row search-product" href="#product/' + encodeURIComponent(p.id) + '" data-route="product" data-param="' + Utils.esc(p.id) + '"><img src="' + Utils.esc(Utils.productImage(p)) + '" alt="" loading="lazy"><span class="search-product-name">' + Utils.esc(p.name) + '</span><strong>' + Utils.price(p.price) + '</strong></a>';
            }).join('') + '</div>';
        }
        h += list.length || cats.length
            ? '<button type="button" class="search-row search-all" data-q="' + Utils.esc(q) + '" data-full="1">' + UI.icon('search', 'icon-sm') + '<span>' + TX('search.see_all', { q: q }) + '</span></button>'
            : '<p class="search-none">' + TX('search.none', { q: q }) + '</p>';
        box.innerHTML = h; refreshIcons();
    }

    function submitSearch(q) {
        q = (q || '').trim(); if (!q) return;
        pushSearch(q); closeSearch();
        Router.go('shop', '', { q: q });
    }

    function bindSearch() {
        var input = $('searchInput');
        $('searchToggleBtn').addEventListener('click', openSearch);
        $('searchCloseBtn').addEventListener('click', closeSearch);
        input.addEventListener('input', Utils.debounce(function () { renderSearch(input.value); }, 240));
        input.addEventListener('keydown', function (e) {
            var rows = $('searchResults').querySelectorAll('.search-row');
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault(); if (!rows.length) return;
                sIndex = (sIndex + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
                rows.forEach(function (r, i) { r.classList.toggle('focus', i === sIndex); });
                rows[sIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (sIndex > -1 && rows[sIndex]) rows[sIndex].click(); else submitSearch(input.value);
            } else if (e.key === 'Escape') closeSearch();
        });
        $('searchResults').addEventListener('click', function (e) {
            if (e.target.closest('[data-clear-recent]')) { Utils.storage.remove(RS_KEY); renderSearch(''); return; }
            var q = e.target.closest('[data-q]');
            if (q) { if (q.hasAttribute('data-full')) submitSearch(q.getAttribute('data-q')); else { input.value = q.getAttribute('data-q'); submitSearch(input.value); } return; }
            if (e.target.closest('a.search-row')) { pushSearch(input.value); closeSearch(); }
        });
        document.addEventListener('click', function (e) {
            var ov = $('searchOverlay');
            if (ov.classList.contains('open') && !e.target.closest('#searchOverlay, #searchToggleBtn, .js-search-open')) closeSearch();
            if (e.target.closest('.js-search-open')) openSearch();
        });

        /* voice search */
        var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        var vb = $('voiceSearchBtn');
        if (!Rec) { if (vb) vb.style.display = 'none'; return; }
        var rec = null, active = false;
        vb.addEventListener('click', function () {
            if (active && rec) { rec.stop(); return; }
            rec = new Rec(); rec.lang = 'en-IN'; rec.interimResults = false;
            rec.onstart = function () { active = true; vb.classList.add('listening'); input.placeholder = T('search.listening'); };
            rec.onend = function () { active = false; vb.classList.remove('listening'); input.placeholder = T('search.placeholder'); };
            rec.onerror = function () { active = false; vb.classList.remove('listening'); };
            rec.onresult = function (ev) { input.value = ev.results[0][0].transcript; renderSearch(input.value); };
            try { rec.start(); } catch (e) { /* already started */ }
        });
    }

    /* ====================================================================
       COMPARE
       ==================================================================== */
    var CMP_KEY = 'bestow_compare';
    var cmp = Utils.storage.get(CMP_KEY, []); if (!Array.isArray(cmp)) cmp = [];

    var Compare = {
        toggle: function (id, product) {
            var i = cmp.indexOf(id);
            if (i > -1) cmp.splice(i, 1);
            else { if (cmp.length >= 3) { UI.toast(T('compare.max'), 'warning'); return; } cmp.push(id); }
            Utils.storage.set(CMP_KEY, cmp); Compare.paint();
        },
        paint: function () {
            document.querySelectorAll('[data-compare-id]').forEach(function (b) { b.classList.toggle('active', cmp.indexOf(b.getAttribute('data-compare-id')) > -1); });
            var tray = $('compareTray'); if (!tray) return;
            tray.classList.toggle('visible', cmp.length > 0);
            $('compareTrayText').textContent = T('compare.tray', { n: cmp.length });
        },
        open: async function () {
            if (cmp.length < 2) { UI.toast(T('compare.need_two'), 'info'); return; }
            var r = await API.products.byIds(cmp); var list = (r.data || []).sort(function (a, b) { return cmp.indexOf(a.id) - cmp.indexOf(b.id); });
            var row = function (label, fn) { return '<tr><th scope="row">' + label + '</th>' + list.map(function (p) { return '<td>' + fn(p) + '</td>'; }).join('') + '</tr>'; };
            var yn = function (v) { return TX(v ? 'compare.yes' : 'compare.no'); };
            $('compareContent').innerHTML = '<div class="compare-scroll"><table class="compare-table"><thead><tr><th></th>' + list.map(function (p) {
                return '<th class="compare-head"><button type="button" class="compare-x" data-compare-remove="' + Utils.esc(p.id) + '" aria-label="' + Utils.esc(T('compare.remove')) + '">' + UI.icon('x', 'icon-xs') + '</button><a href="#product/' + encodeURIComponent(p.id) + '" data-route="product" data-param="' + Utils.esc(p.id) + '"><img src="' + Utils.esc(Utils.productImage(p)) + '" alt=""><span>' + Utils.esc(p.name) + '</span></a></th>';
            }).join('') + '</tr></thead><tbody>' +
                row(TX('compare.price'), function (p) { return '<strong>' + Utils.price(p.price) + '</strong>'; }) +
                row(TX('compare.rating'), function (p) { return Utils.stars(p.avg_rating) + ' <small>(' + (p.review_count || 0) + ')</small>'; }) +
                row(TX('compare.category'), function (p) { return Utils.esc(p.categories ? p.categories.name : '-'); }) +
                row(TX('compare.stock'), function (p) { return p.stock_quantity > 0 ? TX('product.in_stock') : TX('product.out_stock'); }) +
                row(TX('compare.custom'), function (p) { return yn(p.is_customizable); }) +
                row(TX('compare.weight'), function (p) { return Number(p.weight) > 0 ? p.weight + ' g' : '-'; }) +
                row(TX('compare.sku'), function (p) { return Utils.esc(p.sku || '-'); }) +
                '<tr><th></th>' + list.map(function (p) { return '<td>' + (p.stock_quantity > 0 ? '<button class="btn btn-primary btn-sm" data-compare-add="' + Utils.esc(p.id) + '">' + TX('shop.add') + '</button>' : '') + '</td>'; }).join('') + '</tr></tbody></table></div>';
            Shop.cache && list.forEach(function (p) { Shop.cache[p.id] = p; });
            UI.openModal('compareModal'); refreshIcons();
        },
        bind: function () {
            $('compareOpenBtn').addEventListener('click', Compare.open);
            $('compareClearBtn').addEventListener('click', function () { cmp = []; Utils.storage.set(CMP_KEY, cmp); Compare.paint(); });
            $('compareContent').addEventListener('click', function (e) {
                var x = e.target.closest('[data-compare-remove]');
                if (x) { cmp = cmp.filter(function (i) { return i !== x.getAttribute('data-compare-remove'); }); Utils.storage.set(CMP_KEY, cmp); Compare.paint(); if (cmp.length < 2) UI.closeModal('compareModal'); else Compare.open(); return; }
                var a = e.target.closest('[data-compare-add]');
                if (a) { var p = Shop.cache[a.getAttribute('data-compare-add')]; if (p) Cart.add(p, 1); }
                if (e.target.closest('a[data-route]')) UI.closeModal('compareModal');
            });
            Compare.paint();
        }
    };
    window.Compare = Compare;

    /* ====================================================================
       COMMAND PALETTE
       ==================================================================== */
    var cmdIndex = 0, cmdItems = [];

    function commands() {
        var go = function (label, icon, route) { return { group: 'cmd.group_go', label: T('cmd.' + label), icon: icon, run: function () { Router.go(route); } }; };
        var c = [
            go('home', 'house', 'home'), go('shop', 'shopping-bag', 'shop'), go('categories', 'grid-3x3', 'categories'), go('about', 'info', 'about'),
            go('contact', 'mail', 'contact'), go('track', 'map-pin', 'track-order'), go('wishlist', 'heart', 'wishlist'), go('faq', 'circle-help', 'faq'),
            { group: 'cmd.group_go', label: T('cmd.account'), icon: 'user', run: function () { if (AppState.user) Router.go('account'); else UI.openModal('authModal'); } },
            { group: 'cmd.group_actions', label: T('cmd.cart'), icon: 'shopping-cart', run: function () { Cart.open(); } },
            { group: 'cmd.group_actions', label: T('cmd.theme'), icon: 'sun-moon', run: function () { App.toggleTheme(); } },
            { group: 'cmd.group_actions', label: T('cmd.whatsapp'), icon: 'message-circle', run: function () { WhatsApp.chat(); } }
        ];
        if (Features.installEvent) c.push({ group: 'cmd.group_actions', label: T('cmd.install'), icon: 'download', run: Features.install });
        if (AppState.isAdmin) {
            c.push({ group: 'cmd.group_admin', label: T('cmd.admin'), icon: 'layout-dashboard', run: function () { Router.go('admin'); } });
            c.push({ group: 'cmd.group_admin', label: T('cmd.live_edit'), icon: 'pencil', run: function () { Bestow.liveEdit(!Bestow.editing); } });
        }
        return c;
    }

    function renderCmd(q) {
        q = (q || '').toLowerCase().trim();
        cmdItems = commands().filter(function (c) { return !q || c.label.toLowerCase().indexOf(q) > -1; });
        cmdIndex = 0;
        var h = '', last = '';
        cmdItems.forEach(function (c, i) {
            if (c.group !== last) { h += '<div class="cmd-group">' + Utils.esc(T(c.group)) + '</div>'; last = c.group; }
            h += '<button type="button" class="cmd-item' + (i === 0 ? ' active' : '') + '" data-cmd="' + i + '">' + UI.icon(c.icon, 'icon-sm') + '<span>' + Utils.esc(c.label) + '</span></button>';
        });
        $('cmdList').innerHTML = h || '<p class="cmd-none">' + Utils.esc(T('cmd.none')) + '</p>';
        refreshIcons();
    }
    function moveCmd(d) {
        if (!cmdItems.length) return;
        cmdIndex = (cmdIndex + d + cmdItems.length) % cmdItems.length;
        $('cmdList').querySelectorAll('.cmd-item').forEach(function (b, i) { b.classList.toggle('active', i === cmdIndex); if (i === cmdIndex) b.scrollIntoView({ block: 'nearest' }); });
    }
    function runCmd(i) { var c = cmdItems[i]; if (!c) return; UI.closeModal('cmdPalette'); setTimeout(c.run, 80); }

    function bindCmd() {
        var input = $('cmdInput');
        input.addEventListener('input', function () { renderCmd(input.value); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); moveCmd(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); moveCmd(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); runCmd(cmdIndex); }
        });
        $('cmdList').addEventListener('click', function (e) { var b = e.target.closest('[data-cmd]'); if (b) runCmd(parseInt(b.getAttribute('data-cmd'), 10)); });
        document.querySelectorAll('.js-cmd-open').forEach(function (b) { b.addEventListener('click', Features.openCmd); });
    }

    /* ====================================================================
       FEATURES
       ==================================================================== */
    var Features = {
        installEvent: null,

        openCmd: function () { $('cmdInput').value = ''; renderCmd(''); UI.openModal('cmdPalette'); },

        install: async function () {
            var ev = Features.installEvent; if (!ev) return;
            ev.prompt(); var r = await ev.userChoice;
            if (r && r.outcome === 'accepted') UI.toast(T('pwa.installed'), 'success');
            Features.installEvent = null; document.querySelectorAll('.js-install').forEach(function (b) { b.style.display = 'none'; });
        },

        announce: function () {
            var s = Bestow.settings, bar = $('announceBar'); if (!bar) return;
            var text = (s.announcement || '').trim();
            var dismissed = false; try { dismissed = sessionStorage.getItem('bestow_announce_closed') === text; } catch (e) { /* ignore */ }
            var show = !!(s.announcement_enabled && text && !dismissed);
            bar.classList.toggle('visible', show);
            document.body.classList.toggle('has-announce', show);
            $('announceText').textContent = text;
        },

        confetti: function () {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            var c = document.createElement('canvas'); c.className = 'confetti-canvas'; document.body.appendChild(c);
            var ctx = c.getContext('2d'), W = c.width = window.innerWidth, H = c.height = window.innerHeight;
            var colors = ['#de2128', '#ffffff', '#111111', '#f4a0a3', '#b3161c'];
            var parts = []; for (var i = 0; i < 140; i++) parts.push({ x: W / 2 + (Math.random() - .5) * 120, y: H * .38, vx: (Math.random() - .5) * 16, vy: Math.random() * -14 - 3, s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[i % colors.length] });
            var t0 = performance.now();
            (function frame(t) {
                var dt = t - t0; ctx.clearRect(0, 0, W, H);
                parts.forEach(function (p) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - dt / 2800); ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s / 1.6); ctx.restore(); });
                if (dt < 2800) requestAnimationFrame(frame); else c.remove();
            })(t0);
        },

        counters: function () {
            var els = document.querySelectorAll('.hero-stat-number'); if (!els.length || !('IntersectionObserver' in window)) return;
            var io = new IntersectionObserver(function (es) {
                es.forEach(function (en) {
                    if (!en.isIntersecting) return; io.unobserve(en.target);
                    var el = en.target, txt = el.textContent, m = txt.match(/[\d,]+/);
                    if (!m) return;
                    var end = parseInt(m[0].replace(/,/g, ''), 10), pre = txt.slice(0, m.index), suf = txt.slice(m.index + m[0].length), t0 = performance.now(), dur = 1600;
                    (function tick(t) { var p = Math.min((t - t0) / dur, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3))); el.textContent = pre + v.toLocaleString('en-IN') + suf; if (p < 1) requestAnimationFrame(tick); else el.textContent = txt; })(t0);
                });
            }, { threshold: .4 });
            els.forEach(function (el) { io.observe(el); });
        },

        reveal: function () {
            var sel = '.section-header, .category-card, .product-card, .process-step, .about-value-card, .contact-info-card, .testimonial, .newsletter-card, .faq-item';
            if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: .08, rootMargin: '0px 0px -40px 0px' });
            var scan = function () { document.querySelectorAll(sel).forEach(function (el) { if (!el.classList.contains('reveal')) { el.classList.add('reveal'); io.observe(el); } }); };
            scan();
            new MutationObserver(Utils.debounce(scan, 120)).observe($('mainContent'), { childList: true, subtree: true });
        },

        particles: function () {
            var box = $('heroParticles'); if (!box || box.children.length) return;
            for (var i = 0; i < 18; i++) {
                var s = document.createElement('span');
                s.style.cssText = 'left:' + (Math.random() * 100) + '%;width:' + (4 + Math.random() * 10) + 'px;height:' + (4 + Math.random() * 10) + 'px;animation-delay:' + (-Math.random() * 14) + 's;animation-duration:' + (10 + Math.random() * 12) + 's;';
                box.appendChild(s);
            }
        },

        scrollUi: function () {
            var bar = $('scrollProgress'), top = $('scrollToTop'), header = $('mainHeader');
            var on = Utils.throttle(function () {
                var h = document.documentElement, y = window.scrollY, max = h.scrollHeight - h.clientHeight;
                bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
                top.classList.toggle('visible', y > 600);
                header.classList.toggle('scrolled', y > 24);
            }, 50);
            window.addEventListener('scroll', on, { passive: true }); on();
            top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        },

        network: function () {
            var b = $('offlineBanner'), t = $('offlineText');
            var upd = function () {
                var off = !navigator.onLine; b.classList.toggle('visible', off || b.classList.contains('flash'));
                t.textContent = T(off ? 'offline.text' : 'online.text');
            };
            window.addEventListener('offline', upd);
            window.addEventListener('online', function () { b.classList.add('flash'); upd(); setTimeout(function () { b.classList.remove('flash'); upd(); }, 2200); });
            upd();
        },

        cookies: function () {
            var n = $('cookieNotice'); if (!n) return;
            if (Utils.storage.get('bestow_cookie_ok', false)) return;
            setTimeout(function () { n.classList.add('visible'); }, 1800);
            $('cookieAccept').addEventListener('click', function () { Utils.storage.set('bestow_cookie_ok', true); n.classList.remove('visible'); });
        },

        pwa: function () {
            window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); Features.installEvent = e; document.querySelectorAll('.js-install').forEach(function (b) { b.style.display = ''; }); });
            document.querySelectorAll('.js-install').forEach(function (b) { b.style.display = 'none'; b.addEventListener('click', Features.install); });
        },

        shortcuts: function () {
            document.addEventListener('keydown', function (e) {
                var tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); Features.openCmd(); return; }
                if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
                if (e.key === '/') { e.preventDefault(); openSearch(); }
            });
        },

        orgSchema: function () {
            var old = $('ldOrg'); if (old) old.remove();
            var s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ldOrg';
            var social = Object.keys(Bestow.social).map(function (k) { return Bestow.social[k]; }).filter(Boolean);
            s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: Bestow.branding.brand_name, slogan: Bestow.branding.tagline, logo: Bestow.branding.logo_colour, url: location.origin, telephone: Bestow.contact.phone, email: Bestow.contact.email, address: { '@type': 'PostalAddress', addressLocality: Bestow.contact.address }, sameAs: social.length ? social : undefined });
            document.head.appendChild(s);
        },

        /* ---------- pages ---------- */
        renderFaq: function () {
            var items = Bestow.faq || [];
            var html = items.length ? items.map(function (f, i) {
                return '<details class="faq-item glass-soft"' + (i === 0 ? ' open' : '') + '><summary>' + Utils.esc(f.q) + UI.icon('plus', 'faq-plus') + '</summary><div class="faq-answer">' + Utils.multiline(f.a) + '</div></details>';
            }).join('') : '<p class="text-muted">' + TX('faq.empty') + '</p>';
            var list = $('faqList'); if (list) list.innerHTML = html;
            var home = $('homeFaq'); if (home) home.innerHTML = items.slice(0, 4).map(function (f) { return '<details class="faq-item glass-soft"><summary>' + Utils.esc(f.q) + UI.icon('plus', 'faq-plus') + '</summary><div class="faq-answer">' + Utils.multiline(f.a) + '</div></details>'; }).join('');
            refreshIcons();
        },

        loadPolicy: function (ctx) {
            var slug = ctx.param || 'shipping', pol = Bestow.policies[slug], box = $('policyContent'), nav = $('policyNav');
            nav.innerHTML = Object.keys(Bestow.policies).map(function (k) { return '<a href="#policy/' + k + '" data-route="policy" data-param="' + k + '" class="policy-link' + (k === slug ? ' active' : '') + '">' + Utils.esc(Bestow.policies[k].title) + '</a>'; }).join('');
            if (!pol) { box.innerHTML = '<h2>' + TX('policy.not_found') + '</h2>'; return; }
            box.innerHTML = '<h1>' + Utils.esc(pol.title) + '</h1><div class="prose">' + String(pol.body || '').split(/\n{2,}/).map(function (p) { return '<p>' + Utils.multiline(p) + '</p>'; }).join('') + '</div>';
            Bestow._routeTitle = pol.title; document.title = pol.title + ' | ' + Bestow.branding.brand_name;
        },

        loadUnsub: function (ctx) {
            var email = (ctx.query && ctx.query.email) || '', box = $('unsubContent');
            if (!Utils.isEmail(email)) { box.innerHTML = '<p>' + TX('unsub.missing') + '</p>'; return; }
            box.innerHTML = '<h2>' + TX('unsub.title') + '</h2><p>' + TX('unsub.text', { email: email }) + '</p><button class="btn btn-primary" id="unsubBtn">' + TX('unsub.confirm') + '</button>';
            $('unsubBtn').addEventListener('click', async function () {
                var r = await API.newsletter.unsubscribe(email);
                box.innerHTML = r.error ? '<p>' + Utils.esc(r.error.message) + '</p>' : '<h2>' + UI.icon('check-circle', 'icon-md') + ' ' + TX('unsub.done') + '</h2>';
                refreshIcons();
            });
        },

        init: function () {
            bindSearch(); Compare.bind(); bindCmd();
            Features.scrollUi(); Features.network(); Features.cookies(); Features.pwa(); Features.shortcuts(); Features.particles(); Features.reveal();
            $('announceClose').addEventListener('click', function () { try { sessionStorage.setItem('bestow_announce_closed', (Bestow.settings.announcement || '').trim()); } catch (e) { /* ignore */ } Features.announce(); });
            document.addEventListener('cms:loaded', function () { Features.announce(); Features.renderFaq(); Features.orgSchema(); });
            document.addEventListener('route:change', function (e) { if (e.detail.name === 'home') Features.counters(); });
            Features.announce(); Features.renderFaq();
        }
    };
    window.Features = Features;
})();
