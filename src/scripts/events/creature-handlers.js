/**
 * Creature Handlers - Creature database and compendium operations
 *
 * Handles all creature-related actions including:
 * - Opening and viewing creature database
 * - Searching and filtering creatures
 * - Adding creatures to encounters
 * - Editing creatures
 * - Viewing creature stat blocks
 *
 * Extracted from EventCoordinator for better code organization
 *
 * @version 1.0.0
 */

import { DataServices } from '../data-services.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { ModalEvents } from './modal-events.js';
import { CreatureModalEvents } from './creature-modal-events.js';
import { buildStatBlockHTML } from '../renderers/stat-block-renderer.js';
import { escapeHtml } from '../renderers/html-utils.js';
import { STORAGE_KEYS, MODAL_NAMES, TIMING, CREATURE_TYPES } from '../constants.js';

export class CreatureHandlers {
    /**
     * Handle quick view of active creature in combat
     * Opens creature database modal with active creature selected
     */
    static handleQuickViewCreature() {
        // Get the active combatant (whose turn it is)
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const activeCombatant = allCombatants.find(c => c.status.isActive);

        if (!activeCombatant) {
            ToastSystem.show('No active creature in combat', 'info', TIMING.TOAST_SHORT);
            // Still open the modal, but without a selected creature
            const trigger = document.createElement('div');
            ModalEvents.handleModalShow(MODAL_NAMES.CREATURE_DATABASE, trigger);
            return;
        }

        // Get the creature ID from the active combatant
        const creatureId = activeCombatant.creatureId;

        if (!creatureId) {
            ToastSystem.show('Active combatant has no creature ID', 'warning', TIMING.TOAST_SHORT);
            const trigger = document.createElement('div');
            ModalEvents.handleModalShow(MODAL_NAMES.CREATURE_DATABASE, trigger);
            return;
        }

        // Store the creature ID to be selected when modal opens
        const trigger = document.createElement('div');
        trigger.setAttribute('data-selected-creature-id', creatureId);

        console.log(`🔍 Quick View: Opening compendium modal for active creature: ${activeCombatant.name} (${creatureId})`);

        ModalEvents.handleModalShow(MODAL_NAMES.CREATURE_DATABASE, trigger);
    }

    /**
     * Open the creature database modal
     */
    static handleOpenCreatureDatabase() {
        // Create a temporary trigger element to properly initialize modal
        const trigger = document.createElement('div');
        ModalEvents.handleModalShow(MODAL_NAMES.CREATURE_DATABASE, trigger);
    }

    /**
     * View creature stat block in right pane
     * @param {HTMLElement} target - Element with data-creature-id
     */
    static handleViewCreatureStatBlock(target) {
        // Get the creature ID from the clicked element
        const creatureId = target.getAttribute('data-creature-id');

        if (!creatureId) {
            ToastSystem.show('No creature information available', 'info', TIMING.TOAST_SHORT);
            return;
        }

        // Display the creature stat block in the right pane
        CreatureModalEvents.displayCreatureInRightPane(creatureId);
    }

    /**
     * Open the creature type selection modal
     */
    static handleAddNewCreature() {
        // Check if there's a selected creature in the compendium to restore on cancel
        const compendiumModal = document.querySelector(`[data-modal="${MODAL_NAMES.CREATURE_DATABASE}"]`);
        if (compendiumModal) {
            const selectedCreatureId = compendiumModal.getAttribute('data-selected-creature-id');
            if (selectedCreatureId) {
                sessionStorage.setItem(STORAGE_KEYS.EDITING_CREATURE_ID, selectedCreatureId);
            } else {
                sessionStorage.removeItem(STORAGE_KEYS.EDITING_CREATURE_ID);
            }
        }

        ModalSystem.show(MODAL_NAMES.CREATURE_TYPE_SELECTION);
    }

