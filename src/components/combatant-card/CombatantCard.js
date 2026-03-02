/**
 * CombatantCard Component
 *
 * Represents a single combatant in the initiative order.
 * Handles rendering, state management, and interactions for one combatant.
 *
 * @class CombatantCard
 * @version 1.0.0
 */

import { FLYING_HEIGHT } from '../../scripts/constants.js';

export class CombatantCard {
    /**
     * Create a new CombatantCard instance
     * @param {Object} creatureData - Base creature data from database
     * @param {Object} instanceData - Instance-specific data (conditions, current HP, etc.)
     * @param {number} orderIndex - Position in initiative order
     */
    constructor(creatureData, instanceData, orderIndex) {
        // Base creature data (from database)
        this.id = `combatant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.creatureId = creatureData.id;
        this.name = instanceData.name || creatureData.name; // Allow instanceData to override name
        this.type = creatureData.type; // player, enemy, npc
        this.ac = creatureData.ac;
        this.maxHP = instanceData.maxHP ?? creatureData.maxHP; // Allow instanceData to override maxHP

        // Store creature abilities for saving throws
        // If creature has a statBlock with abilities, use those; otherwise default to null
        this.abilities = creatureData.statBlock?.abilities || null;

        // Instance-specific data with defaults
        this.initiative = instanceData.initiative ?? 1;
        this.currentHP = instanceData.currentHP ?? creatureData.maxHP;
        this.tempHP = instanceData.tempHP || 0;
        this.orderIndex = orderIndex;
        this.manualOrder = instanceData.manualOrder || null;
        this.nameNote = instanceData.nameNote || '';
        
        // Status flags - handle both nested status object and top-level properties
        this.status = {
            isActive: instanceData.status?.isActive || instanceData.isActive || false,
            holdAction: instanceData.status?.holdAction || instanceData.holdAction || false,
            concentration: instanceData.status?.concentration || instanceData.concentration || false,
            concentrationSpell: instanceData.status?.concentrationSpell || instanceData.concentrationSpell || '',
            hiding: instanceData.status?.hiding || instanceData.hiding || false,
            flying: instanceData.status?.flying || instanceData.flying || false,
            flyingHeight: instanceData.status?.flyingHeight || instanceData.flyingHeight || 0, // Height in feet (0-999)
            cover: instanceData.status?.cover || instanceData.cover || 'none', // none, half, three-quarters, full
            surprised: instanceData.status?.surprised || instanceData.surprised || false
        };
        
        // Conditions and effects arrays
        this.conditions = instanceData.conditions || [];
        this.effects = instanceData.effects || [];
        
        // Notes
        this.notes = instanceData.notes || '';

        // HP History tracking
        this.damageHistory = instanceData.damageHistory || [];
        this.healHistory = instanceData.healHistory || [];
        this.tempHPHistory = instanceData.tempHPHistory || [];

        // Death saving throws (array of 3 booleans: false = circle, true = skull)
        this.deathSaves = instanceData.deathSaves || [false, false, false];
        
        // DOM element reference
        this.element = null;
        
        // Track if this card is selected for batch operations
        this.isSelected = false;

        // Auto-roll configuration
        this.autoRoll = instanceData.autoRoll || null; // { formula: "1d20+5", trigger: "start"|"end", lastResult: null }

        // Bind methods to preserve context
        this.render = this.render.bind(this);
        this.update = this.update.bind(this);
        this.destroy = this.destroy.bind(this);
    }

    /**
     * Check if creature is dead (all 3 death saves failed)
     * @returns {boolean} True if all 3 death saves are failed
     */
    isDead() {
        return this.deathSaves.every(save => save === true);
    }

    /**
     * Get current health state
     * @returns {string} 'healthy', 'bloodied', 'unconscious', or 'dead'
     */
    getHealthState() {
        if (this.currentHP <= 0) {
            // If all 3 death saves failed, creature is dead
            if (this.isDead()) {
                return 'dead';
            }
            // Otherwise, creature is unconscious at 0 HP
            return 'unconscious';
        } else if (this.currentHP <= this.maxHP / 2) {
            return 'bloodied';
        }
        return 'healthy';
    }

    /**
     * Get ability modifier for a specific ability
     * @param {string} ability - Ability name (str, dex, con, int, wis, cha)
     * @returns {number} The ability modifier, or 0 if not found
     */
    getAbilityModifier(ability) {
        // Check if abilities exist and has the requested ability
        if (this.abilities && this.abilities[ability.toLowerCase()]) {
            return this.abilities[ability.toLowerCase()].modifier || 0;
        }
        // Default to +0 if no ability data
        return 0;
    }
    
    /**
     * Create the DOM element for this combatant card
     * @returns {HTMLElement} The combatant card element
     */
    createElement() {
        const template = document.createElement('div');
        template.className = 'combatant-card fade-in';
        template.setAttribute('data-combatant-id', this.id);
        template.setAttribute('data-combatant-type', this.type);
        template.setAttribute('data-component', 'combatant-card');
        template.setAttribute('data-initiative', this.initiative);
        template.setAttribute('data-health-state', this.getHealthState());
        
        // Add state-based classes
        if (this.status.isActive) {
            template.classList.add('active-in-initiative');
        }
        
        const healthState = this.getHealthState();
        if (healthState === 'unconscious') {
            template.classList.add('combatant-unconscious');
        } else if (healthState === 'dead') {
            template.classList.add('combatant-deceased');
        }
        
        if (this.isSelected) {
            template.classList.add('batch-selected');
        }
        
        // Build inner HTML structure
        template.innerHTML = this.getCardHTML();
        
        this.element = template;
        return template;
    }
    
    /**
     * Generate simplified HTML for placeholder cards
     * @returns {string} HTML string for placeholder card content
     */
    getPlaceholderHTML() {
        // Build timer badge HTML if timer exists
        const timerHTML = this.timer ? `
            <span class="placeholder-timer-badge">
                <span class="timer-name-text"
                      data-action="edit-timer"
                      title="Click to edit timer">
                    Timer
                </span>
                <span class="timer-duration-counter ${this.timer.duration === 'infinite' ? 'duration-permanent' : 'duration-remaining'}">
                    ${this.timer.duration === 'infinite' ? '∞' : this.timer.duration}
                </span>
                ${this.timer.note ? `<span class="timer-note">(${this.timer.note})</span>` : ''}
                <button class="timer-clear" title="Clear timer" data-action="clear-timer">×</button>
            </span>
        ` : '';

        return `
            <div class="combatant-content placeholder-card">
                <div class="combatant-order-controls">
                    <div class="batch-select-checkbox" style="visibility: hidden;">
                        <input type="checkbox" disabled>
                    </div>
                    <button class="order-btn order-up" data-action="move-combatant-up-initiative">↑</button>
                    <button class="order-btn order-down" data-action="move-combatant-down-initiative">↓</button>
                </div>
                <div class="combatant-main">
                    <button class="combatant-set-active-button" title="Set as active" data-action="set-active-combatant">←</button>
                    <button class="combatant-remove-button" title="Remove placeholder" data-action="remove-combatant-from-encounter">×</button>
                    <div class="combatant-header">
                        <div class="initiative-circle editable-initiative" data-action="edit-combatant-initiative">
                            <span class="initiative-value">${this.initiative}</span>
                        </div>
                        <h3 class="combatant-name placeholder-name">Placeholder</h3>
                        <div class="placeholder-timer-container">
                            ${timerHTML}
                        </div>
                    </div>
                    <div class="combatant-body">
                        <div class="placeholder-text-fields">
                            <input type="text"
                                   class="placeholder-line"
                                   data-action="edit-placeholder-line"
                                   placeholder="Add text..."
                                   value="${this.notes || ''}">
                        </div>
                        <div class="placeholder-actions">
                            <button class="btn btn-sm btn-timer"
                                    data-modal-show="placeholder-timer"
                                    data-modal-target="${this.id}"
                                    title="Set timer">
                                ⏱️ Set Timer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate the inner HTML for the card
     * @returns {string} HTML string for card content
     */
    getCardHTML() {
        // Special rendering for placeholder cards
        if (this.isPlaceholder) {
            return this.getPlaceholderHTML();
        }

        const healthState = this.getHealthState();
        const nameColorClass = `combatant-name-${this.type}`;

        // Determine status emoji
        let statusEmoji = '😠'; // Default combat ready
        if (healthState === 'dead') {
            statusEmoji = '💀'; // Dead takes priority
        } else if (healthState === 'unconscious') {
            statusEmoji = '😞'; // Unconscious
        } else if (this.status.surprised) {
            statusEmoji = '😲'; // Surprised
        } else if (this.status.holdAction) {
            statusEmoji = '✊'; // Hold action
        }
        
        // Build conditions HTML
        const conditionsHTML = this.conditions.map(condition => `
            <span class="combatant-condition-badge">
                <span class="condition-name-text"
                      data-action="edit-condition"
                      data-condition-name="${condition.name}"
                      data-condition-duration="${condition.duration}"
                      data-condition-note="${condition.note || ''}"
                      data-condition-expires-at="${condition.expiresAt || 'start'}"
                      title="Click to edit condition">
                    ${condition.name}
                </span>
                <span class="condition-duration-counter ${condition.duration === 'infinite' ? 'duration-permanent' : 'duration-remaining'}">
                    ${condition.duration === 'infinite' ? '∞' : condition.duration}
                </span>
                ${condition.note ? `<span class="condition-note">(${condition.note})</span>` : ''}
                <button class="condition-clear" title="Clear condition" data-action="clear-condition">×</button>
            </span>
        `).join('');
        
        // Build effects HTML
        const effectsHTML = this.effects.map(effect => `
            <span class="combatant-effect-badge">
                <span class="effect-name-text"
                      data-action="edit-effect"
                      data-effect-name="${effect.name}"
                      data-effect-duration="${effect.duration}"
                      data-effect-note="${effect.note || ''}"
                      data-effect-expires-at="${effect.expiresAt || 'start'}"
                      title="Click to edit effect">
                    ${effect.name}
                </span>
                <span class="effect-duration-counter ${effect.duration === 'infinite' ? 'duration-permanent' : 'duration-remaining'}">
                    ${effect.duration === 'infinite' ? '∞' : effect.duration}
                </span>
                ${effect.note ? `<span class="effect-note">(${effect.note})</span>` : ''}
                <button class="effect-clear" title="Clear effect" data-action="clear-effect">×</button>
            </span>
        `).join('');
        
        // Determine if order controls should show hold action
        const orderControlsClass = this.status.holdAction ? 'combatant-order-controls hold-action' : 'combatant-order-controls';
        
        // Build the complete HTML
        return `
            <div class="combatant-content">
                <div class="${orderControlsClass}">
                    <div class="batch-select-checkbox" title="Shift-Click to select/deselect all">
                        <input type="checkbox"
                               id="select-${this.id}"
                               name="batch-select"
                               value="${this.id}"
                               data-action="toggle-batch-select"
                               ${this.isSelected ? 'checked' : ''}>
                    </div>
                    <button class="order-btn order-up" data-action="move-combatant-up-initiative">↑</button>
                    <button class="order-btn order-down" data-action="move-combatant-down-initiative">↓</button>
                </div>
                <div class="combatant-main">
                    <button class="combatant-set-active-button" title="Set as active combatant" data-action="set-active-combatant">←</button>
                    <button class="combatant-duplicate-button" title="Duplicate combatant" data-action="duplicate-combatant">⎘</button>
                    <button class="combatant-remove-button" title="Remove combatant" data-action="remove-combatant-from-encounter">×</button>
                    <div class="combatant-header">
                        <div class="initiative-circle editable-initiative" data-action="edit-combatant-initiative">
                            <span class="initiative-value">${this.initiative}</span>
                        </div>
                        <span class="surprise-status-indicator" title="Click to toggle surprised" data-action="toggle-surprise-status">${statusEmoji}</span>${(this.status.surprised || healthState === 'unconscious' || healthState === 'dead') ? '<span class="surprised-exclamation">!</span>' : ''}
                        <h3 class="combatant-name ${nameColorClass}"
                            ${this.creatureId ? `data-action="view-creature-stat-block" data-creature-id="${this.creatureId}" title="Click to view stat block in Compendium"` : ''}>
                            ${this.name}${this.nameNote ? ` <span class="combatant-name-note">${this.nameNote}</span>` : ''}
                            <button class="name-note-edit"
                                    title="Edit name note"
                                    data-modal-show="combatant-note"
                                    data-modal-target="${this.id}"
                                    data-note-type="name">✏️</button>
                        </h3>
                        <div class="ac-display editable-ac" data-action="edit-combatant-ac">
                            <span class="ac-label">AC:</span>
                            <span class="ac-value">${this.ac}</span>
                        </div>
                        <div class="combatant-conditions-effects">
                            ${conditionsHTML}
                            ${effectsHTML}
                        </div>
                    </div>
                    <div class="combatant-body">
                        <div class="combatant-stats">
                            <div class="stat-group">
                                <div class="health-points-display">
                                    <span class="current-health">${this.currentHP}</span>
                                    ${this.tempHP > 0 ? `<span class="temporary-health">+${this.tempHP}</span>` : ''}
                                    <span class="hp-separator">/</span>
                                    <span class="maximum-health">${this.maxHP}</span>
                                    ${healthState === 'bloodied' ? '<span class="health-icon bloodied-indicator">🩸</span>' : ''}
                                    ${healthState === 'dead' ? '<span class="health-icon unconscious-death-indicator">💀</span>' : ''}
                                    ${this.currentHP === 0 ? this.getDeathSavesHTML() : ''}
                                    <span class="cover-status-indicator" data-cover-level="${this.status.cover}" title="Click to change cover" data-action="cycle-cover-states">${this.getCoverText()}</span>
                                    <span class="status-separator">|</span>
                                    <span class="concentration-indicator" data-is-concentrating="${this.status.concentration}" title="Click to toggle concentration" data-action="toggle-concentration-status">${this.status.concentration ? 'Concentrating' : 'Not concentrating'}</span>
                                    <span class="status-separator">|</span>
                                    <span class="stealth-indicator" data-is-hiding="${this.status.hiding}" title="Click to toggle hiding" data-action="toggle-stealth-status">${this.status.hiding ? 'Hiding' : 'Not hiding'}</span>
                                    <span class="status-separator">|</span>
                                    <span class="flying-indicator" data-is-flying="${this.status.flying}" title="Click to toggle flying" data-action="toggle-flying-status">${this.status.flying ? 'Flying' : 'Not flying'}</span>
                                    ${this.status.flying ? `
                                        <span class="flying-height-controls">
                                            <button class="flying-height-btn flying-height-down"
                                                data-action="decrement-flying-height"
                                                title="Decrease height by 5 ft"
                                                type="button">▼</button>
                                            <input type="number"
                                                class="flying-height-input"
                                                data-action="edit-flying-height"
                                                value="${this.status.flyingHeight > 0 ? this.status.flyingHeight : ''}"
                                                placeholder=""
                                                min="${FLYING_HEIGHT.MIN}"
                                                max="${FLYING_HEIGHT.MAX}"
                                                title="Flying height in feet">
                                            <button class="flying-height-btn flying-height-up"
                                                data-action="increment-flying-height"
                                                title="Increase height by 5 ft"
                                                type="button">▲</button>
                                            <span class="flying-height-unit">ft</span>
                                            <button class="falling-damage-btn"
                                                data-action="apply-falling-damage"
                                                title="Apply falling damage"
                                                type="button">↯</button>
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="combatant-actions">
                            <div class="btn btn-sm btn-danger editable-action" data-action-type="damage">
                                <span class="action-label">Damage</span>
                            </div>
                            <div class="btn btn-sm btn-success editable-action" data-action-type="heal">
                                <span class="action-label">Heal</span>
                            </div>
                            <div class="btn btn-sm btn-info editable-action" data-action-type="temp-hp">
                                <span class="action-label">Temp HP</span>
                            </div>
                            <button class="btn btn-sm btn-purple" data-modal-show="condition" data-modal-target="${this.id}">Condition</button>
                            <button class="btn btn-sm btn-purple" data-modal-show="effect" data-modal-target="${this.id}">Effect</button>
                            <button class="btn btn-sm ${this.status.holdAction ? 'btn-warning' : 'btn-outline-warning'}"
                                    title="${this.status.holdAction ? 'Release held action' : 'Hold action'}"
                                    data-action="toggle-hold-action">
                                ${this.status.holdAction ? '✊ Holding' : '✋ Hold'}
                            </button>
                            <button class="btn btn-sm btn-secondary btn-icon"
                                    title="Add note"
                                    data-modal-show="combatant-note"
                                    data-modal-target="${this.id}"
                                    data-note-type="general"
                                    style="padding: 0 8px; font-size: 14px;">📝</button>
                            ${this.notes ? `
                                <span class="combatant-note-display">
                                    ${this.notes}
                                    <button class="note-clear" title="Clear note" data-action="clear-note">×</button>
                                </span>
                            ` : ''}
                            <button class="btn btn-sm btn-secondary btn-icon"
                                    title="Set auto-roll"
                                    data-action="open-auto-roll-modal"
                                    data-combatant-id="${this.id}"
                                    style="padding: 0 8px; font-size: 14px;">🎲</button>
                            ${this.autoRoll ? `
                                <span class="auto-roll-display" id="auto-roll-${this.id}">
                                    <span class="auto-roll-formula">${this.autoRoll.formula}</span>
                                    ${this.autoRoll.lastResult ? `<span class="auto-roll-result animated-result">${this.autoRoll.lastResult}</span>` : ''}
                                    <button class="auto-roll-clear" title="Clear auto-roll" data-action="clear-auto-roll">×</button>
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get cover text based on cover level
     * @returns {string} Cover display text
     */
    getCoverText() {
        const coverTexts = {
            'none': 'No cover',
            'half': '½ cover',
            'three-quarters': '¾ cover',
            'full': 'Full cover'
        };
        return coverTexts[this.status.cover] || 'No cover';
    }

    /**
     * Generate HTML for death saving throws
     * @returns {string} HTML string for death saves
     */
    getDeathSavesHTML() {
        return `
            <span class="death-saves-container">
                ${this.deathSaves.map((isFailed, index) => `
                    <span class="death-save-indicator"
                          data-action="toggle-death-save"
                          data-save-index="${index}"
                          title="Click to toggle death save">
                        ${isFailed ? '💀' : '○'}
                    </span>
                `).join('')}
            </span>
        `;
    }
    
    /**
     * Render the card (create if needed, update if exists)
     * @returns {HTMLElement} The card element
     */
    render() {
        if (!this.element) {
            return this.createElement();
        }
        return this.update();
    }
    
    /**
     * Update the existing card element with current data
     * @returns {HTMLElement} The updated card element
     */
    update() {
        if (!this.element) {
            return this.createElement();
        }
        
        // Update data attributes
        this.element.setAttribute('data-initiative', this.initiative);
        this.element.setAttribute('data-health-state', this.getHealthState());
        
        // Update classes
        this.element.classList.toggle('active-in-initiative', this.status.isActive);
        this.element.classList.toggle('combatant-unconscious', this.getHealthState() === 'unconscious');
        this.element.classList.toggle('combatant-deceased', this.getHealthState() === 'dead');
        this.element.classList.toggle('batch-selected', this.isSelected);
        
        // Update inner HTML
        this.element.innerHTML = this.getCardHTML();
        
        return this.element;
    }
    
    /**
     * Get current state data for persistence
     * @returns {Object} Instance data that should be saved
     */
    getInstanceData() {
        return {
            name: this.name, // Save custom name (for duplicates, splits, etc.)
            maxHP: this.maxHP, // Save custom maxHP (for ooze splits, etc.)
            initiative: this.initiative,
            currentHP: this.currentHP,
            tempHP: this.tempHP,
            isActive: this.status.isActive,
            holdAction: this.status.holdAction,
            concentration: this.status.concentration,
            concentrationSpell: this.status.concentrationSpell,
            hiding: this.status.hiding,
            flying: this.status.flying, // Save flying status
            flyingHeight: this.status.flyingHeight, // Save flying height
            cover: this.status.cover,
            surprised: this.status.surprised,
            conditions: this.conditions,
            effects: this.effects,
            notes: this.notes,
            nameNote: this.nameNote,
            manualOrder: this.manualOrder,
            damageHistory: this.damageHistory,
            healHistory: this.healHistory,
            tempHPHistory: this.tempHPHistory,
            deathSaves: this.deathSaves,
            autoRoll: this.autoRoll, // Save auto-roll configuration
            isPlaceholder: this.isPlaceholder || false
        };
    }
    
    /**
     * Update a specific property and re-render if needed
     * @param {string} property - Property path (e.g., 'currentHP', 'status.concentration')
     * @param {*} value - New value
     */
    updateProperty(property, value) {
        // Store old health state for comparison
        const oldHealthState = this.getHealthState();
        
        // Handle nested properties
        const keys = property.split('.');
        let target = this;
        
        for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]];
            if (!target) {
                console.error(`Property path ${property} not found`);
                return;
            }
        }
        
        target[keys[keys.length - 1]] = value;
        
        // Check if health state changed
        const newHealthState = this.getHealthState();
        if (oldHealthState !== newHealthState) {
            console.log(`Health state changed from ${oldHealthState} to ${newHealthState}`);
        }
        
        // Re-render the card
        this.update();
    }

    /**
     * Add an entry to damage history
     * @param {number} amount - Amount of damage
     * @param {number} round - Round number when damage occurred
     * @param {Object} saveInfo - Optional save information
     */
    addDamageHistory(amount, round, saveInfo = null) {
        const entry = {
            amount,
            round,
            timestamp: Date.now()
        };

        // Add save information if provided
        if (saveInfo) {
            entry.saveInfo = {
                success: saveInfo.success,
                ability: saveInfo.ability,
                roll: saveInfo.d20Roll,
                modifier: saveInfo.modifier,
                total: saveInfo.total,
                dc: saveInfo.dc,
                reduction: saveInfo.damageReduction || 0
            };
        }

        this.damageHistory.unshift(entry);
        // Keep only the 5 most recent entries
        this.damageHistory = this.damageHistory.slice(0, 5);
    }

    /**
     * Add an entry to heal history
     * @param {number} amount - Amount healed
     * @param {number} round - Round number when healing occurred
     */
    addHealHistory(amount, round) {
        this.healHistory.unshift({ amount, round, timestamp: Date.now() });
        // Keep only the 5 most recent entries
        this.healHistory = this.healHistory.slice(0, 5);
    }

    /**
     * Add an entry to temp HP history
     * @param {number} amount - Amount of temp HP gained
     * @param {number} round - Round number when temp HP was gained
     */
    addTempHPHistory(amount, round) {
        this.tempHPHistory.unshift({ amount, round, timestamp: Date.now() });
        // Keep only the 5 most recent entries
        this.tempHPHistory = this.tempHPHistory.slice(0, 5);
    }

    /**
     * Clear all HP history
     */
    clearHPHistory() {
        this.damageHistory = [];
        this.healHistory = [];
        this.tempHPHistory = [];
    }
    
    /**
     * Clean up and remove the card
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}