/**
 * CreatureModalEvents - Creature Database and Compendium Management
 *
 * Handles all creature-related modal functionality including:
 * - Creature database modal setup and population
 * - Creature stat block rendering (modal and right pane)
 * - Creature form setup for adding/editing
 * - Dynamic form row management (skills, traits, actions, legendary actions)
 *
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { DataServices } from '../data-services.js';
import { buildStatBlockHTML } from '../renderers/stat-block-renderer.js';
import { escapeHtml } from '../renderers/html-utils.js';
import { standaloneCreatureCSS } from '../../templates/standalone-templates.js';
import { CreatureHandlers } from './creature-handlers.js';
import { CreatureService } from '../services/creature-service.js';

export class CreatureModalEvents {
    /**
     * Setup the creature database modal with all creatures
     * @param {HTMLElement} modal - Modal element
     * @param {HTMLElement} trigger - Optional trigger element with creature selection data
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

                    // Add timestamp for "newest first" sorting
                    if (creature.createdAt) {
                        creatureItem.setAttribute('data-created', creature.createdAt);
                    } else {
                        // Fallback for creatures without timestamp (older creatures get timestamp 0)
                        creatureItem.setAttribute('data-created', '0');
                    }

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

            // Apply default alphabetical sorting
            const sortSelect = modal.querySelector('#creature-sort-filter');
            if (sortSelect) {
                sortSelect.value = 'alphabetical';
                CreatureHandlers.applySortAndFilter(modal, 'alphabetical');
            }

            // Update file status indicator
            this.updateCreatureDatabaseFileStatus(modal);
        } catch (error) {
            console.error('Failed to populate creature database:', error);
            ToastSystem.show('Failed to load creature database', 'error');
        }
    }

    /**
     * Update creature details pane in the modal
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
                        data-action="export-creature"
                        data-creature-id="${creature.id}">
                    📤 Export
                </button>
                <button class="btn btn-secondary"
                        data-action="delete-creature"
                        data-creature-id="${creature.id}">
                    🗑️
                </button>
            </div>
            <div class="creature-details-scrollable">
                <div class="creature-details-header creature-details-header-minimal">
                    <h3>
                        ${creature.name}
                        <button class="creature-expand-window-btn expand-window-icon"
                                data-creature-id="${creature.id}"
                                data-action="open-creature-window"
                                title="Open in new window">
                            ⧉
                        </button>
                    </h3>
                    <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
                </div>
        `;

        html += buildStatBlockHTML(creature, statBlock, hasFullStatBlock);

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
                    <h3>
                        ${creature.name}
                        <button class="creature-expand-window-btn expand-window-icon"
                                data-creature-id="${creature.id}"
                                data-action="open-creature-window"
                                title="Open in new window">
                            ⧉
                        </button>
                    </h3>
                    <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
                </div>
        `;

        html += buildStatBlockHTML(creature, statBlock, hasFullStatBlock);

        // Close the stat block container
        html += `</div>`;

        statBlockDisplay.innerHTML = html;
        console.log(`📚 Displayed ${creature.name} in right pane Compendium`);
    }

    /**
     * Build stat block HTML (shared between modal and right pane)
     * @param {Object} creature - Creature data
     * @param {Object} statBlock - Stat block data
     * @param {boolean} hasFullStatBlock - Whether creature has full stat block
     * @returns {string} HTML string
     * @deprecated Use buildStatBlockHTML from renderers module directly
     */
    static buildStatBlockHTML(creature, statBlock, hasFullStatBlock) {
        // Delegate to centralized renderer
        return buildStatBlockHTML(creature, statBlock, hasFullStatBlock);
    }

    // Legacy implementation retained temporarily for reference
    static _buildStatBlockHTMLLegacy(creature, statBlock, hasFullStatBlock) {
        let html = '';

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

        // Custom Sections
        if (creature.customSections && creature.customSections.length > 0) {
            creature.customSections.forEach(section => {
                if (!section.name) return;

                html += `<div class="stat-block-section">
                    <h4 class="stat-block-heading">${this.escapeHtml(section.name)}</h4>`;

                // Support both old and new data structures
                if (section.entries && Array.isArray(section.entries)) {
                    // New structure with multiple entries
                    section.entries.forEach(entry => {
                        if (!entry.text) return;

                        // If there's a title, make text inline with it (like Actions)
                        if (entry.title && entry.title.trim()) {
                            html += `<p><strong><em>${this.escapeHtml(entry.title)}.</em></strong> ${this.escapeHtml(entry.text)}</p>`;
                        } else {
                            // No title, just display the text as paragraphs
                            const textParagraphs = entry.text
                                .split('\n')
                                .filter(line => line.trim())
                                .map(line => `<p>${this.escapeHtml(line)}</p>`)
                                .join('');
                            html += textParagraphs;
                        }
                    });
                } else if (section.text) {
                    // Old structure with single title/text - maintain backward compatibility
                    if (section.title && section.title.trim()) {
                        html += `<p><strong><em>${this.escapeHtml(section.title)}.</em></strong> ${this.escapeHtml(section.text)}</p>`;
                    } else {
                        const textParagraphs = section.text
                            .split('\n')
                            .filter(line => line.trim())
                            .map(line => `<p>${this.escapeHtml(line)}</p>`)
                            .join('');
                        html += textParagraphs;
                    }
                }

                html += `</div>`;
            });
        }

        // Source
        if (creature.source) {
            html += `<div class="stat-block-section"><p class="creature-source"><strong>Source:</strong> ${creature.source}</p></div>`;
        }

        return html;
    }

    /**
     * Setup creature form for adding a new creature
     */
    static setupCreatureFormForAdd() {
        console.log('🎯 setupCreatureFormForAdd() called');

        // Reset modal title
        const titleElement = document.getElementById('creature-form-title');
        if (titleElement) {
            titleElement.textContent = 'Add New Creature';
        }

        // Reset submit button text
        const submitTextElement = document.getElementById('creature-form-submit-text');
        if (submitTextElement) {
            submitTextElement.textContent = 'Add Creature';
        }

        // Clear the ID field (no ID means it's a new creature)
        const idField = document.getElementById('creature-form-id');
        if (idField) {
            idField.value = '';
        }

        // Reset the form completely
        const form = document.getElementById('creature-form');
        if (form) {
            // Remove edit mode flag
            form.removeAttribute('data-editing-mode');

            // Restore 'required' attributes that were removed in edit mode
            const wasRequiredFields = form.querySelectorAll('[data-was-required="true"]');
            wasRequiredFields.forEach(field => {
                field.setAttribute('required', '');
                field.removeAttribute('data-was-required');
            });

            // WHY: Explicitly clear ALL fields to ensure no pre-populated data from previous creatures
            // Don't use form.reset() as it resets to default HTML values which may retain previous data
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = false;
                } else if (input.tagName === 'SELECT') {
                    // Reset select to first option
                    input.selectedIndex = 0;
                } else {
                    // Clear all inputs (including text, number, hidden, etc.)
                    input.value = '';
                }
            });

            // Set default values for specific fields AFTER clearing everything
            // Read creature type from sessionStorage (set by creature type selection modal)
            const pendingType = sessionStorage.getItem('pending-creature-type') || 'enemy';
            console.log('📋 Read pending creature type from sessionStorage:', pendingType);
            sessionStorage.removeItem('pending-creature-type'); // Clear after reading

            const typeField = document.getElementById('creature-form-type');
            const typeReadonly = document.getElementById('creature-form-type-readonly');
            const typeHidden = document.getElementById('creature-form-type-hidden');

            console.log('🔍 Form elements found:', {
                typeField: !!typeField,
                typeReadonly: !!typeReadonly,
                typeHidden: !!typeHidden
            });

            // Show select for enemy/npc, readonly for player (though player should not be selectable yet)
            if (pendingType === 'player') {
                if (typeField) {
                    typeField.style.display = 'none';
                    typeField.removeAttribute('name'); // Don't submit select for player
                }
                if (typeReadonly) {
                    typeReadonly.style.display = 'block';
                    typeReadonly.textContent = 'Player';
                }
                if (typeHidden) {
                    typeHidden.setAttribute('name', 'type'); // Submit via hidden input
                    typeHidden.value = 'player';
                }
            } else {
                // WHY: Set the type field for enemy/npc creatures
                // Make sure the dropdown shows the correct type selected
                if (typeField) {
                    typeField.style.display = 'block';
                    typeField.setAttribute('name', 'type'); // Submit via select
                    typeField.value = pendingType; // Set to 'enemy' or 'npc'
                    console.log('Setting creature type to:', pendingType, 'Actual value:', typeField.value);
                }
                if (typeReadonly) typeReadonly.style.display = 'none';
                if (typeHidden) {
                    typeHidden.removeAttribute('name'); // Don't submit hidden input
                    typeHidden.value = '';
                }
            }

            // Set default values for required fields
            const sizeField = document.getElementById('creature-form-size');
            if (sizeField) sizeField.value = 'Medium';

            // Leave AC and HP empty (no defaults) so user is forced to enter them
            const acField = document.getElementById('creature-form-ac');
            if (acField) acField.value = '';

            const hpField = document.getElementById('creature-form-hp');
            if (hpField) hpField.value = '';

            // Clear all other optional fields explicitly
            const crField = document.getElementById('creature-form-cr');
            if (crField) crField.value = '';

            const raceField = document.getElementById('creature-form-race');
            if (raceField) raceField.value = '';

            const subraceField = document.getElementById('creature-form-subrace');
            if (subraceField) subraceField.value = '';

            const alignmentField = document.getElementById('creature-form-alignment');
            if (alignmentField) alignmentField.value = '';

            const sourceField = document.getElementById('creature-form-source');
            if (sourceField) sourceField.value = 'Custom'; // Default source

            const descriptionField = document.getElementById('creature-form-description');
            if (descriptionField) descriptionField.value = '';
        }

        // Clear dynamic containers (skills, traits, actions, legendary actions, custom sections)
        const containersToReset = [
            'skills-container',
            'traits-container',
            'actions-container',
            'legendary-actions-container',
            'custom-sections-container'
        ];

        containersToReset.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                // Remove all children except buttons
                const children = Array.from(container.children);
                children.forEach(child => {
                    if (child.tagName !== 'BUTTON') {
                        child.remove();
                    }
                });
            }
        });

        console.log('📝 Creature form set up for adding new creature with default/empty fields');
    }

    /**
     * Setup player form for adding a new player character
     */
    static setupPlayerFormForAdd() {
        console.log('🎯 setupPlayerFormForAdd() called');

        // Reset modal title
        const titleElement = document.getElementById('player-form-title');
        if (titleElement) {
            titleElement.textContent = 'Add Player Character';
        }

        // Clear the ID field (no ID means it's a new player)
        const idField = document.getElementById('player-form-id');
        if (idField) {
            idField.value = '';
        }

        // Reset the form completely
        const form = document.getElementById('player-form');
        if (form) {
            // WHY: Explicitly clear ALL fields first to ensure no pre-populated data from previous players
            // We clear everything first, then set defaults
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = false;
                } else if (input.tagName === 'SELECT') {
                    input.selectedIndex = 0;
                } else {
                    // Clear all inputs (text, number, hidden, etc.)
                    input.value = '';
                }
            });

            // Now set default values for specific fields AFTER clearing everything

            // Clear text fields (name, class, race, background, notes)
            const nameField = document.getElementById('player-form-name');
            if (nameField) nameField.value = '';

            const classField = document.getElementById('player-form-class');
            if (classField) classField.value = '';

            const raceField = document.getElementById('player-form-race');
            if (raceField) raceField.value = '';

            const backgroundField = document.getElementById('player-form-background');
            if (backgroundField) backgroundField.value = '';

            const notesField = document.getElementById('player-form-notes');
            if (notesField) notesField.value = '';

            // Set default ability scores to 10
            ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
                const field = document.getElementById(`player-form-${ability}`);
                if (field) field.value = '10';
            });

            // Set default level to 1
            const levelField = document.getElementById('player-form-level');
            if (levelField) levelField.value = '1';

            // Clear AC and HP fields (no defaults, user must enter)
            const acField = document.getElementById('player-form-ac');
            if (acField) acField.value = '';

            const maxHPField = document.getElementById('player-form-max-hp');
            if (maxHPField) maxHPField.value = '';

            const currentHPField = document.getElementById('player-form-current-hp');
            if (currentHPField) currentHPField.value = '';

            // Set default speed
            const speedField = document.getElementById('player-form-speed');
            if (speedField) speedField.value = '30';

            // Set default proficiency bonus for level 1
            const profBonusField = document.getElementById('player-form-proficiency-bonus');
            if (profBonusField) profBonusField.value = '2';

            // Set default initiative bonus to 0
            const initBonusField = document.getElementById('player-form-initiative-bonus');
            if (initBonusField) initBonusField.value = '0';

            // Uncheck all saving throw and skill proficiencies
            const savingThrowCheckboxes = document.querySelectorAll('input[name="savingThrows"]');
            savingThrowCheckboxes.forEach(cb => cb.checked = false);

            const skillCheckboxes = document.querySelectorAll('input[name="skills"]');
            skillCheckboxes.forEach(cb => cb.checked = false);

            const expertiseCheckboxes = document.querySelectorAll('input[name="skillsExpertise"]');
            expertiseCheckboxes.forEach(cb => cb.checked = false);
        }

        console.log('📝 Player form set up for adding new character with default/empty fields');
    }

    /**
     * Setup player form for editing an existing player character
     * @param {Object} player - The player character to edit
     */
    static setupPlayerFormForEdit(player) {
        try {
            console.log('📝 Setting up player form for edit:', player.name);

            // Get the form element
            const form = document.getElementById('player-form');
            if (form) {
                // Mark form as in edit mode
                form.setAttribute('data-editing-mode', 'true');

                // Remove 'required' attribute from all fields in edit mode
                const requiredFields = form.querySelectorAll('[required]');
                requiredFields.forEach(field => {
                    field.removeAttribute('required');
                    // Store original required state for restoration later
                    field.setAttribute('data-was-required', 'true');
                });
            }

            // Update modal title
            const titleElement = document.getElementById('player-form-title');
            if (titleElement) {
                titleElement.textContent = 'Edit Player Character';
            }

            // Update submit button text to "Commit Changes"
            const submitTextElement = document.getElementById('player-form-submit-text');
            if (submitTextElement) {
                submitTextElement.textContent = 'Commit Changes';
            }

            // Store player ID for update
            const idField = document.getElementById('player-form-id');
            if (idField) {
                idField.value = player.id;
            }

            // Populate basic fields
            const nameField = document.getElementById('player-form-name');
            if (nameField) nameField.value = player.name || '';

            const classField = document.getElementById('player-form-class');
            if (classField) classField.value = player.playerClass || '';

            const levelField = document.getElementById('player-form-level');
            if (levelField) levelField.value = player.playerLevel || 1;

            const raceField = document.getElementById('player-form-race');
            if (raceField) raceField.value = player.race || '';

            const backgroundField = document.getElementById('player-form-background');
            if (backgroundField) backgroundField.value = player.playerBackground || player.subrace || '';

            // Populate combat stats
            const acField = document.getElementById('player-form-ac');
            if (acField) acField.value = player.ac || 10;

            const maxHPField = document.getElementById('player-form-max-hp');
            if (maxHPField) maxHPField.value = player.maxHP || 1;

            const currentHPField = document.getElementById('player-form-current-hp');
            if (currentHPField) currentHPField.value = '';

            const speedField = document.getElementById('player-form-speed');
            if (speedField) speedField.value = player.statBlock?.speed?.walk || 30;

            const profBonusField = document.getElementById('player-form-proficiency-bonus');
            if (profBonusField) profBonusField.value = player.statBlock?.proficiencyBonus || 2;

            const initBonusField = document.getElementById('player-form-initiative-bonus');
            if (initBonusField) initBonusField.value = player.statBlock?.initiative?.modifier || 0;

            // Populate ability scores
            if (player.statBlock && player.statBlock.abilities) {
                ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
                    const field = document.getElementById(`player-form-${ability}`);
                    if (field && player.statBlock.abilities[ability]) {
                        field.value = player.statBlock.abilities[ability].score || 10;
                    }
                });
            }

            // Populate saving throw proficiencies
            if (player.statBlock && player.statBlock.savingThrows) {
                const savingThrowCheckboxes = document.querySelectorAll('input[name="savingThrows"]');
                savingThrowCheckboxes.forEach(checkbox => {
                    const ability = checkbox.value;
                    checkbox.checked = player.statBlock.savingThrows.hasOwnProperty(ability);
                });
            }

            // Populate skill proficiencies
            if (player.statBlock && player.statBlock.skills) {
                const skillCheckboxes = document.querySelectorAll('input[name="skills"]');
                const expertiseCheckboxes = document.querySelectorAll('input[name="skillsExpertise"]');

                // First, uncheck all
                skillCheckboxes.forEach(cb => cb.checked = false);
                expertiseCheckboxes.forEach(cb => cb.checked = false);

                // Build a map of skills with their bonuses
                const profBonus = player.statBlock.proficiencyBonus || 2;
                const abilities = player.statBlock.abilities;

                // Map skill names to ability modifiers
                const skillAbilities = {
                    'acrobatics': 'dex',
                    'animal-handling': 'wis',
                    'arcana': 'int',
                    'athletics': 'str',
                    'deception': 'cha',
                    'history': 'int',
                    'insight': 'wis',
                    'intimidation': 'cha',
                    'investigation': 'int',
                    'medicine': 'wis',
                    'nature': 'int',
                    'perception': 'wis',
                    'performance': 'cha',
                    'persuasion': 'cha',
                    'religion': 'int',
                    'sleight-of-hand': 'dex',
                    'stealth': 'dex',
                    'survival': 'wis'
                };

                // Check which skills are proficient or expert
                for (const [skillKey, bonus] of Object.entries(player.statBlock.skills)) {
                    // Find the matching checkbox value
                    let matchingSkill = null;
                    for (const [formSkill, abilityKey] of Object.entries(skillAbilities)) {
                        const normalizedSkill = formSkill.replace(/-/g, '').toLowerCase();
                        if (skillKey.toLowerCase() === normalizedSkill) {
                            matchingSkill = formSkill;
                            break;
                        }
                    }

                    if (matchingSkill) {
                        const abilityKey = skillAbilities[matchingSkill];
                        const abilityMod = abilities[abilityKey]?.modifier || 0;

                        // Check proficiency
                        const skillCheckbox = document.querySelector(`input[name="skills"][value="${matchingSkill}"]`);
                        if (skillCheckbox) {
                            skillCheckbox.checked = true;
                        }

                        // Check expertise (bonus = abilityMod + profBonus * 2)
                        const expectedExpertiseBonus = abilityMod + (profBonus * 2);
                        if (bonus === expectedExpertiseBonus) {
                            const expertiseCheckbox = document.querySelector(`input[name="skillsExpertise"][value="${matchingSkill}"]`);
                            if (expertiseCheckbox) {
                                expertiseCheckbox.checked = true;
                            }
                        }
                    }
                }
            }

            // Populate notes
            const notesField = document.getElementById('player-form-notes');
            if (notesField) {
                // Extract notes from traits if present
                let notes = '';
                if (player.statBlock && player.statBlock.traits) {
                    const notesTrait = player.statBlock.traits.find(t => t.name === 'Character Notes');
                    if (notesTrait) {
                        notes = notesTrait.description || '';
                    }
                }
                notesField.value = notes;
            }

            console.log('✅ Player form populated for edit');

        } catch (error) {
            console.error('❌ Error in setupPlayerFormForEdit:', error);
            ToastSystem.show('Failed to load player data: ' + error.message, 'error', 3000);
        }
    }

    /**
     * Setup creature form for editing an existing creature
     * @param {Object} creature - The creature to edit
     */
    static setupCreatureFormForEdit(creature) {
        try {
            console.log('📝 Setting up creature form for edit:', creature.name);

            // Get the form element
            const form = document.getElementById('creature-form');
            if (!form) {
                console.error('❌ Form element not found!');
                return;
            }

            console.log('✅ Form found, marking as edit mode');
            // Mark form as in edit mode
            form.setAttribute('data-editing-mode', 'true');

            // Remove 'required' attribute from all fields in edit mode
            const requiredFields = form.querySelectorAll('[required]');
            console.log(`📋 Found ${requiredFields.length} required fields, removing 'required' attribute`);
            requiredFields.forEach(field => {
                field.removeAttribute('required');
                // Store original required state for restoration later
                field.setAttribute('data-was-required', 'true');
            });

            // Update modal title
            const titleElement = document.getElementById('creature-form-title');
            if (titleElement) {
                titleElement.textContent = 'Edit Creature';
                console.log('✅ Updated modal title to "Edit Creature"');
            } else {
                console.warn('⚠️ Title element not found');
            }

            // Update submit button text to "Commit Changes"
            const submitTextElement = document.getElementById('creature-form-submit-text');
            if (submitTextElement) {
                submitTextElement.textContent = 'Commit Changes';
                console.log('✅ Updated submit button to "Commit Changes"');
            } else {
                console.warn('⚠️ Submit text element not found');
            }

            // Store creature ID for update
            const idField = document.getElementById('creature-form-id');
            if (idField) {
                idField.value = creature.id;
            }

            // Populate basic fields
            const nameField = document.getElementById('creature-form-name');
            if (nameField) nameField.value = creature.name || '';

        // Handle creature type field - show select for enemy/npc, readonly for player
        const typeField = document.getElementById('creature-form-type');
        const typeReadonly = document.getElementById('creature-form-type-readonly');
        const typeHidden = document.getElementById('creature-form-type-hidden');
        const creatureType = creature.type || 'enemy';

        if (creatureType === 'player') {
            // Player type - show readonly, hide select, use hidden input for form submission
            if (typeField) {
                typeField.style.display = 'none';
                typeField.removeAttribute('name'); // Don't submit select for player
            }
            if (typeReadonly) {
                typeReadonly.style.display = 'block';
                typeReadonly.textContent = 'Player';
            }
            if (typeHidden) {
                typeHidden.setAttribute('name', 'type'); // Submit via hidden input
                typeHidden.value = 'player';
            }
        } else {
            // Enemy/NPC type - show select, hide readonly
            if (typeField) {
                typeField.style.display = 'block';
                typeField.setAttribute('name', 'type'); // Submit via select
                typeField.value = creatureType;
            }
            if (typeReadonly) typeReadonly.style.display = 'none';
            if (typeHidden) {
                typeHidden.removeAttribute('name'); // Don't submit hidden input
                typeHidden.value = '';
            }
        }

        const acField = document.getElementById('creature-form-ac');
        if (acField) acField.value = creature.ac || 10;

        const hpField = document.getElementById('creature-form-hp');
        if (hpField) hpField.value = creature.maxHP || 1;

        // Optional fields
        const crField = document.getElementById('creature-form-cr');
        if (crField) crField.value = creature.cr || '';

        const sizeField = document.getElementById('creature-form-size');
        if (sizeField) sizeField.value = creature.size || 'Medium';

        const raceField = document.getElementById('creature-form-race');
        if (raceField) raceField.value = creature.race || '';

        const subraceField = document.getElementById('creature-form-subrace');
        if (subraceField) subraceField.value = creature.subrace || '';

        const alignmentField = document.getElementById('creature-form-alignment');
        if (alignmentField) alignmentField.value = creature.alignment || '';

        const sourceField = document.getElementById('creature-form-source');
        if (sourceField) sourceField.value = creature.source || 'Custom';

        const descriptionField = document.getElementById('creature-form-description');
        if (descriptionField) descriptionField.value = creature.description || '';

        // Populate stat block fields if available
        if (creature.statBlock) {
            const sb = creature.statBlock;

            // AC Type
            const acTypeField = document.getElementById('creature-form-ac-type');
            if (acTypeField && sb.armorClass) {
                acTypeField.value = sb.armorClass.type || '';
            }

            // HP Formula
            const hpFormulaField = document.getElementById('creature-form-hp-formula');
            if (hpFormulaField && sb.hitPoints) {
                hpFormulaField.value = sb.hitPoints.formula || '';
            }

            // Initiative
            if (sb.initiative) {
                const initModField = document.getElementById('creature-form-initiative-mod');
                if (initModField) initModField.value = sb.initiative.modifier || 0;

                const initTotalField = document.getElementById('creature-form-initiative-total');
                if (initTotalField) initTotalField.value = sb.initiative.total || 0;
            }

            // Proficiency Bonus
            const profField = document.getElementById('creature-form-proficiency');
            if (profField) profField.value = sb.proficiencyBonus || 2;

            // Speed
            if (sb.speed) {
                const walkSpeedField = document.getElementById('creature-form-speed-walk');
                if (walkSpeedField) walkSpeedField.value = sb.speed.walk || 30;

                const flySpeedField = document.getElementById('creature-form-speed-fly');
                if (flySpeedField) flySpeedField.value = sb.speed.fly || '';

                const swimSpeedField = document.getElementById('creature-form-speed-swim');
                if (swimSpeedField) swimSpeedField.value = sb.speed.swim || '';

                const climbSpeedField = document.getElementById('creature-form-speed-climb');
                if (climbSpeedField) climbSpeedField.value = sb.speed.climb || '';

                const burrowSpeedField = document.getElementById('creature-form-speed-burrow');
                if (burrowSpeedField) burrowSpeedField.value = sb.speed.burrow || '';
            }

            // Ability Scores
            if (sb.abilities) {
                const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
                abilities.forEach(ability => {
                    const scoreField = document.querySelector(`input[name="${ability}Score"]`);
                    const modifierField = document.querySelector(`input[name="${ability}Modifier"]`);
                    if (scoreField && sb.abilities[ability]) {
                        scoreField.value = sb.abilities[ability].score || 10;
                    }
                    if (modifierField && sb.abilities[ability]) {
                        modifierField.value = sb.abilities[ability].modifier || 0;
                    }
                });
            }

            // Saving Throws
            if (sb.savingThrows) {
                const saves = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
                saves.forEach(ability => {
                    const saveField = document.querySelector(`input[name="${ability}Save"]`);
                    if (saveField && sb.savingThrows[ability] !== undefined) {
                        saveField.value = sb.savingThrows[ability];
                    }
                });
            }

            // Senses
            if (sb.senses) {
                const blindsightField = document.querySelector('input[name="blindsight"]');
                if (blindsightField) blindsightField.value = sb.senses.blindsight || '';

                const darkvisionField = document.querySelector('input[name="darkvision"]');
                if (darkvisionField) darkvisionField.value = sb.senses.darkvision || '';

                const tremorsenseField = document.querySelector('input[name="tremorsense"]');
                if (tremorsenseField) tremorsenseField.value = sb.senses.tremorsense || '';

                const truesightField = document.querySelector('input[name="truesight"]');
                if (truesightField) truesightField.value = sb.senses.truesight || '';

                const passivePerceptionField = document.querySelector('input[name="passivePerception"]');
                if (passivePerceptionField) passivePerceptionField.value = sb.senses.passivePerception || '';
            }

            // Languages
            if (sb.languages && sb.languages.length > 0) {
                const languagesField = document.querySelector('input[name="languages"]');
                if (languagesField) {
                    languagesField.value = sb.languages.join(', ');
                }
            }

            // Damage Vulnerabilities
            if (sb.damageVulnerabilities && sb.damageVulnerabilities.length > 0) {
                const vulnerabilitiesField = document.querySelector('input[name="damageVulnerabilities"]');
                if (vulnerabilitiesField) {
                    vulnerabilitiesField.value = sb.damageVulnerabilities.join(', ');
                }
            }

            // Damage Resistances
            if (sb.damageResistances && sb.damageResistances.length > 0) {
                const resistancesField = document.querySelector('input[name="damageResistances"]');
                if (resistancesField) {
                    resistancesField.value = sb.damageResistances.join(', ');
                }
            }

            // Damage Immunities
            if (sb.damageImmunities && sb.damageImmunities.length > 0) {
                const immunitiesField = document.querySelector('input[name="damageImmunities"]');
                if (immunitiesField) {
                    immunitiesField.value = sb.damageImmunities.join(', ');
                }
            }

            // Condition Immunities
            if (sb.conditionImmunities && sb.conditionImmunities.length > 0) {
                const conditionImmunitiesField = document.querySelector('input[name="conditionImmunities"]');
                if (conditionImmunitiesField) {
                    conditionImmunitiesField.value = sb.conditionImmunities.join(', ');
                }
            }

            // Challenge Rating XP
            if (sb.challengeRating) {
                const xpField = document.querySelector('input[name="xp"]');
                if (xpField && sb.challengeRating.xp) {
                    xpField.value = sb.challengeRating.xp;
                }

                const xpInLairField = document.querySelector('input[name="xpInLair"]');
                if (xpInLairField && sb.challengeRating.xpInLair) {
                    xpInLairField.value = sb.challengeRating.xpInLair;
                }
            }

            // Skills - populate dynamically
            if (sb.skills && Object.keys(sb.skills).length > 0) {
                const skillsContainer = document.getElementById('skills-container');
                if (skillsContainer) {
                    // Clear existing skills except the add button
                    const children = Array.from(skillsContainer.children);
                    children.forEach(child => {
                        if (child.tagName !== 'BUTTON') {
                            child.remove();
                        }
                    });

                    // Add each skill
                    for (const [skillName, bonus] of Object.entries(sb.skills)) {
                        this.addSkillRowWithData(skillName, bonus);
                    }
                }
            }

            // Traits - populate dynamically
            if (sb.traits && sb.traits.length > 0) {
                const traitsContainer = document.getElementById('traits-container');
                if (traitsContainer) {
                    // Clear existing traits except the add button
                    const children = Array.from(traitsContainer.children);
                    children.forEach(child => {
                        if (child.tagName !== 'BUTTON') {
                            child.remove();
                        }
                    });

                    // Add each trait
                    sb.traits.forEach(trait => {
                        this.addTraitRowWithData(trait.name, trait.description);
                    });
                }
            }

            // Actions - populate dynamically
            if (sb.actions && sb.actions.length > 0) {
                const actionsContainer = document.getElementById('actions-container');
                if (actionsContainer) {
                    // Clear existing actions except the add button
                    const children = Array.from(actionsContainer.children);
                    children.forEach(child => {
                        if (child.tagName !== 'BUTTON') {
                            child.remove();
                        }
                    });

                    // Add each action
                    sb.actions.forEach(action => {
                        this.addActionRowWithData(action.name, action.description);
                    });
                }
            }

            // Legendary Actions - populate dynamically
            if (sb.legendaryActions && sb.legendaryActions.options && sb.legendaryActions.options.length > 0) {
                const legendaryContainer = document.getElementById('legendary-actions-container');
                if (legendaryContainer) {
                    // Clear existing legendary actions except the add button
                    const children = Array.from(legendaryContainer.children);
                    children.forEach(child => {
                        if (child.tagName !== 'BUTTON') {
                            child.remove();
                        }
                    });

                    // Add each legendary action
                    sb.legendaryActions.options.forEach(legendaryAction => {
                        this.addLegendaryActionRowWithData(legendaryAction.name, legendaryAction.description, legendaryAction.cost || 1);
                    });
                }
            }
        }

        // Custom Sections - populate dynamically
        if (creature.customSections && creature.customSections.length > 0) {
            const customContainer = document.getElementById('custom-sections-container');
            if (customContainer) {
                // Clear existing custom sections except the add button
                const children = Array.from(customContainer.children);
                children.forEach(child => {
                    if (child.tagName !== 'BUTTON') {
                        child.remove();
                    }
                });

                // Add each custom section
                creature.customSections.forEach(section => {
                    // Support both old and new data structures
                    if (section.entries && Array.isArray(section.entries)) {
                        // New structure with multiple entries
                        this.addCustomSectionRowWithData(section.name, section.entries);
                    } else {
                        // Old structure with single title/text - convert to new structure
                        const entries = [{ title: section.title || '', text: section.text || '' }];
                        this.addCustomSectionRowWithData(section.name, entries);
                    }
                });
            }
        }

            console.log(`✅ Populated creature form for editing: ${creature.name}`);
        } catch (error) {
            console.error('❌ Error in setupCreatureFormForEdit:', error);
            console.error('Error stack:', error.stack);
            console.error('Creature data:', creature);
            throw error; // Re-throw to be caught by handleEditCreature
        }
    }

    /**
     * Format modifier with + or - sign
     * @param {number} modifier - Modifier value
     * @returns {string} Formatted modifier
     * @deprecated Use formatModifier from html-utils module
     */
    static formatModifier(modifier) {
        return modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }

    /**
     * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
     * @param {number|string} num - Number to get suffix for
     * @returns {string} Ordinal suffix
     * @deprecated Use getOrdinalSuffix from html-utils module
     */
    static getOrdinalSuffix(num) {
        const n = parseInt(num);
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    /**
     * Escape HTML to prevent injection
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     * @deprecated Use escapeHtml from html-utils module
     */
    static escapeHtml(text) {
        return escapeHtml(text);
    }

    /**
     * Add a skill row with data to the creature form
     * @param {string} skillName - Name of the skill
     * @param {number} bonus - Skill bonus
     */
    static addSkillRowWithData(skillName, bonus) {
        const container = document.getElementById('skills-container');
        if (!container) return;

        const skillRow = document.createElement('div');
        skillRow.className = 'form-row';

        const formGroup1 = document.createElement('div');
        formGroup1.className = 'form-group';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.name = 'skillName[]';
        nameInput.value = skillName;
        nameInput.placeholder = 'Skill name';
        formGroup1.appendChild(nameInput);

        const formGroup2 = document.createElement('div');
        formGroup2.className = 'form-group';
        const bonusInput = document.createElement('input');
        bonusInput.type = 'number';
        bonusInput.name = 'skillBonus[]';
        bonusInput.value = bonus;
        bonusInput.placeholder = '+5';
        formGroup2.appendChild(bonusInput);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-sm btn-danger';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = function() { this.parentElement.remove(); };

        skillRow.appendChild(formGroup1);
        skillRow.appendChild(formGroup2);
        skillRow.appendChild(removeBtn);

        // Find the add button that's a direct child of container
        const addButton = Array.from(container.children).find(child =>
            child.tagName === 'BUTTON' && child.textContent.includes('Add Skill')
        );

        if (addButton) {
            container.insertBefore(skillRow, addButton);
        } else {
            container.appendChild(skillRow);
        }
    }

    /**
     * Add a trait row with data to the creature form
     * @param {string} name - Trait name
     * @param {string} description - Trait description
     */
    static addTraitRowWithData(name, description) {
        const container = document.getElementById('traits-container');
        if (!container) return;

        const traitRow = document.createElement('div');
        traitRow.className = 'form-group';

        const label1 = document.createElement('label');
        label1.textContent = 'Trait Name';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.name = 'traitName[]';
        nameInput.value = name;
        nameInput.placeholder = 'Pack Tactics';

        const label2 = document.createElement('label');
        label2.textContent = 'Trait Description';

        const descTextarea = document.createElement('textarea');
        descTextarea.name = 'traitDescription[]';
        descTextarea.value = description;
        descTextarea.placeholder = 'The creature has advantage...';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-sm btn-danger';
        removeBtn.textContent = 'Remove Trait';
        removeBtn.onclick = function() { this.parentElement.remove(); };

        traitRow.appendChild(label1);
        traitRow.appendChild(nameInput);
        traitRow.appendChild(label2);
        traitRow.appendChild(descTextarea);
        traitRow.appendChild(removeBtn);

        // Find the add button that's a direct child of container
        const addButton = Array.from(container.children).find(child =>
            child.tagName === 'BUTTON' && child.textContent.includes('Add Trait')
        );

        if (addButton) {
            container.insertBefore(traitRow, addButton);
        } else {
            container.appendChild(traitRow);
        }
    }

    /**
     * Add an action row with data to the creature form
     * @param {string} name - Action name
     * @param {string} description - Action description
     */
    static addActionRowWithData(name, description) {
        const container = document.getElementById('actions-container');
        if (!container) return;

        const actionRow = document.createElement('div');
        actionRow.className = 'form-group';

        const label1 = document.createElement('label');
        label1.textContent = 'Action Name';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.name = 'actionName[]';
        nameInput.value = name;
        nameInput.placeholder = 'Multiattack';

        const label2 = document.createElement('label');
        label2.textContent = 'Action Description';

        const descTextarea = document.createElement('textarea');
        descTextarea.name = 'actionDescription[]';
        descTextarea.value = description;
        descTextarea.placeholder = 'The creature makes two attacks...';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-sm btn-danger';
        removeBtn.textContent = 'Remove Action';
        removeBtn.onclick = function() { this.parentElement.remove(); };

        actionRow.appendChild(label1);
        actionRow.appendChild(nameInput);
        actionRow.appendChild(label2);
        actionRow.appendChild(descTextarea);
        actionRow.appendChild(removeBtn);

        // Find the add button that's a direct child of container
        const addButton = Array.from(container.children).find(child =>
            child.tagName === 'BUTTON' && child.textContent.includes('Add Action')
        );

        if (addButton) {
            container.insertBefore(actionRow, addButton);
        } else {
            container.appendChild(actionRow);
        }
    }

    /**
     * Add a legendary action row with data to the creature form
     * @param {string} name - Legendary action name
     * @param {string} description - Legendary action description
     * @param {number} cost - Action cost (default 1)
     */
    static addLegendaryActionRowWithData(name, description, cost = 1) {
        const container = document.getElementById('legendary-actions-container');
        if (!container) return;

        const legendaryRow = document.createElement('div');
        legendaryRow.className = 'form-group';

        const label1 = document.createElement('label');
        label1.textContent = 'Legendary Action Name';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.name = 'legendaryActionName[]';
        nameInput.value = name;
        nameInput.placeholder = 'Detect';

        const label2 = document.createElement('label');
        label2.textContent = 'Action Cost';

        const costInput = document.createElement('input');
        costInput.type = 'number';
        costInput.name = 'legendaryActionCost[]';
        costInput.value = cost;
        costInput.placeholder = '1';

        const label3 = document.createElement('label');
        label3.textContent = 'Legendary Action Description';

        const descTextarea = document.createElement('textarea');
        descTextarea.name = 'legendaryActionDescription[]';
        descTextarea.value = description;
        descTextarea.placeholder = 'The creature makes a Wisdom (Perception) check...';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-sm btn-danger';
        removeBtn.textContent = 'Remove Legendary Action';
        removeBtn.onclick = function() { this.parentElement.remove(); };

        legendaryRow.appendChild(label1);
        legendaryRow.appendChild(nameInput);
        legendaryRow.appendChild(label2);
        legendaryRow.appendChild(costInput);
        legendaryRow.appendChild(label3);
        legendaryRow.appendChild(descTextarea);
        legendaryRow.appendChild(removeBtn);

        // Find the add button that's a direct child of container
        const addButton = Array.from(container.children).find(child =>
            child.tagName === 'BUTTON' && child.textContent.includes('Add Legendary Action')
        );

        if (addButton) {
            container.insertBefore(legendaryRow, addButton);
        } else {
            container.appendChild(legendaryRow);
        }
    }

    /**
     * Add a custom section row with data to the creature form
     * @param {string} sectionName - Section heading (e.g., "Habitat", "Lair Actions")
     * @param {Array} entries - Array of {title, text} objects for this section
     */
    static addCustomSectionRowWithData(sectionName = '', entries = []) {
        const container = document.getElementById('custom-sections-container');
        if (!container) return;

        // Create the main section container
        const sectionRow = document.createElement('div');
        sectionRow.className = 'form-group custom-section-group';
        sectionRow.style.borderLeft = '3px solid var(--color-border-primary)';
        sectionRow.style.paddingLeft = 'var(--spacing-md)';
        sectionRow.style.marginBottom = 'var(--spacing-md)';
        sectionRow.style.position = 'relative';

        // Section Name (Heading)
        const label1 = document.createElement('label');
        label1.textContent = 'Section Name (Heading)';
        label1.style.fontWeight = 'var(--font-weight-bold)';

        const sectionNameInput = document.createElement('input');
        sectionNameInput.type = 'text';
        sectionNameInput.className = 'custom-section-name';
        sectionNameInput.value = sectionName;
        sectionNameInput.placeholder = 'e.g., Habitat, Lair Actions, Treasure';
        sectionNameInput.style.marginBottom = 'var(--spacing-sm)';

        sectionRow.appendChild(label1);
        sectionRow.appendChild(sectionNameInput);

        // Container for entries (title/text pairs)
        const entriesContainer = document.createElement('div');
        entriesContainer.className = 'custom-section-entries';
        entriesContainer.style.marginLeft = 'var(--spacing-sm)';
        entriesContainer.style.paddingLeft = 'var(--spacing-sm)';
        entriesContainer.style.borderLeft = '2px solid var(--color-border-muted)';

        // Add existing entries or add one empty entry if none provided
        if (entries.length === 0) {
            entries = [{ title: '', text: '' }];
        }

        entries.forEach(entry => {
            this.addCustomSectionEntry(entriesContainer, entry.title || '', entry.text || '');
        });

        sectionRow.appendChild(entriesContainer);

        // Add Entry button
        const addEntryBtn = document.createElement('button');
        addEntryBtn.type = 'button';
        addEntryBtn.className = 'btn btn-sm btn-secondary';
        addEntryBtn.textContent = '+ Add Title/Text Entry';
        addEntryBtn.style.marginTop = 'var(--spacing-xs)';
        addEntryBtn.style.marginRight = 'var(--spacing-xs)';
        addEntryBtn.onclick = () => {
            this.addCustomSectionEntry(entriesContainer, '', '');
        };

        // Remove Section button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-sm btn-danger';
        removeBtn.textContent = 'Remove Section';
        removeBtn.style.marginTop = 'var(--spacing-xs)';
        removeBtn.onclick = function() { sectionRow.remove(); };

        sectionRow.appendChild(addEntryBtn);
        sectionRow.appendChild(removeBtn);

        // Find the add button that's a direct child of container
        const addButton = Array.from(container.children).find(child =>
            child.tagName === 'BUTTON' && child.getAttribute('data-action') === 'add-custom-section'
        );

        if (addButton) {
            container.insertBefore(sectionRow, addButton);
        } else {
            container.appendChild(sectionRow);
        }
    }

    /**
     * Add a single title/text entry to a custom section
     * @param {HTMLElement} entriesContainer - Container for entries
     * @param {string} title - Entry title
     * @param {string} text - Entry text
     */
    static addCustomSectionEntry(entriesContainer, title = '', text = '') {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'custom-section-entry';
        entryDiv.style.marginBottom = 'var(--spacing-sm)';
        entryDiv.style.paddingBottom = 'var(--spacing-sm)';
        entryDiv.style.borderBottom = '1px solid var(--color-border-muted)';

        const titleLabel = document.createElement('label');
        titleLabel.textContent = 'Title (Optional - appears in bold italic)';
        titleLabel.style.fontSize = 'var(--font-size-sm)';

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'custom-entry-title';
        titleInput.value = title;
        titleInput.placeholder = 'e.g., The dragon\'s lair...';

        const textLabel = document.createElement('label');
        textLabel.textContent = 'Text';
        textLabel.style.fontSize = 'var(--font-size-sm)';

        const textTextarea = document.createElement('textarea');
        textTextarea.className = 'custom-entry-text';
        textTextarea.value = text;
        textTextarea.placeholder = 'Enter the content...';
        textTextarea.rows = 3;

        const removeEntryBtn = document.createElement('button');
        removeEntryBtn.type = 'button';
        removeEntryBtn.className = 'btn btn-sm btn-danger';
        removeEntryBtn.textContent = 'Remove Entry';
        removeEntryBtn.style.marginTop = 'var(--spacing-xs)';
        removeEntryBtn.onclick = function() {
            // Only remove if there's more than one entry
            if (entriesContainer.querySelectorAll('.custom-section-entry').length > 1) {
                entryDiv.remove();
            } else {
                alert('A custom section must have at least one entry. Remove the entire section instead.');
            }
        };

        entryDiv.appendChild(titleLabel);
        entryDiv.appendChild(titleInput);
        entryDiv.appendChild(textLabel);
        entryDiv.appendChild(textTextarea);
        entryDiv.appendChild(removeEntryBtn);

        entriesContainer.appendChild(entryDiv);
    }

    /**
     * Open creature details in a new browser window/tab
     * @param {string} creatureId - ID of the creature to display
     */
    static openCreatureInNewWindow(creatureId) {
        // Find the creature in the consolidated database
        const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
        const creature = allCreatures.find(c => c.id === creatureId);

        if (!creature) {
            console.error('Creature not found:', creatureId);
            ToastSystem.show('Creature not found', 'error', 2000);
            return;
        }

        // Get stat block if available
        const statBlock = creature.statBlock || {};
        const hasFullStatBlock = creature.hasFullStatBlock && statBlock;

        // Build the complete HTML page
        const htmlContent = this.generateStandaloneCreaturePage(creature, statBlock, hasFullStatBlock);

        // Open in new window
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(htmlContent);
            newWindow.document.close();
            console.log(`🗖 Opened ${creature.name} in new window`);
        } else {
            ToastSystem.show('Please allow pop-ups to open creature details in a new window', 'warning', 4000);
        }
    }

    /**
     * Generate a complete standalone HTML page for a creature
     * @param {Object} creature - Creature data
     * @param {Object} statBlock - Stat block data
     * @param {boolean} hasFullStatBlock - Whether creature has full stat block
     * @returns {string} Complete HTML page
     */
    static generateStandaloneCreaturePage(creature, statBlock, hasFullStatBlock) {
        const statBlockHTML = buildStatBlockHTML(creature, statBlock, hasFullStatBlock);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(creature.name)} - D&D Creature Details</title>
    <style>
        ${standaloneCreatureCSS}
    </style>
