/* ==========================================================================
   BESTOW - REVIEWS
   Product reviews with rating breakdown, helpful votes, photos, verified purchase badge
   (decided by the database), the review form, "my reviews" and the home testimonial carousel.
   Only genuine approved reviews are ever displayed. Nothing is fabricated.
   ========================================================================== */
(function () {
    'use strict';

    var T = function (k, v) { return Bestow.t(k, v); };
    var TX = function (k, v) { return Bestow.tx(k, v); };
    var $ = function (id) { return document.getElementById(id); };

    Bestow.define({
        'reviews.write': 'Write a Review',
        'reviews.empty': 'No reviews yet. Be the first to share your experience.',
        'reviews.based_on': 'Based on {n} reviews',
        'reviews.verified': 'Verified purchase',
        'reviews.helpful': 'Helpful ({n})',
        'reviews.reply': 'Reply from {brand}',
        'reviews.sign_in': 'Please sign in to write a review',
        'reviews.need_comment': 'Please write your review',
        'reviews.submitted': 'Thank you. Your review will appear once it is approved.',
        'reviews.duplicate': 'You have already reviewed this product',
        'reviews.failed': 'Your review could not be submitted. Please try again.',
        'reviews.voted': 'Thanks for your feedback',
        'reviews.vote_sign_in': 'Sign in to mark reviews as helpful',
        'reviews.pending': 'Pending approval',
        'reviews.approved': 'Published',
        'reviews.mine_empty_text': 'Order a product and share how it turned out.',
        'reviews.delete_title': 'Delete this review?',
        'reviews.delete_text': 'Your review will be removed permanently.',
        'reviews.deleted': 'Review deleted',
        'reviews.submitting': 'Submitting',
        'reviews.home_empty': 'Our first customer reviews will appear here. Order a gift and tell us how it went.',
        'reviews.error': 'We could not load reviews.',
        'reviews.on_product': 'on {product}'
    }, 'reviews');

    var carousel = { i: 0, n: 0, timer: null };

    function reviewHtml(r) {
        var initial = (r.customer_name || 'C').charAt(0).toUpperCase();
        var imgs = (r.images || []).filter(Boolean);
        return '<article class="review-item" data-id="' + Utils.esc(r.id) + '">' +
            '<header class="review-head"><div class="review-author"><span class="avatar-initial">' + Utils.esc(initial) + '</span><div>' +
            '<p class="review-name">' + Utils.esc(r.customer_name) + (r.is_verified ? ' <span class="verified-tag">' + UI.icon('badge-check', 'icon-xs') + ' ' + TX('reviews.verified') + '</span>' : '') + '</p>' +
            '<p class="review-date">' + Utils.date(r.created_at) + '</p></div></div>' + Utils.stars(r.rating) + '</header>' +
            (r.title ? '<h4 class="review-title">' + Utils.esc(r.title) + '</h4>' : '') +
            (r.comment ? '<p class="review-text">' + Utils.multiline(r.comment) + '</p>' : '') +
            (imgs.length ? '<div class="review-images">' + imgs.map(function (s) { return '<button type="button" class="review-thumb" data-lightbox="' + Utils.esc(s) + '" data-lightbox-set="' + Utils.esc(imgs.join('|')) + '"><img src="' + Utils.esc(s) + '" alt="Customer photo" loading="lazy"></button>'; }).join('') + '</div>' : '') +
            (r.admin_reply ? '<div class="review-reply">' + UI.icon('corner-down-right', 'icon-xs') + '<div><strong>' + TX('reviews.reply', { brand: Bestow.branding.brand_name }) + '</strong><p>' + Utils.multiline(r.admin_reply) + '</p></div></div>' : '') +
            '<footer class="review-foot"><button type="button" class="link-btn" data-vote="' + Utils.esc(r.id) + '">' + UI.icon('thumbs-up', 'icon-xs') + ' <span>' + TX('reviews.helpful', { n: r.helpful_count || 0 }) + '</span></button></footer></article>';
    }

    var Reviews = {
        loadProduct: async function (productId) {
            var box = $('tabReviews'); if (!box) return;
            box.innerHTML = '<div class="sk sk-line"></div><div class="sk sk-line sk-short"></div>';
            var r = await API.reviews.byProduct(productId);
            if (r.error) { box.innerHTML = '<p class="text-muted">' + Utils.esc(T('reviews.error')) + '</p>'; return; }
            var list = r.data || [];
            var name = (Shop.cache[productId] || {}).name || '';
            var head = '<div class="reviews-top"><div class="reviews-summary">';
            if (list.length) {
                var avg = list.reduce(function (s, x) { return s + x.rating; }, 0) / list.length;
                var dist = [0, 0, 0, 0, 0, 0]; list.forEach(function (x) { dist[x.rating]++; });
                head += '<div class="reviews-avg"><span class="avg-num">' + avg.toFixed(1) + '</span>' + Utils.stars(avg, 'stars-lg') + '<span class="text-muted">' + TX('reviews.based_on', { n: list.length }) + '</span></div><div class="reviews-bars">';
                for (var s = 5; s >= 1; s--) head += '<div class="bar-row"><span>' + s + '</span><div class="bar"><i style="width:' + (dist[s] / list.length * 100).toFixed(0) + '%"></i></div><span class="bar-n">' + dist[s] + '</span></div>';
                head += '</div>';
            } else head += '<p class="text-muted">' + TX('reviews.empty') + '</p>';
            head += '</div><button type="button" class="btn btn-primary" data-write-review="' + Utils.esc(productId) + '">' + UI.icon('pen-line', 'icon-sm') + ' ' + TX('reviews.write') + '</button></div>';
            box.innerHTML = head + (list.length ? '<div class="reviews-list">' + list.map(reviewHtml).join('') + '</div>' : '');
            box.setAttribute('data-product-name', name);
            refreshIcons();
        },

        openModal: function (productId, orderId, productName) {
            if (!(window.AppState && AppState.user)) { UI.toast(T('reviews.sign_in'), 'info'); UI.openModal('authModal'); return; }
            $('reviewForm').reset();
            $('reviewProductId').value = productId || '';
            $('reviewOrderId').value = orderId || '';
            $('reviewRating').value = '5';
            $('reviewProductName').textContent = productName || '';
            $('reviewProductName').style.display = productName ? '' : 'none';
            $('reviewUploadedImages').innerHTML = '';
            paintStars(5);
            UI.openModal('reviewModal');
        },

        submit: async function (e) {
            e.preventDefault();
            if (!(window.AppState && AppState.user)) { UI.toast(T('reviews.sign_in'), 'info'); return; }
            var comment = $('reviewComment').value.trim();
            if (!comment) { UI.toast(T('reviews.need_comment'), 'warning'); return; }
            var btn = e.target.querySelector('button[type="submit"]'); UI.setLoading(btn, true, T('reviews.submitting'));
            var productId = $('reviewProductId').value;
            try {
                var urls = [], files = Array.prototype.slice.call($('reviewImageInput').files || [], 0, 4);
                for (var i = 0; i < files.length; i++) {
                    var small = await Utils.compressImage(files[i], 1400, 0.85);
                    var up = await API.storage.upload('reviews', AppState.user.id, small);
                    if (up.data) urls.push(up.data.url);
                }
                var res = await API.reviews.create({
                    product_id: productId, customer_id: AppState.user.id,
                    customer_name: (AppState.profile && AppState.profile.full_name) || 'Customer',
                    customer_avatar: (AppState.profile && AppState.profile.avatar_url) || '',
                    order_id: $('reviewOrderId').value || null,
                    rating: parseInt($('reviewRating').value, 10) || 5,
                    title: $('reviewTitle').value.trim(), comment: comment, images: urls
                });
                if (res.error) {
                    var dup = res.error.code === '23505' || /duplicate/i.test(res.error.message || '');
                    UI.toast(T(dup ? 'reviews.duplicate' : 'reviews.failed'), dup ? 'info' : 'error');
                } else {
                    UI.toast(T('reviews.submitted'), 'success', 5000);
                    UI.closeModal('reviewModal');
                    if (Router.current().name === 'account') Reviews.loadMine();
                }
            } catch (err) { UI.toast(T('reviews.failed'), 'error'); }
            UI.setLoading(btn, false);
        },

        loadMine: async function () {
            var box = $('customerReviewsList'), empty = $('customerReviewsEmpty');
            if (!box || !(window.AppState && AppState.user)) return;
            var r = await API.reviews.byCustomer(AppState.user.id);
            var list = r.data || [];
            if (!list.length) { box.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            box.innerHTML = list.map(function (x) {
                return '<article class="review-item" data-id="' + Utils.esc(x.id) + '"><header class="review-head"><div><p class="review-name">' + Utils.esc(x.products ? x.products.name : 'Product') + '</p><p class="review-date">' + Utils.date(x.created_at) + '</p></div>' +
                    '<span class="status-pill ' + (x.is_approved ? 'st-delivered' : 'st-processing') + '">' + TX(x.is_approved ? 'reviews.approved' : 'reviews.pending') + '</span></header>' +
                    Utils.stars(x.rating) + (x.comment ? '<p class="review-text">' + Utils.multiline(x.comment) + '</p>' : '') +
                    (x.admin_reply ? '<div class="review-reply">' + UI.icon('corner-down-right', 'icon-xs') + '<div><strong>' + TX('reviews.reply', { brand: Bestow.branding.brand_name }) + '</strong><p>' + Utils.multiline(x.admin_reply) + '</p></div></div>' : '') +
                    '<footer class="review-foot"><button type="button" class="link-btn danger" data-del-review="' + Utils.esc(x.id) + '">' + UI.icon('trash-2', 'icon-xs') + ' <span data-cms="common.delete">Delete</span></button></footer></article>';
            }).join('');
            refreshIcons();
        },

        loadHome: async function () {
            var box = $('reviewsCarousel'), nav = $('reviewsNav'); if (!box) return;
            var r = await API.reviews.approvedFeed(10);
            var list = r.data || [];
            clearInterval(carousel.timer);
            if (!list.length) { box.innerHTML = '<p class="reviews-home-empty">' + TX('reviews.home_empty') + '</p>'; nav.style.display = 'none'; return; }
            nav.style.display = list.length > 1 ? '' : 'none';
            box.innerHTML = '<div class="carousel-track" id="carouselTrack">' + list.map(function (x) {
                return '<figure class="testimonial glass"><div class="testimonial-stars">' + Utils.stars(x.rating) + '</div><blockquote>' + Utils.esc(Utils.truncate(x.comment || x.title, 260)) + '</blockquote>' +
                    '<figcaption><span class="avatar-initial">' + Utils.esc((x.customer_name || 'C').charAt(0).toUpperCase()) + '</span><div><strong>' + Utils.esc(x.customer_name) + '</strong><span>' + TX('reviews.on_product', { product: x.products ? x.products.name : '' }) + '</span></div></figcaption></figure>';
            }).join('') + '</div>';
            carousel.n = list.length; carousel.i = 0;
            $('reviewsDots').innerHTML = list.map(function (_, i) { return '<button type="button" class="dot' + (i === 0 ? ' active' : '') + '" data-dot="' + i + '" aria-label="Review ' + (i + 1) + '"></button>'; }).join('');
            if (list.length > 1) carousel.timer = setInterval(function () { Reviews.go(carousel.i + 1); }, 6500);
            refreshIcons();
        },

        go: function (i) {
            if (!carousel.n) return;
            carousel.i = (i + carousel.n) % carousel.n;
            var t = $('carouselTrack'); if (t) t.style.transform = 'translateX(-' + (carousel.i * 100) + '%)';
            document.querySelectorAll('#reviewsDots .dot').forEach(function (d, n) { d.classList.toggle('active', n === carousel.i); });
        },

        bind: function () {
            $('reviewForm').addEventListener('submit', Reviews.submit);
            $('starRatingInput').addEventListener('click', function (e) {
                var b = e.target.closest('[data-rating]'); if (!b) return;
                $('reviewRating').value = b.getAttribute('data-rating'); paintStars(parseInt(b.getAttribute('data-rating'), 10));
            });
            $('reviewImageInput').addEventListener('change', function () {
                var prev = $('reviewUploadedImages'); prev.innerHTML = '';
                Array.prototype.slice.call(this.files, 0, 4).forEach(function (f) {
                    var u = URL.createObjectURL(f); var d = document.createElement('div'); d.className = 'upload-thumb'; d.innerHTML = '<img alt="" src="' + u + '">'; prev.appendChild(d);
                });
            });
            $('reviewsPrev').addEventListener('click', function () { Reviews.go(carousel.i - 1); });
            $('reviewsNext').addEventListener('click', function () { Reviews.go(carousel.i + 1); });
            $('reviewsDots').addEventListener('click', function (e) { var d = e.target.closest('[data-dot]'); if (d) Reviews.go(parseInt(d.getAttribute('data-dot'), 10)); });
            document.addEventListener('click', async function (e) {
                var w = e.target.closest('[data-write-review]');
                if (w) { var pid = w.getAttribute('data-write-review'); Reviews.openModal(pid, '', (Shop.cache[pid] || {}).name || ''); return; }
                var v = e.target.closest('[data-vote]');
                if (v) {
                    if (!(window.AppState && AppState.user)) { UI.toast(T('reviews.vote_sign_in'), 'info'); return; }
                    var r = await API.reviews.helpful(v.getAttribute('data-vote'));
                    if (r.data && r.data.ok) { v.querySelector('span').textContent = T('reviews.helpful', { n: r.data.helpful_count }); UI.toast(T('reviews.voted'), 'success', 1600); }
                    else if (r.data && r.data.message) UI.toast(r.data.message, 'info');
                    return;
                }
                var d = e.target.closest('[data-del-review]');
                if (d) {
                    if (!(await UI.confirm({ title: T('reviews.delete_title'), message: T('reviews.delete_text'), confirmText: 'Delete' }))) return;
                    var x = await API.reviews.remove(d.getAttribute('data-del-review'));
                    if (!x.error) { UI.toast(T('reviews.deleted'), 'success'); Reviews.loadMine(); }
                }
            });
        }
    };
    function paintStars(n) { document.querySelectorAll('#starRatingInput .star-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-rating'), 10) <= n); }); }
    Bestow.define({ 'common.delete': 'Delete' }, 'common');
    window.Reviews = Reviews;
})();
