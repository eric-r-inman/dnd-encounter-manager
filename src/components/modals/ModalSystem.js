/**
 * ModalSystem - Modal Management for D&D Encounter Manager
 * 
 * Handles showing, hiding, and managing modal dialogs
 * 
 * @version 1.1.0
 */

export class ModalSystem {
    static activeModal = null;
    static initialized = false;
    
    /**
     * Initialize the modal system
     */
    static init() {
        if (this.initialized) return;
        
        console.log('📝 Modal System initializing...');
        
        // Set up event listeners for modal interactions
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('✅ Modal System initialized');
    }
    
    /**
     * Set up global event listeners for modal system
     */
    static setupEventListeners() {
        // Handle ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.hideAll();
            }
        });
        
        // Handle clicks on modal overlay to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') && e.target === e.currentTarget) {
                this.hideAll();
            }
        });
    }
    
    /**
     * Show a specific modal
     * @param {string} modalId - The modal identifier
     * @param {Object} options - Optional configuration
     */
    static show(modalId, options = {}) {
        console.log(`📝 Showing modal: ${modalId}`);
        
        // Hide any currently active modal
        if (this.activeModal) {
            this.hide(this.activeModal);
        }
        
        // Find the modal element
        const modalOverlay = document.querySelector(`[data-modal="${modalId}"]`);
        if (!modalOverlay) {
            console.error(`Modal not found: ${modalId}`);
            return;
        }
        
        // Show the modal
        modalOverlay.style.display = 'flex';
        modalOverlay.classList.add('fade-in');
        modalOverlay.classList.remove('modal-closing');
        
        // Set as active modal
        this.activeModal = modalId;
        
        // Focus first input if it's a form modal
        setTimeout(() => {
            const firstInput = modalOverlay.querySelector('input:not([type="hidden"]), select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
        
        // Call any show callbacks
        if (options.onShow) {
            options.onShow(modalOverlay);
        }
    }
    
    /**
     * Hide a specific modal
     * @param {string} modalId - The modal identifier
     */
    static hide(modalId) {
        const modalOverlay = document.querySelector(`[data-modal="${modalId}"]`);
        if (!modalOverlay) return;
        
        // Add closing animation
        modalOverlay.classList.add('modal-closing');
        
        // Hide after animation
        setTimeout(() => {
            modalOverlay.style.display = 'none';
            modalOverlay.classList.remove('modal-closing');
            
            // Clear active modal if it matches
            if (this.activeModal === modalId) {
                this.activeModal = null;
            }
        }, 200);
    }
    
    /**
     * Hide all modals
     */
    static hideAll() {
        console.log('📝 Hiding all modals');
        
        // Find all modal overlays
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            const modalId = modal.getAttribute('data-modal');
            if (modalId) {
                this.hide(modalId);
            }
        });
        
        this.activeModal = null;
    }
    
    /**
     * Check if a modal is currently open
     * @returns {boolean} True if any modal is open
     */
    static isOpen() {
        return this.activeModal !== null;
    }
    
    /**
     * Get the currently active modal ID
     * @returns {string|null} The active modal ID or null
     */
    static getActiveModal() {
        return this.activeModal;
    }
}