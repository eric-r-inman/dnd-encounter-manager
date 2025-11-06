/**
 * StatBlockParser - Parse D&D 5e stat blocks from text
 *
 * Handles parsing of creature stat blocks from various formats:
 * - D&D Beyond format
 * - Standard Monster Manual format
 * - Custom formatted stat blocks
 *
 * @module parsers/stat-block-parser
 * @version 1.0.0
 */

export class StatBlockParser {
    /**
     * Parse stat block text into creature object
     * @param {string} text - Stat block text
     * @param {string} format - Format hint ('auto', 'dndbeyond', 'standard')
     * @returns {Object} Parsed creature object
     */
    static parse(text, format = 'auto') {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) {
            throw new Error('Stat block is empty');
        }

        const creature = {
            id: '',
            name: '',
            type: 'enemy',
            ac: 10,
            maxHP: 1,
            cr: '0',
            size: null,
            race: null,
            subrace: null,
            alignment: null,
            description: null,
            source: 'Custom Import',
            hasFullStatBlock: true,
            statBlock: {
                damageResistances: [],
                damageImmunities: [],
                damageVulnerabilities: [],
                conditionImmunities: [],
                savingThrows: {},
                skills: {},
                traits: [],
                actions: [],
                reactions: [],
                legendaryActions: null,
                lairActions: null,
                regionalEffects: null,
                spellcasting: null
            }
        };

        // Extract name (first line)
        creature.name = lines[0];
        creature.id = creature.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Extract type/size/alignment (usually second line)
        if (lines.length > 1) {
            const typeLine = lines[1];
            const typeMatch = typeLine.match(/(Tiny|Small|Medium|Large|Huge|Gargantuan)?\s*([A-Za-z\s]+?)(?:,\s*(.+))?$/i);
            if (typeMatch) {
                creature.size = typeMatch[1] || null;
                creature.race = typeMatch[2]?.trim() || null;
                creature.alignment = typeMatch[3]?.trim() || null;
                creature.statBlock.fullType = typeLine;
            }
        }

        // D&D Beyond format uses abbreviated stat names
        let abilityData = {
            str: null, dex: null, con: null, int: null, wis: null, cha: null
        };
        let abilityMods = {
            str: null, dex: null, con: null, int: null, wis: null, cha: null
        };
        let savingThrows = {
            str: null, dex: null, con: null, int: null, wis: null, cha: null
        };

