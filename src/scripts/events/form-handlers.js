/**
 * FormHandlers - Modal Form Processing
 *
 * Handles submission and validation of all modal forms in the application.
 * Processes form data and delegates to appropriate services.
 *
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { DataServices } from '../data-services.js';
import { CombatEvents } from './combat-events.js';
import { RecentItems } from './recent-items.js';

export class FormHandlers {
    // Flag to prevent duplicate creature form submissions
    static _submittingCreatureForm = false;

    /**
     * Route form submissions to appropriate handlers
     * @param {string} formType - Type of form being submitted
     * @param {HTMLFormElement} form - Form element
     */
    static handleFormSubmission(formType, form) {
        console.log(`📝 Form submission: ${formType}`);

        switch (formType) {
            case 'add-combatant':
            case 'combatant-creation':
                this.handleAddCombatantForm(form);
                break;
            case 'condition-application':
                this.handleConditionForm(form);
                break;
            case 'effect-application':
                this.handleEffectForm(form);
                break;
            case 'combatant-note':
                this.handleNoteForm(form);
                break;
            case 'creature':
                this.handleCreatureForm(form);
                break;
            default:
                console.log(`⚠️ Unhandled form type: ${formType}`);
        }
    }

    /**
     * Handle condition form submission
     * @param {HTMLFormElement} form - Condition form
     */
    static handleConditionForm(form) {
        const formData = new FormData(form);

        // Get form values
        const condition = formData.get('condition');
        const turns = formData.get('turns');
        const note = formData.get('note')?.trim() || '';
        const expiresAt = formData.get('expiresAt') || 'start'; // 'start' or 'end'

        // Get target from modal
        const modal = form.closest('.modal-overlay');
        const targetId = modal?.getAttribute('data-current-target');

        // Validation
        if (!condition) {
            ToastSystem.show('Please select a condition', 'error', 2000);
            return;
        }

        if (!targetId) {
            ToastSystem.show('No target selected', 'error', 2000);
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(targetId);
        if (!combatant) {
            console.error('Combatant not found:', targetId);
            return;
        }

        // Create condition object
        const conditionObj = {
            name: condition,
            duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
            note: note,
            expiresAt: expiresAt // 'start' = beginning of turn, 'end' = end of turn
        };

        // Special case: If this condition expires at "end" and is being applied to the active combatant,
        // set a flag to skip the first end-of-turn decrement (so it expires at the end of their NEXT turn)
        if (expiresAt === 'end' && combatant.status.isActive) {
            conditionObj.skipNextEndDecrement = true;
        }

        // Check if condition already exists
        const existingIndex = combatant.conditions.findIndex(c => c.name === condition);
        if (existingIndex !== -1) {
            // Update existing condition
            combatant.conditions[existingIndex] = conditionObj;
            ToastSystem.show(`Updated ${condition} on ${combatant.name}`, 'success', 2000);
        } else {
            // Add new condition
            combatant.conditions.push(conditionObj);
            ToastSystem.show(`Applied ${condition} to ${combatant.name}`, 'success', 2000);
        }

        // Update the combatant
        DataServices.combatantManager.updateCombatant(targetId, 'conditions', combatant.conditions);

        // Close modal
        ModalSystem.hideAll();

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            CombatEvents.updateCombatHeader();
        }
    }

    /**
     * Handle effect form submission
     * @param {HTMLFormElement} form - Effect form
     */
    static handleEffectForm(form) {
        const formData = new FormData(form);

        // Get form values - check both custom input and dropdown
        let effectName = formData.get('custom-effect')?.trim();
        if (!effectName) {
            effectName = formData.get('effect-dropdown');
        }

        const turns = formData.get('turns');
        const note = formData.get('note')?.trim() || '';
        const expiresAt = formData.get('expiresAt') || 'start'; // 'start' or 'end'

        // Get target from modal
        const modal = form.closest('.modal-overlay');
        const targetId = modal?.getAttribute('data-current-target');

        // Validation
        if (!effectName) {
            ToastSystem.show('Please enter or select an effect', 'error', 2000);
            return;
        }

        if (!targetId) {
            ToastSystem.show('No target selected', 'error', 2000);
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(targetId);
        if (!combatant) {
            console.error('Combatant not found:', targetId);
            return;
        }

        // Create effect object
        const effectObj = {
            name: effectName,
            duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
            note: note,
            expiresAt: expiresAt // 'start' = beginning of turn, 'end' = end of turn
        };

        // Special case: If this effect expires at "end" and is being applied to the active combatant,
        // set a flag to skip the first end-of-turn decrement (so it expires at the end of their NEXT turn)
        if (expiresAt === 'end' && combatant.status.isActive) {
            effectObj.skipNextEndDecrement = true;
        }

        // Check if effect already exists
        const existingIndex = combatant.effects.findIndex(e => e.name === effectName);
        if (existingIndex !== -1) {
            // Update existing effect
            combatant.effects[existingIndex] = effectObj;
            ToastSystem.show(`Updated ${effectName} on ${combatant.name}`, 'success', 2000);
        } else {
            // Add new effect
            combatant.effects.push(effectObj);
            ToastSystem.show(`Applied ${effectName} to ${combatant.name}`, 'success', 2000);
        }

        // Add to recent effects for future use (both new and updated effects)
        RecentItems.addToRecentEffects(effectName);

        // Update the combatant
        DataServices.combatantManager.updateCombatant(targetId, 'effects', combatant.effects);

        // Close modal
        ModalSystem.hideAll();

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            CombatEvents.updateCombatHeader();
        }
    }

    /**
     * Handle note form submission
     * @param {HTMLFormElement} form - Note form
     */
    static handleNoteForm(form) {
        const formData = new FormData(form);
        const noteText = formData.get('noteText')?.trim() || '';

        // Get target and note type from modal
        const modal = form.closest('.modal-overlay');
        const targetId = modal?.getAttribute('data-current-target');
        const noteType = modal?.getAttribute('data-current-note-type') || 'general';

        if (!targetId) {
            ToastSystem.show('No target selected', 'error', 2000);
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(targetId);
        if (!combatant) {
            console.error('Combatant not found:', targetId);
            return;
        }

        // Update the appropriate note field
        if (noteType === 'name') {
            DataServices.combatantManager.updateCombatant(targetId, 'nameNote', noteText);
            ToastSystem.show(`Name note updated for ${combatant.name}`, 'success', 2000);
        } else {
            DataServices.combatantManager.updateCombatant(targetId, 'notes', noteText);
            ToastSystem.show(`Note updated for ${combatant.name}`, 'success', 2000);
        }

        // Add to recent notes for future use (only if noteText is not empty)
        if (noteText.trim()) {
            RecentItems.addToRecentNotes(noteText, noteType);
        }

        // Close modal
        ModalSystem.hideAll();
    }

    /**
     * Handle add combatant form submission
     * @param {HTMLFormElement} form - Add combatant form
     */
    static handleAddCombatantForm(form) {
        const formData = new FormData(form);

        // Get form values
        const creatureId = formData.get('creatureId');
        const initiative = parseInt(formData.get('initiative'));
        const currentHP = formData.get('currentHP') ? parseInt(formData.get('currentHP')) : null;
        const nameNote = formData.get('nameNote')?.trim() || '';
        const startingSurprised = formData.get('startingSurprised') === 'true';
        const startingHiding = formData.get('startingHiding') === 'true';

        // Validation
        if (!creatureId) {
            ToastSystem.show('Please select a creature', 'error', 3000);
            return;
        }

        if (isNaN(initiative)) {
            ToastSystem.show('Please enter a valid initiative', 'error', 3000);
            return;
        }

        // Create instance data from form inputs
        const instanceData = {
            initiative: initiative,
            nameNote: nameNote
        };

        // Set custom HP if provided
        if (currentHP !== null && !isNaN(currentHP)) {
            instanceData.currentHP = currentHP;
        }

        // Set starting status conditions
        if (startingSurprised || startingHiding) {
            instanceData.status = {};
            if (startingSurprised) {
                instanceData.status.surprised = true;
            }
            if (startingHiding) {
                instanceData.status.hiding = true;
            }
        }

        try {
            // Add combatant using the global CombatantManager
            const combatantCard = DataServices.combatantManager.addCombatant(creatureId, instanceData);

            if (combatantCard) {
                ToastSystem.show(`Added ${combatantCard.name} to encounter`, 'success', 3000);
                console.log(`✅ Successfully added combatant: ${combatantCard.name}`);
            } else {
                ToastSystem.show('Failed to add combatant: Creature not found', 'error', 3000);
                return;
            }
        } catch (error) {
            console.error('❌ Error adding combatant:', error);
            ToastSystem.show('Failed to add combatant: ' + error.message, 'error', 3000);
            return;
        }

        ModalSystem.hideAll();
    }

    /**
     * Handle creature form submission (for adding new creatures to database)
     * @param {HTMLFormElement} form - Creature form
     */
    static async handleCreatureForm(form) {
        // Import CreatureModalEvents dynamically to avoid circular dependency
        const { CreatureModalEvents } = await import('./creature-modal-events.js');

        // Prevent duplicate submissions
        if (this._submittingCreatureForm) {
            console.log('⚠️ Form submission already in progress, ignoring duplicate');
            return;
        }
        this._submittingCreatureForm = true;

        const formData = new FormData(form);

        // Check if this is an edit (ID will be present)
        const existingId = formData.get('id');
        const isEdit = existingId && existingId.trim() !== '';

        // Extract basic required fields
        const name = formData.get('name')?.trim();
        const type = formData.get('type');
        const ac = parseInt(formData.get('ac'));
        const maxHP = parseInt(formData.get('maxHP'));

        // Validate required fields
        if (!name || !type || isNaN(ac) || isNaN(maxHP)) {
            this._submittingCreatureForm = false;
            ToastSystem.show('Please fill in all required fields (Name, Type, AC, HP)', 'error', 3000);
            return;
        }

        // Generate a unique ID for the creature (use existing ID if editing)
        const id = isEdit ? existingId : name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        // For new creatures, check if ID already exists
        if (!isEdit) {
            const existingCreatures = DataServices.combatantManager.getAvailableCreatures();
            if (existingCreatures.some(creature => creature.id === id)) {
                this._submittingCreatureForm = false;
                ToastSystem.show(`A creature named "${name}" already exists`, 'error', 3000);
                return;
            }
        }

        // Build creature data structure
        const creatureData = {
            id: id,
            name: name,
            type: type,
            ac: ac,
            maxHP: maxHP,
            cr: formData.get('cr') || '0',
            size: formData.get('size') || 'Medium',
            race: formData.get('race') || '',
            subrace: formData.get('subrace') || '',
            alignment: formData.get('alignment') || '',
            description: formData.get('description') || '',
            source: formData.get('source') || 'Custom',
            hasFullStatBlock: false // For now, just basic stats
        };

        // Optional: Build stat block if we have ability scores
        const strScore = parseInt(formData.get('strScore'));
        const dexScore = parseInt(formData.get('dexScore'));
        const conScore = parseInt(formData.get('conScore'));
        const intScore = parseInt(formData.get('intScore'));
        const wisScore = parseInt(formData.get('wisScore'));
        const chaScore = parseInt(formData.get('chaScore'));

        if (!isNaN(strScore) && !isNaN(dexScore) && !isNaN(conScore) && !isNaN(intScore) && !isNaN(wisScore) && !isNaN(chaScore)) {
            creatureData.hasFullStatBlock = true;
            creatureData.statBlock = {
                fullType: `${creatureData.size} ${creatureData.race}${creatureData.subrace ? ` (${creatureData.subrace})` : ''}, ${creatureData.alignment}`,
                armorClass: {
                    value: ac,
                    type: formData.get('acType') || 'Natural Armor'
                },
                hitPoints: {
                    average: maxHP,
                    formula: formData.get('hpFormula') || ''
                },
                initiative: {
                    modifier: parseInt(formData.get('initiativeModifier')) || Math.floor((dexScore - 10) / 2),
                    total: parseInt(formData.get('initiativeTotal')) || 0
                },
                speed: {
                    walk: parseInt(formData.get('walkSpeed')) || 30,
                    burrow: parseInt(formData.get('burrowSpeed')) || null,
                    climb: parseInt(formData.get('climbSpeed')) || null,
                    fly: parseInt(formData.get('flySpeed')) || null,
                    swim: parseInt(formData.get('swimSpeed')) || null
                },
                abilities: {
                    str: {
                        score: strScore,
                        modifier: parseInt(formData.get('strModifier')) || Math.floor((strScore - 10) / 2)
                    },
                    dex: {
                        score: dexScore,
                        modifier: parseInt(formData.get('dexModifier')) || Math.floor((dexScore - 10) / 2)
                    },
                    con: {
                        score: conScore,
                        modifier: parseInt(formData.get('conModifier')) || Math.floor((conScore - 10) / 2)
                    },
                    int: {
                        score: intScore,
                        modifier: parseInt(formData.get('intModifier')) || Math.floor((intScore - 10) / 2)
                    },
                    wis: {
                        score: wisScore,
                        modifier: parseInt(formData.get('wisModifier')) || Math.floor((wisScore - 10) / 2)
                    },
                    cha: {
                        score: chaScore,
                        modifier: parseInt(formData.get('chaModifier')) || Math.floor((chaScore - 10) / 2)
                    }
                },
                proficiencyBonus: parseInt(formData.get('proficiencyBonus')) || 2,

                // Saving Throws
                savingThrows: {},

                // Skills (dynamic array)
                skills: {},

                // Senses
                senses: {},

                // Languages
                languages: [],

                // Damage types
                damageVulnerabilities: [],
                damageResistances: [],
                damageImmunities: [],
                conditionImmunities: [],

                // Traits, Actions, etc.
                traits: [],
                actions: [],
                reactions: [],
                bonusActions: [],
                legendaryActions: null,

                // Challenge Rating
                challengeRating: null
            };

            // Parse Saving Throws
            ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
                const save = parseInt(formData.get(`${ability}Save`));
                if (!isNaN(save)) {
                    creatureData.statBlock.savingThrows[ability] = save;
                }
            });

            // Parse Skills (dynamic array)
            const skillNames = formData.getAll('skillName[]');
            const skillBonuses = formData.getAll('skillBonus[]');
            for (let i = 0; i < skillNames.length; i++) {
                if (skillNames[i] && skillBonuses[i]) {
                    const skillKey = skillNames[i].toLowerCase().replace(/\s+/g, '');
                    creatureData.statBlock.skills[skillKey] = parseInt(skillBonuses[i]);
                }
            }

            // Parse Senses
            const blindsight = parseInt(formData.get('blindsight'));
            const darkvision = parseInt(formData.get('darkvision'));
            const tremorsense = parseInt(formData.get('tremorsense'));
            const truesight = parseInt(formData.get('truesight'));
            const passivePerception = parseInt(formData.get('passivePerception'));

            if (!isNaN(blindsight)) creatureData.statBlock.senses.blindsight = blindsight;
            if (!isNaN(darkvision)) creatureData.statBlock.senses.darkvision = darkvision;
            if (!isNaN(tremorsense)) creatureData.statBlock.senses.tremorsense = tremorsense;
            if (!isNaN(truesight)) creatureData.statBlock.senses.truesight = truesight;
            if (!isNaN(passivePerception)) creatureData.statBlock.senses.passivePerception = passivePerception;

            // Parse Languages
            const languagesStr = formData.get('languages');
            if (languagesStr && languagesStr.trim()) {
                creatureData.statBlock.languages = languagesStr.split(',').map(l => l.trim()).filter(l => l);
            }

            // Parse Damage Types
            const damageVuln = formData.get('damageVulnerabilities');
            if (damageVuln && damageVuln.trim()) {
                creatureData.statBlock.damageVulnerabilities = damageVuln.split(',').map(d => d.trim()).filter(d => d);
            }

            const damageRes = formData.get('damageResistances');
            if (damageRes && damageRes.trim()) {
                creatureData.statBlock.damageResistances = damageRes.split(',').map(d => d.trim()).filter(d => d);
            }

            const damageImm = formData.get('damageImmunities');
            if (damageImm && damageImm.trim()) {
                creatureData.statBlock.damageImmunities = damageImm.split(',').map(d => d.trim()).filter(d => d);
            }

            const conditionImm = formData.get('conditionImmunities');
            if (conditionImm && conditionImm.trim()) {
                creatureData.statBlock.conditionImmunities = conditionImm.split(',').map(c => c.trim()).filter(c => c);
            }

            // Parse Traits (dynamic array)
            const traitNames = formData.getAll('traitName[]');
            const traitDescriptions = formData.getAll('traitDescription[]');
            for (let i = 0; i < traitNames.length; i++) {
                if (traitNames[i] && traitDescriptions[i]) {
                    creatureData.statBlock.traits.push({
                        name: traitNames[i],
                        description: traitDescriptions[i]
                    });
                }
            }

            // Parse Actions (dynamic array)
            const actionNames = formData.getAll('actionName[]');
            const actionDescriptions = formData.getAll('actionDescription[]');
            for (let i = 0; i < actionNames.length; i++) {
                if (actionNames[i] && actionDescriptions[i]) {
                    creatureData.statBlock.actions.push({
                        name: actionNames[i],
                        description: actionDescriptions[i]
                    });
                }
            }

            // Parse Legendary Actions (dynamic array)
            const legendaryNames = formData.getAll('legendaryActionName[]');
            const legendaryCosts = formData.getAll('legendaryActionCost[]');
            const legendaryDescriptions = formData.getAll('legendaryActionDescription[]');
            if (legendaryNames.length > 0) {
                creatureData.statBlock.legendaryActions = {
                    uses: 3,
                    options: []
                };
                for (let i = 0; i < legendaryNames.length; i++) {
                    if (legendaryNames[i] && legendaryDescriptions[i]) {
                        creatureData.statBlock.legendaryActions.options.push({
                            name: legendaryNames[i],
                            cost: parseInt(legendaryCosts[i]) || 1,
                            description: legendaryDescriptions[i]
                        });
                    }
                }
            }

            // Parse Challenge Rating XP
            const xp = parseInt(formData.get('xp'));
            const xpInLair = parseInt(formData.get('xpInLair'));
            if (!isNaN(xp) || creatureData.cr) {
                creatureData.statBlock.challengeRating = {
                    cr: creatureData.cr,
                    xp: xp || 0,
                    xpInLair: xpInLair || 0
                };
            }
        }

        // Parse Custom Sections (dynamic array)
        const customSectionNames = formData.getAll('customSectionName[]');
        const customSectionTitles = formData.getAll('customSectionTitle[]');
        const customSectionTexts = formData.getAll('customSectionText[]');
        if (customSectionNames.length > 0) {
            creatureData.customSections = [];
            for (let i = 0; i < customSectionNames.length; i++) {
                if (customSectionNames[i] && customSectionTexts[i]) {
                    creatureData.customSections.push({
                        name: customSectionNames[i],
                        title: customSectionTitles[i] || '',
                        text: customSectionTexts[i]
                    });
                }
            }
        }

        try {
            // Mark as custom creature
            creatureData.isCustom = true;

            // Get custom creatures from localStorage
            const customCreatures = JSON.parse(localStorage.getItem('dnd-custom-creatures') || '[]');

            if (isEdit) {
                // Update existing creature
                const customIndex = customCreatures.findIndex(c => c.id === id);
                if (customIndex !== -1) {
                    customCreatures[customIndex] = creatureData;
                } else {
                    // Creature doesn't exist in custom list, add it (happens when editing database creatures)
                    customCreatures.push(creatureData);
                }

                ToastSystem.show(`Updated: ${name}`, 'success', 2000);
                console.log(`✅ Updated creature: ${name} (${id})`);
            } else {
                // Create new creature
                customCreatures.push(creatureData);

                ToastSystem.show(`Created: ${name}`, 'success', 2000);
                console.log(`✅ Created creature: ${name} (${id})`);
            }

            // Save to localStorage
            localStorage.setItem('dnd-custom-creatures', JSON.stringify(customCreatures));

            // Reload the consolidated database to pick up changes
            if (DataServices.combatantManager) {
                await DataServices.combatantManager.loadCreatureDatabase();
            }

            // Close the form modal and return to compendium
            ModalSystem.hide('creature-form');

            // Show the compendium modal and refresh it
            setTimeout(() => {
                ModalSystem.show('creature-database');

                const compendiumModal = document.querySelector('[data-modal="creature-database"]');
                if (compendiumModal) {
                    CreatureModalEvents.setupCreatureDatabaseModal(compendiumModal);

                    // Auto-select the creature after creation or edit
                    setTimeout(() => {
                        const creatureItem = compendiumModal.querySelector(`.creature-list-item[data-creature-id="${id}"]`);
                        if (creatureItem) {
                            creatureItem.click();
                            creatureItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }, 100);
                }
            }, 250); // Wait for creature-form close animation to complete

            // Reset submission flag after modal closes
            setTimeout(() => {
                this._submittingCreatureForm = false;
            }, 500);

        } catch (error) {
            this._submittingCreatureForm = false;
            console.error(`❌ Error ${isEdit ? 'updating' : 'creating'} creature:`, error);
            ToastSystem.show(`Failed to ${isEdit ? 'update' : 'create'} creature: ` + error.message, 'error', 4000);
        }
    }
}
