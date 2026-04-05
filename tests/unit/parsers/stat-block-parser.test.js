/**
 * Unit tests for StatBlockParser
 */

import { describe, test, expect } from '@jest/globals';
import { StatBlockParser } from '../../../src/scripts/parsers/stat-block-parser.js';

describe('StatBlockParser', () => {
    describe('Traditional 5e stat block format', () => {
        const dolgrimStatBlock = `Dolgrim
Small Aberration, Chaotic Evil

Armor Class 15 (natural Armour, shield)
Hit Points 13 (3d6 + 3)
Speed 30 ft.

STR
15 (+2)
DEX
14 (+2)
CON
12 (+1)
INT
8 (-1)
WIS
10 (+0)
CHA
8 (-1)

Senses Darkvision 60 ft., Passive Perception 10
Languages Deep Speech, Goblin
Challenge 1/2 (100 XP)
Proficiency Bonus +2

Traits
Dual Consciousness. The dolgrim has advantage on saving throws against being blinded, charmed, deafened, frightened, stunned, and knocked unconscious.

Actions
Multiattack. The dolgrim makes three attacks.

Morningstar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage.

Spear. Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 5 (1d6 + 2) piercing damage, or 6 (1d8 + 2) piercing damage if used with two hands to make a melee attack.

Hand Crossbow. Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage.`;

        test('should parse creature name', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            expect(creature.name).toBe('Dolgrim');
        });

        test('should parse size, type, and alignment', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            expect(creature.size).toBe('Small');
            expect(creature.race).toBe('Aberration');
            expect(creature.alignment).toBe('Chaotic Evil');
        });

        test('should parse Armor Class with type', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            expect(creature.ac).toBe(15);
            expect(creature.statBlock.armorClass.value).toBe(15);
            expect(creature.statBlock.armorClass.type).toBe('natural Armour, shield');
        });

        test('should parse Hit Points with formula', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            expect(creature.maxHP).toBe(13);
            expect(creature.statBlock.hitPoints.average).toBe(13);
            expect(creature.statBlock.hitPoints.formula).toBe('3d6 + 3');
        });

        test('should parse speed', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            expect(creature.statBlock.speed.walk).toBe(30);
        });

        test('should parse all ability scores', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            expect(creature.statBlock.abilities).toBeDefined();
            expect(creature.statBlock.abilities.str).toEqual({ score: 15, modifier: 2 });
            expect(creature.statBlock.abilities.dex).toEqual({ score: 14, modifier: 2 });
            expect(creature.statBlock.abilities.con).toEqual({ score: 12, modifier: 1 });
            expect(creature.statBlock.abilities.int).toEqual({ score: 8, modifier: -1 });
            expect(creature.statBlock.abilities.wis).toEqual({ score: 10, modifier: 0 });
            expect(creature.statBlock.abilities.cha).toEqual({ score: 8, modifier: -1 });
        });

        test('should parse senses', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            expect(creature.statBlock.senses.darkvision).toBe(60);
            expect(creature.statBlock.senses.passivePerception).toBe(10);
        });

        test('should parse languages', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            expect(creature.statBlock.languages).toEqual(['Deep Speech', 'Goblin']);
        });

        test('should parse challenge rating and XP', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            expect(creature.cr).toBe('1/2');
            expect(creature.statBlock.challengeRating.xp).toBe(100);
        });

        test('should parse traits', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            const dualConsciousness = creature.statBlock.traits.find(t => t.name === 'Dual Consciousness');
            expect(dualConsciousness).toBeDefined();
            expect(dualConsciousness.description).toContain('advantage on saving throws');
        });

        test('should parse actions', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            const multiattack = creature.statBlock.actions.find(a => a.name === 'Multiattack');
            expect(multiattack).toBeDefined();
            expect(multiattack.type).toBe('multiattack');

            const morningstar = creature.statBlock.actions.find(a => a.name === 'Morningstar');
            expect(morningstar).toBeDefined();
            expect(morningstar.type).toBe('melee');
            expect(morningstar.attackBonus).toBe(4);
            expect(morningstar.damage).toBe('6 (1d8 + 2)');
            expect(morningstar.damageType).toBe('piercing');
        });

        test('should parse ranged attacks', () => {
            const creature = StatBlockParser.parse(dolgrimStatBlock);
            const crossbow = creature.statBlock.actions.find(a => a.name === 'Hand Crossbow');
            expect(crossbow).toBeDefined();
            expect(crossbow.type).toBe('ranged');
            expect(crossbow.attackBonus).toBe(4);
            expect(crossbow.range).toBe('30/120 ft.');
        });
    });

    describe('D&D Beyond 2024 stat block format', () => {
        const modernStatBlock = `Ancient Red Dragon
Gargantuan Dragon, Chaotic Evil

AC 22
HP 546 (28d20 + 252)
Speed 40 ft., burrow 40 ft., fly 80 ft.

STR    30    +10    +10
DEX    10    +0    +7
CON    29    +9    +16
INT    18    +4    +4
WIS    15    +2    +9
CHA    23    +6    +13

Senses Blindsight 60 ft., Darkvision 120 ft., Passive Perception 26
Languages Common, Draconic
CR 24 (XP 62,000; PB +7)

Traits
Legendary Resistance (3/Day). If the dragon fails a saving throw, it can choose to succeed instead.

Actions
Multiattack. The dragon makes three attacks.`;

        test('should parse ability scores from single-line format', () => {
            const creature = StatBlockParser.parse(modernStatBlock);
            expect(creature.statBlock.abilities).toBeDefined();
            expect(creature.statBlock.abilities.str).toEqual({ score: 30, modifier: 10 });
            expect(creature.statBlock.abilities.dex).toEqual({ score: 10, modifier: 0 });
            expect(creature.statBlock.abilities.con).toEqual({ score: 29, modifier: 9 });
        });

        test('should parse saving throws from 2024 format', () => {
            const creature = StatBlockParser.parse(modernStatBlock);
            expect(creature.statBlock.savingThrows.str).toBe(10);
            expect(creature.statBlock.savingThrows.dex).toBe(7);
            expect(creature.statBlock.savingThrows.con).toBe(16);
        });

        test('should parse AC and HP in short format', () => {
            const creature = StatBlockParser.parse(modernStatBlock);
            expect(creature.ac).toBe(22);
            expect(creature.maxHP).toBe(546);
        });
    });
});
