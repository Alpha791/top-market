// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyCfSi2_xpsl1GkVN-7HhMx3VJdCyQz6fBE",
    authDomain: "best-market-d2ef0.firebaseapp.com",
    projectId: "best-market-d2ef0",
    storageBucket: "best-market-d2ef0.firebasestorage.app",
    messagingSenderId: "350312625623",
    appId: "1:350312625623:web:a8423cca0f867d43c90792",
    measurementId: "G-KVRLZHWNJD"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
console.log("✅ Firebase initialized");

// ==================== CLOUDINARY ====================
const CLOUDINARY_CLOUD_NAME = "dpsj8cuoq";
const CLOUDINARY_UPLOAD_PRESET = "dpsj8cuoq";

const listingsGrid = document.getElementById('listingsGrid');
const postBtn = document.getElementById('postItemBtn');
const itemImages = document.getElementById('itemImages');
const imagePreview = document.getElementById('imagePreview');
let currentUser = null;

// ==================== TOAST ====================
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
    const authDiv = document.querySelector('.auth-buttons');
    const userInfoDiv = document.getElementById('userInfo');
    const userNameSpan = document.getElementById('userName');
    if (user) {
        authDiv.querySelector('#showLoginBtn').style.display = 'none';
        authDiv.querySelector('#showSignupBtn').style.display = 'none';
        userInfoDiv.style.display = 'inline-block';
        userNameSpan.textContent = user.email.split('@')[0];
        showToast(`Welcome back!`, 'success');
    } else {
        authDiv.querySelector('#showLoginBtn').style.display = 'inline-block';
        authDiv.querySelector('#showSignupBtn').style.display = 'inline-block';
        userInfoDiv.style.display = 'none';
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

function loadListings() {
    db.collection('listings').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) { listingsGrid.innerHTML = '<p class="loading">📭 No items yet.</p>'; return; }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const imagesHtml = data.images?.length ? `<div class="card-images">${data.images.map(img => `<img src="${img}">`).join('')}</div>` : '<div class="card-images"><i class="fas fa-image"></i></div>';
            html += `<div class="card">
                ${imagesHtml}
                <div class="card-content">
                    <div class="card-title">${escapeHtml(data.title)}</div>
                    <div class="card-price">💰 $${data.price}</div>
                    <div class="card-desc">${escapeHtml(data.description.substring(0, 100))}</div>
                    <div class="seller-info">
                        <i class="fas fa-user"></i> ${escapeHtml(data.seller.name)}<br>
                        <i class="fas fa-envelope"></i> ${escapeHtml(data.seller.email)}<br>
                        ${data.seller.phone ? `<i class="fas fa-phone"></i> ${escapeHtml(data.seller.phone)}` : ''}
                    </div>
                </div>
            </div>`;
        });
        listingsGrid.innerHTML = html;
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== JITSI (SIMPLIFIED IFRAME, AUTO CAMERA) ====================
const frameContainer = document.getElementById('jitsiFrameContainer');
const startBtn = document.getElementById('startJitsiBtn');
const joinBtn = document.getElementById('joinJitsiBtn');
const endBtn = document.getElementById('endJitsiBtn');
const liveStatusSpan = document.getElementById('liveStatus');
const roomInfoSpan = document.getElementById('roomInfo');

let currentRoom = null;

function generateRoomName() {
    if (currentUser) return `thehive_${currentUser.uid}_${Date.now()}`;
    return `thehive_guest_${Math.random().toString(36).substring(7)}`;
}

function loadJitsi(roomName, isHost) {
    frameContainer.style.display = 'block';
    frameContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    const domain = 'meet.jit.si';
    // Force video & audio to start automatically
    const url = `https://${domain}/${roomName}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName=${encodeURIComponent(currentUser?.email || 'Guest')}`;
    iframe.src = url;
    iframe.allow = 'camera; microphone; display-capture; autoplay; fullscreen';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    frameContainer.appendChild(iframe);

    roomInfoSpan.innerText = `🔑 Room: ${roomName} (share link)`;
    liveStatusSpan.innerText = isHost ? "🔴 You are LIVE" : "👀 Watching live stream";
    startBtn.style.display = 'none';
    joinBtn.style.display = 'none';
    endBtn.style.display = 'inline-flex';
}

startBtn.onclick = () => {
    if (!currentUser) { showToast('Please login first', 'warning'); return; }
    if (currentRoom) { showToast('Already live, end it first', 'warning'); return; }
    currentRoom = generateRoomName();
    loadJitsi(currentRoom, true);
};

joinBtn.onclick = () => {
    if (!currentRoom) { showToast('No active live stream', 'warning'); return; }
    loadJitsi(currentRoom, false);
};

endBtn.onclick = () => {
    frameContainer.style.display = 'none';
    frameContainer.innerHTML = '';
    currentRoom = null;
    startBtn.style.display = 'inline-flex';
    joinBtn.style.display = 'inline-flex';
    endBtn.style.display = 'none';
    roomInfoSpan.innerText = '';
    liveStatusSpan.innerText = '⚡ Ready';
    showToast('Live stream ended', 'info');
};

// ==================== AUTH ====================
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
