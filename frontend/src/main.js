/**
 * D&D Encounter Manager - Main Application Entry Point
 * 
 * This file orchestrates the entire application startup sequence.
 * It's responsible for initializing all components, services, and systems.
 * 
 * @author Your Team
 * @version 1.0.0
 */

// Import all CSS files first for proper HMR
import './styles/base.css';
import './styles/layout.css';
import './styles/utilities.css';
import './styles/animations.css';
import './components/combatant-card/combatant-card.css';
import './components/modals/modal-system.css';
import './components/stat-block/stat-block.css';
import './components/toast/toast.css';
// Note: dice-roller.css not needed - dice roller uses standalone HTML with inline styles

// Import core application systems
import { AppCore } from './scripts/app-core.js';
import { StateManager } from './scripts/state-manager.js';
import { DataServices } from './scripts/data-services.js';
import { EventCoordinator } from './scripts/events/index.js';

// Import UI components
import { ToastSystem } from './components/toast/ToastSystem.js';
import { ModalSystem } from './components/modals/ModalSystem.js';

// Import main template as raw HTML string so it works in production builds
// (Vite inlines it into the bundle instead of fetching /src/templates/ at runtime)
import mainTemplateHTML from './templates/index.html?raw';

/**
 * Application initialization and startup sequence
 */
class DnDEncounterManager {
    constructor() {
        this.appCore = null;
        this.isInitialized = false;
        this.startTime = performance.now();
    }

    /**
     * Initialize the entire application
     */
    async init() {
        try {
            console.log('🎲 D&D Encounter Manager initializing...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize core systems in sequence
            await this.initializeCoreServices();
            await this.initializeUIComponents();
            await this.loadInitialData();
            await this.bindEventHandlers();
            await this.loadMainTemplate();
            
            // Hide loading screen and show app
            this.hideLoadingScreen();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Performance logging
            const initTime = performance.now() - this.startTime;
            console.log(`✅ D&D Encounter Manager initialized in ${initTime.toFixed(2)}ms`);
            
            // Show welcome notification
            ToastSystem.show('D&D Encounter Manager Ready!', 'success', 3000);
            
        } catch (error) {
            console.error('❌ Failed to initialize D&D Encounter Manager:', error);
            this.showErrorScreen(error);
        }
    }

    /**
     * Initialize core application services
     */
    async initializeCoreServices() {
        console.log('📊 Initializing core services...');
        
        // Initialize state management
        StateManager.init();
        
        // Initialize data services
        await DataServices.init();
        
        // Initialize core application logic
        this.appCore = new AppCore();
        await this.appCore.init();
        
        console.log('✅ Core services initialized');
    }

    /**
     * Initialize all UI components
     */
    async initializeUIComponents() {
        console.log('🎨 Initializing UI components...');

        // Initialize toast notification system
        ToastSystem.init();

        // Initialize modal system with lazy loading enabled
        ModalSystem.init({ lazyLoading: true });

        // Force hide any existing modal overlays (fixes lazy-loaded modals that may be visible)
        this.forceHideAllModals();

        // Set up observer to auto-hide any new modals added to DOM
        this.setupModalObserver();

        console.log('✅ UI components initialized');
    }

    /**
     * Force hide all modal overlays in the DOM
     * This ensures any lazy-loaded modals are completely hidden
     */
    forceHideAllModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        console.log(`🔍 Looking for modal overlays... found ${modals.length}`);

        if (modals.length > 0) {
            console.log(`🔧 Force-hiding ${modals.length} modal overlays...`);
            modals.forEach(modal => {
                const modalName = modal.getAttribute('data-modal');
                console.log(`  - Hiding modal: ${modalName}`);
                this.applyModalHidingStyles(modal);
            });
            console.log(`✅ All ${modals.length} modals hidden`);
        } else {
            console.log('ℹ️ No modal overlays found in DOM yet');
        }

        // Also check for any divs with data-modal attribute (in case class is missing)
        const dataModalElements = document.querySelectorAll('[data-modal]');
        console.log(`🔍 Found ${dataModalElements.length} elements with data-modal attribute`);
        if (dataModalElements.length > modals.length) {
            console.warn(`⚠️ Warning: Found ${dataModalElements.length - modals.length} elements with data-modal but without .modal-overlay class!`);
            dataModalElements.forEach(el => {
                if (!el.classList.contains('modal-overlay')) {
                    console.warn(`  - Element missing .modal-overlay class:`, el.getAttribute('data-modal'), el);
                    // Apply hiding styles anyway
                    this.applyModalHidingStyles(el);
                }
            });
        }
    }

    /**
     * Apply all hiding styles to a modal element
     * @param {HTMLElement} modal - The modal element to hide
     */
    applyModalHidingStyles(modal) {
        modal.style.setProperty('display', 'none', 'important');
        modal.style.setProperty('position', 'fixed', 'important');
        modal.style.setProperty('visibility', 'hidden', 'important');
        modal.style.setProperty('opacity', '0', 'important');
        modal.style.setProperty('width', '0', 'important');
        modal.style.setProperty('height', '0', 'important');
        modal.style.setProperty('overflow', 'hidden', 'important');
        modal.style.setProperty('pointer-events', 'none', 'important');
        modal.style.setProperty('z-index', '-9999', 'important');
        modal.style.setProperty('top', '0', 'important');
        modal.style.setProperty('left', '0', 'important');
        modal.style.setProperty('right', '0', 'important');
        modal.style.setProperty('bottom', '0', 'important');
    }

