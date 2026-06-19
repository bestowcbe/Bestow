// ==============================================
// BESTOW E-COMMERCE — COMPLETE JS WITH FIREBASE
// ==============================================

// ============================================
// 🔑 PAYMENT & BUSINESS CONFIGURATION
// ============================================
const PAYMENT_CONFIG = {
    razorpay: {
        key: 'rzp_test_T2bYpqwXj12AAb',  // ⬅️ Replace with your Razorpay Key
        merchant_name: 'Bestow',
        merchant_logo: 'https://res.cloudinary.com/dnwqpvkq6/image/upload/q_auto/f_auto/v1781696384/Untitled_design_24_kyqbou.png',
        theme_color: '#de2128'
    },
    upi: {
        upi_id: 'sathishbalakrishnan18-3@okaxis',  // ⬅️ Replace with your UPI ID
        merchant_name: 'Bestow'
    },
    business: {
        whatsapp: '919025459227',  // ⬅️ Your WhatsApp (with country code)
        name: 'Bestow'
    }
};

// ============================================
// 🔐 ADMIN CREDENTIALS
// ============================================
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123',
    securityCode: 'BESTOW2024'
};

// ============================================
// 🔥 FIREBASE DATABASE FUNCTIONS
// ============================================

// Wait for Firebase to be ready
function waitForFirebase(){
    return new Promise((resolve) => {
        if(window.fbReady){
            resolve();
        } else {
            window.addEventListener('firebaseReady', () => resolve());
        }
    });
}

// ============= PRODUCTS =============
async function fbGetProducts(){
    try {
        await waitForFirebase();
        const ref = window.fbFn.collection(window.fbDB, 'products');
        const snap = await window.fbFn.getDocs(ref);
        const products = [];
        snap.forEach(d => products.push(d.data()));
        return products.sort((a,b) => a.id - b.id);
    } catch(err){
        console.error('🔴 FB Get Products Error:', err);
        return JSON.parse(localStorage.getItem('bst_p')) || [];
    }
}

async function fbSaveProduct(product){
    try {
        await waitForFirebase();
        const ref = window.fbFn.doc(window.fbDB, 'products', String(product.id));
        await window.fbFn.setDoc(ref, product);
        console.log('✅ Product saved to Firebase:', product.name);
        return true;
    } catch(err){
        console.error('🔴 FB Save Product Error:', err);
        return false;
    }
}

async function fbDeleteProduct(id){
    try {
        await waitForFirebase();
        const ref = window.fbFn.doc(window.fbDB, 'products', String(id));
        await window.fbFn.deleteDoc(ref);
        console.log('✅ Product deleted from Firebase:', id);
        return true;
    } catch(err){
        console.error('🔴 FB Delete Product Error:', err);
        return false;
    }
}

// ============= ORDERS =============
async function fbGetOrders(){
    try {
        await waitForFirebase();
        const ref = window.fbFn.collection(window.fbDB, 'orders');
        const snap = await window.fbFn.getDocs(ref);
        const orders = [];
        snap.forEach(d => orders.push(d.data()));
        return orders.sort((a,b) => new Date(a.date) - new Date(b.date));
    } catch(err){
        console.error('🔴 FB Get Orders Error:', err);
        return JSON.parse(localStorage.getItem('bst_o')) || [];
    }
}

async function fbSaveOrder(order){
    try {
        await waitForFirebase();
        const ref = window.fbFn.doc(window.fbDB, 'orders', order.id);
        await window.fbFn.setDoc(ref, order);
        console.log('✅ Order saved to Firebase:', order.id);
        return true;
    } catch(err){
        console.error('🔴 FB Save Order Error:', err);
        return false;
    }
}

async function fbUpdateOrder(orderId, updates){
    try {
        await waitForFirebase();
        const ref = window.fbFn.doc(window.fbDB, 'orders', orderId);
        await window.fbFn.updateDoc(ref, updates);
        console.log('✅ Order updated in Firebase:', orderId);
        return true;
    } catch(err){
        console.error('🔴 FB Update Order Error:', err);
        return false;
    }
}

// ============= CUSTOMERS =============
async function fbGetCustomers(){
    try {
        await waitForFirebase();
        const ref = window.fbFn.collection(window.fbDB, 'customers');
        const snap = await window.fbFn.getDocs(ref);
        const customers = [];
        snap.forEach(d => customers.push(d.data()));
        return customers;
    } catch(err){
        console.error('🔴 FB Get Customers Error:', err);
        return JSON.parse(localStorage.getItem('bst_c')) || [];
    }
}

