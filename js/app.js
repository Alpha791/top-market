// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyCfSi2_xpsl1GkVN-7HhMx3VJdCyQz6fBE",
    authDomain: "best-market-d2ef0.firebaseapp.com",
    projectId: "best-market-d2ef0",
    storageBucket: "best-market-d2ef0.firebasestorage.app",
    messagingSenderId: "350312625623",
    appId: "1:350312625623:web:a8423cca0f867d43c90792"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
console.log("✅ Firebase ready");

// ==================== GLOBALS ====================
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('thehive_cart')) || [];

// ==================== TOAST ====================
function showToast(msg, type='success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ==================== CART FUNCTIONS ====================
function updateCartUI() {
    document.getElementById('cartCount').textContent = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    localStorage.setItem('thehive_cart', JSON.stringify(cart));
}
function addToCart(item) {
    const existing = cart.find(i => i.id === item.id);
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else cart.push({ ...item, qty: 1 });
    updateCartUI();
    showToast('Added to cart!', 'success');
}
function renderCartModal() {
    const container = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    if (!cart.length) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        totalSpan.textContent = '';
        return;
    }
    let html = '';
    let total = 0;
    cart.forEach((item, idx) => {
        const subtotal = item.price * (item.qty || 1);
        total += subtotal;
        html += `<div class="cart-item">
            <span>${item.title} x ${item.qty}</span>
            <span>KES ${subtotal.toFixed(2)}</span>
            <button onclick="removeFromCart(${idx})" style="background:none;border:none;color:red;cursor:pointer;">✕</button>
        </div>`;
    });
    container.innerHTML = html;
    totalSpan.textContent = `Total: KES ${total.toFixed(2)}`;
}
window.removeFromCart = function(idx) {
    cart.splice(idx, 1);
    updateCartUI();
    renderCartModal();
    showToast('Item removed', 'info');
};
// Cart modal open/close
document.getElementById('cartIcon').onclick = () => {
    renderCartModal();
    document.getElementById('cartModal').style.display = 'flex';
};
document.getElementById('cartModalClose').onclick = () => document.getElementById('cartModal').style.display = 'none';

// ==================== AUTH UI ====================
function updateAuthUI(user) {
    currentUser = user;
    const loginBtn = document.getElementById('showLoginBtn');
    const signupBtn = document.getElementById('showSignupBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    if (user) {
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName || user.email.split('@')[0];
    } else {
        loginBtn.style.display = 'inline-block';
        signupBtn.style.display = 'inline-block';
        userInfo.style.display = 'none';
    }
}
function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }
document.querySelectorAll('.close').forEach(el => el.onclick = closeModals);
window.onclick = (e) => { if (e.target.classList.contains('modal')) closeModals(); };

// ==================== AUTH HANDLERS ====================
document.getElementById('showLoginBtn').onclick = () => showModal('loginModal');
document.getElementById('showSignupBtn').onclick = () => showModal('signupModal');
document.getElementById('doLoginBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value;
    const pwd = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, pwd);
        closeModals();
        showToast('Logged in!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
};
document.getElementById('doSignupBtn').onclick = async () => {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const pwd = document.getElementById('signupPassword').value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pwd);
        await cred.user.updateProfile({ displayName: name });
        closeModals();
        showToast('Account created!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
};
document.getElementById('logoutBtn').onclick = () => auth.signOut();

