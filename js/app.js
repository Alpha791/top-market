// ==================== FIREBASE CONFIGURATION ====================
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
console.log("✅ Firebase initialized");

// ==================== CLOUDINARY ====================
const CLOUDINARY_CLOUD_NAME = "dpsj8cuoq";
const CLOUDINARY_UPLOAD_PRESET = "marketplace";

// ==================== DOM ELEMENTS ====================
const listingsGrid = document.getElementById('listingsGrid');
const postBtn = document.getElementById('postItemBtn');
const itemImages = document.getElementById('itemImages');
const imagePreview = document.getElementById('imagePreview');
let currentUser = null;

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = '';
    switch (type) {
        case 'success': icon = 'fa-check-circle'; break;
        case 'error': icon = 'fa-times-circle'; break;
        case 'warning': icon = 'fa-exclamation-triangle'; break;
        default: icon = 'fa-info-circle';
    }
    toast.innerHTML = `<i class="fas ${icon}"></i><span class="toast-message">${message}</span><i class="fas fa-times toast-close"></i>`;
    container.appendChild(toast);
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); };
    setTimeout(() => { if (toast.parentElement) { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); } }, 4000);
}

// ==================== AUTH UI ====================
function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }
function updateAuthUI(user) {
    currentUser = user;
    const loginBtn = document.getElementById('showLoginBtn');
    const signupBtn = document.getElementById('showSignupBtn');
    const userInfo = document.getElementById('userInfo');
    const userNameSpan = document.getElementById('userName');
    if (user) {
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        userInfo.style.display = 'inline-block';
        userNameSpan.textContent = user.email.split('@')[0];
        showToast(`Welcome back!`, 'success');
    } else {
        loginBtn.style.display = 'inline-block';
        signupBtn.style.display = 'inline-block';
        userInfo.style.display = 'none';
    }
}

// ==================== CLOUDINARY UPLOAD ====================
async function uploadImagesToCloudinary(files) {
    if (!files.length) return [];
    const urls = [];
    const maxFiles = Math.min(files.length, 3);
    for (let i = 0; i < maxFiles; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            urls.push(data.secure_url);
        } catch (err) {
            showToast(`Image ${i+1} failed: ${err.message}`, 'error');
            throw err;
        }
    }
    return urls;
}

// ==================== POST ITEM ====================
postBtn.addEventListener('click', async () => {
    const title = document.getElementById('itemTitle').value.trim();
    const desc = document.getElementById('itemDesc').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const sellerName = document.getElementById('sellerName').value.trim();
    const sellerEmail = document.getElementById('sellerEmail').value.trim();
    const sellerPhone = document.getElementById('sellerPhone').value.trim();
    const files = itemImages.files;

    if (!title || !desc || isNaN(price) || !sellerName || !sellerEmail) {
        showToast('Please fill all required fields', 'warning');
        return;
    }

    postBtn.disabled = true;
    postBtn.textContent = 'Uploading...';
    const postData = {
        title, description: desc, price,
        seller: { name: sellerName, email: sellerEmail, phone: sellerPhone || '' },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser ? currentUser.uid : 'guest_' + Date.now(),
        images: []
    };
    try {
        if (files.length) postData.images = await uploadImagesToCloudinary(files);
        await db.collection('listings').add(postData);
        showToast('Item posted!', 'success');
        document.getElementById('itemTitle').value = '';
        document.getElementById('itemDesc').value = '';
        document.getElementById('itemPrice').value = '';
        document.getElementById('sellerName').value = '';
        document.getElementById('sellerEmail').value = '';
        document.getElementById('sellerPhone').value = '';
        itemImages.value = '';
        imagePreview.innerHTML = '';
        loadListings();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Post Item';
    }
});

