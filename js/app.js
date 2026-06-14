// ==================== CLOUDINARY CONFIGURATION ====================
// 🔴 REPLACE THESE WITH YOUR CLOUDINARY CREDENTIALS 🔴
const CLOUDINARY_CLOUD_NAME = "dpsj8cuoq";
const CLOUDINARY_UPLOAD_PRESET = "dpsj8cuoq";
// ==================================================================

// DOM elements
const listingsGrid = document.getElementById('listingsGrid');
const postBtn = document.getElementById('postItemBtn');
const itemImages = document.getElementById('itemImages');
const imagePreview = document.getElementById('imagePreview');

// Auth state
let currentUser = null;

// Helper: show/hide modals
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}
function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

// Update UI based on auth
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
    } else {
        authDiv.querySelector('#showLoginBtn').style.display = 'inline-block';
        authDiv.querySelector('#showSignupBtn').style.display = 'inline-block';
        userInfoDiv.style.display = 'none';
    }
}

// ==================== CLOUDINARY UPLOAD FUNCTION ====================
// Upload images to Cloudinary (replaces Firebase Storage)
async function uploadImagesToCloudinary(files) {
    if (!files || files.length === 0) return [];
    
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
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Upload failed');
            }
            
            const data = await response.json();
            urls.push(data.secure_url); // Cloudinary returns HTTPS URL
            console.log(`✅ Uploaded image ${i+1}: ${data.secure_url}`);
        } catch (err) {
            console.error(`❌ Cloudinary upload error for image ${i+1}:`, err);
            alert(`Failed to upload image ${i+1}: ${err.message}\nCheck your Cloudinary credentials.`);
            throw err; // Stop the posting process
        }
    }
    return urls;
}
// ====================================================================

// Post item (works with or without login, now using Cloudinary)
postBtn.addEventListener('click', async () => {
    const title = document.getElementById('itemTitle').value.trim();
    const desc = document.getElementById('itemDesc').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const sellerName = document.getElementById('sellerName').value.trim();
    const sellerEmail = document.getElementById('sellerEmail').value.trim();
    const sellerPhone = document.getElementById('sellerPhone').value.trim();
    const files = itemImages.files;

    // Validation
    if (!title || !desc || isNaN(price) || !sellerName || !sellerEmail) {
        alert('Please fill required fields: Title, Description, Price, Your Name and Email.');
        return;
    }

    // Disable button during upload
    postBtn.disabled = true;
    postBtn.textContent = 'Uploading images...';

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
        // Upload images to Cloudinary (instead of Firebase Storage)
        if (files.length > 0) {
            postData.images = await uploadImagesToCloudinary(files);
        }
        
        // Save to Firestore
        await db.collection('listings').add(postData);
        alert('✅ Item posted successfully with Cloudinary images!');
        
        // Clear form
        document.getElementById('itemTitle').value = '';
        document.getElementById('itemDesc').value = '';
        document.getElementById('itemPrice').value = '';
        document.getElementById('sellerName').value = '';
        document.getElementById('sellerEmail').value = '';
        document.getElementById('sellerPhone').value = '';
        itemImages.value = '';
        imagePreview.innerHTML = '';
        
        // Reload listings
        loadListings();
    } catch (err) {
        console.error('Post error:', err);
        alert('❌ Error posting item: ' + err.message);
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Post Item';
    }
});

// Image preview (unchanged)
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

// Load all listings in real time (unchanged)
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
        console.error("Firestore error:", error);
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

// Auth handlers (unchanged)
document.getElementById('showLoginBtn').onclick = () => showModal('loginModal');
document.getElementById('showSignupBtn').onclick = () => showModal('signupModal');
document.querySelectorAll('.close').forEach(btn => btn.onclick = closeModals);

document.getElementById('doLoginBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value;
    const pwd = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, pwd);
        closeModals();
        alert('✅ Login successful!');
    } catch (err) { alert('❌ ' + err.message); }
};

document.getElementById('doSignupBtn').onclick = async () => {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const pwd = document.getElementById('signupPassword').value;
    if (!name || !email || !pwd) {
        alert('Please fill all fields');
        return;
    }
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pwd);
        await cred.user.updateProfile({ displayName: name });
        closeModals();
        alert('✅ Account created! You can now post items.');
    } catch (err) { alert('❌ ' + err.message); }
};

document.getElementById('logoutBtn').onclick = () => {
    auth.signOut();
    alert('Logged out');
};

auth.onAuthStateChanged(user => {
    updateAuthUI(user);
    loadListings();
});

// Initial load
loadListings();