// ==================== CLOUDINARY ====================
const CLOUD_NAME = "dpsj8cuoq";
const UPLOAD_PRESET = "marketplace";
async function uploadImages(files) {
    if (!files.length) return [];
    const urls = [];
    for (let i=0; i<Math.min(files.length,3); i++) {
        const fd = new FormData();
        fd.append('file', files[i]);
        fd.append('upload_preset', UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        urls.push(data.secure_url);
    }
    return urls;
}
// File input preview
document.getElementById('itemImages').onchange = function(e) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    Array.from(this.files).slice(0,3).forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
};
// Post item
document.getElementById('postItemBtn').onclick = async function() {
    const title = document.getElementById('itemTitle').value.trim();
    const desc = document.getElementById('itemDesc').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const sellerName = document.getElementById('sellerName').value.trim();
    const sellerEmail = document.getElementById('sellerEmail').value.trim();
    const sellerPhone = document.getElementById('sellerPhone').value.trim();
    const files = document.getElementById('itemImages').files;
    if (!title || !desc || isNaN(price) || !sellerName || !sellerEmail) {
        showToast('Please fill all required fields', 'warning');
        return;
    }
    this.disabled = true;
    this.textContent = 'Uploading...';
    try {
        const images = await uploadImages(files);
        await db.collection('listings').add({
            title, description: desc, price,
            seller: { name: sellerName, email: sellerEmail, phone: sellerPhone || '' },
            userId: currentUser ? currentUser.uid : 'guest_' + Date.now(),
            images,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Item posted!', 'success');
        // Clear form
        document.getElementById('itemTitle').value = '';
        document.getElementById('itemDesc').value = '';
        document.getElementById('itemPrice').value = '';
        document.getElementById('sellerName').value = '';
        document.getElementById('sellerEmail').value = '';
        document.getElementById('sellerPhone').value = '';
        document.getElementById('itemImages').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        loadListings();
    } catch(err) { showToast(err.message, 'error'); }
    this.disabled = false;
    this.textContent = 'Post Item';
};

// ==================== LISTINGS ====================
function escapeHtml(s) { if (!s) return ''; return s.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]); }
function loadListings() {
    db.collection('listings').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) { document.getElementById('listingsGrid').innerHTML = '<p>No items yet.</p>'; return; }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const imagesHtml = data.images && data.images.length ? 
                `<div class="card-images">${data.images.map(img => `<img src="${img}" alt="">`).join('')}</div>` :
                `<div class="card-images"><i class="fas fa-image"></i></div>`;
            const sellerPhone = data.seller?.phone || '';
            html += `
            <div class="card" data-id="${id}">
                ${imagesHtml}
                <div class="card-content">
                    <div class="card-title">${escapeHtml(data.title)}</div>
                    <div class="card-price">KES ${data.price}</div>
                    <div class="card-desc">${escapeHtml(data.description.substring(0,80))}</div>
                    <div class="seller-info">
                        <i class="fas fa-user"></i> ${escapeHtml(data.seller?.name)}<br>
                        <i class="fas fa-envelope"></i> ${escapeHtml(data.seller?.email)}<br>
                        ${sellerPhone ? `<i class="fas fa-phone"></i> ${escapeHtml(sellerPhone)}` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="btn-add-cart" data-id="${id}" data-title="${escapeHtml(data.title)}" data-price="${data.price}" data-seller="${escapeHtml(data.seller?.name)}" data-phone="${escapeHtml(sellerPhone)}"><i class="fas fa-cart-plus"></i> Add</button>
                        <button class="btn-buy" data-id="${id}" data-title="${escapeHtml(data.title)}" data-price="${data.price}" data-seller="${escapeHtml(data.seller?.name)}" data-phone="${escapeHtml(sellerPhone)}"><i class="fas fa-bolt"></i> Buy</button>
                        ${sellerPhone ? `<button class="btn-whatsapp" data-phone="${escapeHtml(sellerPhone)}" data-title="${escapeHtml(data.title)}" data-price="${data.price}" data-seller="${escapeHtml(data.seller?.name)}"><i class="fab fa-whatsapp"></i> Chat</button>` : ''}
                    </div>
                </div>
            </div>`;
        });
        document.getElementById('listingsGrid').innerHTML = html;
        // Attach events
        document.querySelectorAll('.btn-add-cart').forEach(b => b.onclick = function() {
            addToCart({ id: this.dataset.id, title: this.dataset.title, price: parseFloat(this.dataset.price) });
        });
        document.querySelectorAll('.btn-buy').forEach(b => b.onclick = function() {
            openOrderModal(this.dataset.id, this.dataset.title, this.dataset.price, this.dataset.seller, this.dataset.phone);
        });
        document.querySelectorAll('.btn-whatsapp').forEach(b => b.onclick = function() {
            const phone = this.dataset.phone;
            if (!phone) { showToast('No phone number', 'warning'); return; }
            const msg = `Hello ${this.dataset.seller}, I'm interested in "${this.dataset.title}" for KES ${this.dataset.price}.`;
            window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
        });
    });
}

