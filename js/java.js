// ========== INTERACTIVE LIGHT ORB (FOLLOWS CURSOR / TOUCH) ==========
document.body.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    document.body.style.setProperty('--x', `${x}%`);
    document.body.style.setProperty('--y', `${y}%`);
});
// For touch devices (mobile)
document.body.addEventListener('touchmove', (e) => {
    if (e.touches.length) {
        const x = (e.touches[0].clientX / window.innerWidth) * 100;
        const y = (e.touches[0].clientY / window.innerHeight) * 100;
        document.body.style.setProperty('--x', `${x}%`);
        document.body.style.setProperty('--y', `${y}%`);
    }
});
// Set default center position on load
document.body.style.setProperty('--x', '50%');
document.body.style.setProperty('--y', '50%');
