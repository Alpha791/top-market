// ==================== CLOUDINARY CONFIGURATION ====================
const CLOUDINARY_CLOUD_NAME = "dpsj8cuoq";
const CLOUDINARY_UPLOAD_PRESET = "dpsj8cuoq";

// ==================== AGORA CONFIGURATION ====================
// 🔴 REPLACE WITH YOUR OWN Agora App ID (string of 32 characters)
const AGORA_APP_ID = "f140367426c046e1b6284a35f07547c7";
const AGORA_CHANNEL = "the_hive";

// Token endpoint – points to your PHP script (must be on the same server)
const TOKEN_SERVER_URL = "/api/token.php";

// ==================== DOM ELEMENTS ====================
const listingsGrid = document.getElementById('listingsGrid');
const postBtn = document.getElementById('postItemBtn');
const itemImages = document.getElementById('itemImages');
const imagePreview = document.getElementById('imagePreview');

// Live elements
const startLiveBtn = document.getElementById('startLiveBtn');
const stopLiveBtn = document.getElementById('stopLiveBtn');
const muteMicBtn = document.getElementById('muteMicBtn');
const switchCamBtn = document.getElementById('switchCamBtn');
const watchLiveBtn = document.getElementById('watchLiveBtn');
const liveStatus = document.getElementById('liveStatus');
const localVideoDiv = document.getElementById('localVideo');
const remoteVideoDiv = document.getElementById('remoteVideo');

// Auth state
let currentUser = null;

// Agora state
let rtc = {
    client: null,
    localAudioTrack: null,
    localVideoTrack: null
};
let isHost = false;
let isMicMuted = false;
let currentCameraDeviceId = null;
let allCameras = [];

