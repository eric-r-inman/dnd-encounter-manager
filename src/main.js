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

// Import core application systems
import { AppCore } from './scripts/app-core.js';
import { StateManager } from './scripts/state-manager.js';
import { DataServices } from './scripts/data-services.js';
import { EventCoordinator } from './scripts/events/index.js';

// Import UI components
import { ToastSystem } from './components/toast/ToastSystem.js';
import { ModalSystem } from './components/modals/ModalSystem.js';

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
        
        // Initialize modal system
        ModalSystem.init();
        
        console.log('✅ UI components initialized');
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
        
        // Bind keyboard shortcuts
        this.bindKeyboardShortcuts();
        
        console.log('✅ Event handlers bound');
    }

    /**
     * Load the main application template
     */
    async loadMainTemplate() {
        console.log('📄 Loading main template...');
        
        // Load main application HTML structure
        const templateResponse = await fetch('/src/templates/index.html');
        const templateHTML = await templateResponse.text();
        
        // Insert into app container
        const appContainer = document.getElementById('app');
        appContainer.innerHTML = templateHTML;
        
        // Initialize components that need DOM to be ready
        await this.appCore.initializePostDOM();
        
        // Initialize the CombatantManager now that DOM is ready
        await DataServices.initializeCombatantManager();
        
        console.log('✅ Main template loaded');
    }

    /**
     * Bind global keyboard shortcuts
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'a':
                    e.preventDefault();
                    ModalSystem.show('add-combatant');
                    break;
                case 'n':
                    e.preventDefault();
                    this.appCore.advanceToNextTurn();
                    break;
                case 'r':
                    e.preventDefault();
                    this.appCore.resetCombat();
                    break;
                case 'escape':
                    ModalSystem.hideAll();
                    break;
                case 'd':
                    // Debug: Show application state
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        console.group('🐛 Application Debug State');
                        console.log('State Manager:', StateManager.getState());
                        console.log('App Core:', this.appCore);
                        console.groupEnd();
                    }
                    break;

                    case 'c':
                    if (e.ctrlKey || e.metaKey) {
                        // Ctrl+C is copy, don't interfere
                        return;
                    }
                    e.preventDefault();
                    // TODO: Implement clear encounter in EventCoordinator
                    console.log('Clear encounter - TODO');
                    break;
                            }
                        });
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