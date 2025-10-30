/**
 * UIState - UI-specific state management
 *
 * Handles user interface state including:
 * - Modal visibility and current state
 * - Batch selection for multi-target operations
 * - Notification queue management
 * - Form state and validation
 * - View preferences and filters
 *
 * @version 1.0.0
 */

export class UIState {
    /**
     * Initialize UI state with default values
     */
    static init() {
        return {
            selectedCombatants: [],
            activeModal: null,
            modalData: {},
            notifications: [],
            formStates: {},
            preferences: {
                showHealthBars: true,
                showInitiativeOrder: true,
                autoSaveEnabled: true,
                tooltipsEnabled: true
            },
            filters: {
                showPlayers: true,
                showEnemies: true,
                showNPCs: true,
                hideUnconscious: false,
                hideDead: false
            }
        };
    }

    /**
     * Add combatant to batch selection
     * @param {Object} currentState - Current UI state
     * @param {string} combatantId - ID of combatant to select
     * @returns {Object} Updated UI state
     */
    static selectCombatant(currentState, combatantId) {
        const selectedCombatants = [...currentState.selectedCombatants];

        if (!selectedCombatants.includes(combatantId)) {
            selectedCombatants.push(combatantId);
        }

        return {
            ...currentState,
            selectedCombatants
        };
    }

    /**
     * Remove combatant from batch selection
     * @param {Object} currentState - Current UI state
     * @param {string} combatantId - ID of combatant to deselect
     * @returns {Object} Updated UI state
     */
    static deselectCombatant(currentState, combatantId) {
        const selectedCombatants = currentState.selectedCombatants.filter(id => id !== combatantId);

        return {
            ...currentState,
            selectedCombatants
        };
    }

    /**
     * Toggle combatant selection
     * @param {Object} currentState - Current UI state
     * @param {string} combatantId - ID of combatant to toggle
     * @returns {Object} Updated UI state
     */
    static toggleCombatantSelection(currentState, combatantId) {
        if (currentState.selectedCombatants.includes(combatantId)) {
            return this.deselectCombatant(currentState, combatantId);
        } else {
            return this.selectCombatant(currentState, combatantId);
        }
    }

    /**
     * Clear all selected combatants
     * @param {Object} currentState - Current UI state
     * @returns {Object} Updated UI state
     */
    static clearSelection(currentState) {
        return {
            ...currentState,
            selectedCombatants: []
        };
    }

    /**
     * Select all combatants
     * @param {Object} currentState - Current UI state
     * @param {Array} combatantIds - Array of all combatant IDs
     * @returns {Object} Updated UI state
     */
    static selectAll(currentState, combatantIds) {
        return {
            ...currentState,
            selectedCombatants: [...combatantIds]
        };
    }

    /**
     * Show modal with optional data
     * @param {Object} currentState - Current UI state
     * @param {string} modalType - Type of modal to show
     * @param {Object} modalData - Data to pass to modal
     * @returns {Object} Updated UI state
     */
    static showModal(currentState, modalType, modalData = {}) {
        return {
            ...currentState,
            activeModal: modalType,
            modalData: { ...modalData }
        };
    }

    /**
     * Hide current modal
     * @param {Object} currentState - Current UI state
     * @returns {Object} Updated UI state
     */
    static hideModal(currentState) {
        return {
            ...currentState,
            activeModal: null,
            modalData: {}
        };
    }

    /**
     * Add notification to queue
     * @param {Object} currentState - Current UI state
     * @param {Object} notification - Notification object
     * @returns {Object} Updated UI state
     */
    static addNotification(currentState, notification) {
        const notificationData = {
            id: this.generateNotificationId(),
            type: notification.type || 'info',
            message: notification.message,
            duration: notification.duration || 3000,
            timestamp: Date.now(),
            ...notification
        };

        return {
            ...currentState,
            notifications: [...currentState.notifications, notificationData]
        };
    }

    /**
     * Remove notification from queue
     * @param {Object} currentState - Current UI state
     * @param {string} notificationId - ID of notification to remove
     * @returns {Object} Updated UI state
     */
    static removeNotification(currentState, notificationId) {
        return {
            ...currentState,
            notifications: currentState.notifications.filter(n => n.id !== notificationId)
        };
    }

    /**
     * Clear all notifications
     * @param {Object} currentState - Current UI state
     * @returns {Object} Updated UI state
     */
    static clearNotifications(currentState) {
        return {
            ...currentState,
            notifications: []
        };
    }

