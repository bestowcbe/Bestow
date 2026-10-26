/* ==========================================================================
   BESTOW - CONTENT MANAGEMENT ENGINE
   Every visible word on the site is editable by the admin:
     - static page text      : <span data-cms="key">Default text</span>
     - input placeholders    : data-cms-ph="key"
     - tooltips / aria text  : data-cms-title="key"
     - text built by scripts : Bestow.tx('key', vars) (also clickable in Live Edit)
   Overrides live in the `site_content` table (section "texts"). Logo, brand name, tagline,
   contact details, social links, store settings, FAQ and policy pages are separate sections.
   ========================================================================== */
(function () {
    'use strict';

    var CACHE_KEY = 'bestow_cms_cache_v2';

    var DEFAULTS = {
        branding: {
            brand_name: 'Bestow',
            tagline: 'Elevate Your Memories',
            logo_white: 'https://res.cloudinary.com/j1fhagji/image/upload/f_auto/q_auto/Bestow_WhiteAsset_3_2x-8.png',
            logo_colour: 'https://res.cloudinary.com/j1fhagji/image/upload/v1791879105/Bestow_ColourAsset_1_2x-8.png',
            logo_black: 'https://res.cloudinary.com/j1fhagji/image/upload/v1791879104/Bestow_BlackAsset_2_2x-8.png',
            favicon: ''
        },
        settings: {
            free_shipping_threshold: 999, shipping_fee: 79, gst_percent: 18, gift_wrap_fee: 49,
            loyalty_rate: 1, loyalty_redeem_max_percent: 20, estimated_days_min: 5, estimated_days_max: 7,
            whatsapp: '916382052530', announcement: '', announcement_enabled: false,
            site_url: '', gstin: '', legal_name: '', business_address: ''
        },
        contact: { phone: '+91 63820 52530', email: 'bestowcbe@gmail.com', address: 'Coimbatore, Tamil Nadu, India', business_hours: 'Mon - Sat: 9:00 AM - 7:00 PM' },
        social: { facebook: '', instagram: '', twitter: '', youtube: '' },
        seo: { title: 'Bestow - Premium Customized Gifts', description: 'Premium customized gifts including awards, keychains, photo frames, badges, name boards and caricatures.', keywords: 'customized gifts, personalized mementos, awards, keychains' }
    };

    var DEFAULT_FAQ = [
        { q: 'How long does delivery take?', a: 'Most orders are delivered within 5 to 7 business days after your design is confirmed.' },
        { q: 'Can I customize my gift?', a: 'Yes. Customizable products let you add names, messages and photos before you pay.' },
        { q: 'What is your return policy?', a: 'We offer a 7 day return policy on eligible, non-personalized products. Personalized items are made to order and can be returned only if damaged or defective.' },
        { q: 'How can I track my order?', a: 'Use the Track Order page with your order number and email address, or open My Account if you are signed in.' },
        { q: 'Which payment methods do you accept?', a: 'We accept UPI, debit and credit cards, net banking and wallets, securely processed by Razorpay.' }
    ];

    var DEFAULT_POLICIES = {
        shipping: { title: 'Shipping Policy', body: 'We ship across India through trusted courier partners.\n\nOrders are produced after your design details are confirmed. Production usually takes 2 to 3 business days and delivery 3 to 4 business days after dispatch.\n\nShipping is free above the free shipping threshold shown at checkout. A flat fee applies below it.\n\nYou receive an email with tracking details as soon as your order ships.' },
        returns: { title: 'Returns and Refunds', body: 'Non-personalized products can be returned within 7 days of delivery in original condition.\n\nPersonalized products are made to order and cannot be returned unless they arrive damaged or defective. Please share photographs within 48 hours of delivery.\n\nApproved refunds are returned to the original payment method within 5 to 7 business days.' },
        privacy: { title: 'Privacy Policy', body: 'We collect only the information needed to process your orders and support you: name, contact details, delivery address and order history.\n\nPayments are handled by Razorpay. We never see or store your card details.\n\nWe do not sell your personal data. You can request deletion of your account at any time by contacting us.' },
        terms: { title: 'Terms of Service', body: 'By placing an order you agree to provide accurate information and to review your personalization details carefully before payment.\n\nPrices are in Indian Rupees and exclude GST, which is added at checkout. We may cancel and refund any order that cannot be fulfilled.\n\nAll designs and content on this site belong to the business and may not be reused without permission.' }
    };

    var Bestow = window.Bestow = window.Bestow || {};
    Bestow.texts = {};
    Bestow.branding = Object.assign({}, DEFAULTS.branding);
    Bestow.settings = Object.assign({}, DEFAULTS.settings);
    Bestow.contact = Object.assign({}, DEFAULTS.contact);
    Bestow.social = Object.assign({}, DEFAULTS.social);
    Bestow.seo = Object.assign({}, DEFAULTS.seo);
    Bestow.faq = DEFAULT_FAQ.slice();
    Bestow.policies = JSON.parse(JSON.stringify(DEFAULT_POLICIES));
    Bestow.registry = {};
    Bestow.DEFAULTS = DEFAULTS;
    Bestow.DEFAULT_POLICIES = DEFAULT_POLICIES;
    Bestow.DEFAULT_FAQ = DEFAULT_FAQ;

    /* ---------- tokens ---------- */
    function tokens() {
        var s = Bestow.settings, c = Bestow.contact;
        return {
            year: String(new Date().getFullYear()),
            brand: Bestow.branding.brand_name,
            tagline: Bestow.branding.tagline,
            phone: c.phone, email: c.email, address: c.address, hours: c.business_hours,
            free_shipping: Utils.price(s.free_shipping_threshold),
            shipping_fee: Utils.price(s.shipping_fee),
            gst: String(s.gst_percent), days_min: String(s.estimated_days_min), days_max: String(s.estimated_days_max)
        };
    }
    function fill(str, vars) {
        var all = Object.assign(tokens(), vars || {});
        return String(str).replace(/\{(\w+)\}/g, function (m, k) { return all[k] !== undefined ? all[k] : m; });
    }
    Bestow.fill = fill;

    /* ---------- registry ---------- */
    Bestow.define = function (map, group) {
        Object.keys(map).forEach(function (k) {
            if (!Bestow.registry[k]) Bestow.registry[k] = { def: map[k], group: group || k.split('.')[0] };
        });
    };

    function raw(key) {
        var ov = Bestow.texts[key];
        if (ov !== undefined && ov !== null && ov !== '') return ov;
        var r = Bestow.registry[key];
        return r ? r.def : '';
    }

    /* text for use in scripts (plain string) */
    Bestow.t = function (key, vars) { return fill(raw(key), vars); };

    /* text for use inside HTML built by scripts: editable in Live Edit */
    Bestow.tx = function (key, vars) {
        var has = vars && Object.keys(vars).length;
        return '<span data-cms="' + Utils.esc(key) + '"' + (has ? " data-cms-vars='" + Utils.esc(JSON.stringify(vars)).replace(/'/g, '&#39;') + "'" : '') + '>' + Utils.esc(Bestow.t(key, vars)) + '</span>';
    };

    /* ---------- apply to DOM ---------- */
    Bestow.apply = function (root) {
        root = root || document;
        var s = Bestow.settings;

        root.querySelectorAll('[data-cms]').forEach(function (el) {
            var key = el.getAttribute('data-cms');
            if (!Bestow.registry[key]) Bestow.registry[key] = { def: el.textContent.trim(), group: key.split('.')[0] };
            var vars; var vs = el.getAttribute('data-cms-vars');
            if (vs) { try { vars = JSON.parse(vs); } catch (e) { vars = null; } }
            var v = fill(raw(key), vars);
            if (el.textContent !== v) el.textContent = v;
        });
        root.querySelectorAll('[data-cms-ph]').forEach(function (el) {
            var key = el.getAttribute('data-cms-ph');
            if (!Bestow.registry[key]) Bestow.registry[key] = { def: el.getAttribute('placeholder') || '', group: key.split('.')[0], attr: true };
            el.setAttribute('placeholder', fill(raw(key)));
        });
        root.querySelectorAll('[data-cms-title]').forEach(function (el) {
            var key = el.getAttribute('data-cms-title');
            if (!Bestow.registry[key]) Bestow.registry[key] = { def: el.getAttribute('aria-label') || el.getAttribute('title') || '', group: key.split('.')[0], attr: true };
            var v = fill(raw(key));
            el.setAttribute('aria-label', v); el.setAttribute('title', v);
        });

        /* bound business data */
        root.querySelectorAll('[data-bind]').forEach(function (el) {
            var p = el.getAttribute('data-bind').split('.');
            var src = Bestow[p[0]] || {};
            if (src[p[1]] !== undefined) el.textContent = src[p[1]];
        });
        root.querySelectorAll('[data-href-bind]').forEach(function (el) {
            var spec = el.getAttribute('data-href-bind').split(':');
            var p = spec[1].split('.');
            var v = (Bestow[p[0]] || {})[p[1]] || '';
            el.setAttribute('href', spec[0] === 'tel' ? 'tel:' + v.replace(/[^\d+]/g, '') : spec[0] + ':' + v);
        });
        root.querySelectorAll('[data-social]').forEach(function (el) {
            var url = Bestow.social[el.getAttribute('data-social')];
            el.hidden = false; if (url) { el.setAttribute('href', url); el.setAttribute('target', '_blank'); } else { el.setAttribute('href', '#contact'); el.removeAttribute('target'); }
        });
        root.querySelectorAll('[data-brand]').forEach(function (el) { el.textContent = Bestow.branding.brand_name; });
        root.querySelectorAll('[data-setting]').forEach(function (el) {
            var k = el.getAttribute('data-setting'); var v = s[k];
            el.textContent = /threshold|fee/.test(k) ? Utils.price(v) : v;
        });
        Bestow.applyLogos(root);
    };

    Bestow.logoFor = function (variant) {
        var b = Bestow.branding, dark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (variant === 'white') return b.logo_white || b.logo_colour;
        if (variant === 'black') return b.logo_black || b.logo_colour;
        if (variant === 'colour') return b.logo_colour || b.logo_white;
        return dark ? (b.logo_white || b.logo_colour) : (b.logo_colour || b.logo_white);
    };
    Bestow.applyLogos = function (root) {
        (root || document).querySelectorAll('img[data-logo]').forEach(function (img) {
            var src = Bestow.logoFor(img.getAttribute('data-logo'));
            if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
            img.setAttribute('alt', Bestow.branding.brand_name);
        });
    };

    Bestow.applyMeta = function () {
        var b = Bestow.branding, seo = Bestow.seo;
        var title = seo.title || (b.brand_name + ' - ' + b.tagline);
        if (!Bestow._routeTitle) document.title = title;
        var set = function (sel, val) { var el = document.querySelector(sel); if (el && val) el.setAttribute('content', val); };
        set('meta[name="description"]', seo.description);
        set('meta[name="keywords"]', seo.keywords);
        set('meta[property="og:title"]', title);
        set('meta[property="og:description"]', seo.description);
        set('meta[property="og:image"]', b.logo_colour);
        var fav = document.querySelector('link[rel="icon"]');
        if (fav) fav.setAttribute('href', b.favicon || b.logo_colour);
        var touch = document.querySelector('link[rel="apple-touch-icon"]');
        if (touch) touch.setAttribute('href', b.favicon || b.logo_colour);
    };

    /* ---------- data in ---------- */
    function ingest(rows) {
        (rows || []).forEach(function (r) {
            var c = r.content;
            if (c === null || c === undefined) return;
            switch (r.section_key) {
                case 'texts': Bestow.texts = (c && typeof c === 'object') ? c : {}; break;
                case 'branding': Bestow.branding = Object.assign({}, DEFAULTS.branding, stripEmpty(c)); break;
                case 'settings': Bestow.settings = Object.assign({}, DEFAULTS.settings, c); break;
                case 'contact': Bestow.contact = Object.assign({}, DEFAULTS.contact, stripEmpty(c)); break;
                case 'social': Bestow.social = Object.assign({}, DEFAULTS.social, c); break;
                case 'seo': Bestow.seo = Object.assign({}, DEFAULTS.seo, stripEmpty(c)); break;
                case 'faq': if (Array.isArray(c) && c.length) Bestow.faq = c; break;
                case 'policies': if (c && typeof c === 'object') Bestow.policies = Object.assign(JSON.parse(JSON.stringify(DEFAULT_POLICIES)), c); break;
            }
        });
    }
    function stripEmpty(o) {
        var out = {};
        Object.keys(o || {}).forEach(function (k) { if (o[k] !== '' && o[k] !== null && o[k] !== undefined) out[k] = o[k]; });
        return out;
    }

    Bestow.loadFromCache = function () {
        var c = Utils.storage.get(CACHE_KEY, null);
        if (c && Array.isArray(c)) { ingest(c); return true; }
        return false;
    };

    Bestow.load = async function () {
        var r = await API.content.all();
        if (r.data) {
            ingest(r.data);
            Utils.storage.set(CACHE_KEY, r.data);
        }
        Bestow.apply();
        Bestow.applyMeta();
        document.dispatchEvent(new CustomEvent('cms:loaded'));
        return !r.error;
    };

    /* ---------- data out (admin) ---------- */
    Bestow.saveSection = async function (key, content) {
        var uid = window.AppState && AppState.user ? AppState.user.id : null;
        var r = await API.content.set(key, content, uid);
        if (r.error) { UI.toast('Could not save: ' + r.error.message, 'error'); return false; }
        var rows = Utils.storage.get(CACHE_KEY, []).filter(function (x) { return x.section_key !== key; });
        rows.push({ section_key: key, content: content });
        Utils.storage.set(CACHE_KEY, rows);
        ingest([{ section_key: key, content: content }]);
        Bestow.apply(); Bestow.applyMeta();
        document.dispatchEvent(new CustomEvent('cms:loaded'));
        if (uid) API.activity.log(uid, 'update', 'site_content', null, { section: key });
        return true;
    };

    /* text overrides are merged against the latest saved copy so two admins never overwrite each other */
    Bestow.saveTexts = async function (changes) {
        var latest = await API.content.get('texts');
        var merged = Object.assign({}, (latest.data && latest.data.content) || Bestow.texts);
        Object.keys(changes).forEach(function (k) {
            if (changes[k] === null || changes[k] === '' || changes[k] === (Bestow.registry[k] || {}).def) delete merged[k];
            else merged[k] = changes[k];
        });
        return Bestow.saveSection('texts', merged);
    };

    Bestow.listKeys = function () {
        Bestow.apply(); // make sure every on-page key is registered
        return Object.keys(Bestow.registry).sort().map(function (k) {
            var r = Bestow.registry[k];
            return { key: k, def: r.def, value: Bestow.texts[k] !== undefined ? Bestow.texts[k] : r.def, group: r.group, edited: Bestow.texts[k] !== undefined, attr: !!r.attr };
        });
    };

    /* ---------- Live Edit mode (admin) ---------- */
    Bestow.liveEdit = function (on) {
        document.body.classList.toggle('cms-editing', !!on);
        Bestow.editing = !!on;
        var pill = document.getElementById('liveEditPill');
        if (pill) pill.classList.toggle('visible', !!on);
    };

    document.addEventListener('click', async function (e) {
        if (!Bestow.editing) return;
        if (e.target.closest('#liveEditPill, .modal-overlay, #toastContainer')) return;
        var logo = e.target.closest('img[data-logo]');
        if (logo) { e.preventDefault(); e.stopPropagation(); if (window.Admin && Admin.openBranding) Admin.openBranding(); return; }
        var el = e.target.closest('[data-cms]');
        if (!el) return;
        e.preventDefault(); e.stopPropagation();
        var key = el.getAttribute('data-cms');
        var current = raw(key);
        var val = await UI.prompt({
            title: 'Edit text', label: key, value: current, multiline: current.length > 60 || current.indexOf('\n') > -1,
            hint: 'Leave empty to restore the original wording. Tokens such as {brand}, {year} and {phone} are filled automatically.', confirmText: 'Save text'
        });
        if (val === null) return;
        var ok = await Bestow.saveTexts((function () { var o = {}; o[key] = val; return o; })());
        if (ok) UI.toast('Text updated', 'success', 1800);
    }, true);

    document.addEventListener('theme:change', function () { Bestow.applyLogos(); });
})();