async function fbSaveCustomer(customer){
    try {
        await waitForFirebase();
        const docId = customer.email.replace(/[.#$/[\]]/g, '_');
        const ref = window.fbFn.doc(window.fbDB, 'customers', docId);
        await window.fbFn.setDoc(ref, customer);
        console.log('✅ Customer saved to Firebase:', customer.email);
        return true;
    } catch(err){
        console.error('🔴 FB Save Customer Error:', err);
        return false;
    }
}

// ============= ADDRESSES =============
async function fbGetAddresses(userEmail){
    try {
        await waitForFirebase();
        const docId = userEmail.replace(/[.#$/[\]]/g, '_');
        const ref = window.fbFn.doc(window.fbDB, 'addresses', docId);
        const snap = await window.fbFn.getDoc(ref);
        if(snap.exists()){
            return snap.data().addresses || [];
        }
        return [];
    } catch(err){
        console.error('🔴 FB Get Addresses Error:', err);
        return [];
    }
}

async function fbSaveAddresses(userEmail, addresses){
    try {
        await waitForFirebase();
        const docId = userEmail.replace(/[.#$/[\]]/g, '_');
        const ref = window.fbFn.doc(window.fbDB, 'addresses', docId);
        await window.fbFn.setDoc(ref, {userEmail, addresses});
        console.log('✅ Addresses saved to Firebase');
        return true;
    } catch(err){
        console.error('🔴 FB Save Addresses Error:', err);
        return false;
    }
}

// ============= WISHLIST =============
async function fbGetWishlist(userEmail){
    try {
        await waitForFirebase();
        const docId = userEmail.replace(/[.#$/[\]]/g, '_');
        const ref = window.fbFn.doc(window.fbDB, 'wishlists', docId);
        const snap = await window.fbFn.getDoc(ref);
        if(snap.exists()){
            return snap.data().items || [];
        }
        return [];
    } catch(err){
        console.error('🔴 FB Get Wishlist Error:', err);
        return [];
    }
}

async function fbSaveWishlist(userEmail, items){
    try {
        await waitForFirebase();
        const docId = userEmail.replace(/[.#$/[\]]/g, '_');
        const ref = window.fbFn.doc(window.fbDB, 'wishlists', docId);
        await window.fbFn.setDoc(ref, {userEmail, items});
        console.log('✅ Wishlist saved to Firebase');
        return true;
    } catch(err){
        console.error('🔴 FB Save Wishlist Error:', err);
        return false;
    }
}

// ============= INITIALIZE & SYNC =============
async function initFirebase(){
    try {
        await waitForFirebase();
        console.log('🔥 Checking Firebase data...');
        
        const products = await fbGetProducts();
        
        if(products.length === 0){
            console.log('📦 Loading default products to Firebase...');
            toast('Setting up for first time...');
            
            for(const prod of DEF_PRODS){
                await fbSaveProduct(prod);
            }
            
            console.log('✅ Default products saved to Firebase');
            toast('Setup complete! Welcome to Bestow!');
        } else {
            console.log(`✅ Found ${products.length} products in Firebase`);
        }
        
        return true;
    } catch(err){
        console.error('🔴 Firebase Init Error:', err);
        return false;
    }
}

async function syncFromFirebase(){
    try {
        console.log('🔄 Syncing data from Firebase...');
        
        const [products, orders, customers] = await Promise.all([
            fbGetProducts(),
            fbGetOrders(),
            fbGetCustomers()
        ]);
        
        if(products.length > 0) localStorage.setItem('bst_p', JSON.stringify(products));
        localStorage.setItem('bst_o', JSON.stringify(orders));
        localStorage.setItem('bst_c', JSON.stringify(customers));
        
        if(typeof renderProds === 'function') renderProds();
        if(document.getElementById('adminOverlay')?.classList.contains('on')){
            refreshAdm();
        }
        
        console.log('✅ Data synced from Firebase');
        return true;
    } catch(err){
        console.error('🔴 Sync Error:', err);
        return false;
    }
}

async function syncDataFromCloud(){
    toast('🔄 Syncing data from cloud...');
    const success = await syncFromFirebase();
    if(success){
        toast('✅ Data synced successfully!');
    } else {
        toast('Sync failed. Try again.', 'e');
    }
}

// ============================================
// ✅ VALIDATION FUNCTIONS
// ============================================
const VALIDATORS = {
    phone: function(value){
        const cleaned = value.replace(/\D/g,'').slice(-10);
        if(!cleaned) return {ok:false, msg:'Phone number is required'};
        if(cleaned.length !== 10) return {ok:false, msg:'Phone must be 10 digits'};
        if(!/^[6-9]\d{9}$/.test(cleaned)) return {ok:false, msg:'Invalid Indian mobile number'};
        return {ok:true, value:cleaned};
    },
    email: function(value){
        const trimmed = value.trim().toLowerCase();
        if(!trimmed) return {ok:false, msg:'Email is required'};
        if(trimmed.length > 100) return {ok:false, msg:'Email too long'};
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if(!regex.test(trimmed)) return {ok:false, msg:'Invalid email format'};
        return {ok:true, value:trimmed};
    },
    pincode: function(value){
        const cleaned = value.replace(/\D/g,'');
        if(!cleaned) return {ok:false, msg:'Pincode is required'};
        if(cleaned.length !== 6) return {ok:false, msg:'Pincode must be 6 digits'};
        if(!/^[1-9]\d{5}$/.test(cleaned)) return {ok:false, msg:'Invalid pincode'};
        return {ok:true, value:cleaned};
    },
    name: function(value){
        const trimmed = value.trim();
        if(!trimmed) return {ok:false, msg:'Name is required'};
        if(trimmed.length < 2) return {ok:false, msg:'Name too short (min 2 chars)'};
        if(trimmed.length > 50) return {ok:false, msg:'Name too long (max 50 chars)'};
        if(!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return {ok:false, msg:'Name can only contain letters'};
        return {ok:true, value:trimmed};
    },
    address: function(value){
        const trimmed = value.trim();
        if(!trimmed) return {ok:false, msg:'Address is required'};
        if(trimmed.length < 10) return {ok:false, msg:'Address too short (min 10 chars)'};
        if(trimmed.length > 200) return {ok:false, msg:'Address too long'};
        return {ok:true, value:trimmed};
    },
    city: function(value){
        const trimmed = value.trim();
        if(!trimmed) return {ok:false, msg:'City is required'};
        if(trimmed.length < 2) return {ok:false, msg:'City name too short'};
        if(!/^[a-zA-Z\s.-]+$/.test(trimmed)) return {ok:false, msg:'City can only contain letters'};
        return {ok:true, value:trimmed};
    },
    password: function(value){
        if(!value) return {ok:false, msg:'Password is required'};
        if(value.length < 6) return {ok:false, msg:'Password too short (min 6 chars)'};
        if(value.length > 50) return {ok:false, msg:'Password too long'};
        return {ok:true, value:value};
    },
    transactionId: function(value){
        const trimmed = value.trim();
        if(!trimmed) return {ok:false, msg:'Transaction ID is required'};
        if(trimmed.length < 6) return {ok:false, msg:'Transaction ID too short (min 6 chars)'};
        if(trimmed.length > 50) return {ok:false, msg:'Transaction ID too long'};
        if(!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return {ok:false, msg:'Invalid Transaction ID format'};
        return {ok:true, value:trimmed};
    }
};

// ============================================
// 🎨 INLINE ERROR DISPLAY
// ============================================
function showFieldError(fieldId, msg){
    const field = document.getElementById(fieldId);
    if(!field) return;
    clearFieldError(fieldId);
    field.classList.add('field-error');
    const errEl = document.createElement('div');
    errEl.className = 'field-err-msg';
    errEl.id = fieldId + '_err';
    errEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
    const parent = field.closest('.inp-icon') || field.closest('.f-group') || field.parentElement;
    parent.appendChild(errEl);
    field.classList.add('shake');
    setTimeout(()=>field.classList.remove('shake'), 500);
    field.focus();
}

function clearFieldError(fieldId){
    const field = document.getElementById(fieldId);
    if(!field) return;
    field.classList.remove('field-error');
    const existing = document.getElementById(fieldId + '_err');
    if(existing) existing.remove();
}

function clearAllErrors(){
    document.querySelectorAll('.field-err-msg').forEach(e=>e.remove());
    document.querySelectorAll('.field-error').forEach(e=>e.classList.remove('field-error'));
}

function showSuccessField(fieldId){
    const field = document.getElementById(fieldId);
    if(!field) return;
    clearFieldError(fieldId);
    field.classList.add('field-valid');
    setTimeout(()=>field.classList.remove('field-valid'), 2000);
}

function attachValidation(fieldId, validatorName){
    const field = document.getElementById(fieldId);
    if(!field) return;
    
    if(validatorName === 'phone'){
        field.addEventListener('input', function(){
            this.value = this.value.replace(/\D/g,'').slice(0,10);
            clearFieldError(fieldId);
        });
    } else if(validatorName === 'pincode'){
        field.addEventListener('input', function(){
            this.value = this.value.replace(/\D/g,'').slice(0,6);
            clearFieldError(fieldId);
        });
    } else {
        field.addEventListener('input', function(){
            clearFieldError(fieldId);
        });
    }
    
    field.addEventListener('blur', function(){
        if(!this.value.trim()) return;
        const result = VALIDATORS[validatorName](this.value);
        if(!result.ok){
            showFieldError(fieldId, result.msg);
        } else {
            showSuccessField(fieldId);
        }
    });
}

function validateForm(fields){
    clearAllErrors();
    let firstErrorField = null;
    let allValid = true;
    const values = {};
    
    for(const f of fields){
        const el = document.getElementById(f.id);
        if(!el) continue;
        const result = VALIDATORS[f.validator](el.value);
        if(!result.ok){
            showFieldError(f.id, result.msg);
            if(!firstErrorField) firstErrorField = f.id;
            allValid = false;
        } else {
            values[f.id] = result.value;
        }
    }
    
    if(!allValid && firstErrorField){
        document.getElementById(firstErrorField)?.scrollIntoView({behavior:'smooth', block:'center'});
        toast('Please fix the errors below', 'e');
    }
    
    return {valid: allValid, values: values};
}

// ============================================
// CATEGORY & PRODUCTS DATA
// ============================================
const CATS = {
    'awards':{icon:'fa-trophy',name:'Awards'},
    'keychains':{icon:'fa-key',name:'Keychains'},
    'fridge-magnets':{icon:'fa-magnet',name:'Fridge Magnets'},
    'photo-frames':{icon:'fa-image',name:'Photo Frames'},
    'badges':{icon:'fa-id-badge',name:'Badges'},
    'name-boards':{icon:'fa-chalkboard',name:'Name Boards'},
    'caricatures':{icon:'fa-paint-brush',name:'Caricatures'},
    'combo-gifts':{icon:'fa-gifts',name:'Combo Gifts'}
};

const DEF_PRODS = [
    {id:1,name:"Crystal Star Award Trophy",category:"awards",price:1299,originalPrice:1999,description:"Premium crystal star award trophy with custom engraving. Perfect for corporate events and recognition ceremonies.",image:"",rating:4.9,stock:20,featured:true,bestseller:true,newArrival:false},
    {id:2,name:"Wooden Shield Award Plaque",category:"awards",price:899,originalPrice:1499,description:"Elegant wooden shield plaque with brass plate for custom text engraving.",image:"",rating:4.7,stock:15,featured:true,bestseller:false,newArrival:true},
    {id:3,name:"Acrylic Achievement Award",category:"awards",price:699,originalPrice:999,description:"Modern acrylic award with laser-cut design and UV printed text.",image:"",rating:4.6,stock:30,featured:false,bestseller:true,newArrival:false},
    {id:4,name:"3D Crystal Photo Keychain",category:"keychains",price:449,originalPrice:699,description:"Premium 3D crystal keychain with laser-engraved photo. Comes with LED light base.",image:"",rating:4.8,stock:50,featured:true,bestseller:true,newArrival:false},
    {id:5,name:"Metal Name Keychain - Gold",category:"keychains",price:249,originalPrice:399,description:"Elegant gold-plated metal keychain with custom name engraving.",image:"",rating:4.5,stock:80,featured:false,bestseller:true,newArrival:true},
    {id:6,name:"Wooden Photo Keychain",category:"keychains",price:199,originalPrice:349,description:"Handcrafted wooden keychain with printed photo. Eco-friendly.",image:"",rating:4.4,stock:60,featured:false,bestseller:false,newArrival:true},
    {id:7,name:"Custom Photo Fridge Magnet",category:"fridge-magnets",price:149,originalPrice:249,description:"High-quality photo fridge magnet with vibrant color printing.",image:"",rating:4.5,stock:100,featured:true,bestseller:true,newArrival:false},
    {id:8,name:"Acrylic Shape Fridge Magnet",category:"fridge-magnets",price:199,originalPrice:349,description:"Custom-shaped acrylic fridge magnet with UV photo print.",image:"",rating:4.6,stock:70,featured:false,bestseller:false,newArrival:true},
    {id:9,name:"Wooden Engraved Photo Frame",category:"photo-frames",price:599,originalPrice:999,description:"Beautiful handcrafted wooden photo frame with custom engraving.",image:"",rating:4.8,stock:25,featured:true,bestseller:true,newArrival:false},
    {id:10,name:"LED Light Photo Frame",category:"photo-frames",price:799,originalPrice:1299,description:"Modern LED backlit photo frame with custom photo. Multiple light modes.",image:"",rating:4.7,stock:18,featured:true,bestseller:false,newArrival:true},
    {id:11,name:"Couple Rotating Photo Frame",category:"photo-frames",price:899,originalPrice:1499,description:"Rotating photo frame for multiple photos. Perfect anniversary gift.",image:"",rating:4.6,stock:12,featured:false,bestseller:true,newArrival:false},
    {id:12,name:"Custom Printed Pin Badge",category:"badges",price:99,originalPrice:179,description:"Custom printed pin badge. Great for events and teams. Min order: 10.",image:"",rating:4.3,stock:500,featured:false,bestseller:true,newArrival:false},
    {id:13,name:"Metal Name Badge - Premium",category:"badges",price:249,originalPrice:399,description:"Premium metal name badge with magnetic backing.",image:"",rating:4.5,stock:100,featured:true,bestseller:false,newArrival:true},
    {id:14,name:"Acrylic Desk Name Board",category:"name-boards",price:499,originalPrice:799,description:"Premium acrylic desk name board with LED edge lighting.",image:"",rating:4.7,stock:25,featured:true,bestseller:true,newArrival:true},
    {id:15,name:"Wooden Wall Name Board",category:"name-boards",price:699,originalPrice:1099,description:"Elegant wooden wall-mounted name board with custom engraving.",image:"",rating:4.6,stock:20,featured:false,bestseller:false,newArrival:false},
    {id:16,name:"Door Name Plate - Brass",category:"name-boards",price:899,originalPrice:1399,description:"Traditional brass door name plate. Weather resistant.",image:"",rating:4.8,stock:15,featured:true,bestseller:false,newArrival:false},
    {id:17,name:"Single Person Caricature",category:"caricatures",price:799,originalPrice:1299,description:"Fun hand-drawn digital caricature. Printed on premium art paper with frame.",image:"",rating:4.9,stock:30,featured:true,bestseller:true,newArrival:false},
    {id:18,name:"Couple Caricature Portrait",category:"caricatures",price:1199,originalPrice:1899,description:"Romantic couple caricature art. Custom themes available.",image:"",rating:4.8,stock:20,featured:true,bestseller:true,newArrival:true},
    {id:19,name:"Family Caricature - 4 Persons",category:"caricatures",price:1799,originalPrice:2799,description:"Fun family caricature with up to 4 people. Premium framed print.",image:"",rating:4.7,stock:10,featured:false,bestseller:false,newArrival:true},
    {id:20,name:"Birthday Combo Gift Set",category:"combo-gifts",price:1499,originalPrice:2299,description:"Complete birthday gift set: Mug + photo frame + keychain + card.",image:"",rating:4.8,stock:15,featured:true,bestseller:true,newArrival:false},
    {id:21,name:"Anniversary Combo Hamper",category:"combo-gifts",price:1999,originalPrice:2999,description:"Premium anniversary combo: Frame + cushion + caricature + magnets.",image:"",rating:4.9,stock:10,featured:true,bestseller:false,newArrival:true},
    {id:22,name:"Corporate Gift Combo",category:"combo-gifts",price:999,originalPrice:1599,description:"Professional gift set: Badge + name board + certificate frame.",image:"",rating:4.5,stock:40,featured:false,bestseller:false,newArrival:false},
    {id:23,name:"Magnetic Photo Set (6 pcs)",category:"fridge-magnets",price:349,originalPrice:599,description:"Set of 6 custom photo fridge magnets in different shapes.",image:"",rating:4.6,stock:40,featured:false,bestseller:true,newArrival:true},
    {id:24,name:"Resin Trophy Award",category:"awards",price:599,originalPrice:899,description:"Colourful resin trophy with custom plate. Multiple designs.",image:"",rating:4.4,stock:50,featured:false,bestseller:false,newArrival:false}
];

// ============================================
// STORAGE HELPERS
// ============================================
async function init(){
    // Initialize local cache
    if(!localStorage.getItem('bst_p')) localStorage.setItem('bst_p', JSON.stringify(DEF_PRODS));
    if(!localStorage.getItem('bst_o')) localStorage.setItem('bst_o', '[]');
    if(!localStorage.getItem('bst_c')) localStorage.setItem('bst_c', '[]');
    if(!localStorage.getItem('bst_cart')) localStorage.setItem('bst_cart', '[]');
    if(!localStorage.getItem('bst_addresses')) localStorage.setItem('bst_addresses', '[]');
    if(!localStorage.getItem('bst_wishlist')) localStorage.setItem('bst_wishlist', '[]');
    
    // 🔥 Initialize Firebase
    try {
        await initFirebase();
        await syncFromFirebase();
        console.log('✅ Firebase ready and synced!');
    } catch(err){
        console.warn('⚠️ Firebase not available, using offline mode', err);
    }
}

const gP = () => JSON.parse(localStorage.getItem('bst_p')) || [];
const sP = d => localStorage.setItem('bst_p', JSON.stringify(d));
const gO = () => JSON.parse(localStorage.getItem('bst_o')) || [];
const sO = d => localStorage.setItem('bst_o', JSON.stringify(d));
const gC = () => JSON.parse(localStorage.getItem('bst_c')) || [];
const sC = d => localStorage.setItem('bst_c', JSON.stringify(d));
const gK = () => JSON.parse(localStorage.getItem('bst_cart')) || [];
const sK = d => localStorage.setItem('bst_cart', JSON.stringify(d));

// User-specific storage with Firebase sync
function getUserAddresses(){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user) return [];
    const all = JSON.parse(localStorage.getItem('bst_addresses')) || [];
    return all.filter(a => a.userEmail === user.email);
}

function saveUserAddresses(addresses){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user) return;
    const all = JSON.parse(localStorage.getItem('bst_addresses')) || [];
    const filtered = all.filter(a => a.userEmail !== user.email);
    const userAddrs = addresses.map(a => ({...a, userEmail: user.email}));
    localStorage.setItem('bst_addresses', JSON.stringify([...filtered, ...userAddrs]));
}

function getUserWishlist(){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user) return [];
    const all = JSON.parse(localStorage.getItem('bst_wishlist')) || [];
    const userWl = all.find(w => w.userEmail === user.email);
    return userWl ? userWl.items : [];
}

function saveUserWishlist(items){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user) return;
    const all = JSON.parse(localStorage.getItem('bst_wishlist')) || [];
    const filtered = all.filter(w => w.userEmail !== user.email);
    filtered.push({userEmail: user.email, items: items});
    localStorage.setItem('bst_wishlist', JSON.stringify(filtered));
}

// ============================================
// INIT ON LOAD
// ============================================
window.addEventListener('load', async () => {
    await init();
    setTimeout(() => document.getElementById('preloader').classList.add('gone'), 1500);
    renderProds();
    updateBadge();
    mkParticles();
    animNums();
    setupFilters();
    chkLogin();
});

// ============================================
// PARTICLES & ANIMATIONS
// ============================================
function mkParticles(){
    const c = document.getElementById('heroBgParticles');
    if(!c) return;
    for(let i=0; i<25; i++){
        const p = document.createElement('div');
        p.classList.add('particle');
        const s = Math.random()*6 + 2;
        p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;background:${Math.random()>.5?'rgba(222,33,40,.4)':'rgba(255,255,255,.2)'};animation-duration:${Math.random()*15+10}s;animation-delay:${Math.random()*10}s;`;
        c.appendChild(p);
    }
}

function animNums(){
    const els = document.querySelectorAll('.hn-val[data-target]');
    const obs = new IntersectionObserver(es => es.forEach(e => {
        if(e.isIntersecting){
            cntUp(e.target, +e.target.dataset.target);
            obs.unobserve(e.target);
        }
    }));
    els.forEach(el => obs.observe(el));
}

function cntUp(el, t){
    let c = 0;
    const inc = t/80;
    const iv = setInterval(() => {
        c += inc;
        if(c >= t){
            el.textContent = t;
            clearInterval(iv);
        } else {
            el.textContent = Math.floor(c);
        }
    }, 20);
}

// ============================================
// NAVIGATION
// ============================================
function toggleNav(){
    document.getElementById('navMenu').classList.toggle('on');
    document.getElementById('navBurger').classList.toggle('open');
}

document.querySelectorAll('.nav-menu a').forEach(a => a.addEventListener('click', () => {
    document.getElementById('navMenu').classList.remove('on');
    document.getElementById('navBurger').classList.remove('open');
}));

window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', scrollY > 50);
    document.getElementById('btt').classList.toggle('vis', scrollY > 400);
    document.querySelectorAll('section[id]').forEach(s => {
        const t = s.offsetTop - 100;
        if(scrollY >= t && scrollY < t + s.offsetHeight){
            document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
            const l = document.querySelector(`.nav-menu a[href="#${s.id}"]`);
            if(l) l.classList.add('active');
        }
    });
});

function scrollToSec(id){
    document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
}

function setupFilters(){
    document.getElementById('filterBar')?.addEventListener('click', e => {
        const b = e.target.closest('.fbtn');
        if(!b) return;
        document.querySelectorAll('#filterBar .fbtn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        renderProds(b.dataset.cat);
    });
}

// ============================================
// RENDER PRODUCTS
// ============================================
function renderProds(cat='all', q=''){
    const g = document.getElementById('prodGrid');
    if(!g) return;
    let ps = gP();
    if(cat && cat !== 'all') ps = ps.filter(p => p.category === cat);
    if(q){
        const t = q.toLowerCase();
        ps = ps.filter(p => p.name.toLowerCase().includes(t) || p.category.includes(t) || p.description.toLowerCase().includes(t));
    }
    if(!ps.length){
        g.innerHTML = '<div class="no-prod"><i class="fas fa-box-open"></i><h3>No products found</h3><p>Try another category</p></div>';
        return;
    }
    g.innerHTML = ps.map(p => {
        const d = p.originalPrice ? Math.round((1 - p.price/p.originalPrice) * 100) : 0;
        const ic = CATS[p.category]?.icon || 'fa-gift';
        const im = p.image ? `<img src="${p.image}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div class=\\'p-ph\\'><i class=\\'fas ${ic}\\'></i></div>'">` : `<div class="p-ph"><i class="fas ${ic}"></i></div>`;
        return `<div class="p-card">
            <div class="p-badges">${p.newArrival?'<span class="p-badge bg-new">New</span>':''}${p.bestseller?'<span class="p-badge bg-best">Bestseller</span>':''}${d>0?`<span class="p-badge bg-sale">${d}% OFF</span>`:''}</div>
            <div class="p-img">${im}
                <div class="p-actions">
                    <button class="p-act-btn" onclick="viewProd(${p.id})" title="View"><i class="fas fa-eye"></i></button>
                    <button class="p-act-btn" onclick="toggleWishlist(${p.id})" title="Wishlist"><i class="fas fa-heart"></i></button>
                    <button class="p-act-btn" onclick="addCart(${p.id})" title="Add to Cart"><i class="fas fa-shopping-cart"></i></button>
                </div>
            </div>
            <div class="p-info">
                <div class="p-cat-tag">${CATS[p.category]?.name || p.category}</div>
                <h3 class="p-name">${p.name}</h3>
                <div class="p-stars">${stars(p.rating)}<span>(${p.rating})</span></div>
                <div class="p-price">
                    <span class="pr-now">₹${p.price}</span>
                    ${p.originalPrice?`<span class="pr-was">₹${p.originalPrice}</span>`:''}
                    ${d>0?`<span class="pr-off">${d}% OFF</span>`:''}
                </div>
                <button class="p-add-btn" onclick="addCart(${p.id})"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
            </div>
        </div>`;
    }).join('');
}

function stars(r){
    let h = '';
    for(let i=1; i<=5; i++){
        if(i <= Math.floor(r)) h += '<i class="fas fa-star"></i>';
        else if(i - r < 1 && i - r > 0) h += '<i class="fas fa-star-half-alt"></i>';
        else h += '<i class="far fa-star"></i>';
    }
    return h;
}

function filterCat(c){
    scrollToSec('products');
    setTimeout(() => {
        document.querySelectorAll('#filterBar .fbtn').forEach(b => {
            b.classList.remove('active');
            if(b.dataset.cat === c) b.classList.add('active');
        });
        renderProds(c);
    }, 400);
}

function doSearch(){
    const t = document.getElementById('searchInput').value.trim();
    if(t){
        scrollToSec('products');
        setTimeout(() => renderProds('all', t), 300);
    }
}

document.getElementById('searchInput')?.addEventListener('keypress', e => {
    if(e.key === 'Enter') doSearch();
});

// ============================================
// PRODUCT DETAIL VIEW
// ============================================
let dQ = 1;

function viewProd(id){
    const p = gP().find(x => x.id === id);
    if(!p) return;
    dQ = 1;
    const d = p.originalPrice ? Math.round((1 - p.price/p.originalPrice) * 100) : 0;
    const ic = CATS[p.category]?.icon || 'fa-gift';
    const im = p.image ? `<img src="${p.image}" alt="${p.name}" onerror="this.outerHTML='<i class=\\'fas ${ic}\\'></i>'">` : `<i class="fas ${ic}"></i>`;
    
    document.getElementById('prodDetailArea').innerHTML = `<div class="pd-grid">
        <div class="pd-img">${im}</div>
        <div>
            <div class="pd-cat">${CATS[p.category]?.name || p.category}</div>
            <h2 class="pd-title">${p.name}</h2>
            <div class="pd-rat">${stars(p.rating)} <span>${p.rating}/5</span></div>
            <div class="pd-pr-row">
                <span class="pd-pr">₹${p.price}</span>
                ${p.originalPrice?`<span class="pd-op">₹${p.originalPrice}</span>`:''}
                ${d>0?`<span class="pr-off" style="margin-left:10px">${d}% OFF</span>`:''}
            </div>
            <p class="pd-desc">${p.description}</p>
            <div class="pd-qty">
                <label>Quantity:</label>
                <div class="qty-ctrl">
                    <button onclick="chDQ(-1)">−</button>
                    <span id="dQV">1</span>
                    <button onclick="chDQ(1)">+</button>
                </div>
                <span style="font-size:13px;color:#999">${p.stock} in stock</span>
            </div>
            <div class="pd-btns">
                <button class="btn-primary" onclick="addCart(${p.id},dQ);closeOv('prodOverlay')"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
                <button class="btn-outline-dk" onclick="buyNow(${p.id})"><i class="fas fa-bolt"></i> Buy Now</button>
                <button class="btn-outline-dk" onclick="toggleWishlist(${p.id})"><i class="fas fa-heart"></i> Wishlist</button>
            </div>
            <div class="pd-feats">
                <h4>Features</h4>
                <ul>
                    <li><i class="fas fa-check"></i> 100% Customizable</li>
                    <li><i class="fas fa-check"></i> Premium Quality</li>
                    <li><i class="fas fa-check"></i> Free Shipping above ₹999</li>
                    <li><i class="fas fa-check"></i> 7-Day Returns</li>
                </ul>
            </div>
        </div>
    </div>`;
    openOv('prodOverlay');
}

function chDQ(d){
    dQ = Math.max(1, dQ + d);
    document.getElementById('dQV').textContent = dQ;
}

// ============================================
// CART MANAGEMENT
// ============================================
function addCart(pid, qty=1){
    const p = gP().find(x => x.id === pid);
    if(!p) return;
    let c = gK();
    const e = c.find(x => x.pid === pid);
    if(e) e.qty += qty;
    else c.push({pid, qty});
    sK(c);
    updateBadge();
    renderCart();
    toast(`${p.name} added to cart!`);
}

function rmCart(pid){
    sK(gK().filter(x => x.pid !== pid));
    updateBadge();
    renderCart();
}

function updQty(pid, d){
    let c = gK();
    const i = c.find(x => x.pid === pid);
    if(i){
        i.qty += d;
        if(i.qty <= 0) c = c.filter(x => x.pid !== pid);
    }
    sK(c);
    updateBadge();
    renderCart();
}

function updateBadge(){
    document.getElementById('cartBadge').textContent = gK().reduce((s, i) => s + i.qty, 0);
}

function toggleCart(){
    document.getElementById('cartDim').classList.toggle('on');
    document.getElementById('cartDrawer').classList.toggle('on');
    renderCart();
}

function renderCart(){
    const el = document.getElementById('cartBody'), cart = gK(), ps = gP();
    if(!cart.length){
        el.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-basket"></i><p>Your cart is empty</p></div>';
        document.getElementById('cartTotalVal').textContent = '₹0';
        return;
    }
    let tot = 0;
    el.innerHTML = cart.map(item => {
        const p = ps.find(x => x.id === item.pid);
        if(!p) return '';
        tot += p.price * item.qty;
        const ic = CATS[p.category]?.icon || 'fa-gift';
        const im = p.image ? `<img src="${p.image}" alt="" onerror="this.outerHTML='<i class=\\'fas ${ic}\\'></i>'">` : `<i class="fas ${ic}"></i>`;
        return `<div class="ci">
            <div class="ci-img">${im}</div>
            <div class="ci-det">
                <h4>${p.name}</h4>
                <span class="ci-pr">₹${p.price}</span>
                <div class="ci-qty">
                    <button class="qb" onclick="updQty(${p.id},-1)">−</button>
                    <span>${item.qty}</span>
                    <button class="qb" onclick="updQty(${p.id},1)">+</button>
                </div>
            </div>
            <button class="ci-del" onclick="rmCart(${p.id})"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }).join('');
    document.getElementById('cartTotalVal').textContent = `₹${tot.toLocaleString()}`;
}

function buyNow(pid){
    let c = gK();
    if(!c.find(x => x.pid === pid)){
        c.push({pid, qty:1});
        sK(c);
        updateBadge();
    }
    closeOv('prodOverlay');
    startCheckout();
}

// ============================================
// CHECKOUT FLOW
// ============================================
let orderTotal = 0, currentOrderId = '', shippingData = {};

function startCheckout(){
    if(!gK().length){
        toast('Cart is empty!', 'e');
        return;
    }
    document.getElementById('cartDim').classList.remove('on');
    document.getElementById('cartDrawer').classList.remove('on');
    renderShippingStep();
    openOv('checkOverlay');
}

function renderShippingStep(){
    const u = JSON.parse(localStorage.getItem('bst_u'));
    const userAddresses = getUserAddresses();
    const defaultAddr = userAddresses.find(a => a.isDefault);
    
    let addressOptions = '';
    if(userAddresses.length > 0){
        addressOptions = `<div class="f-group" style="background:#e8f5e9;padding:15px;border-radius:10px;border-left:4px solid #4CAF50">
            <label><i class="fas fa-map-marker-alt"></i> Use Saved Address</label>
            <select id="savedAddrSelect" onchange="useSavedAddress()" style="background:white">
                <option value="">-- Select Address --</option>
                ${userAddresses.map((a,i) => `<option value="${i}" ${a.isDefault?'selected':''}>${a.label} - ${a.name}, ${a.city}</option>`).join('')}
            </select>
        </div>`;
    }
    
    document.getElementById('checkContent').innerHTML = `<div class="m-head"><div class="m-icon"><i class="fas fa-credit-card"></i></div><h2>Checkout</h2></div>
    <div class="ck-steps">
        <div class="ck-step active"><span>1</span> Shipping</div><div class="ck-line"></div>
        <div class="ck-step"><span>2</span> Payment</div><div class="ck-line"></div>
        <div class="ck-step"><span>3</span> Done</div>
    </div>
    ${addressOptions}
    <h3>Shipping Information</h3>
    <div class="f-row">
        <div class="f-group"><label>Full Name *</label><input type="text" id="sName" placeholder="Enter your full name" value="${defaultAddr?.name || u?.name || ''}" maxlength="50"></div>
        <div class="f-group"><label>Phone Number *</label><input type="tel" id="sPhone" placeholder="10-digit mobile" value="${defaultAddr?.phone || u?.phone || ''}" maxlength="10"></div>
    </div>
    <div class="f-group"><label>Email Address *</label><input type="email" id="sEmail" placeholder="your@email.com" value="${u?.email||''}" maxlength="100"></div>
    <div class="f-group"><label>Delivery Address *</label><textarea id="sAddr" rows="3" placeholder="House no, Street, Locality (min 10 chars)" maxlength="200">${defaultAddr?.line || u?.address || ''}</textarea></div>
    <div class="f-row">
        <div class="f-group"><label>City *</label><input type="text" id="sCity" placeholder="e.g., Coimbatore" maxlength="50" value="${defaultAddr?.city || ''}"></div>
        <div class="f-group"><label>Pincode *</label><input type="text" id="sPin" placeholder="6-digit pincode" maxlength="6" value="${defaultAddr?.pincode || ''}"></div>
    </div>
    <div class="f-group"><label>Customization Notes <span style="color:#999;font-weight:400">(Optional)</span></label><textarea id="sNotes" rows="2" placeholder="Special instructions for your order..." maxlength="500"></textarea></div>
    <button onclick="goPayStep()" class="btn-primary btn-block">Continue to Payment <i class="fas fa-arrow-right"></i></button>`;
    
    setTimeout(() => {
        attachValidation('sName', 'name');
        attachValidation('sPhone', 'phone');
        attachValidation('sEmail', 'email');
        attachValidation('sAddr', 'address');
        attachValidation('sCity', 'city');
        attachValidation('sPin', 'pincode');
    }, 100);
}

function useSavedAddress(){
    const idx = document.getElementById('savedAddrSelect').value;
    if(idx === '') return;
    const addrs = getUserAddresses();
    const a = addrs[idx];
    if(a){
        document.getElementById('sName').value = a.name;
        document.getElementById('sPhone').value = a.phone;
        document.getElementById('sAddr').value = a.line;
        document.getElementById('sCity').value = a.city;
        document.getElementById('sPin').value = a.pincode;
        toast('Address loaded!');
    }
}

function goPayStep(){
    const validation = validateForm([
        {id:'sName', validator:'name'},
        {id:'sPhone', validator:'phone'},
        {id:'sEmail', validator:'email'},
        {id:'sAddr', validator:'address'},
        {id:'sCity', validator:'city'},
        {id:'sPin', validator:'pincode'}
    ]);
    
    if(!validation.valid) return;
    
    shippingData = {
        name: validation.values.sName,
        phone: validation.values.sPhone,
        email: validation.values.sEmail,
        address: validation.values.sAddr,
        city: validation.values.sCity,
        pincode: validation.values.sPin,
        notes: document.getElementById('sNotes').value.trim()
    };
    
    const cart = gK(), ps = gP();
    let tot = 0, html = '';
    cart.forEach(item => {
        const p = ps.find(x => x.id === item.pid);
        if(p){
            const st = p.price * item.qty;
            tot += st;
            html += `<div class="os-line"><span>${p.name} × ${item.qty}</span><strong>₹${st.toLocaleString()}</strong></div>`;
        }
    });
    const ship = tot >= 999 ? 0 : 99;
    tot += ship;
    orderTotal = tot;
    html += `<div class="os-line"><span>Shipping</span><span>${ship===0?'<span style="color:#4CAF50;font-weight:700">FREE</span>':'₹99'}</span></div>`;
    html += `<div class="os-total"><span>Total</span><span class="os-val">₹${tot.toLocaleString()}</span></div>`;
    
    document.getElementById('checkContent').innerHTML = `<div class="m-head"><div class="m-icon"><i class="fas fa-credit-card"></i></div><h2>Payment Method</h2></div>
    <div class="ck-steps">
        <div class="ck-step done"><span>1</span> Shipping</div><div class="ck-line"></div>
        <div class="ck-step active"><span>2</span> Payment</div><div class="ck-line"></div>
        <div class="ck-step"><span>3</span> Done</div>
    </div>
    <h3>Order Summary</h3>
    <div class="order-sum">${html}</div>
    <div class="pay-methods">
        <h4>Select Payment Method</h4>
        <label class="pay-opt pay-opt-recommended">
            <input type="radio" name="payM" value="razorpay" checked>
            <div class="pay-opt-body"><i class="fas fa-bolt"></i><div><h4>Pay Online (Razorpay)</h4><p>Cards, UPI, Net Banking, Wallets</p></div></div>
        </label>
        <label class="pay-opt">
            <input type="radio" name="payM" value="upi_direct">
            <div class="pay-opt-body"><i class="fas fa-qrcode"></i><div><h4>Direct UPI / QR Code</h4><p>Scan QR with GPay, PhonePe, Paytm</p></div></div>
        </label>
        <label class="pay-opt">
            <input type="radio" name="payM" value="cod">
            <div class="pay-opt-body"><i class="fas fa-money-bill-wave"></i><div><h4>Cash on Delivery</h4><p>Pay when you receive</p></div></div>
        </label>
    </div>
    <div class="ck-btns">
        <button onclick="renderShippingStep()" class="btn-outline-dk"><i class="fas fa-arrow-left"></i> Back</button>
        <button onclick="processPayment()" class="btn-primary"><i class="fas fa-lock"></i> Proceed</button>
    </div>`;
}

function processPayment(){
    const m = document.querySelector('input[name="payM"]:checked').value;
    if(m === 'cod'){
        if(confirm(`Confirm COD order for ₹${orderTotal.toLocaleString()}?`)){
            finalizeOrder('cod', 'COD-' + Date.now());
        }
    } else if(m === 'razorpay'){
        processRazorpay();
    } else if(m === 'upi_direct'){
        showUPIPayment();
    }
}

function processRazorpay(){
    if(typeof Razorpay === 'undefined'){
        toast('Payment gateway not loaded. Refresh page.', 'e');
        return;
    }
    
    currentOrderId = 'BST-' + String(gO().length + 1).padStart(3, '0');
    
    const opts = {
        key: PAYMENT_CONFIG.razorpay.key,
        amount: orderTotal * 100,
        currency: 'INR',
        name: PAYMENT_CONFIG.razorpay.merchant_name,
        description: `Order ${currentOrderId}`,
        image: PAYMENT_CONFIG.razorpay.merchant_logo,
        handler: function(r){
            finalizeOrder('razorpay', r.razorpay_payment_id);
        },
        prefill: {
            name: shippingData.name,
            email: shippingData.email,
            contact: shippingData.phone
        },
        notes: {
            order_id: currentOrderId,
            address: shippingData.address
        },
        theme: {color: PAYMENT_CONFIG.razorpay.theme_color},
        modal: {
            ondismiss: function(){
                toast('Payment cancelled.', 'e');
            }
        }
    };
    
    try {
        const rzp = new Razorpay(opts);
        rzp.on('payment.failed', function(r){
            toast('Payment failed: ' + (r.error.description || 'Error'), 'e');
        });
        rzp.open();
    } catch(err){
        toast('Payment gateway error. Try again.', 'e');
    }
}

function showUPIPayment(){
    currentOrderId = 'BST-' + String(gO().length + 1).padStart(3, '0');
    const uid = PAYMENT_CONFIG.upi.upi_id;
    const nm = PAYMENT_CONFIG.upi.merchant_name;
    const note = 'Order ' + currentOrderId;
    const params = `pa=${uid}&pn=${encodeURIComponent(nm)}&am=${orderTotal}&cu=INR&tn=${encodeURIComponent(note)}`;
    const upiLink = `upi://pay?${params}`;
    const gpay = `tez://upi/pay?${params}`;
    const phonepe = `phonepe://pay?${params}`;
    const paytm = `paytmmp://pay?${params}`;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}&margin=10`;
    
    document.getElementById('checkContent').innerHTML = `<div class="m-head">
        <div class="m-icon"><i class="fas fa-qrcode"></i></div>
        <h2>UPI Payment</h2>
        <p>${isMobile?'Choose your UPI app':'Scan QR with your UPI app'}</p>
    </div>
    <div class="ck-steps">
        <div class="ck-step done"><span>1</span> Shipping</div><div class="ck-line"></div>
        <div class="ck-step active"><span>2</span> Payment</div><div class="ck-line"></div>
        <div class="ck-step"><span>3</span> Done</div>
    </div>
    <div class="upi-pay-wrap">
        <div class="upi-amount-card">
            <p class="upi-amount-label">Amount to Pay</p>
            <p class="upi-amount-val">₹${orderTotal.toLocaleString()}</p>
            <p class="upi-order-label">Order: ${currentOrderId}</p>
        </div>
        ${isMobile ? `
        <div class="upi-apps-grid">
            <h4 style="font-size:16px;font-weight:700;color:#333;margin-bottom:15px;text-align:center"><i class="fas fa-mobile-alt"></i> Pay with your UPI App</h4>
            <a href="${gpay}" class="upi-app-btn">
                <div class="upi-app-icon" style="background:white">
                    <svg width="28" height="28" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg>
                </div>
                <div class="upi-app-info"><span class="upi-app-name">Google Pay</span><span class="upi-app-tag">Tap to pay</span></div>
                <i class="fas fa-chevron-right upi-app-arrow"></i>
            </a>
            <a href="${phonepe}" class="upi-app-btn">
                <div class="upi-app-icon" style="background:#5f259f;color:white"><strong style="font-size:14px">PP</strong></div>
                <div class="upi-app-info"><span class="upi-app-name">PhonePe</span><span class="upi-app-tag">Tap to pay</span></div>
                <i class="fas fa-chevron-right upi-app-arrow"></i>
            </a>
            <a href="${paytm}" class="upi-app-btn">
                <div class="upi-app-icon" style="background:#00BAF2;color:white"><strong style="font-size:16px">P</strong></div>
                <div class="upi-app-info"><span class="upi-app-name">Paytm</span><span class="upi-app-tag">Tap to pay</span></div>
                <i class="fas fa-chevron-right upi-app-arrow"></i>
            </a>
            <a href="${upiLink}" class="upi-app-btn">
                <div class="upi-app-icon" style="background:linear-gradient(135deg,#de2128,#b91c22);color:white"><i class="fas fa-th"></i></div>
                <div class="upi-app-info"><span class="upi-app-name">Other UPI Apps</span><span class="upi-app-tag">BHIM, Amazon Pay, WhatsApp Pay</span></div>
                <i class="fas fa-chevron-right upi-app-arrow"></i>
            </a>
        </div>
        <div class="upi-divider"><span>OR SCAN QR</span></div>
        <div class="upi-qr-box"><img src="${qr}" alt="QR" onerror="this.style.display='none'"></div>
        ` : `
        <div class="upi-qr-box" style="margin-top:20px"><img src="${qr}" alt="QR" onerror="this.style.display='none'"></div>
        <div class="upi-mobile-suggest">
            <i class="fas fa-mobile-alt"></i>
            <p><strong>On Mobile?</strong> Open this page on your phone to pay directly via UPI apps.</p>
        </div>
        `}
        <div class="upi-id-box">
            <p class="upi-id-label">Pay using UPI ID</p>
            <div class="upi-id-row">
                <span class="upi-id-text">${uid}</span>
                <button onclick="copyUPI('${uid}')" class="upi-copy-btn"><i class="fas fa-copy"></i> Copy</button>
            </div>
        </div>
        <div class="upi-instructions">
            <p><i class="fas fa-info-circle"></i> How to Pay:</p>
            <ol>${isMobile?'<li>Tap your preferred UPI app above</li><li>Verify amount and enter PIN</li><li>Copy Transaction ID from your app</li><li>Paste below and confirm</li>':'<li>Open UPI app on your phone</li><li>Scan QR code above</li><li>Enter PIN to pay</li><li>Enter Transaction ID below</li>'}</ol>
        </div>
        <div class="upi-txn-input-wrap">
            <label>UPI Transaction ID / Reference *</label>
            <input type="text" id="upiTxnId" placeholder="e.g., 423456789012" maxlength="50">
            <p class="upi-help-txt">Find this in your UPI app after payment</p>
        </div>
        <div class="ck-btns">
            <button onclick="goPayStep()" class="btn-outline-dk"><i class="fas fa-arrow-left"></i> Back</button>
            <button onclick="confirmUPI()" class="btn-primary"><i class="fas fa-check"></i> Confirm Payment</button>
        </div>
    </div>`;
    
    setTimeout(() => {
        attachValidation('upiTxnId', 'transactionId');
    }, 100);
}

function copyUPI(u){
    if(navigator.clipboard){
        navigator.clipboard.writeText(u).then(() => toast('UPI ID copied!')).catch(() => fbCopyText(u));
    } else {
        fbCopyText(u);
    }
}

function fbCopyText(t){
    const a = document.createElement('textarea');
    a.value = t;
    a.style.position = 'fixed';
    a.style.left = '-9999px';
    document.body.appendChild(a);
    a.select();
    try {
        document.execCommand('copy');
        toast('Copied!');
    } catch(e){
        toast('Copy manually', 'e');
    }
    document.body.removeChild(a);
}

function confirmUPI(){
    clearAllErrors();
    const txnVal = VALIDATORS.transactionId(document.getElementById('upiTxnId').value);
    if(!txnVal.ok){
        showFieldError('upiTxnId', txnVal.msg);
        return;
    }
    finalizeOrder('upi', txnVal.value);
}

// ============================================
// FINALIZE ORDER + FIREBASE + WHATSAPP
// ============================================
async function finalizeOrder(method, paymentId){
    const cart = gK(), ps = gP();
    let tot = 0;
    const items = cart.map(item => {
        const p = ps.find(x => x.id === item.pid);
        if(p){
            tot += p.price * item.qty;
            return {
                productId: p.id,
                name: p.name,
                price: p.price,
                quantity: item.qty,
                subtotal: p.price * item.qty,
                category: p.category
            };
        }
        return null;
    }).filter(Boolean);
    
    const ship = tot >= 999 ? 0 : 99;
    tot += ship;
    const oid = currentOrderId || 'BST-' + String(gO().length + 1).padStart(3, '0');
    const dt = new Date();
    
    const order = {
        id: oid,
        customer: {
            name: shippingData.name,
            email: shippingData.email,
            phone: shippingData.phone,
            address: shippingData.address,
            city: shippingData.city,
            pincode: shippingData.pincode
        },
        items,
        total: tot,
        shipping: ship,
        paymentMethod: method,
        paymentId: paymentId || null,
        paymentStatus: method === 'cod' ? 'pending' : 'paid',
        status: 'pending',
        date: dt.toISOString(),
        notes: shippingData.notes,
        tracking: [{
            status: 'Order Placed',
            date: dt.toISOString(),
            description: 'Your order has been received'
        }]
    };
    
    const orders = gO();
    orders.push(order);
    sO(orders);
    
    const u = JSON.parse(localStorage.getItem('bst_u'));
    let c = null;
    if(u){
        const cs = gC();
        c = cs.find(x => x.email === u.email);
        if(c){
            if(!c.orders) c.orders = [];
            c.orders.push(oid);
            c.totalSpent = (c.totalSpent || 0) + tot;
            sC(cs);
            localStorage.setItem('bst_u', JSON.stringify(c));
        }
    }
    
    const prods = gP();
    items.forEach(item => {
        const p = prods.find(x => x.id === item.productId);
        if(p) p.stock = Math.max(0, p.stock - item.quantity);
    });
    sP(prods);
    
    sK([]);
    updateBadge();
    
    // 🔥 Save to Firebase
    try {
        await fbSaveOrder(order);
        if(u && c) await fbSaveCustomer(c);
        for(const item of items){
            const p = prods.find(x => x.id === item.productId);
            if(p) await fbSaveProduct(p);
        }
    } catch(err){
        console.error('Firebase save error:', err);
    }
    
    renderSuccessStep(order);
    toast('Order placed!');
    
    setTimeout(() => sendWhatsApp(order), 1500);
}

function buildWAMsg(o){
    const d = new Date(o.date);
    const ds = d.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
    const ts = d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
    const pm = {
        'razorpay': '💳 Online (Razorpay)',
        'upi': '📱 UPI',
        'cod': '💵 Cash on Delivery'
    };
    const ps = o.paymentStatus === 'paid' ? '✅ PAID' : '⏳ PENDING';
    
    let il = '';
    o.items.forEach((i, n) => {
        il += `\n${n+1}. *${i.name}*\n   Qty: ${i.quantity} × ₹${i.price} = ₹${i.subtotal.toLocaleString()}`;
    });
    
    return `🎁 *NEW ORDER - BESTOW* 🎁
━━━━━━━━━━━━━━━━━━

📋 *Order ID:* *${o.id}*
📅 ${ds} • ${ts}

👤 *Customer*
Name: *${o.customer.name}*
📞 ${o.customer.phone}
📧 ${o.customer.email}

📍 *Delivery Address*
${o.customer.address}
${o.customer.city} - ${o.customer.pincode}

🛍️ *Items (${o.items.length})*${il}

━━━━━━━━━━━━━━━━━━
Subtotal: ₹${(o.total - o.shipping).toLocaleString()}
Shipping: ${o.shipping === 0 ? 'FREE' : '₹' + o.shipping}
*TOTAL: ₹${o.total.toLocaleString()}*
━━━━━━━━━━━━━━━━━━

💳 *Payment*
${pm[o.paymentMethod] || o.paymentMethod}
Status: ${ps}
${o.paymentId ? `Txn ID: ${o.paymentId}` : ''}
${o.notes ? `\n📝 *Notes:* ${o.notes}` : ''}

━━━━━━━━━━━━━━━━━━
🙏 *Bestow* - Elevate Your Memories`;
}

function sendWhatsApp(o){
    const msg = buildWAMsg(o);
    window.open(`https://wa.me/${PAYMENT_CONFIG.business.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

function resendWA(oid){
    const o = gO().find(x => x.id === oid);
    if(o) sendWhatsApp(o);
}

function renderSuccessStep(o){
    const ml = {
        'razorpay': 'Online Payment',
        'upi': 'UPI Payment',
        'cod': 'Cash on Delivery'
    };
    
    document.getElementById('checkContent').innerHTML = `<div class="m-head">
        <div class="m-icon" style="background:rgba(76,175,80,.1);color:#4CAF50"><i class="fas fa-check-circle"></i></div>
    </div>
    <div class="ck-steps">
        <div class="ck-step done"><span>1</span> Shipping</div><div class="ck-line"></div>
        <div class="ck-step done"><span>2</span> Payment</div><div class="ck-line"></div>
        <div class="ck-step active"><span>3</span> Done</div>
    </div>
    <div class="order-done">
        <div class="done-check"><i class="fas fa-check-circle"></i></div>
        <h2>Order Placed! 🎉</h2>
        <p>Thank you for shopping with Bestow</p>
        <div class="done-oid">${o.id}</div>
        <div style="background:var(--lg2);padding:20px;border-radius:12px;margin:20px auto;max-width:450px;text-align:left">
            <p style="font-size:13px;color:#666;margin-bottom:8px"><strong>👤</strong> ${o.customer.name}</p>
            <p style="font-size:13px;color:#666;margin-bottom:8px"><strong>📞</strong> ${o.customer.phone}</p>
            <p style="font-size:13px;color:#666;margin-bottom:8px"><strong>💳</strong> ${ml[o.paymentMethod] || o.paymentMethod}</p>
            ${o.paymentId ? `<p style="font-size:12px;color:#999;margin-bottom:8px"><strong>🆔</strong> ${o.paymentId}</p>` : ''}
            <p style="font-size:14px;color:#de2128;font-weight:700"><strong>💰 ₹${o.total.toLocaleString()}</strong></p>
        </div>
        <div style="background:linear-gradient(135deg,#25D366,#128C7E);color:white;padding:20px;border-radius:12px;margin:20px auto;max-width:450px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                <i class="fab fa-whatsapp" style="font-size:32px"></i>
                <div style="text-align:left">
                    <h4 style="font-size:16px;font-weight:700;margin:0">WhatsApp Notification</h4>
                    <p style="font-size:12px;opacity:.9;margin:0">Order details sent to our team</p>
                </div>
            </div>
        </div>
        <p style="font-size:14px;color:#999;margin:20px 0">Track your order anytime with the Order ID above</p>
        <div class="done-btns">
            <button onclick="resendWA('${o.id}')" class="btn-primary" style="background:#25D366"><i class="fab fa-whatsapp"></i> Send via WhatsApp Again</button>
            <button onclick="closeOv('checkOverlay');openMyAccount('orders')" class="btn-primary"><i class="fas fa-shopping-bag"></i> View My Orders</button>
            <button onclick="closeOv('checkOverlay')" class="btn-outline-dk">Continue Shopping</button>
        </div>
    </div>`;
}

// ============================================
// ORDER TRACKING
// ============================================
function trackOrder(){
    const tid = document.getElementById('trackInput').value.trim().toUpperCase();
    const r = document.getElementById('trackResult');
    
    if(!tid){
        toast('Enter Order ID!', 'e');
        return;
    }
    
    const o = gO().find(x => x.id === tid);
    if(!o){
        r.innerHTML = `<div class="track-inner"><div class="tk-404"><i class="fas fa-exclamation-circle"></i><h3>Order Not Found</h3><p>Check your Order ID.</p></div></div>`;
        return;
    }
    
    const steps = [
        {s:'Order Placed', i:'fa-clipboard-check'},
        {s:'Confirmed', i:'fa-check-circle'},
        {s:'Processing', i:'fa-cogs'},
        {s:'Shipped', i:'fa-shipping-fast'},
        {s:'Delivered', i:'fa-box-open'}
    ];
    const si = {pending:0, confirmed:1, processing:2, shipped:3, delivered:4};
    const ci = si[o.status] || 0;
    
    let tl = steps.map((st, idx) => {
        let cls = '';
        if(idx < ci) cls = 'done';
        else if(idx === ci) cls = 'now';
        const te = o.tracking && o.tracking[idx];
        const dt = te ? new Date(te.date).toLocaleDateString() : '';
        const desc = te ? te.description : 'Pending';
        return `<div class="tk-step ${cls}"><div class="tk-ic"><i class="fas ${st.i}"></i></div><div class="tk-info"><h4>${st.s}</h4><p>${desc}${dt?' • '+dt:''}</p></div></div>`;
    }).join('');
    
    const pm = {'razorpay':'Online', 'upi':'UPI', 'cod':'COD'};
    r.innerHTML = `<div class="track-inner">
        <div class="tk-head">
            <h3>Order: ${o.id}</h3>
            <p>${new Date(o.date).toLocaleDateString()} | ₹${o.total.toLocaleString()} | ${pm[o.paymentMethod] || o.paymentMethod}</p>
            ${o.paymentId ? `<p style="font-size:12px;color:#999;margin-top:5px">Ref: ${o.paymentId}</p>` : ''}
        </div>
        <div class="tk-timeline">${tl}</div>
        <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid #eee">
            <button onclick="resendWA('${o.id}')" class="btn-primary" style="background:#25D366"><i class="fab fa-whatsapp"></i> Contact via WhatsApp</button>
        </div>
    </div>`;
}

// ============================================
// AUTH FUNCTIONS
// ============================================
function showAuth(t){
    if(t === 'admin'){
        document.getElementById('custAuthArea').style.display = 'none';
        document.getElementById('admAuthArea').style.display = 'block';
    } else {
        document.getElementById('custAuthArea').style.display = 'block';
        document.getElementById('admAuthArea').style.display = 'none';
        goLogin();
    }
    openOv('authOverlay');
    clearAllErrors();
    
    setTimeout(() => {
        if(t === 'customer'){
            attachValidation('lEmail', 'email');
            attachValidation('lPass', 'password');
            attachValidation('rName', 'name');
            attachValidation('rEmail', 'email');
            attachValidation('rPhone', 'phone');
            attachValidation('rPass', 'password');
        }
    }, 100);
}

function goLogin(){
    document.getElementById('loginArea').style.display = 'block';
    document.getElementById('regArea').style.display = 'none';
    document.getElementById('forgotArea').style.display = 'none';
    document.getElementById('authH').textContent = 'Welcome Back!';
    document.getElementById('authP').textContent = 'Sign in to access your account';
    clearAllErrors();
}

function goRegister(){
    document.getElementById('loginArea').style.display = 'none';
    document.getElementById('regArea').style.display = 'block';
    document.getElementById('forgotArea').style.display = 'none';
    document.getElementById('authH').textContent = 'Create Account';
    document.getElementById('authP').textContent = 'Join Bestow for exclusive benefits';
    clearAllErrors();
}

function showForgotPass(){
    document.getElementById('loginArea').style.display = 'none';
    document.getElementById('regArea').style.display = 'none';
    document.getElementById('forgotArea').style.display = 'block';
    clearAllErrors();
}

function forgotPassword(){
    const emailVal = VALIDATORS.email(document.getElementById('forgotEmail').value);
    if(!emailVal.ok){
        showFieldError('forgotEmail', emailVal.msg);
        return;
    }
    
    const c = gC().find(x => x.email === emailVal.value);
    if(!c){
        toast('No account found with this email!', 'e');
        return;
    }
    
    const msg = `🔐 *Password Reset Request - Bestow*%0A%0AEmail: ${emailVal.value}%0AName: ${c.name}%0A%0APlease help me reset my password.`;
    window.open(`https://wa.me/${PAYMENT_CONFIG.business.whatsapp}?text=${msg}`, '_blank');
    
    toast('Reset request sent via WhatsApp!');
    setTimeout(() => goLogin(), 2000);
}

async function custLogin(){
    clearAllErrors();
    const emailVal = VALIDATORS.email(document.getElementById('lEmail').value);
    const passVal = VALIDATORS.password(document.getElementById('lPass').value);
    
    if(!emailVal.ok){
        showFieldError('lEmail', emailVal.msg);
        return;
    }
    if(!passVal.ok){
        showFieldError('lPass', passVal.msg);
        return;
    }
    
    // First check local cache
    let c = gC().find(x => x.email === emailVal.value && x.password === passVal.value);
    
    // If not found, sync from Firebase and try again
    if(!c){
        try {
            await syncFromFirebase();
            c = gC().find(x => x.email === emailVal.value && x.password === passVal.value);
        } catch(err){
            console.error('Firebase sync error during login:', err);
        }
    }
    
    if(c){
        // Sync user's addresses and wishlist from Firebase
        try {
            const addrs = await fbGetAddresses(c.email);
            if(addrs.length > 0) saveUserAddresses(addrs);
            
            const wl = await fbGetWishlist(c.email);
            if(wl.length > 0) saveUserWishlist(wl);
        } catch(err){
            console.error('Failed to sync user data:', err);
        }
        
        localStorage.setItem('bst_u', JSON.stringify(c));
        closeOv('authOverlay');
        toast(`Welcome back, ${c.name}!`);
        setLoginUI(c);
    } else {
        toast('Invalid email or password!', 'e');
        showFieldError('lPass', 'Invalid credentials');
    }
}

async function custRegister(){
    clearAllErrors();
    
    const validation = validateForm([
        {id:'rName', validator:'name'},
        {id:'rEmail', validator:'email'},
        {id:'rPhone', validator:'phone'},
        {id:'rPass', validator:'password'}
    ]);
    
    if(!validation.valid) return;
    
    if(!document.getElementById('agreeTerms').checked){
        toast('Please agree to the Terms & Conditions!', 'e');
        return;
    }
    
    const addrVal = document.getElementById('rAddr').value.trim();
    let addrFinal = '';
    if(addrVal){
        const aRes = VALIDATORS.address(addrVal);
        if(!aRes.ok){
            showFieldError('rAddr', aRes.msg);
            return;
        }
        addrFinal = aRes.value;
    }
    
    // Sync from Firebase first to check for duplicates
    try {
        await syncFromFirebase();
    } catch(err){
        console.warn('Could not sync from Firebase before register');
    }
    
    const cs = gC();
    if(cs.find(c => c.email === validation.values.rEmail)){
        showFieldError('rEmail', 'Email already registered');
        return;
    }
    
    const nc = {
        id: cs.length + 1,
        name: validation.values.rName,
        email: validation.values.rEmail,
        phone: validation.values.rPhone,
        password: validation.values.rPass,
        address: addrFinal,
        orders: [],
        totalSpent: 0,
        dob: '',
        gender: '',
        joinedDate: new Date().toISOString()
    };
    cs.push(nc);
    sC(cs);
    
    // 🔥 Save to Firebase
    try {
        await fbSaveCustomer(nc);
    } catch(err){
        console.error('Failed to save customer to Firebase:', err);
    }
    
    localStorage.setItem('bst_u', JSON.stringify(nc));
    closeOv('authOverlay');
    toast(`Welcome to Bestow, ${nc.name}! 🎉`);
    setLoginUI(nc);
}

// ============================================
// LOGIN UI & MY ACCOUNT
// ============================================
function setLoginUI(c){
    const loginBtn = document.getElementById('custLoginBtn');
    const accountWrap = document.getElementById('myAccountWrap');
    
    if(loginBtn && accountWrap && c){
        loginBtn.style.display = 'none';
        accountWrap.style.display = 'block';
        
        const initial = c.name.charAt(0).toUpperCase();
        document.getElementById('accountAvatar').textContent = initial;
        document.getElementById('adAvatar').textContent = initial;
        document.getElementById('accountName').textContent = c.name.split(' ')[0];
        document.getElementById('adName').textContent = c.name;
        document.getElementById('adEmail').textContent = c.email;
    }
}

function chkLogin(){
    const c = JSON.parse(localStorage.getItem('bst_u'));
    if(c) setLoginUI(c);
}

function togEye(id, btn){
    const i = document.getElementById(id);
    const ic = btn.querySelector('i');
    if(i.type === 'password'){
        i.type = 'text';
        ic.className = 'fas fa-eye-slash';
    } else {
        i.type = 'password';
        ic.className = 'fas fa-eye';
    }
}

function toggleAccountMenu(){
    const dropdown = document.getElementById('accountDropdown');
    const btn = document.querySelector('.my-account-btn');
    dropdown.classList.toggle('show');
    btn.classList.toggle('open');
}

document.addEventListener('click', function(e){
    const wrap = document.getElementById('myAccountWrap');
    if(wrap && !wrap.contains(e.target)){
        document.getElementById('accountDropdown')?.classList.remove('show');
        document.querySelector('.my-account-btn')?.classList.remove('open');
    }
});

function custLogout(){
    if(confirm('Are you sure you want to logout?')){
        localStorage.removeItem('bst_u');
        sessionStorage.removeItem('bst_u');
        
        document.getElementById('myAccountWrap').style.display = 'none';
        document.getElementById('custLoginBtn').style.display = 'flex';
        
        closeOv('myAccountOverlay');
        
        toast('Logged out successfully!');
    }
}

function checkLoginAndOpen(tab){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user){
        toast('Please login first!', 'e');
        showAuth('customer');
        return;
    }
    openMyAccount(tab);
}

function openMyAccount(tab = 'dashboard'){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user){
        toast('Please login first!', 'e');
        showAuth('customer');
        return;
    }
    
    document.getElementById('accountDropdown')?.classList.remove('show');
    document.querySelector('.my-account-btn')?.classList.remove('open');
    
    const initial = user.name.charAt(0).toUpperCase();
    document.getElementById('maAvatar').textContent = initial;
    document.getElementById('maUserName').textContent = `Welcome, ${user.name}!`;
    document.getElementById('maUserEmail').textContent = user.email;
    
    const navBtn = document.querySelector(`.ma-nav[onclick*="${tab}"]`);
    if(navBtn){
        switchMATab(tab, navBtn);
    }
    
    openOv('myAccountOverlay');
}

function switchMATab(tab, btn){
    document.querySelectorAll('.ma-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.ma-nav').forEach(b => b.classList.remove('active'));
    
    document.getElementById('ma-' + tab)?.classList.add('active');
    if(btn) btn.classList.add('active');
    
    if(tab === 'dashboard') loadDashboard();
    if(tab === 'orders') loadMyOrders();
    if(tab === 'profile') loadProfile();
    if(tab === 'addresses') loadAddresses();
    if(tab === 'wishlist') loadWishlist();
    if(tab === 'password') loadPasswordTab();
}

// ============================================
// MY ACCOUNT - DASHBOARD TAB
// ============================================
function loadDashboard(){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user) return;
    
    const allOrders = gO().filter(o => o.customer.email === user.email);
    const totalSpent = allOrders.reduce((s, o) => s + (o.total || 0), 0);
    const activeOrders = allOrders.filter(o => ['pending','confirmed','processing','shipped'].includes(o.status)).length;
    const delivered = allOrders.filter(o => o.status === 'delivered').length;
    
    document.getElementById('dashTotalOrders').textContent = allOrders.length;
    document.getElementById('dashTotalSpent').textContent = `₹${totalSpent.toLocaleString()}`;
    document.getElementById('dashActiveOrders').textContent = activeOrders;
    document.getElementById('dashDelivered').textContent = delivered;
    
    document.getElementById('orderCountBadge').textContent = allOrders.length;
    document.getElementById('wishlistCountBadge').textContent = getUserWishlist().length;
    
    const recentOrders = allOrders.slice(-3).reverse();
    const dashOrders = document.getElementById('dashRecentOrders');
    
    if(recentOrders.length === 0){
        dashOrders.innerHTML = `<p class="empty-state">No orders yet. <a href="#products" onclick="closeOv('myAccountOverlay')">Start shopping!</a></p>`;
    } else {
        dashOrders.innerHTML = recentOrders.map(o => {
            const dt = new Date(o.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
            return `<div class="dash-order-item" onclick="viewOrderDetails('${o.id}')">
                <div class="dash-order-icon"><i class="fas fa-shopping-bag"></i></div>
                <div class="dash-order-info">
                    <div class="dash-order-id">${o.id}</div>
                    <div class="dash-order-meta">${o.items.length} items • ${dt} • <span class="moc-status-badge moc-status-${o.status}">${o.status}</span></div>
                </div>
                <div class="dash-order-price">₹${o.total.toLocaleString()}</div>
            </div>`;
        }).join('');
    }
}

// ============================================
// MY ACCOUNT - ORDERS TAB
// ============================================
function loadMyOrders(filter = 'all'){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user) return;
    
    let orders = gO().filter(o => o.customer.email === user.email);
    if(filter !== 'all') orders = orders.filter(o => o.status === filter);
    orders = orders.reverse();
    
    const list = document.getElementById('myOrdersList');
    
    if(orders.length === 0){
        list.innerHTML = `<div class="empty-state-box">
            <i class="fas fa-shopping-bag"></i>
            <h4>No orders ${filter !== 'all' ? 'in this category' : 'yet'}</h4>
            <p>${filter === 'all' ? 'Start shopping to see your orders here' : 'Try a different filter'}</p>
            <a href="#products" class="btn-primary" onclick="closeOv('myAccountOverlay')"><i class="fas fa-shopping-cart"></i> Shop Now</a>
        </div>`;
        return;
    }
    
    list.innerHTML = orders.map(o => {
        const dt = new Date(o.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
        const itemsList = o.items.slice(0, 2).map(i => i.name).join(', ');
        const moreItems = o.items.length > 2 ? ` +${o.items.length - 2} more` : '';
        
        return `<div class="my-order-card">
            <div class="moc-top">
                <div class="moc-id-block">
                    <h4><i class="fas fa-shopping-bag"></i> ${o.id}</h4>
                    <div class="moc-date"><i class="far fa-calendar"></i> ${dt}</div>
                </div>
                <span class="moc-status-badge moc-status-${o.status}">${o.status}</span>
            </div>
            
            <div class="moc-items">
                <div class="moc-item-thumb"><i class="fas fa-box"></i></div>
                <div class="moc-items-info">
                    <strong>${o.items.length} item${o.items.length > 1 ? 's' : ''}:</strong> ${itemsList}${moreItems}
                </div>
            </div>
            
            <div class="moc-bottom">
                <div class="moc-total">₹${o.total.toLocaleString()}</div>
                <div class="moc-actions">
                    <button class="moc-btn moc-btn-view" onclick="viewOrderDetails('${o.id}')"><i class="fas fa-eye"></i> View Details</button>
                    <button class="moc-btn moc-btn-track" onclick="closeOv('myAccountOverlay');setTimeout(()=>{document.getElementById('trackInput').value='${o.id}';trackOrder();scrollToSec('tracking')},300)"><i class="fas fa-truck"></i> Track</button>
                    <button class="moc-btn moc-btn-reorder" onclick="reorderItems('${o.id}')"><i class="fas fa-redo"></i> Reorder</button>
                    <button class="moc-btn moc-btn-whatsapp" onclick="resendWA('${o.id}')"><i class="fab fa-whatsapp"></i> Help</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function filterMyOrders(filter, btn){
    document.querySelectorAll('.ma-order-filters .ma-filt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadMyOrders(filter);
}

function viewOrderDetails(orderId){
    const o = gO().find(x => x.id === orderId);
    if(!o) return;
    
    const dt = new Date(o.date);
    const dateStr = dt.toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'});
    const timeStr = dt.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
    
    const pm = {'razorpay':'Online Payment (Razorpay)', 'upi':'UPI Payment', 'cod':'Cash on Delivery'};
    
    const steps = [
        {s:'Order Placed', i:'fa-clipboard-check'},
        {s:'Confirmed', i:'fa-check-circle'},
        {s:'Processing', i:'fa-cogs'},
        {s:'Shipped', i:'fa-shipping-fast'},
        {s:'Delivered', i:'fa-box-open'}
    ];
    const si = {pending:0, confirmed:1, processing:2, shipped:3, delivered:4};
    const ci = si[o.status] || 0;
    
    let tracking = steps.map((st, idx) => {
        let cls = '';
        if(idx < ci) cls = 'done';
        else if(idx === ci) cls = 'now';
        const te = o.tracking && o.tracking[idx];
        const tdt = te ? new Date(te.date).toLocaleDateString() : '';
        const desc = te ? te.description : 'Pending';
        return `<div class="tk-step ${cls}"><div class="tk-ic"><i class="fas ${st.i}"></i></div><div class="tk-info"><h4>${st.s}</h4><p>${desc}${tdt?' • '+tdt:''}</p></div></div>`;
    }).join('');
    
    document.getElementById('orderDetailContent').innerHTML = `<div class="od-content">
        <div class="od-header">
            <h2>Order Details</h2>
            <div class="od-id">${o.id}</div>
        </div>
        
        <div class="od-grid">
            <div class="od-info-card">
                <h5><i class="fas fa-calendar"></i> Order Date</h5>
                <p><span class="label">Date:</span> ${dateStr}</p>
                <p><span class="label">Time:</span> ${timeStr}</p>
                <p><span class="label">Status:</span> <span class="moc-status-badge moc-status-${o.status}">${o.status}</span></p>
            </div>
            <div class="od-info-card">
                <h5><i class="fas fa-credit-card"></i> Payment</h5>
                <p><span class="label">Method:</span> ${pm[o.paymentMethod] || o.paymentMethod}</p>
                <p><span class="label">Status:</span> ${o.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}</p>
                ${o.paymentId ? `<p style="word-break:break-all"><span class="label">Ref ID:</span> ${o.paymentId}</p>` : ''}
            </div>
            <div class="od-info-card">
                <h5><i class="fas fa-user"></i> Customer</h5>
                <p>${o.customer.name}</p>
                <p>${o.customer.phone}</p>
                <p>${o.customer.email}</p>
            </div>
            <div class="od-info-card">
                <h5><i class="fas fa-map-marker-alt"></i> Delivery</h5>
                <p>${o.customer.address}</p>
                <p>${o.customer.city} - ${o.customer.pincode}</p>
            </div>
        </div>
        
        <h4 style="margin-bottom:15px;font-size:16px"><i class="fas fa-shopping-bag" style="color:var(--red)"></i> Order Items</h4>
        <table class="od-items-table">
            <thead><tr><th></th><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
            <tbody>
                ${o.items.map(item => {
                    const cat = item.category || 'general';
                    const ic = CATS[cat]?.icon || 'fa-gift';
                    return `<tr>
                        <td><div class="od-item-img"><i class="fas ${ic}"></i></div></td>
                        <td><strong>${item.name}</strong></td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price}</td>
                        <td><strong>₹${item.subtotal.toLocaleString()}</strong></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        
        <div class="od-totals">
            <div class="od-total-row"><span>Subtotal:</span><span>₹${(o.total - o.shipping).toLocaleString()}</span></div>
            <div class="od-total-row"><span>Shipping:</span><span>${o.shipping === 0 ? 'FREE' : '₹' + o.shipping}</span></div>
            <div class="od-total-row grand"><span>Total Amount:</span><span>₹${o.total.toLocaleString()}</span></div>
        </div>
        
        ${o.notes ? `<div class="od-info-card" style="margin-bottom:20px">
            <h5><i class="fas fa-sticky-note"></i> Customization Notes</h5>
            <p>${o.notes}</p>
        </div>` : ''}
        
        <div class="od-tracking">
            <h5><i class="fas fa-route" style="color:var(--red)"></i> Order Tracking</h5>
            <div class="tk-timeline">${tracking}</div>
        </div>
        
        <div class="od-actions">
            <button onclick="resendWA('${o.id}')" class="btn-primary" style="background:#25D366"><i class="fab fa-whatsapp"></i> Need Help?</button>
            <button onclick="reorderItems('${o.id}')" class="btn-primary"><i class="fas fa-redo"></i> Reorder</button>
            <button onclick="closeOv('orderDetailOverlay')" class="btn-outline-dk">Close</button>
        </div>
    </div>`;
    
    openOv('orderDetailOverlay');
}

function reorderItems(orderId){
    const o = gO().find(x => x.id === orderId);
    if(!o) return;
    
    if(confirm(`Add all items from order ${orderId} to your cart?`)){
        let cart = gK();
        let added = 0;
        
        o.items.forEach(item => {
            const exists = cart.find(c => c.pid === item.productId);
            if(exists){
                exists.qty += item.quantity;
            } else {
                cart.push({pid: item.productId, qty: item.quantity});
            }
            added++;
        });
        
        sK(cart);
        updateBadge();
        renderCart();
        closeOv('myAccountOverlay');
        closeOv('orderDetailOverlay');
        toast(`${added} item(s) added to cart!`);
        setTimeout(() => toggleCart(), 500);
    }
}

// ============================================
// MY ACCOUNT - PROFILE TAB
// ============================================
function loadProfile(){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user) return;
    
    const initial = user.name.charAt(0).toUpperCase();
    document.getElementById('profileAvatar').textContent = initial;
    document.getElementById('profName').value = user.name || '';
    document.getElementById('profPhone').value = user.phone || '';
    document.getElementById('profEmail').value = user.email || '';
    document.getElementById('profDOB').value = user.dob || '';
    document.getElementById('profGender').value = user.gender || '';
    
    const joined = new Date(user.joinedDate).toLocaleDateString('en-IN', {month:'long', year:'numeric'});
    document.getElementById('memberSince').textContent = joined;
    
    setTimeout(() => {
        attachValidation('profName', 'name');
        attachValidation('profPhone', 'phone');
    }, 100);
}

async function updateProfile(e){
    e.preventDefault();
    clearAllErrors();
    
    const nameVal = VALIDATORS.name(document.getElementById('profName').value);
    const phoneVal = VALIDATORS.phone(document.getElementById('profPhone').value);
    
    if(!nameVal.ok){
        showFieldError('profName', nameVal.msg);
        return;
    }
    if(!phoneVal.ok){
        showFieldError('profPhone', phoneVal.msg);
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('bst_u'));
    user.name = nameVal.value;
    user.phone = phoneVal.value;
    user.dob = document.getElementById('profDOB').value;
    user.gender = document.getElementById('profGender').value;
    
    const cs = gC();
    const idx = cs.findIndex(c => c.email === user.email);
    if(idx !== -1){
        cs[idx] = {...cs[idx], ...user};
        sC(cs);
    }
    
    localStorage.setItem('bst_u', JSON.stringify(user));
    
    // 🔥 Save to Firebase
    try {
        await fbSaveCustomer(user);
    } catch(err){
        console.error('Firebase save error:', err);
    }
    
    setLoginUI(user);
    document.getElementById('maUserName').textContent = `Welcome, ${user.name}!`;
    
    toast('Profile updated successfully!');
}

// ============================================
// MY ACCOUNT - ADDRESSES TAB
// ============================================
function loadAddresses(){
    const addresses = getUserAddresses();
    const list = document.getElementById('addressesList');
    
    if(addresses.length === 0){
        list.innerHTML = `<div class="empty-state-box">
            <i class="fas fa-map-marker-alt"></i>
            <h4>No addresses saved</h4>
            <p>Add your delivery address for faster checkout</p>
            <button onclick="showAddressForm()" class="btn-primary"><i class="fas fa-plus"></i> Add Address</button>
        </div>`;
        return;
    }
    
    list.innerHTML = addresses.map((a, idx) => `<div class="address-card ${a.isDefault ? 'default' : ''}">
        ${a.isDefault ? '<span class="addr-default-badge"><i class="fas fa-check"></i> Default</span>' : ''}
        <span class="addr-label">${a.label}</span>
        <h5>${a.name}</h5>
        <p>${a.line}</p>
        <p>${a.city} - ${a.pincode}</p>
        <p class="addr-phone"><i class="fas fa-phone"></i> ${a.phone}</p>
        <div class="addr-actions">
            <button class="addr-edit" onclick="editAddress(${idx})"><i class="fas fa-edit"></i> Edit</button>
            <button class="addr-delete" onclick="deleteAddress(${idx})"><i class="fas fa-trash"></i> Delete</button>
            ${!a.isDefault ? `<button class="addr-default-btn" onclick="setDefaultAddress(${idx})"><i class="fas fa-star"></i> Set Default</button>` : ''}
        </div>
    </div>`).join('');
}

function showAddressForm(){
    document.getElementById('addressFormBox').style.display = 'block';
    document.getElementById('addressFormTitle').textContent = 'Add New Address';
    document.getElementById('addressForm').reset();
    document.getElementById('addressId').value = '';
    
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(user){
        document.getElementById('addrName').value = user.name || '';
        document.getElementById('addrPhone').value = user.phone || '';
    }
    
    setTimeout(() => {
        attachValidation('addrName', 'name');
        attachValidation('addrPhone', 'phone');
        attachValidation('addrLine', 'address');
        attachValidation('addrCity', 'city');
        attachValidation('addrPin', 'pincode');
    }, 100);
}

function hideAddressForm(){
    document.getElementById('addressFormBox').style.display = 'none';
}

function editAddress(idx){
    const addresses = getUserAddresses();
    const a = addresses[idx];
    if(!a) return;
    
    document.getElementById('addressFormBox').style.display = 'block';
    document.getElementById('addressFormTitle').textContent = 'Edit Address';
    document.getElementById('addressId').value = idx;
    document.getElementById('addrLabel').value = a.label;
    document.getElementById('addrName').value = a.name;
    document.getElementById('addrPhone').value = a.phone;
    document.getElementById('addrLine').value = a.line;
    document.getElementById('addrCity').value = a.city;
    document.getElementById('addrPin').value = a.pincode;
    document.getElementById('addrDefault').checked = a.isDefault;
    
    setTimeout(() => {
        attachValidation('addrName', 'name');
        attachValidation('addrPhone', 'phone');
        attachValidation('addrLine', 'address');
        attachValidation('addrCity', 'city');
        attachValidation('addrPin', 'pincode');
    }, 100);
}

async function saveAddress(e){
    e.preventDefault();
    clearAllErrors();
    
    const validation = validateForm([
        {id:'addrName', validator:'name'},
        {id:'addrPhone', validator:'phone'},
        {id:'addrLine', validator:'address'},
        {id:'addrCity', validator:'city'},
        {id:'addrPin', validator:'pincode'}
    ]);
    
    if(!validation.valid) return;
    
    const idx = document.getElementById('addressId').value;
    const isDefault = document.getElementById('addrDefault').checked;
    
    let addresses = getUserAddresses();
    
    if(isDefault){
        addresses.forEach(a => a.isDefault = false);
    }
    
    const newAddr = {
        label: document.getElementById('addrLabel').value,
        name: validation.values.addrName,
        phone: validation.values.addrPhone,
        line: validation.values.addrLine,
        city: validation.values.addrCity,
        pincode: validation.values.addrPin,
        isDefault: isDefault
    };
    
    if(idx !== ''){
        addresses[+idx] = newAddr;
        toast('Address updated!');
    } else {
        if(addresses.length === 0) newAddr.isDefault = true;
        addresses.push(newAddr);
        toast('Address added!');
    }
    
    saveUserAddresses(addresses);
    
    // 🔥 Save to Firebase
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(user){
        try {
            await fbSaveAddresses(user.email, addresses);
        } catch(err){
            console.error('Firebase save error:', err);
        }
    }
    
    hideAddressForm();
    loadAddresses();
}

async function deleteAddress(idx){
    if(!confirm('Delete this address?')) return;
    let addresses = getUserAddresses();
    addresses.splice(idx, 1);
    saveUserAddresses(addresses);
    
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(user){
        try {
            await fbSaveAddresses(user.email, addresses);
        } catch(err){
            console.error('Firebase save error:', err);
        }
    }
    
    loadAddresses();
    toast('Address deleted!');
}

async function setDefaultAddress(idx){
    let addresses = getUserAddresses();
    addresses.forEach((a, i) => a.isDefault = (i === idx));
    saveUserAddresses(addresses);
    
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(user){
        try {
            await fbSaveAddresses(user.email, addresses);
        } catch(err){
            console.error('Firebase save error:', err);
        }
    }
    
    loadAddresses();
    toast('Default address updated!');
}

// ============================================
// MY ACCOUNT - WISHLIST TAB
// ============================================
async function toggleWishlist(pid){
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user){
        toast('Please login to add to wishlist!', 'e');
        showAuth('customer');
        return;
    }
    
    let wishlist = getUserWishlist();
    const idx = wishlist.indexOf(pid);
    
    if(idx > -1){
        wishlist.splice(idx, 1);
        toast('Removed from wishlist');
    } else {
        wishlist.push(pid);
        toast('Added to wishlist! ❤️');
    }
    
    saveUserWishlist(wishlist);
    
    // 🔥 Save to Firebase
    try {
        await fbSaveWishlist(user.email, wishlist);
    } catch(err){
        console.error('Firebase wishlist save error:', err);
    }
    
    loadWishlist();
    
    const badge = document.getElementById('wishlistCountBadge');
    if(badge) badge.textContent = wishlist.length;
}

function loadWishlist(){
    const wishlist = getUserWishlist();
    const products = gP();
    const grid = document.getElementById('wishlistGrid');
    
    if(wishlist.length === 0){
        grid.innerHTML = `<div class="empty-state-box">
            <i class="fas fa-heart"></i>
            <h4>Your wishlist is empty</h4>
            <p>Add products you love to your wishlist</p>
            <a href="#products" class="btn-primary" onclick="closeOv('myAccountOverlay')"><i class="fas fa-shopping-cart"></i> Browse Products</a>
        </div>`;
        return;
    }
    
    grid.innerHTML = wishlist.map(pid => {
        const p = products.find(x => x.id === pid);
        if(!p) return '';
        const ic = CATS[p.category]?.icon || 'fa-gift';
        return `<div class="wishlist-item">
            <button class="wishlist-remove" onclick="toggleWishlist(${p.id})"><i class="fas fa-times"></i></button>
            <div class="wishlist-img">
                ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='<i class=\\'fas ${ic}\\'></i>'">` : `<i class="fas ${ic}"></i>`}
            </div>
            <div class="wishlist-info">
                <h5>${p.name}</h5>
                <div class="price">₹${p.price}</div>
                <button class="wishlist-add-cart" onclick="addCart(${p.id})"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
            </div>
        </div>`;
    }).join('');
}

// ============================================
// MY ACCOUNT - CHANGE PASSWORD TAB
// ============================================
function loadPasswordTab(){
    document.getElementById('passwordForm')?.reset();
    clearAllErrors();
}

async function changeCustomerPassword(e){
    e.preventDefault();
    
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    const user = JSON.parse(localStorage.getItem('bst_u'));
    if(!user) return;
    
    if(current !== user.password){
        toast('Current password is incorrect!', 'e');
        return;
    }
    
    if(newPass.length < 6){
        toast('New password must be at least 6 characters!', 'e');
        return;
    }
    
    if(newPass !== confirm){
        toast('Passwords do not match!', 'e');
        return;
    }
    
    if(current === newPass){
        toast('New password must be different from current!', 'e');
        return;
    }
    
    user.password = newPass;
    localStorage.setItem('bst_u', JSON.stringify(user));
    
    const cs = gC();
    const idx = cs.findIndex(c => c.email === user.email);
    if(idx !== -1){
        cs[idx].password = newPass;
        sC(cs);
    }
    
    // 🔥 Save to Firebase
    try {
        await fbSaveCustomer(user);
    } catch(err){
        console.error('Firebase save error:', err);
    }
    
    document.getElementById('passwordForm').reset();
    toast('Password updated successfully! 🔐');
}

// ============================================
// ADMIN PANEL
// ============================================
function admLogin(){
    const u = document.getElementById('aUser').value.trim();
    const p = document.getElementById('aPass').value;
    const c = document.getElementById('aCode').value.trim();
    
    if(u === ADMIN_CREDENTIALS.username && 
       p === ADMIN_CREDENTIALS.password && 
       c === ADMIN_CREDENTIALS.securityCode){
        closeOv('authOverlay');
        refreshAdm();
        openOv('adminOverlay');
        toast('Welcome, Admin!');
    } else {
        toast('Invalid credentials!', 'e');
    }
}

function admTab(t, btn){
    document.querySelectorAll('.adm-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.adm-nav').forEach(b => b.classList.remove('active'));
    document.getElementById('pane-' + t)?.classList.add('active');
    btn.classList.add('active');
    
    if(t === 'overview') refreshOvw();
    if(t === 'a-products') refreshAP();
    if(t === 'a-orders') refreshAO();
    if(t === 'a-customers') refreshAC();
    if(t === 'a-analytics') refreshAna();
}

function refreshAdm(){
    refreshOvw();
    refreshAP();
    refreshAO();
    refreshAC();
    refreshAna();
}

function refreshOvw(){
    const o = gO(), p = gP(), c = gC();
    document.getElementById('dsRev').textContent = '₹' + o.reduce((s, x) => s + (x.total || 0), 0).toLocaleString();
    document.getElementById('dsOrd').textContent = o.length;
    document.getElementById('dsProd').textContent = p.length;
    document.getElementById('dsCust').textContent = c.length;
    
    const rc = o.slice(-5).reverse();
    document.getElementById('recentOrdTb').innerHTML = rc.map(x => {
        const pm = {'razorpay':'Online', 'upi':'UPI', 'cod':'COD'};
        return `<tr><td><strong>${x.id}</strong></td><td>${x.customer.name}</td><td style="font-weight:700;color:#de2128">₹${x.total.toLocaleString()}</td><td><span class="pi-method">${pm[x.paymentMethod] || x.paymentMethod}</span></td><td><span class="st-badge st-${x.status}">${x.status}</span></td><td>${new Date(x.date).toLocaleDateString()}</td></tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;color:#999">No orders</td></tr>';
}

function refreshAP(){
    const ps = gP();
    document.getElementById('admProdTb').innerHTML = ps.map(p => {
        const ic = CATS[p.category]?.icon || 'fa-gift';
        const im = p.image ? `<img src="${p.image}" alt="" onerror="this.outerHTML='<i class=\\'fas ${ic}\\'></i>'">` : `<i class="fas ${ic}"></i>`;
        return `<tr><td><div class="p-thumb">${im}</div></td><td><strong>${p.name}</strong></td><td>${CATS[p.category]?.name || p.category}</td><td style="font-weight:700;color:#de2128">₹${p.price}</td><td>${p.stock}</td><td><div class="tbl-acts"><button class="be" onclick="editProd(${p.id})"><i class="fas fa-edit"></i> Edit</button><button class="bd" onclick="delProd(${p.id})"><i class="fas fa-trash"></i></button></div></td></tr>`;
    }).join('');
}

function showProdForm(){
    document.getElementById('prodFormBox').style.display = 'block';
    document.getElementById('pfTitle').textContent = 'Add New Product';
    document.getElementById('pfId').value = '';
    document.getElementById('prodForm').reset();
    document.getElementById('pfStock').value = '10';
    document.getElementById('pfRate').value = '4.5';
}

function hideProdForm(){
    document.getElementById('prodFormBox').style.display = 'none';
}

function editProd(id){
    const p = gP().find(x => x.id === id);
    if(!p) return;
    document.getElementById('prodFormBox').style.display = 'block';
    document.getElementById('pfTitle').textContent = 'Edit Product';
    document.getElementById('pfId').value = id;
    document.getElementById('pfName').value = p.name;
    document.getElementById('pfCat').value = p.category;
    document.getElementById('pfPrice').value = p.price;
    document.getElementById('pfOrig').value = p.originalPrice || '';
    document.getElementById('pfDesc').value = p.description;
    document.getElementById('pfImg').value = p.image || '';
    document.getElementById('pfStock').value = p.stock;
    document.getElementById('pfRate').value = p.rating;
    document.getElementById('pfFeat').checked = p.featured;
    document.getElementById('pfBest').checked = p.bestseller;
    document.getElementById('pfNew').checked = p.newArrival;
}

async function saveProd(e){
    e.preventDefault();
    const ps = gP();
    const eid = document.getElementById('pfId').value;
    const d = {
        name: document.getElementById('pfName').value,
        category: document.getElementById('pfCat').value,
        price: +document.getElementById('pfPrice').value,
        originalPrice: +document.getElementById('pfOrig').value || null,
        description: document.getElementById('pfDesc').value,
        image: document.getElementById('pfImg').value || '',
        stock: +document.getElementById('pfStock').value,
        rating: +document.getElementById('pfRate').value,
        featured: document.getElementById('pfFeat').checked,
        bestseller: document.getElementById('pfBest').checked,
        newArrival: document.getElementById('pfNew').checked
    };
    
    if(eid){
        const i = ps.findIndex(p => p.id === +eid);
        if(i !== -1) ps[i] = {...ps[i], ...d};
        d.id = +eid;
        toast('Updated!');
    } else {
        d.id = ps.reduce((m, p) => Math.max(m, p.id), 0) + 1;
        ps.push(d);
        toast('Added!');
    }
    sP(ps);
    
    // 🔥 Save to Firebase
    try {
        await fbSaveProduct(d);
    } catch(err){
        console.error('Firebase save error:', err);
    }
    
    hideProdForm();
    refreshAP();
    renderProds();
}

async function delProd(id){
    if(!confirm('Delete?')) return;
    sP(gP().filter(p => p.id !== id));
    
    // 🔥 Delete from Firebase
    try {
        await fbDeleteProduct(id);
    } catch(err){
        console.error('Firebase delete error:', err);
    }
    
    refreshAP();
    renderProds();
    toast('Deleted');
}

function refreshAO(f='all'){
    let os = gO();
    if(f !== 'all') os = os.filter(o => o.status === f);
    const pm = {'razorpay':'Razorpay', 'upi':'UPI', 'cod':'COD'};
    
    document.getElementById('admOrdTb').innerHTML = os.map(o => `<tr>
        <td><strong>${o.id}</strong></td>
        <td><strong>${o.customer.name}</strong><br><small style="color:#999">${o.customer.phone}</small></td>
        <td>${o.items.map(i => `${i.name} ×${i.quantity}`).join('<br>')}</td>
        <td style="font-weight:700;color:#de2128">₹${o.total.toLocaleString()}</td>
        <td class="pay-info-cell"><span class="pi-method">${pm[o.paymentMethod] || o.paymentMethod}</span>${o.paymentId ? `<br><span class="pi-id">${o.paymentId}</span>` : ''}</td>
        <td><span class="st-badge st-${o.status}">${o.status}</span></td>
        <td>${new Date(o.date).toLocaleDateString()}</td>
        <td>
            <select onchange="updOrdSt('${o.id}',this.value)" style="padding:5px;border-radius:6px;border:1px solid #ddd;font-size:11px;font-family:'Poppins',sans-serif;width:100%;margin-bottom:5px">
                ${['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
            </select>
            <button onclick="resendWA('${o.id}')" style="padding:4px 8px;background:#25D366;color:white;border:none;border-radius:5px;font-size:10px;cursor:pointer;width:100%;font-family:'Poppins',sans-serif"><i class="fab fa-whatsapp"></i> WA</button>
        </td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:#999">No orders</td></tr>';
}

function admOrdFilt(s, btn){
    document.querySelectorAll('#ordFiltBar .fbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refreshAO(s);
}

async function updOrdSt(oid, ns){
    const os = gO();
    const o = os.find(x => x.id === oid);
    if(o){
        o.status = ns;
        const descs = {
            pending: 'Order received',
            confirmed: 'Confirmed',
            processing: 'Being prepared',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Cancelled'
        };
        const sl = ['pending','confirmed','processing','shipped','delivered'];
        const si = sl.indexOf(ns);
        if(!o.tracking) o.tracking = [];
        if(si >= 0){
            for(let i = 0; i <= si; i++){
                if(!o.tracking[i]){
                    o.tracking[i] = {
                        status: sl[i],
                        date: new Date().toISOString(),
                        description: descs[sl[i]]
                    };
                }
            }
        }
        sO(os);
        
        // 🔥 Update in Firebase
        try {
            await fbUpdateOrder(oid, {status: ns, tracking: o.tracking});
        } catch(err){
            console.error('Firebase update error:', err);
        }
        
        refreshOvw();
        toast(`${oid} → ${ns}`);
    }
}

function refreshAC(){
    const cs = gC();
    document.getElementById('admCustTb').innerHTML = cs.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.phone}</td><td style="font-weight:700">${(c.orders||[]).length}</td><td style="font-weight:700;color:#de2128">₹${(c.totalSpent||0).toLocaleString()}</td><td>${c.joinedDate ? new Date(c.joinedDate).toLocaleDateString() : 'N/A'}</td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:#999">No customers</td></tr>';
}

function refreshAna(){
    const os = gO(), ps = gP();
    const cs = {};
    os.forEach(o => o.items.forEach(item => {
        const p = ps.find(x => x.id === item.productId);
        if(p){
            const cn = CATS[p.category]?.name || p.category;
            cs[cn] = (cs[cn] || 0) + item.quantity;
        }
    }));
    
    const mx = Math.max(...Object.values(cs), 1);
    document.getElementById('anaCatBars').innerHTML = Object.entries(cs).map(([c, n]) => `<div class="br-row"><span class="br-lbl">${c}</span><div class="br-trk"><div class="br-fill" style="width:${n/mx*100}%"></div></div><span class="br-val">${n}</span></div>`).join('') || '<p style="color:#999;text-align:center">No data</p>';
    
    const sc = {};
    const colors = {
        pending: '#FF9800',
        confirmed: '#2196F3',
        processing: '#9C27B0',
        shipped: '#00BCD4',
        delivered: '#4CAF50',
        cancelled: '#F44336'
    };
    os.forEach(o => sc[o.status] = (sc[o.status] || 0) + 1);
    document.getElementById('anaStatus').innerHTML = Object.entries(sc).map(([s, n]) => `<div class="st-row"><div class="st-dot" style="background:${colors[s]||'#999'}"></div><span class="st-nm">${s.charAt(0).toUpperCase()+s.slice(1)}</span><span class="st-ct">${n}</span></div>`).join('') || '<p style="color:#999;text-align:center">No data</p>';
}

// ============================================
// MODAL HELPERS
// ============================================
function openOv(id){
    document.getElementById(id).classList.add('on');
    document.body.style.overflow = 'hidden';
}

function closeOv(id){
    const el = document.getElementById(id);
    if(el){
        el.classList.remove('on');
        document.body.style.overflow = '';
        clearAllErrors();
    }
}

document.querySelectorAll('.overlay').forEach(ov => ov.addEventListener('click', function(e){
    if(e.target === this){
        this.classList.remove('on');
        document.body.style.overflow = '';
        clearAllErrors();
    }
}));

// ============================================
// TOAST NOTIFICATION
// ============================================
function toast(msg, type){
    const t = document.getElementById('toastEl');
    t.querySelector('.toast-ic').className = 'toast-ic fas ' + (type === 'e' ? 'fa-exclamation-circle err' : 'fa-check-circle');
    t.querySelector('.toast-tx').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ============================================
// CONTACT FORM
// ============================================
function sendContact(e){
    e.preventDefault();
    const form = e.target;
    const inputs = form.querySelectorAll('input, textarea');
    
    const name = inputs[0].value.trim();
    const phone = inputs[1].value.trim();
    const email = inputs[2].value.trim();
    const subject = inputs[3].value.trim();
    const message = inputs[4].value.trim();
    
    const nameRes = VALIDATORS.name(name);
    if(!nameRes.ok){
        toast(nameRes.msg, 'e');
        inputs[0].focus();
        return;
    }
    
    const phoneRes = VALIDATORS.phone(phone);
    if(!phoneRes.ok){
        toast(phoneRes.msg, 'e');
        inputs[1].focus();
        return;
    }
    
    const emailRes = VALIDATORS.email(email);
    if(!emailRes.ok){
        toast(emailRes.msg, 'e');
        inputs[2].focus();
        return;
    }
    
    if(!subject || subject.length < 3){
        toast('Please enter a subject (min 3 chars)', 'e');
        inputs[3].focus();
        return;
    }
    
    if(!message || message.length < 10){
        toast('Message too short (min 10 chars)', 'e');
        inputs[4].focus();
        return;
    }
    
    const waMsg = `*Contact Form - Bestow*%0A%0AName: ${name}%0APhone: ${phone}%0AEmail: ${email}%0ASubject: ${subject}%0A%0AMessage:%0A${message}`;
    window.open(`https://wa.me/${PAYMENT_CONFIG.business.whatsapp}?text=${waMsg}`, '_blank');
    
    toast('Message sent! We\'ll get back to you soon.');
    form.reset();
}
