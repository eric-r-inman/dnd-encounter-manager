/**
 * ModalEvents - Modal dialog and form submission handling
 *
 * Handles all modal-related functionality including:
 * - Modal show/hide event handling
 * - Form submission routing and validation
 * - Condition and effect form processing
 * - Combatant addition and note management
 * - Batch operation integration with modals
 *
 * @version 1.0.0
 */

import { StateManager } from '../state-manager.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { DataServices } from '../data-services.js';
import { CombatEvents } from './combat-events.js';
import { RecentItems } from './recent-items.js';
import { FormHandlers } from './form-handlers.js';
import { CreatureModalEvents } from './creature-modal-events.js';

export class ModalEvents {
    /**
     * Initialize modal event handlers
     */
    static init() {
        this.setupModalHandlers();
    }

    /**
     * Set up modal show/hide event handlers
     */
    static setupModalHandlers() {
        // Handle modal show events
        document.addEventListener('click', (event) => {
            const modalShow = event.target.getAttribute('data-modal-show');
            if (modalShow) {
                event.preventDefault();
                this.handleModalShow(modalShow, event.target);
            }
        });

        // Handle modal close on overlay click
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-overlay')) {
                event.preventDefault();
                ModalSystem.hideAll();
            }
        });
    }

    /**
     * Handle modal show with target setup
     * @param {string} modalType - Type of modal to show
     * @param {HTMLElement} trigger - Element that triggered the modal
     */
    static async handleModalShow(modalType, trigger) {
        // Show the modal first (this will lazy-load if needed)
        await ModalSystem.show(modalType);

        // Now query for the modal (it should exist after show())
        const modal = document.querySelector(`[data-modal="${modalType}"]`);
        if (!modal) {
            console.error(`Modal ${modalType} not found even after show()`);
            return;
        }

        // Get target combatant ID if specified
        const targetId = trigger.getAttribute('data-modal-target');
        let targetCombatant = null;

        if (targetId) {
            modal.setAttribute('data-current-target', targetId);

            // Update the target name in the modal
            targetCombatant = DataServices.combatantManager.getCombatant(targetId);
            if (targetCombatant) {
                const targetNameElement = modal.querySelector('[data-target-name]');
                if (targetNameElement) {
                    targetNameElement.textContent = targetCombatant.name;
                }
            }
        }

        // Handle specific modal types (some don't need target combatant)
        this.handleSpecificModalSetup(modalType, modal, targetCombatant, trigger);

        // Update batch buttons for applicable modals
        this.updateBatchButtons(modalType, modal);
    }

    /**
     * Handle specific modal setup based on type
     * @param {string} modalType - Type of modal
     * @param {HTMLElement} modal - Modal element
     * @param {Object} targetCombatant - Target combatant object
     * @param {HTMLElement} trigger - Trigger element
     */
    static handleSpecificModalSetup(modalType, modal, targetCombatant, trigger) {
        switch (modalType) {
            case 'add-combatant':
                this.setupAddCombatantModal(modal);
                break;
            case 'creature-database':
                CreatureModalEvents.setupCreatureDatabaseModal(modal, trigger);
                break;
            case 'creature-form':
                CreatureModalEvents.setupCreatureFormForAdd();
                break;
            case 'player-form':
                CreatureModalEvents.setupPlayerFormForAdd();
                break;
            case 'combatant-note':
                this.setupNoteModal(modal, targetCombatant, trigger);
                break;
            case 'effect':
                this.setupEffectModal(modal);
                break;
            case 'condition':
                this.setupConditionModal(modal);
                break;
            case 'stat-block-parser':
                this.setupStatBlockParserModal(modal);
                break;
            case 'placeholder-timer':
                this.setupTimerModal(modal);
                break;
        }
    }

    /**
     * Set up add combatant modal by populating creature dropdown
     * @param {HTMLElement} modal - Modal element
     */
    static async setupAddCombatantModal(modal) {
        const creatureSelect = modal.querySelector('#creature-select');
        if (!creatureSelect) return;

        try {
            // Get creatures from CombatantManager (consolidated database with both JSON and custom creatures)
            const allCreatures = DataServices.combatantManager?.creatureDatabase || [];

            // Get hidden creatures list
            const hiddenCreatures = JSON.parse(localStorage.getItem('dnd-hidden-creatures') || '[]');

            // Filter out hidden creatures
            const creatures = allCreatures.filter(c => !hiddenCreatures.includes(c.id));

            // Clear existing options (except the placeholder)
            const placeholder = creatureSelect.querySelector('option[disabled]');
            creatureSelect.innerHTML = '';
            if (placeholder) {
                creatureSelect.appendChild(placeholder);
            } else {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.disabled = true;
                defaultOption.selected = true;
                defaultOption.textContent = 'Choose a creature...';
                creatureSelect.appendChild(defaultOption);
            }

            // Populate with creatures from Compendium (database + custom)
            if (creatures && creatures.length > 0) {
                creatures.forEach(creature => {
                    const option = document.createElement('option');
                    option.value = creature.id;
                    option.textContent = `${creature.name} (${creature.type.toUpperCase()}) - AC: ${creature.ac}, HP: ${creature.maxHP}`;
                    creatureSelect.appendChild(option);
                });
            }

            console.log(`📝 Populated creature dropdown with ${creatures.length} creatures from Compendium`);
        } catch (error) {
            console.error('Failed to populate creature dropdown:', error);
            ToastSystem.show('Failed to load creatures', 'error');
        }

        // Reset all form fields to default values
        this.resetAddCombatantForm(modal);

        // Setup HP percentage buttons
        this.setupHPPercentageButtons(modal);
    }

    /**
     * Reset all fields in the Add Combatant modal to default values
     * @param {HTMLElement} modal - Modal element
     */
    static resetAddCombatantForm(modal) {
        // Reset initiative to 1
        const initiativeInput = modal.querySelector('#combatant-initiative');
        if (initiativeInput) {
            initiativeInput.value = '1';
        }

        // Clear name note
        const nameNoteInput = modal.querySelector('#combatant-name-note');
        if (nameNoteInput) {
            nameNoteInput.value = '';
        }

        // Clear current HP
        const currentHPInput = modal.querySelector('#combatant-current-hp');
        if (currentHPInput) {
            currentHPInput.value = '';
        }

        // Reset creature selection to placeholder
        const creatureSelect = modal.querySelector('#creature-select');
        if (creatureSelect) {
            creatureSelect.selectedIndex = 0; // Select the "Choose a creature..." option
        }

        // Reset starting condition checkboxes
        const surprisedCheckbox = modal.querySelector('input[name="startingSurprised"]');
        const hidingCheckbox = modal.querySelector('input[name="startingHiding"]');
        if (surprisedCheckbox) surprisedCheckbox.checked = false;
        if (hidingCheckbox) hidingCheckbox.checked = false;
    }

    /**
     * Setup HP percentage buttons for the Add Combatant modal
     * @param {HTMLElement} modal - Modal element
     */
    static setupHPPercentageButtons(modal) {
        const percentageButtons = modal.querySelectorAll('.hp-percentage-btn');
        const currentHPInput = modal.querySelector('#combatant-current-hp');
        const creatureSelect = modal.querySelector('#creature-select');

        percentageButtons.forEach(button => {
            button.addEventListener('click', () => {
                const percentage = parseInt(button.getAttribute('data-percentage'));
                const selectedCreatureId = creatureSelect.value;

                if (!selectedCreatureId) {
                    ToastSystem.show('Please select a creature first', 'warning', 2000);
                    return;
                }

                // Find the selected creature's max HP
                const creatures = DataServices.combatantManager?.creatureDatabase || [];
                const selectedCreature = creatures.find(c => c.id === selectedCreatureId);

                if (!selectedCreature) {
                    ToastSystem.show('Creature not found', 'error', 2000);
                    return;
                }

                // Calculate HP based on percentage
                const maxHP = selectedCreature.maxHP;
                const calculatedHP = Math.floor(maxHP * (percentage / 100));

                // Set the HP input value
                if (currentHPInput) {
                    currentHPInput.value = calculatedHP;
                }
            });
        });
    }

    /**
     * Set up creature database modal by populating creature list
     * @param {HTMLElement} modal - Modal element
     * @param {HTMLElement} trigger - Trigger element (optional, may contain selected creature ID)
     */
    static async setupCreatureDatabaseModal(modal, trigger = null) {
        const creatureListContainer = modal.querySelector('#creature-list .creature-list-viewport');
        const totalCountElement = modal.querySelector('#total-count');
        const visibleCountElement = modal.querySelector('#visible-count');

        if (!creatureListContainer) return;

        // Check if a specific creature should be selected (from Quick View)
        const selectedCreatureId = trigger?.getAttribute('data-selected-creature-id');

        try {
            // Get creatures from CombatantManager (consolidated database with both JSON and custom creatures)
            const allCreatures = DataServices.combatantManager?.creatureDatabase || [];

            // Get hidden creatures list
            const hiddenCreatures = JSON.parse(localStorage.getItem('dnd-hidden-creatures') || '[]');

            // Filter out hidden creatures
            const creatures = allCreatures.filter(c => !hiddenCreatures.includes(c.id));

            // Clear existing placeholder content
            creatureListContainer.innerHTML = '';

            // Update counts
            if (totalCountElement) totalCountElement.textContent = creatures.length;
            if (visibleCountElement) visibleCountElement.textContent = creatures.length;

            // Populate with real creatures from database
            if (creatures && creatures.length > 0) {
                creatures.forEach(creature => {
                    const creatureItem = document.createElement('div');
                    creatureItem.className = 'creature-list-item';
                    creatureItem.setAttribute('data-creature-id', creature.id);

                    creatureItem.innerHTML = `
                        <div class="creature-item-header">
                            <span class="creature-name creature-name-${creature.type}">${creature.name}</span>
                            <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
                        </div>
                        <div class="creature-item-stats">
                            <span class="creature-stat">AC: ${creature.ac}</span>
                            <span class="creature-stat">HP: ${creature.maxHP}</span>
                            <span class="creature-stat">CR: ${creature.cr || 'Unknown'}</span>
                        </div>
                    `;

                    // Add click handler for creature selection
                    creatureItem.addEventListener('click', () => {
                        // Remove active class from other items
                        modal.querySelectorAll('.creature-list-item').forEach(item => {
                            item.classList.remove('active');
                        });

                        // Add active class to clicked item
                        creatureItem.classList.add('active');

                        // Update details pane
                        this.updateCreatureDetails(modal, creature);
                    });

                    creatureListContainer.appendChild(creatureItem);
                });

                // If a specific creature should be selected (Quick View), select it now
                if (selectedCreatureId) {
                    // Use setTimeout to ensure DOM is fully updated
                    setTimeout(() => {
                        const selectedItem = modal.querySelector(`.creature-list-item[data-creature-id="${selectedCreatureId}"]`);
                        if (selectedItem) {
                            // Remove active from all items
                            modal.querySelectorAll('.creature-list-item').forEach(item => {
                                item.classList.remove('active');
                            });

                            // Add active to selected item
                            selectedItem.classList.add('active');

                            // Find the creature data
                            const selectedCreature = creatures.find(c => c.id === selectedCreatureId);
                            if (selectedCreature) {
                                // Update details pane
                                this.updateCreatureDetails(modal, selectedCreature);

                                // Scroll the selected item into view
                                selectedItem.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center'
                                });

                                console.log(`🔍 Quick View: Selected creature "${selectedCreature.name}" in compendium`);
                            }
                        } else {
                            console.warn(`Quick View: Creature with ID "${selectedCreatureId}" not found in compendium`);
                            ToastSystem.show('Creature not found in compendium', 'warning', 2000);
                        }
                    }, 100);
                }
            } else {
                creatureListContainer.innerHTML = '<div class="no-creatures">No creatures found in database.</div>';
            }

            console.log(`📝 Populated creature database with ${creatures.length} creatures`);
        } catch (error) {
            console.error('Failed to populate creature database:', error);
            ToastSystem.show('Failed to load creature database', 'error');
        }
    }

    /**
     * Update creature details pane
     * @param {HTMLElement} modal - Modal element
     * @param {Object} creature - Selected creature data
     */
    static updateCreatureDetails(modal, creature) {
        const detailsPane = modal.querySelector('.creature-details-column');
        if (!detailsPane) return;

        // Store creature ID on the modal for later use
        modal.setAttribute('data-selected-creature-id', creature.id);

        // Check if this is a custom creature (marked during database load)
        const isCustom = creature.isCustom === true;

        // Get stat block if available
        const statBlock = creature.statBlock || {};
        const hasFullStatBlock = creature.hasFullStatBlock && statBlock;

        // Build sticky action buttons at the top
        let html = `
            <div class="creature-actions-sticky">
                <button class="btn btn-primary"
                        data-action="add-creature-to-encounter"
                        data-creature-id="${creature.id}">
                    ➕ Add to Encounter
                </button>
                <button class="btn btn-secondary"
                        data-action="edit-creature"
                        data-creature-id="${creature.id}">
                    ✏️ Edit
                </button>
                <button class="btn btn-secondary"
                        data-action="duplicate-creature"
                        data-creature-id="${creature.id}">
                    📋 Duplicate
                </button>
                <button class="btn btn-secondary"
                        data-action="delete-creature"
                        data-creature-id="${creature.id}">
                    🗑️
                </button>
            </div>
            <div class="creature-details-scrollable">
                <div class="creature-details-header creature-details-header-minimal">
                    <h3>${creature.name}</h3>
                    <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
                </div>
        `;

        // Full type description
        if (hasFullStatBlock && statBlock.fullType) {
            html += `<div class="stat-block-section">
                <p class="creature-full-type">${statBlock.fullType}</p>
            </div>`;
        } else if (creature.size || creature.race || creature.alignment) {
            const parts = [];
            if (creature.size) parts.push(creature.size);
            if (creature.race) parts.push(creature.race);
            if (creature.subrace) parts.push(`(${creature.subrace})`);
            if (creature.alignment) parts.push(`, ${creature.alignment}`);
            html += `<div class="stat-block-section">
                <p class="creature-full-type">${parts.join(' ')}</p>
            </div>`;
        }

        // Armor Class
        html += `<div class="stat-block-section">`;
        if (hasFullStatBlock && statBlock.armorClass) {
            html += `<p><strong>Armor Class</strong> ${statBlock.armorClass.value}`;
            if (statBlock.armorClass.type) html += ` (${statBlock.armorClass.type})`;
            html += `</p>`;
        } else {
            html += `<p><strong>Armor Class</strong> ${creature.ac}</p>`;
        }

        // Hit Points
        if (hasFullStatBlock && statBlock.hitPoints) {
            html += `<p><strong>Hit Points</strong> ${statBlock.hitPoints.average}`;
            if (statBlock.hitPoints.formula) html += ` (${statBlock.hitPoints.formula})`;
            html += `</p>`;
        } else {
            html += `<p><strong>Hit Points</strong> ${creature.maxHP}</p>`;
        }

        // Speed
        if (hasFullStatBlock && statBlock.speed) {
            const speeds = [];
            if (statBlock.speed.walk) speeds.push(`${statBlock.speed.walk} ft.`);
            if (statBlock.speed.burrow) speeds.push(`burrow ${statBlock.speed.burrow} ft.`);
            if (statBlock.speed.climb) speeds.push(`climb ${statBlock.speed.climb} ft.`);
            if (statBlock.speed.fly) {
                speeds.push(`fly ${statBlock.speed.fly} ft.${statBlock.speed.hover ? ' (hover)' : ''}`);
            }
            if (statBlock.speed.swim) speeds.push(`swim ${statBlock.speed.swim} ft.`);
            if (speeds.length > 0) {
                html += `<p><strong>Speed</strong> ${speeds.join(', ')}</p>`;
            }
        }
        html += `</div>`;

        // Ability Scores
        if (hasFullStatBlock && statBlock.abilities) {
            html += `<div class="stat-block-section">
                <table class="ability-scores-table">
                    <thead>
                        <tr>
                            <th>STR</th>
                            <th>DEX</th>
                            <th>CON</th>
                            <th>INT</th>
                            <th>WIS</th>
                            <th>CHA</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${statBlock.abilities.str.score} (${this.formatModifier(statBlock.abilities.str.modifier)})</td>
                            <td>${statBlock.abilities.dex.score} (${this.formatModifier(statBlock.abilities.dex.modifier)})</td>
                            <td>${statBlock.abilities.con.score} (${this.formatModifier(statBlock.abilities.con.modifier)})</td>
                            <td>${statBlock.abilities.int.score} (${this.formatModifier(statBlock.abilities.int.modifier)})</td>
                            <td>${statBlock.abilities.wis.score} (${this.formatModifier(statBlock.abilities.wis.modifier)})</td>
                            <td>${statBlock.abilities.cha.score} (${this.formatModifier(statBlock.abilities.cha.modifier)})</td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
        }

        // Combined stat section (Saves, Skills, Resistances, Senses, Languages, CR)
        html += `<div class="stat-block-section stat-block-condensed">`;

        // Saving Throws
        if (hasFullStatBlock && statBlock.savingThrows) {
            const saves = [];
            for (const [ability, bonus] of Object.entries(statBlock.savingThrows)) {
                if (bonus !== null && bonus !== undefined) {
                    saves.push(`${ability.toUpperCase()} ${this.formatModifier(bonus)}`);
                }
            }
            if (saves.length > 0) {
                html += `<p><strong>Saving Throws</strong> ${saves.join(', ')}</p>`;
            }
        }

        // Skills
        if (hasFullStatBlock && statBlock.skills && Object.keys(statBlock.skills).length > 0) {
            const skills = [];
            for (const [skill, bonus] of Object.entries(statBlock.skills)) {
                const skillName = skill.replace(/([A-Z])/g, ' $1').trim();
                const capitalizedSkill = skillName.charAt(0).toUpperCase() + skillName.slice(1);
                skills.push(`${capitalizedSkill} ${this.formatModifier(bonus)}`);
            }
            html += `<p><strong>Skills</strong> ${skills.join(', ')}</p>`;
        }

        // Damage Vulnerabilities
        if (hasFullStatBlock && statBlock.damageVulnerabilities && statBlock.damageVulnerabilities.length > 0) {
            html += `<p><strong>Damage Vulnerabilities</strong> ${statBlock.damageVulnerabilities.join(', ')}</p>`;
        }

        // Damage Resistances
        if (hasFullStatBlock && statBlock.damageResistances && statBlock.damageResistances.length > 0) {
            html += `<p><strong>Damage Resistances</strong> ${statBlock.damageResistances.join(', ')}</p>`;
        }

        // Damage Immunities
        if (hasFullStatBlock && statBlock.damageImmunities && statBlock.damageImmunities.length > 0) {
            html += `<p><strong>Damage Immunities</strong> ${statBlock.damageImmunities.join(', ')}</p>`;
        }

        // Condition Immunities
        if (hasFullStatBlock && statBlock.conditionImmunities && statBlock.conditionImmunities.length > 0) {
            html += `<p><strong>Condition Immunities</strong> ${statBlock.conditionImmunities.join(', ')}</p>`;
        }

        // Senses
        if (hasFullStatBlock && statBlock.senses) {
            const senses = [];
            if (statBlock.senses.blindsight) senses.push(`Blindsight ${statBlock.senses.blindsight} ft.`);
            if (statBlock.senses.darkvision) senses.push(`Darkvision ${statBlock.senses.darkvision} ft.`);
            if (statBlock.senses.tremorsense) senses.push(`Tremorsense ${statBlock.senses.tremorsense} ft.`);
            if (statBlock.senses.truesight) senses.push(`Truesight ${statBlock.senses.truesight} ft.`);
            if (statBlock.senses.passivePerception) senses.push(`Passive Perception ${statBlock.senses.passivePerception}`);
            if (senses.length > 0) {
                html += `<p><strong>Senses</strong> ${senses.join(', ')}</p>`;
            }
        }

        // Languages
        if (hasFullStatBlock && statBlock.languages && statBlock.languages.length > 0) {
            html += `<p><strong>Languages</strong> ${statBlock.languages.join(', ')}</p>`;
        }

        // Challenge Rating
        if (hasFullStatBlock && statBlock.challengeRating) {
            html += `<p><strong>CR</strong> ${statBlock.challengeRating.cr}`;
            if (statBlock.challengeRating.xp) html += ` (${statBlock.challengeRating.xp.toLocaleString()} XP`;
            if (statBlock.challengeRating.xpInLair) html += `, or ${statBlock.challengeRating.xpInLair.toLocaleString()} in lair`;
            if (statBlock.challengeRating.proficiencyBonus) html += `; PB +${statBlock.challengeRating.proficiencyBonus}`;
            html += `)</p>`;
        } else if (creature.cr) {
            html += `<p><strong>CR</strong> ${creature.cr}</p>`;
        }

        html += `</div>`;

        // Traits
        if (hasFullStatBlock && statBlock.traits && statBlock.traits.length > 0) {
            html += `<div class="stat-block-section stat-block-traits">`;
            statBlock.traits.forEach(trait => {
                html += `<p><strong><em>${trait.name}.</em></strong> ${trait.description}</p>`;
            });
            html += `</div>`;
        }

        // Actions
        if (hasFullStatBlock && statBlock.actions && statBlock.actions.length > 0) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Actions</h4>`;
            statBlock.actions.forEach(action => {
                html += `<p><strong><em>${action.name}.</em></strong> ${action.description}</p>`;
            });
            html += `</div>`;
        }

        // Reactions
        if (hasFullStatBlock && statBlock.reactions && statBlock.reactions.length > 0) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Reactions</h4>`;
            statBlock.reactions.forEach(reaction => {
                html += `<p><strong><em>${reaction.name}.</em></strong> ${reaction.description}</p>`;
            });
            html += `</div>`;
        }

        // Legendary Actions
        if (hasFullStatBlock && statBlock.legendaryActions && statBlock.legendaryActions.options) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Legendary Actions</h4>`;
            if (statBlock.legendaryActions.description) {
                html += `<p>${statBlock.legendaryActions.description}</p>`;
            }
            statBlock.legendaryActions.options.forEach(option => {
                html += `<p><strong><em>${option.name}`;
                if (option.cost && option.cost > 1) html += ` (Costs ${option.cost} Actions)`;
                html += `.</em></strong> ${option.description}</p>`;
            });
            html += `</div>`;
        }

        // Lair Actions
        if (hasFullStatBlock && statBlock.lairActions) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Lair Actions</h4>`;
            if (statBlock.lairActions.description) {
                html += `<p>${statBlock.lairActions.description}</p>`;
            }
            if (statBlock.lairActions.options && statBlock.lairActions.options.length > 0) {
                statBlock.lairActions.options.forEach(option => {
                    html += `<p><strong><em>${option.name}.</em></strong> ${option.description}</p>`;
                });
            }
            html += `</div>`;
        }

        // Regional Effects
        if (hasFullStatBlock && statBlock.regionalEffects) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Regional Effects</h4>`;
            if (statBlock.regionalEffects.description) {
                html += `<p>${statBlock.regionalEffects.description}</p>`;
            }
            if (statBlock.regionalEffects.effects && statBlock.regionalEffects.effects.length > 0) {
                statBlock.regionalEffects.effects.forEach(effect => {
                    html += `<p><strong><em>${effect.name}.</em></strong> ${effect.description}</p>`;
                });
            }
            html += `</div>`;
        }

        // Spellcasting
        if (hasFullStatBlock && statBlock.spellcasting) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Spellcasting</h4>`;
            if (statBlock.spellcasting.description) {
                html += `<p>${statBlock.spellcasting.description}</p>`;
            }

            if (statBlock.spellcasting.spells) {
                // At-will spells
                if (statBlock.spellcasting.spells.atWill && statBlock.spellcasting.spells.atWill.length > 0) {
                    const spellNames = statBlock.spellcasting.spells.atWill.map(s => {
                        return s.level !== null ? `${s.name} (${s.level})` : s.name;
                    }).join(', ');
                    html += `<p><strong>At will:</strong> ${spellNames}</p>`;
                }

                // Per day spells
                if (statBlock.spellcasting.spells.perDay) {
                    for (const [times, spells] of Object.entries(statBlock.spellcasting.spells.perDay)) {
                        const spellNames = spells.map(s => {
                            return s.level !== null ? `${s.name} (${s.level})` : s.name;
                        }).join(', ');
                        html += `<p><strong>${times}/day each:</strong> ${spellNames}</p>`;
                    }
                }

                // Spell slots (if using spell slots system)
                if (statBlock.spellcasting.spells.slots) {
                    const slotInfo = [];
                    for (const [level, count] of Object.entries(statBlock.spellcasting.spells.slots)) {
                        slotInfo.push(`${level}${this.getOrdinalSuffix(level)} level (${count} slots)`);
                    }
                    if (slotInfo.length > 0) {
                        html += `<p><strong>Spell Slots:</strong> ${slotInfo.join(', ')}</p>`;
                    }
                }
            }
            html += `</div>`;
        }

        // Source
        if (creature.source) {
            html += `<div class="stat-block-section"><p class="creature-source"><strong>Source:</strong> ${creature.source}</p></div>`;
        }

        // Close the scrollable container
        html += `</div>`;

        detailsPane.innerHTML = html;
    }

    /**
     * Display creature stat block in the right pane compendium section
     * @param {string} creatureId - ID of the creature to display
     */
    static displayCreatureInRightPane(creatureId) {
        const statBlockDisplay = document.getElementById('stat-block-display');
        if (!statBlockDisplay) {
            console.error('Stat block display element not found');
            return;
        }

        // Find the creature in the consolidated database
        const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
        const creature = allCreatures.find(c => c.id === creatureId);

        if (!creature) {
            statBlockDisplay.innerHTML = `<div class="empty-state empty-state-centered">
                <p>Creature not found</p>
            </div>`;
            return;
        }

        // Store the current creature ID for the Quick View button
        statBlockDisplay.setAttribute('data-current-creature-id', creatureId);

        // Get stat block if available
        const statBlock = creature.statBlock || {};
        const hasFullStatBlock = creature.hasFullStatBlock && statBlock;

        // Build the stat block HTML (similar to updateCreatureDetails but without action buttons)
        let html = `
            <div class="creature-stat-block creature-stat-block-scrollable">
                <div class="creature-details-header creature-details-header-minimal">
                    <h3>${creature.name}</h3>
                    <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
                </div>
        `;

        // Full type description
        if (hasFullStatBlock && statBlock.fullType) {
            html += `<div class="stat-block-section">
                <p class="creature-full-type">${statBlock.fullType}</p>
            </div>`;
        } else if (creature.size || creature.race || creature.alignment) {
            const parts = [];
            if (creature.size) parts.push(creature.size);
            if (creature.race) parts.push(creature.race);
            if (creature.subrace) parts.push(`(${creature.subrace})`);
            if (creature.alignment) parts.push(`, ${creature.alignment}`);
            html += `<div class="stat-block-section">
                <p class="creature-full-type">${parts.join(' ')}</p>
            </div>`;
        }

        // Armor Class
        html += `<div class="stat-block-section">`;
        if (hasFullStatBlock && statBlock.armorClass) {
            html += `<p><strong>Armor Class</strong> ${statBlock.armorClass.value}`;
            if (statBlock.armorClass.type) html += ` (${statBlock.armorClass.type})`;
            html += `</p>`;
        } else {
            html += `<p><strong>Armor Class</strong> ${creature.ac}</p>`;
        }

        // Hit Points
        if (hasFullStatBlock && statBlock.hitPoints) {
            html += `<p><strong>Hit Points</strong> ${statBlock.hitPoints.average}`;
            if (statBlock.hitPoints.formula) html += ` (${statBlock.hitPoints.formula})`;
            html += `</p>`;
        } else {
            html += `<p><strong>Hit Points</strong> ${creature.maxHP}</p>`;
        }

        // Speed
        if (hasFullStatBlock && statBlock.speed) {
            const speeds = [];
            if (statBlock.speed.walk) speeds.push(`${statBlock.speed.walk} ft.`);
            if (statBlock.speed.burrow) speeds.push(`burrow ${statBlock.speed.burrow} ft.`);
            if (statBlock.speed.climb) speeds.push(`climb ${statBlock.speed.climb} ft.`);
            if (statBlock.speed.fly) {
                speeds.push(`fly ${statBlock.speed.fly} ft.${statBlock.speed.hover ? ' (hover)' : ''}`);
            }
            if (statBlock.speed.swim) speeds.push(`swim ${statBlock.speed.swim} ft.`);
            if (speeds.length > 0) {
                html += `<p><strong>Speed</strong> ${speeds.join(', ')}</p>`;
            }
        }
        html += `</div>`;

        // Ability Scores
        if (hasFullStatBlock && statBlock.abilities) {
            html += `<div class="stat-block-section">
                <table class="ability-scores-table">
                    <thead>
                        <tr>
                            <th>STR</th>
                            <th>DEX</th>
                            <th>CON</th>
                            <th>INT</th>
                            <th>WIS</th>
                            <th>CHA</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${statBlock.abilities.str.score} (${this.formatModifier(statBlock.abilities.str.modifier)})</td>
                            <td>${statBlock.abilities.dex.score} (${this.formatModifier(statBlock.abilities.dex.modifier)})</td>
                            <td>${statBlock.abilities.con.score} (${this.formatModifier(statBlock.abilities.con.modifier)})</td>
                            <td>${statBlock.abilities.int.score} (${this.formatModifier(statBlock.abilities.int.modifier)})</td>
                            <td>${statBlock.abilities.wis.score} (${this.formatModifier(statBlock.abilities.wis.modifier)})</td>
                            <td>${statBlock.abilities.cha.score} (${this.formatModifier(statBlock.abilities.cha.modifier)})</td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
        }

        // Combined stat section (Saves, Skills, Resistances, Senses, Languages, CR)
        html += `<div class="stat-block-section stat-block-condensed">`;

        // Saving Throws
        if (hasFullStatBlock && statBlock.savingThrows) {
            const saves = [];
            for (const [ability, bonus] of Object.entries(statBlock.savingThrows)) {
                if (bonus !== null && bonus !== undefined) {
                    saves.push(`${ability.toUpperCase()} ${this.formatModifier(bonus)}`);
                }
            }
            if (saves.length > 0) {
                html += `<p><strong>Saving Throws</strong> ${saves.join(', ')}</p>`;
            }
        }

        // Skills
        if (hasFullStatBlock && statBlock.skills && Object.keys(statBlock.skills).length > 0) {
            const skills = [];
            for (const [skill, bonus] of Object.entries(statBlock.skills)) {
                const skillName = skill.replace(/([A-Z])/g, ' $1').trim();
                const capitalizedSkill = skillName.charAt(0).toUpperCase() + skillName.slice(1);
                skills.push(`${capitalizedSkill} ${this.formatModifier(bonus)}`);
            }
            html += `<p><strong>Skills</strong> ${skills.join(', ')}</p>`;
        }

        // Damage Vulnerabilities
        if (hasFullStatBlock && statBlock.damageVulnerabilities && statBlock.damageVulnerabilities.length > 0) {
            html += `<p><strong>Damage Vulnerabilities</strong> ${statBlock.damageVulnerabilities.join(', ')}</p>`;
        }

        // Damage Resistances
        if (hasFullStatBlock && statBlock.damageResistances && statBlock.damageResistances.length > 0) {
            html += `<p><strong>Damage Resistances</strong> ${statBlock.damageResistances.join(', ')}</p>`;
        }

        // Damage Immunities
        if (hasFullStatBlock && statBlock.damageImmunities && statBlock.damageImmunities.length > 0) {
            html += `<p><strong>Damage Immunities</strong> ${statBlock.damageImmunities.join(', ')}</p>`;
        }

        // Condition Immunities
        if (hasFullStatBlock && statBlock.conditionImmunities && statBlock.conditionImmunities.length > 0) {
            html += `<p><strong>Condition Immunities</strong> ${statBlock.conditionImmunities.join(', ')}</p>`;
        }

        // Senses
        if (hasFullStatBlock && statBlock.senses) {
            const senses = [];
            if (statBlock.senses.blindsight) senses.push(`Blindsight ${statBlock.senses.blindsight} ft.`);
            if (statBlock.senses.darkvision) senses.push(`Darkvision ${statBlock.senses.darkvision} ft.`);
            if (statBlock.senses.tremorsense) senses.push(`Tremorsense ${statBlock.senses.tremorsense} ft.`);
            if (statBlock.senses.truesight) senses.push(`Truesight ${statBlock.senses.truesight} ft.`);
            if (statBlock.senses.passivePerception) senses.push(`Passive Perception ${statBlock.senses.passivePerception}`);
            if (senses.length > 0) {
                html += `<p><strong>Senses</strong> ${senses.join(', ')}</p>`;
            }
        }

        // Languages
        if (hasFullStatBlock && statBlock.languages && statBlock.languages.length > 0) {
            html += `<p><strong>Languages</strong> ${statBlock.languages.join(', ')}</p>`;
        }

        // Challenge Rating
        if (hasFullStatBlock && statBlock.challengeRating) {
            html += `<p><strong>CR</strong> ${statBlock.challengeRating.cr}`;
            if (statBlock.challengeRating.xp) html += ` (${statBlock.challengeRating.xp.toLocaleString()} XP`;
            if (statBlock.challengeRating.xpInLair) html += `, or ${statBlock.challengeRating.xpInLair.toLocaleString()} in lair`;
            if (statBlock.challengeRating.proficiencyBonus) html += `; PB +${statBlock.challengeRating.proficiencyBonus}`;
            html += `)</p>`;
        } else if (creature.cr) {
            html += `<p><strong>CR</strong> ${creature.cr}</p>`;
        }

        html += `</div>`;

        // Traits
        if (hasFullStatBlock && statBlock.traits && statBlock.traits.length > 0) {
            html += `<div class="stat-block-section stat-block-traits">`;
            statBlock.traits.forEach(trait => {
                html += `<p><strong><em>${trait.name}.</em></strong> ${trait.description}</p>`;
            });
            html += `</div>`;
        }

        // Actions
        if (hasFullStatBlock && statBlock.actions && statBlock.actions.length > 0) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Actions</h4>`;
            statBlock.actions.forEach(action => {
                html += `<p><strong><em>${action.name}.</em></strong> ${action.description}</p>`;
            });
            html += `</div>`;
        }

        // Reactions
        if (hasFullStatBlock && statBlock.reactions && statBlock.reactions.length > 0) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Reactions</h4>`;
            statBlock.reactions.forEach(reaction => {
                html += `<p><strong><em>${reaction.name}.</em></strong> ${reaction.description}</p>`;
            });
            html += `</div>`;
        }

        // Legendary Actions
        if (hasFullStatBlock && statBlock.legendaryActions && statBlock.legendaryActions.options) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Legendary Actions</h4>`;
            if (statBlock.legendaryActions.description) {
                html += `<p>${statBlock.legendaryActions.description}</p>`;
            }
            statBlock.legendaryActions.options.forEach(option => {
                html += `<p><strong><em>${option.name}`;
                if (option.cost && option.cost > 1) html += ` (Costs ${option.cost} Actions)`;
                html += `.</em></strong> ${option.description}</p>`;
            });
            html += `</div>`;
        }

        // Lair Actions
        if (hasFullStatBlock && statBlock.lairActions) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Lair Actions</h4>`;
            if (statBlock.lairActions.description) {
                html += `<p>${statBlock.lairActions.description}</p>`;
            }
            if (statBlock.lairActions.options && statBlock.lairActions.options.length > 0) {
                statBlock.lairActions.options.forEach(option => {
                    html += `<p><strong><em>${option.name}.</em></strong> ${option.description}</p>`;
                });
            }
            html += `</div>`;
        }

        // Regional Effects
        if (hasFullStatBlock && statBlock.regionalEffects) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Regional Effects</h4>`;
            if (statBlock.regionalEffects.description) {
                html += `<p>${statBlock.regionalEffects.description}</p>`;
            }
            if (statBlock.regionalEffects.effects && statBlock.regionalEffects.effects.length > 0) {
                statBlock.regionalEffects.effects.forEach(effect => {
                    html += `<p><strong><em>${effect.name}.</em></strong> ${effect.description}</p>`;
                });
            }
            html += `</div>`;
        }

        // Spellcasting
        if (hasFullStatBlock && statBlock.spellcasting) {
            html += `<div class="stat-block-section"><h4 class="stat-block-heading">Spellcasting</h4>`;
            if (statBlock.spellcasting.description) {
                html += `<p>${statBlock.spellcasting.description}</p>`;
            }

            if (statBlock.spellcasting.spells) {
                // At-will spells
                if (statBlock.spellcasting.spells.atWill && statBlock.spellcasting.spells.atWill.length > 0) {
                    const spellNames = statBlock.spellcasting.spells.atWill.map(s => {
                        return s.level !== null ? `${s.name} (${s.level})` : s.name;
                    }).join(', ');
                    html += `<p><strong>At will:</strong> ${spellNames}</p>`;
                }

                // Per day spells
                if (statBlock.spellcasting.spells.perDay) {
                    for (const [times, spells] of Object.entries(statBlock.spellcasting.spells.perDay)) {
                        const spellNames = spells.map(s => {
                            return s.level !== null ? `${s.name} (${s.level})` : s.name;
                        }).join(', ');
                        html += `<p><strong>${times}/day each:</strong> ${spellNames}</p>`;
                    }
                }

                // Spell slots (if using spell slots system)
                if (statBlock.spellcasting.spells.slots) {
                    const slotInfo = [];
                    for (const [level, count] of Object.entries(statBlock.spellcasting.spells.slots)) {
                        slotInfo.push(`${level}${this.getOrdinalSuffix(level)} level (${count} slots)`);
                    }
                    if (slotInfo.length > 0) {
                        html += `<p><strong>Spell Slots:</strong> ${slotInfo.join(', ')}</p>`;
                    }
                }
            }
            html += `</div>`;
        }

        // Source
        if (creature.source) {
            html += `<div class="stat-block-section"><p class="creature-source"><strong>Source:</strong> ${creature.source}</p></div>`;
        }

        // Close the stat block container
        html += `</div>`;

        statBlockDisplay.innerHTML = html;
        console.log(`📚 Displayed ${creature.name} in right pane Compendium`);
    }

    /**
     * Format modifier with + or - sign
     * @param {number} modifier - Modifier value
     * @returns {string} Formatted modifier
     */
    static formatModifier(modifier) {
        return modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }

    /**
     * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
     * @param {number|string} num - Number to get suffix for
     * @returns {string} Ordinal suffix
     */
    static getOrdinalSuffix(num) {
        const n = parseInt(num);
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    /**
     * Set up note modal with existing content
     * @param {HTMLElement} modal - Modal element
     * @param {Object} targetCombatant - Target combatant object
     * @param {HTMLElement} trigger - Trigger element
     */
    static setupNoteModal(modal, targetCombatant, trigger) {
        const noteInput = modal.querySelector('#combatant-note-text');
        const noteType = trigger.getAttribute('data-note-type') || 'general';

        // Store the note type on the modal for the form handler
        modal.setAttribute('data-current-note-type', noteType);

        // Populate the recent notes datalist for suggestions
        RecentItems.populateRecentNotesDatalist(noteType);

        // Update modal title based on note type
        const modalTitle = modal.querySelector('.modal-header h2');
        if (modalTitle) {
            if (noteType === 'name') {
                modalTitle.innerHTML = `Edit Name Note for <span data-target-name>${targetCombatant.name}</span>`;
            } else {
                modalTitle.innerHTML = `Add Note for <span data-target-name>${targetCombatant.name}</span>`;
            }
        }

        if (noteInput) {
            // Populate with the appropriate note
            if (noteType === 'name') {
                noteInput.value = targetCombatant.nameNote || '';
                noteInput.placeholder = "e.g., 'Leader', 'Archer #2'";
            } else {
                noteInput.value = targetCombatant.notes || '';
                noteInput.placeholder = "Enter a short note...";
            }

            // Update character counter
            const counter = document.getElementById('note-char-count');
            if (counter) {
                counter.textContent = noteInput.value.length;
            }
        }
    }

    /**
     * Set up effect modal
     * @param {HTMLElement} modal - Modal element
     */
    static setupEffectModal(modal) {
        // Populate the recent effects datalist for suggestions
        RecentItems.populateRecentEffectsDatalist();

        // Clear the custom effect input
        const customEffectInput = modal.querySelector('#custom-effect');
        if (customEffectInput) {
            customEffectInput.value = '';
        }
    }

    /**
     * Set up condition modal
     * @param {HTMLElement} modal - Modal element
     */
    static setupConditionModal(modal) {
        // Clear any previous selections
        const conditionInputs = modal.querySelectorAll('input[name="condition"]');
        conditionInputs.forEach(input => {
            input.checked = false;
        });

        // Update batch button visibility based on selected combatants
        this.updateBatchButtons('condition', modal);
    }

    /**
     * Update batch operation buttons in modal
     * @param {string} modalType - Type of modal
     * @param {HTMLElement} modal - Modal element
     */
    static updateBatchButtons(modalType, modal) {
        // Get selected combatants (avoid circular dependency by accessing through coordinator)
        const selectedCombatants = window.EventCoordinator?.getSelectedCombatants() || [];

        let batchBtn = null;
        let batchCount = null;

        switch (modalType) {
            case 'condition':
                batchBtn = modal.querySelector('#condition-batch-apply-btn');
                batchCount = modal.querySelector('#condition-batch-count');
                break;
            case 'effect':
                batchBtn = modal.querySelector('#effect-batch-apply-btn');
                batchCount = modal.querySelector('#effect-batch-count');
                break;
            case 'combatant-note':
                batchBtn = modal.querySelector('#note-batch-apply-btn');
                batchCount = modal.querySelector('#note-batch-count');
                break;
            case 'auto-roll':
                batchBtn = modal.querySelector('#auto-roll-batch-apply-btn');
                batchCount = modal.querySelector('#auto-roll-batch-count');
                break;
        }

        if (batchBtn && batchCount) {
            if (selectedCombatants.length > 0) {
                batchBtn.style.display = 'block';
                batchCount.textContent = selectedCombatants.length;
            } else {
                batchBtn.style.display = 'none';
            }
        }
    }

    /**
     * Route form submissions to appropriate handlers
     * @param {string} formType - Type of form being submitted
     * @param {HTMLFormElement} form - Form element
     */
    static handleFormSubmission(formType, form) {
        // Delegate to FormHandlers module
        FormHandlers.handleFormSubmission(formType, form);
    }

    /**
     * Pre-populate condition modal with existing condition data for editing
     * @param {HTMLElement} modal - Modal element
     * @param {Object} conditionData - Existing condition data
     */
    static prePopulateConditionModal(modal, conditionData) {
        // Set duration
        const turnsInput = modal.querySelector('#condition-turns');
        const infinityBtn = modal.querySelector('[data-toggle-target="condition-turns"]');

        if (conditionData.duration === 'infinite') {
            if (turnsInput) turnsInput.value = '';
            if (infinityBtn) {
                infinityBtn.classList.add('active');
                infinityBtn.setAttribute('data-infinity-state', 'true');
            }
            if (turnsInput) turnsInput.disabled = true;
        } else {
            if (turnsInput) turnsInput.value = conditionData.duration;
            if (infinityBtn) {
                infinityBtn.classList.remove('active');
                infinityBtn.setAttribute('data-infinity-state', 'false');
            }
            if (turnsInput) turnsInput.disabled = false;
        }

        // Set note
        const noteInput = modal.querySelector('#condition-note');
        if (noteInput) {
            noteInput.value = conditionData.note || '';
        }

        // Set expires at radio
        const expiresAtRadios = modal.querySelectorAll('input[name="expiresAt"]');
        expiresAtRadios.forEach(radio => {
            radio.checked = radio.value === (conditionData.expiresAt || 'start');
        });

        // Select the condition
        const conditionInput = modal.querySelector(`input[name="condition"][value="${conditionData.name}"]`);
        if (conditionInput) {
            conditionInput.checked = true;
            // Also highlight the label
            const label = conditionInput.closest('.condition-option');
            if (label) {
                label.classList.add('selected');
            }
        }

        console.log(`✏️ Pre-populated condition modal with: ${conditionData.name}`);
    }

    /**
     * Pre-populate effect modal with existing effect data for editing
     * @param {HTMLElement} modal - Modal element
     * @param {Object} effectData - Existing effect data
     */
    static prePopulateEffectModal(modal, effectData) {
        // Set duration
        const turnsInput = modal.querySelector('#effect-turns');
        const infinityBtn = modal.querySelector('[data-toggle-target="effect-turns"]');

        if (effectData.duration === 'infinite') {
            if (turnsInput) turnsInput.value = '';
            if (infinityBtn) {
                infinityBtn.classList.add('active');
                infinityBtn.setAttribute('data-infinity-state', 'true');
            }
            if (turnsInput) turnsInput.disabled = true;
        } else {
            if (turnsInput) turnsInput.value = effectData.duration;
            if (infinityBtn) {
                infinityBtn.classList.remove('active');
                infinityBtn.setAttribute('data-infinity-state', 'false');
            }
            if (turnsInput) turnsInput.disabled = false;
        }

        // Set effect name
        const effectInput = modal.querySelector('#custom-effect');
        if (effectInput) {
            effectInput.value = effectData.name || '';
        }

        // Set effect note
        const noteInput = modal.querySelector('#effect-note');
        if (noteInput) {
            noteInput.value = effectData.note || '';
        }

        // Set expires at radio
        const expiresAtRadios = modal.querySelectorAll('input[name="expiresAt"]');
        expiresAtRadios.forEach(radio => {
            radio.checked = radio.value === (effectData.expiresAt || 'start');
        });

        console.log(`✏️ Pre-populated effect modal with: ${effectData.name}`);
    }

    /**
     * Set up stat block parser modal - clear all fields for a fresh start
     * @param {HTMLElement} modal - Modal element
     */
    static setupStatBlockParserModal(modal) {
        // Clear the text area
        const textArea = modal.querySelector('#stat-block-text');
        if (textArea) {
            textArea.value = '';
        }

        // Reset source format dropdown to auto-detect
        const sourceSelect = modal.querySelector('#stat-block-source');
        if (sourceSelect) {
            sourceSelect.value = 'auto';
        }

        // Reset creature type dropdown to enemy
        const typeSelect = modal.querySelector('#stat-block-creature-type');
        if (typeSelect) {
            typeSelect.value = 'enemy';
        }

        // Clear the preview area
        const previewDiv = modal.querySelector('#stat-block-preview');
        if (previewDiv) {
            previewDiv.innerHTML = `
                <div class="empty-state empty-state-centered">
                    <p>Paste a stat block and click "Parse Stat Block" to see a preview</p>
                </div>
            `;
        }

        // Hide the import button and clear any parsed data
        const importButton = modal.querySelector('#import-parsed-creature');
        if (importButton) {
            importButton.style.display = 'none';
            if (importButton.dataset.parsedCreature) {
                delete importButton.dataset.parsedCreature;
            }
        }

        // Clear any error messages
        const errorDiv = modal.querySelector('#stat-block-errors');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.innerHTML = '';
        }

        console.log('📝 Reset stat block parser modal to blank state');
    }

    /**
     * Set up timer modal for placeholders
     * @param {HTMLElement} modal - Modal element
     */
    static setupTimerModal(modal) {
        // Clear the turns input
        const turnsInput = modal.querySelector('#timer-turns');
        if (turnsInput) {
            turnsInput.value = '1';
            turnsInput.disabled = false;
        }

        // Reset infinity button
        const infinityBtn = modal.querySelector('[data-toggle-target="timer-turns"]');
        if (infinityBtn) {
            infinityBtn.classList.remove('active');
            infinityBtn.setAttribute('data-infinity-state', 'false');
        }

        // Clear the note input
        const noteInput = modal.querySelector('#timer-note');
        if (noteInput) {
            noteInput.value = '';
        }

        console.log('📝 Setup timer modal for placeholder');
    }

}