    /**
     * Update form state
     * @param {Object} currentState - Current UI state
     * @param {string} formId - ID of the form
     * @param {Object} formData - Form data to store
     * @returns {Object} Updated UI state
     */
    static updateFormState(currentState, formId, formData) {
        return {
            ...currentState,
            formStates: {
                ...currentState.formStates,
                [formId]: { ...formData }
            }
        };
    }

    /**
     * Clear form state
     * @param {Object} currentState - Current UI state
     * @param {string} formId - ID of the form to clear
     * @returns {Object} Updated UI state
     */
    static clearFormState(currentState, formId) {
        const formStates = { ...currentState.formStates };
        delete formStates[formId];

        return {
            ...currentState,
            formStates
        };
    }

    /**
     * Update user preference
     * @param {Object} currentState - Current UI state
     * @param {string} key - Preference key
     * @param {*} value - Preference value
     * @returns {Object} Updated UI state
     */
    static updatePreference(currentState, key, value) {
        return {
            ...currentState,
            preferences: {
                ...currentState.preferences,
                [key]: value
            }
        };
    }

    /**
     * Update filter setting
     * @param {Object} currentState - Current UI state
     * @param {string} key - Filter key
     * @param {*} value - Filter value
     * @returns {Object} Updated UI state
     */
    static updateFilter(currentState, key, value) {
        return {
            ...currentState,
            filters: {
                ...currentState.filters,
                [key]: value
            }
        };
    }

    /**
     * Get currently selected combatants count
     * @param {Object} uiState - Current UI state
     * @returns {number} Number of selected combatants
     */
    static getSelectedCount(uiState) {
        return uiState.selectedCombatants.length;
    }

    /**
     * Check if combatant is selected
     * @param {Object} uiState - Current UI state
     * @param {string} combatantId - ID of combatant to check
     * @returns {boolean} True if combatant is selected
     */
    static isCombatantSelected(uiState, combatantId) {
        return uiState.selectedCombatants.includes(combatantId);
    }

    /**
     * Check if modal is currently active
     * @param {Object} uiState - Current UI state
     * @param {string} modalType - Type of modal to check (optional)
     * @returns {boolean} True if modal is active
     */
    static isModalActive(uiState, modalType = null) {
        if (modalType) {
            return uiState.activeModal === modalType;
        }
        return uiState.activeModal !== null;
    }

    /**
     * Get active notifications (not expired)
     * @param {Object} uiState - Current UI state
     * @returns {Array} Active notifications
     */
    static getActiveNotifications(uiState) {
        const now = Date.now();
        return uiState.notifications.filter(notification => {
            const isExpired = (now - notification.timestamp) > notification.duration;
            return !isExpired;
        });
    }

    /**
     * Generate unique notification ID
     * @returns {string} Unique notification ID
     */
    static generateNotificationId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate UI state integrity
     * @param {Object} uiState - UI state to validate
     * @returns {Object} Validation result with isValid and errors
     */
    static validateState(uiState) {
        const errors = [];

        if (!uiState) {
            errors.push('UI state is null or undefined');
            return { isValid: false, errors };
        }

        if (!Array.isArray(uiState.selectedCombatants)) {
            errors.push('selectedCombatants must be an array');
        }

        if (!Array.isArray(uiState.notifications)) {
            errors.push('notifications must be an array');
        }

        if (typeof uiState.formStates !== 'object') {
            errors.push('formStates must be an object');
        }

        if (typeof uiState.preferences !== 'object') {
            errors.push('preferences must be an object');
        }

        if (typeof uiState.filters !== 'object') {
            errors.push('filters must be an object');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Reset UI state to defaults
     * @returns {Object} Default UI state
     */
    static reset() {
        return this.init();
    }

    /**
     * Get form data for a specific form
     * @param {Object} uiState - Current UI state
     * @param {string} formId - ID of the form
     * @returns {Object|null} Form data or null if not found
     */
    static getFormState(uiState, formId) {
        return uiState.formStates[formId] || null;
    }

    /**
     * Filter combatants based on current filters
     * @param {Object} uiState - Current UI state
     * @param {Array} combatants - Array of combatants to filter
     * @returns {Array} Filtered combatants
     */
    static filterCombatants(uiState, combatants) {
        const { filters } = uiState;

        return combatants.filter(combatant => {
            // Type filters
            if (!filters.showPlayers && combatant.type === 'player') return false;
            if (!filters.showEnemies && combatant.type === 'enemy') return false;
            if (!filters.showNPCs && combatant.type === 'npc') return false;

            // Health state filters
            if (filters.hideUnconscious && combatant.currentHP === 0) return false;
            if (filters.hideDead && combatant.currentHP <= 0 && combatant.maxHP === 0) return false;

            return true;
        });
    }
}