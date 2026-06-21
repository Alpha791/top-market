// ==================== RIGHT-CLICK & DEV TOOLS PROTECTION ====================
(function() {
    // Wait for DOM to be ready (if needed)
    function initSecurity() {
        // 1. Disable right-click
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (typeof showToast === 'function') {
                showToast('Right-click is disabled on this site.', 'warning');
            }
            return false;
        }, { capture: true });

        // 2. Disable keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // F12
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
                if (typeof showToast === 'function') {
                    showToast('Developer tools are disabled.', 'warning');
                }
                return false;
            }
            // Ctrl+Shift+I
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.keyCode === 73)) {
                e.preventDefault();
                if (typeof showToast === 'function') {
                    showToast('Inspect element is disabled.', 'warning');
                }
                return false;
            }
            // Ctrl+Shift+J
            if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.keyCode === 74)) {
                e.preventDefault();
                if (typeof showToast === 'function') {
                    showToast('Console is disabled.', 'warning');
                }
                return false;
            }
            // Ctrl+U
            if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
                e.preventDefault();
                if (typeof showToast === 'function') {
                    showToast('View source is disabled.', 'warning');
                }
                return false;
            }
            // Ctrl+S
            if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
                e.preventDefault();
                if (typeof showToast === 'function') {
                    showToast('Save page is disabled.', 'warning');
                }
                return false;
            }
        }, { capture: true });

        // 3. Prevent image dragging
        document.querySelectorAll('img').forEach(img => {
            img.setAttribute('draggable', 'false');
            img.addEventListener('dragstart', (e) => e.preventDefault());
        });

        // 4. Disable text selection via CSS
        const style = document.createElement('style');
        style.textContent = `
            body { user-select: none; -webkit-user-select: none; -moz-user-select: none; }
            input, textarea { user-select: text; -webkit-user-select: text; }
        `;
        document.head.appendChild(style);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSecurity);
    } else {
        initSecurity();
    }
})();
