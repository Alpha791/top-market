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

// Upload images to Firebase Storage (up to 3)
async function uploadImages(files) {
    if (!files.length) return [];
    const urls = [];
    const maxFiles = Math.min(files.length, 3);
    for (let i = 0; i < maxFiles; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const filename = `${Date.now()}_${i}.${ext}`;
        const storageRef = storage.ref(`listings/${filename}`);
        await storageRef.put(file);
        const url = await storageRef.getDownloadURL();
        urls.push(url);
    }
    return urls;
}

// Post item (works with or without login)
postBtn.addEventListener('click', async () => {
    const title = document.getElementById('itemTitle').value.trim();
    const desc = document.getElementById('itemDesc').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const sellerName = document.getElementById('sellerName').value.trim();
    const sellerEmail = document.getElementById('sellerEmail').value.trim();
    const sellerPhone = document.getElementById('sellerPhone').value.trim();
    const files = itemImages.files;

    if (!title || !desc || isNaN(price) || !sellerName || !sellerEmail) {
        alert('Please fill required fields: Title, Description, Price, Your Name and Email.');
        return;
    }

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
        if (files.length) {
            postData.images = await uploadImages(files);
        }
        await db.collection('listings').add(postData);
        alert('Item posted successfully!');
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
        console.error(err);
        alert('Error posting item: ' + err.message);
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

// Load all listings in real time
function loadListings() {
    db.collection('listings').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            listingsGrid.innerHTML = '<p class="loading">No items yet. Be the first to sell!</p>';
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const imagesHtml = data.images && data.images.length ? 
                `<div class="card-images">${data.images.map(img => `<img src="${img}" alt="product">`).join('')}</div>` : 
                '<div class="card-images"><i class="fas fa-image" style="padding:1rem;"></i></div>';
            html += `
                <div class="card">
                    ${imagesHtml}
                    <div class="card-content">
                        <div class="card-title">${escapeHtml(data.title)}</div>
                        <div class="card-price">$${data.price}</div>
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

// Auth handlers
document.getElementById('showLoginBtn').onclick = () => showModal('loginModal');
document.getElementById('showSignupBtn').onclick = () => showModal('signupModal');
document.querySelectorAll('.close').forEach(btn => btn.onclick = closeModals);

document.getElementById('doLoginBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value;
    const pwd = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, pwd);
        closeModals();
    } catch (err) { alert(err.message); }
};
document.getElementById('doSignupBtn').onclick = async () => {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const pwd = document.getElementById('signupPassword').value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pwd);
        await cred.user.updateProfile({ displayName: name });
        closeModals();
    } catch (err) { alert(err.message); }
};
document.getElementById('logoutBtn').onclick = () => auth.signOut();

auth.onAuthStateChanged(user => {
    updateAuthUI(user);
    loadListings(); // refresh listings after login (no extra effect)
});

// Initial load
loadListings();
