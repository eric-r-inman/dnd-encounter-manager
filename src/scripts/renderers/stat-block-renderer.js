/**
 * Stat Block Renderer - Centralized stat block HTML generation
 *
 * Provides comprehensive stat block rendering for D&D 5e creatures.
 * Handles both full stat blocks and condensed versions.
 *
 * @module renderers/stat-block-renderer
 * @version 1.0.0
 */

import {
    escapeHtml,
    formatModifier,
    getOrdinalSuffix,
    createLabeledValue,
    createActionEntry,
    createHeading,
    formatSpeed
} from './html-utils.js';
import { SKILL_DISPLAY_NAMES } from '../constants.js';
import { DiceLinkConverter } from '../utils/dice-link-converter.js';

/**
 * Build complete stat block HTML for a creature
 * Handles both full 5e stat blocks and condensed combat-only stats
 *
 * @param {Object} creature - Creature data object
 * @param {Object} statBlock - Full stat block data (optional)
 * @param {boolean} hasFullStatBlock - Whether creature has full 5e data
 * @returns {string} Complete HTML for stat block
 */
export function buildStatBlockHTML(creature, statBlock = {}, hasFullStatBlock = false) {
    let html = '';

    // === TYPE DESCRIPTION ===
    html += buildTypeDescription(creature, statBlock, hasFullStatBlock);

    // === CORE STATS (AC, HP, Speed) ===
    html += buildCoreStats(creature, statBlock, hasFullStatBlock);

    // === ABILITY SCORES ===
    html += buildAbilityScores(statBlock, hasFullStatBlock);

    // === COMBAT STATS (Saves, Skills, Resistances, Senses, Languages, CR) ===
    html += buildCombatStats(statBlock, creature, hasFullStatBlock);

    // === TRAITS ===
    html += buildTraits(statBlock, hasFullStatBlock);

    // === ACTIONS ===
    html += buildActions(statBlock, hasFullStatBlock);

    // === REACTIONS ===
    html += buildReactions(statBlock, hasFullStatBlock);

    // === LEGENDARY ACTIONS ===
    html += buildLegendaryActions(statBlock, hasFullStatBlock);

    // === LAIR ACTIONS ===
    html += buildLairActions(statBlock, hasFullStatBlock);

    // === REGIONAL EFFECTS ===
    html += buildRegionalEffects(statBlock, hasFullStatBlock);

    // === SPELLCASTING ===
    html += buildSpellcasting(statBlock, hasFullStatBlock);

    // === CUSTOM SECTIONS ===
    html += buildCustomSections(creature);

    // === SOURCE ===
    html += buildSource(creature);

    // Convert dice notation to clickable links
    html = DiceLinkConverter.convertDiceToLinks(html);

    return html;
}

/**
 * Build type description section
 */
function buildTypeDescription(creature, statBlock, hasFullStatBlock) {
    if (hasFullStatBlock && statBlock.fullType) {
        return `<div class="stat-block-section">
            <p class="creature-full-type">${escapeHtml(statBlock.fullType)}</p>
        </div>`;
    } else if (creature.size || creature.race || creature.alignment) {
        const parts = [];
        if (creature.size) parts.push(creature.size);
        if (creature.race) parts.push(creature.race);
        if (creature.subrace) parts.push(`(${creature.subrace})`);
        if (creature.alignment) parts.push(`, ${creature.alignment}`);
        return `<div class="stat-block-section">
            <p class="creature-full-type">${escapeHtml(parts.join(' '))}</p>
        </div>`;
    }
    return '';
}

/**
 * Build core stats section (AC, HP, Speed)
 */