itemImages.addEventListener('change', () => {
    const files = Array.from(itemImages.files);
    imagePreview.innerHTML = '';
    files.slice(0, 3).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = document.createElement('img');
            img.src = e.target.result;
            imagePreview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

// ==================== LOAD LISTINGS (with Buy & WhatsApp buttons) ====================
function loadListings() {
    db.collection('listings').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) { listingsGrid.innerHTML = '<p class="loading">📭 No items yet.</p>'; return; }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const itemId = doc.id;
            const imagesHtml = data.images?.length ? `<div class="card-images">${data.images.map(img => `<img src="${img}">`).join('')}</div>` : '<div class="card-images"><i class="fas fa-image"></i></div>';
            const sellerPhone = data.seller?.phone || '';
            
            html += `
            <div class="card" data-id="${itemId}">
                ${imagesHtml}
                <div class="card-content">
                    <div class="card-title">${escapeHtml(data.title)}</div>
                    <div class="card-price">💰 KES ${data.price}</div>
                    <div class="card-desc">${escapeHtml(data.description.substring(0, 100))}</div>
                    <div class="seller-info">
                        <i class="fas fa-user"></i> ${escapeHtml(data.seller.name)}<br>
                        <i class="fas fa-envelope"></i> ${escapeHtml(data.seller.email)}<br>
                        ${sellerPhone ? `<i class="fas fa-phone"></i> ${escapeHtml(sellerPhone)}` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="btn-buy" data-id="${itemId}" data-title="${escapeHtml(data.title)}" data-price="${data.price}" data-seller="${escapeHtml(data.seller.name)}" data-phone="${escapeHtml(sellerPhone)}">🛒 Buy Now</button>
                        ${sellerPhone ? `<button class="btn-whatsapp" data-phone="${escapeHtml(sellerPhone)}" data-title="${escapeHtml(data.title)}" data-price="${data.price}" data-seller="${escapeHtml(data.seller.name)}"><i class="fab fa-whatsapp"></i> Chat</button>` : ''}
                    </div>
                </div>
            </div>`;
        });
        listingsGrid.innerHTML = html;

        // ========== ATTACH EVENT LISTENERS FOR BUY & WHATSAPP ==========
        // Buy Now
        document.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const itemId = this.dataset.id;
                const title = this.dataset.title;
                const price = this.dataset.price;
                const sellerName = this.dataset.seller;
                const sellerPhone = this.dataset.phone;
                openOrderModal(itemId, title, price, sellerName, sellerPhone);
            });
        });
        // WhatsApp Chat
        document.querySelectorAll('.btn-whatsapp').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const phone = this.dataset.phone;
                const title = this.dataset.title;
                const price = this.dataset.price;
                const seller = this.dataset.seller;
                if (!phone) { showToast('Seller phone number not available.', 'warning'); return; }
                const message = `Hello ${seller}, I'm interested in buying "${title}" for KES ${price}. Please let me know if it's still available.`;
                const url = `https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            });
        });
    });
}

// ==================== ORDER MODAL LOGIC ====================
const orderModal = document.getElementById('orderModal');
const orderModalClose = document.getElementById('orderModalClose');
const orderBuyerName = document.getElementById('orderBuyerName');
const orderBuyerPhone = document.getElementById('orderBuyerPhone');
const orderAddress = document.getElementById('orderAddress');
const orderQuantity = document.getElementById('orderQuantity');
const orderSummary = document.getElementById('orderSummary');
const placeOrderBtn = document.getElementById('placeOrderBtn');

let currentOrderData = {};

function openOrderModal(itemId, title, price, sellerName, sellerPhone) {
    if (!currentUser) {
        showToast('Please login to place an order.', 'warning');
        showModal('loginModal');
        return;
    }
    // Pre-fill buyer name from current user
    orderBuyerName.value = currentUser.displayName || currentUser.email.split('@')[0] || '';
    orderBuyerPhone.value = '';
    orderAddress.value = '';
    orderQuantity.value = 1;
    currentOrderData = { itemId, title, price, sellerName, sellerPhone };
    updateOrderSummary();
    orderModal.style.display = 'flex';
}

function updateOrderSummary() {
    const qty = parseInt(orderQuantity.value) || 1;
    const total = (currentOrderData.price || 0) * qty;
    orderSummary.innerHTML = `
        <strong>Item:</strong> ${escapeHtml(currentOrderData.title)}<br>
        <strong>Price:</strong> KES ${currentOrderData.price}<br>
        <strong>Quantity:</strong> ${qty}<br>
        <strong>Total:</strong> KES ${total.toFixed(2)}<br>
        <strong>Seller:</strong> ${escapeHtml(currentOrderData.sellerName)}
    `;
}

orderQuantity.addEventListener('input', updateOrderSummary);

placeOrderBtn.addEventListener('click', function() {
    const name = orderBuyerName.value.trim();
    const phone = orderBuyerPhone.value.trim();
    const address = orderAddress.value.trim();
    const qty = parseInt(orderQuantity.value) || 1;
    if (!name || !phone || !address) {
        showToast('Please fill all required fields.', 'warning');
        return;
    }
    const total = (currentOrderData.price || 0) * qty;
    // Build WhatsApp message
    const message = `🛒 *New Order from The Hive*\n\n` +
        `📦 Item: ${currentOrderData.title}\n` +
        `💰 Price: KES ${currentOrderData.price}\n` +
        `🔢 Quantity: ${qty}\n` +
        `💵 Total: KES ${total.toFixed(2)}\n\n` +
        `👤 Buyer: ${name}\n` +
        `📞 Phone: ${phone}\n` +
        `📍 Address: ${address}\n\n` +
        `Please confirm availability and arrange delivery.`;
    
    const sellerPhone = currentOrderData.sellerPhone;
    if (!sellerPhone) {
        showToast('Seller phone number is missing. Cannot send order.', 'error');
        return;
    }
    const url = `https://wa.me/${sellerPhone.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    // Optionally save order to Firestore
    saveOrderToFirestore(currentOrderData.itemId, name, phone, address, qty, total);
    orderModal.style.display = 'none';
    showToast('Order sent to seller via WhatsApp!', 'success');
});