// ==================== CUSTOM TOAST (NO ALERTS) ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconClass = '';
    if (type === 'success') iconClass = 'fa-check-circle';
    else if (type === 'error') iconClass = 'fa-times-circle';
    else if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    else iconClass = 'fa-info-circle';
    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
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
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showSignupBtn = document.getElementById('showSignupBtn');
    const userInfoDiv = document.getElementById('userInfo');
    const userNameSpan = document.getElementById('userName');
    if (user) {
        showLoginBtn.style.display = 'none';
        showSignupBtn.style.display = 'none';
        userInfoDiv.style.display = 'inline-block';
        userNameSpan.textContent = user.email ? user.email.split('@')[0] : 'User';
        showToast(`Welcome back, ${userNameSpan.textContent}!`, 'success');
    } else {
        showLoginBtn.style.display = 'inline-block';
        showSignupBtn.style.display = 'inline-block';
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

// Post item (with toasts, no alerts)
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
        title,
        description: desc,
        price,
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
        listingsGrid.innerHTML = '<p class="loading">❌ Error loading items.</p>';
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

// ==================== AGORA LIVE STREAMING ====================
async function fetchAgoraToken(uid) {
    try {
        const response = await fetch(`${TOKEN_SERVER_URL}?uid=${uid}`);
        const data = await response.json();
        return data.token;
    } catch (err) {
        console.error("Token fetch failed", err);
        showToast("Token server unreachable. Check your PHP endpoint.", "error");
        return null;
    }
}

async function initAgoraClient(role) {
    rtc.client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    await rtc.client.setClientRole(role);
    const uid = currentUser ? parseInt(currentUser.uid, 36) % 1000000 : Math.floor(Math.random() * 100000);
    const token = await fetchAgoraToken(uid);
    if (!token) throw new Error("No token received");
    await rtc.client.join(AGORA_APP_ID, AGORA_CHANNEL, token, uid);
    liveStatus.innerText = role === "host" ? "🔴 You are LIVE (Host)" : "👀 Watching live stream...";
    return uid;
}

async function publishLocalStream() {
    rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
    currentCameraDeviceId = rtc.localVideoTrack.getDeviceId();
    rtc.localVideoTrack.play(localVideoDiv);
    await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
    isHost = true;
    startLiveBtn.style.display = 'none';
    stopLiveBtn.style.display = 'inline-flex';
    muteMicBtn.style.display = 'inline-flex';
    switchCamBtn.style.display = 'inline-flex';
    watchLiveBtn.style.display = 'none';
    liveStatus.innerText = "🔴 LIVE - You are broadcasting";
    showToast("You are now live! Buyers can watch.", "success");
    await loadCameraList();
}

function setupRemoteHandlers() {
    rtc.client.on("user-published", async (user, mediaType) => {
        await rtc.client.subscribe(user, mediaType);
        if (mediaType === "video") {
            if (remoteVideoDiv) user.videoTrack.play(remoteVideoDiv);
            liveStatus.innerText = "📺 Watching seller's live stream";
        }
        if (mediaType === "audio") user.audioTrack.play();
    });
    rtc.client.on("user-left", () => {
        if (remoteVideoDiv) remoteVideoDiv.innerHTML = '';
        liveStatus.innerText = isHost ? "🔴 LIVE (no viewers)" : "Stream ended by seller";
        showToast("The seller has ended the live stream.", "info");
    });
}

async function leaveChannel() {
    if (rtc.localAudioTrack) rtc.localAudioTrack.close();
    if (rtc.localVideoTrack) rtc.localVideoTrack.close();
    if (rtc.client) await rtc.client.leave();
    rtc.client = null;
    localVideoDiv.innerHTML = '';
    remoteVideoDiv.innerHTML = '';
    isHost = false;
    startLiveBtn.style.display = 'inline-flex';
    stopLiveBtn.style.display = 'none';
    muteMicBtn.style.display = 'none';
    switchCamBtn.style.display = 'none';
    watchLiveBtn.style.display = 'inline-flex';
    liveStatus.innerText = "⚡ Ready";
}

async function loadCameraList() {
    allCameras = await AgoraRTC.getCameras();
}

async function switchCamera() {
    if (!rtc.localVideoTrack) return;
    let currentIndex = allCameras.findIndex(cam => cam.deviceId === currentCameraDeviceId);
    if (currentIndex === -1) currentIndex = 0;
    const nextIndex = (currentIndex + 1) % allCameras.length;
    const nextCamera = allCameras[nextIndex];
    await rtc.localVideoTrack.setDevice(nextCamera.deviceId);
    currentCameraDeviceId = nextCamera.deviceId;
    showToast(`Switched to ${nextCamera.label || "camera"}`, "info");
}

async function toggleMicrophone() {
    if (!rtc.localAudioTrack) return;
    if (isMicMuted) {
        await rtc.localAudioTrack.setMuted(false);
        isMicMuted = false;
        muteMicBtn.innerHTML = "🎤 Mute Mic";
    } else {
        await rtc.localAudioTrack.setMuted(true);
        isMicMuted = true;
        muteMicBtn.innerHTML = "🎤🔇 Unmute";
    }
}

// Live button handlers
startLiveBtn.onclick = async () => {
    if (!currentUser) {
        showToast("Please login to start a live stream", "warning");
        return;
    }
    if (rtc.client) await leaveChannel();
    try {
        await initAgoraClient("host");
        setupRemoteHandlers();
        await publishLocalStream();
    } catch (err) {
        showToast("Failed to start live: " + err.message, "error");
        await leaveChannel();
    }
};

stopLiveBtn.onclick = async () => {
    await leaveChannel();
    showToast("Live stream ended", "info");
};

switchCamBtn.onclick = switchCamera;
muteMicBtn.onclick = toggleMicrophone;

watchLiveBtn.onclick = async () => {
    if (rtc.client) await leaveChannel();
    try {
        await initAgoraClient("audience");
        setupRemoteHandlers();
        showToast("Watching live stream...", "info");
    } catch (err) {
        showToast("Failed to join: " + err.message, "error");
        await leaveChannel();
    }
};

// ==================== AUTH HANDLERS (with toasts, no alerts) ====================
document.getElementById('showLoginBtn').onclick = () => showModal('loginModal');
document.getElementById('showSignupBtn').onclick = () => showModal('signupModal');
document.querySelectorAll('.close').forEach(btn => btn.onclick = closeModals);

document.getElementById('doLoginBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value;
    const pwd = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, pwd);
        closeModals();
        showToast("Login successful", "success");
    } catch (err) { showToast(err.message, "error"); }
};

document.getElementById('doSignupBtn').onclick = async () => {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const pwd = document.getElementById('signupPassword').value;
    if (!name || !email || !pwd) { showToast("Please fill all fields", "warning"); return; }
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pwd);
        await cred.user.updateProfile({ displayName: name });
        closeModals();
        showToast("Account created! You can now post items.", "success");
    } catch (err) { showToast(err.message, "error"); }
};

document.getElementById('logoutBtn').onclick = () => {
    auth.signOut();
    showToast("Logged out", "info");
};

auth.onAuthStateChanged(user => {
    updateAuthUI(user);
    loadListings();
});

loadListings();