    /**
     * Handle adding a creature from the database to the current encounter
     * @param {HTMLElement} target - The button that was clicked
     */
    static handleAddCreatureToEncounter(target) {
        const creatureId = target.getAttribute('data-creature-id');
        if (!creatureId) {
            console.error('No creature ID found on target');
            return;
        }

        try {
            // Add the creature to the encounter
            const combatantCard = DataServices.combatantManager.addCombatant(creatureId);

            if (combatantCard) {
                ToastSystem.show(`Added ${combatantCard.name} to encounter`, 'success', TIMING.TOAST_SHORT);

                // Close the creature database modal
                ModalSystem.hide(MODAL_NAMES.CREATURE_DATABASE);

                console.log(`✅ Added creature ${creatureId} to encounter`);
            } else {
                ToastSystem.show('Failed to add creature to encounter', 'error', TIMING.TOAST_LONG);
            }
        } catch (error) {
            console.error('Error adding creature to encounter:', error);
            ToastSystem.show('Failed to add creature: ' + error.message, 'error', TIMING.TOAST_LONG);
        }
    }

    /**
     * Handle search input in creature database
     * @param {HTMLElement} target - The search input element
     * @param {Event} event - The input event
     */
    static handleSearchCreatures(target, event) {
        const searchTerm = target.value.toLowerCase().trim();
        const modal = target.closest(`[data-modal="${MODAL_NAMES.CREATURE_DATABASE}"]`);
        if (!modal) return;

        const creatureItems = modal.querySelectorAll('.creature-list-item');
        const visibleCountElement = modal.querySelector('#visible-count');
        let visibleCount = 0;

        creatureItems.forEach(item => {
            const creatureName = item.querySelector('.creature-name')?.textContent.toLowerCase() || '';
            const creatureType = item.querySelector('.creature-type-badge')?.textContent.toLowerCase() || '';
            const creatureStats = item.querySelector('.creature-item-stats')?.textContent.toLowerCase() || '';

            // Check if search term matches name, type, or stats (AC, HP, CR)
            const matches = creatureName.includes(searchTerm) ||
                          creatureType.includes(searchTerm) ||
                          creatureStats.includes(searchTerm);

            if (matches || searchTerm === '') {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        // Update visible count
        if (visibleCountElement) {
            visibleCountElement.textContent = visibleCount;
        }

        console.log(`🔍 Search: "${searchTerm}" - ${visibleCount} creatures visible`);
    }

    /**
     * Handle type filter dropdown in creature database
     * @param {HTMLElement} target - The select element
     */
    static handleFilterCreatureType(target) {
        const filterType = target.value.toLowerCase();
        const modal = target.closest(`[data-modal="${MODAL_NAMES.CREATURE_DATABASE}"]`);
        if (!modal) return;

        const creatureItems = modal.querySelectorAll('.creature-list-item');
        const visibleCountElement = modal.querySelector('#visible-count');
        let visibleCount = 0;

        creatureItems.forEach(item => {
            const creatureTypeBadge = item.querySelector('.creature-type-badge');
            const creatureType = creatureTypeBadge?.textContent.toLowerCase() || '';

            // Show all if "all" is selected, otherwise filter by type
            if (filterType === 'all' || creatureType === filterType) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        // Update visible count
        if (visibleCountElement) {
            visibleCountElement.textContent = visibleCount;
        }

        console.log(`🎯 Filter: "${filterType}" - ${visibleCount} creatures visible`);
    }

    /**
     * Handle editing a creature from the database
     * @param {HTMLElement} target - The edit button
     */
    static handleEditCreature(target) {
        try {
            const modal = target.closest(`[data-modal="${MODAL_NAMES.CREATURE_DATABASE}"]`);
            if (!modal) {
                console.error('❌ Edit creature: Modal not found');
                return;
            }

            const creatureId = modal.getAttribute('data-selected-creature-id');
            if (!creatureId) {
                ToastSystem.show('Please select a creature first', 'warning', TIMING.TOAST_SHORT);
                return;
            }

            console.log(`📝 Editing creature: ${creatureId}`);

            // Get creature from consolidated database
            const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
            const creature = allCreatures.find(c => c.id === creatureId);

            if (!creature) {
                console.error('❌ Creature not found:', creatureId);
                ToastSystem.show('Creature not found', 'error', TIMING.TOAST_SHORT);
                return;
            }

            console.log('📝 Found creature:', creature.name);

            // Store the creature ID for returning to compendium on cancel
            sessionStorage.setItem(STORAGE_KEYS.EDITING_CREATURE_ID, creatureId);

            // Check if this is a player character
            if (creature.type === CREATURE_TYPES.PLAYER) {
                // Populate the player form with existing data
                CreatureModalEvents.setupPlayerFormForEdit(creature);

                // Open the player form modal
                ModalSystem.show(MODAL_NAMES.PLAYER_FORM);
            } else {
                // Populate the creature form with existing data
                CreatureModalEvents.setupCreatureFormForEdit(creature);

                // Open the creature form modal
                ModalSystem.show(MODAL_NAMES.CREATURE_FORM);
            }

            // Close the creature database modal
            ModalSystem.hide(MODAL_NAMES.CREATURE_DATABASE);

        } catch (error) {
            console.error('❌ Error in handleEditCreature:', error);
            ToastSystem.show('Failed to edit creature: ' + error.message, 'error', TIMING.TOAST_LONG);
        }
    }

    /**
     * Handle exporting a creature to JSON
     * @param {HTMLElement} target - The export button
     */
    static handleExportCreature(target) {
        const modal = target.closest(`[data-modal="${MODAL_NAMES.CREATURE_DATABASE}"]`);
        if (!modal) return;

        const creatureId = modal.getAttribute('data-selected-creature-id');
        if (!creatureId) {
            ToastSystem.show('Please select a creature first', 'warning', TIMING.TOAST_SHORT);
            return;
        }

        // Get creature from database
        const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
        const creature = allCreatures.find(c => c.id === creatureId);

        if (!creature) {
            ToastSystem.show('Creature not found', 'error', TIMING.TOAST_SHORT);
            return;
        }

        // Create JSON export
        const exportData = JSON.stringify(creature, null, 2);

        // Create download
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${creature.name.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        ToastSystem.show(`Exported ${creature.name}`, 'success', TIMING.TOAST_SHORT);
        console.log(`📤 Exported creature: ${creature.name}`);
    }

    /**
     * Display stat block preview in import modal
     * @param {Object} creature - Parsed creature object
     */
    static displayStatBlockPreview(creature) {
        const previewDiv = document.getElementById('stat-block-preview');
        if (!previewDiv) return;

        const statBlock = creature.statBlock || {};
        const hasFullStatBlock = creature.hasFullStatBlock && statBlock;

        // Use centralized renderer for consistency
        const html = `
            <div class="creature-details-header">
                <h3>${escapeHtml(creature.name)}</h3>
                <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
            </div>
            ${buildStatBlockHTML(creature, statBlock, hasFullStatBlock)}
        `;

        previewDiv.innerHTML = html;
    }

    /**
     * Handle sort/filter dropdown change
     * @param {HTMLElement} target - The select element
     */
    static handleSortFilterChange(target) {
        const sortType = target.value;
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        // Hide all optional filter panels
        const crRangeFilter = modal.querySelector('#cr-range-filter');
        if (crRangeFilter) crRangeFilter.style.display = 'none';

        // Show CR filter panel if selected
        if (sortType === 'by-cr' && crRangeFilter) {
            crRangeFilter.style.display = 'block';
        }

        // Apply sorting (type filter is always applied)
        this.applySortAndFilter(modal, sortType);
    }

    /**
     * Apply sorting and filtering to creature list
     * @param {HTMLElement} modal - The modal element
     * @param {string} sortType - Type of sort to apply
     * @param {Object} filters - Additional filters
     */
    static applySortAndFilter(modal, sortType, filters = {}) {
        const creatureItems = Array.from(modal.querySelectorAll('.creature-list-item'));
        const container = modal.querySelector('.creature-list-viewport');
        if (!container) return;

        // Apply filters first
        let filteredItems = [...creatureItems];

        // Always apply type filter (independent of sort method)
        const typeCheckboxes = modal.querySelectorAll('input[name="type-filter"]:checked');
        const selectedTypes = Array.from(typeCheckboxes).map(cb => cb.value);

        filteredItems = filteredItems.filter(item => {
            const typeBadge = item.querySelector('.creature-type-badge');
            const type = typeBadge?.textContent.toLowerCase();
            return selectedTypes.includes(type);
        });

        // Apply CR range filter if active
        if (filters.crMin !== undefined || filters.crMax !== undefined) {
            filteredItems = filteredItems.filter(item => {
                const crText = item.querySelector('.creature-item-stats')?.textContent;
                const crMatch = crText?.match(/CR:\s*([0-9./]+)/);
                if (!crMatch) return true; // Include if no CR info

                const cr = this.parseCR(crMatch[1]);
                if (filters.crMin !== undefined && cr < filters.crMin) return false;
                if (filters.crMax !== undefined && cr > filters.crMax) return false;
                return true;
            });
        }

        // Sort items
        let sortedItems = [...filteredItems];

        switch (sortType) {
            case 'alphabetical':
            case 'default':
                sortedItems.sort((a, b) => {
                    const nameA = a.querySelector('.creature-name')?.textContent || '';
                    const nameB = b.querySelector('.creature-name')?.textContent || '';
                    return nameA.localeCompare(nameB);
                });
                break;

            case 'by-cr':
                sortedItems.sort((a, b) => {
                    const crA = this.getCreatureCR(a);
                    const crB = this.getCreatureCR(b);
                    return crA - crB;
                });
                break;

            case 'newest':
                sortedItems.sort((a, b) => {
                    // Custom creatures have data-created attribute, base creatures don't
                    const createdA = a.getAttribute('data-created') || '0';
                    const createdB = b.getAttribute('data-created') || '0';
                    return parseInt(createdB) - parseInt(createdA);
                });
                break;
        }

        // Show/hide items
        creatureItems.forEach(item => {
            if (sortedItems.includes(item)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        // Reorder items in container
        sortedItems.forEach(item => container.appendChild(item));

        // Update visible count
        const visibleCount = modal.querySelector('#visible-count');
        if (visibleCount) {
            visibleCount.textContent = sortedItems.length;
        }

        console.log(`🔄 Applied ${sortType} sort, showing ${sortedItems.length} creatures`);
    }

    /**
     * Parse CR string to number
     * @param {string} crString - CR string like "1/2", "3", "24"
     * @returns {number} Numeric CR value
     */
    static parseCR(crString) {
        if (crString.includes('/')) {
            const [numerator, denominator] = crString.split('/').map(Number);
            return numerator / denominator;
        }
        return Number(crString) || 0;
    }

    /**
     * Get CR value from creature list item
     * @param {HTMLElement} item - Creature list item
     * @returns {number} CR value
     */
    static getCreatureCR(item) {
        const crText = item.querySelector('.creature-item-stats')?.textContent;
        const crMatch = crText?.match(/CR:\s*([0-9./]+)/);
        return crMatch ? this.parseCR(crMatch[1]) : 0;
    }

    /**
     * Handle CR filter apply
     * @param {HTMLElement} target - Apply button
     */
    static handleApplyCRFilter(target) {
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        const crMin = parseFloat(modal.querySelector('#cr-min')?.value);
        const crMax = parseFloat(modal.querySelector('#cr-max')?.value);

        this.applySortAndFilter(modal, 'by-cr', {
            crMin: isNaN(crMin) ? undefined : crMin,
            crMax: isNaN(crMax) ? undefined : crMax
        });
    }

    /**
     * Handle CR filter clear
     * @param {HTMLElement} target - Clear button
     */
    static handleClearCRFilter(target) {
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        const crMinInput = modal.querySelector('#cr-min');
        const crMaxInput = modal.querySelector('#cr-max');
        if (crMinInput) crMinInput.value = '';
        if (crMaxInput) crMaxInput.value = '';

        this.applySortAndFilter(modal, 'alphabetical');
    }

    /**
     * Handle type filter clear (show all)
     * @param {HTMLElement} target - Clear button
     */
    static handleClearTypeFilter(target) {
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        // Check all type checkboxes
        const typeCheckboxes = modal.querySelectorAll('input[name="type-filter"]');
        typeCheckboxes.forEach(cb => cb.checked = true);

        this.applySortAndFilter(modal, 'by-type');
    }
}