        // Parse remaining lines
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i];

            // Skip empty lines and common headers
            if (!line || line === 'MOD' || line === 'SAVE' || line.match(/^(Actions|Traits|Bonus Actions|Reactions)$/i)) {
                continue;
            }

            // AC (D&D Beyond format: "AC 20" or "AC 20    Initiative +12 (22)")
            const acMatch = line.match(/^AC\s+(\d+)/i);
            if (acMatch) {
                creature.ac = parseInt(acMatch[1]);
                creature.statBlock.armorClass = {
                    value: creature.ac,
                    type: null
                };
                // Extract initiative if present on same line
                const initMatch = line.match(/Initiative\s+([+-]?\d+)\s+\((\d+)\)/i);
                if (initMatch) {
                    creature.statBlock.initiative = {
                        modifier: parseInt(initMatch[1]),
                        total: parseInt(initMatch[2])
                    };
                }
                continue;
            }

            // Initiative on its own line (e.g., "Initiative +3" or "Initiative +3 (13)")
            const initLineMatch = line.match(/^Initiative\s+([+-]?\d+)(?:\s+\((\d+)\))?/i);
            if (initLineMatch) {
                creature.statBlock.initiative = {
                    modifier: parseInt(initLineMatch[1]),
                    total: initLineMatch[2] ? parseInt(initLineMatch[2]) : null
                };
                continue;
            }

            // HP (D&D Beyond format: "HP 333 (18d20 + 144)")
            const hpMatch = line.match(/^HP\s+(\d+)(?:\s+\(([^)]+)\))?/i);
            if (hpMatch) {
                creature.maxHP = parseInt(hpMatch[1]);
                creature.statBlock.hitPoints = {
                    average: creature.maxHP,
                    formula: hpMatch[2] || null
                };
                continue;
            }

            // Speed - more flexible regex
            const speedMatch = line.match(/^Speed\s+(.+?)(?:\s*$)/i);
            if (speedMatch) {
                const speedStr = speedMatch[1].trim();
                if (speedStr.length > 0) {
                    creature.statBlock.speed = this.parseSpeed(speedStr);
                }
                continue;
            }

            // D&D Beyond ability scores format (e.g., "STR    26    +8    +8")
            const abilityLineMatch = line.match(/^(STR|DEX|CON|INT|WIS|CHA)\s+(\d+)\s+([+-]?\d+)\s+([+-]?\d+)/i);
            if (abilityLineMatch) {
                const ability = abilityLineMatch[1].toLowerCase();
                abilityData[ability] = parseInt(abilityLineMatch[2]);
                abilityMods[ability] = parseInt(abilityLineMatch[3]);
                savingThrows[ability] = parseInt(abilityLineMatch[4]);
                continue;
            }

            // D&D Beyond multi-line ability format (ability name on one line, values on next lines)
            const abilityNameMatch = line.match(/^(STR|DEX|CON|INT|WIS|CHA)$/i);
            if (abilityNameMatch && i + 3 < lines.length) {
                const ability = abilityNameMatch[1].toLowerCase();
                const scoreLine = lines[i + 1];
                const modLine = lines[i + 2];
                const saveLine = lines[i + 3];

                // Check if next lines are numbers
                if (scoreLine.match(/^\d+$/) && modLine.match(/^[+-]?\d+$/) && saveLine.match(/^[+-]?\d+$/)) {
                    abilityData[ability] = parseInt(scoreLine);
                    abilityMods[ability] = parseInt(modLine);
                    savingThrows[ability] = parseInt(saveLine);
                    i += 3; // Skip the next 3 lines since we've processed them
                    continue;
                }
            }

            // Standard format ability scores (all on one line)
            const abilityMatch = line.match(/STR\s+(\d+)\s+\(([+-]?\d+)\)\s+DEX\s+(\d+)\s+\(([+-]?\d+)\)\s+CON\s+(\d+)\s+\(([+-]?\d+)\)\s+INT\s+(\d+)\s+\(([+-]?\d+)\)\s+WIS\s+(\d+)\s+\(([+-]?\d+)\)\s+CHA\s+(\d+)\s+\(([+-]?\d+)\)/i);
            if (abilityMatch) {
                abilityData = {
                    str: parseInt(abilityMatch[1]),
                    dex: parseInt(abilityMatch[3]),
                    con: parseInt(abilityMatch[5]),
                    int: parseInt(abilityMatch[7]),
                    wis: parseInt(abilityMatch[9]),
                    cha: parseInt(abilityMatch[11])
                };
                abilityMods = {
                    str: parseInt(abilityMatch[2]),
                    dex: parseInt(abilityMatch[4]),
                    con: parseInt(abilityMatch[6]),
                    int: parseInt(abilityMatch[8]),
                    wis: parseInt(abilityMatch[10]),
                    cha: parseInt(abilityMatch[12])
                };
                continue;
            }

            // Skills
            const skillsMatch = line.match(/^Skills\s+(.+)/i);
            if (skillsMatch) {
                const skillPairs = skillsMatch[1].split(',').map(s => s.trim());
                skillPairs.forEach(pair => {
                    const match = pair.match(/([A-Za-z\s]+)\s+([+-]?\d+)/);
                    if (match) {
                        const skillName = match[1].trim().replace(/\s+/g, '');
                        const skillBonus = parseInt(match[2]);
                        // Convert to camelCase
                        const camelSkill = skillName.charAt(0).toLowerCase() + skillName.slice(1);
                        creature.statBlock.skills[camelSkill] = skillBonus;
                    }
                });
                continue;
            }

            // Damage Immunities/Resistances/Vulnerabilities
            const immuneMatch = line.match(/^(?:Damage\s+)?Immunities\s+(.+)/i);
            if (immuneMatch) {
                creature.statBlock.damageImmunities = immuneMatch[1].split(',').map(s => s.trim());
                continue;
            }

            const resistMatch = line.match(/^(?:Damage\s+)?Resistances\s+(.+)/i);
            if (resistMatch) {
                creature.statBlock.damageResistances = resistMatch[1].split(',').map(s => s.trim());
                continue;
            }

            const vulnMatch = line.match(/^(?:Damage\s+)?Vulnerabilities\s+(.+)/i);
            if (vulnMatch) {
                creature.statBlock.damageVulnerabilities = vulnMatch[1].split(',').map(s => s.trim());
                continue;
            }

            // Senses
            const sensesMatch = line.match(/^Senses\s+(.+)/i);
            if (sensesMatch) {
                creature.statBlock.senses = this.parseSenses(sensesMatch[1]);
                continue;
            }

            // Languages
            const langMatch = line.match(/^Languages\s+(.+)/i);
            if (langMatch) {
                creature.statBlock.languages = langMatch[1].split(',').map(s => s.trim());
                continue;
            }

            // CR (D&D Beyond format: "CR 20 (XP 25,000, or 33,000 in lair; PB +6)")
            const crMatch = line.match(/^(?:Challenge|CR)\s+([\d/]+)(?:\s+\((?:XP\s+)?([0-9,]+))?(?:,\s*or\s+([0-9,]+)\s+in\s+lair)?(?:;\s*PB\s+\+?(\d+))?/i);
            if (crMatch) {
                creature.cr = crMatch[1];
                const xpStr = crMatch[2]?.replace(/,/g, '');
                const xpLairStr = crMatch[3]?.replace(/,/g, '');
                creature.statBlock.challengeRating = {
                    cr: creature.cr,
                    xp: xpStr ? parseInt(xpStr) : null,
                    xpInLair: xpLairStr ? parseInt(xpLairStr) : null,
                    proficiencyBonus: crMatch[4] ? parseInt(crMatch[4]) : null
                };
                continue;
            }
        }

        // Build abilities object from collected data
        if (abilityData.str !== null) {
            creature.statBlock.abilities = {
                str: { score: abilityData.str, modifier: abilityMods.str },
                dex: { score: abilityData.dex, modifier: abilityMods.dex },
                con: { score: abilityData.con, modifier: abilityMods.con },
                int: { score: abilityData.int, modifier: abilityMods.int },
                wis: { score: abilityData.wis, modifier: abilityMods.wis },
                cha: { score: abilityData.cha, modifier: abilityMods.cha }
            };

            // Add saving throws if we have them
            if (savingThrows.str !== null) {
                creature.statBlock.savingThrows = savingThrows;
            }
        }

        // Parse sections (Traits, Actions, Reactions, Legendary Actions, etc.)
        this.parseSections(lines, creature);

        return creature;
    }

    /**
     * Parse special sections from stat block (Traits, Actions, etc.)
     * @param {Array} lines - Array of stat block lines
     * @param {Object} creature - Creature object to populate
     */
    static parseSections(lines, creature) {
        let currentSection = null;
        let currentEntry = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect section headers
            if (line.match(/^Traits$/i)) {
                currentSection = 'traits';
                currentEntry = null;
                continue;
            } else if (line.match(/^Actions$/i)) {
                currentSection = 'actions';
                currentEntry = null;
                continue;
            } else if (line.match(/^Bonus Actions$/i)) {
                currentSection = 'bonusActions';
                currentEntry = null;
                continue;
            } else if (line.match(/^Reactions$/i)) {
                currentSection = 'reactions';
                currentEntry = null;
                continue;
            } else if (line.match(/^Legendary Actions$/i)) {
                currentSection = 'legendaryActions';
                currentEntry = null;
                // Initialize legendary actions object
                creature.statBlock.legendaryActions = {
                    description: '',
                    uses: 3,
                    usesInLair: 4,
                    options: []
                };
                continue;
            } else if (line.match(/^Lair Actions$/i)) {
                currentSection = 'lairActions';
                currentEntry = null;
                creature.statBlock.lairActions = {
                    description: '',
                    options: []
                };
                continue;
            } else if (line.match(/^Regional Effects$/i)) {
                currentSection = 'regionalEffects';
                currentEntry = null;
                creature.statBlock.regionalEffects = {
                    description: '',
                    effects: []
                };
                continue;
            }

            // Skip if no current section
            if (!currentSection) continue;

            // Parse legendary actions description
            if (currentSection === 'legendaryActions' && line.match(/Legendary Action Uses:/i)) {
                creature.statBlock.legendaryActions.description = line;
                const usesMatch = line.match(/(\d+)\s+\((\d+)\s+in\s+Lair\)/i);
                if (usesMatch) {
                    creature.statBlock.legendaryActions.uses = parseInt(usesMatch[1]);
                    creature.statBlock.legendaryActions.usesInLair = parseInt(usesMatch[2]);
                }
                continue;
            }

            // Detect entry start (bold text followed by period, typically "Name. Description")
            const entryMatch = line.match(/^([^.]+)\.\s*(.*)$/);
            if (entryMatch) {
                const entryName = entryMatch[1].trim();
                const entryDesc = entryMatch[2].trim();

                // Create new entry
                currentEntry = {
                    name: entryName,
                    description: entryDesc
                };

                // Add to appropriate section
                if (currentSection === 'traits') {
                    // Check for usage info in name
                    const usageMatch = entryName.match(/\(([^)]+)\)/);
                    if (usageMatch) {
                        currentEntry.usage = this.parseUsage(usageMatch[1]);
                    }
                    creature.statBlock.traits.push(currentEntry);
                } else if (currentSection === 'actions' || currentSection === 'bonusActions') {
                    // Parse action type
                    currentEntry.type = this.detectActionType(entryName, entryDesc);

                    // Parse attack details if present
                    this.parseAttackDetails(entryDesc, currentEntry);

                    creature.statBlock.actions.push(currentEntry);
                } else if (currentSection === 'reactions') {
                    creature.statBlock.reactions.push(currentEntry);
                } else if (currentSection === 'legendaryActions') {
                    // Check for cost
                    const costMatch = entryName.match(/\(Costs?\s+(\d+)\s+Actions?\)/i);
                    if (costMatch) {
                        currentEntry.cost = parseInt(costMatch[1]);
                    } else {
                        currentEntry.cost = 1;
                    }
                    creature.statBlock.legendaryActions.options.push(currentEntry);
                } else if (currentSection === 'lairActions') {
                    creature.statBlock.lairActions.options.push(currentEntry);
                } else if (currentSection === 'regionalEffects') {
                    creature.statBlock.regionalEffects.effects.push(currentEntry);
                }
            } else if (currentEntry && line.length > 0) {
                // Continue previous entry description
                currentEntry.description += ' ' + line;
            }
        }
    }

    /**
     * Parse usage information from text
     * @param {string} usageText - Usage text (e.g., "3/Day")
     * @returns {Object|null} Usage object or null
     */
    static parseUsage(usageText) {
        const perDayMatch = usageText.match(/(\d+)\/Day/i);
        if (perDayMatch) {
            return {
                type: 'perDay',
                amount: parseInt(perDayMatch[1])
            };
        }

        const rechargeMatch = usageText.match(/Recharge\s+([\d-]+)/i);
        if (rechargeMatch) {
            return {
                type: 'recharge',
                recharge: rechargeMatch[1]
            };
        }

        return null;
    }

    /**
     * Detect action type from name and description
     * @param {string} name - Action name
     * @param {string} description - Action description
     * @returns {string} Action type
     */
    static detectActionType(name, description) {
        if (name.toLowerCase().includes('multiattack')) {
            return 'multiattack';
        }

        if (description.match(/Melee\s+(Weapon\s+)?Attack/i)) {
            return 'melee';
        }

        if (description.match(/Ranged\s+(Weapon\s+)?Attack/i)) {
            return 'ranged';
        }

        return 'special';
    }

    /**
     * Parse attack details from description
     * @param {string} description - Action description
     * @param {Object} action - Action object to populate
     */
    static parseAttackDetails(description, action) {
        // Attack bonus
        const attackMatch = description.match(/Attack Roll:\s*([+-]?\d+)/i);
        if (attackMatch) {
            action.attackBonus = parseInt(attackMatch[1]);
        }

        // Reach
        const reachMatch = description.match(/reach\s+(\d+)\s*ft/i);
        if (reachMatch) {
            action.reach = `${reachMatch[1]} ft.`;
        }

        // Range
        const rangeMatch = description.match(/range\s+(\d+(?:\/\d+)?)\s*ft/i);
        if (rangeMatch) {
            action.range = `${rangeMatch[1]} ft.`;
        }

        // Damage
        const damageMatch = description.match(/Hit:\s*(\d+)\s*\(([^)]+)\)\s*(\w+)\s+damage/i);
        if (damageMatch) {
            action.damage = `${damageMatch[1]} (${damageMatch[2]})`;
            action.damageType = damageMatch[3].toLowerCase();
        }

        // Additional damage
        const additionalMatch = description.match(/plus\s+(\d+)\s*\(([^)]+)\)\s*(\w+)\s+damage/i);
        if (additionalMatch) {
            action.additionalDamage = `${additionalMatch[1]} (${additionalMatch[2]})`;
            action.additionalDamageType = additionalMatch[3].toLowerCase();
        }

        // Saving throw
        const saveMatch = description.match(/(\w+)\s+Saving\s+Throw:\s*DC\s*(\d+)/i);
        if (saveMatch) {
            action.saveType = saveMatch[1];
            action.saveDC = parseInt(saveMatch[2]);
        }

        // Area
        const areaMatch = description.match(/(\d+-foot)\s+(Cone|Line|Cube|Sphere|Cylinder)/i);
        if (areaMatch) {
            action.area = `${areaMatch[1]} ${areaMatch[2].toLowerCase()}`;
        }

        // Recharge
        const rechargeMatch = description.match(/\(Recharge\s+([\d-]+)\)/i);
        if (rechargeMatch) {
            action.recharge = rechargeMatch[1];
        }
    }

    /**
     * Parse senses string into senses object
     * @param {string} sensesStr - Senses string
     * @returns {Object} Senses object
     */
    static parseSenses(sensesStr) {
        const senses = {
            blindsight: null,
            darkvision: null,
            tremorsense: null,
            truesight: null,
            passivePerception: null
        };

        const parts = sensesStr.split(',').map(p => p.trim());

        for (const part of parts) {
            const match = part.match(/(Blindsight|Darkvision|Tremorsense|Truesight)\s+(\d+)\s*ft/i);
            if (match) {
                const senseType = match[1].toLowerCase();
                const value = parseInt(match[2]);
                senses[senseType] = value;
            }

            const passiveMatch = part.match(/Passive\s+Perception\s+(\d+)/i);
            if (passiveMatch) {
                senses.passivePerception = parseInt(passiveMatch[1]);
            }
        }

        return senses;
    }

    /**
     * Parse speed string into speed object
     * @param {string} speedStr - Speed string (e.g., "40 ft., burrow 40 ft., fly 80 ft.")
     * @returns {Object} Speed object
     */
    static parseSpeed(speedStr) {
        const speed = {
            walk: null,
            burrow: null,
            climb: null,
            fly: null,
            swim: null,
            hover: false
        };

        // Split by comma
        const parts = speedStr.split(',').map(p => p.trim());

        for (const part of parts) {
            // Fixed regex: use [a-z]+ instead of \w+ to avoid matching digits as type
            const match = part.match(/(?:([a-z]+)\s+)?(\d+)\s*ft/i);
            if (match) {
                const type = match[1]?.toLowerCase() || 'walk';
                const value = parseInt(match[2]);

                if (type === 'walk' || !match[1]) {
                    speed.walk = value;
                } else if (speed.hasOwnProperty(type)) {
                    speed[type] = value;
                }
            }

            if (part.includes('hover')) {
                speed.hover = true;
            }
        }

        return speed;
    }
}
