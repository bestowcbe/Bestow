/* ==========================================================================
   BESTOW - SUPABASE CLIENT AND DATA API
   Every method resolves to { data, error, count? } and never throws.
   Only the public anon key lives here. The service role key and the Razorpay
   secret must never be placed in frontend code (they belong in edge function secrets).
   ========================================================================== */
(function () {
    'use strict';

    var CONFIG = {
        SUPABASE_URL: 'https://fhrvqgmhwzlcfnydwypc.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZocnZxZ21od3psY2ZueWR3eXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzU5MzYsImV4cCI6MjEwNzQ1MTkzNn0.zb-G1uKLkVk9DugJqJk-u7-Z0p4EcdtmJDYeJN-hE54',
        ADMIN_EMAIL: 'bestowcbe@gmail.com'
    };
    window.BESTOW_CONFIG = CONFIG;

    var sb = null;
    try {
        if (window.supabase && window.supabase.createClient) {
            sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
                auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, storageKey: 'bestow_auth_token' },
                global: { headers: { 'X-Client-Info': 'bestow-web-2.0' } },
                realtime: { params: { eventsPerSecond: 10 } }
            });
        } else {
            console.error('[Bestow] Supabase library failed to load.');
        }
    } catch (err) {
        console.error('[Bestow] Supabase init error:', err);
    }
    window.sb = sb;

    var EDGE_FUNCTION = 'generate-invoice';
    var FN_OPS = { 'create-payment-order': 'create-order', 'verify-payment': 'verify-payment', 'generate-invoice': 'invoice', 'send-email': 'email' };

    var OFFLINE = { data: null, error: { message: 'Service unavailable. Please check your connection.' } };

    function q(fn) {
        return async function () {
            if (!sb) return OFFLINE;
            try {
                var r = await fn.apply(null, arguments);
                if (r && r.error) console.warn('[API]', r.error.message || r.error);
                return r || { data: null, error: null };
            } catch (e) {
                console.error('[API]', e);
                return { data: null, error: { message: (e && e.message) || 'Request failed' } };
            }
        };
    }

    /* strips characters that would break a PostgREST filter string */
    function clean(s) { return String(s || '').replace(/[,()%*\\"']/g, ' ').trim().slice(0, 80); }
    function safeFile(name) { return String(name || 'file').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(-60); }

    var SORTS = {
        'newest': ['created_at', false], 'price-asc': ['price', true], 'price-desc': ['price', false],
        'name-asc': ['name', true], 'name-desc': ['name', false], 'popular': ['sold_count', false], 'rating': ['avg_rating', false]
    };

    var API = {
        sb: sb,
        config: CONFIG,

        /* ---------- EDGE FUNCTIONS ---------- */
        /* All backend operations live in ONE edge function ("generate-invoice").
           The logical name below is translated into the "op" field the function routes on. */
        fn: async function (name, body) {
            if (!sb) return OFFLINE;
            var op = FN_OPS[name];
            if (!op) return { data: null, error: { message: 'Unknown operation' } };
            try {
                var res = await sb.functions.invoke(EDGE_FUNCTION, { body: Object.assign({}, body || {}, { op: op }) });
                if (res.error) {
                    var msg = res.error.message || 'Request failed';
                    try { if (res.error.context && res.error.context.json) { var j = await res.error.context.json(); msg = j.message || j.error || msg; } } catch (e) { /* ignore */ }
                    return { data: null, error: { message: msg } };
                }
                return { data: res.data, error: null };
            } catch (e) {
                return { data: null, error: { message: (e && e.message) || 'Request failed' } };
            }
        },

        /* ---------- AUTH ---------- */
        auth: {
            session: q(async function () { var r = await sb.auth.getSession(); return { data: r.data ? r.data.session : null, error: r.error }; }),
            signIn: q(async function (email, password) { return sb.auth.signInWithPassword({ email: email, password: password }); }),
            signUp: q(async function (email, password, meta) {
                return sb.auth.signUp({ email: email, password: password, options: { data: meta || {}, emailRedirectTo: location.origin + location.pathname } });
            }),
            signOut: q(async function () { return sb.auth.signOut(); }),
            resetPassword: q(async function (email) { return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '#account' }); }),
            updatePassword: q(async function (pw) { return sb.auth.updateUser({ password: pw }); }),
            onChange: function (cb) { return sb ? sb.auth.onAuthStateChange(cb) : null; }
        },

        /* ---------- PROFILES ---------- */
        profile: {
            get: q(async function (id) { return sb.from('profiles').select('*').eq('id', id).maybeSingle(); }),
            update: q(async function (id, patch) { return sb.from('profiles').update(patch).eq('id', id).select().maybeSingle(); }),
            customers: q(async function (o) {
                o = o || {};
                var page = o.page || 1, limit = o.limit || 50;
                var qy = sb.from('profiles').select('*', { count: 'exact' }).eq('role', 'customer').order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
                if (o.search) { var s = clean(o.search); qy = qy.or('full_name.ilike.%' + s + '%,email.ilike.%' + s + '%,phone.ilike.%' + s + '%'); }
                return qy;
            }),
            count: q(async function () { return sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'); })
        },

        /* ---------- CATEGORIES ---------- */
        categories: {
            all: q(async function (activeOnly) {
                var qy = sb.from('categories').select('*').order('display_order', { ascending: true }).order('name');
                if (activeOnly) qy = qy.eq('is_active', true);
                return qy;
            }),
            create: q(async function (row) { return sb.from('categories').insert(row).select().single(); }),
            update: q(async function (id, row) { return sb.from('categories').update(row).eq('id', id).select().single(); }),
            remove: q(async function (id) { return sb.from('categories').delete().eq('id', id); })
        },

        /* ---------- PRODUCTS ---------- */
        products: {
            list: q(async function (o) {
                o = o || {};
                var page = o.page || 1, limit = o.limit || 12;
                var sel = '*, categories(id,name,slug)';
                var qy = sb.from('products').select(sel, { count: 'exact' });
                if (!o.includeInactive) qy = qy.eq('is_active', true);
                if (o.categoryId) qy = qy.eq('category_id', o.categoryId);
                if (o.featured) qy = qy.eq('is_featured', true);
                if (o.minPrice > 0) qy = qy.gte('price', o.minPrice);
                if (o.maxPrice > 0) qy = qy.lte('price', o.maxPrice);
                if (o.minRating > 0) qy = qy.gte('avg_rating', o.minRating);
                if (o.inStock) qy = qy.gt('stock_quantity', 0);
                if (o.customizable) qy = qy.eq('is_customizable', true);
                if (o.search) { var s = clean(o.search); if (s) qy = qy.or('name.ilike.%' + s + '%,short_description.ilike.%' + s + '%,sku.ilike.%' + s + '%'); }
                var sort = SORTS[o.sort] || SORTS.newest;
                qy = qy.order(sort[0], { ascending: sort[1] });
                if (sort[0] !== 'created_at') qy = qy.order('created_at', { ascending: false });
                return qy.range((page - 1) * limit, page * limit - 1);
            }),
            byId: q(async function (id) { return sb.from('products').select('*, categories(id,name,slug)').eq('id', id).maybeSingle(); }),
            byIds: q(async function (ids) {
                if (!ids || !ids.length) return { data: [], error: null };
                return sb.from('products').select('*, categories(id,name,slug)').in('id', ids);
            }),
            related: q(async function (categoryId, excludeId, limit) {
                var qy = sb.from('products').select('*, categories(id,name,slug)').eq('is_active', true).neq('id', excludeId).limit(limit || 4);
                if (categoryId) qy = qy.eq('category_id', categoryId);
                return qy.order('sold_count', { ascending: false });
            }),
            view: function (id) { if (sb) sb.rpc('increment_view_count', { product_id: id }).then(function () {}, function () {}); },
            create: q(async function (row) { return sb.from('products').insert(row).select().single(); }),
            update: q(async function (id, row) { return sb.from('products').update(row).eq('id', id).select().single(); }),
            remove: q(async function (id) { return sb.from('products').delete().eq('id', id); }),
            lowStock: q(async function (limit) {
                var r = await sb.from('products').select('id,name,sku,stock_quantity,low_stock_threshold,thumbnail,images,is_active').order('stock_quantity', { ascending: true }).limit(60);
                if (r.data) r.data = r.data.filter(function (p) { return p.stock_quantity <= (p.low_stock_threshold == null ? 5 : p.low_stock_threshold); }).slice(0, limit || 10);
                return r;
            }),
            count: q(async function () { return sb.from('products').select('id', { count: 'exact', head: true }); }),
            topSellers: q(async function (n) { return sb.from('products').select('id,name,sold_count,price,thumbnail,images').order('sold_count', { ascending: false }).limit(n || 5); }),
            alertMe: q(async function (productId, email) { return sb.from('stock_alerts').insert({ product_id: productId, email: String(email).toLowerCase() }); })
        },

        /* ---------- ORDERS ---------- */
        orders: {
            mine: q(async function (userId) {
                return sb.from('orders').select('*').eq('customer_id', userId).neq('payment_status', 'pending').order('created_at', { ascending: false }).limit(100);
            }),
            byId: q(async function (id) { return sb.from('orders').select('*').eq('id', id).maybeSingle(); }),
            track: q(async function (num, email) { return sb.rpc('track_order', { p_order_number: num, p_email: email }); }),
            all: q(async function (o) {
                o = o || {};
                var page = o.page || 1, limit = o.limit || 25;
                var qy = sb.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false });
                if (o.status && o.status !== 'all') qy = qy.eq('order_status', o.status);
                if (o.payment && o.payment !== 'all') qy = qy.eq('payment_status', o.payment);
                if (o.search) { var s = clean(o.search); qy = qy.or('order_number.ilike.%' + s + '%,customer_name.ilike.%' + s + '%,customer_email.ilike.%' + s + '%,customer_phone.ilike.%' + s + '%'); }
                return qy.range((page - 1) * limit, page * limit - 1);
            }),
            update: q(async function (id, patch) { return sb.from('orders').update(patch).eq('id', id).select().single(); }),
            cancelMine: q(async function (id, reason) { return sb.rpc('cancel_my_order', { p_order_id: id, p_reason: reason || '' }); }),
            analytics: q(async function (days) {
                var since = new Date(Date.now() - (days || 30) * 86400000).toISOString();
                return sb.from('orders').select('id,order_number,total_amount,order_status,payment_status,created_at,items,customer_name').gte('created_at', since).order('created_at', { ascending: true }).limit(3000);
            }),
            totals: q(async function () {
                var all = await sb.from('orders').select('id', { count: 'exact', head: true });
                var paid = await sb.from('orders').select('total_amount').eq('payment_status', 'paid').limit(10000);
                var revenue = 0;
                (paid.data || []).forEach(function (r) { revenue += Number(r.total_amount) || 0; });
                return { data: { count: all.count || 0, revenue: revenue, paid: (paid.data || []).length }, error: all.error || paid.error };
            })
        },

        /* ---------- REVIEWS ---------- */
        reviews: {
            byProduct: q(async function (productId) { return sb.from('reviews').select('*').eq('product_id', productId).eq('is_approved', true).order('created_at', { ascending: false }).limit(100); }),
            byCustomer: q(async function (userId) { return sb.from('reviews').select('*, products(id,name,thumbnail,images)').eq('customer_id', userId).order('created_at', { ascending: false }); }),
            approvedFeed: q(async function (limit) { return sb.from('reviews').select('*, products(name)').eq('is_approved', true).gte('rating', 4).order('created_at', { ascending: false }).limit(limit || 10); }),
            all: q(async function (filter) {
                var qy = sb.from('reviews').select('*, products(name)').order('created_at', { ascending: false }).limit(200);
                if (filter === 'pending') qy = qy.eq('is_approved', false);
                if (filter === 'approved') qy = qy.eq('is_approved', true);
                return qy;
            }),
            create: q(async function (row) { return sb.from('reviews').insert(row).select().single(); }),
            update: q(async function (id, patch) { return sb.from('reviews').update(patch).eq('id', id).select().single(); }),
            remove: q(async function (id) { return sb.from('reviews').delete().eq('id', id); }),
            helpful: q(async function (id) { return sb.rpc('vote_review_helpful', { p_review_id: id }); })
        },

        /* ---------- COUPONS ---------- */
        coupons: {
            all: q(async function () { return sb.from('coupons').select('*').order('created_at', { ascending: false }); }),
            validate: q(async function (code, amount) { return sb.rpc('validate_coupon', { p_code: code, p_amount: amount }); }),
            create: q(async function (row) { return sb.from('coupons').insert(row).select().single(); }),
            update: q(async function (id, row) { return sb.from('coupons').update(row).eq('id', id).select().single(); }),
            remove: q(async function (id) { return sb.from('coupons').delete().eq('id', id); })
        },

        /* ---------- STORAGE ---------- */
        storage: {
            upload: q(async function (bucket, folder, file) {
                var path = folder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '-' + safeFile(file.name);
                var r = await sb.storage.from(bucket).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type || undefined });
                if (r.error) return { data: null, error: r.error };
                return { data: { path: path, url: sb.storage.from(bucket).getPublicUrl(path).data.publicUrl }, error: null };
            }),
            remove: q(async function (bucket, paths) { return sb.storage.from(bucket).remove(paths); }),
            signed: q(async function (bucket, path, seconds) {
                var r = await sb.storage.from(bucket).createSignedUrl(path, seconds || 600);
                return { data: r.data ? r.data.signedUrl : null, error: r.error };
            })
        },

        /* ---------- SITE CONTENT (CMS) ---------- */
        content: {
            all: q(async function () { return sb.from('site_content').select('section_key,content'); }),
            set: q(async function (key, content, userId) {
                return sb.from('site_content').upsert({ section_key: key, content: content, updated_by: userId || null, updated_at: new Date().toISOString() }, { onConflict: 'section_key' }).select().single();
            }),
            get: q(async function (key) { return sb.from('site_content').select('content').eq('section_key', key).maybeSingle(); })
        },

        /* ---------- INQUIRIES / NEWSLETTER / LOGS ---------- */
        inquiries: {
            create: q(async function (row) { return sb.from('contact_inquiries').insert(row); }),
            all: q(async function (status) {
                var qy = sb.from('contact_inquiries').select('*').order('created_at', { ascending: false }).limit(200);
                if (status && status !== 'all') qy = qy.eq('status', status);
                return qy;
            }),
            update: q(async function (id, patch) { return sb.from('contact_inquiries').update(patch).eq('id', id); }),
            remove: q(async function (id) { return sb.from('contact_inquiries').delete().eq('id', id); })
        },
        newsletter: {
            subscribe: q(async function (email) { return sb.rpc('subscribe_newsletter', { p_email: email }); }),
            unsubscribe: q(async function (email) { return sb.rpc('unsubscribe_newsletter', { p_email: email }); }),
            all: q(async function () { return sb.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }).limit(1000); }),
            remove: q(async function (id) { return sb.from('newsletter_subscribers').delete().eq('id', id); })
        },
        activity: {
            log: function (adminId, action, type, entityId, details) {
                if (!sb || !adminId) return;
                sb.from('admin_activity_log').insert({ admin_id: adminId, action: action, entity_type: type, entity_id: entityId || null, details: details || {} }).then(function () {}, function () {});
            },
            all: q(async function (limit) { return sb.from('admin_activity_log').select('*, profiles:admin_id(full_name,email)').order('created_at', { ascending: false }).limit(limit || 100); })
        },
        emailLog: {
            all: q(async function (limit) { return sb.from('email_log').select('*').order('created_at', { ascending: false }).limit(limit || 100); })
        },
        stockAlerts: {
            all: q(async function () { return sb.from('stock_alerts').select('*, products(name)').order('created_at', { ascending: false }).limit(200); })
        },

        /* ---------- REALTIME ---------- */
        realtime: {
            orders: function (filter, cb) {
                if (!sb) return null;
                var opts = { event: '*', schema: 'public', table: 'orders' };
                if (filter) opts.filter = filter;
                var ch = sb.channel('orders-' + (filter || 'all') + '-' + Math.random().toString(36).slice(2, 6)).on('postgres_changes', opts, cb).subscribe();
                return ch;
            },
            stop: function (ch) { if (sb && ch) { try { sb.removeChannel(ch); } catch (e) { /* ignore */ } } }
        }
    };

    window.API = API;
})();