// ==================== ORDER MODAL ====================
let currentOrder = {};
function openOrderModal(id, title, price, seller, phone) {
    if (!currentUser) { showToast('Please login to order', 'warning'); showModal('loginModal'); return; }
    document.getElementById('orderBuyerName').value = currentUser.displayName || '';
    document.getElementById('orderBuyerPhone').value = '';
    document.getElementById('orderAddress').value = '';
    currentOrder = { id, title, price, seller, phone };
    document.getElementById('orderSummary').innerHTML = `
        <strong>Item:</strong> ${title}<br>
        <strong>Price:</strong> KES ${price}<br>
        <strong>Seller:</strong> ${seller}
    `;
    document.getElementById('orderModal').style.display = 'flex';
}
document.getElementById('orderModalClose').onclick = () => document.getElementById('orderModal').style.display = 'none';
document.getElementById('placeOrderBtn').onclick = function() {
    const name = document.getElementById('orderBuyerName').value.trim();
    const phone = document.getElementById('orderBuyerPhone').value.trim();
    const address = document.getElementById('orderAddress').value.trim();
    if (!name || !phone || !address) { showToast('Fill all fields', 'warning'); return; }
    const msg = `🛒 *New Order from The Hive*%0A%0A📦 Item: ${currentOrder.title}%0A💰 Price: KES ${currentOrder.price}%0A👤 Buyer: ${name}%0A📞 Phone: ${phone}%0A📍 Address: ${address}%0A%0APlease confirm.`;
    const sellerPhone = currentOrder.phone;
    if (!sellerPhone) { showToast('Seller phone missing', 'error'); return; }
    window.open(`https://wa.me/${sellerPhone.replace(/\D/g,'')}?text=${msg}`, '_blank');
    // Save order to Firestore (optional)
    db.collection('orders').add({
        itemId: currentOrder.id,
        itemTitle: currentOrder.title,
        buyerName: name,
        buyerPhone: phone,
        address: address,
        sellerName: currentOrder.seller,
        sellerPhone: sellerPhone,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(()=>{});
    document.getElementById('orderModal').style.display = 'none';
    showToast('Order sent!', 'success');
};

// ==================== LIVE VIDEO (VDO.NINJA) ====================
const frame = document.getElementById('liveFrameContainer');
const startBtn = document.getElementById('startLiveBtn');
const joinBtn = document.getElementById('joinLiveBtn');
const endBtn = document.getElementById('endLiveBtn');
const fullBtn = document.getElementById('fullscreenBtn');
const liveStatus = document.getElementById('liveStatus');
const liveInfo = document.getElementById('liveInfo');
let roomId = null;
function loadVdo(rid, isHost) {
    frame.style.display = 'block';
    frame.innerHTML = `<iframe src="https://vdo.ninja/?room=${rid}${isHost ? '&push&label=Seller' : '&view'}" allow="camera;microphone;display-capture;autoplay;fullscreen" style="width:100%;height:100%;border:0;"></iframe>`;
    liveInfo.innerText = isHost ? `🔑 Room: ${rid} (share with buyers)` : `👀 Watching ${rid}`;
    liveStatus.innerText = isHost ? '🔴 You are LIVE' : '👀 Watching';
    startBtn.style.display = 'none';
    joinBtn.style.display = 'none';
    endBtn.style.display = 'inline-block';
    fullBtn.style.display = 'inline-block';
    roomId = rid;
}
startBtn.onclick = async function() {
    if (!currentUser) { showToast('Please login to start', 'warning'); return; }
    try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const rid = `hive_${Math.random().toString(36).substring(2,10)}`;
        loadVdo(rid, true);
    } catch(e) { showToast('Camera access denied', 'error'); }
};
joinBtn.onclick = function() {
    if (roomId) { loadVdo(roomId, false); return; }
    const rid = prompt('Enter room ID:');
    if (rid) loadVdo(rid.trim(), false);
    else showToast('No room ID', 'warning');
};
endBtn.onclick = function() {
    frame.style.display = 'none';
    frame.innerHTML = '';
    roomId = null;
    startBtn.style.display = 'inline-block';
    joinBtn.style.display = 'inline-block';
    endBtn.style.display = 'none';
    fullBtn.style.display = 'none';
    liveStatus.innerText = '⚡ Ready';
    liveInfo.innerText = '';
    showToast('Stream ended', 'info');
};
fullBtn.onclick = function() {
    if (!frame) return;
    if (frame.requestFullscreen) frame.requestFullscreen();
    else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
};

// ==================== CHECKOUT FROM CART ====================
document.getElementById('checkoutBtn').onclick = function() {
    if (!cart.length) { showToast('Cart is empty', 'warning'); return; }
    if (!currentUser) { showToast('Please login to checkout', 'warning'); showModal('loginModal'); return; }
    let msg = '🛒 *Order Summary from The Hive*%0A%0A';
    let total = 0;
    cart.forEach(item => {
        const subtotal = item.price * (item.qty || 1);
        total += subtotal;
        msg += `📦 ${item.title} x ${item.qty} = KES ${subtotal.toFixed(2)}%0A`;
    });
    msg += `%0A💵 Total: KES ${total.toFixed(2)}%0A%0A`;
    const name = prompt('Your full name:') || 'Customer';
    const phone = prompt('Your phone (WhatsApp):') || '';
    const address = prompt('Delivery address:') || '';
    msg += `👤 ${name}%0A📞 ${phone}%0A📍 ${address}`;
    // Send to first seller's phone (simplified)
    if (cart.length && cart[0].sellerPhone) {
        const sellerPhone = cart[0].sellerPhone.replace(/\D/g,'');
        window.open(`https://wa.me/${sellerPhone}?text=${msg}`, '_blank');
        db.collection('orders').add({
            items: cart,
            buyerName: name,
            buyerPhone: phone,
            address: address,
            total: total,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(()=>{});
        cart = [];
        updateCartUI();
        document.getElementById('cartModal').style.display = 'none';
        showToast('Order placed!', 'success');
    } else {
        showToast('Seller phone missing', 'error');
    }
};

// ==================== AUTH STATE ====================
auth.onAuthStateChanged(user => {
    updateAuthUI(user);
    loadListings();
});
loadListings();
updateCartUI();