// Optional: Save order to Firestore for order history
async function saveOrderToFirestore(itemId, buyerName, buyerPhone, address, qty, total) {
    try {
        await db.collection('orders').add({
            itemId: itemId,
            buyerName: buyerName,
            buyerPhone: buyerPhone,
            address: address,
            quantity: qty,
            total: total,
            buyerUid: currentUser ? currentUser.uid : 'guest',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            itemTitle: currentOrderData.title,
            sellerName: currentOrderData.sellerName,
            sellerPhone: currentOrderData.sellerPhone
        });
    } catch (err) {
        console.warn('Order not saved to Firestore:', err);
    }
}

orderModalClose.onclick = () => { orderModal.style.display = 'none'; };
window.onclick = (e) => { if (e.target === orderModal) orderModal.style.display = 'none'; };

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== VDO.NINJA LIVE VIDEO ====================
const frameContainer = document.getElementById('liveFrameContainer');
const startBtn = document.getElementById('startLiveBtn');
const joinBtn = document.getElementById('joinLiveBtn');
const endBtn = document.getElementById('endLiveBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const liveStatusSpan = document.getElementById('liveStatus');
const liveInfoSpan = document.getElementById('liveInfo');

let currentRoomId = null;

function generateRoomId() {
    return `hive_${Math.random().toString(36).substring(2, 10)}`;
}

function loadVdoNinja(roomId, isHost) {
    frameContainer.style.display = 'block';
    frameContainer.innerHTML = '';
    const base = 'https://vdo.ninja';
    const url = isHost ? `${base}/?room=${roomId}&push&label=Seller` : `${base}/?room=${roomId}&view`;
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = 'camera; microphone; display-capture; autoplay; fullscreen';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    frameContainer.appendChild(iframe);
    liveInfoSpan.innerText = isHost ? `🔑 Your room ID: ${roomId} (share with buyers)` : `🔑 Watching room: ${roomId}`;
    liveStatusSpan.innerText = isHost ? "🔴 You are LIVE" : "👀 Watching live stream";
    startBtn.style.display = 'none';
    joinBtn.style.display = 'none';
    endBtn.style.display = 'inline-flex';
    fullscreenBtn.style.display = 'inline-flex';
    currentRoomId = roomId;
}

startBtn.onclick = async () => {
    if (!currentUser) { showToast('Please login to start', 'warning'); return; }
    if (currentRoomId) { showToast('Already live', 'warning'); return; }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(t => t.stop());
        const roomId = generateRoomId();
        loadVdoNinja(roomId, true);
    } catch (err) {
        showToast('Camera/mic access denied. Please allow permissions.', 'error');
    }
};