    /**
     * Set up MutationObserver to watch for new modal overlays being added to DOM
     * Automatically hides them as they're added
     */
    setupModalObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // Check if the added node is a modal overlay
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList && node.classList.contains('modal-overlay')) {
                            console.log('🔧 New modal detected, applying hiding styles:', node.getAttribute('data-modal'));
                            this.applyModalHidingStyles(node);
                        }
                        // Also check children in case modal was added in a container
                        const childModals = node.querySelectorAll && node.querySelectorAll('.modal-overlay');
                        if (childModals && childModals.length > 0) {
                            childModals.forEach(modal => {
                                console.log('🔧 New modal detected (child), applying hiding styles:', modal.getAttribute('data-modal'));
                                this.applyModalHidingStyles(modal);
                            });
                        }
                    }
                });
            });
        });

        // Start observing document.body for added nodes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('👁️ Modal observer active - will auto-hide new modals');
    }

    /**
     * Load initial application data
     */
    async loadInitialData() {
        console.log('📁 Loading initial data...');
        
        // Load creature database
        await DataServices.loadCreatureDatabase();
        
        // Load reference data (conditions, effects, etc.)
        await DataServices.loadReferenceData();
        
        // Load any saved encounters
        await DataServices.loadSavedEncounters();
        
        console.log('✅ Initial data loaded');
    }

    /**
     * Bind all event handlers
     */
    async bindEventHandlers() {
        console.log('🔗 Binding event handlers...');

        // Initialize global event handling system
        EventCoordinator.init();

        // Make EventCoordinator globally available for tooltip events
        window.EventCoordinator = EventCoordinator;

        console.log('✅ Event handlers bound');
    }

    /**
     * Load the main application template
     */
    async loadMainTemplate() {
        console.log('📄 Loading main template...');

        // Use the bundled template HTML (imported via ?raw at top of file)
        const templateHTML = mainTemplateHTML;

        // Create a temporary container to hold the new content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = templateHTML;

        // Get the app container and clear it properly
        const appContainer = document.getElementById('app');

        // Remove loading screen first
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.remove();
        }

        // Append the new content
        while (tempDiv.firstChild) {
            appContainer.appendChild(tempDiv.firstChild);
        }

        // Initialize components that need DOM to be ready
        await this.appCore.initializePostDOM();

        // Initialize the CombatantManager now that DOM is ready
        await DataServices.initializeCombatantManager();

        console.log('✅ Main template loaded');
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    /**
     * Show error screen if initialization fails
     */
    showErrorScreen(error) {
        const appContainer = document.getElementById('app');
        appContainer.innerHTML = `
            <div class="error-screen">
                <div class="error-content">
                    <h1>⚠️ Application Error</h1>
                    <p>Failed to initialize D&D Encounter Manager</p>
                    <details>
                        <summary>Error Details</summary>
                        <pre>${error.message}\n${error.stack}</pre>
                    </details>
                    <button onclick="location.reload()" class="btn btn-primary">
                        🔄 Reload Application
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Start the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    const app = new DnDEncounterManager();
    await app.init();
    
    // Expose app instance for debugging
    if (import.meta.env.DEV) {
        window.DnDApp = app;
        console.log('🐛 App instance available at window.DnDApp');

        // Expose debug function to manually fix modals
        window.debugModals = () => {
            console.log('🔍 === MODAL DEBUG INFO ===');
            const modals = document.querySelectorAll('.modal-overlay');
            const dataModals = document.querySelectorAll('[data-modal]');

            console.log(`Total elements with .modal-overlay: ${modals.length}`);
            console.log(`Total elements with [data-modal]: ${dataModals.length}`);

            console.log('\n📋 All modal overlays:');
            modals.forEach((modal, i) => {
                const name = modal.getAttribute('data-modal');
                const display = window.getComputedStyle(modal).display;
                const position = window.getComputedStyle(modal).position;
                const visibility = window.getComputedStyle(modal).visibility;
                const opacity = window.getComputedStyle(modal).opacity;
                console.log(`  ${i + 1}. ${name}: display=${display}, position=${position}, visibility=${visibility}, opacity=${opacity}`);
            });

            console.log('\n🔧 Applying hiding styles to all modals...');
            app.forceHideAllModals();

            console.log('\n✅ Debug complete. Run debugModals() again to re-check.');
        };
        console.log('🐛 Run debugModals() to inspect and fix modal visibility');
    }
    window.DataServices = DataServices;
    console.log('🐛 DataServices available at window.DataServices');
});

/**
 * Handle application errors
 */
window.addEventListener('error', (e) => {
    console.error('🚨 Unhandled application error:', e.error);
    ToastSystem.show('An unexpected error occurred', 'error', 5000);
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Unhandled promise rejection:', e.reason);
    ToastSystem.show('An unexpected error occurred', 'error', 5000);
});

/**
 * Hot Module Replacement (HMR) handling for development
 */
if (import.meta.hot) {
    // Accept updates to this module
    import.meta.hot.accept();
    
    // Log HMR events for debugging
    console.log('🔥 HMR enabled for development');
}