</head>
<body>
    <div class="container">
        <div class="creature-details-header">
            <h1>${this.escapeHtml(creature.name)}</h1>
            <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
        </div>
        ${statBlockHTML}
    </div>
</body>
</html>`;
    }

    /**
     * Update the creature database file status indicator in the modal
     * Shows unsaved changes indicator if the working database differs from base
     * @param {HTMLElement} modal - Modal element
     */
    static updateCreatureDatabaseFileStatus(modal) {
        const filenameElement = modal.querySelector('#creature-database-filename');
        const unsavedIndicator = modal.querySelector('#creature-database-unsaved-indicator');

        if (CreatureService.workingDatabase) {
            // WHY: Check if there are unexported changes to the database
            // Changes auto-save to localStorage (so no data loss), but user may want
            // to export for backup or sharing. Red exclamation warns them.
            const hasUnexportedChanges = CreatureService.hasUnexportedChanges();

            if (unsavedIndicator) {
                if (hasUnexportedChanges) {
                    unsavedIndicator.style.display = 'inline';
                } else {
                    unsavedIndicator.style.display = 'none';
                }
            }

            // Update filename if it has lastUpdated metadata
            if (filenameElement && CreatureService.workingDatabase.metadata) {
                const lastUpdated = CreatureService.workingDatabase.metadata.lastUpdated;
                if (lastUpdated) {
                    filenameElement.textContent = `creature-database-${lastUpdated}.json`;
                }
            }
        }
    }

    /**
     * Setup the edit creature modal with creature data
     * This is for the SEPARATE edit modal (edit-creature.html)
     * @param {Object} creature - Creature data to populate
     */
    static setupEditCreatureModal(creature) {
        console.log('📝 Setting up EDIT creature modal for:', creature.name);

        // Populate the form with creature data
        this.populateCreatureForm(creature, 'edit-creature-form');

        // Setup ability score auto-calculation
        this.setupAbilityScoreCalculation('edit-creature-form');
    }

    /**
     * Setup the edit player modal with player data
     * This is for the SEPARATE edit modal (edit-player.html)
     * @param {Object} creature - Player data to populate
     */
    static setupEditPlayerModal(creature) {
        console.log('📝 Setting up EDIT player modal for:', creature.name);

        // Just call the existing setup method but with edit-player IDs
        this.populatePlayerForm(creature, 'edit-player-form');
    }

    /**
     * Generic method to populate creature form fields
     * @param {Object} creature - Creature data
     * @param {string} formIdPrefix - Form ID prefix (either 'creature-form' or 'edit-creature-form')
     */
    static populateCreatureForm(creature, formIdPrefix) {
        try {
            console.log(`Populating ${formIdPrefix} with creature:`, creature.name);

            // Store creature ID for update
            const idField = document.getElementById(`${formIdPrefix}-id`);
            if (idField) idField.value = creature.id;

            // Populate basic fields
            this._setFieldValue(`${formIdPrefix}-name`, creature.name || '');
            this._setFieldValue(`${formIdPrefix}-type`, creature.type || 'enemy');
            this._setFieldValue(`${formIdPrefix}-size`, creature.size || 'Medium');
            this._setFieldValue(`${formIdPrefix}-race`, creature.race || '');
            this._setFieldValue(`${formIdPrefix}-subrace`, creature.subrace || '');
            this._setFieldValue(`${formIdPrefix}-alignment`, creature.alignment || '');
            this._setFieldValue(`${formIdPrefix}-cr`, creature.cr || '');
            this._setFieldValue(`${formIdPrefix}-source`, creature.source || '');
            this._setFieldValue(`${formIdPrefix}-description`, creature.description || '');
            this._setFieldValue(`${formIdPrefix}-ac`, creature.ac || 10);
            this._setFieldValue(`${formIdPrefix}-hp`, creature.maxHP || 1);

            // Get statBlock data
            const statBlock = creature.statBlock || {};

            // Populate AC Type
            if (statBlock.armorClass) {
                this._setFieldValue(`${formIdPrefix}-ac-type`, statBlock.armorClass.type || '');
            }

            // Populate HP Formula
            if (statBlock.hitPoints) {
                this._setFieldValue(`${formIdPrefix}-hp-formula`, statBlock.hitPoints.formula || '');
            }

            // Populate Initiative
            if (statBlock.initiative) {
                this._setFieldValue(`${formIdPrefix}-initiative-mod`, statBlock.initiative.modifier || 0);
                this._setFieldValue(`${formIdPrefix}-initiative-total`, statBlock.initiative.total || 0);
            }

            // Populate Proficiency Bonus
            if (statBlock.proficiencyBonus) {
                this._setFieldValue(`${formIdPrefix}-proficiency`, statBlock.proficiencyBonus);
            } else if (statBlock.challengeRating && statBlock.challengeRating.proficiencyBonus) {
                this._setFieldValue(`${formIdPrefix}-proficiency`, statBlock.challengeRating.proficiencyBonus);
            }

            // Populate Speed
            if (statBlock.speed) {
                this._setFieldValue(`${formIdPrefix}-speed-walk`, statBlock.speed.walk || '');
                this._setFieldValue(`${formIdPrefix}-speed-fly`, statBlock.speed.fly || '');
                this._setFieldValue(`${formIdPrefix}-speed-swim`, statBlock.speed.swim || '');
                this._setFieldValue(`${formIdPrefix}-speed-climb`, statBlock.speed.climb || '');
                this._setFieldValue(`${formIdPrefix}-speed-burrow`, statBlock.speed.burrow || '');
            }

            // Populate Ability Scores
            if (statBlock.abilities) {
                const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
                abilities.forEach(ability => {
                    if (statBlock.abilities[ability]) {
                        this._setFieldValue(`${formIdPrefix}-${ability}-score`, statBlock.abilities[ability].score || '');
                        this._setFieldValue(`${formIdPrefix}-${ability}-modifier`, statBlock.abilities[ability].modifier || '');
                    }
                });
            }

            // Populate Saving Throws
            if (statBlock.savingThrows) {
                const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
                abilities.forEach(ability => {
                    if (statBlock.savingThrows[ability] !== undefined) {
                        this._setFieldValue(`${formIdPrefix}-${ability}-save`, statBlock.savingThrows[ability]);
                    }
                });
            }

            // Populate Skills (dynamic list)
            if (statBlock.skills && typeof statBlock.skills === 'object') {
                this._populateSkillsList(formIdPrefix, statBlock.skills);
            }

            // Populate Resistances & Immunities
            if (statBlock.damageVulnerabilities && Array.isArray(statBlock.damageVulnerabilities)) {
                this._setFieldValue(`${formIdPrefix}-damage-vulnerabilities`, statBlock.damageVulnerabilities.join(', '));
            }
            if (statBlock.damageResistances && Array.isArray(statBlock.damageResistances)) {
                this._setFieldValue(`${formIdPrefix}-damage-resistances`, statBlock.damageResistances.join(', '));
            }
            if (statBlock.damageImmunities && Array.isArray(statBlock.damageImmunities)) {
                this._setFieldValue(`${formIdPrefix}-damage-immunities`, statBlock.damageImmunities.join(', '));
            }
            if (statBlock.conditionImmunities && Array.isArray(statBlock.conditionImmunities)) {
                this._setFieldValue(`${formIdPrefix}-condition-immunities`, statBlock.conditionImmunities.join(', '));
            }

            // Populate Senses
            if (statBlock.senses) {
                this._setFieldValue(`${formIdPrefix}-blindsight`, statBlock.senses.blindsight || '');
                this._setFieldValue(`${formIdPrefix}-darkvision`, statBlock.senses.darkvision || '');
                this._setFieldValue(`${formIdPrefix}-tremorsense`, statBlock.senses.tremorsense || '');
                this._setFieldValue(`${formIdPrefix}-truesight`, statBlock.senses.truesight || '');
                this._setFieldValue(`${formIdPrefix}-passive-perception`, statBlock.senses.passivePerception || '');
            }

            // Populate Languages
            if (statBlock.languages && Array.isArray(statBlock.languages)) {
                this._setFieldValue(`${formIdPrefix}-languages`, statBlock.languages.join(', '));
            }

            // Populate Challenge Rating Details
            if (statBlock.challengeRating) {
                this._setFieldValue(`${formIdPrefix}-xp`, statBlock.challengeRating.xp || '');
                this._setFieldValue(`${formIdPrefix}-xp-lair`, statBlock.challengeRating.xpInLair || '');
            }

            // Populate Traits (dynamic list)
            if (statBlock.traits && Array.isArray(statBlock.traits)) {
                this._populateTraitsList(formIdPrefix, statBlock.traits);
            }

            // Populate Actions (dynamic list)
            if (statBlock.actions && Array.isArray(statBlock.actions)) {
                this._populateActionsList(formIdPrefix, statBlock.actions);
            }

            // Populate Reactions (dynamic list)
            if (statBlock.reactions && Array.isArray(statBlock.reactions)) {
                this._populateReactionsList(formIdPrefix, statBlock.reactions);
            }

            // Populate Legendary Actions
            if (statBlock.legendaryActions) {
                this._setFieldValue(`${formIdPrefix}-legendary-uses`, statBlock.legendaryActions.uses || '');
                this._setFieldValue(`${formIdPrefix}-legendary-uses-lair`, statBlock.legendaryActions.usesInLair || '');
                this._setFieldValue(`${formIdPrefix}-legendary-description`, statBlock.legendaryActions.description || '');
                if (statBlock.legendaryActions.options && Array.isArray(statBlock.legendaryActions.options)) {
                    this._populateLegendaryActionsList(formIdPrefix, statBlock.legendaryActions.options);
                }
            }

            // Populate Spellcasting
            if (statBlock.spellcasting) {
                this._setFieldValue(`${formIdPrefix}-spellcasting-ability`, statBlock.spellcasting.ability || '');
                this._setFieldValue(`${formIdPrefix}-spell-attack`, statBlock.spellcasting.spellAttackBonus || '');
                this._setFieldValue(`${formIdPrefix}-spell-dc`, statBlock.spellcasting.spellSaveDC || '');
                this._setFieldValue(`${formIdPrefix}-spellcasting-desc`, statBlock.spellcasting.description || '');

                // Convert spell list array to string if present
                if (statBlock.spellcasting.spells && Array.isArray(statBlock.spellcasting.spells)) {
                    this._setFieldValue(`${formIdPrefix}-spell-list`, statBlock.spellcasting.spells.join('\n'));
                } else if (statBlock.spellcasting.spellList) {
                    // Handle alternative spell list format
                    this._setFieldValue(`${formIdPrefix}-spell-list`, statBlock.spellcasting.spellList);
                }
            }

            console.log(`✅ Populated ${formIdPrefix} for: ${creature.name}`);
        } catch (error) {
            console.error(`❌ Error populating ${formIdPrefix}:`, error);
        }
    }

    /**
     * Helper method to set a field value
     * @param {string} fieldId - Field ID
     * @param {*} value - Value to set
     */
    static _setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
        }
    }

    /**
     * Populate traits dynamic list
     * @param {string} formIdPrefix - Form ID prefix
     * @param {Array} traits - Array of traits
     */
    static _populateTraitsList(formIdPrefix, traits) {
        const container = document.getElementById(`${formIdPrefix}-traits-list`);
        if (!container) return;

        // Clear existing
        container.innerHTML = '';

        // Add each trait
        traits.forEach((trait, index) => {
            const traitDiv = this._createTraitElement(trait, index);
            container.appendChild(traitDiv);
        });
    }

    /**
     * Create a trait element
     * @param {Object} trait - Trait data
     * @param {number} index - Trait index
     * @returns {HTMLElement} Trait element
     */
    static _createTraitElement(trait, index) {
        const div = document.createElement('div');
        div.className = 'dynamic-list-item';
        div.innerHTML = `
            <div class="form-group">
                <label>Trait Name</label>
                <input type="text" name="trait-name-${index}" value="${this._escapeHtml(trait.name || '')}" placeholder="e.g., Mucus Cloud">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="trait-description-${index}" rows="3" placeholder="Trait description...">${this._escapeHtml(trait.description || '')}</textarea>
            </div>
            <button type="button" class="btn btn-sm btn-danger" data-action="remove-trait" data-index="${index}">Remove</button>
        `;
        return div;
    }

    /**
     * Populate actions dynamic list
     * @param {string} formIdPrefix - Form ID prefix
     * @param {Array} actions - Array of actions
     */
    static _populateActionsList(formIdPrefix, actions) {
        const container = document.getElementById(`${formIdPrefix}-actions-list`);
        if (!container) return;

        // Clear existing
        container.innerHTML = '';

        // Add each action
        actions.forEach((action, index) => {
            const actionDiv = this._createActionElement(action, index);
            container.appendChild(actionDiv);
        });
    }

    /**
     * Create an action element
     * @param {Object} action - Action data
     * @param {number} index - Action index
     * @returns {HTMLElement} Action element
     */
    static _createActionElement(action, index) {
        const div = document.createElement('div');
        div.className = 'dynamic-list-item';
        div.innerHTML = `
            <div class="form-group">
                <label>Action Name</label>
                <input type="text" name="action-name-${index}" value="${this._escapeHtml(action.name || '')}" placeholder="e.g., Tentacle">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="action-description-${index}" rows="3" placeholder="Action description...">${this._escapeHtml(action.description || '')}</textarea>
            </div>
            <button type="button" class="btn btn-sm btn-danger" data-action="remove-action" data-index="${index}">Remove</button>
        `;
        return div;
    }

    /**
     * Populate reactions dynamic list
     * @param {string} formIdPrefix - Form ID prefix
     * @param {Array} reactions - Array of reactions
     */
    static _populateReactionsList(formIdPrefix, reactions) {
        const container = document.getElementById(`${formIdPrefix}-reactions-list`);
        if (!container) return;

        // Clear existing
        container.innerHTML = '';

        // Add each reaction
        reactions.forEach((reaction, index) => {
            const reactionDiv = this._createReactionElement(reaction, index);
            container.appendChild(reactionDiv);
        });
    }

    /**
     * Create a reaction element
     * @param {Object} reaction - Reaction data
     * @param {number} index - Reaction index
     * @returns {HTMLElement} Reaction element
     */
    static _createReactionElement(reaction, index) {
        const div = document.createElement('div');
        div.className = 'dynamic-list-item';
        div.innerHTML = `
            <div class="form-group">
                <label>Reaction Name</label>
                <input type="text" name="reaction-name-${index}" value="${this._escapeHtml(reaction.name || '')}" placeholder="e.g., Parry">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="reaction-description-${index}" rows="3" placeholder="Reaction description...">${this._escapeHtml(reaction.description || '')}</textarea>
            </div>
            <button type="button" class="btn btn-sm btn-danger" data-action="remove-reaction" data-index="${index}">Remove</button>
        `;
        return div;
    }

    /**
     * Populate legendary actions dynamic list
     * @param {string} formIdPrefix - Form ID prefix
     * @param {Array} legendaryActions - Array of legendary actions
     */
    static _populateLegendaryActionsList(formIdPrefix, legendaryActions) {
        const container = document.getElementById(`${formIdPrefix}-legendary-actions-list`);
        if (!container) return;

        // Clear existing
        container.innerHTML = '';

        // Add each legendary action
        legendaryActions.forEach((action, index) => {
            const actionDiv = this._createLegendaryActionElement(action, index);
            container.appendChild(actionDiv);
        });
    }

    /**
     * Create a legendary action element
     * @param {Object} action - Legendary action data
     * @param {number} index - Action index
     * @returns {HTMLElement} Legendary action element
     */
    static _createLegendaryActionElement(action, index) {
        const div = document.createElement('div');
        div.className = 'dynamic-list-item';
        div.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="legendary-action-name-${index}" value="${this._escapeHtml(action.name || '')}" placeholder="e.g., Lash">
                </div>
                <div class="form-group">
                    <label>Cost</label>
                    <input type="number" name="legendary-action-cost-${index}" value="${action.cost || 1}" min="1" max="3">
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="legendary-action-description-${index}" rows="2" placeholder="Description...">${this._escapeHtml(action.description || '')}</textarea>
            </div>
            <button type="button" class="btn btn-sm btn-danger" data-action="remove-legendary-action" data-index="${index}">Remove</button>
        `;
        return div;
    }

    /**
     * Populate skills dynamic list
     * @param {string} formIdPrefix - Form ID prefix
     * @param {Object} skills - Skills object with skill names as keys and bonuses as values
     */
    static _populateSkillsList(formIdPrefix, skills) {
        const container = document.getElementById(`${formIdPrefix}-skills-list`);
        if (!container) return;

        // Clear existing
        container.innerHTML = '';

        // Add each skill
        let index = 0;
        for (const [skillName, bonus] of Object.entries(skills)) {
            const skillDiv = this._createSkillElement({ name: skillName, bonus: bonus }, index);
            container.appendChild(skillDiv);
            index++;
        }
    }

    /**
     * Create a skill element
     * @param {Object} skill - Skill data with name and bonus
     * @param {number} index - Skill index
     * @returns {HTMLElement} Skill element
     */
    static _createSkillElement(skill, index) {
        const div = document.createElement('div');
        div.className = 'dynamic-list-item';

        // Capitalize skill name for display
        const displayName = skill.name ? skill.name.charAt(0).toUpperCase() + skill.name.slice(1) : '';

        div.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Skill Name</label>
                    <input type="text" name="skill-name-${index}" value="${this._escapeHtml(displayName)}" placeholder="e.g., Perception">
                </div>
                <div class="form-group">
                    <label>Bonus</label>
                    <input type="number" name="skill-bonus-${index}" value="${skill.bonus || 0}" placeholder="+10">
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-danger" data-action="remove-skill" data-index="${index}">Remove</button>
        `;
        return div;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== DYNAMIC LIST HANDLERS ====================

    /**
     * Handle adding a new trait to the traits list
     * @param {HTMLElement} target - Button that was clicked
     */
    static handleAddTrait(target) {
        const container = target.closest('#edit-creature-traits-container');
        if (!container) return;

        const listContainer = container.querySelector('#edit-creature-traits-list');
        if (!listContainer) return;

        // Get the next index
        const existingItems = listContainer.querySelectorAll('.dynamic-list-item');
        const nextIndex = existingItems.length;

        // Create and append new trait element
        const newTrait = this._createTraitElement({ name: '', description: '' }, nextIndex);
        listContainer.appendChild(newTrait);
    }

    /**
     * Handle removing a trait from the traits list
     * @param {HTMLElement} target - Remove button that was clicked
     */
    static handleRemoveTrait(target) {
        const item = target.closest('.dynamic-list-item');
        if (item) {
            item.remove();
        }
    }

    /**
     * Handle adding a new skill to the skills list
     * @param {HTMLElement} target - Button that was clicked
     */
    static handleAddSkill(target) {
        const container = target.closest('#edit-creature-skills-container');
        if (!container) return;

        const listContainer = container.querySelector('#edit-creature-skills-list');
        if (!listContainer) return;

        // Get the next index
        const existingItems = listContainer.querySelectorAll('.dynamic-list-item');
        const nextIndex = existingItems.length;

        // Create and append new skill element
        const newSkill = this._createSkillElement({ name: '', bonus: 0 }, nextIndex);
        listContainer.appendChild(newSkill);
    }

    /**
     * Handle removing a skill from the skills list
     * @param {HTMLElement} target - Remove button that was clicked
     */
    static handleRemoveSkill(target) {
        const item = target.closest('.dynamic-list-item');
        if (item) {
            item.remove();
        }
    }

    /**
     * Handle adding a new action to the actions list
     * @param {HTMLElement} target - Button that was clicked
     */
    static handleAddAction(target) {
        const container = target.closest('#edit-creature-actions-container');
        if (!container) return;

        const listContainer = container.querySelector('#edit-creature-actions-list');
        if (!listContainer) return;

        // Get the next index
        const existingItems = listContainer.querySelectorAll('.dynamic-list-item');
        const nextIndex = existingItems.length;

        // Create and append new action element
        const newAction = this._createActionElement({ name: '', description: '' }, nextIndex);
        listContainer.appendChild(newAction);
    }

    /**
     * Handle removing an action from the actions list
     * @param {HTMLElement} target - Remove button that was clicked
     */
    static handleRemoveAction(target) {
        const item = target.closest('.dynamic-list-item');
        if (item) {
            item.remove();
        }
    }

    /**
     * Handle adding a new reaction to the reactions list
     * @param {HTMLElement} target - Button that was clicked
     */
    static handleAddReaction(target) {
        const container = target.closest('#edit-creature-reactions-container');
        if (!container) return;

        const listContainer = container.querySelector('#edit-creature-reactions-list');
        if (!listContainer) return;

        // Get the next index
        const existingItems = listContainer.querySelectorAll('.dynamic-list-item');
        const nextIndex = existingItems.length;

        // Create and append new reaction element
        const newReaction = this._createReactionElement({ name: '', description: '' }, nextIndex);
        listContainer.appendChild(newReaction);
    }

    /**
     * Handle removing a reaction from the reactions list
     * @param {HTMLElement} target - Remove button that was clicked
     */
    static handleRemoveReaction(target) {
        const item = target.closest('.dynamic-list-item');
        if (item) {
            item.remove();
        }
    }

    /**
     * Handle adding a new legendary action to the legendary actions list
     * @param {HTMLElement} target - Button that was clicked
     */
    static handleAddLegendaryAction(target) {
        const container = target.closest('#edit-creature-legendary-actions-container');
        if (!container) return;

        const listContainer = container.querySelector('#edit-creature-legendary-actions-list');
        if (!listContainer) return;

        // Get the next index
        const existingItems = listContainer.querySelectorAll('.dynamic-list-item');
        const nextIndex = existingItems.length;

        // Create and append new legendary action element
        const newAction = this._createLegendaryActionElement({ name: '', description: '', cost: 1 }, nextIndex);
        listContainer.appendChild(newAction);
    }

    /**
     * Handle removing a legendary action from the legendary actions list
     * @param {HTMLElement} target - Remove button that was clicked
     */
    static handleRemoveLegendaryAction(target) {
        const item = target.closest('.dynamic-list-item');
        if (item) {
            item.remove();
        }
    }

    /**
     * Setup ability score auto-calculation for a form
     * Sets up input listeners on all ability score fields to auto-calculate modifiers
     * @param {string} formIdPrefix - Form ID prefix (e.g., 'edit-creature')
     */
    static setupAbilityScoreCalculation(formIdPrefix) {
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        abilities.forEach(ability => {
            const scoreField = document.getElementById(`${formIdPrefix}-${ability}-score`);
            const modifierField = document.getElementById(`${formIdPrefix}-${ability}-modifier`);

            if (scoreField && modifierField) {
                scoreField.addEventListener('input', () => {
                    const score = parseInt(scoreField.value);
                    if (!isNaN(score)) {
                        const modifier = Math.floor((score - 10) / 2);
                        modifierField.value = modifier >= 0 ? `+${modifier}` : modifier;
                    } else {
                        modifierField.value = '';
                    }
                });
            }
        });
    }

    /**
     * Generic method to populate player form fields
     * @param {Object} creature - Player data
     * @param {string} formIdPrefix - Form ID prefix (either 'player-form' or 'edit-player-form')
     */
    static populatePlayerForm(creature, formIdPrefix) {
        try {
            console.log(`Populating ${formIdPrefix} with player:`, creature.name);

            // Store creature ID for update
            const idField = document.getElementById(`${formIdPrefix}-id`);
            if (idField) idField.value = creature.id;

            // Populate basic fields
            const fields = {
                name: creature.name || '',
                playerName: creature.playerName || '',
                class: creature.class || '',
                level: creature.level || 1,
                race: creature.race || '',
                subrace: creature.subrace || '',
                ac: creature.ac || 10,
                maxHP: creature.maxHP || 1,
                initiative: creature.initiative || 0
            };

            for (const [fieldName, value] of Object.entries(fields)) {
                const field = document.getElementById(`${formIdPrefix}-${fieldName}`);
                if (field) field.value = value;
            }

            console.log(`✅ Populated ${formIdPrefix} for: ${creature.name}`);
        } catch (error) {
            console.error(`❌ Error populating ${formIdPrefix}:`, error);
        }
    }
}