joinBtn.onclick = () => {
    if (!currentRoomId) {
        const manualId = prompt("Enter the seller's room ID (e.g., hive_abc123):");
        if (manualId && manualId.trim()) {
            loadVdoNinja(manualId.trim(), false);
        } else {
            showToast('No active live stream. Ask the seller for room ID.', 'warning');
        }
        return;
    }
    loadVdoNinja(currentRoomId, false);
};

endBtn.onclick = () => {
    frameContainer.style.display = 'none';
    frameContainer.innerHTML = '';
    currentRoomId = null;
    startBtn.style.display = 'inline-flex';
    joinBtn.style.display = 'inline-flex';
    endBtn.style.display = 'none';
    fullscreenBtn.style.display = 'none';
    liveInfoSpan.innerText = '';
    liveStatusSpan.innerText = '⚡ Ready';
    showToast('Live stream ended', 'info');
};

// ==================== FULLSCREEN TOGGLE ====================
function toggleFullscreen() {
    if (!frameContainer) return;
    if (!document.fullscreenElement) {
        if (frameContainer.requestFullscreen) {
            frameContainer.requestFullscreen();
        } else if (frameContainer.webkitRequestFullscreen) {
            frameContainer.webkitRequestFullscreen();
        } else if (frameContainer.msRequestFullscreen) {
            frameContainer.msRequestFullscreen();
        }
        fullscreenBtn.innerHTML = '🗗 Exit';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        fullscreenBtn.innerHTML = '⛶ Fullscreen';
    }
}

fullscreenBtn.addEventListener('click', toggleFullscreen);

document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.innerHTML = document.fullscreenElement ? '🗗 Exit' : '⛶ Fullscreen';
});
document.addEventListener('webkitfullscreenchange', () => {
    fullscreenBtn.innerHTML = document.webkitFullscreenElement ? '🗗 Exit' : '⛶ Fullscreen';
});

// ==================== AUTH EVENT HANDLERS ====================
document.getElementById('showLoginBtn').onclick = () => showModal('loginModal');
document.getElementById('showSignupBtn').onclick = () => showModal('signupModal');
document.querySelectorAll('.close').forEach(btn => btn.onclick = closeModals);

document.getElementById('doLoginBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value;
    const pwd = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, pwd);
        closeModals();
        showToast('Login successful', 'success');
    } catch (err) { showToast(err.message, 'error'); }
};

document.getElementById('doSignupBtn').onclick = async () => {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const pwd = document.getElementById('signupPassword').value;
    if (!name || !email || !pwd) { showToast('Please fill all fields', 'warning'); return; }
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pwd);
        await cred.user.updateProfile({ displayName: name });
        closeModals();
        showToast('Account created!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
};

document.getElementById('logoutBtn').onclick = () => auth.signOut();

auth.onAuthStateChanged(user => { updateAuthUI(user); loadListings(); });
loadListings();

// ==================== INTERACTIVE LIGHT ORB ====================
(function initLightOrb() {
    let ticking = false;
    function updatePosition(xPercent, yPercent) {
        document.body.style.setProperty('--x', `${xPercent}%`);
        document.body.style.setProperty('--y', `${yPercent}%`);
    }
    function handleMove(clientX, clientY) {
        if (!ticking) {
            requestAnimationFrame(() => {
                const x = (clientX / window.innerWidth) * 100;
                const y = (clientY / window.innerHeight) * 100;
                updatePosition(x, y);
                ticking = false;
            });
            ticking = true;
        }
    }
    document.body.addEventListener('mousemove', (e) => { handleMove(e.clientX, e.clientY); });
    document.body.addEventListener('touchmove', (e) => {
        if (e.touches.length) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    });
    window.addEventListener('resize', () => updatePosition(50, 50));
    updatePosition(50, 50);
})();