function buildCoreStats(creature, statBlock, hasFullStatBlock) {
    let html = '<div class="stat-block-section">';

    // Armor Class
    if (hasFullStatBlock && statBlock.armorClass) {
        html += `<p><strong>Armor Class</strong> ${statBlock.armorClass.value}`;
        if (statBlock.armorClass.type) html += ` (${escapeHtml(statBlock.armorClass.type)})`;
        html += `</p>`;
    } else {
        html += `<p><strong>Armor Class</strong> ${creature.ac}</p>`;
    }

    // Initiative (show regardless of hasFullStatBlock, as long as data exists)
    if (statBlock?.initiative) {
        html += `<p><strong>Initiative</strong> ${formatModifier(statBlock.initiative.modifier)}`;
        if (statBlock.initiative.total) html += ` (${statBlock.initiative.total})`;
        html += `</p>`;
    }

    // Hit Points
    if (hasFullStatBlock && statBlock.hitPoints) {
        html += `<p><strong>Hit Points</strong> ${statBlock.hitPoints.average}`;
        if (statBlock.hitPoints.formula) html += ` (${escapeHtml(statBlock.hitPoints.formula)})`;
        html += `</p>`;
    } else {
        html += `<p><strong>Hit Points</strong> ${creature.maxHP}</p>`;
    }

    // Speed
    if (hasFullStatBlock && statBlock.speed) {
        const speedText = formatSpeed(statBlock.speed);
        if (speedText) {
            html += `<p><strong>Speed</strong> ${speedText}</p>`;
        }
    }

    html += '</div>';
    return html;
}

/**
 * Build ability scores table
 */
function buildAbilityScores(statBlock, hasFullStatBlock) {
    if (!hasFullStatBlock || !statBlock.abilities) return '';

    let html = `<div class="stat-block-section">
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
                    <td>${statBlock.abilities.str.score} (${formatModifier(statBlock.abilities.str.modifier)})</td>
                    <td>${statBlock.abilities.dex.score} (${formatModifier(statBlock.abilities.dex.modifier)})</td>
                    <td>${statBlock.abilities.con.score} (${formatModifier(statBlock.abilities.con.modifier)})</td>
                    <td>${statBlock.abilities.int.score} (${formatModifier(statBlock.abilities.int.modifier)})</td>
                    <td>${statBlock.abilities.wis.score} (${formatModifier(statBlock.abilities.wis.modifier)})</td>
                    <td>${statBlock.abilities.cha.score} (${formatModifier(statBlock.abilities.cha.modifier)})</td>
                </tr>
            </tbody>
        </table>
    </div>`;

    return html;
}

/**
 * Build combat stats section (Saves, Skills, Resistances, etc.)
 */
