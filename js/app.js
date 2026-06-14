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
console.log("✅ Firebase initialized (Firestore + Auth)");

// ==================== CLOUDINARY CONFIGURATION ====================
const CLOUDINARY_CLOUD_NAME = "dpsj8cuoq";
const CLOUDINARY_UPLOAD_PRESET = "dpsj8cuoq";

// ==================== DOM ELEMENTS ====================
const listingsGrid = document.getElementById('listingsGrid');
const postBtn = document.getElementById('postItemBtn');
const itemImages = document.getElementById('itemImages');
const imagePreview = document.getElementById('imagePreview');

let currentUser = null;

// ==================== CUSTOM TOAST (no browser alerts) ====================
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
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="toast-message">${message}</span>
        <i class="fas fa-times toast-close"></i>
    `;
    container.appendChild(toast);
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    };
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// ==================== FIREBASE AUTH UI ====================
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}
function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}
function updateAuthUI(user) {
    currentUser = user;
    const authDiv = document.querySelector('.auth-buttons');
    const userInfoDiv = document.getElementById('userInfo');
    const userNameSpan = document.getElementById('userName');
    if (user) {
        authDiv.querySelector('#showLoginBtn').style.display = 'none';
        authDiv.querySelector('#showSignupBtn').style.display = 'none';
        userInfoDiv.style.display = 'inline-block';
        userNameSpan.textContent = user.email ? user.email.split('@')[0] : 'User';
        showToast(`Welcome back, ${userNameSpan.textContent}!`, 'success');
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
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                { method: 'POST', body: formData }
            );
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            urls.push(data.secure_url);
        } catch (err) {
            showToast(`Image ${i+1} failed: ${err.message}`, 'error');
            throw err;
        }
    }
    return urls;
}

// ==================== POST ITEM (with toasts) ====================
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
        showToast('Item posted successfully!', 'success');
        // Clear form
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

// Image preview
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

// Load listings
function loadListings() {
    db.collection('listings').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            listingsGrid.innerHTML = '<p class="loading">📭 No items yet. Be the first to sell!</p>';
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const imagesHtml = data.images && data.images.length ? 
                `<div class="card-images">${data.images.map(img => `<img src="${img}" alt="product" loading="lazy">`).join('')}</div>` : 
                '<div class="card-images"><i class="fas fa-image" style="padding:1rem;"></i></div>';
            html += `
                <div class="card">
                    ${imagesHtml}
                    <div class="card-content">
                        <div class="card-title">${escapeHtml(data.title)}</div>
                        <div class="card-price">💰 $${data.price}</div>
                        <div class="card-desc">${escapeHtml(data.description.substring(0, 100))}${data.description.length > 100 ? '...' : ''}</div>
                        <div class="seller-info">
                            <i class="fas fa-user"></i> ${escapeHtml(data.seller.name)}<br>
                            <i class="fas fa-envelope"></i> ${escapeHtml(data.seller.email)}<br>
                            ${data.seller.phone ? `<i class="fas fa-phone"></i> ${escapeHtml(data.seller.phone)}` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        listingsGrid.innerHTML = html;
    }, error => {
        console.error(error);
        listingsGrid.innerHTML = '<p class="loading">❌ Error loading items. Check your Firebase rules.</p>';
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

// ==================== JITSI MEET INTEGRATION (FREE, NO TOKEN) ====================
const frameContainer = document.getElementById('jitsiFrameContainer');
const startBtn = document.getElementById('startJitsiBtn');
const joinBtn = document.getElementById('joinJitsiBtn');
const endBtn = document.getElementById('endJitsiBtn');
const liveStatusSpan = document.getElementById('liveStatus');
const roomInfoSpan = document.getElementById('roomInfo');

let currentRoom = null;
let jitsiApi = null;

function generateRoomName() {
    if (currentUser) return `thehive_${currentUser.uid}_${Date.now()}`;
    return `thehive_guest_${Math.random().toString(36).substring(7)}`;
}

function loadJitsi(roomName, isHost) {
    frameContainer.style.display = 'block';
    frameContainer.innerHTML = '<iframe id="jitsiFrame" allow="camera; microphone; display-capture" style="width:100%; height:100%; border:0;"></iframe>';
    const domain = 'meet.jit.si';
    const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: frameContainer,
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            disableInviteFunctions: true,
            toolbarButtons: ['microphone', 'camera', 'desktop', 'fullscreen', 'hangup', 'settings']
        },
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'desktop', 'fullscreen', 'hangup', 'settings']
        }
    };
    if (window.JitsiMeetExternalAPI) {
        jitsiApi = new JitsiMeetExternalAPI(domain, roomName, options);
    } else {
        const script = document.createElement('script');
        script.src = `https://${domain}/external_api.js`;
        script.onload = () => {
            jitsiApi = new JitsiMeetExternalAPI(domain, roomName, options);
        };
        document.head.appendChild(script);
    }
    roomInfoSpan.innerText = `🔑 Room: ${roomName} (share this link with buyers)`;
    liveStatusSpan.innerText = isHost ? "🔴 You are LIVE (host)" : "👀 Watching live stream";
    startBtn.style.display = 'none';
    joinBtn.style.display = 'none';
    endBtn.style.display = 'inline-flex';
}

startBtn.onclick = () => {
    if (!currentUser) {
        showToast('Please login to start a live stream', 'warning');
        return;
    }
    if (currentRoom) {
        showToast('A live stream is already active. End it first.', 'warning');
        return;
    }
    currentRoom = generateRoomName();
    loadJitsi(currentRoom, true);
};

joinBtn.onclick = () => {
    if (!currentRoom) {
        showToast('No active live stream. Ask the seller to start first.', 'warning');
        return;
    }
    loadJitsi(currentRoom, false);
};

endBtn.onclick = () => {
    if (jitsiApi) {
        jitsiApi.dispose();
        jitsiApi = null;
    }
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

// ==================== AUTH HANDLERS (with toasts) ====================
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
    if (!name || !email || !pwd) {
        showToast('Please fill all fields', 'warning');
        return;
    }
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pwd);
        await cred.user.updateProfile({ displayName: name });
        closeModals();
        showToast('Account created! You can now post items.', 'success');
    } catch (err) { showToast(err.message, 'error'); }
};

document.getElementById('logoutBtn').onclick = () => {
    auth.signOut();
    showToast('Logged out', 'info');
};

auth.onAuthStateChanged(user => {
    updateAuthUI(user);
    loadListings();
});

loadListings();

// ==================== OPTIONAL: INTERACTIVE PARTICLE BACKGROUND ====================
// Uncomment the code below if you want floating particles behind the content
/*
function initParticleBackground() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.color = `rgba(129, 140, 248, ${Math.random() * 0.3 + 0.1})`;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }
    for (let i = 0; i < 60; i++) particles.push(new Particle());
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }
    animate();
}
initParticleBackground();
*/
