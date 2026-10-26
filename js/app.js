/* ==========================================================================
   BESTOW - APPLICATION CONTROLLER
   Boot sequence, theme, authentication, account area, contact + newsletter forms,
   navigation chrome and route registration.
   ========================================================================== */
(function () {
    'use strict';

    var T = function (k, v) { return Bestow.t(k, v); };
    var TX = function (k, v) { return Bestow.tx(k, v); };
    var $ = function (id) { return document.getElementById(id); };
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    var AppState = window.AppState = { user: null, profile: null, isAdmin: false, isLoggedIn: false };

    Bestow.define({
        'toast.signin_required': 'Please sign in to continue',
        'toast.admin_only': 'This area is only for administrators',
        'toast.page_error': 'Something went wrong while loading this page',
        'auth.welcome_back': 'Welcome back',
        'auth.welcome_sub': 'Sign in to your account',
        'auth.create_title': 'Create your account',
        'auth.create_sub': 'Join to track orders, earn points and save your wishlist',
        'auth.forgot_title': 'Reset your password',
        'auth.forgot_sub': 'We will email you a secure reset link',
        'auth.no_account': 'Do not have an account?',
        'auth.have_account': 'Already have an account?',
        'auth.create_btn': 'Create Account',
        'auth.signin_btn': 'Sign In',
        'auth.bad_credentials': 'Incorrect email or password',
        'auth.not_confirmed': 'Please confirm your email address first. Check your inbox for the confirmation link.',
        'auth.signed_in': 'Signed in successfully',
        'auth.signed_out': 'You have been signed out',
        'auth.pw_mismatch': 'Passwords do not match',
        'auth.pw_short': 'Password must be at least 8 characters',
        'auth.phone_invalid': 'Enter a valid 10 digit mobile number',
        'auth.exists': 'An account with this email already exists. Try signing in.',
        'auth.created': 'Account created. Welcome aboard.',
        'auth.confirm_email': 'Account created. Please check your email to confirm your address, then sign in.',
        'auth.reset_sent': 'If that email is registered, a reset link is on its way.',
        'auth.reset_prompt': 'Choose a new password',
        'auth.reset_label': 'New password (min 8 characters)',
        'auth.reset_done': 'Your password has been updated',
        'auth.disabled': 'This account has been disabled. Please contact support.',
        'auth.error': 'Something went wrong. Please try again.',
        'user.guest_name': 'Welcome, Guest',
        'user.guest_sub': 'Sign in to continue',
        'user.account': 'My Account',
        'user.orders': 'My Orders',
        'user.wishlist': 'Wishlist',
        'user.admin': 'Admin Panel', 'user.admin_login': 'Admin login',
        'user.live_edit': 'Live Text Editing',
        'user.signout': 'Sign Out',
        'user.signin': 'Sign In',
        'user.register': 'Create Account',
        'account.saved': 'Profile updated',
        'account.address_saved': 'Address saved',
        'account.avatar_saved': 'Profile photo updated',
        'account.avatar_failed': 'Photo upload failed',
        'account.points_title': 'Loyalty points',
        'account.points_worth': 'Worth {amount} on your next order',
        'account.points_how': 'Earn {rate} point for every Rs. 100 you spend. Redeem at checkout, up to {max}% of an order.',
        'account.password_btn': 'Change password',
        'account.password_prompt': 'Choose a new password',
        'account.password_done': 'Password changed',
        'contact.sent': 'Message sent. Check your email for our acknowledgement.',
        'contact.failed': 'We could not send your message. Please try again or call us.',
        'contact.invalid': 'Please enter a valid email address',
        'newsletter.ok': 'You are subscribed. Welcome to the list.',
        'newsletter.bad': 'Enter a valid email address',
        'newsletter.fail': 'Subscription failed. Please try again.',
        'nav.menu': 'Menu'
    }, 'app');

    /* ====================================================================
       THEME
       ==================================================================== */
    var App = {
        state: AppState,
        theme: function () { return document.documentElement.getAttribute('data-theme') || 'light'; },
        setTheme: function (t, persist) {
            document.documentElement.setAttribute('data-theme', t);
            var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', t === 'dark' ? '#0b0b0c' : '#de2128');
            if (persist) Utils.storage.set('bestow_theme', t);
            document.querySelectorAll('.js-theme-icon').forEach(function (i) { i.setAttribute('data-lucide', t === 'dark' ? 'sun' : 'moon'); });
            document.querySelectorAll('.js-theme-toggle').forEach(function (b) { b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false'); });
            refreshIcons();
            document.dispatchEvent(new CustomEvent('theme:change', { detail: t }));
        },
        toggleTheme: function () { App.setTheme(App.theme() === 'dark' ? 'light' : 'dark', true); }
    };
    window.App = App;

    function initTheme() {
        var saved = Utils.storage.get('bestow_theme', null);
        var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
        App.setTheme(saved || (mq && mq.matches ? 'dark' : 'light'), false);
        if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { if (!Utils.storage.get('bestow_theme', null)) App.setTheme(e.matches ? 'dark' : 'light', false); });
        document.querySelectorAll('.js-theme-toggle').forEach(function (b) { b.addEventListener('click', App.toggleTheme); });
    }

    /* ====================================================================
       AUTH STATE
       ==================================================================== */
    var handling = null;

    async function handleUser(user) {
        if (!user) { clearUser(); return; }
        if (AppState.user && AppState.user.id === user.id && AppState.profile) { AppState.user = user; return; }
        if (handling === user.id) return;
        handling = user.id;
        AppState.user = user;
        var profile = null;
        for (var i = 0; i < 4 && !profile; i++) {
            var r = await API.profile.get(user.id); profile = r.data;
            if (!profile) await sleep(450 * (i + 1));
        }
        if (!profile) profile = { id: user.id, email: user.email, full_name: (user.user_metadata && user.user_metadata.full_name) || '', phone: '', role: 'customer', is_active: true };
        if (profile.is_active === false) {
            await API.auth.signOut(); clearUser(); UI.toast(T('auth.disabled'), 'error', 7000); handling = null; return;
        }
        AppState.profile = profile;
        AppState.isAdmin = profile.role === 'admin';
        AppState.isLoggedIn = true;
        handling = null;
        Wishlist.merge(profile);
        Orders.subscribe(user.id);
        updateUserUI();
        try {
            var k = 'bestow_session_mail_' + user.id;
            if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); API.fn('send-email', { type: 'session_started' }); }
        } catch (e) { /* storage unavailable */ }
        document.dispatchEvent(new CustomEvent('auth:change'));
    }

    function clearUser() {
        AppState.user = null; AppState.profile = null; AppState.isAdmin = false; AppState.isLoggedIn = false; handling = null;
        Orders.unsubscribe();
        if (window.Admin && Admin.stop) Admin.stop();
        Bestow.liveEdit(false);
        updateUserUI();
        document.dispatchEvent(new CustomEvent('auth:change'));
    }

    async function initAuth() {
        var s = await API.auth.session();
        if (s.data && s.data.user) await handleUser(s.data.user);
        API.auth.onChange(function (event, session) {
            setTimeout(async function () {
                if (event === 'SIGNED_OUT') { clearUser(); var n = Router.current().name; if (n === 'account' || n === 'admin') Router.go('home'); }
                else if (event === 'PASSWORD_RECOVERY') { await handleUser(session && session.user); promptNewPassword(); }
                else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session && session.user) { await handleUser(session.user); }
            }, 0);
        });
    }

    async function promptNewPassword() {
        var pw = await UI.prompt({ title: T('auth.reset_prompt'), label: T('auth.reset_label'), type: 'password', required: true, confirmText: 'Update' });
        if (!pw) return;
        if (pw.length < 8) { UI.toast(T('auth.pw_short'), 'warning'); return; }
        var r = await API.auth.updatePassword(pw);
        UI.toast(r.error ? r.error.message : T('auth.reset_done'), r.error ? 'error' : 'success');
    }

    /* ====================================================================
       USER MENU / CHROME
       ==================================================================== */
    function avatarHtml(p, cls) {
        if (p && p.avatar_url) return '<img class="' + cls + '" src="' + Utils.esc(p.avatar_url) + '" alt="">';
        var n = (p && (p.full_name || p.email) || 'G').trim().charAt(0).toUpperCase();
        return '<span class="' + cls + ' avatar-initial">' + Utils.esc(n) + '</span>';
    }

    function updateUserUI() {
        var p = AppState.profile, u = AppState.user;
        var head = $('userDropdownHeader'), body = $('userDropdownBody');
        if (u && p) {
            head.innerHTML = '<div class="user-avatar-wrap">' + avatarHtml(p, 'user-avatar') + '</div><p class="user-dropdown-name">' + Utils.esc(p.full_name || 'Customer') + '</p><p class="user-dropdown-email">' + Utils.esc(p.email) + '</p>' + (p.loyalty_points > 0 ? '<span class="points-chip">' + UI.icon('star', 'icon-xs') + ' ' + p.loyalty_points + ' pts</span>' : '');
            body.innerHTML =
                '<button class="user-dropdown-item" data-route="account">' + UI.icon('user') + ' ' + TX('user.account') + '</button>' +
                '<button class="user-dropdown-item" data-route="account" data-query="tab=orders">' + UI.icon('package') + ' ' + TX('user.orders') + '</button>' +
                '<button class="user-dropdown-item" data-route="wishlist">' + UI.icon('heart') + ' ' + TX('user.wishlist') + '</button>' +
                (AppState.isAdmin ? '<div class="dropdown-sep"></div><button class="user-dropdown-item" data-route="admin">' + UI.icon('layout-dashboard') + ' ' + TX('user.admin') + '</button><button class="user-dropdown-item" data-action="live-edit">' + UI.icon('pencil') + ' ' + TX('user.live_edit') + '</button>' : '') +
                '<div class="dropdown-sep"></div><button class="user-dropdown-item danger" data-action="logout">' + UI.icon('log-out') + ' ' + TX('user.signout') + '</button>';
        } else {
            head.innerHTML = '<div class="user-avatar-wrap">' + UI.icon('circle-user', 'user-avatar-icon') + '</div><p class="user-dropdown-name">' + TX('user.guest_name') + '</p><p class="user-dropdown-email">' + TX('user.guest_sub') + '</p>';
            body.innerHTML = '<button class="user-dropdown-item" data-action="login">' + UI.icon('log-in') + ' ' + TX('user.signin') + '</button><button class="user-dropdown-item" data-action="register">' + UI.icon('user-plus') + ' ' + TX('user.register') + '</button><div class="dropdown-sep"></div><button class="user-dropdown-item" data-action="admin-login">' + UI.icon('shield-check') + ' ' + TX('user.admin_login') + '</button>';
        }
        var mb = $('mobileAuthBtn');
        if (mb) { mb.setAttribute('data-action', u ? 'logout' : 'login'); mb.querySelector('span').textContent = u ? T('user.signout') : T('user.signin'); }
        var ub = $('userMenuBtn');
        ub.innerHTML = u && p && p.avatar_url ? avatarHtml(p, 'nav-avatar') : u && p ? avatarHtml(p, 'nav-avatar') : UI.icon('user');
        document.querySelectorAll('.js-admin-only').forEach(function (el) { el.style.display = AppState.isAdmin ? '' : 'none'; });
        refreshIcons();
        if (Router.current().name === 'account') fillAccount();
    }

    function toggleMobileNav(open) {
        $('mobileNav').classList.toggle('open', open); $('mobileNavOverlay').classList.toggle('open', open);
        document.body.classList.toggle('nav-open', open);
        document.body.classList.toggle('no-scroll', open || !!document.querySelector('.modal-overlay.active'));
    }

    function handleAction(action) {
        if (action === 'login') { Bestow.pendingAdmin = false; showAuth('login'); }
        else if (action === 'register') showAuth('register');
        else if (action === 'admin-login') { Router.go(AppState.isAdmin ? 'admin' : 'admin-login'); $('userDropdown') && $('userDropdown').classList.remove('open'); }
        else if (action === 'logout') logout();
        else if (action === 'whatsapp-chat') WhatsApp.chat();
        else if (action === 'live-edit') { Bestow.liveEdit(!Bestow.editing); $('userDropdown').classList.remove('open'); UI.toast(Bestow.editing ? 'Live editing on. Click any text to change it.' : 'Live editing off', 'info', 2600); }
    }

    async function logout() {
        $('userDropdown').classList.remove('open'); toggleMobileNav(false);
        await API.auth.signOut();
        clearUser();
        UI.toast(T('auth.signed_out'), 'info');
        var n = Router.current().name; if (n === 'account' || n === 'admin') Router.go('home');
    }

    /* ====================================================================
       AUTH MODAL
       ==================================================================== */
    function showAuth(view) {
        $('userDropdown').classList.remove('open'); toggleMobileNav(false);
        ['loginForm', 'registerForm', 'forgotForm'].forEach(function (id) { $(id).style.display = 'none'; });
        var map = { login: ['loginForm', 'auth.welcome_back', 'auth.welcome_sub'], register: ['registerForm', 'auth.create_title', 'auth.create_sub'], forgot: ['forgotForm', 'auth.forgot_title', 'auth.forgot_sub'] };
        var m = map[view] || map.login;
        $(m[0]).style.display = '';
        $('authModalTitle').textContent = T(m[1]); $('authModalSubtitle').textContent = T(m[2]);
        $('authSwitchWrap').style.display = view === 'forgot' ? 'none' : '';
        $('authSwitchText').textContent = T(view === 'register' ? 'auth.have_account' : 'auth.no_account');
        $('authSwitchBtn').textContent = T(view === 'register' ? 'auth.signin_btn' : 'auth.create_btn');
        $('authSwitchBtn').setAttribute('data-view', view === 'register' ? 'login' : 'register');
        if (Bestow.pendingAdmin && view === 'login') { $('authModalTitle').textContent = 'Admin sign in'; $('authModalSubtitle').textContent = 'Sign in with the administrator account to open the dashboard.'; }
        UI.openModal('authModal');
    }

    function authError(err) {
        var m = (err && err.message) || '';
        if (/invalid login/i.test(m)) return T('auth.bad_credentials');
        if (/not confirmed/i.test(m)) return T('auth.not_confirmed');
        if (/already registered|already been registered/i.test(m)) return T('auth.exists');
        return m || T('auth.error');
    }

    async function onLogin(e) {
        e.preventDefault();
        var btn = e.target.querySelector('button[type="submit"]'); UI.setLoading(btn, true, T('auth.signin_btn'));
        var r = await API.auth.signIn($('loginEmail').value.trim(), $('loginPassword').value);
        UI.setLoading(btn, false);
        if (r.error) { UI.toast(authError(r.error), 'error'); return; }
        e.target.reset(); UI.closeModal('authModal'); UI.toast(T('auth.signed_in'), 'success');
    }

    async function onRegister(e) {
        e.preventDefault();
        var name = $('registerName').value.trim(), email = $('registerEmail').value.trim(), phone = $('registerPhone').value.trim();
        var pw = $('registerPassword').value, pw2 = $('registerConfirmPassword').value;
        if (!Utils.isPhone(phone)) { UI.toast(T('auth.phone_invalid'), 'warning'); return; }
        if (pw.length < 8) { UI.toast(T('auth.pw_short'), 'warning'); return; }
        if (pw !== pw2) { UI.toast(T('auth.pw_mismatch'), 'warning'); return; }
        var btn = e.target.querySelector('button[type="submit"]'); UI.setLoading(btn, true, T('auth.create_btn'));
        var r = await API.auth.signUp(email, pw, { full_name: name, phone: phone });
        UI.setLoading(btn, false);
        if (r.error) { UI.toast(authError(r.error), 'error'); return; }
        var identities = r.data && r.data.user && r.data.user.identities;
        if (identities && identities.length === 0) { UI.toast(T('auth.exists'), 'warning'); return; }
        e.target.reset(); UI.closeModal('authModal');
        UI.toast(r.data && r.data.session ? T('auth.created') : T('auth.confirm_email'), 'success', 7000);
    }

    async function onForgot(e) {
        e.preventDefault();
        var btn = e.target.querySelector('button[type="submit"]'); UI.setLoading(btn, true, '');
        await API.auth.resetPassword($('forgotEmail').value.trim());
        UI.setLoading(btn, false); UI.toast(T('auth.reset_sent'), 'success', 6000); UI.closeModal('authModal');
    }

    /* ====================================================================
       ACCOUNT
       ==================================================================== */
    function switchAccountTab(name) {
        document.querySelectorAll('.account-nav-btn[data-account-tab]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-account-tab') === name); });
        document.querySelectorAll('.account-tab').forEach(function (t) { t.classList.toggle('active', t.id === 'accountTab' + name.charAt(0).toUpperCase() + name.slice(1)); });
        if (name === 'orders') Orders.loadMine();
        if (name === 'reviews') Reviews.loadMine();
        if (name === 'loyalty') renderLoyalty();
    }

    function fillAccount() {
        var p = AppState.profile; if (!p) return;
        $('accountUserName').textContent = p.full_name || 'Customer';
        $('accountUserEmail').textContent = p.email;
        $('accountAvatar').innerHTML = avatarHtml(p, 'account-avatar-img');
        $('profileName').value = p.full_name || ''; $('profilePhone').value = p.phone || ''; $('profileEmail').value = p.email || '';
        $('addressLine1').value = p.address_line1 || ''; $('addressLine2').value = p.address_line2 || '';
        $('addressCity').value = p.city || ''; $('addressState').value = p.state || ''; $('addressPincode').value = p.pincode || '';
        document.querySelectorAll('.js-points-badge').forEach(function (b) { b.textContent = p.loyalty_points || 0; });
    }

    function renderLoyalty() {
        var p = AppState.profile; if (!p) return; var s = Bestow.settings;
        var pts = Number(p.loyalty_points) || 0;
        $('loyaltyBox').innerHTML = '<div class="loyalty-card glass"><span class="loyalty-label">' + TX('account.points_title') + '</span><strong class="loyalty-points">' + pts + '</strong><span class="loyalty-worth">' + TX('account.points_worth', { amount: Utils.price(pts) }) + '</span></div>' +
            '<p class="text-muted loyalty-how">' + TX('account.points_how', { rate: s.loyalty_rate, max: s.loyalty_redeem_max_percent }) + '</p>';
    }

    async function loadAccount(ctx) {
        fillAccount();
        var tab = (ctx.query && ctx.query.tab) || 'profile';
        switchAccountTab(tab);
    }

    async function onProfile(e) {
        e.preventDefault();
        var btn = e.target.querySelector('button[type="submit"]'); UI.setLoading(btn, true, '');
        var phone = $('profilePhone').value.trim();
        if (phone && !Utils.isPhone(phone)) { UI.setLoading(btn, false); UI.toast(T('auth.phone_invalid'), 'warning'); return; }
        var r = await API.profile.update(AppState.user.id, { full_name: $('profileName').value.trim(), phone: phone });
        UI.setLoading(btn, false);
        if (r.error) { UI.toast(r.error.message, 'error'); return; }
        AppState.profile = Object.assign(AppState.profile, r.data || {}); updateUserUI(); UI.toast(T('account.saved'), 'success');
    }

    async function onAddress(e) {
        e.preventDefault();
        var pin = $('addressPincode').value.trim();
        if (pin && !Utils.isPincode(pin)) { UI.toast(T('checkout.pin_invalid'), 'warning'); return; }
        var btn = e.target.querySelector('button[type="submit"]'); UI.setLoading(btn, true, '');
        var r = await API.profile.update(AppState.user.id, { address_line1: $('addressLine1').value.trim(), address_line2: $('addressLine2').value.trim(), city: $('addressCity').value.trim(), state: $('addressState').value.trim(), pincode: pin });
        UI.setLoading(btn, false);
        if (r.error) { UI.toast(r.error.message, 'error'); return; }
        AppState.profile = Object.assign(AppState.profile, r.data || {}); UI.toast(T('account.address_saved'), 'success');
    }

    async function onAvatar(e) {
        var f = e.target.files && e.target.files[0]; if (!f) return;
        var small = await Utils.compressImage(f, 600, 0.85);
        var up = await API.storage.upload('avatars', AppState.user.id, small);
        if (up.error) { UI.toast(T('account.avatar_failed'), 'error'); return; }
        var r = await API.profile.update(AppState.user.id, { avatar_url: up.data.url });
        if (!r.error) { AppState.profile.avatar_url = up.data.url; fillAccount(); updateUserUI(); UI.toast(T('account.avatar_saved'), 'success'); }
        e.target.value = '';
    }

    /* ====================================================================
       CONTACT + NEWSLETTER
       ==================================================================== */
    async function onContact(e) {
        e.preventDefault();
        var email = $('contactEmail').value.trim();
        if (!Utils.isEmail(email)) { UI.toast(T('contact.invalid'), 'warning'); return; }
        var btn = e.target.querySelector('button[type="submit"]'); UI.setLoading(btn, true, '');
        var row = { name: $('contactName').value.trim(), email: email, phone: $('contactPhone').value.trim(), subject: $('contactSubject').value.trim(), message: $('contactMessage').value.trim(), inquiry_type: $('contactType').value };
        var r = await API.inquiries.create(row);
        UI.setLoading(btn, false);
        if (r.error) { UI.toast(T('contact.failed'), 'error'); return; }
        API.fn('send-email', Object.assign({ type: 'contact' }, row));
        e.target.reset(); UI.toast(T('contact.sent'), 'success', 5000);
    }

    async function onNewsletter(e) {
        e.preventDefault();
        var input = e.target.querySelector('input[type="email"]'), email = input.value.trim().toLowerCase();
        if (!Utils.isEmail(email)) { UI.toast(T('newsletter.bad'), 'warning'); return; }
        var btn = e.target.querySelector('button[type="submit"]'); UI.setLoading(btn, true, '');
        var r = await API.newsletter.subscribe(email);
        UI.setLoading(btn, false);
        if (r.error || (r.data && !r.data.ok)) { UI.toast(T('newsletter.fail'), 'error'); return; }
        API.fn('send-email', { type: 'newsletter', email: email });
        input.value = ''; UI.toast(T('newsletter.ok'), 'success');
    }

    /* ====================================================================
       EVENT WIRING
       ==================================================================== */
    function bindChrome() {
        $('userMenuBtn').addEventListener('click', function (e) { e.stopPropagation(); $('userDropdown').classList.toggle('open'); });
        document.addEventListener('click', function (e) { if (!e.target.closest('#userDropdown, #userMenuBtn')) $('userDropdown').classList.remove('open'); });
        $('navHamburger').addEventListener('click', function () { toggleMobileNav(true); });
        $('mobileNavClose').addEventListener('click', function () { toggleMobileNav(false); });
        $('mobileNavOverlay').addEventListener('click', function () { toggleMobileNav(false); });
        document.querySelectorAll('.mobile-nav-links [data-route], .mobile-nav [data-action]').forEach(function (a) { a.addEventListener('click', function () { toggleMobileNav(false); }); });

        document.addEventListener('click', function (e) {
            var a = e.target.closest('[data-action]');
            if (a) { e.preventDefault(); handleAction(a.getAttribute('data-action')); }
            var pt = e.target.closest('.password-toggle');
            if (pt) {
                var inp = $(pt.getAttribute('data-target')); var show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
                pt.querySelector('i,svg') && pt.setAttribute('aria-pressed', show);
                pt.innerHTML = UI.icon(show ? 'eye-off' : 'eye'); refreshIcons();
            }
            var sw = e.target.closest('#authSwitchBtn'); if (sw) showAuth(sw.getAttribute('data-view'));
            var fp = e.target.closest('#forgotLink'); if (fp) showAuth('forgot');
            var bk = e.target.closest('#backToLogin'); if (bk) showAuth('login');
        });
        $('loginForm').addEventListener('submit', onLogin);
        $('registerForm').addEventListener('submit', onRegister);
        $('forgotForm').addEventListener('submit', onForgot);

        document.querySelectorAll('.account-nav-btn[data-account-tab]').forEach(function (b) { b.addEventListener('click', function () { switchAccountTab(b.getAttribute('data-account-tab')); }); });
        $('profileForm').addEventListener('submit', onProfile);
        $('addressForm').addEventListener('submit', onAddress);
        $('avatarInput').addEventListener('change', onAvatar);
        $('changePasswordBtn').addEventListener('click', promptNewPassword);
        $('addressPincode').addEventListener('input', async function () {
            var v = this.value.replace(/\D/g, '').slice(0, 6); this.value = v;
            if (v.length === 6) { var pl = await Shop.lookupPincode(v); if (pl) { if (!$('addressCity').value) $('addressCity').value = pl.city; if (!$('addressState').value) $('addressState').value = pl.state; } }
        });
        $('contactForm').addEventListener('submit', onContact);
        document.querySelectorAll('.js-newsletter-form').forEach(function (f) { f.addEventListener('submit', onNewsletter); });
        var qt = $('quickTrackForm');
        if (qt) qt.addEventListener('submit', function (e) {
            e.preventDefault();
            var n = $('quickTrackNumber').value.trim(), m = $('quickTrackEmail').value.trim();
            if (!n || !Utils.isEmail(m)) { UI.toast('Enter your order number and a valid email address', 'warning'); return; }
            Router.go('track-order', n, { email: m });
        });
        $('liveEditExit').addEventListener('click', function () { Bestow.liveEdit(false); });
    }

    App.showAuth = showAuth;

    function bindAdminLogin() {
        var f = $('adminLoginForm'); if (!f) return;
        var err = $('adminLoginError');
        function show(m) { err.textContent = m; err.hidden = !m; }
        f.addEventListener('submit', async function (e) {
            e.preventDefault(); show('');
            var email = $('adminLoginEmail').value.trim(), pw = $('adminLoginPassword').value;
            if (!email || !pw) return show('Enter your admin email and password.');
            var btn = f.querySelector('[type=submit]'); UI.setLoading(btn, true, 'Signing in');
            var r = await API.auth.signIn(email, pw);
            if (r.error || !r.data || !r.data.user) { UI.setLoading(btn, false); return show(/confirm/i.test((r.error && r.error.message) || '') ? 'This email is not confirmed yet.' : 'Incorrect email or password.'); }
            var pr = await API.profile.get(r.data.user.id);
            if (!pr.data || pr.data.role !== 'admin') {
                await API.auth.signOut(); clearUser(); UI.setLoading(btn, false);
                return show('This account is not an administrator. Customers can sign in from the main website.');
            }
            for (var i = 0; i < 20 && !AppState.isAdmin; i++) await sleep(200);
            UI.setLoading(btn, false); f.reset();
            if (AppState.isAdmin) Router.go('admin'); else show('Could not open the dashboard. Please try again.');
        });
        Router.on('admin-login', function () { show(''); setTimeout(function () { var i = $('adminLoginEmail'); if (i) i.focus(); }, 120); });
    }

    function registerRoutes() {
        bindAdminLogin();
        Router.on('home', async function () { await Promise.all([Shop.loadHome(), Reviews.loadHome()]); });
        Router.on('shop', function (ctx) { return Shop.load(ctx); });
        Router.on('product', function (ctx) { return Shop.loadProduct(ctx); });
        Router.on('categories', function () { return Shop.loadCategoriesPage(); });
        Router.on('wishlist', function () { return Shop.loadWishlist(); });
        Router.on('checkout', function () { return Checkout.load(); });
        Router.on('order-success', function (ctx) { return Checkout.loadSuccess(ctx); });
        Router.on('account', function (ctx) { return loadAccount(ctx); });
        Router.on('track-order', function (ctx) { return Orders.loadTrack(ctx); });
        Router.on('faq', function () { Features.renderFaq(); });
        Router.on('policy', function (ctx) { Features.loadPolicy(ctx); });
        Router.on('unsubscribe', function (ctx) { Features.loadUnsub(ctx); });
        Router.on('admin', function (ctx) { return Admin.loadPage(ctx); });
    }

    function renderFooterCategories() {
        var ul = $('footerCategories'); if (!ul) return;
        ul.innerHTML = (Shop.categories || []).slice(0, 7).map(function (c) { return '<li><a href="#shop" data-route="shop" data-query="cat=' + Utils.esc(c.slug) + '">' + UI.icon('chevron-right', 'icon-xs') + ' ' + Utils.esc(c.name) + '</a></li>'; }).join('');
        refreshIcons();
    }

    function hideLoader() {
        var l = $('appLoader'); if (!l) return;
        l.classList.add('done'); setTimeout(function () { if (l.parentNode) l.parentNode.removeChild(l); }, 650);
    }

    /* ====================================================================
       BOOT
       ==================================================================== */
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        if (Bestow.loadFromCache()) { Bestow.apply(); Bestow.applyMeta(); }
        Bestow.apply();

        if (!window.Orders) {
            console.error('[Bestow] js/orders.js did not load. Check that the file exists in the js folder.');
            var noop = function () {};
            window.Orders = { bind: noop, subscribe: noop, unsubscribe: noop, loadMine: noop, loadTrack: noop, pill: function () { return ''; }, timeline: function () { return ''; }, itemsHtml: function () { return ''; }, addressHtml: function () { return ''; } };
        }
        /* one failing module must never stop the rest of the site from starting */
        function safe(name, fn) { try { fn(); } catch (e) { console.error('[Bestow] ' + name + ' failed to start:', e); } }
        safe('Cart', function () { Cart.bind(); });
        safe('Shop', function () { Shop.init(); });
        safe('Reviews', function () { Reviews.bind(); });
        safe('Orders', function () { Orders.bind(); });
        safe('Checkout', function () { Checkout.bind(); });
        safe('Features', function () { Features.init(); });
        safe('Admin', function () { Admin.init(); });
        safe('Chrome', bindChrome);
        safe('Routes', registerRoutes);
        safe('Wishlist', function () { Wishlist.paint(); });
        setTimeout(hideLoader, 6000);

        Bestow.ready = (async function () {
            if (!API.sb) { var b = $('offlineBanner'); $('offlineText').textContent = 'Could not connect to the store backend. Please refresh.'; b.classList.add('visible'); return; }
            await Promise.all([Bestow.load(), initAuth()]);
            if (API.cameFromEmail && AppState.user) { UI.toast('Email verified. Welcome to Bestow.', 'success', 6000); if (!/^#(account|home)/.test(location.hash)) location.replace('#home'); }
            await Shop.ensureCategories();
            renderFooterCategories();
            Features.orgSchema();
        })();
        Bestow.ready.catch(function (e) { console.error('[Bestow] boot error', e); });

        safe('Router', function () { Router.start(); });
        safe('CartRender', function () { Cart.render(); });
        safe('UserUI', updateUserUI);
        Promise.race([Bestow.ready, sleep(5000)]).then(hideLoader, hideLoader);
        document.addEventListener('auth:change', function () { if (Router.current().name === 'checkout') Checkout.load(); });
    });

    window.addEventListener('unhandledrejection', function (e) { console.warn('[Bestow] unhandled rejection', e.reason); });
})();
