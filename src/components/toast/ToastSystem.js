/**
 * ToastSystem - Toast Notification Management
 * 
 * Handles creation, display, and removal of toast notifications
 * 
 * @version 1.0.0
 */

export class ToastSystem {
    static container = null;
    static initialized = false;
    static activeToasts = new Map();
    
    /**
     * Initialize the toast system
     */
    static init() {
        if (this.initialized) return;
        
        console.log('🍞 Toast System initializing...');
        
        // Find or create toast container
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            console.error('Toast container not found!');
            return;
        }
        
        this.initialized = true;
        console.log('✅ Toast System initialized');
    }
    
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type of toast (success, error, warning, info)
     * @param {number} duration - How long to show the toast in ms
     */
    static show(message, type = 'info', duration = 3000) {
        if (!this.initialized) {
            console.warn('Toast system not initialized, attempting to init...');
            this.init();
        }
        
        if (!this.container) {
            console.error('Cannot show toast - container not found');
            return;
        }
        
        // Create toast element
        const toast = document.createElement('div');
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        toast.id = toastId;
        toast.className = `toast toast-${type} fade-in`;
        
        // Determine icon based on type
        let icon = '';
        switch (type) {
            case 'success':
                icon = '✓';
                break;
            case 'error':
            case 'danger':
                icon = '✕';
                break;
            case 'warning':
                icon = '⚠';
                break;
            case 'info':
            default:
                icon = 'ℹ';
                break;
        }
        
        // Build toast HTML
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;
        
        // Add to container
        this.container.appendChild(toast);
        
        // Force reflow to trigger animation
        toast.offsetHeight;
        
        // Store timeout reference
        const timeoutId = setTimeout(() => {
            this.hide(toastId);
        }, duration);
        
        this.activeToasts.set(toastId, timeoutId);
    }
    
    /**
     * Hide a specific toast
     * @param {string} toastId - The ID of the toast to hide
     */
    static hide(toastId) {
        const toast = document.getElementById(toastId);
        if (!toast) return;
        
        // Add closing animation
        toast.classList.add('toast-closing');
        
        // Remove after animation
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            
            // Clear timeout reference
            const timeoutId = this.activeToasts.get(toastId);
            if (timeoutId) {
                clearTimeout(timeoutId);
                this.activeToasts.delete(toastId);
            }
        }, 200);
    }
    
    /**
     * Hide all active toasts
     */
    static hideAll() {
        for (const [toastId, timeoutId] of this.activeToasts) {
            clearTimeout(timeoutId);
            this.hide(toastId);
        }
    }
}