/**
 * ModalLoader - Lazy Loading System for Modals
 *
 * Loads modal HTML templates on-demand to improve initial page load performance.
 * Modals are fetched once and cached in memory for subsequent use.
 *
 * @module components/modals/ModalLoader
 * @version 1.0.0
 */

export class ModalLoader {
    static loadedModals = new Set(); // Track which modals are already loaded
    static loadingPromises = new Map(); // Track in-progress loads to avoid duplicates
    static modalContainer = null; // Container element for modals

    /**
     * Initialize the modal loader
     * @param {HTMLElement} container - Container element for modal templates (defaults to document.body)
     */
    static init(container = document.body) {
        this.modalContainer = container;
        console.log('📦 ModalLoader initialized');
    }

    /**
     * Load a modal template if not already loaded
     * @param {string} modalName - Name of the modal to load (e.g., 'creature-database')
     * @returns {Promise<boolean>} True if loaded successfully, false otherwise
     */
    static async loadModal(modalName) {
        // Already loaded?
        if (this.loadedModals.has(modalName)) {
            console.log(`✅ Modal already loaded: ${modalName}`);
            return true;
        }

        // Currently loading?
        if (this.loadingPromises.has(modalName)) {
            console.log(`⏳ Modal already loading: ${modalName}`);
            return this.loadingPromises.get(modalName);
        }

        // Start loading
        console.log(`📥 Loading modal: ${modalName}`);
        const loadPromise = this._fetchAndInjectModal(modalName);
        this.loadingPromises.set(modalName, loadPromise);

        try {
            await loadPromise;
            this.loadedModals.add(modalName);
            this.loadingPromises.delete(modalName);
            console.log(`✅ Modal loaded: ${modalName}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to load modal ${modalName}:`, error);
            this.loadingPromises.delete(modalName);
            return false;
        }
    }

    /**
     * Fetch modal HTML and inject into DOM
     * @param {string} modalName - Name of the modal
     * @returns {Promise<void>}
     * @private
     */
    static async _fetchAndInjectModal(modalName) {
        const templatePath = `/src/templates/modals/${modalName}.html`;

        try {
            console.log(`🔍 Fetching modal template: ${templatePath}`);
            const response = await fetch(templatePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText} for ${templatePath}`);
            }

            const html = await response.text();
            console.log(`✅ Fetched ${html.length} characters for ${modalName}`);

            // Create a temporary container to parse HTML
            const temp = document.createElement('div');
            temp.innerHTML = html;

            // Extract the modal overlay element
            const modalElement = temp.querySelector(`[data-modal="${modalName}"]`);
            if (!modalElement) {
                throw new Error(`Modal element with data-modal="${modalName}" not found in template`);
            }

            // Force all hiding styles immediately to prevent visibility issues
            // This ensures modals are completely hidden when first injected into DOM
            modalElement.style.setProperty('display', 'none', 'important');
            modalElement.style.setProperty('position', 'fixed', 'important');
            modalElement.style.setProperty('visibility', 'hidden', 'important');
            modalElement.style.setProperty('opacity', '0', 'important');
            modalElement.style.setProperty('width', '0', 'important');
            modalElement.style.setProperty('height', '0', 'important');
            modalElement.style.setProperty('overflow', 'hidden', 'important');
            modalElement.style.setProperty('pointer-events', 'none', 'important');
            modalElement.style.setProperty('z-index', '-9999', 'important');
            modalElement.style.setProperty('top', '0', 'important');
            modalElement.style.setProperty('left', '0', 'important');
            modalElement.style.setProperty('right', '0', 'important');
            modalElement.style.setProperty('bottom', '0', 'important');

            // Inject into DOM
            this.modalContainer.appendChild(modalElement);
            console.log(`✅ Injected modal ${modalName} into DOM with forced hiding`);
        } catch (error) {
            console.error(`❌ Failed to load modal ${modalName}:`, error);
            throw new Error(`Failed to fetch modal template: ${error.message}`);
        }
    }

    /**
     * Preload multiple modals in the background
     * Useful for preloading commonly used modals during idle time
     * @param {string[]} modalNames - Array of modal names to preload
     */
    static async preloadModals(modalNames) {
        console.log(`📥 Preloading ${modalNames.length} modals...`);
        const promises = modalNames.map(name => this.loadModal(name));
        await Promise.allSettled(promises);
        console.log(`✅ Preload complete`);
    }

    /**
     * Check if a modal is already loaded
     * @param {string} modalName - Name of the modal
     * @returns {boolean} True if loaded
     */
    static isLoaded(modalName) {
        return this.loadedModals.has(modalName);
    }

    /**
     * Unload a modal (remove from DOM and cache)
     * Use sparingly - mainly for testing or dynamic modal management
     * @param {string} modalName - Name of the modal to unload
     */
    static unloadModal(modalName) {
        const modalElement = document.querySelector(`[data-modal="${modalName}"]`);
        if (modalElement) {
            modalElement.remove();
            this.loadedModals.delete(modalName);
            console.log(`🗑️ Modal unloaded: ${modalName}`);
        }
    }

    /**
     * Get statistics about loaded modals
     * @returns {Object} Stats object
     */
    static getStats() {
        return {
            loadedCount: this.loadedModals.size,
            loadedModals: Array.from(this.loadedModals),
            currentlyLoading: Array.from(this.loadingPromises.keys())
        };
    }
}