function buildCombatStats(statBlock, creature, hasFullStatBlock) {
    let html = '<div class="stat-block-section stat-block-condensed">';

    // Saving Throws
    if (hasFullStatBlock && statBlock.savingThrows) {
        const saves = [];
        for (const [ability, bonus] of Object.entries(statBlock.savingThrows)) {
            if (bonus !== null && bonus !== undefined) {
                saves.push(`${ability.toUpperCase()} ${formatModifier(bonus)}`);
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
            // Try to get the proper display name, otherwise format from camelCase/lowercase
            const skillKey = skill.toLowerCase();
            let skillName = SKILL_DISPLAY_NAMES[skillKey];

            if (!skillName) {
                // Fallback: add spaces before capital letters and capitalize
                skillName = skill.replace(/([A-Z])/g, ' $1').trim();
                skillName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
            }

            skills.push(`${skillName} ${formatModifier(bonus)}`);
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

    html += '</div>';
    return html;
}

/**
 * Build traits section
 */
function buildTraits(statBlock, hasFullStatBlock) {
    if (!hasFullStatBlock || !statBlock.traits || statBlock.traits.length === 0) return '';

    let html = '<div class="stat-block-section stat-block-traits">';
    statBlock.traits.forEach(trait => {
        html += createActionEntry(trait.name, trait.description);
    });
    html += '</div>';

    return html;
}

/**
 * Build actions section
 */
function buildActions(statBlock, hasFullStatBlock) {
    if (!hasFullStatBlock || !statBlock.actions || statBlock.actions.length === 0) return '';

    let html = `<div class="stat-block-section">${createHeading('Actions')}`;
    statBlock.actions.forEach(action => {
        html += createActionEntry(action.name, action.description);
    });
    html += '</div>';

    return html;
}

/**
 * Build reactions section
 */
function buildReactions(statBlock, hasFullStatBlock) {
    if (!hasFullStatBlock || !statBlock.reactions || statBlock.reactions.length === 0) return '';

    let html = `<div class="stat-block-section">${createHeading('Reactions')}`;
    statBlock.reactions.forEach(reaction => {
        html += createActionEntry(reaction.name, reaction.description);
    });
    html += '</div>';

    return html;
}

/**
 * Build legendary actions section
 */
function buildLegendaryActions(statBlock, hasFullStatBlock) {
    if (!hasFullStatBlock || !statBlock.legendaryActions || !statBlock.legendaryActions.options) return '';

    let html = `<div class="stat-block-section">${createHeading('Legendary Actions')}`;

    if (statBlock.legendaryActions.description) {
        html += `<p>${escapeHtml(statBlock.legendaryActions.description)}</p>`;
    }

    statBlock.legendaryActions.options.forEach(option => {
        let name = option.name;
        if (option.cost && option.cost > 1) {
            name += ` (Costs ${option.cost} Actions)`;
        }
        html += createActionEntry(name, option.description);
    });

    html += '</div>';
    return html;
}

/**
 * Build lair actions section
 */
function buildLairActions(statBlock, hasFullStatBlock) {
    if (!hasFullStatBlock || !statBlock.lairActions) return '';

    let html = `<div class="stat-block-section">${createHeading('Lair Actions')}`;

    if (statBlock.lairActions.description) {
        html += `<p>${escapeHtml(statBlock.lairActions.description)}</p>`;
    }

    if (statBlock.lairActions.options && statBlock.lairActions.options.length > 0) {
        statBlock.lairActions.options.forEach(option => {
            html += createActionEntry(option.name, option.description);
        });
    }

    html += '</div>';
    return html;
}

/**
 * Build regional effects section
 */
function buildRegionalEffects(statBlock, hasFullStatBlock) {
    if (!hasFullStatBlock || !statBlock.regionalEffects) return '';

    let html = `<div class="stat-block-section">${createHeading('Regional Effects')}`;

    if (statBlock.regionalEffects.description) {
        html += `<p>${escapeHtml(statBlock.regionalEffects.description)}</p>`;
    }

    if (statBlock.regionalEffects.effects && statBlock.regionalEffects.effects.length > 0) {
        statBlock.regionalEffects.effects.forEach(effect => {
            html += createActionEntry(effect.name, effect.description);
        });
    }

    html += '</div>';
    return html;
}

/**
 * Build spellcasting section
 */
function buildSpellcasting(statBlock, hasFullStatBlock) {
    if (!hasFullStatBlock || !statBlock.spellcasting) return '';

    let html = `<div class="stat-block-section">${createHeading('Spellcasting')}`;

    if (statBlock.spellcasting.description) {
        html += `<p>${escapeHtml(statBlock.spellcasting.description)}</p>`;
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

        // Spell slots
        if (statBlock.spellcasting.spells.slots) {
            const slotInfo = [];
            for (const [level, count] of Object.entries(statBlock.spellcasting.spells.slots)) {
                slotInfo.push(`${getOrdinalSuffix(level)} level (${count} slots)`);
            }
            if (slotInfo.length > 0) {
                html += `<p><strong>Spell Slots:</strong> ${slotInfo.join(', ')}</p>`;
            }
        }
    }

    html += '</div>';
    return html;
}

/**
 * Build custom sections
 */
function buildCustomSections(creature) {
    if (!creature.customSections || creature.customSections.length === 0) return '';

    let html = '';

    creature.customSections.forEach(section => {
        if (!section.name) return;

        html += `<div class="stat-block-section">${createHeading(section.name)}`;

        // Support both old and new data structures
        if (section.entries && Array.isArray(section.entries)) {
            // New structure with multiple entries
            section.entries.forEach(entry => {
                if (!entry.text) return;

                if (entry.title && entry.title.trim()) {
                    html += createActionEntry(entry.title, entry.text);
                } else {
                    // No title, display as paragraphs
                    const textParagraphs = entry.text
                        .split('\n')
                        .filter(line => line.trim())
                        .map(line => `<p>${escapeHtml(line)}</p>`)
                        .join('');
                    html += textParagraphs;
                }
            });
        } else if (section.text) {
            // Old structure - backward compatibility
            if (section.title && section.title.trim()) {
                html += createActionEntry(section.title, section.text);
            } else {
                const textParagraphs = section.text
                    .split('\n')
                    .filter(line => line.trim())
                    .map(line => `<p>${escapeHtml(line)}</p>`)
                    .join('');
                html += textParagraphs;
            }
        }

        html += '</div>';
    });

    return html;
}

/**
 * Build source section
 */
function buildSource(creature) {
    if (!creature.source) return '';

    return `<div class="stat-block-section">
        <p class="creature-source"><strong>Source:</strong> ${escapeHtml(creature.source)}</p>
    </div>`;
}
