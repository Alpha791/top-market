// ==================== VDO.NINJA LIVE VIDEO (FREE, NO TOKEN) ====================
const frameContainer = document.getElementById('jitsiFrameContainer');
const startBtn = document.getElementById('startJitsiBtn');
const joinBtn = document.getElementById('joinJitsiBtn');
const endBtn = document.getElementById('endJitsiBtn');
const liveStatusSpan = document.getElementById('liveStatus');
const roomInfoSpan = document.getElementById('roomInfo');

let currentRoomId = null;
let currentStream = null; // for peer connection (optional)

function generateRoomId() {
    return `hive_${Math.random().toString(36).substring(2, 10)}`;
}

function loadVdoNinja(roomId, isHost) {
    frameContainer.style.display = 'block';
    frameContainer.innerHTML = '';
    
    // The Vdo.ninja embed URL (host or viewer)
    const baseUrl = 'https://vdo.ninja';
    let url;
    if (isHost) {
        // Host (broadcaster) – generates a unique push link
        url = `${baseUrl}/?room=${roomId}&push&label=Seller`;
    } else {
        // Viewer – joins the same room
        url = `${baseUrl}/?room=${roomId}&view`;
    }
    
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = 'camera; microphone; display-capture; autoplay; fullscreen';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    frameContainer.appendChild(iframe);
    
    roomInfoSpan.innerText = isHost 
        ? `🔑 Your live room ID: ${roomId} (share this ID with buyers)` 
        : `🔑 Watching room: ${roomId}`;
    liveStatusSpan.innerText = isHost ? "🔴 You are LIVE (host)" : "👀 Watching live stream";
    startBtn.style.display = 'none';
    joinBtn.style.display = 'none';
    endBtn.style.display = 'inline-flex';
    currentRoomId = roomId;
}

startBtn.onclick = async () => {
    if (!currentUser) {
        showToast('Please login to start a live stream', 'warning');
        return;
    }
    if (currentRoomId) {
        showToast('A live stream is already active. End it first.', 'warning');
        return;
    }
    // Request camera permission (Vdo.ninja will ask again, but this ensures permission is granted)
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(t => t.stop()); // we don't need the stream now, just permission
        const roomId = generateRoomId();
        loadVdoNinja(roomId, true);
    } catch (err) {
        showToast('Camera/microphone access denied. Please allow permissions.', 'error');
    }
};

joinBtn.onclick = () => {
    if (!currentRoomId) {
        showToast('No active live stream. Ask the seller to start first.', 'warning');
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
    roomInfoSpan.innerText = '';
    liveStatusSpan.innerText = '⚡ Ready';
    showToast('Live stream ended', 'info');
};
